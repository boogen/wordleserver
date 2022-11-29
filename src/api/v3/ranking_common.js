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
exports.RankingReply = exports.get_ranking = void 0;
const player_common_1 = require("./player_common");
function get_ranking(player_id, ranking, dbi) {
    return __awaiter(this, void 0, void 0, function* () {
        var ranking_with_nicks = yield Promise.all(ranking.map((e) => __awaiter(this, void 0, void 0, function* () { return new PositionInRank(e.position, e.score, (yield (0, player_common_1.get_nick)(e.player_id, dbi)).nick, e.player_id); })));
        console.log(ranking_with_nicks);
        return new RankingReply(ranking_with_nicks.find(e => e.player_id === player_id), ranking_with_nicks);
    });
}
exports.get_ranking = get_ranking;
class PositionInRank {
    constructor(position, score, player, player_id) {
        this.position = position;
        this.score = score;
        this.player = player;
        this.player_id = player_id;
    }
}
class RankingReply {
    constructor(myInfo, ranking) {
        this.myInfo = myInfo;
        this.ranking = ranking;
        this.message = "ok";
    }
}
exports.RankingReply = RankingReply;
