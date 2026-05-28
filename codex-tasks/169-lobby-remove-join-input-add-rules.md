# TASK-169 — Лобби: удалить поле ввода кода комнаты + правила игр

## Контекст

`src/components/lobby/Lobby.tsx` — монолитный компонент.

**Изменение 1 — Удалить поле ввода кода комнаты в десктопном героe.**
После TV-pivot игроки заходят через `/join/[code]`, а не через ввод кода на
главном экране. Поле ввода в `HeroLeft` (`showJoinRoom` блок) устарело.
`PlayerJoinView` (мобильный join экран) — **не трогать**.

**Изменение 2 — Добавить правила для кнопки «Правила».**
Кнопка уже есть (строка 2149), но onClick не навешен. Нужно добавить правила
для всех 7 игр и показывать их в модальном оверлее при нажатии.

## Whitelist файлов

**Изменить:**
- `src/components/lobby/Lobby.tsx`

**Создать:**
- `codex-reports/169-lobby-remove-join-input-add-rules.md`

**НЕЛЬЗЯ трогать:** всё остальное.

---

## Часть 1: Удалить поле ввода кода комнаты из HeroLeft

### 1a. Удалить блок `showJoinRoom` из JSX `HeroLeft`

В функции `HeroLeft` (~строка 2175) найти и **полностью удалить** весь блок:
```tsx
{showJoinRoom && (
  <div
    style={{
      display: "inline-flex",
      ...
    }}
  >
    {/* Join code input */}
    <button ... >
      ...
    </button>
    {joinCode.length === 6 && (
      <motion.button ... >
        ...
      </motion.button>
    )}
  </div>
)}
```
Блок заканчивается закрывающим `)}` перед `</div>` и `</div>` (~строка 2304).

### 1b. Удалить из пропсов и тела `HeroLeft` всё join-специфичное

Убрать из деструктуризации пропсов `HeroLeft`:
- `joinCode`
- `onJoinCodeChange`
- `onJoinRoom`
- `isJoiningRoom`
- `showJoinRoom`

Убрать из TypeScript interface:
- `joinCode: string;`
- `onJoinCodeChange: (v: string) => void;`
- `onJoinRoom: () => void;`
- `isJoiningRoom: boolean;`
- `showJoinRoom: boolean;`

Убрать из тела функции `HeroLeft`:
- `const [joinWrapperFocused, setJoinWrapperFocused] = useState(false);`
- `const [joinInputFocused, setJoinInputFocused] = useState(false);`
- `const [submitFocused, setSubmitFocused] = useState(false);`
- `const joinInputRef = useRef<HTMLInputElement>(null);`
- `const joinWrapperRef = useRef<HTMLButtonElement>(null);`
- `const joinSelectedByEscRef = useRef(false);`
- `const joinFocusRing = joinWrapperFocused || joinInputFocused;`
- функцию `handleJoinWrapperFocus`
- функцию `handleJoinWrapperKeyDown`
- функцию `handleJoinInputKeyDown`

### 1c. Упростить keyboard nav массив

Найти (~строка 567-569):
```tsx
joinCode.length === 6
  ? ["start", "rules", "join-code", "join-submit"]
  : ["start", "rules", "join-code"];
```
Заменить на просто:
```tsx
["start", "rules"]
```

### 1d. Убрать пропсы из места вызова HeroLeft в Lobby

Найти (~строки 879-889) вызов `<HeroLeft ... />`:
```tsx
joinCode={joinCode}
onJoinCodeChange={setJoinCode}
onJoinRoom={handleJoinRoom}
...
isJoiningRoom={isJoiningRoom}
isCurrentUserHost={isCurrentUserHost}
showJoinRoom={!roomCode}
```
Убрать из этого вызова:
- `joinCode={joinCode}`
- `onJoinCodeChange={setJoinCode}`
- `onJoinRoom={handleJoinRoom}`
- `isJoiningRoom={isJoiningRoom}`
- `showJoinRoom={!roomCode}`

Оставить только:
```tsx
game={active}
accent={accent}
deep={deep}
onStartGame={handleStartGame}
onOpenQuizConfig={() => setQuizSelectionOpen(true)}
startGameButtonRef={startGameButtonRef}
isMobile={isMobile}
isCurrentUserHost={isCurrentUserHost}
onRules={() => setRulesOpen(true)}
```
(проп `onRules` будет добавлен в Части 2)

