// const express = require('express');
// const mongoose = require('mongoose');
// const cors = require('cors');
// const bodyParser = require('body-parser');
// require('dotenv').config();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(bodyParser.json());

// // Routes
// const collectionRoutes = require('./routes/todos');
// app.use('/api/', todoRoutes);

// // Home route
// app.get('/', (req, res) => {
//   res.send('Todo API is running');
// });

// // Connect to MongoDB
// mongoose.connect(process.env.MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// })
// .then(() => console.log('MongoDB Connected'))
// .catch(err => console.log(err));

// // Start server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// module.exports = app;

const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());

const MONGO_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

const client = new MongoClient(MONGO_URI);
let db;

async function connectMongo() {
  await client.connect();
  db = client.db(process.env.MOMGO_DB);
}
connectMongo();

// Auth endpoint for PowerSync
app.post("/auth", async (req, res) => {
  const { user_id } = req.body;
  const token = jwt.sign({ sub: user_id }, JWT_SECRET);
  res.json({ token });
});

// Generic create/update (upsert)
app.put("/:collection", async (req, res) => {
  const { _id, ...data } = req.body;
  const collection = db.collection(req.params.collection);

  const filter = _id ? { _id: new ObjectId(_id) } : { clientId: data.clientId };
  const update = {
    $set: {
      ...data,
      updatedAt: new Date(),
      isDeleted: false,
    },
    $setOnInsert: {
      createdAt: new Date(),
    },
  };

  const options = { upsert: true };

  await collection.updateOne(filter, update, options);
  res.status(200).send();
});

// Generic partial update
app.patch("api/:collection/:id", async (req, res) => {
  const collection = db.collection(req.params.collection);
  await collection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { ...req.body, updatedAt: new Date() } }
  );
  res.status(200).send();
});

// Generic soft delete
app.delete("api/:collection/:id", async (req, res) => {
  const collection = db.collection(req.params.collection);
  await collection.updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { isDeleted: true, updatedAt: new Date() } }
  );
  res.status(200).send();
});

// Optional: fetch all from collection (non-deleted)
app.get("api/:collection", async (req, res) => {
  const collection = db.collection(req.params.collection);
  const docs = await collection
    .find({ isDeleted: { $ne: true } })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(docs);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
