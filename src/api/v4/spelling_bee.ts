import express from 'express';
import * as Sentry from "@sentry/node"
import WordleDBI from './DBI/DBI'
import { Bee } from "./DBI/spelling_bee/Bee";
import { RankingEntry } from "./DBI/ranks/RankingEntry";
import { LetterState } from "./DBI/spelling_bee/LetterState";
import { GlobalBee } from "./DBI/spelling_bee/GlobalBee";
import AuthIdRequest from './types/AuthIdRequest';
import SpellingBeeGuessRequest from './types/SpellingBeeGuessRequest';
import { getMaxPoints, wordPoints, SpellingBeeStateReply, SpellingBeeReplyEnum, SuccessfullSpellingBeeStateReply, checkSpellingBeeGuess, JOKER, ALPHABET, getNewLetterState, checkGuessForIncorrectLetters, wordPointsSeason, processPlayerGuess} from './spelling_bee_common';
import { get_ranking, RankingReply } from './ranking_common';
import { getSeasonRules, SeasonRules } from './season_rules';
import * as fs from 'fs';
import { CreateNotificationBody } from 'onesignal-node/lib/types';
import { get_nick } from './player_common';
import { oneSignalClient } from '../../one_signal';
import { notifyAboutRankingChange } from './ranking';
import { resolvePlayerId } from './DBI/player/player';
import { addBeeGuess, addNewLetterToSpellingBeeState, createBeeState, createLettersForBee, getBeeState, getLettersForBee, saveLettersState } from './DBI/spelling_bee/spelling_bee';
import { GuessedWordsBee } from './DBI/spelling_bee/GuessedWordsBee';
import { getBeeById } from './DBI/spelling_bee/model';

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
        const player_id = await resolvePlayerId(request.auth_id, dbi);
        var new_validity_timestamp = GLOBAL_TIME_START;
        const timestamp = Date.now() / 1000;
        while (new_validity_timestamp < timestamp) {
            new_validity_timestamp += BEE_VALIDITY;
        }
        var letters:GlobalBee|null = await getLettersForBee(timestamp, dbi);
        var season_rules = getSeasonRules()
        if (null === letters) {
            letters = await createLettersForBee(new_validity_timestamp, season_rules, dbi);
            //initExtraLetters(letters!.required_letters, letters!.letters, season_rules);
        }
        var state:GuessedWordsBee|null = await getBeeState(player_id, letters.bee_id, dbi);
        var guesses:string[] = []
        if (state === null) {
            state = await createBeeState(player_id, letters.bee_id, getNewLetterState(letters.required_letters, letters.letters, season_rules), season_rules.lettersToBuy, dbi)
            guesses = []
        }
        else {
            guesses = state.guesses
        }
	    const playerPoints = await dbi.getBeePlayerPoints(player_id, letters.bee_id)
        var bee_model = await getBeeById(letters.bee_model_id, dbi)
        res.json(new GlobalSpellingBeeStateReply(SpellingBeeReplyEnum.ok, state.letters, guesses, playerPoints, bee_model!.max_points, state.lettersToBuy.map(lb => lb.price)));
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});

spelling_bee.post('/season_info',async (req, res, next) => {
    var season_rules = getSeasonRules();
    res.json({season_id: season_rules.id, season_title: season_rules.season_title, rules:season_rules, seconds_to_end:season_rules.getSecondsToEnd()})
})

spelling_bee.post('/guess', async (req, res, next) => {
    try {
        const request = new SpellingBeeGuessRequest(req);
        var season_rules = getSeasonRules();
        const player_guess = request.guess;
        const player_id = await resolvePlayerId(request.auth_id, dbi);
        const timestamp = Date.now() / 1000;
        const letters = await getLettersForBee(timestamp, dbi);
        const bee_model:Bee|null = await getBeeById(letters!.bee_model_id, dbi);
        var state = await getBeeState(player_id, letters!.bee_id, dbi)
        var result = await processPlayerGuess(player_guess, state!.guesses, bee_model!, state!.letters, season_rules, dbi);

        if (result.message != SpellingBeeReplyEnum.ok) {
            res.json(new GlobalSpellingBeeStateReply(result.message,
                state!.letters,
                state!.guesses,
                (await dbi.getBeePlayerPoints(player_id, letters!.bee_id)),
                bee_model!.max_points,
                state!.lettersToBuy.map(lb => lb.price))
                )  
            return;
        }

        for (var guess of result.guessesAdded) {
            state = await addBeeGuess(player_id, letters!.bee_id, guess, dbi)
        }
        var totalPointsAdded = result.pointsAdded.reduce((a, b) => a+b)
        var oldRank = await dbi.getBeeRanking(letters!.bee_id)

        var newRankingEntry = await dbi.increaseBeeRank(player_id, letters!.bee_id, totalPointsAdded)

        notifyAboutRankingChange(player_id, oldRank, newRankingEntry.score - totalPointsAdded, newRankingEntry.score, "Wspólna litera")
        const max_points = bee_model!.max_points;
        state = await saveLettersState(player_id, letters!.bee_id, result.newLetterState, dbi)
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
    const player_id = await resolvePlayerId(value.auth_id, dbi)
    const timestamp = Date.now() / 1000;
    const letters = await getLettersForBee(timestamp, dbi);
    const bee_model:Bee|null = await getBeeById(letters!.bee_model_id, dbi);
    var state = await getBeeState(player_id, letters!.bee_id, dbi)
    var lettersToBuy = state!.lettersToBuy; 
    if (lettersToBuy.length == 0) {
        res.json({"message":"no letters to buy"})
        return;
    }
    var currentPlayerPoints:number|undefined = (await dbi.getBeePlayerPoints(player_id, letters!.bee_id))
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
    var newState = await addNewLetterToSpellingBeeState(player_id, letters!.bee_id, lettersState, lettersToBuy, dbi);
    res.json(new GlobalSpellingBeeStateReply(SpellingBeeReplyEnum.ok, newState!.letters, newState!.guesses, pointInfo!.score, bee_model!.max_points, newState!.lettersToBuy.map(lb => lb.price)));
})

