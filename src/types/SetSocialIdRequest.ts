import joi from '@hapi/joi';
import express from 'express';

const socialIdRequestSchema = joi.object({
    authId: joi.string().trim().required(),
    socialId: joi.string().trim().required()
});

export default class SetSocialIdRequest {
    authId:string;
    socialId:string;

    constructor(req:express.Request) {
        socialIdRequestSchema.validate(req.body);
        this.authId = req.body.authId;
        this.socialId = req.body.socialId;
    }
}

