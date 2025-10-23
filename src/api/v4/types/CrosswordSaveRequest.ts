import AuthIdRequest from "./AuthIdRequest";
import express from 'express';

export default class CrosswordSaveRequest extends AuthIdRequest {
    row: number;
    column: number;
    letter: string;

    constructor(req:express.Request) {
        super(req);
        this.row = req.body.row;
        this.column = req.body.column;
        this.letter = req.body.letter;
    }
}

