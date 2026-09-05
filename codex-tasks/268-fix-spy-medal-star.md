# TASK-268 — Шпион превью: перерисовать звезду в медали

## Цель

В превью-иконке медали Шпиона (`SpMedal` на `/design-tokens`) звезда нарисована
криво. Заменить её path на правильную 5-конечную звезду (рассчитана по
координатам: центр 12,15, внешний R≈3.2, внутренний r≈1.4).

## Whitelist файлов

- `src/app/design-tokens/page.tsx` — только path звезды внутри `SpMedal`
- `codex-reports/268-fix-spy-medal-star.md` — **отчёт (писать СЮДА разрешено)**

**НЕ трогать:** ничего больше.

## Изменение

В функции `SpMedal` заменить строку звезды:

```tsx
    <path d="M12 11.6l1.1 2.3 2.5.2-1.9 1.7.6 2.4L12 18.6l-2.3 1.3.6-2.4-1.9-1.7 2.5-.2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
```

на:

```tsx
    <path d="M12 11.8L12.82 13.87L15.04 14.01L13.33 15.43L13.88 17.59L12 16.4L10.12 17.59L10.67 15.43L8.96 14.01L11.18 13.87Z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
```

(Лента и диск медали — без изменений.)

## Acceptance

- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Звезда в медали Шпиона на `/design-tokens` ровная, симметричная.
- НЕ коммитить. Отчёт → `codex-reports/268-fix-spy-medal-star.md`.
