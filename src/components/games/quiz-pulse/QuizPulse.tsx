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
}

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
    correct: ru ? 'ПРАВИЛЬНО' : 'CORRECT',
    wrong: ru ? 'НЕВЕРНО' : 'INCORRECT',
    point: ru ? '+ 1 ОЧКО' : '+ 1 POINT',
    noPoint: ru ? '+ 0 ОЧКОВ' : '+ 0 POINTS',
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
  };
}

function PulseSurface({ backgroundUrl, children, className = '' }: { backgroundUrl?: string; children: ReactNode; className?: string }) {
  const specialStyle: CSSProperties | undefined = backgroundUrl
    ? { backgroundImage: `url(${backgroundUrl})`, backgroundPosition: 'center', backgroundSize: 'cover' }
    : undefined;

  return (
    <div className={`relative isolate overflow-hidden bg-[#06172e] text-white ${className}`} style={specialStyle}>
      {!backgroundUrl && (
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_80%_12%,#1859a855,transparent_35%),radial-gradient(circle_at_15%_78%,#0878ff22,transparent_38%),linear-gradient(155deg,#0b2950,#051329_68%)]" />
      )}
      {backgroundUrl && <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,8,16,.34),rgba(5,8,16,.18)_40%,rgba(5,8,16,.48))]" />}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,transparent_0_58%,#2d7fc314_58%_59%,transparent_59%_100%)]" />
      <Sweep />
      {children}
    </div>
  );
}

