# REPORT TASK-332: «Кто я?» — literal design port + separate guess screens

> **Метаданные** (заполняет Codex)
> - **Старт:** 2026-07-10 21:20
> - **Финиш:** 2026-07-10 21:47
> - **Длительность:** 27 минут
> - **Статус:** ✅ done

---

## Резюме (TL;DR)

Мобильные состояния «Ввод ответа», «Оспаривание», «Судья» вынесены из общего playing-экрана в отдельные полноэкранные рендеры под `GameLayout`, без списка игроков и toast позади. TV who-am-i получил remote-hints, имя оспаривающего игрока в баннере и overlay угадывания по референсу; `lint` и `tsc` чистые.

---

## Что сделано

### Изменённые файлы

- `src/app/game/[roomId]/who-am-i/page.tsx` — добавлены отдельные `renderGuessInput()`, `renderGuessConfirm()`, `renderJudge()` и условный выбор content до обычного `renderPlaying()`. Перенесены значения из Phone refs: `margin-top: 22px`, `border-radius: 32px`, `gap: 16/18px`, input field `border: 1.5px rgba(56,189,248,.65)`, amber dispute background `linear-gradient(165deg, rgba(255,159,10,.16), rgba(255,159,10,.05))`, judge `grid-template-columns: 1fr 1fr`, кнопки судьи в порядке «Отклонить» → «Верно». Мобильный финал получил stagger снизу вверх: для 6 игроков задержки `.25/.45/.65/.85/1.1/1.4s` в логике top-rank-last.
- `src/app/tv/[roomId]/[gameType]/page.tsx` — правки только внутри `gameType === 'who-am-i'`: playing/footer hint «У {имя} на телефоне: Нет · Да · Я знаю!», dispute banner «{имя} оспаривает ответ», dispute background `opacity .38` + `saturate(.7)`, success overlay `rgba(4,14,22,.66)` + `blur(16px) saturate(140%)`, toast `64px 96px 56px`, radius `56px`, chips персонажа и `+N очков`, finished/footer hint «У {победитель} на телефоне: Играть снова».

### Новые файлы

- `codex-reports/332-whoami-literal-design-port-and-separate-guess-screens.md` — отчёт по задаче.

### Удалённые файлы

- (нет)

---

## Diff stat

Whitelist diff:

```text
 src/app/game/[roomId]/who-am-i/page.tsx | 711 +++++++++++++++++++++++++-------
 src/app/tv/[roomId]/[gameType]/page.tsx | 555 +++++++++++++++++++++++++
 2 files changed, 1112 insertions(+), 154 deletions(-)
```

Полный `git diff --stat` также показывает pre-existing изменения вне whitelist (`.codex/STATUS.md`, `codex-tasks/_DONE.md`, `docs/who-am-i-design-brief.md`), я их не редактировал.

---

## Проверки

| Проверка | Результат | Заметки |
|---|---|---|
| `npm run lint` | ✅ | без warnings |
| `npx tsc --noEmit` | ✅ | чисто |
| Acceptance: отдельные mobile screens | ✅ | `showGuessInput`, `isMyConfirmScreen`, `isGuessJudge && guessAwaitingJudge` выбираются вместо `renderPlaying()` |
| Acceptance: судья Reject → Correct | ✅ | порядок кнопок «Отклонить» слева, «Верно» справа |
| Acceptance: mobile final stagger | ✅ | bottom-up delays, сжатие при >6 игроков |
| Acceptance: TV hints/banner/overlay | ✅ | добавлены named hints, dispute name, success chips |

---

## Отклонения от ТЗ

Нет функциональных отклонений. Базовые `.glass` / `.glass-strong` значения отсутствуют в design-ref CSS-файлах, поэтому для этих базовых слоёв использован существующий `glass-card`/project glass fallback из `src/app/globals.css`; конкретные radius/padding/gap/color/shadow значения экранов перенесены inline/Tailwind arbitrary.

---

## Открытые вопросы для Claude

Нет.

---

## Что НЕ сделано

Не трогал игровую логику/socket-события и не исправлял отложенный баг счётчика «Да», как указано в ТЗ.

---

## Подсказки для ревью

- Проверь `src/app/game/[roomId]/who-am-i/page.tsx`: главный риск — условия выбора `content` в конце файла, чтобы полноэкранные состояния показывались только нужному игроку.
- Проверь `src/app/tv/[roomId]/[gameType]/page.tsx`: изменения должны оставаться внутри `gameType === 'who-am-i'`; другие TV-игры не затрагивались.
