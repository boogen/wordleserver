import express from 'express';
import * as Sentry from "@sentry/node"
import WordleDBI from './DBI/DBI';
import AuthIdRequest from './types/AuthIdRequest';
import BaseGuessRequest from './types/BaseGuessRequest';
import { resolvePlayerId } from './DBI/player/player';
import { getWord, isWordValid } from './DBI/wordle/model';
import { addChallengeGuess, addNewPlayerWord, getPlayerChallengeTries, getPlayerLastWord } from './DBI/wordle/wordle';

const dbi = new WordleDBI();

export const challenge = express.Router();

challenge.post('/getState', async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        const player_id = await resolvePlayerId(value.auth_id, dbi);
        var val = await getWord(dbi);
        var word = val[0].word;
        console.log("word %s player id %s", word, player_id);

        var existing = await getPlayerLastWord(player_id, dbi);

        if (existing == null) {
            existing = await addNewPlayerWord(player_id, word, 0, dbi);
        }
        const tries = await getPlayerChallengeTries(player_id, existing.word_id, dbi);
        res.json({
            message: 'ok',
            guesses: await Promise.all(tries!.guesses.map(async function(g) { return validateGuess(g, existing!.word) })),
            finished: tries!.guesses.length == 6 || tries!.guesses.includes(existing.word)
        });
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }

});

challenge.post('/validate', async (req, res, next) => {
    try {
        const value = new BaseGuessRequest(req);
        const player_id = await resolvePlayerId(value.auth_id, dbi)
        console.log(value);
        const timestamp = Date.now() / 1000;
        const wordEntry = await getPlayerLastWord(player_id, dbi);

        const guess = value.guess;
        console.log("Player id: %s", player_id);
        const word = wordEntry!.word;
        
        const t = await getPlayerChallengeTries(player_id, wordEntry!.word_id, dbi);
        var tries = t!.guesses.length;
        if (t!.guesses.includes(guess) || tries >=6) {
            res.json({isWord: false, guess: guess, answer: [], isGuessed: guess == word});
            return;
        }
        

        const guessResult = await validateGuess(guess, word);

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
        res.json(guessResult);
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

async function validateGuess(guess:string, word:string) {
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
