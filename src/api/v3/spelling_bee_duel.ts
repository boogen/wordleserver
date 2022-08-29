import express from 'express';
import Sentry from '@sentry/node';
import AuthIdRequest from '../../types/AuthIdRequest'
import SpellingBeeGuessRequest from '../../types/SpellingBeeGuessRequest'

const router = express.Router();
const dbi = require('../../../out/DBI.js').createDBI();


router.post('/start',  async (req:express.Request, res:express.Response, next:Function) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(request.authId);
        const timestamp:number = Date.now() / 1000;
        const duel = dbi.startDuel(player_id, timestamp);
        res
        .status(200)
        .json({
            duel_id: duel.id,
            letters: duel.letters,
            main_letter: duel.main_letter,
            timeline: duel.timeline
        })
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

router.post('/guess', async (req, res, next) => {
    try {
        const request = new SpellingBeeGuessRequest(req);
        const guess = request.guess;
        const player_id = await dbi.resolvePlayerId(request.authId);
        const duel_id = request.duelId
        const timestamp = Date.now() / 1000;
        const letters = await dbi.getLettersForDuel(duel_id);
        var state = await  dbi.getBeeState(player_id, letters.bee_id)
        var guesses = []
        if (state === null) {
            guesses = []
        }
        else {
            guesses = state.guesses
        }
        // if (guesses.includes(guess)) {
        //     res.json({
        //         message: 'already_guessed',
        //         main_letter: letters.mainLetter,
        //         other_letters: letters.letters,
        //         guessed_words: guesses,
        //         max_points:getMaxPoints((await dbi.getBeeWords(letters.bee_model_id)), letters.letters),
        //         player_points:(await dbi.getBeePlayerPoints(player_id, letters.bee_id))
        //     })
        //     return;
        // }
        // if (!(await dbi.wordExists(guess, letters.bee_model_id))) {
        //     res.json({
        //         message: 'wrong_word',
        //         main_letter: letters.mainLetter,
        //         other_letters: letters.letters,
        //         guessed_words: guesses,
        //         max_points:getMaxPoints((await dbi.getBeeWords(letters.bee_model_id)), letters.letters),
        //         player_points:(await dbi.getBeePlayerPoints(player_id, letters.bee_id))
        //     })
        //     return
        // }
        // state = await dbi.addBeeGuess(player_id, letters.bee_id, guess)
        // var points = wordPoints(guess, letters.letters)
        // await dbi.increaseBeeRank(player_id, letters.bee_id, points)
        // res.json({
        //     message: 'ok',
        //     main_letter: letters.mainLetter,
        //     other_letters: letters.letters,
        //     pointsForWord: points,
        //     guessed_words: state.guesses,
        //     max_points:getMaxPoints((await dbi.getBeeWords(letters.bee_model_id)), letters.letters),
        //     player_points:(await dbi.getBeePlayerPoints(player_id, letters.bee_id)),
	    // word_points:points
        // })
    }
    catch(error) {
        console.log(error)
        next(error)
        Sentry.captureException(error)
    }
})