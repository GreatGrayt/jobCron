/**
 * Stats Storage Adapter
 *
 * Provides a unified interface for job statistics storage.
 * Automatically selects R2 (preferred) or GitHub Gist based on configuration.
 */

import { logger } from './logger';

// Lazy imports to avoid circular dependencies
let JobStatisticsCache: any = null;
let JobStatisticsCacheR2: any = null;

export type StorageBackend = 'r2' | 'gist';

/**
 * Detect which storage backend is configured
 */
export function detectStorageBackend(): StorageBackend {
  const hasR2 = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );

  const hasGist = !!(
    process.env.GITHUB_TOKEN &&
    process.env.GIST_ID
  );

  if (hasR2) {
    logger.info('Storage backend: Cloudflare R2');
    return 'r2';
  }

  if (hasGist) {
    logger.info('Storage backend: GitHub Gist');
    return 'gist';
  }

  logger.warn('No storage backend configured! Defaulting to Gist (will fail without credentials)');
  return 'gist';
}

/**
 * Get the appropriate statistics cache based on configuration
 */
export async function getStatsCache(): Promise<any> {
  const backend = detectStorageBackend();

  if (backend === 'r2') {
    if (!JobStatisticsCacheR2) {
      const module = await import('./job-statistics-r2');
      JobStatisticsCacheR2 = module.JobStatisticsCacheR2;
    }
    return new JobStatisticsCacheR2();
  }

  // Default to Gist
  if (!JobStatisticsCache) {
    const module = await import('./job-statistics-cache');
    JobStatisticsCache = module.JobStatisticsCache;
  }
  return new JobStatisticsCache();
}

/**
 * Get storage info for debugging/display
 */
export function getStorageInfo(): { backend: StorageBackend; configured: boolean } {
  const backend = detectStorageBackend();
  const configured = backend === 'r2'
    ? !!(process.env.R2_BUCKET_NAME)
    : !!(process.env.GIST_ID);

  return { backend, configured };
}
