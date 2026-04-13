#!/usr/bin/env node
/**
 * Generate an image via OpenRouter -> Nano Banana (Gemini 2.5 Flash Image).
 *
 * Usage:
 *   node scripts/generate-image.mjs "<prompt>" [output-filename]
 *
 * Example:
 *   node scripts/generate-image.mjs "Dark gothic Hogwarts castle at night" hogwarts.png
 *
 * The image is saved to public/backgrounds/<filename>.
 * Requires OPENROUTER_API_KEY in .env.local.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Load .env.local manually (no dotenv dep needed)
function loadEnv() {
  const envPath = path.join(projectRoot, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found. Copy .env.local.example and fill in OPENROUTER_API_KEY.');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) {
      const [, key, rawValue] = match;
      const value = rawValue.replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

async function generateImage(prompt, outputName) {
  loadEnv();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('your-key-here')) {
    console.error('❌ OPENROUTER_API_KEY is not set in .env.local');
    process.exit(1);
  }

  console.log(`🎨 Generating image for prompt: "${prompt}"`);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_APP_URL ?? 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME ?? 'party-games-hub',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash-image-preview',
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      modalities: ['image', 'text'],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`❌ OpenRouter error ${response.status}:`);
    console.error(text);
    process.exit(1);
  }

  const data = await response.json();

  // The image comes back either in choices[0].message.images[] or as a data URL
  const message = data.choices?.[0]?.message;
  const images = message?.images ?? [];

  if (images.length === 0) {
    console.error('❌ No image in response:');
    console.error(JSON.stringify(data, null, 2));
    process.exit(1);
  }

  // images[0] is usually { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
  const first = images[0];
  const dataUrl = first.image_url?.url ?? first.url ?? first;

  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    console.error('❌ Unexpected image format:');
    console.error(JSON.stringify(first, null, 2));
    process.exit(1);
  }

  const base64 = dataUrl.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');

  const outputDir = path.join(projectRoot, 'public', 'backgrounds');
  fs.mkdirSync(outputDir, { recursive: true });

  const filename = outputName ?? `generated-${Date.now()}.png`;
  const finalName = filename.endsWith('.png') ? filename : `${filename}.png`;
  const outputPath = path.join(outputDir, finalName);
  fs.writeFileSync(outputPath, buffer);

  const sizeKb = (buffer.length / 1024).toFixed(1);
  console.log(`✅ Image saved: ${outputPath}`);
  console.log(`   Size: ${sizeKb} KB`);
  console.log(`   Public URL: /backgrounds/${finalName}`);

  // Print usage info if available
  if (data.usage) {
    console.log(`   Tokens: ${data.usage.total_tokens ?? '?'} (cost ≈ $${((data.usage.total_tokens ?? 0) / 1_000_000 * 30).toFixed(4)})`);
  }
}

const [, , promptArg, outputArg] = process.argv;
if (!promptArg) {
  console.error('Usage: node scripts/generate-image.mjs "<prompt>" [output-filename]');
  process.exit(1);
}

generateImage(promptArg, outputArg).catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
