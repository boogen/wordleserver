import express from 'express';
import * as Sentry from "@sentry/node"
import WordleDBI, { Bee, RankingEntry } from '../../DBI'
import AuthIdRequest from './types/AuthIdRequest';
import SpellingBeeGuessRequest from './types/SpellingBeeGuessRequest';
import { getMaxPoints, wordPoints, SpellingBeeStateReply, SpellingBeeReplyEnum, SuccessfullSpellingBeeStateReply, checkSpellingBeeGuess } from './spelling_bee_common';
import { get_ranking, RankingReply } from './ranking_common';

export const spelling_bee = express.Router();
const dbi = new WordleDBI()
const BEE_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;

class GlobalSpellingBeeStateReply extends SpellingBeeStateReply {
    constructor(public messageEnum:SpellingBeeReplyEnum, public main_letter:string, public other_letters:string[], public guessed_words:string[], public player_points:number, public max_points:number) {
        super(messageEnum.toString(), main_letter, other_letters, guessed_words, player_points);
    }
}

class SuccessfullGlobalSpellingBeeStateReply extends SuccessfullSpellingBeeStateReply {
    constructor(public main_letter:string, public other_letters:string[], public guessed_words:string[], public player_points:number, public max_points:number, points:number) {
        super(SpellingBeeReplyEnum.ok, main_letter, other_letters, guessed_words, player_points, points);
    }
}

spelling_bee.post('/getState', async (req, res, next) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(request.authId);
        var new_validity_timestamp = GLOBAL_TIME_START;
        const timestamp = Date.now() / 1000;
        while (new_validity_timestamp < timestamp) {
            new_validity_timestamp += BEE_VALIDITY;
        }
        var letters = await dbi.getLettersForBee(timestamp);
        if (null === letters) {
            letters = await dbi.createLettersForBee(new_validity_timestamp, null);
        }
        var state = await dbi.getBeeState(player_id, letters.bee_id);
        var guesses:string[] = []
        if (state === null) {
            guesses = []
        }
        else {
            guesses = state.guesses
        }
	    const playerPoints = await dbi.getBeePlayerPoints(player_id, letters.bee_id)
        res.json(new GlobalSpellingBeeStateReply(SpellingBeeReplyEnum.ok, letters.main_letter, letters.letters, guesses, playerPoints, getMaxPoints((await dbi.getBeeWords(letters.bee_model_id)), letters.letters)));
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});

spelling_bee.post('/guess', async (req, res, next) => {
    try {
        const request = new SpellingBeeGuessRequest(req);
        const guess = request.guess;
        const player_id = await dbi.resolvePlayerId(request.authId);
        const timestamp = Date.now() / 1000;
        const letters = await dbi.getLettersForBee(timestamp);
        const bee_model:Bee|null = await dbi.getBeeById(letters!.bee_model_id);
        var state = await dbi.getBeeState(player_id, letters!.bee_id)
        var guesses:string[];
        if (state === null) {
            guesses = []
        }
        else {
            guesses = state.guesses
        }
        var message = await checkSpellingBeeGuess(guess, guesses, bee_model!, dbi)
        if (message != SpellingBeeReplyEnum.ok) {
            res.json(new GlobalSpellingBeeStateReply(message,
                letters!.main_letter,
                letters!.letters,
                guesses,
                (await dbi.getBeePlayerPoints(player_id, letters!.bee_id)),
                getMaxPoints((await dbi.getBeeWords(letters!.bee_model_id)), letters!.letters)))
            return;
        }
        state = await dbi.addBeeGuess(player_id, letters!.bee_id, guess)
        var points = wordPoints(guess, letters!.letters)
        await dbi.increaseBeeRank(player_id, letters!.bee_id, points)
        res.json(new SuccessfullGlobalSpellingBeeStateReply(
            letters!.main_letter,
            letters!.letters,
            state!.guesses,
            (await dbi.getBeePlayerPoints(player_id, letters!.bee_id)),
            getMaxPoints((await dbi.getBeeWords(letters!.bee_model_id)), letters!.letters),
            points
            ))
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});



spelling_bee.post('/ranking', async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(value.authId);
        const timestamp = Date.now() / 1000;
        const bee = await dbi.getLettersForBee(timestamp);
        console.log("Bee id:" + bee);
        if (bee === null) {
            res.json(new RankingReply(undefined, []))
            return
        }
        const ranking = await dbi.getBeeRanking(bee.bee_id)
        console.log(ranking);
        res.json((await get_ranking(player_id, ranking, dbi)))
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})
