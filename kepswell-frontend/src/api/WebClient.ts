import { loginSchema, hostSchema } from '../utils/validations';
import { reportsAPI } from './reports';

export class WebClient {
    private navigate: (path: string) => void;
    private showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    private login?: (email: string, password: string) => Promise<boolean>;
    private setError: (msg: string) => void;

    constructor(
        navigate: (path: string) => void,
        showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void,
        login: ((email: string, password: string) => Promise<boolean>) | undefined,
        setError: (msg: string) => void
    ) {
        this.navigate = navigate;
        this.showNotification = showNotification;
        this.login = login;
        this.setError = setError;
    }

    public validateLoginForm(email: string, password: string): boolean {
        const result = loginSchema.safeParse({ email, password });
        return result.success;
    }

    public handleError(message: string) {
        this.setError(message);
        this.showNotification(message, 'error');
    }

    public async handleSubmit(email: string, password: string) {
        const isValid = this.validateLoginForm(email, password);
        if (!isValid) {
            this.handleError("Email tidak valid atau password terlalu pendek");
            return;
        }

        try {
            const success = this.login ? await this.login(email, password) : false;
            if (success) {
                this.showNotification("Login berhasil", "success");
                this.navigate('/');
            } else {
                this.handleError("Email atau password tidak valid");
            }
        } catch (error) {
            this.handleError("Terjadi kesalahan pada server");
        }
    }

    public validateName(fullName: string): string | null {
        const result = hostSchema.safeParse({ full_name: fullName });
        if (!result.success) {
            return result.error.issues[0].message;
        }
        return null;
    }

    public handleValidationError(error: string) {
        this.setError(error);
    }

    public handleCreateSuccess(_res?: any) {
        this.showNotification("Host berhasil ditambahkan", "success");
    }

    public handleCreateError(err: any) {
        this.setError(err.message || "Gagal menambah host");
    }

    public closeDeleteDialog(closeDialog: () => void) {
        closeDialog();
    }

    public closeVerifyDialog(closeDialog: () => void) {
        closeDialog();
    }

    public handleVerifySuccess() {
        this.showNotification("Status laporan berhasil diperbarui", "success");
    }

    public handleVerifyError(err: any) {
        this.setError(err.message || "Gagal memperbarui status laporan");
    }

    public async handleVerifyReport(id: number, status: string, verifyFn: (params: { id: number, status: string }) => Promise<any>, closeDialog: () => void) {
        try {
            await verifyFn({ id, status });
            this.handleVerifySuccess();
            this.closeVerifyDialog(closeDialog);
        } catch (err: any) {
            this.handleVerifyError(err);
        }
    }

    public handleDeleteSuccess(_res?: any) {
        this.showNotification("Host berhasil dihapus", "success");
    }

    public async handleFetchAvailableMonths() {
        try {
            const res = await reportsAPI.getAvailableMonths();
            return res.data.data;
        } catch (err: any) {
            this.handleError(err.message || "Gagal mengambil daftar bulan");
            return [];
        }
    }

    public async handleFetchDashboardData(params: any) {
        try {
            const res = await reportsAPI.getDashboardOverview(params);
            return res.data.data;
        } catch (err: any) {
            this.handleError(err.message || "Gagal mengambil data dashboard dari server");
            return { statistics: null, ranking: [] };
        }
    }

    public handleDeleteError(err: any) {
        this.setError(err.message || "Gagal menghapus host");
    }

    public async confirmDelete(id: number, deleteHost: (id: number) => Promise<any>, closeDialog: () => void) {
        try {
            const res = await deleteHost(id);
            this.handleDeleteSuccess(res);
            this.closeDeleteDialog(closeDialog);
        } catch (err: any) {
            this.handleDeleteError(err);
        }
    }

    public async handleTambahHost(fullName: string, createHost: (name: string) => Promise<any>, resetCreateForm: () => void) {
        const error = this.validateName(fullName);
        if (error) {
            this.handleValidationError(error);
            return;
        }

        try {
            const res = await createHost(fullName);
            this.handleCreateSuccess(res);
            resetCreateForm();
        } catch (err: any) {
            this.handleCreateError(err);
        }
    }

    public handleEditSuccess(_res?: any) {
        this.showNotification("Nama host berhasil diubah", "success");
    }

    public handleEditError(err: any) {
        this.setError(err.message || "Gagal mengubah nama host");
    }

    public async handleEditHost(id: number, fullName: string, updateHost: (data: { id: number; fullName: string }) => Promise<any>, closeEditDialog: () => void) {
        const error = this.validateName(fullName);
        if (error) {
            this.handleValidationError(error);
            return;
        }

        try {
            const res = await updateHost({ id, fullName });
            this.handleEditSuccess(res);
            closeEditDialog();
        } catch (err: any) {
            this.handleEditError(err);
        }
    }

    private generateCSVString(data: any[]): string {
        const headers = ['ID', 'Host', 'GMV (Rp)', 'Pesanan SKU', 'Durasi (Menit)', 'Status', 'Diverifikasi Oleh', 'Tanggal'];
        
        const csvRows = data.map((r: any) => {
            return [
                r.id,
                `"${r.host_name}"`, // Quote strings to prevent comma issues
                r.reported_gmv,
                r.reported_pesanan_sku || 0,
                r.live_duration_minutes,
                r.status,
                `"${r.user_name || ''}"`,
                `"${new Date(r.created_at).toLocaleString('id-ID')}"`
            ].join(',');
        });

        return [headers.join(','), ...csvRows].join('\n');
    }

    private downloadCSV(csvString: string, filename: string): void {
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    public async handleExportReports(params: any) {
        try {
            // Override limit to get all data
            const exportParams = { ...params, limit: 1000, page: 1 };
            const res = await reportsAPI.getAll(exportParams);
            const data = res.data.data;

            if (!data || data.length === 0) {
                this.handleError("Tidak ada data laporan untuk diekspor");
                return;
            }

            const csvString = this.generateCSVString(data);
            const filename = `Laporan_Kepstore_${new Date().toISOString().split('T')[0]}.csv`;
            
            this.downloadCSV(csvString, filename);

            this.showNotification("Berhasil mengekspor data laporan", "success");
        } catch (err: any) {
            this.handleError(err.message || "Gagal mengekspor data laporan");
        }
    }
}
