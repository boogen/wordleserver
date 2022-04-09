const express = require('express');
const joi = require('@hapi/joi');
const router = express.Router();
const { id } = require('@hapi/joi/lib/base');

const dbi = require('../../DBI.js').createDBI();
const authIdSchema = joi.object({
    authId: joi.string().trim().required()
});


const validateSchema = joi.object({
    authId: joi.string().trim().required(),
    word: joi.string().trim().required()
});


router.post('/getState', async (req, res, next) => {
    try {
        const value = await authIdSchema.validateAsync(req.body);
        const player_id = await dbi.resolvePlayerId(value.authId);
        var val = await dbi.getWord();
        var word = val[0].word;
        console.log("word %s player id %s", word, player_id);

        var existing = await dbi.getPlayerLastWord(player_id);

        if (existing == null) {
            existing = await dbi.addNewPlayerWord(player_id, word, 0);
        }
        const tries = await dbi.getPlayerChallengeTries(player_id, existing.word_id);
        if (tries.length == 0) {
            console.log(req.ip)
            var locationInfo = geoip.lookup(req.ip);
            var city = null;
            if (locationInfo != null) {
                city = locationInfo.city;
            }
            console.log(city)
            dbi.setCity(player_id, city);
        }
        res.json({
            message: 'ok',
            guesses: await Promise.all(tries.guesses.map(async function(g) { return validateGuess(g, existing.word) })),
            finished: tries.guesses.length == 6 || tries.guesses.includes(existing.word)
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
        const wordEntry = await await dbi.getPlayerLastWord(player_id);

        const guess = value.word;
        console.log("Player id: %s", player_id);
        const word = wordEntry.word;
        
        const t = await dbi.getPlayerChallengeTries(player_id, wordEntry.word_id);
        var tries = t.guesses.length;
        if (t.guesses.includes(guess) || tries >=6) {
            res.json({isWord: false, guess: guess, answer: [], isGuessed: guess == word});
            return;
        }
        

        const guessResult = await validateGuess(guess, word, wordEntry.word_id, tries + 1, timestamp, player_id);

        if (guessResult.isWord) {
            dbi.addChallengeGuess(player_id, wordEntry.word_id, guess);
            tries += 1;
        }

        console.log("tries: " + tries);
        if (tries == 6) {
            guessResult.correctWord = word;
        }
        if (tries == 6 || guessResult.isGuessed) {
            var val = await dbi.getWord();
            var new_word = val[0].word;
            await dbi.addNewPlayerWord(player_id, new_word, 0);
        }
        console.log(guessResult);
        res.json(guessResult);
    } catch (error) {
        console.log(error);
        next(error);
    }
})

async function validateGuess(guess, word, word_id, tries, timestamp, player_id) {
    const guessed = (guess == word);
    const isWord = await dbi.isWordValid(guess);
   
    console.log("Guessed word: %s, actual word: %s", guess, word)

    var result = [];
    if (isWord) {
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
            if (result[i] > 0) {
                continue;
            }
            for (var j = 0; j < word.length; j++) {
                if (word[j] === guess[i] && !usedLetters[j]) {
                    result[i] = 1;
                    usedLetters[j] = true;
                    break;
                }
            }
        }
    }
    return {isWord: isWord, guess: guess, answer: result, isGuessed: guessed};
}

module.exports = router;