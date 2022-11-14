import WordleDBI, { Bee } from "../../DBI";

const POINTS = [0, .02, .05, .08, .15, .25, .4, .5, .7];
export const RANKS = ["Żółtodziób", "Debiutant", "Początkujący", "Bystrzak", "Wschodząca gwiazda", "Erudyta", "Ekspert", "Mistrz", "Geniusz"]

export function getMaxPoints(words:String[], letters:string[]):number {
    var sum = 0;
    for (var word of words) {
        sum += wordPoints(word, letters)
    }
    return sum
}

export function pointsToRank(points:number, maxPoints:number):String {
    var percentage = points/maxPoints;
    for (var i = POINTS.length - 1; i >= 0; i--) {
        if (percentage >= POINTS[i]) {
            return RANKS[i];
        }
    }
    return RANKS[0];
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