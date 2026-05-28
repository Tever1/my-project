# TASK-144: Выбор квиза в лобби до QR-экрана

## Цель
Когда выбрана игра "Квиз" и хост нажимает "Начать партию" — вместо сразу показа
QR-экрана, сначала открывается оверлей выбора квиза (режим, сложность, тема).
После выбора → QR-экран. Квизовая страница читает pre-config из localStorage и
пропускает встроенный setup-флоу.

## Whitelist файлов
- `src/components/lobby/Lobby.tsx`
- `src/app/game/[roomId]/quiz/page.tsx`

---

## Изменение 1 — Lobby.tsx

### 1a. Переименовать кнопку для квиза

В компоненте `HeroSection` (строка ~1819), найти кнопку "Начать партию":
```tsx
{isCurrentUserHost ? "Начать партию" : "Ожидание хоста"}
```
Заменить на:
```tsx
{isCurrentUserHost
  ? (activeGame === 'quiz' ? "Выбрать квиз" : "Начать партию")
  : "Ожидание хоста"}
```

### 1b. Изменить обработчик кнопки для квиза

Кнопка "Начать партию" вызывает `onStartGame`. Для квиза нужно сначала показать
оверлей, не вызывать `onStartGame` сразу.

В HeroSection добавить prop `onOpenQuizConfig: () => void` и изменить `onClick` кнопки:
```tsx
onClick={() => {
  if (activeGame === 'quiz') {
    onOpenQuizConfig();
  } else {
    onStartGame();
  }
}}
```

### 1c. Добавить состояние оверлея квиза в Lobby

В компоненте `Lobby` добавить состояния:
```ts
const [quizConfigOpen, setQuizConfigOpen] = useState(false);
const [quizMode, setQuizMode] = useState<'general' | 'special'>('general');
const [quizDifficulty, setQuizDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
const [quizTopic, setQuizTopic] = useState<'random' | 'science' | 'history' | 'pop-culture'>('random');
const [quizSpecialId, setQuizSpecialId] = useState<string>('harry-potter-1');
```

Callback для подтверждения:
```ts
const handleQuizConfigConfirm = useCallback(() => {
  const config = {
    mode: quizMode,
    difficulty: quizDifficulty,
    topic: quizTopic,
    specialQuizId: quizMode === 'special' ? quizSpecialId : null,
  };
  localStorage.setItem('party-hub-quiz-config', JSON.stringify(config));
  setQuizConfigOpen(false);
  handleStartGame(); // теперь вызываем handleStartGame
}, [handleStartGame, quizDifficulty, quizMode, quizSpecialId, quizTopic]);
```

Передать в HeroSection: `onOpenQuizConfig={() => setQuizConfigOpen(true)}`.

### 1d. Рендер оверлея QuizConfigOverlay

Добавить в рендер Lobby (после основного JSX, перед `<GlassToaster>`):
```tsx
{quizConfigOpen && (
  <QuizConfigOverlay
    accent={gameColors['quiz'].accent}
    mode={quizMode}
    difficulty={quizDifficulty}
    topic={quizTopic}
    specialId={quizSpecialId}
    onModeChange={setQuizMode}
    onDifficultyChange={setQuizDifficulty}
    onTopicChange={setQuizTopic}
    onSpecialIdChange={setQuizSpecialId}
    onConfirm={handleQuizConfigConfirm}
    onClose={() => setQuizConfigOpen(false)}
  />
)}
```

### 1e. Компонент QuizConfigOverlay

Добавить inline в Lobby.tsx (после функции RoomMenu, перед конечным экспортом):

