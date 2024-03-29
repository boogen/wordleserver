import joi from '@hapi/joi';
import express from 'express';

const authIdSchema = joi.object({
    auth_id: joi.string().trim().required()
});

export default class AuthIdRequest {
    auth_id:string;

    constructor(req:express.Request) {
        authIdSchema.validate(req.body);
        this.auth_id = req.body.auth_id;
    }
}

