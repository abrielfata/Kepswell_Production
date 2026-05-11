import React, { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert } from '@mui/material';
import type { AlertColor } from '@mui/material';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationState {
    open: boolean;
    message: string;
    type: AlertColor;
}

interface NotificationContextType {
    showNotification: (message: string, type: AlertColor) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextType | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<NotificationState>({
        open: false,
        message: '',
        type: 'success',
    });

    const showNotification = useCallback((message: string, type: AlertColor) => {
        setState({ open: true, message, type });
    }, []);

    const handleClose = (_?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') return;
        setState(prev => ({ ...prev, open: false }));
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <Snackbar
                open={state.open}
                autoHideDuration={3500}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleClose}
                    severity={state.type}
                    variant="filled"
                    sx={{ width: '100%', fontSize: '0.8125rem' }}
                >
                    {state.message}
                </Alert>
            </Snackbar>
        </NotificationContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useNotification() {
    const ctx = useContext(NotificationContext);
    if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
    return ctx;
}
