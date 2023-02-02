import express from 'express';
import Sentry from '@sentry/node';
import ProfileRequest from '../types/ProfileRequest';
import SetNickRequest from '../types/SetNickRequest';
import Utils from '../../../utils';
import WordleDBI from '../DBI/DBI';
import {Stats} from '../../../WordleStatsDBI'
import AuthIdRequest from '../types/AuthIdRequest';
import SetSocialIdRequest from '../types/SetSocialIdRequest';
import utils from '../../../utils';
import { generateFriendCode } from '../friend/friend_controller';
import { addPlayerToAuthMap, checkSocialId, getLastLoginTimestamp, getPlayerLimits, getProfile, isAuthIdUsed, resetPlayerLimits, resolvePlayerId, setNick, updateLastLoginTimestamp } from '../DBI/player/player';
import { getSpellingBeeDuelStats } from '../DBI/spelling_bee/duel/spelling_bee_duel';
import { getSpellingBeeStats } from '../DBI/spelling_bee/spelling_bee';
import { addFriendCode, friendList, getFriendCode } from '../DBI/friends/friends';
import { PlayerLimits } from '../DBI/player/PlayerLimits';
import { PlayerController } from './player_controller';

export const player = express.Router();


const controller = new PlayerController();

player.post("/register", async (req, res, next) => {
    try {
        res.json(await controller.register())
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});

player.post('/login',async (req, res, next) => {
    try {
        const value = new AuthIdRequest(req);
        res.json(await controller.login(value.auth_id))
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }

})

player.post("/setNick", async (req, res, next) => {
    try {
        const value = new SetNickRequest(req);
        res.json(await controller.setNick(value.auth_id, value.nick))
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});

player.post("/getNick", async (req:express.Request, res:express.Response, next) => {
    try {
        var value = new SetSocialIdRequest(req);
        res.json(await controller.getNick(value.auth_id))
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

player.post("/setSocialId",  async (req:express.Request, res:express.Response, next) => {
    try {
        var value = new SetSocialIdRequest(req);
        res.json(await controller.setSocialId(value.auth_id, value.socialId))
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

player.post("/getProfile", async (req:express.Request, res:express.Response, next) => {
    try {
        const value = new ProfileRequest(req);
        res.json(await controller.getProfile(value.auth_id, value.player_id))
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

player.post("/getMyProfile", async (req:express.Request, res:express.Response, next) => {
    try {
        const value = new AuthIdRequest(req);
        res.json(await controller.getMyProfile(value.auth_id))
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});
;
