import React, { useState } from 'react';
import {
    Box, Drawer, List, ListItemButton, ListItemText,
    ListItemIcon, Typography, Divider, Button, AppBar,
    Toolbar, IconButton
} from '@mui/material';
import { Dashboard, People, Assessment, Menu as MenuIcon, Logout } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DRAWER_WIDTH = 220;

const navItems = [
    { label: 'Dashboard', path: '/',        icon: <Dashboard fontSize="small" /> },
    { label: 'Laporan',   path: '/reports', icon: <Assessment fontSize="small" /> },
    { label: 'Host',      path: '/hosts',   icon: <People fontSize="small" /> },
];

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate         = useNavigate();
    const location         = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const drawer = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #e5e7eb' }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
                    Kepswell
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#6b7280', mt: 0.25 }}>
                    Manager Dashboard
                </Typography>
            </Box>

            <List sx={{ flex: 1, px: 1, pt: 1.5 }}>
                {navItems.map(item => (
                    <ListItemButton
                        key={item.path}
                        selected={location.pathname === item.path}
                        onClick={() => { navigate(item.path); setMobileOpen(false); }}
                        sx={{ mb: 0.25, py: 0.75 }}
                    >
                        <ListItemIcon sx={{ minWidth: 32 }}>{item.icon}</ListItemIcon>
                        <ListItemText
                            primary={item.label}
                            slotProps={{ primary: { style: { fontSize: '0.875rem' } } }}
                        />
                    </ListItemButton>
                ))}
            </List>

            <Divider />
            <Box sx={{ px: 2, py: 1.5 }}>
                <Typography sx={{ fontSize: '0.78rem', fontWeight: 500, color: '#374151', mb: 0.25 }}>
                    {user?.full_name}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#9ca3af', mb: 1.25 }}>Manager</Typography>
                <Button
                    size="small" fullWidth variant="outlined"
                    startIcon={<Logout fontSize="small" />}
                    onClick={() => { logout(); navigate('/login'); }}
                    sx={{ color: '#6b7280', borderColor: '#d1d5db', fontSize: '0.78rem' }}
                >
                    Keluar
                </Button>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{ display: { sm: 'none' }, bgcolor: '#ffffff', color: '#111827', boxShadow: '0 1px 0 #e5e7eb' }}>
                <Toolbar variant="dense">
                    <IconButton onClick={() => setMobileOpen(!mobileOpen)} size="small">
                        <MenuIcon fontSize="small" />
                    </IconButton>
                    <Typography sx={{ ml: 1, fontWeight: 700, fontSize: '0.95rem' }}>Kepswell</Typography>
                </Toolbar>
            </AppBar>

            <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
                sx={{ display: { sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
                {drawer}
            </Drawer>

            <Drawer variant="permanent"
                sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}>
                {drawer}
            </Drawer>

            <Box component="main" sx={{
                flexGrow: 1,
                ml: { sm: `${DRAWER_WIDTH}px` },
                mt: { xs: '48px', sm: 0 },
                minHeight: '100vh',
                bgcolor: '#f7f8fa',
                p: { xs: 2, sm: 3 },
            }}>
                {children}
            </Box>
        </Box>
    );
}
