const { exist } = require('@hapi/joi');
const { entry } = require('@hapi/joi/lib/validator');
const monk = require('monk');
const _db = monk(process.env.MONGO_URI);
const _words = _db.get("words");
const _player_word = _db.get("player_word");
const _possible_words = _db.get("possible_words")
const _player_tries = _db.get("player_tries")
const _player_challenge_tries = _db.get("player_challenge_tries")
const _player_auth = _db.get("player_auth")
const _counters = _db.get("counters")
const _friend_codes = _db.get("friend_codes")
const _player_profile = _db.get("player_profile")
const _global_word = _db.get("global_word")
const _possible_crosswords = _db.get("possible_crosswords")
const _player_crossword_state = _db.get("player_crossword_state")
const _global_bee = _db.get("global_bee")
const _guessed_words_bee = _db.get("guessed_words_bee")
const _bees = _db.get("bees")

class WordleDBI {
    db() { return _db;}
    words() { return _words}
    player_word() { return _player_word}
    possible_words() { return _possible_words}
    player_tries() { return _player_tries}
    player_challenge_tries() { return _player_challenge_tries}
    player_auth() { return _player_auth}
    counters() { return _counters}
    friend_codes() {return _friend_codes}
    player_profile() {return _player_profile}
    global_word() {return _global_word}
    possible_crosswords() {return _possible_crosswords}
    player_crossword_state() {return _player_crossword_state}
    global_bee() { return _global_bee}
    guessed_words_bee() { return _guessed_words_bee}
    bees() {return _bees}

    constructor() {
        _friend_codes.createIndex({friend_code: 1}, {unique:true})
        _friend_codes.createIndex({player_id: 1}, {unique:true})
        _player_word.createIndex({word_id: 1}),
        _player_auth.createIndex({auth_id: 1}, {unique: true});
        _player_profile.createIndex({id: 1}, {unique: true});
        _global_word.createIndex({validity: 1}, {unique: true});
        _global_word.createIndex({word_id : 1}, {unique: true});
//        _player_tries.createIndex({word_id:1, id: 1}, {unique: true});
        _player_challenge_tries.createIndex({word_id:1, id:1}, {unique: true});
        _player_crossword_state.createIndex({player_id: 1}, {unique: true});
        _global_bee.createIndex({validity: 1}, {unique: true});
        _global_bee.createIndex({bee_id: 1}, {unique: true})
        _guessed_words_bee.createIndex({player_id:1, bee_id:1}, {unique: true})
        _bees.createIndex({id:1}, {unique: true});
    }

    //SEQ

    async getNextSequenceValue(sequenceName){
        var sequenceDocument = await this.counters().findOneAndUpdate({id: sequenceName},
            {$inc:{sequence_value:1}}, {upsert:true});
        console.log(sequenceDocument);
        return sequenceDocument.sequence_value;
    }

    //PLAYER

    async addPlayerToAuthMap(authId, playerId) {
        return await this.player_auth().insert({auth_id: authId, player_id: playerId});
    }

    async resolvePlayerId(auth_id) {
        const authEntry = await this.player_auth().findOne({auth_id: auth_id});
        return authEntry === null?null:authEntry.player_id;
    }

    async setNick(playerId, nick) {
        return this.player_profile().findOneAndUpdate({id: playerId},  {$set:{nick: nick}}, {upsert: true});
    }

    async getProfile(playerId) {
        return this.player_profile().findOne({id: playerId});
    }

