# REPORT TASK-002: Mobile layout для /lobby-preview

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-02 23:35
> - **Финиш:** 2026-05-02 23:55
> - **Длительность:** 20 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Добавлен SSR-safe `useIsMobile` и mobile-ветки inline styles для `/lobby-preview`.
На ширине до 768px hero стэкается в одну колонку, preview-card с floating badges скрывается, top bar упрощается, CTA и join input занимают всю ширину, tile-strip остаётся горизонтальным scroll-snap.

---

## Что сделано

### Изменённые файлы

- `src/app/lobby-preview/page.tsx` — добавлен inline `useIsMobile`; адаптированы TopBar, HeroLeft, hero-grid и TileStrip под mobile без изменения desktop-значений при `isMobile === false`.

### Новые файлы

- `codex-reports/002-lobby-preview-mobile.md` — отчёт по TASK-002.

### Удалённые файлы

- (нет)

---

## Diff stat

Scoped по whitelisted production-файлу:

```
 src/app/lobby-preview/page.tsx | 121 +++++++++++++++++++++++++++--------------
 1 file changed, 81 insertions(+), 40 deletions(-)
```

Полный `git diff --stat` дополнительно показывает `.codex/STATUS.md` с активным TASK-002. Этот diff был уже в рабочем дереве и Codex его не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | `Already up to date`. Первый запуск упёрся в sandbox на `.git/FETCH_HEAD`, после escalation прошёл. |
| `npm run lint` | ❌ | 73 существующие проблемы вне `src/app/lobby-preview/page.tsx`; новых lint-сообщений по whitelisted файлу нет. |
| `npm run build` | ⏭️ | Не запускал по прямой инструкции пользователя. |
| `/lobby-preview` HTTP | ✅ | Dev server на `PORT=3001`, `curl -I` вернул `HTTP/1.1 200 OK`; сервер остановлен. |
| Acceptance #1 | ⚠️ | Проверено по коду: main hero 375px получает `gridTemplateColumns: "1fr"`, `padding: "16px 16px"`, CTA full-width, tile-strip локально scrollable. Screenshot-QA недоступен: browser MCP вернул `agent-browser ENOENT`, Playwright не установлен. |
| Acceptance #2 | ✅ | Breakpoint ровно 768px: `max-width: 768px`; 769px остаётся desktop. |
| Acceptance #3 | ✅ | `<TiltedPreview>` условно не рендерится на mobile, floating badges находятся внутри него. |
| Acceptance #4 | ✅ | Nav и `FriendsOnlinePill` скрыты на mobile. |
| Acceptance #5 | ✅ | CTA row на mobile `flexDirection: "column"`, кнопки и join input `width: "100%"`. |
| Acceptance #6 | ✅ | Desktop-ветки оставляют прежние значения: 2 колонки, `gap: 120`, `padding: "32px 32px"`, nav/friends/avatar с именем видны. |
| Acceptance #7 | ✅ | `useIsMobile` initial state `false`, переключение только в `useEffect`, cleanup через `removeEventListener`. |

---

## Отклонения от ТЗ

- Полноценную визуальную проверку в Chrome/screenshot не удалось выполнить из-за недоступного browser MCP (`agent-browser ENOENT`) и отсутствующего `@playwright/test` в установленном `node_modules`.
- Полный `git diff --stat` показывает ещё `.codex/STATUS.md`, но это активная запись TASK-002, уже существовавшая в рабочем дереве. Codex этот файл не редактировал и не должен его откатывать.

---

## Открытые вопросы для Claude

нет

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- Build не запускался по инструкции пользователя.
- Screenshot-QA на 375/768/769 не выполнен из-за ограничений окружения; изменения подготовлены так, чтобы Claude мог проверить визуально вне sandbox.

---

## Подсказки для ревью

- Обрати внимание на `src/app/lobby-preview/page.tsx`: mobile-поведение целиком завязано на `isMobile`; desktop-значения сохранены в false-ветках.
- В `TileStrip` mobile-режим использует `gridAutoFlow: "column"`, `gridAutoColumns: 110`, `overflowX: "auto"` и `scrollSnapType: "x mandatory"`.
