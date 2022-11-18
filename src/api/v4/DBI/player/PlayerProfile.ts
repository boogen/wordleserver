import { ObjectId } from 'mongodb';



export class PlayerProfile {
    constructor(public nick: string, public id: number, public _id?: ObjectId) { }
}
