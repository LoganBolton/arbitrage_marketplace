import { runPipeline, scripts } from '@/lib/pipeline';

export async function POST() {
  return runPipeline([
    { label: 'Running AI price search', command: scripts.aiSearch },
    { label: 'Extracting prices from responses', command: scripts.aiExtractPrice },
    { label: 'Importing price estimates to database', command: scripts.importToDb },
  ]);
}
