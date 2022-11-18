import { ObjectId } from 'mongodb';
import { LetterToBuy } from '../../season_rules';
import { LetterState } from './LetterState';




export class GuessedWordsBee {
    constructor(public bee_id: number, public guesses: string[], public letters: LetterState[], public lettersToBuy: LetterToBuy[], public player_id?: number, playerId?: number, public id?: ObjectId) {
        if (playerId !== undefined) {
            this.player_id = playerId;
        }
    }
}
