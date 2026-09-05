# TASK-025: Lint cleanup Волна 2 — react-hooks/exhaustive-deps

> **Метаданные**
> - **Дата создания:** 2026-05-07
> - **Сложность:** complex (5 файлов, игровая логика, требует точных правок per-hook)
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~25 минут
> - **Зависит от тасков:** TASK-024 (lint Волна 1, коммит `3e00efd`)

---

## Цель

Закрыть **8 проблем** правила `react-hooks/exhaustive-deps` (плюс одну
зависящую TDZ-ошибку в quiz). Lint после Волны 2: **19 → 11 problems**.

Каждый useEffect/useCallback в этом списке проанализирован Claude — для каждого
указано **точно что делать** (добавить dep / удалить dep / экстрагировать
выражение / переставить декларацию). Codex не должен импровизировать —
если правило ESLint после правки всё ещё ругается, значит инструкция в ТЗ
не сработала, **остановиться и написать в открытые вопросы**.

---

## Контекст

После Волны 1 (коммит `3e00efd`) осталось 19 lint problems. Из них 8
относятся к exhaustive-deps — это Волна 2.

**ВАЖНЫЙ КОНТЕКСТ ИЗ ИСТОРИИ:** в коммите `0c2fb54` уже был один баг от
неправильного dep array — useEffect в Mafia с `[on]` захватывал stale
значение `isHost=false`. Фикс — добавить `isHost, user` в deps. Это значит:
**exhaustive-deps warnings — это потенциальные баги**, а не косметика.
Но и слепо добавлять deps опасно — можно получить infinite re-render
или каждосекундный re-subscribe.

`emit`, `on`, `off` из `useSocket()` обёрнуты в `useCallback(..., [])` —
они **стабильны** (см. `src/lib/use-socket.ts:30-50`). Добавлять их в deps
безопасно.