---

## Часть 2: Добавить правила для кнопки «Правила»

### 2a. Добавить поле `rules` в `GameInfo` и данные для всех 7 игр

В интерфейс `GameInfo` (~строка 72) добавить:
```ts
rules: {
  sections: Array<{ title: string; items: string[] }>;
};
```

В массив `games` (~строки 87-158) добавить `rules` в каждый объект:

```ts
// Мафия
rules: {
  sections: [
    {
      title: "Роли",
      items: [
        "Мафия — убивает одного игрока каждую ночь",
        "Доктор — спасает одного игрока каждую ночь",
        "Детектив — узнаёт роль одного игрока за ночь",
        "Мирный житель — не имеет особых способностей",
      ],
    },
    {
      title: "Ход игры",
      items: [
        "Ночь: мафия выбирает жертву → доктор спасает → детектив проверяет",
        "День: игроки обсуждают и голосуют за подозреваемого",
        "Набравший больше голосов выбывает из игры",
      ],
    },
    {
      title: "Победа",
      items: [
        "Мирные: устранить всех членов мафии",
        "Мафия: сравняться по числу с мирными",
      ],
    },
  ],
},

// Квиз
rules: {
  sections: [
    {
      title: "Как играть",
      items: [
        "Ведущий выбирает тему и сложность вопросов",
        "Вопрос и 4 варианта ответа появляются на экране",
        "Каждый игрок отвечает на своём телефоне",
        "Таймер ограничивает время на ответ",
      ],
    },
    {
      title: "Очки",
      items: [
        "Правильный ответ приносит очки",
        "Чем быстрее ответишь — тем больше бонус за скорость",
        "Неправильный ответ очков не приносит",
      ],
    },
    {
      title: "Победа",
      items: ["Побеждает игрок с наибольшим количеством очков"],
    },
  ],
},

// Крокодил
rules: {
  sections: [
    {
      title: "Как играть",
      items: [
        "По очереди один игрок объясняет слово",
        "Можно использовать жесты, мимику, звуки",
        "Нельзя говорить само слово и однокоренные",
        "Нельзя показывать буквы руками",
      ],
    },
    {
      title: "Очки",
      items: [
        "+1 очко объясняющему за каждое угаданное слово",
        "Пропущенные слова очков не приносят",
      ],
    },
    {
      title: "Победа",
      items: ["Побеждает игрок с наибольшим количеством угаданных слов"],
    },
  ],
},

// Шпион
rules: {
  sections: [
    {
      title: "Как играть",
      items: [
        "Все получают карточку с секретной локацией — кроме шпиона",
        "Игроки по очереди задают друг другу вопросы о локации",
        "Шпион пытается не раскрыться, отвечая уклончиво",
      ],
    },
    {
      title: "Победа",
      items: [
        "Мирные: проголосовать за шпиона до конца раунда",
        "Шпион: угадать локацию до разоблачения",
      ],
    },
  ],
},

// Угадай слово (alias)
rules: {
  sections: [
    {
      title: "Режимы",
      items: [
        "Классика: объясняй слова команде любыми словами",
        "Буква: слова на определённую букву, каждый сам за себя",
      ],
    },
    {
      title: "Правила",
      items: [
        "Нельзя использовать однокоренные слова",
        "Нельзя называть само слово или его часть",
        "Таймер ограничивает каждый ход",
      ],
    },
    {
      title: "Победа",
      items: ["Побеждает набравший наибольшее количество очков"],
    },
  ],
},

// Кто я?
rules: {
  sections: [
    {
      title: "Как играть",
      items: [
        "Каждому игроку тайно присваивается персонаж или понятие",
        "Ты не знаешь своего персонажа — зато знают все остальные",
        "По очереди задавай вопросы с ответом «Да» или «Нет»",
        "За один ход можно задать несколько вопросов подряд",
      ],
    },
    {
      title: "Победа",
      items: [
        "Угадай своего персонажа первым",
        "Чем быстрее угадаешь — тем лучше",
      ],
    },
  ],
},

// 100 к 1
rules: {
  sections: [
    {
      title: "Как играть",
      items: [
        "Две команды соревнуются за банк очков",
        "100 человек уже ответили на вопрос — нужно угадать их ответы",
        "Три страйка (неверных ответа) — ход уходит к сопернику",
      ],
    },
    {
      title: "Раунды",
      items: [
        "Простая: стандартные очки",
        "Двойная: очки удвоены",
        "Тройная: очки утроены",
        "Наоборот: побеждает набравший меньше (редкие ответы)",
      ],
    },
    {
      title: "Финал",
      items: [
        "После 4 раундов — Большая игра",
        "Два игрока от победившей команды отвечают по очереди",
        "Набери 200 очков — и весь приз достанется команде",
      ],
    },
  ],
},
```

