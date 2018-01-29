import * as fs from 'fs';

import * as conf from './config';
import * as db from './database';

import { InitLogger, logger } from './logger';
import { Config } from './config';
import { Measure, DayMeasures } from './measure';
import { City } from './city';
import { Report } from './report';

import { MeasureModel, DayMeasuresDocument } from './schema/measure';
import { CityModel, CityDocument } from './schema/city';

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
      return MeasureModel.find({})
        .populate('cities')
        .sort({ _id: -1 })
        .exec();
    })
    .then((measures: DayMeasuresDocument[]) => {
      return Promise.all(measures.map((measure: any) => {
        return CityModel.findById(measure.city).exec()
          .then((city: CityDocument | null) => {
            if (city == null)
              throw new Error(`not found city ${measure.city._id}`);

            return ExportToCsv(measure, city);
          })
          .catch((err: any) => { throw err; });
      }));
    })
    .then(() => { exit(0); })
    .catch((err: any) => { exit(1, err); })
}

function ExportToCsv(measure: DayMeasuresDocument, city: City): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // let path = `${city.name}_${measure.date.getDay()}-${measure.date.getMonth()}-${measure.date.getFullYear()}.csv`;
    let path = `./csv/${city.name}_${measure.date.toString()}.csv`;
    let headers = 'precipitation;pressure (hPa);wind (km/h);windchill (°C);humidex;humidity (%);temperature (°C);vision (km);nebula\n';

    let str = measure.measures.reduce((acc, current) => {
      return `${acc}${current.precipitation};${current.precipitation};${current.wind};${current.windchill};${current.humidex};${current.humidity};${current.temperature};${current.vision};${current.nebula}\n`;
    }, headers);

    // console.log(str, '\n');

    fs.writeFile(path, str, 'utf8', (err: any) => {
      if (err)
        return reject(err);

      resolve();
    });
  });
}

function exit(code: number, err?: Error): void {
  if (err != undefined)
    logger.error(err.stack);

  process.exit(code);
}

main();
