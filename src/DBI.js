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
    }

    async getNextSequenceValue(sequenceName){
        var sequenceDocument = await this.counters().findOneAndUpdate({id: sequenceName},
            {$inc:{sequence_value:1}}, {upsert:true});
        console.log(sequenceDocument);
        return sequenceDocument.sequence_value;
    }

    async addPlayerToAuthMap(authId, playerId) {
        return await this.player_auth().insert({auth_id: authId, player_id: playerId});
    }

    async resolvePlayerId(auth_id) {
        const authEntry = await this.player_auth().findOne({auth_id: auth_id});
        return authEntry === null?null:authEntry.player_id;
    }

    async getWord() {
        return this.words().aggregate([{ $sample: { size: 1 } }]);
    }

    async getPlayerLastWord(player_id) {
        const value = await this.player_word().find({player_id:player_id}, {limit:1, sort:{word_id: -1}});
        if (value === null) {
            return null;
        }
        return value[0];
    }

    async addNewPlayerWord(player_id, word, expiration) {
        const wordId = await this.getNextSequenceValue("player#" + player_id + "_word");
        return this.player_word().insert({
            player_id: player_id,
            word_id:wordId,
            word: word,
            expiration: expiration
        })
    }

    async getPlayerTries(player_id, word_id) {
        return this.player_tries().findOneAndUpdate({id:player_id, word_id:word_id}, {$setOnInsert:{guesses:[]}}, {upsert:true});
    }

    async getPlayerChallengeTries(player_id, word_id) {
        return this.player_challenge_tries().findOneAndUpdate({id:player_id, word_id:word_id}, {$setOnInsert:{guesses:[]}}, {upsert:true});
    }

    async getOrCreateGlobalWord(timestamp, new_validity, new_word) {
        var new_word_id = await this.getNextSequenceValue("global_word")
        return this.global_word().findOneAndUpdate({validity:{$gt: timestamp}}, {$setOnInsert: {word:new_word, validity: new_validity, word_id: new_word_id}}, {upsert: true})
    }

    async increaseRank(player_id, word_id, tries, timestamp) {
        const rank =  this.db().get("word#" + word_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        return rank.findOneAndUpdate({player_id: player_id}, {$setOnInsert:{score: tries, time: timestamp}}, {upsert:true})
    }

    async getRanking(word_id) {
        const rank =  this.db().get("word#" + word_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        return rank.find({}, {sort: {score:1, time: 1}, limit:100})
    }

    async getRankingWithFilter(word_id, friends) {
        const rank =  this.db().get("word#" + word_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        return rank.find({playerId:{$in: friends}}, {sort: {score:1, time: 1}, limit:100})
    }

    async getGlobalWord(timestamp) {
        return this.global_word().findOne({validity:{$gt: timestamp}})
    }

    async getGlobalWordById(word_id) {
        return this.global_word().findOne({word_id:word_id})
    }

    async isWordValid(word) {
        return this.possible_words().findOne({word:word}).then(value => {return value != null});
    }

    async getPlayerTriesForWord(player_id, word_id) {
        return this.player_tries().findOne({id:player_id, word_id:word_id });
    }

    async getPlayerChallengeTriesForWord(player_id, word_id) {
        return this.player_challenge_tries().findOne({id:player_id, word_id:word_id });
    }

    async addChallengeGuess(player_id, word_id, guess) {
        return this.player_challenge_tries().findOneAndUpdate({id:player_id, word_id:word_id }, { $push: { guesses: guess} });
    }

    async addGuess(player_id, word_id, guess) {
        return this.player_tries().findOneAndUpdate({id:player_id, word_id:word_id }, { $push: { guesses: guess} });
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

    async getFirstCrossword() {
        try {
            return (await this.possible_crosswords().find())[0];
        }
        catch(error) {
            console.log(error)
            return null;
        }
    }
}

function createDBI() {
    return new WordleDBI();
}

module.exports = {
    createDBI
}