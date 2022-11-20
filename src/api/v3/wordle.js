"use strict";
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
exports.wordle = void 0;
const express_1 = __importDefault(require("express"));
const node_1 = __importDefault(require("@sentry/node"));
const DBI_1 = __importDefault(require("../../DBI"));
const AuthIdRequest_1 = __importDefault(require("../../types/AuthIdRequest"));
const BaseGuessRequest_1 = __importDefault(require("../../types/BaseGuessRequest"));
const WordleStatsDBI_1 = require("../../WordleStatsDBI");
const WORD_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;
exports.wordle = express_1.default.Router();
const dbi = new DBI_1.default();
const stats = new WordleStatsDBI_1.Stats();
exports.wordle.post('/getState', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(value.authId);
        var val = yield dbi.getWord();
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
        const existing = yield dbi.getOrCreateGlobalWord(timestamp, new_validity_timestamp, word);
        const tries = yield dbi.getPlayerTries(player_id, existing.word_id, timestamp);
        stats.addWordleInitEvent(player_id, existing.word_id);
        res.json({
            message: 'ok',
            guesses: yield Promise.all(tries.guesses.map(function (g) {
                return __awaiter(this, void 0, void 0, function* () { return validateGuess(g, existing.word); });
            })),
            timeToNext: Math.floor(existing.validity - timestamp),
            finished: tries.guesses.length == 6 || tries.guesses.includes(existing.word)
        });
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
exports.wordle.post('/validate', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new BaseGuessRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(value.authId);
        const timestamp = Date.now() / 1000;
        const wordEntry = yield dbi.getGlobalWord(timestamp);
        const guess = value.guess;
        const word = wordEntry.word;
        const t = yield dbi.getPlayerTriesForWord(player_id, wordEntry.word_id);
        var tries = t.guesses.length;
        if (t.guesses.includes(guess) || tries >= 6) {
            stats.addWordleGuessEvent(player_id, tries, guess == word);
            res.json({ isWord: false, guess: guess, answer: [], isGuessed: guess == word });
            return;
        }
        const guessResult = yield validateGuess(guess, word);
        if (guessResult.isWord) {
            dbi.addGuess(player_id, wordEntry.word_id, guess);
            tries += 1;
        }
        if (guessResult.isGuessed) {
            yield dbi.increaseRank(player_id, wordEntry.word_id, tries, timestamp - t.start_timestamp);
        }
        console.log("tries: " + tries);
        if (tries == 6) {
            guessResult.correctWord = word;
        }
        stats.addWordleGuessEvent(player_id, tries, guess == word);
        res.json(guessResult);
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
exports.wordle.post('/ranking', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(value.authId);
        const timestamp = Date.now() / 1000;
        const wordEntry = yield dbi.getGlobalWord(timestamp);
        if (wordEntry === null) {
            res.json({ message: 'ok', ranking: [] });
            return;
        }
        const ranking = yield dbi.getWordleRanking(wordEntry.word_id);
        res.json({ message: 'ok',
            myInfo: yield getMyPositionInRank(player_id, ranking, dbi),
            ranking: yield Promise.all(ranking.map(function (re) {
                return __awaiter(this, void 0, void 0, function* () { return { player: (((yield dbi.getProfile(re.player_id))) || { nick: null }).nick, score: re.score, position: re.position }; });
            })) });
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
exports.wordle.post('/friendRanking', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(value.authId);
        const timestamp = Date.now() / 1000;
        const wordEntry = yield dbi.getGlobalWord(timestamp);
        if (wordEntry === null) {
            res.json({ message: 'ok', ranking: [] });
            return;
        }
        var friends = yield dbi.friendList(player_id);
        friends.push(player_id);
        const ranking = yield dbi.getRankingWithFilter(wordEntry.word_id, friends);
        res.json({ message: 'ok',
            myInfo: yield getMyPositionInRank(player_id, ranking, dbi),
            ranking: yield Promise.all(ranking.map(function (re) {
                return __awaiter(this, void 0, void 0, function* () { return { player: (((yield dbi.getProfile(re.player_id))) || { nick: null }).nick, score: re.score }; });
            })) });
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
function getMyPositionInRank(player_id, rank, dbi) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const index in rank) {
            const rankEntry = rank[index];
            if (rankEntry.player_id === player_id) {
                return { position: parseInt(index) + 1, score: rankEntry.score, player: (((yield dbi.getProfile(player_id))) || { nick: null }).nick };
            }
        }
        return null;
    });
}
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
exports.wordle.post('/word', (req, res, next) => {
    res.json({
        word: 'SNAIL'
    });
});
