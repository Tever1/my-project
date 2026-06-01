# TASK-184: Fix QR code URL — always use server's local network IP

## Цель
QR-код в попапе комнаты берёт `window.location.origin`, поэтому если хост открыл
браузер по `localhost:3000`, QR генерирует `localhost` — телефон не может открыть.
Нужно чтобы QR всегда показывал реальный сетевой IP сервера.

## Решение
1. Создать API-эндпоинт `GET /api/local-ip` — возвращает `{ ip: string }` (первый
   non-loopback IPv4 адрес сетевого интерфейса).
2. В `Lobby.tsx` при монтировании (или при открытии попапа комнаты) fetch-ить этот
   эндпоинт. Если запрос успешен — использовать IP из него вместо
   `window.location.origin` для QR URL. Если упал — fallback на `window.location.origin`.

## Whitelist файлов
- `src/app/api/local-ip/route.ts` (НОВЫЙ файл)
- `src/components/lobby/Lobby.tsx`

## Детали реализации

### src/app/api/local-ip/route.ts
```ts
import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const interfaces = os.networkInterfaces();
  let localIp = '';
  for (const iface of Object.values(interfaces)) {
    for (const alias of iface ?? []) {
      if (alias.family === 'IPv4' && !alias.internal) {
        localIp = alias.address;
        break;
      }
    }
    if (localIp) break;
  }
  return NextResponse.json({ ip: localIp });
}
```

### src/components/lobby/Lobby.tsx
Найди место где определяется `siteUrl` (около строк 822-825):
```ts
const siteUrl =
  (typeof window !== "undefined" ? window.location.origin : "");
const joinUrl = `${siteUrl}/join/${roomCode}`;
```

Добавь state `localIp` в компонент (вверху где другие useState):
```ts
const [localIp, setLocalIp] = useState<string>('');
```

Добавь useEffect для fetch (рядом с другими useEffect):
```ts
useEffect(() => {
  fetch('/api/local-ip')
    .then(r => r.json())
    .then((data: { ip: string }) => { if (data.ip) setLocalIp(data.ip); })
    .catch(() => {});
}, []);
```

Замени вычисление `siteUrl` и `joinUrl`:
```ts
const port = typeof window !== 'undefined' ? window.location.port : '3000';
const siteUrl = localIp
  ? `http://${localIp}${port ? `:${port}` : ''}`
  : (typeof window !== 'undefined' ? window.location.origin : '');
const joinUrl = `${siteUrl}/join/${roomCode}`;
```

## Acceptance criteria
- `curl http://localhost:3000/api/local-ip` возвращает `{"ip":"192.168.0.94"}` (или актуальный IP)
- QR-код в попапе комнаты всегда содержит реальный IP, даже если браузер открыт по `localhost`
- Телефон на том же WiFi может открыть ссылку из QR

## Не трогать
- Логику комнаты, сокеты, игры
- CLAUDE.md, AGENTS.md, codex-tasks/

## Отчёт
Сохрани в `codex-reports/184-fix-qr-local-ip.md`
