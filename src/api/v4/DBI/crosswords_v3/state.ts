import { FindOneResult } from "monk";
import WordleDBI from "../DBI";
import { ObjectId } from 'mongodb';
import { GridCoordinates } from "./model";

export class ClueState {
    constructor(public description: string, public coordinates: GridCoordinates, public length: number, public letters: string[]) { }

    static fromJSON(data: any): ClueState {
        return new ClueState(
            data.description,
            GridCoordinates.fromJSON(data.coordinates),
            data.length,
            data.letters
        );
    }

    public contains(row:number, column:number): boolean {
        const start = this.coordinates;
        const end = this.coordinates.translate(this.length - 1);

        return (
            row >= Math.min(start.row, end.row) && row <= Math.max(start.row, end.row) &&
            column >= Math.min(start.column, end.column) && column <= Math.max(start.column, end.column)
        );
    }
}

export class PlayerCrosswordV3State {
    constructor(public player_id: number, public crossword_id: number, public grid: string[][], public player_grid: string[][], public words: string[], public clues: ClueState[], public width: number, public height: number, public mode: string, public revision: number = 0, public id?: ObjectId) { }

    static fromJSON(data: any): PlayerCrosswordV3State {
        return new PlayerCrosswordV3State(
            data.player_id,
            data.crossword_id,
            data.grid,
            data.player_grid,
            data.words,
            data.clues.map((c: any) => ClueState.fromJSON(c)),
            data.width,
            data.height,
            data.mode,
            data.revision ?? 0,
            data.id || data._id
        );
    }

    public getWordFromPlayerGrid(coordinates:GridCoordinates, length:number):string|null {
        var coords = coordinates;
        var word = ""
        for (var i = 0; i < length; i++) {
            const letter = this.getPlayerGridLetter(coords.row, coords.column)
            if (letter === null) {
                return null;
            }
            word += letter;
            coords = coords.getNext()
        }
        return word;
    }

    public finished(): boolean {
        // Cells outside the crossword are null in the solution grid but " " in the player grid,
        // so the two grids can never be compared wholesale - skip the blanks.
        for (var row = 0; row < this.grid.length; row++) {
            for (var column = 0; column < this.grid[row].length; column++) {
                if (this.grid[row][column] == null) {
                    continue;
                }
                if (this.grid[row][column] !== this.player_grid[row][column]) {
                    return false;
                }
            }
        }
        return true;
    }

    private getPlayerGridLetter(row:number, column:number):string|null {
        if (row < 0 || row >= this.player_grid.length || column < 0 || column >= (this.player_grid[row]?.length ?? 0)) {
            return null;
        }
        var letter = this.player_grid[row][column]
        if (letter === "-") {
            return null;
        }
        return letter;
    }
}

export async function getCrosswordV3State(playerId: number, mode: string, dbi: WordleDBI): Promise<PlayerCrosswordV3State | null> {
    try {
        const state = await dbi.playerCrosswordV3State().findOne({ player_id: playerId, mode: mode });
        if (!state) {
            return null;
        }
        return PlayerCrosswordV3State.fromJSON(state);
    }
    catch (error) {
        console.log(error);
        return null;
    }
}

export async function setCrosswordV3State(state: PlayerCrosswordV3State, dbi: WordleDBI): Promise<FindOneResult<PlayerCrosswordV3State>> {
    try {
        return dbi.playerCrosswordV3State().findOneAndUpdate({ player_id: state.player_id, mode: state.mode }, { $set: state }, { upsert: true });
    }
    catch (error) {
        console.log(error);
        return null;
    }
}

// Writes the whole player grid in one shot, but only if `revision` is newer than the one
// already stored. Saves arrive over independent HTTP requests and can overtake each other,
// so without this guard an older grid could land last and wipe out newer letters.
// Returns false when the write was stale and therefore skipped.
export async function saveCrosswordV3Grid(player_id: number, mode: string, player_grid: string[][], revision: number, dbi: WordleDBI): Promise<boolean> {
    const updated = await dbi.playerCrosswordV3State().findOneAndUpdate(
        {
            player_id: player_id,
            mode: mode,
            $or: [{ revision: { $exists: false } }, { revision: { $lt: revision } }]
        },
        { $set: { player_grid: player_grid, revision: revision } },
        { returnOriginal: false }
    );
    return updated != null;
}
