export interface AppliedJob {
  id: string;           // Unique application ID
  jobId: string;        // Hash of original URL (for lookup)
  appliedAt: string;    // ISO timestamp when user clicked
  jobTitle: string;     // Job title
  company: string;      // Company name
  location: string;     // Job location (raw)
  city?: string;        // Normalized city name
  country?: string;     // Extracted country name
  region?: string;      // Geographical region (e.g., Europe, America)
  originalUrl: string;  // Actual job application URL
  postedDate: string;   // When job was posted
  roleType?: string;    // Type of role
  industry?: string;    // Industry/company type
}

export interface AppliedJobsManifest {
  version: number;
  updatedAt: string;
  totalApplications: number;
  applicationsByMonth: Record<string, number>;
}

export interface TrackingJobData {
  jobUrl: string;
  title: string;
  company: string;
  location: string;
  postedDate: string;
  roleType?: string;
  industry?: string;
}
