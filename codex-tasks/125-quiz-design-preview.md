# TASK-125: Quiz design variants — секция в /design-tokens

> **Метаданные**
> - **Дата создания:** 2026-05-21
> - **Сложность:** complex
> - **Запуск:** manual by user (Codex Desktop)
> - **Ожидаемое время Codex:** ~30 минут
> - **Зависит от тасков:** TASK-120

---

## Цель

Добавить в `src/app/design-tokens/page.tsx` новую секцию «Quiz Design»
с интерактивными превью компонентов квиза в 2–3 вариантах дизайна
для сравнения и выбора.

---

## Контекст

Пользователь хочет визуально выбрать дизайн квиза перед интеграцией
в реальную игру. Превью должно быть на `/design-tokens` странице.
Цвет квиза: `var(--color-game-quiz)` = `#facc15` (жёлтый).
Стек: Framer Motion 12, Tailwind v4, `"use client"` уже есть на странице.

---

## Файлы к изменению (whitelist)

- `src/app/design-tokens/page.tsx` — добавить секцию в конец страницы

### НЕ ТРОГАТЬ

- `src/components/ingame/**`
- `src/app/game/**`
- `CLAUDE.md`, `AGENTS.md`

---

## Шаги реализации

### Общие правила для превью

- Все превью на тёмном фоне `bg-gray-900` или `bg-gray-950` с `rounded-2xl p-6`
- Каждый вариант подписан лейблом: **Вариант A**, **Вариант B** и т.д.
- Интерактивность: кнопки меняют state прямо на странице (не нужен socket)
- Используй `useState` — он уже импортирован
- Используй `motion` из `framer-motion` — уже импортирован

---

### Секция 1: Кнопки ответов (4 варианта)

Показать один вопрос-заглушку: `«Какая планета самая большая в Солнечной системе?»`
Четыре ответа: `Юпитер`, `Сатурн`, `Нептун`, `Марс`. Правильный: `Юпитер` (index 0).

Кнопка `[Показать правильный]` / `[Сбросить]` общая для всех вариантов.

**Вариант A — Текущий (baseline)**
```
Цветные градиентные кнопки (синий/зелёный/янтарь/розовый)
border + backdrop-blur
При showCorrect: кнопка 0 зелёная, выбранная неправильная красная
```
Код:
```tsx
// Цвета из существующей игры
const OPTION_COLORS_A = [
  'from-blue-600/60 to-blue-500/40 border-blue-400/60',
  'from-emerald-600/60 to-emerald-500/40 border-emerald-400/60',
  'from-amber-600/60 to-amber-500/40 border-amber-400/60',
  'from-pink-600/60 to-pink-500/40 border-pink-400/60',
];
// Кнопки: rounded-2xl border p-4, текст белый, буква-бейдж w-8 h-8 rounded-lg bg-white/10
```

**Вариант B — Glass + Quiz accent**
```
Все кнопки одинаковые: frosted glass (bg-white/8 border-white/15 backdrop-blur-xl)
Hover: bg-white/14 border-white/25, scale 1.01
Selected (до reveal): ring-2 ring-yellow-400/60 bg-yellow-500/15
При showCorrect: правильная — border-green-400 bg-green-500/20 ring-2 ring-green-400/40 + scale 1.02
              неправильная выбранная — border-red-400 bg-red-500/15, shake animation
              остальные — opacity-50
Буква-бейдж: bg-yellow-400/20 text-yellow-300 при правильной
```
Анимации Framer Motion:
- Правильная кнопка при reveal: `animate={{ scale: [1, 1.03, 1] }}` transition `spring.snappy`
- Неправильная: `animate={{ x: [-4, 4, -4, 0] }}` duration 0.3s

**Вариант C — Bold numbered**
```
Кнопки без букв A/B/C/D — вместо этого крупный номер 1/2/3/4 слева
Фон: bg-white/5 border border-white/10
Левая полоска-акцент: w-1 h-full rounded-full в цвете квиза (желтый) при selected
При showCorrect: правильная — левая полоска зелёная + bg-green-500/10
              неправильная — левая полоска красная + bg-red-500/10
Номер меняет цвет: белый→зелёный/красный при reveal
```

---

### Секция 2: Отсчёт 3-2-1 (3 варианта)

Кнопка `[Запустить]` — перезапускает отсчёт с 3.
State: `countVal: number` (3→2→1→0, потом скрывается), `isRunning: boolean`.
useEffect с setInterval 800ms.

**Вариант A — Текущий (baseline)**
```tsx
<div key={countVal} className="text-8xl font-black text-white animate-bounce">
  {countVal}
</div>
```

**Вариант B — Scale + Glow**
```tsx
// При каждом изменении countVal — key меняется, анимация перезапускается
<motion.div
  key={countVal}
  initial={{ scale: 0.5, opacity: 0 }}
  animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
  exit={{ scale: 0.8, opacity: 0, y: -20 }}
  transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
  style={{
    fontSize: 120,
    fontWeight: 900,
    color: '#facc15',
    textShadow: '0 0 40px rgba(250, 204, 21, 0.6), 0 0 80px rgba(250, 204, 21, 0.3)',
    lineHeight: 1,
  }}
>
  {countVal}
</motion.div>
```
Обернуть в `<AnimatePresence mode="wait">` для exit animation.

