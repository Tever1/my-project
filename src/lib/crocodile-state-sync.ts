export interface CrocodileTimedState {
  phase: string;
  turnNumber: number;
  explainerId: string;
  timeLeft: number;
}

export function mergeCrocodileStateSync<T extends CrocodileTimedState>(
  current: T | null,
  incoming: T,
): T {
  const isSameActiveTurn = current?.phase === 'explaining'
    && incoming.phase === 'explaining'
    && current.turnNumber === incoming.turnNumber
    && current.explainerId === incoming.explainerId;

  if (isSameActiveTurn && incoming.timeLeft > current.timeLeft) {
    return { ...incoming, timeLeft: current.timeLeft };
  }

  return incoming;
}
