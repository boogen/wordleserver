import { FindOneResult } from "monk";
import WordleDBI from "../DBI";
import { GlobalWord } from "./GlobalWord";
import { PlayerTries } from "./PlayerTries";
import { PlayerWord } from "./PlayerWord";

//CLASSIC WORDLE
export async function getOrCreateGlobalWord(timestamp:number, new_validity:number, new_word:string, dbi:WordleDBI):Promise<FindOneResult<GlobalWord>> {
    var new_word_id:number = await dbi.getNextSequenceValue("global_word")
    return dbi.global_word().findOneAndUpdate({validity:{$gt: timestamp}}, {$setOnInsert: {word:new_word, validity: new_validity, word_id: new_word_id}}, {upsert: true})
}

export async function getGlobalWord(timestamp:number, dbi:WordleDBI):Promise<FindOneResult<GlobalWord>> {
    return dbi.global_word().findOne({validity:{$gt: timestamp}})
}

export async function getGlobalWordById(word_id:number, dbi:WordleDBI):Promise<FindOneResult<GlobalWord>> {
    return dbi.global_word().findOne({word_id:word_id})
}

export async function getPlayerTries(player_id:number, word_id:number, timestamp:number, dbi:WordleDBI):Promise<FindOneResult<PlayerTries>> {
    return dbi.player_tries().findOneAndUpdate({id:player_id, word_id:word_id}, {$setOnInsert:new PlayerTries(player_id, word_id, [], timestamp)}, {upsert:true});
}

export async function getPlayerTriesForWord(player_id:number, word_id:number, dbi:WordleDBI):Promise<FindOneResult<PlayerTries>> {
    return dbi.player_tries().findOne({id:player_id, word_id:word_id });
}

export async function addGuess(player_id:number, word_id:number, guess:string, dbi:WordleDBI):Promise<FindOneResult<PlayerTries>> {
    return dbi.player_tries().findOneAndUpdate({id:player_id, word_id:word_id}, { $push: {guesses: guess}});
}

//CONTINOUS WORDLE
export async function addNewPlayerWord(player_id:number, word:string, expiration:number, dbi:WordleDBI) {
    const wordId = await dbi.getNextSequenceValue("player#" + player_id + "_word");
    return dbi.player_word().insert({
        player_id: player_id,
        word_id:wordId,
        word: word,
        expiration: expiration
    })
}

export async function getPlayerChallengeTriesForWord(player_id:number, word_id:number, dbi:WordleDBI):Promise<FindOneResult<PlayerTries>> {
    return dbi.player_challenge_tries().findOne({id:player_id, word_id:word_id });
}

export async function addChallengeGuess(player_id:number, word_id:number, guess:string, dbi:WordleDBI):Promise<FindOneResult<PlayerTries>> {
    return dbi.player_challenge_tries().findOneAndUpdate({id:player_id, word_id:word_id }, { $push: { guesses: guess} });
}

export async function getPlayerChallengeTries(player_id:number, word_id:number, dbi:WordleDBI):Promise<FindOneResult<PlayerTries>> {
    return dbi.player_challenge_tries().findOneAndUpdate({id:player_id, word_id:word_id}, {$setOnInsert:{guesses:[]}}, {upsert:true});
}

export async function getPlayerLastWord(player_id:number, dbi:WordleDBI):Promise<PlayerWord|null> {
    const value = await dbi.player_word().find({player_id:player_id}, {limit:1, sort:{word_id: -1}});
    if (value === null) {
        return null;
    }
    return value[0];
}
