import { logger } from './logger';
import { getR2Storage } from './r2-storage';

/**
 * Cache entry with individual timestamp for per-URL expiry
 */
interface CacheEntry {
  url: string;
  timestamp: string;  // ISO date - pubDate/postedDate if available, otherwise extraction time
}

/**
 * Data structure stored in R2
 */
interface CacheData {
  entries: CacheEntry[];
  lastUpdated: string;
  metadata: {
    totalUrlsCached: number;
    version: string;
  };
}

/**
 * URL Cache with per-URL timestamp-based expiry
 *
 * URLs are kept for 48 hours based on their individual timestamps (post date or extraction time),
 * not based on when the cache was last updated. This prevents duplicates from being re-sent
 * when old posts are reposted.
 */
export class UrlCache {
  private cacheKey: string;
  private cache: Map<string, string>; // url -> timestamp
  private isDirty: boolean = false;
  private readonly CACHE_EXPIRY_HOURS = 48;

  constructor(cacheKey: string = 'url-scraper') {
    this.cacheKey = cacheKey;
    this.cache = new Map<string, string>();

    logger.info(`Cache key: ${this.cacheKey}`);
    logger.info(`Cache expiry: ${this.CACHE_EXPIRY_HOURS} hours per URL (based on post/extraction time)`);
  }

  /**
   * Check if a timestamp is older than the expiry threshold
   */
  private isEntryExpired(timestamp: string): boolean {
    const entryDate = new Date(timestamp);
    const now = new Date();
    const hoursDiff = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff > this.CACHE_EXPIRY_HOURS;
  }

  /**
   * Get the R2 key for this cache
   */
  private getR2Key(): string {
    return `url-cache/${this.cacheKey}.json`;
  }

  /**
   * Load cache from R2 storage
   */
  async load(): Promise<void> {
    try {
      const r2 = getR2Storage();

      if (!r2.isAvailable()) {
        logger.warn('R2 Storage not configured. Starting with empty cache.');
        this.cache = new Map<string, string>();
        return;
      }

      const key = this.getR2Key();
      logger.info(`Loading cache from R2: ${key}`);

      const data = await r2.getJSON<CacheData>(key);

      if (!data) {
        logger.info(`No cache found in R2 for "${this.cacheKey}". Starting with empty cache.`);
        this.cache = new Map<string, string>();
        return;
      }

      // Filter out expired entries and load valid ones
      let expiredCount = 0;
      let validCount = 0;

      for (const entry of data.entries) {
        if (this.isEntryExpired(entry.timestamp)) {
          expiredCount++;
        } else {
          this.cache.set(entry.url, entry.timestamp);
          validCount++;
        }
      }

      logger.info(`✓ Cache loaded from R2`);
      logger.info(`  - Cache key: ${this.cacheKey}`);
      logger.info(`  - Valid URLs loaded: ${validCount}`);
      logger.info(`  - Expired URLs filtered: ${expiredCount}`);
      logger.info(`  - Last updated: ${data.lastUpdated}`);
      logger.info(`  - Cache version: ${data.metadata.version}`);

      // Save immediately if we filtered out expired entries to clean up storage
      if (expiredCount > 0) {
        logger.info(`  - Cleaning ${expiredCount} expired entries from storage...`);
        await this.save();
        logger.info(`  - Storage cleaned`);
      }
    } catch (error: any) {
      logger.error(`Error loading cache from R2:`, error);
      logger.info(`Starting with empty cache.`);
      this.cache = new Map<string, string>();
    }
  }

  /**
   * Save cache to R2 storage
   */
  async save(): Promise<void> {
    try {
      const r2 = getR2Storage();

      if (!r2.isAvailable()) {
        logger.warn('R2 Storage not configured. Cache not saved.');
        return;
      }

      const now = new Date().toISOString();

      // Convert map to array of entries (only non-expired ones)
      const entries: CacheEntry[] = [];
      for (const [url, timestamp] of this.cache) {
        if (!this.isEntryExpired(timestamp)) {
          entries.push({ url, timestamp });
        }
      }

      const data: CacheData = {
        entries,
        lastUpdated: now,
        metadata: {
          totalUrlsCached: entries.length,
          version: '2.0.0',  // New version with per-URL timestamps
        },
      };

      const key = this.getR2Key();
      await r2.putJSON(key, data, 'public, max-age=60');

      this.isDirty = false;

      logger.info(`✓ Cache saved to R2`);
      logger.info(`  - Cache key: ${this.cacheKey}`);
      logger.info(`  - Total URLs cached: ${entries.length}`);
    } catch (error) {
      logger.error(`Error saving cache to R2:`, error);
      throw error;
    }
  }

  /**
   * Check if URL exists in cache (and is not expired)
   */
  has(url: string): boolean {
    const normalizedUrl = url.toLowerCase().trim();
    const timestamp = this.cache.get(normalizedUrl);

    if (!timestamp) {
      return false;
    }

    // Check if this specific entry is expired
    if (this.isEntryExpired(timestamp)) {
      // Remove expired entry from in-memory cache
      this.cache.delete(normalizedUrl);
      this.isDirty = true;
      return false;
    }

    return true;
  }

  /**
   * Add URL to cache with optional timestamp
   * @param url The URL to cache
   * @param timestamp Optional ISO date string (post date). Defaults to current time if not provided.
   */
  add(url: string, timestamp?: string): boolean {
    const normalizedUrl = url.toLowerCase().trim();

    // Use provided timestamp or current time
    const entryTimestamp = timestamp || new Date().toISOString();

    // Check if already exists (and not expired)
    if (this.has(normalizedUrl)) {
      return false; // Already exists
    }

    this.cache.set(normalizedUrl, entryTimestamp);
    this.isDirty = true;
    return true; // Successfully added
  }

  /**
   * Get all URLs in cache (non-expired only)
   */
  getAll(): string[] {
    const urls: string[] = [];
    for (const [url, timestamp] of this.cache) {
      if (!this.isEntryExpired(timestamp)) {
        urls.push(url);
      }
    }
    return urls;
  }

  /**
   * Get cache size (non-expired entries only)
   */
  size(): number {
    let count = 0;
    for (const [, timestamp] of this.cache) {
      if (!this.isEntryExpired(timestamp)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all URLs from cache
   */
  clear(): void {
    this.cache.clear();
    this.isDirty = true;
    logger.info(`Cache cleared`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let validCount = 0;
    let expiredCount = 0;

    for (const [, timestamp] of this.cache) {
      if (this.isEntryExpired(timestamp)) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      totalUrls: validCount,
      expiredUrls: expiredCount,
      storageType: 'R2',
      cacheKey: this.cacheKey,
      isDirty: this.isDirty,
    };
  }

  /**
   * Log all cached URLs with their timestamps
   */
  logAll(): void {
    logger.info(`\n=== Cache Contents (${this.size()} URLs) ===`);
    let index = 1;
    for (const [url, timestamp] of this.cache) {
      if (!this.isEntryExpired(timestamp)) {
        const date = new Date(timestamp);
        logger.info(`${index}. ${url} (cached: ${date.toISOString()})`);
        index++;
      }
    }
  }
}
