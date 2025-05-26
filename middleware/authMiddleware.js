const jwt = require('jsonwebtoken');

// Basic authentication middleware - Replace with your actual auth logic
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // TODO: Replace this with your actual token verification logic
    // This could be:
    // - JWT verification with your app's secret
    // - Session token lookup in database
    // - Third-party auth provider verification (Firebase, Auth0, etc.)
    
    // EXAMPLE: Simple JWT verification (replace with your logic)
    try {
      // If you're using JWTs for your app authentication:
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // For demo purposes, we'll just decode without verification
      // In production, ALWAYS verify the token
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.userId) {
        return res.status(401).json({ error: 'Invalid token format' });
      }
      
      // Set user info on request object
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        // Add other user properties as needed
      };
      
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }

  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// PowerSync-specific authentication middleware
const authenticatePowerSyncUser = async (req, res, next) => {
  try {
    // Extract user ID from PowerSync JWT token
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No valid authorization header' });
    }

    const token = authHeader.substring(7);
    
    // Decode without verification (PowerSync already verified the JWT)
    // The JWT signature was already verified by PowerSync before reaching your API
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.sub) {
      return res.status(401).json({ error: 'Invalid PowerSync token' });
    }

    // Validate token hasn't expired
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return res.status(401).json({ error: 'Token expired' });
    }

    // Set user info from PowerSync JWT
    req.user = {
      id: decoded.sub,
      user_id: decoded.user_id,
      // You can access custom claims added during token generation
      role: decoded.role,
      tenant_id: decoded.tenant_id,
      permissions: decoded.permissions,
    };

    next();
  } catch (error) {
    console.error('PowerSync authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware to validate user owns the resource (for row-level security)
const validateUserOwnership = (req, res, next) => {
  // Example: Ensure user can only access their own data
  const { table } = req.params;
  
  // Add user_id to data for create/update operations
  if (req.method === 'PUT' || req.method === 'PATCH' || req.method === 'POST') {
    if (!req.body) req.body = {};
    req.body.user_id = req.user.id;
  }
  
  next();
};

module.exports = {
  authenticateUser,
  authenticatePowerSyncUser,
  validateUserOwnership
};