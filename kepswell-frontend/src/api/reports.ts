import api from './axios';

export const reportsAPI = {
    getAll: (params?: {
        status?: string;
        month?: number;
        year?: number;
        host_id?: number;
        page?: number;
        limit?: number;
    }) => api.get('/reports', { params }),

    getById: (id: number) => api.get(`/reports/${id}`),

    updateStatus: (id: number, status: string) =>
        api.put(`/reports/${id}/status`, { status }),

    getAvailableMonths: () => api.get('/reports/available-months'),

    getDashboardOverview: (params?: { month?: number; year?: number }) =>
        api.get('/reports/dashboard', { params }),
};
