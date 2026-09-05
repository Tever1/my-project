'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

type Locale = 'ru' | 'en';

export interface QuizPulseQuestion {
  questionRu: string;
  questionEn: string;
  options: { ru: string; en: string }[];
  correctIndex: number;
}

export interface QuizPulseScore {
  id?: string;
  name: string;
  score: number;
  away?: boolean;
  hasAnswered?: boolean;
  isCorrect?: boolean;
}

interface SharedProps {
  locale: Locale;
  phase: string;
  topic: string;
  difficulty?: string;
  backgroundUrl?: string;
  question: QuizPulseQuestion | null;
  questionIndex: number;
  totalQuestions: number;
  timeLeft: number;
  timePerQuestion: number;
  countdownValue: number;
  scores: QuizPulseScore[];
  totalPlayers: number;
}

interface PlayerProps extends SharedProps {
  myAnswer?: number;
  showCorrect: boolean;
  myAnswerIsCorrect: boolean;
  isGameHost: boolean;
  onAnswer: (index: number) => void;
  onStart: () => void;
  onNext: () => void;
  onContinue: () => void;
  onPlayAgain: () => void;
  onEnd: () => void;
}

interface TvProps extends SharedProps {
  showCorrect: boolean;
  answeredCount: number;
  isSetup: boolean;
  players: QuizPulseScore[];
}

type TvPlayerMode = 'room' | 'answering' | 'reveal';

const letters = ['A', 'B', 'C', 'D'];
const spring = { type: 'spring' as const, stiffness: 360, damping: 27 };

function copy(locale: Locale) {
  const ru = locale === 'ru';
  return {
    quiz: ru ? 'КВИЗ' : 'QUIZ',
    question: ru ? 'ВОПРОС' : 'QUESTION',
    seconds: ru ? 'СЕК' : 'SEC',
    ready: ru ? 'ПРИГОТОВЬТЕСЬ' : 'GET READY',
    choose: ru ? 'ВЫБЕРИТЕ ОДИН ОТВЕТ' : 'CHOOSE ONE ANSWER',
    accepted: ru ? 'ОТВЕТ ПРИНЯТ' : 'ANSWER ACCEPTED',
    canChange: ru ? 'МОЖНО ИЗМЕНИТЬ' : 'YOU CAN CHANGE IT',
    correct: ru ? 'ПРАВИЛЬНО' : 'CORRECT',
    wrong: ru ? 'НЕВЕРНО' : 'INCORRECT',
    point: ru ? '+ 1 ОЧКО' : '+ 1 POINT',
    noPoint: ru ? 'ОЧКИ НЕ НАЧИСЛЕНЫ' : 'NO POINTS AWARDED',
    start: ru ? 'НАЧАТЬ ИГРУ' : 'START GAME',
    waitingHost: ru ? 'ОЖИДАНИЕ ВЕДУЩЕГО' : 'WAITING FOR HOST',
    startsSoon: ru ? 'Игра скоро начнётся' : 'The game starts soon',
    hostStarts: ru ? 'ВЕДУЩИЙ ЗАПУСКАЕТ ИГРУ' : 'THE HOST STARTS THE GAME',
    players: ru ? 'игроков' : 'players',
    questions: ru ? 'вопросов' : 'questions',
    rules: ru ? '1 очко за правильный ответ!' : '1 point for each correct answer!',
    leaderboard: ru ? 'Таблица лидеров' : 'Leaderboard',
    winner: ru ? 'Победитель определён' : 'Winner decided',
    victory: ru ? 'Победа!' : 'Victory!',
    quizComplete: ru ? 'КВИЗ ЗАВЕРШЁН' : 'QUIZ COMPLETE',
    after: ru ? 'ПОСЛЕ' : 'AFTER',
    continue: ru ? 'ПРОДОЛЖИТЬ' : 'CONTINUE',
    playAgain: ru ? 'ИГРАТЬ СНОВА' : 'PLAY AGAIN',
    lobby: ru ? 'В ЛОББИ' : 'BACK TO LOBBY',
    answered: ru ? 'ОТВЕТИЛИ' : 'ANSWERED',
    allAnswered: ru ? 'ВСЕ ОТВЕТИЛИ' : 'EVERYONE ANSWERED',
    correctAnswer: ru ? 'ВЕРНО' : 'CORRECT',
    roomPlayers: ru ? 'ИГРОКИ КОМНАТЫ' : 'ROOM PLAYERS',
    playerAnswers: ru ? 'ОТВЕТЫ ИГРОКОВ' : 'PLAYER ANSWERS',
    questionResults: ru ? 'ИТОГИ ВОПРОСА' : 'QUESTION RESULTS',
  };
}

