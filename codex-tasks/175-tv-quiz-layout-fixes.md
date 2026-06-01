# TASK-175: TV Quiz — layout (счёт в шапку, фикс центровки, единый дизайн итогов)

## Whitelist файлов
- `src/app/tv/[roomId]/[gameType]/page.tsx`

---

## Bug 3 (СНАЧАЛА — критично): setup/waiting/countdown уехали вверх

### Причина
В TASK-173 главный контейнер контента изменили на `justify-between` (строка ~537). Это сломало центровку фаз setup/waiting/countdown — они прижались к верху. Нужно вернуть `justify-center`, но при этом фаза `question` должна прижимать вопрос+ответы к низу.

### Фикс
1. Строка ~537: вернуть `justify-center`:
```tsx
// Было:
<div className="flex-1 flex flex-col justify-between px-8 py-4 min-h-0">
// Стало:
<div className="flex-1 flex flex-col justify-center px-8 py-4 min-h-0">
```

2. Блок QUESTION (строка ~605-606): обернуть так, чтобы он растягивался на всю высоту и прижимал контент вниз. Заменить:
```tsx
// Было:
{quizState.phase === 'question' && currentQuestion && (
  <div className="flex flex-col h-full justify-between">
```
на:
```tsx
{quizState.phase === 'question' && currentQuestion && (
  <div className="flex-1 w-full flex flex-col justify-end">
```
Поскольку у `question` блока `flex-1`, он заполнит всю высоту (justify-center на родителе на него не влияет — flex-1 поглощает свободное место). `justify-end` прижмёт контент к низу, фон будет виден сверху. Для setup/waiting/countdown (НЕ flex-1) родительский `justify-center` отцентрирует их как раньше.

---

## Bug 2: Убрать бар с именами игроков с поля, перенести в тёмную шапку

### Что убрать
1. **TOP scoreboard** внутри блока QUESTION (строки ~607-618) — блок:
```tsx
{/* TOP: Player scores */}
{scoreboard.length > 0 && (
  <div className="flex items-center justify-center gap-4 flex-wrap flex-shrink-0 pb-4">
    {scoreboard.map((entry, i) => ( ... ))}
  </div>
)}
```
УДАЛИТЬ полностью.

2. Также убрать `<div className="flex-1" />` спейсер (строка ~620), который был между TOP и BOTTOM — он больше не нужен (justify-end сам прижмёт).

3. **Bottom scoreboard bar** (строки ~777-790) — блок:
```tsx
{/* Bottom scoreboard bar */}
{(quizState.phase === 'question' || quizState.phase === 'countdown') && scoreboard.length > 0 && (
  <div className="flex items-center justify-center gap-6 px-8 py-3 ...">
    ...
  </div>
)}
```
УДАЛИТЬ полностью.

После удаления блок QUESTION должен выглядеть:
```tsx
{quizState.phase === 'question' && currentQuestion && (
  <div className="flex-1 w-full flex flex-col justify-end">
    {/* BOTTOM: Question + timer + options + result */}
    <div className="flex flex-col gap-3 flex-shrink-0">
      {/* Question */}
      ...
      {/* Timer bar */}
      ...
      {/* Options grid */}
      ...
      {/* Result message box */}
      ...
    </div>
  </div>
)}
```

### Куда перенести — в тёмную шапку (top bar)
В top bar (строка ~494) добавить центральный блок со счётом игроков МЕЖДУ левым блоком (иконка+название) и правым блоком (Ответили/вопрос/таймер).

Изменить открывающий div top bar (строка ~494) — добавить `gap-4`:
```tsx
<div className="flex items-center justify-between gap-4 px-8 py-4 bg-black/20 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
```

И добавить центральный scoreboard ПОСЛЕ левого `<div className="flex items-center gap-4">...</div>` (после строки ~520, перед блоком `quizState.phase === 'question'` справа):
```tsx
{/* Center: player scores in header */}
{scoreboard.length > 0 && (quizState.phase === 'question' || quizState.phase === 'countdown') && (
  <div className="flex items-center justify-center gap-2 flex-wrap min-w-0">
    {scoreboard.map((entry, i) => (
      <div key={entry.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/15">
        <span className="text-xs text-white/50">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
        <span className="text-sm font-semibold text-white">{entry.name}</span>
        <span className="text-sm font-black text-purple-400">{entry.score}</span>
      </div>
    ))}
  </div>
)}
```

Левый блок шапки (строка ~495) добавить `min-w-0` чтобы не распирал:
```tsx
<div className="flex items-center gap-4 min-w-0">
```

---

## Bug 1: Единый дизайн mid-leaderboard и final

mid-leaderboard карточки (строки ~716-737) уже в стиле `rounded-md border backdrop-blur-xl`. Нужно сделать final ТАКИМ ЖЕ.

### Фикс блока FINAL (строки ~743-774)
Заменить карточки в final на точно такой же markup как в mid-leaderboard. Текущий final использует `rounded-2xl border-2`. Заменить весь `.map` final на:
```tsx
{scoreboard.map((entry, i) => (
  <div
    key={entry.id}
    className={`relative overflow-hidden flex items-center justify-between py-4 px-8 rounded-md border backdrop-blur-xl transition-all ${
      i === 0
        ? 'bg-yellow-500/20 border-yellow-400/40 scale-105'
        : i === 1
          ? 'bg-white/8 border-white/15'
          : i === 2
            ? 'bg-amber-700/10 border-amber-700/20'
            : 'bg-white/5 border-white/10'
    }`}
  >
    <div className="flex items-center gap-4">
      <span className="text-3xl w-10 text-center flex-shrink-0">
        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
      </span>
      <span className="text-2xl font-bold">{entry.name}</span>
    </div>
    <span className="text-3xl font-black text-purple-400">{entry.score}</span>
  </div>
))}
```
(Заголовок 🏆 + "Итоги" в final оставить как есть, меняются только карточки.)

---

## Acceptance criteria
- [ ] setup/waiting/countdown снова по центру экрана (не вверху)
- [ ] question phase: вопрос+ответы прижаты к низу, фон виден сверху
- [ ] Имена+очки игроков убраны с игрового поля и из нижнего бара
- [ ] Имена+очки игроков показаны в тёмной шапке по центру (во время question/countdown)
- [ ] final и mid-leaderboard выглядят одинаково (rounded-md + backdrop-blur-xl)
- [ ] `npm run lint` и `npx tsc --noEmit` проходят

## Не трогать
- Логику игры, другие игры в этом файле (spy, mafia, crocodile, h2o, alias, who-am-i рендеры)
- CLAUDE.md, AGENTS.md, .codex/STATUS.md

## Отчёт
`codex-reports/175-tv-quiz-layout-fixes.md`
