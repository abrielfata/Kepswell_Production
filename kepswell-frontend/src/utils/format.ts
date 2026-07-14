/**
 * Hitung jumlah sesi berdasarkan durasi live.
 * 1 sesi = 120 menit, dan butuh minimal 30 menit sisa untuk dihitung sesi berikutnya.
 *
 * Contoh:
 *   59 menit  → 0 sesi
 *   60 menit  → 1 sesi
 *   90 menit  → 1 sesi
 *  120 menit  → 1 sesi
 *  179 menit  → 1 sesi
 *  180 menit  → 2 sesi
 *  240 menit  → 2 sesi
 *  300 menit  → 3 sesi
 */
export const calculateSessions = (minutes: number): number => {
    if (!minutes || minutes <= 0) return 0;
    const SESSION_DURATION = 120;
    const MIN_THRESHOLD    = 60; // butuh min 1 jam sisa untuk dihitung sesi berikutnya
    const fullSessions = Math.floor(minutes / SESSION_DURATION);
    const remainder    = minutes % SESSION_DURATION;
    return fullSessions + (remainder >= MIN_THRESHOLD ? 1 : 0);
};

export const formatCurrency = (amount: number): string => {
    const num = Number(amount);
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0,
    }).format(num);
};

export const formatDuration = (minutes: number): string => {
    if (!minutes) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}j`;
    return `${h}j ${m}m`;
};

export const formatDateTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
};

export const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
    });
};