function PulseSurface({ backgroundUrl, children, className = '' }: { backgroundUrl?: string; children: ReactNode; className?: string }) {
  const specialStyle: CSSProperties | undefined = backgroundUrl
    ? { backgroundImage: `url(${backgroundUrl})`, backgroundPosition: 'center', backgroundSize: 'cover' }
    : undefined;

  return (
    <div className={`relative isolate overflow-hidden bg-[#06172e] text-white ${className}`} style={specialStyle}>
      {!backgroundUrl && (
        <>
          <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_80%_12%,#1859a855,transparent_35%),radial-gradient(circle_at_15%_78%,#0878ff22,transparent_38%),linear-gradient(155deg,#0b2950,#051329_68%)]" />
          <div aria-hidden className="quiz-pulse-glow absolute -left-[18%] top-[44%] -z-10 h-[48%] w-[70%] rounded-full bg-[#0878ff]/14 blur-[70px]" />
        </>
      )}
      {backgroundUrl && <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,8,16,.34),rgba(5,8,16,.18)_40%,rgba(5,8,16,.48))]" />}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,transparent_0_58%,#2d7fc314_58%_59%,transparent_59%_100%)]" />
      <Sweep />
      {children}
    </div>
  );
}

function Sweep() {
  return (
    <div
      aria-hidden
      className="quiz-pulse-sweep pointer-events-none absolute inset-y-0 left-0 -z-10 w-[9%] bg-gradient-to-r from-transparent via-[#67c7ff]/10 to-transparent"
    />
  );
}

function Header({ label, locale, onEnd }: { label: string; locale: Locale; onEnd?: () => void }) {
  const c = copy(locale);
  return (
    <header className="relative flex items-center justify-between gap-3">
      <b className="text-[28px] font-black tracking-[-.055em] sm:text-3xl">{c.quiz}</b>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3.5 py-2 text-[11px] font-black uppercase tracking-[.14em] backdrop-blur-md">
          <i className="h-1.5 w-1.5 rounded-full bg-[#f13e55]" />
          {label}
        </span>
        {onEnd && (
          <button type="button" onClick={onEnd} className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-white/65 transition hover:text-white">
            {locale === 'ru' ? 'Завершить' : 'End'}
          </button>
        )}
      </div>
    </header>
  );
}

