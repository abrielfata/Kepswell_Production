export interface User {
    id: number;
    email: string;
    full_name: string;
    role: 'MANAGER' | 'OWNER';
    is_active: boolean;
}

export interface Host {
    id: number;
    host_code: string;
    full_name: string;
    telegram_chat_id: string | null;
    pending_registration_code?: string | null;
    activated_at?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Report {
    id: number;
    host_id: number;
    host_name: string;
    platform: 'TIKTOK' | 'SHOPEE';
    reported_gmv: number;
    reported_pesanan_sku: number;
    live_duration_minutes: number;
    screenshot_url: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    month: number;
    year: number;
    notes: string | null;
    verified_by?: number | null;
    verifier_name?: string | null;
    created_at: string;
}

export interface RankedHost {
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
    score_gmv: number;
    score_sessions: number;
    score_duration: number;
    score_gmv_per_hour: number;
    final_score: number;
    rank: number;
}

export interface Statistics {
    total_reports: number;
    pending: number;
    approved: number;
    rejected: number;
    total_gmv: number;
}

export interface AvailableMonth {
    month: number;
    year: number;
    display_name: string;
    report_count: number;
}
