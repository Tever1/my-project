# REPORT TASK-364: TV «100 к 1» — заменить QR-код в central panel teamNames

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-20 21:20 PDT
> - **Финиш:** 2026-07-20 21:28 PDT
> - **Длительность:** 8 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

На TV-экране «100 к 1» для фазы `teamNames` центральная панель больше не показывает QR-код. Fallback-ветка трёхфазного блока теперь рендерит glass-сообщение «Игроки выбирают название команды...», стилистически совпадающее с `captainSelect`.

---

## Что сделано

### Изменённые файлы

- `src/app/tv/[roomId]/[gameType]/page.tsx` — в блоке `(roleSelect || captainSelect || teamNames)` заменён QR-блок fallback-ветки на текстовую панель для `teamNames`.

### Новые файлы

- `codex-reports/364-h2o-tv-teamnames-center-message.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff по строкам

- `src/app/tv/[roomId]/[gameType]/page.tsx:1363` — fallback-ветка после `captainSelect` теперь относится к `teamNames`.
- `src/app/tv/[roomId]/[gameType]/page.tsx:1364-1366` — добавлен div с тем же `className`, что у `captainSelect`, и текстом:

```tsx
{l('Игроки выбирают название команды...', 'Players are choosing a team name...')}
```

Удалённый из этой ветки QR-блок использовал `QRCodeCanvas`, `joinUrl` и `roomId`, но эти сущности продолжают использоваться в других местах файла.

---

## Diff stat

```
src/app/tv/[roomId]/[gameType]/page.tsx | 635 +++++++++++++++++++++++---------
1 file changed, 461 insertions(+), 174 deletions(-)
```

Примечание: stat выше включает ранее существующие незакоммиченные изменения в этом файле. Собственная правка TASK-364 — только замена fallback-содержимого центральной панели на строках 1363-1366.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run lint` | ✅ | без warnings/errors |
| Acceptance: teamNames без QR | ✅ | fallback-ветка показывает текстовую панель |
| Acceptance: roleSelect/captainSelect без изменений | ✅ | эти ветки не менялись |
| Acceptance: боковые панели команд | ✅ | не менялись |

---

## Отклонения от ТЗ

Нет отклонений. Отчёт создан дополнительно к source-whitelist, потому что он явно запрошен в секции «Отчёт».

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано

Не запускалась визуальная проверка в браузере; задача подтверждена статической JSX-правкой, TypeScript и lint.

---

## Подсказки для ревью

- Проверить `src/app/tv/[roomId]/[gameType]/page.tsx:1363-1366`: fallback внутри тройного условия теперь остаётся единственной веткой для `teamNames` и показывает нужный bilingual-текст.
