# TASK-531 — Content studio, verification and disk sync

Дата: 2026-09-14. Реализация локальная; свежий review / browser regression pending.

## Сделано

1. Тематические квизы: создание, ru/en названия, группа, номер, фон,
   редактирование / удаление; ручные вопросы и генерация 1–10 через Codex.
2. Структурированный fact-check, fail-closed parsing, источники, индикаторы и
   автоматическое утверждение только текущей положительно проверенной версии.
   Ручное утверждение отдельно от модельного отчёта; правки / повторная проверка
   сбрасывают его. Неполные ответы, дубликаты ID и non-https sources не утверждают вопросы.
3. Общий disk/save control: persistent draft → atomic runtime JSON, revision conflict,
   backup перед синхронизацией. Кнопка сохраняет все накопленные действия, не один квиз.
4. Character studio «Кто я?»: добавление, редактирование, удаление, ru/en и поиск.
5. Native file chooser библиотечного фона + выбор по папкам + SHA-256 сопоставление.
6. Реальные Marvel / Harry Potter папки; скопированы 8 PNG/WebP. Корневые оригиналы
   не удалены, старые URL сохранены; UI скрывает aliases и фильтрует по папкам.

ckm:ui-styling использован для доступных форм, native dialogs, статусов и SVG-дискеты.

## Ключевые файлы

- `src/lib/content/{catalog,store,server,client,fact-check}.ts`, `store.test.ts`.
- `src/app/api/content/route.ts`; admin `content`, `content-check`, `content-generate`.
- `src/components/admin/ContentWorkspace.tsx`, `ContentStudio.tsx`.
- `src/components/RuntimeContent.tsx`, `src/app/providers.tsx`, `src/lib/quiz/index.ts`.
- Phone `quiz/page.tsx`, `who-am-i/page.tsx`: обновление опубликованных банков перед стартом.
- `src/app/admin/page.tsx`: старый Quiz viewer заменён студией, подключены дискетa / characters.
- Admin backgrounds / save-image, bounded body-limit option в `admin-codex.ts`.
- `content/README.md`, `public/backgrounds/{marvel,harry-potter}/*`.
- `docs/ADMIN_CODEX.md`, `PROJECT_CONTEXT.md`, `TASKS.md`, handoff.

Начальные изменения TASK-530 сохранены, старые draft-файлы не удалялись.

## Проверки

- TypeScript: passed.
- Scoped ESLint: passed, без новых warnings (dialog effects исправлены).
- 11/11 новых content tests: staging, sync, backup, deletion, creation, persistence,
  conflict, validation, migration, verification signatures / manual approval / public metadata.
- 21/21 существующих report / review / Who Am I flow tests: passed.
- 18/18 game-security tests: passed.
- 2/2 Who Am I Socket.io integration tests: passed; первый sandbox-запуск был
  заблокирован `listen EPERM`, затем только эти два теста повторены с разрешённым
  временным локальным портом. Основной dev-server / комнаты не трогались.
- Итого 52 уникальных успешных автоматических теста; это НЕ UI / device QA.
- Read-only проверка реальных baseline и мигрированного draft: passed.
  Baseline: 450 general questions, 10 Harry Potter + 10 Marvel, 130 characters;
  старые admin изменения импортируются как одна pending запись.
- `git diff --check`: passed.

## Не запускалось / границы

- Реальный Codex fact-check / генерация из новых кнопок: НЕ запускались.
- Browser/native-picker/live-admin save/phone/TV QA, production build, restart,
  commit и push НЕ выполнялись.
- Реальные пользовательские данные в published JSON НЕ синхронизировались:
  до нажатия владельцем дискеты опубликованная версия остаётся baseline.
- Прямой начальный путь Finder нельзя задать браузерному file input: папку
  public/backgrounds выбирают вручную или используют список библиотеки.
- Старые TS-банки не переписываются. Настоящий runtime-файл — content/game-content.json.
- Generation conflict возвращает набор `generated` для ручного сохранения, не теряет
  его молча и не перезаписывает позднейшие edits.
- File lock после аварии может потребовать проверки и удаления точного lock-файла;
  до этого данные не перезаписываются. Draft write после успешного published rename
  может отдельно завершиться ошибкой; повторный sync разрешён при равных каталогах.

## Следующий шаг

Свежий отдельный review общего runtime loading, admin auth / body limits, concurrent
sync и Quiz start queue; затем только по разрешению пользователя browser / phone / TV
regression новых тем, фонов, staged deletion, disk-save, проверки / редактирования,
reconnect и повторного старта. Утверждённые дизайны и правила игр не менялись.
