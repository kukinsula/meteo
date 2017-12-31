import * as fs from 'fs';

const
  path = require('path'),
  os = require('os');

import { ArgumentParser } from 'argparse';

type Mode = string;

export const
  INIT: Mode = 'init',
  UPDATE: Mode = 'update',

  logLevels = ['debug', 'info', 'warn', 'error'],

  usageMessage = `Meteo Ciel Database updater

Usage: npm start -- [OPTIONS...]

  --help                            Print this help message and exit
  --config                          JSON configuration file

  --mode                            Set the update mode (choose '%s' or '%s')

  --verbose                         Set app verbosity

Mongo:
  --mongo-uri                       Database connection URI
  --mongo-verbose                   Enable Mongo's verbosity

Log:
  --log-file-path                   File to log to
  --log-file-level                  File log's level (choose 'debug' or 'info' or 'warn' or 'error')
  --log-console-level               Console log's level (choose 'debug' or 'info' or 'warn' or 'error')

Mail:
  --mail-disable                    Mail disabled
  --mail-host                       Mail Server host
  --mail-port                       Mail Server port
  --mail-auth-user                  Mail Server username
  --mail-auth-pass                  Mail Server password
  --mail-from                       API Login mail transmitter
  --mail-tls-reject-unhauthorized   Reject unauthorized emails
  --mail-template-path              Mail templates path

Example:
  npm start -- --config config/config.json`;

export interface LogConfig {
  file?: {
    path: string,
    level: string
  },

  console?: {
    level: string
  }
}

export interface MailConfig {
  disabled: boolean,
  host: string,
  port: string,
  auth?: {
    user: string,
    pass: string
  },
  from: string,
  to: string[],
  tls: {
    rejectUnauthorized: boolean
  },
  templatePath: string
}

export interface RawConfig {
  mode?: Mode,
  verbose?: boolean,

  mongo?: {
    uri: string,
    verbose: boolean
  },

  log?: LogConfig,
  mail?: MailConfig,
}

export class Config implements RawConfig {
  public mode: Mode;
  public verbose: boolean;

  public mongo: {
    uri: string,
    verbose: boolean
  };
  public mail: MailConfig;
  public log: LogConfig;

  constructor(raw?: RawConfig) {
    if (raw == undefined)
      raw = {};

    this.mode = raw.mode || UPDATE
    this.verbose = raw.verbose || false;

    this.mongo = raw.mongo || {
      uri: '',
      verbose: false
    };

    this.log = raw.log || {
      file: {
        path: '',
        level: 'debug'
      },
      console: {
        level: 'debug'
      }
    };

    this.mail = raw.mail || {
      disabled: true,
      host: '',
      port: '',
      tls: { rejectUnauthorized: false },
      from: '',
      to: [],
      templatePath: ''
    };
  }

  public Build(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let cli = this.cliArgs();

      if (cli.help) {
        console.log(usageMessage, INIT, UPDATE);
        process.exit(0);
      }

      let promise = Promise.resolve();

      if (cli.config != null && cli.config != '')
        promise = this.LoadFile(cli.config);

      promise
        .then(() => {
          this.mode = cli.mode || this.mode;

          if (this.mode != INIT && this.mode != UPDATE)
            throw new Error(`invalid mode ${this.mode}`);

          this.verbose = cli.verbose || this.verbose;

          this.mongo.uri = cli.mongo_uri || this.mongo.uri;
          this.mongo.verbose = cli.mongo_verbose || this.mongo.verbose;

          if (this.log.file != undefined) {
            this.log.file.path = cli.log_file_path || this.log.file.path;
            this.log.file.level = cli.log_file_level || this.log.file.level;

            this.checkLogFilepath();

            if (!path.isAbsolute(this.log.file.path))
              this.log.file.path = path.join(__dirname, '..', this.log.file.path);
          }

          this.log.console = cli.log_console_level == null ?
            this.log.console :
            { level: cli.log_console_level };

          this.mail = {
            disabled: cli.mail_disable || this.mail.disabled,
            host: cli.mail_host || this.mail.host,
            port: cli.mail_port || this.mail.port,
            auth: cli.mail_auth || this.mail.auth,
            from: cli.mail_from || this.mail.from,
            to: cli.mail_to || this.mail.to,
            tls: cli.mail_tls || this.mail.tls,
            templatePath: cli.mail_templatePath || this.mail.templatePath,
          };

          resolve();
        })
        .catch((err: Error) => { reject(err); });
    });
  }

  public LoadFile(filepath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let js: any = {};

      if (!path.isAbsolute(filepath))
        filepath = path.join(__dirname, '..', filepath);

      try { js = require(filepath); } catch (err) {
        return reject(err);
      }

      this.mode = js.mode || this.mode;
      this.verbose = js.verbose || this.verbose;

      this.mongo = js.mongo || this.mongo;
      this.log = js.log || this.log;
      this.checkLogFilepath();
      this.mail = js.mail || this.mail;

      resolve();
    });
  }

  private checkLogFilepath(): void {
    let stats: fs.Stats;

    if (this.log.file == undefined)
      return;

    try {
      stats = fs.lstatSync(this.log.file.path);
    } catch (err) { return; }

    if (!stats.isFile())
      throw new Error(`File log path ${this.log.file.path} is not a file`);
  }

  private cliArgs(argv?: string[]): any {
    let parser = new ArgumentParser({ addHelp: false });

    parser.addArgument(['-h', '--help'], { action: 'storeTrue' });

    parser.addArgument(['-c', '--config'], { type: 'string' });

    parser.addArgument(['--mode'], { choices: [INIT, UPDATE] });
    parser.addArgument(['--verbose'], { action: 'storeTrue' });

    parser.addArgument(['--mongo-uri'], { type: 'string' });
    parser.addArgument(['--mongo-verbose'], { action: 'storeTrue' });

    parser.addArgument(['--log-file-path'], { type: 'string' });
    parser.addArgument(['--log-file-level'], { type: 'string', choices: logLevels });
    parser.addArgument(['--log-console-level'], { type: 'string', choices: logLevels });

    parser.addArgument(['--mail-disable'], { action: 'storeTrue' });
    parser.addArgument(['--mail-host'], { type: 'string' });
    parser.addArgument(['--mail-port'], { type: 'string' });
    parser.addArgument(['--mail-auth-user'], { type: 'string' });
    parser.addArgument(['--mail-auth-pass'], { type: 'string' });
    parser.addArgument(['--mail-from'], { type: 'string' });
    parser.addArgument(['--mail-to'], { type: 'string' });
    parser.addArgument(['--mail-tls-reject-unhauthorized'], { action: 'storeFalse' });
    parser.addArgument(['--mail-tls-template-path'], { type: 'string' });

    return parser.parseArgs();
  }

  public toString(): string {
    let logStr = '';

    if (this.log.file != undefined)
      logStr += `\t      File ${this.log.file.path} [${this.log.file.level}]\n`;

    if (this.log.console != undefined)
      logStr += `\t      Console [${this.log.console.level}]`;

    let mailStr = 'smtp://';
    if (this.mail.auth != undefined)
      mailStr += `${this.mail.auth.user}:${this.mail.auth.pass}@`;
    mailStr += `${this.mail.host}:${this.mail.port}`;

    return `Meteo Configuration:

  MODE:     ${this.mode}
  Mongo:    ${this.mongo.uri}
  Mail:     ${mailStr}
  Log: \n${logStr} \n`;
  }
}