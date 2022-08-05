const express = require('express');
const joi = require('@hapi/joi');
const router = express.Router();
const { id } = require('@hapi/joi/lib/base');
const Sentry = require('@sentry/node');
const dbi = require('../../DBI.js').createDBI();
const BEE_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;

const authIdSchema = joi.object({
    authId: joi.string().trim().required()
});

const guessSchema = joi.object({
    authId: joi.string().trim().required(),
    word: joi.string().trim().required()
})


router.post('/getState', async (req, res, next) => {
    try {
        const request = await authIdSchema.validateAsync(req.body);
        const player_id = await dbi.resolvePlayerId(request.authId);
        var new_validity_timestamp = GLOBAL_TIME_START;
        const timestamp = Date.now() / 1000;
        while (new_validity_timestamp < timestamp) {
            new_validity_timestamp += BEE_VALIDITY;
        }
        var letters = await dbi.getLettersForBee(timestamp);
        if (null === letters) {
            letters = await dbi.createLettersForBee(new_validity_timestamp, "n", ["a", "m", "z", "t", "u", "p"]);
        }
        var state = await dbi.getBeeState(player_id, letters.bee_id);
        if (state === null) {
            guesses = []
        }
        else {
            guesses = state.guesses
        }
        console.log(letters);
        res.json({
            message: 'ok',
            main_letter: letters.mainLetter,
            other_letters: letters.letters,
            guessed_words: guesses
        })
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});

router.post('/guess', async (req, res, next) => {
    try {
        const request = await guessSchema.validateAsync(req.body);
        const guess = await request.word;
        const player_id = await dbi.resolvePlayerId(request.authId);
        const timestamp = Date.now() / 1000;
        const letters = await dbi.getLettersForBee(timestamp);
        var state = await  dbi.getBeeState(player_id, letters.bee_id)
        if (state === null) {
            guesses = []
        }
        else {
            guesses = state.guesses
        }
        if (guesses.includes(guess)) {
            res.json({
                message: 'already_guessed',
                main_letter: letters.mainLetter,
                other_letters: letters.letters,
                guessed_words: guesses
            })
            return;
        }
        if (!(await dbi.wordExists(guess, letters.bee_id))) {
            res.json({
                message: 'wrong_word',
                main_letter: letters.mainLetter,
                other_letters: letters.letters,
                guessed_words: guesses
            })
            return
        }
        state = await dbi.addBeeGuess(player_id, letters.bee_id, guess)
        res.json({
            message: 'ok',
            main_letter: letters.mainLetter,
            other_letters: letters.letters,
            guessed_words: state.guesses
        })
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});


module.exports = router;