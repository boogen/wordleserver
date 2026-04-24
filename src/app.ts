import express, { Request, Response, Application } from 'express';

import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import { metrics } from './metrics'
import * as Sentry from "@sentry/node"

require('dotenv').config();

Sentry.init({ dsn: process.env.SENTRY_DNS });

import { notFound, errorHandler } from './middlewares';
import { RegisterRoutes } from './routes';

import { iocContainer } from './ioc';
import WordleDBI from './api/v4/DBI/DBI';

export const app = express();
app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.json({
    message: '🦄🌈✨👋🌎🌍🌏✨🌈🦄'
  });
});

app.get("/error", (req: Request, res: Response) => {
  try {
    throw new Error("aaa");
  }
  catch (error) {
    // Sentry.captureException(error);
  };
  res.status(500);
  res.send("error");
});

const dbi = iocContainer.get(WordleDBI);

app.use(async (req, res, next) => {
  var d = new Date();
  d.setHours(0, 0, 0, 0);
  await dbi.increaseRequestCounter(req.path, d.getTime() / 1000);
  next()
})

RegisterRoutes(app);
app.use('/', metrics)

app.use(notFound);
app.use(errorHandler);

