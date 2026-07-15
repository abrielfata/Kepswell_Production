import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '../types';
import { authAPI } from '../api/auth';

/** Auto-logout setelah 30 menit tidak aktif */
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;

interface AuthContextType {
    user: User | null;
    loading: boolean;
    /** @returns true jika login berhasil, false jika kredensial salah (401). Error lain tetap di-throw. */
    attemptLogin: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser]       = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setUser(null);
    }, []);

    // ── Idle Timeout: auto-logout setelah 30 menit tidak aktif ──
    const resetIdleTimer = useCallback(() => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => {
            // Hanya logout jika user sedang login
            if (localStorage.getItem('token')) {
                logout();
                window.location.href = '/login';
            }
        }, IDLE_TIMEOUT_MS);
    }, [logout]);

    useEffect(() => {
        const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
        const handler = () => resetIdleTimer();

        events.forEach(e => window.addEventListener(e, handler, { passive: true }));
        resetIdleTimer(); // mulai timer

        return () => {
            events.forEach(e => window.removeEventListener(e, handler));
            if (idleTimer.current) clearTimeout(idleTimer.current);
        };
    }, [resetIdleTimer]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) { setLoading(false); return; }

        authAPI.getMe()
            .then(res => setUser(res.data.data))
            .catch(() => localStorage.removeItem('token'))
            .finally(() => setLoading(false));
    }, []);

    const attemptLogin = async (email: string, password: string): Promise<boolean> => {
        try {
            const res = await authAPI.sendLoginRequest(email, password);
            const { token, user: userData } = res.data.data;
            localStorage.setItem('token', token);
            setUser(userData);
            resetIdleTimer(); // reset timer setelah login berhasil
            return true;
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 401) return false;
            throw err;
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, attemptLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

