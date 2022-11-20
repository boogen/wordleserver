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
exports.challenge = void 0;
const express_1 = __importDefault(require("express"));
const Sentry = __importStar(require("@sentry/node"));
const DBI_1 = __importDefault(require("../../DBI"));
const AuthIdRequest_1 = __importDefault(require("../../types/AuthIdRequest"));
const BaseGuessRequest_1 = __importDefault(require("../../types/BaseGuessRequest"));
const dbi = new DBI_1.default();
exports.challenge = express_1.default.Router();
exports.challenge.post('/getState', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(value.authId);
        var val = yield dbi.getWord();
        var word = val[0].word;
        console.log("word %s player id %s", word, player_id);
        var existing = yield dbi.getPlayerLastWord(player_id);
        if (existing == null) {
            existing = yield dbi.addNewPlayerWord(player_id, word, 0);
        }
        const tries = yield dbi.getPlayerChallengeTries(player_id, existing.word_id);
        res.json({
            message: 'ok',
            guesses: yield Promise.all(tries.guesses.map(function (g) {
                return __awaiter(this, void 0, void 0, function* () { return validateGuess(g, existing.word); });
            })),
            finished: tries.guesses.length == 6 || tries.guesses.includes(existing.word)
        });
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
}));
exports.challenge.post('/validate', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new BaseGuessRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(value.authId);
        console.log(value);
        const timestamp = Date.now() / 1000;
        const wordEntry = yield dbi.getPlayerLastWord(player_id);
        const guess = value.guess;
        console.log("Player id: %s", player_id);
        const word = wordEntry.word;
        const t = yield dbi.getPlayerChallengeTries(player_id, wordEntry.word_id);
        var tries = t.guesses.length;
        if (t.guesses.includes(guess) || tries >= 6) {
            res.json({ isWord: false, guess: guess, answer: [], isGuessed: guess == word });
            return;
        }
        const guessResult = yield validateGuess(guess, word);
        if (guessResult.isWord) {
            dbi.addChallengeGuess(player_id, wordEntry.word_id, guess);
            tries += 1;
        }
        console.log("tries: " + tries);
        if (tries == 6) {
            guessResult.correctWord = word;
        }
        if (tries == 6 || guessResult.isGuessed) {
            var val = yield dbi.getWord();
            var new_word = val[0].word;
            yield dbi.addNewPlayerWord(player_id, new_word, 0);
        }
        console.log(guessResult);
        res.json(guessResult);
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
}));
function validateGuess(guess, word) {
    return __awaiter(this, void 0, void 0, function* () {
        const guessed = (guess == word);
        const isWord = yield dbi.isWordValid(guess);
        console.log("Guessed word: %s, actual word: %s", guess, word);
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
        return { isWord: isWord, guess: guess, answer: result, isGuessed: guessed, correctWord: "" };
    });
}
