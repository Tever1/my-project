# TASK-348: «100 к 1» — превью вариантов плоских line-иконок на /design-tokens

**Тип:** simple (1 файл, добавление нового блока по образцу уже существующих)
**Whitelist:** `src/app/design-tokens/page.tsx`
**НЕ трогать:** саму игру (`game/[roomId]/hundred-to-one`, `tv/.../page.tsx`),
никакие другие секции `/design-tokens`. Это ТОЛЬКО превью-страница —
в игру иконки НЕ внедряются в этом таске.

---

## Контекст

Проект уже имеет паттерн «плоские line-иконки как превью-кандидаты» для трёх
игр — прочитай их как образец ПЕРЕД тем как писать код:

- `SPY_BG_DARK`/`SPY_BG_CARD` + `SPY_SAMPLE_ICONS` + `SpyIconPreview()`
  (~строки 140-142, ~SpyIcon-компоненты выше, `SpyIconPreview` ~строка 1339).
- `ALIAS_BG_DARK`/`ALIAS_BG_CARD` + `ALIAS_SAMPLE_ICONS` + `AliasIconPreview()`.
- `WHOAMI_BG_DARK`/`WHOAMI_BG_CARD` + `WHOAMI_SAMPLE_ICONS` + `WhoAmIIconPreview()`
  (~строки 359-422 для констант/иконок, ~строка 1439 для компонента-превью) —
  **это самый близкий и полный образец, копируй его структуру дословно**,
  меняя только цвета, имена и набор иконок.

Каждая иконка — инлайн SVG-компонент `IconRenderer` (`(s = 28) => <svg .../>`),
`viewBox="0 0 24 24"`, `fill="none"`, обводка `stroke="currentColor"` (цвет
берётся из родительской панели, как в WhoAmI). Никаких PNG, никаких emoji.

## Задача

### 1. Цветовые константы (по образцу WHOAMI_BG_DARK/WHOAMI_BG_CARD, ~после строки 362)

Игра «100 к 1» — цвет янтарь `#f59e0b` (см. CLAUDE.md, палитра по играм).

```tsx
const H2O_BG_DARK =
  "linear-gradient(135deg, #1f1206 0%, #2e1c05 30%, #241605 60%, #1f1206 100%)";
const H2O_BG_CARD =
  "radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #f59e0b 0%, #b45309 100%)";
```
(Значения ориентировочные — сохрани общий приём: тёмный фон = 4-стопный
diagonal gradient в тёмных тонах игры, карточка = radial highlight + linear
от акцентного к тёмному того же цвета. Подгони оттенки под `#f59e0b`
консистентно с тем как это сделано для Spy/Alias/WhoAmI.)

### 2. Набор SVG-иконок (по образцу WaProfile/WaStar/... ~строки 365-411)

8 иконок под механику «100 к 1» (вопрос → ответы → ошибки/страйки → банк →
раунды → большая игра → победа):

| name | label (ru) | Что рисует |
|---|---|---|
| `question` | Вопрос | Знак вопроса в облаке/карточке (по аналогии со speech bubble у Spy) |
| `answer` | Ответ открыт | Карточка со строкой + галочкой, или пронумерованный список-строка |
| `strike` | Ошибка (крестик) | Крупный крестик (можно переиспользовать форму WaCross, но с более "толстой"/круглой обводкой под стиль страйка) |
| `fund` | Банк / очки | Монета или мешок денег line-style (круг с знаком внутри, простая форма) |
| `buzzer` | Кнопка/буззер | Круглая кнопка с бликом сверху (простая, line-style) |
| `rounds` | Раунды | Три горизонтальные полоски разной длины (как progress-ступени) или пронумерованные точки-круги |
| `duel` | Большая игра (дуэль 1×1) | Два силуэта/аватара напротив друг друга ИЛИ vs-символ (простая абстрактная форма) |
| `trophy` | Победа | Можно взять форму WaTrophy как референс пропорций, но нарисовать заново (не импортировать между блоками) |

Именование компонентов: `HoQuestion`, `HoAnswer`, `HoStrike`, `HoFund`,
`HoBuzzer`, `HoRounds`, `HoDuel`, `HoTrophy` (префикс `Ho` = Hundred-to-one,
по аналогии с `Wa` для WhoAmI, `Al` для Alias).

Массив:
```tsx
const H2O_SAMPLE_ICONS: { name: string; label: string; render: IconRenderer }[] = [
  { name: "question", label: "Вопрос", render: HoQuestion },
  { name: "answer", label: "Ответ открыт", render: HoAnswer },
  { name: "strike", label: "Ошибка", render: HoStrike },
  { name: "fund", label: "Банк", render: HoFund },
  { name: "buzzer", label: "Буззер", render: HoBuzzer },
  { name: "rounds", label: "Раунды", render: HoRounds },
  { name: "duel", label: "Большая игра", render: HoDuel },
  { name: "trophy", label: "Победа", render: HoTrophy },
];
```

### 3. Компонент превью (по образцу `WhoAmIIconPreview()`, ~строка 1439)

```tsx
function HundredToOneIconPreview() {
  const panels = [
    { label: "На тёмном фоне (янтарный)", bg: H2O_BG_DARK, color: "#fbbf24" },
    { label: "На янтарной карточке (кремовый)", bg: H2O_BG_CARD, color: "#fffbeb" },
  ];
  return (
    <Section
      title="100 к 1 · плоские иконки (превью)"
      subtitle="Кандидаты на замену эмодзи в «100 к 1». В игру пока не внедрены — оцени форму и цвет."
    >
      {/* ...дословно та же структура panels.map(...) что и в WhoAmIIconPreview,
          только источник — H2O_SAMPLE_ICONS */}
    </Section>
  );
}
```

Скопируй JSX-разметку `panels.map` из `WhoAmIIconPreview` без изменений
структуры (grid, стили, размеры), поменяй только массив иконок и `panels`.

### 4. Подключение в дерево страницы

В `export default function DesignTokensPage()`, рядом с существующими
вызовами превью (~строка 1205-1208):
```tsx
<CrocIconColorMatrix />
<SpyIconPreview />
<AliasIconPreview />
<WhoAmIIconPreview />
<HundredToOneIconPreview />
```
Добавь `<HundredToOneIconPreview />` последней строкой в этом списке.

## Acceptance

- `npm run lint` и `npx tsc --noEmit` чисто.
- Новая секция видна на `/design-tokens` после блока «Кто я? · плоские иконки»,
  показывает 8 иконок на двух фоновых панелях (тёмный + карточка), полностью
  на русском (эта страница — internal preview, правило проекта: без i18n
  здесь допустимо, см. CLAUDE.md п.1 исключение).
- Игра «100 к 1» (мобильный экран, TV) — НЕ изменена, иконки только на
  превью-странице.
- НЕ коммитить. Отчёт в `codex-reports/348-h2o-line-icons-preview.md`.
