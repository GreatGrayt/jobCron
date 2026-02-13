# Job Stats Dashboard

> LinkedIn job analytics. No AI, no fluff, just data.

Why 14 markdown files? Great question. Now there's one.

## Quick Start

```bash
npm install
cp .env.example .env
# add your telegram bot token (required)
# add github gist creds (optional but recommended)
npm run dev
```

Visit `localhost:3000` and you're done.

## What It Does

- **RSS Monitoring**: Checks feeds every 5min, sends telegram alerts
- **Job Analysis**: Extracts salary, certs, skills, locations (multilingual)
- **Stats Dashboard**: Treemaps, gauges, heatmaps, word clouds, the works
- **Persistent Storage**: GitHub Gist for caching (free forever), Cloudflare R2 for stats

## Tech Stack

- Next.js 14 (app router)
- TypeScript (strict mode because we're responsible adults)
- Recharts + Nivo for viz
- GitHub Gist API (cache)
- Cloudflare R2 (stats)
- Telegram Bot API (notifications)

## Environment Variables

```env
# required
TELEGRAM_BOT_TOKEN=your_token_from_botfather
TELEGRAM_CHAT_ID=your_chat_id_from_userinfobot

# optional but you'll want these
GITHUB_TOKEN=ghp_yourtoken
GIST_ID=your_gist_id
R2_ACCOUNT_ID=cloudflare_account_id
R2_ACCESS_KEY_ID=r2_key
R2_SECRET_ACCESS_KEY=r2_secret
R2_BUCKET_NAME=job-stats

# optional (has defaults)
RSS_FEED_URLS=https://rss.app/feed1.xml,https://rss.app/feed2.xml
CHECK_INTERVAL_MINUTES=5
CRON_SECRET=some_secret_string
```

## Features

### Stats Page (root `/`)

- **Industry Treemap**: Who's hiring, visualized
- **Salary Gauges**: Min/avg/max by industry, seniority, location
- **Skills Word Cloud**: What they want you to know
- **Location Heatmap**: Where the jobs are (day/hour)
- **Certs Bump Chart**: Trending certifications over time
- **Publication Timing**: When jobs get posted (spoiler: 10am)
- **Filters**: Search, filter by industry/country/seniority/etc

### Data Extraction

- **Salary**: Regex hell. Supports £50k-70k, $80,000/year, €100K p.a., and 47 other formats
- **Location**: 750+ cities, 51 countries, 15 languages including Arabic, Chinese, Russian
- **Certificates**: CFA, ACCA, PMP, AWS, 50+ more
- **Skills**: 200+ tech skills, 100+ software tools
- **Experience**: Extracts "3-5 years", "senior", "entry level"
- **Company Type**: AI/ML, fintech, healthcare, 30+ categories

### Backend APIs

All in `src/app/api/`:

- `/api/stats/get` - Fetch analytics (current month or all-time)
- `/api/stats/extract-and-save` - Process jobs, update cache
- `/api/stats/rebuild` - Rebuild stats from R2
- `/api/cron/check-jobs` - RSS monitor (auto-runs every 5min on Vercel)
- `/api/scrape-jobs-stream` - Manual LinkedIn scraping with SSE
- `/api/migrate-to-r2` - One-time migration util

## Performance Notes

Started slow. Made it fast. Here's how:

- **Deduplication**: 48hr window (configurable)
- **Concurrent Scraping**: 10 pages at once (LinkedIn rate limits be damned)
- **Location Batching**: Process in chunks to avoid memory issues
- **Memoization**: Cache expensive calculations
- **Debouncing**: Don't recalculate on every keystroke

Result: Handles 1000+ jobs/month without breaking a sweat.

## Architecture

```
RSS Feeds → Parser → Analyzer → Cache (Gist) → Stats (R2) → Dashboard
                                    ↓
                              Telegram Bot
```

Monthly archiving: Current month = full data. Old months = stats only. Keeps the Gist under GitHub's 100MB limit.

## Deployment

### Vercel (Recommended)

```bash
# push to github
git push origin main

# import to vercel
# 1. Visit vercel.com/new
# 2. Import your repo
# 3. Add environment variables
# 4. Deploy
```

Vercel will auto-run the cron job every 5min using `vercel.json` config.

### GitHub Gist Setup (3min)

Need a place to store data that isn't Vercel's ephemeral filesystem?

```bash
# 1. Create personal access token
# Go to github.com/settings/tokens
# Generate new token (classic)
# Check "gist" scope
# Copy token

# 2. Create a gist
# Go to gist.github.com
# Create new gist
# Name it "job-cache" or whatever
# Copy gist ID from URL (the long hash)

# 3. Add to .env
GITHUB_TOKEN=ghp_yourtoken
GIST_ID=abc123def456...
```

Done. Your cache now survives deployments.

### Cloudflare R2 Setup (5min)

Free 10GB storage for stats.

```bash
# 1. Sign up at cloudflare.com
# 2. Create R2 bucket
# 3. Create API token with R2 permissions
# 4. Add to .env
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=job-stats
```

## Changelog Highlights

- **v1.0.0**: Complete rewrite. Everything is new.
- **Location Extraction**: Added 750 cities, multilingual support
- **Salary Parsing**: Now handles formats from 13 countries
- **Filter Bar**: Added search and 47 filter combinations
- **Performance**: 10x faster scraping, memoized calculations
- **Stats API**: Unified endpoint for current + archive data

## Known Issues

- Salary extraction confidence varies by format (some job posts are chaos)
- Some cities get misclassified (e.g., "England" as a city - thanks LinkedIn)
- Publication heatmap shows UTC times (convert mentally)
- Can't extract salary from "competitive salary" (we tried)

## Random Facts

- Supports 13 countries because 12 felt incomplete
- Salary regex has 96 lines. Yes, really.
- Location dictionary: 4,301 commented lines (now compact)
- Most jobs post at 10am local time (HR's coffee time)
- "Remote" is not a location (sorry)

## Contributing

This is a personal project but feel free to fork it. Or don't. I'm not your boss.

## License

MIT. Do whatever you want. Attribution appreciated but not required.

---

**Pro tip**: Click the logo 7 times. Nothing happens. But you tried.

Built with caffeine and regex. Lots of regex.
