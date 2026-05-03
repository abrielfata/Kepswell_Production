import { useState } from 'react';
import {
    Box, TextField, Button, Typography,
    Alert, CircularProgress, InputAdornment, IconButton
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff, LiveTv } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
    const [email, setEmail]           = useState('');
    const [password, setPassword]     = useState('');
    const [error, setError]           = useState('');
    const [loading, setLoading]       = useState(false);
    const [showPassword, setShowPass] = useState(false);

    const { login }  = useAuth();
    const navigate   = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Email atau password salah');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #EFF6FF 100%)',
        }}>
            {/* Left Panel — Branding */}
            <Box sx={{
                display: { xs: 'none', md: 'flex' },
                flex: 1,
                background: 'linear-gradient(160deg, #1565C0 0%, #0D47A1 60%, #1565C0 100%)',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 3,
                p: 6,
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative circles */}
                <Box sx={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
                <Box sx={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />

                <Box sx={{ zIndex: 1, textAlign: 'center' }}>
                    <Box sx={{
                        width: 72, height: 72, borderRadius: '20px',
                        bgcolor: 'rgba(255,255,255,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        mx: 'auto', mb: 3,
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                    }}>
                        <LiveTv sx={{ fontSize: 36, color: '#fff' }} />
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: '#fff', mb: 1, letterSpacing: '-1px' }}>
                        Kepswell
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem', maxWidth: 320, lineHeight: 1.6 }}>
                        Live Session Reporting System untuk manajemen performa host e-commerce
                    </Typography>

                    <Box sx={{ mt: 5, display: 'flex', flexDirection: 'column', gap: 2, textAlign: 'left' }}>
                        {[
                            { icon: '📊', text: 'Dashboard analitik performa host' },
                            { icon: '🤖', text: 'Laporan otomatis via Telegram + OCR' },
                            { icon: '🏆', text: 'Sistem peringkat berbasis algoritma' },
                        ].map(item => (
                            <Box key={item.text} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Box sx={{ fontSize: '1.2rem' }}>{item.icon}</Box>
                                <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem' }}>
                                    {item.text}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Box>

            {/* Right Panel — Login Form */}
            <Box sx={{
                flex: { xs: 1, md: '0 0 440px' },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                p: { xs: 3, sm: 5 },
                bgcolor: '#fff',
            }}>
                <Box sx={{ width: '100%', maxWidth: 380 }}>
                    {/* Mobile logo */}
                    <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
                        <Box sx={{ width: 40, height: 40, borderRadius: '12px', bgcolor: '#1565C0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <LiveTv sx={{ color: '#fff', fontSize: 22 }} />
                        </Box>
                        <Typography sx={{ fontWeight: 700, fontSize: '1.3rem', color: '#0F172A' }}>Kepswell</Typography>
                    </Box>

                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5 }}>
                        Selamat datang
                    </Typography>
                    <Typography sx={{ color: '#64748B', fontSize: '0.9rem', mb: 4 }}>
                        Masuk ke Manager Dashboard
                    </Typography>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextField
                            label="Email"
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required fullWidth
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Email sx={{ color: '#94A3B8', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                        <TextField
                            label="Password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required fullWidth
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Lock sx={{ color: '#94A3B8', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton size="small" onClick={() => setShowPass(!showPassword)} edge="end">
                                                {showPassword
                                                    ? <VisibilityOff sx={{ fontSize: 18, color: '#94A3B8' }} />
                                                    : <Visibility sx={{ fontSize: 18, color: '#94A3B8' }} />
                                                }
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                },
                            }}
                        />
                        <Button
                            type="submit"
                            variant="contained"
                            fullWidth
                            disabled={loading}
                            size="large"
                            sx={{
                                mt: 0.5, py: 1.5,
                                background: 'linear-gradient(135deg, #1565C0, #1976D2)',
                                fontSize: '0.95rem',
                                fontWeight: 700,
                                letterSpacing: '0.02em',
                                '&:hover': { background: 'linear-gradient(135deg, #0D47A1, #1565C0)' },
                            }}
                        >
                            {loading
                                ? <CircularProgress size={22} sx={{ color: '#fff' }} />
                                : 'Sign In'
                            }
                        </Button>
                    </Box>

                    <Typography sx={{ mt: 5, textAlign: 'center', color: '#94A3B8', fontSize: '0.75rem' }}>
                        Kepswell © 2024 · Live Session Reporting System
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
