import { string } from "@hapi/joi";
import { Post, Query, Route } from "tsoa";
import { Stats } from "../../../../WordleStatsDBI";
import WordleDBI from "../../DBI/DBI";
import { checkLimit, resolvePlayerId } from "../../DBI/player/player";
import { Bee } from "../../DBI/spelling_bee/Bee";
import { SpellingBeeDuel } from "../../DBI/spelling_bee/duel/SpellingBeeDuel";
import { SpellingBeeDuellGuess } from "../../DBI/spelling_bee/duel/SpellingBeeDuellGuess";
import { addNewLetterToSpellingBeeDuel, addPlayerGuessInSpellingBeeDuel, addSpellingBeeDuelMatch, checkForExistingDuel, checkForUnfinishedDuel, getAllPlayerDuelsBeeIds, getBestResultPercentage, getDuelsForGivenBee, getLastSpellingBeeDuelOpponents, getRandomDuelBee, getSpellingBeeDuelMatch, markDuelAsFinished, startDuel } from "../../DBI/spelling_bee/duel/spelling_bee_duel";
import { LetterState } from "../../DBI/spelling_bee/LetterState";
import { getBeeById, getRandomBee } from "../../DBI/spelling_bee/model";
import { BOT_THRESHOLD, CHANCE_FOR_BOT, DUEL_DURATION, ELO_COEFFICIENT, MATCH_ELO_DIFF } from "../../duel_settings";
import { get_bot_id, get_nick } from "../../player/player_common";
import { notifyAboutRankingChange } from "../../ranking";
import { fromOtherSeasonRules, getDuelSeasonRules, LetterToBuy, SeasonRules } from "../../season_rules";
import { ALPHABET, processPlayerGuess, SpellingBeeReplyEnum } from "../spelling_bee_common";


enum DuelResult {
    win = "win",
    lose = "lose",
    draw = "draw",
    error = "error"
}

async function getSpellingBeeDuelPrematchPlayerInfo(id:number, season_rules:SeasonRules):Promise<SpellingBeeDuelPrematchPlayerInfo> {
    return new SpellingBeeDuelPrematchPlayerInfo(
        id,
        (await get_nick(id, dbi)).nick,
        await dbi.getCurrentSpellingBeeElo(id, season_rules.id)
    )
}

export class SpellingBeeDuelGuessReply {
    constructor(public message:SpellingBeeReplyEnum, public state:SpellingBeeDuelStateReply, public points:number) {}
}

interface SpellingBeeDuelStart {
    opponent_nick:string;
    opponent_moves:SpellingBeeDuellGuessMessage[];
    state:SpellingBeeDuelStateReply;
}

class SpellingBeeDuelEnd {
    constructor(public result:DuelResult, public player_points:number, public opponent_points:number, public new_player_elo:number, public player_elo_diff:number, public time_left?:number) {}
}

interface SpellingBeeDuelStateReply {
    message:string;
    letters?:LetterState[];
    guessed_words?:string[];
    player_points?:number;
    time_left?:number;
    round_time?:number;
    letters_to_buy?:LetterToBuy[];
}

class SpellingBeeDuellGuessMessage {
    constructor(public word:string, public seconds:number, public points:number){}
}


class SpellingBeeDuelPrematchPlayerInfo {
    constructor(public id:number, public player:string, public elo:number) {}
}

class SpellingBeeDuelSeasonInfo {
    constructor(public season_title:string, public seconds_to_end:number, public rules:string, public point_rules:string){}
}

interface SpellingBeeDuelPrematchReply {
    message:string;
    player?:SpellingBeeDuelPrematchPlayerInfo;
    opponent?:SpellingBeeDuelPrematchPlayerInfo;
    season_info?:SpellingBeeDuelSeasonInfo;
}

const dbi = new WordleDBI()
const stats:Stats = new Stats();