### 2b. Добавить `rulesOpen` state в `Lobby`

Рядом с другими `useState` (~строки 195-210):
```ts
const [rulesOpen, setRulesOpen] = useState(false);
```

### 2c. Добавить `onRules` проп в `HeroLeft`

В деструктуризацию пропсов `HeroLeft` добавить:
```ts
onRules,
```

В TypeScript interface добавить:
```ts
onRules: () => void;
```

### 2d. Навесить onClick на кнопку «Правила» в `HeroLeft`

Найти кнопку «Правила» (~строка 2149):
```tsx
<motion.button
  data-lobby-cta="rules"
  ...
>
  Правила
</motion.button>
```

Добавить `onClick={onRules}`:
```tsx
<motion.button
  data-lobby-cta="rules"
  onClick={onRules}
  ...
>
  Правила
</motion.button>
```

### 2e. Рендерить модальный оверлей с правилами в `Lobby`

В JSX `Lobby`, после `<GlassToaster />` (в конце render, перед закрывающим `</div>`),
добавить модальный оверлей:

```tsx
<AnimatePresence>
  {rulesOpen && (
    <motion.div
      key="rules-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={() => setRulesOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
      }}
    >
      <motion.div
        key="rules-panel"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(18,20,32,0.92)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 20,
          padding: "28px 28px 32px",
          maxWidth: 480,
          width: "100%",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: `${accent}cc`, fontWeight: 700, marginBottom: 4 }}>
              Правила
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>
              {active.name}
            </h2>
          </div>
          <button
            onClick={() => setRulesOpen(false)}
            style={{
              width: 36, height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.7)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, lineHeight: 1,
              fontFamily: "inherit",
            }}
          >
            ✕
          </button>
        </div>

        {/* Rules sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {active.rules.sections.map((section) => (
            <div key={section.title}>
              <div style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.45)",
                fontWeight: 700,
                marginBottom: 8,
              }}>
                {section.title}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                {section.items.map((item, i) => (
                  <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, lineHeight: 1.5, color: "rgba(255,255,255,0.82)" }}>
                    <span style={{ color: `${accent}cc`, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>—</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

**Важно:** `active` и `accent` уже доступны в scope `Lobby`. Убедиться что они
видны в месте вставки (они объявлены в теле `Lobby` до return).

Закрытие: клик на overlay (`onClick={() => setRulesOpen(false)}`) или кнопка ✕.
Клик внутри панели (`onClick={(e) => e.stopPropagation()}`) не закрывает.

---

## Acceptance

```bash
# Поле ввода кода удалено из HeroLeft
grep -n "showJoinRoom\|join-code\|join-submit\|handleJoinWrapperFocus\|joinWrapperRef\|joinInputRef\|joinSelectedByEsc" src/components/lobby/Lobby.tsx
# → пусто (или только в PlayerJoinView — не в HeroLeft)

# Правила добавлены
grep -n "rules.*sections\|section\.title\|section\.items" src/components/lobby/Lobby.tsx
# → минимум 10 строк

# rulesOpen state
grep -n "rulesOpen\|setRulesOpen\|onRules" src/components/lobby/Lobby.tsx
# → минимум 5 строк

npm run lint     # ✅
npx tsc --noEmit # ✅
```

## Отчёт

В `codex-reports/169-lobby-remove-join-input-add-rules.md`:
- Какие строки/блоки удалены
- Какие строки добавлены
- Результаты grep + lint/tsc

Не коммить, не пушить.
