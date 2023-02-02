import { ObjectId } from 'mongodb';



export class PlayerLastLogin {
    constructor(public player_id: number, public timestamp: number, public _id?: ObjectId) { }
}
