import { City } from './city';

export class Measure {
  public hour: number;
  public nebula: number | null;
  public vision: number | null;
  public temperature: number | null;
  public humidity: number | null;
  public humidex: number | null;
  public windchill: number | null;
  public wind: number | null;
  public pressure: number | null;
  public precipitation: string;

  constructor(
    hour: number,
    nebula: number,
    vision: number,
    temperature: number,
    humidity: number,
    humidex: number,
    windchill: number,
    wind: number,
    pressure: number,
    precipitation: string) {

    this.hour = hour;

    this.nebula = isNaN(nebula) ? null : nebula;
    this.vision = isNaN(vision) ? null : vision;
    this.temperature = isNaN(temperature) ? null : temperature;
    this.humidity = isNaN(humidity) ? null : humidity;
    this.humidex = isNaN(humidex) ? null : humidex;
    this.windchill = isNaN(windchill) ? null : windchill;
    this.wind = isNaN(wind) ? null : wind;
    this.pressure = isNaN(pressure) ? null : pressure;
    this.precipitation = precipitation;
  }
}

export class DayMeasures {
  public date: Date;
  public measures: Measure[];
  public city: City;

  constructor(city: City, date: Date) {
    this.city = city;
    this.date = date;
    this.measures = [];
  }
}
