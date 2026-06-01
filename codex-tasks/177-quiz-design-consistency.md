# TASK-177: Quiz — единый дизайн, счётчик ответов, цветные рамки, хост-бейдж

## Whitelist файлов
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`
- `src/components/lobby/Lobby.tsx`

ЭТАЛОН дизайна во всём задании — карточка варианта ответа в квизе:
`rounded-md border backdrop-blur-xl`. Все скругления приводим к `rounded-md`.

---

## Bug 1: Мобильные mid-leaderboard и final — взять дизайн с игрового поля (TV)

### Файл `src/app/game/[roomId]/quiz/page.tsx`
Сейчас карточки лидерборда (mid-leaderboard строка ~1212, final строка ~1266) используют
`rounded-2xl border backdrop-blur-2xl` со стилем ring. Нужно привести к стилю TV.

Заменить className карточки В ОБОИХ блоках (mid-leaderboard И final) на:
```tsx
className={`relative overflow-hidden flex items-center justify-between p-4 rounded-md border backdrop-blur-xl transition-all ${
  i === 0
    ? 'bg-yellow-500/20 border-yellow-400/40'
    : i === 1
      ? 'bg-white/8 border-white/15'
      : i === 2
        ? 'bg-amber-700/10 border-amber-700/20'
        : 'bg-white/5 border-white/10'
}`}
```
Внутреннее содержимое (ранг-эмодзи, имя, `<AnimatedScore>`) оставить как есть.

---

## Bug 2: Мобилка — счётчик ответивших наверх, только цифры, напротив счётчика вопроса

### Файл `src/app/game/[roomId]/quiz/page.tsx`, блок QUESTION

1. Верхняя строка со счётчиком вопроса (строки ~1061-1065):
```tsx
// Было:
<div className="mb-6 flex items-center justify-between">
  <span className="text-sm text-white/40">
    {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}/{gameState.totalQuestions}
  </span>
</div>
// Стало (добавить счётчик ответивших справа, только цифры):
<div className="mb-6 flex items-center justify-between">
  <span className="text-sm text-white/40">
    {locale === 'ru' ? 'Вопрос' : 'Question'} {gameState.questionIndex + 1}/{gameState.totalQuestions}
  </span>
  <span className="text-sm text-white/40 tabular-nums">{answeredCount}/{totalPlayers}</span>
</div>
```

2. Нижний статус-бар (строки ~1176-1184): убрать `<p>{answeredCount}/{totalPlayers}</p>` (строка ~1183), оставить только текст «Ответ принят / Выберите ответ»:
```tsx
// Было:
<div className="mt-5 flex items-center justify-between text-base">
  <p className="text-white/30">
    {myAnswer !== undefined ? ... : ...}
  </p>
  <p className="text-white/30">{answeredCount}/{totalPlayers}</p>
</div>
// Стало:
<div className="mt-5 text-base">
  <p className="text-white/30">
    {myAnswer !== undefined
      ? locale === 'ru' ? 'Ответ принят!' : 'Answer submitted!'
      : gameState.showCorrect ? '' : locale === 'ru' ? 'Выберите ответ' : 'Choose an answer'}
  </p>
</div>
```

---

## Bug 3: TV — убрать строки результата, красить рамки игроков в шапке

### Файл `src/app/tv/[roomId]/[gameType]/page.tsx`

#### 3a. Покрасить чипы игроков в шапке зелёным/красным при показе ответа
Блок центральных чипов в шапке (строки ~521-532). Сейчас каждый чип:
```tsx
<div key={entry.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15">
```
Заменить весь `.map` на версию с подсветкой (зелёный — угадал, красный — нет, когда `showCorrect`):
```tsx
{scoreboard.map((entry, i) => {
  const guessedRight = quizState.showCorrect && quizState.correctPlayers.includes(entry.id);
  const guessedWrong = quizState.showCorrect && !quizState.correctPlayers.includes(entry.id);
  const chipClass = guessedRight
    ? 'bg-green-500/15 border-green-400/50'
    : guessedWrong
      ? 'bg-red-500/15 border-red-400/50'
      : 'bg-white/10 border-white/15';
  return (
    <div key={entry.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-colors duration-300 ${chipClass}`}>
      <span className="text-xs text-white/50">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
      <span className="text-sm font-semibold text-white">{entry.name}</span>
      <span className="text-sm font-black text-purple-400">{entry.score}</span>
    </div>
  );
})}
```
(Заметь: `rounded-lg` → `rounded-md`.)

#### 3b. Удалить result message box
Блок `{/* Result message box */}` (строки ~678-696) — удалить ПОЛНОСТЬЮ. Информация теперь видна по цвету чипов в шапке.

---

## Bug 4: Привести все кнопки-скругления квиза к rounded-md

### Файл `src/app/game/[roomId]/quiz/page.tsx`
Setup-кнопки (выбор режима/сложности/темы/спец-квиза) используют `rounded-2xl`. Заменить на `rounded-md` в строках: ~707, ~723, ~775, ~831, ~888, ~935.

Это `className="w-full rounded-2xl border p-5 ..."` → `className="w-full rounded-md border p-5 ..."` (только токен скругления, остальное не трогать).

НЕ трогать: `rounded-full` у timer bar (это прогресс-бар), `rounded-lg`/`rounded-xl` у цифровых бейджей внутри вариантов (это под-элементы, не кнопки), компонент `GlassButton` (общий, вне scope).

---

## Bug 5: Иконка хоста у первого зашедшего игрока

### Файл `src/components/lobby/Lobby.tsx`, компонент `RoomMenu`

### Причина
Бейдж вешается по `player.isHost || player.id === roomState?.hostId`. Но `hostId` — это создатель комнаты с ролью TV (десктоп), который ОТФИЛЬТРОВАН из `connectedPlayers` (role !== 'tv'). Первый зашедший ТЕЛЕФОННЫЙ игрок становится `gameHostPlayerId` (ведущим) — именно ему нужен бейдж.

### Фикс
Строка ~2658:
```tsx
// Было:
const isHost = player.isHost || player.id === roomState?.hostId;
// Стало:
const isHost = player.id === roomState?.gameHostPlayerId;
```

---

## Acceptance criteria
- [ ] Мобильные mid-leaderboard и final выглядят как TV (rounded-md, backdrop-blur-xl)
- [ ] Мобилка: счётчик ответивших (цифры) наверху напротив счётчика вопроса; снизу его нет
- [ ] TV: строки «Правильно/Никто не угадал» убраны; чипы игроков в шапке зелёные (угадал) / красные (нет)
- [ ] Все setup-кнопки квиза скруглены rounded-md (как варианты ответа)
- [ ] Бейдж хоста показывается на первом зашедшем игроке (gameHostPlayerId)
- [ ] `npm run lint` и `npx tsc --noEmit` проходят

## Не трогать
- Другие игры
- Компонент GlassButton
- CLAUDE.md, AGENTS.md, .codex/STATUS.md

## Отчёт
`codex-reports/177-quiz-design-consistency.md`