function Sweep() {
  const reduced = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      animate={reduced ? undefined : { x: ['-150%', '1300%'] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-[9%] -skew-x-12 bg-gradient-to-r from-transparent via-[#67c7ff]/10 to-transparent"
    />
  );
}

function Header({ label, locale, onEnd }: { label: string; locale: Locale; onEnd?: () => void }) {
  const c = copy(locale);
  return (
    <header className="relative flex items-center justify-between gap-3">
      <b className="text-xl font-black tracking-[-.055em] sm:text-2xl">{c.quiz}</b>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-2 rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] backdrop-blur-md">
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

function TvHeader({ label, locale }: { label: string; locale: Locale }) {
  const c = copy(locale);
  return (
    <header className="relative flex items-center justify-between">
      <b className="text-[clamp(28px,2.5vw,48px)] font-black tracking-[-.06em]">{c.quiz}</b>
      <div className="relative overflow-hidden rounded-[.8vw] border border-white/20 bg-[#111827]/82 px-[3%] py-[1%] backdrop-blur-md">
        <i className="absolute inset-y-0 left-0 w-[.35vw] bg-[#f13e55]" />
        <span className="text-[clamp(11px,.85vw,17px)] font-black uppercase tracking-[.18em]">{label}</span>
      </div>
    </header>
  );
}

function Timer({ value, max, danger = false }: { value: number; max: number; danger?: boolean }) {
  const reduced = useReducedMotion();
  const width = `${Math.max(0, Math.min(100, (value / Math.max(max, 1)) * 100))}%`;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/10 sm:h-2">
      <motion.div
        animate={{ width }}
        transition={{ duration: reduced ? 0 : .8, ease: 'linear' }}
        className={`relative h-full overflow-hidden rounded-full ${danger ? 'bg-[#f13e55]' : 'bg-[linear-gradient(90deg,#26a7ff,#61d8ff)]'}`}
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
    <div className={`grid ${tv ? 'grid-cols-2 gap-3' : 'grid-cols-1 gap-2.5 sm:grid-cols-2'}`}>
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
            onClick={() => onAnswer?.(index)}
            initial={reduced ? false : { opacity: 0, x: index % 2 ? 18 : -18 }}
            animate={{ opacity: muted ? .5 : 1, x: 0, scale: correct && !reduced ? [1, 1.018, 1] : 1 }}
            transition={{ opacity: { duration: .3, delay: index * .04 }, x: { ...spring, delay: index * .04 }, scale: { duration: 1.5, repeat: correct ? Infinity : 0 } }}
            className={`relative flex min-h-12 items-center overflow-hidden rounded-xl border px-3 py-2.5 text-left text-white transition-colors sm:min-h-14 sm:px-4 ${correct ? 'border-[#4de19d]/70 bg-[#126b50]/92 shadow-[0_0_28px_rgba(77,225,157,.24)]' : wrong ? 'border-[#f13e55]/75 bg-[#70263a]/92' : chosen ? 'border-[#61d8ff]/65 bg-[#164a72]/92' : special ? 'border-white/20 bg-[#111827]/82 backdrop-blur-md' : 'border-[#5d85bb]/35 bg-[#102c54]/92 backdrop-blur-md'} ${interactive ? 'cursor-pointer hover:border-[#61d8ff]/65 hover:bg-[#164a72]/80' : 'cursor-default'}`}
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-black sm:h-9 sm:w-9 ${chosen || correct ? 'text-white' : 'text-[#8fbfff]'}`}>{letters[index] ?? index + 1}</span>
            <b className={`${tv ? 'text-[clamp(14px,1.35vw,24px)]' : 'text-sm sm:text-base'} ml-3 leading-tight`}>{locale === 'ru' ? option.ru : option.en}</b>
            {correct && <span className="ml-auto pl-2 text-[9px] font-black text-[#8effc8] sm:text-[10px]">{c.correctAnswer}</span>}
          </motion.button>
        );
      })}
    </div>
  );
}

function Rankings({ scores, final, locale, tv = false }: { scores: QuizPulseScore[]; final: boolean; locale: Locale; tv?: boolean }) {
  return (
    <div className={`grid ${tv ? 'grid-cols-2 gap-x-4 gap-y-2.5' : 'grid-cols-1 gap-1.5'}`}>
      {scores.map((entry, index) => (
        <motion.div
          key={entry.id ?? `${entry.name}-${index}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: entry.away ? .45 : 1, y: 0 }}
          transition={{ delay: index * .035 }}
          className={`flex min-w-0 items-center border backdrop-blur-md ${tv ? 'rounded-xl px-5 py-3' : 'rounded-lg px-3 py-1.5'} ${index === 0 ? 'border-[#61d8ff]/55 bg-[#164a72]/92 shadow-[0_0_28px_rgba(38,167,255,.16)]' : 'border-white/15 bg-[#111827]/82'}`}
        >
          <span className={`shrink-0 font-black text-[#8fbfff] ${tv ? 'mr-3 w-5 text-base' : 'mr-1.5 w-4 text-[10px]'}`}>{index + 1}</span>
          <b className={`truncate ${tv ? 'text-[clamp(13px,1.15vw,20px)]' : 'text-[10px]'}`}>{entry.name}</b>
          {final && index === 0 && tv && <span className="ml-3 rounded-full bg-[#f13e55] px-2 py-1 text-[8px] font-black uppercase tracking-wide">{locale === 'ru' ? 'ПОБЕДИТЕЛЬ' : 'WINNER'}</span>}
          <strong className={`ml-auto pl-2 text-[#65c8ff] ${tv ? 'text-2xl' : 'text-base'}`}>{entry.score}</strong>
        </motion.div>
      ))}
    </div>
  );
}

