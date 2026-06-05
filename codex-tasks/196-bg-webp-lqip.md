# TASK-196: Фоны игр — WebP + blur-плейсхолдер (LQIP)

> **Метаданные**
> - **Дата создания:** 2026-06-02
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~15 минут
> - **Зависит от тасков:** —

---

## Цель

Фоновые картинки игр грузятся на телефоне медленно (PNG 0.8–1.5 МБ). Перевести
их на WebP (в 5–8 раз меньше) и показывать мгновенный размытый плейсхолдер (LQIP),
пока грузится полный фон, с плавным fade-in.

---

## Контекст

Фоны лежат в `public/backgrounds/` (`harry-potter.png` 1.5 МБ, `marvel.png` 808 КБ
и т.д.). Они рендерятся через `<GameSurface>` (`src/components/games/GameSurface.tsx`),
`fetchPriority="high"` уже стоит, но размер файла — главная проблема на мобильной
сети. Багрепорт пользователя 2026-06-02, пункт 1. Решение утверждено: WebP +
blur-плейсхолдер.

`sharp` уже есть в зависимостях (используется в `scripts/strip-bg.mjs`).

---

## Файлы к изменению (whitelist)

- `scripts/optimize-bg.mjs` — **НОВЫЙ.** Скрипт: берёт каждый `public/backgrounds/*.png`,
  пишет рядом `<name>.webp` (quality 80) и генерирует base64-LQIP (крошечный blur,
  ширина ~16px, webp/jpeg → base64 data-URI). LQIP-карту складывает в
  `public/backgrounds/lqip.json` (`{ "harry-potter": "data:image/...", ... }`).
- `package.json` — добавить npm-скрипт `"optimize-bg": "node scripts/optimize-bg.mjs"`.
- `public/backgrounds/*.webp` — сгенерированные файлы (результат прогона скрипта).
- `public/backgrounds/lqip.json` — карта плейсхолдеров (результат прогона).
- `src/lib/quiz/index.ts` — заменить `backgroundUrl: '/backgrounds/<name>.png'` на
  `.webp` (4 строки: harry-potter, marvel в `QUIZ_TOPICS`; harry-potter-1, marvel-1
  в `SPECIAL_QUIZZES`).
- `src/components/games/GameSurface.tsx` — добавить blur-плейсхолдер: пока полный фон
  не загрузился (`onLoad`), показывать размытую LQIP-картинку под ним; по `onLoad`
  плавно показать полный фон (CSS opacity transition). LQIP резолвить по имени файла
  из `backgroundUrl` через `lqip.json` (импорт JSON). Если LQIP не найден — просто
  без плейсхолдера (graceful).

### НЕ ТРОГАТЬ

- Старые `*.png` в `public/backgrounds/` — НЕ удалять (оставить как есть, на них
  ещё могут ссылаться `iconUrl` и т.п.). Меняем только `backgroundUrl`-ссылки.
- `scripts/strip-bg.mjs`, `scripts/generate-image.mjs` — не трогать.
- никакие файлы вне whitelist
- `CLAUDE.md`, `AGENTS.md`, `codex-tasks/**`, `.codex/**`

---

## Шаги реализации

1. Написать `scripts/optimize-bg.mjs` (sharp): для каждого `public/backgrounds/*.png`
   → `<name>.webp` (q80) + LQIP base64 (resize width 16, blur, webp, toBase64 data-URI).
   Собрать `lqip.json`.
2. Добавить `optimize-bg` в `package.json` scripts.
3. Прогнать `node scripts/optimize-bg.mjs` → закоммитятся `.webp` + `lqip.json`.
4. Обновить 4 `backgroundUrl` в `src/lib/quiz/index.ts` на `.webp`.
5. В `GameSurface.tsx` добавить два слоя: нижний `<div>` с `background-image: url(LQIP)`,
   `filter: blur(...)`, `object-cover`; верхний — полный `<img>` с `opacity:0 → 1`
   по `onLoad` (CSS transition ~300ms). Сохранить `isolate`/`-z-10`-конвенцию
   (правило №7 CLAUDE.md): оба слоя внутри `GameSurface`, под контентом.

> Если LQIP-подход потребует трогать другие игровые экраны — остановиться, написать
> в отчёт. По идее всё инкапсулировано в `GameSurface`.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` зелёный (build в sandbox падает на Turbopack — это норма,
      используем tsc+lint)
- [ ] `public/backgrounds/*.webp` существуют и весят заметно меньше PNG
- [ ] `lqip.json` содержит data-URI для каждого фона
- [ ] `GameSurface` показывает размытый плейсхолдер мгновенно и плавно fade-in
      полного фона по загрузке (визуально проверит пользователь)
- [ ] Конвенция фона (`isolate` + `-z-10`) не сломана — фон виден на мобилке

---

## Ограничения и подводные камни

- **Правило №7 CLAUDE.md:** фон игрового экрана — только через `GameSurface`,
  `isolate` на корне обязателен. Оба новых слоя — внутри обёртки, под `children`.
- LQIP data-URI должны быть КРОХОТНЫЕ (16px) — иначе раздуют JS-bundle. Цель — <1 КБ
  на картинку.
- WebP q80 — баланс размер/качество; если визуально плохо, q85.
- Комментарии в коде — английский.

---

## Контрольные точки для самопроверки Codex

1. `git diff --stat` + `git diff`.
2. Не вышел за whitelist (особенно: PNG не удалены).
3. `npm run lint` + `npx tsc --noEmit`.
4. Заполнить `codex-reports/196-bg-webp-lqip.md`.
5. **Не коммитить.**

---

## Открытые вопросы для Codex

- Формат LQIP — webp или jpeg base64? — **webp, как и основной фон**.
- Удалять ли старые PNG? — **НЕТ**, оставить.
- Анимация fade-in — Framer Motion или CSS? — **CSS-only** (GameSurface не тянет FM).
