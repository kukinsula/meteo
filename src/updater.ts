import * as https from 'https';
import { Buffer } from 'buffer';

import { logger } from './logger';
import { Config } from './config';
import { Measure, DayMeasures } from './measure';
import { City } from './city';
import { Report } from './report';

import { MeasureModel, DayMeasuresDocument } from './schema/measure';
import { CityModel, CityDocument } from './schema/city';

const
  tabletojson = require('tabletojson'),

  jsdom = require("jsdom"),
  { JSDOM } = jsdom,

  iconv = require('iconv-lite');

const
  URL = 'https://www.meteociel.com/temps-reel/obs_villes.php';

export function Init(config: Config): Promise<Report> {
  logger.debug('Init');

  let promise = Promise.resolve();

  if (config.cleanDatabase)
    promise = CityModel.remove({}).exec()
      .then(() => { return MeasureModel.remove({}).exec(); });

  return promise
    .then(() => {
      logger.debug('Getting all cities...');

      return GetCities();
    })
    .then((cities: City[]) => {
      logger.debug('Found %d cities', cities.length);

      return Promise.all(cities.map((city: City) => {
        return CityModel.findOneAndUpdate({ name: city.name },
          city,
          { upsert: true, new: true }).exec();
      }));
    })
    .then(() => {
      logger.debug('Successfully inserted cities!');

      return CityModel.find({ code: config.cityCodes }).exec()
    })
    .then((cities: CityDocument[]) => {
      return CrawlAllDates(cities, config.start, new Report());
    })
    .catch((err: any) => { return Promise.reject(err); });
}

function GetCities(): Promise<City[]> {
  return new Promise<City[]>((resolve, reject) => {
    https.get(URL, (resp: any) => {
      if (resp.statusCode != 200) {
        resp.resume();

        return reject(new Error(
          `https.get(${URL}) failed with status code ${resp.statusCode}`));
      }

      let raw: any[] = [];

      resp.on('data', (chunk: string) => { raw.push(chunk); });
      resp.on('error', (err: any) => { reject(err); });
      resp.on('end', () => {
        raw = iconv.decode(Buffer.concat(raw), 'iso-8859-1');

        let dom = new JSDOM(raw);
        let select = dom.window.document.querySelector('select');
        let cities: City[] = [];

        for (let i = 0; select[i] != undefined; i++) {
          let name = select[i].textContent.trim();
          let code = select[i].value;
          let index = name.lastIndexOf(' (');
          let department = name.substring(index + 2, name.length - 1);

          name = name.substring(0, index);

          if (code == 7314 && name != 'Pointe de Chassiron' ||
            code == 7156 && name != 'Montsouris' ||
            code == 235 && name != 'Trets') // Skip dupplicate city codes
            continue;

          if (name == '' || code == 0) // Skip those items
            continue;

          cities.push(new City(name, code, department));
        }

        resolve(cities);
      });
    });
  });
}

function CrawlAllDates(
  cities: CityDocument[],
  date: Date,
  previous: Report): Promise<Report> {

  logger.debug('Processing measures on %s...', date.toString());

  return ProcessAllCitiesOneAfterTheOther(cities, date)
    .then((report: Report) => {
      logger.debug('Successfully processed measures on %s in %f sec!',
        date.toString(), report.duration / 1000);

      date.setDate(date.getDate() - 1);

      return CrawlAllDates(cities, date, previous.Add(report));
    })
    .catch((err: any) => {
      // Detect end of meteociel dataset
      if (err instanceof UpdateError &&
        err.message == MEASURES_TABLE_NOT_FOUND &&
        date.getFullYear() == 1973) {

        return Promise.resolve(previous);
      }

      return Promise.reject(err);
    });
}

function ProcessAllCitiesAtOnce(cities: CityDocument[], date: Date): Promise<Report> {
  let start = Date.now();

  return Promise.all(
    cities.map((city: CityDocument) => {
      let duration = GetRandomInt(1500, 3500);

      return GetMeasure(city, date)
        .then((measures: DayMeasures) => {
          return new MeasureModel(measures).save();
        })
        .then((measures: DayMeasuresDocument) => { return measures; })
    }))
    .then((measures: DayMeasures[]) => {
      let inserted = measures.reduce((acc, current) => {
        return acc + current.measures.length;
      }, 0);
      let duration = Date.now() - start;

      return new Report(inserted, duration);
    })
    .catch((err: any) => { return Promise.reject(err); });
}

function ProcessAllCitiesOneAfterTheOther(
  cities: CityDocument[],
  date: Date): Promise<Report> {

  return cities.reduce((acc, city) => {
    let report: Report;
    let start = 0;

    return acc
      .then((previous: Report) => {
        logger.debug('Processing measures of %s on %s...',
          city.name, date.toString());

        report = previous;
        start = Date.now();

        return GetMeasure(city, date);
      })
      .then((measures: DayMeasures) => {
        return new MeasureModel(measures).save();
      })
      .then((measures: DayMeasuresDocument) => {
        let duration = Date.now() - start;

        logger.debug('Successfully processed measures of %s on %s in %f sec!',
          city.name, date.toString(), duration / 1000);

        return report.Add(new Report(measures.measures.length, duration));
      })
      .catch((err: any) => {
        return Promise.reject(err);
      });
  }, Promise.resolve(new Report()));
}

function GetMeasure(city: CityDocument, date: Date): Promise<DayMeasures> {
  return new Promise<DayMeasures>((resolve, reject) => {
    let day = date.getDate();
    let month = date.getMonth();
    let year = date.getFullYear();
    let url = `${URL}?` +
      `code2=${city.code}&` +
      `jour2=${day}&` +
      `mois2=${month}&` +
      `annee2=${year}&` +
      `envoyer=OK`;

    https.get(url, (resp: any) => {
      if (resp.statusCode != 200) {
        resp.resume();

        return reject(new UpdateError(
          `https.get(${url}) failed with status code ${resp.statusCode}`));
      }

      let raw = '';

      resp.setEncoding('utf8');
      resp.on('data', (chunk: string) => { raw += chunk; });
      resp.on('error', (err: any) => { reject(err); });
      resp.on('end', () => {
        let table = tabletojson.convert(raw)[8];

        if (table == undefined)
          return reject(new UpdateError(MEASURES_TABLE_NOT_FOUND));

        let measures = new DayMeasures(city, date);

        for (let i = table.length - 1; i > 0; i--) {
          let measure = new Measure(
            parseInt(table[i][0]),	// Heure locale
            parseInt(table[i][1]),	// Nébuleuse
            parseFloat(table[i][3]),	// Vision
            parseFloat(table[i][4]),	// Température
            parseFloat(table[i][5]),	// Humidité
            parseFloat(table[i][6]),	// Humidex
            parseFloat(table[i][7]),	// Windchill
            parseFloat(table[i][9]),	// Wind
            parseFloat(table[i][10]),	// Pression
            table[i][11]		// Précipitation
          );

          measures.measures.push(measure);
        }

        resolve(measures);
      });
    });
  });
}

export function Update(config: Config): Promise<Report> {
  return CityModel.find({}).exec()
    .then((cities: CityDocument[]) => {
      return ProcessAllCitiesAtOnce(cities, new Date());
    })
    .catch((err: any) => { return Promise.reject(err); });
}

function Slower(duration: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, duration)
  });
}

function GetRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const
  MEASURES_TABLE_NOT_FOUND = 'MeasuresTableNotFound';

export class UpdateError extends Error {
  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, UpdateError.prototype);

    this.name = 'UpdateError';
  }

  public toString(): string {
    return JSON.stringify(this);
  }
}
