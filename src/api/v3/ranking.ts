import express, { NextFunction } from "express";
import WordleDBI from "../../DBI";
import { get_ranking, RankingReply } from "./ranking_common";
import AuthIdRequest from "./types/AuthIdRequest";

import Sentry from '@sentry/node';
const dbi = new WordleDBI();

export const ranking = express.Router();

ranking.post('/spelling_bee_duel/global', async (req:express.Request, res:express.Response, next:NextFunction) => {
    try {
        const request = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(request.authId);
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
        const player_id = await dbi.resolvePlayerId(request.authId);
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
        const player_id = await dbi.resolvePlayerId(value.authId);
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
        const player_id = await dbi.resolvePlayerId(value.authId);
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
        const player_id = await dbi.resolvePlayerId(value.authId);
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
        const player_id = await dbi.resolvePlayerId(value.authId)

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
