# TASK-056: Auth modal — валидация 11 цифр + тёмный фон кнопки «Назад»

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Изменение 1: Валидация телефона (~строка 1242)

Найти в `handleSendCode`:

```ts
if (digits.length < 10) {
```

Заменить на:

```ts
if (digits.length < 11) {
```

**Почему:** `formatPhone` автоматически добавляет '7' спереди, поэтому при вводе 10 цифр пользователем в `phone` хранится уже 11 цифр. Валидация `< 10` пропускает неполный номер.

---

## Изменение 2: Тёмный мат на кнопку «Назад» (~строка 1322)

В функции `btnStyle` в `AuthDropdown` изменить secondary-ветвь:

```ts
background: primary ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.30)',
border: primary ? 'none' : '1px solid rgba(255,255,255,0.25)',
color: primary ? '#06060c' : 'rgba(255,255,255,0.75)',
```

→

```ts
background: primary ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.32)',
border: primary ? 'none' : '1px solid rgba(255,255,255,0.22)',
color: primary ? '#06060c' : 'rgba(255,255,255,1)',
```

**Что изменилось:** тёмный мат `rgba(0,0,0,0.32)` — как у игровых чипов в lobby preview. Текст чисто белый для контраста.

---

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- В diff ровно 2 изменения: строка с `< 10` и строки в `btnStyle`

## Не трогать

- Всё кроме двух описанных мест

## Отчёт

`codex-reports/056-auth-phone-validation-back-dark.md`
