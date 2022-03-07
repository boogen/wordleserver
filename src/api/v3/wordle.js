const express = require('express');
const joi = require('@hapi/joi');
const router = express.Router();
const monk = require('monk');
const { id } = require('@hapi/joi/lib/base');


const db = monk(process.env.MONGO_URI);
const words = db.get('words');
const player_word = db.get('player_word');
const possible_words = db.get('possible_words');
const player_tries = db.get('player_tries');
const player_auth = db.get('player_auth');
const player_counter = db.get("counters");
const WORD_VALIDITY = 600;

player_word.createIndex({id: 1}, {unique:true});
player_auth.createIndex({auth_id: 1}, {unique: true});
const drawSchema = joi.object({
    authId: joi.string().trim().required()
});

const validateSchema = joi.object({
    authId: joi.string().trim().required(),
    word: joi.string().trim().required()
});

function makeid() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  
    for (var i = 0; i < 36; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
  
    return text;
}

async function getNextSequenceValue(sequenceName){
    var sequenceDocument = await player_counter.findOneAndUpdate({id: sequenceName},
        {$inc:{sequence_value:1}}, {upsert:true});
    console.log(sequenceDocument);
    return sequenceDocument.sequence_value;
}

router.post("/register", async (req, res, next) => {
    var authId = makeid();
    while ((await player_auth.findOne({auth_id: authId})) !== null) {
        authId = makeid();
    }
    const playerId = await getNextSequenceValue("player_id");
    await player_auth.insert({auth_id: authId, player_id: playerId});
    player_counter.insert({id:"player#" + playerId + "_word", sequence_value:0});
    res.json({message:'ok', authId: authId})
});

router.post('/draw', async (req, res, next) => {
    try {
        const value = await drawSchema.validateAsync(req.body);
        const player_id = (await player_auth.findOne({auth_id : value.authId})).player_id
        var val = await words.aggregate([{ $sample: { size: 1 } }]);
        var word = val[0].word;
        console.log(word);
        const existing = await player_word.findOne({$query: {id:player_id}, $orderby: {$natural : -1}});
        const timestamp = Date.now();
        if (existing === null || existing.expiration <= timestamp) {
            const wordId = await getNextSequenceValue("player#" + player_id + "_word");
            existing = await player_word.insert({
                id: player_id,
                word_id:wordId,
                word: word,
            });
        }
        const tries = await player_tries.findOneAndUpdate({id:player_id, word_id:existing.word_id}, {$setOnInsert:{guesses:[]}}, {upsert:true});
        res.json({
            message: 'ok',
            guesses: await Promise.all(tries.guesses.map(async function(g) { return validateGuess(g, existing.word) }))
        });
    } catch (error) {
        console.log(error);
        next(error);
    }

});

async function validateGuess(guess, word) {
    const guessed = (guess == word);
    const isWord = await possible_words.findOne({word:guess}) != null;
   
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

router.post('/validate', async (req, res, next) => {
    try {
        const value = await validateSchema.validateAsync(req.body);
        const player_id = (await player_auth.findOne({auth_id : value.authId})).player_id
        console.log(value);

        wordEntry = await player_word.findOne({$query: {id:player_id}, $orderby: {$natural : -1}});

        const guess = value.word;
        console.log("Player id: %s", player_id);
        const word = wordEntry.word;
        
        const t = await player_tries.findOne({id:player_id, word_id:wordEntry.word_id });
        var tries = t.guesses.length;

        const guessResult = await validateGuess(guess, word);

        if (guessResult.isWord) {
            await player_tries.findOneAndUpdate({id:player_id, word_id:wordEntry.word_id }, { $push: { guesses: guess} });
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

router.post('/word', (req, res, next) => {
    res.json({
        word: 'SNAIL'
    });
})


module.exports = router;