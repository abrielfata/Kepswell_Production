import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import HostsPage from './pages/HostsPage';
import ManagersPage from './pages/ManagersPage';
import './index.css';

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

const theme = createTheme({
    palette: {
        primary:    { main: '#2563EB', dark: '#1d4ed8', light: '#3b82f6', contrastText: '#fff' },
        success:    { main: '#16a34a', contrastText: '#fff' },
        error:      { main: '#dc2626', contrastText: '#fff' },
        warning:    { main: '#d97706', contrastText: '#fff' },
        background: { default: '#f8f9fb', paper: '#ffffff' },
        text:       { primary: '#1a1d23', secondary: '#6b7280' },
        divider:    '#e5e7eb',
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: 14,
        h6:     { fontWeight: 600, fontSize: '1rem' },
        body2:  { fontSize: '0.8125rem' },
        caption:{ fontSize: '0.75rem' },
        button: { textTransform: 'none', fontWeight: 500, fontSize: '0.8125rem' },
    },
    shape: { borderRadius: 8 },
    components: {
        MuiCssBaseline: {
            styleOverrides: { body: { backgroundColor: '#f8f9fb' } },
        },
        MuiCard: {
            defaultProps: { elevation: 0 },
            styleOverrides: {
                root: { border: '1px solid #e5e7eb', borderRadius: 10 },
            },
        },
        MuiCardContent: {
            styleOverrides: { root: { '&:last-child': { paddingBottom: 16 } } },
        },
        MuiButton: {
            styleOverrides: {
                root: { textTransform: 'none', fontWeight: 500, boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
                sizeSmall: { fontSize: '0.775rem', padding: '3px 10px' },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                root: { fontSize: '0.8125rem', padding: '10px 14px', borderBottom: '1px solid #f3f4f6' },
                head: {
                    fontSize: '0.72rem', fontWeight: 600, color: '#6b7280',
                    backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb',
                    textTransform: 'uppercase', letterSpacing: '0.04em',
                    padding: '8px 14px',
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:last-child td': { borderBottom: 0 },
                    '&:hover td': { backgroundColor: '#fafafa' },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { fontSize: '0.72rem', fontWeight: 500, height: 22, borderRadius: 5 },
                label: { padding: '0 7px' },
            },
        },
        MuiDrawer: {
            styleOverrides: { paper: { border: 'none', borderRight: '1px solid #e5e7eb', boxShadow: 'none' } },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 7, margin: '1px 8px', width: 'calc(100% - 16px)', padding: '7px 10px',
                    '&.Mui-selected': {
                        backgroundColor: '#eff6ff', color: '#2563EB',
                        '& .MuiListItemIcon-root': { color: '#2563EB' },
                        '&:hover': { backgroundColor: '#dbeafe' },
                    },
                    '&:hover': { backgroundColor: '#f9fafb' },
                },
            },
        },
        MuiTextField: {
            defaultProps: { size: 'small' },
            styleOverrides: {
                root: { '& .MuiOutlinedInput-root': { fontSize: '0.875rem' } },
            },
        },
        MuiSelect: {
            defaultProps: { size: 'small' },
        },
        MuiDialog: {
            styleOverrides: { paper: { borderRadius: 12, border: '1px solid #e5e7eb', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' } },
        },
        MuiDialogTitle: {
            styleOverrides: { root: { fontSize: '0.95rem', fontWeight: 600, padding: '16px 20px 12px' } },
        },
        MuiDialogContent: {
            styleOverrides: { root: { padding: '8px 20px 16px' } },
        },
        MuiDialogActions: {
            styleOverrides: { root: { padding: '8px 20px 16px', gap: 8 } },
        },
        MuiAlert: {
            styleOverrides: { root: { fontSize: '0.8125rem', borderRadius: 8 } },
        },
        MuiFormControl: {
            defaultProps: { size: 'small' },
        },
    },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    if (!user) return <Navigate to="/login" replace />;
    return <Layout>{children}</Layout>;
}

function AppRoutes() {
    const { user, loading } = useAuth();
    if (loading) return null;
    return (
        <Routes>
            <Route path="/login"   element={user ? <Navigate to="/" replace /> : <LoginPage />} />
            <Route path="/"        element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/hosts"   element={<ProtectedRoute><HostsPage /></ProtectedRoute>} />
            <Route path="/managers"  element={<ProtectedRoute><ManagersPage /></ProtectedRoute>} />
            <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
    );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <NotificationProvider>
                    <BrowserRouter>
                        <AuthProvider>
                            <AppRoutes />
                        </AuthProvider>
                    </BrowserRouter>
                </NotificationProvider>
            </ThemeProvider>
        </QueryClientProvider>
    </React.StrictMode>
);
