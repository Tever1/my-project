# TASK-231: Шпион — фон в цвет игры, таймеры, peek-бар, кнопка «Завершить»

## Контекст

Полировка игры «Шпион» по фидбэку пользователя. Шесть пунктов, все —
клиентский UI. НЕ трогать `server.mts`, сокет-логику, игровые механики
(режимы guess/draw неприкосновенны — только визуал и тексты).

## Whitelist файлов (трогать ТОЛЬКО эти)

- `src/app/globals.css`
- `src/components/games/GameLayout.tsx`
- `src/app/game/[roomId]/spy/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

ЗАПРЕЩЕНО: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
`server.mts`, любые сокет-хэндлеры, `src/lib/game-data.ts`.

---

## Пункт 1 — Фон в цветах игры (Шпион = бирюзовый)

Шпион сейчас рендерится на нейтральном `bg-gradient-main`. Нужен фон в цвете
игры (teal `#14b8a6` / deep `#0f766e`) — и на мобильном, и на TV.

### 1a. `src/app/globals.css`

Рядом с `.bg-gradient-main` (≈ строка 701) добавить новый класс:

```css
.bg-gradient-spy {
  background: linear-gradient(135deg, #07201d 0%, #0a3b34 30%, #0c2a2e 60%, #07201d 100%);
  color: #f0eef6;
}
```

(Тёмный teal-градиент, белый текст читается. НЕ менять `.bg-gradient-main`.)

### 1b. `src/components/games/GameLayout.tsx`

Добавить опциональный проп `gradientClass?: string` со значением по умолчанию
`'bg-gradient-main'`. Применить его в className корневого `<GameSurface>`
вместо хардкода `bg-gradient-main`:

```tsx
export function GameLayout({
  children, title, icon, round, totalRounds, scores, onEnd,
  showScoreboard = false, backgroundUrl, phaseKey,
  gradientClass = 'bg-gradient-main',   // ← новый проп
}: GameLayoutProps) {
  ...
  <GameSurface backgroundUrl={backgroundUrl} className={`${gradientClass} min-h-[100dvh] text-white flex flex-col`}>
```

Не забыть добавить `gradientClass?: string` в `interface GameLayoutProps`.
Остальные 6 игр проп не передают → получают `bg-gradient-main` как раньше.

### 1c. `src/app/game/[roomId]/spy/page.tsx`

В `<GameLayout ...>` (≈ строка 717) передать `gradientClass="bg-gradient-spy"`.

### 1d. `src/app/tv/[roomId]/[gameType]/page.tsx`

В SPY TV render (≈ строка 1141) заменить класс корневого `<GameSurface>`:
`bg-gradient-main` → `bg-gradient-spy`. Только в блоке `if (gameType === 'spy')`,
другие игры не трогать.

---

## Пункт 2 + 3 — Один таймер-круг, видимый ВСЕМ игрокам

Файл: `src/app/game/[roomId]/spy/page.tsx`, фаза `playing`, режим `guess`.

