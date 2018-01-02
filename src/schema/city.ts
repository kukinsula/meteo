import * as mongoose from 'mongoose';

import { City } from '../city';
import { DebugFindQuery } from './schema';

export interface CityDocument extends City, mongoose.Document { }

const CitySchema = new mongoose.Schema({
  name: {
    type: String,
    unique: true,
    index: true
  },

  code: {
    type: Number,
    index: true,
    unique: true
  },

  department: {
    type: String,
    default: ''
  }
}, { versionKey: false });

if (process.env.DEBUG == '1') {
  CitySchema.post('find', DebugFindQuery('users', 'find'));
  CitySchema.post('findOne', DebugFindQuery('users', 'findOne'));
  CitySchema.post('findOneAndUpdate', DebugFindQuery('users', 'findOneAndUpdate'));
  CitySchema.post('findById', DebugFindQuery('users', 'findById'));
  CitySchema.post('findByIdAndUpdate', DebugFindQuery('users', 'findByIdAndUpdate'));
}

export let CityModel: mongoose.Model<CityDocument> =
  mongoose.model<CityDocument>('cities', CitySchema);
