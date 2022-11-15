import BaseGuessRequest from "./BaseGuessRequest"
import joi from '@hapi/joi';
import express from 'express';

const guessSchema = joi.object({
    authId: joi.string().trim().required(),
    word: joi.string().trim().required(),
    duelId: joi.number().required()
})

export default class SpellingBeeGuessRequest extends BaseGuessRequest {
    duelId:number;

    constructor(req:express.Request) {
        const o = guessSchema.validate(req.body);
        super(req);
        this.duelId = req.body.duelId;
    }
}