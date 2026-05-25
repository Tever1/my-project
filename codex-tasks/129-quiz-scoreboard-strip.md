# TASK-129: Quiz scoreboard strip + smaller button radius

> **Метаданные**
> - **Дата создания:** 2026-05-22
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~15 минут
> - **Зависит от тасков:** TASK-128 (merged)

---

## Цель

1. Уменьшить border-radius кнопок ответов квиза с `rounded-xl` (12px) до `rounded`
   (4px) — в 3 раза меньше.
2. Полностью переделать панель игроков в `GameLayout`: вместо мелких бейджей
   справа — горизонтальная полоса на всю ширину с карточками игроков, аватарами,
   очками, статусом ответа (галочка / …) и зелёным хайлайтом за верный ответ.

---

## Контекст

Скриншот целевого дизайна: горизонтальная тёмная полоса, слева «В ИГРЕ / N игроков»,
далее карточки игроков. Каждая карточка: цветной кружок-аватар с инициалом,
никнейм, очки зелёным, разделитель, и либо галочка ✓ (ответил), либо «…» (ждём).
Когда ответ верный — рамка карточки подсвечивается зелёным.

`PlayerAvatar` компонент уже существует в `src/components/ui/PlayerAvatar.tsx` и
автоматически делает градиентный кружок по первой букве никнейма — использовать его.

Текущий `scores` тип: `{ name: string; score: number }[]`.
Нужно расширить: добавить опциональные `hasAnswered?: boolean` и `isCorrect?: boolean`.

Квиз передаёт в GameLayout `scores={scoreboard}`, где `scoreboard` строится из
`gameState.players`, `gameState.scores`, `gameState.answers`, `gameState.correctPlayers`.

---

## Файлы к изменению (whitelist)

- `src/components/games/GameLayout.tsx` — расширить тип `scores`, переделать header-полосу
- `src/app/game/[roomId]/quiz/page.tsx` — расширить `scoreboard` mapping + уменьшить radius

### НЕ ТРОГАТЬ

- `src/components/ui/PlayerAvatar.tsx` — только читаем, не меняем
- `src/app/tv/[roomId]/[gameType]/page.tsx` — TV не трогаем
- `src/app/game/[roomId]/alias/page.tsx` — не трогаем
- `CLAUDE.md`, `AGENTS.md`
- все остальные файлы вне whitelist

---

## Шаги реализации

### 1. `GameLayout.tsx` — расширить тип `scores`

```ts
scores?: {
  name: string;
  score: number;
  hasAnswered?: boolean;
  isCorrect?: boolean;
}[];
```

### 2. `GameLayout.tsx` — убрать старый inline-scoreboard из правой части хедера

Удалить блок:
```tsx
{showScoreboard && sortedScores.length > 0 && (
  <>
    {/* Desktop: show all players inline */}
    ...
    {/* Mobile: toggle button */}
    ...
  </>
)}
```

Также удалить мобильный dropdown (весь блок `{/* Mobile scoreboard dropdown */}`
ниже `</header>`). Он заменяется новой полосой.

Убрать `useState(scoreboardOpen)` и `setScoreboardOpen` — они больше не нужны.

### 3. `GameLayout.tsx` — добавить импорт PlayerAvatar

```ts
import { PlayerAvatar } from '@/components/ui';
```

### 4. `GameLayout.tsx` — добавить горизонтальную полосу игроков внутри `<header>`

Добавить НИЖЕ текущего первого `<div>` с title/кнопками, но ещё внутри `<header>`:

```tsx
{showScoreboard && scores && scores.length > 0 && (
  <div className="border-t border-white/10 px-4 py-2">
    <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
      {/* Label */}
      <div className="flex-shrink-0 pr-3 border-r border-white/15">
        <p className="text-[10px] uppercase tracking-widest text-white/40 leading-tight">
          {locale === 'ru' ? 'В ИГРЕ' : 'PLAYING'}
        </p>
        <p className="text-sm font-bold leading-tight">{scores.length}</p>
      </div>

      {/* Player cards — не сортируем здесь, отображаем как пришли */}
      {scores.map((entry) => {
        const isAnswered = entry.hasAnswered;
        const isCorrect = entry.isCorrect;

        return (
          <div
            key={entry.name}
            className={`
              flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl
              border transition-colors duration-300
              ${isCorrect
                ? 'border-green-400/60 bg-green-500/10'
                : 'border-white/10 bg-white/5'}
            `}
          >
            <PlayerAvatar nickname={entry.name} size="xs" />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate max-w-[72px] leading-tight">
                {entry.name}
              </p>
              <p className="text-[11px] font-bold text-green-400 leading-tight">
                {entry.score}
              </p>
            </div>
            <span className={`text-xs ml-1 ${isAnswered ? 'text-green-400' : 'text-white/30'}`}>
              {isAnswered ? '✓' : '…'}
            </span>
          </div>
        );
      })}
    </div>
  </div>
)}
```

