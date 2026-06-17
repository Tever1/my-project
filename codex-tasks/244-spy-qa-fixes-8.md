# TASK-244 — Spy live-QA fixes (волна 8)

## Контекст
Live-QA Шпиона. 2 правки. Только клиент.

## Whitelist (трогать ТОЛЬКО этот файл)
- `src/app/game/[roomId]/spy/page.tsx`

## ЗАПРЕЩЕНО трогать
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`, `codex-reports/**`
- серверный код (`server.mts`, `src/server/**`), `globals.css`, любые другие файлы

## Правила
- Минимальный diff, НЕ переформатировать файл.
- НЕ запускать `npm run build`. Валидация: `npm run lint` + `npx tsc --noEmit`.
- Двуязычность ru/en (`l(ru, en)`).
- codex-reports не трогать (отчёт в выводе).

---

## #1 — peek-bar «твоё слово»: ширину вернуть на всю (как было), уменьшить ВЫСОТУ
Файл `spy/page.tsx`, функция `renderPeekBar()`.

1. Внешний div (~строка 799): сейчас
```
className="glass-card mx-auto w-4/5 p-4 select-none border-teal-400/20"
```
вернуть полную ширину и уменьшить вертикальный padding:
```
className="glass-card w-full px-4 py-2 select-none border-teal-400/20"
```
(`mx-auto w-4/5` → `w-full`; `p-4` → `px-4 py-2`.) `style={{ transform: 'none' }}` оставить.

2. Внутренний контент-блок: `min-h-[60px]` → `min-h-[44px]` (меньше высота).
```
<div className="min-h-[60px]">
```
→
```
<div className="min-h-[44px]">
```
Остальную внутреннюю верстку peek-bar не трогать.

---

## #2 — Draw mode: холст уходит за нижний край экрана, должен вписываться в окно
Файл `spy/page.tsx`, компонент `DrawCanvas`, элемент `<canvas>` (~строки 104-110).
Сейчас:
```
className={`w-full aspect-square rounded-xl bg-black/30 border transition-all touch-none ${canDraw ? 'border-amber-400/40' : 'border-white/10'}`}
```
`w-full aspect-square` на телефоне делает высоту равной ширине → квадрат уходит за
нижний край. Ограничить сторону квадрата высотой вьюпорта, чтобы он масштабировался по
размеру окна и не вылезал снизу. Заменить на:
```
className={`mx-auto w-full max-w-[45vh] aspect-square rounded-xl bg-black/30 border transition-all touch-none ${canDraw ? 'border-amber-400/40' : 'border-white/10'}`}
```
(`w-full` + `max-w-[45vh]` + `mx-auto`: квадрат не шире 45vh → высота ≤ 45vh, на широких
экранах остаётся полной ширины, по центру.) Логику canvas (useEffect с
`getBoundingClientRect`, рисование) НЕ трогать — она сама подхватывает фактический размер.

---

## Acceptance
- `npm run lint` без новых ошибок, `npx tsc --noEmit` чисто.
- diff только в `src/app/game/[roomId]/spy/page.tsx`.
- #1 peek-bar снова на всю ширину и ниже по высоте. #2 холст рисования вписывается в
  окно (не уходит за нижний край), сохраняя квадрат.
