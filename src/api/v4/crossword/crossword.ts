import express from 'express';
import * as Sentry from "@sentry/node"
import BaseGuessRequest from '../types/BaseGuessRequest';
import AuthIdRequest from '../types/AuthIdRequest';
import { CrosswordController } from './crossword_controller';

export const crossword = express.Router();
const controller = new CrosswordController();

crossword.post('/mock', async (req, res, next) => {
    try {
        res.json(await controller.mock())
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});

crossword.post('/guess', async (req, res, next) => {
    try {
        const value = new BaseGuessRequest(req);
        res.json(await controller.guess(value.auth_id, value.guess))
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});


crossword.post('/init', async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        res.json(await controller.init(value.auth_id));
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
    
});
