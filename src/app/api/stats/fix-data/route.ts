import { NextRequest, NextResponse } from "next/server";
import { getStatsCache, getStorageInfo } from "@/lib/stats-storage";
import { validateEnvironmentVariables } from "@/lib/validation";
import { logger } from "@/lib/logger";
import { SalaryExtractor } from "@/lib/salary-extractor";
import { RoleTypeExtractor } from "@/lib/role-type-extractor";
import { getR2Storage, ManifestMonth } from "@/lib/r2-storage";
import { JobMetadata, JobStatistic, MonthlyStatistics } from "@/lib/job-statistics-r2";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for processing

/**
 * Normalize city names for consistent statistics
 */
function normalizeCity(cityName: string | null): string | null {
  if (!cityName) return null;

  const normalized = cityName
    .replace(/\s+Area$/i, '')
    .replace(/^City of\s+/i, '')
    .replace(/^Greater\s+/i, '')
    .trim();

  // Filter out non-city names
  if (/^England$/i.test(normalized) ||
      /^Scotland$/i.test(normalized) ||
      /^Wales$/i.test(normalized) ||
      /^United Kingdom$/i.test(normalized)) {
    return null;
  }

  return normalized;
}

/**
 * Process jobs for a single month: re-extract salary, role type, time data
 * Returns updated jobs and statistics
 */
function processJobs(jobs: JobStatistic[]): {
  jobs: JobStatistic[];
  statistics: {
    byHour: Record<string, number>;
    byDayHour: Record<string, number>;
    byRoleType: Record<string, number>;
    byRoleCategory: Record<string, number>;
  };
  counts: {
    salaryNew: number;
    salaryFixed: number;
    salaryUnchanged: number;
    roleTypeNew: number;
    roleTypeUpdated: number;
    hoursGenerated: number;
  };
} {
  const byHour: Record<string, number> = {};
  const byDayHour: Record<string, number> = {};
  const byRoleType: Record<string, number> = {};
  const byRoleCategory: Record<string, number> = {};

  let salaryNew = 0;
  let salaryFixed = 0;
  let salaryUnchanged = 0;
  let roleTypeNew = 0;
  let roleTypeUpdated = 0;
  let hoursGenerated = 0;

  for (const job of jobs) {
    // 1. Re-extract salary from description
    const oldSalary = job.salary;
    const newSalary = SalaryExtractor.extractSalary(job.title, job.description);

    if (newSalary) {
      const normalizedSalary = SalaryExtractor.normalizeToAnnual(newSalary);

      if (!oldSalary) {
        salaryNew++;
      } else if (
        oldSalary.min !== normalizedSalary.min ||
        oldSalary.max !== normalizedSalary.max
      ) {
        salaryFixed++;
      } else {
        salaryUnchanged++;
      }

      job.salary = normalizedSalary;
    } else if (oldSalary) {
      salaryUnchanged++;
    }

    // 2. Extract role type (always re-extract to apply new categories)
    const roleTypeMatch = RoleTypeExtractor.extractRoleType(
      job.title,
      job.keywords || [],
      job.description || '',
      job.industry || ''
    );

    if (roleTypeMatch) {
      if (!job.roleType) {
        roleTypeNew++;
      } else if (job.roleType !== roleTypeMatch.roleType) {
        roleTypeUpdated++;
      }
      job.roleType = roleTypeMatch.roleType;
      job.roleCategory = roleTypeMatch.category;

      byRoleType[roleTypeMatch.roleType] = (byRoleType[roleTypeMatch.roleType] || 0) + 1;
      byRoleCategory[roleTypeMatch.category] = (byRoleCategory[roleTypeMatch.category] || 0) + 1;
    }

    // 3. Generate byHour and byDayHour from postedDate
    if (job.postedDate) {
      try {
        const postedDate = new Date(job.postedDate);
        if (!isNaN(postedDate.getTime())) {
          const hour = postedDate.getUTCHours();
          const dayOfWeek = postedDate.getUTCDay();

          const hourKey = String(hour).padStart(2, '0');
          byHour[hourKey] = (byHour[hourKey] || 0) + 1;

          const dayHourKey = `${dayOfWeek}-${hour}`;
          byDayHour[dayHourKey] = (byDayHour[dayHourKey] || 0) + 1;

          hoursGenerated++;
        }
      } catch {
        logger.warn(`Failed to parse postedDate for job ${job.id}: ${job.postedDate}`);
      }
    }
  }

  return {
    jobs,
    statistics: { byHour, byDayHour, byRoleType, byRoleCategory },
    counts: { salaryNew, salaryFixed, salaryUnchanged, roleTypeNew, roleTypeUpdated, hoursGenerated },
  };
}

