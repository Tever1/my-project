# TASK-006: Добавить секцию «Варианты тайла игры» в /design-tokens

> **Метаданные**
> - **Дата создания:** 2026-05-03
> - **Сложность:** simple
> - **Запуск:** auto by Claude
> - **Ожидаемое время Codex:** ~7 минут
> - **Зависит от тасков:** —

---

## Цель

В `/design-tokens` добавить новую секцию (после секций Фазы B, перед закрытием
`<main>`) с двумя вариантами рендеринга тайла игры **side-by-side**:

1. **Вариант A — «С рамкой»**: точная копия `<Tile>` из `/lobby-preview`
   (frosted-glass рамка, gradient background, подпись с dark-gradient mask).
2. **Вариант B — «Без рамки»**: только `<GameIcon>` (PNG как есть, RGBA-прозрачный)
   плюс подпись игры под иконкой. Никакой рамки, никакого фона, никакого
   border'а — иконка «висит в воздухе».

Цель — сравнить два визуальных подхода для финального решения по дизайну
лобби.

---

## Контекст

Иконки игр сейчас отрисовываются как PNG в `public/icons/games/<id>.png`
(уже RGBA после TASK-005/005.1). На странице `/lobby-preview` они показаны
внутри тайла с frosted-glass рамкой и градиентным фоном (`function Tile`
в `src/app/lobby-preview/page.tsx:1172`). Пользователь хочет визуально
сравнить «как есть» с альтернативой — без рамки, голая иконка плюс лейбл.

Live preview на http://localhost:3000/design-tokens.

---

## Файлы к изменению (whitelist)

- `src/app/design-tokens/page.tsx` — добавить новую `<Section>` с двумя
  под-блоками (вариант A и вариант B), показать **все 7 игр** в каждом варианте.

### НЕ ТРОГАТЬ

- `src/app/lobby-preview/page.tsx` — не выносить `<Tile>` в shared компонент
  и не импортировать его в design-tokens. **Скопировать стили inline**.
  Причина: `/lobby-preview` это прототип/живая документация, его API менять
  не нужно. Если потом решим выносить — отдельный таск.
- `src/components/GameIcon.tsx` — использовать как есть.
- `CLAUDE.md`, `AGENTS.md`.

---

## Шаги реализации

1. Открыть `src/app/design-tokens/page.tsx`.
2. В уже существующий импорт из `@/lib/design/tokens` добавить, если ещё не
   импортированы: `radius`, `spring`, `gameColors` (часть уже есть, проверить).
   Импортировать `GameIcon` из `@/components/GameIcon`.
3. Перед `<GlassSheet>` блоками (примерно строка ~605, перед закрывающим
   `</main>`) добавить новую секцию через хелпер `<Section>`:

   ```tsx
   <Section
     title="Тайл игры — варианты"
     subtitle="Сравнение: с рамкой (как в /lobby-preview) и без рамки (только иконка + подпись)"
   >
     {/* Variant A — with frame */}
     <h3 style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.8)", margin: "0 0 12px" }}>
       Вариант A — с рамкой (текущий)
     </h3>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16, marginBottom: 32 }}>
       {games.map((g) => (
         <TileFramed key={g.id} gameId={g.id} label={g.ru} />
       ))}
     </div>

     {/* Variant B — no frame */}
     <h3 style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.8)", margin: "0 0 12px" }}>
       Вариант B — без рамки
     </h3>
     <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16 }}>
       {games.map((g) => (
         <TileNaked key={g.id} gameId={g.id} label={g.ru} />
       ))}
     </div>
   </Section>
   ```

