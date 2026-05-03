import { useState } from 'react';
import {
    Box, Card, CardContent, Typography,
    Select, MenuItem, FormControl, InputLabel,
    Chip, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';
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
        queryFn: () => reportsAPI.getAvailableMonths().then(r => r.data.data as AvailableMonth[]),
    });

    const { data: stats } = useQuery({
        queryKey: ['statistics', monthParams],
        queryFn: () => reportsAPI.getStatistics(monthParams).then(r => r.data.data),
    });

    const { data: ranking = [] } = useQuery({
        queryKey: ['ranking', monthParams],
        queryFn: () => reportsAPI.getRanking(monthParams).then(r => r.data.data as RankedHost[]),
    });

    const statCards = [
        { label: 'Total Reports', value: stats?.total_reports || 0,                color: '#1976d2' },
        { label: 'Pending',       value: stats?.pending        || 0,                color: '#ed6c02' },
        { label: 'Approved',      value: stats?.approved       || 0,                color: '#2e7d32' },
        { label: 'Rejected',      value: stats?.rejected       || 0,                color: '#d32f2f' },
        { label: 'Total GMV',     value: formatCurrency(stats?.total_gmv || 0),     color: '#7b1fa2' },
    ];

    const chartData = ranking.slice(0, 10).map(h => ({
        name:  h.host_name.split(' ')[0],
        GMV:   Number(h.total_gmv),
        Score: Number(h.final_score) * 100,
    }));

    return (
        <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>Dashboard</Typography>

            {/* Month Filter */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Month</InputLabel>
                    <Select
                        value={selectedMonth}
                        label="Month"
                        onChange={e => setSelectedMonth(e.target.value as number)}
                    >
                        <MenuItem value="">All</MenuItem>
                        {monthsData?.map(m => (
                            <MenuItem key={`${m.year}-${m.month}`} value={m.month}>
                                {m.display_name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            {/* Stat Cards */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
                gap: 2,
                mb: 3,
            }}>
                {statCards.map(card => (
                    <Card key={card.label}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h5" sx={{ fontWeight: 700, color: card.color }}>
                                {card.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {card.label}
                            </Typography>
                        </CardContent>
                    </Card>
                ))}
            </Box>

            {/* Chart */}
            {chartData.length > 0 && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                            Host Performance
                        </Typography>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis yAxisId="left"  orientation="left" />
                                <YAxis yAxisId="right" orientation="right" />
                                <Tooltip formatter={(val, name) =>
                                    name === 'GMV' ? formatCurrency(Number(val)) : val
                                }/>
                                <Legend />
                                <Bar yAxisId="left"  dataKey="GMV"   fill="#1976d2" />
                                <Bar yAxisId="right" dataKey="Score" fill="#ed6c02" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* Ranking Table */}
            <Card>
                <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        Host Ranking
                    </Typography>
                    <TableContainer component={Paper} elevation={0}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Rank</TableCell>
                                    <TableCell>Host</TableCell>
                                    <TableCell align="right">Total GMV</TableCell>
                                    <TableCell align="right">Sessions</TableCell>
                                    <TableCell align="right">Duration</TableCell>
                                    <TableCell align="right">GMV/Hour</TableCell>
                                    <TableCell align="right">Score</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {ranking.map(host => (
                                    <TableRow key={host.host_id}>
                                        <TableCell>
                                            <Chip
                                                label={`#${host.rank}`}
                                                size="small"
                                                color={host.rank === 1 ? 'warning' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>{host.host_name}</TableCell>
                                        <TableCell align="right">{formatCurrency(host.total_gmv)}</TableCell>
                                        <TableCell align="right">{host.approved_reports}</TableCell>
                                        <TableCell align="right">{formatDuration(host.total_duration_minutes)}</TableCell>
                                        <TableCell align="right">{formatCurrency(host.gmv_per_hour)}/j</TableCell>
                                        <TableCell align="right">
                                            <Chip
                                                label={(host.final_score * 100).toFixed(0)}
                                                size="small"
                                                color="primary"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {ranking.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">No data</TableCell>
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
