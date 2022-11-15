import monk, { FindOneResult, FindResult, ICollection, id, IMonkManager } from 'monk';
import { ObjectId } from 'mongodb';
import { number } from '@hapi/joi';
import { DEFAULT_ELO, NUMBER_OF_LAST_OPPONENTS_TO_EXCLUDE } from './api/v3/duel_settings';
import { getMaxPoints, pointsToRank, RANKS, wordPoints } from './api/v3/spelling_bee_common';
import { ALPHABET, JOKER } from './api/v3/spelling_bee_common';
import { SeasonRules } from './api/v3/season_rules';

export class PlayerProfile {
    constructor(public nick: string, public id:number, public _id?: ObjectId) {}
}

class SpellingBeeDuelAggregate {
    constructor(public _id: number, public count:number) {}
}

export class Word {
    constructor(public word: string, public id?: ObjectId) {}
}

export class PlayerWord {
    constructor(public player_id: number, public word_id: number, public word: string, public expiration:number, public id?: ObjectId) {}
}

export class PlayerTries {
    constructor(public id:number, public word_id: number, public guesses: string[], public start_timestamp:number, public id_?: ObjectId) {}
}

export class PlayerAuth {
    constructor(public auth_id: string, public player_id: number, public id?: ObjectId) {}
}

export class Counter {
    constructor(public id: string, public sequence_value: number, public _id?: ObjectId) {}
}

export class FriendCode {
    constructor(public player_id: number, public friend_code: string, public id?: ObjectId) {}
}

export class GlobalWord {
    constructor(public word: string, public validity: number, public word_id: number, public id?: ObjectId) {}
}

export class GridCoordinates {
    constructor(public column:number, public row:number) {}
}

export class CrosswordWord {
    constructor(public word: string, public coordinates:GridCoordinates){}
}

export class PossibleCrossword {
    constructor(public crossword_id: number, public word_list: CrosswordWord[], public letter_grid: String[][], public id?: ObjectId) {}
}

export class PlayerCrosswordState {
    constructor(public player_id: number, public crossword_id: number, public grid: String[][], public guessed_words:string[], public tries:string[], public words:string[], public id?: ObjectId) {}
}

export class SpellingBeeDuelEloRankEntry {
    constructor(public player_id:number, public score:number) {}
}

export class GlobalBee {
    public main_letter:string = "";
    constructor(public bee_id:number, public bee_model_id: number, public validity: number, public letters:string[], main_letter?:string, mainLetter?:string, public id?: ObjectId) {
        if (main_letter !== undefined) {
            this.main_letter = main_letter;
        }
        if (mainLetter !== undefined) {
            this.main_letter = mainLetter;
        }
    }
}

export class GuessedWordsBee {
    constructor(public bee_id:number, public guesses:string[], public player_id?:number, playerId?:number, public id?: ObjectId) {
        if (playerId !== undefined) {
            this.player_id = playerId;
        }
    }
}

export class RawRankingEntry {
    constructor(public player_id:number, public score:number, public id?:ObjectId){};
}

export class RankingEntry extends RawRankingEntry {
    constructor(public player_id:number, public score:number, public position:number, public id?:ObjectId){
        super(player_id, score, id);
    };
}

export class Bee {
    constructor(public id: number, public words: string[], public main_letter: string, public other_letters:string[], public _id?: ObjectId) {}
}

export class SpellingBeeDuellGuess {
    constructor(public word:string, public timestamp:number, public points_after_guess:number){}
}

export class SpellingBeeDuelMatch {
    constructor(public player_id:number, public opponent_id:number) {}
}

export class SocialToAuth {
    constructor(public socialId:string, public authId:string) {}
}

export class SpellingBeeDuel {
    constructor(public bee_duel_id:number,
        public bee_id:number,
        public player_id:number,
        public opponent_id:number,
        public player_guesses:SpellingBeeDuellGuess[],
        public opponent_guesses:SpellingBeeDuellGuess[],
        public player_points:number,
        public opponent_points:number,
        public letters:string[],
        public main_letter:string,
        public start_timestamp:number,
        public finished:boolean,
        public _id?:ObjectId) {}
}

