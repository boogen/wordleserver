import { Post, BodyProp, Route } from "tsoa";
import { Stats } from "../../../WordleStatsDBI";
import { Clue, CrosswordWord, getOrCreateSerialCrossword, GridCoordinates, getCrosswordSerial, getCurrentCrosswordSerial, CrosswordCompletion, CrosswordLeaderboardEntry } from "../DBI/crosswords_v3/model";
import { PossibleCrosswordV3 } from "../DBI/crosswords_v3/model";
import WordleDBI from "../DBI/DBI";
import { resolvePlayerId } from "../DBI/player/player";
import { ClueState, getCrosswordV3State, PlayerCrosswordV3State, saveCrosswordV3Grid, setCrosswordV3State } from "../DBI/crosswords_v3/state";
import { inject, injectable } from "inversify";
import { Logger } from "../../../logger";
import { boolean } from "@hapi/joi";
import { friendList } from "../DBI/friends/friends";
import { get_nick } from "../player/player_common";

const WORD_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;


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
    revision: number;
}

interface CompleteGuess {
    word:string;
    guessed:boolean;
}

interface CompletionEntry {
    player_id: number;
    nick: string;
    finished_at: number;
}

interface CompletionsReply {
    message: string;
    completions: CompletionEntry[];
}

interface LeaderboardEntry {
    player_id: number;
    nick: string;
    count: number;
}

interface LeaderboardReply {
    message: string;
    leaderboard: LeaderboardEntry[];
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
    public async init(@BodyProp() auth_id: string, @BodyProp() mode: string = "adult"): Promise<CrosswordInitReply> {
        const playerId = await resolvePlayerId(auth_id, this.dbi);
        var state = await getCrosswordV3State(playerId, mode, this.dbi);

        const timestamp = Date.now() / 1000;
        const new_validity_timestamp = this.getCrosswordValidity()
        this.logger.info("New validity timestamp start: " + new_validity_timestamp);

        const crossword = await getOrCreateSerialCrossword(this.dbi, timestamp, new_validity_timestamp, mode);

        if (state != null && state.crossword_id != crossword.crossword_id) {
            // Different crossword - create new state
            state = null;
        }

        if (state == null) {
            this.logger.info("Crossword: " + JSON.stringify(crossword));
            state = this.convertCrosswordToInternalState(playerId, crossword, mode);
            this.stats.addCrosswordV3InitEvent(playerId, state.crossword_id);
        }

        await setCrosswordV3State(state, this.dbi)
        this.logger.info("Crossword state: " + JSON.stringify(this.convertInternalStateToReplyState(state)));
        return { message: 'ok', state: this.convertInternalStateToReplyState(state) };
    }

    private getCrosswordValidity():number {
        const timestamp = Date.now() / 1000;
        var new_validity_timestamp = GLOBAL_TIME_START;
        while (new_validity_timestamp < timestamp) {
            new_validity_timestamp += WORD_VALIDITY;
        }
        return new_validity_timestamp;
    }

    @Post("save")
    public async save(@BodyProp() auth_id: string, @BodyProp() mode: string = "adult", @BodyProp() row: number, @BodyProp() column: number, @BodyProp() letter: string) {
        this.logger.info(`row: ${row}, column: ${column}, letter: ${letter}`)
        const playerId = await resolvePlayerId(auth_id, this.dbi);
        var state = await getCrosswordV3State(playerId, mode, this.dbi);
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
        state.player_grid[row][column] = letter;
        var word =  this.getGuessedWord(row, column, state);
        if (word !== null) {
            this.stats.addCrosswordV3GuessEvent(playerId, state.crossword_id, this.getCrosswordValidity(), word.guessed, word.word, state.finished())
        }
        state.revision += 1;
        await setCrosswordV3State(state, this.dbi)
        if (state.finished()) {
            const serial = await getCrosswordSerial(state.crossword_id, mode, this.dbi);
            if (serial !== null) {
                await this.dbi.saveCrosswordV3Completion(state.crossword_id, serial, playerId);
            }
        }
        return { message: 'ok', state: this.convertInternalStateToReplyState(state)};
    }

