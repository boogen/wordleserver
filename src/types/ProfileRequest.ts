import joi from '@hapi/joi';
import express from 'express';

const profileSchema = joi.object({
    authId: joi.string().trim().required(),
    playerId: joi.number().integer().required()
});

export default class ProfileRequest {
    authId:string;
    playerId:number;

    constructor(req:express.Request) {
        profileSchema.validate(req.body);
        this.authId = req.body.authId;
        this.playerId = req.body.playerId;
    }
}

