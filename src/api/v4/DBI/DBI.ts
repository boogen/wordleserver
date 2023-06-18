import monk, { ICollection, IMonkManager} from 'monk';
import { DEFAULT_ELO} from '../duel_settings';
import { SpellingBeeDuelMatch } from "./spelling_bee/duel/SpellingBeeDuelMatch";
import { Bee } from "./spelling_bee/Bee";
import { RankingEntry } from "./ranks/RankingEntry";
import { GlobalBee } from "./spelling_bee/GlobalBee";
import { PlayerCrosswordState } from "./crosswords/PlayerCrosswordState";
import { GlobalWord } from "./wordle/GlobalWord";
import { FriendCode } from "./friends/FriendCode";
import { Counter } from "./Counter";
import { PlayerAuth } from "./player/PlayerAuth";
import { Word } from './wordle/Word';
import { PlayerWord } from './wordle/PlayerWord';
import { PlayerTries } from './wordle/PlayerTries';
import { PlayerProfile } from './player/PlayerProfile';
import { PossibleCrossword } from './crosswords/PossibleCrossword';
import { GuessedWordsBee } from './spelling_bee/GuessedWordsBee';
import { SpellingBeeDuelEloRankEntry } from './spelling_bee/duel/SpellingBeeDuelEloRankEntry';
import { SocialToAuth } from './player/SocialToAuth';
import { SpellingBeeDuel } from './spelling_bee/duel/SpellingBeeDuel';
import { RawRankingEntry } from './ranks/RawRankingEntry';
import { getRank, getRankWithFilter, getScoreFromRank, updateRank } from './ranks/ranks';
import { PlayerLastLogin } from './player/PlayerLastLogin';
import { PlayerLimits } from './player/PlayerLimits';
import { PlayerLimitsModel } from './player/PlayerLimitsModel';

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
    global_bee():ICollection<GlobalBee> { return _db.get("global_bee_v2")}
    guessed_words_bee():ICollection<GuessedWordsBee> { return _db.get("guessed_words_bee_v2")}
    bees(noOfRequiredLetters:number):ICollection<Bee> {return _db.get("bees_v2_" + noOfRequiredLetters)}
    extra_bee_words():ICollection<Word> {return _db.get("bees_fallback")}
    spelling_bee_duels():ICollection<SpellingBeeDuel> {return _db.get("spelling_bee_duels_v2")}
    spelling_bee_elo_rank(rankTag:string):ICollection<SpellingBeeDuelEloRankEntry> {return _db.get("elo_rank_spelling_bee_duel_" + rankTag);}
    spelling_bee_duel_prematch():ICollection<SpellingBeeDuelMatch> { return _db.get("spelling_bee_duel_prematch_v2");}
    social_to_auth():ICollection<SocialToAuth> { return _db.get("social_to_auth")}
    player_login_timestamp():ICollection<PlayerLastLogin> { return _db.get("player_login_timestamp")}
    player_limits():ICollection<PlayerLimits> { return _db.get("player_limits")}
    limits_model():ICollection<PlayerLimitsModel> {return _db.get("player_limits_models") }
    bee_ranking(bee_id:number):ICollection<RawRankingEntry> {
        var rank = _db.get("bee#" + bee_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        return rank;
    }

    constructor() {
        this.friend_codes().createIndex({friend_code: 1}, {unique:true})
        this.friend_codes().createIndex({player_id: 1}, {unique:true})
        this.player_word().createIndex({word_id: 1, player_id:1}),
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
        for (var i = 1; i < 4; i++) {
            this.bees(i).createIndex({id:1}, {unique: true});
        }
        this.extra_bee_words().createIndex({word: 1}, {unique: true})
        this.spelling_bee_duels().createIndex({player_id: 1})
        this.spelling_bee_duels().createIndex({bee_id: 1})
        this.spelling_bee_duels().createIndex({bee_duel_id: 1}, {unique:true})
        this.spelling_bee_duel_prematch().createIndex({player_id:1})
        this.social_to_auth().createIndex({socialId:1}, {unique:true})
    }

    //SEQ

    async getNextSequenceValue(sequenceName:string):Promise<number> {
        var sequenceDocument = await this.counters().findOneAndUpdate({id: sequenceName},
            {$inc:{sequence_value:1}}, {upsert:true});
        console.log(sequenceDocument);
        return sequenceDocument!.sequence_value;
    }


    async updateSpellingBeeEloRank(player_id:number, score_delta:number, rankTag:string) {
        updateRank(this.spelling_bee_elo_rank(rankTag), player_id, score_delta);
    }

    async getSpellingBeeEloRankWithFilter(friends:number[], rankTag:string):Promise<RankingEntry[]> {
        return getRankWithFilter(this.spelling_bee_elo_rank(rankTag), {player_id:{$in:friends}});
    }

    async getSpellingBeeEloRank(rankTag:string):Promise<RankingEntry[]> {
        return getRank(this.spelling_bee_elo_rank(rankTag));
    }

    async getCurrentSpellingBeeElo(player_id:number, rankTag:string):Promise<number> {
        return getScoreFromRank(player_id, this.spelling_bee_elo_rank(rankTag), DEFAULT_ELO);
    }

    async getOpponentsFromSpellingBeeEloRank(player_id:number, maxDiff:number, positionDiff:number, rankTag:string):Promise<number[]> {
        const returnValue = await this.getSpellingBeeEloRank(rankTag);
        const playerRankingEntry:RankingEntry|undefined = returnValue.find(re => re.player_id === player_id);
        if (playerRankingEntry === undefined) {
            return [];
        }
        var opponentsByPosition = returnValue.filter(re => Math.abs(playerRankingEntry.position - re.position) <= positionDiff);
        var opponentsByElo = returnValue.filter(re => Math.abs(playerRankingEntry.score - re.score) <= maxDiff);
        var result = opponentsByElo.length > opponentsByPosition.length ? opponentsByElo : opponentsByPosition;

        return result.filter(re => re.player_id !== player_id).map(re => re.player_id);
    }

    async increaseBeeRank(player_id:number, bee_id:number, points_delta:number):Promise<RawRankingEntry> {
        return updateRank(this.bee_ranking(bee_id), player_id, points_delta)
    }

    async getBeePlayerPoints(player_id:number, bee_id:number) {
        return getScoreFromRank(player_id, this.bee_ranking(bee_id))
    }

    async getBeeRankingWithFilter(bee_id:number, friends:number[]):Promise<RankingEntry[]> {
        return await getRankWithFilter(this.bee_ranking(bee_id), {player_id:{$in:friends}});
    }

    async getBeeRanking(bee_id:number):Promise<RankingEntry[]> {
        return await getRank(this.bee_ranking(bee_id));
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

    async getWordleRankingWithFilter(word_id:number, friends:number[]) {
        const rank =  this.db().get("word#" + word_id + "_ranking");
        rank.createIndex({player_id: 1})
        rank.createIndex({score: 1});
        var rawRank = (await rank.find({player_id:{$in: friends}}, {sort: {score:1, time: 1}, limit:100}))
        var returnValue:RankingEntry[] = []
        var position = 0
        for (var entry of rawRank) {
            position += 1
            returnValue.push({score: entry.score, position: position, player_id: entry.player_id})
        }
        return returnValue

    }

    async increase_request_counter(path:string, last_midnight:number) {
        const stats =  this.db().get("request_stats_" + last_midnight);
        stats.findOneAndUpdate({path:path}, {$inc:{no_of_requests: 1}}, {upsert:true})
    }

}

