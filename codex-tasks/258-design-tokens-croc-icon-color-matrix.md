# TASK-258 — /design-tokens: секция подбора цвета иконок на красном фоне Крокодила

## Цель
Весь UI Крокодила красный (фон + карточки). Нужно подобрать цвет ИКОНОК (которые
заменят эмодзи), чтобы они читались на красном. Добавить на страницу
`/design-tokens` новую секцию-образец: матрица «красный фон × цвет иконок/текста»,
чтобы пользователь визуально выбрал цвет.

## Whitelist (ТОЛЬКО это)
- `src/app/design-tokens/page.tsx`

ЗАПРЕЩЕНО: всё остальное. Это внутренняя dev/preview-страница → **только русский,
без i18n** (по правилу проекта для preview-страниц). Минимальный diff: добавить
ОДНУ новую секцию, существующее не трогать.

## Что добавить
В конец основного контента страницы (перед закрывающим контейнером/`</main>` или
аналогом — найти конец JSX страницы) добавить самостоятельную секцию. Можно
объявить локальный under-компонент в этом же файле (например `function
CrocIconColorMatrix() {…}`) и отрендерить его в конце страницы.

### Данные
```js
const CROC_BG_DARK = 'linear-gradient(135deg, #200707 0%, #3b0a0a 30%, #2a0c0c 60%, #200707 100%)'; // фон экрана
const CROC_BG_CARD = 'radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.30), transparent 55%), linear-gradient(165deg, #ef4444 0%, #991b1b 100%)'; // красная карточка
const ICON_COLORS = [
  { name: 'Белый',          hex: '#ffffff' },
  { name: 'Кремовый',       hex: '#f5efe6' },
  { name: 'Золото',         hex: '#ffd60a' },
  { name: 'Янтарь',         hex: '#ff9f0a' },
  { name: 'Мятный (lime)',  hex: '#a7f66a' },
  { name: 'Светло-голубой', hex: '#7fdfff' },
  { name: 'Графит',         hex: '#1f2937' },
];
```

### Образцовые иконки (монохром, inline SVG, наследуют `color`)
Вставить эти SVG-иконки как маленькие компоненты/функции (рисуются текущим
`color` через `stroke="currentColor"`/`fill="currentColor"`):

```jsx
// микрофон
const IcMic = (s=28) => (<svg width={s} height={s} viewBox="0 0 20 20" fill="none"><rect x="7" y="2" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.8"/><path d="M4 9a6 6 0 0012 0M10 15v3M7 18h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>);
// трофей
const IcTrophy = (s=28) => (<svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M5 3h10v4a5 5 0 01-10 0V3z" stroke="currentColor" strokeWidth="1.8"/><path d="M5 4H3v2a2 2 0 002 2M15 4h2v2a2 2 0 01-2 2M10 12v3M7 17h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>);
// корона
const IcCrown = (s=28) => (<svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M3 7l3 3 4-6 4 6 3-3-1.5 9h-11L3 7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>);
// речь (угадывают вслух)
const IcTalk = (s=28) => (<svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M3 5h10v7H7l-4 3V5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M15 8c1.5.5 2 2 0 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>);
// галочка (угадали)
const IcCheck = (s=28) => (<svg width={s} height={s} viewBox="0 0 20 20" fill="none"><path d="M4 10.5l4 4 8-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>);
```

### Вёрстка секции
- Заголовок секции: «Крокодил · цвет иконок на красном» + подпись-пояснение
  («Иконки заменят эмодзи. Выбери цвет, который читается на красном фоне и
  карточке. Красный фон делает красные иконки невидимыми.»).
- Для КАЖДОГО цвета из `ICON_COLORS` — строка/карточка с двумя превью-плашками
  рядом:
  1. Плашка с `background: CROC_BG_DARK` (фон экрана).
  2. Плашка с `background: CROC_BG_CARD` (красная карточка, `borderRadius: 28`).
  В каждой плашке (`color: hex`, padding ~20px, минимум ~120px высотой):
  ряд иконок `IcMic IcTrophy IcCrown IcTalk IcCheck` (gap ~14) + строка-образец
  текста тем же цветом, например «СЛОВО · УГАДЫВАЮТ» (моно/жирный).
  Рядом подпись названия цвета + hex (моно).
- Сетка адаптивная (на десктопе 2 плашки в ряд на цвет; названия слева/сверху).
  Использовать inline-`style` (как в остальной странице) или существующие
  утилиты — на твой выбор, но БЕЗ новых зависимостей.

## Acceptance
- `npm run lint` ✅, `npx tsc --noEmit` ✅. НЕ запускать build.
- Только `src/app/design-tokens/page.tsx`.
- На `/design-tokens` внизу появилась секция: 7 цветов × (тёмно-красный фон +
  красная карточка), на каждой — 5 иконок + образец текста в этом цвете.
- Существующие секции страницы не сломаны.

## Отчёт
`codex-reports/258-design-tokens-croc-icon-color-matrix.md` (писать разрешено). Не коммитить.
