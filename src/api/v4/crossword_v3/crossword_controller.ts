import { Post, BodyProp, Route } from "tsoa";
import { Stats } from "../../../WordleStatsDBI";
import { Clue, CrosswordWord, getOrCreateRandomCrossword, GridCoordinates } from "../DBI/crosswords_v3/model";
import { PossibleCrosswordV3 } from "../DBI/crosswords_v3/model";
import WordleDBI from "../DBI/DBI";
import { resolvePlayerId } from "../DBI/player/player";
import { ClueState, getCrosswordV3State, PlayerCrosswordV3State, setCrosswordV3State } from "../DBI/crosswords_v3/state";
import { inject, injectable } from "inversify";
import { Logger } from "../../../logger";

const WORD_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;

const POLISH_ALPHABET = new Set("aąbcćdeęfghijklłmnńoóprsśtuwyzźż".split(""));

interface CrosswordInitReply {
    message: string;
    state?: CrosswordState
}

interface CrosswordState {
    grid: string[];
    clues: ClueState[];
    height: number;
    width: number;
    completed: boolean;
}

@injectable()
@Route("api/v4/crossword_v3")
export class CrosswordController_v3 {
    constructor(
        @inject(WordleDBI) private dbi: WordleDBI,
        @inject(Stats) private stats: Stats,
        @inject(Logger) private logger: Logger
    ) {
        logger.setContext("CrosswordControllerV3");
    }
    @Post("init")
    public async init(@BodyProp() auth_id: string): Promise<CrosswordInitReply> {
        const playerId = await resolvePlayerId(auth_id, this.dbi);
        var state = await getCrosswordV3State(playerId, this.dbi);

        const timestamp = Date.now() / 1000;
        const new_validity_timestamp = this.getCurrentCrosswordValidity();

        this.logger.info("New validity timestamp start: " + new_validity_timestamp);

        const crossword = await getOrCreateRandomCrossword(this.dbi, timestamp, new_validity_timestamp);

        if (state != null && state.crossword_id != crossword.crossword_id) {
            // Different crossword - create new state
            state = null;
        }

        if (state == null) {
            this.logger.info("Crossword: " + JSON.stringify(crossword));
            state = this.convertCrosswordToInternalState(playerId, crossword);
        }

        await setCrosswordV3State(state, this.dbi)
        await this.stats.addCrosswordV3InitEvent(playerId, state.crossword_id);
        this.logger.info("Crossword state: " + JSON.stringify(this.convertInternalStateToReplyState(state)));
        return { message: 'ok', state: this.convertInternalStateToReplyState(state) };
    }

    private getCurrentCrosswordValidity(): number {
        const timestamp = Date.now() / 1000;
        var new_validity_timestamp = GLOBAL_TIME_START;
        while (new_validity_timestamp < timestamp) {
            new_validity_timestamp += WORD_VALIDITY;
        }
        return new_validity_timestamp;
    }

    @Post("save")
    public async save(@BodyProp() auth_id: string, @BodyProp() row: number, @BodyProp() column: number, @BodyProp() letter: string) {
        this.logger.info(`row: ${row}, column: ${column}, letter: ${letter}`)
        const playerId = await resolvePlayerId(auth_id, this.dbi);
        var state = await getCrosswordV3State(playerId, this.dbi);
        if (state == null) {
            throw new Error("state is null")
        }
        if (row < 0 || row >= state.height) {
            throw new Error("row out of bounds")
        }
        if (column < 0 || column >= state.width) {
            throw new Error("column out of bounds")
        }
        if (state.grid[row][column] == null) {
            throw new Error("letter not on crossword")
        }
        if (letter.length > 1) {
            throw new Error("letter is not of length 1")
        }
        var letterList = new Set(state.words.join("").normalize('NFC'))
        if (!letterList.has(letter) && letter !== "") {
            throw new Error(`letter ${letter} not allowed`);
        }
        const oldGuessedWords = new Set(this.getGuessedWords(state));
        state.player_grid[row][column] = letter;
        await setCrosswordV3State(state, this.dbi)
        const finished = this.isFinished(state);
        const currentGuessedWords = this.getGuessedWords(state);

        for (const word of currentGuessedWords) {
            if (!oldGuessedWords.has(word)) {
                await this.stats.addCrosswordV3GuessedWordEvent(state.crossword_id, this.getCurrentCrosswordValidity(), playerId, word);
            }
        }

        await this.stats.addCrosswordV3GuessEvent(playerId, currentGuessedWords.length, finished, true);
        return { message: 'ok', state: this.convertInternalStateToReplyState(state)};
    }

    private getGuessedWords(state: PlayerCrosswordV3State): string[] {
        let guessedWords: string[] = [];
        for (const clue of state.clues) {
            let wordGuessed = true;
            let word = "";
            for (let i = 0; i < clue.length; i++) {
                const r = clue.coordinates.direction === 'H' ? clue.coordinates.row : clue.coordinates.row + i;
                const c = clue.coordinates.direction === 'H' ? clue.coordinates.col + i : clue.coordinates.col;
                if (state.grid[r] == null || state.grid[r][c] == null) {
                    wordGuessed = false;
                    break;
                }
                word += state.grid[r][c];
                if (state.grid[r][c] !== state.player_grid[r][c]) {
                    wordGuessed = false;
                }
            }
            if (wordGuessed) guessedWords.push(word);
        }
        return guessedWords;
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
        return {
            grid: state.player_grid.flat(),
            clues: state.clues,
            height: state.height,
            width: state.width,
            completed: this.isFinished(state)
        }
    }

    private isFinished(crosswordState: PlayerCrosswordV3State) {
        if (crosswordState == null) {
            return false;
        }
        var grid = crosswordState.grid;
        for (var i = 0; i < grid.length; i++) {
            for (var j = 0; j < grid[i].length; j++) {
                if (grid[i][j] == null) {
                    continue;
                }
                if (grid[i][j] != crosswordState.player_grid[i][j]) {
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

    private convertClues(clues: Clue[], words: CrosswordWord[]): ClueState[] {
        var wordMap = words.reduce((acc, w) => {
            acc[w.word] = new GridCoordinates(w.col, w.row, w.direction);
            return acc;
        }, {} as Record<string, GridCoordinates>);

        return clues
            .filter(clue => wordMap[clue.word])
            .map(clue => new ClueState(
                clue.description,
                wordMap[clue.word],
                clue.word.length,
                this.getLettersFromWord(clue.word.normalize('NFC'))
            ));
    }

    private getLettersFromWord(word: string): string[] {
        var letters = new Set(Array.from(word));
        while (letters.size < 7) {
            letters.add(Array.from(POLISH_ALPHABET)[Math.floor(Math.random() * POLISH_ALPHABET.size)]);
        }
        return Array.from((letters));
    }
}