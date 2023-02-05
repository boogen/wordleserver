import express from 'express';
import * as Sentry from '@sentry/node';

  export function notFound(req:express.Request, res:express.Response, next:express.NextFunction) {
  res.status(404);
  const error = new Error(`🔍 - Not Found - ${req.originalUrl}`);
  next(error);
}

/* eslint-disable no-unused-vars */
  export function errorHandler(err:any, req:express.Request, res:express.Response, next:express.NextFunction) {
  /* eslint-enable no-unused-vars */
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
  console.log(err);
  Sentry.captureException(err);
}

