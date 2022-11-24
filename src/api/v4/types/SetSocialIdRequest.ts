import joi from '@hapi/joi';
import express from 'express';

const socialIdRequestSchema = joi.object({
    authId: joi.string().trim().required(),
    socialId: joi.string().trim().required()
});

export default class SetSocialIdRequest {
    auth_id:string;
    socialId:string;

    constructor(req:express.Request) {
        socialIdRequestSchema.validate(req.body);
        this.auth_id = req.body.authId;
        this.socialId = req.body.socialId;
    }
}

