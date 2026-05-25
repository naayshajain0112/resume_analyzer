const express = require('express');
const cors = require('cors');
require('dotenv').config();
const verifyRouter = require('./routes/verify');
const fs = require('fs');
const path = require('path');

// ✅ FILE LOGGING - Write logs to a file so we can verify requests are being received
const logFile = path.join(__dirname, 'server.log');
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(logFile, logEntry, 'utf8');
  console.log(message); // Also log to console
}

// ✅ VERIFY THIS FILE IS RUNNING
logToFile('========== SERVER.JS LOADED =========');
logToFile('Current file: ' + __filename);
logToFile('Node version: ' + process.version);
logToFile('Log file location: ' + logFile);
logToFile('=====================================');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ MIDDLEWARE - Setup parsers FIRST before any routes or custom middleware
app.use(cors());

// Express JSON middleware with error handling
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// ✅ GLOBAL REQUEST LOGGER - SAFELY LOGS ALL INCOMING REQUESTS
app.use((req, res, next) => {
  try {
    logToFile(`[GLOBAL REQUEST] ${req.method} ${req.path}`);
    
    // ✅ SAFE NULL CHECK - Validate req.body before calling Object.keys()
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
      logToFile(`[GLOBAL] Body keys: ${Object.keys(req.body).join(', ')}`);
      logToFile(`[GLOBAL] Body size: ${JSON.stringify(req.body).length} bytes`);
    } else if (req.body === undefined || req.body === null) {
      logToFile(`[GLOBAL] Request body is empty/null/undefined`);
    } else {
      logToFile(`[GLOBAL] Request body type: ${typeof req.body}`);
    }
    
    next();
  } catch (err) {
    logToFile(`[GLOBAL MIDDLEWARE ERROR] ${err.message}`);
    next();
  }
});

// ✅ REQUEST BODY VALIDATION MIDDLEWARE - Validate req.body for JSON requests ONLY
// Skip validation for multipart/form-data (handled by multer middleware on specific routes)
app.use('/api', (req, res, next) => {
  try {
    // ✅ SKIP VALIDATION for multipart form data (used for file uploads)
    // Multer will handle these requests on specific routes
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
      console.log('[BODY VALIDATION] Skipping validation - multipart/form-data request (will be handled by multer)');
      return next();
    }
    
    // ✅ CHECK if req.body exists and is an object (for JSON requests)
    if (!req.body) {
      logToFile(`[BODY VALIDATION] Missing request body for ${req.method} ${req.path}`);
      return res.status(400).json({
        success: false,
        error: 'Request body is required but was not provided',
        received: typeof req.body,
        path: req.path,
        method: req.method
      });
    }
    
    // ✅ CHECK if req.body is actually an object (not primitive or array)
    if (typeof req.body !== 'object' || req.body === null || Array.isArray(req.body)) {
      logToFile(`[BODY VALIDATION] Invalid request body type: ${typeof req.body}`);
      return res.status(400).json({
        success: false,
        error: 'Request body must be a JSON object',
        received: typeof req.body,
        isArray: Array.isArray(req.body),
        path: req.path
      });
    }
    
    logToFile(`[BODY VALIDATION] Request body validated successfully`);
    next();
  } catch (err) {
    logToFile(`[BODY VALIDATION ERROR] ${err.message}`);
    return res.status(500).json({
      success: false,
      error: 'Request validation failed: ' + (err?.message || 'unknown error')
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Backend is running',
    endpoints: {
      'GET /': 'Health check',
      'POST /api/verify': 'Gemini AI endpoint',
    },
  });
});

app.use('/api', verifyRouter);

app.use((req, res) => {
  console.warn(`[404] Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  try {
    // ✅ SAFE ERROR LOGGING - Handle null/undefined error properties
    const errorMessage = err?.message || 'Unknown error';
    const errorName = err?.name || 'Error';
    const errorStack = err?.stack || 'No stack trace available';
    
    logToFile('[ERROR HANDLER] Error caught: ' + errorMessage);
    logToFile('[ERROR HANDLER] Error name: ' + errorName);
    logToFile('[ERROR HANDLER] Stack: ' + errorStack.split('\n').slice(0, 3).join(' | '));
    console.error('[Error] Caught error:', errorMessage);
    
    // ✅ VALIDATE ERROR OBJECT before accessing properties
    const statusCode = (err && typeof err.status === 'number') ? err.status : 500;
    
    // ✅ SEND ERROR RESPONSE with proper status code
    return res.status(statusCode).json({
      success: false,
      error: errorMessage || 'Internal server error',
      errorName: errorName,
      timestamp: new Date().toISOString()
    });
  } catch (handlerErr) {
    // ✅ FALLBACK if error handler itself fails
    logToFile('[ERROR HANDLER FAILURE] Error handler threw: ' + (handlerErr?.message || 'unknown'));
    console.error('[Fatal Error] Error handler failed:', handlerErr?.message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error - error handler failed'
    });
  }
});

// ✅ UNCAUGHT EXCEPTION HANDLER
process.on('uncaughtException', (err) => {
  console.error('\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('UNCAUGHT EXCEPTION DETECTED!');
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n');
});

// ✅ UNHANDLED PROMISE REJECTION HANDLER
process.on('unhandledRejection', (reason, promise) => {
  console.error('\n\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
  console.error('UNHANDLED PROMISE REJECTION!');
  console.error('Reason:', reason);
  console.error('Promise:', promise);
  console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n\n');
});

const server = app.listen(PORT, () => {
  console.log('\n=================================================');
  console.log(`🚀 Backend Server is running on port: ${PORT}`);
  console.log('=================================================');
  console.log(`📍 Health check:   http://localhost:${PORT}/`);
  console.log(`📍 Verify endpoint: http://localhost:${PORT}/api/verify`);
  console.log('=================================================');
  console.log(`Server object:`, server.address());
  console.log('=================================================\n');
});