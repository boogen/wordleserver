import { ObjectId } from 'mongodb';
import { Limit } from './PlayerLimits';



export class PlayerLimitsModel {
    constructor(public player_category:string, public limits:Limit[], public _id?: ObjectId) { }
}
