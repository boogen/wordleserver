"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiV3 = void 0;
const express_1 = __importDefault(require("express"));
const wordle_1 = require("./wordle");
const friend_1 = require("./friend");
const player_1 = require("./player");
const wordle_challenge_1 = require("./wordle_challenge");
const spelling_bee_1 = require("./spelling_bee");
const spelling_bee_duel_1 = require("./spelling_bee_duel");
const crossword_1 = require("./crossword");
exports.apiV3 = express_1.default.Router();
exports.apiV3.get('/', (req, res) => {
    res.json({
        message: 'API - 👋🌎🌍🌏'
    });
});
exports.apiV3.use('/wordle', wordle_1.wordle);
exports.apiV3.use('/player', player_1.player);
exports.apiV3.use('/friend', friend_1.friend);
exports.apiV3.use('/classic', wordle_challenge_1.challenge);
exports.apiV3.use('/crossword', crossword_1.crossword);
exports.apiV3.use('/spelling_bee', spelling_bee_1.spelling_bee);
exports.apiV3.use('/spelling_bee_duel', spelling_bee_duel_1.spelling_bee_duel);
