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

function getMaxPoints(words, letters) {
    var sum = 0;
    for (var word of words) {
        sum += wordPoints(word)
    }
    return sum
}

function wordPoints(word, letters) {
    if (word.length == 4) {
        return 1
    }
    return word.length
    // var points = word.length - 3;
    // for (var letter in letters) {
    //     if (!word.includes(letter)) {
    //         return points;
    //     }
    // }
    // return points + 7;
}


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
            letters = await dbi.createLettersForBee(new_validity_timestamp);
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
            guessed_words: guesses,
            maxPoints:getMaxPoints(dbi.getBeeWords(letters.bee_model_id))
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
                guessed_words: guesses,
                maxPoints:getMaxPoints(dbi.getBeeWords(letters.bee_model_id))
            })
            return;
        }
        if (!(await dbi.wordExists(guess, letters.bee_model_id))) {
            res.json({
                message: 'wrong_word',
                main_letter: letters.mainLetter,
                other_letters: letters.letters,
                guessed_words: guesses,
                maxPoints:getMaxPoints(dbi.getBeeWords(letters.bee_model_id))
            })
            return
        }
        state = await dbi.addBeeGuess(player_id, letters.bee_id, guess)
        var points = wordPoints(guess, letters.letters)
        await dbi.increaseBeeRank(player_id, letters.bee_id, points)
        res.json({
            message: 'ok',
            main_letter: letters.mainLetter,
            other_letters: letters.letters,
            pointsForWord: points,
            guessed_words: state.guesses,
            maxPoints:getMaxPoints(dbi.getBeeWords(letters.bee_model_id))
        })
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});



router.post('/ranking', async (req, res, next) => {
    try {
        const value = await authIdSchema.validateAsync(req.body);
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

async function getMyPositionInRank(player_id, rank, dbi) {
    for (const index in rank) {
        const rankEntry = rank[index]
        if (rankEntry.player_id === player_id) {
            return {position: rankEntry.position, score: rankEntry.score, nick: (((await dbi.getProfile(player_id)))|| {nick: null}).nick}
        }
    }
    return null;
}


module.exports = router;