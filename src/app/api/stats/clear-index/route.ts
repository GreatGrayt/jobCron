import { NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";

export const dynamic = "force-dynamic";

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
