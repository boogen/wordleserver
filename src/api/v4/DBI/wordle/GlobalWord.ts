import { ObjectId } from 'mongodb';



export class GlobalWord {
    constructor(public word: string, public validity: number, public word_id: number, public id?: ObjectId) { }
}