const _db:IMonkManager = monk(process.env.MONGO_URI!);

export default class WordleDBI {
    db() { return _db;}
    words():ICollection<Word> { return _db.get("words")}
    player_word():ICollection<PlayerWord> { return _db.get("player_word")}
    possible_words():ICollection<Word> { return  _db.get("possible_words")}
    player_tries():ICollection<PlayerTries> { return _db.get("player_tries")}
    player_challenge_tries():ICollection<PlayerTries> { return _db.get("player_challenge_tries")}
    player_auth():ICollection<PlayerAuth> { return _db.get("player_auth")}
    counters():ICollection<Counter> { return  _db.get("counters") }
    friend_codes():ICollection<FriendCode> {return _db.get("friend_codes")}
    player_profile():ICollection<PlayerProfile> {return _db.get("player_profile")}
    global_word():ICollection<GlobalWord> {return _db.get("global_word")}
    possible_crosswords():ICollection<PossibleCrossword> {return _db.get("possible_crosswords_v2")}
    player_crossword_state():ICollection<PlayerCrosswordState> {return _db.get("player_crossword_state")}
    global_bee():ICollection<GlobalBee> { return _db.get("global_bee")}
    guessed_words_bee():ICollection<GuessedWordsBee> { return _db.get("guessed_words_bee")}
    bees():ICollection<Bee> {return _db.get("bees")}
    extra_bee_words():ICollection<Word> {return _db.get("bees_fallback")}
    spelling_bee_duels():ICollection<SpellingBeeDuel> {return _db.get("spelling_bee_duels")}
    spelling_bee_elo_rank():ICollection<SpellingBeeDuelEloRankEntry> {return _db.get("elo_rank_spelling_bee_duel");}
    spelling_bee_duel_prematch():ICollection<SpellingBeeDuelMatch> { return _db.get("spelling_bee_duel_prematch");}
    social_to_auth():ICollection<SocialToAuth> { return _db.get("social_to_auth")}

    constructor() {
        this.friend_codes().createIndex({friend_code: 1}, {unique:true})
        this.friend_codes().createIndex({player_id: 1}, {unique:true})
        this.player_word().createIndex({word_id: 1}),
        this.player_auth().createIndex({auth_id: 1}, {unique: true});
        this.player_profile().createIndex({id: 1}, {unique: true});
        this.global_word().createIndex({validity: 1}, {unique: true});
        this.global_word().createIndex({word_id : 1}, {unique: true});
//        _player_tries.createIndex({word_id:1, id: 1}, {unique: true});
        this.player_challenge_tries().createIndex({word_id:1, id:1}, {unique: true});
        this.player_crossword_state().createIndex({player_id: 1}, {unique: true});
        this.global_bee().createIndex({validity: 1}, {unique: true});
        this.global_bee().createIndex({bee_id: 1}, {unique: true})
        this.guessed_words_bee().createIndex({player_id:1, bee_id:1}, {unique: true})
        this.bees().createIndex({id:1}, {unique: true});
        this.extra_bee_words().createIndex({word: 1}, {unique: true})
        this.spelling_bee_duels().createIndex({player_id: 1})
        this.spelling_bee_duels().createIndex({bee_id: 1})
        this.spelling_bee_duels().createIndex({bee_duel_id: 1}, {unique:true})
        this.spelling_bee_elo_rank().createIndex({player_id:1}, {unique:true})
        this.spelling_bee_duel_prematch().createIndex({player_id:1}, {unique:true})
        this.social_to_auth().createIndex({socialId:1}, {unique:true})
    }

    //SEQ

    async getNextSequenceValue(sequenceName:string):Promise<number> {
        var sequenceDocument = await this.counters().findOneAndUpdate({id: sequenceName},
            {$inc:{sequence_value:1}}, {upsert:true});
        console.log(sequenceDocument);
        return sequenceDocument!.sequence_value;
    }