@Route("api/v4/spelling_bee_duel")
export class SpellingBeeDuelController {
    @Post("prematch")
    public async prematch(@Query() auth_id:string):Promise<SpellingBeeDuelPrematchReply> {
        const player_id = await resolvePlayerId(auth_id, dbi);
        var limitMet = await checkLimit('spelling_bee_duel_limit', player_id, dbi)
        if(!limitMet) {
            return {message: 'limit_exceeded'}
        }
        const timestamp:number = Date.now() / 1000;
        const existing_duell = await checkForUnfinishedDuel(player_id, timestamp, DUEL_DURATION, dbi);
        var season_rules = await getDuelSeasonRules();
        if (existing_duell !== null && existing_duell.season_rules.duelTag === season_rules.duelTag) {
            return { message: 'ok',
                player: await getSpellingBeeDuelPrematchPlayerInfo(player_id, season_rules),
                opponent: await getSpellingBeeDuelPrematchPlayerInfo(existing_duell.opponent_id, season_rules),
                season_info:new SpellingBeeDuelSeasonInfo(season_rules.season_title, season_rules.getSecondsToEnd(), season_rules.rules, season_rules.points)}

        }
        const existing_match = await getSpellingBeeDuelMatch(player_id, season_rules.duelTag!, dbi);
        console.log("Duel tag: "  + season_rules.duelTag!)
        if (existing_match !== null) {
            return {message:'ok',
                player: await getSpellingBeeDuelPrematchPlayerInfo(player_id, season_rules),
                opponent:await getSpellingBeeDuelPrematchPlayerInfo(existing_match.opponent_id, season_rules),
                season_info:new SpellingBeeDuelSeasonInfo(season_rules.season_title, season_rules.getSecondsToEnd(), season_rules.rules, season_rules.points)}
        }
        const opponentsCandidates:number[] = await dbi.getOpponentsFromSpellingBeeEloRank(player_id, (await dbi.getCurrentSpellingBeeElo(player_id, season_rules.id)), MATCH_ELO_DIFF, season_rules.id)
        var opponent_id = get_bot_id()
        if (Math.random() >= CHANCE_FOR_BOT && opponentsCandidates.length !== 0) {
            var opponent_filter:Set<number> = new Set((await getLastSpellingBeeDuelOpponents(player_id, dbi)));
            var filtered_candidates:number[] = opponentsCandidates.filter(id => !opponent_filter.has(id));
            console.log(filtered_candidates);
            if (filtered_candidates.length !== 0) {
                opponent_id = filtered_candidates[Math.floor(Math.random() * filtered_candidates.length)];
            }
        }
        await addSpellingBeeDuelMatch(player_id, opponent_id, season_rules.duelTag!, dbi);
        stats.addSpellingBeeDuelPrematchEvent(player_id, opponent_id);
        return {message:'ok',
            player:await getSpellingBeeDuelPrematchPlayerInfo(player_id, season_rules),
            opponent:await getSpellingBeeDuelPrematchPlayerInfo(opponent_id, season_rules),
            season_info:new SpellingBeeDuelSeasonInfo(season_rules.season_title, season_rules.getSecondsToEnd(), season_rules.rules, season_rules.points)}
    }

    @Post("start")
    public async start(@Query() auth_id:string):Promise<SpellingBeeDuelStart> {
        const player_id = await resolvePlayerId(auth_id, dbi);
        const timestamp:number = Date.now() / 1000;
        var duel:SpellingBeeDuel|null = await checkForUnfinishedDuel(player_id, timestamp, DUEL_DURATION, dbi);
        if (duel === null) {
            duel = (await checkForExistingDuel(player_id, timestamp, DUEL_DURATION, dbi));
        }
        var opponent_guesses:SpellingBeeDuellGuess[] = []
        const season_rules = await getDuelSeasonRules();
        console.log("Duel tag: "  + season_rules.duelTag!)
        const existing_match = await getSpellingBeeDuelMatch(player_id, season_rules.duelTag!, dbi);
        var opponent_id:number = existing_match!.opponent_id
        if (duel === null) {
            var spelling_bee_model:Bee|null = await getRandomBee(dbi, season_rules);
            if (opponent_id < 0) {
                const bot_guesses = await createBotGuesses((await getRandomBee(dbi, season_rules))!, player_id, season_rules);
                opponent_guesses = opponent_guesses.concat(bot_guesses);
            }
            else {
                spelling_bee_model = (await getRandomDuelBee(opponent_id, season_rules, dbi));
                var best_duel:SpellingBeeDuel|null = (await getDuelsForGivenBee(spelling_bee_model!.id, opponent_id, timestamp, DUEL_DURATION, dbi));
                opponent_guesses = opponent_guesses.concat(best_duel?.player_guesses ?? []).map(g => g = new SpellingBeeDuellGuess(g.word, g.timestamp - best_duel!.start_timestamp ,g.points_after_guess));
            }
            console.log(opponent_guesses);
            var opponent_points = 0;
            if (opponent_guesses.length > 0) {
               opponent_points = opponent_guesses[opponent_guesses.length - 1].points_after_guess;
            }
            duel = (await startDuel(spelling_bee_model!, player_id, opponent_id, opponent_guesses, opponent_points, timestamp, season_rules, dbi));
        }
        else {
            opponent_guesses = opponent_guesses.concat(duel.opponent_guesses)
            opponent_id = duel.opponent_id
        }
        stats.addSpellingBeeDuelStartEvent(player_id, opponent_id, duel!.bee_id, duel!.bee_duel_id);
        return {opponent_nick: (await get_nick(opponent_id, dbi)).nick,
            opponent_moves: opponent_guesses.map(g => new SpellingBeeDuellGuessMessage("", g.timestamp, g.points_after_guess)),
            state: {
                message:"ok",
                letters:duel!.letters,
                guessed_words: duel!.player_guesses.map(guess => guess.word),
                player_points: duel!.player_points,
                time_left: Math.floor(duel.start_timestamp + DUEL_DURATION - timestamp),
                round_time: DUEL_DURATION,
                letters_to_buy: duel!.lettersToBuy}
        }
        
    }

