# TASK-188: Quiz — background on all screens + TV badge 3x bigger

## Проблемы и правки

---

### 1. Корневой баг: фон не появляется ни на каком экране

**Причина:** в `src/app/game/[roomId]/quiz/page.tsx` внутри `useRoomState` callback
проверяется `isGameHostRef.current`, но этот ref обновляется через `useEffect` ПОСЛЕ
рендера. На момент первого вызова callback'а ref ещё `false`, поэтому
`applyPreconfiguredQuiz` никогда не вызывается → `quiz:config` не рассылается →
ни у кого нет `specialQuizId` → `backgroundUrl = undefined`.

**Фикс в `src/app/game/[roomId]/quiz/page.tsx`:**

Найди функцию `getGuestPlayerId` вверху файла (она уже есть, читает localStorage).

В callback `useRoomState` (ищи строку `if (room.pendingQuizConfig && isGameHostRef.current)`)
замени проверку:
```ts
// Было:
if (room.pendingQuizConfig && isGameHostRef.current) {
  applyPreconfiguredQuiz(room.pendingQuizConfig);
}

// Стало:
const currentPlayerId = user?.id ?? getGuestPlayerId();
const isHostNow = Boolean(
  currentPlayerId &&
  nextGameHostPlayerId &&
  currentPlayerId === nextGameHostPlayerId
);
if (room.pendingQuizConfig && isHostNow) {
  applyPreconfiguredQuiz(room.pendingQuizConfig);
}
```

Переменная `nextGameHostPlayerId` уже вычислена выше в том же callback.
`user` доступен из hook'а `useUser()` который уже импортирован.

---

### 2. Фон в QR-экране лобби

После выбора квиза (до старта игры) лобби показывает QR-экран ожидания игроков.
Этот экран должен показывать фон спец-квиза если он выбран.

**Фикс в `src/components/lobby/Lobby.tsx`:**

В блоке QR waiting screen (ищи `if (myRole === "tv" && isWaitingForPlayers && roomCode)`),
до `return (`, добавь вычисление backgroundUrl:
```ts
const specialQuizBgUrl = pendingQuizConfig?.specialQuizId
  ? SPECIAL_QUIZZES.find(q => q.id === pendingQuizConfig.specialQuizId)?.backgroundUrl
  : undefined;
```

`SPECIAL_QUIZZES` уже импортирован в файле (проверь — если нет, добавь:
`import { SPECIAL_QUIZZES } from '@/lib/quiz'`).

`pendingQuizConfig` — это state уже существующий в компоненте (тип `PendingQuizConfig | null`).

В JSX `<main style={{...}}>` добавь фоновое изображение — прямо внутри `<main>`,
первым дочерним элементом:
```tsx
{specialQuizBgUrl && (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={specialQuizBgUrl}
    alt=""
    fetchPriority="high"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -1 }}
    aria-hidden="true"
  />
)}
```

И добавь `position: 'relative'` в style объект `<main>` чтобы img позиционировался внутри него.

---

### 3. ТВ (игровое поле): плашка с названием спец-квиза в 3 раза больше

**Фикс в `src/app/tv/[roomId]/[gameType]/page.tsx`:**

Найди в секции waiting phase (ищи `{specialQuizInfo ? (`  около строки 606-612):
```tsx
<span className="glass-badge px-4 py-2 text-lg inline-flex items-center gap-2">
  <QuizIcon iconUrl={specialQuizInfo.iconUrl} fallback={specialQuizInfo.icon} size={24} />
  {locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn}
</span>
```

Замени на:
```tsx
<span className="glass-badge px-12 py-8 text-5xl inline-flex items-center gap-5">
  <QuizIcon iconUrl={specialQuizInfo.iconUrl} fallback={specialQuizInfo.icon} size={72} />
  {locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn}
</span>
```

---

## Whitelist файлов
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/components/lobby/Lobby.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

## Не трогать
- Другие игры
- Логику сокетов кроме указанного
- CLAUDE.md, AGENTS.md, codex-tasks/

## Acceptance criteria
- `npm run lint` — чистый
- В `useRoomState` используется прямое чтение `user?.id ?? getGuestPlayerId()` для определения хоста
- QR-экран лобби показывает фон если выбран спец-квиз
- Плашка на ТВ в фазе waiting: `text-5xl px-12 py-8`, icon 72px

## Отчёт
Сохрани в `codex-reports/188-quiz-bg-all-screens-and-tv-badge.md`
