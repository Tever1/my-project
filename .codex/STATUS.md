# Codex ↔ Claude — Шина состояния

Кто что делает прямо сейчас. Перед стартом любой работы — проверить этот файл.
После завершения — обновить.

---

## Активные таски

_Сейчас никто ничего не делает._

<!--
Формат записи активного таска:

### TASK-NNN: <короткое название>
- **Статус:** in-progress | review | blocked
- **Исполнитель:** Codex (auto by Claude) | Codex (manual by user) | Claude
- **Запущено:** 2026-05-01 23:45
- **Файлы (locked):** src/foo/bar.ts, src/foo/baz.ts
- **Task spec:** `codex-tasks/NNN-name.md`
- **Report:** `codex-reports/NNN-name.md` (если есть)
-->

---

## Правила работы с шиной

1. **Один таск = эксклюзивная блокировка файлов.** Если в активном таске стоит
   `src/foo/bar.ts`, никто другой этот файл не трогает до завершения.
2. **Codex перед стартом** делает `git pull` и сверяется с STATUS.md.
3. **Claude никогда не правит файлы**, которые залочены за активным Codex-таском.
4. **После завершения** — переносим запись в раздел «История» ниже + удаляем
   из «Активных».
5. **Если таск заблокирован** (нужно решение от Claude/пользователя) — статус
   `blocked` + причина в комментарии.

---

## История (последние 10 завершённых)

### TASK-002.1: Mobile polish (breakpoint 768→900, brand nowrap) — ✅ done
- Завершено: 2026-05-03
- Коммит: _(вместе с TASK-002)_
- Резюме: breakpoint поднят до 900px (имя Аня больше не обрезается на
  769-900). Brand "Party Hub" получил `whiteSpace: nowrap` (не переносится
  на 375px). Diff: ровно 2 строки изменений.

### TASK-002: Mobile layout для /lobby-preview — ✅ done
- Завершено: 2026-05-02
- Коммит: _(pending)_
- Резюме: добавлен SSR-safe `useIsMobile` (breakpoint 768px), hero
  стэкается в одну колонку, TiltedPreview/floating badges/nav/
  FriendsOnlinePill/имя в Avatar скрыты на мобиле, CTA-row
  стэкается вертикально с full-width кнопками, tile-strip получил
  scroll-snap. Desktop layout не изменился. Build OK, lint без новых.

### TASK-001: Убрать unused variables — ✅ done
- Завершено: 2026-05-02
- Коммит: _(pending — ждёт ревью пользователя)_
- Резюме: lint 82 → 73 problems, все 9 целевых warnings/errors убраны.
  Build OK. Diff в 5 whitelisted файлах (+12 -14). Codex использовал
  `void` pattern для сохранения сигнатур `_totalTime` и `socketId`
  вместо удаления (правильное решение — не ломает callers).

<!--
Формат истории:

### TASK-NNN: <название> — ✅ done | ❌ failed | 🔄 reverted
- Завершено: 2026-05-01 23:55
- Коммит: `abc1234`
- Резюме: что вышло, какие были отклонения
-->
