'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

export default function PriceEvalPage() {
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState('');
  const logRef = useRef<HTMLPreElement>(null);

  async function runEval() {
    setRunning(true);
    setLog('');

    try {
      const res = await fetch('/api/price-eval', { method: 'POST' });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setLog((prev) => {
          const next = prev + chunk;
          setTimeout(() => {
            if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
          }, 0);
          return next;
        });
      }
    } catch (error: any) {
      setLog((prev) => prev + `\n✗ Error: ${error.message}\n`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>AI Price Evaluation</h1>
        <Link href="/admin" style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#0070f3',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
        }}>
          ← Back to Admin
        </Link>
      </div>

      <div style={{ padding: '1.5rem', border: '1px solid #6f42c1', borderRadius: '8px', backgroundColor: '#f8f4ff' }}>
        <h2>Run Price Evaluation Pipeline</h2>
        <p>Queries the AI for fair market value on all scraped listings, extracts prices, and imports them to the database.</p>
        <ol style={{ lineHeight: '2', marginTop: '0.5rem', color: '#555' }}>
          <li>AI price search (<code>ai/search.py</code>)</li>
          <li>Extract prices from responses (<code>ai/extract_price.py</code>)</li>
          <li>Import to database (<code>scripts/import_from_json.mjs</code>)</li>
        </ol>

        <button
          onClick={runEval}
          disabled={running}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: running ? '#ccc' : '#6f42c1',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: running ? 'not-allowed' : 'pointer',
            marginTop: '1rem',
          }}
        >
          {running ? 'Running…' : 'Run Price Eval'}
        </button>

        {log && (
          <pre
            ref={logRef}
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              borderRadius: '4px',
              fontSize: '0.8rem',
              maxHeight: '500px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {log}
            {running && <span style={{ opacity: 0.6 }}>▊</span>}
          </pre>
        )}
      </div>
    </div>
  );
}
