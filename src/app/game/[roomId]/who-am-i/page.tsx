'use client';

import { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useRoomState } from '@/lib/use-room-state';
import { useGameBroadcast } from '@/lib/use-game-action';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useGameIdentity } from '@/lib/use-game-identity';
import { useTranslation } from '@/lib/i18n';
import { GameLayout } from '@/components/games/GameLayout';
import { BreathingPlaceholder } from '@/components/ingame';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { WhoAmIIcon } from '@/components/games/WhoAmIIcon';
import { WHO_AM_I_CHARACTERS } from '@/lib/game-data';
import { Player } from '@/types/room';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WhoAmIGameState {
  phase: 'lobby' | 'playing' | 'finished';
  /** Mapping of playerId -> character assigned to them */
  characters: Record<string, { ru: string; en: string }>;
  /** Index into the alive (not-yet-guessed) player order */
  currentTurnIndex: number;
  /** Ordered list of player IDs for turn rotation */
  turnOrder: string[];
  /** Players who have successfully guessed their character */
  guessedPlayers: string[];
  /** How many questions each player has asked (for scoring) */
  questionsAsked: Record<string, number>;
  /** Consecutive "Yes" answers for the current turn */
  consecutiveYesAnswers: number;
  /** Pending disputed guess flow */
  guessNeedsConfirm: boolean;
  guessAwaitingJudge: boolean;
  guessJudgeId: string;
  guessPendingPlayerId: string;
  guessPendingText: string;
  /** Scores awarded on correct guess */
  scores: Record<string, number>;
}

