import express from 'express';
import * as Sentry from "@sentry/node"
import BaseGuessRequest from '../types/BaseGuessRequest';
import AuthIdRequest from '../types/AuthIdRequest';
import { CrosswordController } from './crossword_controller';

export const crossword_v3 = express.Router();
const controller = new CrosswordController();


crossword_v3.post('/guess', async (req, res, next) => {
    try {
        const value = new BaseGuessRequest(req);
        res.json(await controller.guess(value.auth_id, value.guess))
    }
    catch (error) {
        next(error);
    }
});


crossword_v3.post('/init', async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        res.json(await controller.init(value.auth_id));
    }
    catch (error) {
        next(error);
    }
});
