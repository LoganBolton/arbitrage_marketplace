import { runPipeline, scripts } from '@/lib/pipeline';

export async function POST() {
  return runPipeline([
    { label: 'Scraping listing previews', command: scripts.scrapeListings },
    { label: 'Scraping listing details', command: scripts.scrapeDetails },
    { label: 'Importing to database', command: scripts.importToDb },
  ]);
}
