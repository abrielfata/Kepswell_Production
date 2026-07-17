import { useState } from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField, IconButton, Tooltip, Alert, Skeleton
} from '@mui/material';
import { ContentCopy, Check } from '@mui/icons-material';
import type { Host } from '../types';
import { formatDate } from '../utils/format';
import { useHosts } from '../hooks/useHosts';
import { WebClient } from '../api/WebClient';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';

export default function HostsPage() {
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [hostToDelete, setHostToDelete] = useState<Host | null>(null);
    const [hostToEdit, setHostToEdit] = useState<Host | null>(null);
    
    // Create form states
    const [fullName, setFullName] = useState('');
    const [nameError, setNameError] = useState('');
    
    // Edit form states
    const [editFullName, setEditFullName] = useState('');
    const [editNameError, setEditNameError] = useState('');
    
    const [copiedId, setCopiedId] = useState<number | null>(null);

    const { hosts, createHost: create, creating, updateHost, updating, deleteHost, isLoading } = useHosts();
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const webClient = new WebClient(navigate, showNotification, undefined, setNameError);

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

    const handleEditClose = () => {
        setEditOpen(false);
        setHostToEdit(null);
        setEditFullName('');
        setEditNameError('');
    };

    const handleEditClick = (host: Host) => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        setHostToEdit(host);
        setEditFullName(host.full_name);
        setEditNameError('');
        setEditOpen(true);
    };

    const handleDeleteClick = (host: Host) => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        setHostToDelete(host);
        setDeleteOpen(true);
    };

    const confirmDelete = async () => {
        if (hostToDelete) {
            await webClient.confirmDelete(hostToDelete.id, deleteHost, () => {
                setDeleteOpen(false);
                setHostToDelete(null);
            });
        }
    };

    const handleCreate = async () => {
        const createClient = new WebClient(navigate, showNotification, undefined, setNameError);
        await createClient.handleTambahHost(fullName, create, handleClose);
    };

    const handleEditSubmit = async () => {
        if (hostToEdit) {
            const editClient = new WebClient(navigate, showNotification, undefined, setEditNameError);
            await editClient.handleEditHost(hostToEdit.id, editFullName, updateHost, handleEditClose);
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
                <Button variant="contained" onClick={() => {
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                    }
                    setCreateOpen(true);
                }} sx={{ px: 2 }}>
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
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            {Array(6).fill(0).map((__, j) => (
                                                <TableCell key={j}><Skeleton animation="wave" height={24} /></TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    hosts.map(host => (
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
                                                    color="primary"
                                                    onClick={() => handleEditClick(host)}
                                                    sx={{ minWidth: 'auto', mr: 1 }}>
                                                    Edit
                                                </Button>
                                                <Button size="small" variant="text"
                                                    color="error"
                                                    onClick={() => handleDeleteClick(host)}
                                                    sx={{ minWidth: 'auto' }}>
                                                    Hapus
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                                {!isLoading && hosts.length === 0 && (
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
                            placeholder="Contoh: Abriel Fata"
                            value={fullName}
                            onChange={e => {
                                const val = e.target.value;
                                setFullName(val);
                                setNameError(webClient.validateName(val) || '');
                            }}
                            fullWidth autoFocus
                            error={!!nameError}
                            helperText={nameError || ' '}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && fullName.trim() && !webClient.validateName(fullName)) handleCreate();
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} sx={{ color: '#6b7280' }}>
                        Batal
                    </Button>
                    <Button variant="contained"
                        disabled={!fullName.trim() || !!webClient.validateName(fullName) || creating}
                        onClick={handleCreate}>
                        Buat Host
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onClose={handleEditClose} maxWidth="xs" fullWidth>
                <DialogTitle>Edit Nama Host</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 0.5 }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                            Nama Lengkap
                        </Typography>
                        <TextField
                            placeholder="Contoh: Abriel Fata"
                            value={editFullName}
                            onChange={e => {
                                const val = e.target.value;
                                setEditFullName(val);
                                setEditNameError(webClient.validateName(val) || '');
                            }}
                            fullWidth autoFocus
                            error={!!editNameError}
                            helperText={editNameError || ' '}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && editFullName.trim() && !webClient.validateName(editFullName)) handleEditSubmit();
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleEditClose} sx={{ color: '#6b7280' }}>
                        Batal
                    </Button>
                    <Button variant="contained"
                        disabled={!editFullName.trim() || !!webClient.validateName(editFullName) || updating || editFullName === hostToEdit?.full_name}
                        onClick={handleEditSubmit}>
                        Simpan
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
                    <Button onClick={() => setDeleteOpen(false)} sx={{ color: '#6b7280' }} autoFocus>
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
