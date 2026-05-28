/**
 * src/config.js - API Configuration
 * 
 * Centralized configuration for all backend API calls.
 * Uses environment variables (import.meta.env) for different deployment environments.
 * 
 * Environment Variables:
 * - VITE_API_URL: Base URL for backend API (e.g., http://localhost:5000)
 * 
 * Usage:
 * import { API_URL, API_ENDPOINTS } from './config';
 * 
 * fetch(`${API_URL}${API_ENDPOINTS.VERIFY}`, {...})
 */

// Get API base URL from environment variables
// In development: http://localhost:5000 (from .env.local)
// In production: actual deployed URL (from .env.production)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Define all API endpoints as constants
const API_ENDPOINTS = {
  VERIFY: '/api/verify',
  // Add more endpoints as needed
  // AUTH: '/api/auth',
  // PROFILE: '/api/profile',
};

/**
 * Helper function to build complete API URL
 * @param {string} endpoint - The API endpoint (e.g., '/api/verify')
 * @returns {string} - Full API URL
 */
export const buildApiUrl = (endpoint) => `${API_URL}${endpoint}`;

/**
 * Logger for API configuration (debug purposes)
 */
export const logApiConfig = () => {
  console.log('[API Config] Base URL:', API_URL);
  console.log('[API Config] Environment:', import.meta.env.MODE);
  console.log('[API Config] Available endpoints:', Object.keys(API_ENDPOINTS));
};

// Log configuration on module load (only in development)
if (import.meta.env.DEV) {
  console.log('[API Config] 🔧 API Configuration loaded');
  console.log('[API Config] VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('[API Config] Fallback URL:', API_URL);
}

export { API_URL, API_ENDPOINTS };
