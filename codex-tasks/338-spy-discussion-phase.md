# TASK-338: Шпион — этап «Обсуждение» (2 минуты) между таймером раунда и голосованием

> **Метаданные** (заполняет Claude перед стартом)
> - **Дата создания:** 2026-07-12
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~20 минут
> - **Зависит от тасков:** —

---

## Цель

Когда основной таймер раунда (`timerLeft`, 300 секунд) заканчивается, игра
больше не переходит сразу в голосование — сначала идёт новый этап
«Обсуждение» на 2 минуты (120 секунд), и только после его истечения
автоматически начинается голосование (как раньше).

---

## Контекст

Сейчас в `src/app/game/[roomId]/spy/page.tsx` есть host-side интервал
(строки ~534-566), который тикает `timerLeft` во время `phase === 'playing'`
и, когда таймер доходит до 0, **сразу** переключает игру в
`phase: 'voting'`. Пользователь попросил вставить между этим моментом и
началом голосования этап открытого обсуждения на 2 минуты — чтобы игроки
успели вслух обсудить подозрения, прежде чем голосовать.

Готовый паттерн для копирования — таймер голосования (`voteTimerLeft`/
`voteTimerRunning`, тот же файл, строки ~568-...) — устроен идентично тому,
что нужно для нового таймера обсуждения, просто с другим целевым
переходом фазы.

