import { NextRequest, NextResponse } from "next/server";
import { scrapeLinkedInJobs, createExcelFile } from "@/lib/linkedin-scraper";
import { sendTelegramFile, sendTelegramMessage } from "@/lib/telegram";
import { logger } from "@/lib/logger";
import { validateEnvironmentVariables } from "@/lib/validation";
import { UrlCache } from "@/lib/url-cache";

export const maxDuration = 300; // 5 minutes timeout for Vercel
export const dynamic = "force-dynamic";

/**
 * GET endpoint for triggering LinkedIn job scraping via URL
 * Example: /api/scrape-jobs?search=CFA,Financial+Analyst&countries=United+States,Canada&timeFilter=604800
 */
export async function GET(request: NextRequest) {
  logger.info("LinkedIn job scraping started (GET)");

  try {
    // Validate environment variables
    validateEnvironmentVariables();

    // Parse URL parameters
    const searchParams = request.nextUrl.searchParams;
    const searchText = searchParams.get("search") || searchParams.get("searchText") || "";
    const locationText = searchParams.get("countries") || searchParams.get("locationText") || "";
    const timeFilter = parseInt(searchParams.get("timeFilter") || "604800");

    if (!searchText || !locationText) {
      return NextResponse.json(
        { error: "search and countries parameters are required" },
        { status: 400 }
      );
    }

    logger.info(`Scraping jobs for: "${searchText}" in "${locationText}"`);

    // Create progress emitter for real-time updates (future use)
    const { ProgressEmitter } = await import("@/lib/progress-emitter");
    const progressEmitter = new ProgressEmitter();

    // Scrape jobs from LinkedIn
    const jobs = await scrapeLinkedInJobs({
      searchText,
      locationText,
      timeFilter,
    }, progressEmitter);

    if (jobs.length === 0) {
      logger.info("No jobs found");
      await sendTelegramMessage(
        `🔍 LinkedIn Job Scrape Complete\n\nSearch: "${searchText}"\nLocations: ${locationText}\n\nℹ️ No jobs found matching the criteria.`
      );

      return NextResponse.json({
        success: true,
        message: "No jobs found",
        jobCount: 0,
      });
    }

    // Load persistent cache and filter out already cached jobs
    const urlCache = new UrlCache('url-scraper');
    await urlCache.load();

    logger.info(`\n=== Cache Check Before Excel Creation ===`);
    logger.info(`Total scraped jobs: ${jobs.length}`);
    logger.info(`URLs already in cache: ${urlCache.size()}`);

    const newJobs = jobs.filter(job => {
      const normalizedUrl = job.url.toLowerCase().trim();
      if (urlCache.has(normalizedUrl)) {
        logger.info(`✗ Filtering out cached job: ${normalizedUrl}`);
        return false;
      }
      return true;
    });

    logger.info(`Jobs after cache filter: ${newJobs.length} (filtered out ${jobs.length - newJobs.length} already cached)`);

    // If all jobs are already cached, don't create or send Excel
    if (newJobs.length === 0) {
      logger.info("All jobs already cached - no Excel file to send");
      await sendTelegramMessage(
        `🔍 LinkedIn Job Scrape Complete\n\nSearch: "${searchText}"\nLocations: ${locationText}\n\nℹ️ All ${jobs.length} jobs were already processed in previous runs.`
      );

      return NextResponse.json({
        success: true,
        message: "No new jobs to send (all already cached)",
        jobCount: 0,
        totalScraped: jobs.length,
        alreadyCached: jobs.length,
      });
    }

    // Create Excel file with only new jobs
    const excelMessage = `Creating Excel file with ${newJobs.length} new jobs`;
    logger.info(excelMessage);
    progressEmitter.progress('excel', excelMessage);
    const excelBuffer = await createExcelFile(newJobs);

    // Add new job URLs to cache BEFORE sending
    for (const job of newJobs) {
      const normalizedUrl = job.url.toLowerCase().trim();
      urlCache.add(normalizedUrl);
      logger.info(`✓ Added to cache: ${normalizedUrl}`);
    }

    await urlCache.save();
    logger.info(`Cache saved with ${urlCache.size()} total URLs`);

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const countries = [...new Set(newJobs.map((job) => job.searchCountry))];
    const keywords = [...new Set(newJobs.map((job) => job.inputKeyword))];
    const filename = `linkedin_jobs_${newJobs.length}_${keywords.length}keywords_${countries.length}countries_${timestamp}.xlsx`;

    // Send to Telegram
    const telegramMessage = "Sending Excel file to Telegram";
    logger.info(telegramMessage);
    progressEmitter.progress('telegram', telegramMessage);
    const caption = `📊 LinkedIn Job Scrape Complete\n\nKeywords: ${keywords.join(", ")}\nLocations: ${locationText}\n\n✅ Found ${newJobs.length} NEW jobs (${jobs.length - newJobs.length} already cached) across ${countries.length} countries:\n${countries.map((c) => `  • ${c}: ${newJobs.filter((j) => j.searchCountry === c).length} jobs`).join("\n")}`;

    await sendTelegramFile(excelBuffer, filename, caption);

    const completedMessage = "LinkedIn job scraping completed successfully";
    logger.info(completedMessage);
    progressEmitter.complete('complete', completedMessage);

    return NextResponse.json({
      success: true,
      message: "Jobs scraped and sent to Telegram",
      jobCount: newJobs.length,
      totalScraped: jobs.length,
      alreadyCached: jobs.length - newJobs.length,
      keywords: keywords,
      countries: countries,
      filename,
      logs: progressEmitter.getLogs(), // Include detailed logs in response
    });
  } catch (error) {
    logger.error("Error during LinkedIn scraping:", error);

    // Try to send error notification to Telegram
    try {
      await sendTelegramMessage(
        `❌ LinkedIn Job Scrape Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`
      );
    } catch (telegramError) {
      logger.error("Failed to send error notification to Telegram:", telegramError);
    }

    return NextResponse.json(
      {
        error: "Failed to scrape jobs",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
