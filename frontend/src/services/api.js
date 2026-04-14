import axios from "axios";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn("VITE_API_BASE_URL missing. Falling back to http://localhost:3001");
}

const API = axios.create({
  baseURL: apiBaseUrl,
});

// Add token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
