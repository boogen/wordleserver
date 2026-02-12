import { Post, BodyProp, Route } from "tsoa";
import { Stats } from "../../../WordleStatsDBI";
import WordleDBI from "../DBI/DBI";
import { resolvePlayerId } from "../DBI/player/player";
import { Bee } from "../DBI/spelling_bee/Bee";
import { GlobalBee } from "../DBI/spelling_bee/GlobalBee";
import { GuessedWordsBee } from "../DBI/spelling_bee/GuessedWordsBee";
import { LetterState } from "../DBI/spelling_bee/LetterState";
import { getBeeById } from "../DBI/spelling_bee/model";
import { addBeeGuess, addNewLetterToSpellingBeeState, createBeeState, createLettersForBee, getBeeState, getLettersForBee, saveLettersState } from "../DBI/spelling_bee/spelling_bee";
import { notifyAboutRankingChange } from "../ranking";
import { getSeasonRules } from "../season_rules";
import { ALPHABET, getNewLetterState, processPlayerGuess, SpellingBeeReplyEnum } from "./spelling_bee_common";
import { inject, injectable } from "inversify";

const BEE_VALIDITY = 86400;
const GLOBAL_TIME_START = 1647774000;


interface SpellingBeeStateReply {
    message:SpellingBeeReplyEnum,
    letters?:LetterState[],
    guessed_words?:string[],
    player_points?:number,
    max_points?:number,
    points?:number,
    letters_to_buy_prices?:number[]
}


interface SeasonInfo {
    season_id: string,
    season_title: string,
    rules:string,
    points_rules: string,
    seconds_to_end:number
}

