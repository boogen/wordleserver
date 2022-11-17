import express, { NextFunction } from 'express';
import Sentry from '@sentry/node';
import AuthIdRequest from './types/AuthIdRequest'
import { ALPHABET, checkGuessForIncorrectLetters, checkSpellingBeeGuess, getMaxPoints, processPlayerGuess, SpellingBeeReplyEnum, wordPoints } from './spelling_bee_common';
import WordleDBI, { Bee, LetterState, SpellingBeeDuel, SpellingBeeDuellGuess } from '../../DBI';
import BaseGuessRequest from './types/BaseGuessRequest';
import { get_bot_id, get_nick } from './player_common';
import { ELO_COEFFICIENT, DUEL_DURATION, BOT_THRESHOLD, MATCH_ELO_DIFF, CHANCE_FOR_BOT } from './duel_settings';
import { get_ranking } from './ranking_common';
import { Stats } from '../../WordleStatsDBI';
import { getSeasonRules, LetterToBuy } from './season_rules';

export const spelling_bee_duel = express.Router();
const dbi = new WordleDBI()

const stats:Stats = new Stats();

enum DuelResult {
    win = "win",
    lose = "lose",
    draw = "draw",
    error = "error"
}

export class SpellingBeeDuelGuessReply {
    constructor(public message:SpellingBeeReplyEnum, public state:SpellingBeeDuelStateReply, public points:number) {}
}

class SpellingBeeDuelStart {
    constructor(public opponent_nick:string, public opponent_moves:SpellingBeeDuellGuessMessage[], public state:SpellingBeeDuelStateReply) {}
}

class SpelllingBeeDuelEnd {
    constructor(public result:DuelResult, public player_points:number, public opponent_points:number, public new_player_elo:number, public player_elo_diff:number, public time_left?:number) {}
}

class SpellingBeeDuelStateReply {
    constructor(public letters:LetterState[], public guessed_words:string[], public player_points:number, public time_left:number, public round_time:number, public letters_to_buy:LetterToBuy[]) {
    }
}

class SpellingBeeDuellGuessMessage {
    constructor(public word:string, public seconds:number, public points:number){}
}


class SpellingBeeDuelPrematchPlayerInfo {
    constructor(public id:number, public player:string, public elo:number) {}
}

class SpellingBeeDuelPrematchReply {
    constructor(public message:string, public player:SpellingBeeDuelPrematchPlayerInfo, public opponent:SpellingBeeDuelPrematchPlayerInfo) {}
}


function calculateNewSimpleRank(playerScore:number, result:DuelResult):number {
    switch (result) {
        case DuelResult.draw:
            return playerScore + 0;
        case DuelResult.win:
            return playerScore + 50;
            break;
        case DuelResult.lose:
            return playerScore - 30;
        default:
            throw new Error("Cannot calculate new elo - incorrect result");
    }
}


function calculateNewEloRank(playerScore:number, opponentScore:number, result:DuelResult):number {
    const rankingDiff:number = playerScore - opponentScore;
    const expectedResult:number = 1/(Math.pow(10, -rankingDiff/400) + 1);
    var numericalResult:number = 0;
    switch (result) {
        case DuelResult.draw:
            numericalResult = 0.5;
            break;
        case DuelResult.lose:
            numericalResult = 0;
            break;
        case DuelResult.win:
            numericalResult = 1;
            break;
        default:
            throw new Error("Cannot calculate new elo - incorrect result");
    }

    return playerScore +  Math.ceil(ELO_COEFFICIENT * (numericalResult - expectedResult));
}

