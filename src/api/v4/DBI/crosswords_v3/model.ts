import { FindOneResult } from "monk";
import WordleDBI from "../DBI";
import { ObjectId } from 'mongodb';
import { log } from "console";


export class CrosswordWord {
    constructor(public word: string, public coordinates: GridCoordinates) { }
}

export class GridCoordinates {
    constructor(public column: number, public row: number, public direction: string) { }
}

export class Clue {
    constructor(public word: string, public description: string) { }
}

export class PossibleCrosswordV3 {
    constructor(public crossword_id: number, public word_list: CrosswordWord[], public letter_grid: string[][], public clues: Clue[], public id?: ObjectId) { }
}

export class GlobalCrossword {
    constructor(public crossword_id:number, validity:number, crossword_serial:number, public id?: ObjectId) { }
}

export class PlayerCrosswordState {
    constructor(public player_id: number, public crossword_id: number, public grid: string[][], public words: string[], public id?: ObjectId) { }
}

export async function getCrossword(crossword_id: number, dbi: WordleDBI): Promise<FindOneResult<PossibleCrosswordV3>> {
    return dbi.possibleCrosswordsV3().findOne({ crossword_id: crossword_id });
}

export async function getOrCreateRandomCrossword(dbi: WordleDBI, timestamp: number, new_validity: number): Promise<PossibleCrosswordV3> {
    var new_crossword_id:number = await dbi.getNextSequenceValue("global_crossword")
    var new_crossword = (await dbi.possibleCrosswordsV3().aggregate([{ $sample: { size: 1 } }]))[0]
    var crossword = (await dbi.crosswordV3().findOneAndUpdate(
        {validity:{$gt: timestamp}},
        {$setOnInsert: {crossword_id:new_crossword.crossword_id, validity: new_validity, crossword_serial: new_crossword_id}},
        {upsert: true}
    ))
    log('Selected crossword:', crossword!.crossword_id);
    return (await dbi.possibleCrosswordsV3().findOne({crossword_id:crossword!.crossword_id}))!;
}

export async function getFirstCrossword(dbi: WordleDBI): Promise<PossibleCrosswordV3 | null> {
    try {
        return (await dbi.possibleCrosswordsV3().find())[0];
    }
    catch (error) {
        console.log(error)
        return null;
    }
}