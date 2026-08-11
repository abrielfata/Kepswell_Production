import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Typography, Button } from '@mui/material';
import { formatCurrency, formatDuration } from '../../utils/format';
import type { Report } from '../../types';

interface ReportReviewDialogProps {
    report: Report | null;
    onClose: () => void;
    onVerify: (id: number, status: 'APPROVED' | 'REJECTED') => Promise<void>;
    isPending: boolean;
}

export default function ReportReviewDialog({ report, onClose, onVerify, isPending }: ReportReviewDialogProps) {
    if (!report) return null;

    return (
        <Dialog open={!!report} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>Tinjau Laporan #{report.id}</DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {report.screenshot_url && (
                        <Box sx={{ 
                            width: '100%', 
                            height: 300, 
                            mb: 1, 
                            borderRadius: 1, 
                            overflow: 'hidden',
                            backgroundColor: '#f3f4f6',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}>
                            <img 
                                src={report.screenshot_url} 
                                alt="Bukti Laporan" 
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </Box>
                    )}
                    {[
                        { label: 'Host', value: report.host_name },
                        { label: 'GMV', value: formatCurrency(report.reported_gmv || 0) },
                        { label: 'Pesanan', value: `${report.reported_pesanan_sku || 0} SKU` },
                        { label: 'Durasi', value: formatDuration(report.live_duration_minutes || 0) },
                    ].map(row => (
                        <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontSize: '0.8rem', color: '#6b7280' }}>{row.label}</Typography>
                            <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{row.value}</Typography>
                        </Box>
                    ))}
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} sx={{ color: '#6b7280' }}>Batal</Button>
                <Button variant="outlined" color="error" disabled={isPending}
                    onClick={() => onVerify(report.id, 'REJECTED')}>
                    Tolak
                </Button>
                <Button variant="contained" color="success" disabled={isPending}
                    onClick={() => onVerify(report.id, 'APPROVED')}>
                    Setujui
                </Button>
            </DialogActions>
        </Dialog>
    );
}
