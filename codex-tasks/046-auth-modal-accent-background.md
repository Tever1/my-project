# TASK-046: Auth modal background — per-game accent colors

## Цель

Фон модального окна входа (`AuthDropdown`) должен выглядеть так же, как фон лобби — 
тёмный с радиальным градиентом в цветах активной игры, а не просто чёрный.

## Контекст

`AuthDropdown` (функция в `src/components/lobby/Lobby.tsx`, ~строка 1162) — 
это дропдаун/полноэкранный оверлей входа по телефону. На мобайле — `position: fixed, inset: 0`
с `background: 'rgba(0,0,0,0.6)'`. Нужно заменить этот фон на такой же
радиальный градиент, как у основного контейнера лобби (строка ~576):
```
background: `radial-gradient(1200px 800px at 70% 30%, ${accent}55, transparent 60%), 
             radial-gradient(1000px 700px at 20% 70%, ${deep}66, transparent 60%), #06060c`
```

Переменные `accent` и `deep` живут в `Lobby` (строки 558-559) и уже прокинуты
в `TopBar` через проп `accent`. Нужно прокинуть их дальше до `AuthDropdown`.

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

## Изменения

### 1. Добавить `deep` в пропы `TopBar`

Строка ~752 (тип) — добавить `deep: string;`  
Строка ~736 (деструктуризация) — добавить `deep,`

### 2. Прокинуть `deep` из `Lobby` в `TopBar`

Строка ~588 (вызов `<TopBar ...>`) — добавить `deep={deep}`

### 3. Добавить `accent` и `deep` в пропы `AuthDropdown`

Строка ~1165-1167 (тип пропов) — добавить:
```ts
accent: string;
deep: string;
```

Строка ~1162 (деструктуризация) — добавить `accent, deep,`

### 4. Прокинуть из `TopBar` в `AuthDropdown`

Строка ~826-829 (рендер `<AuthDropdown>`) — добавить `accent={accent} deep={deep}`

### 5. Обновить стили `AuthDropdown`

**`containerStyle` (mobile, строка ~1244-1254):**  
Заменить `background: 'rgba(0,0,0,0.6)'` на:
```ts
background: `radial-gradient(ellipse 120% 70% at 70% 30%, ${accent}44, transparent 60%), radial-gradient(ellipse 100% 80% at 20% 70%, ${deep}55, transparent 60%), rgba(6,6,12,0.92)`,
```

**`panelStyle` (строка ~1262-1272):**  
Заменить `border: '1px solid rgba(255,255,255,0.1)'` на:
```ts
border: `1px solid ${accent}33`,
```
Добавить (или усилить) `boxShadow`:
```ts
boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${accent}22`,
```

## Acceptance

- `npm run lint` и `npx tsc --noEmit` проходят без новых ошибок
- Фон оверлея входа на мобайле видимо окрашен в цвет активной игры (не просто чёрный)
- На десктопе панель получает тонкую accent-рамку

## Не трогать

- Логику входа (sendCode / verifyCode / step-машину) — только стили
- AccountDropdown — это другой компонент (другой таск)
- Ничего за пределами Lobby.tsx

## Отчёт

`codex-reports/046-auth-modal-accent-background.md`
