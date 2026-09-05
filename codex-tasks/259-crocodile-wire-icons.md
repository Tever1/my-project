# TASK-259 — Крокодил: заменить эмодзи на иконки (мобильный + TV)

## Контекст
В `public/icons/crocodile/` лежат 8 кремовых иконок: `croc.png`, `mic.png`,
`talk.png`, `trophy.png`, `crown.png`, `medal-gold.png`, `medal-silver.png`,
`medal-bronze.png`. Заменить ими все эмодзи в Крокодиле (мобильный экран + TV).

## Whitelist (ТОЛЬКО это)
- `src/app/game/[roomId]/crocodile/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx` (только блок CROCODILE TV RENDER)

ЗАПРЕЩЕНО: всё остальное (другие игры в TV-файле НЕ трогать, GameLayout НЕ трогать).
Минимальный diff.

## Хелпер (добавить в ОБА файла, module-scope)
```tsx
function CrocIcon({ name, className = '' }: { name: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/icons/crocodile/${name}.png`} alt="" aria-hidden className={`object-contain ${className}`} />
  );
}
```
(В TV-файле — рядом с другими module-level функциями. В мобильном — рядом с
компонентом, module-scope.)

## Замены — МОБИЛЬНЫЙ (`crocodile/page.tsx`)

| Где | Было | Стало |
|-----|------|-------|
| GameLayout проп (≈404) | `icon="🐊"` | `icon="/icons/crocodile/croc.png"` (GameLayout сам отрендерит как img) |
| ready non-explainer (≈529) | `<p className="mb-3 text-5xl">🎤</p>` | `<div className="mb-3 flex justify-center"><CrocIcon name="mic" className="h-14 w-14" /></div>` |
| карточка слова, угол (≈554) | `<span className="text-[34px]" aria-hidden="true">🐊</span>` | `<CrocIcon name="croc" className="h-9 w-9" />` |
| explaining non-explainer (≈596) | `<p className="mb-3 text-5xl">🗣️</p>` | `<div className="mb-3 flex justify-center"><CrocIcon name="talk" className="h-14 w-14" /></div>` |
| finished, карточка (≈652) | `<p className="text-4xl mb-3">🏆</p>` | `<div className="mb-3 flex justify-center"><CrocIcon name="trophy" className="h-12 w-12" /></div>` |

## Замены — TV (`tv/[roomId]/[gameType]/page.tsx`, блок крокодила)

| Где | Было | Стало |
|-----|------|-------|
| header (≈1472) | `<span className="text-4xl">🐊</span>` | `<CrocIcon name="croc" className="h-10 w-10" />` |
| waiting (≈1517) | `<div className="text-8xl mb-6">🐊</div>` | `<div className="mb-6 flex justify-center"><CrocIcon name="croc" className="h-24 w-24" /></div>` |
| waiting host (≈1523) | `{p.isHost && <span className="ml-2">👑</span>}` | `{p.isHost && <CrocIcon name="crown" className="ml-2 inline-block h-5 w-5 align-middle" />}` |
| scoreboard header (≈1581) | `<span className="text-2xl">🏆</span>` | `<CrocIcon name="trophy" className="h-7 w-7" />` |
| finished (≈1624) | `<div className="text-8xl mb-4">🏆</div>` | `<div className="mb-4 flex justify-center"><CrocIcon name="trophy" className="h-24 w-24" /></div>` |
| finished медали (≈1630) | `<span className="text-3xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}</span>` | см. ниже |

Замена медалей (≈1630): для idx 0/1/2 — иконка медали, иначе номер. Например:
```tsx
{idx < 3 ? (
  <CrocIcon
    name={idx === 0 ? 'medal-gold' : idx === 1 ? 'medal-silver' : 'medal-bronze'}
    className="h-9 w-9"
  />
) : (
  <span className="text-3xl">{idx + 1}.</span>
)}
```

## Прочее
- Эмодзи `🗣️`, `🎤` и т.п. в ДРУГИХ играх — НЕ трогать. Только крокодилий блок TV.
- Глифы ✓ / × / › (кнопки/счётчики) — оставить как есть (это не эмодзи).
- Размеры подобраны под прежние эмодзи; если визуально не влезает — можно
  подправить класс h/w в пределах разумного, но не менять разметку вокруг.

## Acceptance
- `npm run lint` без новых ошибок (img c eslint-disable в хелпере), `npx tsc --noEmit` чисто.
- НЕ запускать build.
- Изменения только в двух whitelisted файлах.
- Все перечисленные эмодзи Крокодила заменены на иконки; в других играх эмодзи целы.

## Отчёт
`codex-reports/259-crocodile-wire-icons.md` (писать разрешено). Не коммитить.
