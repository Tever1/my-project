# REPORT TASK-194: GameSurface wrapper

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-31 22:41
> - **Финиш:** 2026-05-31 22:49
> - **Длительность:** 8 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Создан общий `GameSurface`, который связывает `isolate`, фоновый `<img>` и text-shadow в одном компоненте. `GameLayout` и quiz-блок TV теперь используют этот wrapper, остальные TV-блоки не тронуты.

---

## Что сделано

### Изменённые файлы

- `src/components/games/GameLayout.tsx` — корневой wrapper заменён на `GameSurface`, прямой фоновый `<img>` удалён.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — только quiz-TV return переведён на `GameSurface`, остальные игровые return-блоки не изменялись.

### Новые файлы

- `src/components/games/GameSurface.tsx` — общий root surface для игровых экранов с фоном, `isolate`, text-shadow и фоновым изображением.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/tv/[roomId]/[gameType]/page.tsx | 17 +++--------------
src/components/games/GameLayout.tsx     | 17 +++--------------
src/components/games/GameSurface.tsx    | 37 +++++++++++++++++++++++++++++++
3 files changed, 43 insertions(+), 28 deletions(-)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | — |
| `npm run build` | ❌ | Turbopack sandbox failure: `creating new process` / `binding to a port` / `Operation not permitted`; не связано с TS-кодом |
| `npx tsc --noEmit` | ✅ | — |
| Acceptance #1 | ✅ | `GameLayout` и quiz-TV используют `<GameSurface>` |
| Acceptance #2 | ✅ | Прямой `img ... -z-10` + `isolate` остался только внутри `GameSurface` |

---

## Отклонения от ТЗ

Нет отклонений по коду. `npm run build` не прошёл из-за sandbox-ограничения Turbopack, поэтому дополнительно выполнен `npx tsc --noEmit`.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Неприменимо.

---

## Подсказки для ревью

- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx`: изменён только quiz-render перед блоком `100 к 1 TV RENDER`.
- Проверь `src/components/games/GameSurface.tsx`: классы сохранены так, чтобы визуальный результат совпадал с прежним поведением.
