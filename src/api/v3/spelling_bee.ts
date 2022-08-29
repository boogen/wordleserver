import express from 'express';
import Sentry from '@sentry/node';
import WordleDBI, { RankingEntry } from '../../DBI'
import AuthIdRequest from '../../types/AuthIdRequest';
import SpellingBeeGuessRequest from '../../types/SpellingBeeGuessRequest';

export const spelling_bee = express.Router();
const dbi = new WordleDBI()
const BEE_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;

function getMaxPoints(words:String[], letters:string[]):number {
    var sum = 0;
    for (var word of words) {
        sum += wordPoints(word, letters)
    }
    return sum
}

function wordPoints(word:String, letters:string[]):number {
    if (word.length == 4) {
        return 1
    }
    var points = word.length;
    for (var letter of letters) {
        if (!word.includes(letter)) {
            return points;
        }
    }
    return points + 7;
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
            letters = await dbi.createLettersForBee(new_validity_timestamp);
        }
        var state = await dbi.getBeeState(player_id, letters.bee_id);
        var guesses:String[] = []
        if (state === null) {
            guesses = []
        }
        else {
            guesses = state.guesses
        }
	const playerPoints = await dbi.getBeePlayerPoints(player_id, letters.bee_id)
        res.json({
            message: 'ok',
            main_letter: letters.main_letter,
            other_letters: letters.letters,
            guessed_words: guesses,
            max_points:getMaxPoints((await dbi.getBeeWords(letters.bee_model_id)), letters.letters),
            player_points: playerPoints
        })
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
        var state = await dbi.getBeeState(player_id, letters!.bee_id)
        var guesses:String[];
        if (state === null) {
            guesses = []
        }
        else {
            guesses = state.guesses
        }
        if (guesses.includes(guess)) {
            res.json({
                message: 'already_guessed',
                main_letter: letters!.main_letter,
                other_letters: letters!.letters,
                guessed_words: guesses,
                max_points:getMaxPoints((await dbi.getBeeWords(letters!.bee_model_id)), letters!.letters),
                player_points:(await dbi.getBeePlayerPoints(player_id, letters!.bee_id))
            })
            return;
        }
        if (!(await dbi.wordExists(guess, letters!.bee_model_id))) {
            res.json({
                message: 'wrong_word',
                main_letter: letters!.main_letter,
                other_letters: letters!.letters,
                guessed_words: guesses,
                max_points:getMaxPoints((await dbi.getBeeWords(letters!.bee_model_id)), letters!.letters),
                player_points:(await dbi.getBeePlayerPoints(player_id, letters!.bee_id))
            })
            return
        }
        if (!guess.includes(letters!.main_letter)) {
            res.json({
                message: 'no_main_letter',
                main_letter: letters!.main_letter,
                other_letters: letters!.letters,
                guessed_words: guesses,
                max_points:getMaxPoints((await dbi.getBeeWords(letters!.bee_model_id)), letters!.letters),
                player_points:(await dbi.getBeePlayerPoints(player_id, letters!.bee_id))
            })
            return
        }
        for (var singleLetter of guess) {
            if (singleLetter != letters!.main_letter && !letters!.letters.includes(singleLetter)) {
                res.json({
                    message: 'invalid_letter_used',
                    main_letter: letters!.main_letter,
                    other_letters: letters!.letters,
                    guessed_words: guesses,
                    max_points:getMaxPoints((await dbi.getBeeWords(letters!.bee_model_id)), letters!.letters),
                    player_points:(await dbi.getBeePlayerPoints(player_id, letters!.bee_id))
                })
                return
            }
        }
        state = await dbi.addBeeGuess(player_id, letters!.bee_id, guess)
        var points = wordPoints(guess, letters!.letters)
        await dbi.increaseBeeRank(player_id, letters!.bee_id, points)
        res.json({
            message: 'ok',
            main_letter: letters!.main_letter,
            other_letters: letters!.letters,
            pointsForWord: points,
            guessed_words: state!.guesses,
            max_points:getMaxPoints((await dbi.getBeeWords(letters!.bee_model_id)), letters!.letters),
            player_points:(await dbi.getBeePlayerPoints(player_id, letters!.bee_id)),
	    word_points:points
        })
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
        if (bee === null) {
            res.json({message: 'ok', ranking:[]})
            return
        }
        const ranking = await dbi.getBeeRanking(bee.bee_id)
        res.json({message:'ok',
        myInfo:await getMyPositionInRank(player_id, ranking, dbi),
        ranking: await Promise.all(ranking.map( async function(re) { return {player:(((await dbi.getProfile(re.player_id))) || {nick: null}).nick, score: re.score, position: re.position};}))});
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

async function getMyPositionInRank(player_id:number, rank:RankingEntry[], dbi:WordleDBI) {
    for (const index in rank) {
        const rankEntry:RankingEntry = rank[index]
        if (rankEntry.player_id === player_id) {
            return {position: rankEntry.position, score: rankEntry.score, nick: (((await dbi.getProfile(player_id)))|| {nick: null}).nick}
        }
    }
    return null;
}