    async addFriend(player_id, friend_code) {
        const friend_id = (await this.friend_codes().findOne({friend_code: friend_code})).player_id;
        if (friend_id == null || player_id === friend_id) {
            return false;
        }
        async function addFriendToList(id, friendId, db) {
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

    async friendList(player_id) {
        const friends =  this.db().get("friends.plr#" + player_id);
        return (await friends.find()).map(f => f.id)
    }

    async addFriendCode(player_id, friend_code) {
        try {
            return (await this.friend_codes().findOneAndUpdate({player_id: player_id}, {$setOnInsert:{player_id: player_id, friend_code: friend_code}}, {upsert:true})).friend_code;
        }
        catch(error) {
            console.log(error)
            return null;
        }
    }

    //MODEL

    async getWord() {
        return this.words().aggregate([{ $sample: { size: 1 } }]);
    }

    async isWordValid(word) {
        return this.possible_words().findOne({word:word}).then(value => {return value != null});
    }

    async getCrossword(crossword_id) {
        return this.possible_crosswords().findOne({crossword_id: crossword_id})
    }

    async getRandomCrossword() {
        return this.possible_crosswords().aggregate([{ $sample: { size: 1 } }]);
    }

    async getFirstCrossword() {
        try {
            return (await this.possible_crosswords().find())[0];
        }
        catch(error) {
            console.log(error)
            return null;
        }
    }

    //BEE

    async existsInFallback(word) {
        return this.db().get("bees_fallback").findOne({word:word}).then(value => {return value != null});
    }

    async wordExists(word, bee_model_id) {
        return (await this.bees().findOne({id: bee_model_id})).words.includes(word) || this.existsInFallback(word)
    }

    async getLettersForBee(timestamp) {
        return this.global_bee().findOne({validity:{$gt: timestamp}});
    }

    async getBeeWords(bee_model_id) {
        return (await this.bees().findOne({id: bee_model_id})).words
    }

    async createLettersForBee(validityTimestamp) {
        const bee_id = await this.getNextSequenceValue("global_bee");
        var bee = (await this.bees().findOne({id: bee_id}))
        return this.global_bee().insert({validity: validityTimestamp, mainLetter: bee.main_letter, letters: bee.other_letters, bee_id: bee_id, bee_model_id: bee.id})
    }

    async getBeeState(player_id, bee_id) {
        return this.guessed_words_bee().findOne({player_id: player_id, bee_id: bee_id});
    }

    async addBeeGuess(player_id, bee_id, guess) {
        return this.guessed_words_bee().findOneAndUpdate({player_id: player_id, bee_id: bee_id}, {$push: {guesses: guess}}, {upsert:true})
    }

    //BEE RANKING
    async increaseBeeRank(player_id, bee_id, points) {
        const rank =  this.db().get("bee#" + bee_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        return rank.findOneAndUpdate({player_id: player_id}, {$inc:{score: points}}, {upsert:true})
    }

    async getBeePlayerPoints(player_id, bee_id) {
        const rank =  this.db().get("bee#" + bee_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        const pointsFromRank = (await rank.findOne({player_id: player_id}))
        if (pointsFromRank === null) {
            return 0
        }
        return pointsFromRank.score
        }

    async getBeeRanking(bee_id) {
        return await this.getRanking("bee", bee_id);
    }


    //CLASSIC WORDLE
    async getOrCreateGlobalWord(timestamp, new_validity, new_word) {
        var new_word_id = await this.getNextSequenceValue("global_word")
        return this.global_word().findOneAndUpdate({validity:{$gt: timestamp}}, {$setOnInsert: {word:new_word, validity: new_validity, word_id: new_word_id}}, {upsert: true})
    }

    async getGlobalWord(timestamp) {
        return this.global_word().findOne({validity:{$gt: timestamp}})
    }

    async getGlobalWordById(word_id) {
        return this.global_word().findOne({word_id:word_id})
    }

    async getPlayerTries(player_id, word_id, timestamp) {
        return this.player_tries().findOneAndUpdate({id:player_id, word_id:word_id}, {$setOnInsert:{guesses:[], start_timestamp: timestamp}}, {upsert:true});
    }

    async getPlayerTriesForWord(player_id, word_id) {
        return this.player_tries().findOne({id:player_id, word_id:word_id });
    }

    async addGuess(player_id, word_id, guess) {
        return this.player_tries().findOneAndUpdate({id:player_id, word_id:word_id }, { $push: { guesses: guess} });
    }

    //CONTINOUS WORDLE
    async addNewPlayerWord(player_id, word, expiration) {
        const wordId = await this.getNextSequenceValue("player#" + player_id + "_word");
        return this.player_word().insert({
            player_id: player_id,
            word_id:wordId,
            word: word,
            expiration: expiration
        })
    }

    async getPlayerChallengeTriesForWord(player_id, word_id) {
        return this.player_challenge_tries().findOne({id:player_id, word_id:word_id });
    }

    async addChallengeGuess(player_id, word_id, guess) {
        return this.player_challenge_tries().findOneAndUpdate({id:player_id, word_id:word_id }, { $push: { guesses: guess} });
    }

    async getPlayerChallengeTries(player_id, word_id) {
        return this.player_challenge_tries().findOneAndUpdate({id:player_id, word_id:word_id}, {$setOnInsert:{guesses:[]}}, {upsert:true});
    }

    async getPlayerLastWord(player_id) {
        const value = await this.player_word().find({player_id:player_id}, {limit:1, sort:{word_id: -1}});
        if (value === null) {
            return null;
        }
        return value[0];
    }

    //RANK

    async increaseRank(player_id, word_id, tries, timestamp) {
        const rank =  this.db().get("word#" + word_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        return rank.findOneAndUpdate({player_id: player_id}, {$setOnInsert:{score: tries, time: timestamp}}, {upsert:true})
    }

    async getWordleRanking(word_id) {
        const rank =  this.db().get("word#" + word_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        var rawRank = (await rank.find({}, {sort: {score:1, time: 1}, limit:100}))
        var returnValue = []
        var position = 0
        for (var entry of rawRank) {
            position += 1
            returnValue.push({score: entry.score, position: position, player_id: entry.player_id})
        }
        return returnValue
    }

    async getRankingWithFilter(word_id, friends) {
        const rank =  this.db().get("word#" + word_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        return rank.find({playerId:{$in: friends}}, {sort: {score:1, time: 1}, limit:100})
    }

    //RANK COMMON


    async getRanking(rank_type, bee_id) {
        const rank =  this.db().get(rank_type + "#" + bee_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});

        const score100Array = await rank.aggregate([{ $sample: { size: 1 } }])

        if (score100Array.length == 0) {
            return []
        }
        
        var score100 = score100Array[score100Array.length - 1].score
        const rawRank = await rank.find({}, {sort: {score:-1}, score: {$gt: score100}})
        var returnValue = []
        var position = 0
        var score = 0
        for (var entry of rawRank) {
            if (score != entry.score) {
                score = entry.score
                position += 1
            }
            returnValue.push({score: score, position: position, player_id: entry.player_id})
        }
        return returnValue;

    }


    //CROSSWORD

    async getCrosswordState(playerId) {
        try {
            const state = this.player_crossword_state().findOne({player_id: playerId});
            return state;
        }
        catch(error) {
            console.log(error);
            return null;
        }
    }

    async setCrosswordState(player_id, words, guessed_words, grid, crossword_id, tries) {
        try {
            return this.player_crossword_state().findOneAndUpdate({player_id: player_id}, {$set:{words:words, grid: grid, guessed_words: guessed_words, crossword_id: crossword_id, tries: tries}}, {upsert: true});
        }
        catch(error) {
            console.log(error);
        }
    }

}

function createDBI() {
    return new WordleDBI();
}

module.exports = {
    createDBI
}
