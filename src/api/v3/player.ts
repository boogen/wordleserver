import express from 'express';
import Sentry from '@sentry/node';
import AuthIdRequest from '../../types/AuthIdRequest';
import SetNickRequest from '../../types/SetNickRequest';
import Utils from '../../utils';
import WordleDBI from '../../DBI';
import {Stats} from '../../WordleStatsDBI'

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

player.post("/getProfile", async (req:express.Request, res:express.Response, next) => {
    try {
        const value = new AuthIdRequest(req);
        const player_id = await dbi.resolvePlayerId(value.authId);
        const profile = await dbi.getProfile(player_id);
        if (profile === null) {
            res.json({message: null});
            return;
        }
        res.json({message: 'ok', profile: {nick: profile.nick}})
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
});
