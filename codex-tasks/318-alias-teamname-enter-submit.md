# TASK-318: Alias "Название команды" — сабмит по Enter

## Контекст

Постоянное правило проекта: любое текстовое поле должно сабмититься по Enter,
не только по клику на кнопку. Компонент `TeamNameInput` в Alias (шаг `teamName`,
TASK-311) — единственное поле в файле без `onKeyDown`-обработчика Enter, только
кнопка "Готово".

## Файл (whitelist — только один)

- `src/app/game/[roomId]/alias/page.tsx`

Конкретно компонент `TeamNameInput`, строки ~84–114:

```tsx
function TeamNameInput({
  defaultValue,
  onSubmit,
  locale,
}: {
  defaultValue: string;
  onSubmit: (name: string) => void;
  locale: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="w-full max-w-md flex flex-col gap-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={10}
        placeholder={locale === 'ru' ? 'Название команды' : 'Team name'}
        className="w-full rounded-[20px] border border-white/20 bg-white/[0.1] px-5 py-4 text-center text-xl font-bold text-white placeholder-white/40 outline-none focus:border-pink-300"
      />
      <GlassButton
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() => onSubmit(value)}
        disabled={!value.trim()}
      >
        {locale === 'ru' ? 'Готово' : 'Done'}
      </GlassButton>
    </div>
  );
}
```

## Что сделать

Добавить на `<input>` обработчик `onKeyDown`: если нажат Enter и `value.trim()`
не пустое — вызвать `onSubmit(value)` (та же логика, что у кнопки "Готово").

```tsx
onKeyDown={(e) => {
  if (e.key === 'Enter' && value.trim()) onSubmit(value);
}}
```

Больше ничего в файле не трогать — ни структуру компонента, ни остальные
поля/фазы (там Enter уже работает везде, проверено).

## Запрещено трогать

- Любые другие файлы.
- `CLAUDE.md`, `AGENTS.md`, `.codex/**`, `codex-tasks/**` (кроме этого файла).

## Acceptance

- `npx tsc --noEmit` чисто.
- `npm run lint` чисто.
- В поле "Название команды" нажатие Enter с непустым значением вызывает тот же
  сабмит, что и кнопка "Готово".

Отчёт — `codex-reports/318-alias-teamname-enter-submit.md`. Не коммитить.
