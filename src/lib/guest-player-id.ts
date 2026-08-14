const GUEST_ID_KEY = 'party-hub-join-guest-id';

export function getGuestPlayerId() {
  if (typeof window === 'undefined') return '';

  const existing = window.sessionStorage.getItem(GUEST_ID_KEY);
  if (existing) return existing;

  const migratedKey = Object.keys(window.sessionStorage).find((key) =>
    key.startsWith(`${GUEST_ID_KEY}:`),
  );
  if (migratedKey) {
    const migratedId = window.sessionStorage.getItem(migratedKey);
    if (migratedId) {
      window.sessionStorage.setItem(GUEST_ID_KEY, migratedId);
      return migratedId;
    }
  }

  const next = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  window.sessionStorage.setItem(GUEST_ID_KEY, next);
  return next;
}
