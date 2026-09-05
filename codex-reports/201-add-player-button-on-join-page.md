# REPORT TASK-201: Кнопка «Добавить игрока» на экране телефона (/join)

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-02 21:49
> - **Финиш:** 2026-06-02 21:54
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлена вторичная кнопка «+ Добавить игрока» на `/join/[code]` для телефона game-host'а. Кнопка находится в той же ветке `canStartGame`, что и «НАЧАТЬ ИГРУ», и эмитит `room:show-qr` с payload `{ code }`.

---

## Что сделано

### Изменённые файлы

- `src/app/join/[code]/page.tsx` — добавлен `handleAddPlayer`; host-блок старта обёрнут в колонку с основной кнопкой старта и вторичной кнопкой показа QR.

### Новые файлы

- `codex-reports/201-add-player-button-on-join-page.md` — отчёт по TASK-201.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/join/[code]/page.tsx | 65 ++++++++++++++++++++++++++++++--------------
 1 file changed, 45 insertions(+), 20 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | Без ошибок |
| `npx tsc --noEmit` | ✅ | Без ошибок |
| `npm run build` | ❌ | Turbopack internal error в sandbox: `creating new process` / `binding to a port` / `Operation not permitted` при обработке `node_modules/geist/dist/geistsans_d5a4f12f.module.css` |
| Acceptance #1 | ✅ | `npm run lint` зелёный |
| Acceptance #2 | ✅ | `npx tsc --noEmit` зелёный |
| Acceptance #3 | ✅ | Кнопка рендерится в ветке `canStartGame` под «НАЧАТЬ ИГРУ» |
| Acceptance #4 | ✅ | onClick эмитит ровно `room:show-qr` с `{ code }` |
| Acceptance #5 | ✅ | У не-game-host ветка `canStartGame` не рендерится, остаётся «Ожидание ведущего...» |

---

## Отклонения от ТЗ

Нет отклонений по реализации. Страница `/join/[code]` сейчас монолингвальная, поэтому подпись оставлена на русском в существующем паттерне файла.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Проверь `src/app/join/[code]/page.tsx`: кнопка намеренно находится внутри `canStartGame ? (...)`, чтобы её видел только телефон game-host'а.
- `npm run build` стоит перепроверить вне sandbox/ограничений Turbopack, потому что ошибка не связана с изменённым кодом.
