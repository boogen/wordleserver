import { ObjectId } from 'mongodb';



export class RawRankingEntry {
    constructor(public player_id: number, public score: number, public id?: ObjectId) { };
}
