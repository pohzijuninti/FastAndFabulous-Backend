const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = 4000;

// MongoDB Connection
mongoose.connect('mongodb+srv://admin:admin@fastandfabulous-cluster.ovmeael.mongodb.net/fastfabDB?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Mongoose Models
const { CarBookmark, MotorcycleBookmark, ModelBookmark } = require('./models/Bookmark');

// Middleware
app.use(cors());
app.use(express.json());

const API_NINJAS_KEY = 'P+iwRH/gimVYG3WotI3NzA==UYiofCixkG86jWvN';
const PEXELS_API_KEY = 'uTM8SiDa01MkJsl2qdEBAj0S2FK8hmJrRXVNZAkXQ9yYPVR0LMxj8GPl';

// ----------------- Base Route -----------------
app.get('/', (req, res) => {
  res.send('🚀 Welcome to Fast & Fabulous API');
});


// ----------------- Car -----------------

// GET Cars API
app.get('/api/cars', async (req, res) => {
  const toyotaModels = ['Corolla', 'Camry', 'Prius', 'Yaris', 'RAV4', 'Highlander'];

  try {
    const results = await Promise.all(toyotaModels.map(async (model, index) => {
      const carRes = await axios.get(`https://api.api-ninjas.com/v1/cars?model=${model}`, {
        headers: { 'X-Api-Key': API_NINJAS_KEY }
      });

      const car = carRes.data[0];
      if (!car) return null;

      const imageRes = await axios.get('https://api.pexels.com/v1/search', {
        headers: { Authorization: PEXELS_API_KEY },
        params: { query: `${car.make} ${car.model}`, per_page: 1 }
      });

      const image = imageRes.data.photos[0]?.src.medium || null;

      return {
        id: `${car.make}-${car.model}-${car.year}-${index}`,
        ...car,
        image
      };
    }));

    res.json(results.filter(Boolean));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch car data: ' + err.message });
  }
});

// POST bookmark car
app.post('/post/bookmarks/cars', async (req, res) => {
  try {
    const newCar = new CarBookmark(req.body);
    const saved = await newCar.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save car bookmark' });
  }
});

// GET bookmarks car
app.get('/get/bookmarks/cars', async (req, res) => {
  try {
    const cars = await CarBookmark.find();
    res.json(cars);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch car bookmarks' });
  }
});


// ----------------- Motorcycle -----------------

// GET Motorcycles API
app.get('/api/motorcycles', async (req, res) => {
  const famousBrands = ['HONDA', 'YAMAHA', 'KAWASAKI', 'SUZUKI', 'BMW', 'DUCATI', 'TRIUMPH', 'POLARIS', 'VICTORY'];

  try {
    const response = await axios.get('https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/motorcycle?format=json');
    const filtered = response.data.Results.filter(bike => famousBrands.includes(bike.MakeName.toUpperCase()));

    const withImages = await Promise.all(
      filtered.map(async (bike) => {
        let image = null;
        try {
          const imageRes = await axios.get('https://api.pexels.com/v1/search', {
            headers: { Authorization: PEXELS_API_KEY },
            params: { query: `${bike.MakeName} motorcycle`, per_page: 1 }
          });

          image = imageRes.data.photos[0]?.src.medium || null;

          if (!image) {
            const fallbackRes = await axios.get('https://api.pexels.com/v1/search', {
              headers: { Authorization: PEXELS_API_KEY },
              params: { query: 'motorcycle', per_page: 1 }
            });
            image = fallbackRes.data.photos[0]?.src.medium || null;
          }
        } catch (err) {
          console.error(`Image fetch failed for ${bike.MakeName}:`, err.message);
        }

        return { ...bike, image };
      })
    );

    res.json(withImages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch motorcycle data' });
  }
});

// POST motorcycle bookmark
app.post('/post/bookmarks/motorcycles', async (req, res) => {
  try {
    const { MakeId, MakeName, VehicleTypeName, image } = req.body;

    // prevent duplicates
    const exists = await MotorcycleBookmark.findOne({ MakeId });
    if (exists) return res.status(409).json({ error: 'Motorcycle already bookmarked' });

    const newMotorcycle = new MotorcycleBookmark({
      MakeId,
      MakeName,
      VehicleTypeName,
      image,
    });

    const saved = await newMotorcycle.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Failed to bookmark motorcycle:', err.message);
    res.status(500).json({ error: 'Failed to save motorcycle bookmark' });
  }
});

// GET motorcycle bookmarks
app.get('/get/bookmarks/motorcycles', async (req, res) => {
  try {
    const bikes = await MotorcycleBookmark.find({});
    res.status(200).json(bikes);
  } catch (err) {
    console.error('Error fetching motorcycle bookmarks:', err);
    res.status(500).json({ error: 'Failed to fetch motorcycle bookmarks' });
  }
});

// DELETE motorcycle bookmarks 
app.delete('/delete/bookmarks/motorcycles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedBike = await MotorcycleBookmark.findByIdAndDelete(id);

    if (!deletedBike) {
      return res.status(404).json({ error: 'Motorcycle not found' });
    }

    res.json({
      message: 'Motorcycle deleted',
      deleted: {
        _id: deletedBike._id,
        MakeId: deletedBike.MakeId,
        MakeName: deletedBike.MakeName,
        VehicleTypeName: deletedBike.VehicleTypeName,
        image: deletedBike.image,
      },
    });
  } catch (err) {
    console.error('Error deleting motorcycle:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ----------------- Model -----------------

// GET Models API
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query: 'sexy car model', per_page: 80 }
    });

    const images = response.data.photos.map(photo => ({
      id: photo.id,
      url: photo.src.large,
      photographer: photo.photographer
    }));

    res.json(images);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST bookmark model
app.post('/post/bookmarks/models', async (req, res) => {
  const { id, url, photographer } = req.body;

  try {
    const exists = await ModelBookmark.findOne({ id });
    if (exists) {
      return res.status(409).json({ error: 'Model already bookmarked' });
    }

    const newModel = new ModelBookmark({ id, url, photographer });
    const saved = await newModel.save();
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error saving model:', err);
    res.status(500).json({ error: 'Failed to save model bookmark' });
  }
});


// GET bookmarks model
app.get('/get/bookmarks/models', async (req, res) => {
  try {
    const models = await ModelBookmark.find();
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch model bookmarks' });
  }
});

// ----------------- Start Server -----------------
app.listen(port, () => {
  console.log(`🚗 Backend running at http://localhost:${port}`);
});
