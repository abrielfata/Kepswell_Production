import { useState } from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, IconButton, Tooltip, Alert
} from '@mui/material';
import { ContentCopy, Check } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hostsAPI } from '../api/hosts';
import { useNotification } from '../contexts/NotificationContext';
import type { Host } from '../types';
import { formatDate } from '../utils/format';
import { webClient } from '../api/WebClient';

export default function HostsPage() {
    const [createOpen, setCreateOpen]   = useState(false);
    const [deleteOpen, setDeleteOpen]   = useState(false);
    const [hostToDelete, setHostToDelete] = useState<Host | null>(null);
    const [fullName, setFullName]       = useState('');
    const [nameError, setNameError]     = useState('');
    const [copiedId, setCopiedId]       = useState<number | null>(null);

    // ── Validasi realtime (Lapis 1 — Frontend) ──────────────────────────────
    function validateName(value: string): string {
        if (!webClient.validateHostForm(value)) return 'Nama tidak valid (min. 3 karakter, minimal 2 kata)';
        const normalized = value.trim().replace(/\s{2,}/g, ' ');
        if (normalized.length > 100) return 'Nama terlalu panjang (maks. 100 karakter)';
        if (/\s{2,}/.test(value.trim())) return 'Nama tidak boleh mengandung spasi ganda';
        if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s.']*$/.test(normalized)) {
            return 'Nama hanya boleh mengandung huruf, spasi, titik, atau apostrof';
        }
        return '';
    }

    const queryClient = useQueryClient();
    const { showNotification } = useNotification();

    const { data: hosts = [] } = useQuery({
        queryKey: ['hosts'],
        queryFn:  () => hostsAPI.getAll().then(r => r.data.data as Host[]),
    });

    const { mutate: createHost, isPending: creating } = useMutation({
        mutationFn: () => hostsAPI.create({ full_name: fullName }),
        onSuccess: (res) => {
            const created = res.data.data as Host;
            queryClient.invalidateQueries({ queryKey: ['hosts'] });
            setCreateOpen(false);
            setFullName('');
            setNameError('');
            showNotification(
                `Host ${created.full_name} berhasil ditambahkan dengan kode ${created.host_code}`,
                'success'
            );
        },
        onError: (err: any) => {
            const msg: string = err?.response?.data?.message ?? '';
            if (err?.response?.status === 409) {
                setNameError(msg || 'Nama host sudah terdaftar');
            } else if (err?.response?.status === 400) {
                setNameError(msg || 'Nama tidak valid');
            } else {
                showNotification('Gagal menambahkan host', 'error');
            }
        },
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

    const handleDeleteClick = (host: Host) => {
        setHostToDelete(host);
        setDeleteOpen(true);
    };

    const confirmDelete = () => {
        if (hostToDelete) {
            deleteHost(hostToDelete.id);
            setDeleteOpen(false);
            setHostToDelete(null);
        }
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
                                    <TableCell>Kode</TableCell>
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
                                            <Typography sx={{
                                                fontFamily: 'monospace',
                                                fontWeight: 600,
                                                fontSize: '0.82rem',
                                                color: '#2563EB',
                                                letterSpacing: '0.03em',
                                            }}>
                                                {host.host_code}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography sx={{ fontWeight: 500, fontSize: '0.85rem' }}>{host.full_name}</Typography>
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
                                                </Box>
                                            ) : (
                                                <Typography sx={{ fontSize: '0.72rem', color: '#9ca3af' }}>—</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell sx={{ color: '#6b7280' }}>{formatDate(host.created_at)}</TableCell>
                                        <TableCell>
                                            <Button size="small" variant="text"
                                                color="error"
                                                onClick={() => handleDeleteClick(host)}>
                                                Hapus
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {hosts.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#9ca3af' }}>
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
                            onChange={e => {
                                const val = e.target.value;
                                setFullName(val);
                                setNameError(validateName(val));
                            }}
                            fullWidth autoFocus
                            error={!!nameError}
                            helperText={nameError || ' '}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && fullName.trim() && !validateName(fullName)) createHost();
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} sx={{ color: '#6b7280' }}>
                        Batal
                    </Button>
                    <Button variant="contained"
                        disabled={!fullName.trim() || !!validateName(fullName) || creating}
                        onClick={() => createHost()}>
                        Buat Host
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Konfirmasi Hapus</DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontSize: '0.9rem', color: '#374151' }}>
                        Apakah Anda yakin ingin menghapus host <strong>{hostToDelete?.full_name}</strong>?
                        Tindakan ini tidak dapat dibatalkan.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ pb: 2, px: 3 }}>
                    <Button onClick={() => setDeleteOpen(false)} sx={{ color: '#6b7280' }}>
                        Batal
                    </Button>
                    <Button variant="contained" color="error" onClick={confirmDelete}>
                        Hapus
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
