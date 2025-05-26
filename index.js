const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');

const config = require('./config');
const dataRoutes = require('./controllers/dataController');
const { router: authRoutes, generatePowerSyncToken } = require('./controllers/authController');
const { authenticateUser } = require('./middleware/authMiddleware');

const app = express();

// Security middleware
// app.use(helmet());
// app.use(cors(config.cors));

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use(limiter);

// Stricter rate limiting for auth endpoints
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 20, // limit each IP to 20 auth requests per windowMs
//   message: 'Too many authentication attempts, please try again later.'
// });

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    powersync_configured: !!config.powersync.instanceUrl
  });
});

// Public routes (no authentication required)
app.use(authRoutes); // JWKS and public token generation

// Protected token generation endpoint (requires your app's authentication)
// app.post('/auth/powersync-token', authLimiter, authenticateUser, async (req, res) => {
//   try {
//     if (!config.powersync?.instanceUrl) {
//       return res.status(500).json({ error: 'PowerSync instance URL not configured' });
//     }

//     // Generate custom claims based on authenticated user
//     const customClaims = {
//       role: req.user.role,
//       tenant_id: req.user.tenant_id,
//       permissions: req.user.permissions,
//       email: req.user.email
//     };

//     const tokenData = generatePowerSyncToken(req.user.id, customClaims);
    
//     res.json(tokenData);

//   } catch (error) {
//     console.error('Error generating PowerSync token:', error);
//     res.status(500).json({ error: 'Failed to generate token' });
//   }
// });

// Protected data routes (require PowerSync JWT authentication)
app.use('/api', dataRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(config.port, () => {
  console.log(`🚀 Server running on port ${config.port}`);
  console.log(`📋 Health check: ${config.url}:${config.port}/health`);
  console.log(`🔑 JWKS endpoint: ${config.url}:${config.port}/.well-known/jwks.json`);
  console.log(`⚡ PowerSync instance: ${config.powersync.instanceUrl}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Development mode - remember to implement proper authentication');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});