    //PROFILE STATS
    async getSpellingBeeStats(profile_player_id: number):Promise<Array<number>> {
        var result = await this.guessed_words_bee().find({player_id:profile_player_id});
        var return_value:number[] = new Array(RANKS.length).fill(0);
        await Promise.all(result.map(async gw => {
            const global_bee = await this.global_bee().findOne({bee_id:gw.bee_id})
            const bee:Bee|null = await this.getBeeById(global_bee!.bee_model_id)
            var letters = bee!.other_letters;
            var points:number = 0;
            var maxPoints:number = getMaxPoints(bee!.words, letters)
            for (var word of gw.guesses) {
                points += wordPoints(word, letters)
            }
            var rank = pointsToRank(points, maxPoints);
            console.log(return_value[rank] + 1)
            return_value[rank] = return_value[rank] + 1
        }
        ))
        return return_value;
    }
    async getSpellingBeeDuelStats(player_id: number, profile_player_id: number):Promise<Map<String, number>> {
        var result = await this.spelling_bee_duels()
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

    //PLAYER
    async checkSocialId(authId:string, socialId:string):Promise<FindOneResult<SocialToAuth>> {
        return this.social_to_auth().findOneAndUpdate({socialId:socialId}, {$setOnInsert:{authId:authId, socialId:socialId}}, {upsert:true})
    }
    async addPlayerToAuthMap(authId:string, playerId:number) {
        return await this.player_auth().insert({auth_id: authId, player_id: playerId});
    }

    async resolvePlayerId(auth_id:string):Promise<number> {
        console.log(auth_id)
        const authEntry = await this.player_auth().findOne({auth_id: auth_id});
        return authEntry!.player_id;
    }

    async isAuthIdUsed(auth_id:string):Promise<boolean> {
        const authEntry = await this.player_auth().findOne({auth_id:auth_id})
        return authEntry !== null
    }

    async setNick(playerId:number, nick:string, callback:CallableFunction) {
        this.player_profile().findOneAndUpdate({id: playerId},  {$set:{nick: nick}}, {upsert: true}).then(profile => callback(profile!.nick));
    }

    async getProfile(playerId:number):Promise<PlayerProfile|null> {
        console.log(playerId);
        return this.player_profile().findOne({id: playerId});
    }

    async addFriend(player_id:number, friend_code:string):Promise<boolean> {
        const friend_id = (await this.friend_codes().findOne({friend_code: friend_code}))!.player_id;
        if (friend_id == null || player_id === friend_id) {
            return false;
        }
        async function addFriendToList(id:number, friendId:number, db:IMonkManager) {
            const friends =  db.get("friends.plr#" + id);
            friends.createIndex({id:1}, {unique: true})
            const friendOnList = await friends.findOne({id: friendId});
            if (friendOnList == null) {
                friends.insert({id: friendId});
            }
        }
        addFriendToList(player_id, friend_id, this.db())
        addFriendToList(friend_id, player_id, this.db())
        return true;
    }

    async friendList(player_id:number):Promise<number[]> {
        const friends =  this.db().get("friends.plr#" + player_id);
        return (await friends.find()).map(f => f.id)
    }

    async addFriendCode(player_id:number, friend_code:string):Promise<string> {
        try {
            return (await this.friend_codes().findOneAndUpdate({player_id: player_id}, {$setOnInsert:{player_id: player_id, friend_code: friend_code}}, {upsert:true}))!.friend_code;
        }
        catch(error) {
            console.log(error)
            return "";
        }
    }

    //MODEL

    async getWord() {
        return this.words().aggregate([{ $sample: { size: 1 } }]);
    }

    async isWordValid(word:string):Promise<boolean> {
        return this.possible_words().findOne({word:word}).then(value => {return value != null});
    }

    async getCrossword(crossword_id:number):Promise<FindOneResult<PossibleCrossword>> {
        return this.possible_crosswords().findOne({crossword_id: crossword_id});
    }

    async getRandomCrossword():Promise<PossibleCrossword> {
        return (await this.possible_crosswords().aggregate([{ $sample: { size: 1 } }]))[0];
    }

    async getFirstCrossword():Promise<PossibleCrossword|null> {
        try {
            return (await this.possible_crosswords().find())[0];
        }
        catch(error) {
            console.log(error)
            return null;
        }
    }

    async getBeeById(bee_model_id:number):Promise<FindOneResult<Bee>> {
        return this.bees().findOne({id:bee_model_id});
    }

    //BEE

    async isBeeWordOnExtraList(word:string):Promise<boolean> {
        if (word.includes(JOKER)) {
            var potentialWords = ALPHABET.map(letter => word.replace(JOKER, letter))
            return await this.extra_bee_words().findOne({word:{$in: potentialWords}}).then(value => {return value != null});
        }
        else {
            return this.extra_bee_words().findOne({word:word}).then(value => {return value != null});
        }
    }

    async wordExists(word:string, bee_model_id:number) {
        var bee_words:string[] = (await this.bees().findOne({id: bee_model_id}))!.words;
        var wordOnList:boolean = bee_words.includes(word);
        if (word.includes(JOKER)) {
            var potentialWords = ALPHABET.map(letter => {
                var readyWord = word;
                while(readyWord.includes(JOKER)) { 
                    readyWord = readyWord.replace(JOKER, letter)
                }
                return readyWord;
                });
            for (var singleWord of potentialWords) {
                if (bee_words.includes(singleWord)) {
                    wordOnList = true;
                    break;
                }
            }
        }
        return wordOnList || this.isBeeWordOnExtraList(word);
    }

    async getLettersForBee(timestamp:number):Promise<FindOneResult<GlobalBee>> {
        return this.global_bee().findOne({validity:{$gt: timestamp}});
    }

    async getBeeWords(bee_model_id:number):Promise<String[]> {
        return (await this.bees().findOne({id: bee_model_id}))!.words
    }

    async getRandomBee():Promise<Bee> {
        return (await this.bees().aggregate([{ $sample: { size: 1 } }]))[0]
    }

    async createLettersForBee(validityTimestamp:number, season_rules:SeasonRules|null) {
        var bee:Bee = (await this.getRandomBee())
        const bee_id = await this.getNextSequenceValue("global_bee");
        var other_letters = bee.other_letters;
        console.log(season_rules)
        while (season_rules != null && season_rules.noOfLetters < other_letters.length) {
            other_letters.splice(Math.floor(Math.random() * other_letters.length), 1);
        }
        if (season_rules != null && season_rules.addBlank) {
            other_letters[Math.floor(Math.random() * other_letters.length)] = JOKER;
        }
        return this.global_bee().insert(new GlobalBee(bee_id, bee.id, validityTimestamp, other_letters, bee.main_letter))
    }

    async getBeeState(player_id:number, bee_id:number):Promise<FindOneResult<GuessedWordsBee>> {
        return this.guessed_words_bee().findOne({player_id: player_id, bee_id: bee_id});
    }

    async addBeeGuess(player_id:number, bee_id:number, guess:string):Promise<FindOneResult<GuessedWordsBee>> {
        return this.guessed_words_bee().findOneAndUpdate({player_id: player_id, bee_id: bee_id}, {$push: {guesses: guess}}, {upsert:true})
    }

    //BEE DUEL


    async getRandomDuelBee(opponent_id:number):Promise<Bee|null> {
        if (opponent_id < 0) {
            return this.getRandomBee();
        }
        var possibleNotRandom = (await this.spelling_bee_duels().find({player_id:opponent_id},)).map(d => d.bee_id);
        possibleNotRandom = Array.from(new Set(possibleNotRandom));
        
        return (await this.getBeeById(possibleNotRandom[Math.floor(possibleNotRandom.length * Math.random())]));
    }

    async getDuelsForGivenBee(bee_model_id:number, player_id:number, timestamp:number, duelDuration:number):Promise<FindOneResult<SpellingBeeDuel>> {
        return this.spelling_bee_duels().findOne({bee_id:bee_model_id, player_id:player_id, start_timestamp:{$lt:timestamp - duelDuration}}, {sort:{player_points:-1}, limit:1})
    }

    async startDuel(bee_model:Bee, player_id: number, opponent_id:number, opponent_guesses:SpellingBeeDuellGuess[], opponent_points:number, timestamp: number):Promise<SpellingBeeDuel> {
        var return_value = new SpellingBeeDuel((await this.getNextSequenceValue("spelling_bee_duel_id")),
            bee_model.id,
            player_id,
            opponent_id,
            [], opponent_guesses,
            0, opponent_points,
            bee_model.other_letters,
            bee_model.main_letter,
            timestamp,
            false
            );
            this.spelling_bee_duels().insert(return_value);
        
        return return_value;
    }

    async getSpellingBeeDuelMatch(player_id:number):Promise<FindOneResult<SpellingBeeDuelMatch>> {
        return this.spelling_bee_duel_prematch().findOne({player_id:player_id});
    }

    async addSpellingBeeDuelMatch(player_id:number, opponent_id:number) {
        this.spelling_bee_duel_prematch().insert({player_id:player_id, opponent_id:opponent_id})
    }

    async checkForExistingDuel(player_id:number, timestamp:number, duel_duration:number):Promise<FindOneResult<SpellingBeeDuel>> {
        return this.spelling_bee_duels().findOne({player_id:player_id, start_timestamp:{$lt: timestamp, $gt: timestamp - duel_duration}})
    }

    async checkForUnfinishedDuel(player_id:number, timestamp:number, duel_duration:number):Promise<FindOneResult<SpellingBeeDuel>> {
        console.log({player_id:player_id, start_timestamp:{$lt:timestamp - duel_duration}});
        return this.spelling_bee_duels().findOne({player_id:player_id, start_timestamp:{$lt:timestamp - duel_duration}, finished:false});
    }

    async markDuelAsFinished(bee_duel_id:number, player_id:number) {
        this.spelling_bee_duel_prematch().findOneAndDelete({player_id:player_id});
        this.spelling_bee_duels().findOneAndUpdate({bee_duel_id:bee_duel_id}, {$set: {finished:true}});
    }

    async markOldDuelsAsFinished(player_id:number) {
        this.spelling_bee_duels().update({player_id:player_id, finished:false}, {$set:{finished:true}})
    }

    async addPlayerGuessInSpellingBeeDuel(duel_id:number, player_id:number, guess:string, points:number, current_duel:SpellingBeeDuel, timestamp:number):Promise<SpellingBeeDuel|null> {
        return this.spelling_bee_duels().findOneAndUpdate({bee_duel_id:duel_id},
            {$set:{player_points:current_duel.player_points + points},
            $push:{player_guesses: new SpellingBeeDuellGuess(guess, timestamp, current_duel.player_points + points)}
        })
    }

    async getAllPlayerDuelsBeeIds(player_id:number):Promise<number[]> {
        return this.spelling_bee_duels().distinct('bee_id', {player_id:player_id})
    }

    async getBestResultPercentage(player_id:number, bees_ids:number[]):Promise<number[]> {
        return Promise.all(bees_ids.map(bee_id => this.getSingleBestResultPercentage(player_id, bee_id)));
    }

    async getSingleBestResultPercentage(player_id:number, bee_id:number):Promise<number> {
        const bee_model:Bee|null = await this.getBeeById(bee_id);
        const best_duel:SpellingBeeDuel|null = await this.spelling_bee_duels().findOne({player_id:player_id, bee_id:bee_id}, {sort:{player_points:-1}, limit:1})

        return best_duel!.player_points/getMaxPoints(bee_model!.words, bee_model!.other_letters);
    }

    async getLastSpellingBeeDuelOpponents(player_id:number):Promise<number[]> {
        if (NUMBER_OF_LAST_OPPONENTS_TO_EXCLUDE === 0) {
            return [];
        }
        return this.spelling_bee_duels().find({player_id:player_id}, {sort:{start_timestamp: -1}, limit:NUMBER_OF_LAST_OPPONENTS_TO_EXCLUDE}).then(duelEntries => duelEntries.map(entry => entry.opponent_id))
    }

    async getOpponentsFromSpellingBeeEloRank(player_id:number, score:number, maxDiff:number):Promise<number[]> {
        const returnValue = this.spelling_bee_elo_rank().find({score:{$gte: score - maxDiff, $lte:score + maxDiff}, player_id:{$ne:player_id}})
        return (returnValue.then(r => r.map(entry => entry.player_id)))
    }

    async getCurrentSpellingBeeElo(player_id:number):Promise<number> {
        const rankingEntry:SpellingBeeDuelEloRankEntry|null = await this.spelling_bee_elo_rank().findOne({player_id:player_id});
        if (rankingEntry === null) {
            return DEFAULT_ELO;
        }
        return rankingEntry.score;
    }

    async updateSpellingBeeEloRank(player_id:number, new_score:number) {
        this.spelling_bee_elo_rank().findOneAndUpdate({player_id:player_id}, {$set:{score:new_score}}, {upsert:true})
    }

    async getSpellingBeeEloRank():Promise<RankingEntry[]> {
        var rank:SpellingBeeDuelEloRankEntry[] = await this.spelling_bee_elo_rank().find({}, {sort:{score: -1}});
        var returnValue:RankingEntry[] = [];
        var position:number = 1;
        var previous_score = -1;
        for (var re of rank) {
            if (previous_score !== -1 && previous_score != re.score) {
                position += 1;
            }
            returnValue.push(new RankingEntry(re.player_id, re.score, position));
            previous_score = re.score;
        }
        return returnValue;
    }

    //BEE RANKING
    async increaseBeeRank(player_id:number, bee_id:number, points:number) {
        const rank =  this.db().get("bee#" + bee_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        return rank.findOneAndUpdate({player_id: player_id}, {$inc:{score: points}}, {upsert:true})
    }

    async getBeePlayerPoints(player_id:number, bee_id:number) {
        const rank =  this.db().get("bee#" + bee_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        const pointsFromRank = (await rank.findOne({player_id: player_id}))
        if (pointsFromRank === null) {
            return 0
        }
        return pointsFromRank.score
        }

    async getBeeRanking(bee_id:number):Promise<RankingEntry[]> {
        return await this.getRanking("bee", bee_id);
    }


    //CLASSIC WORDLE
    async getOrCreateGlobalWord(timestamp:number, new_validity:number, new_word:string):Promise<FindOneResult<GlobalWord>> {
        var new_word_id:number = await this.getNextSequenceValue("global_word")
        return this.global_word().findOneAndUpdate({validity:{$gt: timestamp}}, {$setOnInsert: {word:new_word, validity: new_validity, word_id: new_word_id}}, {upsert: true})
    }

    async getGlobalWord(timestamp:number):Promise<FindOneResult<GlobalWord>> {
        return this.global_word().findOne({validity:{$gt: timestamp}})
    }

    async getGlobalWordById(word_id:number):Promise<FindOneResult<GlobalWord>> {
        return this.global_word().findOne({word_id:word_id})
    }

    async getPlayerTries(player_id:number, word_id:number, timestamp:number):Promise<FindOneResult<PlayerTries>> {
        return this.player_tries().findOneAndUpdate({id:player_id, word_id:word_id}, {$setOnInsert:new PlayerTries(player_id, word_id, [], timestamp)}, {upsert:true});
    }

    async getPlayerTriesForWord(player_id:number, word_id:number):Promise<FindOneResult<PlayerTries>> {
        return this.player_tries().findOne({id:player_id, word_id:word_id });
    }

    async addGuess(player_id:number, word_id:number, guess:string):Promise<FindOneResult<PlayerTries>> {
        return this.player_tries().findOneAndUpdate({id:player_id, word_id:word_id}, { $push: {guesses: guess}});
    }

    //CONTINOUS WORDLE
    async addNewPlayerWord(player_id:number, word:string, expiration:number) {
        const wordId = await this.getNextSequenceValue("player#" + player_id + "_word");
        return this.player_word().insert({
            player_id: player_id,
            word_id:wordId,
            word: word,
            expiration: expiration
        })
    }

    async getPlayerChallengeTriesForWord(player_id:number, word_id:number):Promise<FindOneResult<PlayerTries>> {
        return this.player_challenge_tries().findOne({id:player_id, word_id:word_id });
    }

    async addChallengeGuess(player_id:number, word_id:number, guess:string):Promise<FindOneResult<PlayerTries>> {
        return this.player_challenge_tries().findOneAndUpdate({id:player_id, word_id:word_id }, { $push: { guesses: guess} });
    }

    async getPlayerChallengeTries(player_id:number, word_id:number):Promise<FindOneResult<PlayerTries>> {
        return this.player_challenge_tries().findOneAndUpdate({id:player_id, word_id:word_id}, {$setOnInsert:{guesses:[]}}, {upsert:true});
    }

    async getPlayerLastWord(player_id:number):Promise<PlayerWord|null> {
        const value = await this.player_word().find({player_id:player_id}, {limit:1, sort:{word_id: -1}});
        if (value === null) {
            return null;
        }
        return value[0];
    }

    //RANK

    async increaseRank(player_id:number, word_id:number, tries:number, timestamp:number) {
        const rank =  this.db().get("word#" + word_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        return rank.findOneAndUpdate({player_id: player_id}, {$setOnInsert:{score: tries, time: timestamp}}, {upsert:true})
    }

    async getWordleRanking(word_id:number) {
        const rank =  this.db().get("word#" + word_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        var rawRank = (await rank.find({}, {sort: {score:1, time: 1}, limit:100}))
        var returnValue:RankingEntry[] = []
        var position = 0
        for (var entry of rawRank) {
            position += 1
            returnValue.push({score: entry.score, position: position, player_id: entry.player_id})
        }
        return returnValue
    }

    async getRankingWithFilter(word_id:number, friends:number[]) {
        const rank =  this.db().get("word#" + word_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        return rank.find({playerId:{$in: friends}}, {sort: {score:1, time: 1}, limit:100})
    }

    //RANK COMMON


    async getRanking(rank_type:string, bee_id:number):Promise<RankingEntry[]> {
        const rank:ICollection<RawRankingEntry> =  this.db().get(rank_type + "#" + bee_id + "_ranking");
        console.log(rank_type + "#" + bee_id + "_ranking")
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});

        const rawRank = await rank.find({}, {sort: {score:-1}, limit:100})

        var returnValue:RankingEntry[] = []
        var position = 0
        var score = 0
        for (var entry of rawRank) {
            if (score != entry.score) {
                score = entry.score
                position += 1
            }
            returnValue.push(new RankingEntry(entry.player_id, entry.score, position, entry.id))
        }
        return returnValue;

    }


    //CROSSWORD

    async getCrosswordState(playerId:number):Promise<PlayerCrosswordState|null> {
        try {
            const state = this.player_crossword_state().findOne({player_id: playerId});
            return state;
        }
        catch(error) {
            console.log(error);
            return null;
        }
    }

    async setCrosswordState(player_id:number, words:string[], guessed_words:string[], grid:String[][], crossword_id:number, tries:string[]):Promise<FindOneResult<PlayerCrosswordState>> {
        try {
            return this.player_crossword_state().findOneAndUpdate({player_id: player_id}, {$set:new PlayerCrosswordState(player_id, crossword_id, grid, guessed_words, tries, words)}, {upsert: true});
        }
        catch(error) {
            console.log(error);
            return null;
        }
    }

    async increase_request_counter(path:string, last_midnight:number) {
        const stats =  this.db().get("request_stats_" + last_midnight);
        stats.findOneAndUpdate({path:path}, {$inc:{no_of_requests: 1}}, {upsert:true})
    }

}

