# REPORT TASK-371: «100 к 1» Большая игра — синхронизация вопроса и таймера

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-20 22:20
> - **Финиш:** 2026-07-20 22:37
> - **Длительность:** 17 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Найдена реальная race condition в Big Game sync: host мог отвечать на `h2o:request-state` устаревшим `sRef.current`, а ответ игрока отправлял `bgCurQ` и `bgTimerPaused:false` неатомарно. Исправление сделано только в whitelist-файле `src/app/game/[roomId]/hundred-to-one/page.tsx`; TV-файл не трогался.

---

## Найденная причина

Причина была составная:

1. В `bgStartPlayer()` interval каждую секунду делал `setS(...)` и `broadcast({ bgTimeLeft: t })`, но не обновлял `sRef.current`. Поэтому игровой host, отвечая на `h2o:request-state`, мог разослать full snapshot с устаревшими Big Game полями.
2. `bgResumeTimer()` зависел от React state `s.bgTimerPaused`. На устройстве отвечающего игрока это значение могло быть stale: `onChange` уже отправил pause, но локальный render/sync ещё не успел выставить `s.bgTimerPaused === true`, поэтому Enter мог не отправить resume.
3. `bgSubmitAnswer()` раньше отправлял переход вопроса отдельным patch-ом без `bgTimerPaused:false`. Из-за этого full-state ресинк или переупорядочивание patch-ей могло оставить устройство host'а, где реально тикает interval, в состоянии `bgTimerPaused:true`.

Итоговый сценарий бага: игрок печатает ответ → pause уходит на host → Enter увеличивает `bgCurQ`, но resume теряется или приходит отдельно → visibility/request-state провоцирует full sync от host со stale/paused состоянием → TV и телефоны получают откат вопроса или залипший таймер.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — добавлен guarded merge для входящих `h2o:sync` во время активной Большой игры; host full-state response отложен на 75ms; timer interval теперь обновляет `sRef.current`; отправка ответа теперь атомарно включает `bgCurQ`, массив ответов и `bgTimerPaused:false`; pause/resume читают актуальный `sRef.current`.

### Новые файлы

- `codex-reports/371-h2o-biggame-question-timer-sync-bug.md` — этот отчёт.

### Удалённые файлы

- (нет)

---

## Diff по строкам TASK-371

- `src/app/game/[roomId]/hundred-to-one/page.tsx:99` — `isBgAnsweringPhase()`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:101` — `mergeH2OSyncState()`, который не даёт full sync откатить `bgCurQ`, `bgTimeLeft`, `bgTimerPaused` и массивы ответов назад при той же активной Big Game фазе.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:365` — входящий `h2o:sync` теперь проходит через guarded merge, а не через слепой `{ ...prev, ...payload }`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:377` — host отвечает на `h2o:request-state` через короткий deferred snapshot `sRef.current`, чтобы уже пришедшие action patch-и успели примениться.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:721` — timer timeout patch обновляет `sRef.current`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:726` — timer tick patch обновляет `sRef.current`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:736` — `bgSubmitAnswer()` читает актуальный `sRef.current`, а не потенциально stale render state `s`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:762` и `:764` — submit answer атомарно отправляет `bgTimerPaused:false` вместе с новым `bgCurQ` и ответом.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:821` — `bgPauseTimer()` читает `sRef.current`.
- `src/app/game/[roomId]/hundred-to-one/page.tsx:825` — `bgResumeTimer()` больше не зависит от stale `s.bgTimerPaused`; в активной answering-фазе всегда отправляет `bgTimerPaused:false`.

---

## Diff stat

В рабочем дереве до TASK-371 уже были незакоммиченные изменения в нескольких файлах, включая большой редизайн `hundred-to-one/page.tsx`. Поэтому общий stat отражает не только эту задачу:

```text
.codex/STATUS.md                              |  38 +
src/app/design-tokens/page.tsx                | 125 ++++
src/app/game/[roomId]/hundred-to-one/page.tsx | 985 ++++++++++++++++----------
src/app/tv/[roomId]/[gameType]/page.tsx       | 666 ++++++++++++-----
src/components/games/GameLayout.tsx           |   4 +-
5 files changed, 1268 insertions(+), 550 deletions(-)
```

Stat только whitelist-файла:

```text
src/app/game/[roomId]/hundred-to-one/page.tsx | 985 ++++++++++++++++----------
1 file changed, 609 insertions(+), 376 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без warnings/errors |
| Логический сценарий host + P1 + P2 + TV + visibilitychange | ✅ | stale full sync больше не должен откатывать активный `bgCurQ`; submit answer всегда снимает pause тем же patch-ом |

---

## Логическая проверка сценария

1. Host запускает P1. Timer tick теперь обновляет и React state, и `sRef.current`, поэтому full snapshot от host содержит актуальный `bgTimeLeft`.
2. P1 печатает. `bgPauseTimer()` отправляет `bgTimerPaused:true` по актуальному ref, host interval останавливается на следующем tick.
3. P1 жмёт Enter. Даже если render state на телефоне stale, `bgSubmitAnswer()` берёт `bgCurQ/bgP1Ans/bgP2Ans` из `sRef.current` и отправляет единый patch: новый `bgCurQ`, новый массив ответов, `bgTimerPaused:false`.
4. Host получает этот patch, обновляет `sRef.current`; interval снова видит `prev.bgTimerPaused === false` и продолжает тикать.
5. Если в этот момент телефон/TV вызывает `h2o:request-state`, host отвечает отложенным актуальным `sRef.current`. Если всё же приходит старый full snapshot, mobile-клиенты не принимают откат активного `bgCurQ`/таймера/ответов назад. TV-файл не менялся, но stale full snapshot теперь не должен генерироваться host'ом после применения action patch-а.

---

## Отклонения от ТЗ

Нет. Правки вне whitelist не вносились.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано

Не проводился браузерный multi-device QA: задача проверена статически, TypeScript/lint и логическим разбором race-сценария.

---

## Подсказки для ревью

- Посмотреть `mergeH2OSyncState()` на `src/app/game/[roomId]/hundred-to-one/page.tsx:101`: guard специально ограничен активной Big Game answering-фазой с тем же `bgPhase`, чтобы не ломать старт P2, reset, check/final transitions.
- Посмотреть `bgSubmitAnswer()` на `src/app/game/[roomId]/hundred-to-one/page.tsx:733`: `bgTimerPaused:false` намеренно отправляется в том же patch-е, что и `bgCurQ`, чтобы вопрос и таймер не расходились.
