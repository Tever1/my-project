import fs from 'fs/promises';
import path from 'path';

const OVERRIDES_PATH = path.join(process.cwd(), 'data', 'game-overrides.json');

interface GameOverride {
  deleted: string[];
  replaced: { originalId: string; replacement: unknown }[];
}
type AllOverrides = Record<string, GameOverride>;

export async function readOverrides(): Promise<AllOverrides> {
  try {
    return JSON.parse(await fs.readFile(OVERRIDES_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export async function writeOverrides(data: AllOverrides): Promise<void> {
  await fs.mkdir(path.dirname(OVERRIDES_PATH), { recursive: true });
  await fs.writeFile(OVERRIDES_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function applyOverridesBilingual(
  items: { ru: string; en: string }[],
  ov: GameOverride | undefined
): { ru: string; en: string }[] {
  if (!ov) return items;
  const filtered = items.filter((i) => !ov.deleted.includes(i.ru));
  const replacements = ov.replaced.map((r) => r.replacement as { ru: string; en: string });
  return [...filtered, ...replacements];
}

export function applyOverridesSimple(
  items: string[],
  ov: GameOverride | undefined
): string[] {
  if (!ov) return items;
  const filtered = items.filter((i) => !ov.deleted.includes(i));
  const replacements = ov.replaced.map((r) => r.replacement as string);
  return [...filtered, ...replacements];
}
