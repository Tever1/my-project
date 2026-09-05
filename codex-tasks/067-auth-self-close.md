# TASK-067: AuthDropdown сам управляет своим закрытием

## Файлы

**Whitelist:** только `src/components/lobby/Lobby.tsx`

---

## Проблема

Lobby имеет эффект, который автоматически закрывает AuthDropdown когда у user
появляется nickname. Это создаёт race condition: после второго входа эффект
срабатывает и закрывает дропдаун до того, как пользователь увидит шаг ввода
имени. Архитектурно неправильно — родитель не должен управлять lifecycle
дочернего дропдауна на основе глобального state.

## Изменение 1: Удалить auto-close эффект (~строка 241)

Найти в `Lobby` (~строка 241-243):

```ts
  useEffect(() => {
    if (user?.nickname) queueMicrotask(() => setAuthMenuOpen(false));
  }, [user?.nickname]);
```

**Удалить полностью** (вместе с пустой строкой после).

## Изменение 2: handleSetNickname закрывает сам (~строка 1290)

Найти в `AuthDropdown`:

```ts
  const handleSetNickname = () => {
    if (nickname.trim().length < 2) {
      setError('Минимум 2 символа');
      return;
    }
    updateNickname(nickname.trim());
  };
```

Заменить на:

```ts
  const handleSetNickname = () => {
    if (nickname.trim().length < 2) {
      setError('Минимум 2 символа');
      return;
    }
    updateNickname(nickname.trim());
    onClose();
  };
```

**Что изменилось:** AuthDropdown сам вызывает `onClose()` после успешного
сохранения nickname. Lobby больше не следит за `user?.nickname`.

---

## Acceptance

- `npx tsc --noEmit` без ошибок
- `npm run lint` без ошибок
- Второй вход без refresh: phone → code → **появляется шаг nickname** → ввод имени → меню закрывается
- AvatarPill показывает новое имя

## Не трогать

- Всё остальное

## Отчёт

`codex-reports/067-auth-self-close.md`
