import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const listings = await prisma.listing.findMany({
    orderBy: { scrapedAt: 'desc' },
    include: { priceEstimate: true },
  });
  return NextResponse.json(listings);
}

export async function DELETE(req: Request) {
  const { ids } = await req.json() as { ids: string[] };
  await prisma.listing.deleteMany({ where: { id: { in: ids } } });
  return NextResponse.json({ success: true });
}
