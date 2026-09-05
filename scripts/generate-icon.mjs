#!/usr/bin/env node
/**
 * Generate a single icon via OpenRouter -> Nano Banana.
 *
 * Designed for game tile icons and small UI graphics.
 * - Square canvas, transparent background, single subject (not a scene).
 * - 4 style presets: flat-3d / glassy / illustrative / mixed-3d.
 *
 * Usage:
 *   npm run gen-icon -- --subject "mafia mask" --style flat-3d --name mafia-flat3d
 *   npm run gen-icon -- --subject "magnifying glass" --style glassy --name spy-glassy
 *
 * If --name is omitted, the file is named after subject + style.
 * Saved to public/icons/test/<name>.png by default.
 * Use --out games for the production icon path public/icons/games/<name>.png.
 *
 * Requires OPENROUTER_API_KEY in .env.local.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(projectRoot, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found.');
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

// ---- Style presets ----
// Each preset returns the FULL prompt for a given subject + accent color.
const STYLES = {
  'flat-3d': (subject, accent) => [
    `A premium iOS-26-style 3D icon depicting ${subject}.`,
    `Smooth rounded matte plastic-and-glass material, soft volumetric lighting from upper-left,`,
    `gentle ambient occlusion, subtle ${accent} rim-light catching the silhouette.`,
    `Clean modern design like Apple Vision OS app icons or PlayStation 5 tile icons.`,
    `Centered subject filling 80% of the square canvas. Transparent background (PNG with alpha).`,
    `High detail, photoreal-3D-render quality, NOT cartoon, NOT flat illustration, NOT line art.`,
    `Square 1:1 aspect ratio. No text. No watermark. No background scenery.`,
  ].join(' '),

  'glassy': (subject, accent) => [
    `A liquid-glass icon depicting ${subject} in iOS 26 Liquid Glass style.`,
    `Translucent frosted-glass material with internal ${accent} glow,`,
    `subtle refraction, soft glassy reflections on the surface,`,
    `inner light radiating from the silhouette outward.`,
    `Centered subject filling 75% of the square canvas. Transparent background (PNG with alpha).`,
    `Premium minimalist design language, ethereal floating quality.`,
    `NOT solid 3D, NOT flat illustration. The whole subject must read as glass.`,
    `Square 1:1 aspect ratio. No text. No watermark. No background scenery.`,
  ].join(' '),

  'illustrative': (subject, accent) => [
    `A flat vector-style illustration of ${subject}.`,
    `Bold simplified silhouette with clean geometric shapes,`,
    `2-3 color palette dominated by ${accent} as the main accent,`,
    `minimal shading via 1-2 flat color steps, no gradients, no textures.`,
    `Style: Notion / Linear / Headspace illustrations. Modern SaaS aesthetic.`,
    `Centered subject filling 75% of the square canvas. Transparent background (PNG with alpha).`,
    `NOT 3D, NOT photoreal, NOT cluttered. Strong silhouette readable at 24px.`,
    `Square 1:1 aspect ratio. No text. No watermark. No background scenery.`,
  ].join(' '),

  'mixed-3d': (subject, accent) => [
    `A premium 3D icon of ${subject} combined with playful flat geometric shapes around it.`,
    `Main subject is rendered as a smooth matte 3D object with soft volumetric lighting,`,
    `surrounded by 2-3 flat ${accent}-colored geometric accents (circles, lines, sparks)`,
    `that emphasize movement or attention. Hybrid 3D-meets-flat aesthetic.`,
    `Centered subject filling 70% of the square canvas. Transparent background (PNG with alpha).`,
    `Style references: modern Apple Watch faces, Duolingo character icons.`,
    `Square 1:1 aspect ratio. No text. No watermark. No background scenery.`,
  ].join(' '),

  // v3 — Glassy with internal glow (Liquid Glass + soft inner light)
  'glassy-glow': (subject, accent) => [
    `A liquid-glass icon depicting ${subject}.`,
    `Style: iOS 26 Liquid Glass — translucent frosted-glass material with a subtle`,
    `internal ${accent} glow radiating softly from within the silhouette outward,`,
    `gentle refraction, smooth glassy reflections on every surface,`,
    `inner light visible through the translucent body of the figure.`,
    `Premium minimalist ethereal floating quality.`,
    `Centered subject filling 80% of the square canvas. Transparent background (PNG with alpha).`,
    `NOT solid 3D, NOT flat illustration, NOT photoreal. Whole subject reads as glass with faint inner glow.`,
    `Square 1:1 aspect ratio. No text. No watermark. No background scenery.`,
  ].join(' '),

  // v3 — Glassy WITHOUT internal glow (clear glass, only external light)
  'glassy-noglow': (subject /* no accent — pure glass */) => [
    `A liquid-glass icon depicting ${subject}.`,
    `Style: iOS 26 Liquid Glass — pure translucent frosted-glass material`,
    `with crisp glassy refractions and ambient reflections,`,
    `NO internal glow, NO inner light, NO colored lighting from within.`,
    `Just clean unlit glass catching soft ambient light from above and to the side.`,
    `Premium minimalist ethereal floating quality, monochromatic glass aesthetic.`,
    `Centered subject filling 80% of the square canvas. Transparent background (PNG with alpha).`,
    `NOT solid 3D, NOT flat illustration, NOT photoreal. Whole subject reads as clear unlit glass.`,
    `Square 1:1 aspect ratio. No text. No watermark. No background scenery.`,
  ].join(' '),
};

