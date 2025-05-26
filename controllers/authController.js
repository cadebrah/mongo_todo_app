const express = require('express');
const jwt = require('jsonwebtoken');
const KeyManager = require('./auth/keyManager');
const config = require('../config');

const router = express.Router();
const keyManager = new KeyManager();

// JWKS endpoint - PowerSync will fetch public keys from here
router.get('/.well-known/jwks.json', (req, res) => {
  try {
    const jwk = keyManager.getJWK();
    
    res.json({
      keys: [jwk]
    });
  } catch (error) {
    console.error('Error serving JWKS:', error);
    res.status(500).json({ error: 'Failed to serve JWKS' });
  }
});

// Public token generation endpoint (for development/testing)
// In production, you should protect this endpoint with your authentication
router.post('/powersync-token', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    if (!config.powersync?.instanceUrl) {
      return res.status(500).json({ error: 'PowerSync instance URL not configured' });
    }

    const token = generatePowerSyncToken(userId);
    
    res.json(token);

  } catch (error) {
    console.error('Error generating PowerSync token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Helper function to generate PowerSync tokens
function generatePowerSyncToken(userId, customClaims = {}) {
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + (10 * 60); // 5 minutes (recommended short expiration)

  const payload = {
    sub: userId,                           // User ID (required)
    aud: config.powersync.instanceUrl,     // PowerSync instance URL from config (required)
    iat: now,                              // Issued at (required)
    exp: expiration,                       // Expires at (required)
    
    // Standard claims for PowerSync
    user_id: userId,
    
    // Add any custom claims passed in
    ...customClaims
  };

  const token = jwt.sign(payload, keyManager.getPrivateKey(), {
    algorithm: 'RS256',
    keyid: keyManager.getKeyId()
  });

  return {
    token,
    expires_at: expiration,
    expires_in: 600 // 5 minutes in seconds
  };
}

odule.exports = {
  router,
  generatePowerSyncToken
};