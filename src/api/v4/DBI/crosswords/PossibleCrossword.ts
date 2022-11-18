import { ObjectId } from 'mongodb';
import { CrosswordWord } from './CrosswordWord';



export class PossibleCrossword {
    constructor(public crossword_id: number, public word_list: CrosswordWord[], public letter_grid: String[][], public id?: ObjectId) { }
}
