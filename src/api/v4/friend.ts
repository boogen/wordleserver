import express, { NextFunction } from 'express';
import utils from '../../utils';
import Sentry from '@sentry/node';
import WordleDBI from './DBI/DBI';
import AuthIdRequest from './types/AuthIdRequest';
import AddFriendRequest from './types/AddFriendRequest';
import { getPlayerProfile } from './player';
import { get_ranking, RankingReply } from './ranking_common';
import { getProfile, resolvePlayerId } from './DBI/player/player';
import { addFriend, addFriendCode, friendList } from './DBI/friends/friends';

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
        const player_id = await resolvePlayerId(value.auth_id, dbi);
        var friend_code = null;
        var generated_friend_code = null;
        do {
            generated_friend_code = generateFriendCode(7);
            console.log(generated_friend_code)
        } while ((friend_code = await addFriendCode(player_id, generated_friend_code, dbi)));
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
        const player_id = await resolvePlayerId(value.auth_id, dbi);
        if (await addFriend(player_id, value.friend_code, dbi)) {
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
        const player_id = await resolvePlayerId(value.auth_id, dbi);
        var playerFriendList = await friendList(player_id, dbi);

        res.json({
            status: "ok",
            friend_list: await Promise.all(playerFriendList.map(async (friendId) => { return { player_id: friendId, nick: (await getProfile(friendId, dbi))!.nick }; }))
        })
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})
