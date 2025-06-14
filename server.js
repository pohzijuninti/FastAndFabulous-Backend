const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const port = 4000;

app.use(cors());

const PEXELS_API_KEY = 'uTM8SiDa01MkJsl2qdEBAj0S2FK8hmJrRXVNZAkXQ9yYPVR0LMxj8GPl';

app.get('/api/girls', async (req, res) => {
  try {
    const response = await axios.get('https://api.pexels.com/v1/search', {
      headers: {
        Authorization: PEXELS_API_KEY
      },
      params: {
        query: 'sexy car model',
        per_page: 80
      }
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

app.listen(port, () => {
  console.log(`Backend running at http://localhost:${port}`);
});
