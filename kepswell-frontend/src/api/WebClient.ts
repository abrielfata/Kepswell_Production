import api from './axios';

export class WebClient {
    validateLoginForm(email: string, password: string): boolean {
        return email.includes('@') && password.length >= 6;
    }

    async handleSubmit(email: string, password: string): Promise<void> {
        if (!this.validateLoginForm(email, password)) return;
        await api.post('/auth/login', { email, password });
    }

    validateHostForm(fullName: string): boolean {
        return fullName.trim().length >= 3;
    }

    async handleTambahHost(fullName: string): Promise<void> {
        if (!this.validateHostForm(fullName)) return;
        await api.post('/hosts', { full_name: fullName });
    }

    showConfirmationDialog(): boolean {
        return window.confirm('Apakah Anda yakin?');
    }

    async handleHapusHost(id: number): Promise<void> {
        if (!this.showConfirmationDialog()) return;
        await api.delete(`/hosts/${id}`);
    }

    async handleApprove(reportId: number, notes?: string): Promise<void> {
        await api.patch(`/reports/${reportId}/status`, { status: 'APPROVED', notes });
    }

    async loadDashboard(month?: number, year?: number): Promise<void> {
        await Promise.all([
            api.get('/reports/statistics', { params: { month, year } }),
            api.get('/reports/ranking', { params: { month, year } })
        ]);
    }

    renderChart(data: any): void {
        console.log('Rendering chart with data:', data);
    }

    renderTable(data: any): void {
        console.log('Rendering table with data:', data);
    }

    showNotification(msg: string, type: string): void {
        console.log(`[Notification ${type}]: ${msg}`);
    }

    navigate(route: string): void {
        window.location.href = route;
    }
}

export const webClient = new WebClient();
