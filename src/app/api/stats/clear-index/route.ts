import { NextRequest, NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/stats/clear-index
 *
 * Clears the URL index to allow re-extraction of all jobs.
 * WARNING: This will cause all jobs from RSS to be treated as "new" on next extraction.
 * Use this for testing or if the URL index has become corrupted.
 */
export async function POST(request: NextRequest) {
  logger.info("=== Clearing URL Index ===");

  try {
    const r2 = getR2Storage();

    if (!r2.isAvailable()) {
      return NextResponse.json(
        { error: "R2 not configured" },
        { status: 400 }
      );
    }

    // Get current index size for logging
    const currentIndex = await r2.getJSON<{ count: number }>('url-index.json');
    const previousCount = currentIndex?.count || 0;

    // Save empty URL index
    await r2.putJSON('url-index.json', {
      urls: [],
      updatedAt: new Date().toISOString(),
      count: 0,
      clearedAt: new Date().toISOString(),
    }, 'public, max-age=60');

    logger.info(`✓ URL index cleared. Previous size: ${previousCount} URLs`);

    return NextResponse.json({
      success: true,
      message: "URL index cleared successfully",
      previousCount,
      newCount: 0,
      warning: "Next extraction will treat ALL RSS jobs as new. This may create duplicates in storage if jobs already exist.",
    });
  } catch (error) {
    logger.error("Failed to clear URL index:", error);

    return NextResponse.json(
      {
        error: "Failed to clear URL index",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Show current URL index status
 */
export async function GET() {
  const r2 = getR2Storage();

  if (!r2.isAvailable()) {
    return NextResponse.json({ error: "R2 not configured" }, { status: 400 });
  }

  const urlIndex = await r2.getJSON<{
    urls: string[];
    count: number;
    updatedAt: string;
    clearedAt?: string;
  }>('url-index.json');

  // Get sample URLs
  const sampleUrls = urlIndex?.urls?.slice(0, 5) || [];

  return NextResponse.json({
    message: "POST to this endpoint to clear the URL index",
    currentState: {
      urlIndexExists: !!urlIndex,
      urlIndexCount: urlIndex?.count || 0,
      updatedAt: urlIndex?.updatedAt || null,
      clearedAt: urlIndex?.clearedAt || null,
      sampleUrls,
    },
    warning: "Clearing the index will cause next extraction to treat ALL jobs as new!",
  });
}
