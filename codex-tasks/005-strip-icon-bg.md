# TASK-005: Удалить белый фон с иконок игр (RGB → RGBA)

> **Метаданные**
> - **Дата создания:** 2026-05-03
> - **Сложность:** simple
> - **Запуск:** auto by Claude
> - **Ожидаемое время Codex:** ~5 минут
> - **Зависит от тасков:** —

---

## Цель

Создать скрипт `scripts/strip-bg.mjs`, который проходит по всем PNG в
`public/icons/games/` и делает белый фон прозрачным. Зарегистрировать его
как `npm run strip-bg` в `package.json`.

После запуска `mafia.png` и `quiz.png` должны иметь альфа-канал
(`file <png>` показывает `RGBA` вместо `RGB`), белые пиксели заменены
прозрачностью.

---

## Контекст

ChatGPT image gen экспортирует PNG **без альфа-канала** (`8-bit/color RGB`),
из-за чего белый фон зашит реальными пикселями и виден на тайлах в
`/lobby-preview`. Тайл получает белую рамку вокруг иконки вместо прозрачности.

Подтверждено через `file public/icons/games/mafia.png`:
```
PNG image data, 1254 x 1254, 8-bit/color RGB, non-interlaced
```

Для `quiz.png` то же самое.

`sharp` уже не установлен в проекте — Claude установит его как `devDependency`
**до запуска скрипта** (Codex sandbox без сети).

---

## Файлы к изменению (whitelist)

- `scripts/strip-bg.mjs` — **новый файл**, скрипт обработки.
- `package.json` — добавить script `"strip-bg": "node scripts/strip-bg.mjs"`
  в секцию `"scripts"`. Не трогать `"dependencies"` / `"devDependencies"` —
  `sharp` поставит Claude.

### НЕ ТРОГАТЬ

- сами PNG в `public/icons/games/` — их меняет скрипт при запуске, не Codex руками.
- `CLAUDE.md`, `AGENTS.md` — обновляет только Claude.
- никакие другие файлы.

---

## Шаги реализации

1. Создать `scripts/strip-bg.mjs`:
   - Импортировать `sharp` и `fs/promises`, `path`, `url`.
   - Найти все `*.png` в `public/icons/games/` (исключая `*.bak.png` если есть).
   - Для каждого:
     - Прочитать через `sharp(file).ensureAlpha()`.
     - Использовать `.removeAlpha()` + `.joinChannel()` ИЛИ raw-pixel processing
       чтобы заменить пиксели где `R > 240 && G > 240 && B > 240` (близкие к белому)
       на прозрачные (alpha = 0). Tolerance 15 единиц на канал.
     - Сохранить **на месте**, перезаписав исходник. Backup делать не нужно
       (есть git).
   - Логировать в stdout: `<filename>: <NxM> RGB → RGBA, X pixels stripped`.
   - В конце: `Done. N files processed.`
2. Добавить в `package.json` → `"scripts"`:
   ```json
   "strip-bg": "node scripts/strip-bg.mjs"
   ```
3. Использовать ESM (`.mjs`) — в проекте уже работают другие `.mjs` скрипты
   (`scripts/generate-image.mjs`, `scripts/generate-icon.mjs`).

### Алгоритм замены белого

Самый надёжный способ через `sharp` — raw-buffer processing:

```js
const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
// data — Uint8Array длиной info.width * info.height * 4 (RGBA)
// итерируем по 4 байта, если R/G/B все > 240 → ставим A = 0
// затем sharp(processedBuffer, { raw: { width, height, channels: 4 } }).png().toFile(file)
```

Tolerance: пиксель считается «белым» если **все три канала ≥ 240**. Это
поймает чисто-белый и слегка off-white артефакты JPEG-подобной компрессии,
но не тронет светло-серый мозг и пастельные части иконок.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок (скрипт не в src/, на него ESLint не действует, но всё же).
- [ ] `node scripts/strip-bg.mjs` запускается без ошибок (проверит Claude после установки sharp).
- [ ] После запуска `file public/icons/games/mafia.png` показывает `RGBA` (альфа-канал есть).
- [ ] То же для `quiz.png`.
- [ ] Сами иконки визуально сохранились (фигура мафиози в шляпе, мозг) —
      это проверит Claude через preview-сервер.
- [ ] `package.json` содержит новый script `strip-bg`, остальные скрипты не тронуты.

---

## Ограничения и подводные камни

- **Не использовать `convert` / `magick`** — ImageMagick не установлен.
  `sips` не умеет прозрачность по цвету. Только `sharp`.
- **`sharp` не в deps на момент написания ТЗ.** Claude установит его как
  `devDependency` ПОСЛЕ того как Codex закоммитит таск в отчёт. Codex не
  должен пытаться `npm install` (сандбокс без сети) и не должен трогать
  `package.json` секции `dependencies`/`devDependencies`.
- **Не запускать скрипт самому из Codex** — Codex просто пишет код. Запускает
  скрипт и проверяет результат Claude.
- **`scripts/` не в src/, ESLint к нему не применяется** — но всё равно
  пиши чисто (без unused vars, deprecated API).
- **ESM-only:** `.mjs`, импорты через `import`, `__dirname` не работает —
  использовать `fileURLToPath(import.meta.url)`.

---

## Контрольные точки для самопроверки Codex

1. `git diff --stat` — должно быть 2 файла: новый `scripts/strip-bg.mjs` +
   правка `package.json` (только секция `scripts`).
2. `npm run lint` — без новых ошибок.
3. `npm run build` **не запускать** — скрипт не влияет на bundle.
4. Заполнить отчёт `codex-reports/005-strip-icon-bg.md`.
5. **Не коммитить.** Не запускать `npm install`. Не запускать сам скрипт.

---

## Открытые вопросы для Codex

- Tolerance для белого — 240 ок? — **да, начинаем с 240, Claude скорректирует
  по результатам**.
- Делать ли `.bak.png` бэкапы? — **нет, есть git**.
- Поддерживать ли CLI-флаги (`--dry-run`, `--threshold N`)? — **нет, MVP без флагов.
  Threshold захардкожен 240**.
- Что если PNG уже RGBA с прозрачным фоном? — **скрипт всё равно прогоняет
  логику; пиксели ≥240 (которых там нет) не меняются, файл перезаписывается
  идентично — это OK**.
