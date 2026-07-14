import { ReportRepository } from '../repositories/ReportRepository';
import { HostPerformance } from '../types';

interface RankedHost extends HostPerformance {
    rank: number;
}

export class RankingService {
    private reportRepo = new ReportRepository();

    async generateRanking(filters: { month?: number, year?: number, startDate?: string, endDate?: string }): Promise<RankedHost[]> {
        const hosts = await this.reportRepo.getHostPerformance(filters);
        if (hosts.length === 0) return [];

        const rankedHosts = this.calculateRankings(hosts);

        return rankedHosts;
    }

    private calculateRankings(hosts: HostPerformance[]): RankedHost[] {
        // Sort by total_gmv descending
        const sorted = [...hosts].sort((a, b) => Number(b.total_gmv) - Number(a.total_gmv));
        
        return sorted.map((host, index) => ({
            ...host,
            rank: index + 1
        }));
    }
}
