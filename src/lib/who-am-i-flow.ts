export interface WhoAmITurnState {
  turnOrder: string[];
  guessedPlayers: string[];
  currentTurnIndex: number;
}

// The cursor always refers to the original order, never the filtered roster.
export function getWhoAmIActivePlayerId(state: WhoAmITurnState): string | null {
  for (let offset = 0; offset < state.turnOrder.length; offset += 1) {
    const id = state.turnOrder[(state.currentTurnIndex + offset) % state.turnOrder.length];
    if (!state.guessedPlayers.includes(id)) return id;
  }
  return null;
}

export function getWhoAmINextTurnIndex(state: WhoAmITurnState): number {
  const activeId = getWhoAmIActivePlayerId(state);
  return activeId === null ? 0 : (state.turnOrder.indexOf(activeId) + 1) % state.turnOrder.length;
}

export interface WhoAmIFocusState extends WhoAmITurnState {
  phase: string;
  guessNeedsConfirm: boolean;
  guessAwaitingJudge: boolean;
  guessPendingPlayerId: string;
  guessJudgeId: string;
}

export function getWhoAmIPhoneFocus(
  state: WhoAmIFocusState,
  playerId: string | null,
  showGuessInput: boolean,
): 'main' | 'confirm' | 'judge' | 'input' {
  if (state.phase !== 'playing' || !playerId) return 'main';
  if (state.guessAwaitingJudge && state.guessJudgeId === playerId) return 'judge';
  if (state.guessNeedsConfirm && state.guessPendingPlayerId === playerId) return 'confirm';
  if (state.guessNeedsConfirm || state.guessAwaitingJudge) return 'main';
  return showGuessInput && getWhoAmIActivePlayerId(state) === playerId ? 'input' : 'main';
}

const whoAmIFlow = { getWhoAmIActivePlayerId, getWhoAmINextTurnIndex, getWhoAmIPhoneFocus };
export default whoAmIFlow;
