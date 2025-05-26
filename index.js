// controllers/authController.js
const express = require('express');
const jwt = require('jsonwebtoken');
const KeyManager = require('./auth/keyManager');
const config = require('./config');

const router = express.Router();

// Initialize KeyManager
let keyManager;
try {
  keyManager = new KeyManager();
  console.log('✅ KeyManager initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize KeyManager:', error.message);
  console.log('Creating a fallback token generator...');
}

// JWKS endpoint - PowerSync will fetch public keys from here
router.get('/.well-known/jwks.json', (req, res) => {
  console.log('📍 JWKS endpoint accessed');
  try {
    if (!keyManager) {
      return res.status(500).json({ error: 'KeyManager not initialized' });
    }
    
    const jwk = keyManager.getJWK();
    console.log('✅ Serving JWKS with key ID:', jwk.kid);
    
    res.json({
      keys: [jwk]
    });
  } catch (error) {
    console.error('❌ Error serving JWKS:', error);
    res.status(500).json({ error: 'Failed to serve JWKS' });
  }
});

// Public token generation endpoint (for development/testing)
router.post('/powersync-token', async (req, res) => {
  console.log('📍 Token generation endpoint accessed');
  try {
    const { userId } = req.body;
    
    if (!userId) {
      console.log('❌ Missing userId in request');
      return res.status(400).json({ error: 'userId is required' });
    }
    
    if (!config.powersync?.instanceUrl) {
      console.log('❌ PowerSync instance URL not configured');
      return res.status(500).json({ error: 'PowerSync instance URL not configured' });
    }

    if (!keyManager) {
      console.log('❌ KeyManager not available');
      return res.status(500).json({ error: 'KeyManager not initialized' });
    }

    console.log('✅ Generating token for user:', userId);
    const token = generatePowerSyncToken(userId);
    
    res.json(token);

  } catch (error) {
    console.error('❌ Error generating PowerSync token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Helper function to generate PowerSync tokens
function generatePowerSyncToken(userId, customClaims = {}) {
  if (!keyManager) {
    throw new Error('KeyManager not initialized');
  }
  
  const now = Math.floor(Date.now() / 1000);
  const expiration = now + (5 * 60); // 5 minutes

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
    expires_in: 300 // 5 minutes in seconds
  };
}

module.exports = {
  router,
  generatePowerSyncToken
};