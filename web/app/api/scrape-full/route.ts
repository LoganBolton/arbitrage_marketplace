import { spawn } from 'node:child_process';
import path from 'node:path';

export async function POST() {
  const repoRoot = path.join(process.cwd(), '..');
  const venvPython = path.join(repoRoot, '.venv', 'bin', 'python');
  const seleniumDir = path.join(repoRoot, 'selenium');

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(msg: string) {
        controller.enqueue(encoder.encode(msg));
      }

      function runCommand(cmd: string, args: string[], cwd?: string): Promise<void> {
        return new Promise((resolve, reject) => {
          const proc = spawn(cmd, args, { cwd: cwd ?? process.cwd() });
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
        send('=== [1/3] Scraping listing previews ===\n');
        await runCommand(venvPython, [path.join(seleniumDir, 'scrape_listings.py')]);

        send('\n=== [2/3] Scraping listing details ===\n');
        await runCommand(venvPython, [path.join(seleniumDir, 'scrape_listing_details.py')]);

        send('\n=== [3/3] Importing to database ===\n');
        await runCommand('node', ['scripts/import_from_json.mjs']);

        send('\n✓ Pipeline completed successfully!\n');
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
