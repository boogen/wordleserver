import { ObjectId } from 'mongodb';


export class Limit {
    constructor(public name:string, public limit:number, public limitless:boolean) {}
}

export class PlayerLimits {
    constructor(public player_id: number, public limits:Limit[], public _id?: ObjectId) { }
}
