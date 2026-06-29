import { useState } from 'react';
import {
    Box, Typography, Paper, TextField, Button,
    Alert, InputAdornment, IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, LockOutlined } from '@mui/icons-material';
import api from '../api/axios';
import { useNotification } from '../contexts/NotificationContext';

export default function ChangePasswordPage() {
    const { showNotification } = useNotification();
    const [oldPassword, setOldPassword]     = useState('');
    const [newPassword, setNewPassword]     = useState('');
    const [confirmPass, setConfirmPass]     = useState('');
    const [showOld, setShowOld]             = useState(false);
    const [showNew, setShowNew]             = useState(false);
    const [showConfirm, setShowConfirm]     = useState(false);
    const [loading, setLoading]             = useState(false);
    const [error, setError]                 = useState('');
    const [success, setSuccess]             = useState(false);

    const handleSubmit = async () => {
        setError('');
        setSuccess(false);

        if (!oldPassword || !newPassword || !confirmPass) {
            setError('Semua field wajib diisi.');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password baru minimal 6 karakter.');
            return;
        }
        if (newPassword !== confirmPass) {
            setError('Konfirmasi password tidak cocok.');
            return;
        }

        setLoading(true);
        try {
            await api.put('/auth/change-password', {
                old_password: oldPassword,
                new_password: newPassword,
            });
            setSuccess(true);
            setOldPassword('');
            setNewPassword('');
            setConfirmPass('');
            showNotification('Password berhasil diubah!', 'success');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Gagal mengubah password.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const visibilityAdornment = (show: boolean, toggle: () => void) => ({
        endAdornment: (
            <InputAdornment position="end">
                <IconButton size="small" onClick={toggle} edge="end">
                    {show ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
            </InputAdornment>
        ),
    });

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#111827', mb: 0.5 }}>
                    Ubah Password
                </Typography>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Ganti password akun manajer Anda untuk keamanan sistem.
                </Typography>
            </Box>

            <Paper elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, p: 3, maxWidth: 440 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                    <Box sx={{ p: 1, bgcolor: '#eff6ff', borderRadius: 1.5, display: 'flex' }}>
                        <LockOutlined sx={{ fontSize: 20, color: '#2563EB' }} />
                    </Box>
                    <Box>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>
                            Keamanan Akun
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            Pastikan password baru mudah diingat namun sulit ditebak.
                        </Typography>
                    </Box>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}
                {success && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        Password berhasil diubah! Gunakan password baru untuk login berikutnya.
                    </Alert>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Password Lama"
                        type={showOld ? 'text' : 'password'}
                        fullWidth
                        value={oldPassword}
                        onChange={e => setOldPassword(e.target.value)}
                        slotProps={{ input: visibilityAdornment(showOld, () => setShowOld(v => !v)) }}
                    />
                    <TextField
                        label="Password Baru"
                        type={showNew ? 'text' : 'password'}
                        fullWidth
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        slotProps={{ input: visibilityAdornment(showNew, () => setShowNew(v => !v)) }}
                        helperText="Minimal 6 karakter"
                    />
                    <TextField
                        label="Konfirmasi Password Baru"
                        type={showConfirm ? 'text' : 'password'}
                        fullWidth
                        value={confirmPass}
                        onChange={e => setConfirmPass(e.target.value)}
                        slotProps={{ input: visibilityAdornment(showConfirm, () => setShowConfirm(v => !v)) }}
                        error={confirmPass.length > 0 && confirmPass !== newPassword}
                        helperText={confirmPass.length > 0 && confirmPass !== newPassword ? 'Password tidak cocok' : ''}
                    />
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={loading}
                        sx={{
                            bgcolor: '#2563EB',
                            '&:hover': { bgcolor: '#1d4ed8' },
                            mt: 0.5,
                            py: 1.1,
                        }}
                    >
                        {loading ? 'Menyimpan...' : 'Simpan Password Baru'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
