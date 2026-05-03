import api from './axios';

export const reportsAPI = {
    getAll: (params?: {
        status?: string;
        month?: number;
        year?: number;
        host_id?: number;
        platform?: string;
        page?: number;
        limit?: number;
    }) => api.get('/reports', { params }),

    getById: (id: number) => api.get(`/reports/${id}`),

    updateStatus: (id: number, status: string, notes?: string) =>
        api.put(`/reports/${id}/status`, { status, notes }),

    getStatistics: (params?: { month?: number; year?: number }) =>
        api.get('/reports/statistics', { params }),

    getAvailableMonths: () => api.get('/reports/available-months'),

    getRanking: (params?: { month?: number; year?: number }) =>
        api.get('/reports/ranking', { params }),
};
