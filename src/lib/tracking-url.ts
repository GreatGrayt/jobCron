import crypto from 'crypto';
import { TrackingJobData } from '@/types/applied-job';

const TRACKING_SECRET = process.env.TRACKING_SECRET || 'default-dev-secret-change-in-production';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

/**
 * Creates an HMAC signature for tracking URL validation
 */
function createSignature(jobId: string, timestamp: number): string {
  return crypto
    .createHmac('sha256', TRACKING_SECRET)
    .update(`${jobId}:${timestamp}`)
    .digest('base64url')
    .substring(0, 16); // Truncate for shorter URLs
}

/**
 * Generates a job ID from the URL (hash)
 */
export function generateJobId(url: string): string {
  return crypto
    .createHash('md5')
    .update(url)
    .digest('hex')
    .substring(0, 12);
}

/**
 * Encodes job data to base64url for URL transport
 */
function encodeJobData(data: TrackingJobData): string {
  const json = JSON.stringify({
    u: data.jobUrl,
    t: data.title,
    c: data.company,
    l: data.location,
    p: data.postedDate,
    r: data.roleType || '',
    i: data.industry || '',
  });
  return Buffer.from(json).toString('base64url');
}

/**
 * Decodes job data from base64url
 */
export function decodeJobData(encoded: string): TrackingJobData | null {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf-8');
    const data = JSON.parse(json);
    return {
      jobUrl: data.u,
      title: data.t,
      company: data.c,
      location: data.l,
      postedDate: data.p,
      roleType: data.r || undefined,
      industry: data.i || undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Creates a tracking URL for a job posting
 *
 * URL Format: /api/track?j=<jobId>&t=<timestamp>&s=<signature>&d=<encodedData>
 */
export function createTrackingUrl(jobData: TrackingJobData): string {
  const jobId = generateJobId(jobData.jobUrl);
  const timestamp = Date.now();
  const signature = createSignature(jobId, timestamp);
  const encodedData = encodeJobData(jobData);

  const params = new URLSearchParams({
    j: jobId,
    t: timestamp.toString(),
    s: signature,
    d: encodedData,
  });

  return `${APP_BASE_URL}/api/track?${params.toString()}`;
}

/**
 * Validates a tracking URL's signature
 */
export function validateTrackingUrl(
  jobId: string,
  timestamp: string,
  signature: string
): { valid: boolean; error?: string } {
  // Validate timestamp format
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) {
    return { valid: false, error: 'Invalid timestamp' };
  }

  // Optional: Check if URL is expired (e.g., 30 days)
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
  if (Date.now() - ts > maxAge) {
    return { valid: false, error: 'Tracking URL expired' };
  }

  // Validate signature
  const expectedSignature = createSignature(jobId, ts);

  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid signature' };
    }
  } catch {
    return { valid: false, error: 'Invalid signature format' };
  }

  return { valid: true };
}