**Вариант C — Ring + Number**
```
SVG-кольцо (как UrgencyTimer ring) + большая цифра в центре
Кольцо заполняется от 0 до 1 за время между тиками (CSS transition linear 700ms)
Цвет кольца — жёлтый (quiz)
Цифра меняется мгновенно, кольцо перезапускается при смене
Размер: 140×140px
```
Для кольца использовать паттерн из `UrgencyTimer`:
```tsx
<svg width={140} height={140} className="-rotate-90">
  <circle cx={70} cy={70} r={60} stroke="rgba(255,255,255,0.1)" strokeWidth={8} fill="none" />
  <motion.circle
    cx={70} cy={70} r={60}
    stroke="#facc15" strokeWidth={8} fill="none" strokeLinecap="round"
    key={countVal}
    initial={{ pathLength: 0 }}
    animate={{ pathLength: 1 }}
    transition={{ duration: 0.75, ease: "linear" }}
  />
</svg>
<span style={{ position: 'absolute', fontSize: 64, fontWeight: 900, color: 'white' }}>
  {countVal}
</span>
```

---

### Секция 3: Reveal правильного ответа (2 варианта)

Показать одну кнопку-ответ, кнопка `[Правильно]` / `[Неправильно]` / `[Сбросить]`.
State: `revealState: 'idle' | 'correct' | 'wrong'`

**Вариант A — Текущий (baseline)**
```
Просто смена className: border-green-400 bg-green-500/40 или border-red-400 bg-red-500/40
```

**Вариант B — Animated reveal**
```
Правильно: motion animate scale 1→1.04→1 (spring.snappy) + border/bg зелёный +
           checkmark icon появляется слева (AnimatePresence, scale 0→1)
Неправильно: motion animate x [-6, 6, -6, 0] (0.35s tween) + border/bg красный +
             ✕ icon появляется слева
```
Для checkmark: SVG `<path d="M5 13l4 4L19 7" />` stroke currentColor strokeWidth 2.5

---

### Секция 4: Счётчик ответивших (2 варианта)

State: `answeredCount: number` (0–5), кнопка `[+1 ответ]` / `[Сбросить]`.
5 игроков.

**Вариант A — Текущий**
```tsx
<p className="text-white/30">{answeredCount}/5</p>
```

**Вариант B — Avatar pills**
```
5 кружков (аватар-заглушек) в ряд.
Пустой: bg-white/10 border-white/15
Ответивший: bg-white/20 border-white/30, scale 1→1.12→1 (spring.snappy) при появлении
При answeredCount увеличении — кружок "активируется" с pop анимацией
Инициалы: П1, П2, П3, П4, П5
```
Использовать Framer Motion `key` + AnimatePresence для pop при изменении.

---

### Структура на странице

Добавить в конец `design-tokens/page.tsx`, перед закрывающим `</main>`,
новую секцию через `<Section>` компонент:

```tsx
<Section title="Quiz Design Variants" subtitle="Выбор дизайна для компонентов квиза">
  {/* 4 подсекции */}
</Section>
```

Каждая подсекция:
```tsx
<div style={{ marginBottom: 48 }}>
  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 16 }}>
    {название подсекции}
  </h3>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
    {/* варианты */}
  </div>
</div>
```

Каждый вариант:
```tsx
<div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.08)' }}>
  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 16, letterSpacing: '0.08em' }}>
    ВАРИАНТ {A/B/C}
  </p>
  {/* контент */}
</div>
```

---

## Acceptance criteria

- [ ] `npm run lint` без ошибок
- [ ] `npm run build` успешен
- [ ] Страница `/design-tokens` открывается, секция «Quiz Design Variants» видна
- [ ] Все кнопки интерактивны: show/hide correct, запуск отсчёта, reveal
- [ ] State каждой подсекции независим (кнопки одной не влияют на другую)

---

## Ограничения и подводные камни

- **`AnimatePresence` и `mode="wait"`** — нужен для корректной exit-анимации счётчика.
- **Общий state на варианты**: `showCorrect` и `selectedAnswer` — один state на
  подсекцию «Кнопки ответов», все три варианта (A/B/C) реагируют на одну кнопку
  `[Показать правильный]`. Это позволяет сравнивать варианты side-by-side.
- **Счётчик отсчёта**: `useEffect` с `setInterval` — не забыть cleanup (`clearInterval`).
  При `countVal === 0` — остановить интервал и `setIsRunning(false)`.
- **Не импортировать** ничего из `src/app/game/**` — только из `framer-motion`,
  `react`, `@/lib/design/tokens`, `@/lib/design/motion`.
- **Комментарии в коде** — английский.
- **Файл уже `"use client"`** — не добавлять повторно.

---

## Контрольные точки для самопроверки Codex

1. `git diff --name-only` — только `src/app/design-tokens/page.tsx`.
2. `npm run lint` — чисто.
3. Отчёт в `codex-reports/125-quiz-design-preview.md`.
4. **Не коммитить.**
