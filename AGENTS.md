# Party Games Hub — instructions for Codex

## Роли и ответственность

Проект ведут два участника:

| Роль | Кто | Ответственность |
|---|---|---|
| Владелец продукта | Анастасия | Приоритеты, продуктовые решения, утверждение дизайна, разрешение на browser QA, build, commit и push |
| Инженерная система | Codex | Анализ, планирование, реализация, проверки, ревью, документация и передача контекста |

Codex работает в нескольких чатах с разделением ответственности:

- `Party Games Hub — Общий прогресс` — системный чат: общий статус,
  приоритеты, архитектурные и межигровые решения, ревью, синхронизация
  канонических документов.
- Чаты отдельных игр и задач — реализация в своей области, локальные проверки,
  отчёт и `/context-save`.
- Для рискованных изменений используется отдельный свежий review-проход, чтобы
  реализация и окончательная проверка не опирались на один и тот же контекст.

Общий чат координирует проект, но не является единственным хранилищем фактов.
Долговременное состояние хранится в канонических документах и Git.

## Перед существенной работой

Прочитать полностью:

1. `AGENTS.md`;
2. `PROJECT_CONTEXT.md` — архитектура, утверждённое поведение и ограничения;
3. `TASKS.md` — актуальная очередь и следующий номер отчёта;
4. `docs/CODEX_WORKFLOW.md` — при запуске, завершении, передаче или ревью
   существенной задачи;
5. релевантные ADR и документы из `docs/`;
6. `codex-reports/CODEX-HANDOFF.md` при восстановлении или передаче контекста.

`.codex/STATUS.md`, `.codex/WORKFLOW.md`, `CLAUDE.md` и старые
`codex-tasks/**` являются историческими материалами, а не источниками текущего
состояния. Не загружать их без специальной причины.

## Владение файлами

- `AGENTS.md` принадлежит Анастасии. Codex меняет его только по её явной
  команде с указанным объёмом изменения.
- `PROJECT_CONTEXT.md`, `TASKS.md`, `docs/decisions/**` и
  `codex-reports/CODEX-HANDOFF.md` синхронизирует общий системный чат либо Codex
  по отдельному явному поручению.
- Чаты отдельных игр не редактируют общие управляющие документы одновременно с
  реализацией. Они передают результат через отчёт и `/context-save`.
- `codex-reports/**` доступны Codex. Для существенной сессии создаётся
  последовательный отчёт `NNN-name.md`.
- `codex-tasks/**` сохраняются как архив. Новые task-файлы не обязательны:
  цель, scope и критерии готовности можно зафиксировать в рабочем чате.
- `CLAUDE.md` и `.codex/**` сохраняются как legacy и остаются read-only, пока
  Анастасия явно не решит их архивировать.

## Рабочий цикл

1. Зафиксировать ожидаемый пользовательский результат и границы задачи.
2. Проверить `git status` и scoped diff. Сохранить все чужие и незавершённые
   изменения.
3. Для небольшой задачи назвать затрагиваемые файлы и сразу выполнить работу.
   Для большой задачи сначала дать проверяемый план и критерии готовности.
4. Изменять только необходимый scope. Не добавлять побочные рефакторинги.
5. Проверить результат соразмерно риску.
6. Для существенной работы создать или обновить номерной отчёт в
   `codex-reports/`.
7. В конце большой сессии выполнить `/context-save`. После успешной проверки
   checkpoint сводка автоматически передаётся в общий системный чат.
8. Общий чат обновляет канонический статус и назначает отдельное ревью, если
   изменение затрагивает общий или рискованный контур.

## Нумерация и отчёты

- Номера последовательные: `TASK-001`, `TASK-002`, ...
- Следующий номер определяется по `TASKS.md`, handoff и фактическим файлам в
  `codex-reports/`. При расхождении сначала исправить канонический номер.
- Отчёт обязателен для новой функции, изменения игрового flow, редизайна,
  исправления runtime-багов, realtime/server изменений и заметного QA-прогона.
