import { Path, Post, Query, Route } from "tsoa";
import WordleDBI from "../../DBI/DBI";
import { checkLimit, resolvePlayerId } from "../../DBI/player/player";
import { getWord, isWordValid } from "../../DBI/wordle/model";
import { addChallengeGuess, addNewPlayerWord, getPlayerChallengeTries, getPlayerLastWord } from "../../DBI/wordle/wordle";
import { GuessValidation } from "../wordle_common";


interface WordleChallengeStateReply {
    message:string;
    guesses?:GuessValidation[];
    finished?:boolean;
}

const dbi = new WordleDBI();

@Route("api/v4/classic")
export class WordleChallengeController {
    @Post("getState")
    public async getState(@Query() auth_id:string):Promise<WordleChallengeStateReply> {
        const player_id = await resolvePlayerId(auth_id, dbi);
        var limitMet = await checkLimit('wordle_challenge_limit', player_id, dbi)
        if(!limitMet) {
            return {message: 'limit_exceeded'}
        }
        var val = await getWord(dbi);
        var word = val[0].word;
        console.log("word %s player id %s", word, player_id);

        var existing = await getPlayerLastWord(player_id, dbi);

        if (existing == null) {
            existing = await addNewPlayerWord(player_id, word, 0, dbi);
        }
        const tries = await getPlayerChallengeTries(player_id, existing.word_id, dbi);
        return {
            message: 'ok',
            guesses: await Promise.all(tries!.guesses.map(async function(g) { return validateGuess(g, existing!.word, dbi) })),
            finished: tries!.guesses.length == 6 || tries!.guesses.includes(existing.word)
        }
    }

    @Post("validate")
    public async validate(@Query() auth_id:string, @Query() guess:string):Promise<GuessValidation> {
        const player_id = await resolvePlayerId(auth_id, dbi)
        const timestamp = Date.now() / 1000;
        const wordEntry = await getPlayerLastWord(player_id, dbi);

        console.log("Player id: %s", player_id);
        const word = wordEntry!.word;
        
        const t = await getPlayerChallengeTries(player_id, wordEntry!.word_id, dbi);
        var tries = t!.guesses.length;
        if (t!.guesses.includes(guess) || tries >=6) {
            return {isWord: false, guess: guess, answer: [], isGuessed: guess == word};
        }
        

        const guessResult = await validateGuess(guess, word, dbi);

        if (guessResult.isWord) {
            addChallengeGuess(player_id, wordEntry!.word_id, guess, dbi);
            tries += 1;
        }

        console.log("tries: " + tries);
        if (tries == 6) {
            guessResult.correctWord = word;
        }
        if (tries == 6 || guessResult.isGuessed) {
            var val = await getWord(dbi);
            var new_word = val[0].word;
            await addNewPlayerWord(player_id, new_word, 0, dbi);
        }
        console.log(guessResult);
        return guessResult;
    }
}




async function validateGuess(guess:string, word:string, dbi:WordleDBI):Promise<GuessValidation> {
    const guessed = (guess == word);
    const isWord = await isWordValid(guess, dbi);
   
    console.log("Guessed word: %s, actual word: %s", guess, word)

    var result = [];
    if (isWord) {
        var usedLetters = [];
        for (var i = 0; i < guess.length; i++) {
            result.push(0);
            usedLetters.push(false);
        }

        for (var i = 0; i < guess.length; i++) {
            if (guess.charAt(i) == word.charAt(i)) {
                result[i] = 2;
                usedLetters[i] = true;
            }
        }
        for (var i = 0; i < guess.length; i++) {
            if (result[i] > 0) {
                continue;
            }
            for (var j = 0; j < word.length; j++) {
                if (word[j] === guess[i] && !usedLetters[j]) {
                    result[i] = 1;
                    usedLetters[j] = true;
                    break;
                }
            }
        }
    }
    return {isWord: isWord, guess: guess, answer: result, isGuessed: guessed, correctWord:""};
}