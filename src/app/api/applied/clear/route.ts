import { NextResponse } from 'next/server';
import { getAppliedJobsStorage } from '@/lib/applied-jobs-r2';
import { logger } from '@/lib/logger';

/**
 * Clear all applied jobs data from R2
 *
 * POST /api/applied/clear
 */
export async function POST() {
  try {
    const storage = getAppliedJobsStorage();
    await storage.load();

    const result = await storage.clearAll();

    logger.info(`Cleared applied jobs: ${result.totalDeleted} jobs from ${result.deletedMonths.length} months`);

    return NextResponse.json({
      success: true,
      message: `Cleared ${result.totalDeleted} applied jobs`,
      deletedMonths: result.deletedMonths,
      totalDeleted: result.totalDeleted,
    });
  } catch (error) {
    logger.error('Failed to clear applied jobs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear applied jobs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
