import monk, { ICollection, IMonkManager } from 'monk';
import { DEFAULT_ELO } from '../duel_settings';
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
import { PossibleCrosswordV3, GlobalCrossword } from './crosswords_v3/model';
import { PlayerCrosswordV3State } from './crosswords_v3/state';
import { injectable } from 'inversify';
import { WordExplanation } from '../../../wordExplainers/word_explanation';

@injectable()
export default class WordleDBI {
    private readonly _db: IMonkManager;
    private readonly indexedCollections = new Set<string>();

    constructor() {
        this._db = monk(process.env.MONGO_URI!);
        this.friendCodes().createIndex({ friend_code: 1 }, { unique: true });
        this.friendCodes().createIndex({ player_id: 1 }, { unique: true });
        this.playerWord().createIndex({ word_id: 1, player_id: 1 });
        this.playerAuth().createIndex({ auth_id: 1 }, { unique: true });
        this.playerProfile().createIndex({ id: 1 }, { unique: true });
        this.globalWord().createIndex({ validity: 1 }, { unique: true });
        this.globalWord().createIndex({ word_id: 1 }, { unique: true });
        this.playerChallengeTries().createIndex({ word_id: 1, id: 1 }, { unique: true });
        this.playerCrosswordState().createIndex({ player_id: 1 }, { unique: true });
        this.globalBee().createIndex({ validity: 1 }, { unique: true });
        this.globalBee().createIndex({ bee_id: 1 }, { unique: true });
        this.guessedWordsBee().createIndex({ player_id: 1, bee_id: 1 }, { unique: true });
        for (let i = 1; i < 4; i++) {
            this.bees(i).createIndex({ id: 1 }, { unique: true });
        }
        this.extraBeeWords().createIndex({ word: 1 }, { unique: true });
        this.spellingBeeDuels().createIndex({ player_id: 1 });
        this.spellingBeeDuels().createIndex({ bee_id: 1 });
        this.spellingBeeDuels().createIndex({ bee_duel_id: 1 }, { unique: true });
        this.spellingBeeDuelPrematch().createIndex({ player_id: 1 });
        this.socialToAuth().createIndex({ socialId: 1 }, { unique: true });
        this.wordsExplanations().createIndex({ word: 1 }, { unique: true });
    }

    db(): IMonkManager { return this._db; }

    words(): ICollection<Word> { return this._db.get("words"); }
    playerWord(): ICollection<PlayerWord> { return this._db.get("player_word"); }
    possibleWords(): ICollection<Word> { return this._db.get("possible_words"); }
    playerTries(): ICollection<PlayerTries> { return this._db.get("player_tries"); }
    playerChallengeTries(): ICollection<PlayerTries> { return this._db.get("player_challenge_tries"); }
    playerAuth(): ICollection<PlayerAuth> { return this._db.get("player_auth"); }
    counters(): ICollection<Counter> { return this._db.get("counters"); }
    friendCodes(): ICollection<FriendCode> { return this._db.get("friend_codes"); }
    playerProfile(): ICollection<PlayerProfile> { return this._db.get("player_profile"); }
    globalWord(): ICollection<GlobalWord> { return this._db.get("global_word"); }
    possibleCrosswords(): ICollection<PossibleCrossword> { return this._db.get("possible_crosswords_v2"); }
    possibleCrosswordsV3(mode: string): ICollection<PossibleCrosswordV3> { return this._db.get("possible_crosswords_v3." + mode); }
    crosswordV3(): ICollection<GlobalCrossword> { return this._db.get("crossword_v3"); }
    playerCrosswordState(): ICollection<PlayerCrosswordState> { return this._db.get("player_crossword_state"); }
    playerCrosswordV3State(): ICollection<PlayerCrosswordV3State> { return this._db.get("player_crossword_v3_state"); }
    globalBee(): ICollection<GlobalBee> { return this._db.get("global_bee_v2"); }
    guessedWordsBee(): ICollection<GuessedWordsBee> { return this._db.get("guessed_words_bee_v2"); }
    bees(noOfRequiredLetters: number): ICollection<Bee> { return this._db.get("bees_v2_" + noOfRequiredLetters); }
    extraBeeWords(): ICollection<Word> { return this._db.get("bees_fallback"); }
    spellingBeeDuels(): ICollection<SpellingBeeDuel> { return this._db.get("spelling_bee_duels_v2"); }
    spellingBeeEloRank(rankTag: string): ICollection<SpellingBeeDuelEloRankEntry> { return this._db.get("elo_rank_spelling_bee_duel_" + rankTag); }
    spellingBeeDuelPrematch(): ICollection<SpellingBeeDuelMatch> { return this._db.get("spelling_bee_duel_prematch_v2"); }
    socialToAuth(): ICollection<SocialToAuth> { return this._db.get("social_to_auth"); }
    playerLoginTimestamp(): ICollection<PlayerLastLogin> { return this._db.get("player_login_timestamp"); }
    playerLimits(): ICollection<PlayerLimits> { return this._db.get("player_limits"); }
    limitsModel(): ICollection<PlayerLimitsModel> { return this._db.get("player_limits_models"); }
    wordsExplanations(): ICollection<WordExplanation> { return this._db.get("word_explanations"); }

