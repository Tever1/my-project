# TASK-178: Quiz мобилка — убрать статус-текст, убрать scoreboard-бар, унифицировать спец-кнопку

## Whitelist файлов
- `src/app/game/[roomId]/quiz/page.tsx`

---

## Bug 1: Убрать надпись «Ответ принят» / «Выберите ответ» под ответами

Блок Status bar (строки ~1177-1184):
```tsx
{/* Status bar */}
<div className="mt-5 text-base">
  <p className="text-white/30">
    {myAnswer !== undefined
      ? locale === 'ru' ? 'Ответ принят!' : 'Answer submitted!'
      : gameState.showCorrect ? '' : locale === 'ru' ? 'Выберите ответ' : 'Choose an answer'}
  </p>
</div>
```
УДАЛИТЬ полностью.

(Кнопка «Следующий вопрос» для хоста ниже — НЕ трогать, оставить.)

---

## Bug 2: Убрать scoreboard-бар (В ИГРЕ + игроки со счётом) из мобильной версии

В мобильном квизе используется `<GameLayout>` с `showScoreboard`. Этот бар (количество «В ИГРЕ» + чипы игроков с очками) нужен только на игровом поле (TV), на мобилке его убрать.

Строка ~680:
```tsx
// Было:
showScoreboard={!isSetup && gameState.phase !== 'waiting' && gameState.phase !== 'countdown'}
// Стало:
showScoreboard={false}
```
(Проп `scores={scoreboard}` можно оставить — при `showScoreboard={false}` он не рендерится.)

---

## Bug 3: Кнопка выбора спец-квиза одного размера с обычными setup-кнопками

На экране `setup-special-quiz` кнопка выбора квиза (строка ~888) использует `border-2` и насыщенный градиент, из-за чего выглядит крупнее/ярче обычных setup-кнопок (режим/сложность/тема). Привести к единому стилю обычной amber-кнопки.

Строка ~888:
```tsx
// Было:
className="w-full rounded-md border-2 p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-gradient-to-br from-amber-700/70 to-amber-600/50 border-amber-400/80"
// Стало:
className="w-full rounded-md border p-5 text-left transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-gradient-to-br from-amber-600/20 to-amber-500/5 border-amber-500/30"
```
(Внутреннее содержимое кнопки — `#{q.number}` + название темы — НЕ трогать.)

---

## Acceptance criteria
- [ ] Под вариантами ответов в мобилке нет надписи «Ответ принят»/«Выберите ответ»
- [ ] В мобилке нет верхнего бара со счётом игроков (В ИГРЕ + чипы) — он только на TV
- [ ] Кнопка выбора спец-квиза визуально такого же размера/стиля как обычные setup-кнопки
- [ ] `npm run lint` и `npx tsc --noEmit` проходят

## Не трогать
- Другие игры, GameLayout сам компонент (только проп showScoreboard в quiz)
- Кнопку «Следующий вопрос», TV-страницу
- CLAUDE.md, AGENTS.md, .codex/STATUS.md

## Отчёт
`codex-reports/178-quiz-mobile-cleanup.md`
