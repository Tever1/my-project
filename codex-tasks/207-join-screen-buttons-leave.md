# TASK-207 — Экран комнаты на телефоне: НАЧАТЬ ИГРУ по выбору игры, Добавить игрока для всех, кнопка ВЫЙТИ

## Контекст

Экран комнаты на телефоне — `src/app/join/[code]/page.tsx`, ветка после
`joined` (строки ~286-489). Сейчас «НАЧАТЬ ИГРУ» и «+ Добавить игрока» оба
внутри блока `canStartGame ? (...) : "Ожидание ведущего..."` (строки ~441-486),
без проверки выбранной игры. Кнопки «Выйти» нет.

## Требования (от пользователя)

1. **«НАЧАТЬ ИГРУ» показывать только когда игра выбрана** на игровом поле
   (`roomState.currentGame` не null). До выбора игры — кнопки старта нет.
2. **«+ Добавить игрока» — всегда, для ВСЕХ зашедших игроков** (не только хост,
   не зависит от выбора игры).
3. **Добавить кнопку «ВЫЙТИ» с подтверждением** — для любого игрока, чтобы выйти
   из комнаты.

## Что сделать

Файл: `src/app/join/[code]/page.tsx`. Менять ТОЛЬКО его.

### 1. Импорт роутера и новое состояние

- В импорте `next/navigation` (строка 3) добавить `useRouter`:
  ```ts
  import { useParams, useRouter } from "next/navigation";
  ```
- В компоненте рядом с другими `useState` (около строки 48) добавить:
  ```ts
  const [confirmLeave, setConfirmLeave] = useState(false);
  ```
- Получить роутер рядом с `const { user } = useAuth();`:
  ```ts
  const router = useRouter();
  ```

### 2. Хендлер выхода

Рядом с `handleAddPlayer` (около строки 161) добавить:
```ts
const handleLeaveRoom = useCallback(() => {
  emit("room:leave", {});
  setConfirmLeave(false);
  router.push("/");
}, [emit, router]);
```

### 3. Перестроить блок кнопок (заменить текущий `{canStartGame ? (...) : (...)}`, строки ~441-486)

Логика:
- **НАЧАТЬ ИГРУ** — рендерить только если `canStartGame && roomState?.currentGame`.
  Стиль кнопки оставить как у текущей «НАЧАТЬ ИГРУ» (белая, primary).
- Если `canStartGame && !roomState?.currentGame` — вместо кнопки показать подсказку
  (приглушённый текст): `Выберите игру на большом экране…`.
- Если `!canStartGame` — показать прежний текст `Ожидание ведущего...`.
- **+ Добавить игрока** — рендерить ВСЕГДА (для всех игроков), вне зависимости от
  `canStartGame` и `currentGame`. Стиль — как текущая «+ Добавить игрока»
  (прозрачная с рамкой).
- **ВЫЙТИ** — рендерить ВСЕГДА (для всех игроков). Стиль — ghost/destructive
  (прозрачный фон, текст `#f87171` или приглушённый красный, рамка как у
  «Добавить игрока» либо без рамки). По клику — `setConfirmLeave(true)`.

Примерная структура (адаптируй стили под уже существующие в файле, не выдумывай
новый визуальный язык):
```tsx
<div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>
  {canStartGame && roomState?.currentGame && (
    <button type="button" onClick={handleStartGame} style={/* как сейчас НАЧАТЬ ИГРУ */}>
      НАЧАТЬ ИГРУ
    </button>
  )}
  {canStartGame && !roomState?.currentGame && (
    <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 15, textAlign: "center", margin: 0 }}>
      Выберите игру на большом экране…
    </p>
  )}
  {!canStartGame && (
    <p style={{ color: "rgba(255,255,255,0.42)", fontSize: 16, textAlign: "center", margin: 0 }}>
      Ожидание ведущего...
    </p>
  )}

  <button type="button" onClick={handleAddPlayer} style={/* как сейчас + Добавить игрока */}>
    + Добавить игрока
  </button>

  <button type="button" onClick={() => setConfirmLeave(true)} style={/* ghost destructive */}>
    Выйти
  </button>
</div>
```

### 4. Модалка подтверждения выхода

Добавить overlay подтверждения (рендерить когда `confirmLeave`). Простой
fixed-overlay в стиле файла (полупрозрачный backdrop + центр-карточка glass):
- Текст: `Выйти из комнаты?`
- Две кнопки: **«Выйти»** (destructive, `handleLeaveRoom`) и **«Отмена»**
  (`setConfirmLeave(false)`).
- Закрытие по клику на backdrop = `setConfirmLeave(false)`.

Разместить в конце JSX (можно сразу перед закрывающим `</main>` или рядом).
Стили — в духе `data-player-action-menu` / карточки комнаты (rgba(10,10,16,..),
border rgba(255,255,255,0.12), borderRadius ~16).

## Чего НЕ трогать

- Серверный код, `Lobby.tsx`, `/tv`, игровые страницы.
- Логику join/reconnect, `canStartGame`, `isPhoneHost`, меню управления игроком
  (Передать хост / Удалить игрока) — оставить как есть.
- `handleStartGame`, `handleAddPlayer` — не менять (только использовать).

## Whitelist файлов (трогать ТОЛЬКО этот)

- `src/app/join/[code]/page.tsx`

**ЗАПРЕЩЕНО:** `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
прочие файлы вне whitelist.

## Acceptance

- `npx tsc --noEmit` — 0 ошибок.
- `npm run lint` — без новых ошибок.
- Логика:
  - Хост без выбранной игры → нет «НАЧАТЬ ИГРУ», есть подсказка + «Добавить игрока» + «Выйти».
  - Хост, игра выбрана на экране → появляется «НАЧАТЬ ИГРУ».
  - Не-хост → «Ожидание ведущего...» + «Добавить игрока» + «Выйти».
  - «Выйти» → модалка подтверждения → «Выйти» эмитит `room:leave` и уводит на `/`;
    «Отмена»/клик по фону закрывает модалку.

## Отчёт

`codex-reports/207-join-screen-buttons-leave.md`. Не коммить.
