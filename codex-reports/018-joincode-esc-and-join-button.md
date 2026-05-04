# REPORT TASK-018: Join-code — Esc для выхода + «Присоединиться» при 6 символах

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-03 23:35
> - **Финиш:** 2026-05-03 23:51
> - **Длительность:** 16 минут
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

Кодовая часть задачи выполнена в рамках whitelist: join-code wrapper стал keyboard-selected точкой входа, Esc из input переводит фокус на wrapper, а при 6 символах появляется кнопка «Присоединиться». Полные `lint`/`build`/browser QA заблокированы окружением и существующими ошибками вне whitelist; targeted lint по изменённому файлу прошёл.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` — добавлен two-stage focus для join-code: wrapper с `data-lobby-cta="join-code"`, input с `data-lobby-cta="join-code-input"`, Esc переводит в selected mode, ← возвращает на «Правила», →/Enter возвращают в editing mode.
- `src/app/lobby-preview/page.tsx` — добавлена условная кнопка `join-submit` при `joinCode.length === 6` с `console.log("join room", joinCode)` и расширен CTA order до `[start, rules, join-code, join-submit]`.

### Новые файлы

- `codex-reports/018-joincode-esc-and-join-button.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/lobby-preview/page.tsx | 104 +++++++++++++++++++++++++++++++++++++++--
 1 file changed, 99 insertions(+), 5 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ❌ | Sandbox: `error: cannot open '.git/FETCH_HEAD': Operation not permitted` |
| `npm run lint` | ❌ | Падает на существующих ошибках вне whitelist (`.agents`, `mobile`, `src/app/admin`, `src/app/game/*`, `src/lib/*`); изменённый файл в выводе не фигурирует |
| `npx eslint src/app/lobby-preview/page.tsx` | ✅ | Без ошибок |
| `npm run build` | ❌ | Turbopack sandbox failure: `creating new process`, `binding to a port`, `Operation not permitted` при `src/app/globals.css` |
| `npm run dev` | ❌ | Sandbox: `tsx` не может открыть IPC pipe, `listen EPERM .../tsx-501/...pipe` |
| `git diff --check` | ✅ | Без whitespace issues |
| Acceptance #1: `npm run build` ОК | ❌ | Заблокировано Turbopack/sandbox, не кодовой ошибкой таска |
| Acceptance #2: «Правила» → → input editing mode | ⚠️ | Реализовано кодом, browser QA заблокирован dev server sandbox |
| Acceptance #3: 6 символов → кнопка «Присоединиться» | ⚠️ | Реализовано кодом, browser QA заблокирован dev server sandbox |
| Acceptance #4: Esc в input → wrapper focused + ring | ⚠️ | Реализовано кодом, browser QA заблокирован dev server sandbox |
| Acceptance #5: ← на selected wrapper → «Правила» | ⚠️ | Реализовано кодом, browser QA заблокирован dev server sandbox |
| Acceptance #6: → на selected wrapper → input editing | ⚠️ | Реализовано кодом, browser QA заблокирован dev server sandbox |
| Acceptance #7: join-submit в CTA order при 6 символах | ⚠️ | Реализовано кодом, browser QA заблокирован dev server sandbox |
| Acceptance #8: click → `console.log("join room", joinCode)` | ⚠️ | Реализовано кодом, browser QA заблокирован dev server sandbox |

---

## Отклонения от ТЗ

- Полный `npm run build` не подтверждён из-за sandbox/Turbopack `Operation not permitted`.
- Preview/browser QA не выполнен: `npm run dev` не стартует из-за sandbox `listen EPERM` в `tsx`.
- `npm run lint` не проходит из-за существующих ошибок вне whitelist; для whitelisted файла отдельно выполнен `npx eslint src/app/lobby-preview/page.tsx` — OK.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не выполнена визуальная проверка focus-flow в браузере, потому что dev server не стартует в текущем sandbox.
- Не подтверждён `npm run build` по той же причине: Turbopack пытается создать process/listener и получает `Operation not permitted`.

---

## Подсказки для ревью

- Посмотреть `src/app/lobby-preview/page.tsx:680` — `joinSelectedByEscRef` нужен, чтобы Esc мог сфокусировать wrapper без немедленного forward обратно в input.
- Посмотреть `src/app/lobby-preview/page.tsx:689` — guard `e.target !== e.currentTarget` сохраняет нативные стрелки внутри input.
- Посмотреть `src/app/lobby-preview/page.tsx:878` — wrapper по ТЗ сделан `button tabIndex={-1}` и содержит input; это соответствует task-spec, хотя HTML-семантика у вложенных интерактивных элементов спорная.
