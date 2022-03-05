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
const player_counter = db.get("player_id_counter");

player_word.createIndex({id: 1}, {unique:true});
player_auth.createIndex({auth_id: 1}, {unique: true});
const drawSchema = joi.object({
    id: joi.string().trim().required()
});

const validateSchema = joi.object({
    id: joi.string().trim().required(),
    word: joi.string().trim().required()
});

function getNextSequenceValue(sequenceName){
    var sequenceDocument = player_id_counter.findAndModify({
       query:{_id: sequenceName },
       update: {$inc:{sequence_value:1}},
       new:true
    });
    return sequenceDocument.sequence_value;
}

router.post("/register", async (req, res, next) => {
    var authId = Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 32);
    while ((await player_auth.findOne({auth_id: authId})) !== null) {
        authId = Math.random().toString(36).replace(/[^a-z]+/g, '').substring(0, 32);
    }
    await player_auth.insert({auth_id: authId, player_id: getNextSequenceValue("player_id_counter")})
    res.json({message:'ok', auth_id: authId})
});

router.post('/draw', async (req, res, next) => {
    try {
        const value = await drawSchema.validateAsync(req.body);

        var val = await words.aggregate([{ $sample: { size: 1 } }]);
        var word = val[0].word;
        console.log(word);
        const existing = await player_word.findOne({id:value.id});
        if (existing) {
            await player_word.findOneAndUpdate({id: value.id}, { $set: { word: word} });
        }
        else {
            await player_word.insert({
                id: value.id,
                word: word
            });
        }
        await player_tries.insert({id:value.id, word:word, tries:0 });
        res.json({
            message: 'ok'
        });
    } catch (error) {
        console.log(error);
        next(error);
    }

});

router.post('/validate', async (req, res, next) => {
    try {
        const value = await validateSchema.validateAsync(req.body);
        console.log(value);

        const player_id = value.id;
        wordEntry = await player_word.findOne({id:player_id});
        if (!wordEntry) {

        }
        const guess = value.word;
        const word = wordEntry.word;
        const guessed = (word == value.word);
        const isWord = await possible_words.findOne({word:value.word}) != null;
       
        console.log("Guessed word: %s, actual word: %s", guess, word)

        const t = await player_tries.findOne({id:player_id, word:word });
        const tries = t.tries + 1;
        if (isWord) {
            await player_tries.findOneAndUpdate({id:player_id, word:word }, { $set: { tries: tries} });
        }
        var result = [];
        for (var i = 0; i < guess.length; i++) {
            if (guess.charAt(i) == word.charAt(i)) {
                result.push(2);
            }
            else if (word.includes(guess.charAt(i))) {
                result.push(1);
            }
            else {
                result.push(0);
            }
        }

        console.log("tries: " + tries);
        if (tries == 6) {
            res.json({
                isWord: isWord,
                guess: guess,
                answer: result,
                isGuessed: guessed,
                correctWord: word
            });
        }
        else {
            res.json({
                isWord: isWord,
                guess: guess,
                answer: result,
                isGuessed: guessed
            });
        }
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