# TASK-296 — Угадай слово (Alias): плоские line-иконки + превью на /design-tokens

## Контекст
По образцу Шпиона (`SpyIcon`) и Крокодила (`CrocIcon`) делаем набор плоских
line-SVG иконок для «Угадай слово» (alias). Это шаги 2–3 паттерна редизайна:
(2) общий SVG-компонент в `src/components/games/`, (3) превью на `/design-tokens`.
**В игру НИЧЕГО не внедряем** — пользователь сначала утвердит на странице дизайна.
Не трогать `alias/page.tsx`, TV, эмодзи в игре.

Иконки — `currentColor` (цвет задаёт родитель), viewBox `0 0 24 24`, stroke-стиль
как у `SpyIcon`. Палитра Alias — розовая (#ec4899).

## Файл 1 (создать) — `src/components/games/AliasIcon.tsx`
Содержимое целиком:

```tsx
import type { CSSProperties, ReactNode } from 'react';

export type AliasIconName =
  | 'speech' | 'book' | 'letters' | 'shuffle' | 'mic' | 'talk'
  | 'hourglass' | 'check' | 'cross' | 'skip' | 'trophy' | 'medal';

const SVGS: Record<AliasIconName, ReactNode> = {
  speech: (
    <>
      <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M8 10h.01M12 10h.01M16 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  book: (
    <>
      <path d="M12 6C9.8 4.6 6.5 4.4 4 5v13c2.5-.6 5.8-.4 8 1 2.2-1.4 5.5-1.6 8-1V5c-2.5-.6-5.8-.4-8 1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 6v13" stroke="currentColor" strokeWidth="1.5" />
    </>
  ),
  letters: (
    <>
      <rect x="3" y="3.5" width="18" height="17" rx="4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8.5 15.5l3.5-8 3.5 8M9.7 12.8h4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  shuffle: (
    <>
      <path d="M3 8h3.4c1.3 0 2.5.6 3.3 1.7l4.6 5.6c.8 1.1 2 1.7 3.3 1.7H21" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M3 16h3.4c1.3 0 2.5-.6 3.3-1.7l.8-1M13.2 9.3l.8-1c.8-1.1 2-1.7 3.3-1.7H21" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M18 5l3 3-3 3M18 13l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  talk: (
    <>
      <path d="M3 5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8l-4 3V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M18 8.5c1.5.7 1.5 3.3 0 4M20.5 6.5c2.6 1.4 2.6 5.6 0 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  hourglass: (
    <>
      <path d="M6 3h12M6 21h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </>
  ),
  check: (
    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  cross: (
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  ),
  skip: (
    <>
      <path d="M5 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M13 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </>
  ),
  medal: (
    <>
      <path d="M8 3l3 6M16 3l-3 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="12" cy="15" r="6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 11.8L12.82 13.87L15.04 14.01L13.33 15.43L13.88 17.59L12 16.4L10.12 17.59L10.67 15.43L8.96 14.01L11.18 13.87Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </>
  ),
};

const DEFAULT_CLASS = 'inline-block h-[1em] w-[1em] align-[-0.15em]';

export function AliasIcon({
  name,
  className = DEFAULT_CLASS,
  style,
}: {
  name: AliasIconName;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className={className} style={style}>
      {SVGS[name]}
    </svg>
  );
}
```

## Файл 2 (правка) — `src/app/design-tokens/page.tsx`
Превью делаем по образцу `SpyIconPreview` (inline-рендереры, как у Шпиона —
строки ~145–261 и ~1176–1224). Три вставки:

### 2a) После массива `SPY_SAMPLE_ICONS` (он заканчивается на стр. ~261,
строка `];` перед `export default function DesignTokensPage()`), ДОБАВИТЬ блок:

```tsx
const ALIAS_BG_DARK =
  "linear-gradient(135deg, #2a0a1f 0%, #3b0a2f 30%, #2a0a24 60%, #2a0a1f 100%)";
const ALIAS_BG_CARD =
  "radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #ec4899 0%, #9d174d 100%)";

// Плоские line-иконки Alias (viewBox 24). currentColor — цвет задаёт панель.
const AlSpeech: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M8 10h.01M12 10h.01M16 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const AlBook: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 6C9.8 4.6 6.5 4.4 4 5v13c2.5-.6 5.8-.4 8 1 2.2-1.4 5.5-1.6 8-1V5c-2.5-.6-5.8-.4-8 1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M12 6v13" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
const AlLetters: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3.5" width="18" height="17" rx="4" stroke="currentColor" strokeWidth="1.7" />
    <path d="M8.5 15.5l3.5-8 3.5 8M9.7 12.8h4.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AlShuffle: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M3 8h3.4c1.3 0 2.5.6 3.3 1.7l4.6 5.6c.8 1.1 2 1.7 3.3 1.7H21" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M3 16h3.4c1.3 0 2.5-.6 3.3-1.7l.8-1M13.2 9.3l.8-1c.8-1.1 2-1.7 3.3-1.7H21" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M18 5l3 3-3 3M18 13l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AlMic: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const AlTalk: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M3 5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8l-4 3V5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M18 8.5c1.5.7 1.5 3.3 0 4M20.5 6.5c2.6 1.4 2.6 5.6 0 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const AlHourglass: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M6 3h12M6 21h12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <path d="M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const AlCheck: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const AlCross: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
const AlSkip: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M13 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const AlTrophy: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" stroke="currentColor" strokeWidth="1.7" />
    <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const AlMedal: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M8 3l3 6M16 3l-3 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="12" cy="15" r="6" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 11.8L12.82 13.87L15.04 14.01L13.33 15.43L13.88 17.59L12 16.4L10.12 17.59L10.67 15.43L8.96 14.01L11.18 13.87Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
);

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

### 2b) В JSX после `<SpyIconPreview />` (строка ~1045) ДОБАВИТЬ строкой ниже:
```tsx
        <AliasIconPreview />
```

### 2c) После функции `function SpyIconPreview() { ... }` (заканчивается ~стр. 1224)
ДОБАВИТЬ функцию (копия SpyIconPreview, но для Alias):
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
              {ALIAS_SAMPLE_ICONS.map((ic) => (
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

(Используй существующие в файле `IconRenderer`, `Section`, `radius` — они уже
импортированы/объявлены, как для Spy.)

## Whitelist (только эти файлы)
- `src/components/games/AliasIcon.tsx` (новый)
- `src/app/design-tokens/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: `alias/page.tsx`, TV, globals.css, `SpyIcon.tsx`/`CrocIcon.tsx`,
`CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.

## Acceptance
- На `/design-tokens` появился блок «Угадай слово · плоские иконки (превью)» с 12
  иконками на двух панелях (тёмная + розовая карточка).
- Компонент `src/components/games/AliasIcon.tsx` создан, экспортит `AliasIcon` + `AliasIconName`.
- В игру (`alias/page.tsx`, TV) НИЧЕГО не внедрено.
- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/296-alias-line-icons-preview.md`. Не коммитить.
