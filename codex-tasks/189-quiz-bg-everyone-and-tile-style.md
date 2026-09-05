# TASK-189: Quiz — фон для всех клиентов + стиль плашек выбора квиза

## Проблема 1: фон не появляется на мобильной версии

Корень: клиент ждёт пока хост вызовет `applyPreconfiguredQuiz` → отправит
`quiz:config` всем → обновятся. Это ненадёжно из-за timing.

**Простой фикс:** в `useRoomState` callback, ВСЕ клиенты (не только хост) читают
`specialQuizId` из `room.pendingQuizConfig` и сразу применяют к `gameState.config`.
Фон определяется только из `config.specialQuizId` — вопросы не нужны для отображения фона.

**Файл: `src/app/game/[roomId]/quiz/page.tsx`**

В `useRoomState` callback (примерно строки 289-310) обнови `setGameState`:

```ts
// Было:
setGameState((prev) => ({
  ...prev,
  players: room.players,
  gameHostPlayerId: nextGameHostPlayerId,
}));

// Стало:
setGameState((prev) => {
  const pendingCfg = room.pendingQuizConfig;
  // Apply specialQuizId from server for background display — works for all clients
  const configPatch = (pendingCfg && prev.config.specialQuizId === null && pendingCfg.specialQuizId)
    ? {
        config: {
          ...prev.config,
          mode: pendingCfg.mode as 'general' | 'special',
          specialQuizId: pendingCfg.specialQuizId,
          specialTheme: SPECIAL_QUIZZES.find(q => q.id === pendingCfg.specialQuizId)?.theme ?? null,
        }
      }
    : {};
  return {
    ...prev,
    players: room.players,
    gameHostPlayerId: nextGameHostPlayerId,
    ...configPatch,
  };
});
```

`SPECIAL_QUIZZES` уже импортирован в файле (проверь — если нет, добавь импорт).

---

## Проблема 2: стиль плашек выбора квиза в лобби

Плашки `QuizSelectionTile` (компонент в конце `Lobby.tsx`) должны выглядеть как
варианты ответа в квизе:
- `rounded-md` (не `16px`)
- фон: `rgba(255,255,255,0.05)`
- граница: `1px solid rgba(255,255,255,0.10)`
- `backdrop-filter: blur(24px)`
- padding: `p-5` (~20px)

**Файл: `src/components/lobby/Lobby.tsx`**

Найди компонент `QuizSelectionTile` (в конце файла, около строки 2911).
Замени `style` объект `<motion.button>`:

```ts
// Было:
style={{
  width: 280,
  height: 180,
  borderRadius: 16,
  overflow: "hidden",
  cursor: "pointer",
  position: "relative",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  transition: "transform 150ms ease, box-shadow 150ms ease",
  padding: 0,
  textAlign: "left",
  fontFamily: "inherit",
  background: gradient ?? "#11131f",
}}

// Стало:
style={{
  width: 280,
  height: 180,
  borderRadius: 8,            // rounded-md ≈ 8px
  overflow: "hidden",
  cursor: "pointer",
  position: "relative",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  transition: "transform 150ms ease, box-shadow 150ms ease",
  padding: 20,
  textAlign: "left",
  fontFamily: "inherit",
  background: gradient ?? "rgba(255,255,255,0.05)",
}}
```

При этом, если у плашки есть фоновое изображение (`backgroundUrl`), оно остаётся
(абсолютное позиционирование), поверх `bg: rgba(255,255,255,0.05)` — хорошо, т.к.
изображение всё равно покрывает.

---

## Whitelist файлов
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/components/lobby/Lobby.tsx`

## Не трогать
- Логику сокетов, вопросы, другие игры
- CLAUDE.md, AGENTS.md, codex-tasks/

## Acceptance criteria
- `npm run lint` — чистый
- В `useRoomState` `setGameState` применяет `configPatch` с `specialQuizId` для всех клиентов
- `QuizSelectionTile` использует `borderRadius: 8`, `border: 1px solid rgba(255,255,255,0.10)`, `backdropFilter: blur(24px)`, `background: rgba(255,255,255,0.05)`

## Отчёт
Сохрани в `codex-reports/189-quiz-bg-everyone-and-tile-style.md`
