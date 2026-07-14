import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }

        if (err.response?.data?.message) {
            err.message = err.response.data.message;
        } else if (err.response?.status >= 500) {
            err.message = 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.';
        } else if (err.message === 'Network Error') {
            err.message = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
        } else if (err.message.includes('status code')) {
            err.message = 'Terjadi kesalahan tidak terduga. Silakan coba lagi.';
        }

        return Promise.reject(err);
    }
);

export default api;
