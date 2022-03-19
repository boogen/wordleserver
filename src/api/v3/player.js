const express = require('express');
const joi = require('@hapi/joi');
const router = express.Router();
const { id } = require('@hapi/joi/lib/base');
const dbi = require('../../DBI.js').createDBI();
const utils = require('./utils');
const setNickSchema = joi.object({
    authId: joi.string().trim().required(),
    nick: joi.string().trim().required()
});

const authIdSchema = joi.object({
    authId: joi.string().trim().required()
});

function makeid() {
    return utils.randomString(36);
}

router.post("/register", async (req, res, next) => {
    var authId = makeid();
    while (await dbi.resolvePlayerId(authId)) {
        authId = makeid();
    }
    const playerId = await dbi.getNextSequenceValue("player_id");
    await dbi.addPlayerToAuthMap(authId, playerId);
    res.json({message:'ok', authId: authId})
});

router.post("/setNick", async (req, res, next) => {
    const value = await setNickSchema.validateAsync(req.body);
    const player_id = await dbi.resolvePlayerId(value.authId);
    const profile = await dbi.setNick(player_id, value.nick)
    res.json({message:'ok', profile: {nick: profile.nick}})
});

router.post("/getProfile", async (req, res, next) => {
    const value = await authIdSchema.validateAsync(req.body);
    const player_id = await dbi.resolvePlayerId(value.authId);
    const profile = await dbi.getProfile(player_id);
    if (profile === null) {
        res.json({message: null});
        return;
    }
    res.json({message: 'ok', profile: {nick: profile.nick}})
});

module.exports = router;