# TASK-097: RoomMenu — три правки после TASK-096

## Файл для правки

`src/components/lobby/Lobby.tsx` — только этот файл.

---

## Правка 1: Overlay меню игрока — поднять на уровень GlassPanel

### Проблема

`<AnimatePresence>` с overlay сейчас находится ВНУТРИ контейнера игроков
(div с `flexWrap: "wrap", minHeight: 70`). Из-за этого overlay покрывает
только ~70px зоны чипов, а кнопки вылезают за границы.

### Что сделать

**Шаг A:** Добавить `position: "relative"` к GlassPanel через style:
Найди `<GlassPanel ... style={{ width:"100%", maxWidth:460, minHeight:480, ... }}>`.
Добавь в его `style`:
```
position: "relative",
overflow: "hidden",
```

**Шаг B:** Перенести `<AnimatePresence>` из chips-контейнера в GlassPanel.
Найди в chips-контейнере (div с `flexWrap:"wrap", minHeight:70, position:"relative"`)
весь блок:
```jsx
<AnimatePresence>
  {selectedPlayerId && (() => { ... })()}
</AnimatePresence>
```
— удалить его из chips-контейнера.

Вместо этого поместить его как ПОСЛЕДНИЙ дочерний элемент внутри `<GlassPanel>`,
перед закрывающим `</GlassPanel>`.

**Шаг C:** У chips-контейнера (div с `flexWrap:"wrap", minHeight:70`) убрать
`position: "relative"` — он теперь не нужен там.

**Шаг D:** В самом overlay (`<motion.div key="player-action-menu">`) стиль
уже правильный: `position:"absolute", top:0, left:0, right:0, bottom:0`.
Оставить как есть. Благодаря `position:relative` + `overflow:hidden` на GlassPanel
overlay теперь покроет всю панель и обрежется по её border-radius.

---

## Правка 2: Overlay закрывается по клику на тёмный фон

Найди `<motion.div key="player-action-menu" ... style={{ position:"absolute", ... }}>`.
Это — тёмный фон overlay. Добавить к нему:
```jsx
onClick={() => setSelectedPlayerId(null)}
```

Внутри overlay есть `<div>` с именем игрока и двумя кнопками (`RoomMenuActionButton`).
Обернуть этот контент в `<div onClick={(e) => e.stopPropagation()}>...</div>` —
чтобы клик по кнопкам не закрывал overlay.

Итог: клик по тёмной области — закрывает overlay. Клик по кнопкам — выполняет действие.

---

## Правка 3: Убрать «Выйти?» в confirm-state

Найди блок ternary `!confirmLeave ? ... : (...)`.
Внутри `else`-ветки найди:
```jsx
<span style={{ fontSize:12, color:"#fca5a5", fontWeight:600, whiteSpace:"nowrap" }}>
  Выйти?
</span>
```
Удалить этот `<span>` целиком. Оставить только кнопки «Да» и «Отмена».

---

## Acceptance

1. При клике на имя игрока — overlay покрывает ВСЮ панель RoomMenu (не только чипы).
2. Клик по тёмному фону overlay — закрывает меню.
3. Клик по «Удалить» или «Передать хоста» — выполняет действие и закрывает меню.
4. В confirm-state кнопки «Выйти» — видны только «Да» и «Отмена», без «Выйти?».

## Запрещено

- Не трогать CLAUDE.md, AGENTS.md, codex-tasks/**, codex-reports/**
- Не трогать другие файлы кроме `src/components/lobby/Lobby.tsx`

## Отчёт

Создай `codex-reports/097-roommenu-overlay-fix.md` с перечнем изменённых строк.
