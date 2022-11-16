import AuthIdRequest from "./AuthIdRequest";
import joi from '@hapi/joi';
import express from 'express';

const addFriendSchema = joi.object({
    authId: joi.string().trim().required(),
    friend_code: joi.string().trim().required()
});

export default class AddFriendRequest extends AuthIdRequest {
    friend_code: string;
    constructor(req:express.Request) {
        addFriendSchema.validate(req.body)
        super(req)
        this.friend_code = req.body.friend_code;
    }
}