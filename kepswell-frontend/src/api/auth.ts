import api from './axios';

export const authAPI = {
    sendLoginRequest: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    getMe: () => api.get('/auth/me'),
    updateProfile: (full_name?: string, password?: string) => 
        api.put('/auth/profile', { full_name, password })
};
