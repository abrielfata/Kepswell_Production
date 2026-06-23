import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hostsAPI } from '../api/hosts';
import { useNotification } from '../contexts/NotificationContext';
import type { Host } from '../types';

export function useHosts() {
    const queryClient = useQueryClient();
    const { showNotification } = useNotification();

    const { data: hosts = [], isLoading } = useQuery({
        queryKey: ['hosts'],
        queryFn: () => hostsAPI.getAll().then(r => r.data.data as Host[]),
    });

    const { mutateAsync: createHost, isPending: creating } = useMutation({
        mutationFn: (fullName: string) => hostsAPI.create({ full_name: fullName }),
        onSuccess: (res) => {
            const created = res.data.data as Host;
            queryClient.invalidateQueries({ queryKey: ['hosts'] });
            showNotification(
                `Host ${created.full_name} berhasil ditambahkan dengan kode ${created.host_code}`,
                'success'
            );
        },
        onError: (err: any) => {
            const msg: string = err?.response?.data?.message ?? '';
            if (err?.response?.status === 409) {
                throw new Error(msg || 'Nama host sudah terdaftar');
            } else if (err?.response?.status === 400) {
                throw new Error(msg || 'Nama tidak valid');
            } else {
                showNotification('Gagal menambahkan host', 'error');
                throw new Error('Gagal menambahkan host');
            }
        },
    });

    const { mutateAsync: deleteHost, isPending: deleting } = useMutation({
        mutationFn: (id: number) => hostsAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hosts'] });
            showNotification('Host berhasil dihapus', 'success');
        },
        onError: () => {
            showNotification('Gagal menghapus host', 'error');
            throw new Error('Gagal menghapus host');
        },
    });

    return { hosts, isLoading, createHost, creating, deleteHost, deleting };
}