type GameAction =
  | { type: 'start-game'; characters: Record<string, { ru: string; en: string }>; turnOrder: string[] }
  | { type: 'sync-state'; state: WhoAmIGameState }
  | { type: 'request-state' }
  | { type: 'next-turn' }
  | { type: 'ask-question'; answer?: 'yes' | 'no' }
  | { type: 'guess-try'; playerId: string; guess: string }
  | { type: 'guess-confirm'; playerId: string; judgeId: string }
  | { type: 'guess'; playerId: string; guess: string; correct: boolean }
  | { type: 'end-game' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function assignCharacters(
  playerIds: string[],
  excludeKeys: Set<string> = new Set(),
): Record<string, { ru: string; en: string }> {
  const preferred = WHO_AM_I_CHARACTERS.filter((c) => !excludeKeys.has(c.en));
  const pool = preferred.length >= playerIds.length ? preferred : WHO_AM_I_CHARACTERS;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const result: Record<string, { ru: string; en: string }> = {};
  playerIds.forEach((id, i) => {
    result[id] = shuffled[i % shuffled.length];
  });
  return result;
}

function calculateScore(questionsAsked: number): number {
  // Fewer questions = more points. Minimum 10 points for guessing at all.
  if (questionsAsked <= 1) return 100;
  if (questionsAsked <= 3) return 80;
  if (questionsAsked <= 5) return 60;
  if (questionsAsked <= 8) return 40;
  if (questionsAsked <= 12) return 20;
  return 10;
}

const QUESTION_ANSWER_GUARD_MS = 700;
const WHO_AM_I_GRADIENT_CLASS =
  "bg-[linear-gradient(135deg,#071825_0%,#0a2d3f_30%,#0c2530_60%,#071825_100%)] before:absolute before:inset-0 before:-z-10 before:bg-[radial-gradient(circle_at_18%_18%,rgba(56,189,248,.28),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(2,132,199,.24),transparent_32%)] before:animate-pulse";
const WHO_AM_I_ACCENT_CARD =
  'bg-[radial-gradient(110%_70%_at_50%_-5%,rgba(255,255,255,.22),transparent_55%),linear-gradient(165deg,#38bdf8_0%,#0369a1_100%)] text-sky-50 shadow-[0_18px_44px_-12px_rgba(2,132,199,.7),inset_0_1px_0_rgba(255,255,255,.45)]';
const WHO_AM_I_GLASS_STRONG =
  'border border-white/10 bg-[rgba(255,255,255,.12)] shadow-[0_16px_48px_rgba(0,0,0,.4)] backdrop-blur-[24px]';
const WHO_AM_I_ACTION_BUTTON =
  'min-h-[54px] rounded-full text-[17px] font-bold';
const WHO_AM_I_PHONE_CARD: CSSProperties = {
  borderRadius: '32px',
};

function rankTone(index: number) {
  if (index === 0) return 'border-amber-300/35 bg-amber-400/10 text-amber-300';
  if (index === 1) return 'border-slate-200/30 bg-slate-200/10 text-slate-200';
  if (index === 2) return 'border-orange-300/30 bg-orange-400/10 text-orange-300';
  return 'border-white/10 bg-white/5 text-white/55';
}

function getClearedGuessDisputeState() {
  return {
    guessNeedsConfirm: false,
    guessAwaitingJudge: false,
    guessJudgeId: '',
    guessPendingPlayerId: '',
    guessPendingText: '',
  };
}

function getInitialState(): WhoAmIGameState {
  return {
    phase: 'lobby',
    characters: {},
    currentTurnIndex: 0,
    turnOrder: [],
    guessedPlayers: [],
    questionsAsked: {},
    consecutiveYesAnswers: 0,
    ...getClearedGuessDisputeState(),
    scores: {},
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WhoAmIPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const { emit, on } = useSocket();
  const { locale } = useTranslation();
  const { user, effectivePlayerId, isGameHost } = useGameIdentity(roomId);
  const router = useRouter();
  useNavigateOnGameEnd(roomId, user ? 'lobby' : 'phone');

  const [players, setPlayers] = useState<Player[]>([]);
  const [gs, setGs] = useState<WhoAmIGameState>(getInitialState);
  const [guessInput, setGuessInput] = useState('');
  const [showGuessInput, setShowGuessInput] = useState(false);
  const [lastGuessResult, setLastGuessResult] = useState<{
    playerId: string;
    correct: boolean;
    guess: string;
  } | null>(null);
  const lastQuestionAnswerAtRef = useRef(0);
  const recentlyUsedRef = useRef<Set<string>>(new Set());
  const gsRef = useRef<WhoAmIGameState>(getInitialState());

  const playerName = useCallback(
    (id: string) => players.find((p) => p.id === id)?.nickname ?? id,
    [players],
  );

  const l = useCallback(
    (ru: string, en: string) => (locale === 'ru' ? ru : en),
    [locale],
  );

  // Current player whose turn it is (only among non-guessed players)
  const activeTurnOrder = gs.turnOrder.filter(
    (id) => !gs.guessedPlayers.includes(id),
  );
  const currentPlayerId =
    activeTurnOrder.length > 0
      ? activeTurnOrder[gs.currentTurnIndex % activeTurnOrder.length]
      : null;
  const isMyTurn = currentPlayerId === effectivePlayerId;
  const isGuessJudge = effectivePlayerId === gs.guessJudgeId;
  const haveIGuessed = effectivePlayerId
    ? gs.guessedPlayers.includes(effectivePlayerId)
    : false;
  const isMyConfirmScreen =
    effectivePlayerId === gs.guessPendingPlayerId &&
    !haveIGuessed &&
    gs.guessNeedsConfirm;

  // -----------------------------------------------------------------------
  // Broadcast helper
  // -----------------------------------------------------------------------
  const broadcast = useGameBroadcast(roomId, 'who-am-i') as (payload: GameAction) => void;

  const requestStateResync = useCallback(() => {
    if (gsRef.current.phase === 'lobby') return;
    broadcast({ type: 'request-state' });
  }, [broadcast]);

  useEffect(() => {
    gsRef.current = gs;
  }, [gs]);

  useEffect(() => {
    requestStateResync();
  }, [requestStateResync]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) return;
      requestStateResync();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [requestStateResync]);

  // -----------------------------------------------------------------------
  // Listen for room state
  // -----------------------------------------------------------------------
  useRoomState(roomId, (data) => {
    const room = data as { players?: Player[] };
    if (room.players) setPlayers(room.players);
  });

  // -----------------------------------------------------------------------
  // Listen for game actions
  // -----------------------------------------------------------------------
  useEffect(() => {
    const cleanup = on('game:action', (data: unknown) => {
      const { action, payload } = data as {
        action: string;
        payload: GameAction;
        from: string;
      };
      if (action !== 'who-am-i') return;

      switch (payload.type) {
        case 'start-game':
          setGs({
            phase: 'playing',
            characters: payload.characters,
            currentTurnIndex: 0,
            turnOrder: payload.turnOrder,
            guessedPlayers: [],
            questionsAsked: Object.fromEntries(
              payload.turnOrder.map((id) => [id, 0]),
            ),
            consecutiveYesAnswers: 0,
            ...getClearedGuessDisputeState(),
            scores: Object.fromEntries(
              payload.turnOrder.map((id) => [id, 0]),
            ),
          });
          setLastGuessResult(null);
          break;

        case 'sync-state':
          setGs(payload.state);
          break;

        case 'request-state':
          if (isGameHost) {
            broadcast({ type: 'sync-state', state: gsRef.current });
          }
          break;

        case 'next-turn':
          setGs((prev) => ({
            ...prev,
            currentTurnIndex: prev.currentTurnIndex + 1,
            consecutiveYesAnswers: 0,
            ...getClearedGuessDisputeState(),
          }));
          setShowGuessInput(false);
          setGuessInput('');
          setLastGuessResult(null);
          break;

        case 'ask-question':
          setGs((prev) => {
            const activeOrder = prev.turnOrder.filter(
              (id) => !prev.guessedPlayers.includes(id),
            );
            const cid =
              activeOrder.length > 0
                ? activeOrder[prev.currentTurnIndex % activeOrder.length]
                : null;
            if (!cid) return prev;
            return {
              ...prev,
              questionsAsked: {
                ...prev.questionsAsked,
                [cid]: (prev.questionsAsked[cid] || 0) + 1,
              },
              consecutiveYesAnswers:
                payload.answer === 'yes'
                  ? prev.consecutiveYesAnswers + 1
                  : prev.consecutiveYesAnswers,
            };
          });
          break;

        case 'guess-try':
          setGs((prev) => ({
            ...prev,
            guessNeedsConfirm: true,
            guessAwaitingJudge: false,
            guessJudgeId: '',
            guessPendingPlayerId: payload.playerId,
            guessPendingText: payload.guess,
          }));
          setShowGuessInput(false);
          setLastGuessResult(null);
          break;

        case 'guess-confirm':
          setGs((prev) => ({
            ...prev,
            guessNeedsConfirm: false,
            guessAwaitingJudge: true,
            guessJudgeId: payload.judgeId,
            guessPendingPlayerId: payload.playerId,
          }));
          break;

        case 'guess':
          if (payload.correct) {
            setGs((prev) => {
              const score = calculateScore(
                prev.questionsAsked[payload.playerId] || 0,
              );
              const newGuessed = [...prev.guessedPlayers, payload.playerId];
              const allGuessed =
                newGuessed.length >= prev.turnOrder.length;
              return {
                ...prev,
                guessedPlayers: newGuessed,
                scores: {
                  ...prev.scores,
                  [payload.playerId]:
                    (prev.scores[payload.playerId] || 0) + score,
                },
                phase: allGuessed ? 'finished' : prev.phase,
                currentTurnIndex: prev.currentTurnIndex + 1,
                consecutiveYesAnswers: 0,
                ...getClearedGuessDisputeState(),
              };
            });
          } else {
            setGs((prev) => ({
              ...prev,
              ...getClearedGuessDisputeState(),
            }));
          }
          setLastGuessResult({
            playerId: payload.playerId,
            correct: payload.correct,
            guess: payload.guess,
          });
          setShowGuessInput(false);
          setGuessInput('');
          break;

        case 'end-game':
          setGs((prev) => ({
            ...prev,
            phase: 'finished',
            ...getClearedGuessDisputeState(),
          }));
          break;
      }
    });
    return cleanup;
  }, [broadcast, isGameHost, on]);

  // -----------------------------------------------------------------------
  // Host: start game
  // -----------------------------------------------------------------------
  const handleStart = () => {
    const playerIds = players.map((p) => p.id);
    const characters = assignCharacters(playerIds, recentlyUsedRef.current);
    recentlyUsedRef.current = new Set(
      Object.values(characters).map((character) => character.en),
    );
    const turnOrder = [...playerIds].sort(() => Math.random() - 0.5);
    broadcast({ type: 'start-game', characters, turnOrder });
  };

  // -----------------------------------------------------------------------
  // Current player: pass turn
  // -----------------------------------------------------------------------
  const handleNextTurn = () => {
    broadcast({ type: 'next-turn' });
  };

  // -----------------------------------------------------------------------
  // Current player: mark that a question was asked (for scoring)
  // -----------------------------------------------------------------------
  const canSendQuestionAnswer = () => {
    const now = Date.now();
    if (now - lastQuestionAnswerAtRef.current < QUESTION_ANSWER_GUARD_MS) {
      return false;
    }
    lastQuestionAnswerAtRef.current = now;
    return true;
  };

  const handleQuestionAsked = (answer?: 'yes' | 'no') => {
    if (!canSendQuestionAnswer()) return false;
    broadcast({ type: 'ask-question', answer });
    if (answer === 'no') {
      broadcast({ type: 'next-turn' });
    }
    return true;
  };

  const handleNoAnswer = () => {
    handleQuestionAsked('no');
  };

  const handleYesAnswer = () => {
    if (!handleQuestionAsked('yes')) return;
    if (gs.consecutiveYesAnswers + 1 >= 3) {
      handleNextTurn();
    }
  };

  // -----------------------------------------------------------------------
  // Current player: submit guess
  // -----------------------------------------------------------------------
  const handleGuess = () => {
    if (!effectivePlayerId || !guessInput.trim()) return;
    const myChar = gs.characters[effectivePlayerId];
    if (!myChar) return;

    const normalise = (s: string) => s.trim().toLowerCase();
    const correct =
      normalise(guessInput) === normalise(myChar.ru) ||
      normalise(guessInput) === normalise(myChar.en);

    const guess = guessInput.trim();
    if (correct) {
      broadcast({
        type: 'guess',
        playerId: effectivePlayerId,
        guess,
        correct: true,
      });
      return;
    }

    broadcast({ type: 'guess-try', playerId: effectivePlayerId, guess });
  };

  const handleConfirmGuess = () => {
    if (!effectivePlayerId || gs.guessPendingPlayerId !== effectivePlayerId) {
      return;
    }
    const candidates = players.filter((p) => p.id !== effectivePlayerId);
    const judgeId =
      candidates[Math.floor(Math.random() * candidates.length)]?.id ?? '';

    if (!judgeId) {
      broadcast({
        type: 'guess',
        playerId: effectivePlayerId,
        guess: gs.guessPendingText,
        correct: false,
      });
      return;
    }

    broadcast({ type: 'guess-confirm', playerId: effectivePlayerId, judgeId });
  };

  const handleGuessVerdict = (accept: boolean) => {
    if (!isGuessJudge || !gs.guessAwaitingJudge || !gs.guessPendingPlayerId) {
      return;
    }
    broadcast({
      type: 'guess',
      playerId: gs.guessPendingPlayerId,
      guess: gs.guessPendingText,
      correct: accept,
    });
  };

  const handleEndGame = () => {
    broadcast({ type: 'end-game' });
    // Tell the server the game is over so TV and all clients leave the game screen
    emit('game:end', { code: roomId });
    router.push(user ? `/lobby/${roomId}` : `/join/${roomId}`);
  };

  // -----------------------------------------------------------------------
  // Scores for GameLayout
  // -----------------------------------------------------------------------
  const layoutScores = Object.entries(gs.scores).map(([id, score]) => ({
    name: playerName(id),
    score,
  }));

  // -----------------------------------------------------------------------
  // RENDER: Lobby
  // -----------------------------------------------------------------------
  const renderLobby = () => (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <GlassCard className="w-full max-w-md text-center px-6 py-7">
        <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[24px] ${WHO_AM_I_ACCENT_CARD}`}>
          <WhoAmIIcon name="profile" className="h-11 w-11" />
        </div>
        <h2 className="mb-2 text-3xl font-black tracking-tight text-white">
          {l('Кто я?', 'Who Am I?')}
        </h2>
        <p className="mx-auto mb-4 max-w-xs text-sm leading-relaxed text-white/60">
          {l(
            'Угадай своего персонажа, задавая вопросы «Да»/«Нет».',
            'Guess your character by asking Yes/No questions.',
          )}
        </p>
        <p className="mx-auto mb-4 inline-flex rounded-full border border-sky-300/30 bg-sky-400/10 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
          {l(
            `${players.length} игроков в комнате`,
            `${players.length} players in room`,
          )}
        </p>
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {players.map((p) => (
            <span key={p.id} className="glass-badge inline-flex items-center gap-1.5">
              {p.nickname}
              {p.isHost && <WhoAmIIcon name="star" className="h-3.5 w-3.5 text-amber-300" />}
            </span>
          ))}
        </div>
        {isGameHost ? (
          <GlassButton
            variant="primary"
            size="lg"
            onClick={handleStart}
            disabled={players.length < 2}
            className="w-full"
          >
            {l('Начать игру', 'Start Game')}
          </GlassButton>
        ) : (
          <BreathingPlaceholder
            text={l('Ожидание ведущего...', 'Waiting for host...')}
            variant="breathing-text"
          />
        )}
      </GlassCard>
    </div>
  );

  // -----------------------------------------------------------------------
  // RENDER: Player list with characters (the core mechanic)
  // Each player sees everyone ELSE's character, but their own shows as "???"
  // -----------------------------------------------------------------------
  const renderPlayerCharacters = () => (
    <div className="w-full max-w-md">
      <div className="flex items-center gap-[9px] mx-1 mb-[10px] text-[14px] font-medium text-sky-200">
        <WhoAmIIcon name="profile" className="h-[18px] w-[18px]" />
        {l(
          'Задай вопрос вслух с ответом «Да» или «Нет»',
          'Ask a Yes/No question out loud',
        )}
      </div>
      <div className="flex flex-col gap-2">
        {gs.turnOrder.map((id) => {
          const char = gs.characters[id];
          const isMe = id === effectivePlayerId;
          const isCurrent = id === currentPlayerId;

          return (
            <div
              key={id}
              className={`flex items-center gap-3 transition-all ${
                isCurrent
                  ? `${WHO_AM_I_ACCENT_CARD} rounded-[24px] border border-sky-200/35 px-[14px] py-3`
                  : 'rounded-[24px] border border-white/10 bg-white/5 px-[14px] py-[9px]'
              }`}
            >
              <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-sky-300/15 text-[18px] font-bold text-sky-100">
                {playerName(id).charAt(0).toUpperCase()}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-px">
                <span
                  className={`truncate font-bold tracking-[-.2px] ${
                    isCurrent ? 'text-[17px] text-sky-50' : 'text-[16px] text-white/80'
                  }`}
                >
                  {playerName(id)}
                  {isMe ? ` (${l('Вы', 'You')})` : ''}
                </span>
                {isMe ? (
                  <span className={isCurrent ? 'font-mono text-[10px] uppercase tracking-[2px] text-sky-50/75' : 'text-[13px] text-white/42'}>
                    {isCurrent ? l('твой ход', 'your turn') : '???'}
                  </span>
                ) : (
                  <span className="truncate text-[13px] text-white/42">
                    <b className="font-semibold text-sky-200">{char?.[locale]}</b>
                  </span>
                )}
              </div>
              {isCurrent && (
                <>
                  <div className="ml-auto inline-flex items-center gap-[7px] rounded-full border border-dashed border-sky-50/40 bg-[#041825]/35 px-[13px] py-[7px] font-bold tracking-[2px] text-sky-50/90">
                    <WhoAmIIcon name="profile" className="h-[15px] w-[15px] opacity-80" />
                    ???
                  </div>
                  <WhoAmIIcon name="pointer" className="h-6 w-6 shrink-0 animate-pulse text-sky-50" />
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderGuessInput = () => (
    <div className="flex flex-1 flex-col gap-[18px]">
      <div
        className={`mt-[22px] flex flex-col gap-[18px] px-[22px] pb-6 pt-7 ${WHO_AM_I_GLASS_STRONG}`}
        style={WHO_AM_I_PHONE_CARD}
      >
        <div className="flex items-center gap-[14px]">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[17px] ${WHO_AM_I_ACCENT_CARD}`}>
            <WhoAmIIcon name="profile" className="h-[30px] w-[30px]" />
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[2.5px] text-sky-200">
              {l('попытка угадать', 'guess attempt')}
            </p>
            <h1 className="mt-0.5 text-[30px] font-black leading-none tracking-[-.6px] text-white">
              {l('Так кто же ты?', 'So who are you?')}
            </h1>
          </div>
        </div>

        <label className="relative block rounded-[24px] border-[1.5px] border-sky-300/65 bg-[#041420]/50 px-5 py-[18px] shadow-[0_0_0_4px_rgba(56,189,248,.14),inset_0_1px_0_rgba(255,255,255,.06)]">
          <span className="mb-[7px] block font-mono text-[10px] uppercase tracking-[2px] text-white/42">
            {l('имя персонажа', 'character name')}
          </span>
          <input
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGuess();
            }}
            autoFocus
            className="w-full bg-transparent text-[26px] font-bold tracking-[-.3px] text-white outline-none placeholder:text-white/25"
            placeholder={l('Чебурашка', 'Cheburashka')}
          />
          {!guessInput && (
            <span className="pointer-events-none absolute left-5 top-[50px] h-[30px] w-[2.5px] animate-pulse rounded-sm bg-sky-300" />
          )}
        </label>

        <div className="flex items-start gap-2.5 px-1 text-[13.5px] leading-[1.45] text-white/42">
          <WhoAmIIcon name="profile" className="mt-px h-[17px] w-[17px] shrink-0 text-sky-200" />
          <span>
            {l(
              'Если написание не совпадёт точь-в-точь — попытка не сгорит: можно оспорить ответ, и решит другой игрок',
              'If spelling does not match exactly, the attempt is not lost: you can dispute it and another player will decide',
            )}
          </span>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-[11px]">
        <GlassButton
          variant="primary"
          size="lg"
          className={`${WHO_AM_I_ACTION_BUTTON} w-full`}
          onClick={handleGuess}
          disabled={!guessInput.trim()}
        >
          {l('Угадать!', 'Guess!')}
        </GlassButton>
        <GlassButton
          variant="default"
          size="lg"
          className={`${WHO_AM_I_ACTION_BUTTON} w-full`}
          onClick={() => {
            setShowGuessInput(false);
            setGuessInput('');
          }}
        >
          {l('Отмена', 'Cancel')}
        </GlassButton>
      </div>
    </div>
  );

  const renderGuessConfirm = () => (
    <div className="flex flex-1 flex-col">
      <div
        className="mt-[22px] flex flex-col items-center gap-4 rounded-[32px] border border-[#ff9f0a]/40 bg-[linear-gradient(165deg,rgba(255,159,10,.16),rgba(255,159,10,.05))] px-[22px] pb-[26px] pt-[30px] text-center shadow-[0_24px_60px_-22px_rgba(255,159,10,.45),inset_0_1px_0_rgba(255,255,255,.1)] backdrop-blur-[24px]"
      >
        <div className="flex h-[74px] w-[74px] items-center justify-center rounded-full border border-[#ff9f0a]/45 bg-[#ff9f0a]/15 text-[#ffc466]">
          <WhoAmIIcon name="pointer" className="h-10 w-10" />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[2.5px] text-[#ffc466]">
          {l('не совпало автоматически', 'no exact automatic match')}
        </p>
        <h1 className="text-[28px] font-black leading-[1.1] tracking-[-.6px] text-white">
          {l('Настаиваешь, что это верно?', 'Insist this is correct?')}
        </h1>
        <p className="max-w-[300px] text-[15px] leading-[1.45] text-white/64">
          {l(
            'Написание не совпало с загаданным точь-в-точь. Опечатка — не приговор.',
            'The spelling does not exactly match the secret character. A typo is not final.',
          )}
        </p>
        <div className="w-full rounded-[24px] border border-white/15 bg-[#041420]/45 px-[18px] py-[15px] text-left">
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[2px] text-white/42">
            {l('твой ответ', 'your answer')}
          </p>
          <p className="text-[24px] font-bold tracking-[-.3px] text-white">
            &laquo;{gs.guessPendingText}&raquo;
          </p>
        </div>
        <div className="flex items-start gap-2.5 px-0.5 text-left text-[13.5px] leading-[1.45] text-white/42">
          <WhoAmIIcon name="profile" className="mt-px h-[17px] w-[17px] shrink-0 text-[#ffc466]" />
          <span>
            {l(
              'После подтверждения случайный игрок сравнит твой ответ с персонажем и вынесет вердикт. Он окончательный.',
              'After confirming, a random player will compare your answer with the character and make a final verdict.',
            )}
          </span>
        </div>
      </div>

      <div className="mt-auto">
        <GlassButton
          variant="default"
          size="lg"
          className={`${WHO_AM_I_ACTION_BUTTON} w-full border-[#ff9f0a]/40 bg-[#ff9f0a]/20 text-[#ffc466]`}
          onClick={handleConfirmGuess}
        >
          {l('Подтвердить', 'Confirm')}
        </GlassButton>
      </div>
    </div>
  );

  const renderJudge = () => {
    const pendingPlayerName = playerName(gs.guessPendingPlayerId);
    const truth = gs.characters[gs.guessPendingPlayerId]?.[locale] ?? '';

    return (
      <div className="flex flex-1 flex-col">
        <div
          className={`mt-[22px] flex flex-col items-center gap-4 px-5 pb-6 pt-7 text-center ${WHO_AM_I_GLASS_STRONG}`}
          style={WHO_AM_I_PHONE_CARD}
        >
          <div className="flex h-[74px] w-[74px] items-center justify-center rounded-full border border-sky-300/35 bg-sky-300/10 text-sky-200">
            <WhoAmIIcon name="profile" className="h-10 w-10" />
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[2.5px] text-sky-200">
            {l('ты — судья', 'you are the judge')}
          </p>
          <h1 className="text-[28px] font-black leading-[1.1] tracking-[-.6px] text-white">
            {l(`Засчитать ответ ${pendingPlayerName}?`, `Accept ${pendingPlayerName}'s answer?`)}
          </h1>
          <p className="max-w-[300px] text-[14.5px] leading-[1.45] text-white/64">
            {l(
              `${pendingPlayerName} настаивает, что угадал(а) своего персонажа, но написание не совпало точь-в-точь`,
              `${pendingPlayerName} insists the character was guessed, but the spelling did not match exactly`,
            )}
          </p>
          <div className="grid w-full grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-[7px] rounded-[24px] border border-white/15 bg-white/5 px-3.5 py-4 text-left">
              <span className="font-mono text-[10px] uppercase tracking-[1.8px] text-white/42">
                {l(`ответ ${pendingPlayerName}`, `${pendingPlayerName}'s answer`)}
              </span>
              <span className="text-[21px] font-black leading-[1.15] tracking-[-.3px] text-white">
                &laquo;{gs.guessPendingText}&raquo;
              </span>
            </div>
            <div className="flex flex-col gap-[7px] rounded-[24px] border border-sky-300/40 bg-sky-300/10 px-3.5 py-4 text-left">
              <span className="font-mono text-[10px] uppercase tracking-[1.8px] text-white/42">
                {l('персонаж', 'character')}
              </span>
              <span className="text-[21px] font-black leading-[1.15] tracking-[-.3px] text-sky-200">
                &laquo;{truth}&raquo;
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[9px] text-[13px] text-white/42">
            <WhoAmIIcon name="profile" className="h-4 w-4" />
            {l('Твой вердикт — окончательный', 'Your verdict is final')}
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-[11px]">
          <GlassButton
            variant="danger"
            size="lg"
            className={WHO_AM_I_ACTION_BUTTON}
            onClick={() => handleGuessVerdict(false)}
          >
            {l('Отклонить', 'Reject')}
          </GlassButton>
          <GlassButton
            variant="default"
            size="lg"
            className={`${WHO_AM_I_ACTION_BUTTON} border-green-400/35 bg-green-500/15 text-green-200`}
            onClick={() => handleGuessVerdict(true)}
          >
            {l('Верно', 'Correct')}
          </GlassButton>
        </div>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // RENDER: Playing phase
  // -----------------------------------------------------------------------
  const renderPlaying = () => {
    const isMyPendingGuess =
      effectivePlayerId === gs.guessPendingPlayerId &&
      !haveIGuessed &&
      (gs.guessNeedsConfirm || gs.guessAwaitingJudge);

    return (
      <div className="flex-1 flex flex-col items-center gap-4">
        {renderPlayerCharacters()}

        {/* Last guess result notification */}
        {lastGuessResult && (
          <GlassCard
            className={`w-full max-w-md text-center animate-scale-in ${
              lastGuessResult.correct
                ? 'border-sky-300/35 bg-sky-400/10'
                : 'border-red-500/30'
            }`}
          >
            {lastGuessResult.correct ? (
              <div className="flex items-center gap-3 text-left">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${WHO_AM_I_ACCENT_CARD}`}>
                  <WhoAmIIcon name="celebrate" className="h-6 w-6" />
                </div>
                <div>
                <p className="font-bold text-sky-100">
                  {playerName(lastGuessResult.playerId)}{' '}
                  {l('угадал!', 'guessed correctly!')}
                </p>
                <p className="text-white/60 text-sm">
                  &quot;{lastGuessResult.guess}&quot;
                </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-left">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-red-300/30 bg-red-500/15 text-red-200">
                  <WhoAmIIcon name="cross" className="h-6 w-6" />
                </div>
                <div>
                <p className="font-bold text-red-300">
                  {l('Неправильно!', 'Wrong!')}
                </p>
                <p className="text-white/60 text-sm">
                  &quot;{lastGuessResult.guess}&quot;
                </p>
                </div>
              </div>
            )}
          </GlassCard>
        )}

        {isMyPendingGuess && !gs.guessNeedsConfirm && (
          <GlassCard className="w-full max-w-md text-center border-amber-400/35 bg-amber-500/10">
            <BreathingPlaceholder
              text={l(
                'Ожидание вердикта судьи...',
                'Waiting for the judge verdict...',
              )}
              variant="breathing-text"
            />
            <p className="mt-2 text-sm text-white/50">
              {l(
                'Другие игроки продолжают видеть общий экран.',
                'Other players keep seeing the main screen.',
              )}
            </p>
          </GlassCard>
        )}

        {/* Controls for current player */}
        {isMyTurn && !haveIGuessed && !isMyPendingGuess && (
          <GlassCard className="w-full max-w-md">
            <div className="text-center mb-3 flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-3 rounded-full border border-sky-300/25 bg-sky-400/10 px-4 py-2">
                <span className="flex gap-1.5" aria-hidden="true">
                  {[0, 1, 2].map((idx) => (
                    <span
                      key={idx}
                      className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        idx < gs.consecutiveYesAnswers ? 'bg-sky-300 shadow-[0_0_12px_rgba(56,189,248,.75)]' : 'bg-white/20'
                      }`}
                    />
                  ))}
                </span>
                <span className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-sky-100">
                  {l(
                    `«Да» подряд · ${gs.consecutiveYesAnswers}/3`,
                    `Yes streak · ${gs.consecutiveYesAnswers}/3`,
                  )}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <GlassButton
                variant="default"
                className="flex-1"
                onClick={handleNoAnswer}
              >
                {l('Нет', 'No')}
              </GlassButton>
              <GlassButton
                variant="default"
                className="flex-1"
                onClick={handleYesAnswer}
              >
                {l('Да', 'Yes')}
              </GlassButton>
              <GlassButton
                variant="primary"
                className="flex-1"
                onClick={() => setShowGuessInput(true)}
              >
                {l('Я знаю!', 'I Know!')}
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* Waiting message for non-current players */}
        {!isMyTurn && !haveIGuessed && gs.phase === 'playing' && (
          <GlassCard className="w-full max-w-md text-center">
            <p className="text-white/40 text-sm">
              {l(
                'Ждите свой ход. Отвечайте на вопросы "Да" или "Нет".',
                'Wait for your turn. Answer questions with "Yes" or "No".',
              )}
            </p>
          </GlassCard>
        )}

        {/* Already guessed message */}
        {haveIGuessed && gs.phase === 'playing' && (
          <GlassCard className="w-full max-w-md text-center">
            <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full ${WHO_AM_I_ACCENT_CARD}`}>
              <WhoAmIIcon name="celebrate" className="h-7 w-7" />
            </div>
            <p className="text-sky-100 font-medium">
              {l('Вы уже угадали! Наблюдайте за игрой.', 'You already guessed! Watch the game.')}
            </p>
            <p className="text-white/60 text-sm mt-1">
              {l('Ваш персонаж:', 'Your character:')}{' '}
              <span className="font-bold text-white">
                {gs.characters[effectivePlayerId]?.[locale]}
              </span>
            </p>
          </GlassCard>
        )}

      </div>
    );
  };

  // -----------------------------------------------------------------------
  // RENDER: Finished
  // -----------------------------------------------------------------------
  const renderFinished = () => {
    const sorted = Object.entries(gs.scores)
      .map(([id, score]) => ({ id, name: playerName(id), score }))
      .sort((a, b) => b.score - a.score);
    const rowCount = Math.max(sorted.length, 1);
    const getMobileRevealDelay = (index: number) => {
      const fromBottom = rowCount - 1 - index;
      if (rowCount <= 6) {
        const delays = [1.4, 1.1, 0.85, 0.65, 0.45, 0.25];
        return delays[index] ?? Math.max(0.18, 1.4 - index * 0.16);
      }
      return 0.2 + fromBottom * 0.12;
    };

    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <GlassCard className="w-full max-w-md text-center animate-scale-in">
          <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl ${WHO_AM_I_ACCENT_CARD}`}>
            <WhoAmIIcon name="trophy" className="h-9 w-9" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            {l('Игра окончена!', 'Game Over!')}
          </h2>

          {/* Scoreboard */}
          <div className="space-y-2 mb-6">
            {sorted.map((entry, i) => {
              const char = gs.characters[entry.id];
              const guessed = gs.guessedPlayers.includes(entry.id);
              return (
                <div
                  key={entry.id}
                  style={{
                    animation: `whoamiMobileRowIn .5s cubic-bezier(.2,.9,.3,1.15) ${getMobileRevealDelay(i)}s both`,
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border ${rankTone(i)}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                      {i < 3 ? (
                        <>
                          <WhoAmIIcon name="medal" className="h-8 w-8" />
                          <span className="absolute mt-1 text-[10px] font-black">{i + 1}</span>
                        </>
                      ) : (
                        <span className="font-mono text-sm font-bold text-white/50">{i + 1}</span>
                      )}
                    </span>
                    <div className="text-left">
                      <p className="font-medium text-white text-sm">
                        {entry.name}
                      </p>
                      <p className="text-white/40 text-xs">
                        {char?.[locale]}
                        {!guessed && ` (${l('не угадал', 'not guessed')})`}
                      </p>
                    </div>
                  </div>
                  <span className="glass-badge border-sky-300/25 bg-sky-400/10 font-bold text-sky-100">
                    {entry.score}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Reveal all characters */}
          <div className="border-t border-white/10 pt-4">
            <h3 className="text-white/50 text-sm mb-3">
              {l('Все персонажи', 'All Characters')}
            </h3>
            <div className="space-y-1">
              {gs.turnOrder.map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between gap-3 rounded-full border border-sky-300/15 bg-sky-400/5 px-3 py-1.5 text-sm"
                >
                  <span className="text-white/70">{playerName(id)}</span>
                  <span className="truncate text-sky-100/80">
                    {gs.characters[id]?.[locale]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {isGameHost && (
            <GlassButton
              variant="primary"
              size="lg"
              className="w-full mt-6"
              onClick={handleStart}
            >
              {l('Играть снова', 'Play Again')}
            </GlassButton>
          )}
        </GlassCard>
      </div>
    );
  };

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------
  const phaseRenderers: Record<string, () => React.JSX.Element> = {
    lobby: renderLobby,
    playing: renderPlaying,
    finished: renderFinished,
  };
  let content = (phaseRenderers[gs.phase] ?? renderLobby)();
  if (gs.phase === 'playing' && showGuessInput) {
    content = renderGuessInput();
  } else if (gs.phase === 'playing' && isMyConfirmScreen) {
    content = renderGuessConfirm();
  } else if (gs.phase === 'playing' && isGuessJudge && gs.guessAwaitingJudge) {
    content = renderJudge();
  }

  return (
    <GameLayout
      title={l('Кто я?', 'Who Am I?')}
      icon={<WhoAmIIcon name="profile" className="h-7 w-7 text-sky-300" />}
      scores={gs.phase !== 'lobby' ? layoutScores : undefined}
      onEnd={isGameHost ? handleEndGame : undefined}
      showScoreboard={gs.phase === 'finished'}
      phaseKey={gs.phase}
      gradientClass={WHO_AM_I_GRADIENT_CLASS}
    >
      <style jsx global>{`
        @keyframes whoamiMobileRowIn {
          from {
            opacity: 0;
            transform: translateY(14px) scale(.96);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
      {content}
    </GameLayout>
  );
}
