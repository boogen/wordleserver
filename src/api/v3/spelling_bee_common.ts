import WordleDBI, { Bee } from "../../DBI";

export function getMaxPoints(words:String[], letters:string[]):number {
    var sum = 0;
    for (var word of words) {
        sum += wordPoints(word, letters)
    }
    return sum
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
    ok, already_guessed, wrong_word, no_main_letter, invalid_letter_used
}

export class SpellingBeeStateReply {
    constructor(public message:SpellingBeeReplyEnum, public main_letter:string, public other_letters:string[], public guessed_words:string[], public player_points:number) {}
}

export class SuccessfullSpellingBeeStateReply {
    constructor(public message:SpellingBeeReplyEnum, public main_letter:string, public other_letters:string[], public guessed_words:string[], public player_points:number, public points:number) {}
}