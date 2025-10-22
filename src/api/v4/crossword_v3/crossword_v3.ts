import express from 'express';
import * as Sentry from "@sentry/node"
import BaseGuessRequest from '../types/BaseGuessRequest';
import AuthIdRequest from '../types/AuthIdRequest';
import { CrosswordController } from './crossword_controller';
import CrosswordSaveRequest from '../types/CrosswordSaveRequest';

export const crossword_v3 = express.Router();
const controller = new CrosswordController();


crossword_v3.post('/save', async (req, res, next) => {
    try {
        const value = new CrosswordSaveRequest(req);
        res.json(await controller.save(value.auth_id, value.grid))
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
