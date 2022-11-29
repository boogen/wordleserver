import { FindOneResult } from "monk";
import WordleDBI from "../DBI";
import { PlayerCrosswordState } from "./PlayerCrosswordState";

export async function getCrosswordState(playerId:number, dbi:WordleDBI):Promise<PlayerCrosswordState|null> {
    try {
        const state = dbi.player_crossword_state().findOne({player_id: playerId});
        return state;
    }
    catch(error) {
        console.log(error);
        return null;
    }
}

export async function setCrosswordState(player_id:number, words:string[], guessed_words:string[], grid:String[][], crossword_id:number, tries:string[], dbi:WordleDBI):Promise<FindOneResult<PlayerCrosswordState>> {
    try {
        return dbi.player_crossword_state().findOneAndUpdate({player_id: player_id}, {$set:new PlayerCrosswordState(player_id, crossword_id, grid, guessed_words, tries, words)}, {upsert: true});
    }
    catch(error) {
        console.log(error);
        return null;
    }
}