4. В конце файла, рядом с `Section`, `Row`, `DemoButton` — добавить два
   helper-компонента:

   **`TileFramed`** — копия визуала `<Tile>` из lobby-preview (без motion-эффектов
   hover/active — это превью, не интерактивный лобби):
   ```tsx
   function TileFramed({ gameId, label }: { gameId: GameId; label: string }) {
     const accent = gameColors[gameId].accent;
     const deep = gameColors[gameId].deep;
     return (
       <div
         style={{
           position: "relative",
           aspectRatio: "1",
           borderRadius: radius.md,
           background: `linear-gradient(135deg, ${deep}66, ${accent}22)`,
           backdropFilter: "blur(16px)",
           border: `1px solid ${accent}40`,
           boxShadow: `0 10px 24px rgba(0,0,0,0.35), 0 0 0 1px ${accent}25`,
           overflow: "hidden",
         }}
       >
         <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
           <GameIcon gameId={gameId} style={{ width: "100%", height: "100%" }} />
         </div>
         <div
           style={{
             position: "absolute",
             bottom: 0, left: 0, right: 0,
             padding: "18px 8px 10px",
             textAlign: "center",
             background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)",
             pointerEvents: "none",
           }}
         >
           <div
             style={{
               fontSize: 13, fontWeight: 600, color: "white",
               letterSpacing: "-0.01em", whiteSpace: "nowrap",
               overflow: "hidden", textOverflow: "ellipsis",
               textShadow: "0 1px 4px rgba(0,0,0,0.6)",
             }}
           >
             {label}
           </div>
         </div>
       </div>
     );
   }
   ```

   **`TileNaked`** — только иконка плюс подпись под ней. Никакого фона, рамки,
   тени. Иконка занимает квадратную область, лейбл центрирован под иконкой:
   ```tsx
   function TileNaked({ gameId, label }: { gameId: GameId; label: string }) {
     return (
       <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
         <div style={{ width: "100%", aspectRatio: "1" }}>
           <GameIcon gameId={gameId} style={{ width: "100%", height: "100%" }} />
         </div>
         <div
           style={{
             fontSize: 13, fontWeight: 600, color: "white",
             letterSpacing: "-0.01em", whiteSpace: "nowrap",
             textShadow: "0 1px 4px rgba(0,0,0,0.6)",
           }}
         >
           {label}
         </div>
       </div>
     );
   }
   ```

5. Никаких других правок в файле.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок.
- [ ] `npm run build` успешен.
- [ ] На http://localhost:3000/design-tokens появляется секция «Тайл игры —
      варианты» с двумя подсекциями.
- [ ] В обоих вариантах показаны все 7 игр (`quiz, mafia, crocodile, spy,
      alias, who-am-i, hundred-to-one`).
- [ ] Для игр без PNG (`crocodile/spy/alias/who-am-i/hundred-to-one`)
      `<GameIcon>` рендерит SVG-placeholder — это нормально, ничего
      специально не обрабатывать.
- [ ] Вариант B — реально без рамки: ни border, ни background, ни shadow.
      Только иконка и подпись.

---

## Ограничения и подводные камни

- **Не выносить `<Tile>` из lobby-preview в shared.** Inline-копия в
  `design-tokens` — намеренное дублирование, чтобы не трогать лобби.
- **Не добавлять hover/active анимации** в TileFramed/TileNaked — это
  static preview.
- **Имена игр на русском** (поле `ru` в массиве `games`) — `/design-tokens`
  одноязычный (русский), это исключение из правила i18n (см. CLAUDE.md).
- **Комментарии в коде на английском** (техническая конвенция).
- **Файл `page.tsx` уже большой (727 строк)** — добавление компактных
  компонентов в конец это OK, не делай рефакторинг попутно.

---

## Контрольные точки для самопроверки Codex

1. `git diff --stat` — должен быть только `src/app/design-tokens/page.tsx`.
2. `npm run lint` — без новых ошибок.
3. `npm run build` — успех (но Codex sandbox без сети — может упасть на
   bind-port. Если так — указать в отчёте, Claude проверит).
4. `git diff src/app/design-tokens/page.tsx` — посмотреть что добавил.
5. Не коммитить.
6. Заполнить `codex-reports/006-design-tokens-tile-variants.md`.

---

## Открытые вопросы для Codex

- Размер тайлов — `minmax(120px, 1fr)` ок? — **да, на десктопе будет 6-8 в
  ряд, на мобиле меньше**.
- Лейбл в варианте B — снизу под иконкой или сверху? — **снизу**, как в
  варианте A.
- Спейсинг между двумя подсекциями — `marginBottom: 32` ок? — **да**.
