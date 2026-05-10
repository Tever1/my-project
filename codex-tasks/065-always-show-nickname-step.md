# TASK-065: Fix — всегда показывать шаг nickname при входе

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Изменение (~строка 1281)

Найти в функции `handleVerifyCode` внутри `AuthDropdown`:

```ts
    const ok = await verifyCode(digits, code);
    setLoading(false);
    if (ok) {
      const existingRaw = localStorage.getItem(`party-hub-user-${digits}`);
      const hasNickname = existingRaw
        ? ((JSON.parse(existingRaw) as { nickname?: string }).nickname?.length ?? 0) >= 2
        : false;
      if (hasNickname) {
        onClose();
      } else {
        setStep('nickname');
      }
      setError('');
    } else {
      setError('Неверный код');
    }
```

Заменить на:

```ts
    const ok = await verifyCode(digits, code);
    setLoading(false);
    if (ok) {
      setStep('nickname');
      setError('');
    } else {
      setError('Неверный код');
    }
```

**Почему:** каждый вход должен проходить через шаг ввода имени, как будто
первый раз. Пропуск шага для возвращающихся пользователей был ошибочным.

---

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- После ввода кода всегда появляется шаг «Как вас зовут?»

## Не трогать

- Всё остальное

## Отчёт

`codex-reports/065-always-show-nickname-step.md`
