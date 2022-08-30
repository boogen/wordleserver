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

export enum SpellingBeeReplyEnum {
    ok, already_guessed, wrong_word, no_main_letter, invalid_letter_used
}

export class SpellingBeeStateReply {
    constructor(public message:SpellingBeeReplyEnum, public main_letter:string, public other_letters:string[], public guessed_words:string[], public player_points:number) {}
}

export class SuccessfullSpellingBeeStateReply {
    constructor(public message:SpellingBeeReplyEnum, public main_letter:string, public other_letters:string[], public guessed_words:string[], public player_points:number, public points:number) {}
}