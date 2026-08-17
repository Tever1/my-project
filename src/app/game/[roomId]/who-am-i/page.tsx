'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSocket } from '@/lib/use-socket';
import { useRoomState } from '@/lib/use-room-state';
import { useGameBroadcast } from '@/lib/use-game-action';
import { useNavigateOnGameEnd } from '@/lib/use-navigate-on-game-end';
import { useGameIdentity } from '@/lib/use-game-identity';
import { useTranslation } from '@/lib/i18n';
import { BreathingPlaceholder } from '@/components/ingame';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { WhoAmIIcon } from '@/components/games/WhoAmIIcon';
import {
  ClayBlob,
  WhoAmIClayMobileLayout,
  whoAmIClayStyles as clay,
} from '@/components/games/who-am-i-clay/WhoAmIClay';
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
  | { type: 'ask-question'; answer?: 'yes' | 'no'; playerId: string; questionsAsked: number; consecutiveYesAnswers: number }
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
const WHO_AM_I_ACCENT_CARD =
  'bg-[radial-gradient(110%_70%_at_50%_-5%,rgba(255,255,255,.22),transparent_55%),linear-gradient(165deg,#38bdf8_0%,#0369a1_100%)] text-sky-50 shadow-[0_18px_44px_-12px_rgba(2,132,199,.7),inset_0_1px_0_rgba(255,255,255,.45)]';

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
          setGs((prev) => ({
            ...prev,
            questionsAsked: {
              ...prev.questionsAsked,
              [payload.playerId]: payload.questionsAsked,
            },
            consecutiveYesAnswers: payload.consecutiveYesAnswers,
          }));
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
    const myId = effectivePlayerId;
    if (!myId) return false;
    if (!canSendQuestionAnswer()) return false;
    const nextQuestions = (gs.questionsAsked[myId] || 0) + 1;
    const nextStreak =
      answer === 'yes'
        ? gs.consecutiveYesAnswers + 1
        : gs.consecutiveYesAnswers;

    broadcast({
      type: 'ask-question',
      answer,
      playerId: myId,
      questionsAsked: nextQuestions,
      consecutiveYesAnswers: nextStreak,
    });
    if (answer === 'no') {
      broadcast({ type: 'next-turn' });
    }
    return nextStreak;
  };

  const handleNoAnswer = () => {
    handleQuestionAsked('no');
  };

  const handleYesAnswer = () => {
    const nextStreak = handleQuestionAsked('yes');
    if (nextStreak === false) return;
    if (nextStreak >= 3) {
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
  // RENDER: Lobby
  // -----------------------------------------------------------------------
  const renderLobby = () => (
    <div className={clay.lobby}>
      <span className={clay.kicker}>{l('КОМНАТА ГОТОВА', 'ROOM READY')}</span>
      <h1 className={clay.title}>{l('Кто скрывается\nвнутри?', 'Who is hiding\ninside?')}</h1>
      <p className={clay.subtitle}>{l('Угадай своего персонажа, задавая вопросы «Да» или «Нет».', 'Guess your character by asking Yes or No questions.')}</p>
      <div className={clay.heroToy}><i /><i /><WhoAmIIcon name="profile" /><strong>?</strong></div>
      <div className={clay.lobbyCount}>{l(`${players.length} игроков в комнате`, `${players.length} players in room`)}</div>
      <div className={clay.lobbyGrid}>
        {players.map((player) => (
          <div key={player.id} className={clay.playerChip}>
            <ClayBlob name={player.nickname} size="sm" />
            <b>{player.nickname}</b>
            {player.isHost && <WhoAmIIcon name="star" />}
          </div>
        ))}
      </div>
      <div className={clay.lobbyAction}>
        {isGameHost ? (
          <button type="button" className={clay.primaryButton} onClick={handleStart} disabled={players.length < 2}>
            {l('НАЧАТЬ ИГРУ', 'START GAME')} <WhoAmIIcon name="pointer" />
          </button>
        ) : (
          <div className={clay.waitPill}><i />{l('ВЕДУЩИЙ ЗАПУСКАЕТ ИГРУ', 'WAITING FOR THE HOST')}</div>
        )}
      </div>
    </div>
  );

  // -----------------------------------------------------------------------
  // RENDER: Player list with characters (the core mechanic)
  // Each player sees everyone ELSE's character, but their own shows as "???"
  // -----------------------------------------------------------------------
  const renderPlayerCharacters = () => (
    <div className={clay.roster} aria-label={l('Игроки', 'Players')}>
      {gs.turnOrder.map((id) => {
        const isMe = id === effectivePlayerId;
        const isCurrent = id === currentPlayerId;
        const guessed = gs.guessedPlayers.includes(id);
        const character = isMe ? '???' : gs.characters[id]?.[locale] ?? '???';
        return (
          <div key={id} className={`${clay.rosterItem} ${isCurrent ? clay.rosterItemCurrent : ''} ${guessed ? clay.rosterItemGuessed : ''}`}>
            <ClayBlob name={playerName(id)} active={isCurrent} size="sm" />
            <b>{playerName(id)}{isMe ? ` · ${l('вы', 'you')}` : ''}</b>
            <small>{guessed ? l('УГАДАЛ', 'GUESSED') : isCurrent && isMe ? l('СЕЙЧАС ХОДИТ', 'CURRENT TURN') : character}</small>
          </div>
        );
      })}
    </div>
  );

  const renderGuessInput = () => (
    <div className={clay.focusState}>
      <button type="button" className={clay.backButton} onClick={() => { setShowGuessInput(false); setGuessInput(''); }}>{l('ОТМЕНА', 'CANCEL')}</button>
      <span className={clay.iconBlob}><WhoAmIIcon name="profile" /></span>
      <small className={clay.kicker}>{l('ПОПЫТКА УГАДАТЬ', 'GUESS ATTEMPT')}</small>
      <h1>{l('Кто ты?', 'Who are you?')}</h1>
      <label className={clay.field}>
        <span>{l('ИМЯ ПЕРСОНАЖА', 'CHARACTER NAME')}</span>
          <input
            value={guessInput}
            onChange={(e) => setGuessInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleGuess();
            }}
            autoFocus
            placeholder={l('Чебурашка', 'Cheburashka')}
          />
      </label>
      <p>{l('Если написание отличается, попытку можно передать другому игроку на проверку.', 'If the spelling differs, another player can review the attempt.')}</p>
      <div className={clay.focusActions}>
        <button type="button" className={clay.primaryButton} onClick={handleGuess} disabled={!guessInput.trim()}>{l('УГАДАТЬ', 'GUESS')}</button>
      </div>
    </div>
  );

  const renderGuessConfirm = () => (
    <div className={clay.focusState}>
      <span className={`${clay.iconBlob} ${clay.iconBlobWarm}`}><WhoAmIIcon name="pointer" /></span>
      <small className={clay.kicker}>{l('НЕ СОВПАЛО АВТОМАТИЧЕСКИ', 'NO EXACT MATCH')}</small>
      <h1>{l('Это всё равно\nверный ответ?', 'Is it still\ncorrect?')}</h1>
      <div className={`${clay.quote} ${clay.cardWarm}`}><small>{l('ТВОЙ ОТВЕТ', 'YOUR ANSWER')}</small><b>«{gs.guessPendingText}»</b></div>
      <p>{l('Случайный игрок увидит ответ и настоящего персонажа. Его решение окончательное.', 'A random player will see the guess and the real character. Their decision is final.')}</p>
      <div className={clay.focusActions}>
        <button type="button" className={clay.primaryButton} onClick={handleConfirmGuess}>{l('ПОДТВЕРДИТЬ', 'CONFIRM')}</button>
      </div>
    </div>
  );

  const renderJudge = () => {
    const pendingPlayerName = playerName(gs.guessPendingPlayerId);
    const truth = gs.characters[gs.guessPendingPlayerId]?.[locale] ?? '';

    return (
      <div className={clay.focusState}>
        <span className={clay.iconBlob}><WhoAmIIcon name="profile" /></span>
        <small className={clay.kicker}>{l('ТЫ — СУДЬЯ', 'YOU ARE THE JUDGE')}</small>
        <h1>{l(`Засчитать\nответ ${pendingPlayerName}?`, `Accept\n${pendingPlayerName}'s guess?`)}</h1>
        <div className={clay.compare}>
          <article className={clay.cardSoft}><small>{l(`ОТВЕТ ${pendingPlayerName}`, `${pendingPlayerName}'S GUESS`)}</small><b>{gs.guessPendingText}</b></article>
          <i>≈</i>
          <article className={clay.cardSoft}><small>{l('ПЕРСОНАЖ', 'CHARACTER')}</small><b>{truth}</b></article>
        </div>
        <p>{l('Твой вердикт — окончательный.', 'Your verdict is final.')}</p>
        <div className={clay.verdict}>
          <button type="button" className={clay.dangerButton} onClick={() => handleGuessVerdict(false)}><WhoAmIIcon name="cross" />{l('ОТКЛОНИТЬ', 'REJECT')}</button>
          <button type="button" className={clay.primaryButton} onClick={() => handleGuessVerdict(true)}><WhoAmIIcon name="check" />{l('ВЕРНО', 'CORRECT')}</button>
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

    if (String(gs.phase) === 'playing') {
      if (lastGuessResult) {
        const correct = lastGuessResult.correct;
        const revealedCharacter = gs.characters[lastGuessResult.playerId]?.[locale] ?? lastGuessResult.guess;
        const points = calculateScore(gs.questionsAsked[lastGuessResult.playerId] || 0);
        return (
          <div className={clay.reveal}>
            {correct && <div className={clay.revealBurst} aria-hidden="true"><i /><i /><i /><i /><i /></div>}
            <span className={`${clay.iconBlob} ${correct ? '' : clay.iconBlobDanger}`}><WhoAmIIcon name={correct ? 'celebrate' : 'cross'} /></span>
            <small className={clay.kicker}>{correct ? l('ЛИЧНОСТЬ РАСКРЫТА', 'IDENTITY REVEALED') : l('НЕВЕРНАЯ ПОПЫТКА', 'WRONG GUESS')}</small>
            <h1>{correct ? l(`${playerName(lastGuessResult.playerId)} —\n${revealedCharacter}!`, `${playerName(lastGuessResult.playerId)} is\n${revealedCharacter}!`) : l(`${playerName(lastGuessResult.playerId)} пока\nне угадал(а)`, `${playerName(lastGuessResult.playerId)} has not\nguessed yet`)}</h1>
            <div className={clay.scorePill}>{correct ? `+${points} ${l('ОЧКОВ', 'POINTS')}` : l('ХОД ПЕРЕХОДИТ ДАЛЬШЕ', 'TURN PASSES ON')}</div>
            <p>{correct ? l(`Понадобилось ${gs.questionsAsked[lastGuessResult.playerId] || 0} вопросов`, `It took ${gs.questionsAsked[lastGuessResult.playerId] || 0} questions`) : l('Персонаж остаётся тайной. Новая попытка будет доступна в следующем круге.', 'The character remains secret. Try again on the next turn.')}</p>
            <button type="button" className={clay.primaryButton} onClick={() => setLastGuessResult(null)}>{l('СМОТРЕТЬ ИГРУ', 'WATCH GAME')}</button>
          </div>
        );
      }

      if (isMyTurn && !haveIGuessed && !isMyPendingGuess) {
        return (
          <div className={clay.turn}>
            {renderPlayerCharacters()}
            <section className={`${clay.activeCard} ${clay.card}`}>
              <ClayBlob name={playerName(currentPlayerId ?? '')} active />
              <div><small>{l('ТВОЙ ХОД', 'YOUR TURN')}</small><h2>{playerName(currentPlayerId ?? '')}</h2><p>{gs.consecutiveYesAnswers >= 2 ? l('Ты почти раскрыла персонажа', 'You are close to revealing the character') : l('Задай вопрос о себе', 'Ask a question about yourself')}</p></div>
            </section>
            <div className={clay.mystery} data-streak={Math.min(gs.consecutiveYesAnswers, 2)}><i /><i /><i /><span><WhoAmIIcon name="profile" /><strong>?</strong></span><small>{l('ПЕРСОНАЖ СКРЫТ', 'CHARACTER HIDDEN')}</small></div>
            <div className={clay.streak}><span>{l('«ДА» ПОДРЯД', 'YES STREAK')}</span><div>{[0,1,2].map((dot) => <i key={dot} data-filled={dot < gs.consecutiveYesAnswers} />)}</div><b>{gs.consecutiveYesAnswers}/3</b></div>
            <div className={clay.answerDeck}>
              <button type="button" className={clay.noButton} onClick={handleNoAnswer}><WhoAmIIcon name="cross" /><b>{l('НЕТ', 'NO')}</b><small>{l('передать ход', 'pass turn')}</small></button>
              <button type="button" className={clay.primaryButton} onClick={() => setShowGuessInput(true)}><WhoAmIIcon name="profile" /><b>{l('Я ЗНАЮ!', 'I KNOW!')}</b><small>{l('назвать персонажа', 'name character')}</small></button>
              <button type="button" className={clay.yesButton} onClick={handleYesAnswer}><WhoAmIIcon name="check" /><b>{l('ДА', 'YES')}</b><small>{l('ещё вопрос', 'one more')}</small></button>
            </div>
          </div>
        );
      }

      const pendingJudge = isMyPendingGuess && !gs.guessNeedsConfirm;
      return (
        <div className={clay.observer}>
          {renderPlayerCharacters()}
          <div className={clay.observerStage}>
            <ClayBlob name={haveIGuessed ? playerName(effectivePlayerId ?? '') : playerName(currentPlayerId ?? '')} active size="lg" />
            <small className={clay.kicker}>{haveIGuessed ? l('ТЫ УЖЕ УГАДАЛ(А)', 'YOU ALREADY GUESSED') : pendingJudge ? l('ОЖИДАЕМ СУДЬЮ', 'WAITING FOR JUDGE') : l('СЕЙЧАС ХОДИТ', 'CURRENT TURN')}</small>
            <h1>{haveIGuessed ? playerName(effectivePlayerId ?? '') : playerName(currentPlayerId ?? '')}</h1>
            <p>{haveIGuessed ? l(`Твой персонаж — ${gs.characters[effectivePlayerId ?? '']?.[locale] ?? '???'}. Наблюдай за остальными.`, `Your character is ${gs.characters[effectivePlayerId ?? '']?.[locale] ?? '???'}. Watch the others.`) : pendingJudge ? l('Случайный игрок сравнивает твою догадку с настоящим персонажем.', 'A random player is comparing your guess with the real character.') : l(`Отвечай на вопросы ${playerName(currentPlayerId ?? '')} вслух: только «Да» или «Нет».`, `Answer ${playerName(currentPlayerId ?? '')}'s questions out loud: only Yes or No.`)}</p>
          </div>
          <div className={`${clay.softMessage} ${clay.cardSoft}`}><WhoAmIIcon name={haveIGuessed ? 'celebrate' : 'profile'} /><div><b>{haveIGuessed ? `+${gs.scores[effectivePlayerId ?? ''] || 0} ${l('ОЧКОВ', 'POINTS')}` : pendingJudge ? l('ВЕРДИКТ СКОРО', 'VERDICT SOON') : l('ЖДИ СВОЙ ХОД', 'WAIT FOR YOUR TURN')}</b><small>{haveIGuessed ? l('результат уже в рейтинге', 'your score is in the ranking') : l('чужие персонажи видны только игрокам', 'characters stay private to players')}</small></div></div>
        </div>
      );
    }

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

    if (gs.phase === 'finished') {
      return (
        <div className={clay.results}>
          <span className={clay.iconBlob}><WhoAmIIcon name="trophy" /></span>
          <small className={clay.kicker}>{l('ИГРА ОКОНЧЕНА', 'GAME OVER')}</small>
          <h1>{l('Все личности\nраскрыты', 'Every identity\nrevealed')}</h1>
          <div className={clay.ranking}>
            {sorted.map((entry, index) => {
              const guessed = gs.guessedPlayers.includes(entry.id);
              const character = guessed ? gs.characters[entry.id]?.[locale] ?? '???' : l('не угадал', 'not guessed');
              return (
                <article key={entry.id} className={`${clay.resultRow} ${index === 0 ? clay.resultRowWinner : ''}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <ClayBlob name={entry.name} active={index === 0} size="sm" />
                  <div><b>{entry.name}</b><small>{character} · {gs.questionsAsked[entry.id] ?? 0} {l('вопросов', 'questions')}</small></div>
                  <strong>{entry.score}</strong>
                </article>
              );
            })}
          </div>
          {isGameHost && <div className={clay.resultsAction}><button type="button" className={clay.primaryButton} onClick={handleStart}>{l('ИГРАТЬ СНОВА', 'PLAY AGAIN')}</button></div>}
        </div>
      );
    }

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

  const visualPhaseKey = lastGuessResult
    ? `result-${lastGuessResult.playerId}-${lastGuessResult.correct}`
    : showGuessInput
      ? 'guess-input'
      : isMyConfirmScreen
        ? 'guess-confirm'
        : isGuessJudge && gs.guessAwaitingJudge
          ? 'judge'
          : `${gs.phase}-${currentPlayerId ?? 'none'}-${gs.consecutiveYesAnswers}`;

  return (
    <WhoAmIClayMobileLayout roomId={roomId} phaseKey={visualPhaseKey} onEnd={isGameHost ? handleEndGame : undefined} locale={locale}>
      {content}
    </WhoAmIClayMobileLayout>
  );
}
