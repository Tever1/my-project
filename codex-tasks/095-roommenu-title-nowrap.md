# TASK-095: Строка «Комната · КОД» в RoomMenu всегда в одну строку

## Проблема

Заголовок `Комната · {roomCode}` в RoomMenu (и мобильной, и десктопной версии)
переносится на вторую строку на узких экранах.

## Файл для правки

`src/components/lobby/Lobby.tsx` — только этот файл, ничего больше.

## Что нужно сделать

### 1. RoomMenu header (~line 2082)

Найди `<div style={{ flex: 1, minWidth: 0 }}>` — это обёртка заголовка.
Внутри неё найди вложенный `<div>` с `fontSize: 24`, `fontWeight: 700`,
`lineHeight: 1.1`, который рендерит `Комната · {roomCode}`.

Добавь к этому div-у:
```
whiteSpace: "nowrap",
overflow: "hidden",
textOverflow: "ellipsis",
```

И сделай fontSize адаптивным:
```
fontSize: isMobile ? 18 : 24,
```

### 2. RoomButton (~line 1083)

Найди кнопку `<button>` в компоненте `RoomButton` (там уже есть
`whiteSpace: "nowrap"` в style кнопки). Внутри неё есть `<span>` с
`display: "inline-flex"`, а внутри него — ещё `<span>{roomCode ? Комната · ${roomCode} : ...}</span>`.

Убедись что на внутреннем `<span>` с текстом тоже есть:
```
whiteSpace: "nowrap",
```

## Acceptance

- Строка «Комната · ABCD12» всегда в одну строку и в RoomMenu header,
  и в кнопке — и на мобильном, и на десктопе.
- Если текст всё равно не влезает (очень узкий экран) — ellipsis, не перенос.
- Никаких других изменений, кроме добавления whiteSpace/overflow/fontSize.

## Запрещено

- Не трогать CLAUDE.md, AGENTS.md, codex-tasks/**, codex-reports/**
- Не трогать другие файлы кроме `src/components/lobby/Lobby.tsx`

## Отчёт

Создай `codex-reports/095-roommenu-title-nowrap.md` со списком изменённых строк.
