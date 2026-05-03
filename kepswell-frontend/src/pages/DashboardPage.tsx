import { useState } from 'react';
import {
    Box, Card, CardContent, Typography,
    Select, MenuItem, FormControl, InputLabel,
    Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Skeleton
} from '@mui/material';
import {
    TrendingUp, Assessment, CheckCircle, Cancel, MonetizationOn
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { reportsAPI } from '../api/reports';
import type { RankedHost, AvailableMonth } from '../types';
import { formatCurrency, formatDuration } from '../utils/format';

const medalColors: Record<number, string> = { 1: '#F59E0B', 2: '#94A3B8', 3: '#B45309' };

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

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['statistics', monthParams],
        queryFn:  () => reportsAPI.getStatistics(monthParams).then(r => r.data.data),
    });

    const { data: ranking = [], isLoading: rankingLoading } = useQuery({
        queryKey: ['ranking', monthParams],
        queryFn:  () => reportsAPI.getRanking(monthParams).then(r => r.data.data as RankedHost[]),
    });

    const statCards = [
        { label: 'Total Laporan',    value: stats?.total_reports || 0,                  icon: <Assessment />,     color: '#1565C0', bg: '#EFF6FF',  sub: 'laporan masuk' },
        { label: 'Menunggu Review',  value: stats?.pending        || 0,                  icon: <TrendingUp />,     color: '#D97706', bg: '#FFFBEB',  sub: 'perlu diverifikasi' },
        { label: 'Disetujui',        value: stats?.approved       || 0,                  icon: <CheckCircle />,    color: '#16A34A', bg: '#F0FDF4',  sub: 'laporan valid' },
        { label: 'Ditolak',          value: stats?.rejected       || 0,                  icon: <Cancel />,         color: '#DC2626', bg: '#FEF2F2',  sub: 'laporan ditolak' },
        { label: 'Total GMV',        value: formatCurrency(stats?.total_gmv || 0),       icon: <MonetizationOn />, color: '#7C3AED', bg: '#F5F3FF',  sub: 'dari approved' },
    ];

    const chartData = ranking.slice(0, 8).map(h => ({
        name:  h.host_name.split(' ')[0],
        GMV:   Math.round(Number(h.total_gmv) / 1000),
        Score: Math.round(Number(h.final_score) * 100),
    }));

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#0F172A' }}>Dashboard</Typography>
                <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
                    Ringkasan performa host dan statistik laporan
                </Typography>
            </Box>

            {/* Filter */}
            <Box sx={{ mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                    <InputLabel>Filter Bulan</InputLabel>
                    <Select
                        value={selectedMonth} label="Filter Bulan"
                        onChange={e => setSelectedMonth(e.target.value as number)}
                        sx={{ bgcolor: '#fff', borderRadius: 2 }}
                    >
                        <MenuItem value="">Semua Periode</MenuItem>
                        {monthsData?.map(m => (
                            <MenuItem key={`${m.year}-${m.month}`} value={m.month}>{m.display_name}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Stat Cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' },
                gap: 2, mb: 3,
            }}>
                {statCards.map(card => (
                    <Card key={card.label} sx={{ border: 'none', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
                        <CardContent sx={{ p: 2.5 }}>
                            <Box sx={{
                                width: 40, height: 40, borderRadius: '10px', bgcolor: card.bg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5,
                            }}>
                                {statsLoading
                                    ? <Skeleton variant="circular" width={24} height={24} />
                                    : <Box sx={{ color: card.color, display: 'flex' }}>{card.icon}</Box>
                                }
                            </Box>
                            {statsLoading
                                ? <Skeleton width="60%" height={32} />
                                : <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>
                                    {card.value}
                                  </Typography>
                            }
                            <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', mt: 0.5 }}>{card.label}</Typography>
                            <Typography sx={{ fontSize: '0.7rem', color: '#94A3B8', mt: 0.25 }}>{card.sub}</Typography>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* Chart + Mini Ranking */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.3fr 1fr' }, gap: 2.5, mb: 2.5 }}>
                <Card>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 0.5 }}>Performa Host</Typography>
                        <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem', mb: 2.5 }}>
                            GMV (Ribuan IDR) &amp; Score (0–100)
                        </Typography>
                        {rankingLoading ? (
                            <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 2 }} />
                        ) : chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={chartData} barGap={4}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
                                        formatter={(val, name) => name === 'GMV' ? [`${val}K`, 'GMV'] : [val, 'Score']} />
                                    <Legend wrapperStyle={{ fontSize: 12 }} />
                                    <Bar yAxisId="left"  dataKey="GMV"   fill="#1565C0" radius={[4,4,0,0]} maxBarSize={32} />
                                    <Bar yAxisId="right" dataKey="Score" fill="#BFDBFE" radius={[4,4,0,0]} maxBarSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box sx={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography sx={{ color: '#94A3B8', fontSize: '0.875rem' }}>Belum ada data performa</Typography>
                            </Box>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 0.5 }}>Peringkat Host</Typography>
                        <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem', mb: 2 }}>
                            Berdasarkan skor gabungan terbobot
                        </Typography>
                        <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 290, overflow: 'auto' }}>
                            <Table size="small" stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>#</TableCell>
                                        <TableCell>Host</TableCell>
                                        <TableCell align="right">GMV</TableCell>
                                        <TableCell align="right">Score</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rankingLoading
                                        ? Array(4).fill(0).map((_, i) => (
                                            <TableRow key={i}>
                                                {Array(4).fill(0).map((__, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                                            </TableRow>
                                        ))
                                        : ranking.map(host => (
                                            <TableRow key={host.host_id}>
                                                <TableCell>
                                                    <Box sx={{
                                                        width: 24, height: 24, borderRadius: '50%',
                                                        bgcolor: medalColors[host.rank] || '#E2E8F0',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.7rem', fontWeight: 700,
                                                        color: host.rank <= 3 ? '#fff' : '#64748B',
                                                    }}>
                                                        {host.rank}
                                                    </Box>
                                                </TableCell>
                                                <TableCell sx={{ fontWeight: 500, fontSize: '0.82rem' }}>{host.host_name}</TableCell>
                                                <TableCell align="right" sx={{ fontSize: '0.78rem', color: '#475569' }}>{formatCurrency(host.total_gmv)}</TableCell>
                                                <TableCell align="right">
                                                    <Chip label={(host.final_score * 100).toFixed(0)} size="small"
                                                        sx={{ bgcolor: '#EFF6FF', color: '#1565C0', fontWeight: 700, fontSize: '0.7rem' }} />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    }
                                    {!rankingLoading && ranking.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} align="center" sx={{ py: 4, color: '#94A3B8', fontSize: '0.875rem' }}>
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

            {/* Full Detail Table */}
            {ranking.length > 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 0.5 }}>Detail Performa Lengkap</Typography>
                        <Typography sx={{ color: '#94A3B8', fontSize: '0.8rem', mb: 2 }}>Breakdown metrik per host</Typography>
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
                                    {ranking.map(host => (
                                        <TableRow key={host.host_id}>
                                            <TableCell>
                                                <Box sx={{
                                                    width: 28, height: 28, borderRadius: '50%',
                                                    bgcolor: medalColors[host.rank] || '#F1F5F9',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '0.75rem', fontWeight: 700,
                                                    color: host.rank <= 3 ? '#fff' : '#64748B',
                                                }}>
                                                    {host.rank}
                                                </Box>
                                            </TableCell>
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{host.host_name}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{formatCurrency(host.total_gmv)}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{host.approved_reports}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{formatDuration(host.total_duration_minutes)}</TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.82rem' }}>{formatCurrency(host.gmv_per_hour)}/j</TableCell>
                                            <TableCell align="right">
                                                <Chip label={(host.final_score * 100).toFixed(0)} size="small"
                                                    sx={{ bgcolor: '#EFF6FF', color: '#1565C0', fontWeight: 700 }} />
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
