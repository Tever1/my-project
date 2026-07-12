# TASK-327: «Кто я?» — убрать верхнюю карточку «Сейчас ходит» на мобильном

## Контекст

Живое QA (4 виртуальных телефона): продакт попросил убрать верхнюю
карточку «Сейчас ходит: {имя}» / «Ваш ход!» на мобильном экране игры.
Она избыточна — список «Персонажи игроков» ниже уже подсвечивает
текущего ходящего (фиолетовая рамка + указатель 👉 рядом с именем,
`isCurrent` в `renderPlayerCharacters`).

## Файл

`src/app/game/[roomId]/who-am-i/page.tsx`, функция `renderPlaying`
(около строк 428-461).

Текущий код:

```tsx
return (
  <div className="flex-1 flex flex-col items-center gap-4">
    {/* Current turn indicator */}
    <GlassCard className="w-full max-w-md text-center">
      <p className="text-white/50 text-sm mb-1">
        {l('Сейчас ходит', 'Current turn')}
      </p>
      <p className="text-2xl font-bold text-white">
        {currentPlayerId
          ? currentPlayerId === effectivePlayerId
            ? l('Ваш ход!', 'Your turn!')
            : playerName(currentPlayerId)
          : l('Игра завершена', 'Game over')}
      </p>
      {isMyTurn && !haveIGuessed && (
        <p className="text-white/40 text-xs mt-1">
          {l(
            'Задайте вопрос вслух с ответом "Да" или "Нет"',
            'Ask a Yes/No question out loud',
          )}
        </p>
      )}
    </GlassCard>

    {/* Player characters grid */}
    {renderPlayerCharacters()}
```

## Что сделать

1. Удалить весь `<GlassCard>` блок «Current turn indicator» (заголовок
   «Сейчас ходит», имя/«Ваш ход!»).
2. **Сохранить подсказку** «Задайте вопрос вслух с ответом "Да" или
   "Нет"» / «Ask a Yes/No question out loud» — она полезна активному
   игроку. Перенести её так, чтобы она показывалась ТОЛЬКО когда
   `isMyTurn && !haveIGuessed` (условие то же самое, что было),
   отдельным небольшим текстовым блоком ПЕРЕД `{renderPlayerCharacters()}`
   (просто `<p>` без обёртки в GlassCard, по центру, приглушённый цвет
   текста `text-white/50 text-sm text-center`).
3. Больше ничего не менять — `renderPlayerCharacters()`, управление
   (кнопки «Да»/«Нет»/«Я знаю!») и остальная структура фазы `playing`
   остаются как есть.

## Whitelist файлов

- `src/app/game/[roomId]/who-am-i/page.tsx`

## Acceptance

- `npm run lint` и `tsc --noEmit` без новых ошибок.
- Верхняя карточка «Сейчас ходит»/«Ваш ход!» больше не рендерится.
- Подсказка про вопрос вслух по-прежнему видна активному игроку, ещё
  не угадавшему, просто без карточки-обёртки и без дублирования имени.
- Список «Персонажи игроков» и его подсветка текущего хода (👉,
  фиолетовая рамка) не тронуты.

Не коммить. Отчёт в `codex-reports/327-whoami-remove-top-turn-card.md`.
