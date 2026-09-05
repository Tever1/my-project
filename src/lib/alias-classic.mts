export const ALIAS_CLASSIC_TARGET_SCORE = 30;
export const ALIAS_LETTER_TARGET_SCORE = 15;

export interface AliasClassicTeamScore {
  id: string;
  score: number;
}

export function pickNextAliasLetter(
  letters: readonly string[],
  previousLetter = '',
  randomValue = Math.random(),
): string {
  const alternatives = letters.filter((letter) => letter !== previousLetter);
  const available = alternatives.length > 0 ? alternatives : [...letters];
  if (available.length === 0) return '';
  const index = Math.min(available.length - 1, Math.floor(randomValue * available.length));
  return available[index];
}

interface ScoreClassicTurnInput<T extends AliasClassicTeamScore> {
  teams: T[];
  activeTeamIndex: number;
  wordsGuessedBeforeFinal: number;
  wordsSkipped: number;
  finalWordTeamIndex: number;
}

export function scoreClassicTurn<T extends AliasClassicTeamScore>({
  teams,
  activeTeamIndex,
  wordsGuessedBeforeFinal,
  wordsSkipped,
  finalWordTeamIndex,
}: ScoreClassicTurnInput<T>): { teams: T[]; deltas: Record<string, number> } {
  const deltas = Object.fromEntries(teams.map((team) => [team.id, 0]));
  const activeTeam = teams[activeTeamIndex];
  const finalWordTeam = teams[finalWordTeamIndex];

  if (activeTeam) deltas[activeTeam.id] += wordsGuessedBeforeFinal - wordsSkipped;
  if (finalWordTeam) deltas[finalWordTeam.id] += 1;

  return {
    teams: teams.map((team) => ({ ...team, score: team.score + deltas[team.id] })),
    deltas,
  };
}

export function getAliasFinishingRound<T extends AliasClassicTeamScore>(
  currentFinishingRound: number | null,
  round: number,
  teams: T[],
  targetScore: number,
): number | null {
  if (currentFinishingRound !== null) return currentFinishingRound;
  return teams.some((team) => team.score >= targetScore) ? round : null;
}

export function shouldFinishAliasRound(
  activeTeamIndex: number,
  teamCount: number,
  round: number,
  finishingRound: number | null,
): boolean {
  return finishingRound !== null
    && round >= finishingRound
    && activeTeamIndex === teamCount - 1;
}
