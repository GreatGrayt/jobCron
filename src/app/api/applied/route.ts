import { NextRequest, NextResponse } from 'next/server';
import { getAppliedJobsStorage } from '@/lib/applied-jobs-r2';
import { logger } from '@/lib/logger';

/**
 * Get all applied jobs
 *
 * Query params:
 * - month: Optional YYYY-MM to filter by month
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const month = searchParams.get('month') || undefined;

  try {
    const storage = getAppliedJobsStorage();
    await storage.load();

    const [applications, stats] = await Promise.all([
      storage.getApplications(month),
      storage.getStats(),
    ]);

    return NextResponse.json({
      success: true,
      data: applications,
      stats,
      filter: { month },
    });
  } catch (error) {
    logger.error('Failed to fetch applied jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch applied jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
