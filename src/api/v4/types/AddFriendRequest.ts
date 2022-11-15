import AuthIdRequest from "./AuthIdRequest";
import joi from '@hapi/joi';
import express from 'express';

const addFriendSchema = joi.object({
    auth_id: joi.string().trim().required(),
    friendCode: joi.string().trim().required()
});

export default class AddFriendRequest extends AuthIdRequest {
    friendCode: string;
    constructor(req:express.Request) {
        addFriendSchema.validate(req.body)
        super(req)
        this.friendCode = req.body.friendCode;
    }
}