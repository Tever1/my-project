# TASK-095: RoomMenu title nowrap

## Статус

Готово к ревью.

## Изменённые строки

- `src/components/lobby/Lobby.tsx`: внутренний текстовый `span` в `RoomButton` получил `whiteSpace: "nowrap"`.
- `src/components/lobby/Lobby.tsx`: заголовок `Комната · {roomCode}` в `RoomMenu` получил адаптивный `fontSize: isMobile ? 18 : 24`.
- `src/components/lobby/Lobby.tsx`: заголовок `Комната · {roomCode}` в `RoomMenu` получил `whiteSpace: "nowrap"`, `overflow: "hidden"`, `textOverflow: "ellipsis"`.

## Проверки

- `npm run lint` — passed.
- `npm run build` — failed before app verification: Turbopack internal error while creating a process / binding to a port (`Operation not permitted`, sandbox limitation).

## Отклонения

- Отчёт создан в `codex-reports/095-roommenu-title-nowrap.md` по явному требованию задачи, несмотря на конфликтующую строку в разделе "Запрещено".
