const mongoose = require('mongoose');

// Car Bookmark Schema
const carSchema = new mongoose.Schema({
  id: { type: String, required: true },
  class: String,
  cylinders: Number,
  displacement: Number,
  make: String,
  model: String,
  year: Number,
  image: String,
});

// Motorcycle Bookmark Schema
const motorcycleSchema = new mongoose.Schema({
  MakeId: { type: Number, required: true },
  MakeName: String,
  VehicleTypeName: String,
  image: String,
});

// Model (Photo) Bookmark Schema
const modelSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  url: String,
  photographer: String,
});

// Export models with explicit collection names to avoid pluralization issues
const CarBookmark = mongoose.model('CarBookmark', carSchema, 'car_bookmarks');
const MotorcycleBookmark = mongoose.model('MotorcycleBookmark', motorcycleSchema, 'motorcycle_bookmarks');
const ModelBookmark = mongoose.model('ModelBookmark', modelSchema, 'model_bookmarks');

module.exports = {
  CarBookmark,
  MotorcycleBookmark,
  ModelBookmark,
};
