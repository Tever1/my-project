import { io, Socket } from 'socket.io-client';

// IMPORTANT: Change this to your server's IP address
// When running on your local network, use your Mac's IP (e.g., 192.168.1.X)
// When deployed, use your server's public URL
export const SERVER_URL = 'http://192.168.1.100:3000';

let socket: Socket | null = null;

export function getServerUrl(): string {
  return SERVER_URL;
}

export function setServerUrl(url: string): void {
  // If you need to change the URL at runtime
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL, {
      path: '/api/socketio',
      autoConnect: false,
      transports: ['websocket'],
    });
  }
  return socket;
}

export function connectSocket(): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
