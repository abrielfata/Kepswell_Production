import React, { useState } from 'react';
import {
    Box, Drawer, List, ListItemButton, ListItemText,
    ListItemIcon, Typography, Divider, Button, AppBar,
    Toolbar, IconButton
} from '@mui/material';
import {
    GridView, AssignmentOutlined, PeopleOutlined,
    Menu as MenuIcon, LogoutOutlined, LockOutlined
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DRAWER_WIDTH = 224;

const navItems = [
    { label: 'Dashboard', path: '/',        icon: <GridView sx={{ fontSize: 18 }} /> },
    { label: 'Laporan',   path: '/reports', icon: <AssignmentOutlined sx={{ fontSize: 18 }} /> },
    { label: 'Host',      path: '/hosts',   icon: <PeopleOutlined sx={{ fontSize: 18 }} /> },
    { label: 'Ubah Password', path: '/settings/password', icon: <LockOutlined sx={{ fontSize: 18 }} /> },
];

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate         = useNavigate();
    const location         = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const isActive = (path: string) =>
        path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

    const drawer = (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#fff' }}>
            {/* Brand */}
            <Box sx={{ px: 2.5, pt: 2.5, pb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: '#1a1d23', letterSpacing: '-0.2px' }}>
                    Kepstore
                </Typography>
                <Typography sx={{ fontSize: '0.72rem', color: '#9ca3af', mt: 0.25 }}>
                    Live Session Reporting
                </Typography>
            </Box>

            <Divider sx={{ mx: 2 }} />

            {/* Nav */}
            <Box sx={{ pt: 1.5, flex: 1 }}>
                <Typography sx={{
                    px: 2.5, mb: 0.75, fontSize: '0.65rem', fontWeight: 600,
                    color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                    Menu
                </Typography>
                <List disablePadding>
                    {navItems.map(item => {
                        const active = isActive(item.path);
                        return (
                            <ListItemButton
                                key={item.path}
                                selected={active}
                                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                            >
                                <ListItemIcon sx={{ minWidth: 30, color: active ? '#2563EB' : '#9ca3af' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    slotProps={{
                                        primary: {
                                            style: {
                                                fontSize: '0.8375rem',
                                                fontWeight: active ? 600 : 400,
                                                color: active ? '#2563EB' : '#374151',
                                            },
                                        },
                                    }}
                                />
                            </ListItemButton>
                        );
                    })}
                </List>
            </Box>

            <Divider sx={{ mx: 2 }} />

            {/* User + Logout */}
            <Box sx={{ px: 2.5, py: 2 }}>
                <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.25 }}>
                    {user?.full_name}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#9ca3af', mb: 1.5 }}>
                    Manager
                </Typography>
                <Button
                    fullWidth size="small" variant="text"
                    startIcon={<LogoutOutlined sx={{ fontSize: 15 }} />}
                    onClick={() => { logout(); navigate('/login'); }}
                    sx={{
                        justifyContent: 'flex-start', color: '#6b7280', px: 1,
                        '&:hover': { bgcolor: '#fef2f2', color: '#dc2626' },
                    }}
                >
                    Keluar
                </Button>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            {/* Mobile top bar */}
            <AppBar position="fixed" elevation={0} sx={{
                display: { sm: 'none' }, bgcolor: '#fff', color: '#1a1d23',
                borderBottom: '1px solid #e5e7eb', zIndex: 1300,
            }}>
                <Toolbar variant="dense" sx={{ minHeight: 48 }}>
                    <IconButton onClick={() => setMobileOpen(!mobileOpen)} size="small" edge="start">
                        <MenuIcon sx={{ fontSize: 20 }} />
                    </IconButton>
                    <Typography sx={{ ml: 1.5, fontWeight: 700, fontSize: '0.9rem' }}>Kepstore</Typography>
                </Toolbar>
            </AppBar>

            {/* Drawer mobile */}
            <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)}
                ModalProps={{ keepMounted: true }}
                sx={{ display: { sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
                {drawer}
            </Drawer>

            {/* Drawer desktop */}
            <Drawer variant="permanent"
                sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' } }}>
                {drawer}
            </Drawer>

            {/* Main content */}
            <Box component="main" sx={{
                flexGrow: 1,
                ml: { sm: `${DRAWER_WIDTH}px` },
                mt: { xs: '48px', sm: 0 },
                minHeight: '100vh',
                bgcolor: '#f8f9fb',
                p: { xs: 2, sm: 3 },
                maxWidth: '100%',
            }}>
                {/* Page top border accent */}
                <Box sx={{ mb: 3, pb: 2.5, borderBottom: '1px solid #e5e7eb' }}>
                    <Typography sx={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        {navItems.find(n => isActive(n.path))?.label ?? 'Kepstore'}
                    </Typography>
                </Box>
                {children}
            </Box>
        </Box>
    );
}