function PrimaryButton({ children, onClick, secondary = false }: { children: ReactNode; onClick: () => void; secondary?: boolean }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-[14px] py-3.5 text-sm font-black uppercase tracking-wide transition active:scale-[.98] ${secondary ? 'border border-white/15 bg-white/[.06] text-white/75' : 'bg-[#f13e55] text-white shadow-[0_12px_30px_-15px_#f13e55]'}`}>{children}</button>;
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
              <><div className="flex flex-1 flex-col items-center justify-center text-center"><h1 className="text-5xl font-black tracking-[-.05em]">{props.locale === 'ru' ? 'Квиз' : 'Quiz'}</h1><div className="mt-6 flex flex-wrap justify-center gap-2">{props.difficulty && <span className="rounded-lg border border-white/15 bg-white/[.08] px-3 py-2 text-xs font-bold backdrop-blur-md">{props.difficulty}</span>}<span className="rounded-lg border border-white/15 bg-white/[.08] px-3 py-2 text-xs font-bold backdrop-blur-md">{label}</span></div><p className="mt-8 text-base font-bold text-white/85">{props.totalQuestions} {c.questions}. {c.rules}</p><p className="mt-3 text-sm text-white/50">{c.players}: {props.totalPlayers}</p></div>{props.isGameHost ? <PrimaryButton onClick={props.onStart}>{c.start}</PrimaryButton> : <p className="pb-3 text-center text-[10px] font-black uppercase tracking-[.18em] text-white/45">{c.waitingHost}</p>}</>
            )}
            {props.phase === 'countdown' && (
              <div className="flex flex-1 flex-col items-center justify-center"><span className="text-[11px] font-black uppercase tracking-[.18em] text-[#8fbfff]">{c.question} {String(props.questionIndex + 1).padStart(2, '0')}</span><motion.b key={props.countdownValue} initial={reduced ? false : { scale: .5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="mt-4 text-[132px] font-black leading-none drop-shadow-[0_0_40px_rgba(38,167,255,.6)]">{props.countdownValue}</motion.b><p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-white/45">{c.ready}</p></div>
            )}
            {isQuestion && props.question && (
              <><div className={`mt-6 rounded-[18px] border p-4 backdrop-blur-md ${props.backgroundUrl ? 'border-white/20 bg-[#111827]/82' : 'border-[#4e7db7]/30 bg-[#0b2345]/88'}`}><div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[.15em] text-[#8fbfff]"><span>{c.question} {String(props.questionIndex + 1).padStart(2, '0')}</span><span className="text-white">{props.timeLeft} {c.seconds}</span></div><div className="mt-2"><Timer value={props.timeLeft} max={props.timePerQuestion} danger={props.showCorrect || props.timeLeft <= 5} /></div><h2 className="mt-4 text-[clamp(1.25rem,6vw,2rem)] font-black leading-[1.08] tracking-[-.035em]">{props.locale === 'ru' ? props.question.questionRu : props.question.questionEn}</h2></div><div className="mt-3"><AnswerGrid locale={props.locale} question={props.question} selected={props.myAnswer} reveal={props.showCorrect} interactive={props.myAnswer === undefined && !props.showCorrect} onAnswer={props.onAnswer} special={Boolean(props.backgroundUrl)} /></div><div className="mt-auto pt-5">{!props.showCorrect && props.myAnswer === undefined && <p className="pb-3 text-center text-[9px] font-bold uppercase tracking-[.13em] text-white/45">{c.choose}</p>}{!props.showCorrect && props.myAnswer !== undefined && <div className="flex w-full items-center justify-between rounded-[14px] bg-[#f13e55] px-4 py-3 shadow-[0_12px_30px_-15px_#f13e55]"><span className="text-[9px] font-black uppercase tracking-[.13em]">{c.accepted}</span><b className="text-xs">{c.point}</b></div>}{props.showCorrect && <div className={`flex w-full items-center justify-between rounded-[14px] px-4 py-3 ${props.myAnswerIsCorrect ? 'bg-[#126b50]' : 'bg-[#70263a]'}`}><span className="text-[9px] font-black uppercase tracking-[.13em]">{props.myAnswerIsCorrect ? c.correct : c.wrong}</span><b className="text-xs">{props.myAnswerIsCorrect ? c.point : c.noPoint}</b></div>}{props.showCorrect && props.isGameHost && <div className="mt-3"><PrimaryButton onClick={props.onNext}>{props.questionIndex + 1 < props.totalQuestions ? (props.locale === 'ru' ? 'СЛЕДУЮЩИЙ ВОПРОС' : 'NEXT QUESTION') : (props.locale === 'ru' ? 'ПОКАЗАТЬ РЕЗУЛЬТАТЫ' : 'SHOW RESULTS')}</PrimaryButton></div>}</div></>
            )}
            {leaderboard && (
              <><div className="mt-6 text-center"><h2 className="text-3xl font-black">{final ? c.victory : c.leaderboard}</h2><p className="mt-2 text-[10px] uppercase tracking-[.12em] text-white/45">{final ? `${c.quizComplete} · ${props.totalPlayers} ${c.players}` : `${c.after} ${props.questionIndex + 1} / ${props.totalQuestions} · ${props.totalPlayers} ${c.players}`}</p></div><div className="mt-6"><Rankings scores={props.scores} final={final} locale={props.locale} /></div><div className="mt-auto flex gap-2 pt-5">{final && props.isGameHost && <button type="button" onClick={props.onEnd} className="w-2/5 rounded-[14px] border border-white/15 bg-white/[.06] py-3 text-xs font-black">{c.lobby}</button>}{props.isGameHost && <div className="flex-1"><PrimaryButton onClick={final ? props.onPlayAgain : props.onContinue}>{final ? c.playAgain : c.continue}</PrimaryButton></div>}</div></>
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

  return (
    <PulseSurface backgroundUrl={props.backgroundUrl} className="flex h-screen items-center justify-center">
      <div className="relative flex h-[min(100vh,56.25vw)] w-[min(100vw,177.777vh)] flex-col px-[3.5%] py-[2.5%]">
        <TvHeader label={label} locale={props.locale} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.main key={`${props.phase}-${props.questionIndex}-${props.showCorrect}`} className="flex min-h-0 flex-1 flex-col" initial={reduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -10 }} transition={{ duration: .25 }}>
            {(props.isSetup || props.phase === 'waiting') && <div className="flex flex-1 flex-col items-center justify-center text-center"><h1 className="text-[clamp(32px,3.2vw,60px)] font-black tracking-[-.04em]">{props.isSetup ? (props.locale === 'ru' ? 'Настройка игры' : 'Setting up') : c.startsSoon}</h1><p className="mt-4 text-[clamp(14px,1.35vw,24px)] text-white/55">{props.totalQuestions} {c.questions} · {props.totalPlayers} {c.players} · {label}</p><p className="absolute bottom-0 text-[clamp(9px,.85vw,14px)] font-black uppercase tracking-[.18em] text-white/40">{c.hostStarts}</p></div>}
            {props.phase === 'countdown' && <div className="flex flex-1 flex-col items-center justify-center"><span className="text-[clamp(12px,1.1vw,20px)] font-black uppercase tracking-[.2em] text-[#8fbfff]">{c.question} {String(props.questionIndex + 1).padStart(2, '0')}</span><motion.b key={props.countdownValue} initial={reduced ? false : { scale: .45, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring} className="mt-1 text-[clamp(110px,12vw,220px)] font-black leading-none drop-shadow-[0_0_4vw_rgba(38,167,255,.65)]">{props.countdownValue}</motion.b><p className="mt-1 text-[clamp(9px,.8vw,14px)] font-black uppercase tracking-[.22em] text-white/42">{c.ready}</p></div>}
            {question && <div className={`mt-[2%] flex min-h-0 flex-1 flex-col rounded-[1.5vw] border p-[2.5%] backdrop-blur-md ${props.backgroundUrl ? 'border-white/20 bg-[#111827]/82' : 'border-[#4e7db7]/30 bg-[#0b2345]/88'}`}><div className="flex items-center justify-between text-[clamp(11px,.9vw,17px)] font-black uppercase tracking-[.18em] text-[#8fbfff]"><span>{c.question} {String(props.questionIndex + 1).padStart(2, '0')}</span><span className="text-white">{props.showCorrect ? c.allAnswered : `${props.timeLeft} ${c.seconds} · ${c.answered} ${props.answeredCount}/${props.totalPlayers}`}</span></div><div className="mt-[1%]"><Timer value={props.timeLeft} max={props.timePerQuestion} danger={props.showCorrect || props.timeLeft <= 5} /></div><h2 className="mt-[1.7%] max-w-[86%] text-[clamp(30px,3.1vw,58px)] font-black leading-[1.02] tracking-[-.04em]">{props.locale === 'ru' ? question.questionRu : question.questionEn}</h2><div className="mt-auto"><AnswerGrid locale={props.locale} question={question} reveal={props.showCorrect} interactive={false} special={Boolean(props.backgroundUrl)} tv /></div></div>}
            {leaderboard && <div className="mt-[2vh] flex min-h-0 flex-1 flex-col"><div className="text-center"><h2 className="text-[clamp(32px,3vw,56px)] font-black">{final ? c.winner : c.leaderboard}</h2><p className="mt-1 text-[clamp(10px,.85vw,15px)] uppercase tracking-[.16em] text-white/42">{final ? c.quizComplete : `${c.after} ${props.questionIndex + 1} / ${props.totalQuestions}`}</p></div><div className="mx-auto mt-[2vh] w-[88%]"><Rankings scores={props.scores} final={final} locale={props.locale} tv /></div></div>}
          </motion.main>
        </AnimatePresence>
      </div>
    </PulseSurface>
  );
}
