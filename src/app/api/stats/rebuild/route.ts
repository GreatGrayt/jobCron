import { NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

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
