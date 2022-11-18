import express, { NextFunction } from "express";
import WordleDBI, { RankingEntry } from "../../DBI";
import { get_ranking, RankingReply } from "./ranking_common";
import AuthIdRequest from "./types/AuthIdRequest";

import Sentry from '@sentry/node';
import { CreateNotificationBody } from "onesignal-node/lib/types";
import { oneSignalClient } from "../../one_signal";
import { get_nick } from "./player_common";
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
    .filter(async e => await dbi.checkIfFriends(e.player_id, player_id))))
    .map(e => e.player_id)

    oneSignalClient.createNotification(
        createNotification(friendsToSendTo, (await get_nick(player_id, dbi)).nick, heading))
        .then(response => console.log(response.statusCode))
        .catch(e => console.log(e.body));
}

ranking.post('/spelling_bee_duel/global', async (req:express.Request, res:express.Response, next:NextFunction) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(request.auth_id);
        var rank = await dbi.getSpellingBeeEloRank();
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
        const player_id = await dbi.resolvePlayerId(request.auth_id);
        var friends = await dbi.friendList(player_id);
        friends.push(player_id)
        var rank = await dbi.getSpellingBeeEloRankWithFilter(friends);
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
        const player_id = await dbi.resolvePlayerId(value.auth_id);
        const timestamp = Date.now() / 1000;
        const bee = await dbi.getLettersForBee(timestamp);
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
        const player_id = await dbi.resolvePlayerId(value.auth_id);
        const timestamp = Date.now() / 1000;
        const bee = await dbi.getLettersForBee(timestamp);
        console.log("Bee id:" + bee);
        if (bee === null) {
            res.json(new RankingReply(undefined, []))
            return
        }
        var friends = await dbi.friendList(player_id);
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
        const player_id = await dbi.resolvePlayerId(value.auth_id);
        const timestamp = Date.now() / 1000;
        const wordEntry = await dbi.getGlobalWord(timestamp);
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
        const player_id = await dbi.resolvePlayerId(value.auth_id)

        const timestamp = Date.now() / 1000;
        const wordEntry = await dbi.getGlobalWord(timestamp);
        if (wordEntry === null) {
            res.json({message: 'ok', ranking:[]})
            return
        }
        var friends = await dbi.friendList(player_id);
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
