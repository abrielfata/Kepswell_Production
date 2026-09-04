import api from './axios';
import type { Schedule } from '../types';

export const fetchWeeklySchedule = async (weekStartDate?: string): Promise<Schedule[]> => {
    let url = '/schedules';
    if (weekStartDate) {
        url += `?week=${weekStartDate}`;
    }
    const response = await api.get(url);
    return response.data.data;
};

export const postWeeklySchedule = async (
    weekStartDate: string,
    entries: { schedule_date: string; slot_index: number; host_id: number }[]
): Promise<void> => {
    await api.put('/schedules', { weekStartDate, entries });
};
