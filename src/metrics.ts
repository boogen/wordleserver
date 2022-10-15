import express from 'express';
import { collectDefaultMetrics, register } from 'prom-client';

collectDefaultMetrics();

export const metrics = express.Router();

metrics.get('/metrics', async (req, res, next) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});