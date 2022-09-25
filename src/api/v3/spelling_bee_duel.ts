import express, { NextFunction } from 'express';
import Sentry from '@sentry/node';
import AuthIdRequest from '../../types/AuthIdRequest'
import { checkSpellingBeeGuess, getMaxPoints, SpellingBeeReplyEnum, wordPoints } from './spelling_bee_common';
import WordleDBI, { Bee, SpellingBeeDuel, SpellingBeeDuellGuess } from '../../DBI';
import BaseGuessRequest from '../../types/BaseGuessRequest';
import { get_bot_id, get_nick } from './player_common';
import { ELO_COEFFICIENT, DUEL_DURATION, BOT_THRESHOLD, MATCH_ELO_DIFF } from './duel_settings';

export const spelling_bee_duel = express.Router();
const dbi = new WordleDBI()

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
    constructor(public result:DuelResult, public player_points:number, public opponent_points:number, public time_left?:number) {}
}

class SpellingBeeDuelStateReply {
    constructor(public main_letter:string, public other_letters:string[], public guessed_words:string[], public player_points:number, public time_left:number, public round_time:number) {
    }
}

class SpellingBeeDuellGuessMessage {
    constructor(public word:string, public seconds:number, public points:number){}
}


class SpellingBeeDuelPrematchPlayerInfo {
    constructor(public id:number, public nick:string, public elo:number) {}
}

class SpellingBeeDuelPrematchReply {
    constructor(public message:string, public player:SpellingBeeDuelPrematchPlayerInfo, public opponent:SpellingBeeDuelPrematchPlayerInfo) {}
}



function calculateNewEloRank(playerScore:number, opponentScore:number, result:DuelResult):number {
    const rankingDiff:number = Math.abs(opponentScore - playerScore);
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

function createBotGuesses(bee_model:Bee, timestamp:number):SpellingBeeDuellGuess[] {
    const return_value:SpellingBeeDuellGuess[] = []
    var bot_points:number = BOT_THRESHOLD.get_random() * getMaxPoints(bee_model.words, bee_model.other_letters);
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
        time += guess_interval + timestamp;
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
        if (opponentsCandidates.length !== 0) {
            var opponent_filter:Set<number> = new Set((await dbi.getLastSpellingBeeDuelOpponents(player_id)));
            var filtered_candidates:number[] = opponentsCandidates.filter(id => !opponent_filter.has(id));
            if (filtered_candidates.length !== 0) {
                opponent_id = filtered_candidates[Math.floor(Math.random() * filtered_candidates.length)];
            }
        }
        await dbi.addSpellingBeeDuelMatch(player_id, opponent_id);
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
            var spelling_bee_model:Bee|null = (await dbi.getRandomDuelBee(opponent_id));
            console.log(spelling_bee_model!.id)
            var past_duels:SpellingBeeDuel[] = (await dbi.getDuelsForGivenBee(spelling_bee_model!.id, timestamp, DUEL_DURATION));
            console.log(past_duels)
            var player_ids:Set<number> = new Set(past_duels.map(d => d.player_id));
            console.log(player_ids)
            var ids_to_delete:number[] = [player_id];
            player_ids.forEach(element => {
                if (element < 0) {
                    ids_to_delete.push(element)
                }
            });
            ids_to_delete.forEach(id => player_ids.delete(id))
            console.log(player_ids)
            if (player_ids.size === 0) {
                const bot_guesses = createBotGuesses(spelling_bee_model!, timestamp);
                opponent_guesses = opponent_guesses.concat(bot_guesses);
            }
            else {
                var best_duel:SpellingBeeDuel|null = past_duels.reduce((previous_duel:SpellingBeeDuel|null, current_duel:SpellingBeeDuel|null) => {
                    if (previous_duel === null) {
                        return current_duel;
                    }
                    if (previous_duel.player_points < current_duel!.player_points) {
                        return current_duel;
                    }
                    return previous_duel;
                }, null)
                opponent_guesses = opponent_guesses.concat(best_duel!.player_guesses);
            }

            duel = (await dbi.startDuel(spelling_bee_model!, player_id, opponent_id, opponent_guesses, opponent_guesses[opponent_guesses.length - 1].points_after_guess, timestamp));
        }
        else {
            opponent_guesses = opponent_guesses.concat(duel.opponent_guesses)
            opponent_id = duel.opponent_id
        }
        res
        .status(200)
        .json(new SpellingBeeDuelStart((await get_nick(opponent_id, dbi)).nick, opponent_guesses.map(g => new SpellingBeeDuellGuessMessage("", g.timestamp - duel!.start_timestamp, g.points_after_guess)),
            new SpellingBeeDuelStateReply(duel!.main_letter, duel!.letters, duel!.player_guesses.map(guess => guess.word), duel!.player_points, Math.floor(duel.start_timestamp + DUEL_DURATION - timestamp), DUEL_DURATION))
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
        var message = await checkSpellingBeeGuess(guess, duel!.player_guesses.map(g => g.word), bee_model!, dbi)
        if (message !== SpellingBeeReplyEnum.ok) {
            res.json(new SpellingBeeDuelGuessReply(message, new SpellingBeeDuelStateReply(duel!.main_letter, duel!.letters, duel!.player_guesses.map(g => g.word), duel!.player_points,Math.floor(duel!.start_timestamp + DUEL_DURATION - timestamp), DUEL_DURATION), 0));
            return;
        }
        var points:number = wordPoints(guess, bee_model!.other_letters)
        duel = await dbi.addPlayerGuessInSpellingBeeDuel(duel!.bee_duel_id, player_id, guess, points, duel!, timestamp);
        res.json(new SpellingBeeDuelGuessReply(message, new SpellingBeeDuelStateReply(duel!.main_letter, duel!.letters, duel!.player_guesses.map(g => g.word), duel!.player_points, Math.floor(duel!.start_timestamp + DUEL_DURATION - timestamp), DUEL_DURATION), points));
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
                res.json(new SpelllingBeeDuelEnd(DuelResult.error, -1, -1))
            }
            else {
                res.json(new SpelllingBeeDuelEnd(DuelResult.error, -1, -1, Math.floor(ongoing_duel.start_timestamp + DUEL_DURATION - timestamp)))
            }
            return
        }
        await dbi.markDuelAsFinished(duel.bee_duel_id)
        var result = DuelResult.draw
        if (duel.player_points > duel.opponent_points) {
            result = DuelResult.win
        }
        if (duel.opponent_points > duel.player_points) {
            result = DuelResult.lose
        }
        const currentEloScore:number = await dbi.getCurrentSpellingBeeElo(player_id);
        const opponentElo:number = await dbi.getCurrentSpellingBeeElo(duel.opponent_id);
        dbi.updateSpellingBeeEloRank(player_id, calculateNewEloRank(currentEloScore, opponentElo, result));
        res.json(new SpelllingBeeDuelEnd(result, duel.player_points, duel.opponent_points))
    } catch (error) {
        console.log(error)
        next(error)
        Sentry.captureException(error);
    }
})

