export function isMafiaNightStageComplete(state: {
  round?: unknown;
  nightStage?: unknown;
  alive?: unknown;
  roles?: unknown;
  mafiaVotes?: unknown;
  loverVisit?: unknown;
  maniacActed?: unknown;
  doctorSave?: unknown;
  detectiveCheck?: unknown;
  donCheck?: unknown;
}): boolean {
  if (state.round === 1) return true;
  const roles = (state.roles ?? {}) as Record<string, string>;
  const alive = Array.isArray(state.alive) ? state.alive as string[] : [];
  if (state.nightStage === 'mafia') {
    const votes = (state.mafiaVotes ?? {}) as Record<string, unknown>;
    return alive.filter(id => roles[id] === 'mafia' || roles[id] === 'don').every(id => Boolean(votes[id]));
  }
  const actors = alive.filter(id => roles[id] === state.nightStage);
  if (!actors.length) return true;
  if (state.nightStage !== 'lover' && actors.every(id => id === state.loverVisit)) return true;
  switch (state.nightStage) {
    case 'lover': return Boolean(state.loverVisit);
    case 'maniac': return state.maniacActed === true;
    case 'doctor': return Boolean(state.doctorSave);
    case 'detective': return Boolean(state.detectiveCheck);
    case 'don': return Boolean(state.donCheck);
    default: return false;
  }
}
