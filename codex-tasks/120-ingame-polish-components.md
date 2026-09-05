# TASK-120: In-game polish — shared components + /ingame-preview страница

> **Метаданные**
> - **Дата создания:** 2026-05-21
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~30 минут
> - **Зависит от тасков:** —

---

## Цель

Создать 5 shared-компонентов Phase G (in-game polish) в `src/components/ingame/`
и превью-страницу `/ingame-preview`, где каждый компонент показан в 2–3 визуальных
вариантах рядом — чтобы пользователь выбрал какой вариант катить в игры.

---

## Контекст

Phase G дизайн-плана. Игры работают, но "сухие" — числа меняются мгновенно,
таймер просто тикает, правильный ответ ничем не отличается визуально.
Этот таск создаёт компоненты и превью; интеграция в игры — отдельные таски
после одобрения вариантов.

Стек: Framer Motion 12 уже установлен. Tailwind CSS v4. TypeScript.
Цвета игр (CSS-переменные): `--color-game-quiz: #facc15`, `--color-game-mafia: #8b5cf6`,
`--color-game-crocodile: #ef4444`, `--color-game-spy: #14b8a6`,
`--color-game-alias: #ec4899`, `--color-game-who-am-i: #38bdf8`,
`--color-game-hundred-to-one: #f59e0b`.

Дизайн-токены motion (из `src/lib/design/tokens.ts`): `spring.soft`, `spring.medium`,
`spring.snappy`. Длительности: `duration.fast = 150ms`, `duration.base = 250ms`,
`duration.slow = 400ms`.

---

## Файлы к изменению (whitelist)

Создать новые файлы:
- `src/components/ingame/UrgencyTimer.tsx` — таймер с urgency-анимацией
- `src/components/ingame/AnimatedScore.tsx` — count-up анимация очков
- `src/components/ingame/CelebrationBurst.tsx` — celebrations при правильном ответе
- `src/components/ingame/TurnIndicator.tsx` — "твой ход" attention-grabber
- `src/components/ingame/BreathingPlaceholder.tsx` — состояния ожидания
- `src/components/ingame/index.ts` — barrel export
- `src/app/ingame-preview/page.tsx` — превью-страница (dev only)

### НЕ ТРОГАТЬ

- Все файлы в `src/app/game/` — интеграция в игры будет позже
- Все файлы в `src/app/tv/` — интеграция в TV режим будет позже
- `server.mts` — этот таск только клиентские компоненты
- `src/components/glass/` — не трогаем существующую Glass-библиотеку
- `CLAUDE.md`, `AGENTS.md` — обновляет только Claude

---

## Шаги реализации

### 1. `UrgencyTimer.tsx`

Props:
```ts
interface UrgencyTimerProps {
  total: number;       // total seconds
  current: number;     // seconds remaining
  variant: 'ring' | 'bar' | 'pulse';
  color?: string;      // CSS color, default white
  size?: 'sm' | 'md' | 'lg';
}
```

Три варианта для превью:

**variant="ring"** — круговой progress ring (SVG `stroke-dashoffset`):
- Кольцо заполняется по часовой стрелке (от 0% до 100% — от полного до пустого)
- Цвет плавно меняется: `>30%` → белый/акцент, `15–30%` → оранжевый (`#f97316`),
  `<15%` → красный (`#ef4444`) + ring дрожит (`x: [-2, 2, -2, 0]` за 400мс, повтор)
- Число в центре, крупно
- Анимация через Framer Motion `animate` на `pathLength`

**variant="bar"** — горизонтальная полоска под числом:
- Ширина уменьшается пропорционально `current/total`
- Transition `linear` — не spring (таймер должен быть равномерным)
- Цвет: те же пороги что у ring
- При `<15%` полоска мигает (opacity 1→0.4→1, 600мс, повтор)

**variant="pulse"** — просто цифра, но:
- При `<30%` появляется glow `box-shadow: 0 0 12px currentColor`
- При `<15%` сама цифра пульсирует (`scale: 1 → 1.08 → 1`, 500мс, повтор)

### 2. `AnimatedScore.tsx`

Props:
```ts
interface AnimatedScoreProps {
  value: number;
  variant: 'countup' | 'pop' | 'countup-pop';
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  prefix?: string;  // e.g. "+" для дельты
}
```

**variant="countup"** — при изменении `value` число прокручивается с предыдущего:
- Использовать `useMotionValue` + `useTransform` или просто анимировать через
  `animate(from, to, { onUpdate })` паттерн, ~400мс, easing `ease-out`
- Показывает целые числа в процессе анимации

