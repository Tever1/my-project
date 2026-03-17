export type GameType = 'quiz' | 'hundred-to-one' | 'crocodile' | 'truth-or-dare' | 'mafia' | 'who-am-i';

export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

export interface GameInfo {
  id: GameType;
  titleRu: string;
  titleEn: string;
  descriptionRu: string;
  descriptionEn: string;
  minPlayers: number;
  maxPlayers: number;
  icon: string;
}

export interface GameState {
  type: GameType;
  status: GameStatus;
  round: number;
  totalRounds: number;
  scores: Record<string, number>;
  data: Record<string, unknown>;
}

export interface QuizQuestion {
  id: string;
  questionRu: string;
  questionEn: string;
  options: { ru: string; en: string }[];
  correctIndex: number;
  timeLimit: number;
}

export interface HundredToOneQuestion {
  id: string;
  questionRu: string;
  questionEn: string;
  answers: { textRu: string; textEn: string; points: number }[];
}

export type MafiaRole = 'citizen' | 'mafia' | 'detective' | 'doctor';
export type MafiaPhase = 'night' | 'day' | 'voting' | 'results';
