# TASK-379: Расширить таблицу распределения ролей Мафии на /admin

## Контекст

На вкладке Games → Мафия в `/admin` сейчас показывается упрощённая таблица
распределения ролей (только Мафия/Детектив/Доктор/Мирные, диапазон 4–10
игроков). Пользователь принёс новую расширенную сводную таблицу (бытовой/
классический вариант Мафии с доп-ролями Дон, Маньяк, Любовница), которая
должна её заменить. Диапазон 4–16 игроков.

**Важно:** это ТОЛЬКО информационная/справочная таблица в админке. Реальная
игровая логика Мафии (`src/app/game/[roomId]/mafia/page.tsx`,
`assignRoles()`) сейчас поддерживает только 4 роли (mafia/detective/doctor/
citizen) и в этом таске НЕ меняется — новые роли (Дон/Маньяк/Любовница) в
геймплей не добавляются, только отображаются как справка в админке. Не
трогай игровую логику, socket-события, `assignRoles`, `MafiaRole` тип и т.п.

## Whitelist файлов

- `src/app/api/admin/game-data/route.ts`
- `src/app/admin/page.tsx`

Больше ничего не трогать.

## Что сделать

### 1. `src/app/api/admin/game-data/route.ts`

В кейсе `case 'mafia':` заменить массивы `roles` и `roleTable`.

Новый `roles` (добавить 3 новые роли к существующим 4, порядок как в
таблице пользователя — сначала чёрная команда, потом нейтрал, потом
мирные спецроли):

```ts
roles: [
  { id: 'citizen',   icon: '👤', nameRu: 'Мирный',      nameEn: 'Citizen',    team: 'citizens', condition: 'всегда' },
  { id: 'mafia',     icon: '🔫', nameRu: 'Мафия',       nameEn: 'Mafia',      team: 'mafia',    condition: '≈1/3 от общего числа игроков' },
  { id: 'don',       icon: '🎩', nameRu: 'Дон',         nameEn: 'Don',        team: 'mafia',    condition: 'при 10+ игроках' },
  { id: 'maniac',    icon: '🔪', nameRu: 'Маньяк',      nameEn: 'Maniac',     team: 'neutral',  condition: 'при 10+ игроках, играет сам за себя' },
  { id: 'detective', icon: '🔍', nameRu: 'Шериф',       nameEn: 'Sheriff',    team: 'citizens', condition: 'при 4+ игроках' },
  { id: 'doctor',    icon: '💉', nameRu: 'Доктор',      nameEn: 'Doctor',     team: 'citizens', condition: 'при 7+ игроках' },
  { id: 'lover',     icon: '💋', nameRu: 'Любовница',   nameEn: 'Lover',      team: 'citizens', condition: 'при 12+ игроках' },
],
```

Новый `roleTable` — заменить полностью, диапазон 4–16, новые поля `don`,
`maniac`, `lover` (числа, 0 если роли нет в этом ряду), `sheriff` вместо
`detective` (тоже число, а не boolean — на всех рядах равно 1), `doctor`
тоже число вместо boolean:

```ts
roleTable: [
  { players: 4,  mafia: 1, don: 0, maniac: 0, sheriff: 1, doctor: 0, lover: 0, citizens: 2 },
  { players: 5,  mafia: 1, don: 0, maniac: 0, sheriff: 1, doctor: 0, lover: 0, citizens: 3 },
  { players: 6,  mafia: 2, don: 0, maniac: 0, sheriff: 1, doctor: 0, lover: 0, citizens: 3 },
  { players: 7,  mafia: 2, don: 0, maniac: 0, sheriff: 1, doctor: 1, lover: 0, citizens: 3 },
  { players: 8,  mafia: 2, don: 0, maniac: 0, sheriff: 1, doctor: 1, lover: 0, citizens: 4 },
  { players: 9,  mafia: 2, don: 0, maniac: 0, sheriff: 1, doctor: 1, lover: 0, citizens: 5 },
  { players: 10, mafia: 2, don: 1, maniac: 1, sheriff: 1, doctor: 1, lover: 0, citizens: 4 },
  { players: 11, mafia: 2, don: 1, maniac: 1, sheriff: 1, doctor: 1, lover: 0, citizens: 5 },
  { players: 12, mafia: 3, don: 1, maniac: 1, sheriff: 1, doctor: 1, lover: 1, citizens: 4 },
  { players: 13, mafia: 3, don: 1, maniac: 1, sheriff: 1, doctor: 1, lover: 1, citizens: 5 },
  { players: 14, mafia: 3, don: 1, maniac: 1, sheriff: 1, doctor: 1, lover: 1, citizens: 6 },
  { players: 15, mafia: 4, don: 1, maniac: 1, sheriff: 1, doctor: 1, lover: 1, citizens: 6 },
  { players: 16, mafia: 4, don: 1, maniac: 1, sheriff: 1, doctor: 1, lover: 1, citizens: 7 },
],
```

### 2. `src/app/admin/page.tsx`

Обновить тип `GameDataResponse['roleTable']` (около строки 1328):

```ts
roleTable?: { players: number; mafia: number; don: number; maniac: number; sheriff: number; doctor: number; lover: number; citizens: number }[];
```

Обновить `roles` тип (строка выше `roleTable` в том же интерфейсе) — добавить
`'neutral'` как допустимое значение `team`, если сейчас тип `team` жёстко
типизирован как `'mafia' | 'citizens'` (проверь по факту в файле).

В блоке "Role distribution table" (JSX вокруг таблицы `<table>` с
заголовками Игроков/Мафия/Детектив/Доктор/Мирных, поиск по
`Распределение ролей`) — расширить заголовки и ячейки под новые колонки:
`Игроков | Мафия | Дон | Маньяк | Шериф | Доктор | Любовница | Мирных`.
Для Дон/Маньяк/Доктор/Любовница ячейки показывают число (или `—` если 0,
как сейчас делает boolean-рендер) — сохрани текущий визуальный стиль
(цветные заголовки, `✓`/`—` можно оставить как есть для boolean-подобных
колонок, только меняй под новые поля, не переизобретай стили).

## Acceptance

- `npx tsc --noEmit` чистый.
- `npm run lint` чистый (без новых warnings/errors в затронутых файлах).
- На `/admin` → Games → Мафия таблица показывает 13 строк (4–16 игроков) и
  7 колонок ролей + Мирные, значения точно совпадают с таблицей выше.
- Верхний grid карточек ролей показывает 7 карточек (Мирный/Мафия/Дон/
  Маньяк/Шериф/Доктор/Любовница).
- Никакие файлы вне whitelist не тронуты (`git status --short` после
  выполнения — только 2 файла из whitelist).
- Игровая логика Мафии (`mafia/page.tsx`, типы, socket-события) не
  затронута.

Отчёт в `codex-reports/379-admin-mafia-role-table-expand.md`. Не коммить.
