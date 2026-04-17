export type GameType = 'quiz' | 'hundred-to-one' | 'crocodile' | 'spy' | 'mafia' | 'who-am-i' | 'alias';

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

// Quiz types
export type QuizDifficulty = 'easy' | 'medium' | 'hard';
export type QuizTopic = 'science' | 'history' | 'pop-culture' | 'random' | 'harry-potter' | 'marvel';
export type QuizMode = 'general' | 'special';

export interface QuizQuestion {
  id: string;
  topic: QuizTopic;
  difficulty: QuizDifficulty;
  questionRu: string;
  questionEn: string;
  options: { ru: string; en: string }[];
  correctIndex: number;
  timeLimit: number;
}

export interface QuizTopicInfo {
  id: QuizTopic;
  titleRu: string;
  titleEn: string;
  icon: string;
  backgroundUrl?: string;
}

export interface QuizState extends GameState {
  type: 'quiz';
  data: {
    currentQuestion: QuizQuestion | null;
    questionIndex: number;
    totalQuestions: number;
    answers: Record<string, number>;
    showResults: boolean;
    timeLeft: number;
  };
}

// 100 to 1 types
export interface HundredToOneQuestion {
  id: string;
  questionRu: string;
  questionEn: string;
  answers: { textRu: string; textEn: string; points: number }[];
}

export interface HundredToOneState extends GameState {
  type: 'hundred-to-one';
  data: {
    currentQuestion: HundredToOneQuestion | null;
    questionIndex: number;
    totalQuestions: number;
    revealedAnswers: number[];
    teamScores: Record<string, number>;
    activeTeam: string;
    showBoard: boolean;
  };
}

// Crocodile types
export interface CrocodileState extends GameState {
  type: 'crocodile';
  data: {
    currentWord: { ru: string; en: string } | null;
    explainerId: string;
    timeLeft: number;
    guessedWords: number;
    currentTeam: string;
  };
}

// Spy types
export type SpyMode = 'guess' | 'draw';

export interface SpyState extends GameState {
  type: 'spy';
  data: {
    mode: SpyMode;
    spyId: string;
    currentWord: string;
  };
}

// Mafia types
export type MafiaRole = 'citizen' | 'mafia' | 'detective' | 'doctor';
export type MafiaPhase = 'night' | 'day' | 'voting' | 'results';

export interface MafiaState extends GameState {
  type: 'mafia';
  data: {
    phase: MafiaPhase;
    roles: Record<string, MafiaRole>;
    alive: string[];
    eliminated: string[];
    votes: Record<string, string>;
    nightActions: Record<string, string>;
    lastEliminatedId: string | null;
    winner: 'mafia' | 'citizens' | null;
  };
}

// Who Am I types
export interface WhoAmIState extends GameState {
  type: 'who-am-i';
  data: {
    characters: Record<string, { ru: string; en: string }>;
    currentPlayerId: string;
    guessedPlayers: string[];
    questionsAsked: number;
  };
}
