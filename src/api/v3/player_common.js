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
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_nick = exports.get_bot_id = void 0;
const POSSIBLE_BOT_NICKS = ["Krysia", "Zdzichu", "srebrny_puchacz", "123456", "cybertouch", "shockwave", "rockstar"];
class PlayerNick {
    constructor(player_id, _nick) {
        this.player_id = player_id;
        this.nick = "";
        if (_nick) {
            this.nick = _nick;
        }
    }
}
function get_bot_id() {
    return Math.floor(Math.random() * POSSIBLE_BOT_NICKS.length + 1) * -1;
}
exports.get_bot_id = get_bot_id;
function get_nick(player_id, dbi) {
    return __awaiter(this, void 0, void 0, function* () {
        if (player_id < 0) {
            return new PlayerNick(player_id, POSSIBLE_BOT_NICKS[-(player_id + 1)]);
        }
        return dbi.getProfile(player_id).then(profile => new PlayerNick(player_id, profile === null || profile === void 0 ? void 0 : profile.nick));
    });
}
exports.get_nick = get_nick;
