# TASK-252 — Крокодил: фон в цвет игры (красный), как у Шпиона

## Whitelist (трогать ТОЛЬКО эти файлы)
- `src/app/globals.css` — добавить класс `bg-gradient-crocodile`
- `src/app/game/[roomId]/crocodile/page.tsx` — применить на мобильном
- `src/app/tv/[roomId]/[gameType]/page.tsx` — применить на TV (крокодил)

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- серверный код, любые другие файлы и другие игры в TV/моб (только крокодил)

## Правила
- Минимальный diff, НЕ переформатировать. НЕ запускать `npm run build`.
- Валидация: `npm run lint` + `npx tsc --noEmit`. codex-reports не трогать.

## Контекст
Крокодил сейчас на нейтральном `bg-gradient-main` (тёмно-фиолетовый) и не в цвет игры.
Нужно дать ему красный фон в цвет игры (crocodile accent `#ef4444`, deep `#991b1b`),
по образцу уже существующего `bg-gradient-spy` (бирюзовый).

## Правки

### 1. `src/app/globals.css` — новый класс рядом с `bg-gradient-spy`
После блока `.bg-gradient-spy { ... }` (секция Background Gradients, ~строка 712)
добавить:
```css
.bg-gradient-crocodile {
  background: linear-gradient(135deg, #200707 0%, #3b0a0a 30%, #2a0c0c 60%, #200707 100%);
  color: #f0eef6;
}
```

### 2. `src/app/game/[roomId]/crocodile/page.tsx` — gradientClass у GameLayout
В вызове `<GameLayout ...>` (~строка 361) добавить проп `gradientClass`:
```tsx
    <GameLayout
      title={locale === 'ru' ? 'Крокодил' : 'Crocodile'}
      icon="🐊"
      round={currentRound}
      totalRounds={totalRounds}
      scores={layoutScores}
      onEnd={isGameHost ? endGame : undefined}
      showScoreboard={gameState?.phase === 'finished'}
      phaseKey={gameState?.phase ?? 'waiting'}
    >
```
→ добавить строку `gradientClass="bg-gradient-crocodile"` (например после `phaseKey`):
```tsx
      phaseKey={gameState?.phase ?? 'waiting'}
      gradientClass="bg-gradient-crocodile"
    >
```

### 3. `src/app/tv/[roomId]/[gameType]/page.tsx` — TV-блок крокодила
Найти GameSurface крокодила (~строка 1444):
```tsx
      <GameSurface className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">
```
заменить `bg-gradient-main` → `bg-gradient-crocodile` ТОЛЬКО в этом (крокодильем)
GameSurface:
```tsx
      <GameSurface className="h-screen bg-gradient-crocodile text-white flex flex-col overflow-hidden">
```
ВАЖНО: в этом файле несколько `GameSurface ... bg-gradient-main` (другие игры) — менять
ТОЛЬКО блок крокодила (тот, что вокруг крокодильего рендера, ~1444). Остальные не трогать.

## Acceptance
- `npm run lint` чисто, `npx tsc --noEmit` чисто.
- diff только в трёх whitelisted-файлах; в TV изменён ровно один GameSurface (крокодил).
- Крокодил (моб + TV) на красном `bg-gradient-crocodile`, остальные игры не затронуты.
