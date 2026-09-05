# REPORT TASK-017: Стрелкой → с «Правила» переходить на «Код комнаты» input

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-03 23:36
> - **Финиш:** 2026-05-03 23:38
> - **Длительность:** 2 минуты
> - **Статус:** ⚠️ partial

---

## Резюме (TL;DR)

Кодовое изменение выполнено по ТЗ: CTA-навигация теперь знает порядок
`start -> rules -> join-code`, а input кода комнаты получил
`data-lobby-cta="join-code"`. Статус partial только из-за проверок:
`git pull`, `npm run lint` и `npm run build` не смогли пройти в текущем
окружении по причинам вне изменённого файла.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` — расширена keyboard-навигация CTA до трёх
  элементов без wrap; input «Код комнаты» помечен `data-lobby-cta="join-code"`.

### Новые файлы

- `codex-reports/017-rules-to-join-code-input.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/lobby-preview/page.tsx | 12 ++++++++++--
 1 file changed, 10 insertions(+), 2 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ❌ | Sandbox: `error: cannot open '.git/FETCH_HEAD': Operation not permitted` |
| `npm run lint` | ❌ | 73 существующие проблемы вне TASK-017 whitelist; `src/app/lobby-preview/page.tsx` в выводе lint не фигурирует |
| `npm run build` | ❌ | Turbopack internal error: `binding to a port - Operation not permitted (os error 1)` при обработке `src/app/globals.css` |
| Acceptance #1: `npm run build` ОК | ❌ | Заблокировано sandbox/Turbopack, см. выше |
| Acceptance #2: «Правила» → → input | ✅ | Реализовано через `ctaOrder = ["start", "rules", "join-code"]` |
| Acceptance #3: «Начать партию» → → «Правила» → → input | ✅ | Реализовано тем же order без wrap |
| Acceptance #4: «Начать партию» ← → ничего | ✅ | Left edge: `next < 0` возвращает без фокуса |
| Acceptance #5: внутри input ←/→ двигают курсор | ✅ | Handler по-прежнему выходит на `tag === "INPUT"` до CTA-ветки |

---

## Отклонения от ТЗ

Кодовых отклонений нет. Проверки `git pull` и `npm run build` не прошли из-за
ограничений окружения; `npm run lint` падает на существующих ошибках вне
whitelist задачи.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Не удалось подтвердить `npm run build` в текущем sandbox из-за Turbopack
  panic на операции, требующей binding to a port.
- Не исправлял lint-ошибки вне whitelist TASK-017.

---

## Подсказки для ревью

- Проверь `src/app/lobby-preview/page.tsx:183` — CTA-навигация теперь линейная
  без wrap.
- Проверь `src/app/lobby-preview/page.tsx:860` — input получил
  `data-lobby-cta="join-code"`.
