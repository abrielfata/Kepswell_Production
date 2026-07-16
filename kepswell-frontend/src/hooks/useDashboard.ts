import { useQuery } from '@tanstack/react-query';import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { WebClient } from '../api/WebClient';

export function useDashboard(monthParams: any) {
    const navigate = useNavigate();
    const { showNotification } = useNotification();
    const webClient = new WebClient(navigate, showNotification, undefined, () => { });

    const { data: monthsData } = useQuery({
        queryKey: ['available-months'],
        queryFn: () => webClient.handleFetchAvailableMonths(),
    });

    const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
        queryKey: ['dashboard', monthParams],
        queryFn: () => webClient.handleFetchDashboardData(monthParams),
    });

    const stats = dashboardData?.statistics || null;
    const ranking = dashboardData?.ranking || [];
    const statsLoading = dashboardLoading;
    const rankLoading = dashboardLoading;

    const dailyTrend = dashboardData?.dailyTrend || [];

    const chartData = dailyTrend.map((d: any) => {
        const dateObj = new Date(d.date);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleString('id-ID', { month: 'short' });
        return {
            name: `${day} ${month}`,
            GMV: Math.round(Number(d.total_gmv) / 1_000),
        };
    });

    return { monthsData, stats, statsLoading, ranking, rankLoading, chartData };
}
