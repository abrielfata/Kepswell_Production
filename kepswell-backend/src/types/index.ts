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
    full_name: string;
    telegram_user_id: string | null;
    binding_token: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface Report {
    id: number;
    host_id: number;
    platform: 'TIKTOK' | 'SHOPEE';
    reported_gmv: number;
    live_duration_minutes: number;
    screenshot_url: string | null;
    ocr_raw_text: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    month: number;
    year: number;
    notes: string | null;
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