    // Saves the whole grid in a single request instead of one round trip per letter, so the
    // client can keep accepting input while a save is in flight. See save() for the legacy
    // per-letter endpoint, still used by builds already in the stores.
    @Post("save_state")
    public async saveState(@BodyProp() auth_id: string, @BodyProp() grid: string, @BodyProp() revision: number, @BodyProp() mode: string = "adult") {
        const playerId = await resolvePlayerId(auth_id, this.dbi);
        const state = await getCrosswordV3State(playerId, mode, this.dbi);
        if (state == null) {
            throw new Error("state is null")
        }
        if (!Number.isInteger(revision) || revision < 0) {
            throw new Error("revision is not a non-negative integer")
        }

        const player_grid = this.parseGridBlob(state, grid);
        const saved = new PlayerCrosswordV3State(state.player_id, state.crossword_id, state.grid, player_grid,
            state.words, state.clues, state.width, state.height, state.mode, revision, state.id);

        if (!await saveCrosswordV3Grid(playerId, mode, player_grid, revision, this.dbi)) {
            this.logger.info(`Stale crossword save for player ${playerId} at revision ${revision}, ignoring`);
            const current = await getCrosswordV3State(playerId, mode, this.dbi);
            return { message: 'ok', applied: false, state: this.convertInternalStateToReplyState(current ?? state) };
        }

        if (saved.finished()) {
            const serial = await getCrosswordSerial(state.crossword_id, mode, this.dbi);
            if (serial !== null) {
                await this.dbi.saveCrosswordV3Completion(state.crossword_id, serial, playerId);
            }
        }

        this.reportGuessedWords(playerId, state, saved);
        return { message: 'ok', applied: true, state: this.convertInternalStateToReplyState(saved) };
    }

    // The blob is one character per cell, row-major: " " off-grid, "-" empty, otherwise the letter.
    // Every cell is validated exactly as save() validates a single one, so this endpoint is no
    // more permissive than the per-letter one.
    private parseGridBlob(state: PlayerCrosswordV3State, blob: string): string[][] {
        const cells = Array.from((blob ?? "").normalize('NFC'));
        if (cells.length !== state.width * state.height) {
            throw new Error(`grid size mismatch, expected ${state.width * state.height} cells, got ${cells.length}`)
        }
        const letterList = new Set(state.words.join("").normalize('NFC'));
        const player_grid: string[][] = [];
        for (var row = 0; row < state.height; row++) {
            const parsed_row: string[] = [];
            for (var column = 0; column < state.width; column++) {
                const letter = cells[row * state.width + column];
                if (state.grid[row][column] == null) {
                    if (letter !== " ") {
                        throw new Error("letter not on crossword")
                    }
                    parsed_row.push(" ");
                }
                else if (letter === "-" || letter === " ") {
                    parsed_row.push("-");
                }
                else if (!letterList.has(letter)) {
                    throw new Error(`letter ${letter} not allowed`);
                }
                else {
                    parsed_row.push(letter);
                }
            }
            player_grid.push(parsed_row);
        }
        return player_grid;
    }

    // A blob can complete several words at once, so emit one guess event per word that changed
    // into a complete one - that is what save() reports a letter at a time.
    private reportGuessedWords(playerId: number, before: PlayerCrosswordV3State, after: PlayerCrosswordV3State) {
        const validity = this.getCrosswordValidity();
        const finished = after.finished();
        for (const index in after.clues) {
            const clue = after.clues[index];
            const word = after.getWordFromPlayerGrid(clue.coordinates, clue.length);
            if (word === null || word === before.getWordFromPlayerGrid(clue.coordinates, clue.length)) {
                continue;
            }
            this.stats.addCrosswordV3GuessEvent(playerId, after.crossword_id, validity, word === after.words[index], word, finished);
        }
    }

