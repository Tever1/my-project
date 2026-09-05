# TASK-299 — Alias редизайн, шаг 2: розовые карточки (alias-card)

## Контекст
Шаг 2 редизайна Alias. Классы `.alias-card` уже добавлены в globals (TASK-298).
Переводим ОСНОВНЫЕ инфо-поля на розовый `alias-card` и красим текст внутри них
в белый (как на градиентных карточках Шпиона/Крокодила). Селект-карточки (выбор
режима/команды) и мелкие счётные плитки команд — НЕ трогаем (остаются стеклянными
для контраста и affordance выбора). **ВИЗУАЛ ТОЛЬКО**, логику/фазы/scoring/classic
не трогать.

Файл: `src/app/game/[roomId]/alias/page.tsx`.

## Перевести в `alias-card` (добавить класс `alias-card` в начало className GlassCard):
1. **Карточка слова (explainer)** — стр. ~907:
   `<GlassCard className="w-full max-w-md p-8 text-center">`
   → `<GlassCard className="alias-card w-full max-w-md p-8 text-center">`
2. **Letter-режим, не-explainer** — стр. ~927:
   `<GlassCard className="w-full max-w-md p-8 text-center">`
   → `<GlassCard className="alias-card w-full max-w-md p-8 text-center">`
3. **Classic-режим, не-explainer** — стр. ~949:
   `<GlassCard className="w-full max-w-md p-8 text-center">`
   → `<GlassCard className="alias-card w-full max-w-md p-8 text-center">`
4. **turnResult — главная карточка** — стр. ~995:
   `<GlassCard className="w-full max-w-md p-6 text-center">`
   → `<GlassCard className="alias-card w-full max-w-md p-6 text-center">`
5. **finished — карточка итогов** — стр. ~1081:
   `<GlassCard className="w-full max-w-md p-6 text-center">`
   → `<GlassCard className="alias-card w-full max-w-md p-6 text-center">`

## Внутри ЭТИХ ПЯТИ карточек — перекрасить текст в белый:
Применять правило ТОЛЬКО внутри пяти карточек выше:
- `style={{ color: 'var(--text-primary)' }}` → удалить style, добавить класс `text-white`.
- `style={{ color: 'var(--text-secondary)' }}` → удалить style, добавить класс `text-white/70`.
- `text-purple-400` → `text-white` (буква в letter-режиме, стр. ~913 и ~933).
- Янтарные числа (`text-amber-400`) и подсветку строк истории
  (`bg-green-500/10` / `bg-red-500/10`) ОСТАВИТЬ как есть — читаются на розовом.

Пример (карточка слова, было):
```
<p className="text-sm uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
```
стало:
```
<p className="text-sm uppercase tracking-wider mb-2 text-white/70">
```

## НЕ ТРОГАТЬ (остаются стеклянными):
- Карточки выбора режима (classic/letter, стр. ~591, ~619).
- Карточки выбора команды (teamSelect, стр. ~691) и waiting-плитки команд (~782).
- Мелкая «explainer info» плитка (стр. ~889) — оставить GlassCard как есть.
- Плитки счёта команд в turnResult (стр. ~1055) и в explaining (~864) — как есть.
- Кнопки (следующий шаг 3).

## Whitelist (только эти файлы)
- `src/app/game/[roomId]/alias/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: globals.css, TV, другие игры, `CLAUDE.md`, `AGENTS.md`, `.codex/**`,
`codex-tasks/**`. **`npm run build` НЕ запускать** — tsc + lint достаточно.

## Acceptance
- 5 указанных карточек — на розовом `alias-card`, текст внутри белый/читаемый.
- Селект-карточки и счётные плитки остались стеклянными.
- Classic/letter логика не изменена.
- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/299-alias-redesign-pink-cards.md`. Не коммитить.
