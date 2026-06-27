import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { authAPI } from '../api/auth';

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
            return true;
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (status === 401) return false;
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
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
