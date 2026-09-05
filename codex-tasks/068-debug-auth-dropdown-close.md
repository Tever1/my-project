# TASK-068: Debug — добавить логи в AuthDropdown для трассировки закрытия

## Цель
Найти почему `AuthDropdown` закрывается до показа шага `nickname`.
Добавить временные `console.log` в 4 места. **Не коммитить.**

## Whitelist файлов
- `src/components/lobby/Lobby.tsx` — только этот файл

## Изменения

### 1. В `useEffect` mousedown-обработчика (около строки 1227)
Найди:
```ts
if (ref.current && !ref.current.contains(e.target as Node)) {
  onClose();
}
```
Замени на:
```ts
if (ref.current && !ref.current.contains(e.target as Node)) {
  console.log('[AuthDropdown] mousedown OUTSIDE → onClose called. target:', e.target, new Error().stack);
  onClose();
}
```

### 2. В начало `handleVerifyCode` (около строки 1269)
Найди:
```ts
const handleVerifyCode = async () => {
  if (code.length < 4) {
```
После первой строки добавь:
```ts
console.log('[AuthDropdown] handleVerifyCode start, step:', step, 'code:', code);
```

### 3. После `setStep('nickname')` (около строки 1279)
Найди:
```ts
if (ok) {
  setStep('nickname');
  setError('');
}
```
Добавь лог перед `setStep`:
```ts
if (ok) {
  console.log('[AuthDropdown] verifyCode OK → setStep nickname');
  setStep('nickname');
  setError('');
}
```

### 4. В начало `handleSetNickname` (около строки 1286)
Найди:
```ts
const handleSetNickname = () => {
  if (nickname.trim().length < 2) {
```
После первой строки добавь:
```ts
console.log('[AuthDropdown] handleSetNickname called, nickname length:', nickname.trim().length);
```

## Acceptance
- Сервер запускается без ошибок
- В DevTools Console при сценарии re-login видны логи `[AuthDropdown]`
- Не коммитить (временная диагностика)
