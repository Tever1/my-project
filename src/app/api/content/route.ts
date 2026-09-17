import { NextResponse } from 'next/server';
import { contentStore } from '@/lib/content/server';
import { withoutChecks } from '@/lib/content/catalog';
export const dynamic = 'force-dynamic';
export async function GET() {
  const published = await contentStore.published();
  return NextResponse.json({ revision: published.revision, catalog: withoutChecks(published.catalog) }, { headers: { 'Cache-Control': 'no-store' } });
}
