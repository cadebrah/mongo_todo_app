const express = require('express');
const config = require('../config');
const MongoPersistence = require('../mongo/mongoPersistence');

const router = express.Router();

async function handleRequest(req, res, handler) {
  if (!req.body || !req.body.table || !req.body.data || !req.body.data.id) {
    return res.status(400).json({ message: 'Invalid body provided' });
  }

  const mongoPersistence = new MongoPersistence({
    name: config.database.name,
    uri: config.database.uri
  });

  try {
    await mongoPersistence.init();
    await handler(mongoPersistence, req.body);
    res.status(200).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    await mongoPersistence.close();
  }
}

router.patch('/', (req, res) => handleRequest(req, res, (mp, body) => mp.update(body)));
router.put('/', (req, res) => handleRequest(req, res, (mp, body) => mp.upsert(body)));
router.delete('/', (req, res) => handleRequest(req, res, (mp, body) => mp.delete(body)));

module.exports = router;