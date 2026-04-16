#!/usr/bin/env node
/**
 * Generate a themed quiz background via OpenRouter -> Nano Banana.
 *
 * Usage (simple, recommended):
 *   npm run gen-image -- --theme "harry potter"
 *   npm run gen-image -- --theme "marvel" --name marvel-1
 *
 * Usage (custom prompt):
 *   npm run gen-image -- --prompt "Dark gothic castle at night" --name hogwarts
 *
 * If --name is omitted, the file is named after the theme (or timestamped).
 * The image is saved to public/backgrounds/<name>.png.
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

// Shared style guidelines that every background should follow.
const BASE_STYLE = [
  'cinematic wide landscape orientation',
  'atmospheric lighting',
  'rich colors',
  'high detail',
  'digital painting',
  'no text',
  'no watermark',
  'no characters in foreground',
  'empty negative space in the center for overlaid quiz content',
].join(', ');

// Theme presets: short name -> detailed scene description.
const THEMES = {
  'harry potter': 'magical castle Hogwarts at night, tall gothic towers, moonlight, mist drifting through courtyards, floating candles glowing, starry sky, mysterious fantasy atmosphere',
  'marvel': 'cinematic superhero city at twilight, dramatic skyscrapers lit by energy beams and explosions, armored figures silhouetted against stormy sky, lightning over the skyline, rubble and debris in the foreground, photorealistic digital painting, dramatic movie poster lighting, dark heroic atmosphere, NOT cartoon, NOT comic book style',
  'star wars': 'alien desert planet with twin suns setting, distant spaceships in the sky, sand dunes, sci-fi atmosphere, cinematic widescreen',
  'lord of the rings': 'vast Middle-earth landscape, rolling green hills, distant snowy mountains, epic fantasy atmosphere, warm golden hour lighting',
  'game of thrones': 'medieval castle on a cliff by the sea, stormy clouds, dramatic lighting, dark fantasy mood, northern cold tones',
  'disney': 'enchanted fairytale castle on a hilltop, soft pastel sky, magical sparkles, dreamy whimsical atmosphere, warm colors',
  'anime': 'vibrant anime cityscape at sunset, cherry blossoms, colorful sky, studio ghibli inspired, dreamy wide shot',
  'cyberpunk': 'neon-lit futuristic cyberpunk city at night, rain, holographic billboards, dark moody atmosphere, blade runner vibe',
  'sci-fi': 'deep space scene with distant nebulae and planets, stars, cosmic dust, science fiction atmosphere, wide cinematic shot',
  'nature': 'breathtaking mountain landscape with a lake reflection, sunrise, mist, peaceful serene mood, photorealistic',
  'history': 'ancient historical ruins, dramatic sky, warm golden light, epic archaeological atmosphere, cinematic',
  'sports': 'modern sports stadium interior at night, dramatic floodlights, empty field, energetic anticipation, wide shot',
  'music': 'concert stage with colorful lights and smoke, empty stage from audience perspective, energetic cinematic atmosphere',
  'food': 'abstract stylized food ingredients artfully arranged on a wooden table, warm lighting, appetizing cinematic still life',
  'space': 'breathtaking view of Earth from orbit with milky way galaxy in the background, cosmic beauty, cinematic',
  'halloween': 'spooky haunted mansion at night, full moon, fog, glowing jack-o-lanterns, eerie atmosphere, dark fantasy',
  'christmas': 'cozy winter village at night, snow falling, warm glowing windows, christmas lights, festive atmosphere',
};

function parseArgs(argv) {
  const args = { theme: null, prompt: null, name: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--theme' || a === '-t') args.theme = argv[++i];
    else if (a === '--prompt' || a === '-p') args.prompt = argv[++i];
    else if (a === '--name' || a === '-n') args.name = argv[++i];
    else if (!args.prompt && !args.theme) args.prompt = a; // positional fallback
    else if (!args.name) args.name = a;
  }
  return args;
}

function buildPromptFromTheme(theme) {
  const key = theme.toLowerCase().trim();
  const scene = THEMES[key] ?? `${theme} themed scene, vivid and atmospheric`;
  return `${scene}. Style: ${BASE_STYLE}.`;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `image-${Date.now()}`;
}

async function generateImage({ prompt, outputName, theme }) {
  loadEnv();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('your-key-here')) {
    console.error('❌ OPENROUTER_API_KEY is not set in .env.local');
    process.exit(1);
  }

  console.log(`🎨 Prompt: "${prompt}"`);

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
  const generationId = data.id;

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

  // Append to generation log for later cost reconciliation
  const logEntry = {
    timestamp: new Date().toISOString(),
    name: finalName.replace(/\.png$/, ''),
    theme: theme ?? null,
    generation_id: generationId ?? null,
    file: `public/backgrounds/${finalName}`,
  };
  const logPath = path.join(outputDir, '.generation-log.jsonl');
  fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');

  // Fetch real cost from OpenRouter generation endpoint
  await printRealCost(generationId, apiKey);
}

async function printRealCost(generationId, apiKey) {
  if (!generationId) {
    console.log('   Real cost: unavailable (no generation id in response)');
    return;
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`https://openrouter.ai/api/v1/generation?id=${generationId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (res.ok) {
        const gen = await res.json();
        if (gen.data?.total_cost != null) {
          const cost = gen.data.total_cost;
          const prompt_tokens = gen.data.tokens_prompt ?? '?';
          const completion_tokens = gen.data.tokens_completion ?? '?';
          console.log(`   Real cost: $${cost.toFixed(4)} (prompt: ${prompt_tokens} tokens, completion: ${completion_tokens} tokens)`);
          return;
        }
      }
    } catch {
      // ignore fetch errors, will retry
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log('   Real cost: unavailable right now (check OpenRouter dashboard: https://openrouter.ai/activity)');
}

function printUsage() {
  console.log(`
Usage:
  npm run gen-image -- --theme "<theme>" [--name <filename>]
  npm run gen-image -- --prompt "<custom prompt>" [--name <filename>]

Examples:
  npm run gen-image -- --theme "harry potter"
  npm run gen-image -- --theme "marvel" --name marvel-1
  npm run gen-image -- --prompt "Dark gothic castle at night" --name hogwarts

Available preset themes:
${Object.keys(THEMES).map((t) => `  • ${t}`).join('\n')}

Any other theme works too — just pass any phrase after --theme.
`);
}

const args = parseArgs(process.argv.slice(2));

if (!args.theme && !args.prompt) {
  printUsage();
  process.exit(1);
}

const finalPrompt = args.prompt ?? buildPromptFromTheme(args.theme);
const finalName = args.name ?? (args.theme ? slugify(args.theme) : null);

generateImage({ prompt: finalPrompt, outputName: finalName, theme: args.theme }).catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(1);
});
