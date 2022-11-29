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
exports.spelling_bee = void 0;
const express_1 = __importDefault(require("express"));
const Sentry = __importStar(require("@sentry/node"));
const DBI_1 = __importDefault(require("../../DBI"));
const AuthIdRequest_1 = __importDefault(require("../../types/AuthIdRequest"));
const SpellingBeeGuessRequest_1 = __importDefault(require("../../types/SpellingBeeGuessRequest"));
const spelling_bee_common_1 = require("./spelling_bee_common");
const ranking_common_1 = require("./ranking_common");
const WordleStatsDBI_1 = require("../../WordleStatsDBI");
exports.spelling_bee = express_1.default.Router();
const dbi = new DBI_1.default();
const BEE_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;
const stats = new WordleStatsDBI_1.Stats();
class GlobalSpellingBeeStateReply extends spelling_bee_common_1.SpellingBeeStateReply {
    constructor(messageEnum, main_letter, other_letters, guessed_words, player_points, max_points) {
        super(messageEnum.toString(), main_letter, other_letters, guessed_words, player_points);
        this.messageEnum = messageEnum;
        this.main_letter = main_letter;
        this.other_letters = other_letters;
        this.guessed_words = guessed_words;
        this.player_points = player_points;
        this.max_points = max_points;
    }
}
class SuccessfullGlobalSpellingBeeStateReply extends spelling_bee_common_1.SuccessfullSpellingBeeStateReply {
    constructor(main_letter, other_letters, guessed_words, player_points, max_points, points) {
        super(spelling_bee_common_1.SpellingBeeReplyEnum.ok, main_letter, other_letters, guessed_words, player_points, points);
        this.main_letter = main_letter;
        this.other_letters = other_letters;
        this.guessed_words = guessed_words;
        this.player_points = player_points;
        this.max_points = max_points;
    }
}
exports.spelling_bee.post('/getState', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const request = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(request.authId);
        var new_validity_timestamp = GLOBAL_TIME_START;
        const timestamp = Date.now() / 1000;
        while (new_validity_timestamp < timestamp) {
            new_validity_timestamp += BEE_VALIDITY;
        }
        var letters = yield dbi.getLettersForBee(timestamp);
        if (null === letters) {
            letters = yield dbi.createLettersForBee(new_validity_timestamp);
        }
        var state = yield dbi.getBeeState(player_id, letters.bee_id);
        var guesses = [];
        if (state === null) {
            guesses = [];
        }
        else {
            guesses = state.guesses;
        }
        const playerPoints = yield dbi.getBeePlayerPoints(player_id, letters.bee_id);
        res.json(new GlobalSpellingBeeStateReply(spelling_bee_common_1.SpellingBeeReplyEnum.ok, letters.main_letter, letters.letters, guesses, playerPoints, (0, spelling_bee_common_1.getMaxPoints)((yield dbi.getBeeWords(letters.bee_model_id)), letters.letters)));
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
}));
exports.spelling_bee.post('/guess', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const request = new SpellingBeeGuessRequest_1.default(req);
        const guess = request.guess;
        const player_id = yield dbi.resolvePlayerId(request.authId);
        const timestamp = Date.now() / 1000;
        const letters = yield dbi.getLettersForBee(timestamp);
        const bee_model = yield dbi.getBeeById(letters.bee_model_id);
        var state = yield dbi.getBeeState(player_id, letters.bee_id);
        var guesses;
        if (state === null) {
            guesses = [];
        }
        else {
            guesses = state.guesses;
        }
        var message = yield (0, spelling_bee_common_1.checkSpellingBeeGuess)(guess, guesses, bee_model, dbi);
        if (message != spelling_bee_common_1.SpellingBeeReplyEnum.ok) {
            var playerPoints = (yield dbi.getBeePlayerPoints(player_id, letters.bee_id));
            stats.addSpellingBeeGuessEvent(player_id, guess, false, 0, playerPoints);
            res.json(new GlobalSpellingBeeStateReply(message, letters.main_letter, letters.letters, guesses, (yield dbi.getBeePlayerPoints(player_id, letters.bee_id)), (0, spelling_bee_common_1.getMaxPoints)((yield dbi.getBeeWords(letters.bee_model_id)), letters.letters)));
            return;
        }
        state = yield dbi.addBeeGuess(player_id, letters.bee_id, guess);
        var points = (0, spelling_bee_common_1.wordPoints)(guess, letters.letters);
        yield dbi.increaseBeeRank(player_id, letters.bee_id, points);
        var playerPoints = (yield dbi.getBeePlayerPoints(player_id, letters.bee_id));
        stats.addSpellingBeeGuessEvent(player_id, guess, true, points, playerPoints);
        res.json(new SuccessfullGlobalSpellingBeeStateReply(letters.main_letter, letters.letters, state.guesses, playerPoints, (0, spelling_bee_common_1.getMaxPoints)((yield dbi.getBeeWords(letters.bee_model_id)), letters.letters), points));
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
}));
exports.spelling_bee.post('/ranking', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(value.authId);
        const timestamp = Date.now() / 1000;
        const bee = yield dbi.getLettersForBee(timestamp);
        console.log("Bee id:" + bee);
        if (bee === null) {
            res.json(new ranking_common_1.RankingReply(undefined, []));
            return;
        }
        const ranking = yield dbi.getBeeRanking(bee.bee_id);
        console.log(ranking);
        res.json((yield (0, ranking_common_1.get_ranking)(player_id, ranking, dbi)));
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
}));
