# REPORT TASK-039: Mobile vertical drift final

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-08 23:43 PDT
> - **Финиш:** 2026-05-08 23:49 PDT
> - **Длительность:** 6 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен финальный набор ограничений против вертикального дрейфа mobile tile-strip: body-scroll lock, `overscroll-behavior: contain`, `overflowY: hidden` на страйпе и mobile tween вместо spring при pressed. Десктопная анимация не менялась.

---

## Что сделано

### Изменённые файлы

- `src/app/globals.css` — расширен `.tile-strip-mobile`: добавлен `overscroll-behavior: contain`; добавлен `body.lobby-mobile-locked` для блокировки body scroll.
- `src/components/lobby/Lobby.tsx` — `Lobby` добавляет/снимает `lobby-mobile-locked` на `body` при `isMobile`; grid tile-strip получил `overflowY: "hidden"`; `Tile` на mobile использует короткий tween вместо spring.

### Новые файлы

- `codex-reports/039-mobile-vertical-drift-final.md` — отчёт по TASK-039.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/globals.css            | 13 +++++++++++++
 src/components/lobby/Lobby.tsx | 18 ++++++++++++++++--
 2 files changed, 29 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | 0 problems |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | — | не запускался, в ТЗ не требовался |
| Acceptance: body-lock на mobile | ✅ | class добавляется в effect и снимается cleanup-ом |
| Acceptance: overscroll/rubber-band ограничен | ✅ | `.tile-strip-mobile { overscroll-behavior: contain; }` + `overflowY: hidden` |
| Acceptance: mobile pressed без spring | ✅ | mobile transition использует tween |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

—

---

## Подсказки для ревью

- Проверить на реальном mobile/Safari, что `body.lobby-mobile-locked` снимается после ухода со страницы и не оставляет `position: fixed` на body.
