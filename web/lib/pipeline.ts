import { spawn } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.join(process.cwd(), '..');

export const paths = {
  repoRoot,
  venvPython: path.join(repoRoot, '.venv', 'bin', 'python'),
  scrapeListings: path.join(repoRoot, 'selenium', 'scrape_listings.py'),
  scrapeDetails: path.join(repoRoot, 'selenium', 'scrape_listing_details.py'),
  aiSearch: path.join(repoRoot, 'ai', 'search.py'),
  aiExtractPrice: path.join(repoRoot, 'ai', 'extract_price.py'),
} as const;

export const scripts = {
  scrapeListings: paths.venvPython + ' ' + paths.scrapeListings,
  scrapeDetails: paths.venvPython + ' ' + paths.scrapeDetails,
  aiSearch: paths.venvPython + ' ' + paths.aiSearch,
  aiExtractPrice: paths.venvPython + ' ' + paths.aiExtractPrice,
  importToDb: 'node scripts/import_from_json.mjs',
} as const;

export interface PipelineStep {
  label: string;
  command: string;
}

/**
 * Runs a sequence of shell commands as a streaming HTTP response.
 * Each step is labeled [1/N], [2/N], etc. in the output.
 */
export function runPipeline(steps: PipelineStep[]): Response {
  const encoder = new TextEncoder();
  const total = steps.length;

  const stream = new ReadableStream({
    async start(controller) {
      function send(msg: string) {
        controller.enqueue(encoder.encode(msg));
      }

      function runCommand(cmd: string, args: string[]): Promise<void> {
        return new Promise((resolve, reject) => {
          const proc = spawn(cmd, args, { cwd: process.cwd() });
          proc.stdout.on('data', (data: Buffer) => send(data.toString()));
          proc.stderr.on('data', (data: Buffer) => send(data.toString()));
          proc.on('close', (code: number) => {
            if (code === 0) resolve();
            else reject(new Error(`Exited with code ${code}`));
          });
          proc.on('error', reject);
        });
      }

      try {
        for (let i = 0; i < steps.length; i++) {
          const { label, command } = steps[i];
          send(`=== [${i + 1}/${total}] ${label} ===\n`);
          const [cmd, ...args] = command.split(' ');
          await runCommand(cmd, args);
          send('\n');
        }
        send('✓ Pipeline completed successfully!\n');
      } catch (error: any) {
        send(`\n✗ Error: ${error.message}\n`);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
