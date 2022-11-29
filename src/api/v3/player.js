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
exports.player = void 0;
const express_1 = __importDefault(require("express"));
const node_1 = __importDefault(require("@sentry/node"));
const AuthIdRequest_1 = __importDefault(require("../../types/AuthIdRequest"));
const SetNickRequest_1 = __importDefault(require("../../types/SetNickRequest"));
const utils_1 = __importDefault(require("../../utils"));
const DBI_1 = __importDefault(require("../../DBI"));
const WordleStatsDBI_1 = require("../../WordleStatsDBI");
exports.player = express_1.default.Router();
const dbi = new DBI_1.default();
const stats = new WordleStatsDBI_1.Stats();
function makeid() {
    return utils_1.default.randomString(36);
}
exports.player.post("/register", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        var authId = makeid();
        while (yield dbi.isAuthIdUsed(authId)) {
            authId = makeid();
        }
        const playerId = yield dbi.getNextSequenceValue("player_id");
        yield dbi.addPlayerToAuthMap(authId, playerId);
        yield stats.addRegistrationEvent(authId, playerId);
        res.json({ message: 'ok', authId: authId });
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
exports.player.post("/setNick", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new SetNickRequest_1.default(req);
        console.log(value.authId);
        const player_id = (yield dbi.resolvePlayerId(value.authId));
        yield dbi.setNick(player_id, value.nick, (nick) => res.json({ message: 'ok', profile: { nick: nick } }));
        yield stats.addSetNickEvent(player_id, value.nick);
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
exports.player.post("/getProfile", (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(value.authId);
        const profile = yield dbi.getProfile(player_id);
        if (profile === null) {
            res.json({ message: null });
            return;
        }
        res.json({ message: 'ok', profile: { nick: profile.nick } });
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
