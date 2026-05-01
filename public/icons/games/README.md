# Game icons — drop your final PNGs here

Эта папка читается компонентом `<GameIcon>` (`src/components/GameIcon.tsx`).
Пока иконки нет — рендерится SVG-заглушка с цветом игры и инициалом.
Как только PNG появляется — подхватывается автоматически без правок кода.

## Имена файлов (точно такие, регистр важен)

| Игра | Файл |
|---|---|
| Квиз | `quiz.png` |
| Мафия | `mafia.png` |
| Крокодил | `crocodile.png` |
| Шпион | `spy.png` |
| Alias | `alias.png` |
| Кто я? | `who-am-i.png` |
| 100 к 1 | `hundred-to-one.png` |

## Требования к PNG

- **Формат**: PNG с прозрачным фоном (alpha-каналом)
- **Размер источника**: 1024×1024 px (квадрат, 1:1)
- **Subject заполняет**: 75–85% канваса (чтобы хорошо смотрелось при overflow за рамку тайла)
- **Без текста**, без watermark
- Ничего на фоне — только сам объект

## Как сгенерировать через Nano Banana

```bash
npm run gen-icon -- --subject "<описание>" --style <style> --accent "<hex>" --out games --name <gameId>
```

Доступные стили: `flat-3d`, `glassy`, `glassy-glow`, `glassy-noglow`,
`illustrative`, `mixed-3d` (см. `scripts/generate-icon.mjs`).

`--out games` сохранит сразу в `public/icons/games/<name>.png` (а не в `test/`).

Пример для Mafia:
```bash
npm run gen-icon -- \
  --subject "elegant mafia gentleman silhouette in white fedora and white suit" \
  --style glassy-glow \
  --accent "#dc2626" \
  --out games \
  --name mafia
```

## Где это используется

- `<GameIcon gameId="mafia" size={96} />` — главный API
- `/lobby-preview` — превью лобби со всеми 7 тайлами
- Будет в `/lobby` после Phase D