- Мелкое исследование без изменений можно завершить сообщением в чате и
  `/context-save`, если отдельный отчёт не добавит полезной истории.
- Отчёт фиксирует изменённые файлы, выполненные проверки, непроверенные области,
  отклонения и решения, которые нужны от Анастасии.

## Ревью

Отдельный review-проход обязателен перед публикацией, если изменение затрагивает:

- `server.mts`, `src/server/**` или Socket.io protocol;
- общий TV renderer, lobby, identity, permissions или reconnect;
- privacy ролей, слов, ответов или голосов;
- общие типы/данные, влияющие на несколько игр;
- крупный рефакторинг или несколько игровых flow.

Ревью проверяет diff, поведение, обратную совместимость, privacy, reconnect,
проверки и точность отчёта. Найденные проблемы исправляются в рабочем чате,
после чего проверяется новый diff.

## Инженерные ограничения

- Сохранять host-authoritative проверки комнаты, владельца, host и действий.
- Reconnect и TV должны получать полный state; одних live-событий недостаточно.
- Не раскрывать приватные роли, слова, ответы и голоса на TV или в чужом DOM.
- Production UI поддерживает ru/en. Internal preview может быть только ru.
- Комментарии в коде писать на английском.
- При работе с Alias сначала определить режим. Classic и letter mode имеют
  разный scoring и изменяются изолированно; точные правила брать из
  `PROJECT_CONTEXT.md` и фактической реализации обоих режимов.
- Принятый дизайн и игровые правила не переосмысливать без явной продуктовой
  задачи. Текущие решения брать из `PROJECT_CONTEXT.md` и ADR.
- Final production UI использует проектные SVG/image-иконки вместо стандартных
  emoji, если Анастасия явно не утвердила исключение.
- Phone и TV являются отдельными полноценными интерфейсами. Для UI-изменения
  проверить обе композиции, затронутые состояния, privacy и реальные размеры.
- «100 к 1» остаётся на паузе, пока Анастасия явно не возобновит работу.
- Не запускать production build одновременно с dev-server: они используют одну
  `.next`. Перед build остановить dev-server.
- Browser/multiplayer QA, production build, commit и push выполнять только по
  явной команде Анастасии.
- Не считать HTTP 200, загрузку страницы или socket connection доказательством
  полного игрового QA.
- Type-check и lint подтверждают только статическую корректность и не
  доказывают работу пользовательского UI-flow. Если browser-проверка не
  выполнялась, сообщить это прямо.
- Команда `ROOMCODE - N телефонов` означает немедленно запустить
  `npm run phones -- ROOMCODE N`: N отдельных Chrome app-окон 390×844 с
  независимыми профилями.

## Окружения и секреты

- Сначала определить текущую среду и не обещать возможности другой среды.
- Codex cloud не видит Mac `localhost`, локальные GUI-процессы и файлы вне
  checkout. Проверка запущенного на Mac dev-server выполняется в локальном
  Codex Desktop/CLI.
- Внешние API и генерацию ассетов запускать только в среде с доступной сетью и
  необходимыми ключами. Сетевой timeout в cloud не считать дефектом проекта.
- `.env.local` не хранится в Git и создаётся отдельно в каждой среде из
  `.env.local.example`. Секреты и локальные generation logs не коммитировать.
- Git и канонические документы — мост между средами. Незакоммиченные изменения,
  локальные комнаты, процессы и env-файлы в другой среде не видны.

## Работа с dirty worktree

- Считать все существующие изменения пользовательскими, пока не доказано иное.
- Не откатывать, не перезаписывать и не форматировать unrelated files.
- Перед изменением существующего dirty-файла прочитать его scoped diff и
  сохранить текущий смысл.
- Не использовать destructive Git-команды. Не коммитить и не пушить без явной
  команды.
- Один активный писатель на файл. При пересечении scope остановиться и
  согласовать порядок.

## Проверки и завершение

