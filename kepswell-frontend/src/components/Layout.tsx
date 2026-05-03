import React, { useState } from 'react';
import {
    Box, Drawer, List, ListItemButton, ListItemText,
    ListItemIcon, Typography, Divider, Button, AppBar,
    Toolbar, IconButton
} from '@mui/material';
import {
    Dashboard, People, Assessment, Menu as MenuIcon, Logout
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DRAWER_WIDTH = 240;

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
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Kepswell</Typography>
                <Typography variant="caption" color="text.secondary">
                    {user?.full_name}
                </Typography>
            </Box>
            <Divider />
            <List sx={{ flex: 1 }}>
                {navItems.map(item => (
                    <ListItemButton
                        key={item.path}
                        selected={location.pathname === item.path}
                        onClick={() => { navigate(item.path); setMobileOpen(false); }}
                    >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.label} />
                    </ListItemButton>
                ))}
            </List>
            <Divider />
            <Box sx={{ p: 2 }}>
                <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<Logout />}
                    onClick={handleLogout}
                >
                    Logout
                </Button>
            </Box>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar position="fixed" sx={{ display: { sm: 'none' }, zIndex: 1300 }}>
                <Toolbar>
                    <IconButton color="inherit" onClick={() => setMobileOpen(!mobileOpen)}>
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" sx={{ ml: 1 }}>Kepswell</Typography>
                </Toolbar>
            </AppBar>

            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={() => setMobileOpen(false)}
                sx={{ display: { sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}
            >
                {drawer}
            </Drawer>

            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
                }}
            >
                {drawer}
            </Drawer>

            <Box component="main" sx={{
                flexGrow: 1,
                ml: { sm: `${DRAWER_WIDTH}px` },
                mt: { xs: '56px', sm: 0 },
                minHeight: '100vh',
                bgcolor: '#f5f5f5',
                p: 3,
            }}>
                {children}
            </Box>
        </Box>
    );
}
