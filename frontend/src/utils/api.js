import axios from 'axios';

// In production (Vercel), use the Render backend URL
// In development, use the Vite proxy (/api → localhost:5000)
const BASE = import.meta.env.VITE_API_URL || '';

const API = axios.create({ baseURL: `${BASE}/api` });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('cricket_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default API;
