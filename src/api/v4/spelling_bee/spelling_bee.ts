import express from 'express';
import * as Sentry from "@sentry/node"
import { getMaxPoints, wordPoints, SpellingBeeStateReply, SpellingBeeReplyEnum, SuccessfullSpellingBeeStateReply, checkSpellingBeeGuess, JOKER, ALPHABET, getNewLetterState, checkGuessForIncorrectLetters, wordPointsSeason, processPlayerGuess} from './spelling_bee_common';
import * as fs from 'fs';
import { CreateNotificationBody } from 'onesignal-node/lib/types';
import { SpellingBeeController } from './spelling_bee_controller';
import AuthIdRequest from '../types/AuthIdRequest';
import SpellingBeeGuessRequest from '../types/SpellingBeeGuessRequest';

export const spelling_bee = express.Router();

const controller = new SpellingBeeController()

spelling_bee.post('/getState', async (req, res, next) => {
    try {
        const request = new AuthIdRequest(req);
        res.json(await controller.getState(request.auth_id));
    } catch (error) {
        next(error);
    }
});

spelling_bee.post('/season_info',async (req, res, next) => {
    try {
        res.json(await controller.getSeasonRules());
    } catch (error) {
        next(error);
    }
})

spelling_bee.post('/guess', async (req, res, next) => {
    try {
        const request = new SpellingBeeGuessRequest(req);
        res.json(await controller.guess(request.auth_id, request.guess))
    } catch (error) {
        next(error);
    }
});

spelling_bee.post('/buy_letter',async (req, res, next) => {
    try {
        const request = new AuthIdRequest(req);
        res.json(await controller.buy_letter(request.auth_id));
    } catch (error) {
        next(error);
    }
})

