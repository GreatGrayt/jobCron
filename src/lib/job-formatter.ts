import { JobItem } from "@/types/job";
import { extractJobDetails, analyzeJobDescription } from "./job-analyzer";
import { createTrackingUrl } from "./tracking-url";

/**
 * Calculates time elapsed since job posting
 */
function getTimeAgo(postDate: Date): string {
  const now = new Date();
  const totalMinutes = Math.floor((now.getTime() - postDate.getTime()) / 60000);

  if (totalMinutes < 1) {
    return "Just now";
  } else if (totalMinutes < 60) {
    return `${totalMinutes} min${totalMinutes > 1 ? 's' : ''} ago`;
  } else if (totalMinutes < 1440) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m ago`;
  } else {
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    return `${days}d ${hours}h ago`;
  }
}

/**
 * Formats a date for display
 */
function formatDate(date: Date): string {
  const dateStr = date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const timeStr = date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return `${dateStr} at ${timeStr}`;
}

/**
 * Formats a job item as a Telegram message
 */
export function formatJobMessage(job: JobItem): string {
  const details = extractJobDetails(job.title);
  const analysis = analyzeJobDescription(job.description);
  const postDate = new Date(job.pubDate);
  const timeAgo = getTimeAgo(postDate);

  const sections: string[] = [
    "🆕 NEW JOB POSTING",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "",
    `📋 Position: ${details.position}`,
    "",
    `🏢 Company: ${details.company}`,
  ];

  if (analysis.companyType !== "Unknown") {
    sections.push(`🏦 Industry: ${analysis.companyType}`);
  }

  sections.push("", `📍 Location: ${details.location}`);

  if (analysis.jobType !== "General Finance") {
    sections.push(`💼 Role Type: ${analysis.jobType}`);
  }

  if (analysis.yearsExperience) {
    sections.push(`📊 Experience: ${analysis.yearsExperience}`);
  }

  if (analysis.certifications.length > 0) {
    sections.push(`🎓 Certifications: ${analysis.certifications.join(', ')}`);
  }

  if (analysis.academicDegrees.length > 0) {
    sections.push(`🎓 Education: ${analysis.academicDegrees.join(', ')}`);
  }

  if (analysis.expertise.length > 0) {
    sections.push("", "🔧 Key Skills:");
    analysis.expertise.forEach(skill => {
      sections.push(`   • ${skill}`);
    });
  }

  if (analysis.programmingSkills.length > 0) {
    sections.push(`💻 Programming: ${analysis.programmingSkills.join(', ')}`);
  }

  if (analysis.software.length > 0) {
    sections.push(`🖥️ Software: ${analysis.software.slice(0, 5).join(', ')}`);
  }

  // Generate tracking URL with job metadata
  const trackingUrl = createTrackingUrl({
    jobUrl: job.link,
    title: details.position,
    company: details.company,
    location: details.location,
    postedDate: job.pubDate,
    roleType: analysis.jobType !== "General Finance" ? analysis.jobType : undefined,
    industry: analysis.companyType !== "Unknown" ? analysis.companyType : undefined,
  });

  sections.push(
    "",
    `⏰ Posted: ${timeAgo}`,
    `📅 ${formatDate(postDate)}`,
    "",
    "🔗 Apply here:",
    trackingUrl,
    "",
    "━━━━━━━━━━━━━━━━━━━━━━",
    "💼 LinkedIn Jobs Monitor"
  );

  return sections.join('\n');
}
