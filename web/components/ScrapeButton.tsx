'use client';

import { useState, useRef } from 'react';

export default function ScrapeButton() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState('');
  const logRef = useRef<HTMLPreElement>(null);

  async function run() {
    setRunning(true);
    setLog('');
    try {
      const res = await fetch('/api/scrape-and-price', { method: 'POST' });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setLog((prev) => {
          const next = prev + decoder.decode(value, { stream: true });
          setTimeout(() => {
            if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
          }, 0);
          return next;
        });
      }
    } catch (error: any) {
      setLog((prev) => prev + `\nError: ${error.message}\n`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="scrape-section">
      <button className="scrape-button" onClick={run} disabled={running}>
        {running ? 'Running...' : 'Scrape Listings + Estimate Prices'}
      </button>
      {log && (
        <pre className="scrape-log" ref={logRef}>
          {log}
          {running && <span className="scrape-cursor">|</span>}
        </pre>
      )}
    </div>
  );
}
