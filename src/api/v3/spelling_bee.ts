import express from 'express';
import * as Sentry from "@sentry/node"
import WordleDBI, { Bee, GlobalBee, GuessedWordsBee, LetterState, RankingEntry } from '../../DBI'
import AuthIdRequest from './types/AuthIdRequest';
import SpellingBeeGuessRequest from './types/SpellingBeeGuessRequest';
import { getMaxPoints, wordPoints, SpellingBeeStateReply, SpellingBeeReplyEnum, SuccessfullSpellingBeeStateReply, checkSpellingBeeGuess, JOKER, ALPHABET, getNewLetterState, checkGuessForIncorrectLetters, wordPointsSeason, processPlayerGuess} from './spelling_bee_common';
import { get_ranking, RankingReply } from './ranking_common';
import { getSeasonRules, SeasonRules } from './season_rules';
import * as fs from 'fs';

export const spelling_bee = express.Router();
const dbi = new WordleDBI()
const BEE_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;

class GlobalSpellingBeeStateReply extends SpellingBeeStateReply {
    constructor(public messageEnum:SpellingBeeReplyEnum, public letters:LetterState[], public guessed_words:string[], public player_points:number, public max_points:number, public letters_to_buy_prices:number[]) {
        super(messageEnum.toString(), letters, guessed_words, player_points);
    }
}

class SuccessfullGlobalSpellingBeeStateReply extends SuccessfullSpellingBeeStateReply {
    constructor(public letters:LetterState[], public guessed_words:string[], public player_points:number, public max_points:number, points:number, public letters_to_buy_prices:number[]) {
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
            state = await dbi.createBeeState(player_id, letters.bee_id, getNewLetterState(letters.main_letter, letters.letters, season_rules), season_rules.lettersToBuy)
            guesses = []
        }
        else {
            guesses = state.guesses
        }
	    const playerPoints = await dbi.getBeePlayerPoints(player_id, letters.bee_id)
        res.json(new GlobalSpellingBeeStateReply(SpellingBeeReplyEnum.ok, state.letters, guesses, playerPoints, getMaxPoints((await dbi.getBeeWords(letters.bee_model_id)), letters.letters), state.lettersToBuy.map(lb => lb.price)));
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
        var result = await processPlayerGuess(player_guess, state!.guesses, bee_model!, state!.letters, season_rules, dbi);

        if (result.message != SpellingBeeReplyEnum.ok) {
            res.json(new GlobalSpellingBeeStateReply(result.message,
                state!.letters,
                state!.guesses,
                (await dbi.getBeePlayerPoints(player_id, letters!.bee_id)),
                getMaxPoints((await dbi.getBeeWords(letters!.bee_model_id)), letters!.letters),
                state!.lettersToBuy.map(lb => lb.price))
                )  
            return;
        }

        for (var guess of result.guessesAdded) {
            state = await dbi.addBeeGuess(player_id, letters!.bee_id, guess)
        }
        var totalPointsAdded = result.pointsAdded.reduce((a, b) => a+b)
        await dbi.increaseBeeRank(player_id, letters!.bee_id, totalPointsAdded)
        const max_points = getMaxPoints((await dbi.getBeeWords(letters!.bee_model_id)), letters!.letters);
        state = await dbi.saveLettersState(player_id, letters!.bee_id, result.newLetterState)
        res.json(new SuccessfullGlobalSpellingBeeStateReply(
            state!.letters,
            state!.guesses,
            (await dbi.getBeePlayerPoints(player_id, letters!.bee_id)),
            max_points,
            totalPointsAdded,
            state!.lettersToBuy.map(lb => lb.price)
            ))
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});

spelling_bee.post('/buy_letter',async (req, res, next) => {
    const value = new AuthIdRequest(req)
    const player_id = await dbi.resolvePlayerId(value.authId)
    const timestamp = Date.now() / 1000;
    const letters = await dbi.getLettersForBee(timestamp);
    const bee_model:Bee|null = await dbi.getBeeById(letters!.bee_model_id);
    var state = await dbi.getBeeState(player_id, letters!.bee_id)
    var lettersToBuy = state!.lettersToBuy; 
    if (lettersToBuy.length == 0) {
        res.json({"message":"no letters to buy"})
        return;
    }
    var currentPlayerPoints:number|undefined = (await dbi.getPlayerSpellingBeeScore(player_id, letters!.bee_id))?.score
    if (!currentPlayerPoints) {
        currentPlayerPoints = 0;
    }
    var letterPrice = lettersToBuy.splice(0, 1)[0];
    if (letterPrice.price > currentPlayerPoints) {
        res.json({"message": "not_enough_points"})
        return;
    }
    var lettersState = state!.letters;
    var pointInfo = await dbi.increaseBeeRank(player_id, letters!.bee_id, -letterPrice.price)
    var plainLetters = lettersState.map(ls => ls.letter)
    var possibleLetters = ALPHABET.filter(letter => !plainLetters.includes(letter))
    console.log(possibleLetters)
    var boughtLetterIndex:number = Math.floor(Math.random() * possibleLetters.length)
    var boughtLetter:string = possibleLetters[boughtLetterIndex]
    console.log(boughtLetter + " " + boughtLetterIndex)
    lettersState.push(new LetterState(boughtLetter, letterPrice.useLimit, 0 , false));
    var newState = await dbi.addNewLetterToSpellingBeeState(player_id, letters!.bee_id, lettersState, lettersToBuy);
    res.json(new GlobalSpellingBeeStateReply(SpellingBeeReplyEnum.ok, newState!.letters, newState!.guesses, pointInfo!.score, getMaxPoints((await dbi.getBeeWords(letters!.bee_model_id)), letters!.letters), newState!.lettersToBuy.map(lb => lb.price)));
})

spelling_bee.post('/friendRanking', async (req, res, next) => {
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
        var friends = await dbi.friendList(player_id);
        friends.push(player_id)
        const ranking = await dbi.getBeeRankingWithFilter(bee.bee_id, friends)
        console.log(ranking);
        res.json((await get_ranking(player_id, ranking, dbi)))
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

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
