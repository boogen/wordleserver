import express from 'express';
import * as Sentry from "@sentry/node"
import WordleDBI, { PlayerCrosswordState, PossibleCrossword } from '../../DBI';
import BaseGuessRequest from './types/BaseGuessRequest';
import AuthIdRequest from './types/AuthIdRequest';
import { Stats } from '../../WordleStatsDBI';

export const crossword = express.Router();

const dbi = new WordleDBI();
const stats:Stats = new Stats();

function isFinished(crosswordState:PlayerCrosswordState) {
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

function convertGrid(grid:String[][], isNew=true) {
    var flatten_grid = []
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

async function stateToReply(grid:String[][], word_list:string[], crossword:PossibleCrossword, finished:boolean) {
    var letterList = new Set(word_list.join(""))
    return {letters:Array.from(letterList),
        grid: grid.concat.apply([], grid),
        height: crossword.letter_grid.length,
        width: crossword.letter_grid[0].length,
        completed: finished
    }
}

crossword.post('/mock', async (req, res, next) => {
    try {
        const crossword = await dbi.getFirstCrossword();
        var letterList = new Set(crossword!.word_list.map(c => c.word).join(""))
        console.log(crossword!.letter_grid)
        var grid:string[][] = []
        for(var i = 0; i < crossword!.letter_grid.length; i++) {
            var result:string[] = []
            for (var j = 0; j < crossword!.letter_grid[i].length; j++) {
                if (crossword!.letter_grid[i][j] != null) {
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
            grid: grid.concat.apply([], grid),
            height: grid.length,
            width: grid[0].length

        })
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});

crossword.post('/guess', async (req, res, next) => {
    try {
        const value = new BaseGuessRequest(req);
        const playerId = await dbi.resolvePlayerId(value.auth_id);
        const players_word = value.guess.toLowerCase();
        const isWord = await dbi.isWordValid(players_word);
        var crosswordState = await dbi.getCrosswordState(playerId);
        var grid = crosswordState!.grid;
        var guessed_words = new Set(crosswordState!.guessed_words)
        const crossword = await dbi.getCrossword(crosswordState!.crossword_id)
        if (!isWord) {
            await stats.addCrosswordGuessEvent(playerId, crosswordState!.guessed_words.length, crosswordState!.tries.length + crosswordState!.guessed_words.length, isFinished(crosswordState!), false)
            res.json({isWord:false, guessed_word: false, state: (await stateToReply(grid, crosswordState!.words, crossword!, isFinished(crosswordState!)))})
            return
        }

        
        const original_grid = crossword!.letter_grid
        const guessed_word = crosswordState!.words.includes(players_word)
        const convertedOriginalGrid = convertGrid(original_grid)
        const tries = new Set(crosswordState!.tries)
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
            const word:string = guessed_words_array[z];
            var coordinates = crossword!.word_list.find(e => e.word === word)?.coordinates;
            if (original_grid[coordinates!.row].slice(coordinates!.column, coordinates!.column + word.length).join("") == word) {
                for (var i = 0; i < word.length; i++) {
                    convertedOriginalGrid[coordinates!.row][coordinates!.column + i] = word[i] 
                }
            }
            else {
                for (var i = 0; i < word.length; i++) {
                    convertedOriginalGrid[coordinates!.row + i][coordinates!.column] = word[i] 
                }
            }
        }
        if (indexToFill) {
            convertedOriginalGrid[indexToFill.x][indexToFill.y] = original_grid[indexToFill.x][indexToFill.y]
        }
        
        const newState = await dbi.setCrosswordState(playerId, crosswordState!.words, guessed_words_array, convertedOriginalGrid, crosswordState!.crossword_id, Array.from(tries))
        await stats.addCrosswordGuessEvent(playerId, guessed_words_array.length, tries.size + guessed_words_array.length, isFinished(newState!), true)
        res.json({isWord:true, guessed_word: guessed_word, state: (await stateToReply(convertedOriginalGrid, crosswordState!.words, crossword!, isFinished(newState!)))})
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});


crossword.post('/init', async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        const playerId = await dbi.resolvePlayerId(value.auth_id);
        var crosswordState = await dbi.getCrosswordState(playerId);
        var grid = []
        var word_list = []
        var tries:string[] = []
        var crossword_id = -1
        var guessed_words:string[] = []

        if (crosswordState == null || isFinished(crosswordState)) {
            const crossword = await dbi.getRandomCrossword();
            console.log(crossword)
            console.log(crossword.letter_grid)
            grid = convertGrid(crossword.letter_grid)
            word_list = Object.values(crossword.word_list).map(w => w.word)
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
        const newState = await dbi.setCrosswordState(playerId, word_list, guessed_words, grid, crossword_id, tries)
        const state = (await stateToReply(grid, word_list, crossword!, isFinished(newState!)))
        await stats.addCrosswordInitEvent(playerId, crossword_id);
        res.json({
            message:'ok',
            state: state
        })
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
    
});
