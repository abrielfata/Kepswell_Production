import { useState } from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, IconButton, Tooltip, Alert
} from '@mui/material';
import { ContentCopy, Check, Refresh } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hostsAPI } from '../api/hosts';
import { useNotification } from '../contexts/NotificationContext';
import type { Host } from '../types';
import { formatDate } from '../utils/format';

export default function HostsPage() {
    const [createOpen, setCreateOpen]   = useState(false);
    const [fullName, setFullName]       = useState('');
    const [nameError, setNameError]     = useState('');
    const [copiedId, setCopiedId]       = useState<number | null>(null);

    const queryClient = useQueryClient();
    const { showNotification } = useNotification();

    const { data: hosts = [] } = useQuery({
        queryKey: ['hosts'],
        queryFn:  () => hostsAPI.getAll().then(r => r.data.data as Host[]),
    });

    const { mutate: createHost, isPending: creating } = useMutation({
        mutationFn: () => hostsAPI.create({ full_name: fullName }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hosts'] });
            setCreateOpen(false);
            setFullName('');
            setNameError('');
            showNotification('Host berhasil ditambahkan', 'success');
        },
        onError: (err: any) => {
            const msg: string = err?.response?.data?.message ?? '';
            if (err?.response?.status === 409) {
                setNameError(msg || 'Nama host sudah terdaftar');
            } else {
                showNotification('Gagal menambahkan host', 'error');
            }
        },
    });

    const { mutate: regenerateCode } = useMutation({
        mutationFn: (id: number) => hostsAPI.regenerateRegistrationCode(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hosts'] });
            showNotification('Kode registrasi berhasil diganti', 'success');
        },
        onError: () => showNotification('Gagal memperbarui kode', 'error'),
    });

    const { mutate: deleteHost } = useMutation({
        mutationFn: (id: number) => hostsAPI.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hosts'] });
            showNotification('Host berhasil dihapus', 'success');
        },
        onError: () => showNotification('Gagal menghapus host', 'error'),
    });

    const copyRegisterCommand = (host: Host) => {
        const code = host.pending_registration_code;
        if (!code) return;
        navigator.clipboard.writeText(`/daftar ${code}`);
        setCopiedId(host.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleClose = () => {
        setCreateOpen(false);
        setFullName('');
        setNameError('');
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
                <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: '#1a1d23' }}>Host</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#6b7280', mt: 0.25 }}>
                        Kelola host dan kode registrasi sekali pakai (Telegram Chat ID setelah aktivasi)
                    </Typography>
                </Box>
                <Button variant="contained" onClick={() => setCreateOpen(true)} sx={{ px: 2 }}>
                    Tambah Host
                </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 2.5 }}>
                Setelah host dibuat, berikan <strong>kode registrasi</strong> ke host (di luar sistem).
                Host kirim <strong>/daftar KODE</strong> di bot Telegram. Kode hanya dipakai sekali; identitas host
                adalah Chat ID Telegram.
            </Alert>

            <Card>
                <CardContent sx={{ p: 0 }}>
                    <TableContainer component={Paper} elevation={0}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nama</TableCell>
                                    <TableCell>Telegram</TableCell>
                                    <TableCell>Kode Registrasi</TableCell>
                                    <TableCell>Dibuat</TableCell>
                                    <TableCell>Aksi</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {hosts.map(host => (
                                    <TableRow key={host.id}>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 500, fontSize: '0.85rem' }}>{host.full_name}</Typography>
                                            <Typography sx={{ fontSize: '0.72rem', color: '#9ca3af' }}>#{host.id}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            {host.telegram_chat_id
                                                ? <Chip label="Terhubung" size="small" color="success" />
                                                : <Chip label="Belum aktivasi" size="small" sx={{ bgcolor: '#f9fafb', color: '#6b7280' }} />
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {!host.telegram_chat_id && host.pending_registration_code ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#374151' }}>
                                                        {host.pending_registration_code}
                                                    </Typography>
                                                    <Tooltip title={copiedId === host.id ? 'Tersalin!' : 'Salin /daftar KODE'}>
                                                        <IconButton size="small" onClick={() => copyRegisterCommand(host)}
                                                            sx={{ color: copiedId === host.id ? '#16a34a' : '#9ca3af' }}>
                                                            {copiedId === host.id
                                                                ? <Check sx={{ fontSize: 14 }} />
                                                                : <ContentCopy sx={{ fontSize: 14 }} />
                                                            }
                                                        </IconButton>
                                                    </Tooltip>
                                                    <Tooltip title="Ganti kode baru (kode lama tidak berlaku)">
                                                        <IconButton size="small" onClick={() => regenerateCode(host.id)}
                                                            sx={{ color: '#9ca3af' }}>
                                                            <Refresh sx={{ fontSize: 16 }} />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            ) : host.telegram_chat_id ? (
                                                <Typography sx={{ fontSize: '0.72rem', color: '#9ca3af' }}>—</Typography>
                                            ) : (
                                                <Tooltip title="Muat ulang atau buat kode">
                                                    <IconButton size="small" onClick={() => regenerateCode(host.id)}
                                                        sx={{ color: '#9ca3af' }}>
                                                        <Refresh sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ color: '#6b7280' }}>{formatDate(host.created_at)}</TableCell>
                                        <TableCell>
                                            <Button size="small" variant="text"
                                                color="error"
                                                onClick={() => { if (confirm(`Hapus ${host.full_name}?`)) deleteHost(host.id); }}>
                                                Hapus
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {hosts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                                            Belum ada host — klik &quot;Tambah Host&quot; untuk mulai
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            <Dialog open={createOpen} onClose={handleClose} maxWidth="xs" fullWidth>
                <DialogTitle>Tambah Host Baru</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 0.5 }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                            Nama Lengkap
                        </Typography>
                        <TextField
                            placeholder="Contoh: Siti Rahma"
                            value={fullName}
                            onChange={e => { setFullName(e.target.value); setNameError(''); }}
                            fullWidth autoFocus
                            error={!!nameError}
                            helperText={nameError}
                            onKeyDown={e => { if (e.key === 'Enter' && fullName.trim()) createHost(); }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} sx={{ color: '#6b7280' }}>
                        Batal
                    </Button>
                    <Button variant="contained" disabled={!fullName.trim() || creating}
                        onClick={() => createHost()}>
                        Buat Host
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
