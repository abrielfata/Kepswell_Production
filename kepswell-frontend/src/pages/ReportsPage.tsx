import { useState } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import type { Report } from '../types';
import { useReports } from '../hooks/useReports';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { WebClient } from '../api/WebClient';
import dayjs from 'dayjs';

import ReportsFilterBar from '../components/reports/ReportsFilterBar';
import ReportsTable from '../components/reports/ReportsTable';
import ReportReviewDialog from '../components/reports/ReportReviewDialog';

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

    const handleVerify = async (id: number, status: 'APPROVED' | 'REJECTED') => {
        await webClient.handleVerifyReport(id, status, updateStatus, () => setSelectedReport(null));
    };

    return (
        <Box>
            {/* Header & Filter Bar */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
                <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: '#1a1d23' }}>Laporan</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#6b7280', mt: 0.25 }}>
                        Verifikasi laporan sesi live dari host
                    </Typography>
                </Box>
                <ReportsFilterBar
                    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    statusFilter={statusFilter} setStatusFilter={setStatusFilter}
                    dateFilter={dateFilter} setDateFilter={setDateFilter}
                    setPage={setPage}
                    onExport={() => webClient.handleExportReports(params)}
                />
            </Box>

            {/* Main Table */}
            <Card>
                <CardContent sx={{ p: 0 }}>
                    <ReportsTable
                        reports={reports} isLoading={isLoading} total={total}
                        page={page} setPage={setPage} rowsPerPage={rowsPerPage}
                        sortBy={sortBy} sortOrder={sortOrder} handleSort={handleSort}
                        setSelectedReport={setSelectedReport}
                    />
                </CardContent>
            </Card>

            {/* Review Dialog */}
            <ReportReviewDialog
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
                onVerify={handleVerify}
                isPending={isPending}
            />
        </Box>
    );
}
