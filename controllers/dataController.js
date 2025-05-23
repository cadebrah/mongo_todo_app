const express = require('express');
const config = require('../config');
const MongoPersistence = require('../mongo/mongoPersistence');

const router = express.Router();

async function handleRequest(req, res, handler) {
  // Extract table from URL params
  const table = req.params.table;
  const id = req.params.id;
  
  if (!table) {
    return res.status(400).json({ message: 'Table parameter is required' });
  }

  const mongoPersistence = new MongoPersistence({
    name: config.database.name,
    uri: config.database.uri
  });

  try {
    await mongoPersistence.init();
    
    // Create the body structure expected by mongoPersistence methods
    const body = {
      table: table,
      data: {
        id: id,
        ...req.body // Include any additional data from request body
      }
    };
    
    await handler(mongoPersistence, body);
    res.status(200).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await mongoPersistence.close();
  }
}

// Routes that match your client-side URL patterns
router.put('/:table', (req, res) => handleRequest(req, res, (mp, body) => mp.upsert(body)));
router.patch('/:table/:id', (req, res) => handleRequest(req, res, (mp, body) => mp.update(body)));
router.delete('/:table/:id', (req, res) => handleRequest(req, res, (mp, body) => mp.delete(body)));

module.exports = router;