import { useState } from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, Button, Select, MenuItem, FormControl,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TablePagination, Stack, Skeleton, TextField, InputAdornment, TableSortLabel
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import type { Report } from '../types';
import { useReports } from '../hooks/useReports';
import { formatCurrency, formatDuration, formatDateTime } from '../utils/format';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { WebClient } from '../api/WebClient';
import DateRangeFilter from '../components/DateRangeFilter';
import dayjs from 'dayjs';

const STATUS_COLOR: Record<string, 'success' | 'error' | 'warning' | 'default'> = {
    APPROVED: 'success',
    REJECTED: 'error',
    PENDING: 'warning',
};

const STATUS_LABEL: Record<string, string> = {
    APPROVED: 'Disetujui',
    REJECTED: 'Ditolak',
    PENDING: 'Menunggu',
};

export default function ReportsPage() {
    const [page, setPage] = useState(0);
    const [rowsPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState('');
    const [dateFilter, setDateFilter] = useState<{ preset?: string, startDate?: string, endDate?: string }>(() => {
        const d = dayjs();
        return {
            preset: d.format('YYYY-MM'),
            startDate: d.startOf('month').format('YYYY-MM-DD'),
            endDate: d.endOf('month').format('YYYY-MM-DD')
        };
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('live_date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);

    const handleSort = (property: string) => {
        const isAsc = sortBy === property && sortOrder === 'asc';
        setSortOrder(isAsc ? 'desc' : 'asc');
        setSortBy(property);
        setPage(0);
    };

    const params = {
        page: page + 1, limit: rowsPerPage,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(dateFilter.startDate ? { startDate: dateFilter.startDate } : {}),
        ...(dateFilter.endDate ? { endDate: dateFilter.endDate } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
        sortBy, sortOrder
    };

    const { reports, total, updateStatus, isPending, isLoading } = useReports(params);
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const webClient = new WebClient(navigate, showNotification, undefined, () => { });

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

                {/* Filters & Actions */}
                <Stack direction="row" spacing={1.5}>
                    <TextField 
                        size="small" 
                        placeholder="Cari nama host..." 
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                        sx={{ width: 220 }}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" sx={{ color: '#9ca3af' }} />
                                    </InputAdornment>
                                )
                            }
                        }}
                    />
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

                    <DateRangeFilter value={dateFilter} onChange={setDateFilter} />

                    <Button variant="outlined" sx={{ height: 40 }}
                        onClick={() => webClient.handleExportReports(params)}>
                        Export Excel
                    </Button>
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
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortBy === 'host_name'}
                                            direction={sortBy === 'host_name' ? sortOrder : 'asc'}
                                            onClick={() => handleSort('host_name')}
                                        >
                                            Host
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="right">
                                        <TableSortLabel
                                            active={sortBy === 'reported_gmv'}
                                            direction={sortBy === 'reported_gmv' ? sortOrder : 'asc'}
                                            onClick={() => handleSort('reported_gmv')}
                                        >
                                            GMV
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="right">
                                        <TableSortLabel
                                            active={sortBy === 'reported_pesanan_sku'}
                                            direction={sortBy === 'reported_pesanan_sku' ? sortOrder : 'asc'}
                                            onClick={() => handleSort('reported_pesanan_sku')}
                                        >
                                            Pesanan
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell align="right">
                                        <TableSortLabel
                                            active={sortBy === 'live_duration_minutes'}
                                            direction={sortBy === 'live_duration_minutes' ? sortOrder : 'asc'}
                                            onClick={() => handleSort('live_duration_minutes')}
                                        >
                                            Durasi
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Diverifikasi oleh</TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={sortBy === 'live_date'}
                                            direction={sortBy === 'live_date' ? sortOrder : 'asc'}
                                            onClick={() => handleSort('live_date')}
                                        >
                                            Tanggal
                                        </TableSortLabel>
                                    </TableCell>
                                    <TableCell>Aksi</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            {Array(9).fill(0).map((__, j) => (
                                                <TableCell key={j}><Skeleton animation="wave" height={24} /></TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : (
                                    reports.map((r: any) => (
                                        <TableRow key={r.id}>
                                            <TableCell sx={{ color: '#9ca3af' }}>#{r.id}</TableCell>
                                            <TableCell sx={{ fontWeight: 500 }}>{r.host_name}</TableCell>
                                            <TableCell align="right">{formatCurrency(r.reported_gmv)}</TableCell>
                                            <TableCell align="right">{r.reported_pesanan_sku || 0} SKU</TableCell>
                                            <TableCell align="right" sx={{ color: '#6b7280' }}>{formatDuration(r.live_duration_minutes)}</TableCell>
                                            <TableCell>
                                                <Chip label={STATUS_LABEL[r.status] ?? r.status} size="small"
                                                    color={STATUS_COLOR[r.status] ?? 'default'} />
                                            </TableCell>
                                            <TableCell sx={{ color: '#6b7280', fontSize: '0.8rem' }}>
                                                {r.user_name ?? <span style={{ color: '#d1d5db' }}>—</span>}
                                            </TableCell>
                                            <TableCell sx={{ color: '#6b7280', whiteSpace: 'nowrap' }}>{formatDateTime(r.live_date || r.created_at)}</TableCell>
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
                                    ))
                                )}
                                {!isLoading && reports.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ py: 6, color: '#9ca3af' }}>
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
                            { label: 'Host', value: selectedReport?.host_name },
                            { label: 'GMV', value: formatCurrency(selectedReport?.reported_gmv || 0) },
                            { label: 'Pesanan', value: `${selectedReport?.reported_pesanan_sku || 0} SKU` },
                            { label: 'Durasi', value: formatDuration(selectedReport?.live_duration_minutes || 0) },
                        ].map(row => (
                            <Box key={row.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ fontSize: '0.8rem', color: '#6b7280' }}>{row.label}</Typography>
                                <Typography sx={{ fontSize: '0.85rem', fontWeight: 500 }}>{row.value}</Typography>
                            </Box>
                        ))}

                        {/* Bukti Laporan dihapus sesuai permintaan */}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedReport(null)} sx={{ color: '#6b7280' }}>Batal</Button>
                    <Button variant="outlined" color="error" disabled={isPending}
                        onClick={async () => {
                            await webClient.handleVerifyReport(selectedReport!.id, 'REJECTED', updateStatus, () => setSelectedReport(null));
                        }}>
                        Tolak
                    </Button>
                    <Button variant="contained" color="success" disabled={isPending}
                        onClick={async () => {
                            await webClient.handleVerifyReport(selectedReport!.id, 'APPROVED', updateStatus, () => setSelectedReport(null));
                        }}>
                        Setujui
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