---

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/alias/page.tsx`
- `src/app/game/[roomId]/crocodile/page.tsx`
- `src/app/game/[roomId]/mafia/page.tsx`
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

### НЕ ТРОГАТЬ

- `src/lib/use-socket.ts` — Волна 3 (refs error).
- `src/app/admin/page.tsx` — Волна 3 (set-state-in-effect).
- `src/lib/auth-context.tsx`, `src/lib/i18n-provider.tsx` — Волна 3.
- `mobile/**`, `.agents/**` — игнорируется ESLint после Волны 1.
- `server.mts` — host-authoritative, не трогаем.
- В quiz: lines 424 (immutability `count -= 1`), set-state-in-effect — Волна 3.
- В mafia: line 1004 (refs error) — Волна 3.
- В tv: line 896 (rules-of-hooks) — Волна 3.
- `CLAUDE.md`, `AGENTS.md`, `.codex/STATUS.md` — обновляет только Claude.

---

## Точные правки per-file

### 1. `src/app/game/[roomId]/alias/page.tsx:180`

**Текущий код:**
```ts
}, [on, router, roomId]);
```

**Изменить на:**
```ts
}, [on, emit, router, roomId]);
```

**Обоснование:** внутри useEffect (line 173) вызывается `emit(...)` для
re-broadcast state. `emit` стабилен (useCallback с пустыми deps в use-socket.ts).
Безопасно.

---

### 2. `src/app/game/[roomId]/crocodile/page.tsx:161`

**Текущий код:**
```ts
}, [on, router, roomId]);
```

**Изменить на:**
```ts
}, [on, emit, router, roomId]);
```

**Обоснование:** аналогично alias — внутри обработчика `croc:request-state`
(line 153) вызывается `emit`. Безопасно.

---

### 3. `src/app/game/[roomId]/mafia/page.tsx:317-332` (day timer)

**Текущий код:**
```ts
useEffect(() => {
  if (gs.phase === 'day' && dayTimerValue > 0) {
    timerRef.current = setInterval(() => {
      setDayTimerValue((v) => {
        if (v <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }
  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, [gs.phase, dayTimerValue > 0]);
```

**Изменить на:**
```ts
const isDayTimerActive = dayTimerValue > 0;
useEffect(() => {
  if (gs.phase === 'day' && isDayTimerActive) {
    timerRef.current = setInterval(() => {
      setDayTimerValue((v) => {
        if (v <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }
  return () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };
}, [gs.phase, isDayTimerActive]);
```

**Обоснование:** ESLint жалуется на complex expression в dep array
(`dayTimerValue > 0`). Решение — экстрагировать в локальную переменную
ВЫШЕ хука (на уровне функционального компонента, до useEffect).

**КРИТИЧНО — НЕ ДОБАВЛЯТЬ `dayTimerValue` КАК ОТДЕЛЬНЫЙ DEP.** Это вызовет
re-run каждую секунду (т.к. `setDayTimerValue` уменьшает значение каждый
тик), и каждый re-run создаст новый `setInterval`, что приведёт к множественным
параллельным таймерам. **Только `isDayTimerActive` (boolean флип).**

---

### 4. `src/app/game/[roomId]/quiz/page.tsx:411` (revealResults useCallback)

**Текущий код (line 383-411):**
```ts
const revealResults = useCallback(() => {
  // ... тело функции читает: gameState.currentQuestion,
  //     gameState.scores, gameState.answers — всё через локальные переменные
  // ... gameState.timeLeft НЕ ЧИТАЕТСЯ внутри функции
}, [gameState.currentQuestion, gameState.answers, gameState.scores, gameState.timeLeft, emit, roomId]);
```

**Изменить deps на:**
```ts
}, [gameState.currentQuestion, gameState.answers, gameState.scores, emit, roomId]);
```

**Обоснование:** ESLint warning (line 411): `gameState.timeLeft` is unnecessary.
Тело функции (lines 384-410) **не читает** `timeLeft`. Удаление этого dep
делает `revealResults` стабильным от тика к тику таймера.

**Проверка перед правкой:** убедись что в теле revealResults (между line 383
и line 411) действительно нет `gameState.timeLeft`. Если найдёшь — НЕ
УДАЛЯЙ, напиши в открытые вопросы.

---

### 5. `src/app/game/[roomId]/quiz/page.tsx:259-264` (auto-reveal effect) — TDZ + missing dep

Это **связанная пара**: ошибка 262:7 «Cannot access variable before it is
declared» и warning 264:6 «missing dependency: 'revealResults'».

**Текущий код (порядок в файле):**
```ts
// Line 259-264:
useEffect(() => {
  if (!isHost || gameState.phase !== 'question' || gameState.showCorrect) return;
  if (gameState.timeLeft <= 0 || allAnswered) {
    revealResults();    // <-- 262: TDZ error (revealResults declared at 383)
  }
}, [gameState.timeLeft, allAnswered, isHost, gameState.phase, gameState.showCorrect]);

// ... other code ...

// Line 383+:
const revealResults = useCallback(() => { ... }, [...]);
```

**Изменить:** **переместить** объявление `const revealResults = useCallback(...)`
(целиком блок line 383 до закрывающей `}, [...]);` на line 411) **ВЫШЕ** этого
useEffect (auto-reveal на line 259). После перестановки — добавить
`revealResults` в deps auto-reveal эффекта:

**Новый dep array (auto-reveal):**
```ts
}, [gameState.timeLeft, allAnswered, isHost, gameState.phase, gameState.showCorrect, revealResults]);
```

**Обоснование:** TDZ-error 262 возникает потому что `revealResults`
объявлен после useEffect, но эффект его захватывает в closure. Перестановка
объявления вверх — стандартный фикс для этого паттерна. После правки #4
(удаление `timeLeft` из deps revealResults) функция стабильна, значит
эффект НЕ будет re-run каждую секунду.

**ВАЖНО — порядок:** сначала сделай правку #4 (удалить timeLeft),
ПОТОМ #5 (переместить + добавить в deps). Иначе при добавлении `revealResults`
в deps auto-reveal эффект будет re-run каждую секунду (т.к. `revealResults`
пересоздавался от изменения timeLeft).

---

### 6. `src/app/tv/[roomId]/[gameType]/page.tsx:390` (TV main effect)

**Текущий код:**
```ts
}, [on, emit, router, roomId, gameType]);
```

**Изменить на:**
```ts
}, [on, emit, router, roomId, gameType, locale]);
```

**Обоснование:** внутри обработчика `mafia:state` (lines 324-368) используется
`locale` для перевода `lastEvent`. ESLint справедливо требует его в deps —
без этого при смене языка обработчик закэширует старое значение.

**Side-effect добавления `locale`:** при смене языка эффект re-run, что
вызовет unsub/resub всех socket handlers. Это **безопасно** — `on()` возвращает
unsub-функцию, smena handler'а — стандартный pattern. Смена языка происходит
редко (юзер toggle), не каждую секунду.

---

## Шаги реализации

1. **Прочитай этот ТЗ полностью**, особенно блок про mafia 332 (опасно
   добавлять `dayTimerValue` напрямую) и quiz 411+264 (порядок правок важен).

2. Сделай правки в порядке: alias → crocodile → mafia → quiz (#4 раньше #5)
   → tv.

3. После каждого файла: `npm run lint -- src/app/game/[roomId]/<file>` —
   проверь что соответствующие проблемы ушли и новые не появились.

4. Финальная проверка:
   - `npm run lint 2>&1 | tail -3` — должно быть **≤11 problems**.
   - `npm run build` — успешен.
   - `npx tsc --noEmit` — без ошибок.

5. **Не запускай dev-сервер.** QA после Волны 2 делает Claude/юзер вручную
   (см. acceptance ниже).

6. Заполни `codex-reports/025-lint-cleanup-wave-2.md`.

---

## Acceptance criteria

- [ ] `npm run lint 2>&1 | tail -3` → **≤11 problems**.
- [ ] Все 8 проблем из этого ТЗ исчезли:
  - alias:180 (exhaustive-deps emit)
  - crocodile:161 (exhaustive-deps emit)
  - mafia:332 (×2: missing dep + complex expression)
  - quiz:262 (Cannot access before declared)
  - quiz:264 (missing dep revealResults)
  - quiz:411 (unnecessary dep timeLeft)
  - tv:390 (missing dep locale)
- [ ] Никаких НОВЫХ lint warnings/errors не появилось.
- [ ] `npm run build` успешен.
- [ ] `npx tsc --noEmit` без ошибок.
- [ ] `git diff --stat` ограничен 5 whitelist-файлами.
- [ ] В quiz/page.tsx порядок объявлений: `revealResults useCallback`
      объявлен **до** auto-reveal `useEffect` (визуальная проверка diff).
- [ ] В mafia/page.tsx: добавлена локальная переменная `isDayTimerActive`,
      и dep array содержит её, **НЕ** raw `dayTimerValue`.

---

## Ограничения и подводные камни

- **Игровая логика — НЕ менять семантику.** Все правки — переорганизация
  кода и dep-массивов. Никаких изменений в условиях, таймерах, broadcast'ах.
- **Mafia day timer:** если случайно добавишь `dayTimerValue` (без `> 0`)
  как dep — получишь параллельные таймеры. Триггер: видишь `dayTimerValue` в
  итоговом dep array — **остановись, перечитай ТЗ #3**.
- **Quiz auto-reveal:** если `revealResults` добавлен в deps до удаления
  `gameState.timeLeft` из его собственных deps — каждый тик таймера будет
  пересоздавать `revealResults`, что re-run-ит auto-reveal effect и может
  вызвать множественные `revealResults()` вызовы за один тик. Порядок #4 → #5.
- **Alias classic mode НЕПРИКОСНОВЕНЕН** (CLAUDE.md правило). В alias правим
  только line 180 dep array. Никакой другой логики.
- **Host-authoritative.** `server.mts` не трогаем. Все правки в client-коде.
- **Комментарии в коде** — английский (если пришлось добавлять).

---

## Контрольные точки для самопроверки Codex

1. `git diff --stat` — должно быть 5 файлов:
   ```
   src/app/game/[roomId]/alias/page.tsx
   src/app/game/[roomId]/crocodile/page.tsx
   src/app/game/[roomId]/mafia/page.tsx
   src/app/game/[roomId]/quiz/page.tsx
   src/app/tv/[roomId]/[gameType]/page.tsx
   ```
2. `npm run lint 2>&1 | grep -E "^\s+[0-9]+:[0-9]+" | wc -l` — должно быть
   **≤11** (было 19).
3. `npm run build` — exit 0.
4. `npx tsc --noEmit` — exit 0.
5. Заполни отчёт по шаблону `codex-reports/_TEMPLATE.md`.
6. **Не коммить.** Коммит делает Claude после ревью + QA-прогон.

---

## Открытые вопросы для Codex

- Если в `revealResults` (quiz/page.tsx) ты НАЙДЁШЬ использование
  `gameState.timeLeft` внутри тела функции (между line 383 и line 411) —
  **не удаляй** его из deps. Напиши в отчёт что нашёл, с цитатой строки.
  Claude перепланирует.

- Если после правки #5 (перестановка `revealResults`) ESLint начнёт ругаться
  на TDZ в обратную сторону (например что какая-то локальная переменная,
  на которую опирается `revealResults`, теперь сама в TDZ) — **остановись**.
  Опиши проблему в открытых вопросах. Возможно нужно поднять что-то ещё
  выше или отложить в Волну 3.

- Если в tv/page.tsx после добавления `locale` в deps появится новый warning
  типа «X is missing» — **сообщи**, не добавляй вслепую. Возможно нужно
  обернуть какой-то callback в useCallback.

- Если общий счётчик lint после правок ≠ 11 (но и не ≤11) — **сообщи**
  с разбиением проблем по правилам и файлам. Не пытайся достичь цифры
  ценой запрещённых правил.
