import express from 'express';
import Sentry from '@sentry/node';
import WordleDBI from '../DBI/DBI';
import { RankingEntry } from "../DBI/ranks/RankingEntry";
import AuthIdRequest from '../types/AuthIdRequest';
import BaseGuessRequest from '../types/BaseGuessRequest';
import { string } from '@hapi/joi';
import { Stats } from '../../../WordleStatsDBI';
import { getWord, isWordValid } from '../DBI/wordle/model';
import { getProfile, resolvePlayerId } from '../DBI/player/player';
import { addGuess, getGlobalWord, getOrCreateGlobalWord, getPlayerTries, getPlayerTriesForWord } from '../DBI/wordle/wordle';
import { WordleController } from './wordle_controller';


export const wordle = express.Router();
const controller = new WordleController();

wordle.post('/getState', async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        res.json(await controller.getState(value.auth_id))
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }

});

wordle.post('/validate', async (req, res, next) => {
    try {
        const value = new BaseGuessRequest(req);
        res.json(await controller.validateGuess(value.auth_id, value.guess))
    } catch (error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})


async function getMyPositionInRank(player_id:number, rank:RankingEntry[], dbi:WordleDBI) {
    for (const index in rank) {
        const rankEntry = rank[index]
        if (rankEntry.player_id === player_id) {
            return {position: parseInt(index) + 1, score: rankEntry.score, player: (((await getProfile(player_id, dbi)))|| {nick: null}).nick}
        }
    }
    return null;
}