**Важно:** ручная кнопка хоста «Голосование» (`renderHostAction('voting', ...)`,
вызывает `startVoting()`, строки ~737-749 и ~1247-1267) — это explicit
override, которым хост может начать голосование ДОСРОЧНО, минуя обычный
таймер раунда. Эта кнопка должна остаться доступной и во время нового
этапа «Обсуждение» тоже (чтобы хост мог пропустить обсуждение и начать
голосование раньше 2 минут, если все уже готовы) — то есть `startVoting()`
трогать не нужно, только добавить условие, что кнопка видна ещё и при
`s.phase === 'discussion'`.

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/spy/page.tsx` — новая фаза, таймер, экран
  мобильного клиента, доступность кнопки «Голосование» во время
  обсуждения.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — новое поле в локальном
  типе spy-стейта, новый экран TV, элемент в верхнем HUD.

### НЕ ТРОГАТЬ

- Другие игры — не в этом whitelist.
- `server.mts` / `src/server/socket-handlers.mts` — не требуется, вся
  таймер-логика клиентская (host ведёт отсчёт и рассылает патчи, как
  уже устроено для `timerLeft`/`voteTimerLeft`).
- `CLAUDE.md`, `AGENTS.md` — обновляет только Claude.

---

## Шаги реализации

### 1. `src/app/game/[roomId]/spy/page.tsx`

- В `type Phase = 'modeSelect' | 'dealing' | 'playing' | 'voting' | 'spyGuess' | 'roundResult';`
  (строка ~199) добавить `'discussion'` между `'playing'` и `'voting'`.
- В `interface SpyGameState` (строки ~203-239) добавить два новых поля,
  рядом с `voteTimerLeft`/`voteTimerRunning`:
  ```ts
  discussionTimeLeft: number;
  discussionTimerRunning: boolean;
  ```
- Добавить константу рядом с `TIMER_TOTAL`/`VOTE_TIMER_TOTAL` (строка ~241-242):
  ```ts
  const DISCUSSION_TIMER_TOTAL = 120;
  ```
- В `mkInitial()` (строки ~243-273) добавить:
  ```ts
  discussionTimeLeft: DISCUSSION_TIMER_TOTAL,
  discussionTimerRunning: false,
  ```
- В host-side эффекте основного таймера раунда (строки ~534-566), в
  ветке `if (newLeft <= 0) { ... }` (строки ~545-557) — заменить переход
  сразу в `voting` на переход в `discussion`:
  ```ts
  if (newLeft <= 0) {
    const patch = {
      timerLeft: 0,
      timerRunning: false,
      phase: 'discussion' as Phase,
      discussionTimeLeft: DISCUSSION_TIMER_TOTAL,
      discussionTimerRunning: true,
    };
    setS(prev => ({ ...prev, ...patch }));
    broadcast(patch);
    clearInterval(id);
    return;
  }
  ```
  (было: `phase: 'voting' as Phase, votes: {}, voteTimerLeft: VOTE_TIMER_TOTAL,
  voteTimerRunning: true` — этот переход в voting теперь происходит из
  нового таймера обсуждения, см. следующий пункт, а не отсюда).
- Добавить НОВЫЙ host-side `useEffect` для таймера обсуждения, сразу
  после существующего эффекта таймера голосования (после строки ~595 —
  свериться по фактическому месту закрытия того `useEffect`), по тому
  же образцу:
  ```ts
  useEffect(() => {
    if (!isGameHost) return;
    if (!s.discussionTimerRunning || s.discussionTimeLeft <= 0) return;

    const id = setInterval(() => {
      const cur = sRef.current;
      if (!cur.discussionTimerRunning || cur.discussionTimeLeft <= 0) {
        clearInterval(id);
        return;
      }

      const newLeft = cur.discussionTimeLeft - 1;
      if (newLeft <= 0) {
        const patch = {
          discussionTimeLeft: 0,
          discussionTimerRunning: false,
          phase: 'voting' as Phase,
          votes: {},
          voteTimerLeft: VOTE_TIMER_TOTAL,
          voteTimerRunning: true,
        };
        setS(prev => ({ ...prev, ...patch }));
        broadcast(patch);
        clearInterval(id);
        return;
      }

      const patch = { discussionTimeLeft: newLeft };
      setS(prev => ({ ...prev, ...patch }));
      broadcast(patch);
    }, 1000);

    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.discussionTimerRunning, isGameHost, broadcast]);
  ```
- Новый экран мобильного клиента для `s.phase === 'discussion'` —
  разместить в потоке рендера рядом с блоком `s.phase === 'voting'`
  (строка ~1347 и рядом), простая карточка:
  ```tsx
  {!s.gameOver && s.phase === 'discussion' && (
    <div className="mx-auto w-full max-w-md py-4 animate-fade-in space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-white">{l('Обсуждение', 'Discussion')}</h2>
        <p className="text-amber-300">⏱ {formatTime(s.discussionTimeLeft)}</p>
      </div>
      <GlassCard className="spy-card p-6 text-center space-y-2">
        <p className="text-white/70">
          {l(
            'Обсудите вслух, кто вам кажется подозрительным — голосование начнётся автоматически.',
            'Discuss out loud who seems suspicious — voting will start automatically.',
          )}
        </p>
      </GlassCard>
      {isGameHost && (
        <div className="space-y-2">
          {renderHostAction(
            'voting',
            l('Начать голосование', 'Start voting'),
            <SpyIcon name="ballot" className="inline-block h-[1em] w-[1em] align-[-0.15em]" />,
            'border-amber-400/30 bg-amber-500/15 text-amber-200',
          )}
        </div>
      )}
    </div>
  )}
  ```
  (переиспользуем `renderHostAction('voting', ...)` — он уже вызывает
  `startVoting()` по подтверждению, ничего дополнительно писать не
  нужно).
- Проверить `renderBackButton()` (строка ~944-947,
  `needConfirm = s.phase === 'playing' && s.timerRunning`) — во время
  `discussion` кнопка «← К выбору режима» должна вести себя так же
  строго, как во время играющего таймера (требовать подтверждения,
  чтобы хост случайно не сбросил раунд во время обсуждения): расширить
  условие до
  `needConfirm = (s.phase === 'playing' && s.timerRunning) || (s.phase === 'discussion' && s.discussionTimerRunning)`.

### 2. `src/app/tv/[roomId]/[gameType]/page.tsx`

- В локальный тип spy-стейта (строки ~248-279) добавить поле рядом с
  `voteTimerLeft`:
  ```ts
  discussionTimeLeft: number;
  ```
- В начальное значение (строки ~280-...) добавить:
  ```ts
  discussionTimeLeft: 120,
  ```
- В верхний HUD (строки ~1409-1427) добавить блок для `discussion`,
  рядом с существующим блоком для `voting`:
  ```tsx
  {sp.phase === 'discussion' && (
    <div className="glass-card px-4 py-2 flex items-center gap-2">
      <span>⏱</span>
      <span className="font-mono font-bold text-xl">{formatSec(sp.discussionTimeLeft)}</span>
    </div>
  )}
  ```
- Новый экран для `sp.phase === 'discussion'` — рядом с блоком
  `sp.phase === 'voting'` (строка ~1568 и далее), простой полноэкранный
  блок:
  ```tsx
  {!sp.gameOver && sp.phase === 'discussion' && (
    <div className="h-full flex flex-col items-center justify-center gap-6 px-12">
      <h2 className="text-6xl font-black text-center">Обсуждение</h2>
      <p className="text-2xl text-white/50 text-center max-w-2xl">
        Обсудите вслух, кто кажется подозрительным
      </p>
      <div className="font-mono text-5xl font-black text-amber-300">
        {formatSec(sp.discussionTimeLeft)}
      </div>
    </div>
  )}
  ```
  (использовать уже существующую в файле функцию `formatSec` — свериться,
  что она уже есть рядом с использованием для `voteTimerLeft`).

> Если по ходу выясняется, что нужен дополнительный шаг или другой файл
> — остановиться, написать в отчёт, вернуть управление Claude.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` без новых ошибок
- [ ] Когда `timerLeft` доходит до 0 во время `phase === 'playing'` —
      игра переходит в `phase: 'discussion'`, а не сразу в `voting`
