import { query } from "express";
import { Post, Query, Route } from "tsoa";
import { Stats } from "../../../WordleStatsDBI";
import { Clue, CrosswordWord, getCrossword, getFirstCrossword, getRandomCrossword, GridCoordinates } from "../DBI/crosswords_v3/model";
import { PlayerCrosswordState } from "../DBI/crosswords_v3/model";
import { PossibleCrosswordV3 } from "../DBI/crosswords_v3/model";
import WordleDBI from "../DBI/DBI";
import { checkLimit, resolvePlayerId } from "../DBI/player/player";
import { isWordValid } from "../DBI/wordle/model";
import { ClueState, getCrosswordV3State, setCrosswordV3State } from "../DBI/crosswords_v3/state";

interface CrosswordInitReply {
    message: string;
    state?: CrosswordState
}

interface CrosswordGuessReply {
    isWord: boolean;
    guessed_word: boolean;
    state: CrosswordState;
}

interface CrosswordState {
    letters: string[];
    grid: string[][];
    clues: ClueState[];
    height: number;
    width: number;
    completed: boolean;
}

const dbi = new WordleDBI();
const stats: Stats = new Stats();

@Route("api/v4/crossword_v3")
export class CrosswordController {
    @Post("init")
    public async init(@Query() auth_id: string): Promise<CrosswordInitReply> {
        const playerId = await resolvePlayerId(auth_id, dbi);
        var crosswordState = await getCrosswordV3State(playerId, dbi);
        var grid = []
        var word_list = []
        var clues = []
        var tries: string[] = []
        var crossword_id = -1
        var guessed_words: string[] = []

        if (crosswordState == null || this.isFinished(crosswordState)) {
            const crossword = await getRandomCrossword(dbi);
            console.log(crossword)
            grid = this.convertGrid(crossword.letter_grid)
            word_list = Object.values(crossword.word_list).map(w => w.word)
            clues = this.convertClues(crossword.clues, crossword.word_list);
            crossword_id = crossword.crossword_id
        }
        else {
            grid = crosswordState.grid
            word_list = crosswordState.words
            crossword_id = crosswordState.crossword_id
            if (crosswordState.tries) {
                tries = crosswordState.tries
            }
            guessed_words = crosswordState.guessed_words
            clues = crosswordState.clues;
        }

        const crossword = await getCrossword(crossword_id, dbi)
        const newState = await setCrosswordV3State(playerId, word_list, guessed_words, grid, crossword_id, tries, clues, dbi)
        const state = (await this.stateToReply(grid, word_list, clues, crossword!, this.isFinished(newState!)))
        await stats.addCrosswordV3InitEvent(playerId, crossword_id);
        return { message: 'ok', state: state };
    }


