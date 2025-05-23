require('dotenv').config();

module.exports = {
  database: {
    uri: process.env.MONGO_URI,
    name: process.env.MONGO_DB
  },
  port: process.env.PORT || 3000
};
