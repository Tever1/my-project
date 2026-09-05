# TASK-328: «Кто я?» — убрать дублирующую кнопку «Завершить игру» внизу

## Контекст

Живое QA: у хоста на экране `playing` есть кнопка «Завершить» в шапке
(из `GameLayout`, проп `onEnd={isGameHost ? handleEndGame : undefined}`,
строка ~693) — это стандартный паттерн, используемый во всех остальных
играх проекта. Но в `renderPlaying()` есть ЕЩЁ одна кнопка «Завершить
игру» внизу экрана (строки ~586-591), которая дублирует ту же функцию
`handleEndGame`. Убрать дубликат снизу, оставить только кнопку в шапке.

## Файл

`src/app/game/[roomId]/who-am-i/page.tsx`, функция `renderPlaying`,
конец функции:

```tsx
        {/* Host controls */}
        {isGameHost && (
          <GlassButton variant="danger" size="sm" onClick={handleEndGame}>
            {l('Завершить игру', 'End Game')}
          </GlassButton>
        )}
      </div>
    );
  };
```

## Что сделать

Удалить блок `{/* Host controls */}` целиком (условный рендер кнопки
«Завершить игру» снизу). Кнопка «Завершить» в шапке (`GameLayout`
`onEnd` проп) уже покрывает эту функциональность — не трогать.

## Whitelist файлов

- `src/app/game/[roomId]/who-am-i/page.tsx`

## Acceptance

- `npm run lint` и `tsc --noEmit` без новых ошибок.
- В фазе `playing` у хоста больше нет кнопки «Завершить игру» внизу
  экрана.
- Кнопка «Завершить» в шапке (через `GameLayout onEnd`) продолжает
  работать как раньше — не трогать проп `onEnd`.

Не коммить. Отчёт в `codex-reports/328-whoami-remove-duplicate-end-button.md`.
