'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface PriceEstimate {
  estimatedPrice: string | null;
}

interface Listing {
  id: string;
  title: string;
  price: string;
  description: string | null;
  condition: string | null;
  location: string | null;
  imageUrls: string[];
  sourceUrl: string;
  listedAt: string | null;
  scrapedAt: string;
  priceEstimate: PriceEstimate | null;
}

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const lastClickedIndex = useRef<number | null>(null);
  const shiftHeld = useRef(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftHeld.current = true; };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') shiftHeld.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  async function fetchListings() {
    const res = await fetch('/api/listings');
    const data = await res.json();
    setListings(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchListings();
  }, []);

  function toggleOne(index: number, shiftKey: boolean) {
    const id = listings[index].id;
    const anchor = lastClickedIndex.current;
    lastClickedIndex.current = index;
    setSelected((prev) => {
      const next = new Set(prev);
      if (shiftKey && anchor !== null) {
        const lo = Math.min(anchor, index);
        const hi = Math.max(anchor, index);
        const adding = !prev.has(id);
        for (let i = lo; i <= hi; i++) {
          if (adding) next.add(listings[i].id);
          else next.delete(listings[i].id);
        }
      } else {
        if (next.has(id)) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === listings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(listings.map((l) => l.id)));
    }
  }

  async function handleDeleteSelected() {
    if (selected.size === 0) return;
    setDeleting(true);
    const ids = Array.from(selected);
    await fetch('/api/listings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    setListings((prev) => prev.filter((l) => !selected.has(l.id)));
    setSelected(new Set());
    setDeleting(false);
  }

  const allSelected = listings.length > 0 && selected.size === listings.length;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Listings ({loading ? '…' : listings.length})</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {selected.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                disabled={deleting}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: deleting ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                }}
              >
                {deleting ? 'Deleting…' : `Delete ${selected.size} selected`}
              </button>
            )}
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
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>Loading…</div>
        ) : listings.length === 0 ? (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '8px',
          }}>
            No listings found. Run the full pipeline to scrape listings.
          </div>
        ) : (
          <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'white' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'center', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', width: '60px' }}>Image</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Title</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', width: '90px' }}>Price</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', width: '90px' }}>AI Price</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', width: '130px' }}>Location</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', width: '100px' }}>Condition</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', width: '200px' }}>Description</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', width: '150px' }}>Scraped At</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', width: '150px' }}>Listed At</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing, index) => (
                  <tr
                    key={listing.id}
                    style={{
                      borderBottom: '1px solid #eee',
                      backgroundColor: selected.has(listing.id) ? '#fff3cd' : undefined,
                    }}
                  >
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selected.has(listing.id)}
                        onChange={() => toggleOne(index, shiftHeld.current)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {listing.imageUrls[0] ? (
                        <img
                          src={listing.imageUrls[0]}
                          alt={listing.title}
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      ) : (
                        <div style={{ width: '50px', height: '50px', backgroundColor: '#e0e0e0', borderRadius: '4px' }} />
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <a
                        href={listing.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0070f3', textDecoration: 'none', fontWeight: 500 }}
                      >
                        {listing.title}
                      </a>
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{listing.price}</td>
                    <td style={{ padding: '0.75rem', color: '#28a745' }}>
                      {listing.priceEstimate?.estimatedPrice || '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#666' }}>{listing.location || '—'}</td>
                    <td style={{ padding: '0.75rem', color: '#666' }}>{listing.condition || '—'}</td>
                    <td style={{ padding: '0.75rem', color: '#666' }}>
                      {listing.description
                        ? listing.description.length > 80
                          ? listing.description.slice(0, 80) + '…'
                          : listing.description
                        : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#666' }}>
                      {new Date(listing.scrapedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: '#666' }}>
                      {listing.listedAt ? new Date(listing.listedAt).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
