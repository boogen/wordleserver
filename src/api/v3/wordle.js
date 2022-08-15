const express = require('express');
const joi = require('@hapi/joi');
const router = express.Router();
const { id } = require('@hapi/joi/lib/base');
const Sentry = require('@sentry/node');
const WORD_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;
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
        const tries = await dbi.getPlayerTries(player_id, existing.word_id, timestamp);
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
            timeToNext: Math.floor(existing.validity - timestamp),
            finished: tries.guesses.length == 6 || tries.guesses.includes(existing.word)
        });
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }

});

router.post('/validate', async (req, res, next) => {
    try {
        const value = await validateSchema.validateAsync(req.body);
        const player_id = await dbi.resolvePlayerId(value.authId)
        console.log(value);
        const timestamp = Date.now() / 1000;
        const wordEntry = await dbi.getGlobalWord(timestamp);

        const guess = value.word;
        console.log("Player id: %s", player_id);
        const word = wordEntry.word;
        
        const t = await dbi.getPlayerTriesForWord(player_id, wordEntry.word_id);
        var tries = t.guesses.length;
        if (t.guesses.includes(guess) || tries >=6) {
            res.json({isWord: false, guess: guess, answer: [], isGuessed: guess == word});
            return;
        }
        

        const guessResult = await validateGuess(guess, word, wordEntry.word_id, tries + 1, timestamp, player_id);

        if (guessResult.isWord) {
            dbi.addGuess(player_id, wordEntry.word_id, guess);
            tries += 1;
        }

        if (guessResult.isGuessed) {
            await dbi.increaseRank(player_id, wordEntry.word_id, tries, timestamp - t.start_timestamp)
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
        Sentry.captureException(error);
    }
})

router.post('/ranking', async (req, res, next) => {
    try {
        const value = await authIdSchema.validateAsync(req.body);
        const player_id = await dbi.resolvePlayerId(value.authId);
        console.log(player_id)
        const timestamp = Date.now() / 1000;
        const wordEntry = await dbi.getGlobalWord(timestamp);
        console.log(wordEntry)
        if (wordEntry === null) {
            res.json({message: 'ok', ranking:[]})
            return
        }
        const ranking = await dbi.getRanking(wordEntry.word_id)
        res.json({message:'ok',
        myInfo:await getMyPositionInRank(player_id, ranking, dbi),
        ranking: await Promise.all(ranking.map( async function(re) { return {player:(((await dbi.getProfile(re.player_id))) || {nick: null}).nick, score: re.score};}))});
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

router.post('/friendRanking', async (req, res, next) => {
    try {
        const value = await authIdSchema.validateAsync(req.body);
        const player_id = await dbi.resolvePlayerId(value.authId)

        const timestamp = Date.now() / 1000;
        const wordEntry = await dbi.getGlobalWord(timestamp);
        if (wordEntry === null) {
            res.json({message: 'ok', ranking:[]})
            return
        }
        var friends = await dbi.friendList(player_id);
        friends.push(player_id)
        const ranking = await dbi.getRankingWithFilter(wordEntry.word_id, friends)
        res.json({message:'ok',
        myInfo: await getMyPositionInRank(player_id, ranking, dbi),
        ranking: await Promise.all(ranking.map( async function(re) { return {player:(((await dbi.getProfile(re.player_id))) || {nick: null}).nick, score: re.score};}))});
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

async function getMyPositionInRank(player_id, rank, dbi) {
    for (const index in rank) {
        const rankEntry = rank[index]
        if (rankEntry.player_id === player_id) {
            return {position: parseInt(index) + 1, score: rankEntry.score, nick: (((await dbi.getProfile(player_id)))|| {nick: null}).nick}
        }
    }
    return null;
}

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

router.post('/word', (req, res, next) => {
    res.json({
        word: 'SNAIL'
    });
})


module.exports = router;
