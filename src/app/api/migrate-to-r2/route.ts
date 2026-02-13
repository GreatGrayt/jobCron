import { NextRequest, NextResponse } from "next/server";
import { JobStatisticsCache } from "@/lib/job-statistics-cache";
import { JobStatisticsCacheR2 } from "@/lib/job-statistics-r2";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // 5 minutes timeout
export const dynamic = "force-dynamic";

/**
 * POST /api/migrate-to-r2
 *
 * Migrates all job data from GitHub Gist to Cloudflare R2
 * This is a one-time migration endpoint
 *
 * WARNING: This will transfer all your data. Make sure R2 is configured correctly.
 */
export async function POST(request: NextRequest) {
  logger.info("=== Starting Gist to R2 Migration ===");

  try {
    // Check authorization (optional - add a secret if you want)
    const authHeader = request.headers.get("authorization");
    const migrationSecret = process.env.MIGRATION_SECRET;

    if (migrationSecret && authHeader !== `Bearer ${migrationSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check R2 configuration
    const r2Configured = !!(
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME
    );

    if (!r2Configured) {
      return NextResponse.json(
        {
          error: "R2 not configured",
          message: "Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME environment variables",
        },
        { status: 400 }
      );
    }

    // Check Gist configuration
    const gistConfigured = !!(process.env.GITHUB_TOKEN && process.env.GIST_ID);

    if (!gistConfigured) {
      return NextResponse.json(
        {
          error: "Gist not configured",
          message: "Please set GITHUB_TOKEN and GIST_ID environment variables",
        },
        { status: 400 }
      );
    }

    // Initialize both caches
    logger.info("Loading data from GitHub Gist...");
    const gistCache = new JobStatisticsCache();
    await gistCache.load();

    const gistStats = gistCache.getStats();
    logger.info(`Gist has ${gistStats.currentMonthJobs} jobs in current month`);
    logger.info(`Gist has ${gistStats.availableArchives} archived months`);

    // Get all data from Gist
    const currentMonthData = gistCache.getCurrentMonthData();
    const summary = gistCache.getSummary();

    logger.info("Initializing R2 cache...");
    const r2Cache = new JobStatisticsCacheR2();
    await r2Cache.load();

    // Migrate current month jobs
    let migratedJobs = 0;
    let skippedJobs = 0;

    logger.info(`Migrating ${currentMonthData.jobs.length} jobs from current month...`);

    for (const job of currentMonthData.jobs) {
      try {
        const added = r2Cache.addJob(job);
        if (added) {
          migratedJobs++;
        } else {
          skippedJobs++;
        }

        // Log progress every 100 jobs
        if ((migratedJobs + skippedJobs) % 100 === 0) {
          logger.info(`Progress: ${migratedJobs + skippedJobs}/${currentMonthData.jobs.length} jobs processed`);
        }
      } catch (error) {
        logger.error(`Error migrating job ${job.id}:`, error);
        skippedJobs++;
      }
    }

    // Save to R2
    logger.info("Saving migrated data to R2...");
    await r2Cache.save();

    // Migrate archived months (statistics only - Gist doesn't store archived job details)
    let migratedArchives = 0;

    for (const archiveMonth of summary.availableArchives) {
      try {
        logger.info(`Loading archive: ${archiveMonth}...`);
        const archivedData = await gistCache.getArchivedMonth(archiveMonth);

        if (archivedData) {
          // For archives, we only have statistics, not individual jobs
          // We'll save the statistics directly to R2
          const { getR2Storage } = await import('@/lib/r2-storage');
          const r2 = getR2Storage();

          await r2.putJSON(
            `stats/${archiveMonth}.json`,
            archivedData.statistics,
            'public, max-age=31536000, immutable'
          );

          migratedArchives++;
          logger.info(`✓ Migrated archive: ${archiveMonth}`);
        }
      } catch (error) {
        logger.error(`Error migrating archive ${archiveMonth}:`, error);
      }
    }

    // Update R2 manifest with archived months
    const r2Manifest = r2Cache.getManifest();
    if (r2Manifest) {
      for (const archiveMonth of summary.availableArchives) {
        if (!r2Manifest.months[archiveMonth]) {
          r2Manifest.months[archiveMonth] = {
            stats: `stats/${archiveMonth}.json`,
            totalJobs: 0, // We don't have exact count for old archives
            days: [],
          };
        }
        if (!r2Manifest.availableMonths.includes(archiveMonth)) {
          r2Manifest.availableMonths.push(archiveMonth);
        }
      }
      r2Manifest.availableMonths.sort().reverse();

      const { getR2Storage } = await import('@/lib/r2-storage');
      const r2 = getR2Storage();
      await r2.saveManifest(r2Manifest);
    }

    const r2Stats = r2Cache.getStats();

    logger.info("=== Migration Complete ===");
    logger.info(`Migrated jobs: ${migratedJobs}`);
    logger.info(`Skipped jobs (duplicates): ${skippedJobs}`);
    logger.info(`Migrated archives: ${migratedArchives}`);

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
      migration: {
        source: "GitHub Gist",
        destination: "Cloudflare R2",
        jobsMigrated: migratedJobs,
        jobsSkipped: skippedJobs,
        archivesMigrated: migratedArchives,
      },
      before: {
        storage: "gist",
        currentMonthJobs: gistStats.currentMonthJobs,
        totalJobsAllTime: gistStats.totalJobsAllTime,
        availableArchives: gistStats.availableArchives,
      },
      after: {
        storage: "r2",
        currentMonthJobs: r2Stats.currentMonthJobs,
        totalJobsAllTime: r2Stats.totalJobsAllTime,
        availableArchives: r2Stats.availableArchives,
      },
    });
  } catch (error) {
    logger.error("Migration failed:", error);

    return NextResponse.json(
      {
        error: "Migration failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint - returns migration status/info
 */
export async function GET() {
  const gistConfigured = !!(process.env.GITHUB_TOKEN && process.env.GIST_ID);
  const r2Configured = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );

  return NextResponse.json({
    status: "ready",
    message: "POST to this endpoint to start migration from Gist to R2",
    configuration: {
      gist: gistConfigured ? "configured" : "not configured",
      r2: r2Configured ? "configured" : "not configured",
    },
    instructions: [
      "1. Ensure both GIST and R2 environment variables are set",
      "2. POST to /api/migrate-to-r2 to start migration",
      "3. After successful migration, remove GITHUB_TOKEN and GIST_ID to use R2 exclusively",
    ],
  });
}
