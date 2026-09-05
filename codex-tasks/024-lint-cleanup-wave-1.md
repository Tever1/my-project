# TASK-024: Lint cleanup Волна 1 — ignores + автофикс + unused/any

> **Метаданные**
> - **Дата создания:** 2026-05-07
> - **Сложность:** complex (10+ файлов, смесь автофикса и ручной работы)
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~20 минут
> - **Зависит от тасков:** —

---

## Цель

Сократить `npm run lint` с **73 проблем (40 errors / 33 warnings)** до **≤14 проблем**
за счёт: (а) исключения `.agents/**` и `mobile/**` из линта, (б) автофикса
тривиальных правил (`prefer-const`, `react/no-unescaped-entities`, unused
eslint-disable directives), (в) ручной чистки `no-unused-vars` и `no-explicit-any`
в `src/`.

**НЕ ТРОГАТЬ** правила `react-hooks/exhaustive-deps`, `react-hooks/set-state-in-effect`,
`react-hooks/refs`, `rules-of-hooks`. Они уйдут в Волны 2 и 3 — там нужна
осторожность и QA-прогон.

---

## Контекст

Юзер согласовал план трёх волн чистки линта. Предыдущая сессия закончилась
анализом, ТЗ для Codex написано в этой сессии. Файл `mobile/` — заброшенный
проект мобильного приложения (юзер от него отказался, не трогаем). `.agents/`
— vendored-инструменты, не наш код.

Связанные коммиты: `040cd21`, `891acc7` (текущий HEAD). Working tree чистый.

---

## Файлы к изменению (whitelist)

### Конфиг
- `eslint.config.mjs` — добавить в `globalIgnores`: `.agents/**`, `mobile/**`.

### Скрипт
- `scripts/generate-questions.mjs` — удалить unused `lang` параметр (line 92:48).

### `src/app/admin/page.tsx`
- Удалить `useRef` из импорта (line 3:44, unused).
- Удалить `setRefreshKey` (line 506:22, assigned but never used) — если есть
  парный `refreshKey`, который тоже unused, удалить и его. Если `refreshKey`
  читается где-то — оставить, удалить только сеттер вместе с вызовами.
- Удалить `rowSel` (line 871:25, assigned but never used) — проверить что не
  используется ниже.
- Удалить unused eslint-disable directive (line 1317:1, no-explicit-any).

### `src/app/api/admin/quiz-item/route.ts`
- Удалить `factCheckSingle` (line 144:16, defined but never used).

### `src/app/game/[roomId]/alias/page.tsx`
- Заменить `let updatedTeams` на `const updatedTeams` (line 260:11, prefer-const).
- **НЕ ТРОГАТЬ** classic mode (правило проекта: c6b8057 затронул только letter mode).
- **НЕ ТРОГАТЬ** exhaustive-deps warning на line 180 — это Волна 2.

### `src/app/game/[roomId]/crocodile/page.tsx`
- **НЕ ТРОГАТЬ** exhaustive-deps warning на line 161 — это Волна 2. Файл в
  whitelist на случай если найдутся `prefer-const` или `no-unused-vars` после
  автофикса; иначе не редактировать.

### `src/app/game/[roomId]/hundred-to-one/page.tsx`
- Удалить unused импорты: `ROUND_MULT` (11:31), `REVERSE_PTS` (11:43),
  `H2OQuestion` (12:15).
- Удалить unused `locale` (98:11), `ri` (338:45) — проверить что не используются
  ниже.

### `src/app/game/[roomId]/mafia/page.tsx`
- Удалить unused `t` (line 133:11) — если это переменная от `useTranslations()`,
  убирать вместе с вызовом.
- **НЕ ТРОГАТЬ** exhaustive-deps на line 332 и rules-of-hooks/set-state-in-effect
  errors — это Волна 3.

### `src/app/game/[roomId]/quiz/page.tsx`
- Прогнать через `npm run lint -- --fix` для автофикса.
- **НЕ ТРОГАТЬ** errors `Cannot access variable before it is declared` (line 124),
  `set-state-in-effect`, `exhaustive-deps` — это Волна 2/3.
- Если есть `no-unused-vars` warnings — почистить.

### `src/app/tv/[roomId]/[gameType]/page.tsx`
- Почистить `no-unused-vars` и `no-explicit-any` если есть. **НЕ ТРОГАТЬ**
  hooks-правила.

### `src/lib/auth-context.tsx`
- Почистить `no-unused-vars` и `no-explicit-any`. **НЕ ТРОГАТЬ** errors
  `Cannot access refs during render` или другие react-hooks правила —
  это Волна 3 (поскольку `auth-context.tsx` не в whitelist Волны 3, **просто
  оставить эти ошибки как есть**).

### `src/lib/i18n-provider.tsx`
- Почистить `no-unused-vars` и `no-explicit-any`. **НЕ ТРОГАТЬ** hooks-правила.

### НЕ ТРОГАТЬ (важно!)

- `src/lib/use-socket.ts` — пойдёт в Волну 3, у него критичные
  `react-hooks/refs` errors.
