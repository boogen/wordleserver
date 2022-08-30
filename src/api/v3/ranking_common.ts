import { Send } from "express-serve-static-core";
import WordleDBI, { RankingEntry } from "../../DBI";
import { get_nick } from "./player_common";

export function get_ranking(player_id:number, ranking:RankingEntry[], dbi:WordleDBI, callback:Send):void {
    Promise.all(ranking.map(r => get_nick(r.player_id, dbi)))
    .then(nick_array =>{
        var nick_dictionary:Map<number, string> = new Map();
        for (var player_nick of nick_array) {
            nick_dictionary.set(player_nick.player_id, player_nick.nick);
        }
        const ranking_with_nicks = ranking.map(r => new PositionInRank(r.position, r.score, nick_dictionary.get(r.player_id)!, player_id))
        callback(new RankingReply(
            ranking_with_nicks.find(e => e.player_id === player_id),
            ranking_with_nicks
            )
        )
    }
    )
}

class PositionInRank {
    constructor(public position:number, public score:number, public nick:string, public player_id:number) {}
}

export class RankingReply {
    message:String = "ok"
    constructor(public myInfo:PositionInRank|undefined, public ranking:PositionInRank[]){}
}