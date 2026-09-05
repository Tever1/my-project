# TASK-001: Убрать unused variables и unused eslint-disable

> **Метаданные**
> - **Дата создания:** 2026-05-02
> - **Сложность:** simple
> - **Запуск:** auto by Claude
> - **Ожидаемое время Codex:** ~5–10 минут
> - **Зависит от тасков:** —

---

## Цель

Очистить безопасную часть lint-warnings: unused variables (объявлены, но не
используются) и одну unused eslint-disable директиву. Поведение приложения не
должно измениться ни на йоту.

---

## Контекст

`npm run lint` выдаёт 82 проблемы (40 errors + 42 warnings). Большинство
errors затрагивают auth-context / sockets / game logic — их трогать **нельзя**
без отдельного дизайн-решения. Этот таск — только безопасная зачистка.

После таска lint должен показывать **меньше** проблем (минус то что мы убрали),
но НЕ обязательно ноль — оставшиеся errors разруливаем отдельными тасками.

---

## Файлы к изменению (whitelist)

Codex редактирует **только** эти файлы:

- `src/app/icon-compare/page.tsx` — убрать unused `accent` (строка 302)
- `src/app/tv/[roomId]/[gameType]/page.tsx` — убрать unused:
  - `ALIAS_WORDS` (импорт, строка 10)
  - `genericState` (строка 125)
  - `currentWord` (строка 1006)
  - `ti` (строка 1169)
- `src/components/glass/GlassToaster.tsx` — убрать unused eslint-disable directive (строка 62)
- `src/lib/use-timer-sound.ts` — убрать unused `_totalTime` (строка 80, parameter)
- `src/server/socket-handlers.mts` — убрать unused `socketId` (строки 62 и 171, оба — function parameter)

### НЕ ТРОГАТЬ

- **Никакие другие файлы.** В частности:
  - `src/app/game/[roomId]/quiz/page.tsx` — там есть `count -= 1` immutability error, но это отдельный таск
  - `src/app/game/[roomId]/mafia/page.tsx` — отдельный таск
  - `src/lib/auth-context.tsx`, `src/lib/i18n-provider.tsx` — setState-in-effect errors, отдельный таск
  - `src/lib/use-socket.ts` — refs-in-render errors, отдельный таск
  - `mobile/**`, `.agents/**`, `scripts/**` — не входит в основной билд
- **Никаких behaviour-изменений.** Если переменная вроде «не используется», но удаление сломает API — оставить и пометить `eslint-disable-next-line` с комментарием почему.
- **Никаких `useEffect`/`useCallback` правок** даже если рядом есть warning — это отдельные таски.
- **`CLAUDE.md`, `AGENTS.md`, `.codex/*.md`** — не трогать.

---

## Шаги реализации

Для каждого файла из whitelist:

### 1. `src/app/icon-compare/page.tsx`
- Найти строку 302 где `accent` объявлен но не используется.
- Удалить объявление (или удалить из деструктуризации, если это деструктуризация).

### 2. `src/app/tv/[roomId]/[gameType]/page.tsx`
- Удалить import `ALIAS_WORDS` (строка 10).
- Удалить переменную `genericState` (строка 125) если присваивается но не читается.
- Удалить переменную `currentWord` (строка 1006).
- Удалить параметр `ti` или префиксовать `_ti` если он часть signature callback (строка 1169).
- **ВНИМАНИЕ:** в этом файле также есть `react-hooks/rules-of-hooks` error на строке 897 — НЕ ТРОГАТЬ.

### 3. `src/components/glass/GlassToaster.tsx`
- На строке 62 убрать `// eslint-disable-next-line @typescript-eslint/no-explicit-any` (или `/* eslint-disable */` блок) — он лишний.

### 4. `src/lib/use-timer-sound.ts`
- В сигнатуре функции на строке 80 параметр `_totalTime` не используется. Префикс `_` обычно сигнал что это intentional, но lint всё равно ругается. Решение на выбор:
  - Если функция вызывается в одном-двух местах — удалить параметр и подправить call-sites (только если call-sites внутри того же файла).
  - Если параметр часть публичного API — оставить + добавить inline comment почему.
- Сообщи в отчёте какой вариант выбрал и почему.

### 5. `src/server/socket-handlers.mts`
- Параметры `socketId` на строках 62 и 171 не используются.
- Префиксовать `_socketId` или удалить (если signature свободно меняется).
- Сообщи в отчёте.

---

## Acceptance criteria

- [ ] `npm run lint` показывает **меньше** проблем чем 82 (точное число — в отчёт).
- [ ] Конкретно эти warnings/errors **исчезли**:
  - `icon-compare/page.tsx:302` `'accent' is defined but never used`
  - `tv/[roomId]/[gameType]/page.tsx:10:27` `'ALIAS_WORDS' is defined but never used`
  - `tv/[roomId]/[gameType]/page.tsx:125:10` `'genericState' is assigned a value but never used`
  - `tv/[roomId]/[gameType]/page.tsx:1006:11` `'currentWord' is assigned a value but never used`
  - `tv/[roomId]/[gameType]/page.tsx:1169:44` `'ti' is defined but never used`
  - `GlassToaster.tsx:62` `Unused eslint-disable directive`
  - `use-timer-sound.ts:80:47` `'_totalTime' is defined but never used`
  - `socket-handlers.mts:62:60` `'socketId' is defined but never used`
  - `socket-handlers.mts:171:64` `'socketId' is defined but never used`
- [ ] `npm run build` успешен.
- [ ] Никаких изменений в файлах вне whitelist (`git diff --stat` подтвердит).

---

## Ограничения и подводные камни

- **i18n не затрагивается** — это чисто внутренний кодовый шум.
- **Host-authoritative не затрагивается** — `socket-handlers.mts` правки только в неиспользуемых параметрах, никакой логики.
- **Если по ходу окажется что переменная всё-таки используется** (например через ref'ы или late-import) — НЕ удалять. Описать в отчёте.

---

## Контрольные точки для самопроверки Codex

1. `git diff --stat` — должен показать только файлы из whitelist.
2. `npm run lint 2>&1 | grep -E "(accent|ALIAS_WORDS|genericState|currentWord|'ti'|_totalTime|socketId|Unused eslint-disable)"` — должно быть пусто (или почти пусто).
3. `npm run build` — успех.
4. Заполнить отчёт `codex-reports/001-lint-unused-vars.md`.

---

## Открытые вопросы для Codex

- Если `_totalTime` или `socketId` — параметры публичных функций, и удаление сломает call-sites вне whitelist, **не удалять**. Префиксовать или добавить eslint-disable + объяснение в отчёте.
- Если `ALIAS_WORDS` импортируется но используется через какой-нибудь dynamic-import паттерн который lint не видит — оставить и описать.
