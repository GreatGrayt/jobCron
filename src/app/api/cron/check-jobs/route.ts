import { NextRequest, NextResponse } from "next/server";
import { checkAndSendJobs } from "@/lib/job-monitor-service";
import { validateEnvironmentVariables, verifyCronRequest } from "@/lib/validation";
import { logger } from "@/lib/logger";

/**
 * GET /api/cron/check-jobs
 *
 * Cron endpoint that checks RSS feeds for new job postings
 * and sends notifications via Telegram.
 *
 * This endpoint is called by Vercel Cron every 5 minutes.
 */
export async function GET(request: NextRequest) {
  // Verify the request is authorized
  const authHeader = request.headers.get("authorization");
  if (!verifyCronRequest(authHeader)) {
    logger.warn("Unauthorized cron request attempt");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Validate environment variables
    validateEnvironmentVariables();

    logger.info("Cron job started");

    // Execute the main job monitoring logic
    const result = await checkAndSendJobs();

    logger.info("Cron job completed successfully", result);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    logger.error("Cron job error:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorName = error instanceof Error ? error.name : "Error";

    return NextResponse.json(
      {
        error: errorMessage,
        errorType: errorName,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual triggering (development/testing)
 */
export async function POST(request: NextRequest) {
  return GET(request);
}
