import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsAPI } from '../api/reports';
import { useNotification } from '../contexts/NotificationContext';
import type { Report, AvailableMonth } from '../types';

export function useReports(params: any) {
    const queryClient = useQueryClient();
    const { showNotification } = useNotification();

    const { data, isLoading } = useQuery({
        queryKey: ['reports', params],
        queryFn: () => reportsAPI.getAll(params).then(r => r.data.data),
    });

    const { data: monthsData } = useQuery({
        queryKey: ['available-months'],
        queryFn: () => reportsAPI.getAvailableMonths().then(r => r.data.data as AvailableMonth[]),
    });

    const { mutateAsync: updateStatus, isPending } = useMutation({
        mutationFn: ({ id, status }: { id: number; status: string }) =>
            reportsAPI.updateStatus(id, status),
        onSuccess: (_data, vars) => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.invalidateQueries({ queryKey: ['statistics'] });
            queryClient.invalidateQueries({ queryKey: ['ranking'] });
            const label = vars.status === 'APPROVED' ? 'disetujui' : 'ditolak';
            showNotification(`Laporan berhasil ${label}`, 'success');
        },
        onError: (err: any) => {
            showNotification(err.message || 'Gagal memverifikasi laporan', 'error');
        },
    });

    const reports: Report[] = data?.reports || [];
    const total: number = data?.total || 0;

    return { reports, total, isLoading, monthsData, updateStatus, isPending };
}
