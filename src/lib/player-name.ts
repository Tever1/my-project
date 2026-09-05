export const MAX_PLAYER_NAME_LENGTH = 10;

function splitIntoGraphemes(value: string): string[] {
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  return Array.from(segmenter.segment(value), ({ segment }) => segment);
}

export function limitPlayerName(value: string): string {
  return splitIntoGraphemes(value).slice(0, MAX_PLAYER_NAME_LENGTH).join('');
}

export function normalizePlayerName(value: unknown): string {
  return typeof value === 'string' ? limitPlayerName(value.trim()) : '';
}

const playerName = {
  MAX_PLAYER_NAME_LENGTH,
  limitPlayerName,
  normalizePlayerName,
};

export default playerName;
