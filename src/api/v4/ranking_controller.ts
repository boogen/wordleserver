import WordleDBI from "./DBI/DBI";
import { get_ranking, RankingReply } from "./ranking_common";
import { friendList } from "./DBI/friends/friends";
import { resolvePlayerId } from "./DBI/player/player";
import { getLettersForBee } from "./DBI/spelling_bee/spelling_bee";
import { getGlobalWord } from "./DBI/wordle/wordle";
import { SeasonRulesService } from "./season_rules";
import { inject, injectable } from "inversify";
import { BodyProp, Post, Route } from "tsoa";
import { Logger } from "../../logger";

@injectable()
@Route("api/v4/ranking")
export class RankingController {
    constructor(
        @inject(WordleDBI) private dbi: WordleDBI,
        @inject(Logger) private logger: Logger,
        @inject(SeasonRulesService) private seasonRulesService: SeasonRulesService
    ) {
        logger.setContext("RankingController");
    }

    @Post('/spelling_bee_duel/global')
    public async spellingBeeDuelGlobal(@BodyProp() auth_id:string):Promise<RankingReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        const duelSeasonRules = await this.seasonRulesService.getDuelSeasonRules();
        this.logger.info("Duel tag:" + duelSeasonRules.id!)
        var rank = await this.dbi.getSpellingBeeEloRank(duelSeasonRules.id!);
        return await get_ranking(player_id, rank, this.dbi);
}

    @Post('/spelling_bee_duel/friends')
    public async spellingBeeDuelFriends(@BodyProp() auth_id:string):Promise<RankingReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        var friends = await friendList(player_id, this.dbi);
        friends.push(player_id)
        var rank = await this.dbi.getSpellingBeeEloRankWithFilter(friends, (await this.seasonRulesService.getDuelSeasonRules()).id!);
        return await get_ranking(player_id, rank, this.dbi);
    }

    @Post('/spelling_bee/global')
    public async spellingBeeGlobal(@BodyProp() auth_id:string):Promise<RankingReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        const timestamp = Date.now() / 1000;
        const bee = await getLettersForBee(timestamp, this.dbi);
        this.logger.info("Bee id:" + bee);
        if (bee === null) {
            return new RankingReply(undefined, []);
        }
        const ranking = await this.dbi.getBeeRanking(bee.bee_id)
        this.logger.info(`Ranking: ${ranking}`);
        return await get_ranking(player_id, ranking, this.dbi);
   }

    @Post('/spelling_bee/friends')
    public async spellingBeeFriends(@BodyProp() auth_id:string):Promise<RankingReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        const timestamp = Date.now() / 1000;
        const bee = await getLettersForBee(timestamp, this.dbi);
        this.logger.info("Bee id:" + bee);
        if (bee === null) {
            return new RankingReply(undefined, []);
        }
        var friends = await friendList(player_id, this.dbi);
        friends.push(player_id)
        const ranking = await this.dbi.getBeeRankingWithFilter(bee.bee_id, friends)
        this.logger.info(`Ranking: ${ranking}`);
        return await get_ranking(player_id, ranking, this.dbi);
    }

    @Post('/wordle_daily_challenge/global')
    public async wordleDailyChallengeGlobal(@BodyProp() auth_id:string):Promise<RankingReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        const timestamp = Date.now() / 1000;
        const wordEntry = await getGlobalWord(timestamp, this.dbi);
        this.logger.info(`Word entry: ${wordEntry}`);
        if (wordEntry === null) {
            return new RankingReply(undefined, []);
        }
        const ranking = await this.dbi.getWordleRanking(wordEntry.word_id)
        return await get_ranking(player_id, ranking, this.dbi);
    }

    @Post('/wordle_daily_challenge/friends')
    public async wordleDailyChallengeFriends(@BodyProp() auth_id:string):Promise<RankingReply> {
        const player_id = await resolvePlayerId(auth_id, this.dbi);
        const timestamp = Date.now() / 1000;
        const wordEntry = await getGlobalWord(timestamp, this.dbi);
        if (wordEntry === null) {
            return new RankingReply(undefined, []);
        }
        var friends = await friendList(player_id, this.dbi);
        friends.push(player_id)
        const ranking = await this.dbi.getWordleRankingWithFilter(wordEntry.word_id, friends)
        return await get_ranking(player_id, ranking, this.dbi);
    }
}