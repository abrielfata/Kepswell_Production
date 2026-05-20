import { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Select, MenuItem,
    FormControl, Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Skeleton
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { reportsAPI } from '../api/reports';
import type { RankedHost, AvailableMonth } from '../types';
import { formatCurrency, formatDuration } from '../utils/format';
import { webClient } from '../api/WebClient';

const STAT_ITEMS = [
    { key: 'total_reports', label: 'Total Laporan' },
    { key: 'pending',       label: 'Menunggu' },
    { key: 'approved',      label: 'Disetujui' },
    { key: 'rejected',      label: 'Ditolak' },
    { key: 'total_gmv',     label: 'Total GMV', currency: true },
] as const;

export default function DashboardPage() {
    const [selectedMonth, setSelectedMonth] = useState<number | ''>('');

    const monthParams = selectedMonth
        ? { month: Number(selectedMonth), year: new Date().getFullYear() }
        : {};

    const { data: monthsData } = useQuery({
        queryKey: ['available-months'],
        queryFn:  () => reportsAPI.getAvailableMonths().then(r => r.data.data as AvailableMonth[]),
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['statistics', monthParams],
        queryFn:  () => reportsAPI.getStatistics(monthParams).then(r => r.data.data),
    });

    const { data: ranking = [], isLoading: rankLoading } = useQuery({
        queryKey: ['ranking', monthParams],
        queryFn:  () => reportsAPI.getRanking(monthParams).then(r => r.data.data as RankedHost[]),
    });

    const chartData = ranking.slice(0, 10).map(h => ({
        name: h.host_name.split(' ')[0],
        GMV:  Math.round(Number(h.total_gmv) / 1_000),
    }));

    useEffect(() => {
        const month = selectedMonth ? Number(selectedMonth) : undefined;
        const year  = selectedMonth ? new Date().getFullYear() : undefined;
        webClient.loadDashboard(month, year);
    }, [selectedMonth]);

    useEffect(() => {
        if (chartData.length > 0) webClient.renderChart(chartData);
    }, [chartData]);

    useEffect(() => {
        if (ranking.length > 0) webClient.renderTable(ranking);
    }, [ranking]);

    return (
        <Box>
            {/* Page heading + filter */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: '1.15rem', color: '#1a1d23' }}>
                        Dashboard
                    </Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: '#6b7280', mt: 0.25 }}>
                        Ringkasan laporan dan performa host
                    </Typography>
                </Box>
                <FormControl sx={{ minWidth: 160 }}>
                    <Select
                        displayEmpty value={selectedMonth}
                        onChange={e => setSelectedMonth(e.target.value as number)}
                        renderValue={v => !v ? 'Semua periode' : monthsData?.find(m => m.month === Number(v))?.display_name ?? String(v)}
                    >
                        <MenuItem value="">Semua periode</MenuItem>
                        {monthsData?.map(m => (
                            <MenuItem key={`${m.year}-${m.month}`} value={m.month}>{m.display_name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Stat cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' },
                gap: 1.5, mb: 3,
            }}>
                {STAT_ITEMS.map(s => {
                    const val = stats?.[s.key] ?? 0;
                    return (
                        <Card key={s.key}>
                            <CardContent sx={{ p: 2 }}>
                                <Typography sx={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 500, mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {s.label}
                                </Typography>
                                {statsLoading
                                    ? <Skeleton width="50%" height={28} />
                                    : <Typography sx={{ fontSize: '1.35rem', fontWeight: 700, color: '#1a1d23', lineHeight: 1 }}>
                                        {'currency' in s ? formatCurrency(Number(val)) : val}
                                      </Typography>
                                }
                            </CardContent>
                        </Card>
                    );
                })}
            </Box>

            {/* Chart + Table side by side */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.4fr 1fr' }, gap: 2, mb: 2 }}>
                {/* Bar chart */}
                <Card>
                    <CardContent>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 0.5 }}>GMV per Host</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mb: 2 }}>Dalam ribuan IDR</Typography>
                        {rankLoading
                            ? <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />
                            : chartData.length > 0
                            ? (
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={chartData} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                                        <CartesianGrid vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: '#f3f4f6' }}
                                            contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, boxShadow: 'none' }}
                                            formatter={(v: any) => [`${v}K`, 'GMV']}
                                        />
                                        <Bar dataKey="GMV" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={40} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Typography sx={{ color: '#9ca3af', fontSize: '0.82rem' }}>Belum ada data</Typography>
                                </Box>
                            )
                        }
                    </CardContent>
                </Card>

                {/* Ranking mini */}
                <Card>
                    <CardContent sx={{ p: 0 }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6' }}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Peringkat Host</Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mt: 0.25 }}>Skor gabungan terbobot</Typography>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>#</TableCell>
                                        <TableCell>Nama</TableCell>
                                        <TableCell align="right">GMV</TableCell>
                                        <TableCell align="right">Skor</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rankLoading
                                        ? Array(5).fill(0).map((_, i) => (
                                            <TableRow key={i}>
                                                {Array(4).fill(0).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                                            </TableRow>
                                        ))
                                        : ranking.slice(0, 8).map(h => (
                                            <TableRow key={h.host_id}>
                                                <TableCell sx={{ width: 36 }}>
                                                    <Typography sx={{
                                                        fontSize: '0.75rem', fontWeight: 600,
                                                        color: h.rank <= 3 ? '#2563EB' : '#9ca3af',
                                                    }}>
                                                        {h.rank}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 500 }}>{h.host_name}</TableCell>
                                                <TableCell align="right" sx={{ color: '#6b7280' }}>{formatCurrency(h.total_gmv)}</TableCell>
                                                <TableCell align="right">
                                                    <Chip label={(h.final_score * 100).toFixed(0)} size="small"
                                                        sx={{ bgcolor: h.rank === 1 ? '#eff6ff' : '#f9fafb', color: h.rank === 1 ? '#2563EB' : '#6b7280' }} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    }
                                    {!rankLoading && ranking.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 5, color: '#9ca3af' }}>
                                                Belum ada data ranking
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            </Box>

            {/* Full ranking table */}
            {ranking.length > 0 && (
                <Card>
                    <CardContent sx={{ p: 0 }}>
                        <Box sx={{ px: 2.5, py: 2, borderBottom: '1px solid #f3f4f6' }}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Detail Performa Lengkap</Typography>
                        </Box>
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
                                        <TableCell align="right">Skor</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {ranking.map(h => (
                                        <TableRow key={h.host_id}>
                                            <TableCell>
                                                <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: h.rank <= 3 ? '#2563EB' : '#374151' }}>
                                                    #{h.rank}
                                                </Typography>
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
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}
