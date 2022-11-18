import { ObjectId } from 'mongodb';
import { RawRankingEntry } from './RawRankingEntry';



export class RankingEntry extends RawRankingEntry {
    constructor(public player_id: number, public score: number, public position: number, public id?: ObjectId) {
        super(player_id, score, id);
    };
}
