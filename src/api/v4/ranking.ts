import express, { NextFunction } from "express";
import WordleDBI from "./DBI/DBI";
import { RankingEntry } from "./DBI/ranks/RankingEntry";
import { get_ranking, RankingReply } from "./ranking_common";
import AuthIdRequest from "./types/AuthIdRequest";

import Sentry from '@sentry/node';
import { CreateNotificationBody } from "onesignal-node/lib/types";
import { oneSignalClient } from "../../one_signal";
import { get_nick } from "./player_common";
import { checkIfFriends, friendList } from "./DBI/friends/friends";
import { resolvePlayerId } from "./DBI/player/player";
import { getLettersForBee } from "./DBI/spelling_bee/spelling_bee";
import { getGlobalWord } from "./DBI/wordle/wordle";
import { getDuelSeasonRules } from "./season_rules";
import { Console } from "@sentry/node/types/integrations";
const dbi = new WordleDBI();

export const ranking = express.Router();


function createNotification(playerIds:number[], playerNick:string, heading:string):CreateNotificationBody {
    return {
        contents: {
          'en': playerNick + ' wyprzedził Cię w rankingu',
        },
        headings: {
            'en': heading
        },
        include_external_user_ids:playerIds.map(id => id.toString())
      };
    }

export async function notifyAboutRankingChange(player_id:number, oldRank:RankingEntry[], oldPlayerScore:number, newPlayerScore:number, heading:string) {
    var friendsToSendTo = (await Promise.all(oldRank.filter(e => e.score > oldPlayerScore && e.score < newPlayerScore)
    .filter(async e => await checkIfFriends(e.player_id, player_id, dbi))))
    .map(e => e.player_id)

    oneSignalClient.createNotification(
        createNotification(friendsToSendTo, (await get_nick(player_id, dbi)).nick, heading))
        .then(response => console.log(response.statusCode))
        .catch(e => console.log(e.body));
}

ranking.post('/spelling_bee_duel/global', async (req:express.Request, res:express.Response, next:NextFunction) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await resolvePlayerId(request.auth_id, dbi);
        console.log("Duel tag:" + (await getDuelSeasonRules()).id!)
        var rank = await dbi.getSpellingBeeEloRank((await getDuelSeasonRules()).id!);
        res.json((await get_ranking(player_id, rank, dbi)));
    } catch (error) {
        console.log(error)
        next(error)
        Sentry.captureException(error);
    }

})

ranking.post('/spelling_bee_duel/friends', async (req:express.Request, res:express.Response, next:NextFunction) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await resolvePlayerId(request.auth_id, dbi);
        var friends = await friendList(player_id, dbi);
        friends.push(player_id)
        var rank = await dbi.getSpellingBeeEloRankWithFilter(friends, (await getDuelSeasonRules()).id!);
        res.json((await get_ranking(player_id, rank, dbi)));
    } catch (error) {
        console.log(error)
        next(error)
        Sentry.captureException(error);
    }

})

ranking.post('/spelling_bee/global', async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        const player_id = await resolvePlayerId(value.auth_id, dbi);
        const timestamp = Date.now() / 1000;
        const bee = await getLettersForBee(timestamp, dbi);
        console.log("Bee id:" + bee);
        if (bee === null) {
            res.json(new RankingReply(undefined, []))
            return
        }
        const ranking = await dbi.getBeeRanking(bee.bee_id)
        console.log(ranking);
        res.json((await get_ranking(player_id, ranking, dbi)))
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

ranking.post('/spelling_bee/friends', async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        const player_id = await resolvePlayerId(value.auth_id, dbi);
        const timestamp = Date.now() / 1000;
        const bee = await getLettersForBee(timestamp, dbi);
        console.log("Bee id:" + bee);
        if (bee === null) {
            res.json(new RankingReply(undefined, []))
            return
        }
        var friends = await friendList(player_id, dbi);
        friends.push(player_id)
        const ranking = await dbi.getBeeRankingWithFilter(bee.bee_id, friends)
        console.log(ranking);
        res.json((await get_ranking(player_id, ranking, dbi)))
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

ranking.post('/wordle_daily_challenge/global', async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        const player_id = await resolvePlayerId(value.auth_id, dbi);
        const timestamp = Date.now() / 1000;
        const wordEntry = await getGlobalWord(timestamp, dbi);
        console.log(wordEntry)
        if (wordEntry === null) {
            res.json({message: 'ok', ranking:[]})
            return
        }
        const ranking = await dbi.getWordleRanking(wordEntry.word_id)
        res.json((await get_ranking(player_id, ranking, dbi)))
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

ranking.post('/wordle_daily_challenge/friends', async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        const player_id = await resolvePlayerId(value.auth_id, dbi)

        const timestamp = Date.now() / 1000;
        const wordEntry = await getGlobalWord(timestamp, dbi);
        if (wordEntry === null) {
            res.json({message: 'ok', ranking:[]})
            return
        }
        var friends = await friendList(player_id, dbi);
        friends.push(player_id)
        const ranking = await dbi.getWordleRankingWithFilter(wordEntry.word_id, friends)
        res.json((await get_ranking(player_id, ranking, dbi)))
    }
    catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})
