# REPORT TASK-028: Унификация дизайна лобби

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-07 21:19 PDT
> - **Финиш:** 2026-05-07 22:06 PDT
> - **Длительность:** 47 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Новый PS5 lobby вынесен из `/` в shared `<Lobby />`; `/` и `/lobby/[roomId]` теперь рендерят один компонент. Старый GlassCard/GlassButton layout в `src/app/lobby/[roomId]/page.tsx` удалён, route стал тонким wrapper.

---

## Что сделано

### Изменённые файлы

- `src/app/page.tsx` — заменён на тонкий wrapper `return <Lobby />`.
- `src/app/lobby/[roomId]/page.tsx` — заменён на тонкий wrapper с `useParams()` и `<Lobby initialRoomCode={roomId} />`.

### Новые файлы

- `src/components/lobby/Lobby.tsx` — shared lobby component, перенесён текущий PS5-дизайн и добавлен `initialRoomCode?: string`.
- `src/components/lobby/index.ts` — barrel export для `Lobby`.
- `codex-reports/028-unify-lobby-design.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Tracked diff:

```text
 src/app/lobby/[roomId]/page.tsx |  357 +-----
 src/app/page.tsx                | 2279 +--------------------------------------
 2 files changed, 8 insertions(+), 2628 deletions(-)
```

Новые файлы:

```text
 src/components/lobby/Lobby.tsx  | 2313 lines
 src/components/lobby/index.ts   | 1 line
 codex-reports/028-unify-lobby-design.md
```

Полный `git diff --stat` также показывает pre-existing `.codex/STATUS.md`; я его не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `git pull` | ✅ | `Already up to date` после sandbox escalation. |
| `npm run lint` | ✅ | Exit 0. |
| `npx tsc --noEmit` | ✅ | Exit 0. |
| `npm run build` | ✅ | В sandbox упал на known Turbopack `Operation not permitted`; повтор вне sandbox успешен, exit 0. Known `ReferenceError: location is not defined` во время SSG остался. |
| `wc -l src/app/page.tsx src/app/lobby/[roomId]/page.tsx` | ✅ | 7 и 9 строк. |
| HTTP smoke `/` | ✅ | Dev server: 200, HTML содержит `Создать комнату`. |
| HTTP smoke `/lobby/ABCXYZ` | ✅ | Dev server: 200, HTML содержит `Комната · ABCXYZ`. |
| Old imports check | ✅ | `src/app/lobby/[roomId]/page.tsx` больше не импортирует `GlassCard`, `GlassButton`, `games-config`, `useTranslation`. |

---

## Поведение

- Root `/` работает как showcase/create entrypoint.
- После успешного `room:create` shared lobby делает `router.push('/lobby/' + code)`, чтобы URL отражал комнату.
- `/lobby/[roomId]` стартует с room chip, скрывает inline join-code input, делает auth redirect на `/auth?redirect=/lobby/<code>` для unauth user и при подключённом socket отправляет `room:join`.
- Для direct room route пользователь не считается host до прихода `room:state`; root showcase поведение сохранено.

---

## Отклонения от ТЗ

Нет отклонений по коду. Dev-сервер был поднят для smoke-проверки и остановлен после проверки, чтобы не оставлять висящий процесс.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

Не применимо.

---

## Подсказки для ревью

- Основной review focus: `src/components/lobby/Lobby.tsx` вокруг `initialRoomCode`, `room:join`, `room:create` redirect и `isCurrentUserHost`.
- `src/app/lobby/[roomId]/page.tsx` теперь intentionally не содержит старый lobby UI.
