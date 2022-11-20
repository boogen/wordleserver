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
exports.friend = void 0;
const express_1 = __importDefault(require("express"));
const utils_1 = __importDefault(require("../../utils"));
const node_1 = __importDefault(require("@sentry/node"));
const DBI_1 = __importDefault(require("../../DBI"));
const AuthIdRequest_1 = __importDefault(require("../../types/AuthIdRequest"));
const AddFriendRequest_1 = __importDefault(require("../../types/AddFriendRequest"));
exports.friend = express_1.default.Router();
const dbi = new DBI_1.default();
exports.friend.post('/code', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(value.authId);
        var friend_code = null;
        var generated_friend_code = null;
        do {
            generated_friend_code = Array.from({ length: 3 }, () => utils_1.default.randomString(4)).join("-");
            console.log(generated_friend_code);
        } while ((friend_code = yield dbi.addFriendCode(player_id, generated_friend_code)) == null);
        res.json({
            status: "ok",
            friendCode: friend_code
        });
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
exports.friend.post('/add', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new AddFriendRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(value.authId);
        if (yield dbi.addFriend(player_id, value.friendCode)) {
            res.json({
                status: "ok"
            });
        }
        else {
            res.json({
                status: "failed"
            });
        }
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
exports.friend.post('/list', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const value = new AuthIdRequest_1.default(req);
        const player_id = yield dbi.resolvePlayerId(value.authId);
        var friendList = yield dbi.friendList(player_id);
        res.json({
            status: "ok",
            friendList: friendList
        });
    }
    catch (error) {
        console.log(error);
        next(error);
        node_1.default.captureException(error);
    }
}));
