"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.crossword = void 0;
const express_1 = __importDefault(require("express"));
const Sentry = __importStar(require("@sentry/node"));
const DBI_1 = __importDefault(require("../../DBI"));
const BaseGuessRequest_1 = __importDefault(require("../../types/BaseGuessRequest"));
const AuthIdRequest_1 = __importDefault(require("../../types/AuthIdRequest"));
const WordleStatsDBI_1 = require("../../WordleStatsDBI");
exports.crossword = express_1.default.Router();
const dbi = new DBI_1.default();
const stats = new WordleStatsDBI_1.Stats();
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
function convertGrid(grid, isNew = true) {
    var flatten_grid = [];
    for (var i = 0; i < grid.length; i++) {
        var result = [];
        for (var j = 0; j < grid[i].length; j++) {
            if (grid[i][j] == null) {
                result.push(" ");
            }
            else {
                result.push(isNew ? "-" : grid[i][j]);
            }
        }
        flatten_grid.push(result);
    }
    return flatten_grid;
}
function stateToReply(grid, word_list, crossword, finished) {
    return __awaiter(this, void 0, void 0, function* () {
        var letterList = new Set(word_list.join(""));
        return { letters: Array.from(letterList),
            grid: grid.concat.apply([], grid),
            height: crossword.letter_grid.length,
            width: crossword.letter_grid[0].length,
            completed: finished
        };
    });
}
exports.crossword.post('/mock', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const crossword = yield dbi.getFirstCrossword();
        var letterList = new Set(crossword.word_list.map(c => c.word).join(""));
        console.log(crossword.letter_grid);
        var grid = [];
        for (var i = 0; i < crossword.letter_grid.length; i++) {
            var result = [];
            for (var j = 0; j < crossword.letter_grid[i].length; j++) {
                if (crossword.letter_grid[i][j] != null) {
                    result.push("-");
                }
                else {
                    result.push(" ");
                }
            }
            grid.push(result);
        }
        res.json({
            message: 'ok',
            letters: Array.from(letterList),
            grid: grid.concat.apply([], grid),
            height: grid.length,
            width: grid[0].length
        });
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
}));
exports.crossword.post('/guess', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const value = new BaseGuessRequest_1.default(req);
        const playerId = yield dbi.resolvePlayerId(value.authId);
        const players_word = value.guess.toLowerCase();
        const isWord = yield dbi.isWordValid(players_word);
        var crosswordState = yield dbi.getCrosswordState(playerId);
        var grid = crosswordState.grid;
        var guessed_words = new Set(crosswordState.guessed_words);
        const crossword = yield dbi.getCrossword(crosswordState.crossword_id);
        if (!isWord) {
            yield stats.addCrosswordGuessEvent(playerId, crosswordState.guessed_words.length, crosswordState.tries.length + crosswordState.guessed_words.length, isFinished(crosswordState), false);
            res.json({ isWord: false, guessed_word: false, state: (yield stateToReply(grid, crosswordState.words, crossword, isFinished(crosswordState))) });
            return;
        }
        const original_grid = crossword.letter_grid;
        const guessed_word = crosswordState.words.includes(players_word);
        const convertedOriginalGrid = convertGrid(original_grid);
        const tries = new Set(crosswordState.tries);
        var indexToFill = undefined;
        for (var i = 0; i < convertedOriginalGrid.length; i++) {
            for (var j = 0; j < convertedOriginalGrid[i].length; j++) {
                convertedOriginalGrid[i][j] = grid[i][j];
            }
        }
        if (guessed_word) {
            guessed_words.add(players_word);
        }
        else {
            if (!tries.has(players_word)) {
                tries.add(players_word);
                const placesToFill = [];
                for (var i = 0; i < grid.length; i++) {
                    for (var j = 0; j < grid[i].length; j++) {
                        if (grid[i][j] == "-") {
                            placesToFill.push({ x: i, y: j });
                        }
                    }
                }
                const index = Math.floor(Math.random() * placesToFill.length);
                indexToFill = placesToFill[index];
            }
        }
        const guessed_words_array = Array.from(guessed_words);
        for (var z = 0; z < guessed_words_array.length; z++) {
            const word = guessed_words_array[z];
            var coordinates = (_a = crossword.word_list.find(e => e.word === word)) === null || _a === void 0 ? void 0 : _a.coordinates;
            if (original_grid[coordinates.row].slice(coordinates.column, coordinates.column + word.length).join("") == word) {
                for (var i = 0; i < word.length; i++) {
                    convertedOriginalGrid[coordinates.row][coordinates.column + i] = word[i];
                }
            }
            else {
                for (var i = 0; i < word.length; i++) {
                    convertedOriginalGrid[coordinates.row + i][coordinates.column] = word[i];
                }
            }
        }
        if (indexToFill) {
            convertedOriginalGrid[indexToFill.x][indexToFill.y] = original_grid[indexToFill.x][indexToFill.y];
        }
        const newState = yield dbi.setCrosswordState(playerId, crosswordState.words, guessed_words_array, convertedOriginalGrid, crosswordState.crossword_id, Array.from(tries));
        yield stats.addCrosswordGuessEvent(playerId, guessed_words_array.length, tries.size + guessed_words_array.length, isFinished(newState), true);
        res.json({ isWord: true, guessed_word: guessed_word, state: (yield stateToReply(convertedOriginalGrid, crosswordState.words, crossword, isFinished(newState))) });
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
}));
exports.crossword.post('/init', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new AuthIdRequest_1.default(req);
        const playerId = yield dbi.resolvePlayerId(value.authId);
        var crosswordState = yield dbi.getCrosswordState(playerId);
        var grid = [];
        var word_list = [];
        var tries = [];
        var crossword_id = -1;
        var guessed_words = [];
        if (crosswordState == null || isFinished(crosswordState)) {
            const crossword = yield dbi.getRandomCrossword();
            console.log(crossword);
            console.log(crossword.letter_grid);
            grid = convertGrid(crossword.letter_grid);
            word_list = Object.values(crossword.word_list).map(w => w.word);
            crossword_id = crossword.crossword_id;
        }
        else {
            grid = crosswordState.grid;
            word_list = crosswordState.words;
            crossword_id = crosswordState.crossword_id;
            if (crosswordState.tries) {
                tries = crosswordState.tries;
            }
            guessed_words = crosswordState.guessed_words;
        }
        const crossword = yield dbi.getCrossword(crossword_id);
        const newState = yield dbi.setCrosswordState(playerId, word_list, guessed_words, grid, crossword_id, tries);
        const state = (yield stateToReply(grid, word_list, crossword, isFinished(newState)));
        yield stats.addCrosswordInitEvent(playerId, crossword_id);
        res.json({
            message: 'ok',
            state: state
        });
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
}));
