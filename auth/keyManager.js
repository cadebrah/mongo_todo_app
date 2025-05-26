const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class KeyManager {
  constructor() {
    this.keyDir = path.join(__dirname, 'keys');
    this.privateKeyPath = path.join(this.keyDir, 'private-key.pem');
    this.publicKeyPath = path.join(this.keyDir, 'public-key.pem');
    
    // Ensure keys directory exists
    if (!fs.existsSync(this.keyDir)) {
      fs.mkdirSync(this.keyDir, { recursive: true });
    }
    
    this.keyId = 'powersync-key-1'; // Static key ID
    this.loadOrGenerateKeys();
  }

  loadOrGenerateKeys() {
    if (fs.existsSync(this.privateKeyPath) && fs.existsSync(this.publicKeyPath)) {
      // Load existing keys
      this.privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
      this.publicKey = fs.readFileSync(this.publicKeyPath, 'utf8');
      console.log('✓ Loaded existing RSA keys');
    } else {
      // Generate new keys
      this.generateKeys();
      console.log('✓ Generated new RSA keys');
    }
  }

  generateKeys() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    this.privateKey = privateKey;
    this.publicKey = publicKey;

    // Save keys to files
    fs.writeFileSync(this.privateKeyPath, privateKey);
    fs.writeFileSync(this.publicKeyPath, publicKey);
  }

  getPrivateKey() {
    return this.privateKey;
  }

  getPublicKey() {
    return this.publicKey;
  }

  getKeyId() {
    return this.keyId;
  }

  // Convert PEM public key to JWK format for JWKS endpoint
  getJWK() {
    const keyObject = crypto.createPublicKey(this.publicKey);
    const jwk = keyObject.export({ format: 'jwk' });
    
    return {
      ...jwk,
      kid: this.keyId,
      alg: 'RS256',
      use: 'sig'
    };
  }
}

module.exports = KeyManager;