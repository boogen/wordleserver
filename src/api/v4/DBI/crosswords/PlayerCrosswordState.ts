import { ObjectId } from 'mongodb';



export class PlayerCrosswordState {
    constructor(public player_id: number, public crossword_id: number, public grid: String[][], public guessed_words: string[], public tries: string[], public words: string[], public id?: ObjectId) { }
}
