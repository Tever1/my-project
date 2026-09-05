# REPORT TASK-012: Видимые focus-ring везде + рабочий press-effect на тайлах

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-03 22:00
> - **Финиш:** 2026-05-03 22:14
> - **Длительность:** 14 минут
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

В `src/app/lobby-preview/page.tsx` добавлены focus-ring через React state для CTA-кнопок, TopBar NavButton и RoomButton. Tile press-effect переведён с конфликтующего parent `whileTap="tap"` на прямой `whileTap={{ scale: 0.94 }}` у внутреннего tile div.

Код целевого файла проходит isolated ESLint. Полные `npm run lint` и `npm run build` не стали зелёными по существующим ошибкам вне whitelist и sandbox-ограничению Turbopack.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` — убран parent `whileTap="tap"` у Tile и удалён `tap` variant внутреннего tile div; добавлен прямой `whileTap={{ scale: 0.94, transition: spring.snappy }}`.
- `src/app/lobby-preview/page.tsx` — добавлены локальные focus state и inline `boxShadow` focus-ring для `NavButton`, `RoomButton`, `data-lobby-cta="start"` и `data-lobby-cta="rules"`.

### Новые файлы

- `codex-reports/012-fix-focus-rings-tile-press.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Целевой production diff:

```text
 src/app/lobby-preview/page.tsx | 186 +++++++++++++++++++++++++++++++++++++----
 1 file changed, 170 insertions(+), 16 deletions(-)
```

Полный `git diff --stat` также показывает `.codex/STATUS.md`, но этот файл был изменён до начала TASK-012 и не редактировался мной.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ❌ | Sandbox: `error: cannot open '.git/FETCH_HEAD': Operation not permitted` |
| `npx eslint src/app/lobby-preview/page.tsx` | ✅ | Целевой файл без ошибок |
| `npm run lint` | ❌ | Падает на существующих ошибках вне whitelist (`.agents`, `mobile`, `src/app/admin`, игровые страницы, `src/lib/*`); ошибок по `src/app/lobby-preview/page.tsx` нет |
| `npm run build` | ❌ | Turbopack internal error из-за sandbox: `creating new process`, `binding to a port`, `Operation not permitted` |
| Acceptance #1: `npm run build` успешен | ❌ | Не подтверждено из-за sandbox/Turbopack |
| Acceptance #2: mouse-click press на тайле | ⚠️ | Реализовано статически через прямой `whileTap`; browser QA не запускался |
| Acceptance #3: focus ring на tile/start/rules/NavButton/RoomButton | ✅ | Реализовано через inline styles + React state |
| Acceptance #4: Enter на тайле переводит focus на start CTA | ✅ | Существующий handler из TASK-010/010.4 сохраняется; start CTA теперь имеет ring |
| Acceptance #5: mouse-focus ring допустим | ✅ | State-based focus ring сработает и при mouse focus |

---

## Отклонения от ТЗ

- Полный `npm run build` не прошёл из-за sandbox/Turbopack ограничения, а не из-за целевого файла.
- Полный `npm run lint` не зелёный из-за существующих ошибок вне whitelist. Целевой файл проверен отдельно и проходит.
- В `.codex/STATUS.md` висит активный lock TASK-010 на тот же файл, но отчёты по 010/010.x/011 уже присутствуют. Я работал поверх текущего состояния `src/app/lobby-preview/page.tsx`, не откатывая чужие незакоммиченные изменения.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не удалось подтвердить зелёный `npm run build` в текущем sandbox.
- Не проводился browser QA кликом/Tab; визуальное поведение проверено по коду.

---

## Подсказки для ревью

- Посмотреть `src/app/lobby-preview/page.tsx`: `NavButton`, `RoomButton`, CTA start/rules теперь имеют собственный `focused` state и inline `boxShadow`.
- Посмотреть `Tile`: parent `motion.button` больше не имеет `whileTap="tap"`, а внутренний квадратный `motion.div` получил прямой `whileTap={{ scale: 0.94, transition: spring.snappy }}`.
