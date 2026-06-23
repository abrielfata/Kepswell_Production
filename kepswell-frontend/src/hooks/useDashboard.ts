import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '../api/reports';
import type { RankedHost, AvailableMonth } from '../types';

export function useDashboard(monthParams: any) {
    const { data: monthsData } = useQuery({
        queryKey: ['available-months'],
        queryFn: () => reportsAPI.getAvailableMonths().then(r => r.data.data as AvailableMonth[]),
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['statistics', monthParams],
        queryFn: () => reportsAPI.getStatistics(monthParams).then(r => r.data.data),
    });

    const { data: ranking = [], isLoading: rankLoading } = useQuery({
        queryKey: ['ranking', monthParams],
        queryFn: () => reportsAPI.getRanking(monthParams).then(r => r.data.data as RankedHost[]),
    });

    const chartData = ranking.slice(0, 10).map(h => ({
        name: h.host_name.split(' ')[0],
        GMV: Math.round(Number(h.total_gmv) / 1_000),
    }));

    return { monthsData, stats, statsLoading, ranking, rankLoading, chartData };
}
