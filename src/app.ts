import express, {Request,Response,Application} from 'express';

const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');
const Sentry = require('@sentry/node');

require('dotenv').config();
Sentry.init({dsn: process.env.sentry_dsn});

const middlewares = require('../out/middlewares');
const api = require('../out/api/v1');
const apiv2 = require('../out/api/v2');
const apiv3 = require('../out/api/v3');

const app = express();

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
    Sentry.captureException(error);
  };
  res.status(500);
  res.send("error");
});

app.use('/api/v1', api);
app.use('/api/v2', apiv2);
app.use('/api/v3', apiv3)

app.use(middlewares.notFound);
app.use(middlewares.errorHandler);

module.exports = app;
