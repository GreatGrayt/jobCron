import { NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

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
