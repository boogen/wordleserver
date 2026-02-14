import { ObjectId } from 'mongodb';
import { checkGuessForIncorrectLetters } from '../api/v4/spelling_bee/spelling_bee_common';

export class WordExplanation {
    constructor(public word: string, public explanation: string, public _id?: ObjectId) {
    }
}