const mongoose = require('mongoose');
const db = 'mongodb+srv://admin:admin@fastandfabulous-cluster.ovmeael.mongodb.net/fastfabDB?retryWrites=true&w=majority';

mongoose.connect(db)
  .then(() => console.log("Connected to MongoDB"))
  .catch(() => console.log("Can't connect to DB"));

const modelSchema = new mongoose.Schema({
  name: String,
  country: String,
  image: String
});

module.exports = mongoose.model('models', modelSchema);
