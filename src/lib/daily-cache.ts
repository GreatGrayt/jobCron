/**
 * Daily cache system for tracking sent jobs
 * Automatically clears at midnight (end of day)
 */

interface CacheEntry {
  date: string; // YYYY-MM-DD format
  sentUrls: Set<string>;
}

class DailyJobCache {
  private cache: CacheEntry | null = null;

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * Check if cache is still valid for today
   */
  private isCacheValid(): boolean {
    if (!this.cache) return false;
    return this.cache.date === this.getTodayDate();
  }

  /**
   * Initialize or reset cache for today
   */
  private initializeCache(): void {
    this.cache = {
      date: this.getTodayDate(),
      sentUrls: new Set<string>()
    };
  }

  /**
   * Check if a job has already been sent today (by URL)
   * @param jobUrl - The job URL
   * @returns true if job was already sent today, false otherwise
   */
  public hasBeenSent(jobUrl: string): boolean {
    // If cache is invalid (new day), reset it
    if (!this.isCacheValid()) {
      this.initializeCache();
      return false;
    }

    // Check if URL has been sent
    return this.cache!.sentUrls.has(jobUrl);
  }

  /**
   * Mark a job as sent for today
   * @param jobUrl - The job URL to mark as sent
   */
  public markAsSent(jobUrl: string): void {
    // If cache is invalid (new day), reset it
    if (!this.isCacheValid()) {
      this.initializeCache();
    }

    this.cache!.sentUrls.add(jobUrl);
  }

  /**
   * Mark multiple jobs as sent
   * @param jobUrls - Array of job URLs
   */
  public markMultipleAsSent(jobUrls: string[]): void {
    // If cache is invalid (new day), reset it
    if (!this.isCacheValid()) {
      this.initializeCache();
    }

    jobUrls.forEach(url => {
      this.cache!.sentUrls.add(url);
    });
  }

  /**
   * Get the number of jobs sent today
   */
  public getSentCount(): number {
    if (!this.isCacheValid()) {
      return 0;
    }
    return this.cache!.sentUrls.size;
  }

  /**
   * Manually clear the cache (for testing purposes)
   */
  public clear(): void {
    this.cache = null;
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    if (!this.isCacheValid()) {
      return {
        date: this.getTodayDate(),
        sentCount: 0,
        isValid: false
      };
    }

    return {
      date: this.cache!.date,
      sentCount: this.cache!.sentUrls.size,
      isValid: true
    };
  }
}

// Export a singleton instance
export const dailyJobCache = new DailyJobCache();
