import express from 'express';
import * as Sentry from "@sentry/node"
import { WordleChallengeController } from './wordle_challenge_controller';
import AuthIdRequest from '../../types/AuthIdRequest';
import BaseGuessRequest from '../../types/BaseGuessRequest';

const controller = new WordleChallengeController();

export const challenge = express.Router();


challenge.post('/getState', async (req, res, next) => {
    try {
        const request = new AuthIdRequest(req);
        res.json(await controller.getState(request.auth_id));
    } catch (error) {
        next(error);
    }

});

challenge.post('/validate', async (req, res, next) => {
    try {
        const request = new BaseGuessRequest(req);
        res.json(await controller.validate(request.auth_id, request.guess));
    } catch (error) {
        next(error);
    }
})