async function createBotGuesses(bee_model:Bee, player_id:number):Promise<SpellingBeeDuellGuess[]> {
    const player_duels_bee_ids:number[] = await dbi.getAllPlayerDuelsBeeIds(player_id);
    const best_result_percentage:number[] = await dbi.getBestResultPercentage(player_id, player_duels_bee_ids);
    const average_percentage:number = best_result_percentage.reduce((a, b) => a+b, 0) / best_result_percentage.length;
    const return_value:SpellingBeeDuellGuess[] = []
    var bot_points:number = average_percentage * BOT_THRESHOLD.get_random() * getMaxPoints(bee_model.words, bee_model.other_letters);
    const bot_guesses:string[] = []
    while (bot_points > 0) {
        const guess:string = bee_model.words[Math.floor(Math.random() * bee_model.words.length)]
        if (!bot_guesses.includes(guess)) {
            bot_guesses.push(guess)
            bot_points -= wordPoints(guess, bee_model.other_letters)
        }
    }
    const guess_interval:number = (DUEL_DURATION - 20) / bot_guesses.length;
    var time:number = 10;
    var points:number = 0;
    for (var guess of bot_guesses) {
        var points_for_guess:number = wordPoints(guess, bee_model.other_letters);
        points += points_for_guess
        return_value.push(new SpellingBeeDuellGuess("", Math.floor(time), points));
        time += guess_interval;
    }
    return return_value;
}

async function getSpellingBeeDuelPrematchPlayerInfo(id:number):Promise<SpellingBeeDuelPrematchPlayerInfo> {
    return new SpellingBeeDuelPrematchPlayerInfo(
        id,
        (await get_nick(id, dbi)).nick,
        await dbi.getCurrentSpellingBeeElo(id)
    )
}

spelling_bee_duel.post('/prematch', async (req:express.Request, res:express.Response, next:Function) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(request.authId);
        const timestamp:number = Date.now() / 1000;
        const existing_duell = await dbi.checkForUnfinishedDuel(player_id, timestamp, DUEL_DURATION);
        if (existing_duell !== null) {
            res.json(new SpellingBeeDuelPrematchReply('ok', await getSpellingBeeDuelPrematchPlayerInfo(player_id), await getSpellingBeeDuelPrematchPlayerInfo(existing_duell.opponent_id)))
            return;
        }
        const existing_match = await dbi.getSpellingBeeDuelMatch(player_id);
        if (existing_match !== null) {
            res.json(new SpellingBeeDuelPrematchReply('ok', await getSpellingBeeDuelPrematchPlayerInfo(player_id), await getSpellingBeeDuelPrematchPlayerInfo(existing_match.opponent_id)))
            return;
        }
        const opponentsCandidates:number[] = await dbi.getOpponentsFromSpellingBeeEloRank(player_id, (await dbi.getCurrentSpellingBeeElo(player_id)), MATCH_ELO_DIFF)
        var opponent_id = get_bot_id()
        if (Math.random() >= CHANCE_FOR_BOT && opponentsCandidates.length !== 0) {
            var opponent_filter:Set<number> = new Set((await dbi.getLastSpellingBeeDuelOpponents(player_id)));
            var filtered_candidates:number[] = opponentsCandidates.filter(id => !opponent_filter.has(id));
            console.log(filtered_candidates);
            if (filtered_candidates.length !== 0) {
                opponent_id = filtered_candidates[Math.floor(Math.random() * filtered_candidates.length)];
            }
        }
        await dbi.addSpellingBeeDuelMatch(player_id, opponent_id);
        stats.addSpellingBeeDuelPrematchEvent(player_id, opponent_id);
        res.json(new SpellingBeeDuelPrematchReply('ok', await getSpellingBeeDuelPrematchPlayerInfo(player_id), await getSpellingBeeDuelPrematchPlayerInfo(opponent_id)))
    }
    catch (error) {
        console.log(error);
    }
})

