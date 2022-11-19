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
        public _id?: ObjectId) { 
            season_rules.fixedPoints = new Map(Object.entries(season_rules.fixedPoints)) as unknown as Map<number, number>;
            season_rules.multiplier = new Map(Object.entries(season_rules.multiplier)) as unknown as Map<number, number>;
            season_rules.pointsForLetters = new Map(Object.entries(season_rules.pointsForLetters)) as unknown as Map<string, number>;
            season_rules.letterUsage = new Map(Object.entries(season_rules.letterUsage)) as unknown as Map<string, number>;
        }
}
