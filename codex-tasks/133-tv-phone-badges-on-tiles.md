# TASK-133: TV/phone бейджи на тайлах игр в лобби

> **Метаданные**
> - **Дата создания:** 2026-05-23
> - **Сложность:** simple
> - **Запуск:** auto by Claude
> - **Ожидаемое время Codex:** ~15 минут
> - **Зависит от тасков:** —
> - **Часть пивота:** TV-mode (132…136), шаг 2/5.

---

## Цель

На каждом тайле игры в лобби показать два маленьких бейджа в правом верхнем
углу: 📺 (поддерживается TV-режим) и 📱 (поддерживается мобильный режим).
Бейджи — SVG inline-иконки (не эмодзи), с полупрозрачным glass-фоном для
читаемости поверх любой картинки. На этом этапе все 7 игр получают **оба**
бейджа (дифференциация поддержки придёт позже).

---

## Контекст

Часть архитектурного TV-пивота. Игрок в лобби должен сразу видеть, на каких
устройствах играется конкретная игра. Сейчас все 7 игр универсальные —
поэтому бейджи одинаковы, но инфраструктура (поле `support` + рендер)
закладывается сразу, чтобы будущая дифференциация (например, новая
desktop-only игра) добавилась без рефакторинга.

**Правило из CLAUDE.md:** «Ни одного стандартного эмодзи в финальном UI».
Поэтому 📺/📱 — это inline SVG, нарисованные руками, не emoji-символы.

---

## Файлы к изменению (whitelist)

- `src/components/lobby/Lobby.tsx` — расширить локальный `interface GameInfo`
  полем `support`, добавить `support: { tv: true, phone: true }` во все 7
  записей массива `games`, отрендерить бейджи в компоненте `Tile`.

### НЕ ТРОГАТЬ

- `src/types/game.ts` — серверные типы не трогаем (это UI-only метаданные тайла).
- Никакие игровые страницы, server.mts, socket-handlers.
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.

---

## Шаги реализации

1. **Расширить `interface GameInfo`** в `src/components/lobby/Lobby.tsx`:
   ```ts
   interface GameInfo {
     // ...existing fields
     support: { tv: boolean; phone: boolean };
   }
   ```

2. **Добавить `support: { tv: true, phone: true }`** в **каждую** из 7 записей
   массива `games` (mafia, quiz, crocodile, spy, alias, who-am-i, hundred-to-one).
   Все семь — оба `true`. Это сейчас одинаково, важна сама инфраструктура.

3. **Создать две inline SVG иконки** в том же файле (внизу, рядом с
   `PersonIcon` — там уже живут inline SVG):
   ```tsx
   function TvBadgeIcon() {
     return (
       <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
         {/* TV-силуэт: прямоугольник экрана + ножки/стойка */}
         <rect x="1" y="3" width="14" height="9" rx="1.5" />
         <path d="M5 14h6M8 12v2" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" />
       </svg>
     );
   }

   function PhoneBadgeIcon() {
     return (
       <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
         {/* Phone-силуэт: вертикальный rounded rect + динамик + home */}
         <rect x="4" y="1.5" width="8" height="13" rx="1.5" />
         <rect x="6.5" y="3" width="3" height="0.6" rx="0.3" fill="rgba(0,0,0,0.4)" />
         <circle cx="8" cy="12.5" r="0.6" fill="rgba(0,0,0,0.4)" />
       </svg>
     );
   }
   ```
   Если эти примерные `path`-ы выглядят коряво — нарисуй чище, главное: тонкие
   читаемые силуэты 14×14, монохром, белые.