Для существенного изменения выполнить применимые проверки:

1. scoped diff и `git diff --check`;
2. `npx tsc --noEmit`;
3. scoped ESLint или `npm run lint`;
4. затронутый пользовательский сценарий, если дано разрешение на browser QA;
5. production build только при остановленном dev-server и явном разрешении.

В финальном сообщении отделять проверенные факты от предположений. Перечислять,
что выполнено, что не выполнялось, какие риски остались и требуется ли решение
Анастасии. Работа завершена, когда код, документы, отчёт и заявленные проверки
согласованы между собой.


# DeepSeek Worker Collaboration

This repository supports a local DeepSeek worker used as an implementation agent under Codex supervision.

## Roles

Codex is the technical lead and final authority.

Codex is responsible for:
- understanding the user's request;
- deciding architecture and implementation direction;
- defining scope and constraints;
- deciding which files/subsystems should be affected;
- defining acceptance criteria;
- deciding which tests and server checks are required;
- reviewing DeepSeek's actual git diff;
- identifying regressions, architectural issues, security issues, and incomplete work;
- deciding whether the result is accepted;
- deciding the next development step.

DeepSeek is the implementation worker.

DeepSeek should handle most high-volume and token-intensive execution work, including:
- repository investigation;
- reading many related files;
- implementation across multiple files;
- refactoring;
- repetitive edits;
- writing tests;
- running tests;
- investigating ordinary test failures;
- fixing implementation defects found during Codex review;
- other large mechanical coding tasks.

Codex should avoid duplicating large implementation work itself while DeepSeek collaboration is enabled.

## Collaboration mode

The current mode is controlled with:

deepseek-mode status

Possible modes:

- ON: Codex should delegate appropriate implementation-heavy work to DeepSeek.
- OFF: Codex must not invoke DeepSeek and must perform development work itself.

When the user says things equivalent to:

- "перестаем обращаться к deepseek"
- "дальше работай сам"
- "отключи deepseek"
- "не используй deepseek"

Codex must run:

deepseek-mode off

and continue working without DeepSeek.

When the user later says things equivalent to:

- "возвращаемся к совместной работе с deepseek"
- "снова используем deepseek"
- "включи deepseek"
- "подключи deepseek обратно"

Codex must run:

deepseek-mode on

and resume the collaboration workflow.

The user's latest explicit instruction about DeepSeek usage always takes precedence.

Do not automatically discard existing DeepSeek task changes when collaboration is turned off.

## Starting a new DeepSeek task

Before a new delegated task, Codex must check:

deepseek-mode status

If mode is ON, prepare a fresh worker branch with:

deepseek-sync-start

This creates a task branch in the dedicated worktree:

/Users/anastasiaivanova/my-project-deepseek

Do not run deepseek-sync-start between review/fix iterations of the same task.

## Delegating work

Run:

deepseek-worker "<task>"

The task given to DeepSeek should clearly include:
- objective;
- relevant architectural constraints;
- acceptance criteria;
- behavior that must not change;
- tests/checks DeepSeek should run;
- instruction not to make unrelated changes.

Codex defines WHAT and the constraints.

DeepSeek may determine implementation details, but significant architectural changes should be escalated back to Codex rather than invented silently.

## Reviewing DeepSeek work

Never accept DeepSeek's textual claim that a task is complete without inspecting the repository.

Codex must review the worker worktree directly, including as appropriate:

git -C /Users/anastasiaivanova/my-project-deepseek status
git -C /Users/anastasiaivanova/my-project-deepseek diff --stat
git -C /Users/anastasiaivanova/my-project-deepseek diff

Codex should also inspect important changed files directly and determine any additional tests required.

If review fails, delegate corrections with another:

deepseek-worker "<correction task>"

Continue on the same DeepSeek task branch.

## Acceptance

Only after Codex has reviewed the implementation and required tests have passed may Codex run:

deepseek-accept

Do not manually copy files between worktrees.

Do not merge or accept DeepSeek changes before review.

