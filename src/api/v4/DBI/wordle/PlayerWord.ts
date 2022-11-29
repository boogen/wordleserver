import { ObjectId } from 'mongodb';



export class PlayerWord {
    constructor(public player_id: number, public word_id: number, public word: string, public expiration: number, public id?: ObjectId) { }
}