4. **Отрендерить бейджи в `Tile`** (`src/components/lobby/Lobby.tsx`,
   функция `Tile`, внутри основного `<div>` с `position: relative` где уже
   живут иконка и label-gradient). Добавить новый блок **между** иконкой
   и нижним label-gradient — позиция top-right, поверх картинки:
   ```tsx
   {/* Support badges — top-right corner */}
   <div
     style={{
       position: "absolute",
       top: 8,
       right: 8,
       display: "flex",
       gap: 4,
       zIndex: 2,
       pointerEvents: "none",
     }}
   >
     {game.support.tv && (
       <span
         aria-label="ТВ-режим"
         title="ТВ-режим"
         style={{
           display: "inline-flex",
           alignItems: "center",
           justifyContent: "center",
           width: 22,
           height: 22,
           borderRadius: 6,
           background: "rgba(0, 0, 0, 0.55)",
           backdropFilter: "blur(8px)",
           WebkitBackdropFilter: "blur(8px)",
           color: "white",
           border: "1px solid rgba(255,255,255,0.18)",
         }}
       >
         <TvBadgeIcon />
       </span>
     )}
     {game.support.phone && (
       <span
         aria-label="Мобильный"
         title="Мобильный"
         style={{ /* те же стили что у TV-бейджа */ }}
       >
         <PhoneBadgeIcon />
       </span>
     )}
   </div>
   ```
   Стиль вынеси в общую переменную чтобы не дублировать.

5. Проверить что бейджи **не перекрывают** label игры внизу и не ломают
   hover-эффект (`overflow: hidden` + `border-radius` на родителе уже есть).

6. `npm run lint` и `npx tsc --noEmit`.

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npx tsc --noEmit` чисто
- [ ] На каждом из 7 тайлов в нижнем tile-strip лобби видны **два** бейджа
      (TV + Phone) в правом верхнем углу
- [ ] Бейджи читаемы поверх **любой** иконки игры (тёмный glass-фон + светлый SVG)
- [ ] Бейджи не перекрывают название игры внизу тайла
- [ ] Hover/press анимация тайла продолжает работать как раньше
- [ ] На мобильном (tile-strip-mobile) бейджи тоже видны и не разрушают layout
- [ ] `interface GameInfo` имеет поле `support: { tv: boolean; phone: boolean }`,
      все 7 записей в `games` имеют `{ tv: true, phone: true }`
- [ ] Никаких emoji-символов в JSX — только inline SVG

---

## Ограничения и подводные камни

- **Никаких эмодзи** (📺, 📱) в коде — только inline SVG. Это правило проекта.
- **Pointer events:** бейджи `pointerEvents: "none"` чтобы не перехватывать
  клики по тайлу.
- **z-index:** иконка под бейджами, label-gradient ниже бейджей. zIndex 2 на
  бейджах достаточно (иконка inset 0 без z-index, label-gradient тоже без).
- **Не выносить badges в отдельный компонент** — пока inline в `Tile`.
- **Не использовать эмодзи даже в `title`/`aria-label`** — только русский текст
  («ТВ-режим», «Мобильный»).
- Комментарии в коде на английском.

---

## Контрольные точки для самопроверки Codex

1. `git diff src/components/lobby/Lobby.tsx` — только этот файл.
2. `npm run lint` зелёный.
3. `npx tsc --noEmit` чисто.
4. Открыть http://localhost:3000 (через splash → клик «Играть» → лобби) →
   увидеть бейджи на всех 7 тайлах внизу.
5. DevTools mobile viewport (375×667) → бейджи видны, тайлы скроллятся.
6. Заполнить отчёт `codex-reports/133-tv-phone-badges-on-tiles.md`.
7. **Не коммитить.**

---

## Открытые вопросы для Codex

- Какой размер бейджа? — **22×22 контейнер, 14×14 SVG внутри**. Если выглядит
  кривовато на 1× DPR — можно поднять до 24×24/16×16, описать в отчёте.
- Где разместить? — **top-right** (там никогда нет важного контента иконок,
  они композиционно «головы» персонажей).
- Поле `support` в самом `GameInfo` (серверном) тоже добавить? — **нет**,
  только в локальном UI-интерфейсе. Серверу это знание не нужно.