/**
 * Recalculate salary statistics from all jobs
 */
function recalculateSalaryStats(jobs: JobStatistic[]): MonthlyStatistics['salaryStats'] {
  const jobsWithSalary = jobs.filter((j) => j.salary && (j.salary.min || j.salary.max));

  const salaryStats: NonNullable<MonthlyStatistics['salaryStats']> = {
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

  salaryStats.totalWithSalary = jobsWithSalary.length;

  if (jobsWithSalary.length === 0) {
    return salaryStats;
  }

  const salaries: number[] = [];
  const industryGroups: Record<string, number[]> = {};
  const seniorityGroups: Record<string, number[]> = {};
  const locationGroups: Record<string, number[]> = {};
  const countryGroups: Record<string, number[]> = {};
  const cityGroups: Record<string, number[]> = {};

  jobsWithSalary.forEach((job) => {
    if (!job.salary) return;

    const midpoint = job.salary.min !== null && job.salary.max !== null
      ? (job.salary.min + job.salary.max) / 2
      : (job.salary.min || job.salary.max || 0);

    if (midpoint > 0) {
      salaries.push(midpoint);

      if (job.industry) {
        if (!industryGroups[job.industry]) industryGroups[job.industry] = [];
        industryGroups[job.industry].push(midpoint);
      }

      if (job.seniority) {
        if (!seniorityGroups[job.seniority]) seniorityGroups[job.seniority] = [];
        seniorityGroups[job.seniority].push(midpoint);
      }

      if (job.location) {
        if (!locationGroups[job.location]) locationGroups[job.location] = [];
        locationGroups[job.location].push(midpoint);
      }

      if (job.country) {
        if (!countryGroups[job.country]) countryGroups[job.country] = [];
        countryGroups[job.country].push(midpoint);
      }

      const normCity = normalizeCity(job.city);
      if (normCity) {
        if (!cityGroups[normCity]) cityGroups[normCity] = [];
        cityGroups[normCity].push(midpoint);
      }

      if (job.salary.currency) {
        salaryStats.byCurrency[job.salary.currency] =
          (salaryStats.byCurrency[job.salary.currency] || 0) + 1;
      }

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

  const calcGroupStats = (groups: Record<string, number[]>) => {
    const result: Record<string, { avg: number; median: number; count: number }> = {};
    for (const [key, values] of Object.entries(groups)) {
      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        result[key] = {
          avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
          median: sorted.length % 2 === 0
            ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
            : Math.round(sorted[mid]),
          count: values.length,
        };
      }
    }
    return result;
  };

  salaryStats.byIndustry = calcGroupStats(industryGroups);
  salaryStats.bySeniority = calcGroupStats(seniorityGroups);
  salaryStats.byLocation = calcGroupStats(locationGroups);
  salaryStats.byCountry = calcGroupStats(countryGroups);
  salaryStats.byCity = calcGroupStats(cityGroups);

  return salaryStats;
}

/**
 * Rebuild full MonthlyStatistics from jobs array
 */
function rebuildStatistics(jobs: JobStatistic[]): MonthlyStatistics {
  const stats: MonthlyStatistics = {
    totalJobs: jobs.length,
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
  };

  for (const job of jobs) {
    const date = (job.extractedDate || job.postedDate || '').split('T')[0];
    if (date) stats.byDate[date] = (stats.byDate[date] || 0) + 1;
    if (job.industry) stats.byIndustry[job.industry] = (stats.byIndustry[job.industry] || 0) + 1;
    if (job.seniority) stats.bySeniority[job.seniority] = (stats.bySeniority[job.seniority] || 0) + 1;
    if (job.location) stats.byLocation[job.location] = (stats.byLocation[job.location] || 0) + 1;
    if (job.country) stats.byCountry[job.country] = (stats.byCountry[job.country] || 0) + 1;
    const normCity = normalizeCity(job.city);
    if (normCity) stats.byCity[normCity] = (stats.byCity[normCity] || 0) + 1;
    if (job.region) stats.byRegion[job.region] = (stats.byRegion[job.region] || 0) + 1;
    if (job.company) stats.byCompany[job.company] = (stats.byCompany[job.company] || 0) + 1;

    job.certificates?.forEach(cert => {
      stats.byCertificate[cert] = (stats.byCertificate[cert] || 0) + 1;
    });
    job.keywords?.forEach(kw => {
      stats.byKeyword[kw] = (stats.byKeyword[kw] || 0) + 1;
    });
    job.software?.forEach(s => {
      stats.bySoftware[s] = (stats.bySoftware[s] || 0) + 1;
    });
    job.programmingSkills?.forEach(s => {
      stats.byProgrammingSkill[s] = (stats.byProgrammingSkill[s] || 0) + 1;
    });
    if (job.yearsExperience) {
      stats.byYearsExperience[job.yearsExperience] = (stats.byYearsExperience[job.yearsExperience] || 0) + 1;
    }
    job.academicDegrees?.forEach(d => {
      stats.byAcademicDegree[d] = (stats.byAcademicDegree[d] || 0) + 1;
    });
    if (job.roleType) {
      stats.byRoleType![job.roleType] = (stats.byRoleType![job.roleType] || 0) + 1;
    }
    if (job.roleCategory) {
      stats.byRoleCategory![job.roleCategory] = (stats.byRoleCategory![job.roleCategory] || 0) + 1;
    }

    // Time data
    if (job.postedDate) {
      try {
        const d = new Date(job.postedDate);
        if (!isNaN(d.getTime())) {
          const hour = String(d.getUTCHours()).padStart(2, '0');
          stats.byHour![hour] = (stats.byHour![hour] || 0) + 1;
          const dayHour = `${d.getUTCDay()}-${d.getUTCHours()}`;
          stats.byDayHour![dayHour] = (stats.byDayHour![dayHour] || 0) + 1;
        }
      } catch { /* skip */ }
    }
  }

  // Calculate salary stats
  stats.salaryStats = recalculateSalaryStats(jobs);

  return stats;
}

interface JobDescription {
  id: string;
  description: string;
}

/**
 * POST /api/stats/fix-data
 *
 * Fixes existing stored data across ALL months by:
 * 1. Re-extracting salary data from job descriptions
 * 2. Re-extracting role types with new functional categories
 * 3. Recalculating byHour and byDayHour for heatmap
 * 4. Rebuilding all statistics per month
 *
 * Query params:
 *   ?month=current  - Only fix current month (default: all months)
 */
export async function POST(request: NextRequest) {
  try {
    validateEnvironmentVariables();

    const searchParams = request.nextUrl.searchParams;
    const monthParam = searchParams.get("month"); // "current" or null (all)
    const fixCurrentOnly = monthParam === "current";

    const storageInfo = getStorageInfo();
    logger.info(`Starting data fix using ${storageInfo.backend} storage...`);
    logger.info(`Mode: ${fixCurrentOnly ? 'current month only' : 'ALL months'}`);

    const statsCache = await getStatsCache();
    await statsCache.load();

    const r2 = getR2Storage();
    const manifest = statsCache.getManifest();

    if (!manifest) {
      return NextResponse.json({
        success: false,
        message: "No manifest found",
      }, { status: 404 });
    }

    // Determine which months to process
    const monthsToProcess = fixCurrentOnly
      ? [manifest.currentMonth]
      : [...manifest.availableMonths];

    // Ensure current month is included
    if (!monthsToProcess.includes(manifest.currentMonth)) {
      monthsToProcess.push(manifest.currentMonth);
    }

    logger.info(`Processing ${monthsToProcess.length} month(s): ${monthsToProcess.join(', ')}`);

    // Aggregate results across all months
    const allResults: Array<{
      month: string;
      totalJobs: number;
      counts: {
        salaryNew: number;
        salaryFixed: number;
        salaryUnchanged: number;
        roleTypeNew: number;
        roleTypeUpdated: number;
        hoursGenerated: number;
      };
      roleTypes: number;
      categories: number;
    }> = [];

    let grandTotalJobs = 0;
    let grandSalaryNew = 0;
    let grandSalaryFixed = 0;
    let grandRoleTypeNew = 0;
    let grandRoleTypeUpdated = 0;

    // Process each month
    for (const month of monthsToProcess) {
      const monthData = manifest.months[month];
      if (!monthData?.days || monthData.days.length === 0) {
        logger.info(`  Skipping ${month}: no data`);
        continue;
      }

      logger.info(`  Processing month ${month}...`);

      // Load all jobs for this month (metadata + descriptions)
      const allJobs: JobStatistic[] = [];

      for (const day of monthData.days) {
        const [metadata, descriptions] = await Promise.all([
          r2.getNDJSONGzipped<JobMetadata>(day.metadata),
          r2.getNDJSONGzipped<JobDescription>(day.descriptions),
        ]);

        const descMap = new Map(descriptions.map(d => [d.id, d.description]));

        for (const meta of metadata) {
          allJobs.push({
            ...meta,
            description: descMap.get(meta.id) || '',
          });
        }
      }

      if (allJobs.length === 0) {
        logger.info(`    No jobs found for ${month}`);
        continue;
      }

      logger.info(`    Loaded ${allJobs.length} jobs for ${month}`);

      // Process all jobs (re-extract salary, role type, time data)
      const result = processJobs(allJobs);

      // Rebuild full statistics from the updated jobs
      const updatedStats = rebuildStatistics(result.jobs);

      // Save updated metadata back to R2 (grouped by day)
      const jobsByDay = new Map<string, JobStatistic[]>();
      for (const job of result.jobs) {
        const dateKey = (job.extractedDate || job.postedDate || '').split('T')[0];
        if (!jobsByDay.has(dateKey)) jobsByDay.set(dateKey, []);
        jobsByDay.get(dateKey)!.push(job);
      }

      for (const day of monthData.days) {
        const dayJobs = jobsByDay.get(day.date) || [];
        if (dayJobs.length === 0) continue;

        // Split back into metadata and descriptions
        const updatedMetadata: JobMetadata[] = [];
        const updatedDescriptions: JobDescription[] = [];

        for (const job of dayJobs) {
          const { description, ...meta } = job;
          updatedMetadata.push(meta as JobMetadata);
          updatedDescriptions.push({ id: job.id, description });
        }

        // Save updated metadata (descriptions unchanged but re-save to be safe)
        const metaBytes = await r2.putNDJSONGzipped(day.metadata, updatedMetadata);
        const descBytes = await r2.putNDJSONGzipped(day.descriptions, updatedDescriptions);

        // Update day entry in manifest
        day.jobCount = updatedMetadata.length;
        day.metadataBytes = metaBytes;
        day.descriptionsBytes = descBytes;
      }

      // Save updated stats for this month
      await r2.putJSON(`stats/${month}.json`, updatedStats, 'public, max-age=60');

      // Update month totals in manifest
      monthData.totalJobs = result.jobs.length;

      const monthResult = {
        month,
        totalJobs: result.jobs.length,
        counts: result.counts,
        roleTypes: Object.keys(result.statistics.byRoleType).length,
        categories: Object.keys(result.statistics.byRoleCategory).length,
      };

      allResults.push(monthResult);
      grandTotalJobs += result.jobs.length;
      grandSalaryNew += result.counts.salaryNew;
      grandSalaryFixed += result.counts.salaryFixed;
      grandRoleTypeNew += result.counts.roleTypeNew;
      grandRoleTypeUpdated += result.counts.roleTypeUpdated;

      logger.info(`    ✓ ${month}: ${result.jobs.length} jobs, ${result.counts.roleTypeNew} new role types, ${result.counts.roleTypeUpdated} updated`);
    }

    // Update manifest totals and save
    manifest.totalJobsAllTime = (Object.values(manifest.months) as ManifestMonth[])
      .reduce((sum, m) => sum + m.totalJobs, 0);
    manifest.updatedAt = new Date().toISOString();

    await r2.saveManifest(manifest);

    // Also trigger a save on the cache to sync current month
    await statsCache.save();

    logger.info(`\nData fix completed across ${allResults.length} month(s):`);
    logger.info(`  Total jobs processed: ${grandTotalJobs}`);
    logger.info(`  Salaries: ${grandSalaryNew} new, ${grandSalaryFixed} fixed`);
    logger.info(`  Role types: ${grandRoleTypeNew} new, ${grandRoleTypeUpdated} updated`);

    return NextResponse.json({
      success: true,
      message: `Data fix completed across ${allResults.length} month(s)`,
      results: {
        monthsProcessed: allResults.length,
        grandTotal: {
          totalJobs: grandTotalJobs,
          salaryNew: grandSalaryNew,
          salaryFixed: grandSalaryFixed,
          roleTypeNew: grandRoleTypeNew,
          roleTypeUpdated: grandRoleTypeUpdated,
        },
        perMonth: allResults,
      },
    });
  } catch (error) {
    logger.error("Error fixing data:", error);

    return NextResponse.json(
      {
        error: "Failed to fix data",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
