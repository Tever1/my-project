# TASK-378: «Мафия» — превью плоских line-иконок на `/design-tokens` (по образцу остальных 5 игр)

## Контекст

На `/design-tokens` уже есть секции с плоскими line-иконками (SVG,
`viewBox="0 0 24 24"`, `stroke="currentColor"`) для 5 из 7 игр:
Crocodile (`CrocIconPreview`), Spy (`SpyIconPreview`), Alias
(`AliasIconPreview`), Who Am I (`WhoAmIIconPreview`), 100 к 1
(`HundredToOneIconPreview`). У «Мафии» и «Квиза» такой секции нет.
Пользователь попросил сделать то же самое для **Мафии**.

Референс-паттерн — секция 100 к 1 (`H2O_BG_DARK`, `H2O_BG_CARD`,
8 inline SVG-иконок `Ho*`, массив `H2O_SAMPLE_ICONS`, функция
`HundredToOneIconPreview()`) в `src/app/design-tokens/page.tsx`
(~строки 424-496 и 1564-1612). Скопировать структуру один в один, только
с мафийской палитрой и мафийскими иконками.

## Что сделать

В `src/app/design-tokens/page.tsx`:

### 1. Константы фона (по образцу `H2O_BG_DARK`/`H2O_BG_CARD`, ~рядом со строкой 424)

Цвет игры «Мафия»: `accent: "#8b5cf6"`, `deep: "#4c1d95"` (см.
`src/lib/design/tokens.ts`, `gameColors.mafia`). Сделать аналогичные
градиенты в фиолетовой палитре:

```tsx
const MAFIA_BG_DARK =
  "linear-gradient(135deg, #150a2e 0%, #2e1065 30%, #1f0a4a 60%, #150a2e 100%)";
const MAFIA_BG_CARD =
  "radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #8b5cf6 0%, #4c1d95 100%)";
```
(можно скорректировать оттенки на глаз, главное — тёмный фиолетовый фон +
карточка в градиенте accent→deep, как у остальных игр).

### 2. 8 inline SVG-иконок, `viewBox 24`, `stroke="currentColor"` (по образцу `Ho*`)

Тематика — механика Мафии. Придумать форму в том же плоском line-стиле
(strokeWidth 1.6-1.8, `strokeLinecap="round"`, `strokeLinejoin="round"`,
без заливок кроме мелких акцентных точек), 8 штук:

1. **Роль/маска** (карта роли — маска мафиози) — `label: "Роль"`
2. **Ночь** (полумесяц) — `label: "Ночь"`
3. **День** (солнце) — `label: "День"`
4. **Голосование** (бюллетень/галочка в урне) — `label: "Голосование"`
5. **Детектив** (лупа) — `label: "Проверка детектива"`
6. **Доктор** (крест/щит с плюсом) — `label: "Спасение доктора"`
7. **Устранён** (череп ИЛИ перечёркнутый силуэт — на выбор, в плоском
   стиле, не мрачно-реалистично) — `label: "Устранён"`
8. **Победа** (трофей, по аналогии с `HoTrophy`/`WaTrophy` — можно взять
   похожую форму для консистентности между играми) — `label: "Победа"`

Назвать компоненты с префиксом `Mf` (`MfRole`, `MfNight`, `MfDay`,
`MfVote`, `MfDetective`, `MfDoctor`, `MfEliminated`, `MfTrophy`), тип
`IconRenderer` уже определён в файле (используется всеми остальными
наборами) — переиспользовать его.

### 3. Массив образцов (по образцу `H2O_SAMPLE_ICONS`)

```tsx
const MAFIA_SAMPLE_ICONS: { name: string; label: string; render: IconRenderer }[] = [
  { name: "role", label: "Роль", render: MfRole },
  { name: "night", label: "Ночь", render: MfNight },
  { name: "day", label: "День", render: MfDay },
  { name: "vote", label: "Голосование", render: MfVote },
  { name: "detective", label: "Проверка детектива", render: MfDetective },
  { name: "doctor", label: "Спасение доктора", render: MfDoctor },
  { name: "eliminated", label: "Устранён", render: MfEliminated },
  { name: "trophy", label: "Победа", render: MfTrophy },
];
```

### 4. Функция превью (по образцу `HundredToOneIconPreview`, ~строка 1564)

```tsx
function MafiaIconPreview() {
  const panels = [
    { label: "На тёмном фоне (фиолетовый)", bg: MAFIA_BG_DARK, color: "#c4b5fd" },
    { label: "На фиолетовой карточке (светлый)", bg: MAFIA_BG_CARD, color: "#f5f3ff" },
  ];
  return (
    <Section
      title="Мафия · плоские иконки (превью)"
      subtitle="Кандидаты на замену эмодзи в «Мафии». В игру пока не внедрены — оцени форму и цвет."
    >
      {/* тело идентично HundredToOneIconPreview, только MAFIA_SAMPLE_ICONS вместо H2O_SAMPLE_ICONS */}
    </Section>
  );
}
```
Скопировать JSX-тело один в один со стилями `HundredToOneIconPreview`
(тот же `radius.xl`, тот же grid `repeat(auto-fit, minmax(92px, 1fr))`,
тот же размер иконок `ic.render(34)`).

### 5. Подключить секцию в композиции

Рядом со строкой ~1280-1283, где уже вызываются
`<SpyIconPreview />`, `<AliasIconPreview />`, `<WhoAmIIconPreview />`,
`<HundredToOneIconPreview />` — добавить `<MafiaIconPreview />`.
Порядок в списке — на усмотрение, логично сразу после Crocodile или
перед Spy (не критично).

## Whitelist файлов

- `src/app/design-tokens/page.tsx`

Это internal preview/dev-страница (см. правило проекта — такие страницы
без i18n, только русский текст, что уже соблюдено в остальных секциях).
Больше никаких файлов не трогать — иконки только на этой странице,
никакие игровые экраны (`src/app/game/...`, `src/app/tv/...`) не
затрагиваются.

## Acceptance

- `npx tsc --noEmit` без новых ошибок.
- `npm run lint` без новых warnings/errors.
- На `/design-tokens` появляется новая секция «Мафия · плоские иконки
  (превью)» с 2 панелями (тёмный фон + фиолетовая карточка) и 8 иконками
  каждая, визуально в том же стиле/размере/раскладке, что и у остальных
  5 игр.
- Игровые файлы (`hundred-to-one`, `mafia`, TV-роут и т.д.) не
  редактировались — только `design-tokens/page.tsx`.

## Отчёт

Записать в `codex-reports/378-mafia-line-icons-preview.md`:
что изменено, diff по строкам, результат tsc/lint.
