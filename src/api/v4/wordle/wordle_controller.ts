import { Post, BodyProp, Route } from "tsoa";
import { Stats } from "../../../WordleStatsDBI";
import WordleDBI from "../DBI/DBI";
import { getProfile, resolvePlayerId } from "../DBI/player/player";
import { getWord, isWordValid } from "../DBI/wordle/model";
import { addGuess, getGlobalWord, getOrCreateGlobalWord, getPlayerTries, getPlayerTriesForWord } from "../DBI/wordle/wordle";
import { GuessValidation } from "./wordle_common";
import { inject, injectable } from "inversify";
import { Logger } from "../../../logger";

const WORD_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;

interface WordleStateReply {
    message:string;
    guesses?:GuessValidation[];
    finished?:boolean;
    timeToNext:number;
}

@injectable()
@Route("api/v4/wordle")
export class WordleController {
    constructor(
        @inject(WordleDBI) private dbi: WordleDBI,
        @inject(Stats) private stats: Stats,
        @inject(Logger) private logger: Logger
    ) {
        logger.setContext("WordleController");
    }

    @Post("getState")
    public async getState(@BodyProp() auth_id:string):Promise<WordleStateReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        var val = await getWord(this.dbi);
        var word = val[0].word;
        this.logger.info(`word ${word} player id ${player_id}`);

        const timestamp = Date.now() / 1000;
        var new_validity_timestamp = GLOBAL_TIME_START;
        while (new_validity_timestamp < timestamp) {
            new_validity_timestamp += WORD_VALIDITY;
        }
        const existing = await getOrCreateGlobalWord(timestamp, new_validity_timestamp, word, this.dbi);
        const tries = await getPlayerTries(player_id, existing!.word_id, timestamp, this.dbi);
        this.stats.addWordleInitEvent(player_id, existing!.word_id)
        const dbi = this.dbi;
        const logger = this.logger;
        return {
            message: 'ok',
            guesses: await Promise.all(tries!.guesses.map(async function(g) { return validateGuess(g, existing!.word, dbi, logger) })),
            timeToNext: Math.floor(existing!.validity - timestamp),
            finished: tries!.guesses.length == 6 || tries!.guesses.includes(existing!.word)
        };
    }

    @Post("validate")
    public async validateGuess(@BodyProp() auth_id:string, @BodyProp() word:string):Promise<GuessValidation> {
        const player_id = await resolvePlayerId(auth_id, this.dbi)
        const timestamp = Date.now() / 1000;
        const wordEntry = await getGlobalWord(timestamp, this.dbi);

        const answer = wordEntry!.word;
        
        const t = await getPlayerTriesForWord(player_id, wordEntry!.word_id, this.dbi);
        var tries = t!.guesses.length;
        if (t!.guesses.includes(word) || tries >=6) {
            this.stats.addWordleGuessEvent(player_id, tries, word == answer)
            return {isWord: false, word: word, answer: [], isGuessed: word == answer};
        }
        

        const guessResult = await validateGuess(word, answer, this.dbi, this.logger);

        if (guessResult.isWord) {
            addGuess(player_id, wordEntry!.word_id, word, this.dbi);
            tries += 1;
        }

        if (guessResult.isGuessed) {
            await this.dbi.increaseRank(player_id, wordEntry!.word_id, tries, timestamp - t!.start_timestamp)
        }

        this.logger.info("tries: " + tries);
        if (tries == 6) {
            guessResult.correctWord = answer;
        }
        this.stats.addWordleGuessEvent(player_id, tries, word == answer)
        return guessResult;
    }
}

async function validateGuess(word:string, answer:string, dbi:WordleDBI, logger:Logger):Promise<GuessValidation> {
    const guessed = (word == answer);
    const isWord = await isWordValid(word, dbi);
   
    logger.info("Guessed word: %s, actual word: %s", word, answer)

    var result:number[] = [];
    if (isWord) {
        var usedLetters:boolean[] = [];
        for (var i = 0; i < word.length; i++) {
            result.push(0);
            usedLetters.push(false);
        }

        for (var i = 0; i < word.length; i++) {
            if (word.charAt(i) == answer.charAt(i)) {
                result[i] = 2;
                usedLetters[i] = true;
            }
        }
        for (var i = 0; i < word.length; i++) {
            if (result[i] > 0) {
                continue;
            }
            for (var j = 0; j < answer.length; j++) {
                if (answer[j] === word[i] && !usedLetters[j]) {
                    result[i] = 1;
                    usedLetters[j] = true;
                    break;
                }
            }
        }
    }
    return {isWord: isWord, word: word, answer: result, isGuessed: guessed, correctWord:""};
}