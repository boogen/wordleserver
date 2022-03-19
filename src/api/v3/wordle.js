const express = require('express');
const joi = require('@hapi/joi');
const router = express.Router();
const { id } = require('@hapi/joi/lib/base');

const WORD_VALIDITY = 600;
const GLOBAL_TIME_START = 1647644400;
const dbi = require('../../DBI.js').createDBI();
const authIdSchema = joi.object({
    authId: joi.string().trim().required()
});


const validateSchema = joi.object({
    authId: joi.string().trim().required(),
    word: joi.string().trim().required()
});


router.post('/draw', async (req, res, next) => {
    try {
        const value = await authIdSchema.validateAsync(req.body);
        const player_id = await dbi.resolvePlayerId(value.authId);
        var val = await dbi.getWord();
        var word = val[0].word;
        console.log("word %s player id %s", word, player_id);

        //var existing = await dbi.getPlayerLastWord(player_id);
        const timestamp = Date.now() / 1000;
        var new_validity_timestamp = GLOBAL_TIME_START;
        while (new_validity_timestamp < timestamp) {
            new_validity_timestamp += WORD_VALIDITY;
        }
        // if (existing == null || existing.expiration <= timestamp) {
        //     existing = await dbi.addNewPlayerWord(player_id, word, timestamp + WORD_VALIDITY);
        // }
        const existing = await dbi.getOrCreateGlobalWord(timestamp, new_validity_timestamp, word);
        const tries = await dbi.getPlayerTries(player_id, existing.word_id);
        res.json({
            message: 'ok',
            guesses: await Promise.all(tries.guesses.map(async function(g) { return validateGuess(g, existing.word) }))
        });
    } catch (error) {
        console.log(error);
        next(error);
    }

});

router.post('/validate', async (req, res, next) => {
    try {
        const value = await validateSchema.validateAsync(req.body);
        const player_id = await dbi.resolvePlayerId(value.authId)
        console.log(value);
        const timestamp = Date.now() / 1000;
        wordEntry = await dbi.getGlobalWord(timestamp);

        const guess = value.word;
        console.log("Player id: %s", player_id);
        const word = wordEntry.word;
        
        const t = await dbi.getPlayerTriesForWord(player_id, wordEntry.word_id);
        var tries = t.guesses.length;

        const guessResult = await validateGuess(guess, word);

        if (guessResult.isWord) {
            dbi.addGuess(player_id, wordEntry.word_id, guess);
            tries += 1;
        }

        console.log("tries: " + tries);
        if (tries == 6) {
            guessResult.correctWord = word;
        }
        console.log(guessResult);
        res.json(guessResult);
    } catch (error) {
        console.log(error);
        next(error);
    }
})

async function validateGuess(guess, word) {
    const guessed = (guess == word);
    const isWord = await dbi.isWordValid(guess);
   
    console.log("Guessed word: %s, actual word: %s", guess, word)

    var result = [];
        var usedLetters = [];
        for (var i = 0; i < guess.length; i++) {
            result.push(0);
            usedLetters.push(false);
        }

        for (var i = 0; i < guess.length; i++) {
            if (guess.charAt(i) == word.charAt(i)) {
                result[i] = 2;
                usedLetters[i] = true;
            }
        }
        for (var i = 0; i < guess.length; i++) {
            for (var j = 0; j < word.length; j++) {
                if (word[j] === guess[i] && !usedLetters[j]) {
                    result[i] = 1;
                    usedLetters[j] = true;
                    break;
                }
            }
        }
    return {isWord: isWord, guess: guess, answer: result, isGuessed: guessed};
}


router.post('/word', (req, res, next) => {
    res.json({
        word: 'SNAIL'
    });
})


module.exports = router;