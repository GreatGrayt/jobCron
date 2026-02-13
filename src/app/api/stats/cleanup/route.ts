import { NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

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
