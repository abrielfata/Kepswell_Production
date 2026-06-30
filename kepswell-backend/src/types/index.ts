export interface User {
    id: number;
    email: string;
    password_hash: string;
    full_name: string;
    role: 'MANAGER';
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface Host {
    id: number;
    host_code: string;
    full_name: string;
    telegram_chat_id: string | null;
    /** Hanya host yang belum punya telegram_chat_id; dari join / ensure, bukan kolom DB. */
    pending_registration_code?: string | null;
    activated_at?: Date | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface Report {
    id: number;
    host_id: number;
    reported_gmv: number;
    reported_pesanan_sku: number;
    live_duration_minutes: number;
    screenshot_url: string | null;
    ocr_raw_text: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    month: number;
    year: number;
    user_id: number | null;
    user_name?: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface HostPerformance {
    host_id: number;
    host_name: string;
    month: number;
    year: number;
    total_reports: number;
    approved_reports: number;
    total_gmv: number;
    total_duration_minutes: number;
    avg_gmv_per_session: number;
    gmv_per_hour: number;
}

export interface JwtPayload {
    id: number;
    email: string;
    role: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
