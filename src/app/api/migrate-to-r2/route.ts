import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
