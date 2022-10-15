import { StatsDBI, StatsEvent } from "./StatsDBI";

class RegistrationEvent extends StatsEvent {
    constructor(public authId:string, public playerId:number, public timestamp:number){
        super();
    }
    getTableName(): string {
        return "registration_event";
    }
    getValues():any[] {
        return [this.authId, this.playerId, this.timestamp]
    }
}

class LoginEvent extends StatsEvent {
    constructor(public playerId:number, public timestamp:number){
        super();
    }
    getTableName(): string {
        return "login_event"
    }
    getValues():any[] {
        return [this.playerId, this.timestamp];
    }
}

class NickSetEvent extends StatsEvent {
    constructor(public playerId:number, public nick:string, public timestamp:number) {
        super();
    }
    getTableName(): string {
        return "nick_set_event";
    }
    getValues():any[] {
        return [this.playerId, this.nick];
    }
}

class WordleInitEvent extends StatsEvent {
    constructor(public playerId:number, public wordle_id:number, public timestamp:number) {
        super();
    }
    getTableName(): string {
        return "wordle_init_event";
    }
    getValues():any[] {
        return [this.playerId, this.wordle_id, this.timestamp];
    }
}

class WordleGuessEvent extends StatsEvent {
    constructor(public playerId:number, public tryNo:number, public isGuessed:boolean, public timestamp:number) {
        super();
    }
    getTableName(): string {
        return "wordle_guess_event";
    }
    getValues():any[] {
        return [this.playerId, this.tryNo, this.isGuessed, this.timestamp];
    }
}

class CrosswordInitEvent extends StatsEvent {
    constructor(public playerId:number, public crosswordId:number, public timestamp:number) {
        super();
    }
    getTableName(): string {
        return "crossword_init";
    }
    getValues():any[] {
        return [this.playerId, this.crosswordId, this.timestamp];
    }
}

class CrosswordGuessEvent extends StatsEvent {
    constructor(public playerId:number, public noOfGuessedWords:number, public noOfGuesses:number, public isFinished:boolean, public isWord:boolean, public timestamp:number) {
        super();
    }
    getTableName(): string {
        return "crossword_guess";
    }
    getValues():any[] {
        return [this.playerId, this.noOfGuessedWords, this.noOfGuesses, this.isFinished, this.timestamp];
    }
}

class SpellingBeeGuessEvent extends StatsEvent {
    constructor(public playerId:number, public pointsForGuess:number, public pointsAfterGuess:number, public timestamp:number) {
        super();
    }
    getTableName(): string {
        return "spelling_bee_guess";
    }
    getValues():any[] {
        return [this.playerId, this.pointsForGuess, this.pointsAfterGuess, this.timestamp];
    }
}

class SpellingBeeDuelPrematchEvent extends StatsEvent {
    constructor(public playerId:number, public opponentId:number, public timestamp:number) {
        super();
    }
    getTableName(): string {
        return "spelling_bee_duel_prematch";
    }
    getValues():any[] {
        return [this.playerId, this.opponentId, this.timestamp];
    }
}

class SpellingBeeDuelStartEvent extends StatsEvent {
    constructor(public player_id:number, public opponent_id:number, public bee_id:number, public duel_id:number, public timestamp:number) {
        super();
    }
    getTableName(): string {
        return "spelling_bee_duel_start_event";
    }
    getValues():any[] {
        return [this.player_id, this.opponent_id, this.bee_id, this.duel_id, this.timestamp];
    }
}

class SpellingBeeDuelGuessEvent extends StatsEvent {
    constructor(public playerId:number, public duel_id:number, public pointsForGuess:number, public pointsAfterGuess:number, public timestamp:number) {
        super();
    }
    getTableName(): string {
        return "spelling_bee_duel_guess_event";
    }
    getValues():any[] {
        return [this.playerId, this.duel_id, this.pointsForGuess, this.pointsAfterGuess, this.timestamp];
    }
}

class SpellingBeeDuelEndEvent extends StatsEvent {
    constructor(public player_id:number, public duel_id:number, public result:string, public previous_elo:number, public new_elo:number, public timestamp:number) {
        super();
    }
    getTableName(): string {
        return "spelling_bee_duel_end_event";
    }
    getValues():any[] {
        return [this.player_id, this.duel_id, this.result, this.previous_elo, this.new_elo, this.timestamp];
    }
}

export class Stats extends StatsDBI {

    async addRegistrationEvent(authId:string, playerId:number) {
        this.addStat(new RegistrationEvent(authId, playerId, Date.now()/1000))
    }

    async addLoginEvent(playerId:number) {
        this.addStat(new LoginEvent(playerId, Date.now()/1000))
    }

    async addSetNickEvent(playerId:number, nick:string) {
        this.addStat(new NickSetEvent(playerId, nick, Date.now()/1000))
    }

    async addWordleInitEvent(playerId:number, wordle_id:number) {
        this.addStat(new WordleInitEvent(playerId, wordle_id, Date.now()/1000))
    }

    async addWordleGuessEvent(playerId:number, tryNo:number, isGuessed:boolean) {
        this.addStat(new WordleGuessEvent(playerId, tryNo, isGuessed, Date.now()/1000))
    }

    async addCrosswordInitEvent(playerId:number, crosswordId:number) {
        this.addStat(new CrosswordInitEvent(playerId, crosswordId, Date.now()/1000))
    }

    async addCrosswordGuessEvent(playerId:number, noOfGuessedWords:number, noOfGuesses:number, isFinished:boolean, isWord:boolean) {
        this.addStat(new CrosswordGuessEvent(playerId, noOfGuessedWords, noOfGuesses, isFinished, isWord, Date.now()/1000))
    }

    async addSpellingBeeGuessEvent(playerId:number, pointsForGuess:number, pointsAfterGuess:number) {
        this.addStat(new SpellingBeeGuessEvent(playerId, pointsForGuess, pointsAfterGuess, Date.now()/1000))
    }

    async addSpellingBeeDuelPrematchEvent(playerId:number, opponentId:number) {
        this.addStat(new SpellingBeeDuelPrematchEvent(playerId, opponentId, Date.now()/1000))
    }

    async addSpellingBeeDuelStartEvent(player_id:number, opponent_id:number, bee_id:number, duel_id:number) {
        this.addStat(new SpellingBeeDuelStartEvent(player_id, opponent_id, bee_id, duel_id, Date.now()/1000))
    }

    async addSpellingBeeDuelGuessEvent(playerId:number, duel_id:number, pointsForGuess:number, pointsAfterGuess:number) {
        this.addStat(new SpellingBeeDuelGuessEvent(playerId, duel_id, pointsForGuess, pointsAfterGuess, Date.now()/1000))
    }

    async addSpellingBeeDuelEndEvent(player_id:number, duel_id:number, result:string, previous_elo:number, new_elo:number) {
        this.addStat(new SpellingBeeDuelEndEvent(player_id, duel_id, result, previous_elo, new_elo, Date.now()/1000))
    }
}