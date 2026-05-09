import os from 'os';
import { NextResponse } from 'next/server';

export async function GET() {
  const nets = os.networkInterfaces();
  let ip: string | null = null;

  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue;
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ip = iface.address;
        break;
      }
    }
    if (ip) break;
  }

  return NextResponse.json({ ip: ip ?? 'localhost' });
}
