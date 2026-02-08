'use client';

import { useState, useRef } from 'react';

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [fullLoading, setFullLoading] = useState(false);
  const [pipelineLog, setPipelineLog] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const logRef = useRef<HTMLPreElement>(null);

  // Fetch current stats
  async function fetchStats() {
    const res = await fetch('/api/scrape-previews');
    const data = await res.json();
    setStats(data);
  }

  // Trigger full pipeline with streaming output
  async function runFullPipeline() {
    setFullLoading(true);
    setPipelineLog('');

    try {
      const res = await fetch('/api/scrape-full', { method: 'POST' });
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setPipelineLog((prev) => {
          const next = prev + chunk;
          // Auto-scroll to bottom
          setTimeout(() => {
            if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
          }, 0);
          return next;
        });
      }
    } catch (error: any) {
      setPipelineLog((prev) => prev + `\n✗ Error: ${error.message}\n`);
    } finally {
      setFullLoading(false);
    }
  }

  // Trigger preview-only scraping
  async function runScraper() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/scrape-previews', { method: 'POST' });
      const data = await res.json();
      setResult(data);

      if (data.success) {
        await fetchStats();
      }
    } catch (error: any) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Arbitrage Marketplace Admin</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a
            href="/admin/previews"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#28a745',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
            }}
          >
            View All Previews →
          </a>
          <a
            href="/admin/listings"
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#6f42c1',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
            }}
          >
            View Listings →
          </a>
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #0070f3', borderRadius: '8px', backgroundColor: '#f0f7ff' }}>
        <h2>Full Pipeline</h2>
        <p>Scrapes previews, scrapes details, and imports everything to the database in one go.</p>

        <button
          onClick={runFullPipeline}
          disabled={fullLoading || loading}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: fullLoading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: fullLoading ? 'not-allowed' : 'pointer',
            marginTop: '1rem',
          }}
        >
          {fullLoading ? 'Running...' : 'Run Full Pipeline'}
        </button>

        {pipelineLog && (
          <pre
            ref={logRef}
            style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4',
              borderRadius: '4px',
              fontSize: '0.8rem',
              maxHeight: '400px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {pipelineLog}
            {fullLoading && <span style={{ opacity: 0.6 }}>▊</span>}
          </pre>
        )}
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Preview Scraper Only</h2>
        <p>Scrapes Facebook Marketplace listings and imports them to the database.</p>

        <button
          onClick={runScraper}
          disabled={loading || fullLoading}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: loading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginTop: '1rem',
          }}
        >
          {loading ? 'Running...' : 'Run Preview Scraper'}
        </button>

        <button
          onClick={fetchStats}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginTop: '1rem',
            marginLeft: '1rem',
          }}
        >
          Refresh Stats
        </button>
      </div>

      {stats && (
        <div style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #28a745', borderRadius: '8px', backgroundColor: '#f0f9ff' }}>
          <h3>Database Stats</h3>
          <ul style={{ lineHeight: '1.8' }}>
            <li><strong>Total previews:</strong> {stats.total}</li>
            <li><strong>Pending detail scrape:</strong> {stats.pending} ({stats.pendingPercentage}%)</li>
            <li><strong>Details scraped:</strong> {stats.scraped}</li>
          </ul>
        </div>
      )}

      {result && (
        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          border: `1px solid ${result.success ? '#28a745' : '#dc3545'}`,
          borderRadius: '8px',
          backgroundColor: result.success ? '#d4edda' : '#f8d7da',
        }}>
          <h3>{result.success ? '✓ Success' : '✗ Error'}</h3>

          {result.success ? (
            <>
              <p>{result.message}</p>
              {result.stats && (
                <ul style={{ marginTop: '1rem', lineHeight: '1.8' }}>
                  <li><strong>Total:</strong> {result.stats.total}</li>
                  <li><strong>Created:</strong> {result.stats.created}</li>
                  <li><strong>Updated:</strong> {result.stats.updated}</li>
                </ul>
              )}
              {result.scraperOutput && (
                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Scraper Output</summary>
                  <pre style={{
                    marginTop: '0.5rem',
                    padding: '1rem',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '4px',
                    overflow: 'auto',
                    fontSize: '0.85rem',
                  }}>
                    {result.scraperOutput}
                  </pre>
                </details>
              )}
            </>
          ) : (
            <>
              <p><strong>Error:</strong> {result.error}</p>
              {result.details && (
                <pre style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '0.85rem',
                }}>
                  {result.details}
                </pre>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
