import { FindOneResult } from "monk";
import WordleDBI from "../DBI";
import { ObjectId } from 'mongodb';
import { GridCoordinates } from "./model";

export class ClueState {
    constructor(public description: string, public coordinates: GridCoordinates, public length: number) { }
}

export class PlayerCrosswordV3State {
    constructor(public player_id: number, public crossword_id: number, public grid: string[][], public guessed_words: string[], public tries: string[], public words: string[], public clues: ClueState[], public id?: ObjectId) { }
}

export async function getCrosswordV3State(playerId: number, dbi: WordleDBI): Promise<PlayerCrosswordV3State | null> {
    try {
        const state = dbi.player_crossword_v3_state().findOne({ player_id: playerId });
        return state;
    }
    catch (error) {
        console.log(error);
        return null;
    }
}

export async function setCrosswordV3State(player_id: number, words: string[], guessed_words: string[], grid: string[][], crossword_id: number, tries: string[], clues: ClueState[], dbi: WordleDBI): Promise<FindOneResult<PlayerCrosswordV3State>> {
    try {
        return dbi.player_crossword_v3_state().findOneAndUpdate({ player_id: player_id }, { $set: new PlayerCrosswordV3State(player_id, crossword_id, grid, guessed_words, tries, words, clues) }, { upsert: true });
    }
    catch (error) {
        console.log(error);
        return null;
    }
}