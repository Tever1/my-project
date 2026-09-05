# TASK-049: Auth modal — фон менее прозрачный + авто +7 + плейсхолдер при очистке

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Изменение 1: Фон панели чуть менее прозрачный

В функции `AuthDropdown`, переменная `panelStyle` (~строка 1285):

```ts
background: 'rgba(255,255,255,0.08)',
```
→
```ts
background: 'rgba(255,255,255,0.28)',
```

---

## Изменение 2+3: formatPhone — авто +7 и пустая строка при очистке

Текущая функция `formatPhone` (~строка 1219):

```ts
const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 1) return '+' + digits;
  if (digits.length <= 4) return `+${digits.slice(0, 1)} (${digits.slice(1)}`;
  if (digits.length <= 7) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return `+${digits.slice(0, 1)} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
};
```

Заменить на:

```ts
const formatPhone = (value: string) => {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  // Auto-prepend country code 7 if missing
  if (digits[0] !== '7') digits = '7' + digits;
  digits = digits.slice(0, 11);
  if (digits.length <= 1) return '+' + digits;
  if (digits.length <= 4) return `+${digits[0]} (${digits.slice(1)}`;
  if (digits.length <= 7) return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4)}`;
  if (digits.length <= 9) return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
};
```

**Что изменилось:**
- `digits.length === 0` → возвращаем `''` (пустая строка), input очищается, placeholder снова виден
- `digits[0] !== '7'` → автоматически добавляем `'7'` спереди, поэтому набрав `9161234567` сразу получим `+7 (916) 123-45-67`
- Лимит 11 цифр (7 + 10 знаков)

---

## Acceptance

- `npx tsc --noEmit` без ошибок
- Фон панели стал заметно менее прозрачным
- Набрав `9161234567` получаем `+7 (916) 123-45-67`
- При удалении всего текста поле пустое, placeholder `+7 (999) 123-45-67` виден

## Не трогать

- `handleSendCode` — там уже правильный `phone.replace(/\D/g, '')`, он не меняется
- Всё кроме `panelStyle.background` и функции `formatPhone`

## Отчёт

`codex-reports/049-auth-modal-phone-ux.md`
