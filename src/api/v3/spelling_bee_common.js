"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuccessfullSpellingBeeStateReply = exports.SpellingBeeStateReply = exports.SpellingBeeReplyEnum = exports.SpellingBeeGuessReply = exports.checkSpellingBeeGuess = exports.wordPoints = exports.getMaxPoints = void 0;
function getMaxPoints(words, letters) {
    var sum = 0;
    for (var word of words) {
        sum += wordPoints(word, letters);
    }
    return sum;
}
exports.getMaxPoints = getMaxPoints;
function wordPoints(word, letters) {
    if (word.length == 4) {
        return 1;
    }
    var points = word.length;
    for (var letter of letters) {
        if (!word.includes(letter)) {
            return points;
        }
    }
    return points + 7;
}
exports.wordPoints = wordPoints;
function checkSpellingBeeGuess(guess, current_guesses, bee, dbi) {
    return __awaiter(this, void 0, void 0, function* () {
        var message = SpellingBeeReplyEnum.ok;
        if (current_guesses.includes(guess)) {
            message = SpellingBeeReplyEnum.already_guessed;
        }
        if (!(yield dbi.wordExists(guess, bee.id))) {
            message = SpellingBeeReplyEnum.wrong_word;
        }
        if (!guess.includes(bee.main_letter)) {
            message = SpellingBeeReplyEnum.no_main_letter;
        }
        for (var singleLetter of guess) {
            if (singleLetter != bee.main_letter && !bee.other_letters.includes(singleLetter)) {
                message = SpellingBeeReplyEnum.invalid_letter_used;
                break;
            }
        }
        return message;
    });
}
exports.checkSpellingBeeGuess = checkSpellingBeeGuess;
class SpellingBeeGuessReply {
    constructor(state, points) {
        this.state = state;
        this.points = points;
    }
}
exports.SpellingBeeGuessReply = SpellingBeeGuessReply;
var SpellingBeeReplyEnum;
(function (SpellingBeeReplyEnum) {
    SpellingBeeReplyEnum["ok"] = "ok";
    SpellingBeeReplyEnum["already_guessed"] = "already_guessed";
    SpellingBeeReplyEnum["wrong_word"] = "wrong_word";
    SpellingBeeReplyEnum["no_main_letter"] = "no_main_letter";
    SpellingBeeReplyEnum["invalid_letter_used"] = "invalid_letter_used";
})(SpellingBeeReplyEnum = exports.SpellingBeeReplyEnum || (exports.SpellingBeeReplyEnum = {}));
class SpellingBeeStateReply {
    constructor(message, main_letter, other_letters, guessed_words, player_points) {
        this.message = message;
        this.main_letter = main_letter;
        this.other_letters = other_letters;
        this.guessed_words = guessed_words;
        this.player_points = player_points;
    }
}
exports.SpellingBeeStateReply = SpellingBeeStateReply;
class SuccessfullSpellingBeeStateReply {
    constructor(message, main_letter, other_letters, guessed_words, player_points, points) {
        this.message = message;
        this.main_letter = main_letter;
        this.other_letters = other_letters;
        this.guessed_words = guessed_words;
        this.player_points = player_points;
        this.points = points;
    }
}
exports.SuccessfullSpellingBeeStateReply = SuccessfullSpellingBeeStateReply;
