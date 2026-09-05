# TASK-083 — Remove backdrop-blur from AuthDropdown / AccountDropdown panels on mobile

## Context

TASK-082 убрал scale-анимацию и blur с overlay-контейнера, но мерцание при
открытии AccountDropdown на iPhone 15 (A16) осталось. Причина — внутренние
панели обоих дропдаунов имеют `backdropFilter: 'blur(24px)'`, что слишком тяжело
для A16 GPU при mount (особенно панель AuthDropdown на мобильном — `width: 100%`).

Паттерн уже отработан в `RoomMenu` GlassPanel (around line 2067) — на мобильном
`backdropFilter: undefined` + плотный непрозрачный фон вместо frosted-glass.

## File

`src/components/lobby/Lobby.tsx` **only**

---

## Fix 1 — AuthDropdown panel

### Current (around line 1319, `panelStyle` in `AuthDropdown`):
```js
const panelStyle: React.CSSProperties = {
  width: isMobile ? '100%' : 320,
  maxWidth: isMobile ? 400 : undefined,
  background: 'rgba(255,255,255,0.28)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  padding: 24,
  boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${accent}22`,
};
```

### Fix:
На мобильном — solid background без blur. На десктопе — оставить как было.

```js
const panelStyle: React.CSSProperties = {
  width: isMobile ? '100%' : 320,
  maxWidth: isMobile ? 400 : undefined,
  background: isMobile ? 'rgba(20, 18, 32, 0.96)' : 'rgba(255,255,255,0.28)',
  backdropFilter: isMobile ? undefined : 'blur(24px)',
  WebkitBackdropFilter: isMobile ? undefined : 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 20,
  padding: 24,
  boxShadow: `0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px ${accent}22`,
};
```

---

## Fix 2 — AccountDropdown panel

### Current (around line 1519, `panelStyle` in `AccountDropdown`):
```js
const panelStyle: React.CSSProperties = {
  width: 220,
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16,
  padding: 8,
  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
};
```

### Fix:
То же — на мобильном solid background без blur. Принимает `isMobile` параметром
функции (уже есть в scope `AccountDropdown`).

```js
const panelStyle: React.CSSProperties = {
  width: 220,
  background: isMobile ? 'rgba(20, 18, 32, 0.96)' : 'rgba(255,255,255,0.08)',
  backdropFilter: isMobile ? undefined : 'blur(24px)',
  WebkitBackdropFilter: isMobile ? undefined : 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 16,
  padding: 8,
  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
};
```

---

## Whitelist

Только `src/components/lobby/Lobby.tsx`.

## Acceptance

1. `AuthDropdown` panel на мобильном — без `backdropFilter`, solid background `rgba(20,18,32,0.96)`.
2. `AccountDropdown` panel на мобильном — без `backdropFilter`, solid background `rgba(20,18,32,0.96)`.
3. Десктоп — без изменений (по-прежнему frosted glass).
4. `npm run lint` чистый.
5. `npm run build` проходит.

## Report

`codex-reports/083-auth-account-dropdown-panel-blur.md`
