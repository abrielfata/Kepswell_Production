import { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography,
    Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Skeleton
} from '@mui/material';
import DateRangeFilter from '../components/DateRangeFilter';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency, formatDuration } from '../utils/format';
import dayjs from 'dayjs';


const STAT_ITEMS = [
    { key: 'total_reports', label: 'Total Laporan' },
    { key: 'pending', label: 'Menunggu' },
    { key: 'approved', label: 'Disetujui' },
    { key: 'rejected', label: 'Ditolak' },
    { key: 'total_gmv', label: 'Total GMV', currency: true },
] as const;

export default function DashboardPage() {
    const [dateFilter, setDateFilter] = useState<{ preset?: string, startDate?: string, endDate?: string }>(() => {
        const d = dayjs();
        return {
            preset: d.format('YYYY-MM'),
            startDate: d.startOf('month').format('YYYY-MM-DD'),
            endDate: d.endOf('month').format('YYYY-MM-DD')
        };
    });

    const monthParams = {
        startDate: dateFilter.startDate,
        endDate: dateFilter.endDate
    };

    const { stats, statsLoading, ranking, rankLoading, chartData } = useDashboard(monthParams);

    useEffect(() => {
        if (chartData.length > 0) console.log('Rendering chart with data:', chartData);
    }, [chartData]);

    useEffect(() => {
        if (ranking.length > 0) console.log('Rendering table with data:', ranking);
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
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <DateRangeFilter value={dateFilter} onChange={setDateFilter} />
                </Box>
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
                        <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', mb: 0.5 }}>Tren Pendapatan Harian</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#6b7280', mb: 2 }}>Dalam ribuan IDR</Typography>
                        {rankLoading
                            ? <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 1 }} />
                            : chartData.length > 0
                                ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <AreaChart data={chartData} margin={{ top: 0, right: 8, left: -16, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorGmv" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid vertical={false} stroke="#f3f4f6" />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                            <Tooltip
                                                cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }}
                                                contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 12, boxShadow: 'none' }}
                                                formatter={(v: any) => [`${v}K`, 'GMV']}
                                            />
                                            <Area type="monotone" dataKey="GMV" stroke="#2563EB" fillOpacity={1} fill="url(#colorGmv)" />
                                        </AreaChart>
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
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>#</TableCell>
                                        <TableCell>Nama</TableCell>
                                        <TableCell align="right">GMV</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rankLoading
                                        ? Array(5).fill(0).map((_, i) => (
                                            <TableRow key={i}>
                                                {Array(3).fill(0).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                                            </TableRow>
                                        ))
                                        : ranking.slice(0, 8).map((h: any) => (
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
                                        <TableCell align="right">Laporan</TableCell>
                                        <TableCell align="right">Durasi</TableCell>
                                        <TableCell align="right">Pesanan SKU</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rankLoading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <TableRow key={i}>
                                                {Array(6).fill(0).map((__, j) => (
                                                    <TableCell key={j}><Skeleton animation="wave" height={24} /></TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : (
                                        ranking.map((h: any) => (
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
                                                <TableCell align="right">{h.total_pesanan_sku}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}
