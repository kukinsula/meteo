import { logger } from '../logger';

export function DebugFindQuery(
  collection: string,
  method: string): (doc: any) => void {

  return (doc: any): void => {
    logger.debug(
      `Mongoose: ${collection}.${method} ${JSON.stringify(doc, undefined, 2)}`);
  };
}
