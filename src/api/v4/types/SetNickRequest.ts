import AuthIdRequest from "./AuthIdRequest";
import express from 'express';
import joi from '@hapi/joi';

const setNickSchema = joi.object({
    auth_id: joi.string().trim().required(),
    nick: joi.string().trim().required()
});

export default class SetNickRequest extends AuthIdRequest {
    nick:string;

    constructor(req:express.Request) {
        setNickSchema.validate(req);
        super(req);
        this.nick = req.body.nick;
    }
}