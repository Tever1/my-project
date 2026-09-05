# TASK-267 — Шпион: превью плоских line-иконок на /design-tokens

## Цель

Добавить на страницу `/design-tokens` секцию-превью с плоскими line-SVG
иконками для Шпиона (бирюзовая тема). **Только превью для оценки** — в игру
НЕ внедряем, PNG (`public/icons/spy/*.png`) НЕ трогаем. После одобрения юзером
будет отдельный таск на интеграцию.

Набор повторяет имена существующих `SpyIcon` (PNG): `mask, speech, palette,
ballot, check, cross, hide, refresh, shield, trophy, eye, medal, skip, warning`
(14 шт.).

## Whitelist файлов

- `src/app/design-tokens/page.tsx` — только добавления (новые константы/иконки/
  секция + один вызов секции)
- `codex-reports/267-spy-line-icons-preview.md` — **отчёт (писать СЮДА разрешено)**

**НЕ трогать:** `public/icons/**`, файлы Шпиона (`spy/page.tsx`, TV), socket,
server.mts, package.json. Существующий код design-tokens не переписывать — только
ДОБАВИТЬ новое.

---

## Шаг 1 — добавить константы фона и рендереры иконок

Рядом с уже существующими `CROC_*` константами / иконками (верх файла, после
блока `CROC_SAMPLE_ICONS`, ≈ строка 138) добавить:

```tsx
const SPY_BG_DARK =
  "linear-gradient(135deg, #07201d 0%, #0a3b34 30%, #0c2a2e 60%, #07201d 100%)";
const SPY_BG_CARD =
  "radial-gradient(110% 70% at 50% -5%, rgba(255,255,255,.22), transparent 55%), linear-gradient(165deg, #14b8a6 0%, #0f766e 100%)";

// Плоские line-иконки Шпиона (viewBox 24). currentColor — цвет задаёт панель.
const SpMask: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M2 10c2-2 6-2.5 10-2.5S20 8 22 10c0 4-3 6.5-6.5 6.5-2 0-3-1.6-3.5-1.6S9 16.5 7 16.5C3.5 16.5 2 14 2 10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="7.5" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="16.5" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);
const SpSpeech: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M8 10h.01M12 10h.01M16 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const SpPalette: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 3c5 0 9 3.4 9 8 0 2.2-1.8 4-4 4h-2c-.9 0-1.6.7-1.6 1.6 0 .4.2.7.2 1.1 0 .9-.6 1.3-1.6 1.3A9 8 0 0 1 12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="8" cy="9.5" r="1" fill="currentColor" />
    <circle cx="11.5" cy="6.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="7.5" r="1" fill="currentColor" />
  </svg>
);
const SpBallot: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M4 8.5l8-4.5 8 4.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M9 12.5l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SpCheck: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SpCross: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);
const SpHide: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M3 12s3.6-6.5 9-6.5 9 6.5 9 6.5-3.6 6.5-9 6.5S3 12 3 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.6" />
    <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const SpRefresh: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M20 6.5A8 8 0 1 0 21 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M20 3v4h-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SpShield: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 3l7 3v5c0 4.6-3 8.2-7 9.4C8 19.2 5 15.6 5 11V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M9 11.8l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const SpTrophy: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" stroke="currentColor" strokeWidth="1.7" />
    <path d="M6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 14v4M8 20h8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const SpEye: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);
const SpMedal: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M8 3l3 6M16 3l-3 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    <circle cx="12" cy="15" r="6" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 11.6l1.1 2.3 2.5.2-1.9 1.7.6 2.4L12 18.6l-2.3 1.3.6-2.4-1.9-1.7 2.5-.2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);
const SpSkip: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M5 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M13 6l7 6-7 6V6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);
const SpWarning: IconRenderer = (s = 28) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
    <path d="M12 4l9 16H3L12 4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M12 10v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const SPY_SAMPLE_ICONS: { name: string; label: string; render: IconRenderer }[] = [
  { name: "mask", label: "Маска", render: SpMask },
  { name: "speech", label: "Реплика", render: SpSpeech },
  { name: "palette", label: "Рисовать", render: SpPalette },
  { name: "ballot", label: "Голос", render: SpBallot },
  { name: "check", label: "Верно", render: SpCheck },
  { name: "cross", label: "Неверно", render: SpCross },
  { name: "hide", label: "Скрыть", render: SpHide },
  { name: "refresh", label: "Сменить", render: SpRefresh },
  { name: "shield", label: "Защита", render: SpShield },
  { name: "trophy", label: "Трофей", render: SpTrophy },
  { name: "eye", label: "Глаз", render: SpEye },
  { name: "medal", label: "Медаль", render: SpMedal },
  { name: "skip", label: "Пропуск", render: SpSkip },
  { name: "warning", label: "Внимание", render: SpWarning },
];
```

> `IconRenderer` — тип уже объявлен в файле (используется CROC-иконками).

## Шаг 2 — добавить секцию-компонент (рядом с `CrocIconColorMatrix`)

```tsx
function SpyIconPreview() {
  const panels = [
    { label: "На тёмном фоне (бирюзовый)", bg: SPY_BG_DARK, color: "#5eead4" },
    { label: "На бирюзовой карточке (кремовый)", bg: SPY_BG_CARD, color: "#f5efe6" },
  ];
  return (
    <Section
      title="Шпион · плоские иконки (превью)"
      subtitle="Кандидаты на замену PNG-иконок Шпиона. В игру пока не внедрены — оцени форму и цвет."
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
              {SPY_SAMPLE_ICONS.map((ic) => (
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

## Шаг 3 — вызвать секцию

Сразу после `<CrocIconColorMatrix />` (≈ строка 921) добавить:

```tsx
        <SpyIconPreview />
```

---

## Acceptance

- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- На `/design-tokens` появилась секция «Шпион · плоские иконки (превью)» —
  14 иконок на двух панелях (тёмный фон / бирюзовая карточка).
- Файлы Шпиона и `public/icons/**` НЕ изменены.
- НЕ коммитить. Отчёт → `codex-reports/267-spy-line-icons-preview.md`.
