# TASK-019: Уменьшить CTA row на 15%

> **Сложность:** trivial
> **Запуск:** auto by Claude

## Цель

Уменьшить размер кнопок hero CTA row (Начать партию / Правила / Код
комнаты input wrapper / Join icon button) ~на 15% (только desktop, на
mobile не трогать).

## Файлы

- `src/app/lobby-preview/page.tsx`

## Замены (только desktop, ветка `!isMobile` или `isMobile ? ... : <desktop>`)

| Элемент | Было | Стало |
|---|---|---|
| height | 60 | 51 |
| Начать партию padding `0 32px` | | `0 27px` |
| Начать партию fontSize 17 | | 15 |
| Правила padding `0 26px` | | `0 22px` |
| Правила fontSize 16 | | 14 |
| Join-code wrapper padding `0 18px` | | `0 15px` |
| Join-code label fontSize 10 | | 9 |
| Join-code input fontSize 17 | | 15 |
| Join-code input width 130 | | 110 |
| Join-submit width 60 | | 51 |
| Join-submit height 60 | | 51 |
| Join-submit SVG 22 | | 19 |

Mobile значения не трогать.

## Acceptance

- [ ] `npm run build` ОК.
- [ ] Все 4 элемента визуально пропорционально меньше на ~15%.

## Контрольные точки

1. Diff минимальный.
2. `npm run build`.
3. Не коммитить.