**Проблема (#2):** у активного игрока показываются ДВА таймера — текстовый
в шапке (`formatTime(s.timerLeft)` ≈ строка 886) и круговой SVG (≈ 900–924).
**Проблема (#3):** не-активные игроки видят только карточку «Сейчас отвечает …»
без таймера вообще.

**Решение:** убрать текстовый таймер из шапки; круговой таймер показывать ВСЕМ
(и активному, и остальным).

### 2a. Шапка-карточка (≈ строки 880–898)

Сейчас правая часть: `s.timerRunning ? <formatTime> : isGameHost ? <Start timer button> : <timer paused>`.
Убрать ветку с `formatTime` (текстовый таймер). Когда таймер идёт — справа НЕ
показывать ничего (круг ниже уже показывает обратный отсчёт). Кнопку
«▶ Запустить таймер» (host) и «таймер на паузе» — ОСТАВИТЬ как есть. То есть:

```tsx
{s.timerRunning ? null : isGameHost ? (
  <button ... onClick={startTimer}>▶ Запустить таймер</button>
) : (
  <span ...>таймер на паузе</span>
)}
```

### 2b. Блок `s.mode === 'guess' && (...)` (≈ строки 900–935)

Сейчас круг — внутри ветки `isActivePlayer ? (круг + «Твой ход») : («Сейчас отвечает»)`.
Перестроить так, чтобы КРУГ рендерился всегда (для всех), а под ним — карточка,
зависящая от роли:

```tsx
{s.mode === 'guess' && (
  <div className="space-y-4">
    {/* Круговой таймер — виден ВСЕМ игрокам */}
    <div className="flex justify-center">
      <div className="relative h-[84px] w-[84px]">
        <svg width="84" height="84">
          <circle cx="42" cy="42" r="36" stroke="rgba(255,255,255,.12)" strokeWidth="7" fill="none" />
          <circle
            cx="42" cy="42" r="36"
            stroke={s.timerLeft <= 30 ? '#ff453a' : s.timerLeft <= 90 ? '#ffd60a' : '#64d2ff'}
            strokeWidth="7" fill="none" strokeLinecap="round"
            strokeDasharray={PHONE_TIMER_CIRC}
            strokeDashoffset={timerOffset}
            style={{ filter: 'drop-shadow(0 0 8px rgba(100,210,255,.7))', transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-black">{s.timerLeft}</span>
          <span className="text-[10px] uppercase text-white/35">
            {isActivePlayer ? l('твой ход', 'your turn') : l('ход', 'turn')}
          </span>
        </div>
      </div>
    </div>

    {/* Карточка под кругом — зависит от роли */}
    {isActivePlayer ? (
      <GlassCard className="p-4 text-center border-teal-400/25 bg-teal-500/10">
        <h2 className="text-2xl font-black text-teal-200">{l('Твой ход', 'Your turn')}</h2>
        <p className="mt-1 text-sm text-white/60">{l('Опиши слово одним предложением — но не называй его.', 'Describe the word in one sentence, but do not name it.')}</p>
      </GlassCard>
    ) : (
      <GlassCard className="p-4 text-center">
        <p className="text-white/40">{l('Сейчас отвечает', 'Now speaking')}</p>
        <p className="mt-1 text-2xl font-black text-white">{activePlayerName}</p>
      </GlassCard>
    )}
  </div>
)}
```

Логику/таймеры/синк не менять — только разметку. `timerOffset`, `PHONE_TIMER_CIRC`,
`activePlayerName`, `isActivePlayer` уже есть в компоненте.

---

## Пункт 4 — Peek-бар: для шпиона показывать «ТЫ ШПИОН» + тему

Файл: `src/app/game/[roomId]/spy/page.tsx`, функция `renderPeekBar` (≈ 684–714).

Сейчас при зажатии (`peeking`) шпион видит «Слова у тебя нет · {категория}».
Заменить ветку шпиона: показывать «ТЫ ШПИОН» КРАСНЫМИ буквами, ниже —
«Тема: {категория}». Только ветка `isSpy` внутри `peeking`. Гражданский (видит
слово) и не-зажатое состояние — НЕ трогать.

Заменить блок:
```tsx
{peeking ? (
  isSpy ? (
    <p className="text-sm text-white/60">
      {l('Слова у тебя нет', 'You have no word')}
      {' · '}
      <span className="text-teal-300">{s.categoryIcon} {s.category}</span>
    </p>
  ) : (
    <p className="text-xl font-bold text-white">{s.word}</p>
  )
) : (
  <p className="text-white/40">{l('👁 Зажми, чтобы увидеть', '👁 Hold to reveal')}</p>
)}
```
на:
```tsx
{peeking ? (
  isSpy ? (
    <div>
      <p className="text-xl font-black text-red-500">{l('ТЫ ШПИОН', 'YOU ARE THE SPY')}</p>
      {s.category && (
        <p className="mt-0.5 text-sm text-teal-300">{l('Тема:', 'Theme:')} {s.category}</p>
      )}
    </div>
  ) : (
    <p className="text-xl font-bold text-white">{s.word}</p>
  )
) : (
  <p className="text-white/40">{l('👁 Зажми, чтобы увидеть', '👁 Hold to reveal')}</p>
)}
```
(В draw-режиме `s.category` пустой → строка темы не рендерится. Это норм.)

---

## Пункт 5 — «ШПИОНОМ БЫЛА» → «ШПИОНОМ БЫЛ(а)»

Файл: `src/app/tv/[roomId]/[gameType]/page.tsx`, SPY TV roundResult (≈ строка 1353).

Заменить текст `Шпионом была` на `Шпионом был(а)`. Одна строка, больше ничего.

---

## Пункт 6 — Убрать нижнюю дублирующую кнопку «Завершить»

Файл: `src/components/games/GameLayout.tsx`.

Сейчас кнопка «Завершить» есть в ДВУХ местах: в шапке (`GlassButton variant="danger"`,
≈ строки 62–66) и внизу контента (`<button>` ≈ строки 129–139, добавлена TASK-228).
Пользователь хочет оставить ТОЛЬКО верхнюю (в шапке).

Удалить весь нижний блок:
```tsx
{onEnd && (
  <div className="pb-4 pt-2">
    <button type="button" onClick={() => setEndConfirmOpen(true)} className="w-full rounded-xl border border-red-500/20 ...">
      {locale === 'ru' ? 'Завершить игру' : 'End game'}
    </button>
  </div>
)}
```
Верхнюю кнопку в шапке и модалку подтверждения (`endConfirmOpen`) — НЕ трогать,
они остаются рабочими.

---

## Пункт 7 — Заменить эмодзи Шпиона на кастомные PNG

Иконки уже сгенерированы и лежат в `public/icons/spy/`:
`mask, shield, trophy, medal, eye, hide, speech, palette, refresh, skip,
ballot, check, cross, warning` (.png, прозрачные RGBA).

Заменить эмодзи на `<img>` ТОЛЬКО там, где для эмодзи есть иконка из набора.
Глифы БЕЗ иконки — `▶`, `➡`, `⏱`, `📱` — ОСТАВИТЬ как есть (их в наборе нет).
`warning.png` пока НЕ используем (модалка ⚠️ в GameLayout общая для всех 7 игр —
не тинтить её в teal). Менять разметку, тексты в `l(ru,en)` чистим от эмодзи.

### 7a. Хелпер в `src/app/game/[roomId]/spy/page.tsx`

Добавить рядом с другими top-level функциями (вне компонента):
```tsx
function SpyIcon({ name, className = 'inline-block h-[1em] w-[1em] align-[-0.15em]' }: { name: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/icons/spy/${name}.png`} alt="" aria-hidden className={className} />;
}
```
`h-[1em] w-[1em]` = иконка масштабируется по размеру текста (для инлайна в кнопках/тексте).
Для крупных декоративных — передавать явный размер через `className`.

### 7b. Хелпер в `src/app/tv/[roomId]/[gameType]/page.tsx`

Добавить на уровне модуля (рядом с другими функциями файла):
```tsx
function SpyImg({ name, className }: { name: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/icons/spy/${name}.png`} alt="" aria-hidden className={className} />;
}
```

### 7c. GameLayout — иконка-заголовок как путь

`src/components/games/GameLayout.tsx` ≈ строка 50. Сейчас:
```tsx
{icon && <span className="text-2xl flex-shrink-0">{icon}</span>}
```
Заменить на (backward-compatible — другие игры передают эмодзи-строку):
```tsx
{icon && (icon.startsWith('/') ? (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={icon} alt="" aria-hidden className="h-7 w-7 flex-shrink-0 object-contain" />
) : (
  <span className="text-2xl flex-shrink-0">{icon}</span>
))}
```

### 7d. Маппинг в `spy/page.tsx` (заменить каждое вхождение)

| Строка | Было | Стало |
|--------|------|-------|
| 706 | `{l('👁 Зажми, чтобы увидеть', '👁 Hold to reveal')}` | `<><SpyIcon name="eye" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('Зажми, чтобы увидеть', 'Hold to reveal')}</>` |
| 719 | `icon="🎭"` | `icon="/icons/spy/mask.png"` |
| 726 | `<div className="text-6xl">🏆</div>` | `<SpyIcon name="trophy" className="mx-auto h-16 w-16" />` |
| 733 | `{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}` (внутри span) | `<SpyIcon name="medal" className="mx-auto h-6 w-6" />` |
| 751 | `<div className="text-6xl">🎭</div>` | `<SpyIcon name="mask" className="mx-auto h-16 w-16" />` |
| 768 | `{l('🎨 В режиме ', '🎨 In ')}` | `<SpyIcon name="palette" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('В режиме ', 'In ')}` |
| 776 | `<span className="text-2xl mr-2">💬</span>` | `<SpyIcon name="speech" className="mr-2 h-6 w-6" />` |
| 779 | `<span className="text-2xl mr-2">🎨</span>` | `<SpyIcon name="palette" className="mr-2 h-6 w-6" />` |
| 795 | `{isSpy ? l('🎭 Ты — ШПИОН', '🎭 You are the SPY') : l('🛡 Ты — мирный житель', '🛡 You are a civilian')}` | `{isSpy ? (<><SpyIcon name="mask" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1.5" />{l('Ты — ШПИОН', 'You are the SPY')}</>) : (<><SpyIcon name="shield" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1.5" />{l('Ты — мирный житель', 'You are a civilian')}</>)}` |
| 802 | `<div className="text-6xl">🎭</div>` | `<SpyIcon name="mask" className="mx-auto h-16 w-16" />` |
| 804 | `{l('🎭 Ты — ШПИОН', '🎭 You are the SPY')}` | `{l('Ты — ШПИОН', 'You are the SPY')}` (эмодзи убрать, иконка уже выше) |
| 829 | `<div className="text-6xl">🎭</div>` | `<SpyIcon name="mask" className="mx-auto h-16 w-16" />` |
| 860 | `{l('✓ Готов', '✓ Ready')}` | `<><SpyIcon name="check" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('Готов', 'Ready')}</>` |
| 864 | `: l('🙈 Понятно, спрятать', '🙈 Got it, hide')}` (ветка non-spy) | `: (<><SpyIcon name="hide" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('Понятно, спрятать', 'Got it, hide')}</>)}` |
| 951 | `{l('🎨 Твой ход — рисуй!', '🎨 Your turn — draw!')}` | `<SpyIcon name="palette" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('Твой ход — рисуй!', 'Your turn — draw!')}` |
| 956 | `{l('🎨 Рисует: ', '🎨 Drawing: ')}` | `<SpyIcon name="palette" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('Рисует: ', 'Drawing: ')}` |
| 977 | `{l('🔄 Следующее слово', '🔄 Next word')}` | `<><SpyIcon name="refresh" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('Следующее слово', 'Next word')}</>` |
| 986 | `{l('🗳 Начать голосование', '🗳 Start voting')}` | `<><SpyIcon name="ballot" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('Начать голосование', 'Start voting')}</>` |
| 992 | `{l('🔄 Заменить слово', '🔄 Replace word')}` | `<><SpyIcon name="refresh" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('Заменить слово', 'Replace word')}</>` |
| 993 | `{l('⏭ Пропустить', '⏭ Skip')}` | `<><SpyIcon name="skip" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('Пропустить', 'Skip')}</>` |
| 995 | `{l('🗳 Начать голосование', '🗳 Start voting')}` | `<><SpyIcon name="ballot" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('Начать голосование', 'Start voting')}</>` |
| 1043–1044 | блок `{selectedVoteName ? l(\`🗳 Голосовать за ${selectedVoteName}\`, …) : l('🗳 Выбери игрока', …)}` | `<><SpyIcon name="ballot" className="mr-1.5 h-5 w-5" />{selectedVoteName ? l(\`Голосовать за ${selectedVoteName}\`, \`Vote for ${selectedVoteName}\`) : l('Выбери игрока', 'Choose a player')}</>` |
| 1054 | `<span className="text-3xl">{s.roundResult.spyCaught ? '✓' : '✗'}</span>` | `{s.roundResult.spyCaught ? <SpyIcon name="check" className="h-8 w-8" /> : <SpyIcon name="cross" className="h-8 w-8" />}` |
| 1071 | `<p className="mt-2 text-3xl">🎭</p>` | `<SpyIcon name="mask" className="mx-auto mt-2 h-8 w-8" />` |
| 1083 | `{myPosition === 1 ? '🥇' : myPosition === 2 ? '🥈' : '🥉'} {myPosition}-…` | `<SpyIcon name="medal" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" /> {myPosition}-…` (хвост строки не менять) |
| 1099 | `{l('🏆 Завершить игру', '🏆 Finish game')}` | `<><SpyIcon name="trophy" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('Завершить игру', 'Finish game')}</>` |

ОСТАВИТЬ без изменений (нет иконки): 871/872/893/1095 `▶`, 971 `➡`, 1006 `⏱`.

### 7e. Маппинг в TV (`tv/[roomId]/[gameType]/page.tsx`, блок `if (gameType === 'spy')`)

| ~Строка | Было | Стало |
|---------|------|-------|
| 1144 | `<span className="text-3xl">🎭</span>` | `<SpyImg name="mask" className="h-8 w-8" />` |
| 1180 | `{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}` (внутри span) | `<SpyImg name="medal" className="h-7 w-7" />` |
| 1194 | `<span className="text-[120px] leading-none">🎭</span>` | `<SpyImg name="mask" className="h-32 w-32" />` |
| 1210 | `🎭 Один из вас — шпион. Он слова не получил.` | `<SpyImg name="mask" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />Один из вас — шпион. Он слова не получил.` |
| 1225 | `{ready && <span className="text-teal-400">✓</span>}` | `{ready && <SpyImg name="check" className="h-5 w-5" />}` |
| 1237 | `{l('🎨 Рисует: ', '🎨 Drawing: ')}` | `<SpyImg name="palette" className="inline-block h-[1em] w-[1em] align-[-0.15em] mr-1" />{l('Рисует: ', 'Drawing: ')}` |
| 1345 | `<span className="text-3xl">{sp.roundResult.spyCaught ? '✓' : '✗'}</span>` | `{sp.roundResult.spyCaught ? <SpyImg name="check" className="h-8 w-8" /> : <SpyImg name="cross" className="h-8 w-8" />}` |
| 1358 | `<span className="absolute -bottom-1 -right-1 text-xl">🎭</span>` | `<SpyImg name="mask" className="absolute -bottom-1 -right-1 h-5 w-5" />` |

ОСТАВИТЬ: 1159 `⏱`, 1386 `📱` (нет иконок в наборе).

Номера строк ориентировочные — искать по тексту эмодзи/строки, а не по номеру.

## Acceptance

- `npm run lint` — без новых ошибок.
- `npx tsc --noEmit` (или `npm run build` если доступен) — типы чистые.
- Spy mobile: в фазе playing виден ОДИН круговой таймер и у активного, и у
  не-активного игрока; текстового таймера в шапке нет.
- Spy mobile peek: шпион при зажатии видит «ТЫ ШПИОН» красным + «Тема: …».
- Spy mobile + TV: фон бирюзовый (`bg-gradient-spy`); другие игры — без изменений.
- TV roundResult: «Шпионом был(а)».
- GameLayout: на мобильном одна кнопка «Завершить» (в шапке), нижней нет.
- Режимы guess/draw, голосование, синк, таймер-логика — не сломаны.
- Эмодзи Шпиона (там где есть иконка в наборе) заменены на `<img>` из
  `public/icons/spy/`; `▶ ➡ ⏱ 📱` оставлены; модалка ⚠️ в GameLayout не тронута;
  тексты `l(ru,en)` очищены от вынесенных в иконку эмодзи (без «голых» пробелов
  в начале строки).

## Отчёт

`codex-reports/231-spy-polish-bg-timers-peek-end.md`: что сделано по каждому
пункту, как проверено. Не коммитить.
