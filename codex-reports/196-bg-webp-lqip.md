# REPORT TASK-196: Фоны игр — WebP + blur-плейсхолдер (LQIP)

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-06-02 20:58
> - **Финиш:** 2026-06-02 21:03
> - **Длительность:** 5 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Фоны из `public/backgrounds/*.png` оптимизированы в WebP q80, рядом создана LQIP-карта `lqip.json`. `GameSurface` теперь показывает размытый data-URI placeholder и плавно проявляет полный фон после `onLoad`, а quiz metadata переключена на `.webp`.

---

## Что сделано

### Изменённые файлы

- `package.json` — добавлен npm-скрипт `optimize-bg`.
- `src/lib/quiz/index.ts` — `backgroundUrl` для Harry Potter и Marvel переключены с `.png` на `.webp`.
- `src/components/games/GameSurface.tsx` — добавлен LQIP-слой под основным фоном и CSS fade-in полного изображения.

### Новые файлы

- `scripts/optimize-bg.mjs` — sharp-скрипт для генерации WebP q80 и `public/backgrounds/lqip.json`.
- `public/backgrounds/harry-potter.webp` — 96 KB вместо 1.5 MB PNG.
- `public/backgrounds/harry-potter1.webp` — 139 KB вместо 871 KB PNG.
- `public/backgrounds/marvel.webp` — 112 KB вместо 808 KB PNG.
- `public/backgrounds/marvel1.webp` — 109 KB вместо 804 KB PNG.
- `public/backgrounds/lqip.json` — 649 B, data-URI placeholders для 4 фонов.

### Удалённые файлы

- (нет)

---

## Diff stat

Scoped diff для файлов TASK-196:

```
 package.json                         |  1 +
 src/components/games/GameSurface.tsx | 42 +++++++++++++++++++++++++++++-------
 src/lib/quiz/index.ts                |  8 +++----
 3 files changed, 39 insertions(+), 12 deletions(-)
```

Новые файлы TASK-196:

```
    1882 scripts/optimize-bg.mjs
   98302 public/backgrounds/harry-potter.webp
  142832 public/backgrounds/harry-potter1.webp
  115182 public/backgrounds/marvel.webp
  111376 public/backgrounds/marvel1.webp
     649 public/backgrounds/lqip.json
```

В worktree уже были чужие изменения TASK-197/198 и служебные изменения в `.codex/STATUS.md`, `CLAUDE.md`, `.claude/hooks/post-commit.sh`; я их не трогал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без ошибок |
| `npx tsc --noEmit` | ✅ | без ошибок |
| Acceptance #1 | ✅ | lint зелёный |
| Acceptance #2 | ✅ | tsc зелёный |
| Acceptance #3 | ✅ | `.webp` существуют и заметно меньше PNG |
| Acceptance #4 | ✅ | `lqip.json` содержит `data:image/webp;base64,...` для каждого PNG-фона |
| Acceptance #5 | ✅ | LQIP/fade-in реализованы в `GameSurface`; визуальную проверку выполняет пользователь по ТЗ |
| Acceptance #6 | ✅ | `isolate` на корне сохранён, фоновые слои находятся внутри `GameSurface` под контентом через `-z-10` |
| Browser smoke | ⚠️ | `npm run dev` не стартует в sandbox: `tsx` падает с `listen EPERM` на IPC pipe |

---

## Отклонения от ТЗ

нет отклонений.

---

## Открытые вопросы для Claude

нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

не применимо.

---

## Подсказки для ревью

- Проверь `src/components/games/GameSurface.tsx`: placeholder резолвится по имени файла из `backgroundUrl`, отсутствующий LQIP gracefully пропускается.
- Старые PNG не удалялись.
