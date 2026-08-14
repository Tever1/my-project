'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import type { MafiaRole } from '@/types/game';
import styles from './MafiaClub.module.css';

const ROLE_IMAGE: Record<MafiaRole, string> = {
  citizen: 'citizen',
  mafia: 'mafia',
  don: 'don',
  maniac: 'maniac',
  detective: 'sheriff',
  doctor: 'doctor',
  lover: 'lover',
};

export function playerInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase() || '—';
}

export function MafiaRoleCard({ role, alt, priority = false }: { role: MafiaRole; alt: string; priority?: boolean }) {
  return (
    <div className={styles.roleCard}>
      <Image
        src={`/icons/mafia-roles/${ROLE_IMAGE[role]}.png`}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 520px) 88vw, 330px"
      />
    </div>
  );
}

export function MafiaRoleThumb({ role, alt = '' }: { role: MafiaRole; alt?: string }) {
  return (
    <span className={styles.roleThumb}>
      <Image src={`/icons/mafia-roles/${ROLE_IMAGE[role]}.png`} alt={alt} fill sizes="42px" />
    </span>
  );
}

export function MafiaOrnament() {
  return <div className={styles.ornament} aria-hidden="true"><span /></div>;
}

export function MafiaPlayerToken({ name }: { name: string }) {
  return <span className={styles.playerToken} aria-hidden="true">{playerInitials(name)}</span>;
}

export function MafiaClubMobileLayout({
  children,
  phase,
  round,
  phaseKey,
  onEnd,
  locale,
}: {
  children: ReactNode;
  phase: string;
  round?: number;
  phaseKey: string;
  onEnd?: () => void;
  locale: 'ru' | 'en';
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className={styles.surface}>
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.frame} aria-hidden="true" />
      <header className={styles.mobileHeader}>
        <span className={styles.monogram}>M</span>
        <div className={styles.headerCopy}>
          <strong>{locale === 'ru' ? 'ЗАКРЫТЫЙ КЛУБ' : 'THE PRIVATE CLUB'}</strong>
          <span>{phase}</span>
        </div>
        <div className={styles.headerActions}>
          {round != null && <span className={styles.roundPill}>{locale === 'ru' ? `Раунд ${round}` : `Round ${round}`}</span>}
          {onEnd && (
            <button type="button" className={styles.endButton} onClick={() => setConfirmOpen(true)}>
              {locale === 'ru' ? 'Выйти' : 'Exit'}
            </button>
          )}
        </div>
      </header>
      <main className={styles.mobileMain}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phaseKey}
            className={styles.phaseContent}
            initial={reduceMotion ? false : { opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -5, filter: 'blur(2px)' }}
            transition={{ duration: reduceMotion ? 0.01 : 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {confirmOpen && onEnd && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmOpen(false)}>
            <motion.div className={styles.modal} initial={reduceMotion ? false : { opacity: 0, y: 10, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .985 }} onClick={(event) => event.stopPropagation()}>
              <span className={styles.kicker}>{locale === 'ru' ? 'ЗАВЕРШЕНИЕ ВЕЧЕРА' : 'END THE EVENING'}</span>
              <h3>{locale === 'ru' ? 'Покинуть закрытый клуб?' : 'Leave the private club?'}</h3>
              <p>{locale === 'ru' ? 'Все игроки вернутся в лобби, текущий прогресс будет потерян.' : 'Every player will return to the lobby and current progress will be lost.'}</p>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setConfirmOpen(false)}>{locale === 'ru' ? 'Остаться' : 'Stay'}</button>
                <button type="button" className={styles.dangerButton} onClick={onEnd}>{locale === 'ru' ? 'Завершить' : 'End game'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MafiaClubTvLayout({
  children,
  phase,
  playerCount,
  footer,
}: {
  children: ReactNode;
  phase: string;
  playerCount: string;
  footer: string;
}) {
  return (
    <div className={`${styles.surface} ${styles.tvSurface}`}>
      <div className={styles.grain} aria-hidden="true" />
      <div className={`${styles.frame} ${styles.tvFrame}`} aria-hidden="true" />
      <header className={styles.tvHeader}>
        <div className={styles.tvBrand}><span className={styles.monogram}>M</span><b>THE PURPLE ROOM</b></div>
        <span className={styles.tvPhase}>{phase}</span>
        <span className={styles.tvMeta}>{playerCount}</span>
      </header>
      <main className={styles.tvMain}>{children}</main>
      <footer className={styles.tvFooter}><span>{footer}</span><b>PARTY GAMES HUB · PRIVATE SESSION</b></footer>
    </div>
  );
}

export { styles as mafiaClubStyles };
