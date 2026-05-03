import { useState } from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, Button, Select, MenuItem, FormControl,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, TablePagination, Stack
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsAPI } from '../api/reports';
import type { Report, AvailableMonth } from '../types';
import { formatCurrency, formatDuration, formatDateTime } from '../utils/format';

const STATUS_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
    APPROVED: 'success',
    REJECTED: 'error',
    PENDING:  'warning',
};

const STATUS_LABEL: Record<string, string> = {
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
    PENDING:  'Menunggu',
};

export default function ReportsPage() {
    const [page, setPage]                     = useState(0);
    const [rowsPerPage]                       = useState(10);
    const [statusFilter, setStatusFilter]     = useState('');
    const [monthFilter, setMonthFilter]       = useState<number | ''>('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [notes, setNotes]                   = useState('');

    const queryClient = useQueryClient();

    const params = {
        page: page + 1, limit: rowsPerPage,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(monthFilter  ? { month: Number(monthFilter) } : {}),
    };

    const { data } = useQuery({
        queryKey: ['reports', params],
        queryFn:  () => reportsAPI.getAll(params).then(r => r.data.data),
    });

    const { data: monthsData } = useQuery({
        queryKey: ['available-months'],
        queryFn:  () => reportsAPI.getAvailableMonths().then(r => r.data.data as AvailableMonth[]),
    });

    const { mutate: updateStatus, isPending } = useMutation({
        mutationFn: ({ id, status, notes }: { id: number; status: string; notes?: string }) =>
            reportsAPI.updateStatus(id, status, notes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            queryClient.invalidateQueries({ queryKey: ['statistics'] });
            queryClient.invalidateQueries({ queryKey: ['ranking'] });
            setSelectedReport(null);
            setNotes('');
        },
    });

    const reports: Report[] = data?.reports || [];
    const total: number     = data?.total   || 0;

    return (
        <Box>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
                <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: '#1a1d23' }}>Laporan</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#6b7280', mt: 0.25 }}>
                        Verifikasi laporan sesi live dari host
                    </Typography>
                </Box>

                {/* Filters */}
                <Stack direction="row" spacing={1.5}>
                    <FormControl sx={{ minWidth: 120 }}>
                        <Select displayEmpty value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                            renderValue={v => v === '' ? 'Semua status' : STATUS_LABEL[v as string] ?? v}>
                            <MenuItem value="">Semua status</MenuItem>
                            <MenuItem value="PENDING">Menunggu</MenuItem>
                            <MenuItem value="APPROVED">Disetujui</MenuItem>
                            <MenuItem value="REJECTED">Ditolak</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 140 }}>
                        <Select displayEmpty value={monthFilter}
                            onChange={e => { setMonthFilter(e.target.value as number); setPage(0); }}
                            renderValue={v => !v ? 'Semua bulan' : monthsData?.find(m => m.month === Number(v))?.display_name ?? String(v)}>
                            <MenuItem value="">Semua bulan</MenuItem>
                            {monthsData?.map(m => (
                                <MenuItem key={`${m.year}-${m.month}`} value={m.month}>{m.display_name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Stack>
            </Box>

            {/* Table */}
            <Card>
                <CardContent sx={{ p: 0 }}>
                    <TableContainer component={Paper} elevation={0}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    <TableCell>Host</TableCell>
                                    <TableCell>Platform</TableCell>
                                    <TableCell align="right">GMV</TableCell>
                                    <TableCell align="right">Durasi</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Tanggal</TableCell>
                                    <TableCell>Aksi</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reports.map(r => (
                                    <TableRow key={r.id}>
                                        <TableCell sx={{ color: '#9ca3af' }}>#{r.id}</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{r.host_name}</TableCell>
                                        <TableCell>
                                            <Chip label={r.platform} size="small"
                                                sx={{ bgcolor: r.platform === 'TIKTOK' ? '#f0fdf4' : '#fff7ed',
                                                      color:  r.platform === 'TIKTOK' ? '#16a34a' : '#ea580c' }} />
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(r.reported_gmv)}</TableCell>
                                        <TableCell align="right" sx={{ color: '#6b7280' }}>{formatDuration(r.live_duration_minutes)}</TableCell>
                                        <TableCell>
                                            <Chip label={STATUS_LABEL[r.status] ?? r.status} size="small"
                                                color={STATUS_COLOR[r.status] ?? 'default'} />
                                        </TableCell>
                                        <TableCell sx={{ color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDateTime(r.created_at)}</TableCell>
                                        <TableCell>
                                            {r.status === 'PENDING' && (
                                                <Button size="small" variant="outlined"
                                                    onClick={() => setSelectedReport(r)}
                                                    sx={{ whiteSpace: 'nowrap' }}>
                                                    Tinjau
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {reports.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#9ca3af' }}>
                                            Tidak ada laporan
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div" count={total} page={page}
                        rowsPerPage={rowsPerPage} rowsPerPageOptions={[10]}
                        onPageChange={(_, p) => setPage(p)}
                        sx={{ borderTop: '1px solid #f3f4f6', fontSize: '0.8rem' }}
                    />
                </CardContent>
            </Card>

            {/* Review Dialog */}
            <Dialog open={!!selectedReport} onClose={() => setSelectedReport(null)} maxWidth="xs" fullWidth>
                <DialogTitle>Tinjau Laporan #{selectedReport?.id}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {[
                            { label: 'Host',     value: selectedReport?.host_name },
                            { label: 'Platform', value: selectedReport?.platform },
                            { label: 'GMV',      value: formatCurrency(selectedReport?.reported_gmv || 0) },
                            { label: 'Durasi',   value: formatDuration(selectedReport?.live_duration_minutes || 0) },
                        ].map(row => (
                            <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ fontSize: '0.8rem', color: '#6b7280' }}>{row.label}</Typography>
                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{row.value}</Typography>
                            </Box>
                        ))}

                        <Box sx={{ borderTop: '1px solid #e5e7eb', pt: 1.5 }}>
                            <Typography sx={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', mb: 0.75 }}>
                                Catatan (opsional)
                            </Typography>
                            <TextField
                                multiline rows={2} fullWidth
                                placeholder="Tambahkan catatan..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedReport(null)} sx={{ color: '#6b7280' }}>Batal</Button>
                    <Button variant="outlined" color="error" disabled={isPending}
                        onClick={() => updateStatus({ id: selectedReport!.id, status: 'REJECTED', notes })}>
                        Tolak
                    </Button>
                    <Button variant="contained" color="success" disabled={isPending}
                        onClick={() => updateStatus({ id: selectedReport!.id, status: 'APPROVED', notes })}>
                        Setujui
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
