# TASK-345: «Кто я?» — ask-question шлёт абсолютные значения вместо дельт

**Тип:** simple/medium (2 файла, механическая замена дельты на абсолют)
**Whitelist:** `src/app/game/[roomId]/who-am-i/page.tsx`, `src/app/tv/[roomId]/[gameType]/page.tsx`
**НЕ трогать:** `server.mts`, `src/server/**`, `src/lib/**`, другие игры.

---

## Контекст

TASK-344 починил корень дублирования (утечка слушателя в `use-socket.ts` при
StrictMode cleanup). Это защитное продолжение: убрать сам КЛАСС бага
«двойное применение дельты» из «Кто я?». Сейчас `ask-question` — единственный
экшен игры, который применяется как инкремент (`+1`) на каждом клиенте:

- mobile `who-am-i/page.tsx`, case `'ask-question'` (~строки 275-297):
  `questionsAsked[cid] + 1`, `consecutiveYesAnswers + 1`.
- TV `tv/[roomId]/[gameType]/page.tsx`, case `'ask-question'` (~строки 667-686):
  та же дельта-логика.

Любое повторное применение (дубль-доставка, дубль-слушатель, resync-гонка)
портит счётчик и очки. Остальные экшены игры уже идемпотентны или
защищены (`guess` имеет `includes`-guard на TV).

## Задача

1. **Расширить тип экшена** (в обоих файлах, у каждого свой локальный тип):
   ```ts
   | { type: 'ask-question'; answer?: 'yes' | 'no'; playerId: string;
       questionsAsked: number; consecutiveYesAnswers: number }
   ```
   `playerId` — кто задавал вопрос (активный игрок);
   `questionsAsked` — НОВОЕ абсолютное значение счётчика вопросов этого игрока;
   `consecutiveYesAnswers` — НОВОЕ абсолютное значение серии «Да».

2. **Отправитель** (`handleQuestionAsked` в mobile, ~строка 404): активный
   игрок вычисляет новые значения из своего локального `gs` и шлёт их:
   ```ts
   const myId = effectivePlayerId; // guard: if (!myId) return false;
   const nextQuestions = (gs.questionsAsked[myId] || 0) + 1;
   const nextStreak = answer === 'yes' ? gs.consecutiveYesAnswers + 1 : gs.consecutiveYesAnswers;
   broadcast({ type: 'ask-question', answer, playerId: myId,
               questionsAsked: nextQuestions, consecutiveYesAnswers: nextStreak });
   ```
   Поведение «Нет» (следом `next-turn`) и guard `canSendQuestionAnswer` —
   не менять.

3. **Приёмник** (оба файла, case `'ask-question'`): вместо вычисления `cid`
   из `turnOrder`/`currentTurnIndex` и инкремента — просто присвоить
   абсолютные значения из payload:
   ```ts
   setGs((prev) => ({
     ...prev,
     questionsAsked: { ...prev.questionsAsked, [payload.playerId]: payload.questionsAsked },
     consecutiveYesAnswers: payload.consecutiveYesAnswers,
   }));
   ```
   Вычисление `activeOrder`/`cid` в этом case больше не нужно — удалить
   (только внутри этого case, больше нигде).

4. **`handleYesAnswer`** (~строка 417): проверку «3 подряд» перевести на то же
   вычисленное значение, чтобы не разъезжалась с отправленным:
   `if (nextStreak >= 3) handleNextTurn();` — логика прежняя
   (`gs.consecutiveYesAnswers + 1 >= 3` эквивалентно), просто без
   повторного чтения стейта. Можно вернуть `nextStreak` из
   `handleQuestionAsked` или вычислить до вызова — на твой вкус,
   главное консистентность.

5. Никаких изменений в остальных case'ах, фазах, UI, i18n-строках.

## Acceptance

- `npm run lint` и `npx tsc --noEmit` чисто.
- (`npm run build` в этой среде падает `Operation not permitted` — известно;
  валидировать через `npx next build --webpack`.)
- Один клик «Да» → счётчик +1 на телефоне и на TV; двойная доставка того же
  экшена больше не может изменить значения (идемпотентность).
- Очки (`calculateScore` от `questionsAsked`) продолжают работать.
- НЕ коммитить. Отчёт в `codex-reports/345-whoami-ask-question-absolute-values.md`.
