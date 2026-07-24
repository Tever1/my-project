# REPORT TASK-354: «100 к 1» — 12 багов из живого QA после TASK-353

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-15 21:18
> - **Финиш:** 2026-07-15 21:42
> - **Длительность:** 24 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Исправлены все 12 пунктов live QA для новой h2o-вёрстки: role guard, Enter-submit, тексты, TV layout, боковые страйки и Big Game actions. Для «Сыграть ещё раз» найден и закрыт race с устаревшим `sRef.current` при `h2o:request-state`.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/hundred-to-one/page.tsx` — mobile fixes: эксклюзивный ведущий, Enter-submit, topic title, buzzer copy, перенос строки, r4 timer label, удаление auto-check, отключение HUD в playing, синхронный `sRef`.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — только блок `hundred-to-one`: TV initial phase, topic title, buzzer copy, line break hint, compact playing layout, side strike columns.

### Новые файлы

- `codex-reports/354-h2o-live-qa-fixes.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## По пунктам TASK-354

1. TV initial root cause подтверждён: `mkH2OInitial()` был `roleSelect`; заменил на `topicSelect` в `tv/.../page.tsx:189`.
2. Роль `host` теперь no-op, если занята другим игроком, и карточка disabled визуально: `hundred-to-one/page.tsx:284`, `:795`.
3. Проверил inputs: их два. Team name input получил Enter-submit: `hundred-to-one/page.tsx:852`; Big Game input уже имел Enter.
4. Заставка показывает реальную тему: mobile `topicName(topic.id, topic.name)` на `hundred-to-one/page.tsx:989`, TV `h2oTopicName` на `tv/.../page.tsx:1197`, `:1230`.
5. Убрано «по нулю»: mobile buzzer оставляет только `ЖМИ!` на `hundred-to-one/page.tsx:1034`, TV статус заменён на `Готовьтесь` на `tv/.../page.tsx:1362`.
6. Перенос после тире сделан явно: mobile `br` на `hundred-to-one/page.tsx:1091`, TV подсказка разбита на две строки на `tv/.../page.tsx:1378`.
7. TV playing layout ужат: доска стала `grid-rows-6` внутри `flex-1`, footer оставлен одним статусом без remote hint: `tv/.../page.tsx:1443`, `:1468`. Mobile host board уже компактная, без фиксированного футера поверх доски.
8. TV strikes возвращены в боковые колонки рядом с доской, из score band убраны: `tv/.../page.tsx:1434`, `:1458`; банк остался отдельно на `:1415`.
9. В r4 mobile timer убран label «ОБСУЖДЕНИЕ»: таймер начинается сразу со значения на `hundred-to-one/page.tsx:1278`.
10. Кнопки «АВТО-ПРОВЕРКА» удалены; неиспользуемые `bgDoCheck`/`bgCheckAnswers` удалены. Остались только переходы `ИГРОК 2` и `РЕЗУЛЬТАТ`: `hundred-to-one/page.tsx:1558`, `:1563`.
11. Кнопка final действительно вызывала `startGame()`. Реальная причина была race: после `startGame()` `sRef.current` обновлялся только следующим React effect, и `h2o:request-state` мог rebroadcast-нуть старый `final` state. Исправил синхронное обновление `sRef.current` в `update()`, incoming sync/useRoomState и `startGame()`: `hundred-to-one/page.tsx:311`, `:322`, `:352`, `:387`.
12. Верхний GameLayout scoreboard отключён для playing и оставлен для results: `hundred-to-one/page.tsx:753`.

---

## Diff stat

```
 .codex/STATUS.md                              |  25 +
 src/app/design-tokens/page.tsx                | 125 ++++
 src/app/game/[roomId]/hundred-to-one/page.tsx | 828 +++++++++++++++-----------
 src/app/tv/[roomId]/[gameType]/page.tsx       | 567 ++++++++++++------
 src/components/games/GameLayout.tsx           |   4 +-
 5 files changed, 1018 insertions(+), 531 deletions(-)
```

Примечание: до старта TASK-354 дерево уже было грязным после TASK-353 и соседних задач. В рамках TASK-354 я редактировал только два whitelist-файла и этот отчёт.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | чисто |
| `npx tsc --noEmit` | ✅ | чисто |
| `npm run build` | ❌ | Turbopack internal error в sandbox: `creating new process` / `binding to a port` / `Operation not permitted` в `geist` CSS, не ошибка TS/ESLint |
| Acceptance: 12 пунктов | ✅ | все пункты закрыты |

---

## Отклонения от ТЗ

Нет отклонений по коду. Дополнительно запускал `npm run build` по workflow; он упал на sandbox/Turbopack ограничении.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Особо проверить `sRef.current` fix для пункта 11: это минимальный root-cause фикс race между `startGame()` и `h2o:request-state`.
- В TV playing-блоке проверить только геометрию: score band больше не содержит крестики, страйки находятся по бокам от `grid-rows-6` доски.
