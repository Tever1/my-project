export interface Player {
  id: string;
  nickname: string;
  phone?: string;
  avatar?: string;
  isHost: boolean;
  isConnected: boolean;
  team?: string;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  players: Player[];
  maxPlayers: number;
  status: 'lobby' | 'in-game' | 'finished';
  currentGame: string | null;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  timestamp: number;
}
