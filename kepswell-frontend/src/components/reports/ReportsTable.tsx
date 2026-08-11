import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Skeleton, Chip, Button, TableSortLabel, TablePagination } from '@mui/material';
import { formatCurrency, formatDuration, formatDateTime } from '../../utils/format';
import type { Report } from '../../types';

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

interface ReportsTableProps {
    reports: Report[];
    isLoading: boolean;
    total: number;
    page: number;
    setPage: (page: number) => void;
    rowsPerPage: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    handleSort: (property: string) => void;
    setSelectedReport: (report: Report | null) => void;
}

export default function ReportsTable({
    reports, isLoading, total, page, setPage, rowsPerPage,
    sortBy, sortOrder, handleSort, setSelectedReport
}: ReportsTableProps) {
    return (
        <>
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
        </>
    );
}
