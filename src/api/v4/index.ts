import express from 'express';
import {wordle} from './wordle';
import {friend} from './friend';
import {player} from './player';
import {challenge} from './wordle_challenge';
import {spelling_bee} from './spelling_bee';
import {spelling_bee_duel} from './spelling_bee_duel'
import { crossword } from './crossword';
import {ranking} from './ranking'

export const apiV3 = express.Router();

apiV3.get('/', (req, res) => {
  res.json({
    message: 'API - 👋🌎🌍🌏'
  });
});

apiV3.use('/wordle', wordle);
apiV3.use('/player', player);
apiV3.use('/friend', friend);
apiV3.use('/classic', challenge);
apiV3.use('/crossword', crossword);
apiV3.use('/spelling_bee', spelling_bee);
apiV3.use('/spelling_bee_duel', spelling_bee_duel)
apiV3.use('/ranking', ranking)

