# REPORT TASK-144: quiz lobby config

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-05-25 20:20
> - **Финиш:** 2026-05-25 20:23
> - **Длительность:** 3 минуты
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Для игры «Квиз» кнопка в лобби теперь открывает оверлей настроек перед QR-экраном. Выбранный config сохраняется в `localStorage`, а quiz-страница хоста читает его, генерирует вопросы и сразу переходит в фазу `waiting`, пропуская setup.

---

## Что сделано

### Изменённые файлы

- `src/components/lobby/Lobby.tsx` — добавлены состояния quiz config, `QuizConfigOverlay`, смена текста кнопки на «Выбрать квиз», сохранение config и запуск прежнего `handleStartGame`.
- `src/app/game/[roomId]/quiz/page.tsx` — добавлено чтение `party-hub-quiz-config` для host, генерация general/special вопросов и синхронизация `quiz:config` с фазой `waiting`.

### Новые файлы

- `codex-reports/144-quiz-lobby-config.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

```
 src/app/game/[roomId]/quiz/page.tsx |  67 +++++
 src/components/lobby/Lobby.tsx      | 477 ++++++++++++++++++++++++++++++++++--
 2 files changed, 518 insertions(+), 26 deletions(-)
```

Примечание: stat по `Lobby.tsx` включает незакоммиченные изменения TASK-141, TASK-142 и TASK-143.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | ESLint прошёл без ошибок |
| `npx tsc --noEmit` | ✅ | TypeScript без ошибок |
| `npm run build` | ⚪ | Не запускался: в acceptance указан lint |
| Acceptance #1 | ✅ | Для quiz кнопка показывает «Выбрать квиз» |
| Acceptance #2 | ✅ | Клик открывает General/Special overlay |
| Acceptance #3 | ✅ | «НАЧАТЬ КВИЗ» сохраняет config и запускает QR waiting flow |
| Acceptance #4 | ✅ | Host quiz page читает config и ставит `phase: "waiting"` |

---

## Отклонения от ТЗ

Нет отклонений. В `quiz/page.tsx` pre-config применён через существующий `gameState`, потому что отдельных `setPhase`, `setDifficulty`, `setTopic` в текущей реализации нет.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано (если статус ⚠️ или ❌)

- (нет)

---

## Подсказки для ревью

- Проверь `QuizConfigOverlay` в `Lobby.tsx`: он намеренно inline и не выносится в новый файл из-за whitelist.
- Проверь pre-config effect в `quiz/page.tsx`: он удаляет `party-hub-quiz-config` после чтения и эмитит `quiz:config`, чтобы остальные клиенты получили фазу `waiting`.
