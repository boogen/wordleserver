import { Path, Post, BodyProp, Route } from "tsoa";
import WordleDBI from "../../DBI/DBI";
import { checkLimit, resolvePlayerId } from "../../DBI/player/player";
import { getWord, isWordValid } from "../../DBI/wordle/model";
import { addChallengeGuess, addNewPlayerWord, getPlayerChallengeTries, getPlayerLastWord } from "../../DBI/wordle/wordle";
import { GuessValidation } from "../wordle_common";
import { inject, injectable } from "inversify";
import { Logger } from "../../../../logger";



interface WordleChallengeStateReply {
    message:string;
    guesses?:GuessValidation[];
    finished?:boolean;
}


@injectable()
@Route("api/v4/classic")
export class WordleChallengeController {
    constructor(
        @inject(WordleDBI) private dbi: WordleDBI,
        @inject(Logger) private logger: Logger
    ) {
        logger.setContext("WordleChallengeController");
    }
    @Post("getState")
    public async getState(@BodyProp() auth_id:string):Promise<WordleChallengeStateReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        var limitMet = await checkLimit('wordle_challenge_limit', player_id, this.dbi)
        if(!limitMet) {
            return {message: 'limit_exceeded'}
        }
        var val = await getWord(this.dbi);
        var word = val[0].word;
        this.logger.info("word %s player id %s", word, player_id);

        var existing = await getPlayerLastWord(player_id, this.dbi);

        if (existing == null) {
            existing = await addNewPlayerWord(player_id, word, 0, this.dbi);
        }
        const tries = await getPlayerChallengeTries(player_id, existing.word_id, this.dbi);
        const dbi = this.dbi;
        const logger = this.logger;
        return {
            message: 'ok',
            guesses: await Promise.all(tries!.guesses.map(async function(g) { return validateGuess(g, existing!.word, dbi, logger) })),
            finished: tries!.guesses.length == 6 || tries!.guesses.includes(existing.word)
        }
    }

    @Post("validate")
    public async validate(@BodyProp() auth_id:string, @BodyProp() guess:string):Promise<GuessValidation> {
        const player_id = await resolvePlayerId(auth_id, this.dbi)
        const timestamp = Date.now() / 1000;
        const wordEntry = await getPlayerLastWord(player_id, this.dbi);

        this.logger.info("Player id: %s", player_id);
        const word = wordEntry!.word;
        
        const t = await getPlayerChallengeTries(player_id, wordEntry!.word_id, this.dbi);
        var tries = t!.guesses.length;
        if (t!.guesses.includes(guess) || tries >=6) {
            return {isWord: false, guess: guess, answer: [], isGuessed: guess == word};
        }
        

        const guessResult = await validateGuess(guess, word, this.dbi, this.logger);

        if (guessResult.isWord) {
            addChallengeGuess(player_id, wordEntry!.word_id, guess, this.dbi);
            tries += 1;
        }

        this.logger.info("tries: %s", tries);
        if (tries == 6) {
            guessResult.correctWord = word;
        }
        if (tries == 6 || guessResult.isGuessed) {
            var val = await getWord(this.dbi);
            var new_word = val[0].word;
            await addNewPlayerWord(player_id, new_word, 0, this.dbi);
        }
        this.logger.info("guess result: %s", JSON.stringify(guessResult));
        return guessResult;
    }
}




async function validateGuess(guess:string, word:string, dbi:WordleDBI, logger:Logger):Promise<GuessValidation> {
    const guessed = (guess == word);
    const isWord = await isWordValid(guess, dbi);
   
    logger.info("Guessed word: %s, actual word: %s", guess, word)

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