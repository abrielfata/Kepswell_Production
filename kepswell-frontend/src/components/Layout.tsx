import React, { useState } from 'react';
import {
    Box, Drawer, List, ListItemButton, ListItemText,
    ListItemIcon, Typography, Divider, Button, AppBar,
    Toolbar, IconButton, Avatar
} from '@mui/material';
import {
    Dashboard, People, Assessment, Menu as MenuIcon,
    Logout, LiveTv
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DRAWER_WIDTH = 256;

const navItems = [
    { label: 'Dashboard',  path: '/',        icon: <Dashboard /> },
    { label: 'Reports',    path: '/reports', icon: <Assessment /> },
    { label: 'Hosts',      path: '/hosts',   icon: <People /> },
];

export default function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const navigate         = useNavigate();
    const location         = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const drawer = (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#fff' }}>
            {/* Logo / Branding */}
            <Box sx={{
                px: 3, py: 2.5,
                background: 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
                display: 'flex', alignItems: 'center', gap: 1.5,
            }}>
                <Box sx={{
                    width: 36, height: 36, borderRadius: '10px',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <LiveTv sx={{ color: '#fff', fontSize: 20 }} />
                </Box>
                <Box>
                    <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '1.1rem', lineHeight: 1.2 }}>
                        Kepswell
                    </Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        Manager Dashboard
                    </Typography>
                </Box>
            </Box>

            {/* Navigation */}
            <Box sx={{ px: 1.5, pt: 2, flex: 1 }}>
                <Typography sx={{ px: 1.5, mb: 1, fontSize: '0.65rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Menu
                </Typography>
                <List disablePadding>
                    {navItems.map(item => {
                        const selected = location.pathname === item.path;
                        return (
                            <ListItemButton
                                key={item.path}
                                selected={selected}
                                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                                sx={{ mb: 0.5 }}
                            >
                                <ListItemIcon sx={{ minWidth: 36, color: selected ? '#1565C0' : '#64748B' }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    slotProps={{
                                        primary: {
                                            style: {
                                                fontSize: '0.875rem',
                                                fontWeight: selected ? 600 : 400,
                                                color: selected ? '#1565C0' : '#334155',
                                            }
                                        }
                                    }}
                                />
                                {selected && (
                                    <Box sx={{ width: 4, height: 20, bgcolor: '#1565C0', borderRadius: 2 }} />
                                )}
                            </ListItemButton>
                        );
                    })}
                </List>
            </Box>

            <Divider sx={{ borderColor: '#F1F5F9' }} />

            {/* User Info + Logout */}
            <Box sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, px: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: '#1565C0', fontSize: '0.8rem' }}>
                        {user?.full_name?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ overflow: 'hidden' }}>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user?.full_name}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: '#64748B' }}>Manager</Typography>
                    </Box>
                </Box>
                <Button
                    fullWidth variant="outlined"
                    startIcon={<Logout sx={{ fontSize: 16 }} />}
                    onClick={handleLogout} size="small"
                    sx={{
                        borderColor: '#E2E8F0', color: '#64748B', fontSize: '0.8rem',
                        '&:hover': { borderColor: '#DC2626', color: '#DC2626', bgcolor: '#FEF2F2' },
                    }}
                >
                    Sign Out
                </Button>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{
                display: { sm: 'none' }, zIndex: 1300,
                background: 'linear-gradient(135deg, #1565C0 0%, #1976D2 100%)',
                boxShadow: '0 2px 8px rgba(21,101,192,0.3)',
            }}>
                <Toolbar>
                    <IconButton color="inherit" onClick={() => setMobileOpen(!mobileOpen)}>
                        <MenuIcon />
                    </IconButton>
                    <LiveTv sx={{ ml: 1, mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Kepswell</Typography>
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
                mt: { xs: '56px', sm: 0 },
                minHeight: '100vh',
                bgcolor: '#F0F4F8',
                p: { xs: 2, sm: 3 },
            }}>
                {children}
            </Box>
        </Box>
    );
}
