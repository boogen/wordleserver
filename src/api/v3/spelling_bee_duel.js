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
exports.SpellingBeeDuelGuessReply = exports.spelling_bee_duel = void 0;
const express_1 = __importDefault(require("express"));
const node_1 = __importDefault(require("@sentry/node"));
const AuthIdRequest_1 = __importDefault(require("../../types/AuthIdRequest"));
const spelling_bee_common_1 = require("./spelling_bee_common");
const DBI_1 = __importStar(require("../../DBI"));
const BaseGuessRequest_1 = __importDefault(require("../../types/BaseGuessRequest"));
const player_common_1 = require("./player_common");
const duel_settings_1 = require("./duel_settings");
const ranking_common_1 = require("./ranking_common");
const WordleStatsDBI_1 = require("../../WordleStatsDBI");
exports.spelling_bee_duel = express_1.default.Router();
const dbi = new DBI_1.default();
const stats = new WordleStatsDBI_1.Stats();
var DuelResult;
(function (DuelResult) {
    DuelResult["win"] = "win";
    DuelResult["lose"] = "lose";
    DuelResult["draw"] = "draw";
    DuelResult["error"] = "error";
})(DuelResult || (DuelResult = {}));
class SpellingBeeDuelGuessReply {
    constructor(message, state, points) {
        this.message = message;
        this.state = state;
        this.points = points;
    }
}
exports.SpellingBeeDuelGuessReply = SpellingBeeDuelGuessReply;
class SpellingBeeDuelStart {
    constructor(opponent_nick, opponent_moves, state) {
        this.opponent_nick = opponent_nick;
        this.opponent_moves = opponent_moves;
        this.state = state;
    }
}
class SpelllingBeeDuelEnd {
    constructor(result, player_points, opponent_points, new_player_elo, player_elo_diff, time_left) {
        this.result = result;
        this.player_points = player_points;
        this.opponent_points = opponent_points;
        this.new_player_elo = new_player_elo;
        this.player_elo_diff = player_elo_diff;
        this.time_left = time_left;
    }
}
class SpellingBeeDuelStateReply {
    constructor(main_letter, other_letters, guessed_words, player_points, time_left, round_time) {
        this.main_letter = main_letter;
        this.other_letters = other_letters;
        this.guessed_words = guessed_words;
        this.player_points = player_points;
        this.time_left = time_left;
        this.round_time = round_time;
    }
}
class SpellingBeeDuellGuessMessage {
    constructor(word, seconds, points) {
        this.word = word;
        this.seconds = seconds;
        this.points = points;
    }
}
class SpellingBeeDuelPrematchPlayerInfo {
    constructor(id, player, elo) {
        this.id = id;
        this.player = player;
        this.elo = elo;
    }
}
class SpellingBeeDuelPrematchReply {
    constructor(message, player, opponent) {
        this.message = message;
        this.player = player;
        this.opponent = opponent;
    }
}
function calculateNewSimpleRank(playerScore, result) {
    switch (result) {
        case DuelResult.draw:
            return playerScore + 0;
        case DuelResult.win:
            return playerScore + 50;
            break;
        case DuelResult.lose:
            return playerScore - 30;
        default:
            throw new Error("Cannot calculate new elo - incorrect result");
    }
}
function calculateNewEloRank(playerScore, opponentScore, result) {
    const rankingDiff = playerScore - opponentScore;
    const expectedResult = 1 / (Math.pow(10, -rankingDiff / 400) + 1);
    var numericalResult = 0;
    switch (result) {
        case DuelResult.draw:
            numericalResult = 0.5;
            break;
        case DuelResult.lose:
            numericalResult = 0;
            break;
        case DuelResult.win:
            numericalResult = 1;
            break;
        default:
            throw new Error("Cannot calculate new elo - incorrect result");
    }
    return playerScore + Math.ceil(duel_settings_1.ELO_COEFFICIENT * (numericalResult - expectedResult));
}
function createBotGuesses(bee_model, player_id) {
    return __awaiter(this, void 0, void 0, function* () {
        const player_duels_bee_ids = yield dbi.getAllPlayerDuelsBeeIds(player_id);
        const best_result_percentage = yield dbi.getBestResultPercentage(player_id, player_duels_bee_ids);
        const average_percentage = best_result_percentage.reduce((a, b) => a + b, 0) / best_result_percentage.length;
        const return_value = [];
        var bot_points = average_percentage * duel_settings_1.BOT_THRESHOLD.get_random() * (0, spelling_bee_common_1.getMaxPoints)(bee_model.words, bee_model.other_letters);
        const bot_guesses = [];
        while (bot_points > 0) {
            const guess = bee_model.words[Math.floor(Math.random() * bee_model.words.length)];
            if (!bot_guesses.includes(guess)) {
                bot_guesses.push(guess);
                bot_points -= (0, spelling_bee_common_1.wordPoints)(guess, bee_model.other_letters);
            }
        }
        const guess_interval = (duel_settings_1.DUEL_DURATION - 20) / bot_guesses.length;
        var time = 10;
        var points = 0;
        for (var guess of bot_guesses) {
            var points_for_guess = (0, spelling_bee_common_1.wordPoints)(guess, bee_model.other_letters);
            points += points_for_guess;
            return_value.push(new DBI_1.SpellingBeeDuellGuess("", Math.floor(time), points));
            time += guess_interval;
        }
        return return_value;
    });
}
function getSpellingBeeDuelPrematchPlayerInfo(id) {
    return __awaiter(this, void 0, void 0, function* () {
        return new SpellingBeeDuelPrematchPlayerInfo(id, (yield (0, player_common_1.get_nick)(id, dbi)).nick, yield dbi.getCurrentSpellingBeeElo(id));
    });
}
exports.spelling_bee_duel.post('/prematch', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const request = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(request.authId);
        const timestamp = Date.now() / 1000;
        const existing_duell = yield dbi.checkForUnfinishedDuel(player_id, timestamp, duel_settings_1.DUEL_DURATION);
        if (existing_duell !== null) {
            res.json(new SpellingBeeDuelPrematchReply('ok', yield getSpellingBeeDuelPrematchPlayerInfo(player_id), yield getSpellingBeeDuelPrematchPlayerInfo(existing_duell.opponent_id)));
            return;
        }
        const existing_match = yield dbi.getSpellingBeeDuelMatch(player_id);
        if (existing_match !== null) {
            res.json(new SpellingBeeDuelPrematchReply('ok', yield getSpellingBeeDuelPrematchPlayerInfo(player_id), yield getSpellingBeeDuelPrematchPlayerInfo(existing_match.opponent_id)));
            return;
        }
        const opponentsCandidates = yield dbi.getOpponentsFromSpellingBeeEloRank(player_id, (yield dbi.getCurrentSpellingBeeElo(player_id)), duel_settings_1.MATCH_ELO_DIFF);
        var opponent_id = (0, player_common_1.get_bot_id)();
        if (Math.random() >= duel_settings_1.CHANCE_FOR_BOT && opponentsCandidates.length !== 0) {
            var opponent_filter = new Set((yield dbi.getLastSpellingBeeDuelOpponents(player_id)));
            var filtered_candidates = opponentsCandidates.filter(id => !opponent_filter.has(id));
            console.log(filtered_candidates);
            if (filtered_candidates.length !== 0) {
                opponent_id = filtered_candidates[Math.floor(Math.random() * filtered_candidates.length)];
            }
        }
        yield dbi.addSpellingBeeDuelMatch(player_id, opponent_id);
        stats.addSpellingBeeDuelPrematchEvent(player_id, opponent_id);
        res.json(new SpellingBeeDuelPrematchReply('ok', yield getSpellingBeeDuelPrematchPlayerInfo(player_id), yield getSpellingBeeDuelPrematchPlayerInfo(opponent_id)));
    }
    catch (error) {
        console.log(error);
    }
}));
exports.spelling_bee_duel.post('/start', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const request = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(request.authId);
        const timestamp = Date.now() / 1000;
        var duel = yield dbi.checkForUnfinishedDuel(player_id, timestamp, duel_settings_1.DUEL_DURATION);
        if (duel === null) {
            duel = (yield dbi.checkForExistingDuel(player_id, timestamp, duel_settings_1.DUEL_DURATION));
        }
        var opponent_guesses = [];
        const existing_match = yield dbi.getSpellingBeeDuelMatch(player_id);
        var opponent_id = existing_match.opponent_id;
        if (duel === null) {
            var spelling_bee_model = yield dbi.getRandomBee();
            if (opponent_id < 0) {
                const bot_guesses = yield createBotGuesses((yield dbi.getRandomBee()), player_id);
                opponent_guesses = opponent_guesses.concat(bot_guesses);
            }
            else {
                spelling_bee_model = (yield dbi.getRandomDuelBee(opponent_id));
                var best_duel = (yield dbi.getDuelsForGivenBee(spelling_bee_model.id, opponent_id, timestamp, duel_settings_1.DUEL_DURATION));
                opponent_guesses = opponent_guesses.concat(best_duel.player_guesses).map(g => g = new DBI_1.SpellingBeeDuellGuess(g.word, g.timestamp - best_duel.start_timestamp, g.points_after_guess));
            }
            console.log(opponent_guesses);
            var opponent_points = 0;
            if (opponent_guesses.length > 0) {
                opponent_points = opponent_guesses[opponent_guesses.length - 1].points_after_guess;
            }
            duel = (yield dbi.startDuel(spelling_bee_model, player_id, opponent_id, opponent_guesses, opponent_points, timestamp));
        }
        else {
            opponent_guesses = opponent_guesses.concat(duel.opponent_guesses);
            opponent_id = duel.opponent_id;
        }
        stats.addSpellingBeeDuelStartEvent(player_id, opponent_id, duel.bee_id, duel.bee_duel_id);
        res
            .status(200)
            .json(new SpellingBeeDuelStart((yield (0, player_common_1.get_nick)(opponent_id, dbi)).nick, opponent_guesses.map(g => new SpellingBeeDuellGuessMessage("", g.timestamp, g.points_after_guess)), new SpellingBeeDuelStateReply(duel.main_letter, duel.letters, duel.player_guesses.map(guess => guess.word), duel.player_points, Math.floor(duel.start_timestamp + duel_settings_1.DUEL_DURATION - timestamp), duel_settings_1.DUEL_DURATION)));
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
exports.spelling_bee_duel.post('/guess', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const request = new BaseGuessRequest_1.default(req);
        const guess = request.guess;
        const player_id = yield dbi.resolvePlayerId(request.authId);
        const timestamp = Date.now() / 1000;
        var duel = yield dbi.checkForExistingDuel(player_id, timestamp, duel_settings_1.DUEL_DURATION);
        const bee_model = yield dbi.getBeeById(duel.bee_id);
        var message = yield (0, spelling_bee_common_1.checkSpellingBeeGuess)(guess, duel.player_guesses.map(g => g.word), bee_model, dbi);
        if (message !== spelling_bee_common_1.SpellingBeeReplyEnum.ok) {
            res.json(new SpellingBeeDuelGuessReply(message, new SpellingBeeDuelStateReply(duel.main_letter, duel.letters, duel.player_guesses.map(g => g.word), duel.player_points, Math.floor(duel.start_timestamp + duel_settings_1.DUEL_DURATION - timestamp), duel_settings_1.DUEL_DURATION), 0));
            return;
        }
        var points = (0, spelling_bee_common_1.wordPoints)(guess, bee_model.other_letters);
        duel = yield dbi.addPlayerGuessInSpellingBeeDuel(duel.bee_duel_id, player_id, guess, points, duel, timestamp);
        stats.addSpellingBeeDuelGuessEvent(player_id, duel.bee_duel_id, points, duel.player_points);
        res.json(new SpellingBeeDuelGuessReply(message, new SpellingBeeDuelStateReply(duel.main_letter, duel.letters, duel.player_guesses.map(g => g.word), duel.player_points, Math.floor(duel.start_timestamp + duel_settings_1.DUEL_DURATION - timestamp), duel_settings_1.DUEL_DURATION), points));
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
exports.spelling_bee_duel.post('/end', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const request = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(request.authId);
        const timestamp = Date.now() / 1000;
        var duel = yield dbi.checkForUnfinishedDuel(player_id, timestamp, duel_settings_1.DUEL_DURATION);
        if (duel === null) {
            var ongoing_duel = yield dbi.checkForExistingDuel(player_id, timestamp, duel_settings_1.DUEL_DURATION);
            if (ongoing_duel === null) {
                res.json(new SpelllingBeeDuelEnd(DuelResult.error, -1, -1, -1, -1));
            }
            else {
                res.json(new SpelllingBeeDuelEnd(DuelResult.error, -1, -1, Math.floor(ongoing_duel.start_timestamp + duel_settings_1.DUEL_DURATION - timestamp), -1, -1));
            }
            return;
        }
        yield dbi.markDuelAsFinished(duel.bee_duel_id, player_id);
        var result = DuelResult.draw;
        if (duel.player_points > duel.opponent_points) {
            result = DuelResult.win;
        }
        if (duel.opponent_points > duel.player_points) {
            result = DuelResult.lose;
        }
        const currentEloScore = yield dbi.getCurrentSpellingBeeElo(player_id);
        const opponentElo = yield dbi.getCurrentSpellingBeeElo(duel.opponent_id);
        const new_player_elo = calculateNewSimpleRank(currentEloScore, result);
        dbi.updateSpellingBeeEloRank(player_id, new_player_elo);
        stats.addSpellingBeeDuelEndEvent(player_id, duel.bee_duel_id, result, currentEloScore, new_player_elo);
        res.json(new SpelllingBeeDuelEnd(result, duel.player_points, duel.opponent_points, new_player_elo, new_player_elo - currentEloScore));
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
exports.spelling_bee_duel.post('/get_elo_rank', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const request = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(request.authId);
        var rank = yield dbi.getSpellingBeeEloRank();
        res.json((yield (0, ranking_common_1.get_ranking)(player_id, rank, dbi)));
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
