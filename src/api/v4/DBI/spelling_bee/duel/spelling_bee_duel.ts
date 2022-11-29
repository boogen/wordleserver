import { FindOneResult } from "monk";
import { NUMBER_OF_LAST_OPPONENTS_TO_EXCLUDE } from "../../../duel_settings";
import { getSeasonRules, LetterToBuy, SeasonRules } from "../../../season_rules";
import { getMaxPoints, getNewLetterState } from "../../../spelling_bee_common";
import WordleDBI from "../../DBI";
import { Bee } from "../Bee";
import { LetterState } from "../LetterState";
import { getBeeById, getRandomBee } from "../model";
import { SpellingBeeDuel } from "./SpellingBeeDuel";
import { SpellingBeeDuelAggregate } from "./SpellingBeeDuelAggregate";
import { SpellingBeeDuellGuess } from "./SpellingBeeDuellGuess";
import { SpellingBeeDuelMatch } from "./SpellingBeeDuelMatch";

export async function getSpellingBeeDuelStats(player_id: number, profile_player_id: number, dbi:WordleDBI):Promise<Map<String, number>> {
    var result = await dbi.spelling_bee_duels()
    .aggregate<SpellingBeeDuelAggregate[]>([{$match:{player_id: player_id, opponent_id:profile_player_id, finished:true}},
        {$group:{_id:{$cmp:["$player_points", "$opponent_points"]}, count:{$count:{}}}}]);
    var return_value:Map<String, number> = new Map();
    return_value.set("loss", 0);
    return_value.set("draw", 0);
    return_value.set("win", 0);
    result.forEach(r => {
        switch (r._id) {
            case -1:
                return_value.set("loss", r.count);
                break;
            case 0:
                return_value.set("draw", r.count);
            case 1:
                return_value.set("win", r.count)
            default:
                break;
        }
        
    })
    return return_value;
}

export async function getRandomDuelBee(opponent_id:number, season_rules:SeasonRules, dbi:WordleDBI):Promise<Bee|null> {
    if (opponent_id < 0) {
        return getRandomBee(dbi, season_rules);
    }
    var possibleNotRandom = (await dbi.spelling_bee_duels().find({player_id:opponent_id},)).map(d => d.bee_id);
    possibleNotRandom = Array.from(new Set(possibleNotRandom));
    
    if (possibleNotRandom.length === 0) {
        return getRandomBee(dbi, season_rules)
    }

    return (await getBeeById(possibleNotRandom[Math.floor(possibleNotRandom.length * Math.random())], dbi));
}

export async function getDuelsForGivenBee(bee_model_id:number, player_id:number, timestamp:number, duelDuration:number, dbi:WordleDBI):Promise<FindOneResult<SpellingBeeDuel>> {
    return dbi.spelling_bee_duels().findOne({bee_id:bee_model_id, player_id:player_id, start_timestamp:{$lt:timestamp - duelDuration}}, {sort:{player_points:-1}, limit:1})
}


export async function startDuel(bee_model:Bee, player_id: number, opponent_id:number, opponent_guesses:SpellingBeeDuellGuess[], opponent_points:number, timestamp: number, seasonRules:SeasonRules, dbi:WordleDBI):Promise<SpellingBeeDuel> {
    var return_value = new SpellingBeeDuel((await dbi.getNextSequenceValue("spelling_bee_duel_id")),
        bee_model.id,
        player_id,
        opponent_id,
        [], opponent_guesses,
        0, opponent_points,
        getNewLetterState(bee_model.required_letters, bee_model.other_letters, seasonRules),
        timestamp,
        false,
        seasonRules.lettersToBuy,
        seasonRules
        );
        dbi.spelling_bee_duels().insert(return_value);
    
    return return_value;
}

export async function getSpellingBeeDuelMatch(player_id:number, season_tag:string, dbi:WordleDBI):Promise<FindOneResult<SpellingBeeDuelMatch>> {
    return dbi.spelling_bee_duel_prematch().findOne({player_id:player_id, season_tag:season_tag});
}

