import { loginSchema, hostSchema } from '../utils/validations';
import { reportsAPI } from './reports';
import { authAPI } from './auth';

export class WebClient {
    private navigate: (path: string) => void;
    private showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    private sendLoginToBackend?: (email: string, password: string) => Promise<boolean>;
    private setError: (msg: string) => void;

    constructor(
        navigate: (path: string) => void,
        showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void,
        sendLoginToBackend: ((email: string, password: string) => Promise<boolean>) | undefined,
        setError: (msg: string) => void
    ) {
        this.navigate = navigate;
        this.showNotification = showNotification;
        this.sendLoginToBackend = sendLoginToBackend;
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
            const success = this.sendLoginToBackend ? await this.sendLoginToBackend(email, password) : false;
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

    public async handleVerifyReport(id: number, status: string, verifyFn: (params: {id: number, status: string}) => Promise<any>, closeDialog: () => void) {
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
    public async handleUpdateProfile(fullName?: string, password?: string) {
        try {
            const res = await authAPI.updateProfile(fullName, password);
            this.showNotification("Profil berhasil diupdate", "success");
            return res.data;
        } catch (err: any) {
            this.handleError(err.response?.data?.message || err.message || "Gagal mengupdate profil");
            throw err;
        }
    }
}
