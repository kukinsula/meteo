import * as nodemailer from 'nodemailer';
import * as nunjucks from 'nunjucks';

import { logger } from './logger';
import { Report } from './report';
import { MailConfig } from './config';

interface MailOptions {
  from: string,
  to: string[]
  subject: string,
  html?: string,
  attachments?: any,
  cc?: string | string[]
}

export interface MailResult {
  messageId: string
  envelope: any
  accepted: string[]
  rejected: string[]
  pending: string[]
  response: any
}

export class Mailer {
  private config: MailConfig;
  private transporter: nodemailer.Transporter;

  constructor(config: MailConfig) {
    this.config = config;

    let options: any = {
      host: config.host,
      port: config.port,
      auth: config.auth,
      secure: false,
      ignoreTLS: true,
      debug: true,
      tls: config.tls
    };

    this.transporter = nodemailer.createTransport(options);

    nunjucks.configure({
      autoescape: true,
      throwOnUndefined: true,
      trimBlocks: true,
      lstripBlocks: true
    });
  }

  private send(options: MailOptions): Promise<MailResult> {
    return new Promise<any>((resolve, reject) => {
      this.transporter.sendMail(options, ((err: any, info: MailResult) => {
        if (err != undefined)
          return reject(new MailError(err, options));

        resolve(info);
      }));
    });
  }

  private renderTemplate(path: string, context: any = {}): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      nunjucks.render(path, context, ((err: any, res: string) => {
        if (err != undefined)
          return reject(new TemplateError(err, path));

        resolve(res);
      }));
    });
  }

  private renterTemplateAndSend(
    path: string, context: any,
    options: MailOptions): Promise<MailResult> {

    return this.renderTemplate(path, context)
      .then((html: string) => {
        options.html = html;

        return this.send(options);
      })
      .catch((err: any) => { return Promise.reject(err); });
  }

  public SendReport(report: Report): Promise<MailResult> {
    let path = this.config.templatePath + '/signup.html';
    let context = { report: report };
    let options = {
      from: this.config.from,
      to: this.config.to,
      subject: 'Freelance.com: inscription réussie',
    };

    return this.renterTemplateAndSend(path, context, options);
  }
}

export class TemplateError extends Error {
  public err: Error;
  public path: string;

  constructor(err: Error, path: string) {
    super(err.message);

    Object.setPrototypeOf(this, TemplateError.prototype);

    this.name = 'TemplateError';
    this.err = err;
    this.path = path;
  }

  public toString(): string {
    return JSON.stringify(this);
  }
}

export class MailError extends Error {
  public err: Error;
  public content: string;
  public options: MailOptions;

  constructor(err: Error, options: MailOptions) {
    super(err.message);

    Object.setPrototypeOf(this, TemplateError.prototype);

    this.name = 'MailError';
    this.err = err;
    this.options = options;
  }

  public toString(): string {
    return JSON.stringify(this);
  }
}
