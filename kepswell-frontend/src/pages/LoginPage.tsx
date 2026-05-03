import { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [error, setError]       = useState('');
    const [loading, setLoading]   = useState(false);

    const { login } = useAuth();
    const navigate  = useNavigate();

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
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f7f8fa',
        }}>
            <Box sx={{
                width: '100%', maxWidth: 360,
                bgcolor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 2,
                p: 4,
            }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1.2rem', color: '#111827', mb: 0.5 }}>
                    Kepswell
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: '#6b7280', mb: 3 }}>
                    Masuk ke akun manager Anda
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2, fontSize: '0.82rem' }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="Email" type="email" size="small"
                        value={email} onChange={e => setEmail(e.target.value)}
                        required fullWidth
                    />
                    <TextField
                        label="Password" type="password" size="small"
                        value={password} onChange={e => setPassword(e.target.value)}
                        required fullWidth
                    />
                    <Button
                        type="submit" variant="contained" fullWidth
                        disabled={loading}
                        sx={{ mt: 0.5, py: 1.1, fontWeight: 600 }}
                    >
                        {loading ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Masuk'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}
