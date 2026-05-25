# TASK-130: Quiz answer — left accent strip full height

## Цель

Левая цветная полоска на кнопке ответа должна идти от верхнего до нижнего края рамки кнопки (без отступов сверху/снизу).

## Файлы к изменению (whitelist)

- `src/app/game/[roomId]/quiz/page.tsx` — одна замена

## Шаги

Найти строку (~1074):
```
className="absolute left-0 top-3 bottom-3 w-1 rounded-full transition-colors duration-200"
```

Заменить на:
```
className="absolute left-0 inset-y-0 w-1 transition-colors duration-200"
```

Убраны `top-3 bottom-3` (заменены на `inset-y-0`) и `rounded-full`.

## Acceptance criteria

- [ ] `npm run lint` без ошибок
- [ ] Полоска не имеет `top-3`, `bottom-3`, `rounded-full`
- [ ] Полоска имеет `inset-y-0`
- [ ] Не коммитить, отчёт в `codex-reports/130-quiz-answer-strip-full-height.md`
