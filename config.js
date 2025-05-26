require("dotenv").config();

module.exports = {
  port: process.env.PORT || 3000,
  url: process.env.URL || "http://localhost",
  database: {
    uri: process.env.MONGO_URI,
    name: process.env.MONGO_DB,
  },

  powersync: {
    instanceUrl:
      process.env.POWERSYNC_INSTANCE_URL ||
      "https://your-instance.powersync.journeyapps.com",
  },

  // Your app's JWT secret (for your own authentication)
  jwt: {
    secret: process.env.JWT_SECRET || "your-jwt-secret-change-in-production",
    expiresIn: process.env.JWT_EXPIRES_IN || "24h",
  },

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || [
      "http://localhost:3000",
      "http://localhost:3001",
    ],
    credentials: true,
  },
};