function parseArgs(argv) {
  const args = { subject: null, style: null, name: null, accent: '#a855f7', out: 'test' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--subject' || a === '-s') args.subject = argv[++i];
    else if (a === '--style') args.style = argv[++i];
    else if (a === '--name' || a === '-n') args.name = argv[++i];
    else if (a === '--accent' || a === '-a') args.accent = argv[++i];
    else if (a === '--out') args.out = argv[++i];
  }
  return args;
}

async function generateIcon({ subject, style, name, accent, out }) {
  loadEnv();

  if (!STYLES[style]) {
    console.error(`❌ Unknown style: "${style}". Choose: ${Object.keys(STYLES).join(', ')}`);
    process.exit(1);
  }
  if (!subject) {
    console.error('❌ --subject is required, e.g. --subject "mafia mask"');
    process.exit(1);
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('your-key-here')) {
    console.error('❌ OPENROUTER_API_KEY is not set in .env.local');
    process.exit(1);
  }

  const prompt = STYLES[style](subject, accent);
  console.log(`🎨 Style: ${style}  |  Subject: ${subject}  |  Accent: ${accent}`);
  console.log(`📝 Prompt (truncated): ${prompt.slice(0, 120)}...`);

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.OPENROUTER_APP_URL ?? 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME ?? 'party-games-hub',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.1-flash-image-preview',
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text'],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`❌ OpenRouter error ${response.status}: ${text.slice(0, 400)}`);
    process.exit(1);
  }

  const data = await response.json();
  const generationId = data.id;
  const images = data.choices?.[0]?.message?.images ?? [];
  if (images.length === 0) {
    console.error('❌ No image in response:', JSON.stringify(data, null, 2).slice(0, 500));
    process.exit(1);
  }

  const dataUrl = images[0].image_url?.url ?? images[0].url ?? images[0];
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    console.error('❌ Unexpected image format:', JSON.stringify(images[0]).slice(0, 300));
    process.exit(1);
  }

  const base64 = dataUrl.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');

  const outputDir = path.join(projectRoot, 'public', 'icons', out);
  fs.mkdirSync(outputDir, { recursive: true });

  const finalNameRaw = name ?? `${subject.replace(/\s+/g, '-')}-${style}`;
  const finalName = finalNameRaw.endsWith('.png') ? finalNameRaw : `${finalNameRaw}.png`;
  const outputPath = path.join(outputDir, finalName);

  fs.writeFileSync(outputPath, buffer);
  const sizeKb = (buffer.length / 1024).toFixed(1);
  console.log(`✅ Saved: public/icons/${out}/${finalName}  (${sizeKb} KB)`);

  // Log generation
  const logEntry = {
    timestamp: new Date().toISOString(),
    style,
    subject,
    accent,
    name: finalName.replace(/\.png$/, ''),
    generation_id: generationId ?? null,
    file: `public/icons/${out}/${finalName}`,
  };
  const logPath = path.join(projectRoot, 'public', 'icons', '.generation-log.jsonl');
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
}

const args = parseArgs(process.argv.slice(2));
generateIcon(args).catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
