/**
 * Market Analyzer Utility
 *
 * Provides advanced market intelligence including:
 * - Trend analysis (MoM, YoY, growth rates)
 * - Market velocity indicators
 * - Skills trend detection (hot/cold/emerging)
 * - Company hiring velocity
 * - Auto-generated insights
 */

import { MonthlyStatistics } from './job-statistics-cache';

export interface TrendData {
  current: number;
  previous: number | null;
  change: number | null;
  changePercent: number | null;
  trend: 'up' | 'down' | 'stable' | 'new';
}

export interface SkillTrend {
  keyword: string;
  currentCount: number;
  previousCount: number;
  change: number;
  changePercent: number;
  status: 'hot' | 'cold' | 'stable' | 'emerging';
  velocity: number; // Rate of change
}

export interface CompanyVelocity {
  company: string;
  currentJobs: number;
  previousJobs: number;
  change: number;
  changePercent: number;
  status: 'scaling' | 'hiring' | 'stable' | 'declining';
}

export interface MarketInsight {
  type: 'trend' | 'salary' | 'skill' | 'industry' | 'alert';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  data?: any;
}

export interface MarketVelocity {
  postingRate: number; // Jobs per day
  accelerationRate: number; // Change in posting rate
  momentum: 'accelerating' | 'decelerating' | 'steady';
  peakDay: string | null;
  averagePerDay: number;
}

