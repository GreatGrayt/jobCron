import { NextRequest, NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";
import { JobMetadata } from "@/lib/job-statistics-r2";
import { JobMetadataExtractor } from "@/lib/job-metadata-extractor";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // 5 minutes timeout
export const dynamic = "force-dynamic";

/**
 * POST /api/stats/fix-seniority
 *
 * Re-extracts seniority for all jobs in R2 using the updated extraction logic.
 * This fixes incorrect seniority classifications (e.g., "Senior Associate" being marked as Entry).
 */
export async function POST(request: NextRequest) {
  logger.info("=== Starting Seniority Fix ===");

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

    let totalProcessed = 0;
    let totalFixed = 0;
    const fixedExamples: Array<{ title: string; oldSeniority: string; newSeniority: string }> = [];

    // Process each month
    for (const month of manifest.availableMonths) {
      const monthData = manifest.months[month];
      if (!monthData?.days) continue;

      const [year, monthNum] = month.split('-');

      // Process each day
      for (const day of monthData.days) {
        try {
          // Load metadata for this day
          const metadata = await r2.getNDJSONGzipped<JobMetadata>(day.metadata);
          let dayFixed = 0;

          // Re-extract seniority for each job
          const updatedMetadata = metadata.map(job => {
            const newSeniority = JobMetadataExtractor.extractSeniority(job.title);

            if (newSeniority !== job.seniority) {
              dayFixed++;

              // Keep first 20 examples for the response
              if (fixedExamples.length < 20) {
                fixedExamples.push({
                  title: job.title.substring(0, 80),
                  oldSeniority: job.seniority,
                  newSeniority: newSeniority,
                });
              }
            }

            return {
              ...job,
              seniority: newSeniority,
            };
          });

          totalProcessed += metadata.length;
          totalFixed += dayFixed;

          // Save updated metadata if any changes were made
          if (dayFixed > 0) {
            await r2.putNDJSONGzipped(day.metadata, updatedMetadata);
            logger.info(`✓ Fixed ${dayFixed} jobs in ${day.date}`);
          }
        } catch (error) {
          logger.error(`Error processing ${day.metadata}:`, error);
        }
      }

      // Recalculate statistics for this month
      await recalculateMonthStats(r2, month, manifest.months[month].days);
      logger.info(`✓ Recalculated stats for ${month}`);
    }

    // Save updated manifest
    await r2.saveManifest(manifest);

    logger.info("=== Seniority Fix Complete ===");

    return NextResponse.json({
      success: true,
      message: "Seniority fix completed successfully",
      stats: {
        totalProcessed,
        totalFixed,
        monthsProcessed: manifest.availableMonths.length,
      },
      examples: fixedExamples,
    });
  } catch (error) {
    logger.error("Seniority fix failed:", error);

    return NextResponse.json(
      {
        error: "Seniority fix failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Recalculate statistics for a month from its metadata
 */
async function recalculateMonthStats(
  r2: ReturnType<typeof getR2Storage>,
  month: string,
  days: Array<{ metadata: string; date: string }>
) {
  const stats = {
    totalJobs: 0,
    byDate: {} as Record<string, number>,
    byIndustry: {} as Record<string, number>,
    byCertificate: {} as Record<string, number>,
    byKeyword: {} as Record<string, number>,
    bySeniority: {} as Record<string, number>,
    byLocation: {} as Record<string, number>,
    byCountry: {} as Record<string, number>,
    byCity: {} as Record<string, number>,
    byRegion: {} as Record<string, number>,
    byCompany: {} as Record<string, number>,
    bySoftware: {} as Record<string, number>,
    byProgrammingSkill: {} as Record<string, number>,
    byYearsExperience: {} as Record<string, number>,
    byAcademicDegree: {} as Record<string, number>,
  };

  for (const day of days) {
    try {
      const metadata = await r2.getNDJSONGzipped<JobMetadata>(day.metadata);

      for (const job of metadata) {
        stats.totalJobs++;

        const dateKey = job.extractedDate.split('T')[0];
        stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;

        if (job.industry) {
          stats.byIndustry[job.industry] = (stats.byIndustry[job.industry] || 0) + 1;
        }

        job.certificates?.forEach(cert => {
          stats.byCertificate[cert] = (stats.byCertificate[cert] || 0) + 1;
        });

        job.keywords?.forEach(keyword => {
          stats.byKeyword[keyword] = (stats.byKeyword[keyword] || 0) + 1;
        });

        if (job.seniority) {
          stats.bySeniority[job.seniority] = (stats.bySeniority[job.seniority] || 0) + 1;
        }

        if (job.location) {
          stats.byLocation[job.location] = (stats.byLocation[job.location] || 0) + 1;
        }

        if (job.country) {
          stats.byCountry[job.country] = (stats.byCountry[job.country] || 0) + 1;
        }

        if (job.city) {
          stats.byCity[job.city] = (stats.byCity[job.city] || 0) + 1;
        }

        if (job.region) {
          stats.byRegion[job.region] = (stats.byRegion[job.region] || 0) + 1;
        }

        if (job.company) {
          stats.byCompany[job.company] = (stats.byCompany[job.company] || 0) + 1;
        }

        job.software?.forEach(soft => {
          stats.bySoftware[soft] = (stats.bySoftware[soft] || 0) + 1;
        });

        job.programmingSkills?.forEach(skill => {
          stats.byProgrammingSkill[skill] = (stats.byProgrammingSkill[skill] || 0) + 1;
        });

        if (job.yearsExperience) {
          stats.byYearsExperience[job.yearsExperience] = (stats.byYearsExperience[job.yearsExperience] || 0) + 1;
        }

        job.academicDegrees?.forEach(degree => {
          stats.byAcademicDegree[degree] = (stats.byAcademicDegree[degree] || 0) + 1;
        });
      }
    } catch (error) {
      logger.warn(`Failed to load metadata for stats: ${day.metadata}`, error);
    }
  }

  await r2.putJSON(`stats/${month}.json`, stats, 'public, max-age=60');
}

/**
 * GET endpoint - returns info about the fix operation
 */
export async function GET() {
  const r2 = getR2Storage();

  if (!r2.isAvailable()) {
    return NextResponse.json({ error: "R2 not configured" }, { status: 400 });
  }

  const manifest = await r2.getManifest();

  // Get current seniority distribution
  let seniorityStats: Record<string, number> = {};
  for (const month of manifest.availableMonths) {
    const stats = await r2.getJSON<{ bySeniority: Record<string, number> }>(`stats/${month}.json`);
    if (stats?.bySeniority) {
      for (const [level, count] of Object.entries(stats.bySeniority)) {
        seniorityStats[level] = (seniorityStats[level] || 0) + count;
      }
    }
  }

  return NextResponse.json({
    status: "ready",
    message: "POST to this endpoint to re-extract seniority for all jobs using updated logic",
    currentSeniorityDistribution: seniorityStats,
    totalJobs: manifest.totalJobsAllTime,
    monthsToProcess: manifest.availableMonths.length,
    warning: "This will update all job metadata and recalculate statistics. May take several minutes.",
  });
}
