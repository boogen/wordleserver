import express from 'express';
import Sentry from '@sentry/node';
import ProfileRequest from './types/ProfileRequest';
import SetNickRequest from './types/SetNickRequest';
import Utils from '../../utils';
import WordleDBI from './DBI/DBI';
import {Stats} from '../../WordleStatsDBI'
import AuthIdRequest from './types/AuthIdRequest';
import SetSocialIdRequest from './types/SetSocialIdRequest';
import utils from '../../utils';
import { generateFriendCode } from './friend';
import { addPlayerToAuthMap, checkSocialId, getProfile, isAuthIdUsed, resolvePlayerId, setNick } from './DBI/player/player';
import { getSpellingBeeDuelStats } from './DBI/spelling_bee/duel/spelling_bee_duel';
import { getSpellingBeeStats } from './DBI/spelling_bee/spelling_bee';
import { addFriendCode, friendList, getFriendCode } from './DBI/friends/friends';

export const player = express.Router();

const dbi = new WordleDBI();
const stats:Stats = new Stats();

function makeid():string {
    return Utils.randomString(36);
}

export async function getPlayerProfile(akserId:number, playerId:number) {
    const profile = await getProfile(playerId, dbi);
    const duel_stats = await getSpellingBeeDuelStats(akserId, playerId, dbi)
    const spelling_bee_stats = await getSpellingBeeStats(playerId, dbi)
    if (profile === null) {
        return null;
    }
    var friendCode = await getFriendCode(playerId, dbi);
    while (!friendCode) {
        var generated_friend_code = generateFriendCode(7);
        friendCode = await addFriendCode(playerId, generated_friend_code, dbi);
    }
    var isFriend = (await friendList(akserId, dbi)).includes(playerId)
    return {nick: profile.nick, duel_stats:Object.fromEntries(duel_stats.entries()), spelling_bee_stats:spelling_bee_stats, friend_code: friendCode.friend_code, is_friend:isFriend};
}

player.post("/register", async (req, res, next) => {
    try {
        var authId = makeid();
        while (await isAuthIdUsed(authId, dbi)) {
            authId = makeid();
        }
        const playerId = await dbi.getNextSequenceValue("player_id");
        await addPlayerToAuthMap(authId, playerId, dbi);
        await stats.addRegistrationEvent(authId, playerId);
        res.json({message:'ok', auth_id: authId})
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});

player.post('/login',async (req, res, next) => {
    const value = new AuthIdRequest(req);
    const player_id:number = (await resolvePlayerId(value.auth_id, dbi));
    res.json({'message':'ok', 'player_id':player_id})
})

player.post("/setNick", async (req, res, next) => {
    try {
        const value = new SetNickRequest(req);
        console.log(value.auth_id)
        const player_id:number = (await resolvePlayerId(value.auth_id, dbi));
        await setNick(player_id, value.nick, (nick:string) => res.json({message:'ok', profile: {nick: nick}}), dbi);
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
    const player_id = await resolvePlayerId(value.auth_id, dbi);
    const profile = await getProfile(player_id, dbi)
    res.json({message:"ok", nick:profile?.nick})
})

player.post("/setSocialId",  async (req:express.Request, res:express.Response, next) => {
    var value = new SetSocialIdRequest(req);
    const social_to_auth = await checkSocialId(value.authId, value.socialId, dbi);
    res.json({message:'ok', authId:social_to_auth!.authId})
})

player.post("/getProfile", async (req:express.Request, res:express.Response, next) => {
    try {
        const value = new ProfileRequest(req);
        const player_id = await resolvePlayerId(value.auth_id, dbi);
        console.log("Getting profile for player: " + value.player_id)

        res.json({message: 'ok', profile: await getPlayerProfile(player_id, value.player_id)})
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
        const player_id = await resolvePlayerId(value.auth_id, dbi);
        const profile = await getProfile(player_id, dbi);
        const spelling_bee_stats = await getSpellingBeeStats(player_id, dbi)
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
