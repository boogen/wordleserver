import { FindOneResult } from "monk";
import WordleDBI from "../DBI";
import { ObjectId } from 'mongodb';
import { log } from "console";


export class CrosswordWord {
    constructor(public word: string, public coordinates: GridCoordinates) { }
}

export class GridCoordinates {
    constructor(public column: number, public row: number, public direction: string) { }



    public static fromJSON(data: any): GridCoordinates {
        return new GridCoordinates(data.column, data.row, data.direction);
    }

    public getNext():GridCoordinates {
        return this.translate(1);
    }

    public translate(amount:number):GridCoordinates {
        if (this.direction === 'H') {
            return new GridCoordinates(this.column + amount, this.row, this.direction);
        }
        return new GridCoordinates(this.column, this.row + amount, this.direction);
    }
}

export class Clue {
    constructor(public word: string, public description: string) { }
}

export class PossibleCrosswordV3 {
    constructor(public crossword_id: number, public word_list: CrosswordWord[], public letter_grid: string[][], public clues: Clue[], public id?: ObjectId) { }
}

export class GlobalCrossword {
    constructor(public crossword_id:number, validity:number, crossword_serial:number, public mode:string, public id?: ObjectId) { }
}

export class PlayerCrosswordState {
    constructor(public player_id: number, public crossword_id: number, public grid: string[][], public words: string[], public id?: ObjectId) { }
}

export async function getCrossword(crossword_id: number, dbi: WordleDBI, mode: string): Promise<FindOneResult<PossibleCrosswordV3>> {
    return dbi.possibleCrosswordsV3(mode).findOne({ crossword_id: crossword_id });
}

export async function getOrCreateSerialCrossword(dbi: WordleDBI, timestamp: number, new_validity: number, mode: string): Promise<PossibleCrosswordV3> {
    var crossword = await dbi.crosswordV3().findOne({validity:{$gt: timestamp}, mode: mode});
    if (!crossword) {
        var new_crossword_id:number = await dbi.getNextSequenceValue("global_crossword_" + mode)
        var total = await dbi.possibleCrosswordsV3(mode).count();
        var serial_index = new_crossword_id % total;
        var new_crossword = (await dbi.possibleCrosswordsV3(mode).aggregate([{ $skip: serial_index }, { $limit: 1 }]))[0]
        crossword = (await dbi.crosswordV3().findOneAndUpdate(
            {validity: new_validity, mode: mode},
            {$setOnInsert: {crossword_id:new_crossword.crossword_id, validity: new_validity, crossword_serial: new_crossword_id, mode: mode}},
            {upsert: true, returnOriginal: false}
        ))
        if (!crossword) {
            crossword = await dbi.crosswordV3().findOne({validity: new_validity, mode: mode});
        }
    }
    log('Selected crossword:', crossword!.crossword_id);
    return (await dbi.possibleCrosswordsV3(mode).findOne({crossword_id:crossword!.crossword_id}))!;
}

export async function getFirstCrossword(dbi: WordleDBI, mode: string): Promise<PossibleCrosswordV3 | null> {
    try {
        return (await dbi.possibleCrosswordsV3(mode).find())[0];
    }
    catch (error) {
        console.log(error)
        return null;
    }
}