import { logger } from './logger';
import { SalaryData } from './salary-extractor';

// normalize city names for stats
function normalizeCity(cityName: string | null): string | null {
  if (!cityName) return null;

  const normalized = cityName
    .replace(/\s+Area$/i, '')
    .replace(/^City of\s+/i, '')
    .replace(/^Greater\s+/i, '')
    .trim();

  if (/^England$/i.test(normalized) ||
      /^Scotland$/i.test(normalized) ||
      /^Wales$/i.test(normalized) ||
      /^United Kingdom$/i.test(normalized)) {
    return null;
  }

  return normalized;
}

export interface JobStatistic {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string | null;
  city: string | null;
  region: 'Europe' | 'America' | 'Middle East' | 'Asia' | 'Africa' | 'Oceania' | null;
  url: string;
  postedDate: string;
  extractedDate: string;
  keywords: string[];
  certificates: string[];
  industry: string;
  seniority: string;
  description: string;
  salary?: SalaryData | null;
  software?: string[];
  programmingSkills?: string[];
  yearsExperience?: string | null;
  academicDegrees?: string[];
  roleType?: string | null;
  roleCategory?: string | null;
}

export interface MonthlyStatistics {
  totalJobs: number;
  byDate: Record<string, number>;
  byIndustry: Record<string, number>;
  byCertificate: Record<string, number>;
  byKeyword: Record<string, number>;
  bySeniority: Record<string, number>;
  byLocation: Record<string, number>;
  byCountry: Record<string, number>;
  byCity: Record<string, number>;
  byRegion: Record<string, number>;
  byCompany: Record<string, number>;
  bySoftware: Record<string, number>;
  byProgrammingSkill: Record<string, number>;
  byYearsExperience: Record<string, number>;
  byAcademicDegree: Record<string, number>;
  // Role type / job functionality
  byRoleType: Record<string, number>;
  byRoleCategory: Record<string, number>;
  // Publication time data (hour of day in UTC)
  byHour?: Record<string, number>;
  // Heatmap data (day-hour combinations, e.g., "0-14" for Sunday 2PM UTC)
  byDayHour?: Record<string, number>;
  salaryStats?: {
    totalWithSalary: number;
    averageSalary: number | null;
    medianSalary: number | null;
    byIndustry: Record<string, { avg: number; median: number; count: number }>;
    bySeniority: Record<string, { avg: number; median: number; count: number }>;
    byLocation: Record<string, { avg: number; median: number; count: number }>;
    byCountry: Record<string, { avg: number; median: number; count: number }>;
    byCity: Record<string, { avg: number; median: number; count: number }>;
    byCurrency: Record<string, number>;
    salaryRanges: {
      '0-30k': number;
      '30-50k': number;
      '50-75k': number;
      '75-100k': number;
      '100-150k': number;
      '150k+': number;
    };
  };
}

export interface CurrentMonthData {
  month: string; // Format: YYYY-MM
  lastUpdated: string;
  jobs: JobStatistic[];
  statistics: MonthlyStatistics;
}

export interface ArchiveMonthData {
  month: string; // Format: YYYY-MM
  statistics: MonthlyStatistics;
  jobCount: number;
  archived: boolean;
}

export interface SummaryData {
  lastUpdated: string;
  totalJobsAllTime: number;
  currentMonth: string;
  availableArchives: string[]; // List of YYYY-MM archives
  overallStatistics: {
    totalMonths: number;
    averageJobsPerMonth: number;
    topIndustries: Record<string, number>;
    topCertificates: Record<string, number>;
    topKeywords: Record<string, number>;
  };
}

// monthly job stats cache with github gist persistence
export class JobStatisticsCache {
  private useGitHubGist: boolean;
  private gistId?: string;
  private currentMonthData: CurrentMonthData;
  private summaryData: SummaryData;

  constructor() {
    this.useGitHubGist = !!(process.env.GITHUB_TOKEN && process.env.GIST_ID);
    this.gistId = process.env.GIST_ID;

    const storageType = this.useGitHubGist
      ? 'GitHub Gist (persistent)'
      : 'Local file system';

    logger.info(`Job Statistics Cache: ${storageType}`);

    const currentMonth = this.getCurrentMonthString();
    this.currentMonthData = {
      month: currentMonth,
      lastUpdated: new Date().toISOString(),
      jobs: [],
      statistics: this.createEmptyStatistics(),
    };

    this.summaryData = {
      lastUpdated: new Date().toISOString(),
      totalJobsAllTime: 0,
      currentMonth: currentMonth,
      availableArchives: [],
      overallStatistics: {
        totalMonths: 0,
        averageJobsPerMonth: 0,
        topIndustries: {},
        topCertificates: {},
        topKeywords: {},
      },
    };
  }

