import express, { NextFunction } from 'express';
import Sentry from '@sentry/node';
import AuthIdRequest from './types/AuthIdRequest'
import { ALPHABET, checkGuessForIncorrectLetters, checkSpellingBeeGuess, getMaxPoints, processPlayerGuess, SpellingBeeReplyEnum, wordPoints, wordPointsSeason } from './spelling_bee_common';
import WordleDBI from './DBI/DBI';
import { Bee } from "./DBI/spelling_bee/Bee";
import { LetterState } from "./DBI/spelling_bee/LetterState";
import BaseGuessRequest from './types/BaseGuessRequest';
import { get_bot_id, get_nick } from './player_common';
import { ELO_COEFFICIENT, DUEL_DURATION, BOT_THRESHOLD, MATCH_ELO_DIFF, CHANCE_FOR_BOT } from './duel_settings';
import { get_ranking } from './ranking_common';
import { Stats } from '../../WordleStatsDBI';
import { getDuelSeasonRules, LetterToBuy, SeasonRules } from './season_rules';
import { notifyAboutRankingChange } from './ranking';
import { addNewLetterToSpellingBeeDuel, addPlayerGuessInSpellingBeeDuel, addSpellingBeeDuelMatch, checkForExistingDuel, checkForUnfinishedDuel, getAllPlayerDuelsBeeIds, getBestResultPercentage, getDuelsForGivenBee, getLastSpellingBeeDuelOpponents, getRandomDuelBee, getSpellingBeeDuelMatch, markDuelAsFinished, startDuel } from './DBI/spelling_bee/duel/spelling_bee_duel';
import { SpellingBeeDuellGuess } from './DBI/spelling_bee/duel/SpellingBeeDuellGuess';
import { resolvePlayerId } from './DBI/player/player';
import { SpellingBeeDuel } from './DBI/spelling_bee/duel/SpellingBeeDuel';
import { getBeeById, getRandomBee } from './DBI/spelling_bee/model';

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

class SpellingBeeDuelSeasonInfo {
    constructor(public season_title:string, public seconds_to_end:number, public rules:string, public point_rules:string){}
}

