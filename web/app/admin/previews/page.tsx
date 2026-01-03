import { PrismaClient } from '@prisma/client';
import Link from 'next/link';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic'; // Disable caching for this page

async function getPreviews() {
  return await prisma.listingPreview.findMany({
    orderBy: [
      { detailsScrapedAt: 'asc' }, // Unscraped first (nulls first)
      { lastSeenAt: 'desc' },      // Then by most recent
    ],
    include: {
      listing: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
}

export default async function PreviewsPage() {
  const previews = await getPreviews();
  const totalPreviews = previews.length;
  const unscraped = previews.filter(p => !p.detailsScrapedAt).length;
  const scraped = totalPreviews - unscraped;

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Listing Previews</h1>
          <Link href="/admin" style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#0070f3',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '4px'
          }}>
            ← Back to Admin
          </Link>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div style={{
            padding: '1.5rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0070f3' }}>
              {totalPreviews}
            </div>
            <div style={{ color: '#666', marginTop: '0.5rem' }}>Total Previews</div>
          </div>

          <div style={{
            padding: '1.5rem',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            backgroundColor: '#fff9e6'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f57c00' }}>
              {unscraped}
            </div>
            <div style={{ color: '#666', marginTop: '0.5rem' }}>Pending Scrape</div>
          </div>

          <div style={{
            padding: '1.5rem',
            border: '1px solid #28a745',
            borderRadius: '8px',
            backgroundColor: '#e8f5e9'
          }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
              {scraped}
            </div>
            <div style={{ color: '#666', marginTop: '0.5rem' }}>Details Scraped</div>
          </div>
        </div>

        {/* Table */}
        <div style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: 'white'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9rem'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '1rem', textAlign: 'left', width: '60px' }}>Image</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Title</th>
                <th style={{ padding: '1rem', textAlign: 'left', width: '100px' }}>Price</th>
                <th style={{ padding: '1rem', textAlign: 'left', width: '150px' }}>Location</th>
                <th style={{ padding: '1rem', textAlign: 'center', width: '140px' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', width: '180px' }}>First Seen</th>
                <th style={{ padding: '1rem', textAlign: 'left', width: '180px' }}>Last Seen</th>
                <th style={{ padding: '1rem', textAlign: 'left', width: '180px' }}>Details Scraped</th>
              </tr>
            </thead>
            <tbody>
              {previews.map((preview) => {
                const isScraped = !!preview.detailsScrapedAt;
                const rowStyle = {
                  borderBottom: '1px solid #eee',
                  backgroundColor: isScraped ? '#f0fff4' : 'white',
                };

                return (
                  <tr key={preview.id} style={rowStyle}>
                    <td style={{ padding: '0.75rem' }}>
                      {preview.imageUrl ? (
                        <img
                          src={preview.imageUrl}
                          alt={preview.title}
                          style={{
                            width: '50px',
                            height: '50px',
                            objectFit: 'cover',
                            borderRadius: '4px'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: '#e0e0e0',
                          borderRadius: '4px'
                        }} />
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <a
                        href={preview.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#0070f3',
                          textDecoration: 'none',
                          fontWeight: 500
                        }}
                      >
                        {preview.title}
                      </a>
                      {preview.listing && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#28a745',
                          marginTop: '0.25rem'
                        }}>
                          ✓ Linked to listing
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                      {preview.price}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#666' }}>
                      {preview.location || 'N/A'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        backgroundColor: isScraped ? '#d4edda' : '#fff3cd',
                        color: isScraped ? '#155724' : '#856404',
                        border: `1px solid ${isScraped ? '#c3e6cb' : '#ffeaa7'}`,
                      }}>
                        {isScraped ? '✓ Scraped' : '⏳ Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                      {new Date(preview.firstSeenAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                      {new Date(preview.lastSeenAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
                      {isScraped ? new Date(preview.detailsScrapedAt!).toLocaleString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {previews.length === 0 && (
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            color: '#666',
            border: '1px solid #ddd',
            borderRadius: '8px',
            marginTop: '2rem'
          }}>
            No previews found. Run the preview scraper to get started!
          </div>
        )}
      </div>
    </div>
  );
}
