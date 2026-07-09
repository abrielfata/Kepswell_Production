import { ReportRepository } from '../repositories/ReportRepository';
import { HostPerformance } from '../types';

interface RankedHost extends HostPerformance {
    rank: number;
}

export class RankingService {
    private reportRepo = new ReportRepository();

    async generateRanking(month?: number, year?: number): Promise<RankedHost[]> {
        const hosts = await this.reportRepo.getHostPerformance(month, year);
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
