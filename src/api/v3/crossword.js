const express = require('express');
const joi = require('@hapi/joi');
const router = express.Router();
const { id } = require('@hapi/joi/lib/base');

const dbi = require('../../DBI.js').createDBI();

const authIdSchema = joi.object({
    authId: joi.string().trim().required()
});

const guessSchema = joi.object({
    authId: joi.string().trim().required(),
    word: joi.string().trim().required()
});

function convertGrid(grid, isNew=true) {
    flatten_grid = []
    for(var i = 0; i < grid.length; i++) {
        var result = []
        for (var j = 0; j < grid[i].length; j++) {
            if (grid[i][j] == null) {
                result.push(" ")
            }
            else {
                result.push(isNew?"-":grid[i][j]);
            }
        }
        flatten_grid.push(result)
    }
    return flatten_grid
}

async function stateToReply(grid, word_list, crossword) {
    letterList = new Set(word_list.join(""))
    return {letters:Array.from(letterList),
        grid: [].concat.apply([], grid),
        height: crossword.letter_grid.length,
        width: crossword.letter_grid[0].length}
}

router.post('/mock', async (req, res, next) => {
    const crossword = await dbi.getFirstCrossword();
    letterList = new Set(crossword.word_list.join(""))
    console.log(crossword.letter_grid)
    grid = []
    for(var i = 0; i < crossword.letter_grid.length; i++) {
        var result = []
        for (var j = 0; j < crossword.letter_grid[i].length; j++) {
            if (crossword.letter_grid[i][j] != null) {
                result.push("-")
            }
            else {
                result.push(" ");
            }
        }
        grid.push(result)
    }
    res.json({
        message:'ok',
        letters:Array.from(letterList),
        grid: [].concat.apply([], grid),
        height: grid.length,
        width: grid[0].length

    })
});

router.post('/guess', async (req, res, next) => {
    const value = await guessSchema.validateAsync(req.body);
    const playerId = await dbi.resolvePlayerId(value.authId);
    const isWord = await dbi.isWordValid(value.word);
    var crosswordState = await dbi.getCrosswordState(playerId);
    var grid = crosswordState.grid;
    var guessed_words = crosswordState.guessed_words
    if (!isWord) {
        res.json({isWord:false, guessed_word: false, state: (await stateToReply(grid, crosswordState.word_list))})
        return
    }

    const crossword = await dbi.getCrossword(crosswordState.crossword_id)
    const original_grid = crossword.letter_grid
    const guessed_word = crosswordState.words.includes(value.word)
    grid = convertGrid(original_grid)
    if (guessed_word) {
        guessed_words.push(value.word)
        var coordinates = crossword.word_list[value.word];
        if (original_grid[coordinates[0]].slice(coordinates[1], coordinates[1] + value.word.length).join("") == value.word) {
            for (var i = 0; i < value.word.length; i++) {
                grid[coordinates[0]][coordinates[1] + i] = value.word[i] 
            }
        }
        else {
            for (var i = 0; i < value.word.length; i++) {
                grid[coordinates[0] + i][coordinates[1]] = value.word[i] 
            }
        }
    }

    dbi.setCrosswordState(playerId, crosswordState.words, guessed_words, grid, crosswordState.crossword_id)
    res.json({isWord:true, guessed_word: guessed_word, state: (await stateToReply(grid, crosswordState.words))})
});


router.post('/init', async (req, res, next) => {
    const value = await authIdSchema.validateAsync(req.body);
    const playerId = await dbi.resolvePlayerId(value.authId);
    var crosswordState = await dbi.getCrosswordState(playerId);
    var grid = []
    var word_list = []
    var crossword_id = -1
    if (crosswordState == null || crosswordState.guessed_words.length == crosswordState.words.length) {
        const crossword = await dbi.getFirstCrossword();
        grid = convertGrid(crossword.letter_grid)
        word_list = Object.keys(crossword.word_list)
        crossword_id = crossword.crossword_id
    }
    else {
        grid = crosswordState.grid
        word_list = crosswordState.words
        crossword_id = crosswordState.crossword_id
    }

    const crossword = await dbi.getCrossword(crossword_id)
    const state = (await stateToReply(grid, word_list, crossword))
    res.json({
        message:'ok',
        state: state
    })
    dbi.setCrosswordState(playerId, word_list, [], state.grid, crossword_id)
});

module.exports = router;