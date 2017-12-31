import * as mongoose from 'mongoose';

import { DebugFindQuery } from './schema';
import { DayMeasures } from '../measure';

export interface DayMeasuresDocument extends DayMeasures, mongoose.Document { }

const MeasureSchema = new mongoose.Schema({
  hour: {
    type: Number, // Hour of the measure
  },

  nebula: {
    type: Number, // Positive value [0, 8]
    default: null
  },

  vision: {
    type: Number, // km
    default: null
  },

  temperature: {
    type: Number, // °Celsius
    default: null
  },

  humidity: {
    type: Number, // %
    default: null
  },

  humidex: {
    type: Number, // Relative value
    default: null
  },

  windchill: {
    type: Number, // °Celsius
    default: null
  },

  wind: {
    type: Number, // km/h
    default: null
  },

  pressure: {
    type: Number, // hPa
    default: null
  },

  precipitation: {
    type: String,
    default: ''
  },
}, { _id: false });

const DayMeasuresSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },

  measures: [MeasureSchema],

  city: {
    type: mongoose.Schema.Types.ObjectId, ref: 'cities'
  }
}, { versionKey: false });

if (process.env.DEBUG == '1') {
  DayMeasuresSchema.post('find', DebugFindQuery('users', 'find'));
  DayMeasuresSchema.post('findOne', DebugFindQuery('users', 'findOne'));
  DayMeasuresSchema.post('findOneAndUpdate', DebugFindQuery('users', 'findOneAndUpdate'));
  DayMeasuresSchema.post('findById', DebugFindQuery('users', 'findById'));
  DayMeasuresSchema.post('findByIdAndUpdate', DebugFindQuery('users', 'findByIdAndUpdate'));
}

export let MeasureModel: mongoose.Model<DayMeasuresDocument> =
  mongoose.model<DayMeasuresDocument>('measures', DayMeasuresSchema);