    @Post("guess")
    public async guess(@Query() auth_id:string, @Query() guess:string):Promise<SpellingBeeDuelGuessReply> {
        const player_id = await resolvePlayerId(auth_id, dbi);
        const timestamp = Date.now() / 1000;
        var duel:SpellingBeeDuel|null = await checkForExistingDuel(player_id, timestamp, DUEL_DURATION, dbi);
        const bee_model:Bee|null = await getBeeById(duel!.bee_id, dbi)
        const season_rules:SeasonRules = fromOtherSeasonRules(duel!.season_rules);
        const result = await processPlayerGuess(guess, duel!.player_guesses.map(g => g.word), bee_model!, duel!.letters, season_rules, dbi);
        if (result.message != SpellingBeeReplyEnum.ok) {
            return new SpellingBeeDuelGuessReply(
                result.message, 
                {
                    message:"not_ok",
                    letters: duel!.letters, 
                    guessed_words: duel!.player_guesses.map(g => g.word), 
                    player_points: duel!.player_points,
                    time_left: Math.floor(duel!.start_timestamp + DUEL_DURATION - timestamp),
                    round_time: DUEL_DURATION,
                    letters_to_buy: duel!.lettersToBuy
                }, 0);
        }
        for (var i = 0; i < result.guessesAdded.length; i++) {
            duel = await addPlayerGuessInSpellingBeeDuel(duel!.bee_duel_id, player_id, result.guessesAdded[i], result.pointsAdded[i], duel!, timestamp, dbi);
        }
        var totalPoints = result.pointsAdded.reduce((a, b) => a + b);
        stats.addSpellingBeeDuelGuessEvent(player_id, duel!.bee_duel_id, totalPoints, duel!.player_points);
        return new SpellingBeeDuelGuessReply(result.message,
            {
                message:"ok",
                letters: duel!.letters,
                guessed_words: duel!.player_guesses.map(g => g.word),
                player_points: duel!.player_points,
                time_left: Math.floor(duel!.start_timestamp + DUEL_DURATION - timestamp),
                round_time: DUEL_DURATION,
                letters_to_buy: duel!.lettersToBuy
            },
            totalPoints);
    }

    @Post("end")
    public async end(@Query() auth_id:string):Promise<SpellingBeeDuelEnd> {
        const player_id = await resolvePlayerId(auth_id, dbi);
        const timestamp = Date.now() / 1000;
        var duel:SpellingBeeDuel|null = await checkForUnfinishedDuel(player_id, timestamp, DUEL_DURATION, dbi);
        if (duel === null) {
            var ongoing_duel:SpellingBeeDuel|null = await checkForExistingDuel(player_id, timestamp, DUEL_DURATION, dbi);
            if (ongoing_duel === null) {
                return new SpellingBeeDuelEnd(DuelResult.error, -1, -1, -1, -1)
            }
            else {
                return new SpellingBeeDuelEnd(DuelResult.error, -1, -1, Math.floor(ongoing_duel.start_timestamp + DUEL_DURATION - timestamp), -1, -1)
            }
        }
        const season_rules:SeasonRules = fromOtherSeasonRules(duel!.season_rules);
        await markDuelAsFinished(duel.bee_duel_id, player_id, season_rules?.duelTag ?? "vanilla", dbi)
        var result = DuelResult.draw
        if (duel.player_points > duel.opponent_points) {
            result = DuelResult.win
        }
        if (duel.opponent_points > duel.player_points) {
            result = DuelResult.lose
        }
        const currentEloScore:number = await dbi.getCurrentSpellingBeeElo(player_id, season_rules.id);
        const opponentElo:number = await dbi.getCurrentSpellingBeeElo(duel.opponent_id, season_rules.id);
        const new_player_elo:number = calculateNewSimpleRank(currentEloScore, result);
        const oldRank = await dbi.getSpellingBeeEloRank(season_rules.id)
        notifyAboutRankingChange(player_id, oldRank, currentEloScore, new_player_elo, "Pojedynek")
        dbi.updateSpellingBeeEloRank(player_id, new_player_elo - currentEloScore, season_rules.id);
        stats.addSpellingBeeDuelEndEvent(player_id, duel!.bee_duel_id, result, currentEloScore, new_player_elo)
        return new SpellingBeeDuelEnd(result, duel.player_points, duel.opponent_points, new_player_elo, new_player_elo - currentEloScore)
    }

