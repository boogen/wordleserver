import WordleDBI, { Bee } from "../../DBI";
import { SeasonRules } from "./season_rules";

const POINTS = [0, .02, .05, .08, .15, .25, .4, .5, .7];
export const RANKS = ["Noob", "Rookie", "Beginner", "Smartiepants", "Rockstar", "Erudite", "Expert", "Master", "Genius"]
export const JOKER:string = "🃏"
export const ALPHABET:string[] = ["a","ą","b", "c", "ć", "d", "e", "ę", "f", "g", "h", "i", "j", "k", "l", "ł", "m", "n", "ń", "o", "ó", "p", "r", "s", "ś", "t", "u", "w", "y", "z", "ź", "ż"]

export function getMaxPoints(words:String[], letters:string[]):number {
    var sum = 0;
    for (var word of words) {
        sum += wordPoints(word, letters)
    }
    return sum
}

export function getMaxPointsSeason(words:String[], letters:string[], extraRules:SeasonRules):number {
    var sum = 0;
    for (var word of words) {
        sum += wordPointsSeason(word, letters, extraRules)
    }
    return sum
}

export function pointsToRank(points:number, maxPoints:number):number {
    var percentage = points/maxPoints;
    for (var i = POINTS.length - 1; i >= 0; i--) {
        if (percentage >= POINTS[i]) {
            return i;
        }
    }
    return 0;
}

export function wordPoints(word:String, letters:string[]):number {
    if (word.length == 4) {
        return 1
    }
    var points = word.length;
    for (var letter of letters) {
        if (!word.includes(letter)) {
            return points;
        }
    }
    return points + 7;
}

export function wordPointsSeason(word:String, letters:string[], extraRules:SeasonRules):number {
    var pointsForWord = wordPoints(word, letters);
    if (extraRules.fixedPoints.has(word.length)) {
        pointsForWord = extraRules.fixedPoints.get(word.length)!;
    }
    for (var letter of word) {
        if (extraRules.penalties.has(letter)) {
            pointsForWord -= extraRules.penalties.get(letter)!;
        }
    }
    return pointsForWord;
}

export async function checkSpellingBeeGuess(guess:string, current_guesses:string[], bee:Bee, dbi:WordleDBI):Promise<SpellingBeeReplyEnum> {
    var message = SpellingBeeReplyEnum.ok;
        if (current_guesses.includes(guess)) {
            message = SpellingBeeReplyEnum.already_guessed
        }
        if (!(await dbi.wordExists(guess, bee!.id))) {
            message = SpellingBeeReplyEnum.wrong_word
        }
        if (!guess.includes(bee!.main_letter)) {
            message = SpellingBeeReplyEnum.no_main_letter
        }
        for (var singleLetter of guess) {
            if (singleLetter != bee!.main_letter && !bee!.other_letters.includes(singleLetter)) {
                message = SpellingBeeReplyEnum.invalid_letter_used
                break
            }
        }
        return message;
}

export class SpellingBeeGuessReply {
    constructor(public state:SpellingBeeStateReply, public points:number) {}
}

export enum SpellingBeeReplyEnum {
    ok = "ok",
    already_guessed = "already_guessed",
    wrong_word="wrong_word",
    no_main_letter="no_main_letter",
    invalid_letter_used="invalid_letter_used"
}

export class SpellingBeeStateReply {
    constructor(public message:string, public main_letter:string, public other_letters:string[], public guessed_words:string[], public player_points:number) {}
}

export class SuccessfullSpellingBeeStateReply {
    constructor(public message:SpellingBeeReplyEnum, public main_letter:string, public other_letters:string[], public guessed_words:string[], public player_points:number, public points:number) {}
}