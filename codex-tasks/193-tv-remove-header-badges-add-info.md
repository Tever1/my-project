# TASK-193: Игровое поле (TV) — убрать дубль плашек в шапке + добавить инфо вопросов/игроков

## Файл
`src/app/tv/[roomId]/[gameType]/page.tsx`

---

## Правка 1: убрать дублирующие плашки сложности/темы в шапке (top bar)

В шапке после `<h1>{gameTitle}</h1>` идёт блок с бейджами квиза, который дублирует
плашки из центра waiting-экрана. Удалить этот блок целиком.

Найди (около строк 528-554):
```tsx
            <h1 className="text-3xl font-bold">{gameTitle}</h1>
            {specialQuizInfo ? (
              <span className="glass-badge px-3 py-1 text-sm inline-flex items-center gap-1.5">
                <QuizIcon iconUrl={specialQuizInfo.iconUrl} fallback={specialQuizInfo.icon} size={18} />
                {locale === 'ru' ? specialQuizInfo.titleRu : specialQuizInfo.titleEn}
              </span>
            ) : specialThemeInfo ? (
              <span className="glass-badge px-3 py-1 text-sm inline-flex items-center gap-1.5">
                <QuizIcon iconUrl={specialThemeInfo.iconUrl} fallback={specialThemeInfo.icon} size={18} />
                {locale === 'ru' ? specialThemeInfo.titleRu : specialThemeInfo.titleEn}
              </span>
            ) : (
              <>
                {diffInfo && (
                  <span className="glass-badge px-3 py-1 text-sm inline-flex items-center gap-1.5">
                    <DifficultyIcon difficulty={diffInfo.id} size={12} />
                    {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                  </span>
                )}
                {topicInfo && (
                  <span className="glass-badge px-3 py-1 text-sm inline-flex items-center gap-1.5">
                    <QuizIcon iconUrl={topicInfo.iconUrl} fallback={topicInfo.icon} size={18} />
                    {locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn}
                  </span>
                )}
              </>
            )}
          </div>
```

Замени на (оставь только заголовок):
```tsx
            <h1 className="text-3xl font-bold">{gameTitle}</h1>
          </div>
```

---

## Правка 2: добавить инфо про вопросы и игроков в центр waiting-экрана

На мобильной версии waiting-экран показывает:
- "X вопросов. 1 очко за правильный ответ!"
- "Игроков: N"

Нужно те же поля на игровом поле (TV) в waiting-фазе.

Найди конец блока бейджей в центре (около строк 619-635), в частности закрытие
перед `</div>` waiting-блока:
```tsx
              ) : (diffInfo || topicInfo) && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  {diffInfo && (
                    <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 text-lg font-semibold inline-flex items-center gap-2">
                      <DifficultyIcon difficulty={diffInfo.id} size={16} />
                      {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                    </span>
                  )}
                  {topicInfo && (
                    <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 text-lg font-semibold inline-flex items-center">
                      {locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
```

Вставь блок инфо ПОСЛЕ закрытия `)}` бейджей и ПЕРЕД `</div>` waiting-блока:
```tsx
              ) : (diffInfo || topicInfo) && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  {diffInfo && (
                    <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 text-lg font-semibold inline-flex items-center gap-2">
                      <DifficultyIcon difficulty={diffInfo.id} size={16} />
                      {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                    </span>
                  )}
                  {topicInfo && (
                    <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 text-lg font-semibold inline-flex items-center">
                      {locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn}
                    </span>
                  )}
                </div>
              )}
              {quizState.phase === 'waiting' && (
                <div className="mt-8 space-y-2">
                  <p className="text-2xl text-white/90">
                    {locale === 'ru'
                      ? `${quizState.totalQuestions} вопросов. 1 очко за правильный ответ!`
                      : `${quizState.totalQuestions} questions. 1 point for each correct answer!`}
                  </p>
                  <p className="text-xl text-white/70">
                    {locale === 'ru' ? `Игроков: ${totalPlayers}` : `Players: ${totalPlayers}`}
                  </p>
                </div>
              )}
            </div>
          )}
```

`quizState.totalQuestions` и `totalPlayers` уже доступны в этой области (используются
в шапке для фазы question).

---

## Whitelist файлов
- `src/app/tv/[roomId]/[gameType]/page.tsx`

## Важно
После удаления header-бейджей `QuizIcon` и `DifficultyIcon` всё ещё используются
в центре waiting-экрана — импорты НЕ удалять.

## Не трогать
- Центральные бейджи (только что отредактированы), final/question/countdown фазы
- Другие игры, CLAUDE.md, AGENTS.md, codex-tasks/

## Acceptance criteria
- `npm run lint` — чистый
- В шапке TV нет бейджей сложности/темы (только иконка + заголовок)
- В waiting-фазе TV показаны "X вопросов..." и "Игроков: N"

## Отчёт
Сохрани в `codex-reports/193-tv-remove-header-badges-add-info.md`
