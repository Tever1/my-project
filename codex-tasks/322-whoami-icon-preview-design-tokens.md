# TASK-322: «Кто я?» — превью плоских иконок вместо эмодзи на /design-tokens

## Контекст

Продолжаем серию замены эмодзи на плоские SVG line-иконки (уже сделано для
Крокодила, Шпиона, Alias — см. `CROC_SAMPLE_ICONS`, `SPY_SAMPLE_ICONS`,
`ALIAS_SAMPLE_ICONS` и функции `*IconPreview()` в
`src/app/design-tokens/page.tsx`). Теперь очередь игры «Кто я?»
(`who-am-i`, голубой акцент `#38bdf8`). Это **превью-этап** — сами иконки
в игру ещё не встраиваются, только показываются на `/design-tokens` для
оценки, как делали для предыдущих трёх игр.

Эмодзи, используемые сейчас в `src/app/game/[roomId]/who-am-i/page.tsx`
(файл НЕ трогать в этой задаче, только для референса что заменяем):
- `⭐` (строка ~315) — бейдж хоста рядом с ником
- `👉` (строка ~366) — указатель "сейчас ход этого игрока"
- `✅` (строка ~380) — персонаж уже угадан
- `🎉` (строки ~446, ~548) — правильная догадка / "вы уже угадали"
- `❌` (строка ~457) — неправильная догадка
- `🏆` (строка ~582) — экран "Игра окончена!"
- `🥇🥈🥉` (строка ~599) — места 1/2/3 в итоговой таблице
- `🤔` (строка ~666) — иконка игры в `GameLayout`

## Whitelist файлов (СТРОГО)

- `src/app/design-tokens/page.tsx`

## Изменения — 3 вставки в один файл

### Вставка 1: SVG-иконки + массив сэмплов

Вставить СРАЗУ ПОСЛЕ строки 357 (после закрывающей `];` массива
`ALIAS_SAMPLE_ICONS`, перед `export default function DesignTokensPage()`).
Точный якорь — этот существующий фрагмент, вставлять между ним и
`export default function DesignTokensPage()`:

```tsx
const ALIAS_SAMPLE_ICONS: { name: string; label: string; render: IconRenderer }[] = [
  { name: "speech", label: "Угадай слово", render: AlSpeech },
  { name: "book", label: "Классика", render: AlBook },
  { name: "letters", label: "На букву", render: AlLetters },
  { name: "shuffle", label: "Случайно", render: AlShuffle },
  { name: "mic", label: "Объясняет", render: AlMic },
  { name: "talk", label: "Говори вслух", render: AlTalk },
  { name: "hourglass", label: "Ожидание", render: AlHourglass },
  { name: "check", label: "Угадано", render: AlCheck },
  { name: "cross", label: "Пропущено", render: AlCross },
  { name: "skip", label: "Пропустить", render: AlSkip },
  { name: "trophy", label: "Победа", render: AlTrophy },
  { name: "medal", label: "Медаль", render: AlMedal },
];
```

Новый код для вставки (сразу после этого блока):

```tsx
const WHOAMI_BG_DARK =
  "linear-gradient(135deg, #071825 0%, #0a2d3f 30%, #0c2530 60%, #071825 100%)";
const WHOAMI_BG_CARD =
  "radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #38bdf8 0%, #0369a1 100%)";

// Плоские line-иконки «Кто я?» (viewBox 24). currentColor — цвет задаёт панель.
const WaProfile: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="9.5" r="3.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M5 20c0-3.6 3.2-6.3 7-6.3s7 2.7 7 6.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M17.1 5c.5-1 1.9-1 2.4.1.4.8-.1 1.3-.6 1.7-.4.4-.6.7-.6 1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    <circle cx="18.4" cy="9.3" r=".55" fill="currentColor" />
  </svg>
);
const WaStar: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 2.5l2.6 5.9 6.4.6-4.9 4.3 1.5 6.2L12 16.4l-5.6 3.1 1.5-6.2-4.9-4.3 6.4-.6L12 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);
const WaPointer: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M4 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const WaCheck: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const WaCross: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
const WaCelebrate: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="3" fill="currentColor" />
    <path d="M12 2v3M4.2 4.2l2.1 2.1M2 12h3M4.2 19.8l2.1-2.1M19.8 4.2l-2.1 2.1M22 12h-3M19.8 19.8l-2.1-2.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const WaTrophy: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" stroke="currentColor" strokeWidth="1.7" />
    <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const WaMedal: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M8 3l3 6M16 3l-3 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="12" cy="15" r="6" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 11.8L12.82 13.87L15.04 14.01L13.33 15.43L13.88 17.59L12 16.4L10.12 17.59L10.67 15.43L8.96 14.01L11.18 13.87Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);

const WHOAMI_SAMPLE_ICONS: { name: string; label: string; render: IconRenderer }[] = [
  { name: "profile", label: "Игра (силуэт+?)", render: WaProfile },
  { name: "star", label: "Хост", render: WaStar },
  { name: "pointer", label: "Сейчас ход", render: WaPointer },
  { name: "check", label: "Угадано", render: WaCheck },
  { name: "cross", label: "Неверно", render: WaCross },
  { name: "celebrate", label: "Правильно!", render: WaCelebrate },
  { name: "trophy", label: "Игра окончена", render: WaTrophy },
  { name: "medal", label: "Место в топе", render: WaMedal },
];
```

