import { NextRequest, NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";
import { JobMetadata, JobDescription } from "@/lib/job-statistics-r2";
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
 * POST /api/stats/cleanup
 *
 * One-time cleanup to fix duplicate jobs in R2 storage.
 * - Loads all metadata and descriptions
 * - Deduplicates by URL
 * - Rewrites clean data files
 * - Rebuilds URL index
 * - Recalculates statistics
 */
export async function POST(request: NextRequest) {
  logger.info("=== Starting R2 Cleanup ===");

  try {
    const r2 = getR2Storage();

    if (!r2.isAvailable()) {
      return NextResponse.json({ error: "R2 not configured" }, { status: 400 });
    }

    const manifest = await r2.getManifest();
    logger.info(`Processing ${manifest.availableMonths.length} months`);

    // Track all unique jobs by URL
    const uniqueJobsByUrl = new Map<string, {
      metadata: JobMetadata;
      description: JobDescription;
      day: string;
      month: string;
    }>();

    let totalLoaded = 0;
    let duplicatesFound = 0;

    // Load all data and deduplicate
    for (const month of manifest.availableMonths) {
      const monthData = manifest.months[month];
      if (!monthData?.days) continue;

      for (const day of monthData.days) {
        try {
          const [metadataList, descriptionsList] = await Promise.all([
            r2.getNDJSONGzipped<JobMetadata>(day.metadata),
            r2.getNDJSONGzipped<JobDescription>(day.descriptions),
          ]);

          // Create description lookup
          const descMap = new Map(descriptionsList.map(d => [d.id, d]));

          totalLoaded += metadataList.length;

          for (const metadata of metadataList) {
            const normalizedUrl = normalizeUrl(metadata.url);
            if (uniqueJobsByUrl.has(normalizedUrl)) {
              duplicatesFound++;
            } else {
              const description = descMap.get(metadata.id) || { id: metadata.id, description: '' };
              uniqueJobsByUrl.set(normalizedUrl, {
                metadata,
                description,
                day: day.date,
                month,
              });
            }
          }

          logger.info(`Loaded ${day.date}: ${metadataList.length} jobs`);
        } catch (error) {
          logger.error(`Error loading ${day.date}:`, error);
        }
      }
    }

    logger.info(`Total: ${totalLoaded}, Unique: ${uniqueJobsByUrl.size}, Duplicates: ${duplicatesFound}`);

    // Group unique jobs by day for rewriting
    const jobsByDay = new Map<string, { metadata: JobMetadata[]; descriptions: JobDescription[] }>();

    for (const { metadata, description, day } of uniqueJobsByUrl.values()) {
      if (!jobsByDay.has(day)) {
        jobsByDay.set(day, { metadata: [], descriptions: [] });
      }
      jobsByDay.get(day)!.metadata.push(metadata);
      jobsByDay.get(day)!.descriptions.push(description);
    }

    // Rewrite all day files with deduplicated data
    const newManifestDays: Record<string, { date: string; metadata: string; descriptions: string; jobCount: number; metadataBytes: number; descriptionsBytes: number }[]> = {};

    for (const [day, data] of jobsByDay.entries()) {
      const [year, monthNum, dayNum] = day.split('-');
      const month = `${year}-${monthNum}`;

      const metadataKey = `metadata/${year}/${monthNum}/day-${dayNum}.ndjson.gz`;
      const descriptionsKey = `descriptions/${year}/${monthNum}/day-${dayNum}.ndjson.gz`;

      const metadataBytes = await r2.putNDJSONGzipped(metadataKey, data.metadata);
      const descriptionsBytes = await r2.putNDJSONGzipped(descriptionsKey, data.descriptions);

      if (!newManifestDays[month]) {
        newManifestDays[month] = [];
      }

      newManifestDays[month].push({
        date: day,
        metadata: metadataKey,
        descriptions: descriptionsKey,
        jobCount: data.metadata.length,
        metadataBytes,
        descriptionsBytes,
      });

      logger.info(`✓ Rewrote ${day}: ${data.metadata.length} unique jobs`);
    }

    // Recalculate statistics per month
    const statsByMonth = new Map<string, any>();

    for (const { metadata, month } of uniqueJobsByUrl.values()) {
      if (!statsByMonth.has(month)) {
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

      const stats = statsByMonth.get(month)!;
      stats.totalJobs++;

      const dateKey = metadata.extractedDate.split('T')[0];
      stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;

      if (metadata.industry) stats.byIndustry[metadata.industry] = (stats.byIndustry[metadata.industry] || 0) + 1;
      if (metadata.seniority) stats.bySeniority[metadata.seniority] = (stats.bySeniority[metadata.seniority] || 0) + 1;
      if (metadata.location) stats.byLocation[metadata.location] = (stats.byLocation[metadata.location] || 0) + 1;
      if (metadata.country) stats.byCountry[metadata.country] = (stats.byCountry[metadata.country] || 0) + 1;
      if (metadata.city) stats.byCity[metadata.city] = (stats.byCity[metadata.city] || 0) + 1;
      if (metadata.region) stats.byRegion[metadata.region] = (stats.byRegion[metadata.region] || 0) + 1;
      if (metadata.company) stats.byCompany[metadata.company] = (stats.byCompany[metadata.company] || 0) + 1;
      if (metadata.yearsExperience) stats.byYearsExperience[metadata.yearsExperience] = (stats.byYearsExperience[metadata.yearsExperience] || 0) + 1;

      metadata.certificates?.forEach(c => { stats.byCertificate[c] = (stats.byCertificate[c] || 0) + 1; });
      metadata.keywords?.forEach(k => { stats.byKeyword[k] = (stats.byKeyword[k] || 0) + 1; });
      metadata.software?.forEach(s => { stats.bySoftware[s] = (stats.bySoftware[s] || 0) + 1; });
      metadata.programmingSkills?.forEach(p => { stats.byProgrammingSkill[p] = (stats.byProgrammingSkill[p] || 0) + 1; });
      metadata.academicDegrees?.forEach(d => { stats.byAcademicDegree[d] = (stats.byAcademicDegree[d] || 0) + 1; });
    }

    // Save stats and update manifest
    let totalJobsAllTime = 0;

    for (const [month, stats] of statsByMonth.entries()) {
      await r2.putJSON(`stats/${month}.json`, stats, 'public, max-age=60');
      totalJobsAllTime += stats.totalJobs;

      // Update manifest month
      manifest.months[month] = {
        stats: `stats/${month}.json`,
        totalJobs: stats.totalJobs,
        days: (newManifestDays[month] || []).sort((a, b) => a.date.localeCompare(b.date)),
      };

      logger.info(`✓ Saved stats for ${month}: ${stats.totalJobs} jobs`);
    }

    // Save URL index
    const urlIndex = Array.from(uniqueJobsByUrl.keys());
    await r2.putJSON('url-index.json', {
      urls: urlIndex,
      updatedAt: new Date().toISOString(),
      count: urlIndex.length,
    }, 'public, max-age=60');

    // Update and save manifest
    manifest.totalJobsAllTime = totalJobsAllTime;
    manifest.availableMonths = Object.keys(manifest.months)
      .filter(m => manifest.months[m].totalJobs > 0)
      .sort()
      .reverse();

    await r2.saveManifest(manifest);

    logger.info("=== Cleanup Complete ===");

    return NextResponse.json({
      success: true,
      message: "Cleanup completed successfully",
      before: {
        totalJobs: totalLoaded,
      },
      after: {
        totalJobs: uniqueJobsByUrl.size,
        duplicatesRemoved: duplicatesFound,
        urlIndexSize: urlIndex.length,
        months: manifest.availableMonths.length,
      },
    });
  } catch (error) {
    logger.error("Cleanup failed:", error);
    return NextResponse.json({
      error: "Cleanup failed",
      message: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

export async function GET() {
  const r2 = getR2Storage();
  if (!r2.isAvailable()) {
    return NextResponse.json({ error: "R2 not configured" }, { status: 400 });
  }

  const manifest = await r2.getManifest();
  const urlIndex = await r2.getJSON<{ count: number }>('url-index.json');

  return NextResponse.json({
    message: "POST to this endpoint to run one-time cleanup",
    currentState: {
      totalJobsInManifest: manifest.totalJobsAllTime,
      urlIndexCount: urlIndex?.count || 0,
      months: manifest.availableMonths,
    },
  });
}
