import { NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";
import { JobMetadata, JobDescription } from "@/lib/job-statistics-r2";
import { LocationExtractor, normalizeCity } from "@/lib/location-extractor";

export const dynamic = "force-dynamic";

/**
 * GET endpoint - returns fix status/preview
 */
export async function GET() {
  const r2 = getR2Storage();

  if (!r2.isAvailable()) {
    return NextResponse.json({ error: "R2 not configured" }, { status: 400 });
  }

  try {
    const manifest = await r2.getManifest();

    // Sample a few jobs to show what would be corrected
    const sampleCorrections: Array<{
      id: string;
      title: string;
      location: string;
      currentCity: string | null;
      currentCountry: string | null;
      currentRegion: string | null;
      newCity: string | null;
      newCountry: string | null;
      newRegion: string | null;
    }> = [];

    // Get first available month with data
    const firstMonth = manifest.availableMonths[0];
    if (firstMonth && manifest.months[firstMonth]?.days?.length > 0) {
      const firstDay = manifest.months[firstMonth].days[0];

      const metadata = await r2.getNDJSONGzipped<JobMetadata>(firstDay.metadata);
      const descriptions = await r2.getNDJSONGzipped<JobDescription>(firstDay.descriptions);
      const descMap = new Map(descriptions.map(d => [d.id, d.description]));

      // Check first 10 jobs for potential corrections
      for (const job of metadata.slice(0, 10)) {
        const description = descMap.get(job.id) || '';
        const extracted = LocationExtractor.extractLocation(
          job.title,
          job.url,
          job.location,
          description
        );
        const normalizedCity = normalizeCity(extracted.city);

        if (normalizedCity !== job.city || extracted.country !== job.country || extracted.region !== job.region) {
          sampleCorrections.push({
            id: job.id,
            title: job.title,
            location: job.location,
            currentCity: job.city,
            currentCountry: job.country,
            currentRegion: job.region,
            newCity: normalizedCity,
            newCountry: extracted.country,
            newRegion: extracted.region,
          });
        }
      }
    }

    return NextResponse.json({
      status: "ready",
      message: "POST to this endpoint to re-extract and fix all cities/countries in R2 storage",
      currentState: {
        manifestTotalJobs: manifest.totalJobsAllTime,
        availableMonths: manifest.availableMonths,
      },
      sampleCorrections,
      warning: "This will re-process all job metadata and recalculate statistics. May take several minutes.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to load preview",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
