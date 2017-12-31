import * as fs from 'fs';

import { Config, LogConfig } from './config';

const winston = require('winston');

// Default logger with only a Console transporter
export let logger = new (winston.Logger)({
  transports: [
    new winston.transports.Console({
      level: 'debug',
      formatter: formatter,
    })
  ]
});

// Inits the logger according the given Configuration.
export function InitLogger(config: LogConfig) {
  let transports: any = [];

  if (config.file != undefined)
    transports.push(new winston.transports.File({
      level: config.file.level,
      filename: config.file.path,
      formatter: formatter,
    }));

  if (config.console != undefined)
    transports.push(new winston.transports.Console({
      level: config.console.level,
      formatter: formatter,
    }));

  logger = new winston.Logger({ transports: transports });
}

// Formats each logs.
//
// e.g 10:34:18 25/12/2012 [INFO] - this is a log - { "meta": "data" }
function formatter(options: any) {
  let now = new Date();

  let hours = now.getHours();
  let minutes = now.getMinutes();
  let minutesStr = minutes < 10 ? '0' + minutes : minutes;
  let seconds = now.getSeconds();
  let secondsStr = seconds < 10 ? '0' + seconds : seconds;

  let day = now.getUTCDate();
  let month = now.getUTCMonth() + 1;
  let monthStr = month < 10 ? '0' + month : month;
  let year = now.getUTCFullYear();

  let level = winston.config.colorize(options.level, options.level.toUpperCase());
  let message = options.message ? options.message : '';
  let meta = options.meta && Object.keys(options.meta).length ?
    ' - ' + JSON.stringify(options.meta) : '';

  return `${hours}:${minutesStr}:${secondsStr} ${day}/${monthStr}/${year} [${level}] - ${message}${meta}`;
};
