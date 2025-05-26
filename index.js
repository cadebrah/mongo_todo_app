const express = require('express');
const config = require('./config');

const app = express();

// 🐛 DEBUG: Add route registration logging
console.log('🔧 Starting server with route debugging...');

// Override Express router methods to catch problematic routes
const originalRouterMethod = express.Router;
express.Router = function(...args) {
  const router = originalRouterMethod.apply(this, args);
  
  // Override route methods
  ['get', 'post', 'put', 'patch', 'delete', 'use'].forEach(method => {
    const originalMethod = router[method];
    router[method] = function(path, ...handlers) {
      console.log(`📍 Registering ${method.toUpperCase()} route: "${path}"`);
      
      // Check for problematic route patterns
      if (typeof path === 'string') {
        // Check for missing parameter names
        if (path.includes('/:') && !path.match(/\/:[a-zA-Z_][a-zA-Z0-9_]*/)) {
          console.error(`❌ PROBLEMATIC ROUTE FOUND: ${method.toUpperCase()} "${path}"`);
          console.error('   This route has a colon (:) without a proper parameter name!');
          process.exit(1);
        }
      }
      
      return originalMethod.call(this, path, ...handlers);
    };
  });
  
  return router;
};

// Body parsing
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
console.log('📍 Registering health check route...');
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    powersync_configured: !!config.powersync?.instanceUrl
  });
});

// Try to load auth routes safely
console.log('📍 Loading auth routes...');
// try {
//   const { router: authRoutes, generatePowerSyncToken } = require('./controllers/authController');
//   console.log('✅ Auth controller loaded successfully');
//   app.use('/', authRoutes);  // This is where the error might happen
//   console.log('✅ Auth routes registered successfully');
// } catch (error) {
//   console.error('❌ Error loading auth controller:', error.message);
//   console.error('Creating fallback auth routes...');
  
//   // Fallback auth routes
//   app.get('/.well-known/jwks.json', (req, res) => {
//     res.status(500).json({ error: 'Auth controller not available' });
//   });
  
//   app.post('/powersync-token', (req, res) => {
//     res.status(500).json({ error: 'Auth controller not available' });
//   });
// }
app.get('/.well-known/jwks.json', (req, res) => {
    res.status(500).json({ error: 'Auth controller not available' });
  });
  
  app.post('/powersync-token', (req, res) => {
    res.status(500).json({ error: 'Auth controller not available' });
  });
// Try to load data routes safely  
console.log('📍 Loading data routes...');
try {
  const dataRoutes = require('./controllers/dataController');
  console.log('✅ Data controller loaded successfully');
  app.use('/api', dataRoutes);  // This is where the error might happen
  console.log('✅ Data routes registered successfully');
} catch (error) {
  console.error('❌ Error loading data controller:', error.message);
  console.error('Full error:', error);
  
  // Create fallback data routes
  app.use('/api', (req, res) => {
    res.status(500).json({ error: 'Data controller not available' });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('📍 404 - Route not found:', req.originalUrl);
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const PORT = config.port || 3000;
console.log('📍 Starting server...');

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 JWKS endpoint: http://localhost:${PORT}/.well-known/jwks.json`);
  console.log(`⚡ PowerSync instance: ${config.powersync?.instanceUrl || 'NOT CONFIGURED'}`);
  
  console.log('\n✅ All routes registered successfully!');
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