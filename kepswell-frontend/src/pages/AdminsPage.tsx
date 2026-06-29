import { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Paper, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, IconButton, Chip, Select, MenuItem, InputLabel, FormControl
} from '@mui/material';
import { Add as AddIcon, DeleteOutlined as DeleteIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { WebClient } from '../api/WebClient';
import type { User } from '../types';

export default function AdminsPage() {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const webClient = new WebClient(navigate, showNotification, undefined, () => {});

    const [admins, setAdmins] = useState<User[]>([]);
    const [openAdd, setOpenAdd] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('MANAGER');

    const fetchAdmins = async () => {
        const data = await webClient.handleFetchAdmins();
        setAdmins(data);
    };

    useEffect(() => {
        fetchAdmins();
    }, []);

    const handleAdd = async () => {
        if (!email || !fullName || !password) {
            showNotification('Mohon isi semua field', 'error');
            return;
        }
        setLoading(true);
        try {
            await webClient.handleCreateAdmin({ email, full_name: fullName, password, role });
            setOpenAdd(false);
            setEmail(''); setFullName(''); setPassword(''); setRole('MANAGER');
            fetchAdmins();
        } catch (e) {
            // error handled in webclient
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus admin ini?')) return;
        setLoading(true);
        try {
            await webClient.handleDeleteAdmin(id);
            fetchAdmins();
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
                        Manajemen Admin
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
                    Tambah Admin
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
                        {admins.map((admin) => (
                            <TableRow key={admin.id}>
                                <TableCell sx={{ color: '#6b7280' }}>#{admin.id}</TableCell>
                                <TableCell sx={{ fontWeight: 500 }}>{admin.full_name}</TableCell>
                                <TableCell>{admin.email}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={admin.role} 
                                        size="small"
                                        color={admin.role === 'OWNER' ? 'primary' : 'default'}
                                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        label={admin.is_active ? 'Aktif' : 'Nonaktif'} 
                                        size="small"
                                        color={admin.is_active ? 'success' : 'error'}
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" onClick={() => handleDelete(admin.id)} color="error">
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {admins.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3, color: '#6b7280' }}>
                                    Belum ada data admin
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openAdd} onClose={() => setOpenAdd(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Tambah Admin Baru</DialogTitle>
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
                        <FormControl fullWidth size="small">
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={role}
                                label="Role"
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <MenuItem value="MANAGER">Manager</MenuItem>
                                <MenuItem value="OWNER">Owner</MenuItem>
                            </Select>
                        </FormControl>
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
