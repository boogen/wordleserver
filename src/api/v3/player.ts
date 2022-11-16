import express from 'express';
import Sentry from '@sentry/node';
import ProfileRequest from './types/ProfileRequest';
import SetNickRequest from './types/SetNickRequest';
import Utils from '../../utils';
import WordleDBI from '../../DBI';
import {Stats} from '../../WordleStatsDBI'
import AuthIdRequest from './types/AuthIdRequest';
import SetSocialIdRequest from './types/SetSocialIdRequest';
import utils from '../../utils';
import { generateFriendCode } from './friend';

export const player = express.Router();

const dbi = new WordleDBI();
const stats:Stats = new Stats();

function makeid():string {
    return Utils.randomString(36);
}

player.post("/register", async (req, res, next) => {
    try {
        var authId = makeid();
        while (await dbi.isAuthIdUsed(authId)) {
            authId = makeid();
        }
        const playerId = await dbi.getNextSequenceValue("player_id");
        await dbi.addPlayerToAuthMap(authId, playerId);
        await stats.addRegistrationEvent(authId, playerId);
        res.json({message:'ok', authId: authId})
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});

player.post("/setNick", async (req, res, next) => {
    try {
        const value = new SetNickRequest(req);
        console.log(value.authId)
        const player_id:number = (await dbi.resolvePlayerId(value.authId));
        await dbi.setNick(player_id, value.nick, (nick:string) => res.json({message:'ok', profile: {nick: nick}}));
        await stats.addSetNickEvent(player_id, value.nick);
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});

player.post("/getNick", async (req:express.Request, res:express.Response, next) => {
    var value = new AuthIdRequest(req)
    const player_id = await dbi.resolvePlayerId(value.authId);
    const profile = await dbi.getProfile(player_id)
    res.json({message:"ok", nick:profile?.nick})
})

player.post("/setSocialId",  async (req:express.Request, res:express.Response, next) => {
    var value = new SetSocialIdRequest(req);
    const social_to_auth = await dbi.checkSocialId(value.authId, value.socialId);
    res.json({message:'ok', authId:social_to_auth!.authId})
})

player.post("/getProfile", async (req:express.Request, res:express.Response, next) => {
    try {
        const value = new ProfileRequest(req);
        const player_id = await dbi.resolvePlayerId(value.authId);
        console.log("Getting profile for player: " + value.player_id)
        const profile = await dbi.getProfile(value.player_id);
        const duel_stats = await dbi.getSpellingBeeDuelStats(player_id, value.player_id)
        const spelling_bee_stats = await dbi.getSpellingBeeStats(value.player_id)
        if (profile === null) {
            res.json({message: null});
            return;
        }
        var friendCode = await dbi.getFriendCode(player_id);
        while (!friendCode) {
            var generated_friend_code = generateFriendCode(7);
            friendCode = await dbi.addFriendCode(player_id, generated_friend_code);
        }
        res.json({message: 'ok', profile: {nick: profile.nick, duel_stats:Object.fromEntries(duel_stats.entries()), spelling_bee_stats:spelling_bee_stats, friend_code: friendCode}})
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
        const player_id = await dbi.resolvePlayerId(value.authId);
        const profile = await dbi.getProfile(player_id);
        const spelling_bee_stats = await dbi.getSpellingBeeStats(player_id)
        if (profile === null) {
            res.json({message: null});
            return;
        }
        res.json({message: 'ok', profile: {nick: profile.nick, spelling_bee_stats:spelling_bee_stats}})
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});
;
