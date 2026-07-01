# TASK-310 — Alias: (1) TV classic turnResult без списка слов; (2) высота карточки explaining без кнопок = с кнопками

## Whitelist файлов
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `src/app/game/[roomId]/alias/page.tsx`
- `codex-reports/310-alias-tv-nowords-mobile-height.md`

НЕ трогать: CLAUDE.md, AGENTS.md, .codex/**, codex-tasks/**, server.mts,
socket-handlers.mts, другие файлы.

## Изменение 1 — TV: в classic не показывать слова в промежуточных итогах
Файл `src/app/tv/[roomId]/[gameType]/page.tsx`, блок alias `phase === 'turnResult'`,
секция `{/* Word history */}` (~стр.1902-1919).

Сейчас:
```
{aliasState.turnHistory.length > 0 && (
  <div className="w-full max-w-2xl grid grid-cols-2 gap-2 max-h-[28vh] overflow-y-auto">
    ...карточки со словами...
  </div>
)}
```
Изменить условие так, чтобы список слов показывался ТОЛЬКО НЕ в classic:
```
{aliasState.mode !== 'classic' && aliasState.turnHistory.length > 0 && (
  ... как было ...
)}
```
Счётчики «Угадано/Пропущено» (блок выше, ~стр.1890-1899) и «Team scores»
(~стр.1921-1929) НЕ трогать — они остаются и в classic.

## Изменение 2 — Мобильный: высота карточки explaining одинакова с кнопками и без
Файл `src/app/game/[roomId]/alias/page.tsx`, фаза `explaining` (~стр.852-992).

Проблема: у объясняющего под карточкой есть блок кнопок (`h-[76px]`), у остальных
его нет → их карточка (`flex-1`) растягивается выше. Нужно зарезервировать место
под кнопки и для не-объясняющего, чтобы высота карточки совпадала.

Сейчас (~стр.965-990):
```
{/* Action buttons for explainer */}
{isExplainer && (
  <div className="w-full max-w-md">
    <div className="grid grid-cols-2 gap-3">
      ...две кнопки (Пропустить / Угадали)...
    </div>
  </div>
)}
```
Заменить на ВСЕГДА присутствующий слот фиксированной высоты — кнопки для
объясняющего, пустой placeholder той же высоты для остальных:
```
{/* Action slot — reserve height so the card matches with/without buttons */}
<div className="w-full max-w-md">
  {isExplainer ? (
    <div className="grid grid-cols-2 gap-3">
      ...те же две кнопки без изменений...
    </div>
  ) : (
    <div className="h-[76px]" aria-hidden />
  )}
</div>
```
Кнопки (их разметку/классы/onClick) НЕ менять — только обернуть в `isExplainer ?
... : <div className="h-[76px]" aria-hidden />`. Высота placeholder `h-[76px]`
совпадает с высотой кнопок.

## Чего НЕ делать
- НЕ менять игровую логику, фазы, очки, тексты.
- НЕ трогать letter mode на TV (там список слов остаётся).

## Acceptance
- `npx tsc --noEmit` чисто.
- `npm run lint` без новых ошибок.
- НЕ запускать `npm run build`.
- TV classic turnResult: только счётчики + team scores, без списка слов.
  TV letter turnResult: список слов остаётся.
- Мобильный explaining: высота розовой карточки одинакова у объясняющего и
  у остальных.
- diff строго в пределах whitelist.

## Отчёт
`codex-reports/310-alias-tv-nowords-mobile-height.md`.
