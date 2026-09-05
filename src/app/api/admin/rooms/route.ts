import { NextResponse } from 'next/server';
import { getRoomsSnapshot } from '@/lib/rooms-registry';

export async function GET() {
  const rooms = getRoomsSnapshot();
  return NextResponse.json({ rooms, updatedAt: Date.now() });
}
