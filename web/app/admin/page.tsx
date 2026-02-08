'use client';

import { useState, useRef } from 'react';

export default function AdminPage() {
  const [comboLoading, setComboLoading] = useState(false);
  const [comboLog, setComboLog] = useState('');
  const [granularLoading, setGranularLoading] = useState<string | null>(null);
  const [granularLog, setGranularLog] = useState('');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const comboLogRef = useRef<HTMLPreElement>(null);
  const granularLogRef = useRef<HTMLPreElement>(null);

  const anyRunning = comboLoading || !!granularLoading;

  async function streamEndpoint(
    url: string,
    setLog: (fn: (prev: string) => string) => void,
    ref: React.RefObject<HTMLPreElement | null>,
  ) {
    const res = await fetch(url, { method: 'POST' });
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setLog((prev) => {
        const next = prev + decoder.decode(value, { stream: true });
        setTimeout(() => {
          if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
        }, 0);
        return next;
      });
    }
  }

  async function runScrapeAndPrice() {
    setComboLoading(true);
    setComboLog('');
    try {
      await streamEndpoint('/api/scrape-and-price', setComboLog, comboLogRef);
    } catch (error: any) {
      setComboLog((prev) => prev + `\n✗ Error: ${error.message}\n`);
    } finally {
      setComboLoading(false);
    }
  }

  async function runGranular(label: string, url: string, streaming: boolean) {
    setGranularLoading(label);
    setGranularLog('');
    setPreviewResult(null);
    try {
      if (streaming) {
        await streamEndpoint(url, setGranularLog, granularLogRef);
      } else {
        const res = await fetch(url, { method: 'POST' });
        const data = await res.json();
        setPreviewResult(data);
        if (data.success) await fetchStats();
      }
    } catch (error: any) {
      setGranularLog((prev) => prev + `\n✗ Error: ${error.message}\n`);
    } finally {
      setGranularLoading(null);
    }
  }

  async function fetchStats() {
    const res = await fetch('/api/scrape-previews');
    setStats(await res.json());
  }

  const terminal = (log: string, ref: React.RefObject<HTMLPreElement | null>, loading: boolean) =>
    log ? (
      <pre
        ref={ref}
        style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: '#0a0a0a',
          color: '#e0e0e0',
          borderRadius: '8px',
          fontSize: '0.78rem',
          lineHeight: '1.5',
          maxHeight: '500px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
          border: '1px solid #222',
        }}
      >
        {log}
        {loading && <span style={{ opacity: 0.5 }}>▊</span>}
      </pre>
    ) : null;

  const sectionStyle = {
    padding: '1.5rem',
    borderRadius: '12px',
    backgroundColor: '#fafafa',
    border: '1px solid #e5e7eb',
  };

  const sectionTitle = (text: string) => (
    <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600, color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
      {text}
    </h3>
  );

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '860px', margin: '0 auto', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      <h1 style={{ margin: '0 0 2rem', fontSize: '1.5rem', fontWeight: 700, color: '#111' }}>Admin</h1>

      {/* Main Action */}
      <div style={{
        padding: '2rem',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        textAlign: 'center',
        marginBottom: '1.5rem',
      }}>
        <button
          onClick={runScrapeAndPrice}
          disabled={anyRunning}
          style={{
            padding: '1rem 2.5rem',
            fontSize: '1.15rem',
            fontWeight: 700,
            backgroundColor: anyRunning ? '#334155' : '#3b82f6',
            color: anyRunning ? '#94a3b8' : '#fff',
            border: 'none',
            borderRadius: '10px',
            cursor: anyRunning ? 'not-allowed' : 'pointer',
            boxShadow: anyRunning ? 'none' : '0 4px 20px rgba(59, 130, 246, 0.4)',
            transition: 'all 0.2s',
          }}
        >
          {comboLoading ? 'Running Pipeline...' : 'Scrape Listings + Estimate Prices'}
        </button>
        <p style={{ marginTop: '0.6rem', color: '#64748b', fontSize: '0.83rem', margin: '0.6rem 0 0' }}>
          Scrapes marketplace, imports to DB, then runs AI price estimates
        </p>
        {terminal(comboLog, comboLogRef, comboLoading)}
      </div>

      {/* Granular: Scrape Only */}
      <div style={{ ...sectionStyle, marginBottom: '1rem' }}>
        {sectionTitle('Scrape Only')}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => runGranular('full', '/api/scrape-full', true)}
            disabled={anyRunning}
            style={btnStyle(anyRunning, granularLoading === 'full')}
          >
            {granularLoading === 'full' ? 'Running...' : 'Full Scrape + Import'}
          </button>
          <button
            onClick={() => runGranular('previews', '/api/scrape-previews', false)}
            disabled={anyRunning}
            style={btnStyle(anyRunning, granularLoading === 'previews')}
          >
            {granularLoading === 'previews' ? 'Running...' : 'Previews Only'}
          </button>
        </div>
      </div>

      {/* Granular: Price Eval */}
      <div style={{ ...sectionStyle, marginBottom: '1rem' }}>
        {sectionTitle('Price Evaluation')}
        <button
          onClick={() => runGranular('price', '/api/price-eval', true)}
          disabled={anyRunning}
          style={btnStyle(anyRunning, granularLoading === 'price')}
        >
          {granularLoading === 'price' ? 'Running...' : 'Run Price Eval'}
        </button>
      </div>

      {/* Granular: Stats */}
      <div style={sectionStyle}>
        {sectionTitle('Database')}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={fetchStats} disabled={anyRunning} style={btnStyle(anyRunning, false)}>
            Refresh Stats
          </button>
          {[
            { href: '/admin/previews', label: 'View Previews' },
            { href: '/admin/listings', label: 'View Listings' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: '#555',
                textDecoration: 'none',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                backgroundColor: '#fff',
              }}
            >
              {link.label}
            </a>
          ))}
        </div>
        {stats && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#444', display: 'flex', gap: '2rem' }}>
            <span><strong>{stats.total}</strong> previews</span>
            <span><strong>{stats.pending}</strong> pending</span>
            <span><strong>{stats.scraped}</strong> scraped</span>
          </div>
        )}
      </div>

      {/* Shared terminal + results for granular actions */}
      {terminal(granularLog, granularLogRef, !!granularLoading)}

      {previewResult && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          backgroundColor: previewResult.success ? '#f0fdf4' : '#fef2f2',
          borderRadius: '8px',
          border: `1px solid ${previewResult.success ? '#bbf7d0' : '#fecaca'}`,
          fontSize: '0.85rem',
        }}>
          {previewResult.success ? (
            <span style={{ color: '#166534' }}>
              {previewResult.message}
              {previewResult.stats && ` (${previewResult.stats.created} new, ${previewResult.stats.updated} updated)`}
            </span>
          ) : (
            <span style={{ color: '#991b1b' }}>Error: {previewResult.error}</span>
          )}
        </div>
      )}
    </div>
  );
}

function btnStyle(disabled: boolean, active: boolean) {
  return {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 500 as const,
    backgroundColor: disabled ? '#e5e7eb' : active ? '#e0e7ff' : '#fff',
    color: disabled ? '#aaa' : '#333',
    border: `1px solid ${active ? '#818cf8' : '#d1d5db'}`,
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' as const : 'pointer' as const,
    transition: 'all 0.15s',
  };
}
