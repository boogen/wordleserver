import { ObjectId } from 'mongodb';
import { LetterToBuy, SeasonRules } from '../../../season_rules';
import { LetterState } from '../LetterState';
import { SpellingBeeDuellGuess } from './SpellingBeeDuellGuess';





export class SpellingBeeDuel {
    constructor(public bee_duel_id: number,
        public bee_id: number,
        public player_id: number,
        public opponent_id: number,
        public player_guesses: SpellingBeeDuellGuess[],
        public opponent_guesses: SpellingBeeDuellGuess[],
        public player_points: number,
        public opponent_points: number,
        public letters: LetterState[],
        public start_timestamp: number,
        public finished: boolean,
        public lettersToBuy: LetterToBuy[],
        public season_rules:SeasonRules,
        public season_tag?:string,
        public _id?: ObjectId) { 
        }
}
