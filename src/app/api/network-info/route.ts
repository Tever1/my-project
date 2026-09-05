import { NextResponse } from 'next/server';
import { networkInterfaces } from 'os';

export const dynamic = 'force-dynamic';

export function GET() {
  const nets = networkInterfaces();
  let localIP = '';
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        localIP = net.address;
        break;
      }
    }
    if (localIP) break;
  }

  return NextResponse.json({ ip: localIP || 'localhost' });
}
