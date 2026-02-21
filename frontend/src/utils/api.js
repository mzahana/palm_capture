import axios from 'axios';

// Since we are proxying API requests through the Vite Dev Server to avoid HTTPS Mixed Content blocks, 
// the base URL must be empty so requests remain relative to the frontend's origin!
export const BASE_URL = "";

const api = axios.create({
    baseURL: BASE_URL,
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
