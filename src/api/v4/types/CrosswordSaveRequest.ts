import AuthIdRequest from "./AuthIdRequest";
import express from 'express';

export default class CrosswordSaveRequest extends AuthIdRequest {
    grid: string[][];

    constructor(req:express.Request) {
        super(req);
        this.grid = req.body.grid;
    }
}

