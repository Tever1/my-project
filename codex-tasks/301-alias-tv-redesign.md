# TASK-301 — Alias редизайн: TV-экран (игровое поле)

## Контекст
Финальная часть редизайна Alias — TV-экран («игровое поле»). Приводим к новому
виду как у TV Крокодила/Шпиона: фон `bg-gradient-alias`, плоские `AliasIcon`
вместо эмодзи, фиолетовые акценты → розовые. Плитки счёта/команд оставляем
стеклянными (как на TV croc/spy — там таблицы остаются glass для читаемости).
**ВИЗУАЛ ТОЛЬКО**, логику/состояние/socket не трогать.

Файл: `src/app/tv/[roomId]/[gameType]/page.tsx`, секция `// ===== ALIAS TV RENDER`
(около стр. 1661–1890).

## 1) Импорт (около стр. 13–15, рядом с CrocIcon/SpyIcon)
Добавить:
```
import { AliasIcon } from '@/components/games/AliasIcon';
```

## 2) Фон (стр. ~1673)
`<GameSurface className="h-screen bg-gradient-main text-white flex flex-col overflow-hidden">`
→ заменить `bg-gradient-main` на `bg-gradient-alias`.

## 3) Эмодзи → AliasIcon (по таблице, сохраняя окружающую вёрстку)
| было | где (стр.) | стало |
|------|-----------|-------|
| `<span className="text-4xl">💬</span>` | ~1677 (header) | `<AliasIcon name="speech" className="h-10 w-10" />` |
| `<div className="text-8xl mb-6">💬</div>` | ~1698 (waiting) | `<div className="mb-6 flex justify-center"><AliasIcon name="speech" className="h-24 w-24" /></div>` |
| `{isExp && '🎤'}` | ~1749 | `{isExp && <AliasIcon name="mic" className="inline-block h-[1em] w-[1em] align-[-0.15em]" />}` |
| `🎤 {explainerName}` (text-2xl font-bold) | ~1787 | `<AliasIcon name="mic" className="mr-1 inline-block h-[1em] w-[1em] align-[-0.15em]" /> {explainerName}` |
| `<span className="text-green-400">✅ {aliasState.wordsGuessed}</span>` | ~1798 | `<span className="text-green-400 inline-flex items-center gap-1"><AliasIcon name="check" className="h-[1em] w-[1em]" /> {aliasState.wordsGuessed}</span>` |
| `<span className="text-red-400">❌ {aliasState.wordsSkipped}</span>` | ~1799 | `<span className="text-red-400 inline-flex items-center gap-1"><AliasIcon name="cross" className="h-[1em] w-[1em]" /> {aliasState.wordsSkipped}</span>` |
| `✅ {..'Угадано'..}: {wordsGuessed}` | ~1830 | заменить `✅ ` на `<AliasIcon name="check" className="mr-1 inline-block h-[1em] w-[1em] align-[-0.15em]" />` |
| `❌ {..'Пропущено'..}: {wordsSkipped}` | ~1831 | заменить `❌ ` на `<AliasIcon name="cross" className="mr-1 inline-block h-[1em] w-[1em] align-[-0.15em]" />` |
| `{item.guessed ? '✅' : '❌'}` (span text-lg) | ~1846 | `{item.guessed ? <AliasIcon name="check" className="h-5 w-5" /> : <AliasIcon name="cross" className="h-5 w-5" />}` |
| `<div className="text-8xl mb-4">🏆</div>` | ~1867 | `<div className="mb-4 flex justify-center"><AliasIcon name="trophy" className="h-20 w-20" /></div>` |
| `{idx === 0 ? '🥇' : '🥈'}` (span text-3xl) | ~1878 | `<AliasIcon name="medal" className="h-8 w-8" />` |

ОСТАВИТЬ `👑` (host-маркер, стр. ~1704) — во flat-наборе нет короны.

## 4) Фиолетовые акценты → розовые
- `text-purple-300` (стр. ~1681, «на букву») → `text-pink-300`.
- `outline-purple-400` (стр. ~1739 и ~1808) → `outline-pink-400`.
- `text-purple-400` (стр. ~1791, буква letter-режима) → `text-pink-300`.
- Таймер, не-urgent градиент (стр. ~1779)
  `'linear-gradient(90deg, #a855f7, #6366f1)'` → `'linear-gradient(90deg, #f472b6, #ec4899)'`.
  (urgent-вариант с #f87171/#ef4444 не трогать.)

## Whitelist (только эти файлы)
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: мобильный alias, globals.css, другие игры в TV-файле (только секция
alias!), `AliasIcon.tsx`, `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`.
**`npm run build` НЕ запускать** — tsc + lint достаточно.

## Acceptance
- TV Alias на `bg-gradient-alias`, эмодзи (кроме 👑) заменены на `AliasIcon`,
  акценты розовые.
- Другие игры в TV-файле не затронуты.
- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/301-alias-tv-redesign.md`. Не коммитить.
