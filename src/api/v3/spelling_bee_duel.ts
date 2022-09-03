import express from 'express';
import Sentry from '@sentry/node';
import AuthIdRequest from '../../types/AuthIdRequest'
import { checkSpellingBeeGuess, getMaxPoints, SpellingBeeGuessReply, SpellingBeeReplyEnum, SpellingBeeStateReply, wordPoints } from './spelling_bee_common';
import WordleDBI, { Bee, SpellingBeeDuel, SpellingBeeDuellGuess } from '../../DBI';
import BaseGuessRequest from '../../types/BaseGuessRequest';
import { MinMax } from '../../utils';
import { get_nick } from './player_common';

const DUEL_DURATION:number = 180;
const BOT_PLAYER = -1;

const BOT_THRESHOLD:MinMax = new MinMax(0.3, 0.6);

export const spelling_bee_duel = express.Router();
const dbi = new WordleDBI()

class SpellingBeeDuelStart {
    constructor(public opponent_nick:string, public opponent_moves:SpellingBeeDuellGuess[], public state:SpellingBeeStateReply) {}
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
        return_value.push(new SpellingBeeDuellGuess(guess, time, points));
        time += guess_interval;
    }
    return return_value;
}


spelling_bee_duel.post('/start',  async (req:express.Request, res:express.Response, next:Function) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(request.authId);
        const timestamp:number = Date.now() / 1000;
        var duel:SpellingBeeDuel|null = (await dbi.checkForExistingDuel(player_id, timestamp, DUEL_DURATION));
        var opponent_guesses:SpellingBeeDuellGuess[] = []
        var opponent_id:number = -1
        if (duel === null) {
            var spelling_bee_model:Bee = (await dbi.getRandomBee());
            var past_duels:SpellingBeeDuel[] = (await dbi.getDuelsForGivenBee(spelling_bee_model.id, timestamp));
            var player_ids:Set<number> = new Set(past_duels.flatMap(d => d.players));
            player_ids.delete(BOT_PLAYER);
            if (player_ids.size === 0) {
                opponent_guesses.concat(createBotGuesses(spelling_bee_model));
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
                    if (previous_duel.getPlayerPoints(opponent_id) < current_duel!.getPlayerPoints(opponent_id)) {
                        return current_duel;
                    }
                    return previous_duel;
                }, null)
                opponent_guesses.concat(best_duel!.getPlayerGuesses(opponent_id));
            }
            const opponent_points:number = opponent_guesses.map(w => wordPoints(w.word, spelling_bee_model.other_letters)).reduce( (a:number, b:number) => a + b, 0);
            duel = (await dbi.startDuel(spelling_bee_model, player_id, opponent_id, opponent_guesses, opponent_points, timestamp));
        }
        res
        .status(200)
        .json(new SpellingBeeDuelStart((await get_nick(opponent_id, dbi)).nick, opponent_guesses,
            new SpellingBeeStateReply(SpellingBeeReplyEnum.ok, duel!.main_letter, duel!.letters, duel!.getPlayerGuesses(player_id).map(guess => guess.word), duel!.getPlayerPoints(player_id)))
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
        var message = await checkSpellingBeeGuess(guess, duel!.getPlayerGuessesAsString(player_id), bee_model!, dbi)
        if (message !== SpellingBeeReplyEnum.ok) {
            res.json(new SpellingBeeStateReply(message, duel!.main_letter, duel!.letters, duel!.getPlayerGuessesAsString(player_id), duel!.getPlayerPoints(player_id)));
        }
        var points:number = wordPoints(guess, bee_model!.other_letters)
        duel = await dbi.addPlayerGuessInSpellingBeeDuel(duel!.bee_duel_id, player_id, guess, points, duel!, timestamp);
        res.json(new SpellingBeeGuessReply(new SpellingBeeStateReply(message, duel!.main_letter, duel!.letters, duel!.getPlayerGuessesAsString(player_id), duel!.getPlayerPoints(player_id)), points));
    }
    catch(error) {
        console.log(error)
        next(error)
        Sentry.captureException(error)
    }
})

