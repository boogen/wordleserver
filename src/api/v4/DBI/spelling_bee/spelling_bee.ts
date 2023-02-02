import { FindOneResult } from "monk";
import { LetterToBuy, SeasonRules } from "../../season_rules";
import { getMaxPoints, initExtraLetters, JOKER, pointsToRank, RANKS, wordPoints } from "../../spelling_bee/spelling_bee_common";
import WordleDBI from "../DBI";
import { Bee } from "./Bee";
import { GlobalBee } from "./GlobalBee";
import { GuessedWordsBee } from "./GuessedWordsBee";
import { LetterState } from "./LetterState";
import { getBeeById, getRandomBee } from "./model";

export async function getLettersForBee(timestamp:number, dbi:WordleDBI):Promise<FindOneResult<GlobalBee>> {
    return dbi.global_bee().findOne({validity:{$gt: timestamp}});
}



export async function createLettersForBee(validityTimestamp:number, season_rules:SeasonRules|null, dbi:WordleDBI) {
    var bee:Bee = (await getRandomBee(dbi, season_rules))
    const bee_id = await dbi.getNextSequenceValue("global_bee");
    var other_letters = bee.other_letters;
    if (season_rules?.addBlank) {
        other_letters.push(JOKER);
    }
    other_letters = other_letters.concat(initExtraLetters(bee.required_letters, other_letters, season_rules))
    // while (season_rules != null && season_rules.noOfLetters < other_letters.length) {
    //     other_letters.splice(Math.floor(Math.random() * other_letters.length), 1);
    // }
    // if (season_rules != null && season_rules.addBlank) {
    //     other_letters[Math.floor(Math.random() * other_letters.length)] = JOKER;
    // }
    var safety = 10000;
    while (other_letters.length > (season_rules?.noOfLetters ?? 6)) {
        safety --;
        var letterToRemove = Math.floor(Math.random() * other_letters.length)
        if (other_letters[letterToRemove] != JOKER) {
            other_letters.splice(letterToRemove);
        }
        if (safety < 0) {
            throw "Error creating letters for bee"
        }
    }
    return dbi.global_bee().insert(new GlobalBee(bee_id, bee.id, validityTimestamp, other_letters, bee.required_letters))
}

export async function addNewLetterToSpellingBeeState(player_id:number, bee_id:number, letters:LetterState[], lettersToBuy:LetterToBuy[], dbi:WordleDBI):Promise<FindOneResult<GuessedWordsBee>> {
    return dbi.guessed_words_bee().findOneAndUpdate({player_id:player_id, bee_id:bee_id}, {$set:{letters:letters, lettersToBuy:lettersToBuy}})
}

export async function createBeeState(player_id:number, bee_id:number, letters:LetterState[], lettersToBuy:LetterToBuy[], dbi:WordleDBI):Promise<GuessedWordsBee> {
    return dbi.guessed_words_bee().insert({player_id:player_id, bee_id:bee_id, guesses:[], letters:letters, lettersToBuy:lettersToBuy})
}

export async function getBeeState(player_id:number, bee_id:number, dbi:WordleDBI):Promise<FindOneResult<GuessedWordsBee>> {
    return dbi.guessed_words_bee().findOne({player_id: player_id, bee_id: bee_id});
}

export async function addBeeGuess(player_id:number, bee_id:number, guess:string, dbi:WordleDBI):Promise<FindOneResult<GuessedWordsBee>> {
    return dbi.guessed_words_bee().findOneAndUpdate({player_id: player_id, bee_id: bee_id}, {$push: {guesses: guess}}, {upsert:true})
}

export async function saveLettersState(player_id:number, bee_id:number, lettersState:LetterState[], dbi:WordleDBI):Promise<FindOneResult<GuessedWordsBee>> {
    return dbi.guessed_words_bee().findOneAndUpdate({player_id: player_id, bee_id: bee_id}, {$set: {letters: lettersState}}, {upsert:true})
}

export async function getSpellingBeeStats(profile_player_id: number, dbi:WordleDBI):Promise<Array<number>> {
    var result = await dbi.guessed_words_bee().find({player_id:profile_player_id});
    var return_value:number[] = new Array(RANKS.length).fill(0);
    await Promise.all(result.map(async gw => {
        const global_bee = await dbi.global_bee().findOne({bee_id:gw.bee_id})
        if (!global_bee) {
            return;
        }
        const bee:Bee|null = await getBeeById(global_bee!.bee_model_id, dbi)
        var letters = bee!.other_letters;
        var points:number = 0;
        var maxPoints:number = bee!.max_points
        for (var word of gw.guesses) {
            points += wordPoints(word, letters).points
        }
        var rank = pointsToRank(points, maxPoints);
        console.log(return_value[rank] + 1)
        return_value[rank] = return_value[rank] + 1
    }
    ))
    return return_value;
}