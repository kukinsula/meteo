import * as conf from './config';
import * as db from './database';
import * as updater from './updater';
import { logger, InitLogger } from './logger';
import { Report } from './report';
import { Mailer } from './mail';

require('source-map-support').install();

function main() {
  let config = new conf.Config();

  config.Build()
    .catch((err: any) => { exit(1, err); })
    .then(() => {
      InitLogger(config.log);
      logger.info(config.toString());

      return db.Connect(config.mongo);
    })
    .then(() => {
      if (config.mode == conf.INIT)
        return updater.Init();

      return updater.Update();
    })
    .then((report: Report) => {
      logger.info(`Report: ${JSON.stringify(report, undefined, 2)}`);

      return new Mailer(config.mail).SendReport(report);
    })
    .then(() => { exit(0); })
    .catch((err: any) => { exit(2, err); });
}

function exit(code: number, err?: Error): void {
  if (err != undefined)
    logger.error(err.stack);

  process.exit(code);
}

main();
