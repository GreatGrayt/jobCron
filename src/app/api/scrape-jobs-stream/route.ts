import { NextRequest } from "next/server";
import { scrapeLinkedInJobs, createExcelFile } from "@/lib/linkedin-scraper";
import { sendTelegramFile, sendTelegramMessage } from "@/lib/telegram";
import { logger } from "@/lib/logger";
import { validateEnvironmentVariables } from "@/lib/validation";
import { ProgressEmitter } from "@/lib/progress-emitter";
import { UrlCache } from "@/lib/url-cache";

export const maxDuration = 300; // 5 minutes timeout for Vercel
export const dynamic = "force-dynamic";

/**
 * GET endpoint for streaming LinkedIn job scraping progress via Server-Sent Events
 * Example: /api/scrape-jobs-stream?search=CFA&countries=United+States,Canada&timeFilter=604800
 */
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Helper function to send SSE messages
  const sendEvent = async (event: string, data: any) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // Start the async process
  (async () => {
    try {
      await sendEvent("log", { message: "LinkedIn job scraping started", timestamp: new Date().toISOString() });

      // Validate environment variables
      validateEnvironmentVariables();

      // Parse URL parameters
      const searchParams = request.nextUrl.searchParams;
      const searchText = searchParams.get("search") || searchParams.get("searchText") || "";
      const locationText = searchParams.get("countries") || searchParams.get("locationText") || "";
      const timeFilter = parseInt(searchParams.get("timeFilter") || "604800");

      if (!searchText || !locationText) {
        await sendEvent("error", { message: "search and countries parameters are required" });
        await writer.close();
        return;
      }

      await sendEvent("log", { message: `Scraping jobs for: "${searchText}" in "${locationText}"`, timestamp: new Date().toISOString() });

      // Create progress emitter for real-time updates
      const progressEmitter = new ProgressEmitter();

      // Subscribe to progress updates and stream them to the client
      progressEmitter.subscribe((update) => {
        sendEvent("log", {
          message: update.message,
          timestamp: new Date().toISOString(),
          stage: update.stage,
          percentage: update.percentage,
        });
      });

      // Scrape jobs from LinkedIn
      const jobs = await scrapeLinkedInJobs({
        searchText,
        locationText,
        timeFilter,
      }, progressEmitter);

      if (jobs.length === 0) {
        await sendEvent("log", { message: "No jobs found", timestamp: new Date().toISOString() });
        await sendTelegramMessage(
          `🔍 LinkedIn Job Scrape Complete\n\nSearch: "${searchText}"\nLocations: ${locationText}\n\nℹ️ No jobs found matching the criteria.`
        );

        await sendEvent("complete", {
          success: true,
          message: "No jobs found",
          jobCount: 0,
        });
        await writer.close();
        return;
      }

      // Load persistent cache and filter out already cached jobs
      await sendEvent("log", { message: "🗄️  Loading cache from R2 storage...", timestamp: new Date().toISOString() });
      const urlCache = new UrlCache('url-scraper');
      await urlCache.load();

      await sendEvent("log", { message: `📊 Total scraped jobs: ${jobs.length}`, timestamp: new Date().toISOString() });
      await sendEvent("log", { message: `💾 URLs already in cache: ${urlCache.size()}`, timestamp: new Date().toISOString() });

      const newJobs = jobs.filter(job => {
        const normalizedUrl = job.url.toLowerCase().trim();
        return !urlCache.has(normalizedUrl);
      });

      await sendEvent("log", { message: `✨ Jobs after cache filter: ${newJobs.length} NEW (filtered out ${jobs.length - newJobs.length} already cached)`, timestamp: new Date().toISOString() });

      // If all jobs are already cached, don't create or send Excel
      if (newJobs.length === 0) {
        await sendEvent("log", { message: "⚠️  All jobs already cached - no Excel file to send", timestamp: new Date().toISOString() });
        await sendTelegramMessage(
          `🔍 LinkedIn Job Scrape Complete\n\nSearch: "${searchText}"\nLocations: ${locationText}\n\nℹ️ All ${jobs.length} jobs were already processed in previous runs.`
        );

        await sendEvent("complete", {
          success: true,
          message: "No new jobs to send (all already cached)",
          jobCount: 0,
          totalScraped: jobs.length,
          alreadyCached: jobs.length,
        });
        await writer.close();
        return;
      }

      // Create Excel file with only new jobs
      const excelMessage = `📝 Creating Excel file with ${newJobs.length} NEW jobs...`;
      await sendEvent("log", { message: excelMessage, timestamp: new Date().toISOString() });
      const excelBuffer = await createExcelFile(newJobs);

      // Add new job URLs to cache BEFORE sending
      await sendEvent("log", { message: `💾 Adding ${newJobs.length} URLs to cache...`, timestamp: new Date().toISOString() });
      for (const job of newJobs) {
        const normalizedUrl = job.url.toLowerCase().trim();
        // Use postedDate as the timestamp for 48-hour expiry calculation
        // This ensures URLs expire based on when the job was posted, not when we cached it
        urlCache.add(normalizedUrl, job.postedDate || undefined);
      }

      await urlCache.save();
      await sendEvent("log", { message: `✓ Cache saved with ${urlCache.size()} total URLs`, timestamp: new Date().toISOString() });

      // Generate filename
      const timestamp = new Date().toISOString().split("T")[0];
      const countries = [...new Set(newJobs.map((job) => job.searchCountry))];
      const keywords = [...new Set(newJobs.map((job) => job.inputKeyword))];
      const filename = `linkedin_jobs_${newJobs.length}_${keywords.length}keywords_${countries.length}countries_${timestamp}.xlsx`;

      // Send to Telegram
      const telegramMessage = `📤 Sending Excel file to Telegram with ${newJobs.length} NEW jobs...`;
      await sendEvent("log", { message: telegramMessage, timestamp: new Date().toISOString() });
      const caption = `📊 LinkedIn Job Scrape Complete\n\nKeywords: ${keywords.join(", ")}\nLocations: ${locationText}\n\n✅ Found ${newJobs.length} NEW jobs (${jobs.length - newJobs.length} already cached) across ${countries.length} countries:\n${countries.map((c) => `  • ${c}: ${newJobs.filter((j) => j.searchCountry === c).length} jobs`).join("\n")}`;

      await sendTelegramFile(excelBuffer, filename, caption);

      const completedMessage = "✓ LinkedIn job scraping completed successfully";
      await sendEvent("log", { message: completedMessage, timestamp: new Date().toISOString() });

      // Send final completion event
      await sendEvent("complete", {
        success: true,
        message: "Jobs scraped and sent to Telegram",
        jobCount: newJobs.length,
        totalScraped: jobs.length,
        alreadyCached: jobs.length - newJobs.length,
        keywords: keywords,
        countries: countries,
        filename,
      });

      await writer.close();
    } catch (error) {
      logger.error("Error during LinkedIn scraping:", error);

      await sendEvent("error", {
        message: error instanceof Error ? error.message : String(error),
      });

      // Try to send error notification to Telegram
      try {
        await sendTelegramMessage(
          `❌ LinkedIn Job Scrape Failed\n\nError: ${error instanceof Error ? error.message : String(error)}`
        );
      } catch (telegramError) {
        logger.error("Failed to send error notification to Telegram:", telegramError);
      }

      await writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