**variant="pop"** — при изменении `value` мгновенно обновляется + scale 1→1.25→1
  за 300мс (spring.snappy). Никакого прокручивания.

**variant="countup-pop"** — комбо: сначала count-up за 300мс, потом pop на конечном
  значении.

Для отслеживания изменений использовать `usePrevious` (написать inline):
```ts
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}
```

### 3. `CelebrationBurst.tsx`

Props:
```ts
interface CelebrationBurstProps {
  trigger: boolean;           // когда меняется с false→true — запускает анимацию
  variant: 'flash' | 'particles' | 'flash-particles';
  color?: string;             // цвет частиц/вспышки
  onComplete?: () => void;
}
```

**variant="flash"** — полупрозрачный overlay поверх родителя:
- При `trigger=true`: opacity 0→0.35→0 за 400мс, цвет = `color` prop
- Родитель должен иметь `position: relative`, overlay — `position: absolute inset-0`
- После завершения вызвать `onComplete`

**variant="particles"** — 8–12 маленьких кружков разлетаются от центра:
- При `trigger=true` рендерить N кружков (6–10px), каждый получает случайный:
  - direction: угол 0–360°
  - distance: 40–80px
  - duration: 400–600мс
- Анимация: position (center → random direction) + opacity (1→0) одновременно
- Кружки — `position: absolute`, parent `position: relative overflow: hidden`
- Цвет кружков = `color` prop, небольшой разброс через `opacity: 0.7 + random()*0.3`

**variant="flash-particles"** — комбо: flash + particles одновременно

Важно: компонент НЕ должен ничего рендерить когда `trigger=false` и анимация
завершена. Используй `useState` + `useEffect` на `trigger`.

### 4. `TurnIndicator.tsx`

Props:
```ts
interface TurnIndicatorProps {
  name: string;               // имя игрока
  isActive: boolean;          // горит ли индикатор
  variant: 'glow-pulse' | 'ring-pulse' | 'spotlight';
  color?: string;
  avatarUrl?: string;
}
```

**variant="glow-pulse"** — имя + аватар-кружок обёрнуты в div:
- Когда `isActive=true`: `box-shadow: 0 0 16px 4px {color}` + scale 1→1.05→1,
  повтор каждые 1.5с
- Когда `isActive=false`: без glow, scale 1

**variant="ring-pulse"** — вокруг аватара/имени мигает кольцо:
- SVG-кольцо (stroke, `stroke-dasharray`, нет fill) поверх аватара
- `strokeOpacity: 1→0→1`, 1.2с, повтор, только когда `isActive=true`
- Цвет кольца = `color` prop

**variant="spotlight"** — имя увеличивается + radial gradient background:
- Когда `isActive=true`: font-size scale 1→1.15 (spring.medium) + 
  background `radial-gradient(circle, {color}22 0%, transparent 70%)`
- "Текущий ход:" лейбл маленькими буквами над именем, появляется с fade

### 5. `BreathingPlaceholder.tsx`

Props:
```ts
interface BreathingPlaceholderProps {
  text: string;
  variant: 'breathing-text' | 'skeleton' | 'skeleton-shimmer';
  lines?: number;   // для skeleton вариантов, default 2
  width?: string;   // CSS width, default '100%'
}
```

**variant="breathing-text"** — текст плавно меняет opacity:
- `opacity: 0.5→1→0.5`, 2с, ease-in-out, бесконечно
- Простой, минималистичный

**variant="skeleton"** — прямоугольники-заглушки:
- `lines` штук прямоугольников, высота 16px, border-radius 8px
- Цвет `white/10`, не анимирован (статичный)
- `text` игнорируется

**variant="skeleton-shimmer"** — то же что skeleton но с shimmer:
- CSS-анимация: градиент `white/5 → white/20 → white/5` движется слева направо
  за 1.5с, `background-size: 200% 100%`, `backgroundPosition: -200%→200%`
- Можно через Framer Motion `animate` на `backgroundPosition`

---

### 6. `/ingame-preview` страница

Файл: `src/app/ingame-preview/page.tsx`

Структура страницы (секции сверху вниз):

#### Заголовок
```
In-Game Polish — Phase G
```
`text-3xl font-bold text-white mb-8`

#### Секция: UrgencyTimer
Три колонки (`grid grid-cols-3 gap-6`):
- Колонка 1: `variant="ring"`, `total=30`, **интерактивный** — кнопки `[▶ Старт]` / `[⟳ Reset]`
  Таймер тикает в реальном времени (useInterval или setInterval + useState).
  Показать все три цвет-фазы: стартовать с 30с → тикает до 0, потом reset.
