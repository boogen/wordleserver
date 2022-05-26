const express = require('express');
const joi = require('@hapi/joi');
const router = express.Router();
const { id } = require('@hapi/joi/lib/base');
const dbi = require('../../DBI.js').createDBI();
const utils = require('./utils');
const Sentry = require('@sentry/node');

const addFriendSchema = joi.object({
    authId: joi.string().trim().required(),
    friendCode: joi.string().trim().required()
});

const authIdSchema = joi.object({
    authId: joi.string().trim().required()
});

router.post('/code', async (req, res, next) => {
    try {
        const value = await authIdSchema.validateAsync(req.body);
        const player_id = await dbi.resolvePlayerId(value.authId);
        var friend_code = null;
        var generated_friend_code = null;
        do {
            generated_friend_code = Array.from({length: 3}, () => utils.randomString(4)).join("-");
            console.log(generated_friend_code)
        } while ((friend_code = await dbi.addFriendCode(player_id, generated_friend_code)) == null);
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

router.post('/add', async (req, res, next) => {
    try {
        const value = await addFriendSchema.validateAsync(req.body);
        const player_id = await dbi.resolvePlayerId(value.authId);
        if (await dbi.addFriend(player_id, value.friendCode)) {
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

router.post('/list', async (req, res, next) => {
    try {
        const value = await authIdSchema.validateAsync(req.body);
        const player_id = await dbi.resolvePlayerId(value.authId);
        var friendList = await dbi.friendList(player_id);
        res.json({
            status: "ok",
            friendList: friendList
        })
    }
    catch(error) {
        console.log(error);
        next(error);
        Sentry.captureException(error);
    }
})

module.exports = router;