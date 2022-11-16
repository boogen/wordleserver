import express from 'express';
import * as Sentry from "@sentry/node"
import WordleDBI, { Bee, GlobalBee, GuessedWordsBee, LetterState, RankingEntry } from '../../DBI'
import AuthIdRequest from './types/AuthIdRequest';
import SpellingBeeGuessRequest from './types/SpellingBeeGuessRequest';
import { getMaxPoints, wordPoints, SpellingBeeStateReply, SpellingBeeReplyEnum, SuccessfullSpellingBeeStateReply, checkSpellingBeeGuess, JOKER, ALPHABET, getNewLetterState, checkGuessForIncorrectLetters, wordPointsSeason } from './spelling_bee_common';
import { get_ranking, RankingReply } from './ranking_common';
import { getSeasonRules, SeasonRules } from './season_rules';
import * as fs from 'fs';

export const spelling_bee = express.Router();
const dbi = new WordleDBI()
const BEE_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;

class GlobalSpellingBeeStateReply extends SpellingBeeStateReply {
    constructor(public messageEnum:SpellingBeeReplyEnum, public letters:LetterState[], public guessed_words:string[], public player_points:number, public max_points:number) {
        super(messageEnum.toString(), letters, guessed_words, player_points);
    }
}

class SuccessfullGlobalSpellingBeeStateReply extends SuccessfullSpellingBeeStateReply {
    constructor(public letters:LetterState[], public guessed_words:string[], public player_points:number, public max_points:number, points:number) {
        super(SpellingBeeReplyEnum.ok, letters, guessed_words, player_points, points);
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
        var letters:GlobalBee|null = await dbi.getLettersForBee(timestamp);
        var season_rules = getSeasonRules()
        if (null === letters) {
            letters = await dbi.createLettersForBee(new_validity_timestamp, season_rules);
        }
        var state:GuessedWordsBee|null = await dbi.getBeeState(player_id, letters.bee_id);
        var guesses:string[] = []
        if (state === null) {
            state = await dbi.createBeeState(player_id, letters.bee_id, getNewLetterState(letters.main_letter, letters.letters, season_rules))
            guesses = []
        }
        else {
            guesses = state.guesses
        }
	    const playerPoints = await dbi.getBeePlayerPoints(player_id, letters.bee_id)
        res.json(new GlobalSpellingBeeStateReply(SpellingBeeReplyEnum.ok, state.letters, guesses, playerPoints, getMaxPoints((await dbi.getBeeWords(letters.bee_model_id)), letters.letters)));
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});

spelling_bee.post('/guess', async (req, res, next) => {
    try {
        const request = new SpellingBeeGuessRequest(req);
        var season_rules = getSeasonRules();
        const player_guess = request.guess;
        const player_id = await dbi.resolvePlayerId(request.authId);
        const timestamp = Date.now() / 1000;
        const letters = await dbi.getLettersForBee(timestamp);
        const bee_model:Bee|null = await dbi.getBeeById(letters!.bee_model_id);
        var state = await dbi.getBeeState(player_id, letters!.bee_id)
        var letterCorrectnessMessage = checkGuessForIncorrectLetters(player_guess, bee_model!, state!.letters);
        if (letterCorrectnessMessage != SpellingBeeReplyEnum.ok) {
            res.json(new GlobalSpellingBeeStateReply(letterCorrectnessMessage,
                state!.letters,
                state!.guesses,
                (await dbi.getBeePlayerPoints(player_id, letters!.bee_id)),
                getMaxPoints((await dbi.getBeeWords(letters!.bee_model_id)), letters!.letters)))
            return;
        }

        var guessesToCheck:string[] = []
        if (player_guess.includes(JOKER)) {
            guessesToCheck = ALPHABET.map(letter => {
                var readyWord = player_guess;
                while(readyWord.includes(JOKER)) { 
                    readyWord = readyWord.replace(JOKER, letter)
                }
                return readyWord;
                }
            )
        }
        else {
            guessesToCheck = [player_guess]
        }
        var points = 0;
        var message:SpellingBeeReplyEnum = SpellingBeeReplyEnum.wrong_word;
        var guesses:string[];
        if (state === null) {
            guesses = []
        }
        else {
            guesses = state.guesses
        }
        for (var guess of guessesToCheck) {
            var new_message = await checkSpellingBeeGuess(guess, guesses, bee_model!, letters!.letters, dbi)
            if (message != SpellingBeeReplyEnum.ok) {
                message = new_message;
            }
            if (new_message === SpellingBeeReplyEnum.ok) {
                state = await dbi.addBeeGuess(player_id, letters!.bee_id, guess)
                points += wordPointsSeason(guess, letters!.letters, season_rules)
            }
        }
        await dbi.increaseBeeRank(player_id, letters!.bee_id, points)
        const max_points = getMaxPoints((await dbi.getBeeWords(letters!.bee_model_id)), letters!.letters);
        if (message != SpellingBeeReplyEnum.ok) {
            res.json(new GlobalSpellingBeeStateReply(message,
                state!.letters,
                guesses,
                (await dbi.getBeePlayerPoints(player_id, letters!.bee_id)),
                max_points))
            return;
        }
        for (var letter of player_guess) {
            state!.letters.filter(letterState => letterState.letter === letter).forEach(letterState => letterState.usageLimit -= 1);
        }
        await dbi.saveLettersState(player_id, letters!.bee_id, state!.letters)
        res.json(new SuccessfullGlobalSpellingBeeStateReply(
            state!.letters,
            state!.guesses,
            (await dbi.getBeePlayerPoints(player_id, letters!.bee_id)),
            max_points,
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
