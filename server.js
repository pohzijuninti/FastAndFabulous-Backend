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


// ----------------- Login / Register -----------------
const User = require('./models/User');

// POST /register
app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const newUser = new User({ email, password });
    await newUser.save();

    res.status(201).json({ message: `'${email}' registered successfully` });
  } catch (err) {
    console.error('Registration error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /accounts
app.get('/accounts', async (req, res) => {
  try {
    const users = await User.find({}, 'email'); // only return the 'email' field
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// DELETE /accounts/:email
app.delete('/accounts/:email', async (req, res) => {
  const { email } = req.params;

  try {
    const deletedUser = await User.findOneAndDelete({ email });

    if (!deletedUser) {
      return res.status(404).json({ error: `'${email}' not found` });
    }

    res.json({ message: `'${email}' deleted successfully` });
  } catch (err) {
    console.error('Error deleting user:', err.message);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// POST /login
const jwt = require('jsonwebtoken');

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if required fields are provided
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Validate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: `'${email}' logged in successfully`,
      token,
      userId: user._id
    });
  } catch (err) {
    console.error('Login error:', err); // Log full error object
    res.status(500).json({ error: 'Login failed due to server error' });
  }
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

// DELETE car bookmarks 
app.delete('/delete/bookmarks/cars/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedCar = await CarBookmark.findOneAndDelete({ id });

    if (!deletedCar) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.json({
      message: 'Car deleted',
      deleted: {
        id: deletedCar.id,
        make: deletedCar.make,
        model: deletedCar.model,
        class: deletedCar.class,
        year: deletedCar.year,
        cylinders: deletedCar.cylinders,
        displacement: deletedCar.displacement,
        image: deletedCar.image,
      },
    });
  } catch (err) {
    console.error('Error deleting car:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE car bookmark
app.put('/update/bookmarks/cars/:id', async (req, res) => {
  const { id } = req.params;
  const {
    class: carClass,
    cylinders,
    displacement,
    make,
    model,
    year,
  } = req.body;

  // Optional validation (you can expand this)
  if (
    !carClass || !make || !model ||
    typeof cylinders !== 'number' ||
    typeof displacement !== 'number' ||
    typeof year !== 'number'
  ) {
    return res.status(400).json({ error: 'Invalid or missing fields' });
  }

  try {
    const updatedCar = await CarBookmark.findOneAndUpdate(
      { id }, // assuming `id` is a custom string or number field
      {
        class: carClass,
        cylinders,
        displacement,
        make,
        model,
        year,
      },
      { new: true }
    );

    if (!updatedCar) {
      return res.status(404).json({ error: 'Car not found' });
    }

    res.json({
      message: 'Car bookmark updated',
      updated: updatedCar,
    });
  } catch (err) {
    console.error('Error updating car:', err);
    res.status(500).json({ error: 'Server error' });
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

// UPDATE motorcycle bookmark (only MakeName)
app.put('/update/bookmarks/motorcycles/:id', async (req, res) => {
  const { id } = req.params;
  const { MakeName } = req.body;

  if (!MakeName || typeof MakeName !== 'string' || MakeName.trim() === '') {
    return res.status(400).json({ error: 'Invalid MakeName provided' });
  }

  try {
    const updatedBike = await MotorcycleBookmark.findByIdAndUpdate(
      id,
      { MakeName },
      { new: true } 
    );

    if (!updatedBike) {
      return res.status(404).json({ error: 'Motorcycle not found' });
    }

    res.json({
      message: 'Motorcycle MakeName updated',
      updated: {
        _id: updatedBike._id,
        MakeId: updatedBike.MakeId,
        MakeName: updatedBike.MakeName,
        VehicleTypeName: updatedBike.VehicleTypeName,
        image: updatedBike.image,
      },
    });
  } catch (err) {
    console.error('Error updating motorcycle:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ----------------- Model -----------------

// GET Models API
app.get('/api/models', async (req, res) => {
  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      headers: { Authorization: PEXELS_API_KEY },
      params: { query: 'sexy car model', per_page: 40 }
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

// Dynamic search endpoint
app.get('/api/images/:keywords', async (req, res) => {
  const { keywords } = req.params;

  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      headers: { Authorization: PEXELS_API_KEY },
      params: {
        query: keywords,
        per_page: 40,
      },
    });

    const images = response.data.photos.map(photo => ({
      id: photo.id,
      url: photo.src.large,
      photographer: photo.photographer,
    }));

    res.json(images);
  } catch (err) {
    console.error('❌ Error from Pexels API:', err.message);
    res.status(500).json({ error: 'Failed to fetch images from Pexels' });
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

// DELETE bookmarks model
app.delete('/delete/bookmarks/models/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedModel = await ModelBookmark.findOneAndDelete({ id: parseInt(id) });

    if (!deletedModel) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({
      message: 'Model deleted',
      deleted: {
        _id: deletedModel._id,
        id: deletedModel.id,
        photographer: deletedModel.photographer,
        url: deletedModel.url,
      },
    });
  } catch (err) {
    console.error('Error deleting model:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// UPDATE bookmarked model (only photographer name)
app.put('/update/bookmarks/models/:id', async (req, res) => {
  const { id } = req.params;
  const { photographer } = req.body;

  // Validate input
  if (!photographer || typeof photographer !== 'string' || photographer.trim() === '') {
    return res.status(400).json({ error: 'Invalid photographer name provided' });
  }

  try {
    const updatedModel = await ModelBookmark.findOneAndUpdate(
      { id: parseInt(id) },
      { photographer },
      { new: true }
    );

    if (!updatedModel) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({
      message: 'Model photographer updated',
      updated: {
        _id: updatedModel._id,
        id: updatedModel.id,
        photographer: updatedModel.photographer,
        url: updatedModel.url,
      },
    });
  } catch (err) {
    console.error('Error updating model:', err);
    res.status(500).json({ error: 'Server error' });
  }
});


// ----------------- Start Server -----------------
app.listen(port, () => {
  console.log(`🚗 Backend running at http://localhost:${port}`);
});
