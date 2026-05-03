import { useState } from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow, Paper,
    Chip, Button, Select, MenuItem, FormControl, InputLabel,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, TablePagination
} from '@mui/material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsAPI } from '../api/reports';
import type { Report, AvailableMonth } from '../types';
import { formatCurrency, formatDuration, formatDateTime } from '../utils/format';

const statusColor = (status: string) => {
    if (status === 'APPROVED') return 'success';
    if (status === 'REJECTED') return 'error';
    return 'warning';
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
        page: page + 1,
        limit: rowsPerPage,
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(monthFilter  ? { month: Number(monthFilter) } : {}),
    };

    const { data } = useQuery({
        queryKey: ['reports', params],
        queryFn: () => reportsAPI.getAll(params).then(r => r.data.data),
    });

    const { data: monthsData } = useQuery({
        queryKey: ['available-months'],
        queryFn: () => reportsAPI.getAvailableMonths().then(r => r.data.data as AvailableMonth[]),
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
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Reports</Typography>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={e => { setStatusFilter(e.target.value); setPage(0); }}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="PENDING">Pending</MenuItem>
                        <MenuItem value="APPROVED">Approved</MenuItem>
                        <MenuItem value="REJECTED">Rejected</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Month</InputLabel>
                    <Select value={monthFilter} label="Month" onChange={e => { setMonthFilter(e.target.value as number); setPage(0); }}>
                        <MenuItem value="">All</MenuItem>
                        {monthsData?.map(m => (
                            <MenuItem key={`${m.year}-${m.month}`} value={m.month}>
                                {m.display_name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <Card>
                <CardContent sx={{ p: 0 }}>
                    <TableContainer component={Paper} elevation={0}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>ID</TableCell>
                                    <TableCell>Host</TableCell>
                                    <TableCell>Platform</TableCell>
                                    <TableCell align="right">GMV</TableCell>
                                    <TableCell align="right">Duration</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Date</TableCell>
                                    <TableCell>Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reports.map(report => (
                                    <TableRow key={report.id}>
                                        <TableCell>#{report.id}</TableCell>
                                        <TableCell>{report.host_name}</TableCell>
                                        <TableCell>
                                            <Chip label={report.platform} size="small" />
                                        </TableCell>
                                        <TableCell align="right">{formatCurrency(report.reported_gmv)}</TableCell>
                                        <TableCell align="right">{formatDuration(report.live_duration_minutes)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={report.status}
                                                size="small"
                                                color={statusColor(report.status) as any}
                                            />
                                        </TableCell>
                                        <TableCell>{formatDateTime(report.created_at)}</TableCell>
                                        <TableCell>
                                            {report.status === 'PENDING' && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => setSelectedReport(report)}
                                                >
                                                    Review
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {reports.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center">No reports</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <TablePagination
                        component="div"
                        count={total}
                        page={page}
                        rowsPerPage={rowsPerPage}
                        rowsPerPageOptions={[10]}
                        onPageChange={(_, p) => setPage(p)}
                    />
                </CardContent>
            </Card>

            {/* Review Dialog */}
            <Dialog open={!!selectedReport} onClose={() => setSelectedReport(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Review Report #{selectedReport?.id}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                        <Typography><b>Host:</b> {selectedReport?.host_name}</Typography>
                        <Typography><b>GMV:</b> {formatCurrency(selectedReport?.reported_gmv || 0)}</Typography>
                        <Typography><b>Duration:</b> {formatDuration(selectedReport?.live_duration_minutes || 0)}</Typography>
                        <Typography><b>Platform:</b> {selectedReport?.platform}</Typography>
                        <TextField
                            label="Notes (optional)"
                            multiline
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            fullWidth
                            sx={{ mt: 2 }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedReport(null)}>Cancel</Button>
                    <Button
                        color="error"
                        variant="outlined"
                        disabled={isPending}
                        onClick={() => updateStatus({ id: selectedReport!.id, status: 'REJECTED', notes })}
                    >
                        Reject
                    </Button>
                    <Button
                        color="success"
                        variant="contained"
                        disabled={isPending}
                        onClick={() => updateStatus({ id: selectedReport!.id, status: 'APPROVED', notes })}
                    >
                        Approve
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
