import { ObjectId } from 'mongodb';



export class PlayerTries {
    constructor(public id: number, public word_id: number, public guesses: string[], public start_timestamp: number, public id_?: ObjectId) { }
}