@injectable()
@Route("api/v4/spelling_bee")
export class SpellingBeeController {
    constructor(
        @inject(WordleDBI) private dbi: WordleDBI,
        @inject(Stats) private stats: Stats
    ) {

    }
    @Post("getState")
    public async getState(@BodyProp() auth_id:string):Promise<SpellingBeeStateReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        var new_validity_timestamp = GLOBAL_TIME_START;
        const timestamp = Date.now() / 1000;
        while (new_validity_timestamp < timestamp) {
            new_validity_timestamp += BEE_VALIDITY;
        }
        var letters:GlobalBee|null = await getLettersForBee(timestamp, this.dbi);
        var season_rules = await getSeasonRules()
        if (null === letters) {
            letters = await createLettersForBee(new_validity_timestamp, season_rules, this.dbi);
            //initExtraLetters(letters!.required_letters, letters!.letters, season_rules);
        }
        var state:GuessedWordsBee|null = await getBeeState(player_id, letters.bee_id, this.dbi);
        var guesses:string[] = []
        if (state === null) {
            state = await createBeeState(player_id, letters.bee_id, getNewLetterState(letters.required_letters, letters.letters, season_rules), season_rules.lettersToBuy, this.dbi)
            guesses = []
        }
        else {
            guesses = state.guesses
        }
	    const playerPoints = await this.dbi.getBeePlayerPoints(player_id, letters.bee_id)
        var bee_model = await getBeeById(letters.bee_model_id, this.dbi)
        return {
            message:SpellingBeeReplyEnum.ok,
            letters:state.letters,
            guessed_words:guesses,
            player_points:playerPoints,
            max_points:bee_model!.max_points,
            letters_to_buy_prices: state.lettersToBuy.map(lb => lb.price)
        }
    }

    @Post("guess")
    public async guess(@BodyProp() auth_id:string, @BodyProp("guess") player_guess:string):Promise<SpellingBeeStateReply> {
        var season_rules = getSeasonRules();
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        const timestamp = Date.now() / 1000;
        const letters = await getLettersForBee(timestamp, this.dbi);
        const bee_model:Bee|null = await getBeeById(letters!.bee_model_id, this.dbi);
        var state = await getBeeState(player_id, letters!.bee_id, this.dbi)
        var result = await processPlayerGuess(player_guess, state!.guesses, bee_model!, state!.letters, await season_rules, this.dbi);

        if (result.message != SpellingBeeReplyEnum.ok) {
            var playerPoints = (await this.dbi.getBeePlayerPoints(player_id, letters!.bee_id));
            this.stats.addSpellingBeeGuessEvent(player_id, player_guess, false, 0, playerPoints);
            return {message: result.message,
                letters: state!.letters,
                guessed_words: state!.guesses,
                player_points: (await this.dbi.getBeePlayerPoints(player_id, letters!.bee_id)),
                max_points: bee_model!.max_points,
                letters_to_buy_prices: state!.lettersToBuy.map(lb => lb.price)
            }
        }

        for (var guess of result.guessesAdded) {
            state = await addBeeGuess(player_id, letters!.bee_id, guess, this.dbi)
        }
        var totalPointsAdded = result.pointsAdded.reduce((a, b) => a+b)
        var oldRank = await this.dbi.getBeeRanking(letters!.bee_id)

        var newRankingEntry = await this.dbi.increaseBeeRank(player_id, letters!.bee_id, totalPointsAdded)

        notifyAboutRankingChange(player_id, oldRank, newRankingEntry.score - totalPointsAdded, newRankingEntry.score, "Wspólna litera")
        const max_points = bee_model!.max_points;
        state = await saveLettersState(player_id, letters!.bee_id, result.newLetterState, this.dbi)
        var player_points = (await this.dbi.getBeePlayerPoints(player_id, letters!.bee_id));
        this.stats.addSpellingBeeGuessEvent(player_id, result.guessesAdded.join(","), true, totalPointsAdded, player_points);
        return {
            message: SpellingBeeReplyEnum.ok,
            letters: state!.letters,
            guessed_words: state!.guesses,
            player_points: player_points,
            max_points: max_points,
            points: totalPointsAdded,
            letters_to_buy_prices: state!.lettersToBuy.map(lb => lb.price)
        }
    }

    @Post("buy_letter")
    public async buy_letter(@BodyProp() auth_id:string):Promise<SpellingBeeStateReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi)
        const timestamp = Date.now() / 1000;
        const letters = await getLettersForBee(timestamp, this.dbi);
        const bee_model:Bee|null = await getBeeById(letters!.bee_model_id, this.dbi);
        var state = await getBeeState(player_id, letters!.bee_id, this.dbi)
        var lettersToBuy = state!.lettersToBuy; 
        if (lettersToBuy.length == 0) {
            return {message:SpellingBeeReplyEnum.no_letters_to_buy}
        }
        var currentPlayerPoints:number|undefined = (await this.dbi.getBeePlayerPoints(player_id, letters!.bee_id))
        if (!currentPlayerPoints) {
            currentPlayerPoints = 0;
        }
        var letterPrice = lettersToBuy.splice(0, 1)[0];
        if (letterPrice.price > currentPlayerPoints) {
            return {message: SpellingBeeReplyEnum.not_enough_points}
        }
        var lettersState = state!.letters;
        var pointInfo = await this.dbi.increaseBeeRank(player_id, letters!.bee_id, -letterPrice.price)
        var plainLetters = lettersState.map(ls => ls.letter)
        var possibleLetters = ALPHABET.filter(letter => !plainLetters.includes(letter))
        console.log(possibleLetters)
        var boughtLetterIndex:number = Math.floor(Math.random() * possibleLetters.length)
        var boughtLetter:string = possibleLetters[boughtLetterIndex]
        console.log(boughtLetter + " " + boughtLetterIndex)
        lettersState.push(new LetterState(boughtLetter, letterPrice.useLimit, 0 , false));
        var newState = await addNewLetterToSpellingBeeState(player_id, letters!.bee_id, lettersState, lettersToBuy, this.dbi);
        return {
            message:SpellingBeeReplyEnum.ok,
            letters:newState!.letters,
            guessed_words:newState!.guesses,
            player_points:pointInfo!.score,
            max_points:bee_model!.max_points,
            letters_to_buy_prices:newState!.lettersToBuy.map(lb => lb.price)
        }
    }
    @Post("season_info")
    public async getSeasonRules():Promise<SeasonInfo> {
        var season_rules = await getSeasonRules();
        return {season_id: season_rules.id, season_title: season_rules.season_title, rules:season_rules.rules, points_rules: season_rules.points, seconds_to_end:season_rules.getSecondsToEnd()}
    }
}