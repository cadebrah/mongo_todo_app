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
const cors = require('cors');
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGO_DB = process.env.MONGO_DB; // Fixed typo

const client = new MongoClient(MONGO_URI);
let db;

async function connectMongo() {
  try {
    await client.connect();
    db = client.db(MONGO_DB);
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Home route
app.get('/', (req, res) => {
  res.json({ message: 'Todo API is running', status: 'OK' });
});

// Auth endpoint
app.post("/auth", async (req, res) => {
  try {
    const { user_id } = req.body;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }
    
    const token = jwt.sign({ sub: user_id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Generic create/update (upsert) - Protected route
app.put("/api/:collection", authenticateToken, async (req, res) => {
  try {
    const { _id, ...data } = req.body;
    const collection = db.collection(req.params.collection);

    let filter;
    if (_id) {
      // If _id is provided, try to convert to ObjectId
      try {
        filter = { _id: new ObjectId(_id) };
      } catch (error) {
        // If _id is not a valid ObjectId, treat it as a string
        filter = { _id: _id };
      }
    } else if (data.clientId) {
      filter = { clientId: data.clientId };
    } else {
      return res.status(400).json({ error: 'Either _id or clientId is required' });
    }

    const update = {
      $set: {
        ...data,
        updatedAt: new Date(),
        isDeleted: false,
        userId: req.user.sub // Add user association
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    };

    const options = { upsert: true, returnDocument: 'after' };
    const result = await collection.findOneAndUpdate(filter, update, options);
    
    res.status(200).json({ 
      success: true, 
      id: result.value?._id || result.upsertedId 
    });
  } catch (error) {
    console.error('PUT error:', error);
    res.status(500).json({ error: 'Failed to create/update document' });
  }
});

// Generic partial update - Fixed route path
app.patch("/api/:collection/:id", authenticateToken, async (req, res) => {
  try {
    const collection = db.collection(req.params.collection);
    
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch (error) {
      objectId = req.params.id; // Handle non-ObjectId strings
    }

    const result = await collection.updateOne(
      { 
        _id: objectId,
        userId: req.user.sub // Ensure user can only update their own data
      },
      { $set: { ...req.body, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('PATCH error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Generic soft delete - Fixed route path
app.delete("/api/:collection/:id", authenticateToken, async (req, res) => {
  try {
    const collection = db.collection(req.params.collection);
    
    let objectId;
    try {
      objectId = new ObjectId(req.params.id);
    } catch (error) {
      objectId = req.params.id; // Handle non-ObjectId strings
    }

    const result = await collection.updateOne(
      { 
        _id: objectId,
        userId: req.user.sub // Ensure user can only delete their own data
      },
      { $set: { isDeleted: true, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('DELETE error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Fetch all from collection (non-deleted) - Fixed route path
app.get("/api/:collection", authenticateToken, async (req, res) => {
  try {
    const collection = db.collection(req.params.collection);
    
    const query = { 
      isDeleted: { $ne: true },
      userId: req.user.sub // Only return user's own data
    };

    const docs = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();
      
    res.json(docs);
  } catch (error) {
    console.error('GET error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server and connect to MongoDB
async function startServer() {
  await connectMongo();
  
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);

module.exports = app;