```tsx
function QuizConfigOverlay({
  accent, mode, difficulty, topic, specialId,
  onModeChange, onDifficultyChange, onTopicChange, onSpecialIdChange,
  onConfirm, onClose,
}: { /* props */ }) {
  // Полноэкранный оверлей с backdrop blur
  // Структура:
  // 1. Backdrop (position fixed, inset 0, background rgba(0,0,0,0.7), onClick=onClose)
  // 2. Карточка (position fixed, centered, maxWidth 480px, glass style)
  //    - Заголовок "Настройки квиза"
  //    - Блок режима: 2 кнопки-таба "Общий" / "Специальный"
  //    - Если mode === 'general':
  //        Блок сложности: 3 кнопки Easy/Medium/Hard (на русском: Лёгкий/Средний/Сложный)
  //        Блок темы: 4 кнопки (Случайные/Наука/История/Поп-культура)
  //    - Если mode === 'special':
  //        2 кнопки: "Гарри Поттер #1" / "Marvel #1"
  //    - Кнопка "НАЧАТЬ КВИЗ" (белая, широкая)
}
```

Стиль карточки:
```
background: "rgba(20,20,32,0.95)"
border: "1px solid rgba(255,255,255,0.12)"
borderRadius: 24
padding: "32px 28px"
boxShadow: "0 32px 96px rgba(0,0,0,0.6)"
```

Стиль кнопок-опций (неактивная):
```
padding: "10px 16px", borderRadius: 10,
background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
color: "rgba(255,255,255,0.7)", fontWeight: 600, cursor: "pointer"
```

Стиль активной опции — добавить:
```
background: `${accent}22`, border: `1px solid ${accent}66`, color: "white", fontWeight: 750
```

Кнопка "НАЧАТЬ КВИЗ":
```
width: "100%", padding: "16px", borderRadius: 14,
background: "white", color: "#08080d", fontWeight: 900, fontSize: 18,
border: "none", cursor: "pointer", marginTop: 8
```

---

## Изменение 2 — quiz/page.tsx

### 2a. Читать pre-config из localStorage при маунте

В начале компонента (после объявления state), добавить useEffect:
```ts
useEffect(() => {
  const raw = localStorage.getItem('party-hub-quiz-config');
  if (!raw || !isHost) return;
  try {
    const config = JSON.parse(raw) as {
      mode: 'general' | 'special';
      difficulty: string;
      topic: string;
      specialQuizId: string | null;
    };
    localStorage.removeItem('party-hub-quiz-config'); // очищаем после прочтения
    if (config.mode === 'general') {
      setQuizMode('general');
      setDifficulty(config.difficulty as QuizDifficulty);
      setTopic(config.topic as QuizTopic);
      setPhase('waiting'); // пропускаем setup-фазы
    } else if (config.mode === 'special' && config.specialQuizId) {
      setQuizMode('special');
      setSpecialQuizId(config.specialQuizId);
      setPhase('waiting'); // пропускаем setup-фазы
    }
  } catch {
    // ignore malformed config
  }
}, [isHost]); // запустить один раз при маунте
```

Важно: этот эффект должен запускаться ДО того как отрисуются setup-фазы.
Если `phase` уже 'waiting', setup не показывается — это нужное поведение.

### 2b. Зависимости

В quiz/page.tsx уже должны быть: `useState`, `useEffect`, типы `QuizDifficulty`,
`QuizTopic`, `setPhase`, `setDifficulty`, `setTopic`, `setQuizMode`, `setSpecialQuizId`.
Найти их в существующем коде и использовать — не создавать дубликаты.

---

## Acceptance
1. Когда выбран квиз → кнопка называется "Выбрать квиз"
2. Клик → открывается оверлей с выбором General/Special, сложности, темы
3. Клик "НАЧАТЬ КВИЗ" → закрывает оверлей, сохраняет config в localStorage, запускает handleStartGame (QR screen)
4. Когда игра стартует и все переходят на /game/.../quiz → хост пропускает setup, сразу фаза 'waiting'
5. `npm run lint` без новых ошибок

## Не трогать
- `CLAUDE.md`, `AGENTS.md`, `codex-tasks/`, `.codex/`
- `server.mts`, `socket-handlers.mts`
- Другие игровые страницы
- Квиз-логику (вопросы, раунды) — только setup-фазы в начале