## Main principle

The preferred collaboration model while DeepSeek mode is ON is:

User
→ Codex plans and directs
→ DeepSeek performs implementation-heavy work
→ Codex reviews
→ DeepSeek fixes issues if needed
→ Codex verifies tests
→ Codex accepts the result

Codex remains responsible for the final technical decision.

# Codex ↔ DeepSeek Collaboration Protocol

This repository supports a local DeepSeek implementation worker controlled by Codex.

## Core roles

The active Codex model is the technical lead, orchestrator, reviewer, and final authority.

DeepSeek is the implementation worker.

The user communicates with Codex. Codex may delegate implementation work to DeepSeek but remains responsible for all final technical decisions.

## Collaboration mode

Before delegating work, Codex must check:

deepseek-mode status

Possible states:

- ON — DeepSeek collaboration is enabled.
- OFF — Codex must not invoke DeepSeek and must implement work itself.

When the user says things equivalent to:

- "перестаем обращаться к deepseek"
- "дальше работай сам"
- "отключи deepseek"
- "не используй deepseek"
- "работай без deepseek"

Codex must run:

deepseek-mode off

After this, Codex must not invoke:

- deepseek-sync-start
- deepseek-worker

Codex continues development itself.

When the user later says things equivalent to:

- "возвращаемся к совместной работе с deepseek"
- "включи deepseek"
- "снова используем deepseek"
- "подключи deepseek обратно"

Codex must run:

deepseek-mode on

The user's latest explicit instruction about DeepSeek always takes precedence.

Turning DeepSeek OFF must never automatically delete or reset an existing DeepSeek task branch or its changes.

## What Codex owns

Codex is responsible for:

- understanding the user's goal;
- architecture;
- task scope;
- implementation direction;
- deciding which subsystems may change;
- API contracts;
- data-model and persistence decisions;
- security-sensitive decisions;
- backward compatibility;
- acceptance criteria;
- test strategy;
- deciding which server/integration tests must run;
- reviewing actual repository changes;
- detecting regressions;
- reviewing important implementation details;
- deciding PASS or FAIL;
- deciding the next development step.

Codex should spend its tokens primarily on decisions, review, and control rather than large mechanical implementation work.

## What should normally be delegated to DeepSeek

When DeepSeek mode is ON, Codex should delegate most high-volume and token-intensive execution work, including:

- reading many related repository files;
- repository investigation;
- multi-file implementation;
- repetitive code edits;
- large refactors;
- boilerplate;
- adding or updating tests;
- running tests;
- investigating ordinary test failures;
- fixing implementation defects;
- typecheck/lint/build fixes;
- documentation updates related to an implementation;
- searching usages and dependencies across the repository.

The goal is for DeepSeek to perform most implementation-heavy work while Codex directs and verifies it.

## Work that Codex should normally keep

Codex should normally make or explicitly approve:

- architecture changes;
- new cross-cutting abstractions;
- API contract changes;
- database/schema strategy;
- authentication/authorization design;
- security-sensitive behavior;
- destructive migrations;
- major dependency changes;
- changes with broad backward-compatibility impact.

Codex may still delegate the coding of these decisions after deciding the approach.

## Starting a new DeepSeek task

A new DeepSeek task may start only when:

1. collaboration mode is ON;
2. the main worktree is clean;
3. there is no unresolved previous DeepSeek task.

Prepare the worker with:

deepseek-sync-start

This creates a fresh branch:

deepseek/task-...

inside:

/Users/anastasiaivanova/my-project-deepseek

The new task is based on the current HEAD of:

/Users/anastasiaivanova/my-project

Do not run deepseek-sync-start again during review/fix iterations of the same task.

## Delegating implementation

Use:

deepseek-worker "<task>"

A good DeepSeek task should contain:

- objective;
- relevant context;
- architectural constraints;
- files/subsystems known to be relevant when useful;
- behavior that must remain unchanged;
- acceptance criteria;
- tests/checks to run;
- explicit prohibition on unrelated changes.

