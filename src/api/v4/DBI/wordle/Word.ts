import { ObjectId } from 'mongodb';



export class Word {
    constructor(public word: string, public id?: ObjectId) { }
}