- [ ] `discussionTimeLeft` считает от 120 до 0 на host-клиенте и
      рассылается всем (мобильные + TV)
- [ ] Когда `discussionTimeLeft` доходит до 0 — автоматический переход
      в `phase: 'voting'` с сброшенными `votes`/`voteTimerLeft`, как
      раньше
- [ ] Хост может вручную начать голосование раньше через кнопку
      «Начать голосование» во время обсуждения
- [ ] TV показывает экран обсуждения с обратным отсчётом
- [ ] Остальные фазы/игры не затронуты

---

## Контрольные точки для самопроверки Codex

Перед тем как считать таск выполненным, Codex должен:

1. Прочитать diff (`git diff --stat` + `git diff`).
2. Убедиться что не вышел за whitelist файлов.
3. Запустить `npm run lint` и `npm run build` (если Turbopack падает
   из-за sandbox — прогнать `npx next build --webpack` дополнительно,
   как в предыдущих тасках сессии).
4. Заполнить отчёт `codex-reports/338-spy-discussion-phase.md` по
   шаблону `_TEMPLATE.md`.
5. **Не коммитить.** Коммит делает Claude после ревью (или пользователь).

---

## Открытые вопросы для Codex

- Нужно ли что-то менять в `resolveVoting`/логике результатов раунда? —
  **Нет**, обсуждение — чисто дополнительный этап ДО голосования, сам
  механизм голосования и подсчёта результатов не меняется.
- Нужна ли отдельная кнопка «Пропустить обсуждение» помимо уже
  существующей «Голосование»/«Начать голосование»? — **Нет**, это одна
  и та же кнопка/функция (`startVoting()`), просто теперь видна ещё на
  одной фазе.
- В режиме рисования (`s.mode === 'draw'`) тоже нужен этап обсуждения? —
  **Да**, обсуждение — это общий этап после основного таймера раунда,
  не зависит от `mode`. Экран `discussion` не должен проверять
  `s.mode`.
