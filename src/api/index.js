const express = require('express');
const wordle = require('./wordle');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏'
  });
});

router.use('/wordle', wordle);

module.exports = router;