**Важные детали:**
- `scrollbar-none` — скрыть нативный скроллбар (добавить в globals.css если нет:
  `.scrollbar-none::-webkit-scrollbar { display: none; } .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }`)
- `PlayerAvatar size="xs"` — 24px, уже определён в компоненте
- Карточки НЕ сортируются здесь — порядок как передан из quiz (стабильный порядок
  игроков, чтобы аватары не прыгали при изменении очков)
- Переход `transition-colors duration-300` — плавная смена рамки при isCorrect

### 5. `quiz/page.tsx` — расширить `scoreboard` mapping

Найти строки (около 602-604):
```ts
const scoreboard = gameState.players
  .map((p) => ({ name: p.nickname, score: gameState.scores[p.id] || 0 }))
  .sort((a, b) => b.score - a.score);
```

Заменить на:
```ts
const scoreboard = gameState.players
  .map((p) => ({
    name: p.nickname,
    score: gameState.scores[p.id] || 0,
    hasAnswered: p.id in gameState.answers,
    isCorrect: gameState.showCorrect && gameState.correctPlayers.includes(p.id),
  }));
  // НЕ сортируем — стабильный порядок чтобы аватары не прыгали
```

**Почему без sort:** при sort карточки перестраиваются каждый раз когда меняются
очки — аватары прыгают, это плохо для UX во время активного вопроса. Порядок
определяется порядком `gameState.players` (стабильный).

### 6. `quiz/page.tsx` — уменьшить border-radius кнопок ответов

Найти строку (около 1050 после TASK-128):
```
className={`relative overflow-hidden rounded-xl border ...`}
```

Заменить `rounded-xl` → `rounded` (это единственная кнопка в `question`-фазе,
`motion.button` с `variants={answerVariants}`).

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npm run build` успешен
- [ ] В GameLayout нет старых бейджей справа и нет мобильного dropdown
- [ ] GameLayout рендерит горизонтальную полосу игроков под title-строкой
- [ ] Карточка игрока: PlayerAvatar `xs` + никнейм + зелёные очки + статус (✓/…)
- [ ] `hasAnswered=true` → ✓ зелёным; `isCorrect=true` → зелёная рамка
- [ ] Кнопки ответов в квизе: `rounded` (не `rounded-xl`)
- [ ] `scoreboard` в quiz НЕ сортируется (стабильный порядок)
- [ ] `hasAnswered` и `isCorrect` корректно вычисляются из `gameState`

---

## Ограничения и подводные камни

- **Другие игры тоже используют GameLayout** (Crocodile, Alias и др.) — они
  передают `scores` без `hasAnswered`/`isCorrect`. Это нормально: поля опциональны,
  для них просто покажется `…` и нейтральная рамка.
- **`showScoreboard` флаг** — полоса рендерится только когда `showScoreboard=true`.
  В setup-фазах quiz передаёт `showScoreboard={false}` — полосы нет, хорошо.
- **Не добавлять эмодзи** — ни в полосу, ни в кнопки.
- **Комментарии в коде** — только английский.
- **Не коммитить.**

---

## Открытые вопросы для Codex

- Если `.scrollbar-none` уже есть в `globals.css` — не добавлять дубликат.
  Проверь `grep -n "scrollbar-none" src/app/globals.css`.
- `PlayerAvatar` импортируется из `@/components/ui` (barrel export) — проверь
  что `src/components/ui/index.ts` экспортирует `PlayerAvatar`.

---

## Контрольные точки для самопроверки Codex

1. `git diff --name-only` — только 2 файла из whitelist (+возможно globals.css).
2. `npm run lint` — 0 новых ошибок.
3. `npm run build` — успешен.
4. Заполнить отчёт `codex-reports/129-quiz-scoreboard-strip.md`.
5. **Не коммитить.**
