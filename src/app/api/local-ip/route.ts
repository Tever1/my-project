import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const interfaces = os.networkInterfaces();
  let localIp = '';
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface ?? []) {
      if (alias.family === 'IPv4' && !alias.internal) {
        localIp = alias.address;
        break;
      }
    }
    if (localIp) break;
  }
  return NextResponse.json({ ip: localIp });
}
