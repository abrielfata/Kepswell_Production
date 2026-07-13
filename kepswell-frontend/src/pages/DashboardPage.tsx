import { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Select, MenuItem,
    FormControl, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Skeleton, Button
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboard } from '../hooks/useDashboard';
import { formatCurrency, formatDuration } from '../utils/format';
import { reportsAPI } from '../api/reports';

const STAT_ITEMS = [
    { key: 'total_reports', label: 'Total Laporan' },
    { key: 'pending', label: 'Menunggu' },
    { key: 'approved', label: 'Disetujui' },
    { key: 'rejected', label: 'Ditolak' },
    { key: 'total_gmv', label: 'Total GMV', currency: true },
] as const;

export default function DashboardPage() {
    const [selectedMonth, setSelectedMonth] = useState<number | ''>('');

    const monthParams = selectedMonth
        ? { month: Number(selectedMonth), year: new Date().getFullYear() }
        : {};

    const { monthsData, stats, statsLoading, ranking, rankLoading, chartData } = useDashboard(monthParams);

    useEffect(() => {
        if (chartData.length > 0) console.log('Rendering chart with data:', chartData);
    }, [chartData]);

    useEffect(() => {
        if (ranking.length > 0) console.log('Rendering table with data:', ranking);
    }, [ranking]);

    const handleExportDashboard = async () => {
        try {
            const res = await reportsAPI.getAll({ ...monthParams, status: 'APPROVED', limit: 1000, page: 1 });
            const data = res.data.data.reports;
            if (!data || data.length === 0) return;

            const calculateShiftDuration = (minutes: number) => {
                const hours = Math.floor(minutes / 60);
                const remainder = minutes % 60;
                let additional = 0;
                if (remainder >= 30 && remainder < 50) {
                    additional = 0.5;
                } else if (remainder >= 50) {
                    additional = 1;
                }
                return hours + additional;
            };

            const grouped: Record<string, any[]> = {};
            let totalCO = 0;
            let totalGMV = 0;
            let totalJamDec = 0;

            data.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            data.forEach((r: any) => {
                const dateObj = new Date(r.created_at);
                const day = String(dateObj.getDate()).padStart(2, '0');
                const month = String(dateObj.getMonth() + 1).padStart(2, '0');
                const year = dateObj.getFullYear();
                const dateStr = `${day}/${month}/${year}`;

                if (!grouped[dateStr]) grouped[dateStr] = [];
                grouped[dateStr].push(r);

                totalCO += Number(r.reported_pesanan_sku || 0);
                totalGMV += Number(r.reported_gmv || 0);
                totalJamDec += calculateShiftDuration(Number(r.live_duration_minutes || 0));
            });

            const monthNames = ["JANUARI", "FEBRUARI", "MARET", "APRIL", "MEI", "JUNI", "JULI", "AGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DESEMBER"];
            const m = selectedMonth ? monthNames[Number(selectedMonth) - 1] : "SEMUA PERIODE";
            
            const formatCsvCurrency = (val: number) => 'Rp' + Math.floor(val).toLocaleString('id-ID'); 

            let csvLines: string[] = [];
            csvLines.push(`LAPORAN LIVE TIKTOK KEPSWELL BULAN ${m};;;;;`);
            
            const formatTotalJam = totalJamDec % 1 === 0 ? totalJamDec.toString() : totalJamDec.toFixed(1).replace('.', ',');
            csvLines.push(`TOTAL REKAP;;;${totalCO};${formatCsvCurrency(totalGMV)};${formatTotalJam}`);
            csvLines.push(`TANGGAL;NAMA;JAM;JUMLAH CO;PENGHASILAN;JAM`);

            Object.keys(grouped).forEach(dateStr => {
                grouped[dateStr].forEach(r => {
                    const co = Number(r.reported_pesanan_sku || 0);
                    const gmv = Number(r.reported_gmv || 0);
                    
                    const durationH = calculateShiftDuration(Number(r.live_duration_minutes || 0));
                    const durStr = durationH % 1 === 0 ? durationH.toString() : durationH.toFixed(1).replace('.', ',');

                    const end = new Date(r.created_at);
                    const start = new Date(end.getTime() - Number(r.live_duration_minutes || 0) * 60000);
                    
                    const startH = String(start.getHours()).padStart(2, '0');
                    const startM = String(start.getMinutes()).padStart(2, '0');
                    const endH = String(end.getHours()).padStart(2, '0');
                    const endM = String(end.getMinutes()).padStart(2, '0');
                    const shiftStr = `${startH}.${startM}-${endH}.${endM}`;

                    csvLines.push(`${dateStr};${r.host_name};${shiftStr};${co};${formatCsvCurrency(gmv)};${durStr}`);
                });
                csvLines.push(';;;;;'); 
            });

            const csvString = '\uFEFF' + csvLines.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const period = selectedMonth ? `Bulan_${selectedMonth}` : 'Semua_Periode';
            link.setAttribute('download', `Laporan_Live_Tiktok_${period}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch(err) {
            console.error(err);
        }
    };

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
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={handleExportDashboard}
                        disabled={rankLoading || ranking.length === 0}
                        sx={{ height: 40 }}
                    >
                        Export CSV
                    </Button>
                    <FormControl sx={{ minWidth: 160 }}>
                        <Select
                            displayEmpty value={selectedMonth}
                            onChange={e => setSelectedMonth(e.target.value as number)}
                            renderValue={v => !v ? 'Semua periode' : monthsData?.find((m: any) => m.month === Number(v))?.display_name ?? String(v)}
                            sx={{ height: 40 }}
                        >
                            <MenuItem value="">Semua periode</MenuItem>
                            {monthsData?.map((m: any) => (
                                <MenuItem key={`${m.year}-${m.month}`} value={m.month}>{m.display_name}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
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
                                        <TableCell align="right">Sesi</TableCell>
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
