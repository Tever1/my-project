import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface Player {
  id: string;
  socketId: string;
  nickname: string;
  isHost: boolean;
  isConnected: boolean;
  isAway: boolean;
  role: 'tv' | 'player';
  team?: string;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Map<string, Player>;
  maxPlayers: number;
  status: 'lobby' | 'in-game' | 'finished';
  currentGame: string | null;
  gameState: Record<string, unknown> | null;
  tvSocketId: string | null;
  createdAt: number;
  kickedPlayerIds: Set<string>;
  gameHostPlayerId: string | null;
}

const rooms = new Map<string, Room>();
const playerRooms = new Map<string, string>();
const presenceSubscribers = new Set<string>();

// Expose rooms to admin API routes via globalThis (avoids ESM/CJS boundary issues).
// rooms-registry.ts reads from this same key using getRoomsSnapshot().
(globalThis as Record<string, unknown>)['__partyGamesRoomsProvider__'] = () =>
  Array.from(rooms.values()).map((room) => ({
    code: room.code,
    status: room.status,
    currentGame: room.currentGame,
    playerCount: room.players.size,
    players: Array.from(room.players.values()).map((p) => ({
      nickname: p.nickname,
      isHost: p.isHost,
      isConnected: p.isConnected,
      isAway: p.isAway,
    })),
    createdAt: room.createdAt,
  }));

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return rooms.has(code) ? generateRoomCode() : code;
}

function getRoomByCode(code: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.code === code) return room;
  }
  return undefined;
}

function broadcastRoomState(io: SocketIOServer, room: Room) {
  const allPlayers = Array.from(room.players.values());
  const tvConnected = allPlayers.some((p) => p.role === 'tv' && p.isConnected);
  const players = allPlayers
    .filter((p) => p.role !== 'tv')
    .map(({ socketId: _socketId, ...rest }) => {
      void _socketId;
      return rest;
    });
  const state = {
    id: room.id,
    code: room.code,
    hostId: room.hostId,
    players,
    maxPlayers: room.maxPlayers,
    status: room.status,
    currentGame: room.currentGame,
    gameState: room.gameState,
    tvConnected,
    gameHostPlayerId: room.gameHostPlayerId,
  };
  io.to(`room:${room.code}`).emit('room:state', state);
}

