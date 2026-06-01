# TASK-191: Обычные квизы — бейджи сложности и темы как в спец-квизах

## Контекст
В TASK-190 бейдж спец-квиза на экранах ожидания привели к виду:
`rounded-md border border-white/10 bg-white/5 backdrop-blur-xl ... font-semibold` без иконки.

Теперь то же самое нужно для бейджей ОБЫЧНЫХ квизов (сложность + тема) в waiting-фазе:
убрать иконки (`DifficultyIcon`, `QuizIcon`) и сменить `glass-badge` (таблетка) на
`rounded-md` стиль ответов квиза.

ВАЖНО: только waiting-фаза, только ветка general (diffInfo/topicInfo). НЕ трогать
final-фазу и НЕ трогать specialThemeInfo-ветку.

---

### 1. `src/app/game/[roomId]/quiz/page.tsx` (мобильный waiting)

Найди (около строки 686-699):
```tsx
            ) : (
              <>
                {diffInfo && (
                  <span className="glass-badge px-5 py-2.5 text-lg inline-flex items-center gap-2">
                    <DifficultyIcon difficulty={diffInfo.id} size={16} />
                    {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                  </span>
                )}
                {topicInfo && (
                  <span className="glass-badge px-5 py-2.5 text-lg inline-flex items-center gap-2">
                    <QuizIcon iconUrl={topicInfo.iconUrl} fallback={topicInfo.icon} size={20} />
                    {locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn}
                  </span>
                )}
              </>
            )}
```

Замени на (убраны иконки, glass-badge → rounded-md):
```tsx
            ) : (
              <>
                {diffInfo && (
                  <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-2.5 text-lg font-semibold inline-flex items-center">
                    {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                  </span>
                )}
                {topicInfo && (
                  <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-2.5 text-lg font-semibold inline-flex items-center">
                    {locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn}
                  </span>
                )}
              </>
            )}
```

---

### 2. `src/app/tv/[roomId]/[gameType]/page.tsx` (TV waiting)

Найди (около строки 619-633):
```tsx
              ) : (diffInfo || topicInfo) && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  {diffInfo && (
                    <span className="glass-badge px-4 py-2 text-lg inline-flex items-center gap-2">
                      <DifficultyIcon difficulty={diffInfo.id} size={16} />
                      {locale === 'ru' ? diffInfo.titleRu : diffInfo.titleEn}
                    </span>
                  )}
                  {topicInfo && (
                    <span className="glass-badge px-4 py-2 text-lg inline-flex items-center gap-2">
                      <QuizIcon iconUrl={topicInfo.iconUrl} fallback={topicInfo.icon} size={24} />
                      {locale === 'ru' ? topicInfo.titleRu : topicInfo.titleEn}
                    </span>
                  )}
                </div>
              )}
```

Замени на:
```tsx
              ) : (diffInfo || topicInfo) && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  {diffInfo && (
                    <span className="rounded-md border border-white/10 bg-white/5 backdrop-blur-xl px-4 py-2 text-lg font-semibold inline-flex items-center">
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
```

---

## Whitelist файлов
- `src/app/game/[roomId]/quiz/page.tsx`
- `src/app/tv/[roomId]/[gameType]/page.tsx`

## Важно про импорты
После удаления `<DifficultyIcon>` из этих мест проверь, используется ли `DifficultyIcon`
ещё где-то в файле (например, в final-фазе). Если используется — ОСТАВЬ импорт и
определение компонента. Если нигде больше не используется и линтер ругается на unused —
тогда удали импорт/определение. То же для `QuizIcon` (он точно используется в spec-ветках
и final — оставить).

## Не трогать
- Final-фазу, specialQuizInfo/specialThemeInfo ветки
- Логику, другие игры
- CLAUDE.md, AGENTS.md, codex-tasks/

## Acceptance criteria
- `npm run lint` — чистый
- В waiting general-бейджах нет `<DifficultyIcon>` / `<QuizIcon>`, класс `rounded-md border border-white/10 bg-white/5 backdrop-blur-xl`

## Отчёт
Сохрани в `codex-reports/191-general-quiz-badges-cleanup.md`