    @Post("guess")
    public async guess(@Query() auth_id: string, @Query() guess: string): Promise<CrosswordGuessReply> {
        const playerId = await resolvePlayerId(auth_id, dbi);
        const players_word = guess.toLowerCase();
        const isWord = await isWordValid(players_word, dbi);
        var crosswordState = await getCrosswordV3State(playerId, dbi);
        var grid = crosswordState!.grid;
        var guessed_words = new Set(crosswordState!.guessed_words)
        const crossword = await getCrossword(crosswordState!.crossword_id, dbi)
        if (!isWord) {
            await stats.addCrosswordV3GuessEvent(playerId, crosswordState!.guessed_words.length, crosswordState!.tries.length + crosswordState!.guessed_words.length, this.isFinished(crosswordState!), false)
            return { isWord: false, guessed_word: false, state: (await this.stateToReply(grid, crosswordState!.words, crosswordState!.clues, crossword!, this.isFinished(crosswordState!))) }
        }


        const original_grid = crossword!.letter_grid
        const guessed_word = crosswordState!.words.includes(players_word)
        const convertedOriginalGrid = this.convertGrid(original_grid)
        console.log(original_grid);
        const tries = new Set(crosswordState!.tries)
        var indexToFill = undefined
        for (var i = 0; i < convertedOriginalGrid.length; i++) {
            for (var j = 0; j < convertedOriginalGrid[i].length; j++) {
                convertedOriginalGrid[i][j] = grid[i][j]
            }
        }
        if (guessed_word) {
            guessed_words.add(players_word)
        }
        else {
            if (!tries.has(players_word)) {
                tries.add(players_word)
                const placesToFill = []
                for (var i = 0; i < grid.length; i++) {
                    for (var j = 0; j < grid[i].length; j++) {
                        if (grid[i][j] == "-") {
                            placesToFill.push({ x: i, y: j })
                        }
                    }
                }
                const index = Math.floor(Math.random() * placesToFill.length)
                indexToFill = placesToFill[index]
            }
        }
        const guessed_words_array = Array.from(guessed_words)
        for (var z = 0; z < guessed_words_array.length; z++) {
            const word: string = guessed_words_array[z];
            var coordinates = crossword!.word_list.find(e => e.word === word)?.coordinates;
            if (original_grid[coordinates!.row].slice(coordinates!.column, coordinates!.column + word.length).join("") == word) {
                for (var i = 0; i < word.length; i++) {
                    convertedOriginalGrid[coordinates!.row][coordinates!.column + i] = word[i]
                }
            }
            else {
                for (var i = 0; i < word.length; i++) {
                    convertedOriginalGrid[coordinates!.row + i][coordinates!.column] = word[i]
                }
            }
        }
        if (indexToFill) {
            convertedOriginalGrid[indexToFill.x][indexToFill.y] = original_grid[indexToFill.x][indexToFill.y]
        }
        console.log(convertedOriginalGrid);
        const newState = await setCrosswordV3State(playerId, crosswordState!.words, guessed_words_array, convertedOriginalGrid, crosswordState!.crossword_id, Array.from(tries), crosswordState!.clues, dbi)
        await stats.addCrosswordV3GuessEvent(playerId, guessed_words_array.length, tries.size + guessed_words_array.length, this.isFinished(newState!), true)
        return { isWord: true, guessed_word: guessed_word, state: (await this.stateToReply(convertedOriginalGrid, crosswordState!.words, crosswordState!.clues, crossword!, this.isFinished(newState!))) }
    }

    private async stateToReply(grid: string[][], word_list: string[], clues: ClueState[], crossword: PossibleCrosswordV3, finished: boolean): Promise<CrosswordState> {
        var letterList = new Set(word_list.join(""))
        return {
            letters: Array.from(letterList),
            grid: grid.concat.apply([], grid),
            clues: clues,
            height: crossword.letter_grid.length,
            width: crossword.letter_grid[0].length,
            completed: finished
        }
    }

    private isFinished(crosswordState: PlayerCrosswordState) {
        if (crosswordState == null) {
            return false;
        }
        var grid = crosswordState.grid;
        for (var i = 0; i < grid.length; i++) {
            for (var j = 0; j < grid[i].length; j++) {
                if (grid[i][j] == "-") {
                    return false;
                }
            }
        }
        return true;
    }

    private convertGrid(grid: string[][], isNew = true) {
        var flatten_grid = []
        for (var i = 0; i < grid.length; i++) {
            var result = []
            for (var j = 0; j < grid[i].length; j++) {
                if (grid[i][j] == null) {
                    result.push(" ")
                }
                else {
                    result.push(isNew ? "-" : grid[i][j]);
                }
            }
            flatten_grid.push(result)
        }
        return flatten_grid
    }

    private convertClues(clues: Clue[], words: CrosswordWord[]) {
        var wordMap = words.reduce((acc, w) => {
            acc[w.word] = w.coordinates;
            return acc;
        }, {} as Record<string, GridCoordinates>);

        return clues
            .filter(clue => wordMap[clue.word])
            .map(clue => ({
                coordinates: wordMap[clue.word],
                description: clue.description,
                length: clue.word.length
            }));
    }
}