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

function isFinished(crosswordState) {
    if (crosswordState == null) {
        return false;
    }
    var grid = crosswordState.grid;
    for (var i = 0; i < grid.length; i++) {
        for (var j = 0; j < grid[i].length; j++) {
            if (grid[i][j] == "-") {
                return false;
            }
        }
    }
    return true;
}

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

async function stateToReply(grid, word_list, crossword, finished) {
    letterList = new Set(word_list.join(""))
    return {letters:Array.from(letterList),
        grid: [].concat.apply([], grid),
        height: crossword.letter_grid.length,
        width: crossword.letter_grid[0].length,
        completed: finished
    }
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
    const players_word = value.word.toLowerCase();
    const isWord = await dbi.isWordValid(players_word);
    var crosswordState = await dbi.getCrosswordState(playerId);
    var grid = crosswordState.grid;
    var guessed_words = new Set(crosswordState.guessed_words)
    const crossword = await dbi.getCrossword(crosswordState.crossword_id)
    if (!isWord) {
        res.json({isWord:false, guessed_word: false, state: (await stateToReply(grid, crosswordState.words, crossword, isFinished(crosswordState)))})
        return
    }

    
    const original_grid = crossword.letter_grid
    const guessed_word = crosswordState.words.includes(players_word)
    const convertedOriginalGrid = convertGrid(original_grid)
    tries = new Set(crosswordState.tries)
    var indexToFill = undefined
    for (var i = 0; i < convertedOriginalGrid.length; i++) {
        for (var j = 0; j < convertedOriginalGrid[i].length; j++) {
            convertedOriginalGrid[i][j] = grid[i][j]
        }
    }
    if (guessed_word) {
        guessed_words.add(players_word)
    }
    else {
        if(!tries.has(players_word)) {
            tries.add(players_word)
            const placesToFill = []
            for (var i = 0; i < grid.length; i++) {
                for (var j = 0; j < grid[i].length; j++) {
                    if (grid[i][j] == "-") {
                        placesToFill.push({x:i, y:j})
                    }
                }
            }
            const index = Math.floor(Math.random() * placesToFill.length)
            indexToFill = placesToFill[index]
        }
    }
    const guessed_words_array = Array.from(guessed_words)
    for (var z = 0; z < guessed_words_array.length; z++) {
        const word = guessed_words_array[z];
        var coordinates = crossword.word_list[word];
        if (original_grid[coordinates[0]].slice(coordinates[1], coordinates[1] + word.length).join("") == word) {
            for (var i = 0; i < word.length; i++) {
                convertedOriginalGrid[coordinates[0]][coordinates[1] + i] = word[i] 
            }
        }
        else {
            for (var i = 0; i < word.length; i++) {
                convertedOriginalGrid[coordinates[0] + i][coordinates[1]] = word[i] 
            }
        }
    }
    if (indexToFill) {
        convertedOriginalGrid[indexToFill.x][indexToFill.y] = original_grid[indexToFill.x][indexToFill.y]
    }
    console.log(guessed_words_array)
    const newState = await dbi.setCrosswordState(playerId, crosswordState.words, guessed_words_array, convertedOriginalGrid, crosswordState.crossword_id, Array.from(tries))
    res.json({isWord:true, guessed_word: guessed_word, state: (await stateToReply(convertedOriginalGrid, crosswordState.words, crossword, isFinished(newState)))})
});


router.post('/init', async (req, res, next) => {
    const value = await authIdSchema.validateAsync(req.body);
    const playerId = await dbi.resolvePlayerId(value.authId);
    var crosswordState = await dbi.getCrosswordState(playerId);
    var grid = []
    var word_list = []
    var tries = []
    var crossword_id = -1
    var guessed_words = []

    if (crosswordState == null || isFinished(crosswordState)) {
        const crossword = (await dbi.getRandomCrossword())[0];
        grid = convertGrid(crossword.letter_grid)
        word_list = Object.keys(crossword.word_list)
        crossword_id = crossword.crossword_id
    }
    else {
        grid = crosswordState.grid
        word_list = crosswordState.words
        crossword_id = crosswordState.crossword_id
        if (crosswordState.tries) {
            tries = crosswordState.tries
        }
        guessed_words = crosswordState.guessed_words
    }

    const crossword = await dbi.getCrossword(crossword_id)
    const state = (await stateToReply(grid, word_list, crossword, isFinished(crosswordState)))
    res.json({
        message:'ok',
        state: state
    })
    dbi.setCrosswordState(playerId, word_list, guessed_words, grid, crossword_id, tries)
});

module.exports = router;