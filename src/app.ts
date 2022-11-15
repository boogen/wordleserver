import express, {Request,Response,Application} from 'express';

import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import {metrics} from './metrics'
import * as Sentry from "@sentry/node"

require('dotenv').config();

Sentry.init({dsn: process.env.sentry_dsn});

import {notFound, errorHandler} from './middlewares';
import { apiV3 } from './api/v3';
import  {apiV4} from './api/v4';
import WordleDBI from './DBI';

export const app = express();

app.use(morgan('dev'));
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/', (req:Request, res:Response) => {
  res.json({
    message: '🦄🌈✨👋🌎🌍🌏✨🌈🦄'
  });
});

app.get("/error", (req:Request, res:Response) => {
  try {
    throw "aaa";
  }
  catch (error) {
    // Sentry.captureException(error);
  };
  res.status(500);
  res.send("error");
});

const dbi = new WordleDBI();

app.use((req, res, next) => {
  var d = new Date();
  d.setHours(0,0,0,0);
  dbi.increase_request_counter(req.path, d.getTime()/1000);
  next()
})

app.use('/api/v3', apiV3)
app.use('/api/v4', apiV4)
app.use('/', metrics)

app.use(notFound);
app.use(errorHandler);

