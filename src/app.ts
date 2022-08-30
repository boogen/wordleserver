import express, {Request,Response,Application} from 'express';

import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
// import Sentry from '@sentry/node';

require('dotenv').config();
// Sentry.init({dsn: process.env.sentry_dsn});

import {notFound, errorHandler} from './middlewares';
import { apiV3 } from './api/v3';

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

app.use('/api/v3', apiV3)

app.use(notFound);
app.use(errorHandler);
