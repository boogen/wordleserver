import { Post, Query, Route } from "tsoa";
import { Stats } from "../../../WordleStatsDBI";
import WordleDBI from "../DBI/DBI";
import { getProfile, resolvePlayerId } from "../DBI/player/player";
import { RankingEntry } from "../DBI/ranks/RankingEntry";
import { getWord, isWordValid } from "../DBI/wordle/model";
import { addGuess, getGlobalWord, getOrCreateGlobalWord, getPlayerTries, getPlayerTriesForWord } from "../DBI/wordle/wordle";
import { GuessValidation } from "./wordle_common";

const dbi = new WordleDBI();
const stats:Stats = new Stats();

const WORD_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;

interface WordleStateReply {
    message:string;
    guesses?:GuessValidation[];
    finished?:boolean;
    timeToNext:number;
}

@Route("api/v4/wordle")
export class WordleController {
    @Post("getState")
    public async getState(@Query() auth_id:string):Promise<WordleStateReply> {
        const player_id = await resolvePlayerId(auth_id, dbi);
        var val = await getWord(dbi);
        var word = val[0].word;
        console.log("word %s player id %s", word, player_id);

        const timestamp = Date.now() / 1000;
        var new_validity_timestamp = GLOBAL_TIME_START;
        while (new_validity_timestamp < timestamp) {
            new_validity_timestamp += WORD_VALIDITY;
        }
        const existing = await getOrCreateGlobalWord(timestamp, new_validity_timestamp, word, dbi);
        const tries = await getPlayerTries(player_id, existing!.word_id, timestamp, dbi);
        stats.addWordleInitEvent(player_id, existing!.word_id)
        return {
            message: 'ok',
            guesses: await Promise.all(tries!.guesses.map(async function(g) { return validateGuess(g, existing!.word) })),
            timeToNext: Math.floor(existing!.validity - timestamp),
            finished: tries!.guesses.length == 6 || tries!.guesses.includes(existing!.word)
        };
    }

    @Post("validate")
    public async validateGuess(@Query() auth_id:string, @Query() guess:string):Promise<GuessValidation> {
        const player_id = await resolvePlayerId(auth_id, dbi)
        const timestamp = Date.now() / 1000;
        const wordEntry = await getGlobalWord(timestamp, dbi);

        const word = wordEntry!.word;
        
        const t = await getPlayerTriesForWord(player_id, wordEntry!.word_id, dbi);
        var tries = t!.guesses.length;
        if (t!.guesses.includes(guess) || tries >=6) {
            stats.addWordleGuessEvent(player_id, tries, guess == word)
            return {isWord: false, guess: guess, answer: [], isGuessed: guess == word};
        }
        

        const guessResult = await validateGuess(guess, word);

        if (guessResult.isWord) {
            addGuess(player_id, wordEntry!.word_id, guess, dbi);
            tries += 1;
        }

        if (guessResult.isGuessed) {
            await dbi.increaseRank(player_id, wordEntry!.word_id, tries, timestamp - t!.start_timestamp)
        }

        console.log("tries: " + tries);
        if (tries == 6) {
            guessResult.correctWord = word;
        }
        stats.addWordleGuessEvent(player_id, tries, guess == word)
        return guessResult;
    }
}


async function validateGuess(guess:string, word:string):Promise<GuessValidation> {
    const guessed = (guess == word);
    const isWord = await isWordValid(guess, dbi);
   
    console.log("Guessed word: %s, actual word: %s", guess, word)

    var result:number[] = [];
    if (isWord) {
        var usedLetters:boolean[] = [];
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