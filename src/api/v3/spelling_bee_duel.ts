import express, { NextFunction } from 'express';
import Sentry from '@sentry/node';
import AuthIdRequest from '../../types/AuthIdRequest'
import { checkSpellingBeeGuess, getMaxPoints, SpellingBeeGuessReply, SpellingBeeReplyEnum, SpellingBeeStateReply, wordPoints } from './spelling_bee_common';
import WordleDBI, { Bee, SpellingBeeDuel, SpellingBeeDuellGuess } from '../../DBI';
import BaseGuessRequest from '../../types/BaseGuessRequest';
import { MinMax } from '../../utils';
import { get_bot_id, get_nick } from './player_common';
import { string } from '@hapi/joi';

const DUEL_DURATION:number = 150;

//const BOT_THRESHOLD:MinMax = new MinMax(0.15, 0.4);
const BOT_THRESHOLD:MinMax = new MinMax(0.001, 0.1);

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
    constructor(public opponent_nick:string, public opponent_moves:SpellingBeeDuellGuess[], public state:SpellingBeeDuelStateReply) {}
}

class SpelllingBeeDuelEnd {
    constructor(public result:DuelResult, public player_points:number, public opponent_points:number, public time_left?:number) {}
}

class SpellingBeeDuelStateReply {
    constructor(public main_letter:string, public other_letters:string[], public guessed_words:string[], public player_points:number, public time_left:number, public round_time:number) {
    }
}

function createBotGuesses(bee_model:Bee):SpellingBeeDuellGuess[] {
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
        time += guess_interval;
    }
    return return_value;
}


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
        var opponent_id:number = -1
        if (duel === null) {
            var spelling_bee_model:Bee|null = (await dbi.getRandomDuelBee(player_id));
            console.log(spelling_bee_model!.id)
            var past_duels:SpellingBeeDuel[] = (await dbi.getDuelsForGivenBee(spelling_bee_model!.id, timestamp, DUEL_DURATION));
            console.log(past_duels)
            var player_ids:Set<number> = new Set(past_duels.map(d => d.player_id));
            console.log(player_ids)
            var ids_to_delete:number[] = [];
            player_ids.forEach(element => {
                if (element < 0) {
                    ids_to_delete.push(element)
                }
            });
            ids_to_delete.forEach(id => player_ids.delete(id))
            console.log(player_ids)
            if (player_ids.size === 0) {
                opponent_id = get_bot_id()
                const bot_guesses = createBotGuesses(spelling_bee_model!);
                opponent_guesses = opponent_guesses.concat(bot_guesses);
            }
            else {
                var random_index:number = Math.floor(Math.random() * player_ids.size);
                for (var id of player_ids) {
                    if (random_index === 0) {
                        opponent_id = id
                        break
                    }
                    random_index--;
                }
                var best_duel:SpellingBeeDuel|null = past_duels.reduce((previous_duel:SpellingBeeDuel|null, current_duel:SpellingBeeDuel|null) => {
                    if (previous_duel === null) {
                        return current_duel;
                    }
                    if (previous_duel.player_points < current_duel!.player_points) {
                        return current_duel;
                    }
                    return previous_duel;
                }, null)
                opponent_guesses = opponent_guesses.concat(best_duel!.player_guesses.map(g => new SpellingBeeDuellGuess("", g.timestamp - best_duel!.start_timestamp, g.points_after_guess)));
            }

            duel = (await dbi.startDuel(spelling_bee_model!, player_id, opponent_id, opponent_guesses, opponent_guesses[opponent_guesses.length - 1].points_after_guess, timestamp));
        }
        else {
            opponent_guesses = opponent_guesses.concat(duel.opponent_guesses)
            opponent_id = duel.opponent_id
        }
        res
        .status(200)
        .json(new SpellingBeeDuelStart((await get_nick(opponent_id, dbi)).nick, opponent_guesses,
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
        console.log(duel)
        res.json(new SpelllingBeeDuelEnd(result, duel.player_points, duel.opponent_points))
    } catch (error) {
        console.log(error)
        next(error)
        Sentry.captureException(error);
    }
})

