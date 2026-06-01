# TASK-171: TV Quiz — 4 визуальных и поведенческих бага

## Цель
Исправить 4 бага, обнаруженных при QA TV-режима квиза.

## Whitelist файлов
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `src/components/lobby/Lobby.tsx`

## Bug 1: TV варианты ответа — дизайн не совпадает с мобильным

### Что сейчас (TV, ~строки 629-661)
Цветные gradient-тайлы с буквами A/B/C/D:
```tsx
<div className={`rounded-2xl border-2 p-4 ... bg-gradient-to-br ${OPTION_COLORS_TV[index]}`}>
  <span>A/B/C/D или ✓</span>
  <span>текст ответа</span>
</div>
```

### Что должно быть (скопировать дизайн с мобильной версии)
Стиль как в `src/app/game/[roomId]/quiz/page.tsx` (~строки 1103-1165):
- Карточка: `rounded-md border backdrop-blur-xl` (без gradient background у ответов)
- Левая цветная полоска (1.5px, `absolute left-0 inset-y-0 w-1.5`) — зелёная на correct, красная на wrong, жёлтая если это мой ответ, transparent иначе
- Цифровой бейдж (1/2/3/4) вместо букв A/B/C/D
- На TV (где нет "my answer") `stripColor` всегда `transparent` до reveal, зелёный на correct, серый на wrong

**Конкретный план:**
1. Убрать `OPTION_COLORS_TV` массив (строки 104-109)
2. В блоке рендера вариантов ответа (grid cols-2, строки 628-661) переписать на:

```tsx
<div className="grid grid-cols-2 gap-3 flex-shrink-0">
  {currentQuestion.options.map((option, index) => {
    const isCorrectAnswer = index === currentQuestion.correctIndex;
    const isCorrectRevealed = quizState.showCorrect && isCorrectAnswer;
    const isWrongRevealed = quizState.showCorrect && !isCorrectAnswer;
    const stripColor = isCorrectRevealed ? '#4ade80' : isWrongRevealed ? '#f87171' : 'transparent';
    const bgClass = isCorrectRevealed
      ? 'bg-green-500/10 border-green-400/30'
      : isWrongRevealed
        ? 'bg-white/5 border-white/10 opacity-40'
        : 'bg-white/5 border-white/10';

    return (
      <div
        key={index}
        className={`relative overflow-hidden rounded-md border p-5 text-left backdrop-blur-xl transition-colors duration-300 ${bgClass}`}
      >
        {/* Left accent strip */}
        <div
          className="absolute left-0 inset-y-0 w-1.5 transition-colors duration-300"
          style={{ backgroundColor: stripColor }}
        />
        <div className="flex items-center gap-4 pl-3">
          {/* Number badge */}
          <span className={`
            flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black
            ${isCorrectRevealed ? 'bg-green-500/20 text-green-300' : 'bg-white/8 text-white/50'}
          `}>
            {isCorrectRevealed ? '✓' : index + 1}
          </span>
          <span className={`text-xl font-semibold line-clamp-2 leading-tight ${
            isCorrectRevealed ? 'text-green-100' : 'text-white'
          }`}>
            {locale === 'ru' ? option.ru : option.en}
          </span>
        </div>
      </div>
    );
  })}
</div>
```

## Bug 2: Фон не отображается в тематических квизах на TV

### Причина
Родительский `<div className="... relative ...">` без явного `z-index` не создаёт stacking context. Дочерний `<img className="absolute inset-0 ... -z-10">` уходит за body, градиент `bg-gradient-main` перекрывает картинку.

### Фикс
В корневом div TV квиза (строка ~488-489) добавить `isolate` или `z-0` чтобы создать stacking context:

```tsx
// Найти:
className={`h-screen bg-gradient-main text-white flex flex-col overflow-hidden relative ${backgroundUrl ? ...}`}

// Заменить на:
className={`h-screen bg-gradient-main text-white flex flex-col overflow-hidden relative isolate ${backgroundUrl ? ...}`}
```

`isolate` — это Tailwind utility для `isolation: isolate`, создаёт stacking context без изменения z-index.

## Bug 3: Эмодзи 🧠 в левом верхнем углу TV

### Причина
`const gameIcon = gameInfo?.icon || '🎮'` (строка ~183), `GAMES` конфиг для quiz имеет `icon: '🧠'`.
Используется в строке ~504: `<span className="text-4xl">{gameIcon}</span>`.

### Фикс
Заменить `<span className="text-4xl">{gameIcon}</span>` на `<GameIcon>` компонент.

В файле `src/app/tv/[roomId]/[gameType]/page.tsx`:
1. Добавить импорт (если нет): `import { GameIcon } from '@/components/GameIcon';`
2. Найти все места где `{gameIcon}` рендерится в JSX (строки ~504 и ~1508) и заменить:
   ```tsx
   // Было:
   <span className="text-4xl">{gameIcon}</span>
   // Стало:
   <GameIcon gameId={gameType} size={36} className="flex-shrink-0" />
   ```
3. Строку `const gameIcon = gameInfo?.icon || '🎮';` (строка ~183) — оставить (используется ещё в строке ~546 для "waiting" экрана). На строке ~546 тоже заменить на `<GameIcon>`.

## Bug 4: TV переключается на QR-экран после окончания игры

### Симптом
Когда все игроки выходят из комнаты (или игра завершается), TV переключается на экран с QR-кодом ("Меню подключения игроков").

### Причина
После `game:ended` TV навигирует на `/lobby/[roomId]`. Там Lobby.tsx подписывается на `room:show-qr`. Если хост (или кто-то) вызывает `handleAddPlayer` — сервер рассылает `room:show-qr` всем, и TV-клиент в лобби выставляет `isWaitingForPlayers = true`, показывая QR-экран.

### Фикс в `src/components/lobby/Lobby.tsx`
Обработчик `room:show-qr` на TV клиенте должен игнорировать событие — TV не должен автоматически показывать QR. QR-экран нужен только хосту (тому кто нажал "+ Добавить"):

```tsx
// Найти (~строки 498-503):
useEffect(() => {
  return on('room:show-qr', () => {
    if (myRole !== "tv") return;
    setIsWaitingForPlayers(true);
  });
}, [myRole, on]);

// Заменить на:
useEffect(() => {
  return on('room:show-qr', () => {
    // TV clients do NOT show the QR waiting screen.
    // QR is only for the host device (player/creator role).
    if (myRole === "tv") return;
    setIsWaitingForPlayers(true);
  });
}, [myRole, on]);
```

Логика: TV — это большой экран, он всегда показывает игровое состояние/лобби. QR для подключения игроков показывается только на хост-устройстве.

## Acceptance criteria
- [ ] TV варианты ответа визуально идентичны мобильной версии (полоска, цифровой бейдж, backdrop-blur)
- [ ] Фоновая картинка Harry Potter / Marvel видна на TV в тематическом квизе
- [ ] В левом верхнем углу TV вместо 🧠 отображается иконка из `public/icons/games/quiz.png`
- [ ] После окончания игры TV показывает нормальное лобби, а не QR-экран

## Не трогать
- Логику игры
- Mobile quiz page
- `src/lib/games-config.ts` (icon field там нужен для других мест)
- Classic mode Alias
- CLAUDE.md, AGENTS.md

## Отчёт
Записать в `codex-reports/171-tv-quiz-4-bugs.md`
