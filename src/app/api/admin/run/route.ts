import { NextRequest } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const ALLOWED_SCRIPTS = ['generate-questions.mjs', 'generate-image.mjs'];

export async function POST(req: NextRequest) {
  const { script, args = [] } = await req.json() as { script: string; args: string[] };

  if (!ALLOWED_SCRIPTS.includes(script)) {
    return new Response(JSON.stringify({ error: 'Script not allowed' }), { status: 400 });
  }

  const scriptPath = path.join(process.cwd(), 'scripts', script);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const child = spawn('node', [scriptPath, ...args], {
        cwd: process.cwd(),
        env: process.env,
      });

      child.stdout.on('data', (data: Buffer) => {
        controller.enqueue(encoder.encode(data.toString()));
      });

      child.stderr.on('data', (data: Buffer) => {
        controller.enqueue(encoder.encode(data.toString()));
      });

      child.on('close', (code) => {
        controller.enqueue(encoder.encode(`\n--- завершено с кодом ${code} ---\n`));
        controller.close();
      });

      child.on('error', (err) => {
        controller.enqueue(encoder.encode(`\n❌ Ошибка запуска: ${err.message}\n`));
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
