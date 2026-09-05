# REPORT TASK-120: ingame-polish-components

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-21 19:03
> - **Финиш:** 2026-05-21 19:03
> - **Длительность:** ~30 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Созданы 5 shared-компонентов Phase G в `src/components/ingame/` и dev preview-страница `/ingame-preview`. Интеграцию в игры/TV не трогал; страница показывает по 3 варианта каждого компонента и общие controls для интерактивных секций.

---

## Что сделано

### Изменённые файлы

- (нет)

### Новые файлы

- `src/components/ingame/UrgencyTimer.tsx` — варианты `ring`, `bar`, `pulse` с urgency-порогами и Framer Motion анимациями.
- `src/components/ingame/AnimatedScore.tsx` — варианты `countup`, `pop`, `countup-pop`.
- `src/components/ingame/CelebrationBurst.tsx` — варианты `flash`, `particles`, `flash-particles`.
- `src/components/ingame/TurnIndicator.tsx` — варианты `glow-pulse`, `ring-pulse`, `spotlight`.
- `src/components/ingame/BreathingPlaceholder.tsx` — варианты `breathing-text`, `skeleton`, `skeleton-shimmer`.
- `src/components/ingame/index.ts` — named barrel exports для всех 5 компонентов.
- `src/app/ingame-preview/page.tsx` — preview-страница с секциями и controls.

### Удалённые файлы

- (нет)

---

## Diff stat

```
src/app/ingame-preview/page.tsx                 | 285 +++++++++++++++++++++++++
src/components/ingame/AnimatedScore.tsx         |  83 +++++++
src/components/ingame/BreathingPlaceholder.tsx  |  58 +++++
src/components/ingame/CelebrationBurst.tsx      | 102 +++++++++
src/components/ingame/TurnIndicator.tsx         | 107 ++++++++++
src/components/ingame/UrgencyTimer.tsx          | 131 ++++++++++++
src/components/ingame/index.ts                  |   7 +
7 files changed, 773 insertions(+)
```

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | exit 0 |
| `npx tsc --noEmit` | ✅ | без ошибок |
| `npm run build` | ✅ | exit 0 после запуска вне sandbox; внутри sandbox Turbopack упал на `binding to a port` |
| `/ingame-preview` | ✅ | dev server: `HEAD /ingame-preview` → `200 OK`; `GET /ingame-preview` → `200` |
| Browser click-check | ⚠️ | Browser MCP не стартовал: `trajectory-begin failed`, поэтому интерактивность проверена по реализации и компиляции, без кликов в браузере |

Примечание по build: при успешном `npm run build` Next вывел `ReferenceError: location is not defined`, но команда завершилась с кодом 0 и `/ingame-preview` вошёл в список routes как static page.

---

## Отклонения от ТЗ

Визуальный browser-click QA не выполнен из-за ошибки Browser MCP (`trajectory-begin failed`). Вместо этого проверены `lint`, `tsc`, production build и HTTP 200 для `/ingame-preview`.

---

## Открытые вопросы для Claude

- Нужно ли отдельно расследовать `ReferenceError: location is not defined` из успешного `npm run build`, если команда возвращает exit 0?

---

## Что НЕ сделано (если статус ⚠️ или ❌)

---

## Подсказки для ревью

- Проверить визуальный вкус трёх вариантов каждого компонента на `/ingame-preview`.
- В `AnimatedScore.tsx` локально оставлен `eslint-disable-next-line react-hooks/refs` внутри `usePrevious`, потому что ТЗ требовало inline `usePrevious`, а React Compiler запрещает чтение `ref.current` во время render.
