import { Send } from "express-serve-static-core";
import WordleDBI, { RankingEntry } from "../../DBI";
import { get_nick } from "./player_common";

export async function get_ranking(player_id:number, ranking:RankingEntry[], dbi:WordleDBI):Promise<RankingReply> {
    var ranking_with_nicks:PositionInRank[] = await Promise.all(ranking.map(async (e) => new PositionInRank(e.position, e.score, (await get_nick(e.player_id, dbi)).nick, player_id)))
    return new RankingReply(ranking_with_nicks.find(e => e.player_id === player_id), ranking_with_nicks);
}

class PositionInRank {
    constructor(public position:number, public score:number, public nick:string, public player_id:number) {}
}

export class RankingReply {
    message:String = "ok"
    constructor(public myInfo:PositionInRank|undefined, public ranking:PositionInRank[]){}
}