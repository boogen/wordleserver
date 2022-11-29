import { ICollection } from "monk";
import { RankingEntry } from "./RankingEntry";
import { RawRankingEntry } from "./RawRankingEntry";

export async function getScoreFromRank(player_id:number, collection:ICollection<RawRankingEntry>, defaultValue:number = 0):Promise<number> {
    const rankingEntry = await collection.findOne({player_id:player_id});
    return rankingEntry === null?defaultValue:rankingEntry.score;
}

export async function getRankWithFilter(collection:ICollection<RawRankingEntry>, filter:any):Promise<RankingEntry[]> {
    const rank = await collection.find(filter, {sort:{score: -1}})
    var returnValue:RankingEntry[] = [];
    var position:number = 1;
    var previous_score = -1;
    for (var re of rank) {
        if (previous_score !== -1 && previous_score != re.score) {
            position += 1;
        }
        returnValue.push(new RankingEntry(re.player_id, re.score, position));
        previous_score = re.score;
    }
    return returnValue;
}

export async function getRank(collection:ICollection<RawRankingEntry>):Promise<RankingEntry[]> {
    return getRankWithFilter(collection, {})
}

export async function updateRank(collection:ICollection<RawRankingEntry>, player_id:number, scoreDelta:number):Promise<RawRankingEntry> {
    return (await collection.findOneAndUpdate({player_id:player_id}, {$inc:{score:scoreDelta}}, {upsert:true}))!
}