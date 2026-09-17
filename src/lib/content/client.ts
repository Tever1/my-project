import { installQuizCatalog } from '@/lib/quiz';
import { WHO_AM_I_CHARACTERS } from '@/lib/game-data';
import type { GameCatalog } from './catalog';
let inFlight: Promise<void> | undefined;
export async function refreshGameContent(): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const response = await fetch('/api/content', { cache: 'no-store' });
    if (!response.ok) throw new Error('Не удалось загрузить игровой контент / Game content unavailable');
    const data = await response.json() as { catalog: GameCatalog };
    installQuizCatalog(data.catalog);
    WHO_AM_I_CHARACTERS.splice(0, WHO_AM_I_CHARACTERS.length, ...data.catalog.characters.map(({ ru, en }) => ({ ru, en })));
  })();
  try { await inFlight; } finally { inFlight = undefined; }
}
