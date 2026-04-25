import { NextRequest, NextResponse } from 'next/server';

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

const THEMES: Record<string, string> = {
  'harry-potter': 'magical castle Hogwarts at night, tall gothic towers, moonlight, mist drifting through courtyards, floating candles glowing, starry sky, mysterious fantasy atmosphere',
  'marvel': 'cinematic superhero city at twilight, dramatic skyscrapers lit by energy beams and explosions, armored figures silhouetted against stormy sky, lightning over the skyline, rubble and debris in the foreground, photorealistic digital painting, dramatic movie poster lighting, dark heroic atmosphere, NOT cartoon, NOT comic book style',
  'star-wars': 'alien desert planet with twin suns setting, distant spaceships in the sky, sand dunes, sci-fi atmosphere, cinematic widescreen',
  'lord-of-the-rings': 'vast Middle-earth landscape, rolling green hills, distant snowy mountains, epic fantasy atmosphere, warm golden hour lighting',
  'game-of-thrones': 'medieval castle on a cliff by the sea, stormy clouds, dramatic lighting, dark fantasy mood, northern cold tones',
  'disney': 'enchanted fairytale castle on a hilltop, soft pastel sky, magical sparkles, dreamy whimsical atmosphere, warm colors',
  'friends': 'cozy New York coffee shop interior, warm lighting, comfortable sofas, big windows with city view, welcoming atmosphere',
  'breaking-bad': 'vast New Mexico desert at sunset, abandoned industrial building, dramatic orange sky, dust and heat haze, cinematic wide shot',
  'the-office': 'suburban office park exterior at dusk, generic glass building, parking lot, mundane yet nostalgic atmosphere',
  'geography': 'breathtaking aerial view of diverse world landscapes, mountains, oceans, deserts, cinematic overview',
  'history': 'ancient historical ruins, dramatic sky, warm golden light, epic archaeological atmosphere, cinematic',
  'sports': 'modern sports stadium interior at night, dramatic floodlights, empty field, energetic anticipation, wide shot',
  'music': 'concert stage with colorful lights and smoke, empty stage from audience perspective, energetic cinematic atmosphere',
};

function buildPrompt(theme: string): string {
  const scene = THEMES[theme] ?? `${theme} themed scene, vivid and atmospheric`;
  return `${scene}. Style: ${BASE_STYLE}.`;
}

export async function POST(req: NextRequest) {
  const { theme, customPrompt } = await req.json() as { theme?: string; customPrompt?: string };

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not set in .env.local' }, { status: 500 });
  }

  const prompt = customPrompt?.trim() || buildPrompt(theme ?? '');

  let response: Response;
  try {
    response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'party-games-hub',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages: [{ role: 'user', content: prompt }],
        modalities: ['image', 'text'],
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: `Network error: ${(err as Error).message}` }, { status: 500 });
  }

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: `OpenRouter ${response.status}: ${text}` }, { status: 500 });
  }

  const data = await response.json();
  const images = data.choices?.[0]?.message?.images ?? [];

  if (images.length === 0) {
    return NextResponse.json({ error: 'No image returned by model' }, { status: 500 });
  }

  const first = images[0];
  const dataUrl: string = first.image_url?.url ?? first.url ?? first;

  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return NextResponse.json({ error: 'Unexpected image format' }, { status: 500 });
  }

  return NextResponse.json({ dataUrl, generationId: data.id ?? null });
}