- `mobile/**` — юзер отказался от мобильного приложения. Не редактируем.
- `.agents/**` — vendored, не наш код. Достаточно добавить в ignores.
- `server.mts` — host-authoritative, не трогаем без отдельного ТЗ.
- `CLAUDE.md`, `AGENTS.md`, `.codex/STATUS.md` — обновляет только Claude.

---

## Шаги реализации

1. **Eslint ignores.** В `eslint.config.mjs` добавить `.agents/**` и `mobile/**`
   в массив `globalIgnores`. Сохранить, запустить `npm run lint` — проверить
   что эти папки больше не сканируются.

2. **Автофикс.** Запустить `npm run lint -- --fix`. Это закроет:
   - `prefer-const` (alias/page.tsx:260),
   - `react/no-unescaped-entities` (если что-то осталось после ignore mobile),
   - возможно несколько мелких автофиксаблов.

3. **Ручная чистка `no-unused-vars`** по списку выше (admin, api/admin/quiz-item,
   hundred-to-one, mafia, scripts/generate-questions).
   - Для каждой переменной: убедиться, что она нигде не используется (grep по
     файлу), удалить объявление и связанный код.
   - Если переменная — деструктуризация `const { foo, bar } = ...`, и `foo`
     unused — удалить только `foo` из деструктуризации.

4. **Удалить unused eslint-disable** в `src/app/admin/page.tsx:1317:1`.

5. **`no-explicit-any`** в `src/`. Заменить `any` на конкретный тип. Если тип
   не очевиден — использовать `unknown` (безопаснее) и сузить через type guard.
   Если совсем не получается — оставить `any` с комментарием почему, **запросить
   решение в «Открытых вопросах» отчёта**.

6. **Проверка whitelist.** `git diff --stat` — убедиться, что не вылез за
   список файлов выше.

7. **Финальная проверка:**
   - `npm run lint 2>&1 | tail -3` — должно быть `≤14 problems`.
   - `npm run build` — успешен.
   - `npx tsc --noEmit` — без ошибок.

8. Заполнить `codex-reports/024-lint-cleanup-wave-1.md`.

---

## Acceptance criteria

- [ ] `eslint.config.mjs` содержит `.agents/**` и `mobile/**` в `globalIgnores`.
- [ ] `npm run lint 2>&1 | tail -3` показывает ≤14 problems (было 73).
- [ ] `npm run build` успешен.
- [ ] `npx tsc --noEmit` без ошибок.
- [ ] `git diff --stat` ограничен файлами из whitelist.
- [ ] Все оставшиеся проблемы — это `react-hooks/*` правила (exhaustive-deps,
      set-state-in-effect, refs, rules-of-hooks) или error
      «Cannot access variable before it is declared». Они зарезервированы
      для Волн 2/3.

---

## Ограничения и подводные камни

- **Не трогать игровую логику.** Удаление unused vars — синтаксическая чистка,
  не семантическая. Если переменная выглядит unused, но окружена комментарием
  «keep this for X» или используется в `useEffect` deps — НЕ удалять, написать
  в открытых вопросах.
- **Alias classic mode НЕПРИКОСНОВЕНЕН** — в `alias/page.tsx` правим только
  объявление `updatedTeams` (prefer-const). Никаких других правок.
- **Host-authoritative.** Игровая логика только в `server.mts`. В этой волне
  `server.mts` не трогаем вообще.
- **i18n.** Если удаляешь `t = useTranslations()`, проверь что в файле больше
  нет вызовов `t(...)`. Если есть — переменная НЕ unused, ESLint что-то путает,
  **не удалять**, написать в открытые вопросы.
- **Комментарии в коде** — английский (техническая конвенция).

---

## Контрольные точки для самопроверки Codex

Перед тем как считать таск выполненным:

1. `git diff --stat` — список затронутых файлов в пределах whitelist.
2. `npm run lint 2>&1 | tail -3` — ≤14 problems.
3. `npm run build` — успешен.
4. `npx tsc --noEmit` — чистый.
5. Заполнить отчёт `codex-reports/024-lint-cleanup-wave-1.md` по шаблону.
6. **Не коммитить.** Коммит делает Claude/юзер после ревью.

---

## Открытые вопросы для Codex

- Если переменная помечена как unused, но удаление ломает type-check (например,
  деструктуризация `const [a, b, c] = useState(...)` где `a` нужен,
  а `b` нет) — заменить на `_` (`const [a, _b, c] = ...`)? Или оставить как
  есть и добавить `// eslint-disable-next-line`? **Решение:** заменить на
  имя с префиксом `_` (это конвенция ESLint для intentionally-unused). Без
  eslint-disable.

- Если `factCheckSingle` в `route.ts` — экспортируемая функция (используется
  где-то в Next.js routing magic), а не локальная — НЕ удалять, написать
  в отчёт. Сначала grep по проекту.

- Если в `auth-context.tsx` или `i18n-provider.tsx` ты находишь только
  hooks-правила (refs, exhaustive-deps) и нет ни одной правки которую можно
  безопасно сделать — **просто пропусти эти файлы**, в отчёте напиши
  «оставлено для Волны 3».