    @Post("buy_letter")
    public async buy_letter(@Query() auth_id:string):Promise<SpellingBeeDuelStateReply> {
        const player_id = await resolvePlayerId(auth_id, dbi)
        const timestamp = Date.now() / 1000;
        var duel:SpellingBeeDuel|null = await checkForExistingDuel(player_id, timestamp, DUEL_DURATION, dbi);
        const bee_model:Bee|null = await getBeeById(duel!.bee_id, dbi)
        var lettersToBuy = duel!.lettersToBuy; 
        if (lettersToBuy.length == 0) {
            return {message:"no letters to buy"}
        }
        var currentPlayerPoints:number|undefined = duel?.player_points
        if (!currentPlayerPoints) {
            currentPlayerPoints = 0;
        }
        var letterPrice = lettersToBuy.splice(0, 1)[0];
        if (letterPrice.price > currentPlayerPoints) {
            return {"message": "not_enough_points"}
        }
        var lettersState = duel!.letters;
        var plainLetters = lettersState.map(ls => ls.letter)
        var possibleLetters = ALPHABET.filter(letter => !plainLetters.includes(letter))
        console.log(possibleLetters)
        var boughtLetterIndex:number = Math.floor(Math.random() * possibleLetters.length)
        var boughtLetter:string = possibleLetters[boughtLetterIndex]
        console.log(boughtLetter + " " + boughtLetterIndex)
        lettersState.push(new LetterState(boughtLetter, letterPrice.useLimit, 0 , false));
        var newDuel = await addNewLetterToSpellingBeeDuel(duel!.bee_duel_id, lettersState, lettersToBuy, -letterPrice.price, dbi);
        return {
            message:"ok",
            letters:duel!.letters,
            guessed_words:duel!.player_guesses.map(g => g.word),
            player_points:duel!.player_points,
            time_left:Math.floor(duel!.start_timestamp + DUEL_DURATION - timestamp),
            round_time:DUEL_DURATION,
            letters_to_buy:duel!.lettersToBuy
        };
    }
}

async function createBotGuesses(bee_model:Bee, player_id:number, season_rules:SeasonRules):Promise<SpellingBeeDuellGuess[]> {
    const player_duels_bee_ids:number[] = await getAllPlayerDuelsBeeIds(player_id, season_rules.duelTag, dbi);
    const best_result_percentage:number[] = await getBestResultPercentage(player_id, player_duels_bee_ids, season_rules.duelTag, dbi);
    const average_percentage:number = best_result_percentage.reduce((a, b) => a+b, 0) / best_result_percentage.length;
    const return_value:SpellingBeeDuellGuess[] = []
    var bot_points:number = average_percentage * BOT_THRESHOLD.get_random() * bee_model.max_points;
    const bot_guess_points:number[] = []
    const possiblePoints = [1, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
    while (bot_points > 0) {
        var points = possiblePoints[Math.floor(Math.random() * possiblePoints.length)]
        bot_points -= points;
        bot_guess_points.push(points);
    }
    const guess_interval:number = (DUEL_DURATION - 20) / bot_guess_points.length;
    var time:number = 10;
    var points:number = 0;
    for (var points_for_guess of bot_guess_points) {
        points += points_for_guess
        return_value.push(new SpellingBeeDuellGuess("", Math.floor(time), points));
        time += guess_interval;
    }
    return return_value;
}

function calculateNewSimpleRank(playerScore:number, result:DuelResult):number {
    switch (result) {
        case DuelResult.draw:
            return playerScore + 0;
        case DuelResult.win:
            return playerScore + 50;
            break;
        case DuelResult.lose:
            return Math.max(playerScore - 30, 0);
        default:
            throw new Error("Cannot calculate new elo - incorrect result");
    }
}


function calculateNewEloRank(playerScore:number, opponentScore:number, result:DuelResult):number {
    const rankingDiff:number = playerScore - opponentScore;
    const expectedResult:number = 1/(Math.pow(10, -rankingDiff/400) + 1);
    var numericalResult:number = 0;
    switch (result) {
        case DuelResult.draw:
            numericalResult = 0.5;
            break;
        case DuelResult.lose:
            numericalResult = 0;
            break;
        case DuelResult.win:
            numericalResult = 1;
            break;
        default:
            throw new Error("Cannot calculate new elo - incorrect result");
    }

    return playerScore +  Math.ceil(ELO_COEFFICIENT * (numericalResult - expectedResult));
}