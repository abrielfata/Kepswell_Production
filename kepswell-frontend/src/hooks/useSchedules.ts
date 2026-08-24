import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWeekSchedule, saveWeekSchedule } from '../api/schedules';

export const useWeekSchedule = (weekStartDate: string) => {
    return useQuery({
        queryKey: ['schedules', weekStartDate],
        queryFn: () => getWeekSchedule(weekStartDate),
    });
};

export const useSaveWeekSchedule = () => {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (data: { weekStartDate: string; entries: any[] }) => 
            saveWeekSchedule(data.weekStartDate, data.entries),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['schedules', variables.weekStartDate] });
        },
    });
};
