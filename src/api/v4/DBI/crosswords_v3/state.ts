import { FindOneResult } from "monk";
import WordleDBI from "../DBI";
import { ObjectId } from 'mongodb';
import { GridCoordinates } from "./model";

export class ClueState {
    constructor(public description: string, public coordinates: GridCoordinates, public length: number, public letters: string[]) { }
}

export class PlayerCrosswordV3State {
    constructor(public player_id: number, public crossword_id: number, public grid: string[][], public player_grid: string[][], public words: string[], public clues: ClueState[], public width: number, public height: number, public id?: ObjectId) { }
}

export async function getCrosswordV3State(playerId: number, dbi: WordleDBI): Promise<PlayerCrosswordV3State | null> {
    try {
        const state = dbi.playerCrosswordV3State().findOne({ player_id: playerId });
        return state;
    }
    catch (error) {
        console.log(error);
        return null;
    }
}

export async function setCrosswordV3State(state: PlayerCrosswordV3State, dbi: WordleDBI): Promise<FindOneResult<PlayerCrosswordV3State>> {
    try {
        return dbi.playerCrosswordV3State().findOneAndUpdate({ player_id: state.player_id }, { $set: state }, { upsert: true });
    }
    catch (error) {
        console.log(error);
        return null;
    }
}