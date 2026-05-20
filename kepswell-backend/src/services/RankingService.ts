import { ReportRepository } from '../repositories/ReportRepository';
import { HostPerformance } from '../types';

interface RankedHost extends HostPerformance {
    score_gmv: number;
    score_sessions: number;
    score_duration: number;
    score_gmv_per_hour: number;
    final_score: number;
    rank: number;
}

export class RankingService {
    private reportRepo = new ReportRepository();

    private readonly WEIGHTS = {
        gmv:         0.40,
        sessions:    0.20,
        duration:    0.20,
        gmv_per_hour: 0.20,
    };

    async generateRanking(month?: number, year?: number): Promise<RankedHost[]> {
        const hosts = await this.reportRepo.getHostPerformance(month, year);
        if (hosts.length === 0) return [];

        const normalize = (value: number, min: number, max: number): number => {
            if (max === min) return 0;
            return (value - min) / (max - min);
        };

        const gmvValues        = hosts.map(h => Number(h.total_gmv));
        const sessionValues    = hosts.map(h => Number(h.approved_reports));
        const durationValues   = hosts.map(h => Number(h.total_duration_minutes));
        const gmvPerHourValues = hosts.map(h => Number(h.gmv_per_hour));

        const minMax = {
            gmv:        { min: Math.min(...gmvValues),        max: Math.max(...gmvValues) },
            sessions:   { min: Math.min(...sessionValues),    max: Math.max(...sessionValues) },
            duration:   { min: Math.min(...durationValues),   max: Math.max(...durationValues) },
            gmvPerHour: { min: Math.min(...gmvPerHourValues), max: Math.max(...gmvPerHourValues) },
        };

        const ranked: RankedHost[] = hosts.map(host => {
            const score_gmv          = normalize(Number(host.total_gmv),            minMax.gmv.min,        minMax.gmv.max);
            const score_sessions     = normalize(Number(host.approved_reports),     minMax.sessions.min,   minMax.sessions.max);
            const score_duration     = normalize(Number(host.total_duration_minutes), minMax.duration.min, minMax.duration.max);
            const score_gmv_per_hour = normalize(Number(host.gmv_per_hour),         minMax.gmvPerHour.min, minMax.gmvPerHour.max);

            const final_score =
                score_gmv          * this.WEIGHTS.gmv +
                score_sessions     * this.WEIGHTS.sessions +
                score_duration     * this.WEIGHTS.duration +
                score_gmv_per_hour * this.WEIGHTS.gmv_per_hour;

            return {
                ...host,
                score_gmv:          Math.round(score_gmv * 100) / 100,
                score_sessions:     Math.round(score_sessions * 100) / 100,
                score_duration:     Math.round(score_duration * 100) / 100,
                score_gmv_per_hour: Math.round(score_gmv_per_hour * 100) / 100,
                final_score:        Math.round(final_score * 100) / 100,
                rank: 0,
            };
        });

        ranked.sort((a, b) => b.final_score - a.final_score);
        ranked.forEach((h, i) => { h.rank = i + 1; });

        return ranked;
    }
}