Codex defines WHAT must be achieved and the important constraints.

DeepSeek may determine ordinary implementation details.

## DeepSeek escalation rule

DeepSeek must not silently make significant architectural decisions.

When implementation reveals a decision with meaningful architectural, security, persistence, compatibility, or API implications, DeepSeek should stop and report:

BLOCKED — ARCHITECTURAL DECISION REQUIRED

The report should contain:

- the discovered issue;
- why the current task cannot safely continue without a decision;
- relevant files/subsystems;
- available options;
- consequences/tradeoffs of each option;
- a recommendation if useful.

Codex then decides the direction and sends DeepSeek a follow-up task on the same task branch.

## Required DeepSeek completion report

For substantial implementation tasks, Codex should instruct DeepSeek to finish with a concise report containing:

Changed files:
- ...

Implemented:
- ...

Tests/checks run:
- ...

Results:
- ...

Remaining issues:
- none / ...

Architectural decisions required:
- none / ...

DeepSeek's textual report is informational only. It is never a substitute for Codex reviewing the repository.

## Codex review

After DeepSeek finishes, Codex must review the worker worktree itself.

At minimum inspect:

git -C /Users/anastasiaivanova/my-project-deepseek status --short

git -C /Users/anastasiaivanova/my-project-deepseek diff --stat

git -C /Users/anastasiaivanova/my-project-deepseek diff

Codex should additionally inspect important changed files directly.

Codex must not accept a task only because DeepSeek says tests passed or the implementation is complete.

## Review outcome: FAIL

If Codex finds problems, do not create a new task branch.

Keep the existing deepseek/task-* branch and call:

deepseek-worker "<correction task>"

The correction request should clearly identify:

- what is wrong;
- affected files or behavior;
- expected result;
- required tests/checks.

This review/fix loop may repeat as many times as necessary.

## Tests

DeepSeek should run the routine tests requested by Codex.

Codex decides whether additional checks are required after reviewing the diff.

Typical checks may include:

- lint;
- TypeScript typecheck;
- unit tests;
- integration tests;
- server tests;
- production build;
- API smoke tests;
- regression checks for existing behavior.

Running a test is normally execution work and should be delegated to DeepSeek when collaboration mode is ON.

Codex evaluates the results and decides whether validation is sufficient.

## Review outcome: PASS

Only after:

- Codex has reviewed the actual diff;
- required tests have passed;
- no unresolved architectural issues remain;

may Codex run:

deepseek-accept

deepseek-accept commits the worker changes and cherry-picks the approved commit into the main worktree.

Do not manually copy files between worktrees.

Do not run deepseek-accept before Codex review.

## After acceptance

After deepseek-accept, Codex should verify:

git -C /Users/anastasiaivanova/my-project status

and inspect the resulting main-branch commit if appropriate.

Before starting another DeepSeek task, the previous task must be considered complete and the main repository must be in a known clean state.

## Important safety principles

- DeepSeek must work only in /Users/anastasiaivanova/my-project-deepseek.
- Codex works against /Users/anastasiaivanova/my-project.
- Never give DeepSeek Full Access when Workspace Write is sufficient.
- Never automatically discard worker changes.
- Never automatically accept worker changes.
- Never let DeepSeek's self-reported completion replace Codex review.
- Never start a new task on top of unresolved worker changes.

## Preferred workflow while collaboration is ON

User
→ Codex understands the task
→ Codex decides architecture/scope
→ deepseek-sync-start
→ Codex delegates implementation with deepseek-worker
→ DeepSeek implements and runs routine checks
→ Codex reviews the actual diff
→ FAIL: DeepSeek fixes the same task
→ Codex reviews again
→ PASS: deepseek-accept
→ Codex verifies main worktree
→ Codex reports final result to user

## Preferred workflow while collaboration is OFF

User
→ Codex understands the task
→ Codex implements directly
→ Codex runs/reviews tests
→ Codex reports final result

