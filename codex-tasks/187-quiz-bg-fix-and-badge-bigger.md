# TASK-187: Quiz — fix background timing + make quiz badge 3x bigger

## Файл
`src/app/game/[roomId]/quiz/page.tsx`

## Проблема 1: Фон не показывается при спец-квизе

`room:state` приходит до того, как `guestPlayerId` проставляется в state.
Из-за этого условие на строке ~301:
```ts
if (room.pendingQuizConfig && effectivePlayerId && effectivePlayerId === nextGameHostPlayerId) {
```
…никогда не выполняется (effectivePlayerId пуст), `applyPreconfiguredQuiz` не вызывается,
`quiz:config` не рассылается, у всех игроков остаётся `specialQuizId: null` → backgroundUrl = undefined.

### Фикс
Замени проверку на `isGameHostRef.current` — это ref, который обновляется синхронно:
```ts
// Было:
if (room.pendingQuizConfig && effectivePlayerId && effectivePlayerId === nextGameHostPlayerId) {
  applyPreconfiguredQuiz(room.pendingQuizConfig);
}

// Стало:
if (room.pendingQuizConfig && isGameHostRef.current) {
  applyPreconfiguredQuiz(room.pendingQuizConfig);
}
```

## Проблема 2: Плашка с названием квиза слишком маленькая

В фазе `waiting` есть badge для спец-квиза (строки ~660-664):
```tsx
<span className="glass-badge px-5 py-2.5 text-lg inline-flex items-center gap-2">
  <QuizIcon iconUrl={specialQuizInfo.iconUrl} fallback={specialQuizInfo.icon} size={20} />
  {locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn}
</span>
```

Нужно сделать в 3 раза крупнее. Замени на:
```tsx
<span className="glass-badge px-10 py-6 text-4xl inline-flex items-center gap-4">
  <QuizIcon iconUrl={specialQuizInfo.iconUrl} fallback={specialQuizInfo.icon} size={56} />
  {locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn}
</span>
```

## Whitelist файлов
- `src/app/game/[roomId]/quiz/page.tsx`

## Не трогать
- Фазу question, results, final, mid-leaderboard
- Другие игры
- CLAUDE.md, AGENTS.md, codex-tasks/

## Acceptance criteria
- `npm run lint` — чистый
- Условие в useRoomState использует `isGameHostRef.current`
- Badge в waiting-фазе использует `text-4xl px-10 py-6` и icon size 56

## Отчёт
Сохрани в `codex-reports/187-quiz-bg-fix-and-badge-bigger.md`
