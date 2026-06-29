import api from './axios';

export const authAPI = {
    sendLoginRequest: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    getMe: () => api.get('/auth/me'),
};
