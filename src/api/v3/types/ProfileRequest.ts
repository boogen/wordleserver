import joi from '@hapi/joi';
import express from 'express';
import AuthIdRequest from './AuthIdRequest';

const profileSchema = joi.object({
    authId: joi.string().trim().required(),
    playerId: joi.number().integer().required()
});

export default class ProfileRequest extends AuthIdRequest {
    player_id:number;

    constructor(req:express.Request) {
        super(req);
        profileSchema.validate(req.body);
        this.player_id = Number.parseInt(req.body.player_id);
    }
}

