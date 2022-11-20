import joi from '@hapi/joi';
import express from 'express';

const authIdSchema = joi.object({
    authId: joi.string().trim().required()
});

export default class AuthIdRequest {
    authId:string;

    constructor(req:express.Request) {
        authIdSchema.validate(req.body);
        this.authId = req.body.authId;
    }
}