class SpellingBeeDuelPrematchReply {
    constructor(public message:string, public player:SpellingBeeDuelPrematchPlayerInfo, public opponent:SpellingBeeDuelPrematchPlayerInfo, public season_info:SpellingBeeDuelSeasonInfo) {}
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

async function createBotGuesses(bee_model:Bee, player_id:number, season_rules:SeasonRules):Promise<SpellingBeeDuellGuess[]> {
    const player_duels_bee_ids:number[] = await getAllPlayerDuelsBeeIds(player_id, dbi);
    const best_result_percentage:number[] = await getBestResultPercentage(player_id, player_duels_bee_ids, dbi);
    const average_percentage:number = best_result_percentage.reduce((a, b) => a+b, 0) / best_result_percentage.length;
    const return_value:SpellingBeeDuellGuess[] = []
    var bot_points:number = average_percentage * BOT_THRESHOLD.get_random() * bee_model.max_points;
    const bot_guess_points:number[] = []
    const possiblePoints = [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
    while (bot_points > 0) {
        var points = possiblePoints[Math.floor(Math.random() * possiblePoints.length)]
        bot_points -= points;
        bot_guess_points.push(points);
    }
    const guess_interval:number = (DUEL_DURATION - 20) / bot_guess_points.length;
    var time:number = 10;
    var points:number = 0;
    for (var points_for_guess of bot_guess_points) {
        points += points_for_guess
        return_value.push(new SpellingBeeDuellGuess("", Math.floor(time), points));
        time += guess_interval;
    }
    return return_value;
}

async function getSpellingBeeDuelPrematchPlayerInfo(id:number, season_rules:SeasonRules):Promise<SpellingBeeDuelPrematchPlayerInfo> {
    return new SpellingBeeDuelPrematchPlayerInfo(
        id,
        (await get_nick(id, dbi)).nick,
        await dbi.getCurrentSpellingBeeElo(id, season_rules.id)
    )
}

spelling_bee_duel.post('/prematch', async (req:express.Request, res:express.Response, next:Function) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await resolvePlayerId(request.auth_id, dbi);
        const timestamp:number = Date.now() / 1000;
        const existing_duell = await checkForUnfinishedDuel(player_id, timestamp, DUEL_DURATION, dbi);
        var season_rules = await getDuelSeasonRules();
        if (existing_duell !== null) {
            res.json(new SpellingBeeDuelPrematchReply('ok', await getSpellingBeeDuelPrematchPlayerInfo(player_id, season_rules), await getSpellingBeeDuelPrematchPlayerInfo(existing_duell.opponent_id, season_rules), new SpellingBeeDuelSeasonInfo(season_rules.season_title, season_rules.getSecondsToEnd(), season_rules.rules, season_rules.points)))
            return;
        }
        const existing_match = await getSpellingBeeDuelMatch(player_id, season_rules.duelTag!, dbi);
        if (existing_match !== null) {
            res.json(new SpellingBeeDuelPrematchReply('ok', await getSpellingBeeDuelPrematchPlayerInfo(player_id, season_rules), await getSpellingBeeDuelPrematchPlayerInfo(existing_match.opponent_id, season_rules), new SpellingBeeDuelSeasonInfo(season_rules.season_title, season_rules.getSecondsToEnd(), season_rules.rules, season_rules.points)))
            return;
        }
        const opponentsCandidates:number[] = await dbi.getOpponentsFromSpellingBeeEloRank(player_id, (await dbi.getCurrentSpellingBeeElo(player_id, season_rules.id)), MATCH_ELO_DIFF, season_rules.id)
        var opponent_id = get_bot_id()
        if (Math.random() >= CHANCE_FOR_BOT && opponentsCandidates.length !== 0) {
            var opponent_filter:Set<number> = new Set((await getLastSpellingBeeDuelOpponents(player_id, dbi)));
            var filtered_candidates:number[] = opponentsCandidates.filter(id => !opponent_filter.has(id));
            console.log(filtered_candidates);
            if (filtered_candidates.length !== 0) {
                opponent_id = filtered_candidates[Math.floor(Math.random() * filtered_candidates.length)];
            }
        }
        await addSpellingBeeDuelMatch(player_id, opponent_id, season_rules.duelTag!, dbi);
        stats.addSpellingBeeDuelPrematchEvent(player_id, opponent_id);
        res.json(new SpellingBeeDuelPrematchReply('ok', await getSpellingBeeDuelPrematchPlayerInfo(player_id, season_rules), await getSpellingBeeDuelPrematchPlayerInfo(opponent_id, season_rules), new SpellingBeeDuelSeasonInfo(season_rules.season_title, season_rules.getSecondsToEnd(), season_rules.rules, season_rules.points)))
    }
    catch (error) {
        console.log(error);
    }
})