  private getCurrentMonthString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private migrateStatistics(stats: any): MonthlyStatistics {
    return {
      ...stats,
      byCountry: stats.byCountry || {},
      byCity: stats.byCity || {},
      byRegion: stats.byRegion || {},
      bySoftware: stats.bySoftware || {},
      byProgrammingSkill: stats.byProgrammingSkill || {},
      byYearsExperience: stats.byYearsExperience || {},
      byAcademicDegree: stats.byAcademicDegree || {},
      byRoleType: stats.byRoleType || {},
      byRoleCategory: stats.byRoleCategory || {},
      byHour: stats.byHour || {},
      byDayHour: stats.byDayHour || {},
      salaryStats: stats.salaryStats ? {
        ...stats.salaryStats,
        byCountry: stats.salaryStats.byCountry || {},
        byCity: stats.salaryStats.byCity || {},
      } : undefined,
    };
  }

  private createEmptyStatistics(): MonthlyStatistics {
    return {
      totalJobs: 0,
      byDate: {},
      byIndustry: {},
      byCertificate: {},
      byKeyword: {},
      bySeniority: {},
      byLocation: {},
      byCountry: {},
      byCity: {},
      byRegion: {},
      byCompany: {},
      bySoftware: {},
      byProgrammingSkill: {},
      byYearsExperience: {},
      byAcademicDegree: {},
      byRoleType: {},
      byRoleCategory: {},
      byHour: {},
      byDayHour: {},
      salaryStats: {
        totalWithSalary: 0,
        averageSalary: null,
        medianSalary: null,
        byIndustry: {},
        bySeniority: {},
        byLocation: {},
        byCountry: {},
        byCity: {},
        byCurrency: {},
        salaryRanges: {
          '0-30k': 0,
          '30-50k': 0,
          '50-75k': 0,
          '75-100k': 0,
          '100-150k': 0,
          '150k+': 0,
        },
      },
    };
  }

  /**
   * Load current month data and summary from GitHub Gist
   */
  async load(): Promise<void> {
    try {
      if (this.useGitHubGist) {
        await this.loadFromGitHubGist();
      } else {
        logger.info('Local file system storage not implemented for statistics');
        // Could implement local file system if needed
      }
    } catch (error) {
      logger.error('Error loading job statistics cache:', error);
      logger.info('Starting with empty cache');
    }
  }

