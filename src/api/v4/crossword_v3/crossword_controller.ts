import { query } from "express";
import { Post, Query, Route } from "tsoa";
import { Stats } from "../../../WordleStatsDBI";
import { Clue, CrosswordWord, getCrossword, getFirstCrossword, getRandomCrossword, GridCoordinates } from "../DBI/crosswords_v3/model";
import { PlayerCrosswordState } from "../DBI/crosswords_v3/model";
import { PossibleCrosswordV3 } from "../DBI/crosswords_v3/model";
import WordleDBI from "../DBI/DBI";
import { checkLimit, resolvePlayerId } from "../DBI/player/player";
import { isWordValid } from "../DBI/wordle/model";
import { ClueState, getCrosswordV3State, PlayerCrosswordV3State, setCrosswordV3State } from "../DBI/crosswords_v3/state";

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
        var state = await getCrosswordV3State(playerId, dbi);

        if (state == null) {
            const crossword = await getRandomCrossword(dbi);
            console.log(crossword)
            state = this.convertCrosswordToInternalState(playerId, crossword);
        }

        await setCrosswordV3State(state, dbi)
        await stats.addCrosswordV3InitEvent(playerId, state.crossword_id);
        console.log(this.convertInternalStateToReplyState(state));
        return { message: 'ok', state: this.convertInternalStateToReplyState(state) };
    }

    @Post("save")
    public async save(@Query() auth_id: string, @Query() row: number, column: number, letter: string) {
        console.log(`row: ${row}, column: ${column}, letter: ${letter}`)
        const playerId = await resolvePlayerId(auth_id, dbi);
        var state = await getCrosswordV3State(playerId, dbi);
        if (state == null) {
            throw "state is null"
        }
        if (row < 0 || row >= state.height) {
            throw "row out of bounds"
        }
        if (column < 0 || column >= state.width) {
            throw "column out of bounds"
        }
        if (state.grid[row][column] == null) {
            throw "letter not on crossword"
        }
        if (letter.length > 1) {
            throw "letter is not of length 1"
        }
        var letterList = new Set(state.words.join(""))
        if (!letterList.has(letter) && letter !== "") {
            throw `letter ${letter} not allowed`;
        }
        state.player_grid[row][column] = letter;
        await setCrosswordV3State(state, dbi)
        return { message: 'ok', state: this.convertInternalStateToReplyState(state)};
    }

    private convertCrosswordToInternalState(player_id: number, crossword: PossibleCrosswordV3): PlayerCrosswordV3State {
        return {
            player_id,
            crossword_id: crossword.crossword_id,
            grid: crossword.letter_grid,
            player_grid: this.convertGrid(crossword.letter_grid),
            words: Object.values(crossword.word_list).map(w => w.word),
            clues: this.convertClues(crossword.clues, crossword.word_list),
            width: crossword.letter_grid[0].length,
            height: crossword.letter_grid.length
        }
    }

    private convertInternalStateToReplyState(state: PlayerCrosswordV3State): CrosswordState {
        var letterList = new Set(state.words.join(""))
        return {
            letters: Array.from(letterList),
            grid: state.player_grid.concat.apply([], state.player_grid),
            clues: state.clues,
            height: state.height,
            width: state.width,
            completed: this.isFinished(state)
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