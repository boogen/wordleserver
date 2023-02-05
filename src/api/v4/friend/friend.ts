import express, { NextFunction } from 'express';
import utils from '../../../utils';
import Sentry from '@sentry/node';
import WordleDBI from '../DBI/DBI';
import AuthIdRequest from '../types/AuthIdRequest';
import AddFriendRequest from '../types/AddFriendRequest';
import { get_ranking, RankingReply } from '../ranking_common';
import { getProfile, resolvePlayerId } from '../DBI/player/player';
import { addFriend, addFriendCode, friendList } from '../DBI/friends/friends';
import { FriendController } from './friend_controller';

export const friend = express.Router();

const controller = new FriendController();

friend.post('/code', async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        res.json(await controller.getCode(value.auth_id))
    }
    catch(error) {
        next(error);
    }
})

friend.post('/add', async (req, res, next) => {
    try {
        const value = new AddFriendRequest(req);
        res.json(await controller.addFriend(value.auth_id, value.friend_code))
    }
    catch(error) {
        next(error);
    }
})


friend.post('/list', async (req, res, next) => {
    try {
        const value =new AuthIdRequest(req);
        res.json(await controller.friendList(value.auth_id))
    }
    catch(error) {
        next(error);
    }
})
