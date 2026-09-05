"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";

type ConceptId = "noir" | "club" | "thriller";

type Concept = {
  id: ConceptId;
  number: string;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  secondary: string;
  font: string;
  tags: string[];
};

const concepts: Concept[] = [
  {
    id: "noir",
    number: "01",
    name: "Кинематографичный нуар",
    subtitle: "Тишина, дым и направленный свет",
    description:
      "Самый сдержанный вариант. Тёмный город, мягкий фиолетовый контровой свет и ощущение старого криминального фильма.",
    accent: "#a78bfa",
    secondary: "#b91c1c",
    font: 'Georgia, "Times New Roman", serif',
    tags: ["кино", "минимализм", "медленное напряжение"],
  },
  {
    id: "club",
    number: "02",
    name: "Закрытый клуб",
    subtitle: "Бархат, латунь и строгая церемония",
    description:
      "Более роскошный и театральный вариант. Ар-деко рамки, тёплые металлические детали и ощущение тайного собрания.",
    accent: "#c4b5fd",
    secondary: "#d6b46a",
    font: 'Georgia, "Times New Roman", serif',
    tags: ["ар-деко", "премиальность", "ритуал"],
  },
  {
    id: "thriller",
    number: "03",
    name: "Фиолетовый триллер",
    subtitle: "Острый ритм, тревога и цифровой свет",
    description:
      "Самый современный и динамичный вариант. Контрастные панели, резкие световые срезы и напряжение психологического триллера.",
    accent: "#8b5cf6",
    secondary: "#ef4444",
    font: 'var(--font-geist-sans), system-ui, sans-serif',
    tags: ["современно", "контраст", "выразительное движение"],
  },
];

const roleDeck = [
  { id: "citizen", label: "Мирный житель" },
  { id: "mafia", label: "Мафия" },
  { id: "don", label: "Дон" },
  { id: "sheriff", label: "Шериф" },
  { id: "doctor", label: "Доктор" },
  { id: "maniac", label: "Маньяк" },
  { id: "lover", label: "Любовница" },
];

function MoonIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M37.8 32.4A18 18 0 0 1 15.6 10.2 19 19 0 1 0 37.8 32.4Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function RoleDeck() {
  return (
    <section className="mafia-preview-deck" aria-labelledby="role-deck-title">
      <div className="mafia-preview-deck-copy">
        <span>Исходная колода</span>
        <h2 id="role-deck-title">Семь ролей — один визуальный мир</h2>
        <p>Изображения используются без перерисовки. В концептах ниже показана полная карта Мафии.</p>
      </div>
      <div className="mafia-preview-deck-grid">
        {roleDeck.map((role) => (
          <figure key={role.id} className="mafia-preview-deck-card">
            <Image
              src={`/icons/mafia-roles/${role.id}.png`}
              alt={`Карточка роли «${role.label}»`}
              fill
              sizes="(max-width: 720px) 25vw, 132px"
            />
            <figcaption>{role.label}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function PhoneRoleReveal({ concept }: { concept: Concept }) {
  const [revealed, setRevealed] = useState(false);
  const reduceMotion = useReducedMotion();

  const beginReveal = (event?: PointerEvent<HTMLButtonElement>) => {
    if (event) event.currentTarget.setPointerCapture(event.pointerId);
    setRevealed(true);
  };

  const endReveal = () => setRevealed(false);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    setRevealed(true);
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== " " && event.key !== "Enter") return;
    event.preventDefault();
    setRevealed(false);
  };

  return (
    <div className="mafia-device-column">
      <div className="mafia-device-label">
        <span>Телефон</span>
        <b>390 × 844</b>
      </div>
      <div className="mafia-phone-viewport">
        <div className={`mafia-phone-canvas mafia-phone-${concept.id}`}>
          <div className="mafia-phone-safe-top">
            <span>22:41</span>
            <div><i /><i /><i /></div>
          </div>

          <header className="mafia-phone-header">
            <span className="mafia-phone-round">Раунд 1 · Раздача ролей</span>
            <span className="mafia-phone-lock">Только для вас</span>
          </header>

          <div className="mafia-phone-heading">
            <span className="mafia-phone-kicker">Ваша тайная роль</span>
            <h3>{revealed ? "НИКОМУ НЕ ПОКАЗЫВАЙТЕ" : "УЗНАЙТЕ, КТО ВЫ"}</h3>
            <p>{revealed ? "Отпустите экран, чтобы снова скрыть карту" : "Убедитесь, что никто не смотрит на экран"}</p>
          </div>

          <button
            type="button"
            className={`mafia-role-reveal mafia-role-reveal-${concept.id}`}
            aria-label="Удерживайте, чтобы увидеть свою роль"
            aria-pressed={revealed}
            onPointerDown={beginReveal}
            onPointerUp={endReveal}
            onPointerCancel={endReveal}
            onPointerLeave={endReveal}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            onContextMenu={(event) => event.preventDefault()}
          >
            <AnimatePresence initial={false} mode="wait">
              {revealed ? (
                <motion.div
                  key="role"
                  className="mafia-role-image"
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.96, filter: "blur(9px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985, filter: "blur(4px)" }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.32, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Image
                    src="/icons/mafia-roles/mafia.png"
                    alt="Ваша роль — Мафия"
                    fill
                    priority
                    draggable={false}
                    sizes="350px"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="hidden"
                  className="mafia-role-hidden"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduceMotion ? 0.01 : 0.18 }}
                >
                  <div className="mafia-role-back-mark">M</div>
                  <div className="mafia-role-back-lines" aria-hidden="true" />
                  <div className="mafia-role-hold-ring">
                    <EyeIcon size={25} />
                    <span>Удерживайте</span>
                  </div>
                  <p>Роль скроется, как только вы отпустите экран</p>
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <footer className="mafia-phone-footer">
            <span className="mafia-phone-privacy-dot" />
            Экран защищён режимом удерживания
          </footer>
        </div>
      </div>
    </div>
  );
}

function NoirTv() {
  return (
    <div className="mafia-tv-canvas mafia-tv-noir">
      <div className="mafia-tv-noir-grain" />
      <div className="mafia-tv-topbar">
        <div><span className="mafia-tv-mark">M</span><b>МАФИЯ</b></div>
        <span>Раунд 1</span>
        <span>8 игроков в городе</span>
      </div>
      <div className="mafia-tv-noir-moon"><MoonIcon size={260} /></div>
      <main>
        <span>Первая ночь</span>
        <h3>ГОРОД<br />ЗАСЫПАЕТ</h3>
        <p>Закройте глаза. Ночные роли делают свой выбор на телефонах.</p>
      </main>
      <div className="mafia-tv-progress"><i /><span>Роли знакомятся с городом</span></div>
    </div>
  );
}

function ClubTv() {
  return (
    <div className="mafia-tv-canvas mafia-tv-club">
      <div className="mafia-club-curtain mafia-club-curtain-left" />
      <div className="mafia-club-curtain mafia-club-curtain-right" />
      <div className="mafia-club-frame">
        <span className="mafia-club-corner mafia-club-corner-tl" />
        <span className="mafia-club-corner mafia-club-corner-tr" />
        <span className="mafia-club-corner mafia-club-corner-bl" />
        <span className="mafia-club-corner mafia-club-corner-br" />
      </div>
      <header>
        <span>THE PURPLE ROOM</span>
        <b>ЧАСТНЫЙ КЛУБ · С 1928 ГОДА</b>
      </header>
      <main>
        <div className="mafia-club-moon"><MoonIcon size={150} /></div>
        <span>НОЧЬ I</span>
        <h3>Город погружается<br />в тишину</h3>
        <div className="mafia-club-divider"><i /><i /></div>
        <p>Господа, закройте глаза.<br />Ваши роли ждут решения.</p>
      </main>
      <footer><span>Ход игры продолжается на личных устройствах</span><b>01 / 04</b></footer>
    </div>
  );
}

function ThrillerTv() {
  return (
    <div className="mafia-tv-canvas mafia-tv-thriller">
      <div className="mafia-thriller-scan" />
      <div className="mafia-thriller-beam" />
      <header>
        <div><span>М</span><b>MAFIA / NIGHT PROTOCOL</b></div>
        <div><i /> СИСТЕМА АКТИВНА</div>
      </header>
      <main>
        <div className="mafia-thriller-index">01</div>
        <div className="mafia-thriller-copy">
          <span>Ночная фаза</span>
          <h3>ВСЕ РЕШЕНИЯ<br />ОСТАНУТСЯ В ТЕНИ</h3>
          <p>Закройте глаза. Следите только за экраном своего телефона.</p>
        </div>
        <div className="mafia-thriller-orbit"><MoonIcon size={240} /></div>
      </main>
      <footer>
        <div><span>8</span><small>игроков</small></div>
        <div><span>7</span><small>ролей</small></div>
        <div className="mafia-thriller-status"><i /><b>ОЖИДАЕМ НОЧНЫЕ ДЕЙСТВИЯ</b></div>
        <div><span>01</span><small>раунд</small></div>
      </footer>
    </div>
  );
}

function TvNight({ concept }: { concept: Concept }) {
  return (
    <div className="mafia-device-column mafia-device-tv-column">
      <div className="mafia-device-label">
        <span>Игровое поле · TV</span>
        <b>1920 × 1080</b>
      </div>
      <div className="mafia-tv-viewport">
        {concept.id === "noir" ? <NoirTv /> : concept.id === "club" ? <ClubTv /> : <ThrillerTv />}
      </div>
    </div>
  );
}

function ConceptSection({ concept, selected, onSelect }: { concept: Concept; selected: boolean; onSelect: () => void }) {
  return (
    <section id={concept.id} className={`mafia-concept mafia-concept-${concept.id} ${selected ? "is-selected" : ""}`}>
      <div className="mafia-concept-intro">
        <div className="mafia-concept-number">{concept.number}</div>
        <div className="mafia-concept-copy">
          <span>{concept.subtitle}</span>
          <h2 style={{ fontFamily: concept.font }}>{concept.name}</h2>
          <p>{concept.description}</p>
          <div className="mafia-concept-tags">
            {concept.tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </div>
        <button
          type="button"
          className="mafia-concept-select"
          style={{ "--concept-accent": concept.accent } as CSSProperties}
          onClick={onSelect}
          aria-pressed={selected}
        >
          {selected ? "Вариант выбран" : "Выбрать направление"}
        </button>
      </div>

      <div className="mafia-concept-devices">
        <PhoneRoleReveal concept={concept} />
        <TvNight concept={concept} />
      </div>
    </section>
  );
}

type ClubPhaseId = "lobby" | "night" | "day" | "voting" | "verdict" | "finale";

const clubPhases: { id: ClubPhaseId; number: string; label: string; note: string }[] = [
  { id: "lobby", number: "01", label: "Сбор клуба", note: "ожидание игроков" },
  { id: "night", number: "02", label: "Ночное действие", note: "личный выбор роли" },
  { id: "day", number: "03", label: "Утро", note: "событие и обсуждение" },
  { id: "voting", number: "04", label: "Голосование", note: "решение города" },
  { id: "verdict", number: "05", label: "Приговор", note: "исход голосования" },
  { id: "finale", number: "06", label: "Финал", note: "победитель и роли" },
];

const clubPlayers = ["АН", "МХ", "ЕК", "ДВ", "СЛ", "ИР"];

function ClubPhoneHeader({ phase, round = "Раунд 1" }: { phase: string; round?: string }) {
  return (
    <>
      <div className="club-flow-safe"><span>22:41</span><span>● ● ▰</span></div>
      <header className="club-flow-phone-header">
        <span className="club-flow-monogram">M</span>
        <div><b>ЗАКРЫТЫЙ КЛУБ</b><small>{phase}</small></div>
        <span className="club-flow-round">{round}</span>
      </header>
    </>
  );
}

function ClubPhoneScreen({ phase }: { phase: ClubPhaseId }) {
  if (phase === "lobby") {
    return (
      <div className="club-flow-phone club-flow-phone-lobby">
        <ClubPhoneHeader phase="Сбор гостей" round="До начала" />
        <main className="club-flow-phone-center">
          <span className="club-flow-kicker">THE PURPLE ROOM</span>
          <h3>Вечер скоро<br />начнётся</h3>
          <p>Все приглашённые подключены.<br />Ожидаем решение владельца клуба.</p>
          <div className="club-flow-seal"><span>8</span><small>из 8 гостей</small></div>
        </main>
        <div className="club-flow-guest-row">
          {clubPlayers.slice(0, 5).map((player) => <span key={player}>{player}</span>)}
          <span>+3</span>
        </div>
        <div className="club-flow-wait"><i /> Приглашение подтверждено</div>
      </div>
    );
  }

  if (phase === "night") {
    return (
      <div className="club-flow-phone club-flow-phone-night">
        <ClubPhoneHeader phase="Ночное действие" />
        <main className="club-flow-phone-action">
          <span className="club-flow-kicker">ВАШ ХОД · МАФИЯ</span>
          <h3>Кого сегодня<br />не станет?</h3>
          <p>Выберите одного гостя. Решение останется между членами семьи.</p>
          <div className="club-flow-targets">
            {["Анна", "Михаил", "Елена", "Давид"].map((name, index) => (
              <button key={name} type="button" className={index === 1 ? "is-target" : ""}>
                <span>{clubPlayers[index]}</span><b>{name}</b><small>{index === 1 ? "Выбрано" : "Гость клуба"}</small>
              </button>
            ))}
          </div>
          <button type="button" className="club-flow-primary">Подтвердить выбор</button>
        </main>
        <div className="club-flow-security">Решение скрыто от остальных игроков</div>
      </div>
    );
  }

  if (phase === "day") {
    return (
      <div className="club-flow-phone club-flow-phone-day">
        <ClubPhoneHeader phase="Дневное обсуждение" />
        <main className="club-flow-phone-action">
          <span className="club-flow-kicker">УТРО · СВОДКА КЛУБА</span>
          <h3>Город снова<br />открыл глаза</h3>
          <div className="club-flow-news">
            <span className="club-flow-news-mark">A</span>
            <div><small>Этой ночью</small><b>Алексей не проснулся</b><p>Его роль пока остаётся тайной.</p></div>
          </div>
          <div className="club-flow-timer"><small>До голосования</small><b>02:31</b><i><span /></i></div>
          <p className="club-flow-prompt">Обсудите события. Следите за реакциями и помните: любой гость может лгать.</p>
        </main>
        <div className="club-flow-alive"><span>В клубе осталось</span><b>7 гостей</b></div>
      </div>
    );
  }

  if (phase === "voting") {
    return (
      <div className="club-flow-phone club-flow-phone-voting">
        <ClubPhoneHeader phase="Голосование" />
        <main className="club-flow-phone-action">
          <span className="club-flow-kicker">РЕШЕНИЕ ГОРОДА</span>
          <h3>Кто должен<br />покинуть клуб?</h3>
          <p>Ваш голос окончателен. Остальные увидят только общий результат.</p>
          <div className="club-flow-ballot">
            {["Анна", "Михаил", "Елена", "Давид", "Ирина"].map((name, index) => (
              <button key={name} type="button" className={index === 2 ? "is-selected" : ""}>
                <span>{clubPlayers[index]}</span><b>{name}</b><i />
              </button>
            ))}
          </div>
          <button type="button" className="club-flow-primary">Отдать голос за Елену</button>
        </main>
      </div>
    );
  }

  if (phase === "verdict") {
    return (
      <div className="club-flow-phone club-flow-phone-verdict">
        <ClubPhoneHeader phase="Решение принято" />
        <main className="club-flow-phone-center">
          <span className="club-flow-kicker">ПРИГОВОР ГОРОДА</span>
          <div className="club-flow-verdict-mark">E</div>
          <h3>Елена покидает<br />закрытый клуб</h3>
          <p>Большинство гостей проголосовало против неё.</p>
          <div className="club-flow-role-chip"><span>Роль раскрыта</span><b>Мирный житель</b></div>
        </main>
        <div className="club-flow-wait"><i /> Следующая ночь через 8 секунд</div>
      </div>
    );
  }

  return (
    <div className="club-flow-phone club-flow-phone-finale">
      <ClubPhoneHeader phase="Вечер завершён" round="Итоги" />
      <main className="club-flow-phone-center">
        <span className="club-flow-kicker">КЛУБ ЗАКРЫВАЕТСЯ</span>
        <div className="club-flow-laurel">M</div>
        <h3>Мирные жители<br />победили</h3>
        <p>Последний член мафии покинул город. Тайны этого вечера раскрыты.</p>
        <div className="club-flow-final-stats"><div><b>4</b><span>раунда</span></div><div><b>8</b><span>игроков</span></div><div><b>3</b><span>выбыли</span></div></div>
        <button type="button" className="club-flow-primary">Посмотреть все роли</button>
      </main>
    </div>
  );
}

function ClubTvShell({ phase, children, footer }: { phase: string; children: ReactNode; footer: string }) {
  return (
    <div className="mafia-tv-canvas club-flow-tv">
      <div className="club-flow-tv-frame" />
      <header><div><span>M</span><b>THE PURPLE ROOM</b></div><small>{phase}</small><small>8 приглашённых</small></header>
      {children}
      <footer><span>{footer}</span><b>PARTY GAMES HUB · PRIVATE SESSION</b></footer>
    </div>
  );
}

function ClubTvScreen({ phase }: { phase: ClubPhaseId }) {
  if (phase === "lobby") return (
    <ClubTvShell phase="ПРИЁМ ГОСТЕЙ" footer="Владелец клуба начнёт вечер, когда все будут готовы">
      <main className="club-flow-tv-lobby">
        <div><span className="club-flow-tv-kicker">ЧАСТНОЕ СОБРАНИЕ · № 041</span><h3>Гости<br />собираются</h3><p>Восемь приглашений приняты. Двери клуба скоро закроются.</p></div>
        <div className="club-flow-tv-guestlist"><small>СПИСОК ГОСТЕЙ</small>{["Анна", "Михаил", "Елена", "Давид", "София", "Ирина", "Максим", "Алексей"].map((name, index) => <span key={name}><i>{clubPlayers[index % clubPlayers.length]}</i><b>{name}</b><em>ПРИБЫЛ</em></span>)}</div>
      </main>
    </ClubTvShell>
  );

  if (phase === "night") return (
    <ClubTvShell phase="НОЧЬ I" footer="Ночные роли принимают решения на личных устройствах">
      <main className="club-flow-tv-night">
        <div className="club-flow-tv-moon"><MoonIcon size={220} /></div><span className="club-flow-tv-kicker">ГОРОД СПИТ</span><h3>Решения принимаются<br />за закрытыми дверями</h3><p>Не открывайте глаза. Экран сообщит, когда наступит утро.</p>
        <div className="club-flow-tv-steps"><span className="is-done">Роли проснулись</span><span className="is-active">Мафия выбирает цель</span><span>Ожидаем остальных</span></div>
      </main>
    </ClubTvShell>
  );

  if (phase === "day") return (
    <ClubTvShell phase="ДЕНЬ II" footer="Обсуждение завершится автоматически">
      <main className="club-flow-tv-day">
        <div className="club-flow-tv-report"><span>A</span><div><small>НОЧНАЯ СВОДКА</small><h3>Алексей<br />не проснулся</h3><p>Город потерял одного жителя. Его роль остаётся тайной до конца обсуждения.</p></div></div>
        <div className="club-flow-tv-clock"><small>ДО ГОЛОСОВАНИЯ</small><b>02:31</b><span>Обсудите, кому больше нельзя доверять</span></div>
      </main>
    </ClubTvShell>
  );

  if (phase === "voting") return (
    <ClubTvShell phase="ГОЛОСОВАНИЕ" footer="Голоса остаются тайными до завершения процедуры">
      <main className="club-flow-tv-voting">
        <span className="club-flow-tv-kicker">ГОРОД ПРИНИМАЕТ РЕШЕНИЕ</span><h3>Кто покинет клуб?</h3><p>Сделайте выбор на телефоне. Изменить голос после подтверждения нельзя.</p>
        <div className="club-flow-tv-vote-progress"><div><span style={{ width: "62.5%" }} /></div><b>5 / 8</b><small>голосов принято</small></div>
        <div className="club-flow-tv-voters">{clubPlayers.map((player, index) => <span key={player} className={index < 4 ? "is-ready" : ""}>{player}<i /></span>)}</div>
      </main>
    </ClubTvShell>
  );

  if (phase === "verdict") return (
    <ClubTvShell phase="ПРИГОВОР" footer="Следующая ночь начнётся через несколько секунд">
      <main className="club-flow-tv-verdict">
        <div className="club-flow-tv-portrait">E</div><div><span className="club-flow-tv-kicker">РЕШЕНИЕ БОЛЬШИНСТВА</span><h3>Елена покидает<br />закрытый клуб</h3><p>Её роль — <b>мирный житель</b>. Город ошибся, и ночь стала ещё ближе.</p><div className="club-flow-tv-countdown"><i /><span>Следующий раунд</span><b>08</b></div></div>
      </main>
    </ClubTvShell>
  );

  return (
    <ClubTvShell phase="ФИНАЛ" footer="Все роли раскрыты · спасибо за игру">
      <main className="club-flow-tv-finale">
        <span className="club-flow-tv-kicker">ГОРОД ВСТРЕЧАЕТ РАССВЕТ</span><h3>Мирные жители<br />победили</h3><p>Последний член мафии разоблачён. Закрытый клуб завершает этот вечер.</p>
        <div className="club-flow-tv-role-row">{["citizen", "sheriff", "doctor", "mafia", "don"].map((role) => <div key={role}><Image src={`/icons/mafia-roles/${role}.png`} alt="" fill sizes="130px" /></div>)}</div>
      </main>
    </ClubTvShell>
  );
}

function ClubStorySection() {
  const [activePhase, setActivePhase] = useState<ClubPhaseId>("lobby");
  const reduceMotion = useReducedMotion();
  const active = clubPhases.find((phase) => phase.id === activePhase)!;

  return (
    <section id="club-full-flow" className="club-flow-section">
      <div className="club-flow-intro">
        <div><span className="club-flow-approved">УТВЕРЖДЁННОЕ НАПРАВЛЕНИЕ</span><h2>Закрытый клуб.<br /><em>Полная история вечера.</em></h2></div>
        <p>Шесть следующих состояний покрывают основной путь игры: от сбора гостей до раскрытия победителей. Это макеты — логика и production-экраны пока не изменены.</p>
      </div>
      <nav className="club-flow-nav" aria-label="Фазы макета Закрытого клуба">
        {clubPhases.map((phase) => (
          <button key={phase.id} type="button" aria-pressed={activePhase === phase.id} onClick={() => setActivePhase(phase.id)}>
            <span>{phase.number}</span><b>{phase.label}</b><small>{phase.note}</small>
          </button>
        ))}
      </nav>
      <div className="club-flow-current"><span>{active.number}</span><div><small>ТЕКУЩИЙ МАКЕТ</small><h3>{active.label}</h3></div></div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={activePhase} className="club-flow-devices" initial={reduceMotion ? false : { opacity: 0, y: 18, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(3px)" }} transition={{ duration: reduceMotion ? 0.01 : 0.34, ease: [0.16, 1, 0.3, 1] }}>
          <div className="mafia-device-column"><div className="mafia-device-label"><span>Телефон</span><b>390 × 844</b></div><div className="mafia-phone-viewport"><ClubPhoneScreen phase={activePhase} /></div></div>
          <div className="mafia-device-column mafia-device-tv-column"><div className="mafia-device-label"><span>Игровое поле · TV</span><b>1920 × 1080</b></div><div className="mafia-tv-viewport"><ClubTvScreen phase={activePhase} /></div></div>
        </motion.div>
      </AnimatePresence>
      <div className="club-flow-coverage"><b>Также предусмотрены состояния:</b><span>роль заблокирована Любовницей</span><span>Доктор спас жертву</span><span>ничья и переголосование</span><span>казнить / помиловать</span><span>игрок выбыл и наблюдает</span><span>победа Мафии или Маньяка</span></div>
    </section>
  );
}

function CrownIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m3 7 4.2 4L12 4l4.8 7L21 7l-1.7 10H4.7L3 7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M5 20h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m5 12.5 4.1 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const hostCandidates = ["Алина", "Михаил", "Елена", "Давид", "София", "Алексей"];

const hostRoleRoster = [
  { name: "Алина", role: "Мирный", icon: "citizen" },
  { name: "Михаил", role: "Мафия", icon: "mafia" },
  { name: "Елена", role: "Доктор", icon: "doctor" },
  { name: "Давид", role: "Дон", icon: "don" },
  { name: "София", role: "Шериф", icon: "sheriff" },
  { name: "Ирина", role: "Любовница", icon: "lover" },
  { name: "Максим", role: "Маньяк", icon: "maniac" },
];

function HostSelectionMockup() {
  const [selectedHost, setSelectedHost] = useState("Алексей");

  return (
    <div className="club-flow-phone club-host-phone club-host-selection">
      <ClubPhoneHeader phase="Сбор гостей" round="Настройка" />
      <main className="club-host-content">
        <span className="club-flow-kicker">ОБЯЗАТЕЛЬНЫЙ ШАГ</span>
        <h3>Кто проведёт<br />этот вечер?</h3>
        <p>Ведущий не получает игровую роль. Он видит все решения и вручную переключает этапы.</p>
        <div className="club-host-candidate-list" role="radiogroup" aria-label="Выбор ведущего">
          {hostCandidates.map((name, index) => {
            const isSelected = selectedHost === name;
            return (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={isSelected ? "is-host" : ""}
                onClick={() => setSelectedHost(name)}
              >
                <span>{clubPlayers[index % clubPlayers.length]}</span>
                <b>{name}</b>
                <small>{isSelected ? "ВЕДУЩИЙ" : "Назначить"}</small>
                <i>{isSelected && <CrownIcon size={16} />}</i>
              </button>
            );
          })}
        </div>
        <button type="button" className="club-flow-primary">Подтвердить: {selectedHost}</button>
      </main>
      <div className="club-flow-security"><CrownIcon size={14} /> Без ведущего игру начать нельзя</div>
    </div>
  );
}

function HostConsoleMockup() {
  return (
    <div className="club-flow-phone club-host-phone club-host-console">
      <ClubPhoneHeader phase="Пульт ведущего" round="Ночь 1" />
      <main className="club-host-console-main">
        <div className="club-host-console-title">
          <div><span className="club-flow-kicker">ВСЕ РЕШЕНИЯ ПРИНЯТЫ</span><h3>Ночь готова<br />к завершению</h3></div>
          <span className="club-host-progress"><b>6/6</b><small>действий</small></span>
        </div>

        <section className="club-host-panel" aria-label="Роли игроков">
          <header><span>РАСКЛАД РОЛЕЙ</span><b>7 игроков</b></header>
          <div className="club-host-role-grid">
            {hostRoleRoster.map((player) => (
              <div key={player.name}>
                <span><Image src={`/icons/mafia-roles/${player.icon}.png`} alt="" fill sizes="30px" /></span>
                <p><b>{player.name}</b><small>{player.role}</small></p>
              </div>
            ))}
          </div>
        </section>

        <section className="club-host-panel club-host-decisions" aria-label="Ночные решения игроков">
          <header><span>НОЧНЫЕ РЕШЕНИЯ</span><b className="is-complete"><CheckIcon size={13} /> Готово</b></header>
          <div><span>Мафия</span><p>Михаил → Елена · Давид → Анна</p><b>2 / 2</b></div>
          <div><span>Доктор</span><p>Елена защищает Анну</p><b>Готово</b></div>
          <div><span>Шериф</span><p>София проверяет Михаила</p><b>Готово</b></div>
          <div><span>Маньяк</span><p>Максим пропускает ход</p><b>Готово</b></div>
          <div><span>Любовница</span><p>Ирина навещает Софию</p><b>Готово</b></div>
        </section>

        <button type="button" className="club-flow-primary">Завершить ночь и показать утро</button>
      </main>
    </div>
  );
}

const mafiaPartnerVotes: Record<string, string[]> = {
  Анна: ["ДВ"],
  Елена: ["ДН"],
  София: ["ДВ", "ДН"],
  Ирина: [],
};

function MafiaFamilyVoteMockup() {
  const [ownChoice, setOwnChoice] = useState("Елена");

  return (
    <div className="club-flow-phone club-host-phone club-family-vote">
      <ClubPhoneHeader phase="Ночное действие" round="Ночь 1" />
      <main className="club-flow-phone-action">
        <span className="club-flow-kicker">ВАШ ХОД · МАФИЯ</span>
        <h3>Кого сегодня<br />не станет?</h3>
        <p>Ваш голос и решения семьи видны по-разному. Вы можете изменить выбор до завершения ночи.</p>
        <div className="club-family-legend" aria-label="Обозначения голосов">
          <span><i className="is-own"><CheckIcon size={11} /></i>Ваш выбор</span>
          <span><i className="is-family">ДВ</i>Выбор семьи</span>
        </div>
        <div className="club-family-targets">
          {Object.entries(mafiaPartnerVotes).map(([name, partners], index) => {
            const isOwn = ownChoice === name;
            return (
              <button key={name} type="button" className={isOwn ? "is-own-choice" : ""} onClick={() => setOwnChoice(name)}>
                <span className="club-family-avatar">{clubPlayers[index]}</span>
                <span className="club-family-target-copy"><b>{name}</b><small>{isOwn ? "ВАШ ВЫБОР" : partners.length ? `${partners.length} ${partners.length === 1 ? "ГОЛОС СЕМЬИ" : "ГОЛОСА СЕМЬИ"}` : "ГОЛОСОВ ПОКА НЕТ"}</small></span>
                <span className="club-family-vote-marks">
                  {partners.map((partner) => <i key={partner} title={`Голос напарника ${partner}`}>{partner}</i>)}
                  {isOwn && <em aria-label="Ваш выбор"><CheckIcon size={16} /></em>}
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" className="club-flow-primary">Подтвердить голос за {ownChoice}</button>
      </main>
      <div className="club-flow-security">Напарники увидят ваш голос сразу после подтверждения</div>
    </div>
  );
}

function HostExperienceSection() {
  return (
    <section id="club-host-experience" className="club-host-section">
      <div className="club-flow-intro club-host-intro">
        <div><span className="club-flow-approved">НОВЫЕ МАКЕТЫ · БЕЗ ИНТЕГРАЦИИ</span><h2>Ведущий держит<br /><em>весь вечер в руках.</em></h2></div>
        <p>Три связанных состояния: обязательный выбор ведущего до старта, его полный пульт во время ночи и прозрачное командное голосование Мафии. Все элементы продолжают визуальный язык «Закрытого клуба».</p>
      </div>
      <div className="club-host-principles">
        <span><b>01</b> Ведущий не играет и не получает роль</span>
        <span><b>02</b> Ведущий видит роли и каждое решение</span>
        <span><b>03</b> Только ведущий завершает этапы</span>
      </div>
      <div className="club-host-mockups">
        <div className="mafia-device-column"><div className="mafia-device-label"><span>Лобби · выбор ведущего</span><b>390 × 844</b></div><div className="mafia-phone-viewport"><HostSelectionMockup /></div></div>
        <div className="mafia-device-column"><div className="mafia-device-label"><span>Телефон ведущего · ночь</span><b>390 × 844</b></div><div className="mafia-phone-viewport"><HostConsoleMockup /></div></div>
        <div className="mafia-device-column"><div className="mafia-device-label"><span>Телефон Мафии · голоса семьи</span><b>390 × 844</b></div><div className="mafia-phone-viewport"><MafiaFamilyVoteMockup /></div></div>
      </div>
      <div className="club-host-note"><CrownIcon size={17} /><p><b>Главное отличие:</b> ведущий получает собственный интерфейс управления, а не дополнительную игровую роль. Production-логика и существующие игровые экраны в этом макете не изменены.</p></div>
    </section>
  );
}

export default function MafiaDesignPreviewPage() {
  const [selected, setSelected] = useState<ConceptId | null>("club");

  useEffect(() => {
    document.documentElement.classList.add("dark");
    return () => document.documentElement.classList.remove("dark");
  }, []);

  return (
    <main className="mafia-preview-page">
      <div className="mafia-preview-ambient" aria-hidden="true" />
      <header className="mafia-preview-hero">
        <div className="mafia-preview-eyebrow"><i /> PARTY GAMES HUB · DESIGN LAB</div>
        <h1>Мафия.<br /><em>Три направления.</em></h1>
        <p>
          Сравнение общего визуального языка для телефона и игрового поля. Удерживайте закрытую карту на каждом телефоне, чтобы проверить приватное раскрытие роли.
        </p>
        <div className="mafia-preview-meta">
          <span><b>2</b> экрана</span>
          <span><b>3</b> концепции</span>
          <span><b>7</b> готовых ролей</span>
          <span>Только макеты · логика игры не изменена</span>
        </div>
        <nav aria-label="Варианты дизайна">
          {concepts.map((concept) => (
            <a key={concept.id} href={`#${concept.id}`}><span>{concept.number}</span>{concept.name}</a>
          ))}
          <a href="#club-full-flow"><span>04</span>Все экраны клуба</a>
          <a href="#club-host-experience"><span>05</span>Ведущий и решения</a>
        </nav>
      </header>

      <RoleDeck />

      <div className="mafia-preview-concepts">
        {concepts.map((concept) => (
          <ConceptSection
            key={concept.id}
            concept={concept}
            selected={selected === concept.id}
            onSelect={() => setSelected(concept.id)}
          />
        ))}
      </div>

      <ClubStorySection />

      <HostExperienceSection />

      <footer className="mafia-preview-page-footer">
        <div>
          <span>Следующий шаг</span>
          <h2>Выбран вариант: Закрытый клуб</h2>
        </div>
        <p>После утверждения новых макетов этот визуальный язык можно переносить на production-фазы мобильной игры и TV-экрана.</p>
      </footer>

      <style jsx global>{`
        html { scroll-behavior: smooth; }
        body { background: #07050c; }
        .mafia-preview-page { min-height: 100vh; position: relative; overflow: hidden; color: #f8f7fb; background: linear-gradient(180deg,#0b0713 0%,#07050c 38%,#0d0718 100%); padding: 64px 32px 100px; }
        .mafia-preview-ambient { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(900px 540px at 12% 0%,rgba(139,92,246,.2),transparent 68%),radial-gradient(700px 500px at 94% 24%,rgba(76,29,149,.18),transparent 72%); }
        .mafia-preview-hero,.mafia-preview-deck,.mafia-preview-concepts,.mafia-preview-page-footer { position: relative; max-width: 1480px; margin-inline: auto; }
        .mafia-preview-hero { padding: 44px 0 54px; }
        .mafia-preview-eyebrow { display: flex; align-items: center; gap: 10px; color: #a78bfa; font: 700 12px/1 var(--font-mono); letter-spacing: .18em; }
        .mafia-preview-eyebrow i { width: 32px; height: 1px; background: #8b5cf6; box-shadow: 0 0 12px #8b5cf6; }
        .mafia-preview-hero h1 { margin: 25px 0 22px; font: 400 clamp(64px,9vw,138px)/.84 Georgia,serif; letter-spacing: -.065em; }
        .mafia-preview-hero h1 em { color: #a78bfa; font-weight: 400; }
        .mafia-preview-hero > p { max-width: 760px; color: rgba(248,247,251,.6); font-size: 19px; line-height: 1.65; }
        .mafia-preview-meta { display: flex; flex-wrap: wrap; gap: 12px; margin: 32px 0; }
        .mafia-preview-meta span { padding: 10px 15px; border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.035); border-radius: 999px; color: rgba(255,255,255,.56); font-size: 13px; }
        .mafia-preview-meta b { color: #fff; }
        .mafia-preview-hero nav { display: flex; gap: 10px; flex-wrap: wrap; }
        .mafia-preview-hero nav a { display: flex; gap: 9px; align-items: center; min-height: 48px; padding: 0 18px; border: 1px solid rgba(167,139,250,.2); border-radius: 12px; background: rgba(139,92,246,.055); color: rgba(255,255,255,.72); text-decoration: none; transition: transform .2s ease,border-color .2s ease,background .2s ease; }
        .mafia-preview-hero nav a:hover { transform: translateY(-2px); border-color: rgba(167,139,250,.55); background: rgba(139,92,246,.12); }
        .mafia-preview-hero nav a:focus-visible,.mafia-concept-select:focus-visible,.mafia-role-reveal:focus-visible { outline: 3px solid #c4b5fd; outline-offset: 4px; }
        .mafia-preview-hero nav a span { color: #8b5cf6; font: 800 11px/1 var(--font-mono); }

        .mafia-preview-deck { display: grid; grid-template-columns: minmax(260px,360px) 1fr; gap: 34px; align-items: end; padding: 32px; border: 1px solid rgba(255,255,255,.08); border-radius: 28px; background: rgba(255,255,255,.025); box-shadow: 0 30px 80px rgba(0,0,0,.28); }
        .mafia-preview-deck-copy > span { color: #a78bfa; font: 700 11px/1 var(--font-mono); letter-spacing: .16em; text-transform: uppercase; }
        .mafia-preview-deck-copy h2 { margin: 13px 0 10px; font: 500 30px/1.08 Georgia,serif; }
        .mafia-preview-deck-copy p { margin: 0; color: rgba(255,255,255,.5); font-size: 14px; line-height: 1.55; }
        .mafia-preview-deck-grid { display: grid; grid-template-columns: repeat(7,minmax(74px,1fr)); gap: 10px; }
        .mafia-preview-deck-card { position: relative; aspect-ratio: 1086/1448; margin: 0; overflow: hidden; border-radius: 10px; background: #120e18; box-shadow: 0 8px 22px rgba(0,0,0,.45); transition: transform .25s cubic-bezier(.16,1,.3,1),box-shadow .25s ease; }
        .mafia-preview-deck-card:hover { transform: translateY(-8px) rotate(-1deg); box-shadow: 0 18px 32px rgba(0,0,0,.6),0 0 20px rgba(139,92,246,.2); }
        .mafia-preview-deck-card img { object-fit: cover; }
        .mafia-preview-deck-card figcaption { position: absolute; inset: auto 0 0; padding: 18px 5px 6px; background: linear-gradient(transparent,rgba(0,0,0,.92)); color: rgba(255,255,255,.82); font-size: 10px; text-align: center; }

        .mafia-preview-concepts { display: flex; flex-direction: column; gap: 64px; margin-top: 64px; }
        .mafia-concept { padding: 30px; border: 1px solid rgba(255,255,255,.09); border-radius: 30px; background: rgba(255,255,255,.025); transition: border-color .3s ease,box-shadow .3s ease; }
        .mafia-concept.is-selected { border-color: rgba(167,139,250,.62); box-shadow: 0 0 0 1px rgba(139,92,246,.18),0 28px 90px rgba(76,29,149,.18); }
        .mafia-concept-intro { display: grid; grid-template-columns: 84px minmax(0,1fr) auto; gap: 26px; align-items: start; margin-bottom: 30px; }
        .mafia-concept-number { color: rgba(167,139,250,.34); font: 400 56px/.86 Georgia,serif; }
        .mafia-concept-copy > span { color: #a78bfa; font: 700 11px/1 var(--font-mono); text-transform: uppercase; letter-spacing: .14em; }
        .mafia-concept-copy h2 { margin: 10px 0 8px; font-size: 40px; line-height: 1; letter-spacing: -.035em; }
        .mafia-concept-copy p { max-width: 680px; margin: 0; color: rgba(255,255,255,.53); line-height: 1.55; }
        .mafia-concept-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 16px; }
        .mafia-concept-tags span { padding: 6px 10px; border-radius: 99px; background: rgba(255,255,255,.055); color: rgba(255,255,255,.55); font-size: 11px; }
        .mafia-concept-select { min-height: 48px; padding: 0 18px; border-radius: 12px; border: 1px solid color-mix(in srgb,var(--concept-accent) 42%,transparent); background: color-mix(in srgb,var(--concept-accent) 10%,transparent); color: var(--concept-accent); font-weight: 750; cursor: pointer; transition: transform .2s ease,background .2s ease; }
        .mafia-concept-select:hover { transform: translateY(-2px); background: color-mix(in srgb,var(--concept-accent) 17%,transparent); }
        .mafia-concept-devices { display: grid; grid-template-columns: 390px minmax(0,960px); gap: 30px; align-items: start; justify-content: center; }
        .mafia-device-column { min-width: 0; }
        .mafia-device-label { display: flex; justify-content: space-between; margin-bottom: 10px; color: rgba(255,255,255,.48); font-size: 11px; text-transform: uppercase; letter-spacing: .12em; }
        .mafia-device-label b { color: rgba(255,255,255,.28); font-family: var(--font-mono); }

        .mafia-phone-viewport { width: 390px; height: 844px; border-radius: 48px; overflow: hidden; box-shadow: 0 24px 80px rgba(0,0,0,.55),0 0 0 2px rgba(255,255,255,.11),inset 0 0 0 7px #050407; }
        .mafia-phone-canvas { width: 390px; height: 844px; position: relative; display: flex; flex-direction: column; overflow: hidden; isolation: isolate; padding: 18px 18px 16px; user-select: none; }
        .mafia-phone-safe-top { display: flex; justify-content: space-between; padding: 0 10px 14px; color: rgba(255,255,255,.7); font: 650 11px/1 var(--font-sans); }
        .mafia-phone-safe-top div { display: flex; gap: 3px; align-items: center; }
        .mafia-phone-safe-top i { display: block; width: 4px; height: 7px; border-radius: 2px; background: currentColor; }
        .mafia-phone-safe-top i:nth-child(2) { height: 9px; }.mafia-phone-safe-top i:nth-child(3) { width: 14px; height: 7px; }
        .mafia-phone-header { display: flex; justify-content: space-between; align-items: center; min-height: 36px; padding: 0 4px; font-size: 10px; text-transform: uppercase; letter-spacing: .09em; }
        .mafia-phone-lock { padding: 6px 8px; border-radius: 99px; }
        .mafia-phone-heading { text-align: center; padding: 22px 5px 14px; }
        .mafia-phone-kicker { font: 700 10px/1 var(--font-mono); text-transform: uppercase; letter-spacing: .16em; }
        .mafia-phone-heading h3 { min-height: 56px; display: flex; align-items: center; justify-content: center; margin: 8px 0 5px; font-size: 25px; line-height: 1.05; letter-spacing: -.025em; }
        .mafia-phone-heading p { min-height: 34px; margin: 0; font-size: 12px; line-height: 1.35; }
        .mafia-role-reveal { position: relative; flex: 1; width: 100%; min-height: 0; padding: 0; overflow: hidden; border-radius: 25px; cursor: pointer; touch-action: none; -webkit-touch-callout: none; }
        .mafia-role-image,.mafia-role-hidden { position: absolute; inset: 0; }
        .mafia-role-image img { object-fit: contain; object-position: center; padding: 7px; }
        .mafia-role-hidden { display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .mafia-role-back-mark { position: relative; z-index: 2; font: 400 104px/.8 Georgia,serif; }
        .mafia-role-back-lines { position: absolute; inset: 32px; border: 1px solid currentColor; opacity: .15; transform: rotate(45deg); }
        .mafia-role-hold-ring { position: relative; z-index: 2; width: 112px; height: 112px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px; margin-top: 40px; border: 1px solid currentColor; border-radius: 50%; font-size: 11px; font-weight: 750; }
        .mafia-role-hold-ring::after { content:""; position:absolute; inset:-8px; border:1px solid currentColor; border-radius:50%; opacity:.22; animation: mafia-hold-pulse 2s ease-in-out infinite; }
        .mafia-role-hidden p { position: relative; z-index: 2; max-width: 210px; margin: 20px 0 0; font-size: 11px; line-height: 1.4; opacity: .54; }
        .mafia-phone-footer { min-height: 42px; display: flex; align-items: center; justify-content: center; gap: 7px; font-size: 10px; opacity: .5; }
        .mafia-phone-privacy-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 10px currentColor; }

        .mafia-phone-noir { background: radial-gradient(circle at 50% 38%,rgba(139,92,246,.18),transparent 38%),linear-gradient(180deg,#0a0910,#11101a 62%,#08070c); color:#f7f3ff; }
        .mafia-phone-noir::before { content:""; position:absolute; inset:0; z-index:-1; opacity:.15; background-image:repeating-radial-gradient(circle at 10% 20%,transparent 0 2px,rgba(255,255,255,.08) 3px); background-size:8px 8px; }
        .mafia-phone-noir .mafia-phone-round,.mafia-phone-noir .mafia-phone-heading p { color:rgba(255,255,255,.46); }
        .mafia-phone-noir .mafia-phone-lock { border:1px solid rgba(167,139,250,.24); color:#c4b5fd; background:rgba(139,92,246,.08); }
        .mafia-phone-noir .mafia-phone-kicker { color:#a78bfa; }.mafia-phone-noir .mafia-phone-heading h3 { font-family:Georgia,serif; }
        .mafia-role-reveal-noir { border:1px solid rgba(167,139,250,.22); background:radial-gradient(circle at 50% 36%,rgba(139,92,246,.18),transparent 45%),#0b0910; color:#a78bfa; box-shadow:inset 0 0 60px rgba(0,0,0,.7),0 18px 50px rgba(0,0,0,.45); }
        .mafia-role-reveal-noir .mafia-role-back-mark { color:rgba(255,255,255,.08); text-shadow:0 0 40px rgba(167,139,250,.26); }

        .mafia-phone-club { background:radial-gradient(circle at 50% 30%,rgba(93,45,120,.32),transparent 42%),linear-gradient(155deg,#24102c,#120714 64%,#080508); color:#fbf3df; }
        .mafia-phone-club::before { content:""; position:absolute; inset:9px; z-index:-1; border:1px solid rgba(214,180,106,.25); border-radius:38px; }
        .mafia-phone-club .mafia-phone-round,.mafia-phone-club .mafia-phone-heading p { color:rgba(251,243,223,.48); }
        .mafia-phone-club .mafia-phone-lock { border:1px solid rgba(214,180,106,.3); color:#e5c988; background:rgba(214,180,106,.06); }
        .mafia-phone-club .mafia-phone-kicker { color:#d6b46a; }.mafia-phone-club .mafia-phone-heading h3 { font-family:Georgia,serif; font-weight:500; }
        .mafia-role-reveal-club { border:1px solid rgba(214,180,106,.34); background:linear-gradient(145deg,rgba(214,180,106,.08),transparent 28%),#130b14; color:#d6b46a; box-shadow:inset 0 0 0 5px #130b14,inset 0 0 0 6px rgba(214,180,106,.16),0 20px 55px rgba(0,0,0,.55); }
        .mafia-role-reveal-club .mafia-role-back-mark { color:rgba(214,180,106,.12); }

        .mafia-phone-thriller { background:radial-gradient(circle at 78% 14%,rgba(139,92,246,.38),transparent 30%),linear-gradient(170deg,#100a1f,#070710 66%,#0c0711); color:white; }
        .mafia-phone-thriller::before { content:""; position:absolute; inset:0; z-index:-1; background:linear-gradient(110deg,transparent 0 54%,rgba(139,92,246,.08) 54.2% 55%,transparent 55.2%),repeating-linear-gradient(0deg,transparent 0 3px,rgba(255,255,255,.018) 4px); }
        .mafia-phone-thriller .mafia-phone-round,.mafia-phone-thriller .mafia-phone-heading p { color:rgba(255,255,255,.48); }
        .mafia-phone-thriller .mafia-phone-lock { border:1px solid rgba(239,68,68,.35); color:#fca5a5; background:rgba(239,68,68,.08); }
        .mafia-phone-thriller .mafia-phone-kicker { color:#a78bfa; }.mafia-phone-thriller .mafia-phone-heading h3 { font-weight:900; }
        .mafia-role-reveal-thriller { border:1px solid rgba(139,92,246,.48); background:linear-gradient(145deg,rgba(139,92,246,.16),transparent 38%),#090711; color:#a78bfa; box-shadow:inset 0 0 50px rgba(139,92,246,.08),0 0 36px rgba(139,92,246,.15); }
        .mafia-role-reveal-thriller::before { content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(167,139,250,.12),transparent); transform:translateX(-100%); animation:mafia-scan-card 3.4s ease-in-out infinite; }
        .mafia-role-reveal-thriller .mafia-role-back-mark { color:rgba(139,92,246,.16); font-family:var(--font-mono); font-weight:900; }

        .mafia-tv-viewport { width:960px; height:540px; overflow:hidden; border-radius:20px; box-shadow:0 25px 80px rgba(0,0,0,.55),0 0 0 2px rgba(255,255,255,.1),inset 0 0 0 5px #050407; }
        .mafia-tv-canvas { width:1920px; height:1080px; position:relative; overflow:hidden; transform:scale(.5); transform-origin:top left; isolation:isolate; }
        .mafia-tv-topbar { height:110px; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:70px; padding:0 80px; border-bottom:1px solid rgba(255,255,255,.08); color:rgba(255,255,255,.46); font-size:24px; text-transform:uppercase; letter-spacing:.12em; }
        .mafia-tv-topbar div { display:flex; align-items:center; gap:20px; color:#fff; }.mafia-tv-topbar > span:last-child { text-align:right; }
        .mafia-tv-mark { width:52px; height:52px; display:grid; place-items:center; border:1px solid rgba(167,139,250,.45); border-radius:50%; color:#c4b5fd; font:400 28px/1 Georgia,serif; }
        .mafia-tv-noir { background:radial-gradient(circle at 73% 45%,rgba(139,92,246,.18),transparent 28%),linear-gradient(125deg,#08080d,#11101a 55%,#07070b); color:#f7f3ff; }
        .mafia-tv-noir::before { content:""; position:absolute; inset:0; z-index:-1; background:linear-gradient(90deg,rgba(0,0,0,.78),transparent 55%),radial-gradient(ellipse at 55% 110%,rgba(255,255,255,.04),transparent 48%); }
        .mafia-tv-noir-grain { position:absolute; inset:0; opacity:.1; pointer-events:none; background-image:repeating-radial-gradient(circle at 20% 20%,transparent 0 2px,#fff 3px); background-size:9px 9px; mix-blend-mode:overlay; }
        .mafia-tv-noir main { position:absolute; left:110px; top:250px; z-index:2; max-width:1020px; }
        .mafia-tv-noir main > span { color:#a78bfa; font:700 22px/1 var(--font-mono); text-transform:uppercase; letter-spacing:.24em; }
        .mafia-tv-noir h3 { margin:28px 0 34px; font:400 146px/.82 Georgia,serif; letter-spacing:-.065em; }
        .mafia-tv-noir main p { max-width:760px; color:rgba(255,255,255,.53); font-size:31px; line-height:1.45; }
        .mafia-tv-noir-moon { position:absolute; right:190px; top:280px; width:420px; height:420px; display:grid; place-items:center; border-radius:50%; color:#c4b5fd; background:radial-gradient(circle,rgba(167,139,250,.16),transparent 66%); filter:drop-shadow(0 0 50px rgba(167,139,250,.3)); }
        .mafia-tv-progress { position:absolute; left:110px; right:110px; bottom:70px; display:flex; align-items:center; gap:20px; color:rgba(255,255,255,.4); font-size:22px; }
        .mafia-tv-progress i { width:180px; height:2px; background:linear-gradient(90deg,#8b5cf6,rgba(139,92,246,.12)); box-shadow:0 0 16px #8b5cf6; }

        .mafia-tv-club { background:radial-gradient(circle at 50% 45%,rgba(100,48,111,.32),transparent 33%),linear-gradient(180deg,#241128,#0d060e 68%,#070507); color:#f9eed4; }
        .mafia-club-curtain { position:absolute; top:0; bottom:0; width:390px; z-index:-1; opacity:.7; background:repeating-linear-gradient(88deg,#2c0c1d 0 50px,#44142b 85px,#220817 140px); filter:drop-shadow(0 0 55px #000); }
        .mafia-club-curtain-left { left:-100px; transform:skewX(-7deg); }.mafia-club-curtain-right { right:-100px; transform:skewX(7deg); }
        .mafia-club-frame { position:absolute; inset:44px; border:1px solid rgba(214,180,106,.26); pointer-events:none; }
        .mafia-club-frame::before,.mafia-club-frame::after { content:""; position:absolute; left:50%; width:280px; height:1px; background:linear-gradient(90deg,transparent,#d6b46a,transparent); transform:translateX(-50%); }.mafia-club-frame::before { top:-1px; }.mafia-club-frame::after { bottom:-1px; }
        .mafia-club-corner { position:absolute; width:54px; height:54px; border-color:#d6b46a; opacity:.66; }.mafia-club-corner-tl{left:-1px;top:-1px;border-left:3px solid;border-top:3px solid}.mafia-club-corner-tr{right:-1px;top:-1px;border-right:3px solid;border-top:3px solid}.mafia-club-corner-bl{left:-1px;bottom:-1px;border-left:3px solid;border-bottom:3px solid}.mafia-club-corner-br{right:-1px;bottom:-1px;border-right:3px solid;border-bottom:3px solid}
        .mafia-tv-club header { position:absolute; top:75px; left:90px; right:90px; display:flex; justify-content:space-between; color:#d6b46a; font:600 18px/1 var(--font-mono); letter-spacing:.22em; }.mafia-tv-club header b{font-weight:500;opacity:.65}
        .mafia-tv-club main { position:absolute; inset:175px 300px 150px; display:flex; flex-direction:column; align-items:center; text-align:center; }
        .mafia-club-moon { width:170px;height:170px;display:grid;place-items:center;border:1px solid rgba(214,180,106,.25);border-radius:50%;color:#e5c988;background:rgba(214,180,106,.04);box-shadow:0 0 70px rgba(214,180,106,.08)}
        .mafia-tv-club main>span { margin-top:26px;color:#d6b46a;font:600 20px/1 var(--font-mono);letter-spacing:.34em; }.mafia-tv-club h3{margin:22px 0 18px;font:400 104px/.95 Georgia,serif;letter-spacing:-.045em}.mafia-tv-club main p{margin:16px 0 0;color:rgba(249,238,212,.55);font:400 28px/1.5 Georgia,serif}.mafia-club-divider{display:flex;align-items:center;gap:8px}.mafia-club-divider i:first-child{width:180px;height:1px;background:linear-gradient(90deg,transparent,#d6b46a)}.mafia-club-divider i:last-child{width:180px;height:1px;background:linear-gradient(90deg,#d6b46a,transparent)}
        .mafia-tv-club footer { position:absolute; left:90px; right:90px; bottom:78px; display:flex; justify-content:space-between; color:rgba(249,238,212,.42); font:500 19px/1 var(--font-mono); letter-spacing:.12em; }

        .mafia-tv-thriller { background:radial-gradient(circle at 74% 35%,rgba(139,92,246,.3),transparent 32%),linear-gradient(145deg,#0e0820,#070711 58%,#0b0713); color:white; }
        .mafia-tv-thriller::before { content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(rgba(139,92,246,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,.055) 1px,transparent 1px);background-size:72px 72px;mask-image:linear-gradient(90deg,transparent,#000 35%,#000 85%,transparent); }
        .mafia-thriller-scan { position:absolute; inset:0; background:repeating-linear-gradient(0deg,transparent 0 4px,rgba(255,255,255,.018) 5px); pointer-events:none; }.mafia-thriller-beam{position:absolute;top:-280px;right:220px;width:130px;height:1500px;background:linear-gradient(90deg,transparent,rgba(139,92,246,.18),transparent);transform:rotate(28deg);filter:blur(8px);animation:mafia-tv-beam 5s ease-in-out infinite alternate}
        .mafia-tv-thriller header { height:110px;display:flex;align-items:center;justify-content:space-between;padding:0 76px;border-bottom:1px solid rgba(139,92,246,.2);font:650 18px/1 var(--font-mono);letter-spacing:.12em;color:rgba(255,255,255,.55)}.mafia-tv-thriller header>div{display:flex;align-items:center;gap:18px}.mafia-tv-thriller header div:first-child span{width:50px;height:50px;display:grid;place-items:center;background:#8b5cf6;color:#fff;font-size:24px}.mafia-tv-thriller header div:last-child i{width:9px;height:9px;border-radius:50%;background:#8b5cf6;box-shadow:0 0 18px #8b5cf6;animation:mafia-status-pulse 1.5s ease-in-out infinite}
        .mafia-tv-thriller main { position:absolute; left:76px; right:76px; top:180px; bottom:190px; display:grid; grid-template-columns:170px 1fr 430px; align-items:center; gap:60px; }.mafia-thriller-index{align-self:start;color:rgba(167,139,250,.3);font:200 142px/.8 var(--font-mono)}.mafia-thriller-copy>span{color:#a78bfa;font:750 21px/1 var(--font-mono);letter-spacing:.25em;text-transform:uppercase}.mafia-thriller-copy h3{margin:30px 0 32px;font:900 102px/.9 var(--font-sans);letter-spacing:-.055em}.mafia-thriller-copy p{max-width:800px;color:rgba(255,255,255,.5);font-size:29px;line-height:1.45}.mafia-thriller-orbit{width:390px;height:390px;display:grid;place-items:center;border:1px solid rgba(139,92,246,.24);border-radius:50%;color:#a78bfa;box-shadow:0 0 0 34px rgba(139,92,246,.035),0 0 0 70px rgba(139,92,246,.022),0 0 90px rgba(139,92,246,.12)}
        .mafia-tv-thriller footer { position:absolute;left:76px;right:76px;bottom:50px;height:100px;display:grid;grid-template-columns:130px 130px 1fr 130px;gap:12px }.mafia-tv-thriller footer>div{display:flex;align-items:center;justify-content:center;gap:9px;border:1px solid rgba(139,92,246,.16);background:rgba(139,92,246,.045)}.mafia-tv-thriller footer span{font:700 34px/1 var(--font-mono)}.mafia-tv-thriller footer small{color:rgba(255,255,255,.35);font-size:14px;text-transform:uppercase}.mafia-thriller-status i{width:32px;height:2px;background:#ef4444;box-shadow:0 0 14px #ef4444}.mafia-thriller-status b{color:rgba(255,255,255,.68);font:650 17px/1 var(--font-mono);letter-spacing:.14em}

        .club-flow-section { position:relative; max-width:1480px; margin:96px auto 0; padding:48px 30px 38px; overflow:hidden; border:1px solid rgba(214,180,106,.2); border-radius:34px; background:radial-gradient(circle at 90% 0%,rgba(91,45,105,.24),transparent 34%),linear-gradient(150deg,rgba(43,17,48,.62),rgba(13,7,15,.9) 55%); box-shadow:0 45px 120px rgba(0,0,0,.45); }
        .club-flow-section::before { content:""; position:absolute; inset:14px; border:1px solid rgba(214,180,106,.08); border-radius:25px; pointer-events:none; }
        .club-flow-intro { position:relative; display:grid; grid-template-columns:minmax(0,1fr) minmax(280px,520px); gap:64px; align-items:end; padding:12px 18px 36px; }
        .club-flow-approved { display:inline-flex; align-items:center; min-height:30px; padding:0 12px; border:1px solid rgba(214,180,106,.3); border-radius:99px; color:#e1c47e; font:650 10px/1 var(--font-mono); letter-spacing:.18em; }
        .club-flow-intro h2 { margin:20px 0 0; color:#fbf3df; font:400 clamp(48px,6.5vw,94px)/.92 Georgia,serif; letter-spacing:-.05em; }
        .club-flow-intro h2 em { color:#d6b46a; font-weight:400; }
        .club-flow-intro p { margin:0 0 7px; color:rgba(251,243,223,.53); font-size:16px; line-height:1.65; }
        .club-flow-nav { position:relative; display:grid; grid-template-columns:repeat(6,1fr); gap:8px; margin:0 18px 38px; }
        .club-flow-nav button { min-height:84px; display:grid; grid-template-columns:auto 1fr; grid-template-rows:auto auto; column-gap:10px; align-content:center; padding:13px 14px; border:1px solid rgba(214,180,106,.12); border-radius:13px; background:rgba(255,255,255,.025); color:rgba(251,243,223,.44); text-align:left; cursor:pointer; transition:border-color .2s ease,background .2s ease,color .2s ease,transform .2s ease; }
        .club-flow-nav button:hover { transform:translateY(-2px); border-color:rgba(214,180,106,.34); color:#fbf3df; }
        .club-flow-nav button[aria-pressed="true"] { border-color:rgba(214,180,106,.5); background:linear-gradient(145deg,rgba(214,180,106,.14),rgba(91,45,105,.18)); color:#fbf3df; box-shadow:inset 0 0 24px rgba(214,180,106,.04); }
        .club-flow-nav button:focus-visible { outline:3px solid #e5c988; outline-offset:3px; }
        .club-flow-nav button > span { grid-row:1/3; color:#d6b46a; font:700 11px/1 var(--font-mono); }
        .club-flow-nav button b { font:600 13px/1.1 var(--font-sans); }
        .club-flow-nav button small { margin-top:5px; font-size:10px; opacity:.62; }
        .club-flow-current { position:relative; display:flex; align-items:center; gap:18px; max-width:1380px; margin:0 auto 14px; color:#fbf3df; }
        .club-flow-current > span { color:rgba(214,180,106,.28); font:300 56px/.8 Georgia,serif; }
        .club-flow-current small { color:#d6b46a; font:650 9px/1 var(--font-mono); letter-spacing:.18em; }
        .club-flow-current h3 { margin:5px 0 0; font:500 24px/1 Georgia,serif; }
        .club-flow-devices { position:relative; display:grid; grid-template-columns:390px minmax(0,960px); gap:30px; align-items:start; justify-content:center; }
        .club-flow-coverage { position:relative; display:flex; flex-wrap:wrap; gap:8px; margin:28px 18px 0; padding-top:22px; border-top:1px solid rgba(214,180,106,.1); color:rgba(251,243,223,.42); font-size:11px; }
        .club-flow-coverage b { display:flex; align-items:center; margin-right:5px; color:#d6b46a; font-weight:650; }
        .club-flow-coverage span { padding:7px 10px; border:1px solid rgba(214,180,106,.1); border-radius:99px; background:rgba(255,255,255,.025); }

        .club-flow-phone { width:390px; height:844px; position:relative; display:flex; flex-direction:column; overflow:hidden; isolation:isolate; padding:18px 18px 16px; color:#fbf3df; background:radial-gradient(circle at 50% 25%,rgba(96,45,108,.28),transparent 38%),linear-gradient(158deg,#25102c,#120713 62%,#080508); user-select:none; }
        .club-flow-phone::before { content:""; position:absolute; inset:9px; z-index:-1; border:1px solid rgba(214,180,106,.18); border-radius:38px; pointer-events:none; }
        .club-flow-phone::after { content:""; position:absolute; inset:0; z-index:-2; opacity:.16; background-image:repeating-linear-gradient(93deg,transparent 0 9px,rgba(255,255,255,.018) 10px); }
        .club-flow-safe { height:30px; display:flex; justify-content:space-between; align-items:center; padding:0 10px; color:rgba(251,243,223,.5); font:650 10px/1 var(--font-sans); letter-spacing:.04em; }
        .club-flow-phone-header { min-height:53px; display:grid; grid-template-columns:38px 1fr auto; align-items:center; gap:10px; padding:0 7px 10px; border-bottom:1px solid rgba(214,180,106,.14); }
        .club-flow-monogram { width:36px; height:36px; display:grid; place-items:center; border:1px solid rgba(214,180,106,.34); border-radius:50%; color:#e5c988; font:400 17px/1 Georgia,serif; }
        .club-flow-phone-header div { min-width:0; display:flex; flex-direction:column; gap:4px; }
        .club-flow-phone-header b { font:650 9px/1 var(--font-mono); letter-spacing:.14em; }
        .club-flow-phone-header small { color:rgba(251,243,223,.45); font-size:9px; }
        .club-flow-round { color:#d6b46a; font:600 9px/1 var(--font-mono); text-transform:uppercase; }
        .club-flow-kicker { color:#d6b46a; font:700 9px/1 var(--font-mono); letter-spacing:.18em; }
        .club-flow-phone-center { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:16px 13px; }
        .club-flow-phone-center h3,.club-flow-phone-action h3 { margin:13px 0 12px; font:400 35px/.98 Georgia,serif; letter-spacing:-.04em; }
        .club-flow-phone-center > p,.club-flow-phone-action > p { margin:0; color:rgba(251,243,223,.48); font:400 12px/1.5 var(--font-sans); }
        .club-flow-seal { width:154px; height:154px; display:flex; flex-direction:column; align-items:center; justify-content:center; margin-top:34px; border:1px solid rgba(214,180,106,.32); border-radius:50%; box-shadow:0 0 0 9px rgba(214,180,106,.035),0 0 50px rgba(214,180,106,.07); }
        .club-flow-seal span { font:400 58px/.8 Georgia,serif; }
        .club-flow-seal small { margin-top:12px; color:#d6b46a; font:650 9px/1 var(--font-mono); letter-spacing:.1em; text-transform:uppercase; }
        .club-flow-guest-row { display:flex; justify-content:center; gap:7px; padding-bottom:20px; }
        .club-flow-guest-row span,.club-flow-tv-voters > span { width:42px; height:42px; display:grid; place-items:center; border:1px solid rgba(214,180,106,.22); border-radius:50%; background:#241027; color:#e7d29f; font:650 10px/1 var(--font-mono); }
        .club-flow-wait,.club-flow-security { min-height:40px; display:flex; align-items:center; justify-content:center; gap:8px; border-top:1px solid rgba(214,180,106,.1); color:rgba(251,243,223,.42); font-size:9px; letter-spacing:.04em; }
        .club-flow-wait i { width:6px; height:6px; border-radius:50%; background:#d6b46a; box-shadow:0 0 12px #d6b46a; animation:club-flow-pulse 2s ease-in-out infinite; }
        .club-flow-phone-action { flex:1; display:flex; flex-direction:column; padding:25px 8px 4px; }
        .club-flow-targets { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:20px 0 15px; }
        .club-flow-targets button { min-height:112px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; border:1px solid rgba(214,180,106,.13); border-radius:15px; background:rgba(255,255,255,.025); color:#fbf3df; }
        .club-flow-targets button > span { width:42px; height:42px; display:grid; place-items:center; border:1px solid rgba(214,180,106,.28); border-radius:50%; color:#d6b46a; font:650 10px/1 var(--font-mono); }
        .club-flow-targets button b { font:600 12px/1 var(--font-sans); }.club-flow-targets button small { color:rgba(251,243,223,.38); font-size:8px; }
        .club-flow-targets button.is-target { border-color:rgba(184,48,62,.6); background:rgba(129,26,39,.18); box-shadow:inset 0 0 28px rgba(139,26,39,.12); }.club-flow-targets button.is-target > span { border-color:#b94b58; color:#efb4b9; }
        .club-flow-primary { min-height:49px; width:100%; border:1px solid rgba(214,180,106,.48); border-radius:12px; background:linear-gradient(135deg,#a27b38,#d6b46a 55%,#8f682d); color:#1a0c15; font:750 12px/1 var(--font-sans); cursor:pointer; box-shadow:0 12px 30px rgba(0,0,0,.25); }
        .club-flow-primary:focus-visible,.club-flow-targets button:focus-visible,.club-flow-ballot button:focus-visible { outline:3px solid #f0d795; outline-offset:3px; }
        .club-flow-security { margin-top:8px; }
        .club-flow-news { display:grid; grid-template-columns:72px 1fr; gap:14px; align-items:center; margin:24px 0 20px; padding:15px; border:1px solid rgba(184,48,62,.28); border-radius:16px; background:linear-gradient(135deg,rgba(112,21,36,.18),rgba(255,255,255,.018)); }
        .club-flow-news-mark { width:68px; height:80px; display:grid; place-items:center; border:1px solid rgba(184,48,62,.4); color:#dda1a8; font:400 35px/1 Georgia,serif; background:#200b13; }
        .club-flow-news div { display:flex; flex-direction:column; gap:5px; }.club-flow-news small { color:#b96773; font:700 8px/1 var(--font-mono); letter-spacing:.12em; }.club-flow-news b { font:500 15px/1.15 Georgia,serif; }.club-flow-news p { margin:0;color:rgba(251,243,223,.38);font-size:9px;line-height:1.4; }
        .club-flow-timer { display:grid; grid-template-columns:1fr auto; align-items:end; padding:14px 0; border-top:1px solid rgba(214,180,106,.12); border-bottom:1px solid rgba(214,180,106,.12); }.club-flow-timer small { color:rgba(251,243,223,.4);font-size:9px;text-transform:uppercase;letter-spacing:.1em }.club-flow-timer b { color:#e5c988;font:400 30px/1 Georgia,serif;font-variant-numeric:tabular-nums }.club-flow-timer i { grid-column:1/-1;height:2px;margin-top:12px;background:rgba(214,180,106,.1) }.club-flow-timer i span { display:block;width:63%;height:100%;background:#d6b46a;box-shadow:0 0 10px rgba(214,180,106,.5) }.club-flow-prompt { margin-top:20px!important;padding:0 10px;text-align:center }.club-flow-alive { min-height:46px;display:flex;align-items:center;justify-content:space-between;padding:0 8px;border-top:1px solid rgba(214,180,106,.1);font-size:10px;color:rgba(251,243,223,.42) }.club-flow-alive b{color:#e5c988;font-weight:650}
        .club-flow-ballot { display:flex; flex-direction:column; gap:7px; margin:20px 0 14px; }.club-flow-ballot button { min-height:54px;display:grid;grid-template-columns:38px 1fr 22px;align-items:center;gap:10px;padding:0 12px;border:1px solid rgba(214,180,106,.12);border-radius:11px;background:rgba(255,255,255,.024);color:#fbf3df;text-align:left }.club-flow-ballot button>span { width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(214,180,106,.2);border-radius:50%;color:#d6b46a;font:650 9px/1 var(--font-mono) }.club-flow-ballot button b{font:600 12px/1 var(--font-sans)}.club-flow-ballot button i{width:16px;height:16px;border:1px solid rgba(214,180,106,.3);border-radius:50%}.club-flow-ballot button.is-selected{border-color:rgba(214,180,106,.45);background:rgba(214,180,106,.08)}.club-flow-ballot button.is-selected i{border:5px solid #d6b46a}
        .club-flow-verdict-mark,.club-flow-laurel { width:118px;height:142px;display:grid;place-items:center;margin:26px 0 5px;border:1px solid rgba(184,48,62,.38);background:linear-gradient(145deg,rgba(126,25,38,.18),rgba(255,255,255,.02));color:#dda1a8;font:400 62px/1 Georgia,serif;box-shadow:0 25px 45px rgba(0,0,0,.28) }.club-flow-role-chip { width:100%;display:flex;align-items:center;justify-content:space-between;margin-top:28px;padding:14px;border-top:1px solid rgba(214,180,106,.15);border-bottom:1px solid rgba(214,180,106,.15);font-size:10px;color:rgba(251,243,223,.42) }.club-flow-role-chip b{color:#e5c988;font:500 14px/1 Georgia,serif}.club-flow-laurel{width:126px;height:126px;border-radius:50%;border-color:rgba(214,180,106,.4);color:#e5c988;background:radial-gradient(circle,rgba(214,180,106,.12),transparent);box-shadow:0 0 0 10px rgba(214,180,106,.025),0 0 55px rgba(214,180,106,.08)}
        .club-flow-final-stats { width:100%;display:grid;grid-template-columns:repeat(3,1fr);margin:24px 0 18px;border-top:1px solid rgba(214,180,106,.14);border-bottom:1px solid rgba(214,180,106,.14) }.club-flow-final-stats div{display:flex;flex-direction:column;gap:5px;padding:13px 4px;border-right:1px solid rgba(214,180,106,.1)}.club-flow-final-stats div:last-child{border:0}.club-flow-final-stats b{font:400 24px/1 Georgia,serif;color:#e5c988}.club-flow-final-stats span{font-size:8px;color:rgba(251,243,223,.38);text-transform:uppercase}

        .club-flow-tv { color:#fbf3df; background:radial-gradient(circle at 50% 30%,rgba(95,43,104,.28),transparent 34%),linear-gradient(165deg,#27122d,#100812 64%,#070507); }
        .club-flow-tv::before,.club-flow-tv::after { content:"";position:absolute;top:0;bottom:0;width:330px;z-index:-1;opacity:.42;background:repeating-linear-gradient(88deg,#2d0d1e 0 50px,#49172e 85px,#210816 140px) }.club-flow-tv::before{left:-90px;transform:skewX(-6deg)}.club-flow-tv::after{right:-90px;transform:skewX(6deg)}
        .club-flow-tv-frame { position:absolute;inset:42px;border:1px solid rgba(214,180,106,.18);pointer-events:none }.club-flow-tv-frame::before,.club-flow-tv-frame::after{content:"";position:absolute;left:50%;width:260px;height:1px;background:linear-gradient(90deg,transparent,#d6b46a,transparent);transform:translateX(-50%)}.club-flow-tv-frame::before{top:-1px}.club-flow-tv-frame::after{bottom:-1px}
        .club-flow-tv > header { height:128px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:50px;padding:0 92px;border-bottom:1px solid rgba(214,180,106,.12);font:600 18px/1 var(--font-mono);letter-spacing:.16em;color:rgba(251,243,223,.46) }.club-flow-tv>header div{display:flex;align-items:center;gap:20px;color:#e5c988}.club-flow-tv>header div span{width:50px;height:50px;display:grid;place-items:center;border:1px solid rgba(214,180,106,.38);border-radius:50%;font:400 24px/1 Georgia,serif}.club-flow-tv>header small{font:600 17px/1 var(--font-mono);letter-spacing:.15em}.club-flow-tv>header small:last-child{text-align:right}
        .club-flow-tv > footer { position:absolute;left:92px;right:92px;bottom:65px;display:flex;justify-content:space-between;color:rgba(251,243,223,.37);font:500 17px/1 var(--font-mono);letter-spacing:.11em }.club-flow-tv-kicker{color:#d6b46a;font:650 18px/1 var(--font-mono);letter-spacing:.25em}
        .club-flow-tv-lobby { position:absolute;inset:190px 110px 145px;display:grid;grid-template-columns:1fr 650px;gap:120px;align-items:center }.club-flow-tv-lobby h3,.club-flow-tv-day h3,.club-flow-tv-verdict h3{margin:32px 0 26px;font:400 120px/.86 Georgia,serif;letter-spacing:-.055em}.club-flow-tv-lobby p,.club-flow-tv-day p,.club-flow-tv-verdict p{max-width:700px;color:rgba(251,243,223,.5);font:400 28px/1.45 var(--font-sans)}.club-flow-tv-guestlist{display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:30px;border:1px solid rgba(214,180,106,.18);background:rgba(0,0,0,.18)}.club-flow-tv-guestlist>small{grid-column:1/-1;margin-bottom:10px;color:#d6b46a;font:650 16px/1 var(--font-mono);letter-spacing:.2em}.club-flow-tv-guestlist>span{min-height:74px;display:grid;grid-template-columns:46px 1fr auto;align-items:center;gap:12px;padding:0 13px;border-bottom:1px solid rgba(214,180,106,.1)}.club-flow-tv-guestlist i{width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(214,180,106,.25);border-radius:50%;font:650 11px/1 var(--font-mono);font-style:normal}.club-flow-tv-guestlist b{font:500 20px/1 var(--font-sans)}.club-flow-tv-guestlist em{color:rgba(214,180,106,.54);font:650 11px/1 var(--font-mono);font-style:normal}
        .club-flow-tv-night { position:absolute;inset:175px 180px 155px;display:flex;flex-direction:column;align-items:center;text-align:center }.club-flow-tv-moon{width:230px;height:230px;display:grid;place-items:center;margin-bottom:25px;border:1px solid rgba(214,180,106,.25);border-radius:50%;color:#e5c988;background:rgba(214,180,106,.03);filter:drop-shadow(0 0 50px rgba(214,180,106,.15))}.club-flow-tv-night h3,.club-flow-tv-voting h3,.club-flow-tv-finale h3{margin:24px 0 20px;font:400 88px/.96 Georgia,serif;letter-spacing:-.045em}.club-flow-tv-night p,.club-flow-tv-voting p,.club-flow-tv-finale p{margin:0;color:rgba(251,243,223,.48);font-size:26px}.club-flow-tv-steps{display:flex;gap:10px;margin-top:52px}.club-flow-tv-steps span{min-width:260px;padding:17px 22px;border:1px solid rgba(214,180,106,.1);color:rgba(251,243,223,.3);font:600 15px/1 var(--font-mono);letter-spacing:.08em}.club-flow-tv-steps .is-done{color:rgba(214,180,106,.5)}.club-flow-tv-steps .is-active{border-color:rgba(214,180,106,.45);background:rgba(214,180,106,.07);color:#e5c988;box-shadow:0 0 35px rgba(214,180,106,.06)}
        .club-flow-tv-day { position:absolute;inset:190px 120px 155px;display:grid;grid-template-columns:1fr 440px;gap:90px;align-items:center }.club-flow-tv-report{display:grid;grid-template-columns:210px 1fr;gap:45px;align-items:center}.club-flow-tv-report>span,.club-flow-tv-portrait{width:200px;height:260px;display:grid;place-items:center;border:1px solid rgba(184,48,62,.4);background:linear-gradient(145deg,rgba(126,25,38,.2),rgba(255,255,255,.02));color:#dda1a8;font:400 104px/1 Georgia,serif;box-shadow:0 30px 60px rgba(0,0,0,.3)}.club-flow-tv-report small{color:#b96773;font:650 17px/1 var(--font-mono);letter-spacing:.18em}.club-flow-tv-day h3{font-size:94px}.club-flow-tv-clock{min-height:420px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid rgba(214,180,106,.2);background:rgba(0,0,0,.18);text-align:center}.club-flow-tv-clock small{color:#d6b46a;font:650 16px/1 var(--font-mono);letter-spacing:.18em}.club-flow-tv-clock b{margin:32px 0;color:#fbf3df;font:400 102px/1 Georgia,serif;font-variant-numeric:tabular-nums}.club-flow-tv-clock span{max-width:280px;color:rgba(251,243,223,.4);font-size:20px;line-height:1.4}
        .club-flow-tv-voting,.club-flow-tv-finale { position:absolute;inset:205px 160px 155px;display:flex;flex-direction:column;align-items:center;text-align:center }.club-flow-tv-vote-progress{display:grid;grid-template-columns:520px auto;align-items:center;gap:22px;margin-top:55px}.club-flow-tv-vote-progress>div{height:5px;background:rgba(214,180,106,.1)}.club-flow-tv-vote-progress>div span{display:block;height:100%;background:#d6b46a;box-shadow:0 0 18px rgba(214,180,106,.4)}.club-flow-tv-vote-progress b{font:400 40px/1 Georgia,serif}.club-flow-tv-vote-progress small{grid-column:1/-1;color:rgba(251,243,223,.35);font:600 15px/1 var(--font-mono);letter-spacing:.12em}.club-flow-tv-voters{display:flex;gap:14px;margin-top:38px}.club-flow-tv-voters>span{width:68px;height:68px;position:relative;font-size:13px}.club-flow-tv-voters>span i{position:absolute;right:0;bottom:1px;width:12px;height:12px;border:2px solid #160a18;border-radius:50%;background:#593e5d}.club-flow-tv-voters>span.is-ready i{background:#d6b46a;box-shadow:0 0 12px rgba(214,180,106,.55)}
        .club-flow-tv-verdict { position:absolute;inset:205px 170px 155px;display:grid;grid-template-columns:270px 1fr;gap:70px;align-items:center }.club-flow-tv-verdict h3{font-size:92px}.club-flow-tv-verdict p b{color:#e5c988;font-weight:500}.club-flow-tv-countdown{display:grid;grid-template-columns:160px 1fr auto;align-items:center;gap:18px;margin-top:35px;padding-top:24px;border-top:1px solid rgba(214,180,106,.14);color:rgba(251,243,223,.4);font:600 16px/1 var(--font-mono);letter-spacing:.1em}.club-flow-tv-countdown i{height:2px;background:linear-gradient(90deg,#d6b46a,transparent)}.club-flow-tv-countdown b{color:#e5c988;font:400 52px/1 Georgia,serif}.club-flow-tv-finale h3{font-size:112px}.club-flow-tv-role-row{display:flex;gap:16px;margin-top:42px}.club-flow-tv-role-row>div{width:112px;height:150px;position:relative;overflow:hidden;border-radius:8px;box-shadow:0 16px 35px rgba(0,0,0,.45)}.club-flow-tv-role-row img{object-fit:cover}

        .club-host-section { position:relative; max-width:1480px; margin:96px auto 0; padding:48px 30px 42px; overflow:hidden; border:1px solid rgba(214,180,106,.22); border-radius:34px; background:radial-gradient(circle at 8% 5%,rgba(111,48,121,.24),transparent 32%),linear-gradient(154deg,rgba(42,16,46,.7),rgba(11,6,13,.94) 60%); box-shadow:0 45px 120px rgba(0,0,0,.5); }
        .club-host-section::before { content:"";position:absolute;inset:14px;border:1px solid rgba(214,180,106,.08);border-radius:25px;pointer-events:none }
        .club-host-intro { padding-bottom:26px }
        .club-host-principles { position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 18px 34px }
        .club-host-principles span { min-height:52px;display:flex;align-items:center;gap:12px;padding:0 16px;border:1px solid rgba(214,180,106,.13);border-radius:10px;background:rgba(255,255,255,.025);color:rgba(251,243,223,.55);font-size:11px }
        .club-host-principles b { color:#d6b46a;font:700 10px/1 var(--font-mono);letter-spacing:.12em }
        .club-host-mockups { position:relative;display:grid;grid-template-columns:repeat(3,390px);gap:28px;justify-content:center;align-items:start }
        .club-host-phone { background:radial-gradient(circle at 50% 18%,rgba(96,45,108,.3),transparent 35%),linear-gradient(158deg,#25102c,#120713 62%,#080508) }
        .club-host-content { flex:1;display:flex;min-height:0;flex-direction:column;padding:22px 8px 3px }
        .club-host-content>h3 { margin:11px 0 8px;font:400 32px/.98 Georgia,serif;letter-spacing:-.04em }
        .club-host-content>p { margin:0;color:rgba(251,243,223,.5);font:400 11px/1.45 var(--font-sans) }
        .club-host-candidate-list { display:flex;min-height:0;flex:1;flex-direction:column;gap:6px;margin:17px 0 13px }
        .club-host-candidate-list button { flex:1;min-height:48px;display:grid;grid-template-columns:36px 1fr auto 22px;align-items:center;gap:10px;padding:0 11px;border:1px solid rgba(214,180,106,.11);border-radius:10px;background:rgba(255,255,255,.022);color:#fbf3df;text-align:left;cursor:pointer;transition:border-color .2s ease,background .2s ease,box-shadow .2s ease }
        .club-host-candidate-list button:hover { border-color:rgba(214,180,106,.3);background:rgba(214,180,106,.045) }
        .club-host-candidate-list button:focus-visible,.club-family-targets button:focus-visible { outline:3px solid #f0d795;outline-offset:2px }
        .club-host-candidate-list button>span { width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(214,180,106,.22);border-radius:50%;color:#d6b46a;font:650 9px/1 var(--font-mono) }
        .club-host-candidate-list button>b { font:600 12px/1 var(--font-sans) }
        .club-host-candidate-list button>small { color:rgba(251,243,223,.35);font:650 8px/1 var(--font-mono);letter-spacing:.08em;text-transform:uppercase }
        .club-host-candidate-list button>i { width:22px;height:22px;display:grid;place-items:center;color:transparent;font-style:normal }
        .club-host-candidate-list button.is-host { border-color:rgba(214,180,106,.58);background:linear-gradient(90deg,rgba(214,180,106,.12),rgba(91,45,105,.15));box-shadow:inset 3px 0 #d6b46a,0 0 22px rgba(214,180,106,.05) }
        .club-host-candidate-list button.is-host>small,.club-host-candidate-list button.is-host>i { color:#e5c988 }
        .club-host-selection .club-flow-security { gap:7px;color:rgba(229,201,136,.55) }

        .club-host-console-main { flex:1;display:flex;min-height:0;flex-direction:column;padding:18px 7px 0 }
        .club-host-console-title { display:grid;grid-template-columns:1fr 73px;gap:12px;align-items:center;padding:0 2px 13px }
        .club-host-console-title h3 { margin:8px 0 0;font:400 27px/.96 Georgia,serif;letter-spacing:-.035em }
        .club-host-progress { width:70px;height:70px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid rgba(214,180,106,.35);border-radius:50%;background:rgba(214,180,106,.04);color:#e5c988;box-shadow:0 0 28px rgba(214,180,106,.06) }
        .club-host-progress b { font:400 22px/1 Georgia,serif }.club-host-progress small{margin-top:4px;color:rgba(251,243,223,.4);font-size:7px;text-transform:uppercase;letter-spacing:.08em}
        .club-host-panel { margin-bottom:9px;border:1px solid rgba(214,180,106,.14);border-radius:11px;background:rgba(0,0,0,.14);overflow:hidden }
        .club-host-panel>header { min-height:31px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;border-bottom:1px solid rgba(214,180,106,.1);color:#d6b46a;font:650 8px/1 var(--font-mono);letter-spacing:.12em }
        .club-host-panel>header>b { color:rgba(251,243,223,.35);font-weight:600;letter-spacing:.04em }.club-host-panel>header>b.is-complete{display:flex;align-items:center;gap:4px;color:#a9d0b0}
        .club-host-role-grid { display:grid;grid-template-columns:1fr 1fr;padding:5px }
        .club-host-role-grid>div { min-height:39px;display:grid;grid-template-columns:28px 1fr;align-items:center;gap:8px;padding:3px 6px;border-bottom:1px solid rgba(214,180,106,.07) }.club-host-role-grid>div:nth-last-child(-n+2){border-bottom:0}
        .club-host-role-grid>div>span { width:26px;height:34px;position:relative;overflow:hidden;border-radius:3px;background:#170b18 }.club-host-role-grid img{object-fit:cover}
        .club-host-role-grid p { min-width:0;display:flex;flex-direction:column;gap:3px;margin:0 }.club-host-role-grid p b{overflow:hidden;color:#fbf3df;font:600 9px/1 var(--font-sans);text-overflow:ellipsis;white-space:nowrap}.club-host-role-grid p small{color:rgba(214,180,106,.64);font-size:7px;text-transform:uppercase;letter-spacing:.05em}
        .club-host-decisions>div { min-height:34px;display:grid;grid-template-columns:67px 1fr auto;align-items:center;gap:7px;padding:0 9px;border-bottom:1px solid rgba(214,180,106,.075) }.club-host-decisions>div:last-child{border-bottom:0}
        .club-host-decisions>div>span { color:#d6b46a;font:650 8px/1 var(--font-mono);text-transform:uppercase }.club-host-decisions>div>p{overflow:hidden;margin:0;color:rgba(251,243,223,.64);font-size:8px;text-overflow:ellipsis;white-space:nowrap}.club-host-decisions>div>b{color:#9dc7a5;font:650 7px/1 var(--font-mono);text-transform:uppercase}
        .club-host-console-main>.club-flow-primary { margin-top:auto }

        .club-family-vote .club-flow-phone-action { padding-top:20px }
        .club-family-vote .club-flow-phone-action h3 { margin:10px 0 8px;font-size:31px }
        .club-family-vote .club-flow-phone-action>p { font-size:10px }
        .club-family-legend { display:flex;gap:13px;margin:13px 0 10px;padding:9px 0;border-top:1px solid rgba(214,180,106,.1);border-bottom:1px solid rgba(214,180,106,.1) }
        .club-family-legend>span { display:flex;align-items:center;gap:6px;color:rgba(251,243,223,.47);font-size:8px }
        .club-family-legend i { width:21px;height:21px;display:grid;place-items:center;border-radius:50%;font:650 6px/1 var(--font-mono);font-style:normal }
        .club-family-legend i.is-own { border:1px solid #c45461;background:rgba(142,35,49,.35);color:#ffd6da }.club-family-legend i.is-family{border:1px solid rgba(167,139,250,.55);background:rgba(112,78,164,.2);color:#d7c8ff}
        .club-family-targets { display:flex;min-height:0;flex:1;flex-direction:column;gap:8px;margin-bottom:12px }
        .club-family-targets button { flex:1;min-height:82px;display:grid;grid-template-columns:45px 1fr auto;align-items:center;gap:11px;padding:0 12px;border:1px solid rgba(214,180,106,.12);border-radius:12px;background:rgba(255,255,255,.022);color:#fbf3df;text-align:left;cursor:pointer;transition:border-color .2s ease,background .2s ease,box-shadow .2s ease }
        .club-family-targets button:hover { border-color:rgba(214,180,106,.32);background:rgba(214,180,106,.04) }
        .club-family-avatar { width:42px;height:42px;display:grid;place-items:center;border:1px solid rgba(214,180,106,.25);border-radius:50%;color:#d6b46a;font:650 9px/1 var(--font-mono) }
        .club-family-target-copy { min-width:0;display:flex;flex-direction:column;gap:6px }.club-family-target-copy b{font:600 12px/1 var(--font-sans)}.club-family-target-copy small{color:rgba(251,243,223,.33);font:650 7px/1 var(--font-mono);letter-spacing:.07em}
        .club-family-vote-marks { display:flex;align-items:center;justify-content:flex-end }
        .club-family-vote-marks i,.club-family-vote-marks em { width:28px;height:28px;display:grid;place-items:center;margin-left:-5px;border:1px solid rgba(167,139,250,.55);border-radius:50%;background:#28183c;color:#d7c8ff;font:650 7px/1 var(--font-mono);font-style:normal;box-shadow:0 0 0 2px #160a18 }
        .club-family-vote-marks em { position:relative;z-index:2;margin-left:5px;border-color:#c45461;background:#7f2130;color:#ffe3e5;box-shadow:0 0 0 2px #160a18,0 0 16px rgba(184,48,62,.2) }
        .club-family-targets button.is-own-choice { border-color:rgba(196,84,97,.78);background:linear-gradient(90deg,rgba(137,31,46,.22),rgba(67,20,51,.14));box-shadow:inset 3px 0 #c45461,0 0 24px rgba(184,48,62,.08) }
        .club-family-targets button.is-own-choice .club-family-target-copy small { color:#e6aab1 }
        .club-host-note { position:relative;display:flex;align-items:center;gap:12px;margin:30px 18px 0;padding:16px 18px;border-top:1px solid rgba(214,180,106,.12);border-bottom:1px solid rgba(214,180,106,.12);color:#d6b46a }
        .club-host-note p { margin:0;color:rgba(251,243,223,.48);font-size:11px;line-height:1.5 }.club-host-note b{color:#e5c988;font-weight:650}

        .mafia-preview-page-footer { display:flex;justify-content:space-between;align-items:end;gap:40px;margin-top:64px;padding:36px 0;border-top:1px solid rgba(255,255,255,.1) }.mafia-preview-page-footer span{color:#a78bfa;font:700 11px/1 var(--font-mono);letter-spacing:.16em;text-transform:uppercase}.mafia-preview-page-footer h2{margin:10px 0 0;font:500 36px/1.1 Georgia,serif}.mafia-preview-page-footer p{max-width:570px;margin:0;color:rgba(255,255,255,.46);line-height:1.55}

        @keyframes mafia-hold-pulse { 0%,100%{transform:scale(.96);opacity:.14}50%{transform:scale(1.08);opacity:.4} }
        @keyframes mafia-scan-card { 0%,22%{transform:translateX(-110%)}55%,100%{transform:translateX(110%)} }
        @keyframes mafia-tv-beam { from{transform:translateX(-160px) rotate(28deg);opacity:.45}to{transform:translateX(180px) rotate(28deg);opacity:1} }
        @keyframes mafia-status-pulse { 0%,100%{opacity:.45}50%{opacity:1} }
        @keyframes club-flow-pulse { 0%,100%{opacity:.35;transform:scale(.9)}50%{opacity:1;transform:scale(1.08)} }

        @media (max-width:1460px){.mafia-concept-devices,.club-flow-devices{grid-template-columns:390px 672px}.mafia-tv-viewport{width:672px;height:378px}.mafia-tv-canvas{transform:scale(.35)}.club-flow-nav{grid-template-columns:repeat(3,1fr)}.club-host-mockups{grid-template-columns:repeat(2,390px)}}
        @media (max-width:1160px){.mafia-preview-deck{grid-template-columns:1fr}.mafia-concept-devices,.club-flow-devices{grid-template-columns:390px}.mafia-device-tv-column{margin-top:10px}.mafia-tv-viewport{width:672px;height:378px}.mafia-concept-devices,.club-flow-devices{justify-items:center}.mafia-device-tv-column{width:672px}.club-flow-intro{grid-template-columns:1fr;gap:24px}.club-host-principles{grid-template-columns:1fr}.club-host-mockups{grid-template-columns:390px}}
        @media (max-width:760px){.mafia-preview-page{padding:30px 16px 70px}.mafia-preview-hero h1{font-size:60px}.mafia-preview-deck{padding:20px}.mafia-preview-deck-grid{grid-template-columns:repeat(4,1fr)}.mafia-concept{padding:18px;border-radius:22px}.mafia-concept-intro{grid-template-columns:58px 1fr}.mafia-concept-number{font-size:38px}.mafia-concept-copy h2{font-size:30px}.mafia-concept-select{grid-column:1/-1;width:100%}.mafia-device-tv-column{width:336px}.mafia-tv-viewport{width:336px;height:189px;border-radius:12px}.mafia-tv-canvas{transform:scale(.175)}.mafia-preview-page-footer{align-items:start;flex-direction:column}.club-flow-section,.club-host-section{margin-top:60px;padding:28px 14px 24px;border-radius:24px}.club-flow-intro{padding-inline:8px}.club-flow-intro h2{font-size:48px}.club-flow-nav{grid-template-columns:1fr 1fr;margin-inline:8px}.club-flow-current{padding-inline:8px}.club-flow-coverage,.club-host-principles,.club-host-note{margin-inline:8px}.club-host-principles span{min-height:48px}}
        @media (max-width:450px){.mafia-preview-hero h1{font-size:50px}.mafia-preview-hero>p{font-size:16px}.mafia-concept-devices,.club-flow-devices,.club-host-mockups{grid-template-columns:320px}.mafia-phone-viewport{width:320px;height:692px;border-radius:40px}.mafia-phone-canvas,.club-flow-phone{transform:scale(.82);transform-origin:top left}.mafia-device-column:not(.mafia-device-tv-column){width:320px}.mafia-preview-deck-card figcaption{display:none}.club-flow-nav button{min-height:78px;padding:10px}.club-flow-intro h2{font-size:40px}.club-flow-current>span{font-size:44px}.club-host-note{align-items:flex-start}.club-host-principles span{font-size:10px}}
        @media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.mafia-role-hold-ring::after,.mafia-role-reveal-thriller::before,.mafia-thriller-beam,.mafia-tv-thriller header div:last-child i,.club-flow-wait i{animation:none!important}.mafia-preview-deck-card,.mafia-preview-hero nav a,.mafia-concept-select,.club-flow-nav button,.club-host-candidate-list button,.club-family-targets button{transition:none!important}}
      `}</style>
    </main>
  );
}
