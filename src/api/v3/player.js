const express = require('express');
const joi = require('@hapi/joi');
const router = express.Router();
const { id } = require('@hapi/joi/lib/base');
const dbi = require('../../DBI.js').createDBI();
const utils = require('./utils');

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

module.exports = router;