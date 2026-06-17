# TASK-228 — ЗАВЕРШИТЬ кнопка в контентной области GameLayout

## Цель
Добавить кнопку «Завершить игру» в нижней части контентной области `GameLayout`.
Сейчас она есть только в хедере (маленькая `variant="danger"` кнопка справа вверху).
Нужно добавить вторую — внутри scrollable content, после `{children}`, чтобы она была
доступна при любом скролле на всех экранах всех 7 игр.

Эта кнопка должна использовать тот же `setEndConfirmOpen(true)` хендлер → открывает
уже существующую модалку подтверждения. Показывается ТОЛЬКО когда `onEnd` задан
(т.е. только для хоста).

## Whitelist файлов

```
src/components/games/GameLayout.tsx
```

## Что делать

В `GameLayout.tsx` — добавить после тега `</AnimatePresence>` (но внутри внешнего
`<div className="flex-1 ...">`) следующий блок:

```tsx
{onEnd && (
  <div className="pb-4 pt-2">
    <button
      type="button"
      onClick={() => setEndConfirmOpen(true)}
      className="w-full rounded-xl border border-red-500/20 bg-red-500/5 py-2.5 text-sm text-red-400/60 transition-colors hover:border-red-500/40 hover:text-red-400/90 active:bg-red-500/10"
    >
      {locale === 'ru' ? 'Завершить игру' : 'End game'}
    </button>
  </div>
)}
```

Стиль: очень тихий (ghost-danger), чтобы не отвлекать во время игры, но явно красноватый
и доступный. Не используй GlassButton — чистый `<button>` достаточен.

## Acceptance

- `npm run lint` → 0 ошибок
- `npx tsc --noEmit` → 0 ошибок
- Нет правок вне whitelist файлов
- Нет дублирования логики — реиспользует `setEndConfirmOpen` и существующую модалку

## Не делать

- Не трогать хедер-кнопку (оставить как есть)
- Не трогать модалку подтверждения
- Не добавлять новые пропы в `GameLayoutProps`
- Не трогать другие файлы

## Отчёт

`codex-reports/228-gamelayout-end-button-in-content.md`