function emitPresenceCount(io: SocketIOServer) {
  const count = io.engine.clientsCount;
  for (const socketId of presenceSubscribers) {
    io.to(socketId).emit('presence:count', { count });
  }
}

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    emitPresenceCount(io);

    socket.on('presence:subscribe', () => {
      presenceSubscribers.add(socket.id);
      emitPresenceCount(io);
    });

    // Create room
    socket.on('room:create', (data: { playerId: string; nickname: string; role?: 'tv' | 'player' }, callback) => {
      const code = generateRoomCode();
      const room: Room = {
        id: uuidv4(),
        code,
        hostId: data.playerId,
        players: new Map(),
        maxPlayers: 20,
        status: 'lobby',
        currentGame: null,
        gameState: null,
        tvSocketId: null,
        createdAt: Date.now(),
        kickedPlayerIds: new Set<string>(),
        gameHostPlayerId: null,
      };

      const player: Player = {
        id: data.playerId,
        socketId: socket.id,
        nickname: data.nickname,
        isHost: true,
        isConnected: true,
        isAway: false,
        role: data.role ?? 'player',
      };

      room.players.set(data.playerId, player);
      rooms.set(room.code, room);
      playerRooms.set(socket.id, room.code);
      socket.join(`room:${code}`);

      callback({ success: true, code, roomId: room.id });
      broadcastRoomState(io, room);
    });

    // Join room
    socket.on('room:join', (data: { code: string; playerId: string; nickname: string; isReconnect?: boolean; role?: 'tv' | 'player' }, callback) => {
      const room = getRoomByCode(data.code.toUpperCase());
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }

      // Kicked-list check: auto-reconnect for a previously kicked player must fail.
      // Manual join (isReconnect=false) clears the kicked flag and proceeds normally.
      if (room.kickedPlayerIds.has(data.playerId)) {
        if (data.isReconnect) {
          callback({ success: false, error: 'Player was removed due to inactivity' });
          return;
        }
        room.kickedPlayerIds.delete(data.playerId);
      }

      const existingPlayer = room.players.get(data.playerId);

      // Allow existing players to reconnect even mid-game; block only new players
      if (room.status === 'in-game' && !existingPlayer) {
        callback({ success: false, error: 'Game already in progress' });
        return;
      }
      if (room.players.size >= room.maxPlayers && !existingPlayer) {
        callback({ success: false, error: 'Room is full' });
        return;
      }

      if (existingPlayer) {
        if (existingPlayer.reconnectTimer) {
          clearTimeout(existingPlayer.reconnectTimer);
          existingPlayer.reconnectTimer = undefined;
        }
        existingPlayer.socketId = socket.id;
        existingPlayer.isConnected = true;
        existingPlayer.isAway = false;
      } else {
        const player: Player = {
          id: data.playerId,
          socketId: socket.id,
          nickname: data.nickname,
          isHost: false,
          isConnected: true,
          isAway: false,
          role: data.role ?? 'player',
        };
        room.players.set(data.playerId, player);
        // First phone player becomes the game host for starting the selected game.
        if (player.role === 'player' && room.gameHostPlayerId === null) {
          room.gameHostPlayerId = player.id;
        }
      }

      playerRooms.set(socket.id, room.code);
      socket.join(`room:${room.code}`);
      callback({ success: true, code: room.code, roomId: room.id });
      broadcastRoomState(io, room);
    });

    // TV mode join
    socket.on('tv:join', (data: { code: string }, callback) => {
      const room = getRoomByCode(data.code.toUpperCase());
      if (!room) {
        callback({ success: false, error: 'Room not found' });
        return;
      }
      room.tvSocketId = socket.id;
      playerRooms.set(socket.id, room.code);
      socket.join(`room:${room.code}`);
      callback({ success: true });
      broadcastRoomState(io, room);
    });

    // Request current room state
    socket.on('room:get-state', (data: { code: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) {
        socket.emit('room:not-found', { code: data.code });
        return;
      }
      const allPlayers = Array.from(room.players.values());
      const tvConnected = allPlayers.some((p) => p.role === 'tv' && p.isConnected);
      const players = allPlayers
        .filter((p) => p.role !== 'tv')
        .map(({ socketId: _socketId, ...rest }) => {
          void _socketId;
          return rest;
        });
      const state = {
        id: room.id,
        code: room.code,
        hostId: room.hostId,
        players,
        maxPlayers: room.maxPlayers,
        status: room.status,
        currentGame: room.currentGame,
        gameState: room.gameState,
        tvConnected,
        gameHostPlayerId: room.gameHostPlayerId,
      };
      socket.emit('room:state', state);
    });

    // Select game
    socket.on('game:select', (data: { code: string; gameType: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      room.currentGame = data.gameType;
      broadcastRoomState(io, room);
    });

    // Start game
    socket.on('game:start', (data: { code: string }) => {
      const room = getRoomByCode(data.code);
      if (!room || !room.currentGame) return;
      room.status = 'in-game';
      room.gameState = { type: room.currentGame, status: 'playing', round: 1 };
      broadcastRoomState(io, room);
      io.to(`room:${room.code}`).emit('game:started', {
        gameType: room.currentGame,
        roomCode: room.code,
      });
    });

    // Game action (generic handler for all games)
    socket.on('game:action', (data: { code: string; action: string; payload: Record<string, unknown> }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;

      // Broadcast game action to all players in the room
      io.to(`room:${room.code}`).emit('game:action', {
        action: data.action,
        payload: data.payload,
        from: socket.id,
      });
    });

    // Update game state (from host)
    socket.on('game:state-update', (data: { code: string; gameState: Record<string, unknown> }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      room.gameState = data.gameState;
      broadcastRoomState(io, room);
    });

    // End game
    socket.on('game:end', (data: { code: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      room.status = 'lobby';
      room.currentGame = null;
      room.gameState = null;
      broadcastRoomState(io, room);
      io.to(`room:${room.code}`).emit('game:ended');
    });

    // Chat message
    socket.on('chat:message', (data: { code: string; playerId: string; playerName: string; text: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      io.to(`room:${room.code}`).emit('chat:message', {
        id: uuidv4(),
        playerId: data.playerId,
        playerName: data.playerName,
        text: data.text,
        timestamp: Date.now(),
      });
    });

    // Kick player
    socket.on('room:kick', (data: { code: string; playerId: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      const player = room.players.get(data.playerId);
      if (player) {
        io.to(player.socketId).emit('room:kicked');
        room.players.delete(data.playerId);
        broadcastRoomState(io, room);
      }
    });

    // Transfer host
    socket.on('room:transfer-host', (data: { code: string; newHostId: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      const currentHost = room.players.get(room.hostId);
      const newHost = room.players.get(data.newHostId);
      if (!currentHost || !newHost) return;
      currentHost.isHost = false;
      newHost.isHost = true;
      room.hostId = data.newHostId;
      broadcastRoomState(io, room);
    });

    // Show QR screen on TV lobby when host/game-host wants to add players.
    socket.on('room:show-qr', (data: { code: string }) => {
      const room = getRoomByCode(data.code);
      if (!room) return;
      io.to(`room:${room.code}`).emit('room:show-qr');
    });

    // Leave room
    socket.on('room:leave', () => {
      handleDisconnect(io, socket, true);
    });

    socket.on('player:away', () => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;
      const room = getRoomByCode(roomCode);
      if (!room) return;
      for (const player of room.players.values()) {
        if (player.socketId === socket.id) {
          if (!player.isAway) {
            player.isAway = true;
            broadcastRoomState(io, room);
          }
          return;
        }
      }
    });

    socket.on('player:back', () => {
      const roomCode = playerRooms.get(socket.id);
      if (!roomCode) return;
      const room = getRoomByCode(roomCode);
      if (!room) return;
      for (const player of room.players.values()) {
        if (player.socketId === socket.id) {
          if (player.isAway) {
            player.isAway = false;
            broadcastRoomState(io, room);
          }
          return;
        }
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      presenceSubscribers.delete(socket.id);
      handleDisconnect(io, socket);
      emitPresenceCount(io);
    });
  });
}

function handleDisconnect(io: SocketIOServer, socket: Socket, explicit = false) {
  const roomCode = playerRooms.get(socket.id);
  if (!roomCode) return;

  const room = getRoomByCode(roomCode);
  if (!room) return;

  // Check if it's a TV socket
  if (room.tvSocketId === socket.id) {
    room.tvSocketId = null;
    playerRooms.delete(socket.id);
    broadcastRoomState(io, room);
    return;
  }

  // Find player by socketId
  for (const [playerId, player] of room.players.entries()) {
    if (player.socketId === socket.id) {
      player.isConnected = false;

      if (explicit) {
        room.players.delete(playerId);
        playerRooms.delete(socket.id);
        if (room.players.size === 0) {
          rooms.delete(roomCode);
          return;
        }
        broadcastRoomState(io, room);
        return;
      }

      // Broadcast immediately so other clients see the grayscale avatar.
      broadcastRoomState(io, room);

      // Cancel any existing grace-period timer before starting a new one.
      // Mobile may disconnect/reconnect multiple times; only the latest timer counts.
      if (player.reconnectTimer) clearTimeout(player.reconnectTimer);

      // Unexpected disconnect with other players present keeps the reconnect grace period.
      player.reconnectTimer = setTimeout(() => {
        if (!player.isConnected) {
          // Transfer host role only after grace period expires (player never came back).
          if (player.isHost && room.players.size > 1) {
            player.isHost = false;
            for (const [, p] of room.players.entries()) {
              if (p.id !== playerId && p.isConnected) {
                p.isHost = true;
                room.hostId = p.id;
                break;
              }
            }
            broadcastRoomState(io, room);
          }

          // Mark as kicked so auto-reconnect (isReconnect=true) is refused.
          // Manual re-join via code input/QR clears this flag.
          room.kickedPlayerIds.add(playerId);
          room.players.delete(playerId);
          if (room.players.size === 0) {
            rooms.delete(roomCode);
          } else {
            broadcastRoomState(io, room);
          }
        }
      }, 300000); // 5 min grace — mobile browsers kill WS when backgrounded

      break;
    }
  }

  playerRooms.delete(socket.id);
  broadcastRoomState(io, room);
}
