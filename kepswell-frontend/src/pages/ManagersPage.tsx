import { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, IconButton, Chip
} from '@mui/material';
import { Add as AddIcon, DeleteOutlined as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { WebClient } from '../api/WebClient';
import type { User } from '../types';

export default function ManagersPage() {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const webClient = new WebClient(navigate, showNotification, undefined, () => {});

    const [managers, setManagers] = useState<User[]>([]);
    const [openAdd, setOpenAdd] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');

    const fetchManagers = async () => {
        const data = await webClient.handleFetchManagers();
        setManagers(data);
    };

    useEffect(() => {
        fetchManagers();
    }, []);

    const handleAdd = async () => {
        if (!email || !fullName || !password) {
            showNotification('Mohon isi semua field', 'error');
            return;
        }
        setLoading(true);
        try {
            await webClient.handleCreateManager({ email, full_name: fullName, password, role: 'MANAGER' });
            setOpenAdd(false);
            setEmail(''); setFullName(''); setPassword('');
            fetchManagers();
        } catch (e) {
            // error handled in webclient
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus manager ini?')) return;
        setLoading(true);
        try {
            await webClient.handleDeleteManager(id);
            fetchManagers();
        } catch (e) {
            // error handled
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
                        Manajemen Manager
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                        Kelola akun pengguna dan hak akses (Owner / Manager)
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenAdd(true)}
                    sx={{
                        bgcolor: '#2563EB',
                        '&:hover': { bgcolor: '#1d4ed8' },
                        textTransform: 'none',
                        px: 2,
                        py: 1,
                        borderRadius: 2
                    }}
                >
                    Tambah Manager
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>NAMA LENGKAP</TableCell>
                            <TableCell>EMAIL</TableCell>
                            <TableCell>ROLE</TableCell>
                            <TableCell>STATUS</TableCell>
                            <TableCell align="right">AKSI</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {managers.map((manager) => (
                            <TableRow key={manager.id}>
                                <TableCell sx={{ color: '#6b7280' }}>#{manager.id}</TableCell>
                                <TableCell sx={{ fontWeight: 500 }}>{manager.full_name}</TableCell>
                                <TableCell>{manager.email}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={manager.role} 
                                        size="small"
                                        color={manager.role === 'OWNER' ? 'primary' : 'default'}
                                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        label={manager.is_active ? 'Aktif' : 'Nonaktif'} 
                                        size="small"
                                        color={manager.is_active ? 'success' : 'error'}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    {manager.role !== 'OWNER' && (
                                        <IconButton size="small" onClick={() => handleDelete(manager.id)} color="error">
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {managers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#6b7280' }}>
                                    Belum ada data manager
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Tambah Manager Baru</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Nama Lengkap"
                            fullWidth
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                        <TextField
                            label="Email"
                            type="email"
                            fullWidth
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <TextField
                            label="Password"
                            type="password"
                            fullWidth
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2, pt: 1 }}>
                    <Button onClick={() => setOpenAdd(false)} sx={{ color: '#6b7280' }}>Batal</Button>
                    <Button 
                        variant="contained" 
                        onClick={handleAdd}
                        disabled={loading || !email || !password || !fullName}
                    >
                        Simpan
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
