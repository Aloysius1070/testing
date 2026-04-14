// Production backend is on Render (cache bust v2)
const PRODUCTION_API = 'https://ca-backend-jdg9.onrender.com';
// Use backend dev port 5000 (uvicorn default in this project)
const DEV_API = 'http://localhost:5000';

// Force use of environment variable or fallback to Render
export const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? PRODUCTION_API : DEV_API);

// Debug log (remove after deployment works)
// console.log('API_URL configured:', API_URL);