export async function addSpellingBeeDuelMatch(player_id:number, opponent_id:number, season_tag:string, dbi:WordleDBI) {
    dbi.spelling_bee_duel_prematch().insert({player_id:player_id, opponent_id:opponent_id, season_tag:season_tag})
}

export async function checkForExistingDuel(player_id:number, timestamp:number, duel_duration:number, dbi:WordleDBI):Promise<FindOneResult<SpellingBeeDuel>> {
    return dbi.spelling_bee_duels().findOne({player_id:player_id, start_timestamp:{$lt: timestamp, $gt: timestamp - duel_duration}})
}

export async function checkForUnfinishedDuel(player_id:number, timestamp:number, duel_duration:number, dbi:WordleDBI):Promise<FindOneResult<SpellingBeeDuel>> {
    console.log({player_id:player_id, start_timestamp:{$lt:timestamp - duel_duration}});
    return dbi.spelling_bee_duels().findOne({player_id:player_id, start_timestamp:{$lt:timestamp - duel_duration}, finished:false});
}

export async function markDuelAsFinished(bee_duel_id:number, player_id:number, season_tag:string, dbi:WordleDBI) {
    dbi.spelling_bee_duel_prematch().findOneAndDelete({player_id:player_id, season_tag:season_tag});
    dbi.spelling_bee_duels().findOneAndUpdate({bee_duel_id:bee_duel_id}, {$set: {finished:true}});
}

export async function markOldDuelsAsFinished(player_id:number, dbi:WordleDBI) {
    dbi.spelling_bee_duels().update({player_id:player_id, finished:false}, {$set:{finished:true}})
}


export async function addPlayerGuessInSpellingBeeDuel(duel_id:number, player_id:number, guess:string, points:number, current_duel:SpellingBeeDuel, timestamp:number, dbi:WordleDBI):Promise<SpellingBeeDuel|null> {
    return dbi.spelling_bee_duels().findOneAndUpdate({bee_duel_id:duel_id},
        {$set:{player_points:current_duel.player_points + points},
        $push:{player_guesses: new SpellingBeeDuellGuess(guess, timestamp, current_duel.player_points + points)}
    })
}

export async function addNewLetterToSpellingBeeDuel(duel_id:number, newLetterState:LetterState[], newLettersToBuy:LetterToBuy[],  letterPrice:number, dbi:WordleDBI) {
    return dbi.spelling_bee_duels().findOneAndUpdate({bee_duel_id:duel_id},
        {$inc:{player_points:letterPrice},
        $set:{letters:newLetterState, lettersToBuy:newLettersToBuy}}
    )
}

export async function getAllPlayerDuelsBeeIds(player_id:number, dbi:WordleDBI):Promise<number[]> {
    return dbi.spelling_bee_duels().distinct('bee_id', {player_id:player_id})
}

export async function getBestResultPercentage(player_id:number, bees_ids:number[], dbi:WordleDBI):Promise<number[]> {
    return Promise.all(bees_ids.map(bee_id => getSingleBestResultPercentage(player_id, bee_id, dbi)));
}

export async function getSingleBestResultPercentage(player_id:number, bee_id:number, dbi:WordleDBI):Promise<number> {
    const bee_model:Bee|null = await getBeeById(bee_id, dbi);
    const best_duel:SpellingBeeDuel|null = await dbi.spelling_bee_duels().findOne({player_id:player_id, bee_id:bee_id}, {sort:{player_points:-1}, limit:1})

    return best_duel!.player_points/bee_model!.max_points;
}

export async function getLastSpellingBeeDuelOpponents(player_id:number, dbi:WordleDBI):Promise<number[]> {
    if (NUMBER_OF_LAST_OPPONENTS_TO_EXCLUDE === 0) {
        return [];
    }
    return dbi.spelling_bee_duels().find({player_id:player_id}, {sort:{start_timestamp: -1}, limit:NUMBER_OF_LAST_OPPONENTS_TO_EXCLUDE}).then(duelEntries => duelEntries.map(entry => entry.opponent_id))
}
