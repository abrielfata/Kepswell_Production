import api from './axios';

export const hostsAPI = {
    getAll: (is_active?: boolean) =>
        api.get('/hosts', { params: is_active !== undefined ? { is_active } : {} }),
    getById: (id: number) => api.get(`/hosts/${id}`),
    create: (data: { full_name: string }) => api.post('/hosts', data),
    update: (id: number, data: { full_name?: string }) =>
        api.put(`/hosts/${id}`, data),
    delete: (id: number) => api.delete(`/hosts/${id}`),
};
