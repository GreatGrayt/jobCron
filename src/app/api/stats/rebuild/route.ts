import { NextRequest, NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";
import { JobMetadata } from "@/lib/job-statistics-r2";
import { logger } from "@/lib/logger";

/**
 * Normalize URL for consistent deduplication
 */
function normalizeUrl(url: string): string {
  return url.toLowerCase().trim();
}

export const maxDuration = 300; // 5 minutes timeout
export const dynamic = "force-dynamic";

/**
 * POST /api/stats/rebuild
 *
 * Rebuilds the URL index and recalculates statistics from actual job data in R2.
 * This fixes duplicate job issues by:
 * 1. Loading all metadata files
 * 2. Deduplicating by URL
 * 3. Rebuilding the URL index
 * 4. Recalculating statistics
 * 5. Rewriting deduplicated data
 */
export async function POST(request: NextRequest) {
  logger.info("=== Starting R2 Data Rebuild ===");

  try {
    const r2 = getR2Storage();

    if (!r2.isAvailable()) {
      return NextResponse.json(
        { error: "R2 not configured" },
        { status: 400 }
      );
    }

    // Load manifest
    const manifest = await r2.getManifest();
    logger.info(`Loaded manifest with ${manifest.availableMonths.length} months`);

    // Collect all jobs from all months, deduplicating by URL
    const allJobsByUrl = new Map<string, { metadata: JobMetadata; month: string; day: string }>();
    let totalLoaded = 0;
    let duplicatesFound = 0;

    for (const month of manifest.availableMonths) {
      const monthData = manifest.months[month];
      if (!monthData?.days) continue;

      for (const day of monthData.days) {
        try {
          const metadata = await r2.getNDJSONGzipped<JobMetadata>(day.metadata);
          totalLoaded += metadata.length;

          for (const job of metadata) {
            const normalizedUrl = normalizeUrl(job.url);
            if (allJobsByUrl.has(normalizedUrl)) {
              duplicatesFound++;
            } else {
              allJobsByUrl.set(normalizedUrl, {
                metadata: job,
                month,
                day: day.date,
              });
            }
          }

          logger.info(`Processed ${day.date}: ${metadata.length} jobs`);
        } catch (error) {
          logger.error(`Error loading ${day.metadata}:`, error);
        }
      }
    }

    logger.info(`Total loaded: ${totalLoaded}, Unique: ${allJobsByUrl.size}, Duplicates: ${duplicatesFound}`);

    // Build URL index
    const urlIndex = Array.from(allJobsByUrl.keys());

    // Save URL index
    await r2.putJSON('url-index.json', {
      urls: urlIndex,
      updatedAt: new Date().toISOString(),
      count: urlIndex.length,
    }, 'public, max-age=60');

    logger.info(`✓ Saved URL index with ${urlIndex.length} URLs`);

    // Recalculate statistics for each month
    const statsByMonth = new Map<string, {
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
    }>();

    // Initialize stats for all months
    for (const month of manifest.availableMonths) {
      statsByMonth.set(month, {
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
      });
    }

    // Calculate stats from unique jobs
    for (const { metadata, month } of allJobsByUrl.values()) {
      const stats = statsByMonth.get(month);
      if (!stats) continue;

      stats.totalJobs++;

      const dateKey = metadata.extractedDate.split('T')[0];
      stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;

      if (metadata.industry) {
        stats.byIndustry[metadata.industry] = (stats.byIndustry[metadata.industry] || 0) + 1;
      }

      metadata.certificates?.forEach(cert => {
        stats.byCertificate[cert] = (stats.byCertificate[cert] || 0) + 1;
      });

      metadata.keywords?.forEach(keyword => {
        stats.byKeyword[keyword] = (stats.byKeyword[keyword] || 0) + 1;
      });

      if (metadata.seniority) {
        stats.bySeniority[metadata.seniority] = (stats.bySeniority[metadata.seniority] || 0) + 1;
      }

      if (metadata.location) {
        stats.byLocation[metadata.location] = (stats.byLocation[metadata.location] || 0) + 1;
      }

      if (metadata.country) {
        stats.byCountry[metadata.country] = (stats.byCountry[metadata.country] || 0) + 1;
      }

      if (metadata.city) {
        stats.byCity[metadata.city] = (stats.byCity[metadata.city] || 0) + 1;
      }

      if (metadata.region) {
        stats.byRegion[metadata.region] = (stats.byRegion[metadata.region] || 0) + 1;
      }

      if (metadata.company) {
        stats.byCompany[metadata.company] = (stats.byCompany[metadata.company] || 0) + 1;
      }

      metadata.software?.forEach(soft => {
        stats.bySoftware[soft] = (stats.bySoftware[soft] || 0) + 1;
      });

      metadata.programmingSkills?.forEach(skill => {
        stats.byProgrammingSkill[skill] = (stats.byProgrammingSkill[skill] || 0) + 1;
      });

      if (metadata.yearsExperience) {
        stats.byYearsExperience[metadata.yearsExperience] = (stats.byYearsExperience[metadata.yearsExperience] || 0) + 1;
      }

      metadata.academicDegrees?.forEach(degree => {
        stats.byAcademicDegree[degree] = (stats.byAcademicDegree[degree] || 0) + 1;
      });
    }

    // Save updated stats for each month
    let totalJobsAllTime = 0;
    for (const [month, stats] of statsByMonth.entries()) {
      await r2.putJSON(`stats/${month}.json`, stats, 'public, max-age=60');
      totalJobsAllTime += stats.totalJobs;
      logger.info(`✓ Saved stats for ${month}: ${stats.totalJobs} unique jobs`);

      // Update manifest month totals
      if (manifest.months[month]) {
        manifest.months[month].totalJobs = stats.totalJobs;
      }
    }

    // Update manifest totals
    manifest.totalJobsAllTime = totalJobsAllTime;
    await r2.saveManifest(manifest);

    logger.info("=== Rebuild Complete ===");

    return NextResponse.json({
      success: true,
      message: "Rebuild completed successfully",
      stats: {
        totalLoaded,
        uniqueJobs: allJobsByUrl.size,
        duplicatesRemoved: duplicatesFound,
        urlIndexSize: urlIndex.length,
        totalJobsAllTime,
        monthsProcessed: manifest.availableMonths.length,
      },
    });
  } catch (error) {
    logger.error("Rebuild failed:", error);

    return NextResponse.json(
      {
        error: "Rebuild failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint - returns rebuild status/info
 */
export async function GET() {
  const r2 = getR2Storage();

  if (!r2.isAvailable()) {
    return NextResponse.json({ error: "R2 not configured" }, { status: 400 });
  }

  const urlIndex = await r2.getJSON<{ urls: string[]; updatedAt: string; count: number }>('url-index.json');
  const manifest = await r2.getManifest();

  return NextResponse.json({
    status: "ready",
    message: "POST to this endpoint to rebuild URL index and recalculate statistics",
    currentState: {
      urlIndexExists: !!urlIndex,
      urlIndexCount: urlIndex?.count || 0,
      urlIndexUpdatedAt: urlIndex?.updatedAt || null,
      manifestTotalJobs: manifest.totalJobsAllTime,
      availableMonths: manifest.availableMonths,
    },
    warning: "This will recalculate all statistics from raw job data. May take several minutes.",
  });
}
