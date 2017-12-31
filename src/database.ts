import { logger } from './logger';

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

export function Connect(config: { uri: string, verbose: boolean }): Promise<void> {
  let options = {
    useMongoClient: true,
    autoReconnect: true,
    reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 500,
    keepAlive: 30000,
    socketTimeoutMS: 30000
  };

  let verbose = config.verbose != undefined && config.verbose;

  if (verbose) {
    mongoose.connection.on('open', (() => { logger.debug('Mongoose opened!'); }));
    mongoose.connection.on('connected', (() => { logger.debug('Mongoose connected!'); }));
    mongoose.connection.on('disconnected', (() => { logger.debug('Mongoose disconnected!'); }));
    mongoose.connection.on('close', (() => { logger.debug('Mongoose closed!'); }));
    mongoose.connection.on('error', ((err: Error) => { logger.error('Mongoose error: %j', err); }));
  }

  return mongoose.connect(config.uri, options)
    .then(() => {
      if (verbose) {
        // Mongoose logs redirected to winston
        mongoose.set('debug', (
          collection: string,
          method: string,
          query: string,
          doc: any,
          ...options: any[]) => {

          logger.debug('Mongoose: %s.%s %j - %j %j',
            collection, method, query, doc, options);
        });
      }
    })
    .catch((err: any) => {
      return Promise.reject(
        new Error(`connect to '${config.uri}' failed: ${err.message}`));
    });
}

export function Close(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    mongoose.connection.close((err: Error) => {
      if (err != undefined)
        return reject(err);

      resolve();
    });
  });
}
