import { NextResponse } from 'next/server';
import { withCodexAdmin } from '@/lib/admin-codex';
import { listQuizCheckReports } from '@/lib/quiz-check-reports';

export const POST = withCodexAdmin(async req => {
  const { quizKey } = await req.json();
  if (typeof quizKey !== 'string' || !quizKey || quizKey.length > 500) {
    return NextResponse.json({ error: 'Укажите квиз.' }, { status: 400 });
  }
  return NextResponse.json({ reports: await listQuizCheckReports(quizKey) }, { headers: { 'Cache-Control': 'no-store' } });
});
