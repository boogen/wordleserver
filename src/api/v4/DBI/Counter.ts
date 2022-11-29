import { ObjectId } from 'mongodb';



export class Counter {
    constructor(public id: string, public sequence_value: number, public _id?: ObjectId) { }
}
