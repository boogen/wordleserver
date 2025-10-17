import { FindOneResult } from "monk";
import WordleDBI from "../DBI";
import { ObjectId } from 'mongodb';


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

export class PlayerCrosswordState {
    constructor(public player_id: number, public crossword_id: number, public grid: string[][], public guessed_words: string[], public tries: string[], public words: string[], public id?: ObjectId) { }
}

export async function getCrossword(crossword_id: number, dbi: WordleDBI): Promise<FindOneResult<PossibleCrosswordV3>> {
    return dbi.possible_crosswords_v3().findOne({ crossword_id: crossword_id });
}

export async function getRandomCrossword(dbi: WordleDBI): Promise<PossibleCrosswordV3> {
    return (await dbi.possible_crosswords_v3().aggregate([{ $sample: { size: 1 } }]))[0];
}

export async function getFirstCrossword(dbi: WordleDBI): Promise<PossibleCrosswordV3 | null> {
    try {
        return (await dbi.possible_crosswords_v3().find())[0];
    }
    catch (error) {
        console.log(error)
        return null;
    }
}