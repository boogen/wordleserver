import { ObjectId } from 'mongodb';



export class Bee {
    constructor(public id: number, public max_points:number, public required_letters: string[], public other_letters: string[], public _id?: ObjectId) { }
}
