# TASK-030 — Фикс QR-кода: использовать реальный IP вместо localhost

**Статус:** active
**Автор:** Claude (orchestrator)
**Назначено:** Codex

---

## Проблема

QR-код в popup-меню комнаты формируется через `window.location.origin` →
`http://localhost:3000/lobby/CODE`. Телефон в локальной сети не резолвит
`localhost`, и гость получает нерабочую ссылку.

Нужно: QR содержит `http://192.168.x.x:3000/lobby/CODE` — реальный IP машины.

---

## Решение

1. Новый API-эндпоинт `GET /api/local-ip` — сервер читает
   `os.networkInterfaces()` и возвращает первый non-internal IPv4-адрес.
2. `RoomMenu` в `Lobby.tsx` фетчит этот эндпоинт при монте и подставляет IP
   в `joinUrl`.

---

## Whitelist файлов

- `src/app/api/local-ip/route.ts` — **создать новый**
- `src/components/lobby/Lobby.tsx` — изменить `RoomMenu` (строки 1370–1386)

**Не трогать никакие другие файлы.**

---

## Что сделать

### 1. Новый файл `src/app/api/local-ip/route.ts`

```ts
import os from 'os';
import { NextResponse } from 'next/server';

export async function GET() {
  const nets = os.networkInterfaces();
  let ip: string | null = null;

  for (const ifaces of Object.values(nets)) {
    if (!ifaces) continue;
    for (const iface of ifaces) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ip = iface.address;
        break;
      }
    }
    if (ip) break;
  }

  return NextResponse.json({ ip: ip ?? 'localhost' });
}
```

Логика:
- Перебирает все сетевые интерфейсы.
- Возвращает первый **non-internal IPv4** адрес (обычно это Wi-Fi или LAN).
- Если ничего нет (headless server без сети) — fallback `localhost`.

### 2. Изменить `RoomMenu` в `src/components/lobby/Lobby.tsx`

**Было** (строка 1380):
```ts
const joinUrl = typeof window === "undefined" ? "" : `${window.location.origin}/lobby/${roomCode}`;
```

**Стало** — добавить state + useEffect в `RoomMenu`, перед строкой 1381:

```ts
const [localIp, setLocalIp] = useState<string | null>(null);

useEffect(() => {
  fetch('/api/local-ip')
    .then(r => r.json())
    .then(data => setLocalIp(data.ip))
    .catch(() => setLocalIp(null));
}, []);

const origin = localIp
  ? `http://${localIp}:${typeof window !== 'undefined' ? window.location.port || '3000' : '3000'}`
  : typeof window !== 'undefined' ? window.location.origin : '';

const joinUrl = roomCode ? `${origin}/lobby/${roomCode}` : '';
```

Логика:
- Пока IP не загружен (`localIp === null`) — `joinUrl` строится через `window.location.origin`
  (текущее поведение, QR всё равно виден сразу).
- Как только приходит ответ от `/api/local-ip` — `joinUrl` обновляется с реальным IP.
- Port берётся из `window.location.port` (Turbopack может запускаться не только на 3000).
  Если порт пустой (80/443) — fallback `3000`.
- `useState` и `useEffect` уже импортированы в файле — не нужны новые импорты.

---

## Acceptance criteria

- `npm run lint` — 0 problems.
- `npx tsc --noEmit` — 0 errors.
- `GET /api/local-ip` возвращает `{"ip":"192.168.x.x"}` (или `{"ip":"localhost"}`
  если сети нет).
- В popup-меню комнаты QR-код содержит IP-адрес, а не `localhost`.
- Если `/api/local-ip` упал (fetch error) — QR продолжает работать
  через `window.location.origin` (graceful fallback).

---

## Не делать

- Не трогать `src/app/tv/[roomId]/page.tsx` (там свой `QRCodeCanvas` — отдельная история).
- Не кешировать IP на сервере — каждый запрос читает свежие интерфейсы.
- Не добавлять env-переменных.
- Не коммитить.

---

## Отчёт

После выполнения создать `codex-reports/030-local-ip-qr-fix.md` с:
- Список изменённых/созданных файлов.
- Реальный вывод `GET /api/local-ip` на тестовой машине.
- Результаты `npm run lint` и `npx tsc --noEmit`.
- Любые отклонения от ТЗ.