    private getGuessedWord(row:number, column:number, state: PlayerCrosswordV3State):CompleteGuess | null {
        for (const index in state.clues) {
            const clueState = state.clues[index]
            if (!clueState.contains(row, column)) {
                continue;
            }
            const word = state.getWordFromPlayerGrid(clueState.coordinates, clueState.length)
            if (word === null) {
                return null;
            }
            return {word: word, guessed: word === state.words[index]};
        }
        return null;
    }

    private convertCrosswordToInternalState(player_id: number, crossword: PossibleCrosswordV3, mode: string): PlayerCrosswordV3State {
        return new PlayerCrosswordV3State(
            player_id,
            crossword.crossword_id,
            crossword.letter_grid,
            this.convertGrid(crossword.letter_grid),
            Object.values(crossword.word_list).map(w => w.word),
            this.convertClues(crossword.clues, crossword.word_list),
            crossword.letter_grid[0].length,
            crossword.letter_grid.length,
            mode
        );
    }

    private convertInternalStateToReplyState(state: PlayerCrosswordV3State): CrosswordState {
        return {
            grid: state.player_grid.flat(),
            clues: state.clues,
            height: state.height,
            width: state.width,
            completed: this.isFinished(state),
            revision: state.revision
        }
    }

    private isFinished(crosswordState: PlayerCrosswordV3State) {
        return crosswordState != null && crosswordState.finished();
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
            acc[w.word] = w.coordinates;
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
        return Array.from(new Set(Array.from(word)));
    }

    @Post("completions")
    public async completions(@BodyProp() mode: string = "adult"): Promise<CompletionsReply> {
        const timestamp = Date.now() / 1000;
        const serial = await getCurrentCrosswordSerial(timestamp, mode, this.dbi);
        if (serial === null) {
            return { message: 'ok', completions: [] };
        }
        const raw = await this.dbi.getCrosswordV3Completions(serial);
        const completions = await Promise.all(raw.map(async c => ({
            player_id: c.player_id,
            nick: (await get_nick(c.player_id, this.dbi)).nick,
            finished_at: c.finished_at
        })));
        return { message: 'ok', completions };
    }

    @Post("completions/friends")
    public async completionsFriends(@BodyProp() auth_id: string, @BodyProp() mode: string = "adult"): Promise<CompletionsReply> {
        const playerId = await resolvePlayerId(auth_id, this.dbi);
        var friends = await friendList(playerId, this.dbi);
        friends.push(playerId);
        const timestamp = Date.now() / 1000;
        const serial = await getCurrentCrosswordSerial(timestamp, mode, this.dbi);
        if (serial === null) {
            return { message: 'ok', completions: [] };
        }
        const raw = await this.dbi.getCrosswordV3CompletionsWithFilter(serial, friends);
        const completions = await Promise.all(raw.map(async c => ({
            player_id: c.player_id,
            nick: (await get_nick(c.player_id, this.dbi)).nick,
            finished_at: c.finished_at
        })));
        return { message: 'ok', completions };
    }

    @Post("global_leaderboard")
    public async globalLeaderboard(): Promise<LeaderboardReply> {
        const raw = await this.dbi.getCrosswordV3GlobalLeaderboard();
        const leaderboard = await Promise.all(raw.map(async e => ({
            player_id: e.player_id,
            nick: (await get_nick(e.player_id, this.dbi)).nick,
            count: e.count
        })));
        return { message: 'ok', leaderboard };
    }

    @Post("global_leaderboard/friends")
    public async globalLeaderboardFriends(@BodyProp() auth_id: string): Promise<LeaderboardReply> {
        const playerId = await resolvePlayerId(auth_id, this.dbi);
        var friends = await friendList(playerId, this.dbi);
        friends.push(playerId);
        const raw = await this.dbi.getCrosswordV3GlobalLeaderboardWithFilter(friends);
        const leaderboard = await Promise.all(raw.map(async e => ({
            player_id: e.player_id,
            nick: (await get_nick(e.player_id, this.dbi)).nick,
            count: e.count
        })));
        return { message: 'ok', leaderboard };
    }
}