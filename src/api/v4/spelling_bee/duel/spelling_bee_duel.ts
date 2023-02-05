import express, { NextFunction } from 'express';
import Sentry from '@sentry/node';
import { ALPHABET, processPlayerGuess, SpellingBeeReplyEnum } from '../spelling_bee_common';
import WordleDBI from '../../DBI/DBI';
import { Bee } from "../../DBI/spelling_bee/Bee";
import { LetterState } from "../../DBI/spelling_bee/LetterState";
import BaseGuessRequest from '../../types/BaseGuessRequest';
import { get_bot_id, get_nick } from '../../player/player_common';
import { ELO_COEFFICIENT, DUEL_DURATION, BOT_THRESHOLD, MATCH_ELO_DIFF, CHANCE_FOR_BOT } from '../../duel_settings';
import { Stats } from '../../../../WordleStatsDBI';
import { fromOtherSeasonRules, getDuelSeasonRules, LetterToBuy, SeasonRules } from '../../season_rules';
import { notifyAboutRankingChange } from '../../ranking';
import { addNewLetterToSpellingBeeDuel, addPlayerGuessInSpellingBeeDuel, addSpellingBeeDuelMatch, checkForExistingDuel, checkForUnfinishedDuel, getAllPlayerDuelsBeeIds, getBestResultPercentage, getDuelsForGivenBee, getLastSpellingBeeDuelOpponents, getRandomDuelBee, getSpellingBeeDuelMatch, markDuelAsFinished, startDuel } from '../../DBI/spelling_bee/duel/spelling_bee_duel';
import { SpellingBeeDuellGuess } from '../../DBI/spelling_bee/duel/SpellingBeeDuellGuess';
import { checkLimit, resolvePlayerId } from '../../DBI/player/player';
import { SpellingBeeDuel } from '../../DBI/spelling_bee/duel/SpellingBeeDuel';
import { getBeeById, getRandomBee } from '../../DBI/spelling_bee/model';
import AuthIdRequest from '../../types/AuthIdRequest';
import { SpellingBeeDuelController } from './spelling_bee_duel_controller';

export const spelling_bee_duel = express.Router();

const controller = new SpellingBeeDuelController();

spelling_bee_duel.post('/prematch', async (req:express.Request, res:express.Response, next:Function) => {
    try {
        const request = new AuthIdRequest(req);
        res.json(await controller.prematch(request.auth_id))
    }
    catch (error) {
        next(error);
    }
})

spelling_bee_duel.post('/start',  async (req:express.Request, res:express.Response, next:Function) => {
    try {
        const request = new AuthIdRequest(req);
        res.json(await controller.start(request.auth_id))
    }
    catch (error) {
        next(error);
    }
})

spelling_bee_duel.post('/guess', async (req, res, next) => {
    try {
        const request = new BaseGuessRequest(req);
        const guess = request.guess;
        res.json(await controller.guess(request.auth_id, guess))
    }
    catch(error) {
        next(error);
    }
})


spelling_bee_duel.post('/end',async (req:express.Request, res:express.Response, next:NextFunction) => {
    try {
        const request = new AuthIdRequest(req);
        res.json(await controller.end(request.auth_id))
    } catch (error) {
        next(error);
    }
})

spelling_bee_duel.post('/buy_letter',async (req, res, next) => {
    try {
        const request = new AuthIdRequest(req);
        res.json(await controller.buy_letter(request.auth_id))
    } catch (error) {
        next(error);
    }
})


