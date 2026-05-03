import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import HostsPage from './pages/HostsPage';

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const theme = createTheme({
    palette: {
        primary:    { main: '#2563EB' },
        background: { default: '#f7f8fa', paper: '#ffffff' },
        text:       { primary: '#111827', secondary: '#6b7280' },
        divider:    '#e5e7eb',
    },
    typography: {
        fontFamily: "'Inter', sans-serif",
        button: { textTransform: 'none', fontWeight: 500 },
    },
    shape: { borderRadius: 6 },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                    border: '1px solid #e5e7eb',
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: { textTransform: 'none', fontWeight: 500, boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
            },
        },
        MuiTableHead: {
            styleOverrides: {
                root: {
                    '& .MuiTableCell-head': {
                        backgroundColor: '#f9fafb',
                        color: '#6b7280',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        borderBottom: '1px solid #e5e7eb',
                    },
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:last-child td': { borderBottom: 0 },
                    '&:hover': { backgroundColor: '#f9fafb' },
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    '&.Mui-selected': {
                        backgroundColor: '#eff6ff',
                        color: '#2563EB',
                        '& .MuiListItemIcon-root': { color: '#2563EB' },
                    },
                },
            },
        },
        MuiDrawer: {
            styleOverrides: { paper: { borderRight: '1px solid #e5e7eb', boxShadow: 'none' } },
        },
    },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user)   return <Navigate to="/login" replace />;
    return <Layout>{children}</Layout>;
}

function AppRoutes() {
    const { user, loading } = useAuth();
    if (loading) return null;

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/"        element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/hosts"   element={<ProtectedRoute><HostsPage /></ProtectedRoute>} />
            <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <BrowserRouter>
                    <AuthProvider>
                        <AppRoutes />
                    </AuthProvider>
                </BrowserRouter>
            </ThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
