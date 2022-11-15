import AuthIdRequest from "./AuthIdRequest";
import express from 'express';

export default class BaseGuessRequest extends AuthIdRequest {
    guess:string;

    constructor(req:express.Request) {
        super(req);
        this.guess = req.body.word;
    }
}

