import { loginSchema, hostSchema } from '../utils/validations';
import { reportsAPI } from './reports';
import * as XLSX from 'xlsx-js-style';

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

    public async handleExportReports(params: any) {
        try {
            // Override limit to get all data and enforce only APPROVED reports for payroll
            const exportParams = { ...params, status: 'APPROVED', limit: 1000, page: 1 };
            const res = await reportsAPI.getAll(exportParams);
            const data = res.data.data.reports || [];

            if (data.length === 0) {
                this.handleError("Tidak ada data laporan untuk diekspor");
                return;
            }

            const grouped: Record<string, any[]> = {};
            let totalCO     = 0;
            let totalGMV    = 0;
            let totalJamDec = 0;

            const calcShiftDuration = (minutes: number) => {
                const hours     = Math.floor(minutes / 60);
                const remainder = minutes % 60;
                let additional  = 0;
                if (remainder >= 30 && remainder < 50) additional = 0.5;
                else if (remainder >= 50) additional = 1;
                return hours + additional;
            };

            data.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            data.forEach((r: any) => {
                const dateObj = new Date(r.created_at);
                const day   = String(dateObj.getDate()).padStart(2, '0');
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const year  = dateObj.getFullYear();
                const dateStr = `${day}/${month}/${year}`;

                if (!grouped[dateStr]) grouped[dateStr] = [];
                grouped[dateStr].push(r);

                totalCO     += Number(r.reported_pesanan_sku || 0);
                totalGMV    += Number(r.reported_gmv || 0);
                totalJamDec += calcShiftDuration(Number(r.live_duration_minutes || 0));
            });

            const m = params.startDate ? new Date(params.startDate).toLocaleDateString('id-ID', { month: 'long' }).toUpperCase() : "SEMUA PERIODE";
            const formatCsvCurrency = (val: number) => 'Rp' + Math.floor(val).toLocaleString('id-ID'); 

            let excelData: any[][] = [];
            excelData.push([`LAPORAN LIVE TIKTOK KEPSWELL BULAN ${m}`, '', '', '', '', '']); // Row 0
            
            const formatTotalJam = totalJamDec % 1 === 0 ? totalJamDec.toString() : totalJamDec.toFixed(1).replace('.', ',');
            excelData.push([`TOTAL REKAP`, '', '', totalCO, formatCsvCurrency(totalGMV), formatTotalJam]); // Row 1
            excelData.push([`TANGGAL`, `NAMA`, `JAM`, `JUMLAH CO`, `PENGHASILAN`, `JAM`]); // Row 2

            let greyRows: number[] = [];

            const dateKeys = Object.keys(grouped);
            dateKeys.forEach((dateStr, idx) => {
                grouped[dateStr].forEach(r => {
                    const co  = Number(r.reported_pesanan_sku || 0);
                    const gmv = Number(r.reported_gmv || 0);
                    
                    const durationH = calcShiftDuration(Number(r.live_duration_minutes || 0));
                    const durStr    = durationH % 1 === 0 ? durationH.toString() : durationH.toFixed(1).replace('.', ',');

                    const end   = new Date(r.created_at);
                    const start = new Date(end.getTime() - Number(r.live_duration_minutes || 0) * 60000);
                    
                    const startH = String(start.getHours()).padStart(2, '0');
                    const startM = String(start.getMinutes()).padStart(2, '0');
                    const endH   = String(end.getHours()).padStart(2, '0');
                    const endM   = String(end.getMinutes()).padStart(2, '0');
                    const shiftStr = `${startH}.${startM}-${endH}.${endM}`;

                    excelData.push([dateStr, (r.host_name || '').toUpperCase(), shiftStr, co, formatCsvCurrency(gmv), durStr]);
                });
                
                if (idx < dateKeys.length - 1) {
                    excelData.push(['', '', '', '', '', '']);
                    greyRows.push(excelData.length - 1);
                }
            });

            const worksheet = XLSX.utils.aoa_to_sheet(excelData);

            worksheet['!merges'] = [
                { s: {r:0, c:0}, e: {r:0, c:5} }, // Title merge A1:F1
                { s: {r:1, c:0}, e: {r:1, c:2} }  // Total Rekap merge A2:C2
            ];

            worksheet['!cols'] = [
                { wch: 15 }, // TANGGAL
                { wch: 18 }, // NAMA
                { wch: 18 }, // JAM
                { wch: 15 }, // JUMLAH CO
                { wch: 18 }, // PENGHASILAN
                { wch: 10 }  // JAM
            ];

            const borderStyle = {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
            };

            const range = XLSX.utils.decode_range(worksheet['!ref'] as string);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_ref = XLSX.utils.encode_cell({c:C, r:R});
                    if (!worksheet[cell_ref]) worksheet[cell_ref] = { t: 's', v: '' };
                    
                    let cell = worksheet[cell_ref];
                    cell.s = { 
                        border: borderStyle,
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                    
                    if (R === 0) {
                        cell.s.font = { bold: true, sz: 14 };
                    } else if (R === 1 || R === 2) {
                        cell.s.font = { bold: true, sz: 11 };
                    } else if (greyRows.includes(R)) {
                        cell.s.fill = { fgColor: { rgb: "999999" } };
                    }
                }
            }

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");

            const period = params.startDate ? params.startDate.substring(0,7) : 'Semua_Periode';
            const filename = `Laporan_Kepstore_${period}.xlsx`;
            XLSX.writeFile(workbook, filename);

            this.showNotification("Berhasil mengekspor data laporan ke Excel", "success");
        } catch (err: any) {
            this.handleError(err.message || "Gagal mengekspor data laporan");
        }
    }
}
