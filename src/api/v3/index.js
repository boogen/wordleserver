const express = require('express');
const wordle = require('./wordle');
const friend = require('./friend')
const player = require('./player')
const challenge = require('./wordle_challenge')
const crossword = require('./crossword');
const spellingBee = require('./spelling_bee');
const { route } = require('./crossword');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏'
  });
});

router.use('/wordle', wordle);
router.use('/player', player);
router.use('/friend', friend);
router.use('/classic', challenge);
router.use('/crossword', crossword);
router.use('/spelling_bee', spellingBee);

module.exports = router;
