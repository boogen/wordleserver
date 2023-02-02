import express from 'express';
import {wordle} from './wordle/wordle';
import {friend} from './friend/friend';
import {player} from './player/player';
import {spelling_bee} from './spelling_bee/spelling_bee';
import {spelling_bee_duel} from './spelling_bee/duel/spelling_bee_duel'
import { crossword } from './crossword/crossword';
import {ranking} from './ranking'
import { challenge } from './wordle/wordle_challenge/wordle_challenge';

export const apiV4 = express.Router();

apiV4.get('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏'
  });
});

apiV4.use('/wordle', wordle);
apiV4.use('/player', player);
apiV4.use('/friend', friend);
apiV4.use('/classic', challenge);
apiV4.use('/crossword', crossword);
apiV4.use('/spelling_bee', spelling_bee);
apiV4.use('/spelling_bee_duel', spelling_bee_duel)
apiV4.use('/ranking', ranking)