  /**
   * Load data from GitHub Gist
   */
  private async loadFromGitHubGist(): Promise<void> {
    try {
      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        cache: 'no-store', // Disable caching to get fresh data
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gist = await response.json();

      // Load summary
      const summaryFile = gist.files['job-statistics-summary.json'];
      if (summaryFile) {
        try {
          this.summaryData = JSON.parse(summaryFile.content);
          logger.info(`✓ Loaded summary: ${this.summaryData.totalJobsAllTime} total jobs`);
        } catch (error) {
          logger.error('Error parsing summary file:', error);
        }
      }

      // Load current month data
      const currentFile = gist.files['job-statistics-current.json'];
      if (currentFile) {
        // Check if file is truncated (GitHub API limitation for large files)
        if (currentFile.truncated) {
          logger.warn('⚠ Current month file is truncated. Fetching raw content...');

          // Fetch raw content directly
          const rawResponse = await fetch(currentFile.raw_url, {
            headers: {
              'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            },
          });

          if (!rawResponse.ok) {
            throw new Error(`Failed to fetch raw content: ${rawResponse.status}`);
          }

          const rawContent = await rawResponse.text();

          if (!rawContent || rawContent.trim().length === 0) {
            throw new Error('Raw content is empty');
          }

          const data: CurrentMonthData = JSON.parse(rawContent);

          // Migrate statistics to new schema if needed
          data.statistics = this.migrateStatistics(data.statistics);

          // Check if we need to archive the current data (new month started)
          const currentMonth = this.getCurrentMonthString();
          if (data.month !== currentMonth) {
            logger.info(`Month changed from ${data.month} to ${currentMonth}. Archiving...`);
            await this.archiveMonth(data);
            // Start fresh for new month
            this.currentMonthData = {
              month: currentMonth,
              lastUpdated: new Date().toISOString(),
              jobs: [],
              statistics: this.createEmptyStatistics(),
            };
          } else {
            this.currentMonthData = data;
            logger.info(`✓ Loaded current month (${currentMonth}): ${data.jobs.length} jobs`);
          }
        } else {
          // Content not truncated, use directly
          if (!currentFile.content || currentFile.content.trim().length === 0) {
            throw new Error('File content is empty');
          }

          const data: CurrentMonthData = JSON.parse(currentFile.content);

          // Migrate statistics to new schema if needed
          data.statistics = this.migrateStatistics(data.statistics);

          // Check if we need to archive the current data (new month started)
          const currentMonth = this.getCurrentMonthString();
          if (data.month !== currentMonth) {
            logger.info(`Month changed from ${data.month} to ${currentMonth}. Archiving...`);
            await this.archiveMonth(data);
            // Start fresh for new month
            this.currentMonthData = {
              month: currentMonth,
              lastUpdated: new Date().toISOString(),
              jobs: [],
              statistics: this.createEmptyStatistics(),
            };
          } else {
            this.currentMonthData = data;
            logger.info(`✓ Loaded current month (${currentMonth}): ${data.jobs.length} jobs`);
          }
        }
      }
    } catch (error: any) {
      logger.error('Error loading from GitHub Gist:', error);
      logger.info('Starting fresh with empty data.');
    }
  }

  /**
   * Archive current month data (statistics only, not full job details)
   */
  private async archiveMonth(data: CurrentMonthData): Promise<void> {
    try {
      const archiveData: ArchiveMonthData = {
        month: data.month,
        statistics: data.statistics,
        jobCount: data.jobs.length,
        archived: true,
      };

      const fileName = `job-statistics-${data.month}.json`;

      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            [fileName]: {
              content: JSON.stringify(archiveData, null, 2),
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to archive month: ${response.status}`);
      }

      // Update summary with new archive
      if (!this.summaryData.availableArchives.includes(data.month)) {
        this.summaryData.availableArchives.push(data.month);
        this.summaryData.availableArchives.sort().reverse(); // Most recent first
      }

      logger.info(`✓ Archived month ${data.month} with ${data.jobs.length} jobs`);
    } catch (error) {
      logger.error(`Error archiving month ${data.month}:`, error);
      throw error;
    }
  }

  /**
   * Add a new job to current month data
   */
  addJob(job: JobStatistic): void {
    // Check if job already exists (by URL)
    const exists = this.currentMonthData.jobs.some(j => j.url === job.url);
    if (exists) {
      logger.info(`Job already exists in current month: ${job.url}`);
      return;
    }

    // Add job to current month
    this.currentMonthData.jobs.push(job);

    // Update statistics
    this.updateStatistics(job);

    logger.info(`✓ Added job to statistics: ${job.title} at ${job.company}`);
  }

  /**
   * Update statistics with new job data
   */
  private updateStatistics(job: JobStatistic): void {
    const stats = this.currentMonthData.statistics;

    // Total jobs
    stats.totalJobs++;

    // By date
    const dateKey = job.extractedDate.split('T')[0]; // YYYY-MM-DD
    stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;

    // By industry
    if (job.industry) {
      stats.byIndustry[job.industry] = (stats.byIndustry[job.industry] || 0) + 1;
    }

    // By certificates
    job.certificates.forEach(cert => {
      stats.byCertificate[cert] = (stats.byCertificate[cert] || 0) + 1;
    });

    // By keywords
    job.keywords.forEach(keyword => {
      stats.byKeyword[keyword] = (stats.byKeyword[keyword] || 0) + 1;
    });

    // By seniority
    if (job.seniority) {
      stats.bySeniority[job.seniority] = (stats.bySeniority[job.seniority] || 0) + 1;
    }

    // By location
    if (job.location) {
      stats.byLocation[job.location] = (stats.byLocation[job.location] || 0) + 1;
    }

    // By country
    if (job.country) {
      stats.byCountry[job.country] = (stats.byCountry[job.country] || 0) + 1;
    }

    // By city (normalized)
    const normalizedCity = normalizeCity(job.city);
    if (normalizedCity) {
      stats.byCity[normalizedCity] = (stats.byCity[normalizedCity] || 0) + 1;
    }

    // By region
    if (job.region) {
      stats.byRegion[job.region] = (stats.byRegion[job.region] || 0) + 1;
    }

    // By company
    if (job.company) {
      stats.byCompany[job.company] = (stats.byCompany[job.company] || 0) + 1;
    }

    // By software
    if (job.software) {
      job.software.forEach(soft => {
        stats.bySoftware[soft] = (stats.bySoftware[soft] || 0) + 1;
      });
    }

    // By programming skills
    if (job.programmingSkills) {
      job.programmingSkills.forEach(skill => {
        stats.byProgrammingSkill[skill] = (stats.byProgrammingSkill[skill] || 0) + 1;
      });
    }

    // By years of experience
    if (job.yearsExperience) {
      stats.byYearsExperience[job.yearsExperience] = (stats.byYearsExperience[job.yearsExperience] || 0) + 1;
    }

    // By academic degrees
    if (job.academicDegrees) {
      job.academicDegrees.forEach(degree => {
        stats.byAcademicDegree[degree] = (stats.byAcademicDegree[degree] || 0) + 1;
      });
    }

    // By role type
    if (job.roleType) {
      stats.byRoleType[job.roleType] = (stats.byRoleType[job.roleType] || 0) + 1;
    }

    // By role category
    if (job.roleCategory) {
      stats.byRoleCategory[job.roleCategory] = (stats.byRoleCategory[job.roleCategory] || 0) + 1;
    }

    // By hour of day (publication times) - using postedDate
    if (job.postedDate) {
      const postedDate = new Date(job.postedDate);
      const hour = postedDate.getUTCHours();
      const hourKey = String(hour).padStart(2, '0');
      if (!stats.byHour) stats.byHour = {};
      stats.byHour[hourKey] = (stats.byHour[hourKey] || 0) + 1;

      // By day-hour combination (for heatmap)
      const dayOfWeek = postedDate.getUTCDay(); // 0=Sunday, 6=Saturday
      const dayHourKey = `${dayOfWeek}-${hour}`;
      if (!stats.byDayHour) stats.byDayHour = {};
      stats.byDayHour[dayHourKey] = (stats.byDayHour[dayHourKey] || 0) + 1;
    }

    // Recalculate salary statistics for all jobs
    this.recalculateSalaryStats();
  }

  /**
   * Recalculate salary statistics from all current month jobs
   */
  private recalculateSalaryStats(): void {
    const stats = this.currentMonthData.statistics;
    const jobsWithSalary = this.currentMonthData.jobs.filter(j => j.salary);

    // Ensure salaryStats exists
    if (!stats.salaryStats) {
      stats.salaryStats = {
        totalWithSalary: 0,
        averageSalary: null,
        medianSalary: null,
        byIndustry: {},
        bySeniority: {},
        byLocation: {},
        byCountry: {},
        byCity: {},
        byCurrency: {},
        salaryRanges: {
          '0-30k': 0,
          '30-50k': 0,
          '50-75k': 0,
          '75-100k': 0,
          '100-150k': 0,
          '150k+': 0,
        },
      };
    }

    const salaryStats = stats.salaryStats;
    salaryStats.totalWithSalary = jobsWithSalary.length;

    if (jobsWithSalary.length === 0) {
      salaryStats.averageSalary = null;
      salaryStats.medianSalary = null;
      return;
    }

    // Calculate midpoint salaries
    const salaries: number[] = [];
    const industryGroups: Record<string, number[]> = {};
    const seniorityGroups: Record<string, number[]> = {};
    const locationGroups: Record<string, number[]> = {};
    const countryGroups: Record<string, number[]> = {};
    const cityGroups: Record<string, number[]> = {};

    // Reset salary ranges
    salaryStats.salaryRanges = {
      '0-30k': 0,
      '30-50k': 0,
      '50-75k': 0,
      '75-100k': 0,
      '100-150k': 0,
      '150k+': 0,
    };
    salaryStats.byCurrency = {};

    jobsWithSalary.forEach(job => {
      if (!job.salary) return;

      const midpoint = job.salary.min !== null && job.salary.max !== null
        ? (job.salary.min + job.salary.max) / 2
        : (job.salary.min || job.salary.max || 0);

      if (midpoint > 0) {
        salaries.push(midpoint);

        // Group by industry
        if (job.industry) {
          if (!industryGroups[job.industry]) industryGroups[job.industry] = [];
          industryGroups[job.industry].push(midpoint);
        }

        // Group by seniority
        if (job.seniority) {
          if (!seniorityGroups[job.seniority]) seniorityGroups[job.seniority] = [];
          seniorityGroups[job.seniority].push(midpoint);
        }

        // Group by location
        if (job.location) {
          if (!locationGroups[job.location]) locationGroups[job.location] = [];
          locationGroups[job.location].push(midpoint);
        }

        // Group by country
        if (job.country) {
          if (!countryGroups[job.country]) countryGroups[job.country] = [];
          countryGroups[job.country].push(midpoint);
        }

        // Group by city (normalized)
        const normalizedCity = normalizeCity(job.city);
        if (normalizedCity) {
          if (!cityGroups[normalizedCity]) cityGroups[normalizedCity] = [];
          cityGroups[normalizedCity].push(midpoint);
        }

        // Currency count
        salaryStats.byCurrency[job.salary.currency] =
          (salaryStats.byCurrency[job.salary.currency] || 0) + 1;

        // Salary ranges (assuming USD or equivalent)
        if (midpoint < 30000) {
          salaryStats.salaryRanges['0-30k']++;
        } else if (midpoint < 50000) {
          salaryStats.salaryRanges['30-50k']++;
        } else if (midpoint < 75000) {
          salaryStats.salaryRanges['50-75k']++;
        } else if (midpoint < 100000) {
          salaryStats.salaryRanges['75-100k']++;
        } else if (midpoint < 150000) {
          salaryStats.salaryRanges['100-150k']++;
        } else {
          salaryStats.salaryRanges['150k+']++;
        }
      }
    });

    // Calculate overall average and median
    if (salaries.length > 0) {
      salaryStats.averageSalary = Math.round(
        salaries.reduce((a, b) => a + b, 0) / salaries.length
      );

      const sorted = [...salaries].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      salaryStats.medianSalary = sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
        : Math.round(sorted[mid]);
    }

    // Calculate by industry
    Object.entries(industryGroups).forEach(([industry, values]) => {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        salaryStats.byIndustry[industry] = {
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          median: sorted.length % 2 === 0
            ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
            : Math.round(sorted[mid]),
          count: values.length,
        };
      }
    });

    // Calculate by seniority
    Object.entries(seniorityGroups).forEach(([seniority, values]) => {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        salaryStats.bySeniority[seniority] = {
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          median: sorted.length % 2 === 0
            ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
            : Math.round(sorted[mid]),
          count: values.length,
        };
      }
    });

    // Calculate by location
    Object.entries(locationGroups).forEach(([location, values]) => {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        salaryStats.byLocation[location] = {
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          median: sorted.length % 2 === 0
            ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
            : Math.round(sorted[mid]),
          count: values.length,
        };
      }
    });

    // Calculate by country
    Object.entries(countryGroups).forEach(([country, values]) => {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        salaryStats.byCountry[country] = {
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          median: sorted.length % 2 === 0
            ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
            : Math.round(sorted[mid]),
          count: values.length,
        };
      }
    });

    // Calculate by city
    Object.entries(cityGroups).forEach(([city, values]) => {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        salaryStats.byCity[city] = {
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          median: sorted.length % 2 === 0
            ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
            : Math.round(sorted[mid]),
          count: values.length,
        };
      }
    });
  }

  /**
   * Merge salary stats from source into aggregated stats
   * Uses weighted averages for avg/median since we don't have individual values
   */
  private mergeSalaryStats(
    aggregated: MonthlyStatistics,
    source: NonNullable<MonthlyStatistics['salaryStats']>
  ): void {
    if (!aggregated.salaryStats) {
      aggregated.salaryStats = {
        totalWithSalary: 0,
        averageSalary: null,
        medianSalary: null,
        byIndustry: {},
        bySeniority: {},
        byLocation: {},
        byCountry: {},
        byCity: {},
        byCurrency: {},
        salaryRanges: {
          '0-30k': 0,
          '30-50k': 0,
          '50-75k': 0,
          '75-100k': 0,
          '100-150k': 0,
          '150k+': 0,
        },
      };
    }

    const agg = aggregated.salaryStats;

    // Merge totalWithSalary
    const prevTotal = agg.totalWithSalary;
    const srcTotal = source.totalWithSalary;
    agg.totalWithSalary += srcTotal;

    // Merge average salary using weighted average
    if (source.averageSalary !== null && srcTotal > 0) {
      if (agg.averageSalary === null || prevTotal === 0) {
        agg.averageSalary = source.averageSalary;
      } else {
        agg.averageSalary = Math.round(
          (agg.averageSalary * prevTotal + source.averageSalary * srcTotal) /
          (prevTotal + srcTotal)
        );
      }
    }

    // Merge median salary using weighted average (approximation)
    if (source.medianSalary !== null && srcTotal > 0) {
      if (agg.medianSalary === null || prevTotal === 0) {
        agg.medianSalary = source.medianSalary;
      } else {
        agg.medianSalary = Math.round(
          (agg.medianSalary * prevTotal + source.medianSalary * srcTotal) /
          (prevTotal + srcTotal)
        );
      }
    }

    // Merge salary ranges
    for (const range of Object.keys(agg.salaryRanges) as Array<keyof typeof agg.salaryRanges>) {
      agg.salaryRanges[range] += source.salaryRanges[range] || 0;
    }

    // Merge byCurrency
    for (const [currency, count] of Object.entries(source.byCurrency)) {
      agg.byCurrency[currency] = (agg.byCurrency[currency] || 0) + count;
    }

    // Helper to merge grouped salary stats
    const mergeGroupedStats = (
      aggGroup: Record<string, { avg: number; median: number; count: number }>,
      srcGroup: Record<string, { avg: number; median: number; count: number }>
    ) => {
      for (const [key, src] of Object.entries(srcGroup)) {
        if (!aggGroup[key]) {
          aggGroup[key] = { avg: src.avg, median: src.median, count: src.count };
        } else {
          const agg = aggGroup[key];
          const totalCount = agg.count + src.count;
          agg.avg = Math.round((agg.avg * agg.count + src.avg * src.count) / totalCount);
          agg.median = Math.round((agg.median * agg.count + src.median * src.count) / totalCount);
          agg.count = totalCount;
        }
      }
    };

    // Merge grouped stats
    mergeGroupedStats(agg.byIndustry, source.byIndustry);
    mergeGroupedStats(agg.bySeniority, source.bySeniority);
    mergeGroupedStats(agg.byLocation, source.byLocation);
    if (source.byCountry) mergeGroupedStats(agg.byCountry, source.byCountry);
    if (source.byCity) mergeGroupedStats(agg.byCity, source.byCity);
  }

  /**
   * Save current month data and summary to GitHub Gist
   */
  async save(): Promise<void> {
    try {
      if (!this.useGitHubGist) {
        logger.info('GitHub Gist not configured. Skipping save.');
        return;
      }

      // Update timestamps
      const now = new Date().toISOString();
      this.currentMonthData.lastUpdated = now;
      this.summaryData.lastUpdated = now;

      // Update summary statistics
      this.updateSummary();

      // Save both files in one API call
      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'job-statistics-current.json': {
              content: JSON.stringify(this.currentMonthData, null, 2),
            },
            'job-statistics-summary.json': {
              content: JSON.stringify(this.summaryData, null, 2),
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gist = await response.json();
      logger.info(`✓ Job statistics saved to GitHub Gist`);
      logger.info(`  - Gist URL: ${gist.html_url}`);
      logger.info(`  - Current month (${this.currentMonthData.month}): ${this.currentMonthData.jobs.length} jobs`);
      logger.info(`  - Total all time: ${this.summaryData.totalJobsAllTime} jobs`);
    } catch (error) {
      logger.error('Error saving job statistics:', error);
      throw error;
    }
  }

  /**
   * Update summary with current month data
   */
  private updateSummary(): void {
    // Calculate total jobs (current month + all archives)
    let totalJobs = this.currentMonthData.jobs.length;

    // Update current month
    this.summaryData.currentMonth = this.currentMonthData.month;

    // For overall statistics, we'll aggregate from current month
    // (In a real scenario, we'd load and aggregate all archives, but that's expensive)
    this.summaryData.totalJobsAllTime = totalJobs; // Simplified for now

    // Update overall top statistics (top 10 from current month)
    this.summaryData.overallStatistics.topIndustries = this.getTopN(
      this.currentMonthData.statistics.byIndustry,
      10
    );
    this.summaryData.overallStatistics.topCertificates = this.getTopN(
      this.currentMonthData.statistics.byCertificate,
      10
    );
    this.summaryData.overallStatistics.topKeywords = this.getTopN(
      this.currentMonthData.statistics.byKeyword,
      10
    );

    // Calculate average (simplified)
    const totalMonths = this.summaryData.availableArchives.length + 1; // +1 for current month
    this.summaryData.overallStatistics.totalMonths = totalMonths;
    this.summaryData.overallStatistics.averageJobsPerMonth =
      totalJobs / totalMonths;
  }

  /**
   * Get top N items from a record
   */
  private getTopN(record: Record<string, number>, n: number): Record<string, number> {
    return Object.entries(record)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, number>);
  }

  /**
   * Get current month data
   */
  getCurrentMonthData(): CurrentMonthData {
    return this.currentMonthData;
  }

  /**
   * Get summary data
   */
  getSummary(): SummaryData {
    return this.summaryData;
  }

  /**
   * Get archived month data
   */
  async getArchivedMonth(month: string): Promise<ArchiveMonthData | null> {
    try {
      if (!this.useGitHubGist) {
        return null;
      }

      const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
        headers: {
          'Authorization': `token ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
        cache: 'no-store', // Disable caching
        next: { revalidate: 0 }, // Next.js cache control
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const gist = await response.json();
      const fileName = `job-statistics-${month}.json`;
      const file = gist.files[fileName];

      if (!file) {
        logger.info(`No archive found for month: ${month}`);
        return null;
      }

      return JSON.parse(file.content);
    } catch (error) {
      logger.error(`Error loading archived month ${month}:`, error);
      return null;
    }
  }

  /**
   * Get all archived months data and aggregate statistics
   */
  async getAllArchivesAggregated(): Promise<{
    archives: ArchiveMonthData[];
    aggregated: MonthlyStatistics;
    totalJobs: number;
  }> {
    const archives: ArchiveMonthData[] = [];
    const aggregated: MonthlyStatistics = this.createEmptyStatistics();
    let totalJobs = 0;

    try {
      // Load all archives
      for (const month of this.summaryData.availableArchives) {
        const archive = await this.getArchivedMonth(month);
        if (archive) {
          archives.push(archive);

          // Aggregate statistics
          totalJobs += archive.jobCount;

          // Merge byDate
          for (const [date, count] of Object.entries(archive.statistics.byDate)) {
            aggregated.byDate[date] = (aggregated.byDate[date] || 0) + count;
          }

          // Merge byIndustry
          for (const [industry, count] of Object.entries(archive.statistics.byIndustry)) {
            aggregated.byIndustry[industry] = (aggregated.byIndustry[industry] || 0) + count;
          }

          // Merge byCertificate
          for (const [cert, count] of Object.entries(archive.statistics.byCertificate)) {
            aggregated.byCertificate[cert] = (aggregated.byCertificate[cert] || 0) + count;
          }

          // Merge byKeyword
          for (const [keyword, count] of Object.entries(archive.statistics.byKeyword)) {
            aggregated.byKeyword[keyword] = (aggregated.byKeyword[keyword] || 0) + count;
          }

          // Merge bySeniority
          for (const [level, count] of Object.entries(archive.statistics.bySeniority)) {
            aggregated.bySeniority[level] = (aggregated.bySeniority[level] || 0) + count;
          }

          // Merge byLocation
          for (const [location, count] of Object.entries(archive.statistics.byLocation)) {
            aggregated.byLocation[location] = (aggregated.byLocation[location] || 0) + count;
          }

          // Merge byCountry (if available)
          if (archive.statistics.byCountry) {
            for (const [country, count] of Object.entries(archive.statistics.byCountry)) {
              aggregated.byCountry[country] = (aggregated.byCountry[country] || 0) + count;
            }
          }

          // Merge byCity (if available)
          if (archive.statistics.byCity) {
            for (const [city, count] of Object.entries(archive.statistics.byCity)) {
              aggregated.byCity[city] = (aggregated.byCity[city] || 0) + count;
            }
          }

          // Merge byRegion (if available)
          if (archive.statistics.byRegion) {
            for (const [region, count] of Object.entries(archive.statistics.byRegion)) {
              aggregated.byRegion[region] = (aggregated.byRegion[region] || 0) + count;
            }
          }

          // Merge byCompany
          for (const [company, count] of Object.entries(archive.statistics.byCompany)) {
            aggregated.byCompany[company] = (aggregated.byCompany[company] || 0) + count;
          }

          // Merge bySoftware (if available)
          if (archive.statistics.bySoftware) {
            for (const [software, count] of Object.entries(archive.statistics.bySoftware)) {
              aggregated.bySoftware[software] = (aggregated.bySoftware[software] || 0) + count;
            }
          }

          // Merge byProgrammingSkill (if available)
          if (archive.statistics.byProgrammingSkill) {
            for (const [skill, count] of Object.entries(archive.statistics.byProgrammingSkill)) {
              aggregated.byProgrammingSkill[skill] = (aggregated.byProgrammingSkill[skill] || 0) + count;
            }
          }

          // Merge byYearsExperience (if available)
          if (archive.statistics.byYearsExperience) {
            for (const [years, count] of Object.entries(archive.statistics.byYearsExperience)) {
              aggregated.byYearsExperience[years] = (aggregated.byYearsExperience[years] || 0) + count;
            }
          }

          // Merge byAcademicDegree (if available)
          if (archive.statistics.byAcademicDegree) {
            for (const [degree, count] of Object.entries(archive.statistics.byAcademicDegree)) {
              aggregated.byAcademicDegree[degree] = (aggregated.byAcademicDegree[degree] || 0) + count;
            }
          }

          // Merge byRoleType (if available)
          if (archive.statistics.byRoleType) {
            for (const [roleType, count] of Object.entries(archive.statistics.byRoleType)) {
              aggregated.byRoleType[roleType] = (aggregated.byRoleType[roleType] || 0) + count;
            }
          }

          // Merge byRoleCategory (if available)
          if (archive.statistics.byRoleCategory) {
            for (const [category, count] of Object.entries(archive.statistics.byRoleCategory)) {
              aggregated.byRoleCategory[category] = (aggregated.byRoleCategory[category] || 0) + count;
            }
          }

          // Merge salary stats from archive
          if (archive.statistics.salaryStats) {
            this.mergeSalaryStats(aggregated, archive.statistics.salaryStats);
          }

          // Merge byHour (publication times) if available
          if (archive.statistics.byHour) {
            if (!aggregated.byHour) aggregated.byHour = {};
            for (const [hour, count] of Object.entries(archive.statistics.byHour)) {
              aggregated.byHour[hour] = (aggregated.byHour[hour] || 0) + count;
            }
          }

          // Merge byDayHour (heatmap) if available
          if (archive.statistics.byDayHour) {
            if (!aggregated.byDayHour) aggregated.byDayHour = {};
            for (const [key, count] of Object.entries(archive.statistics.byDayHour)) {
              aggregated.byDayHour[key] = (aggregated.byDayHour[key] || 0) + count;
            }
          }
        }
      }

      // Add current month to aggregation
      totalJobs += this.currentMonthData.jobs.length;

      // Merge current month statistics
      for (const [date, count] of Object.entries(this.currentMonthData.statistics.byDate)) {
        aggregated.byDate[date] = (aggregated.byDate[date] || 0) + count;
      }
      for (const [industry, count] of Object.entries(this.currentMonthData.statistics.byIndustry)) {
        aggregated.byIndustry[industry] = (aggregated.byIndustry[industry] || 0) + count;
      }
      for (const [cert, count] of Object.entries(this.currentMonthData.statistics.byCertificate)) {
        aggregated.byCertificate[cert] = (aggregated.byCertificate[cert] || 0) + count;
      }
      for (const [keyword, count] of Object.entries(this.currentMonthData.statistics.byKeyword)) {
        aggregated.byKeyword[keyword] = (aggregated.byKeyword[keyword] || 0) + count;
      }
      for (const [level, count] of Object.entries(this.currentMonthData.statistics.bySeniority)) {
        aggregated.bySeniority[level] = (aggregated.bySeniority[level] || 0) + count;
      }
      for (const [location, count] of Object.entries(this.currentMonthData.statistics.byLocation)) {
        aggregated.byLocation[location] = (aggregated.byLocation[location] || 0) + count;
      }
      // Merge byCountry (if available - for backward compatibility)
      if (this.currentMonthData.statistics.byCountry) {
        for (const [country, count] of Object.entries(this.currentMonthData.statistics.byCountry)) {
          aggregated.byCountry[country] = (aggregated.byCountry[country] || 0) + count;
        }
      }
      // Merge byCity (if available - for backward compatibility)
      if (this.currentMonthData.statistics.byCity) {
        for (const [city, count] of Object.entries(this.currentMonthData.statistics.byCity)) {
          aggregated.byCity[city] = (aggregated.byCity[city] || 0) + count;
        }
      }
      // Merge byRegion (if available - for backward compatibility)
      if (this.currentMonthData.statistics.byRegion) {
        for (const [region, count] of Object.entries(this.currentMonthData.statistics.byRegion)) {
          aggregated.byRegion[region] = (aggregated.byRegion[region] || 0) + count;
        }
      }
      for (const [company, count] of Object.entries(this.currentMonthData.statistics.byCompany)) {
        aggregated.byCompany[company] = (aggregated.byCompany[company] || 0) + count;
      }
      // Merge bySoftware (if available - for backward compatibility)
      if (this.currentMonthData.statistics.bySoftware) {
        for (const [software, count] of Object.entries(this.currentMonthData.statistics.bySoftware)) {
          aggregated.bySoftware[software] = (aggregated.bySoftware[software] || 0) + count;
        }
      }
      // Merge byProgrammingSkill (if available - for backward compatibility)
      if (this.currentMonthData.statistics.byProgrammingSkill) {
        for (const [skill, count] of Object.entries(this.currentMonthData.statistics.byProgrammingSkill)) {
          aggregated.byProgrammingSkill[skill] = (aggregated.byProgrammingSkill[skill] || 0) + count;
        }
      }
      // Merge byYearsExperience (if available - for backward compatibility)
      if (this.currentMonthData.statistics.byYearsExperience) {
        for (const [years, count] of Object.entries(this.currentMonthData.statistics.byYearsExperience)) {
          aggregated.byYearsExperience[years] = (aggregated.byYearsExperience[years] || 0) + count;
        }
      }
      // Merge byAcademicDegree (if available - for backward compatibility)
      if (this.currentMonthData.statistics.byAcademicDegree) {
        for (const [degree, count] of Object.entries(this.currentMonthData.statistics.byAcademicDegree)) {
          aggregated.byAcademicDegree[degree] = (aggregated.byAcademicDegree[degree] || 0) + count;
        }
      }
      // Merge byRoleType (if available - for backward compatibility)
      if (this.currentMonthData.statistics.byRoleType) {
        for (const [roleType, count] of Object.entries(this.currentMonthData.statistics.byRoleType)) {
          aggregated.byRoleType[roleType] = (aggregated.byRoleType[roleType] || 0) + count;
        }
      }
      // Merge byRoleCategory (if available - for backward compatibility)
      if (this.currentMonthData.statistics.byRoleCategory) {
        for (const [category, count] of Object.entries(this.currentMonthData.statistics.byRoleCategory)) {
          aggregated.byRoleCategory[category] = (aggregated.byRoleCategory[category] || 0) + count;
        }
      }

      // Merge salary stats from current month
      if (this.currentMonthData.statistics.salaryStats) {
        this.mergeSalaryStats(aggregated, this.currentMonthData.statistics.salaryStats);
      }

      // Merge byHour from current month (if available)
      if (this.currentMonthData.statistics.byHour) {
        if (!aggregated.byHour) aggregated.byHour = {};
        for (const [hour, count] of Object.entries(this.currentMonthData.statistics.byHour)) {
          aggregated.byHour[hour] = (aggregated.byHour[hour] || 0) + count;
        }
      }

      // Merge byDayHour from current month (if available)
      if (this.currentMonthData.statistics.byDayHour) {
        if (!aggregated.byDayHour) aggregated.byDayHour = {};
        for (const [key, count] of Object.entries(this.currentMonthData.statistics.byDayHour)) {
          aggregated.byDayHour[key] = (aggregated.byDayHour[key] || 0) + count;
        }
      }

      aggregated.totalJobs = totalJobs;

      logger.info(`✓ Aggregated ${archives.length} archived months + current month`);
      logger.info(`  - Total jobs across all time: ${totalJobs}`);

      return { archives, aggregated, totalJobs };
    } catch (error) {
      logger.error('Error aggregating archives:', error);
      return { archives: [], aggregated, totalJobs: 0 };
    }
  }

  /**
   * Get statistics for current month
   */
  getCurrentStatistics(): MonthlyStatistics {
    return this.currentMonthData.statistics;
  }

  /**
   * Filter current month jobs by criteria
   */
  filterJobs(filters: {
    industry?: string;
    certificate?: string;
    keyword?: string;
    seniority?: string;
    location?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
  }): JobStatistic[] {
    return this.currentMonthData.jobs.filter(job => {
      // Industry filter
      if (filters.industry && job.industry !== filters.industry) {
        return false;
      }

      // Certificate filter
      if (filters.certificate && !job.certificates.includes(filters.certificate)) {
        return false;
      }

      // Keyword filter
      if (filters.keyword && !job.keywords.includes(filters.keyword)) {
        return false;
      }

      // Seniority filter
      if (filters.seniority && job.seniority !== filters.seniority) {
        return false;
      }

      // Location filter
      if (filters.location && !job.location.includes(filters.location)) {
        return false;
      }

      // Company filter
      if (filters.company && !job.company.toLowerCase().includes(filters.company.toLowerCase())) {
        return false;
      }

      // Date range filter
      if (filters.startDate) {
        const jobDate = new Date(job.extractedDate);
        const startDate = new Date(filters.startDate);
        if (jobDate < startDate) {
          return false;
        }
      }

      if (filters.endDate) {
        const jobDate = new Date(job.extractedDate);
        const endDate = new Date(filters.endDate);
        if (jobDate > endDate) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      currentMonth: this.currentMonthData.month,
      currentMonthJobs: this.currentMonthData.jobs.length,
      totalJobsAllTime: this.summaryData.totalJobsAllTime,
      availableArchives: this.summaryData.availableArchives.length,
      storageType: this.useGitHubGist ? 'GitHub Gist' : 'Local File',
    };
  }

  /**
   * Get URL index size (for debugging) - for Gist, this is the current month jobs count
   */
  getUrlIndexSize(): number {
    return this.currentMonthData.jobs.length;
  }
}
