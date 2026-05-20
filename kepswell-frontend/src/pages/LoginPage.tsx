import { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, CircularProgress, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { webClient } from '../api/WebClient';

export default function LoginPage() {
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    const { login } = useAuth();
    const navigate  = useNavigate();
    const { showNotification } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!webClient.validateLoginForm(email, password)) {
            const msg = 'Email tidak valid atau password terlalu pendek';
            setError(msg);
            webClient.showNotification(msg, 'error');
            return;
        }

        setLoading(true);
        try {
            const ok = await login(email, password);
            if (ok) {
                showNotification('Login berhasil', 'success');
                navigate('/');
            } else {
                const msg = 'Email atau password tidak valid';
                setError(msg);
                showNotification(msg, 'error');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Terjadi kesalahan. Coba lagi nanti.';
            setError(msg);
            showNotification(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            bgcolor: '#f8f9fb',
        }}>
            <Box sx={{ width: '100%', maxWidth: 360 }}>
                {/* Header */}
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                    <Box sx={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 40, height: 40, borderRadius: 2,
                        bgcolor: '#2563EB', mb: 2,
                    }}>
                        <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>K</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.1rem', color: '#1a1d23' }}>
                        Masuk ke Kepswell
                    </Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: '#6b7280', mt: 0.5 }}>
                        Live Session Reporting System
                    </Typography>
                </Box>

                {/* Card */}
                <Box sx={{
                    bgcolor: '#fff', border: '1px solid #e5e7eb',
                    borderRadius: '10px', p: 3,
                }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                                Email
                            </Typography>
                            <TextField
                                type="email" placeholder="manager@kepswell.com"
                                value={email} onChange={e => setEmail(e.target.value)}
                                required fullWidth
                            />
                        </Box>
                        <Box>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                                Password
                            </Typography>
                            <TextField
                                type="password" placeholder="••••••••"
                                value={password} onChange={e => setPassword(e.target.value)}
                                required fullWidth
                            />
                        </Box>

                        <Divider sx={{ my: 0.5 }} />

                        <Button
                            type="submit" variant="contained" fullWidth
                            disabled={loading}
                            sx={{ py: 1.1, fontWeight: 600, fontSize: '0.875rem' }}
                        >
                            {loading
                                ? <CircularProgress size={16} sx={{ color: '#fff' }} />
                                : 'Masuk'
                            }
                        </Button>
                    </Box>
                </Box>

                <Typography sx={{ textAlign: 'center', mt: 3, fontSize: '0.72rem', color: '#9ca3af' }}>
                    Kepswell &copy; {new Date().getFullYear()} &mdash; Hanya untuk Manager
                </Typography>
            </Box>
        </Box>
    );
}