spelling_bee_duel.post('/start',  async (req:express.Request, res:express.Response, next:Function) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(request.authId);
        const timestamp:number = Date.now() / 1000;
        var duel:SpellingBeeDuel|null = await dbi.checkForUnfinishedDuel(player_id, timestamp, DUEL_DURATION);
        if (duel === null) {
            duel = (await dbi.checkForExistingDuel(player_id, timestamp, DUEL_DURATION));
        }
        var opponent_guesses:SpellingBeeDuellGuess[] = []
        const existing_match = await dbi.getSpellingBeeDuelMatch(player_id);
        var opponent_id:number = existing_match!.opponent_id
        if (duel === null) {
            var spelling_bee_model:Bee|null = await dbi.getRandomBee();
            if (opponent_id < 0) {
                const bot_guesses = await createBotGuesses((await dbi.getRandomBee())!, player_id);
                opponent_guesses = opponent_guesses.concat(bot_guesses);
            }
            else {
                spelling_bee_model = (await dbi.getRandomDuelBee(opponent_id));
                var best_duel:SpellingBeeDuel|null = (await dbi.getDuelsForGivenBee(spelling_bee_model!.id, opponent_id, timestamp, DUEL_DURATION));
                opponent_guesses = opponent_guesses.concat(best_duel!.player_guesses).map(g => g = new SpellingBeeDuellGuess(g.word, g.timestamp - best_duel!.start_timestamp ,g.points_after_guess));
            }
            console.log(opponent_guesses);
            var opponent_points = 0;
            if (opponent_guesses.length > 0) {
               opponent_points = opponent_guesses[opponent_guesses.length - 1].points_after_guess;
            }
            duel = (await dbi.startDuel(spelling_bee_model!, player_id, opponent_id, opponent_guesses, opponent_points, timestamp, getSeasonRules()));
        }
        else {
            opponent_guesses = opponent_guesses.concat(duel.opponent_guesses)
            opponent_id = duel.opponent_id
        }
        stats.addSpellingBeeDuelStartEvent(player_id, opponent_id, duel!.bee_id, duel!.bee_duel_id);
        res
        .status(200)
        .json(new SpellingBeeDuelStart((await get_nick(opponent_id, dbi)).nick, opponent_guesses.map(g => new SpellingBeeDuellGuessMessage("", g.timestamp, g.points_after_guess)),
            new SpellingBeeDuelStateReply(duel!.letters, duel!.player_guesses.map(guess => guess.word), duel!.player_points, Math.floor(duel.start_timestamp + DUEL_DURATION - timestamp), DUEL_DURATION, duel!.lettersToBuy))
        )
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

spelling_bee_duel.post('/guess', async (req, res, next) => {
    try {
        const request = new BaseGuessRequest(req);
        const guess = request.guess;
        const player_id = await dbi.resolvePlayerId(request.authId);
        const timestamp = Date.now() / 1000;
        var duel:SpellingBeeDuel|null = await dbi.checkForExistingDuel(player_id, timestamp, DUEL_DURATION);
        const bee_model:Bee|null = await dbi.getBeeById(duel!.bee_id)
        const result = await processPlayerGuess(guess, duel!.player_guesses.map(g => g.word), bee_model!, duel!.letters, getSeasonRules("duel_season.json"), dbi);
        if (result.message != SpellingBeeReplyEnum.ok) {
            res.json(new SpellingBeeDuelGuessReply(result.message, new SpellingBeeDuelStateReply(duel!.letters, duel!.player_guesses.map(g => g.word), duel!.player_points,Math.floor(duel!.start_timestamp + DUEL_DURATION - timestamp), DUEL_DURATION, duel!.lettersToBuy), 0));
            return;
        }
        for (var i = 0; i < result.guessesAdded.length; i++) {
            duel = await dbi.addPlayerGuessInSpellingBeeDuel(duel!.bee_duel_id, player_id, result.guessesAdded[i], result.pointsAdded[i], duel!, timestamp);
        }
        var totalPoints = result.pointsAdded.reduce((a, b) => a + b);
        stats.addSpellingBeeDuelGuessEvent(player_id, duel!.bee_duel_id, totalPoints, duel!.player_points);
        res.json(new SpellingBeeDuelGuessReply(result.message, new SpellingBeeDuelStateReply(duel!.letters, duel!.player_guesses.map(g => g.word), duel!.player_points, Math.floor(duel!.start_timestamp + DUEL_DURATION - timestamp), DUEL_DURATION, duel!.lettersToBuy), totalPoints));
    }
    catch(error) {
        console.log(error)
        next(error)
        Sentry.captureException(error)
    }
})


spelling_bee_duel.post('/end',async (req:express.Request, res:express.Response, next:NextFunction) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(request.authId);
        const timestamp = Date.now() / 1000;
        var duel:SpellingBeeDuel|null = await dbi.checkForUnfinishedDuel(player_id, timestamp, DUEL_DURATION);
        if (duel === null) {
            var ongoing_duel:SpellingBeeDuel|null = await dbi.checkForExistingDuel(player_id, timestamp, DUEL_DURATION);
            if (ongoing_duel === null) {
                res.json(new SpelllingBeeDuelEnd(DuelResult.error, -1, -1, -1, -1))
            }
            else {
                res.json(new SpelllingBeeDuelEnd(DuelResult.error, -1, -1, Math.floor(ongoing_duel.start_timestamp + DUEL_DURATION - timestamp), -1, -1))
            }
            return
        }
        await dbi.markDuelAsFinished(duel.bee_duel_id, player_id)
        var result = DuelResult.draw
        if (duel.player_points > duel.opponent_points) {
            result = DuelResult.win
        }
        if (duel.opponent_points > duel.player_points) {
            result = DuelResult.lose
        }
        const currentEloScore:number = await dbi.getCurrentSpellingBeeElo(player_id);
        const opponentElo:number = await dbi.getCurrentSpellingBeeElo(duel.opponent_id);
        const new_player_elo:number = calculateNewSimpleRank(currentEloScore, result);
        dbi.updateSpellingBeeEloRank(player_id, new_player_elo);
        stats.addSpellingBeeDuelEndEvent(player_id, duel!.bee_duel_id, result, currentEloScore, new_player_elo)
        res.json(new SpelllingBeeDuelEnd(result, duel.player_points, duel.opponent_points, new_player_elo, new_player_elo - currentEloScore))
    } catch (error) {
        console.log(error)
        next(error)
        Sentry.captureException(error);
    }
})

