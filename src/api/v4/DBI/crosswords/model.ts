import { FindOneResult } from "monk";
import WordleDBI from "../DBI";
import { PossibleCrossword } from "./PossibleCrossword";

export async function getCrossword(crossword_id:number, dbi:WordleDBI):Promise<FindOneResult<PossibleCrossword>> {
    return dbi.possible_crosswords().findOne({crossword_id: crossword_id});
}

export async function getRandomCrossword(dbi:WordleDBI):Promise<PossibleCrossword> {
    return (await dbi.possible_crosswords().aggregate([{ $sample: { size: 1 } }]))[0];
}

export async function getFirstCrossword(dbi:WordleDBI):Promise<PossibleCrossword|null> {
    try {
        return (await dbi.possible_crosswords().find())[0];
    }
    catch(error) {
        console.log(error)
        return null;
    }
}