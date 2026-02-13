import { NextRequest, NextResponse } from "next/server";
import { getR2Storage } from "@/lib/r2-storage";
import { JobMetadata, JobDescription } from "@/lib/job-statistics-r2";
import { LocationExtractor, normalizeCity } from "@/lib/location-extractor";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // 5 minutes timeout
export const dynamic = "force-dynamic";

interface CorrectionStats {
  totalProcessed: number;
  cityCorrected: number;
  countryCorrected: number;
  regionCorrected: number;
  unchanged: number;
  corrections: Array<{
    id: string;
    oldCity: string | null;
    newCity: string | null;
    oldCountry: string | null;
    newCountry: string | null;
    oldRegion: string | null;
    newRegion: string | null;
    location: string;
  }>;
}

/**
 * POST /api/stats/fix-locations
 *
 * Re-extracts cities and countries from all stored job metadata using the current
 * LocationExtractor logic. This fixes incorrectly extracted locations from older
 * versions of the extraction code.
 *
 * Process:
 * 1. Load all metadata files from R2
 * 2. Re-run LocationExtractor on each job using title, url, location, and description
 * 3. Update city, country, and region fields if they changed
 * 4. Save corrected metadata back to R2
 * 5. Recalculate statistics with corrected data
 */
export async function POST(request: NextRequest) {
  logger.info("=== Starting Location Fix ===");

  try {
    const r2 = getR2Storage();

    if (!r2.isAvailable()) {
      return NextResponse.json(
        { error: "R2 not configured" },
        { status: 400 }
      );
    }

    // Load manifest
    const manifest = await r2.getManifest();
    logger.info(`Loaded manifest with ${manifest.availableMonths.length} months`);

    const correctionStats: CorrectionStats = {
      totalProcessed: 0,
      cityCorrected: 0,
      countryCorrected: 0,
      regionCorrected: 0,
      unchanged: 0,
      corrections: [],
    };

    // Process each month
    for (const month of manifest.availableMonths) {
      const monthData = manifest.months[month];
      if (!monthData?.days) continue;

      logger.info(`Processing month: ${month}`);

      // Process each day
      for (const day of monthData.days) {
        try {
          // Load metadata and descriptions for this day
          const metadata = await r2.getNDJSONGzipped<JobMetadata>(day.metadata);
          const descriptions = await r2.getNDJSONGzipped<JobDescription>(day.descriptions);

          // Create description lookup
          const descMap = new Map(descriptions.map(d => [d.id, d.description]));

          let dayModified = false;
          const correctedMetadata: JobMetadata[] = [];

          for (const job of metadata) {
            correctionStats.totalProcessed++;

            // Get description for re-extraction
            const description = descMap.get(job.id) || '';

            // Re-extract location using current logic
            const extractedLocation = LocationExtractor.extractLocation(
              job.title,
              job.url,
              job.location,
              description
            );

            // Normalize the city
            const normalizedCity = normalizeCity(extractedLocation.city);

            // Check if anything changed
            const cityChanged = normalizedCity !== job.city;
            const countryChanged = extractedLocation.country !== job.country;
            const regionChanged = extractedLocation.region !== job.region;

            if (cityChanged || countryChanged || regionChanged) {
              // Record the correction (limit to first 100 for response size)
              if (correctionStats.corrections.length < 100) {
                correctionStats.corrections.push({
                  id: job.id,
                  oldCity: job.city,
                  newCity: normalizedCity,
                  oldCountry: job.country,
                  newCountry: extractedLocation.country,
                  oldRegion: job.region,
                  newRegion: extractedLocation.region,
                  location: job.location,
                });
              }

              if (cityChanged) correctionStats.cityCorrected++;
              if (countryChanged) correctionStats.countryCorrected++;
              if (regionChanged) correctionStats.regionCorrected++;

              // Update the job with corrected values
              correctedMetadata.push({
                ...job,
                city: normalizedCity,
                country: extractedLocation.country,
                region: extractedLocation.region,
              });

              dayModified = true;
            } else {
              correctionStats.unchanged++;
              correctedMetadata.push(job);
            }
          }

          // Save corrected metadata if any changes were made
          if (dayModified) {
            await r2.putNDJSONGzipped(day.metadata, correctedMetadata);
            logger.info(`✓ Updated ${day.date} with corrected locations`);
          }
        } catch (error) {
          logger.error(`Error processing ${day.date}:`, error);
        }
      }
    }

    // Now recalculate statistics from the corrected metadata
    logger.info("Recalculating statistics from corrected data...");

    const statsByMonth = new Map<string, {
      totalJobs: number;
      byDate: Record<string, number>;
      byIndustry: Record<string, number>;
      byCertificate: Record<string, number>;
      byKeyword: Record<string, number>;
      bySeniority: Record<string, number>;
      byLocation: Record<string, number>;
      byCountry: Record<string, number>;
      byCity: Record<string, number>;
      byRegion: Record<string, number>;
      byCompany: Record<string, number>;
      bySoftware: Record<string, number>;
      byProgrammingSkill: Record<string, number>;
      byYearsExperience: Record<string, number>;
      byAcademicDegree: Record<string, number>;
    }>();

    // Initialize stats for all months
    for (const month of manifest.availableMonths) {
      statsByMonth.set(month, {
        totalJobs: 0,
        byDate: {},
        byIndustry: {},
        byCertificate: {},
        byKeyword: {},
        bySeniority: {},
        byLocation: {},
        byCountry: {},
        byCity: {},
        byRegion: {},
        byCompany: {},
        bySoftware: {},
        byProgrammingSkill: {},
        byYearsExperience: {},
        byAcademicDegree: {},
      });
    }

    // Recalculate stats from corrected metadata
    for (const month of manifest.availableMonths) {
      const monthData = manifest.months[month];
      if (!monthData?.days) continue;

      const stats = statsByMonth.get(month)!;

      for (const day of monthData.days) {
        try {
          const metadata = await r2.getNDJSONGzipped<JobMetadata>(day.metadata);

          for (const job of metadata) {
            stats.totalJobs++;

            const dateKey = job.extractedDate.split('T')[0];
            stats.byDate[dateKey] = (stats.byDate[dateKey] || 0) + 1;

            if (job.industry) {
              stats.byIndustry[job.industry] = (stats.byIndustry[job.industry] || 0) + 1;
            }

            job.certificates?.forEach(cert => {
              stats.byCertificate[cert] = (stats.byCertificate[cert] || 0) + 1;
            });

            job.keywords?.forEach(keyword => {
              stats.byKeyword[keyword] = (stats.byKeyword[keyword] || 0) + 1;
            });

            if (job.seniority) {
              stats.bySeniority[job.seniority] = (stats.bySeniority[job.seniority] || 0) + 1;
            }

            if (job.location) {
              stats.byLocation[job.location] = (stats.byLocation[job.location] || 0) + 1;
            }

            if (job.country) {
              stats.byCountry[job.country] = (stats.byCountry[job.country] || 0) + 1;
            }

            // Use corrected city
            if (job.city) {
              stats.byCity[job.city] = (stats.byCity[job.city] || 0) + 1;
            }

            if (job.region) {
              stats.byRegion[job.region] = (stats.byRegion[job.region] || 0) + 1;
            }

            if (job.company) {
              stats.byCompany[job.company] = (stats.byCompany[job.company] || 0) + 1;
            }

            job.software?.forEach(soft => {
              stats.bySoftware[soft] = (stats.bySoftware[soft] || 0) + 1;
            });

            job.programmingSkills?.forEach(skill => {
              stats.byProgrammingSkill[skill] = (stats.byProgrammingSkill[skill] || 0) + 1;
            });

            if (job.yearsExperience) {
              stats.byYearsExperience[job.yearsExperience] = (stats.byYearsExperience[job.yearsExperience] || 0) + 1;
            }

            job.academicDegrees?.forEach(degree => {
              stats.byAcademicDegree[degree] = (stats.byAcademicDegree[degree] || 0) + 1;
            });
          }
        } catch (error) {
          logger.error(`Error recalculating stats for ${day.date}:`, error);
        }
      }
    }

    // Save updated stats for each month
    let totalJobsAllTime = 0;
    for (const [month, stats] of statsByMonth.entries()) {
      await r2.putJSON(`stats/${month}.json`, stats, 'public, max-age=60');
      totalJobsAllTime += stats.totalJobs;
      logger.info(`✓ Saved corrected stats for ${month}: ${stats.totalJobs} jobs`);

      // Update manifest month totals
      if (manifest.months[month]) {
        manifest.months[month].totalJobs = stats.totalJobs;
      }
    }

    // Update manifest totals
    manifest.totalJobsAllTime = totalJobsAllTime;
    await r2.saveManifest(manifest);

    logger.info("=== Location Fix Complete ===");

    return NextResponse.json({
      success: true,
      message: "Location fix completed successfully",
      stats: {
        totalProcessed: correctionStats.totalProcessed,
        cityCorrected: correctionStats.cityCorrected,
        countryCorrected: correctionStats.countryCorrected,
        regionCorrected: correctionStats.regionCorrected,
        unchanged: correctionStats.unchanged,
        totalJobsAllTime,
        monthsProcessed: manifest.availableMonths.length,
      },
      sampleCorrections: correctionStats.corrections.slice(0, 20),
    });
  } catch (error) {
    logger.error("Location fix failed:", error);

    return NextResponse.json(
      {
        error: "Location fix failed",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

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