spelling_bee_duel.post('/buy_letter',async (req, res, next) => {
    const value = new AuthIdRequest(req)
    const player_id = await dbi.resolvePlayerId(value.authId)
    const timestamp = Date.now() / 1000;
    var duel:SpellingBeeDuel|null = await dbi.checkForExistingDuel(player_id, timestamp, DUEL_DURATION);
    const bee_model:Bee|null = await dbi.getBeeById(duel!.bee_id)
    var lettersToBuy = duel!.lettersToBuy; 
    if (lettersToBuy.length == 0) {
        res.json({"message":"no letters to buy"})
        return;
    }
    var currentPlayerPoints:number|undefined = duel?.player_points
    if (!currentPlayerPoints) {
        currentPlayerPoints = 0;
    }
    var letterPrice = lettersToBuy.splice(0, 1)[0];
    if (letterPrice.price > currentPlayerPoints) {
        res.json({"message": "not_enough_points"})
        return;
    }
    var lettersState = duel!.letters;
    var plainLetters = lettersState.map(ls => ls.letter)
    var possibleLetters = ALPHABET.filter(letter => !plainLetters.includes(letter))
    console.log(possibleLetters)
    var boughtLetterIndex:number = Math.floor(Math.random() * possibleLetters.length)
    var boughtLetter:string = possibleLetters[boughtLetterIndex]
    console.log(boughtLetter + " " + boughtLetterIndex)
    lettersState.push(new LetterState(boughtLetter, letterPrice.useLimit, 0 , false));
    var newDuel = await dbi.addNewLetterToSpellingBeeDuel(duel!.bee_duel_id, lettersState, lettersToBuy, -letterPrice.price);
    res.json(new SpellingBeeDuelStateReply(duel!.letters, duel!.player_guesses.map(g => g.word), duel!.player_points, Math.floor(duel!.start_timestamp + DUEL_DURATION - timestamp), DUEL_DURATION, duel!.lettersToBuy));
})

spelling_bee_duel.post('/get_friend_elo_rank', async (req:express.Request, res:express.Response, next:NextFunction) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(request.authId);
        var friends = await dbi.friendList(player_id);
        friends.push(player_id)
        var rank = await dbi.getSpellingBeeEloRankWithFilter(friends);
        res.json((await get_ranking(player_id, rank, dbi)));
    } catch (error) {
        console.log(error)
        next(error)
        Sentry.captureException(error);
    }

})

spelling_bee_duel.post('/get_elo_rank', async (req:express.Request, res:express.Response, next:NextFunction) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(request.authId);
        var rank = await dbi.getSpellingBeeEloRank();
        res.json((await get_ranking(player_id, rank, dbi)));
    } catch (error) {
        console.log(error)
        next(error)
        Sentry.captureException(error);
    }

})