### Вставка 2: функция превью-секции

Найти функцию `AliasIconPreview()` (заканчивается `}` перед пустой
строкой, следом сразу начинается следующий код — используй как якорь
конец функции `AliasIconPreview`, то есть эту структуру):

```tsx
function AliasIconPreview() {
  const panels = [
    { label: "На тёмном фоне (розовый)", bg: ALIAS_BG_DARK, color: "#f9a8d4" },
    { label: "На розовой карточке (кремовый)", bg: ALIAS_BG_CARD, color: "#fdf2f8" },
  ];
  return (
    <Section
      title="Угадай слово · плоские иконки (превью)"
      subtitle="Кандидаты на замену эмодзи в Alias. В игру пока не внедрены — оцени форму и цвет."
    >
      ...
    </Section>
  );
}
```

Сразу ПОСЛЕ закрывающей `}` этой функции вставить новую функцию
(копия той же структуры, только источники данных — WhoAmI):

```tsx
function WhoAmIIconPreview() {
  const panels = [
    { label: "На тёмном фоне (голубой)", bg: WHOAMI_BG_DARK, color: "#7dd3fc" },
    { label: "На голубой карточке (кремовый)", bg: WHOAMI_BG_CARD, color: "#f0f9ff" },
  ];
  return (
    <Section
      title="Кто я? · плоские иконки (превью)"
      subtitle="Кандидаты на замену эмодзи в «Кто я?». В игру пока не внедрены — оцени форму и цвет."
    >
      <div style={{ display: "grid", gap: 18 }}>
        {panels.map((panel) => (
          <div
            key={panel.label}
            style={{
              padding: 20,
              borderRadius: radius.xl,
              background: panel.bg,
              color: panel.color,
              border: "1px solid rgba(255,255,255,0.14)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 14px 30px rgba(0,0,0,0.24)",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16, color: "rgba(255,255,255,0.6)" }}>
              {panel.label}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
                gap: 18,
              }}
            >
              {WHOAMI_SAMPLE_ICONS.map((ic) => (
                <div
                  key={ic.name}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
                >
                  <span style={{ display: "inline-flex", lineHeight: 0 }}>{ic.render(34)}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.85 }}>{ic.label}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
```

### Вставка 3: вызов новой секции в разметке страницы

Найти этот фрагмент (~строки 1140-1142):

```tsx
        <CrocIconColorMatrix />
        <SpyIconPreview />
        <AliasIconPreview />
```

Заменить на:

```tsx
        <CrocIconColorMatrix />
        <SpyIconPreview />
        <AliasIconPreview />
        <WhoAmIIconPreview />
```

## Acceptance

- `npx tsc --noEmit` — чисто.
- `npm run lint` — чисто.
- `git diff --stat` — изменения только в `src/app/design-tokens/page.tsx`.
- На `/design-tokens` появляется новая секция «Кто я? · плоские иконки
  (превью)» с 2 панелями фона (тёмный + голубая карточка) и 8 иконками
  каждая, по образцу существующих секций Crocodile/Spy/Alias.
- Игровые файлы (`who-am-i/page.tsx`, TV) НЕ трогать — это только
  превью-этап, встраивание в игру будет отдельной задачей.

Не коммитить. Отчёт в
`codex-reports/322-whoami-icon-preview-design-tokens.md`.
