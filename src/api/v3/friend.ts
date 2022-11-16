import express from 'express';
import utils from '../../utils';
import Sentry from '@sentry/node';
import WordleDBI from '../../DBI';
import AuthIdRequest from './types/AuthIdRequest';
import AddFriendRequest from './types/AddFriendRequest';
import { getProfile } from './player';

export const friend = express.Router();
const dbi = new WordleDBI();

export function generateFriendCode(length:number):string {
    var text = "";
    var possible = "0123456789";

    for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

friend.post('/code', async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(value.authId);
        var friend_code = null;
        var generated_friend_code = null;
        do {
            generated_friend_code = generateFriendCode(7);
            console.log(generated_friend_code)
        } while ((friend_code = await dbi.addFriendCode(player_id, generated_friend_code)));
        res.json({
            status: "ok",
            friendCode: friend_code
        })
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

friend.post('/add', async (req, res, next) => {
    try {
        const value = new AddFriendRequest(req);
        const player_id = await dbi.resolvePlayerId(value.authId);
        if (await dbi.addFriend(player_id, value.friend_code)) {
            res.json({
                status: "ok"
            })
        }
        else {
            res.json({
                status: "failed"
            })
        }
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

friend.post('/list', async (req, res, next) => {
    try {
        const value =new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(value.authId);
        var friendList = await dbi.friendList(player_id);
        res.json({
            status: "ok",
            friendList: friendList.map(friendId => getProfile(player_id, friendId))
        })
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})