export class MarketAnalyzer {
  /**
   * Calculate trend comparison between two periods
   */
  static calculateTrend(current: number, previous: number | null): TrendData {
    if (previous === null || previous === 0) {
      return {
        current,
        previous,
        change: null,
        changePercent: null,
        trend: current > 0 ? 'new' : 'stable',
      };
    }

    const change = current - previous;
    const changePercent = (change / previous) * 100;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(changePercent) < 5) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return {
      current,
      previous,
      change,
      changePercent: Math.round(changePercent * 10) / 10,
      trend,
    };
  }

  /**
   * Analyze skills trends between two periods
   */
  static analyzeSkillTrends(
    currentStats: MonthlyStatistics,
    previousStats: MonthlyStatistics | null,
    topN: number = 20
  ): SkillTrend[] {
    const trends: SkillTrend[] = [];

    // Get all keywords from both periods
    const allKeywords = new Set([
      ...Object.keys(currentStats.byKeyword),
      ...(previousStats ? Object.keys(previousStats.byKeyword) : []),
    ]);

    allKeywords.forEach(keyword => {
      const currentCount = currentStats.byKeyword[keyword] || 0;
      const previousCount = previousStats?.byKeyword[keyword] || 0;

      if (currentCount === 0 && previousCount === 0) return;

      const change = currentCount - previousCount;
      const changePercent = previousCount > 0 ? (change / previousCount) * 100 : 0;

      let status: 'hot' | 'cold' | 'stable' | 'emerging';
      if (previousCount === 0 && currentCount > 0) {
        status = 'emerging';
      } else if (changePercent > 30) {
        status = 'hot';
      } else if (changePercent < -30) {
        status = 'cold';
      } else {
        status = 'stable';
      }

      trends.push({
        keyword,
        currentCount,
        previousCount,
        change,
        changePercent: Math.round(changePercent * 10) / 10,
        status,
        velocity: change,
      });
    });

    // Sort by absolute change (velocity) and return top N
    return trends
      .sort((a, b) => Math.abs(b.velocity) - Math.abs(a.velocity))
      .slice(0, topN);
  }

  /**
   * Analyze company hiring velocity
   */
  static analyzeCompanyVelocity(
    currentStats: MonthlyStatistics,
    previousStats: MonthlyStatistics | null,
    topN: number = 15
  ): CompanyVelocity[] {
    const velocities: CompanyVelocity[] = [];

    // Get all companies from both periods
    const allCompanies = new Set([
      ...Object.keys(currentStats.byCompany),
      ...(previousStats ? Object.keys(previousStats.byCompany) : []),
    ]);

    allCompanies.forEach(company => {
      const currentJobs = currentStats.byCompany[company] || 0;
      const previousJobs = previousStats?.byCompany[company] || 0;

      if (currentJobs === 0 && previousJobs === 0) return;

      const change = currentJobs - previousJobs;
      const changePercent = previousJobs > 0 ? (change / previousJobs) * 100 : 0;

      let status: 'scaling' | 'hiring' | 'stable' | 'declining';
      if (changePercent > 50) {
        status = 'scaling';
      } else if (changePercent > 10) {
        status = 'hiring';
      } else if (changePercent < -10) {
        status = 'declining';
      } else {
        status = 'stable';
      }

      velocities.push({
        company,
        currentJobs,
        previousJobs,
        change,
        changePercent: Math.round(changePercent * 10) / 10,
        status,
      });
    });

    // Sort by current job count and return top N
    return velocities
      .sort((a, b) => b.currentJobs - a.currentJobs)
      .slice(0, topN);
  }

  /**
   * Calculate market velocity from posting dates
   */
  static calculateMarketVelocity(byDate: Record<string, number>): MarketVelocity {
    const dates = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));

    if (dates.length === 0) {
      return {
        postingRate: 0,
        accelerationRate: 0,
        momentum: 'steady',
        peakDay: null,
        averagePerDay: 0,
      };
    }

    // Calculate average jobs per day
    const totalJobs = dates.reduce((sum, [, count]) => sum + count, 0);
    const averagePerDay = totalJobs / dates.length;

    // Find peak day
    const peakDay = dates.reduce((max, current) =>
      current[1] > max[1] ? current : max
    )[0];

    // Calculate posting rate (last 7 days average)
    const last7Days = dates.slice(-7);
    const recentRate = last7Days.length > 0
      ? last7Days.reduce((sum, [, count]) => sum + count, 0) / last7Days.length
      : 0;

    // Calculate acceleration (comparing first half vs second half)
    const midpoint = Math.floor(dates.length / 2);
    const firstHalf = dates.slice(0, midpoint);
    const secondHalf = dates.slice(midpoint);

    const firstHalfAvg = firstHalf.length > 0
      ? firstHalf.reduce((sum, [, count]) => sum + count, 0) / firstHalf.length
      : 0;
    const secondHalfAvg = secondHalf.length > 0
      ? secondHalf.reduce((sum, [, count]) => sum + count, 0) / secondHalf.length
      : 0;

    const accelerationRate = secondHalfAvg - firstHalfAvg;
    const accelerationPercent = firstHalfAvg > 0 ? (accelerationRate / firstHalfAvg) * 100 : 0;

    let momentum: 'accelerating' | 'decelerating' | 'steady' = 'steady';
    if (accelerationPercent > 10) {
      momentum = 'accelerating';
    } else if (accelerationPercent < -10) {
      momentum = 'decelerating';
    }

    return {
      postingRate: Math.round(recentRate * 10) / 10,
      accelerationRate: Math.round(accelerationRate * 10) / 10,
      momentum,
      peakDay,
      averagePerDay: Math.round(averagePerDay * 10) / 10,
    };
  }

  /**
   * Generate automatic market insights
   */
  static generateInsights(
    currentStats: MonthlyStatistics,
    previousStats: MonthlyStatistics | null,
    skillTrends: SkillTrend[],
    companyVelocities: CompanyVelocity[],
    marketVelocity: MarketVelocity
  ): MarketInsight[] {
    const insights: MarketInsight[] = [];

    // Overall market trend
    const totalTrend = this.calculateTrend(
      currentStats.totalJobs,
      previousStats?.totalJobs || null
    );

    if (totalTrend.changePercent !== null) {
      if (Math.abs(totalTrend.changePercent) >= 20) {
        insights.push({
          type: 'trend',
          priority: 'high',
          title: `Market ${totalTrend.trend === 'up' ? 'surge' : 'decline'} detected`,
          description: `Job postings ${totalTrend.trend === 'up' ? 'increased' : 'decreased'} by ${Math.abs(totalTrend.changePercent).toFixed(1)}% compared to last period`,
          data: totalTrend,
        });
      } else if (Math.abs(totalTrend.changePercent) >= 10) {
        insights.push({
          type: 'trend',
          priority: 'medium',
          title: `Market activity ${totalTrend.trend === 'up' ? 'growing' : 'slowing'}`,
          description: `Job postings ${totalTrend.trend === 'up' ? 'up' : 'down'} ${Math.abs(totalTrend.changePercent).toFixed(1)}% from previous period`,
          data: totalTrend,
        });
      }
    }

    // Hot skills
    const hotSkills = skillTrends.filter(s => s.status === 'hot').slice(0, 3);
    if (hotSkills.length > 0) {
      insights.push({
        type: 'skill',
        priority: 'high',
        title: `Rising skills demand`,
        description: `${hotSkills.map(s => s.keyword).join(', ')} showing strong growth`,
        data: hotSkills,
      });
    }

    // Emerging skills
    const emergingSkills = skillTrends.filter(s => s.status === 'emerging').slice(0, 3);
    if (emergingSkills.length > 0) {
      insights.push({
        type: 'skill',
        priority: 'medium',
        title: `New skills entering market`,
        description: `Emerging skills: ${emergingSkills.map(s => s.keyword).join(', ')}`,
        data: emergingSkills,
      });
    }

    // Company scaling
    const scalingCompanies = companyVelocities.filter(c => c.status === 'scaling');
    if (scalingCompanies.length > 0) {
      insights.push({
        type: 'trend',
        priority: 'high',
        title: `Companies scaling rapidly`,
        description: `${scalingCompanies.slice(0, 3).map(c => c.company).join(', ')} increasing hiring significantly`,
        data: scalingCompanies,
      });
    }

    // Market momentum
    if (marketVelocity.momentum !== 'steady') {
      insights.push({
        type: 'alert',
        priority: marketVelocity.momentum === 'accelerating' ? 'medium' : 'low',
        title: `Market posting rate ${marketVelocity.momentum}`,
        description: `Job posting velocity is ${marketVelocity.momentum} at ${marketVelocity.postingRate} jobs/day`,
        data: marketVelocity,
      });
    }

    // Salary insights (if available)
    if (currentStats.salaryStats && currentStats.salaryStats.totalWithSalary > 0) {
      const salaryPercentage = (currentStats.salaryStats.totalWithSalary / currentStats.totalJobs) * 100;
      if (salaryPercentage >= 30) {
        insights.push({
          type: 'salary',
          priority: 'medium',
          title: `Salary transparency increasing`,
          description: `${salaryPercentage.toFixed(0)}% of jobs now include salary information`,
          data: currentStats.salaryStats,
        });
      }

      if (currentStats.salaryStats.averageSalary) {
        insights.push({
          type: 'salary',
          priority: 'low',
          title: `Average salary: $${(currentStats.salaryStats.averageSalary / 1000).toFixed(0)}k`,
          description: `Median: $${currentStats.salaryStats.medianSalary ? (currentStats.salaryStats.medianSalary / 1000).toFixed(0) : 'N/A'}k across ${currentStats.salaryStats.totalWithSalary} positions`,
          data: currentStats.salaryStats,
        });
      }
    }

    // Industry trends
    const topIndustries = Object.entries(currentStats.byIndustry)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    if (topIndustries.length > 0 && previousStats) {
      const industryTrends = topIndustries.map(([industry, count]) => {
        const prevCount = previousStats.byIndustry[industry] || 0;
        return {
          industry,
          ...this.calculateTrend(count, prevCount),
        };
      });

      const growingIndustries = industryTrends.filter(i => i.trend === 'up');
      if (growingIndustries.length > 0) {
        insights.push({
          type: 'industry',
          priority: 'medium',
          title: `Growing industries`,
          description: `${growingIndustries.map(i => i.industry).join(', ')} showing increased hiring`,
          data: industryTrends,
        });
      }
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Format trend for display
   */
  static formatTrend(trend: TrendData): string {
    if (trend.changePercent === null) {
      return trend.trend === 'new' ? '↗ NEW' : '— STABLE';
    }

    const arrow = trend.trend === 'up' ? '↑' : trend.trend === 'down' ? '↓' : '—';
    const sign = trend.change && trend.change > 0 ? '+' : '';
    return `${arrow} ${sign}${trend.changePercent.toFixed(1)}%`;
  }

  /**
   * Get trend color for UI
   */
  static getTrendColor(trend: 'up' | 'down' | 'stable' | 'new'): string {
    const colors = {
      up: '#00ff88',
      down: '#ff6b6b',
      stable: '#9ca3af',
      new: '#00d4ff',
    };
    return colors[trend];
  }
}
