import { ObjectId } from 'mongodb';



export class Bee {
    constructor(public id: number, public words: string[], public required_letters: string[], public other_letters: string[], public _id?: ObjectId) { }
}
