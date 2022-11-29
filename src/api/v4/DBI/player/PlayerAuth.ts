import { ObjectId } from 'mongodb';



export class PlayerAuth {
    constructor(public auth_id: string, public player_id: number, public id?: ObjectId) { }
}