    private beeRanking(beeId: number): ICollection<RawRankingEntry> {
        const name = "bee#" + beeId + "_ranking";
        const rank = this._db.get<RawRankingEntry>(name);
        if (!this.indexedCollections.has(name)) {
            this.indexedCollections.add(name);
            rank.createIndex({ player_id: 1 });
            rank.createIndex({ score: 1 });
        }
        return rank;
    }

    private wordleRanking(wordId: number): ICollection<RawRankingEntry> {
        const name = "word#" + wordId + "_ranking";
        const rank = this._db.get<RawRankingEntry>(name);
        if (!this.indexedCollections.has(name)) {
            this.indexedCollections.add(name);
            rank.createIndex({ player_id: 1 });
            rank.createIndex({ score: 1 });
        }
        return rank;
    }

    private toRankingEntries(rawRank: RawRankingEntry[]): RankingEntry[] {
        return rawRank.map((entry, index) => ({
            score: entry.score,
            position: index + 1,
            player_id: entry.player_id,
        }));
    }

    // SEQ

    async getNextSequenceValue(sequenceName: string): Promise<number> {
        const sequenceDocument = await this.counters().findOneAndUpdate(
            { id: sequenceName },
            { $inc: { sequence_value: 1 } },
            { upsert: true, returnOriginal: false }
        );
        if (!sequenceDocument) {
            const newDoc = await this.counters().findOne({ id: sequenceName });
            return newDoc!.sequence_value;
        }
        return sequenceDocument.sequence_value;
    }

    // Spelling Bee ELO

    async updateSpellingBeeEloRank(playerId: number, scoreDelta: number, rankTag: string): Promise<void> {
        await updateRank(this.spellingBeeEloRank(rankTag), playerId, scoreDelta);
    }

    async getSpellingBeeEloRankWithFilter(friends: number[], rankTag: string): Promise<RankingEntry[]> {
        return getRankWithFilter(this.spellingBeeEloRank(rankTag), { player_id: { $in: friends } });
    }

    async getSpellingBeeEloRank(rankTag: string): Promise<RankingEntry[]> {
        return getRank(this.spellingBeeEloRank(rankTag));
    }

    async getCurrentSpellingBeeElo(playerId: number, rankTag: string): Promise<number> {
        return getScoreFromRank(playerId, this.spellingBeeEloRank(rankTag), DEFAULT_ELO);
    }

    async getOpponentsFromSpellingBeeEloRank(playerId: number, maxDiff: number, positionDiff: number, rankTag: string): Promise<number[]> {
        const rankings = await this.getSpellingBeeEloRank(rankTag);
        const playerEntry = rankings.find(re => re.player_id === playerId);
        if (playerEntry === undefined) {
            return [];
        }
        const byPosition = rankings.filter(re => Math.abs(playerEntry.position - re.position) <= positionDiff);
        const byElo = rankings.filter(re => Math.abs(playerEntry.score - re.score) <= maxDiff);
        const result = byElo.length > byPosition.length ? byElo : byPosition;
        return result.filter(re => re.player_id !== playerId).map(re => re.player_id);
    }

    // Bee ranking

    async increaseBeeRank(playerId: number, beeId: number, pointsDelta: number): Promise<RawRankingEntry> {
        return updateRank(this.beeRanking(beeId), playerId, pointsDelta);
    }

    async getBeePlayerPoints(playerId: number, beeId: number) {
        return getScoreFromRank(playerId, this.beeRanking(beeId));
    }

    async getBeeRankingWithFilter(beeId: number, friends: number[]): Promise<RankingEntry[]> {
        return getRankWithFilter(this.beeRanking(beeId), { player_id: { $in: friends } });
    }

    async getBeeRanking(beeId: number): Promise<RankingEntry[]> {
        return getRank(this.beeRanking(beeId));
    }

    // Wordle ranking

    async increaseRank(playerId: number, wordId: number, tries: number, timestamp: number) {
        return this.wordleRanking(wordId).findOneAndUpdate(
            { player_id: playerId },
            { $setOnInsert: { score: tries, time: timestamp } },
            { upsert: true }
        );
    }

    async getWordleRanking(wordId: number): Promise<RankingEntry[]> {
        const rawRank = await this.wordleRanking(wordId).find({}, { sort: { score: 1, time: 1 }, limit: 100 });
        return this.toRankingEntries(rawRank);
    }

    async getWordleRankingWithFilter(wordId: number, friends: number[]): Promise<RankingEntry[]> {
        const rawRank = await this.wordleRanking(wordId).find({ player_id: { $in: friends } }, { sort: { score: 1, time: 1 }, limit: 100 });
        return this.toRankingEntries(rawRank);
    }

    async increaseRequestCounter(path: string, lastMidnight: number): Promise<void> {
        const stats = this._db.get("request_stats_" + lastMidnight);
        await stats.findOneAndUpdate({ path }, { $inc: { no_of_requests: 1 } }, { upsert: true });
    }

    async saveWordExplanation(word: string, exp: string): Promise<void> {
        await this.wordsExplanations().update({ word }, { $set: { explanation: exp } }, { upsert: true });
    }

    async getWordExplanation(word: string): Promise<string | null> {
        const result = await this.wordsExplanations().findOne({ word });
        return result ? result.explanation : null;
    }
}
