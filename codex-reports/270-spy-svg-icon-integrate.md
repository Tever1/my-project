# REPORT TASK-270: Шпион — общий SVG-SpyIcon + замена PNG-иконок в игре

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-20 20:20 PDT
> - **Финиш:** 2026-06-20 20:30 PDT
> - **Длительность:** 10 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Создан общий `SpyIcon` с inline-SVG и CSS-маской для `mask`. Мобильная страница Шпиона теперь импортирует общий компонент, локальный PNG-helper удалён, header `GameLayout` использует маску-компонент.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/spy/page.tsx` — удалён локальный `SpyIcon` на PNG, добавлен импорт общего компонента, header icon заменён на `<SpyIcon name="mask" ... />`.

### Новые файлы

- `src/components/games/SpyIcon.tsx` — общий компонент с 14 именами иконок, line-SVG для всех кроме `mask`, `mask` через CSS-маску `/icons/spy/mask-face.png`, цвет через `currentColor`.
- `codex-reports/270-spy-svg-icon-integrate.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```text
src/components/games/SpyIcon.tsx        | 125 +++++++++++++++++++++++++++++++++
src/app/game/[roomId]/spy/page.tsx      |   8 +--
codex-reports/270-spy-svg-icon-integrate.md |  61 ++++++++++++++++
```

Примечание: в рабочем дереве до TASK-270 уже были unrelated изменения/новые файлы по TASK-267/268/269 (`codex-tasks/_DONE.md`, `scripts/icon-mask.mjs`, `src/app/design-tokens/page.tsx`, `public/icons/spy/mask-face.png` и др.). Я их не трогал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без вывода ошибок |
| `npm run lint` | ✅ | `eslint` без ошибок |
| `npm run build` | ❌ | Turbopack internal error: sandbox запретил `creating new process` / `binding to a port` при обработке `src/app/globals.css`; не похоже на ошибку TASK-270 |
| grep: нет `/icons/spy/` в `spy/page.tsx` | ✅ | `grep -nE "function SpyIcon|/icons/spy/" ...` вернул пустой результат |
| grep: нет локальной `function SpyIcon` | ✅ | тот же grep вернул пустой результат |
| Имена иконок Шпиона есть в `SpyIconName` | ✅ | `mask, speech, palette, ballot, check, cross, hide, refresh, shield, trophy` присутствуют; также добавлены `eye, medal, skip, warning` |

---

## Отклонения от ТЗ

Нет отклонений по коду. Дополнительный `npm run build` не прошёл из-за Turbopack/sandbox runtime error, не из-за TypeScript или изменённых файлов.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/components/games/SpyIcon.tsx`: компонент намеренно не форсит цвет и наследует `currentColor`, кроме `backgroundColor: currentColor` для CSS-маски.
- Проверь `src/app/game/[roomId]/spy/page.tsx`: после удаления локального helper все существующие `<SpyIcon ... />` остались на том же API.
