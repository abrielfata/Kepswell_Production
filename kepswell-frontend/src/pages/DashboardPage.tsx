import { useState } from 'react';
import {
    Box, Card, CardContent, Typography, Select, MenuItem,
    FormControl, InputLabel, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { reportsAPI } from '../api/reports';
import type { RankedHost, AvailableMonth } from '../types';
import { formatCurrency, formatDuration } from '../utils/format';

export default function DashboardPage() {
    const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
    const [selectedYear]                    = useState<number | ''>(new Date().getFullYear());

    const monthParams = selectedMonth && selectedYear
        ? { month: Number(selectedMonth), year: Number(selectedYear) }
        : {};

    const { data: monthsData } = useQuery({
        queryKey: ['available-months'],
        queryFn:  () => reportsAPI.getAvailableMonths().then(r => r.data.data as AvailableMonth[]),
    });

    const { data: stats } = useQuery({
        queryKey: ['statistics', monthParams],
        queryFn:  () => reportsAPI.getStatistics(monthParams).then(r => r.data.data),
    });

    const { data: ranking = [] } = useQuery({
        queryKey: ['ranking', monthParams],
        queryFn:  () => reportsAPI.getRanking(monthParams).then(r => r.data.data as RankedHost[]),
    });

    const statItems = [
        { label: 'Total Laporan',  value: stats?.total_reports || 0 },
        { label: 'Pending',        value: stats?.pending        || 0 },
        { label: 'Disetujui',      value: stats?.approved       || 0 },
        { label: 'Ditolak',        value: stats?.rejected       || 0 },
        { label: 'Total GMV',      value: formatCurrency(stats?.total_gmv || 0) },
    ];

    const chartData = ranking.slice(0, 10).map(h => ({
        name:  h.host_name.split(' ')[0],
        GMV:   Math.round(Number(h.total_gmv) / 1000),
    }));

    return (
        <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2.5 }}>Dashboard</Typography>

            {/* Filter bulan */}
            <Box sx={{ mb: 2.5 }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Periode</InputLabel>
                    <Select value={selectedMonth} label="Periode"
                        onChange={e => setSelectedMonth(e.target.value as number)}>
                        <MenuItem value="">Semua</MenuItem>
                        {monthsData?.map(m => (
                            <MenuItem key={`${m.year}-${m.month}`} value={m.month}>{m.display_name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Stat cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(5,1fr)' },
                gap: 2, mb: 3,
            }}>
                {statItems.map(s => (
                    <Card key={s.label}>
                        <CardContent sx={{ py: 2, px: 2.5 }}>
                            <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: '#111827' }}>
                                {s.value}
                            </Typography>
                            <Typography sx={{ fontSize: '0.78rem', color: '#6b7280', mt: 0.25 }}>
                                {s.label}
                            </Typography>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* Chart GMV */}
            {chartData.length > 0 && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', mb: 2, color: '#374151' }}>
                            GMV per Host (dalam ribuan)
                        </Typography>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 12 }}
                                    formatter={(v) => [`${v}K`, 'GMV']}
                                />
                                <Bar dataKey="GMV" fill="#2563EB" radius={[3,3,0,0]} maxBarSize={36} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Ranking table */}
            <Card>
                <CardContent>
                    <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', mb: 2, color: '#374151' }}>
                        Peringkat Host
                    </Typography>
                    <TableContainer component={Paper} elevation={0}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Rank</TableCell>
                                    <TableCell>Host</TableCell>
                                    <TableCell align="right">Total GMV</TableCell>
                                    <TableCell align="right">Sesi</TableCell>
                                    <TableCell align="right">Durasi</TableCell>
                                    <TableCell align="right">GMV/Jam</TableCell>
                                    <TableCell align="right">Score</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ranking.map(h => (
                                    <TableRow key={h.host_id}>
                                        <TableCell>
                                            <Chip label={`#${h.rank}`} size="small"
                                                color={h.rank === 1 ? 'primary' : 'default'} />
                                        </TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{h.host_name}</TableCell>
                                        <TableCell align="right">{formatCurrency(h.total_gmv)}</TableCell>
                                        <TableCell align="right">{h.approved_reports}</TableCell>
                                        <TableCell align="right">{formatDuration(h.total_duration_minutes)}</TableCell>
                                        <TableCell align="right">{formatCurrency(h.gmv_per_hour)}/j</TableCell>
                                        <TableCell align="right">
                                            <Chip label={(h.final_score * 100).toFixed(0)} size="small" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {ranking.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#9ca3af' }}>
                                            Belum ada data
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </CardContent>
            </Card>
        </Box>
    );
}
