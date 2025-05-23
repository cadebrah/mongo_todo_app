const express = require('express');
const config = require('./config');
const dataRoutes = require('./controllers/dataController');

const app = express();
app.use(express.json());

app.use('/api', dataRoutes);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