function TvPlayersPanel({ players, mode, answeredCount, locale }: { players: QuizPulseScore[]; mode: TvPlayerMode; answeredCount: number; locale: Locale }) {
  const c = copy(locale);
  const reveal = mode === 'reveal';
  const total = players.length;
  const columns = Math.max(1, Math.min(total, 5));

  return (
    <section className="min-w-0 rounded-[.85vw] border border-[#5d85bb]/30 bg-[#071a35]/78 px-[1.2%] py-[.7%] backdrop-blur-md">
      <div className="mb-[.45%] flex items-center justify-between text-[clamp(6px,.58vw,8px)] font-black uppercase tracking-[.14em] text-[#8fbfff]">
        <span>{reveal ? c.questionResults : mode === 'answering' ? c.playerAnswers : c.roomPlayers}</span>
        <span className="text-white/60">{mode === 'room' ? `${total} ${c.players}` : `${answeredCount} / ${total} ${c.answered}`}</span>
      </div>
      <div className="grid gap-[.55%]" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {players.map((player, index) => {
          const answered = Boolean(player.hasAnswered);
          const status = reveal
            ? player.isCorrect
              ? 'border-[#4de19d]/65 bg-[#126b50]/88 text-white'
              : 'border-[#ff6d80]/60 bg-[#7f2032]/84 text-white'
            : answered && mode === 'answering'
              ? 'border-[#61d8ff]/45 bg-[#164a72]/78 text-white'
              : mode === 'room'
                ? 'border-white/15 bg-white/[.07] text-white/75'
                : 'border-white/10 bg-white/[.04] text-white/48';
          const dot = reveal
            ? player.isCorrect ? 'bg-[#8effc8]' : 'bg-[#ff9caa]'
            : answered && mode === 'answering' ? 'bg-[#61d8ff]' : mode === 'room' ? 'bg-white/45' : 'bg-white/20';

          return (
            <motion.div
              key={player.id ?? `${player.name}-${index}`}
              initial={reveal ? { opacity: .45, y: -3 } : false}
              animate={{ opacity: player.away ? .45 : 1, y: 0 }}
              transition={{ delay: reveal ? index * .035 : 0, duration: .2 }}
              className={`flex min-w-0 items-center gap-[4%] rounded-[.48vw] border px-[5%] py-[3%] ${status}`}
            >
              <i className={`h-[.48vw] min-h-1.5 w-[.48vw] min-w-1.5 shrink-0 rounded-full ${dot}`} />
              <b className="truncate text-[clamp(7px,.72vw,10px)]">{player.name}</b>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function TvHeader({ label, locale, players, playerMode, answeredCount = 0 }: { label: string; locale: Locale; players?: QuizPulseScore[]; playerMode?: TvPlayerMode; answeredCount?: number }) {
  const c = copy(locale);
  return (
    <header className={playerMode ? 'relative grid grid-cols-[max-content_minmax(0,1fr)_max-content] items-center gap-[2%]' : 'relative flex items-center justify-between'}>
      <b className="text-[clamp(17px,2.5vw,35px)] font-black tracking-[-.06em]">{c.quiz}</b>
      {playerMode && players && <TvPlayersPanel players={players} mode={playerMode} answeredCount={answeredCount} locale={locale} />}
      <div className="relative w-fit min-w-max justify-self-end overflow-hidden whitespace-nowrap rounded-[.6vw] border border-white/20 bg-[#111827]/82 px-[clamp(9px,1.05vw,15px)] py-[clamp(4.5px,.41vw,6px)] backdrop-blur-md">
        <i className="absolute inset-y-0 left-0 w-[.26vw] bg-[#f13e55]" />
        <span className="text-[clamp(6px,.64vw,9px)] font-black uppercase tracking-[.18em]">{label}</span>
      </div>
    </header>
  );
}

function Timer({ value, max, danger = false, compact = false }: { value: number; max: number; danger?: boolean; compact?: boolean }) {
  const reduced = useReducedMotion();
  const progress = Math.max(0, Math.min(1, value / Math.max(max, 1)));
  return (
    <div className={`${compact ? 'h-[7px] sm:h-2' : 'h-2 sm:h-2.5'} overflow-hidden rounded-full bg-white/10`}>
      <motion.div
        initial={false}
        animate={{ scaleX: progress }}
        transition={{ duration: reduced ? 0 : 1, ease: 'linear' }}
        className={`relative h-full origin-left overflow-hidden rounded-full will-change-transform ${danger ? 'bg-[#f13e55]' : 'bg-[linear-gradient(90deg,#26a7ff,#61d8ff)]'}`}
      >
        {!danger && !reduced && <motion.i animate={{ x: ['-100%', '650%'] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="absolute inset-y-0 left-0 w-[18%] bg-white/70 blur-[2px]" />}
      </motion.div>
    </div>
  );
}

function AnswerGrid({ locale, question, selected, reveal, interactive, onAnswer, special = false, tv = false }: { locale: Locale; question: QuizPulseQuestion; selected?: number; reveal: boolean; interactive: boolean; onAnswer?: (index: number) => void; special?: boolean; tv?: boolean }) {
  const reduced = useReducedMotion();
  const c = copy(locale);
  return (
    <div className={`grid ${tv ? 'grid-cols-2 gap-3' : 'grid-cols-1 gap-2 sm:grid-cols-2'}`}>
      {question.options.map((option, index) => {
        const chosen = selected === index;
        const correct = reveal && question.correctIndex === index;
        const wrong = reveal && chosen && !correct;
        const muted = reveal && !correct && !wrong;
        return (
          <motion.button
            type="button"
            key={index}
            disabled={!interactive}
            aria-pressed={interactive ? chosen : undefined}
            aria-label={interactive ? `${locale === 'ru' ? 'Выбрать ответ' : 'Choose answer'} ${letters[index] ?? index + 1}: ${locale === 'ru' ? option.ru : option.en}` : undefined}
            onClick={() => onAnswer?.(index)}
            initial={reduced ? false : { opacity: 0, x: index % 2 ? 18 : -18 }}
            animate={{ opacity: muted ? .5 : 1, x: 0, scale: correct && !reduced ? [1, 1.018, 1] : chosen && !reduced ? [1, .975, 1.012, 1] : 1 }}
            whileTap={interactive && !reduced ? { scale: .965 } : undefined}
            transition={{ opacity: { duration: .22, delay: index * .035 }, x: { ...spring, delay: index * .045 }, scale: correct ? { duration: 1.5, repeat: Infinity } : { duration: .24 } }}
            data-selected={chosen}
            data-correct={correct}
            className={`quiz-pulse-answer relative flex items-center overflow-hidden rounded-xl border text-left text-white transition-[border-color,background-color,box-shadow] duration-200 ${tv ? 'min-h-14 px-4 py-3' : 'min-h-[58px] px-3.5 py-3 sm:min-h-[61px] sm:px-4'} ${correct ? 'border-[#4de19d]/70 bg-[#126b50]/92 shadow-[0_0_28px_rgba(77,225,157,.24)]' : wrong ? 'border-[#f13e55]/75 bg-[#70263a]/92' : chosen ? 'border-[#61d8ff]/65 bg-[#164a72]/92 shadow-[0_0_24px_rgba(97,216,255,.18)]' : special ? 'border-white/20 bg-[#111827]/82 backdrop-blur-md' : 'border-[#5d85bb]/35 bg-[#102c54]/92 backdrop-blur-md'} ${interactive ? 'cursor-pointer hover:border-[#61d8ff]/65 hover:bg-[#164a72]/80' : 'cursor-default'}`}
          >
            <span className={`relative z-10 flex shrink-0 items-center justify-center rounded-lg bg-white/10 font-black ${tv ? 'h-9 w-9 text-sm' : 'h-[38px] w-[38px] text-sm'} ${chosen || correct ? 'text-white' : 'text-[#8fbfff]'}`}>{letters[index] ?? index + 1}</span>
            <b className={`relative z-10 ml-3 leading-tight ${tv ? 'text-[clamp(14px,1.35vw,24px)]' : 'text-base sm:text-[17px]'}`}>{locale === 'ru' ? option.ru : option.en}</b>
            {correct && <span className={`relative z-10 ml-auto pl-2 font-black text-[#8effc8] ${tv ? 'text-[11px]' : 'text-[9px]'}`}>{c.correctAnswer}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

function Rankings({ scores, final, locale, tv = false }: { scores: QuizPulseScore[]; final: boolean; locale: Locale; tv?: boolean }) {
  const density = scores.length <= 4 ? 'large' : scores.length <= 7 ? 'medium' : 'compact';
  const useTwoColumns = tv && scores.length >= 5;
  const rowCount = Math.ceil(scores.length / 2);
  const gapClass = tv
    ? useTwoColumns
      ? density === 'medium' ? 'gap-x-[2.5%] gap-y-[clamp(5px,.5vw,7px)]' : 'gap-x-[2%] gap-y-[clamp(3px,.35vw,5px)]'
      : 'gap-[clamp(6px,.6vw,9px)]'
    : density === 'large' ? 'gap-3' : density === 'medium' ? 'gap-2' : 'gap-1.5';
  const rowClass = tv
    ? density === 'large' ? 'rounded-[1vw] px-[5%] py-[1.8%]' : density === 'medium' ? 'rounded-[.85vw] px-[4.5%] py-[1%]' : 'rounded-[.75vw] px-[4%] py-[.65%]'
    : density === 'large' ? 'rounded-[14px] px-4 py-4' : density === 'medium' ? 'rounded-[12px] px-3.5 py-2.5' : 'rounded-[10px] px-3 py-1.5';
  const rankClass = tv
    ? density === 'large' ? 'mr-1 w-[10%] text-[clamp(11px,1.15vw,17px)]' : density === 'medium' ? 'mr-1 w-[9%] text-[clamp(9px,.95vw,14px)]' : 'mr-1 w-[8%] text-[clamp(8px,.85vw,12px)]'
    : density === 'large' ? 'mr-1 w-7 text-[12px]' : density === 'medium' ? 'mr-1 w-6 text-[10px]' : 'mr-1 w-5 text-[9px]';
  const nameClass = tv
    ? density === 'large' ? 'text-[clamp(13px,1.45vw,21px)]' : density === 'medium' ? 'text-[clamp(11px,1.15vw,17px)]' : 'text-[clamp(9px,1vw,14px)]'
    : density === 'large' ? 'text-[17px]' : density === 'medium' ? 'text-[14px]' : 'text-[12px]';
  const scoreClass = tv
    ? density === 'large' ? 'text-[clamp(18px,1.8vw,26px)]' : density === 'medium' ? 'text-[clamp(16px,1.5vw,22px)]' : 'text-[clamp(14px,1.3vw,19px)]'
    : density === 'large' ? 'text-[24px]' : density === 'medium' ? 'text-[20px]' : 'text-[17px]';

  return (
    <div
      className={`grid ${useTwoColumns ? `h-full grid-flow-col grid-cols-2 ${density === 'medium' ? 'w-[74%]' : 'w-[88%]'}` : tv ? 'h-[75%] w-[52%] grid-cols-1' : 'grid-cols-1'} ${tv ? 'mx-auto' : ''} ${gapClass}`}
      style={useTwoColumns ? { gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` } : undefined}
    >
      {scores.map((entry, index) => (
        <motion.div
          key={entry.id ?? `${entry.name}-${index}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: entry.away ? .45 : 1, y: 0 }}
          transition={{ delay: index * .035 }}
          className={`flex min-w-0 items-center overflow-hidden border backdrop-blur-md ${rowClass} ${index === 0 ? 'border-[#61d8ff]/55 bg-[#164a72]/92 shadow-[0_0_28px_rgba(38,167,255,.16)]' : 'border-white/15 bg-[#111827]/82'}`}
        >
          <span className={`shrink-0 font-black text-[#8fbfff] ${rankClass}`}>{index + 1}</span>
          <b className={`truncate ${nameClass}`}>{entry.name}</b>
          {final && index === 0 && tv && <span className={`ml-3 rounded-full bg-[#f13e55] font-black uppercase tracking-wide ${density === 'large' ? 'px-3 py-1.5 text-[11px]' : 'px-2 py-1 text-[8px]'}`}>{locale === 'ru' ? 'ПОБЕДИТЕЛЬ' : 'WINNER'}</span>}
          <strong className={`ml-auto pl-2 text-[#65c8ff] ${scoreClass}`}>{entry.score}</strong>
        </motion.div>
      ))}
    </div>
  );
}

function PrimaryButton({ children, onClick, secondary = false }: { children: ReactNode; onClick: () => void; secondary?: boolean }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-[16px] py-4 text-lg font-black uppercase tracking-wide transition active:scale-[.98] ${secondary ? 'border border-white/15 bg-white/[.06] text-white/75' : 'bg-[#f13e55] text-white shadow-[0_12px_30px_-15px_#f13e55]'}`}>{children}</button>;
}

export function QuizPulsePlayerScreen(props: PlayerProps) {
  const c = copy(props.locale);
  const reduced = useReducedMotion();
  const isQuestion = props.phase === 'question' && props.question;
  const final = props.phase === 'final';
  const leaderboard = props.phase === 'mid-leaderboard' || final;
  const label = props.topic || (props.locale === 'ru' ? 'Общий квиз' : 'General quiz');

  return (
    <PulseSurface backgroundUrl={props.backgroundUrl} className="min-h-[100dvh]">
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <Header label={label} locale={props.locale} onEnd={props.isGameHost ? props.onEnd : undefined} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.main key={`${props.phase}-${props.questionIndex}-${props.showCorrect}`} className="flex min-h-0 flex-1 flex-col" initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -10 }} transition={{ duration: .24 }}>
            {props.phase === 'waiting' && (
              <><div className="flex flex-1 flex-col items-center justify-center text-center"><h1 className="text-7xl font-black tracking-[-.055em]">{props.locale === 'ru' ? 'Квиз' : 'Quiz'}</h1><div className="mt-8 flex flex-wrap justify-center gap-3">{props.difficulty && <span className="rounded-xl border border-white/15 bg-white/[.08] px-4 py-2.5 text-base font-bold backdrop-blur-md">{props.difficulty}</span>}<span className="rounded-xl border border-white/15 bg-white/[.08] px-4 py-2.5 text-base font-bold backdrop-blur-md">{label}</span></div><p className="mt-10 text-2xl font-bold leading-snug text-white/85">{props.totalQuestions} {c.questions}.<br />{c.rules}</p><p className="mt-4 text-xl text-white/50">{c.players}: {props.totalPlayers}</p></div>{props.isGameHost ? <PrimaryButton onClick={props.onStart}>{c.start}</PrimaryButton> : <p className="pb-4 text-center text-sm font-black uppercase tracking-[.16em] text-white/45">{c.waitingHost}</p>}</>
            )}
            {props.phase === 'countdown' && (
              <div className="flex flex-1 flex-col items-center justify-center"><span className="text-base font-black uppercase tracking-[.18em] text-[#8fbfff]">{c.question} {String(props.questionIndex + 1).padStart(2, '0')}</span><motion.b key={props.countdownValue} initial={reduced ? false : { scale: .72, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="mt-5 text-[176px] font-black leading-none drop-shadow-[0_0_40px_rgba(38,167,255,.6)]">{props.countdownValue}</motion.b><p className="mt-6 text-sm font-black uppercase tracking-[.2em] text-white/45">{c.ready}</p></div>
            )}
            {isQuestion && props.question && (
              <>
                <section className={`mt-4 rounded-[20px] border p-4 backdrop-blur-md ${props.backgroundUrl ? 'border-white/20 bg-[#111827]/82' : 'border-[#4e7db7]/30 bg-[#0b2345]/88'}`}>
                  <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-[.14em] text-[#8fbfff]"><span>{c.question} {String(props.questionIndex + 1).padStart(2, '0')}</span><span className="text-white">{props.timeLeft} {c.seconds}</span></div>
                  <div className="mt-2.5"><Timer value={props.timeLeft} max={props.timePerQuestion} danger={props.showCorrect || props.timeLeft <= 5} compact /></div>
                  <h2 className="mt-4 text-[clamp(1.5rem,7vw,2.25rem)] font-black leading-[1.06] tracking-[-.04em]">{props.locale === 'ru' ? props.question.questionRu : props.question.questionEn}</h2>
                </section>
                <section className={`mt-2.5 rounded-[20px] border p-2 backdrop-blur-md ${props.backgroundUrl ? 'border-white/15 bg-[#070d19]/48' : 'border-[#4e7db7]/25 bg-[#071a35]/72'}`}>
                  <AnswerGrid locale={props.locale} question={props.question} selected={props.myAnswer} reveal={props.showCorrect} interactive={!props.showCorrect} onAnswer={props.onAnswer} special={Boolean(props.backgroundUrl)} />
                </section>
                <div className="mt-auto pt-4">
                  {!props.showCorrect && props.myAnswer === undefined && <p className="pb-3 text-center text-[13px] font-bold uppercase tracking-[.12em] text-white/45">{c.choose}</p>}
                  {!props.showCorrect && props.myAnswer !== undefined && <div className="flex min-h-[51px] w-full items-center justify-between rounded-[14px] bg-[#164a72] px-4 py-3.5"><span className="text-[11px] font-black uppercase tracking-[.12em]">{c.accepted}</span><b className="text-[11px] uppercase tracking-[.08em] text-[#a9dcff]">{c.canChange}</b></div>}
                  {props.showCorrect && <motion.div initial={reduced ? false : { y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`flex min-h-[51px] w-full items-center justify-between rounded-[14px] px-4 py-3.5 ${props.myAnswerIsCorrect ? 'bg-[#126b50]' : 'bg-[#7f2032]'}`}><span className="text-[11px] font-black uppercase tracking-[.12em]">{props.myAnswerIsCorrect ? c.correct : c.wrong}</span><b className={props.myAnswerIsCorrect ? 'text-[15px]' : 'text-[11px] uppercase tracking-[.08em] text-[#ffbdc5]'}>{props.myAnswerIsCorrect ? c.point : c.noPoint}</b></motion.div>}
                  {props.showCorrect && props.isGameHost && <div className="mt-3"><PrimaryButton onClick={props.onNext}>{props.questionIndex + 1 < props.totalQuestions ? (props.locale === 'ru' ? 'СЛЕДУЮЩИЙ ВОПРОС' : 'NEXT QUESTION') : (props.locale === 'ru' ? 'ПОКАЗАТЬ РЕЗУЛЬТАТЫ' : 'SHOW RESULTS')}</PrimaryButton></div>}
                </div>
              </>
            )}
            {leaderboard && (
              <><div className="mt-2 text-center"><h2 className="text-3xl font-black leading-none">{final ? c.victory : c.leaderboard}</h2><p className="mt-1 text-[9px] uppercase tracking-[.11em] text-white/45">{final ? `${c.quizComplete} · ${props.totalPlayers} ${c.players}` : `${c.after} ${props.questionIndex + 1} / ${props.totalQuestions} · ${props.totalPlayers} ${c.players}`}</p></div><div className="mt-2 min-h-0 flex-1"><Rankings scores={props.scores} final={final} locale={props.locale} /></div><div className="mt-2 flex shrink-0 gap-2">{final && props.isGameHost && <button type="button" onClick={props.onEnd} className="w-2/5 rounded-[14px] border border-white/15 bg-white/[.06] py-3 text-sm font-black">{c.lobby}</button>}{props.isGameHost && <div className="flex-1"><PrimaryButton onClick={final ? props.onPlayAgain : props.onContinue}>{final ? c.playAgain : c.continue}</PrimaryButton></div>}</div></>
            )}
          </motion.main>
        </AnimatePresence>
      </div>
    </PulseSurface>
  );
}

export function QuizPulseTvScreen(props: TvProps) {
  const c = copy(props.locale);
  const reduced = useReducedMotion();
  const label = props.topic || (props.locale === 'ru' ? 'Общий квиз' : 'General quiz');
  const final = props.phase === 'final';
  const leaderboard = props.phase === 'mid-leaderboard' || final;
  const question = props.phase === 'question' ? props.question : null;
  const playerMode: TvPlayerMode | undefined = leaderboard
    ? undefined
    : question
      ? props.showCorrect ? 'reveal' : 'answering'
      : 'room';

  return (
    <PulseSurface backgroundUrl={props.backgroundUrl} className="flex h-screen items-center justify-center">
      <div className="relative flex h-[min(100vh,56.25vw)] w-[min(100vw,177.777vh)] flex-col px-[3.5%] py-[2.5%]">
        <TvHeader label={label} locale={props.locale} players={props.players} playerMode={playerMode} answeredCount={props.answeredCount} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.main key={`${props.phase}-${props.questionIndex}-${props.showCorrect}`} className="flex min-h-0 flex-1 flex-col" initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -10 }} transition={{ duration: .25 }}>
            {(props.isSetup || props.phase === 'waiting') && <div className="flex flex-1 flex-col items-center justify-center text-center"><h1 className="text-[clamp(32px,3.2vw,60px)] font-black tracking-[-.04em]">{props.isSetup ? (props.locale === 'ru' ? 'Настройка игры' : 'Setting up') : c.startsSoon}</h1><p className="mt-4 text-[clamp(14px,1.35vw,24px)] text-white/55">{props.totalQuestions} {c.questions} · {props.totalPlayers} {c.players} · {label}</p><p className="absolute bottom-0 text-[clamp(9px,.85vw,14px)] font-black uppercase tracking-[.18em] text-white/40">{c.hostStarts}</p></div>}
            {props.phase === 'countdown' && <div className="flex flex-1 flex-col items-center justify-center"><span className="text-[clamp(9px,1vw,14px)] font-black uppercase tracking-[.2em] text-[#8fbfff]">{c.question} {String(props.questionIndex + 1).padStart(2, '0')}</span><motion.b key={props.countdownValue} initial={reduced ? false : { scale: .45, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="mt-[.5%] text-[clamp(68px,7.2vw,104px)] font-black leading-none drop-shadow-[0_0_4vw_rgba(38,167,255,.65)]">{props.countdownValue}</motion.b><p className="mt-[.5%] text-[clamp(7px,.8vw,12px)] font-black uppercase tracking-[.22em] text-white/42">{c.ready}</p></div>}
            {question && <div className="mt-[1.2%] flex min-h-0 flex-1 flex-col gap-[1.2%]"><section className={`flex min-h-0 flex-1 flex-col rounded-[1.35vw] border px-[2.5%] py-[1.5%] backdrop-blur-md ${props.backgroundUrl ? 'border-white/20 bg-[#111827]/82' : 'border-[#4e7db7]/30 bg-[#0b2345]/88'}`}><div className="flex items-center justify-between text-[clamp(8px,.9vw,13px)] font-black uppercase tracking-[.18em] text-[#8fbfff]"><span>{c.question} {String(props.questionIndex + 1).padStart(2, '0')}</span><span className="text-white">{props.showCorrect ? c.allAnswered : `${props.timeLeft} ${c.seconds}`}</span></div><div className="mt-[.8%]"><Timer value={props.timeLeft} max={props.timePerQuestion} danger={props.showCorrect || props.timeLeft <= 5} /></div><div className="flex min-h-0 flex-1 items-center justify-center text-center"><h2 className="w-full text-[clamp(18px,2vw,30px)] font-black leading-[1.02] tracking-[-.04em]">{props.locale === 'ru' ? question.questionRu : question.questionEn}</h2></div></section><section className={`mt-auto shrink-0 rounded-[1.35vw] border p-[1.15%] backdrop-blur-md ${props.backgroundUrl ? 'border-white/15 bg-[#070d19]/48' : 'border-[#4e7db7]/25 bg-[#071a35]/72'}`}><AnswerGrid locale={props.locale} question={question} reveal={props.showCorrect} interactive={false} special={Boolean(props.backgroundUrl)} tv /></section></div>}
            {leaderboard && <div className="mt-[.4%] flex min-h-0 flex-1 flex-col items-center"><div className="text-center"><h2 className="text-[clamp(18px,1.65vw,24px)] font-black">{final ? c.winner : c.leaderboard}</h2><p className="mt-[.1%] text-[clamp(7px,.72vw,10px)] uppercase tracking-[.16em] text-white/42">{final ? `${c.quizComplete} · ${props.totalPlayers} ${c.players}` : `${c.after} ${props.questionIndex + 1} / ${props.totalQuestions} · ${props.totalPlayers} ${c.players}`}</p></div><div className="mt-[.45%] min-h-0 w-full flex-1"><Rankings scores={props.scores} final={final} locale={props.locale} tv /></div></div>}
          </motion.main>
        </AnimatePresence>
      </div>
    </PulseSurface>
  );
}