spelling_bee_duel.post('/start',  async (req:express.Request, res:express.Response, next:Function) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await resolvePlayerId(request.auth_id, dbi);
        const timestamp:number = Date.now() / 1000;
        var duel:SpellingBeeDuel|null = await checkForUnfinishedDuel(player_id, timestamp, DUEL_DURATION, dbi);
        if (duel === null) {
            duel = (await checkForExistingDuel(player_id, timestamp, DUEL_DURATION, dbi));
        }
        var opponent_guesses:SpellingBeeDuellGuess[] = []
        const season_rules = await getDuelSeasonRules();
        const existing_match = await getSpellingBeeDuelMatch(player_id, season_rules.duelTag!, dbi);
        var opponent_id:number = existing_match!.opponent_id
        if (duel === null) {
            var spelling_bee_model:Bee|null = await getRandomBee(dbi, season_rules);
            if (opponent_id < 0) {
                const bot_guesses = await createBotGuesses((await getRandomBee(dbi, season_rules))!, player_id, season_rules);
                opponent_guesses = opponent_guesses.concat(bot_guesses);
            }
            else {
                spelling_bee_model = (await getRandomDuelBee(opponent_id, season_rules, dbi));
                var best_duel:SpellingBeeDuel|null = (await getDuelsForGivenBee(spelling_bee_model!.id, opponent_id, timestamp, DUEL_DURATION, dbi));
                opponent_guesses = opponent_guesses.concat(best_duel?.player_guesses ?? []).map(g => g = new SpellingBeeDuellGuess(g.word, g.timestamp - best_duel!.start_timestamp ,g.points_after_guess));
            }
            console.log(opponent_guesses);
            var opponent_points = 0;
            if (opponent_guesses.length > 0) {
               opponent_points = opponent_guesses[opponent_guesses.length - 1].points_after_guess;
            }
            duel = (await startDuel(spelling_bee_model!, player_id, opponent_id, opponent_guesses, opponent_points, timestamp, season_rules, dbi));
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
        const player_id = await resolvePlayerId(request.auth_id, dbi);
        const timestamp = Date.now() / 1000;
        var duel:SpellingBeeDuel|null = await checkForExistingDuel(player_id, timestamp, DUEL_DURATION, dbi);
        const bee_model:Bee|null = await getBeeById(duel!.bee_id, dbi)
        const season_rules:SeasonRules = duel!.season_rules as SeasonRules;
        const result = await processPlayerGuess(guess, duel!.player_guesses.map(g => g.word), bee_model!, duel!.letters, season_rules, dbi);
        if (result.message != SpellingBeeReplyEnum.ok) {
            res.json(new SpellingBeeDuelGuessReply(result.message, new SpellingBeeDuelStateReply(duel!.letters, duel!.player_guesses.map(g => g.word), duel!.player_points,Math.floor(duel!.start_timestamp + DUEL_DURATION - timestamp), DUEL_DURATION, duel!.lettersToBuy), 0));
            return;
        }
        for (var i = 0; i < result.guessesAdded.length; i++) {
            duel = await addPlayerGuessInSpellingBeeDuel(duel!.bee_duel_id, player_id, result.guessesAdded[i], result.pointsAdded[i], duel!, timestamp, dbi);
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
        const player_id = await resolvePlayerId(request.auth_id, dbi);
        const timestamp = Date.now() / 1000;
        var duel:SpellingBeeDuel|null = await checkForUnfinishedDuel(player_id, timestamp, DUEL_DURATION, dbi);
        if (duel === null) {
            var ongoing_duel:SpellingBeeDuel|null = await checkForExistingDuel(player_id, timestamp, DUEL_DURATION, dbi);
            if (ongoing_duel === null) {
                res.json(new SpelllingBeeDuelEnd(DuelResult.error, -1, -1, -1, -1))
            }
            else {
                res.json(new SpelllingBeeDuelEnd(DuelResult.error, -1, -1, Math.floor(ongoing_duel.start_timestamp + DUEL_DURATION - timestamp), -1, -1))
            }
            return
        }
        const season_rules:SeasonRules = duel!.season_rules;
        await markDuelAsFinished(duel.bee_duel_id, player_id, season_rules?.duelTag ?? "vanilla", dbi)
        var result = DuelResult.draw
        if (duel.player_points > duel.opponent_points) {
            result = DuelResult.win
        }
        if (duel.opponent_points > duel.player_points) {
            result = DuelResult.lose
        }
        const currentEloScore:number = await dbi.getCurrentSpellingBeeElo(player_id, season_rules.id);
        const opponentElo:number = await dbi.getCurrentSpellingBeeElo(duel.opponent_id, season_rules.id);
        const new_player_elo:number = calculateNewSimpleRank(currentEloScore, result);
        const oldRank = await dbi.getSpellingBeeEloRank(season_rules.id)
        notifyAboutRankingChange(player_id, oldRank, currentEloScore, new_player_elo, "Pojedynek")
        dbi.updateSpellingBeeEloRank(player_id, new_player_elo - currentEloScore, season_rules.id);
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
    const player_id = await resolvePlayerId(value.auth_id, dbi)
    const timestamp = Date.now() / 1000;
    var duel:SpellingBeeDuel|null = await checkForExistingDuel(player_id, timestamp, DUEL_DURATION, dbi);
    const bee_model:Bee|null = await getBeeById(duel!.bee_id, dbi)
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
    var newDuel = await addNewLetterToSpellingBeeDuel(duel!.bee_duel_id, lettersState, lettersToBuy, -letterPrice.price, dbi);
    res.json(new SpellingBeeDuelStateReply(duel!.letters, duel!.player_guesses.map(g => g.word), duel!.player_points, Math.floor(duel!.start_timestamp + DUEL_DURATION - timestamp), DUEL_DURATION, duel!.lettersToBuy));
})


