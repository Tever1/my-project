# TASK-308 — TV (игровое поле): корона ведущего = жёлтая line-иконка (как на мобильном)

## Контекст
На мобильном лобби (`/join/[code]`) корона ведущего — line-иконка `CrocIcon name="crown"`
жёлтого `#facc15` (TASK-305/306). На игровом поле (TV) короны разнородные:
- 3 места используют эмодзи `👑` (строки ~1739, ~2054, ~2073);
- Крокодил (стр.~1529) уже line-иконка, но белёсая (дефолтный `#f5efe6`).
Привести все короны на TV к жёлтой line-иконке, как на мобильном.

`CrocIcon` уже импортирован в файле (стр.13).

## Whitelist файлов
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `codex-reports/308-tv-crown-line-icon-yellow.md`

НЕ трогать: CLAUDE.md, AGENTS.md, .codex/**, codex-tasks/**, server.mts,
socket-handlers.mts, мобильные страницы, другие файлы.

## Изменения

### A. Заменить 3 эмодзи-короны на line-иконку (жёлтую, масштаб по тексту через `1em`)

1. Стр.~1739 (Alias TV waiting):
   - было: `{p.isHost && <span className="ml-2">👑</span>}`
   - стало: `{p.isHost && <span className="ml-2 inline-flex items-center"><CrocIcon name="crown" style={{ width: '1em', height: '1em', color: '#facc15' }} /></span>}`

2. Стр.~2054 (хедер игры, бейдж игрока):
   - было: `{p.isHost && <span>👑</span>}`
   - стало: `{p.isHost && <span className="inline-flex items-center"><CrocIcon name="crown" style={{ width: '1em', height: '1em', color: '#facc15' }} /></span>}`

3. Стр.~2073 (fallback «Игра идёт»):
   - было: `{p.isHost && <span className="ml-2">👑</span>}`
   - стало: `{p.isHost && <span className="ml-2 inline-flex items-center"><CrocIcon name="crown" style={{ width: '1em', height: '1em', color: '#facc15' }} /></span>}`

(Все три `p.isHost &&` строки идентичны по типу — заменить КАЖДОЕ вхождение по
указанному контексту; учесть, что #1 и #3 имеют одинаковый исходный текст
`<span className="ml-2">👑</span>` — заменить ОБА.)

### B. Крокодилья line-корона → жёлтая
Стр.~1529:
- было: `{p.isHost && <CrocIcon name="crown" className="h-5 w-5" />}`
- стало: `{p.isHost && <CrocIcon name="crown" className="h-5 w-5" style={{ color: '#facc15' }} />}`

## Чего НЕ делать
- НЕ менять никакую игровую логику, фазы, раскладки.
- НЕ трогать прочие иконки/эмодзи (только короны ведущего).
- Других эмодзи-корон в файле быть не должно после правки — проверить
  `grep -n "👑" src/app/tv/[roomId]/[gameType]/page.tsx` → пусто.

## Acceptance
- `npx tsc --noEmit` чисто.
- `npm run lint` без новых ошибок.
- НЕ запускать `npm run build`.
- На TV все короны ведущего — жёлтые line-иконки `CrocIcon name="crown"` `#facc15`.
- `grep "👑"` по файлу — ничего.
- diff строго в пределах whitelist.

## Отчёт
`codex-reports/308-tv-crown-line-icon-yellow.md`.
