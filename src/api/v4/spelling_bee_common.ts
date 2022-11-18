import { func } from "@hapi/joi";
import WordleDBI, { OldBee, LetterState } from "../../DBI";
import { SeasonRules } from "./season_rules";

const POINTS = [0, .02, .05, .08, .15, .25, .4, .5, .7];
export const RANKS = ["Noob", "Rookie", "Beginner", "Smartiepants", "Rockstar", "Erudite", "Expert", "Master", "Genius"]
//export const JOKER:string = "🃏"
export const JOKER:string = "*"
export const ALPHABET:string[] = ["a","ą","b", "c", "ć", "d", "e", "ę", "f", "g", "h", "i", "j", "k", "l", "ł", "m", "n", "ń", "o", "ó", "p", "r", "s", "ś", "t", "u", "w", "y", "z", "ź", "ż"]

export class SpellingBeeChanges {
    constructor(public message:SpellingBeeReplyEnum, public guessesAdded:string[], public pointsAdded:number[], public newLetterState:LetterState[]) {}
}

export function getMaxPoints(words:String[], letters:string[]):number {
    var sum = 0;
    for (var word of words) {
        sum += wordPoints(word, letters).points
    }
    return sum
}

var extraLetters:LetterState[] = []

export function initExtraLetters(mainLetter:string, other_letters:string[], season_rules:SeasonRules) {
    extraLetters = []
    var plainLetters = [mainLetter];
    plainLetters = plainLetters.concat(other_letters);
    var possibleLetters = ALPHABET.filter(letter => !plainLetters.includes(letter));
    for (var i = 0; i < season_rules.noOfLetters; i++) {
        var boughtLetterIndex:number = Math.floor(Math.random() * possibleLetters.length)
        var boughtLetter:string = possibleLetters[boughtLetterIndex]
        extraLetters.push(new LetterState(boughtLetter, -1, 0, false))
        }
    
        var boughtLetterIndex:number = Math.floor(Math.random() * possibleLetters.length)
        var boughtLetter:string = possibleLetters[boughtLetterIndex]
        extraLetters.push(new LetterState(boughtLetter, -1, 0, true))
}

export function getNewLetterState(mainLetter:string, letters:string[], rules:SeasonRules):LetterState[] {
    var returnValue:LetterState[] = []
    returnValue.push(new LetterState(mainLetter, rules.getUsageLimit(mainLetter), rules.getPointsForLetter(mainLetter), true));
    letters.forEach(letter => returnValue.push(new LetterState(letter, rules.getUsageLimit(letter), rules.getPointsForLetter(letter), false)));
    
    return returnValue.concat(extraLetters);
}

export function getMaxPointsSeason(words:string[], letters:string[], extraRules:SeasonRules):number {
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

export async function processPlayerGuess(playerGuess:string, guesses:string[], beeModel:OldBee, letterState:LetterState[], seasonRules:SeasonRules, dbi:WordleDBI):Promise<SpellingBeeChanges> {
    var letterCorrectnessMessage = checkGuessForIncorrectLetters(playerGuess, beeModel, letterState);
    if (letterCorrectnessMessage != SpellingBeeReplyEnum.ok) {
        return new SpellingBeeChanges(letterCorrectnessMessage, [], [], []);
    }

    var guessesToCheck:string[] = []
    if (playerGuess.includes(JOKER)) {
        guessesToCheck = ALPHABET.map(letter => {
            var readyWord = playerGuess;
            var jokersUsed:number[] = [];
            while(readyWord.includes(JOKER)) {
                jokersUsed.push(readyWord.indexOf(JOKER));
                readyWord = readyWord.replace(JOKER, letter)
            }
            return readyWord;
            }
        )
    }
    else {
        guessesToCheck = [playerGuess]
    }
    var points = [];
    var message:SpellingBeeReplyEnum = SpellingBeeReplyEnum.wrong_word;
    var guessesAdded:string[] = [];
    for (var guess of guessesToCheck) {
        var new_message = await checkSpellingBeeGuess(guess, guesses, beeModel, letterState.map(ls => ls.letter), dbi)
        if (message != SpellingBeeReplyEnum.ok) {
            message = new_message;
        }
        if (new_message === SpellingBeeReplyEnum.ok) {
            points.push(wordPointsSeason(playerGuess, letterState.map(ls => ls.letter), seasonRules))
            guessesAdded.push(guess)
        }
    }
    var newLetterState = letterState.map(ls => new LetterState(ls.letter, ls.usageLimit, ls.pointsForLetter, ls.required))
    for (var letter of playerGuess) {
        newLetterState.filter(letterState => letterState.letter === letter).forEach(letterState => letterState.usageLimit -= 1);
    }
    return new SpellingBeeChanges(message, guessesAdded, points, newLetterState);
}

class WordPoints {
    constructor(public points:number, public isPanagram:boolean) {}
}

export function wordPoints(word:String, letters:string[]):WordPoints {
    if (word.length == 4) {
        return new WordPoints(1, false)
    }
    var points = word.length;
    for (var letter of letters) {
        if (letter === JOKER) {
            continue
        }
        if (!word.includes(letter)) {
            return new WordPoints(points, false);
        }
    }
    return new WordPoints(points + 7, true);
}

export function wordPointsSeason(word:string, letters:string[], extraRules:SeasonRules):number {
    var points = wordPoints(word, letters);
    if (!points.isPanagram && extraRules.panagramsOnly) {
        return 0;
    }
    var pointsForWord = points.points;
    if (extraRules.fixedPoints.has(word.length)) {
        pointsForWord = extraRules.fixedPoints.get(word.length)!;
    }
    for (var letter of word) {
        if (letters.includes(letter)) {
            pointsForWord += extraRules.getPointsForLetter(letter)
        }
    }
    return pointsForWord;
}

export async function checkSpellingBeeGuess(guess:string, current_guesses:string[], bee:OldBee, other_letters:string[], dbi:WordleDBI):Promise<SpellingBeeReplyEnum> {
    var message = SpellingBeeReplyEnum.ok;
    
    if (current_guesses.includes(guess)) {
        message = SpellingBeeReplyEnum.already_guessed
    }
    if (!(await dbi.wordExists(guess, bee!.id))) {
        message = SpellingBeeReplyEnum.wrong_word
    }
    return message;
}

export function checkGuessForIncorrectLetters(guess:string, bee:OldBee, letters:LetterState[]):SpellingBeeReplyEnum {
    var message = SpellingBeeReplyEnum.ok;
    var letterOccurences:Map<string, number> = new Map();
    for (var singleLetter of guess) {
        var i = 0;
        if (letterOccurences.has(singleLetter)) {
            i = letterOccurences.get(singleLetter)!;
        }
        letterOccurences.set(singleLetter, i + 1)
    }
    for (var requiredLetter of letters.filter(LetterState => LetterState.required))
    if (!guess.includes(requiredLetter.letter)) {
        message = SpellingBeeReplyEnum.no_main_letter
    }
    for (var singleLetter of guess) {
        if (letters
            .filter(letterState => singleLetter === letterState.letter &&
                 (letterState.usageLimit >= letterOccurences.get(singleLetter)! || letterState.usageLimit < 0))
                 .length == 0) {
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
    constructor(public message:string, public letters:LetterState[], public guessed_words:string[], public player_points:number) {}
}

export class SuccessfullSpellingBeeStateReply {
    constructor(public message:SpellingBeeReplyEnum, public letters:LetterState[], public guessed_words:string[], public player_points:number, public points:number) {}
}