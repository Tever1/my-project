# TASK-293 — Крокодил: слово реально заполняет ширину (фикс измерения FitText)

## Контекст
После TASK-292 слово в карточке объясняющего центрируется, но НЕ дорастает до
ширины поля — остаётся мелким. Причина: `FitText` меряет `container.clientHeight`
своего корня, у которого `h-full`; в flex-обёртке `items-center` высота
схлопывается до высоты текста, и проверка «влезает по высоте» становится
самоограничивающей — шрифт не доходит до `max=128`.

Фикс: дать измеряющему контейнеру `FitText` явные размеры через
`relative` + `absolute inset-0`, чтобы он мерил полную высоту/ширину красного
поля и масштабировал слово до ширины.

## Что сделать
Файл `src/app/game/[roomId]/crocodile/page.tsx`, explainer-блок (около стр. 561).

Заменить обёртку `FitText`:
```
              <div className="flex flex-1 min-h-0 items-center justify-center py-8">
                <FitText
                  text={locale === 'ru' ? currentWord.ru : currentWord.en}
                  max={128}
                  min={22}
                  className="text-center font-black leading-[0.95]"
                  style={{
                    letterSpacing: '-1.5px',
                    textShadow: '0 3px 16px rgba(0,0,0,.35)',
                  }}
                />
              </div>
```
на:
```
              <div className="relative flex-1 min-h-0 py-8">
                <div className="absolute inset-0 flex items-center justify-center px-2">
                  <FitText
                    text={locale === 'ru' ? currentWord.ru : currentWord.en}
                    max={128}
                    min={22}
                    className="text-center font-black leading-[0.95]"
                    style={{
                      letterSpacing: '-1.5px',
                      textShadow: '0 3px 16px rgba(0,0,0,.35)',
                    }}
                  />
                </div>
              </div>
```
(props FitText не меняем — только структуру обёртки: `relative` + вложенный
`absolute inset-0 flex items-center justify-center px-2`.)

НЕ трогать `FitText.tsx`, остальные карточки, TV, globals.css.

## Whitelist (только эти файлы)
- `src/app/game/[roomId]/crocodile/page.tsx`
- `codex-reports/**` (отчёт)

НЕ трогать: `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**`,
`src/components/games/FitText.tsx`, globals.css, TV-файл.

## Acceptance
- Короткое слово («Светофор») заполняет ширину красного поля (крупное), длинное
  ужимается, всё по центру.
- `npx tsc --noEmit` — без новых ошибок.
- `npm run lint` — без новых ошибок.
- Отчёт в `codex-reports/293-croc-word-fill-width-fix.md`. Не коммитить.
