'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { WhoAmIIcon } from '@/components/games/WhoAmIIcon';
import styles from './WhoAmIClay.module.css';

export function playerInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '—';
}

export function ClayBlob({ name, active = false, size = 'md' }: { name: string; active?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  return <span className={`${styles.blob} ${styles[`blob${size.toUpperCase()}`]} ${active ? styles.blobActive : ''}`}>{playerInitial(name)}</span>;
}

export function ClayAmbient() {
  return <div className={styles.ambient} aria-hidden="true"><i /><i /><i /></div>;
}

export function WhoAmIClayMobileLayout({
  children,
  roomId,
  phaseKey,
  onEnd,
  locale,
}: {
  children: ReactNode;
  roomId: string;
  phaseKey: string;
  onEnd?: () => void;
  locale: 'ru' | 'en';
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className={styles.surface}>
      <ClayAmbient />
      <header className={styles.mobileHeader}>
        <span className={styles.brand}><i><WhoAmIIcon name="profile" /></i><b>{locale === 'ru' ? 'КТО Я?' : 'WHO AM I?'}</b></span>
        <div className={styles.headerActions}>
          <em>{roomId}</em>
          {onEnd && <button type="button" onClick={() => setConfirmOpen(true)}>{locale === 'ru' ? 'ВЫЙТИ' : 'EXIT'}</button>}
        </div>
      </header>
      <main className={styles.mobileMain}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={phaseKey}
            className={styles.phaseContent}
            initial={reduceMotion ? false : { opacity: 0, y: 12, scale: .985, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: .99, filter: 'blur(2px)' }}
            transition={{ duration: reduceMotion ? .01 : .34, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {confirmOpen && onEnd && (
          <motion.div className={styles.modalOverlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmOpen(false)}>
            <motion.div className={styles.modal} initial={reduceMotion ? false : { opacity: 0, y: 16, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .97 }} onClick={(event) => event.stopPropagation()}>
              <span className={styles.iconBlob}><WhoAmIIcon name="cross" /></span>
              <small className={styles.kicker}>{locale === 'ru' ? 'ЗАВЕРШИТЬ ИГРУ' : 'END GAME'}</small>
              <h3>{locale === 'ru' ? 'Покинуть пластилиновую ночь?' : 'Leave the clay night?'}</h3>
              <p>{locale === 'ru' ? 'Все игроки вернутся в лобби, текущий прогресс будет потерян.' : 'Everyone will return to the lobby and current progress will be lost.'}</p>
              <div className={styles.modalActions}>
                <button type="button" className={styles.secondaryButton} onClick={() => setConfirmOpen(false)}>{locale === 'ru' ? 'ОСТАТЬСЯ' : 'STAY'}</button>
                <button type="button" className={styles.dangerButton} onClick={onEnd}>{locale === 'ru' ? 'ЗАВЕРШИТЬ' : 'END'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function WhoAmIClayTvLayout({ children }: { children: ReactNode }) {
  return <div className={`${styles.surface} ${styles.tvSurface}`}><ClayAmbient />{children}</div>;
}

export { styles as whoAmIClayStyles };
