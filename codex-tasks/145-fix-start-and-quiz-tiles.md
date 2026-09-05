# TASK-145: Фикс кнопки «НАЧАТЬ ИГРУ» + плиточный выбор квиза

## Whitelist файлов
- `src/components/lobby/Lobby.tsx`

---

## Фикс 1 — «НАЧАТЬ ИГРУ» всегда видна на QR-экране

Найти строку:
```tsx
{gamePlayers.length > 0 && (
  <button
    type="button"
    onClick={handleEmitStartGame}
```

Убрать обёртку `gamePlayers.length > 0` — кнопка должна быть видна всегда на
QR waiting screen, не зависимо от количества игроков.
```tsx
<button
  type="button"
  onClick={handleEmitStartGame}
```

Блок «Ожидание игроков...» / «Подключились (N):» оставить как есть — он
показывает статус игроков выше кнопки.

---

## Фикс 2 — Плиточный выбор квиза вместо оверлея

### Состояние

Заменить `quizConfigOpen: boolean` на `quizSelectionOpen: boolean`.
Оставить `quizMode`, `quizDifficulty`, `quizTopic` — они нужны для
настройки общего квиза.
Добавить `quizGeneralConfigOpen: boolean` — флаг показа настройки
сложности/темы поверх тайл-экрана.

### Кнопка «Выбрать квиз»

Было: `onClick={() => setQuizConfigOpen(true)}`
Стало: `onClick={() => setQuizSelectionOpen(true)}`

### Когда `quizSelectionOpen === true`

Вместо `QuizConfigOverlay` показывать `QuizSelectionScreen` — компонент,
который заменяет ВЕСЬ основной контент лобби (position fixed, inset 0,
поверх фона, z-index 20).

Структура экрана:
```
← назад   [заголовок «Выбери квиз»]

[тайлы в сетке]

```

#### Тайлы

Три тайла в одну строку (или wrap на мобайле), каждый ~280×180px:

**Тайл 1 — Общие квизы**
- Фон: тёмный градиент `#1a1a2e → #16213e`
- Иконка или текст: «🎲»
- Название: «Общие квизы»
- Подпись: «Наука, история, поп-культура»
- Клик: `setQuizGeneralConfigOpen(true)`

**Тайл 2 — Гарри Поттер #1**
- Фон: картинка `/backgrounds/harry-potter.png` (objectFit cover)
- Название: «Гарри Поттер #1» поверх тёмного градиента снизу
- Клик: немедленно выбирает этот квиз и запускает игру:
  ```ts
  localStorage.setItem('party-hub-quiz-config', JSON.stringify({
    mode: 'special',
    difficulty: 'medium',
    topic: 'random',
    specialQuizId: 'harry-potter-1',
  }));
  setQuizSelectionOpen(false);
  handleStartGame();
  ```

**Тайл 3 — Marvel #1**
- Фон: картинка `/backgrounds/marvel.png` (objectFit cover)
- Название: «Marvel #1» поверх тёмного градиента снизу
- Клик: аналогично, `specialQuizId: 'marvel-1'`

#### Стиль тайлов

```ts
{
  width: 280, height: 180, borderRadius: 16,
  overflow: "hidden", cursor: "pointer", position: "relative",
  border: "1px solid rgba(255,255,255,0.12)",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  transition: "transform 150ms ease, box-shadow 150ms ease",
}
// При hover: scale(1.03), boxShadow усиливается
```

Название внизу тайла: position absolute, bottom 0, left 0, right 0,
background linear-gradient(transparent, rgba(0,0,0,0.85)),
padding "32px 16px 14px", color white, fontWeight 750, fontSize 16.

#### Настройка общего квиза

Когда `quizGeneralConfigOpen === true` — показывать старый `QuizConfigOverlay`
поверх экрана (z-index 30), но переименовать кнопку в нём:
- Было «НАЧАТЬ КВИЗ»
- Стало «ВЫБРАТЬ»

Логика «ВЫБРАТЬ» в общем квизе:
```ts
localStorage.setItem('party-hub-quiz-config', JSON.stringify({
  mode: quizMode,
  difficulty: quizDifficulty,
  topic: quizTopic,
  specialQuizId: null,
}));
setQuizGeneralConfigOpen(false);
setQuizSelectionOpen(false);
handleStartGame();
```

### Кнопка «← Назад» в QuizSelectionScreen

При клике: `setQuizSelectionOpen(false)` — возвращает лобби.

### Компонент QuizSelectionScreen

Добавить inline в Lobby.tsx (рядом с QuizConfigOverlay):

```tsx
function QuizSelectionScreen({
  accent, onBack, onSelectGeneral, onSelectSpecial
}: {
  accent: string;
  onBack: () => void;
  onSelectGeneral: () => void;
  onSelectSpecial: (specialQuizId: string, backgroundUrl: string) => void;
}) { ... }
```

`onSelectSpecial` принимает `specialQuizId` и `backgroundUrl` для универсальности.

---

## Acceptance
1. На QR waiting screen кнопка «НАЧАТЬ ИГРУ» видна сразу, без ожидания игроков
2. Клик «Выбрать квиз» → весь экран заменяется тайл-сеткой (3 плитки)
3. Клик «Общие квизы» → появляется оверлей настройки → «ВЫБРАТЬ» → QR screen
4. Клик на специальный квиз → сразу QR screen (без дополнительных шагов)
5. Кнопка «← Назад» возвращает к лобби
6. `npm run lint` без новых ошибок

## Не трогать
- `CLAUDE.md`, `AGENTS.md`, `codex-tasks/`, `.codex/`
- Файлы вне `src/components/lobby/Lobby.tsx`
- `quiz/page.tsx`, `server.mts`, socket-логику
