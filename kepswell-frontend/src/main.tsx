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
        primary: {
            main:        '#1565C0',
            light:       '#1976D2',
            dark:        '#0D47A1',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#0288D1',
        },
        background: {
            default: '#F0F4F8',
            paper:   '#FFFFFF',
        },
        text: {
            primary:   '#0F172A',
            secondary: '#475569',
        },
        divider: '#E2E8F0',
        success: { main: '#16A34A' },
        warning: { main: '#D97706' },
        error:   { main: '#DC2626' },
    },
    typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        h5: { fontWeight: 700, letterSpacing: '-0.3px' },
        h6: { fontWeight: 600, letterSpacing: '-0.2px' },
        body2: { color: '#475569' },
        caption: { color: '#64748B' },
    },
    shape: { borderRadius: 10 },
    shadows: [
        'none',
        '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
        '0 4px 6px rgba(15,23,42,0.05), 0 2px 4px rgba(15,23,42,0.04)',
        '0 10px 15px rgba(15,23,42,0.07), 0 4px 6px rgba(15,23,42,0.04)',
        ...Array(21).fill('none') as string[],
    ] as any,
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: { backgroundColor: '#F0F4F8' },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: 8,
                    fontSize: '0.875rem',
                },
                contained: {
                    boxShadow: '0 1px 3px rgba(21,101,192,0.3)',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(21,101,192,0.35)',
                    },
                },
            },
        },
        MuiTableHead: {
            styleOverrides: {
                root: {
                    '& .MuiTableCell-head': {
                        backgroundColor: '#F8FAFC',
                        color: '#475569',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        borderBottom: '1px solid #E2E8F0',
                    },
                },
            },
        },
        MuiTableRow: {
            styleOverrides: {
                root: {
                    '&:hover': { backgroundColor: '#F8FAFC' },
                    '&:last-child td': { borderBottom: 0 },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    borderRadius: 6,
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    border: 'none',
                    boxShadow: '1px 0 0 #E2E8F0',
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    margin: '2px 8px',
                    width: 'calc(100% - 16px)',
                    '&.Mui-selected': {
                        backgroundColor: '#EFF6FF',
                        color: '#1565C0',
                        '& .MuiListItemIcon-root': { color: '#1565C0' },
                        '&:hover': { backgroundColor: '#DBEAFE' },
                    },
                },
            },
        },
        MuiTextField: {
            defaultProps: { variant: 'outlined' },
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        backgroundColor: '#FAFAFA',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#1565C0',
                        },
                    },
                },
            },
        },
        MuiDialog: {
            styleOverrides: {
                paper: {
                    borderRadius: 16,
                    boxShadow: '0 20px 60px rgba(15,23,42,0.15)',
                },
            },
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
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/hosts" element={<ProtectedRoute><HostsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
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
