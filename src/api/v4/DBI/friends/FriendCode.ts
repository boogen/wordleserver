import { ObjectId } from 'mongodb';



export class FriendCode {
    constructor(public player_id: number, public friend_code: string, public id?: ObjectId) { }
}
