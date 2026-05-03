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
import type { Host } from '../types';
import { formatDate } from '../utils/format';

export default function HostsPage() {
    const [createOpen, setCreateOpen]   = useState(false);
    const [fullName, setFullName]       = useState('');
    const [copiedId, setCopiedId]       = useState<number | null>(null);

    const queryClient = useQueryClient();

    const { data: hosts = [] } = useQuery({
        queryKey: ['hosts'],
        queryFn:  () => hostsAPI.getAll().then(r => r.data.data as Host[]),
    });

    const { mutate: createHost, isPending: creating } = useMutation({
        mutationFn: () => hostsAPI.create({ full_name: fullName }),
        onSuccess:  () => {
            queryClient.invalidateQueries({ queryKey: ['hosts'] });
            setCreateOpen(false);
            setFullName('');
        },
    });

    const { mutate: toggleStatus } = useMutation({
        mutationFn: (id: number) => hostsAPI.toggleStatus(id),
        onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['hosts'] }),
    });

    const { mutate: regenerateToken } = useMutation({
        mutationFn: (id: number) => hostsAPI.regenerateToken(id),
        onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['hosts'] }),
    });

    const { mutate: deleteHost } = useMutation({
        mutationFn: (id: number) => hostsAPI.delete(id),
        onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['hosts'] }),
    });

    const copyToken = (host: Host) => {
        navigator.clipboard.writeText(`/bind ${host.binding_token}`);
        setCopiedId(host.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
                <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: '#1a1d23' }}>Host</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#6b7280', mt: 0.25 }}>
                        Kelola akun host dan token binding Telegram
                    </Typography>
                </Box>
                <Button variant="contained" onClick={() => setCreateOpen(true)} sx={{ px: 2 }}>
                    Tambah Host
                </Button>
            </Box>

            {/* Info */}
            <Alert severity="info" sx={{ mb: 2.5 }}>
                Setelah host dibuat, salin token binding dan kirimkan ke host.
                Host ketik <strong>/bind TOKEN</strong> di Telegram Bot untuk menghubungkan akun.
            </Alert>

            {/* Table */}
            <Card>
                <CardContent sx={{ p: 0 }}>
                    <TableContainer component={Paper} elevation={0}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Nama</TableCell>
                                    <TableCell>Telegram</TableCell>
                                    <TableCell>Binding Token</TableCell>
                                    <TableCell>Status</TableCell>
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
                                            {host.telegram_user_id
                                                ? <Chip label="Terhubung" size="small" color="success" />
                                                : <Chip label="Belum terhubung" size="small" sx={{ bgcolor: '#f9fafb', color: '#6b7280' }} />
                                            }
                                        </TableCell>
                                        <TableCell>
                                            {host.binding_token ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <Typography sx={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#374151' }}>
                                                        {host.binding_token.slice(0, 10)}…
                                                    </Typography>
                                                    <Tooltip title={copiedId === host.id ? 'Tersalin!' : 'Salin perintah /bind'}>
                                                        <IconButton size="small" onClick={() => copyToken(host)}
                                                            sx={{ color: copiedId === host.id ? '#16a34a' : '#9ca3af' }}>
                                                            {copiedId === host.id
                                                                ? <Check sx={{ fontSize: 14 }} />
                                                                : <ContentCopy sx={{ fontSize: 14 }} />
                                                            }
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            ) : (
                                                <Tooltip title="Buat token baru">
                                                    <IconButton size="small" onClick={() => regenerateToken(host.id)}
                                                        sx={{ color: '#9ca3af' }}>
                                                        <Refresh sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={host.is_active ? 'Aktif' : 'Nonaktif'}
                                                size="small"
                                                color={host.is_active ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ color: '#6b7280' }}>{formatDate(host.created_at)}</TableCell>
                                        <TableCell>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button size="small" variant="outlined"
                                                    color={host.is_active ? 'warning' : 'success'}
                                                    onClick={() => toggleStatus(host.id)}>
                                                    {host.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                                </Button>
                                                <Button size="small" variant="text"
                                                    color="error"
                                                    onClick={() => { if (confirm(`Hapus ${host.full_name}?`)) deleteHost(host.id); }}>
                                                    Hapus
                                                </Button>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {hosts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                                            Belum ada host — klik "Tambah Host" untuk mulai
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>

            {/* Create Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Tambah Host Baru</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 0.5 }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                            Nama Lengkap
                        </Typography>
                        <TextField
                            placeholder="Contoh: Siti Rahma"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            fullWidth autoFocus
                            onKeyDown={e => { if (e.key === 'Enter' && fullName.trim()) createHost(); }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setCreateOpen(false); setFullName(''); }} sx={{ color: '#6b7280' }}>
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