- Колонка 2: `variant="bar"`, та же интерактивность (синхронизирован с Колонкой 1 — один state)
- Колонка 3: `variant="pulse"`, тот же state

Под каждой колонкой — лейбл: `ring`, `bar`, `pulse`.

Три отдельных кнопки ▶/⟳ НЕ нужны — один общий таймер-state на все три варианта.
Одни кнопки `[▶ Старт]` / `[⟳ Reset]` посередине под тремя колонками.

#### Секция: AnimatedScore
Три колонки:
- `variant="countup"`, `variant="pop"`, `variant="countup-pop"`
- Кнопки `[+1]` `[+10]` `[-5]` изменяют value — одни на все три, value общий.
- Лейбл под каждой.

#### Секция: CelebrationBurst
Три колонки, каждая — квадрат 120×120px с `position: relative`:
- `variant="flash"`, `variant="particles"`, `variant="flash-particles"`
- В центре каждого квадрата — иконка ✓ (checkmark, через SVG)
- Кнопка `[🎉 Fire!]` общая — по клику `trigger` становится true на 700мс, потом false
- Разные цвета для каждой колонки: quiz (#facc15), spy (#14b8a6), alias (#ec4899)
- Лейбл под каждой.

#### Секция: TurnIndicator
Три колонки:
- `variant="glow-pulse"`, `variant="ring-pulse"`, `variant="spotlight"`
- `name="Аня 👀"`, `color` — цвет crocodile (#ef4444)
- Кнопка-тоггл `[Активен / Неактивен]` — один на все три.
- Лейбл под каждой.

#### Секция: BreathingPlaceholder
Три колонки:
- `variant="breathing-text"` с `text="Ждём хоста…"`,
  `variant="skeleton"` с `lines=3`,
  `variant="skeleton-shimmer"` с `lines=3`
- Статичные, кнопки не нужны.
- Лейбл под каждой.

#### Стиль страницы
- Фон: `bg-gray-950` (тёмный, почти чёрный)
- Каждая секция: заголовок `text-xl font-semibold text-white/70 mb-4` + горизонтальный разделитель `border-t border-white/10`
- Кнопки в стиле `px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors`
- Расположение кнопок: по центру под колонками
- Страница только для разработки — без i18n, всё на русском/английском mix — не важно

---

## Acceptance criteria

- [ ] `npm run lint` без новых ошибок
- [ ] `npm run build` успешен
- [ ] Страница `/ingame-preview` открывается без ошибок
- [ ] Все 5 компонентов рендерятся, все 3 варианта каждого видны на странице
- [ ] Интерактивность работает: таймер тикает, очки анимируются при нажатии кнопок, celebration срабатывает по кнопке, TurnIndicator меняет состояние
- [ ] Нет TypeScript-ошибок (проверить `npm run build`)

---

## Ограничения и подводные камни

- **Не импортировать `framer-motion`** через `"framer-motion/client"` — используй
  обычный `"framer-motion"`. Файлы в `src/app/` с анимациями требуют `"use client"`.
- **Все новые файлы — `"use client"` в первой строке** (анимации, useState, useEffect).
- **CSS custom properties** (`var(--color-game-quiz)` и т.д.) доступны глобально
  из `src/app/globals.css` — можно использовать прямо в style props.
- **CelebrationBurst**: используй `key` prop на animated элементах при re-trigger,
  чтобы анимация перезапускалась: `key={triggerCount}` где `triggerCount` — счётчик.
- **Shimmer анимация**: Framer Motion не анимирует `backgroundPosition` напрямую в
  некоторых версиях — используй CSS `@keyframes` через Tailwind arbitrary или
  inline `<style>` тег если нужно.
- **Комментарии в коде** — английский.

---

## Контрольные точки для самопроверки Codex

1. Прочитать diff (`git diff --stat` + `git diff`).
2. Убедиться что не вышел за whitelist файлов.
3. Запустить `npm run lint` и `npm run build`.
4. Заполнить отчёт `codex-reports/120-ingame-polish-components.md` по шаблону `_TEMPLATE.md`.
5. **Не коммитить.** Коммит делает Claude после ревью.

---

## Открытые вопросы для Codex

- Если Framer Motion `animate` на SVG `pathLength` вызывает TypeScript-ошибки —
  использовать `style={{ pathLength: ... }}` + Motion `animate` через `useAnimate` hook.
- Если shimmer через Framer Motion не работает — писать CSS keyframes напрямую
  в JSX через `<style>{`@keyframes shimmer { ... }`}</style>`.
- Barrel `src/components/ingame/index.ts` — экспортировать все 5 компонентов named export.
