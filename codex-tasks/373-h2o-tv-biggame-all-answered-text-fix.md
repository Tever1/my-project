# TASK-373: TV «100 к 1» Большая игра — исправить текст сообщения «все вопросы отвечены»

## Контекст

TASK-372 добавил в `src/app/tv/[roomId]/[gameType]/page.tsx` (строка ~1618)
сообщение, которое показывается, когда `h.bgCurQ >= 5` на `bgPhase === 1`
или `3`:

```tsx
{(h.bgPhase === 1 || h.bgPhase === 3) && h.bgCurQ >= 5 ? (
  <div className={`${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`}>
    {l('Все вопросы отвечены — ждём ведущего…', 'All questions answered — waiting for the host…')}
  </div>
) : ( ... )}
```

Пользователь указал: слова «отвечены» не существует в русском языке (нет
такой формы у глагола «ответить» в пассивном залоге для этого контекста).
Нужно заменить текст на грамматически корректный, с именем игрока, который
только что закончил отвечать.

## Что сделать

Заменить текст на:

```
Игрок {имя} ответил на все вопросы — ждём проверки ведущего
```

Имя игрока — это тот, кто СЕЙЧАС отвечал (P1 на `bgPhase===1`, P2 на
`bgPhase===3`). В этом же файле уже есть готовый хелпер `h2oPlayerName(id)`
(строка ~1202) и используется точно такой же паттерн чуть ниже в этом же
блоке (строка ~1646-1647):

```tsx
<PlayerAvatar nickname={h2oPlayerName(h.bgPhase <= 2 ? h.bgP1Id : h.bgP2Id)} sizePx={42} />
<b className="text-[22px]">{h2oPlayerName(h.bgPhase <= 2 ? h.bgP1Id : h.bgP2Id)}</b>
```

Используй `h2oPlayerName(h.bgPhase === 1 ? h.bgP1Id : h.bgP2Id)` (в этой
ветке `h.bgPhase` гарантированно равен `1` или `3`, так что `h.bgPhase ===
1 ? h.bgP1Id : h.bgP2Id` эквивалентно `h.bgPhase <= 2 ? ... : ...` из
образца выше — используй любой вариант, главное чтобы для `bgPhase===1`
брался `bgP1Id`, а для `bgPhase===3` — `bgP2Id`).

Итоговый JSX:

```tsx
{(h.bgPhase === 1 || h.bgPhase === 3) && h.bgCurQ >= 5 ? (
  <div className={`${H2O_TV_GLASS} flex flex-1 items-center justify-center rounded-[var(--radius-xl)] px-6 py-8 text-center text-[30px] font-extrabold tracking-[-.5px] text-amber-200`}>
    {l(
      `Игрок ${h2oPlayerName(h.bgPhase === 1 ? h.bgP1Id : h.bgP2Id)} ответил на все вопросы — ждём проверки ведущего`,
      `${h2oPlayerName(h.bgPhase === 1 ? h.bgP1Id : h.bgP2Id)} answered all questions — waiting for the host to check`
    )}
  </div>
) : ( ... остальное без изменений ... )}
```

Больше ничего в этом блоке (стили, условие показа, ветка `else` со списком
вопросов) не менять.

## Whitelist файлов

- `src/app/tv/[roomId]/[gameType]/page.tsx` — ЕДИНСТВЕННЫЙ файл для правки.

## Acceptance

- `npx tsc --noEmit` без новых ошибок.
- `npm run lint` без новых warnings/errors.
- Текст сообщения на русском грамматически корректен и включает имя игрока:
  «Игрок {имя} ответил на все вопросы — ждём проверки ведущего».
- Условие показа (`bgPhase === 1 || 3` и `bgCurQ >= 5`) не изменено.
- Остальной рендер блока (ветка со списком вопросов, стили) не затронут.

## Отчёт

Записать в `codex-reports/373-h2o-tv-biggame-all-answered-text-fix.md`:
что изменено, diff по строкам, результат tsc/lint.
