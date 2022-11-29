import { ObjectId } from 'mongodb';



export class GlobalBee {
    constructor(public bee_id: number, public bee_model_id: number, public validity: number, public letters: string[], public required_letters: string[], public id?: ObjectId) {
    }
}
