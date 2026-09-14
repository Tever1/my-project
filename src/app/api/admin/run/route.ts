import { NextResponse } from 'next/server';
import { withCodexAdmin } from '@/lib/admin-codex';

export const POST = withCodexAdmin(async () => NextResponse.json({ error: 'Запуск старых внешних генераторов отключён.' }, { status: 410 }));
