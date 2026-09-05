"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AliasIcon, type AliasIconName } from "@/components/games/AliasIcon";

type ConceptId = "broadcast" | "editorial" | "arcade" | "workshop";
type AliasMode = "classic" | "letter";

type Concept = {
  id: ConceptId;
  number: string;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  secondary: string;
  tags: string[];
};

const concepts: Concept[] = [
  {
    id: "broadcast",
    number: "01",
    name: "Словесный эфир",
    subtitle: "Прямой эфир · Студийный свет · Темп",
    description:
      "Большая телевизионная студия: световой круг таймера, плашки прямого эфира и счёт, который читается из любого угла комнаты.",
    accent: "#ff3f93",
    secondary: "#c9ff4f",
    tags: ["телешоу", "on air", "контрастный HUD"],
  },
  {
    id: "editorial",
    number: "02",
    name: "Типографическая дуэль",
    subtitle: "Бумага · Ритм текста · Редакционный жест",
    description:
      "Слово становится главным графическим объектом. Молочный фон, печатная сетка и маджента работают как современный культурный журнал.",
    accent: "#d81767",
    secondary: "#11100e",
    tags: ["редакционный", "светлая тема", "кинетический текст"],
  },
  {
    id: "arcade",
    number: "03",
    name: "Аркадный словобой",
    subtitle: "Комбо · Неон · Игровая арена",
    description:
      "Соревнование ощущается как кооперативная аркада. Пиксельный ритм, фуксия с цианом и яркие реакции на каждый угаданный ответ.",
    accent: "#ff2ca8",
    secondary: "#33f4ff",
    tags: ["аркада", "неон", "комбо и частицы"],
  },
  {
    id: "workshop",
    number: "04",
    name: "Карточная мастерская",
    subtitle: "Стопка карт · Тёплая бумага · Ручная игра",
    description:
      "Цифровой экран ведёт себя как красивая настольная игра: карточки перемешиваются, жетоны подпрыгивают, а результаты собираются на общем столе.",
    accent: "#d92f72",
    secondary: "#ff7b54",
    tags: ["тактильный", "настольная игра", "тёплая палитра"],
  },
];

const players = ["Анна", "Миша", "Лена", "Саша"];

function getAliasWordSizeClass(word: string): string {
  const longestTokenLength = Math.max(...word.trim().split(/\s+/).map((token) => token.length));
  if (longestTokenLength >= 18) return "alias-word-size-xlong";
  if (longestTokenLength >= 14) return "alias-word-size-long";
  if (longestTokenLength >= 11) return "alias-word-size-medium";
  return "";
}

function PreviewGlyph({ name, size = 24 }: { name: AliasIconName; size?: number }) {
  return <AliasIcon name={name} className="alias-preview-glyph" style={{ width: size, height: size }} />;
}

function DeviceLabel({ tv = false }: { tv?: boolean }) {
  return (
    <div className="alias-preview-device-label">
      <span>{tv ? "Игровое поле · TV" : "Телефон объясняющего"}</span>
      <b>{tv ? "1920 × 1080" : "390 × 844"}</b>
    </div>
  );
}

function ModeSwitch({ mode, onChange }: { mode: AliasMode; onChange: (mode: AliasMode) => void }) {
  return (
    <div className="alias-preview-mode-switch" aria-label="Режим макета">
      <button type="button" className={mode === "classic" ? "is-active" : ""} onClick={() => onChange("classic")}>
        <PreviewGlyph name="book" size={18} />
        <span><b>Классика</b><small>Команда против команды</small></span>
      </button>
      <button type="button" className={mode === "letter" ? "is-active" : ""} onClick={() => onChange("letter")}>
        <PreviewGlyph name="letters" size={18} />
        <span><b>На букву</b><small>Каждый сам за себя</small></span>
      </button>
    </div>
  );
}

function TimerRing({ seconds, label }: { seconds: number; label?: string }) {
  return (
    <div className="alias-preview-timer">
      <svg viewBox="0 0 180 180" aria-hidden="true">
        <circle cx="90" cy="90" r="76" />
        <circle className="progress" cx="90" cy="90" r="76" />
      </svg>
      <b>{seconds}</b>
      <span>{label ?? "СЕКУНД"}</span>
    </div>
  );
}

function PhoneMockup({ concept, mode, motionKey }: { concept: Concept; mode: AliasMode; motionKey: number }) {
  const words = mode === "classic"
    ? ["МЕТЕОРИТ", "КАМЕРТОН", "ЛАБИРИНТ", "ФОНАРЬ"]
    : ["МАЯК", "МУЗЕЙ", "МЕТЕЛЬ", "МОЗАИКА"];
  const [wordIndex, setWordIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
  const cardTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (cardTimerRef.current !== null) window.clearTimeout(cardTimerRef.current);
    };
  }, []);

  const changeWorkshopCard = (direction: "left" | "right") => {
    if (concept.id !== "workshop" || exitDirection) return;
    setExitDirection(direction);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cardTimerRef.current = window.setTimeout(() => {
      setWordIndex((index) => (index + 1) % words.length);
      setExitDirection(null);
      cardTimerRef.current = null;
    }, reducedMotion ? 20 : 360);
  };

  const word = words[wordIndex];
  return (
    <div className="alias-preview-device-column alias-preview-phone-column">
      <DeviceLabel />
      <div className="alias-preview-phone-shell">
        <div key={`${concept.id}-${mode}-${motionKey}`} className={`alias-preview-phone phone-${concept.id}`}>
          <div className="alias-preview-decor" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
          </div>
          <div className="alias-phone-status"><span>21:47</span><b>● ● ●</b></div>
          <header className="alias-phone-header">
            <div><PreviewGlyph name="speech" size={24} /><span><b>УГАДАЙ СЛОВО</b><small>{mode === "classic" ? "КЛАССИКА" : "НА БУКВУ"}</small></span></div>
            <em>1 / 4</em>
          </header>

          <main className="alias-phone-main">
            <div className="alias-phone-round">
              <span>{mode === "classic" ? "ХОД КОМАНДЫ · ИСКРЫ" : "ЛИЧНЫЙ ХОД · АННА"}</span>
              <b>ОБЪЯСНЯЕТЕ ВЫ</b>
            </div>

            <div className="alias-phone-card-stack">
              {concept.id === "workshop" && <>
                <i className="alias-phone-under-card alias-phone-under-card-back" aria-hidden="true" />
                <i className="alias-phone-under-card alias-phone-under-card-middle" aria-hidden="true" />
              </>}
              <section
                key={`${mode}-${wordIndex}`}
                className={`alias-phone-word-card${exitDirection ? ` is-exiting-${exitDirection}` : ""}`}
                aria-live="polite"
              >
                <div className="alias-phone-card-meta">
                  <span>{mode === "classic" ? "СЛОВО 07" : "СЛОВО · БУКВА М"}</span>
                  <PreviewGlyph name={mode === "classic" ? "talk" : "letters"} size={28} />
                </div>
                {mode === "letter" && <div className="alias-phone-letter">М</div>}
                <h2 className={getAliasWordSizeClass(word)}>{word}</h2>
                <div className="alias-phone-guessers">
                  <small>УГАДЫВАЮТ</small>
                  <div>{players.slice(mode === "classic" ? 0 : 1).map((player) => <i key={player}>{player[0]}</i>)}</div>
                </div>
              </section>
            </div>

            <div className="alias-phone-timebar"><i /><span>00:{mode === "classic" ? "42" : "72"}</span></div>
            <div className="alias-phone-actions">
              <button type="button" disabled={exitDirection !== null} onClick={() => changeWorkshopCard("left")}><PreviewGlyph name="cross" size={24} /><span><b>ПРОПУСТИТЬ</b><small>{mode === "classic" ? "−1 ОЧКО" : "БЕЗ ШТРАФА"}</small></span></button>
              <button type="button" disabled={exitDirection !== null} onClick={() => changeWorkshopCard("right")}><PreviewGlyph name="check" size={25} /><span><b>УГАДАЛИ</b><small>+1 ОЧКО</small></span></button>
            </div>
          </main>

          <footer className="alias-phone-footer"><span><i /> ХОД ИДЁТ</span><b>{mode === "classic" ? "ИСКРЫ 12 · 9 КОМЕТЫ" : "АННА · 12 ОЧКОВ"}</b></footer>
        </div>
      </div>
    </div>
  );
}

function Scoreboard({ mode }: { mode: AliasMode }) {
  const entries = mode === "classic"
    ? [{ name: "ИСКРЫ", score: 12 }, { name: "КОМЕТЫ", score: 9 }]
    : [{ name: "АННА", score: 12 }, { name: "МИША", score: 10 }, { name: "ЛЕНА", score: 8 }, { name: "САША", score: 7 }];
  return (
    <div className="alias-tv-scoreboard">
      {entries.map((entry, index) => (
        <div key={entry.name} className={index === 0 ? "is-leading" : ""}>
          <span>{String(index + 1).padStart(2, "0")}</span><b>{entry.name}</b><strong>{entry.score}</strong>
        </div>
      ))}
    </div>
  );
}

function TvMockup({ concept, mode, motionKey }: { concept: Concept; mode: AliasMode; motionKey: number }) {
  return (
    <div className="alias-preview-device-column alias-preview-tv-column">
      <DeviceLabel tv />
      <div className="alias-preview-tv-shell">
        <div key={`${concept.id}-${mode}-${motionKey}`} className={`alias-preview-tv tv-${concept.id}`}>
          <div className="alias-preview-tv-decor" aria-hidden="true">
            {Array.from({ length: 22 }, (_, index) => <i key={index} />)}
          </div>
          <header className="alias-tv-header">
            <div className="alias-tv-brand"><PreviewGlyph name="speech" size={44} /><span><b>УГАДАЙ СЛОВО</b><small>{mode === "classic" ? "КЛАССИЧЕСКАЯ ИГРА" : "РЕЖИМ · НА БУКВУ"}</small></span></div>
            <div className="alias-tv-round"><span>РАУНД</span><b>1 / 4</b></div>
            <div className="alias-tv-live"><i /><span>ХОД ИДЁТ</span></div>
          </header>

          <main className="alias-tv-main">
            <div className="alias-tv-timer-zone"><TimerRing seconds={mode === "classic" ? 42 : 72} /><small>{mode === "classic" ? "60 СЕКУНД НА ХОД" : "90 СЕКУНД НА ХОД"}</small></div>
            <section className="alias-tv-focus">
              <span>{mode === "classic" ? "СЕЙЧАС ОБЪЯСНЯЕТ" : "ЛИЧНЫЙ ХОД"}</span>
              <h2>АННА</h2>
              {mode === "letter" ? (
                <div className="alias-tv-letter"><small>ОБЪЯСНЯЙТЕ НА БУКВУ</small><b>М</b></div>
              ) : (
                <div className="alias-tv-team"><i>А</i><i>М</i><i>Л</i><span>КОМАНДА «ИСКРЫ» УГАДЫВАЕТ</span></div>
              )}
              <div className="alias-tv-stats"><span><PreviewGlyph name="check" size={22} /><b>7</b><small>УГАДАНО</small></span><span><PreviewGlyph name="cross" size={22} /><b>2</b><small>ПРОПУЩЕНО</small></span></div>
            </section>
            <aside className="alias-tv-score-zone"><span>ТАБЛИЦА ОЧКОВ</span><Scoreboard mode={mode} /></aside>
          </main>

          <footer className="alias-tv-footer"><span>СЛОВО ВИДИТ ТОЛЬКО ОБЪЯСНЯЮЩИЙ</span><b>{mode === "classic" ? "СЛЕДУЮЩАЯ · КОМЕТЫ" : "СЛЕДУЮЩИЙ · МИША"}</b></footer>
        </div>
      </div>
    </div>
  );
}

function ConceptStage({ concept, mode, motionKey }: { concept: Concept; mode: AliasMode; motionKey: number }) {
  return (
    <section
      id={concept.id}
      className={`alias-concept-stage concept-${concept.id}`}
      style={{ "--concept-accent": concept.accent, "--concept-secondary": concept.secondary } as CSSProperties}
    >
      <div className="alias-concept-copy">
        <span>{concept.number} · {concept.subtitle}</span>
        <h1>{concept.name}</h1>
        <p>{concept.description}</p>
        <div>{concept.tags.map((tag) => <i key={tag}>{tag}</i>)}</div>
      </div>
      <div className="alias-preview-devices">
        <PhoneMockup key={`${concept.id}-${mode}-${motionKey}`} concept={concept} mode={mode} motionKey={motionKey} />
        <TvMockup concept={concept} mode={mode} motionKey={motionKey} />
      </div>
      <div className="alias-motion-note"><span><i /> {concept.id === "workshop" ? "ИНТЕРАКТИВНАЯ КОЛОДА" : "АНИМАЦИИ ВКЛЮЧЕНЫ"}</span><p>{concept.id === "workshop" ? "Нажмите «Пропустить» — карточка уйдёт влево. Нажмите «Угадали» — она улетит вправо, а из стопки поднимется новое слово." : "Слово появляется один раз, таймер движется постоянно, реакции кнопок быстрые. При `prefers-reduced-motion` декоративное движение отключается."}</p></div>
      {concept.id === "workshop" && <a className="alias-flow-jump" href="#workshop-full-flow">Смотреть все экраны выбранного дизайна <span>↓</span></a>}
    </section>
  );
}

type WorkshopFlowStep = "mode" | "teams" | "names" | "ready" | "explaining" | "guessing" | "result" | "finished";

const workshopFlowSteps: { id: WorkshopFlowStep; number: string; title: string; subtitle: string }[] = [
  { id: "mode", number: "01", title: "Выбор режима", subtitle: "Сбор игроков" },
  { id: "teams", number: "02", title: "Состав", subtitle: "Команды или личная игра" },
  { id: "names", number: "03", title: "Подготовка", subtitle: "Названия и порядок" },
  { id: "ready", number: "04", title: "Передача хода", subtitle: "Старт объясняющего" },
  { id: "explaining", number: "05", title: "Объяснение", subtitle: "Секретная карточка" },
  { id: "guessing", number: "06", title: "Угадывание", subtitle: "Экран остальных" },
  { id: "result", number: "07", title: "Итог хода", subtitle: "Слова и очки" },
  { id: "finished", number: "08", title: "Финал", subtitle: "Победитель" },
];

const workshopTurnWords: Record<AliasMode, { guessed: string[]; skipped: string[] }> = {
  classic: {
    guessed: ["МЕТЕОРИТ", "КОМПАС", "ТЕЛЕСКОП", "ВУЛКАН", "ОРБИТА", "СПУТНИК", "РАКЕТА"],
    skipped: ["АСТЕРОИД", "ГАЛАКТИКА"],
  },
  letter: {
    guessed: ["МОЗАИКА", "МАРШРУТ", "МАЯК", "МУЗЕЙ", "МЕЛОДИЯ", "МОТОР", "МОСТ"],
    skipped: ["МЕТЕЛЬ", "МАНДАРИН"],
  },
};

function FlowAvatars({ names, compact = false }: { names: string[]; compact?: boolean }) {
  return <div className={`alias-flow-avatars${compact ? " is-compact" : ""}`}>{names.map((name) => <span key={name}><i>{name[0]}</i><b>{name}</b></span>)}</div>;
}

function TurnWordLedger({ mode, tv = false }: { mode: AliasMode; tv?: boolean }) {
  const words = workshopTurnWords[mode];
  return (
    <section className={`alias-flow-word-ledger${tv ? " is-tv" : ""}`} aria-label="Слова этого хода">
      <article className="is-guessed">
        <b><i>✓</i> УГАДАНЫ · {words.guessed.length}</b>
        <div>{words.guessed.map((word) => <span key={word}>{word}</span>)}</div>
      </article>
      <article className="is-skipped">
        <b><i>×</i> ПРОПУЩЕНЫ · {words.skipped.length}</b>
        <div>{words.skipped.map((word) => <span key={word}>{word}</span>)}</div>
      </article>
    </section>
  );
}

function WorkshopFlowPhone({ step, mode, motionKey }: { step: WorkshopFlowStep; mode: AliasMode; motionKey: number }) {
  const modeLabel = mode === "classic" ? "КЛАССИКА" : "НА БУКВУ";
  const flowWords = mode === "classic"
    ? ["МЕТЕОРИТ", "КОМПАС", "ТЕЛЕСКОП", "ВУЛКАН"]
    : ["МОЗАИКА", "МАРШРУТ", "МЕТЕЛЬ", "МАЯК"];
  const [flowWordIndex, setFlowWordIndex] = useState(0);
  const [flowExitDirection, setFlowExitDirection] = useState<"left" | "right" | null>(null);
  const flowCardTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (flowCardTimerRef.current !== null) window.clearTimeout(flowCardTimerRef.current);
  }, []);

  const changeFlowCard = (direction: "left" | "right") => {
    if (step !== "explaining" || flowExitDirection) return;
    setFlowExitDirection(direction);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    flowCardTimerRef.current = window.setTimeout(() => {
      setFlowWordIndex((index) => (index + 1) % flowWords.length);
      setFlowExitDirection(null);
      flowCardTimerRef.current = null;
    }, reducedMotion ? 20 : 360);
  };

  return (
    <div className="alias-preview-device-column alias-preview-phone-column">
      <DeviceLabel />
      <div className="alias-preview-phone-shell alias-flow-phone-shell">
        <div key={`${step}-${mode}-${motionKey}`} className={`alias-preview-phone phone-workshop alias-flow-phone alias-flow-${step}`}>
          <div className="alias-preview-decor" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
          </div>
          <div className="alias-phone-status"><span>21:47</span><b>● ● ●</b></div>
          <header className="alias-phone-header">
            <div><PreviewGlyph name="speech" size={24} /><span><b>УГАДАЙ СЛОВО</b><small>{modeLabel}</small></span></div>
            <em>{workshopFlowSteps.find((item) => item.id === step)?.number} / 08</em>
          </header>

          <main className="alias-flow-phone-main">
            {step === "mode" && <>
              <div className="alias-flow-kicker">НОВАЯ ПАРТИЯ · 6 ИГРОКОВ</div>
              <h2>Выберите<br/>правила</h2>
              <div className="alias-flow-mode-cards">
                <article className={mode === "classic" ? "is-selected" : ""}><PreviewGlyph name="book" size={30} /><span><b>Классика <em>4–10 игроков</em></b><small>Две команды · 60 секунд</small></span><i>{mode === "classic" ? "✓" : ""}</i></article>
                <article className={mode === "letter" ? "is-selected" : ""}><PreviewGlyph name="letters" size={30} /><span><b>На букву <em>2–10 игроков</em></b><small>Каждый сам за себя · 90 секунд</small></span><i>{mode === "letter" ? "✓" : ""}</i></article>
              </div>
              <FlowAvatars names={["Анна", "Миша", "Лена", "Саша", "Олег", "Вера"]} compact />
              <button className="alias-flow-primary" type="button">НАЧАТЬ ИГРУ <span>→</span></button>
            </>}

            {step === "teams" && (mode === "classic" ? <>
              <div className="alias-flow-kicker">РАЗДЕЛИТЕСЬ НА ДВЕ КОМАНДЫ</div><h2>Выберите<br/>сторону</h2>
              <div className="alias-flow-team-pick">
                <article className="is-active"><small>КОМАНДА 01</small><b>ИСКРЫ</b><FlowAvatars names={["Анна", "Лена", "Олег"]} compact /></article>
                <article><small>КОМАНДА 02</small><b>КОМЕТЫ</b><FlowAvatars names={["Миша", "Саша"]} compact /><em>+ ВЕРА</em></article>
              </div>
              <button className="alias-flow-secondary" type="button"><PreviewGlyph name="shuffle" size={18}/> РАСПРЕДЕЛИТЬ СЛУЧАЙНО</button>
              <button className="alias-flow-primary" type="button">ПРОДОЛЖИТЬ <span>→</span></button>
            </> : <>
              <div className="alias-flow-kicker">ЛИЧНАЯ ИГРА · КАЖДЫЙ ЗА СЕБЯ</div><h2>Все<br/>в сборе</h2>
              <div className="alias-flow-player-list">{["Анна", "Миша", "Лена", "Саша", "Олег", "Вера"].map((name, index) => <article key={name}><span>{index + 1}</span><i>{name[0]}</i><b>{name}</b><small>{index === 0 ? "ПЕРВАЯ" : "ГОТОВ"}</small></article>)}</div>
              <button className="alias-flow-secondary" type="button"><PreviewGlyph name="shuffle" size={18}/> ПЕРЕМЕШАТЬ ПОРЯДОК</button>
              <button className="alias-flow-primary" type="button">ПРОДОЛЖИТЬ <span>→</span></button>
            </>)}

            {step === "names" && (mode === "classic" ? <>
              <div className="alias-flow-kicker">ВЫ НАЗЫВАЕТЕ КОМАНДУ 01</div><h2>Имя<br/>команды</h2>
              <div className="alias-flow-name-card"><small>НАПИШИТЕ НАЗВАНИЕ</small><b>ИСКРЫ</b><i /></div>
              <div className="alias-flow-suggestions"><span>СЛОВОЛОВЫ</span><span>ФРАЗА</span><span>ИСКРЫ</span></div>
              <article className="alias-flow-other-team"><span>КОМАНДА 02</span><b>Миша выбирает имя…</b><i /></article>
              <button className="alias-flow-primary" type="button">ПОДТВЕРДИТЬ <span>✓</span></button>
            </> : <>
              <div className="alias-flow-kicker">ПРАВИЛО РАУНДА</div><h2>Только<br/>на букву</h2>
              <div className="alias-flow-letter-rule"><small>ОБЪЯСНЯЙТЕ СЛОВА, ИСПОЛЬЗУЯ СЛОВА НА</small><b>М</b><span>Буква меняется каждый ход</span></div>
              <article className="alias-flow-rule-note"><PreviewGlyph name="hourglass" size={24}/><span><b>90 секунд</b><small>Пропуск без штрафа</small></span></article>
              <button className="alias-flow-primary" type="button">ПОНЯТНО <span>→</span></button>
            </>)}

            {step === "ready" && <>
              <div className="alias-flow-kicker">РАУНД 1 · {mode === "classic" ? "ХОД КОМАНДЫ «ИСКРЫ»" : "ЛИЧНЫЙ ХОД"}</div>
              <div className="alias-flow-ready-deck"><i/><i/><article><PreviewGlyph name="mic" size={42}/><small>СЕЙЧАС ОБЪЯСНЯЕТ</small><b>АННА</b>{mode === "letter" && <em>БУКВА ОТКРОЕТСЯ ПОСЛЕ СТАРТА</em>}</article></div>
              <p className="alias-flow-ready-copy">Возьмите телефон так, чтобы остальные не видели карточки.</p>
              <button className="alias-flow-primary is-tall" type="button">НАЧАТЬ ХОД!</button>
            </>}

            {step === "explaining" && <>
              <div className="alias-phone-round">
                <span>{mode === "classic" ? "ХОД КОМАНДЫ · ИСКРЫ" : "ЛИЧНЫЙ ХОД · АННА"}</span>
                <b>ОБЪЯСНЯЕТЕ ВЫ</b>
              </div>
              <div className="alias-phone-card-stack alias-flow-reference-stack">
                <i className="alias-phone-under-card alias-phone-under-card-back" aria-hidden="true" />
                <i className="alias-phone-under-card alias-phone-under-card-middle" aria-hidden="true" />
                <section key={`${mode}-${flowWordIndex}`} className={`alias-phone-word-card${flowExitDirection ? ` is-exiting-${flowExitDirection}` : ""}`} aria-live="polite">
                  <div className="alias-phone-card-meta"><span>{mode === "classic" ? `СЛОВО ${String(flowWordIndex + 7).padStart(2, "0")}` : "СЛОВО · БУКВА М"}</span><PreviewGlyph name={mode === "classic" ? "talk" : "letters"} size={28}/></div>
                  {mode === "letter" && <div className="alias-phone-letter">М</div>}
                  <h2 className={getAliasWordSizeClass(flowWords[flowWordIndex])}>{flowWords[flowWordIndex]}</h2>
                  <div className="alias-phone-guessers"><small>УГАДЫВАЮТ</small><div>{["Миша", "Лена", "Олег"].map((name)=><i key={name}>{name[0]}</i>)}</div></div>
                </section>
              </div>
              <div className="alias-phone-timebar"><i/><span>00:{mode === "classic" ? "42" : "72"}</span></div>
              <div className="alias-phone-actions"><button type="button" disabled={flowExitDirection !== null} onClick={() => changeFlowCard("left")}><PreviewGlyph name="cross" size={24}/><span><b>ПРОПУСТИТЬ</b><small>{mode === "classic" ? "−1 ОЧКО" : "БЕЗ ШТРАФА"}</small></span></button><button type="button" disabled={flowExitDirection !== null} onClick={() => changeFlowCard("right")}><PreviewGlyph name="check" size={25}/><span><b>УГАДАЛИ</b><small>+1 ОЧКО</small></span></button></div>
            </>}

            {step === "guessing" && <>
              <div className="alias-flow-kicker">РАУНД 1 · ХОД ИДЁТ</div>
              <div className="alias-flow-listen-card"><PreviewGlyph name="talk" size={62}/><small>{mode === "classic" ? "АННА ОБЪЯСНЯЕТ ВАШЕЙ КОМАНДЕ" : "АННА ОБЪЯСНЯЕТ СЛОВО"}</small><b>Угадывайте<br/>вслух!</b>{mode === "letter" && <em>БУКВА · М</em>}<div><span>00:{mode === "classic" ? "42" : "72"}</span><i /></div></div>
              <div className="alias-flow-live-score"><span><PreviewGlyph name="check" size={20}/> УГАДАНО <b>7</b></span><span><PreviewGlyph name="cross" size={20}/> ПРОПУЩЕНО <b>2</b></span></div>
              <p className="alias-flow-ready-copy">Секретное слово видно только объясняющему.</p>
            </>}

            {step === "result" && <>
              <div className="alias-flow-kicker">ХОД ЗАВЕРШЁН</div><h2>Отличная<br/>работа!</h2>
              <div className="alias-flow-result-score"><small>{mode === "classic" ? "КОМАНДА «ИСКРЫ»" : "АННА"}</small><b>+{mode === "classic" ? "5" : "7"}</b><span>ОЧКОВ ЗА ХОД</span></div>
              <div className="alias-flow-result-stats"><span><i>✓</i><b>7</b><small>УГАДАНО</small></span><span><i>×</i><b>2</b><small>ПРОПУЩЕНО</small></span></div>
              <TurnWordLedger mode={mode} />
              <button className="alias-flow-primary" type="button">СЛЕДУЮЩИЙ ХОД <span>→</span></button>
            </>}

            {step === "finished" && <>
              <div className="alias-flow-kicker">ИГРА ОКОНЧЕНА</div>
              <div className="alias-flow-winner"><PreviewGlyph name="trophy" size={58}/><small>ПОБЕДИТЕЛЬ</small><b>{mode === "classic" ? "ИСКРЫ" : "АННА"}</b><strong>{mode === "classic" ? "48" : "31"}</strong><span>ОЧКОВ</span></div>
              <div className="alias-flow-final-list">{(mode === "classic" ? [["ИСКРЫ","48"],["КОМЕТЫ","41"]] : [["АННА","31"],["МИША","27"],["ЛЕНА","24"]]).map(([name, score], index) => <article key={name}><span>{index + 1}</span><b>{name}</b><strong>{score}</strong></article>)}</div>
              <button className="alias-flow-primary" type="button">ИГРАТЬ СНОВА</button><button className="alias-flow-link" type="button">← К ВЫБОРУ РЕЖИМА</button>
            </>}
          </main>
          <footer className="alias-phone-footer"><span><i /> КАРТОЧНАЯ МАСТЕРСКАЯ</span><b>{mode === "classic" ? "ИСКРЫ 12 · 9 КОМЕТЫ" : "АННА · 12 ОЧКОВ"}</b></footer>
        </div>
      </div>
    </div>
  );
}

function WorkshopFlowTv({ step, mode, motionKey }: { step: WorkshopFlowStep; mode: AliasMode; motionKey: number }) {
  const title = workshopFlowSteps.find((item) => item.id === step)?.title ?? "";
  const teamScores = mode === "classic" ? [["ИСКРЫ", "12"], ["КОМЕТЫ", "9"]] : [["АННА", "12"], ["МИША", "10"], ["ЛЕНА", "8"], ["САША", "7"]];
  return (
    <div className="alias-preview-device-column alias-preview-tv-column">
      <DeviceLabel tv />
      <div className="alias-preview-tv-shell">
        <div key={`${step}-${mode}-${motionKey}`} className={`alias-preview-tv tv-workshop alias-flow-tv alias-flow-tv-state-${step}`}>
          <div className="alias-preview-tv-decor" aria-hidden="true">
            {Array.from({ length: 22 }, (_, index) => <i key={index} />)}
          </div>
          <header><div><PreviewGlyph name="speech" size={42}/><span><b>УГАДАЙ СЛОВО</b><small>КАРТОЧНАЯ МАСТЕРСКАЯ · {mode === "classic" ? "КЛАССИКА" : "НА БУКВУ"}</small></span></div><em>{title} · {workshopFlowSteps.find((item) => item.id === step)?.number}/08</em></header>
          <main>
            {step === "mode" && <section className="alias-flow-tv-lobby"><div className="alias-flow-tv-deck"><i/><i/><article><PreviewGlyph name="speech" size={90}/></article></div><small>СОБИРАЕМ ИГРОКОВ</small><h2>Выберите режим<br/>и начнём игру</h2><FlowAvatars names={["Анна", "Миша", "Лена", "Саша", "Олег", "Вера"]}/><p>Хост выбирает правила на своём телефоне</p></section>}
            {step === "teams" && <section className="alias-flow-tv-setup"><small>{mode === "classic" ? "РАСПРЕДЕЛЕНИЕ ПО КОМАНДАМ" : "ЛИЧНЫЙ ЗАЧЁТ"}</small><h2>{mode === "classic" ? "Выберите свою сторону" : "Порядок игроков определён"}</h2>{mode === "classic" ? <div className="alias-flow-tv-teamtables"><article><b>ИСКРЫ</b><FlowAvatars names={["Анна", "Лена", "Олег"]}/></article><article><b>КОМЕТЫ</b><FlowAvatars names={["Миша", "Саша", "Вера"]}/></article></div> : <div className="alias-flow-tv-order">{["Анна", "Миша", "Лена", "Саша", "Олег", "Вера"].map((name,index)=><article key={name}><span>0{index+1}</span><i>{name[0]}</i><b>{name}</b></article>)}</div>}<p>Все игроки готовы · можно продолжать</p></section>}
            {step === "names" && <section className="alias-flow-tv-setup"><small>{mode === "classic" ? "КОМАНДЫ ВЫБИРАЮТ НАЗВАНИЯ" : "ПРАВИЛО ЛИЧНОГО РАУНДА"}</small><h2>{mode === "classic" ? "Последний штрих" : "Объясняйте только на букву"}</h2>{mode === "classic" ? <div className="alias-flow-tv-namecards"><article><span>КОМАНДА 01</span><b>ИСКРЫ</b><small>ИМЯ ВЫБРАНО ✓</small></article><article><span>КОМАНДА 02</span><b>…</b><small>МИША ВЫБИРАЕТ ИМЯ</small></article></div> : <div className="alias-flow-tv-bigletter"><span>БУКВА ПЕРВОГО ХОДА</span><b>М</b><small>90 СЕКУНД · ПРОПУСК БЕЗ ШТРАФА</small></div>}</section>}
            {step === "ready" && <section className="alias-flow-tv-ready"><div className="alias-flow-tv-playercard"><i/><i/><article><PreviewGlyph name="mic" size={76}/><small>СЕЙЧАС ОБЪЯСНЯЕТ</small><b>АННА</b>{mode === "classic" ? <span>КОМАНДА «ИСКРЫ»</span> : <span>ЛИЧНЫЙ ХОД · БУКВА СКРЫТА</span>}</article></div><h2>Передаём ход</h2><p>Анна запускает таймер на своём телефоне</p></section>}
            {(step === "explaining" || step === "guessing") && <section className="alias-flow-tv-reference-playing"><div className="alias-tv-timer-zone"><TimerRing seconds={mode === "classic" ? 42 : 72}/><small>{mode === "classic" ? "60 СЕКУНД НА ХОД" : "90 СЕКУНД НА ХОД"}</small></div><section className="alias-tv-focus"><span>{step === "explaining" ? "СЕЙЧАС ОБЪЯСНЯЕТ" : "СЛУШАЙТЕ ОБЪЯСНЯЮЩЕГО"}</span><h2>АННА</h2>{mode === "letter" ? <div className="alias-tv-letter"><small>ОБЪЯСНЯЙТЕ НА БУКВУ</small><b>М</b></div> : <div className="alias-tv-team"><i>А</i><i>М</i><i>Л</i><span>КОМАНДА «ИСКРЫ» УГАДЫВАЕТ</span></div>}<div className="alias-tv-stats"><span><PreviewGlyph name="check" size={22}/><b>7</b><small>УГАДАНО</small></span><span><PreviewGlyph name="cross" size={22}/><b>2</b><small>ПРОПУЩЕНО</small></span></div></section><aside className="alias-tv-score-zone"><span>ТАБЛИЦА ОЧКОВ</span><Scoreboard mode={mode}/></aside></section>}
            {step === "result" && <section className="alias-flow-tv-result"><small>ВРЕМЯ ВЫШЛО</small><h2>+{mode === "classic" ? "5" : "7"}</h2><p>{mode === "classic" ? "КОМАНДА «ИСКРЫ»" : "АННА"} · ОЧКОВ ЗА ХОД</p><div><span><i>✓</i><b>7</b><small>УГАДАНО</small></span><span><i>×</i><b>2</b><small>ПРОПУЩЕНО</small></span></div><TurnWordLedger mode={mode} tv /><aside>{teamScores.map(([name,score],index)=><article className={index===0?"is-first":""} key={name}><span>0{index+1}</span><b>{name}</b><strong>{score}</strong></article>)}</aside></section>}
            {step === "finished" && <section className="alias-flow-tv-finished"><div className="alias-flow-tv-trophy"><PreviewGlyph name="trophy" size={112}/></div><small>ИГРА ОКОНЧЕНА · ПОБЕДИТЕЛЬ</small><h2>{mode === "classic" ? "ИСКРЫ" : "АННА"}</h2><strong>{mode === "classic" ? "48" : "31"} <span>ОЧКОВ</span></strong><div>{teamScores.slice(0,3).map(([name,score],index)=><article key={name}><span>{index+1}</span><b>{name}</b><strong>{index===0?(mode === "classic"?"48":"31"):score}</strong></article>)}</div></section>}
          </main>
          <footer><span>СЕКРЕТНЫЕ СЛОВА НИКОГДА НЕ ПОКАЗЫВАЮТСЯ НА TV</span><b>{step === "finished" ? "СПАСИБО ЗА ИГРУ" : mode === "classic" ? "ИСКРЫ 12 · 9 КОМЕТЫ" : "ЛИЧНЫЙ ЗАЧЁТ · 6 ИГРОКОВ"}</b></footer>
        </div>
      </div>
    </div>
  );
}

function WorkshopFullFlow({ mode, onModeChange }: { mode: AliasMode; onModeChange: (mode: AliasMode) => void }) {
  const [step, setStep] = useState<WorkshopFlowStep>("mode");
  const [motionKey, setMotionKey] = useState(0);
  return (
    <section id="workshop-full-flow" className="alias-workshop-full-flow">
      <div className="alias-flow-heading"><span>УТВЕРЖДЁННОЕ НАПРАВЛЕНИЕ · ПОЛНЫЙ СЦЕНАРИЙ</span><h2>Карточная мастерская</h2><p>Все состояния телефона и TV в реальном игровом порядке. Переключатель режима сверху меняет содержание каждого этапа.</p></div>
      <div className="alias-flow-mode-control">
        <div><span>РЕЖИМ МАКЕТОВ</span><b>Какие экраны показать?</b><small>Переключатель меняет все восемь экранов телефона и TV.</small></div>
        <ModeSwitch mode={mode} onChange={onModeChange} />
      </div>
      <nav className="alias-flow-nav">{workshopFlowSteps.map((item)=><button key={item.id} type="button" className={step===item.id?"is-active":""} onClick={()=>{setStep(item.id);setMotionKey((value)=>value+1);}}><span>{item.number}</span><b>{item.title}</b><small>{item.subtitle}</small></button>)}</nav>
      <div className="alias-flow-actions"><span><i/> {mode === "classic" ? "КЛАССИЧЕСКИЙ РЕЖИМ" : "РЕЖИМ «НА БУКВУ»"}</span><button type="button" onClick={()=>setMotionKey((value)=>value+1)}><PreviewGlyph name="shuffle" size={17}/> Повторить анимацию этапа</button></div>
      <div className="alias-preview-devices alias-flow-devices"><WorkshopFlowPhone key={`${step}-${mode}-${motionKey}`} step={step} mode={mode} motionKey={motionKey}/><WorkshopFlowTv step={step} mode={mode} motionKey={motionKey}/></div>
      <div className="alias-motion-note"><span><i/> АНИМАЦИОННАЯ СИСТЕМА</span><p>Карточки раздаются и переворачиваются, стопки сдвигаются, жетоны и очки появляются короткими сериями. Частые игровые кнопки реагируют быстро, декоративное движение отключается при `prefers-reduced-motion`.</p></div>
    </section>
  );
}

export default function AliasDesignPreviewPage() {
  const [selected, setSelected] = useState<ConceptId>("broadcast");
  const [mode, setMode] = useState<AliasMode>("classic");
  const [motionKey, setMotionKey] = useState(0);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1);
      const id = (hash === "workshop-full-flow" ? "workshop" : hash) as ConceptId;
      if (concepts.some((concept) => concept.id === id)) setSelected(id);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const selectConcept = (id: ConceptId) => {
    setSelected(id);
    window.history.replaceState(null, "", `#${id}`);
    setMotionKey((value) => value + 1);
  };

  const changeMode = (nextMode: AliasMode) => {
    setMode(nextMode);
    setMotionKey((value) => value + 1);
  };

  const current = concepts.find((concept) => concept.id === selected) ?? concepts[0];

  return (
    <div className="alias-preview-page">
      <header className="alias-preview-hero">
        <div className="alias-preview-hero-orbit" aria-hidden="true"><i /><i /><i /></div>
        <span>DESIGN EXPLORATION · ALIAS / 001</span>
        <h1>СЛОВА<br/><i>НА СКОРОСТИ</i></h1>
        <p>Четыре визуально независимых направления для телефона и TV. Оба режима равноправны, а секретное слово остаётся только на личном экране объясняющего.</p>
        <nav>{concepts.map((concept) => <button key={concept.id} type="button" className={selected === concept.id ? "is-active" : ""} onClick={() => selectConcept(concept.id)}><span>{concept.number}</span><b>{concept.name}</b><small>{concept.id === "workshop" ? "✓ ВЫБРАНО" : concept.subtitle.split(" · ")[0]}</small></button>)}</nav>
        <div className="alias-preview-only"><i /> ТОЛЬКО МАКЕТЫ · ИГРОВАЯ ЛОГИКА НЕ ИЗМЕНЕНА</div>
      </header>

      <div className="alias-preview-toolbar">
        <ModeSwitch mode={mode} onChange={changeMode} />
        <button type="button" className="alias-preview-replay" onClick={() => setMotionKey((value) => value + 1)}><PreviewGlyph name="shuffle" size={19} /> Повторить анимации</button>
      </div>

      <main>
        <ConceptStage concept={current} mode={mode} motionKey={motionKey} />
        {selected === "workshop" && <WorkshopFullFlow mode={mode} onModeChange={changeMode} />}
      </main>

      <section className="alias-preview-comparison">
        <span>БЫСТРОЕ СРАВНЕНИЕ</span>
        <h2>Четыре разные команды дизайнеров</h2>
        <div>{concepts.map((concept) => <button key={concept.id} type="button" onClick={() => selectConcept(concept.id)} style={{ "--swatch": concept.accent, "--swatch-two": concept.secondary } as CSSProperties}><i /><span><b>{concept.number} · {concept.name}</b><small>{concept.description}</small></span></button>)}</div>
      </section>

      <footer className="alias-preview-footer"><div><span>СЛЕДУЮЩИЙ ШАГ</span><b>{selected === "workshop" ? "Утвердить полный сценарий" : "Выбрать одно направление"}</b></div><p>{selected === "workshop" ? "После проверки всех восьми этапов дизайн можно будет интегрировать в production-экраны телефона и TV. Игровая логика пока не изменена." : "После выбора на этой странице появится полный сценарий всех mobile- и TV-экранов. Production-код пока остаётся без изменений."}</p></footer>

      <style jsx global>{`
        html{scroll-behavior:smooth}.alias-preview-page{--page:#09070b;min-height:100vh;overflow:hidden;padding:42px 28px 88px;background:radial-gradient(circle at 72% 0%,rgba(236,72,153,.17),transparent 27%),#09070b;color:#fff;font-family:"Avenir Next",Avenir,ui-sans-serif,sans-serif}.alias-preview-page *{box-sizing:border-box}.alias-preview-hero,.alias-preview-toolbar,.alias-concept-stage,.alias-preview-comparison,.alias-preview-footer{position:relative;width:min(1500px,100%);margin-inline:auto}.alias-preview-hero{min-height:630px;padding:54px 56px 45px;border:1px solid rgba(255,255,255,.1);background:linear-gradient(130deg,rgba(255,255,255,.055),transparent 45%),repeating-linear-gradient(90deg,transparent 0 99px,rgba(255,255,255,.02) 100px);clip-path:polygon(0 0,96% 0,100% 10%,100% 100%,4% 100%,0 90%)}.alias-preview-hero>span{color:#ff4e9d;font:850 11px/1 ui-monospace,monospace;letter-spacing:.21em}.alias-preview-hero h1{position:relative;z-index:2;margin:33px 0 22px;font-size:clamp(68px,9vw,144px);line-height:.75;letter-spacing:-.075em}.alias-preview-hero h1 i{color:transparent;-webkit-text-stroke:1.5px #ff4e9d;font-style:normal}.alias-preview-hero>p{max-width:760px;margin:0;color:rgba(255,255,255,.56);font-size:18px;line-height:1.62}.alias-preview-hero nav{position:relative;z-index:3;display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:42px}.alias-preview-hero nav button{display:grid;grid-template-columns:35px 1fr;grid-template-rows:auto auto;gap:5px 10px;min-height:76px;padding:14px 15px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.025);color:rgba(255,255,255,.65);text-align:left;cursor:pointer;transition:transform .2s ease,border-color .2s ease,background .2s ease}.alias-preview-hero nav button:hover{transform:translateY(-3px);border-color:rgba(255,78,157,.4)}.alias-preview-hero nav button.is-active{border-color:#ff4e9d;background:rgba(255,78,157,.1);color:#fff;box-shadow:inset 3px 0 #ff4e9d}.alias-preview-hero nav button>span{grid-row:1/3;color:#ff4e9d;font:800 11px/1 ui-monospace,monospace}.alias-preview-hero nav b{font-size:14px}.alias-preview-hero nav small{color:rgba(255,255,255,.35)}.alias-preview-only{margin-top:27px;color:rgba(255,255,255,.34);font:800 9px/1 ui-monospace,monospace;letter-spacing:.16em}.alias-preview-only i{display:inline-block;width:7px;height:7px;margin-right:8px;border-radius:50%;background:#ff4e9d;box-shadow:0 0 12px #ff4e9d}.alias-preview-hero-orbit{position:absolute;right:-85px;top:-160px;width:600px;height:600px;border:1px solid rgba(255,78,157,.14);border-radius:50%;animation:alias-orbit 18s linear infinite}.alias-preview-hero-orbit:before,.alias-preview-hero-orbit:after{content:"";position:absolute;border:1px solid rgba(255,78,157,.1);border-radius:50%}.alias-preview-hero-orbit:before{inset:75px}.alias-preview-hero-orbit:after{inset:160px}.alias-preview-hero-orbit i{position:absolute;width:11px;height:11px;border-radius:50%;background:#ff4e9d;box-shadow:0 0 17px #ff4e9d}.alias-preview-hero-orbit i:nth-child(1){left:36px;top:210px}.alias-preview-hero-orbit i:nth-child(2){right:105px;bottom:75px}.alias-preview-hero-orbit i:nth-child(3){left:260px;top:155px}

        .alias-preview-toolbar{z-index:20;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:22px;padding:14px 16px;border:1px solid rgba(255,255,255,.1);background:rgba(9,7,11,.88);backdrop-filter:blur(22px)}.alias-preview-mode-switch{display:grid;grid-template-columns:1fr 1fr;gap:8px;width:min(620px,100%)}.alias-preview-mode-switch button{display:flex;align-items:center;gap:11px;min-height:54px;padding:9px 15px;border:1px solid rgba(255,255,255,.09);background:transparent;color:rgba(255,255,255,.5);text-align:left;cursor:pointer}.alias-preview-mode-switch button.is-active{border-color:#ff4e9d;background:rgba(255,78,157,.1);color:#fff}.alias-preview-mode-switch button span{display:flex;flex-direction:column;gap:3px}.alias-preview-mode-switch button b{font-size:13px}.alias-preview-mode-switch button small{color:rgba(255,255,255,.35);font-size:10px}.alias-preview-replay{display:flex;align-items:center;gap:9px;min-height:48px;padding:0 17px;border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.045);color:#fff;font-weight:750;cursor:pointer;transition:.2s}.alias-preview-replay:hover{border-color:#ff4e9d;color:#ff75b4}.alias-preview-glyph{display:inline-block;flex:none;fill:none;color:currentColor}

        .alias-concept-stage{--concept-accent:#ff3f93;--concept-secondary:#c9ff4f;margin-top:54px;padding:38px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.018)}.alias-concept-stage:before{content:"";position:absolute;inset:-1px;pointer-events:none;background:linear-gradient(90deg,var(--concept-accent),transparent 42%) top left/65% 1px no-repeat}.alias-concept-copy{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:12px 50px;margin-bottom:30px}.alias-concept-copy>span{grid-column:1/3;color:var(--concept-accent);font:850 10px/1 ui-monospace,monospace;letter-spacing:.18em}.alias-concept-copy h1{margin:8px 0 0;font-size:clamp(42px,5vw,72px);line-height:.9;letter-spacing:-.055em}.alias-concept-copy p{align-self:end;margin:0;color:rgba(255,255,255,.52);font-size:15px;line-height:1.55}.alias-concept-copy>div{grid-column:2;display:flex;gap:7px;flex-wrap:wrap}.alias-concept-copy>div i{padding:6px 9px;border:1px solid color-mix(in srgb,var(--concept-accent) 24%,transparent);color:color-mix(in srgb,var(--concept-accent) 70%,white);font-size:9px;font-style:normal}.alias-preview-devices{display:grid;grid-template-columns:390px 960px;gap:30px;justify-content:center;align-items:start}.alias-preview-device-column{min-width:0}.alias-preview-phone-column{width:390px}.alias-preview-tv-column{width:960px}.alias-preview-device-label{display:flex;justify-content:space-between;margin-bottom:10px;color:rgba(255,255,255,.36);font:800 9px/1 ui-monospace,monospace;letter-spacing:.12em}.alias-preview-phone-shell{width:390px;height:844px;padding:8px;border:1px solid rgba(255,255,255,.13);border-radius:50px;background:#030205;box-shadow:0 35px 90px rgba(0,0,0,.4)}.alias-preview-phone{position:relative;width:374px;height:828px;overflow:hidden;border-radius:42px}.alias-preview-tv-shell{width:960px;height:540px;overflow:hidden;border:1px solid rgba(255,255,255,.13);background:#020103;box-shadow:0 35px 90px rgba(0,0,0,.35)}.alias-preview-tv{position:relative;width:1920px;height:1080px;overflow:hidden;transform:scale(.5);transform-origin:top left}.alias-phone-status{position:relative;z-index:5;display:flex;justify-content:space-between;height:42px;padding:16px 24px 0;font:800 10px/1 ui-monospace,monospace}.alias-phone-header{position:relative;z-index:5;display:flex;align-items:center;justify-content:space-between;height:58px;margin:0 17px;padding:0 13px;border-bottom:1px solid currentColor}.alias-phone-header>div{display:flex;align-items:center;gap:9px}.alias-phone-header span{display:flex;flex-direction:column;gap:3px}.alias-phone-header b{font-size:10px;letter-spacing:.1em}.alias-phone-header small{font:800 6px/1 ui-monospace,monospace;letter-spacing:.14em;opacity:.52}.alias-phone-header em{font:850 9px/1 ui-monospace,monospace;font-style:normal}.alias-phone-main{position:relative;z-index:3;padding:20px 18px 65px}.alias-phone-round{display:flex;align-items:end;justify-content:space-between;gap:12px}.alias-phone-round span{font:800 7px/1 ui-monospace,monospace;letter-spacing:.1em;opacity:.5}.alias-phone-round b{font-size:10px}.alias-phone-card-stack{position:relative;margin-top:15px}.alias-phone-word-card{position:relative;z-index:2;display:flex;min-height:442px;flex-direction:column;padding:20px;overflow:hidden}.alias-phone-card-meta{display:flex;align-items:center;justify-content:space-between}.alias-phone-card-meta span{font:850 8px/1 ui-monospace,monospace;letter-spacing:.13em}.alias-phone-word-card h2{position:relative;z-index:2;margin:auto 0;text-align:center;font-size:54px;line-height:.88;letter-spacing:-.05em;overflow-wrap:anywhere;animation:alias-word-in .55s cubic-bezier(.2,.9,.25,1.15) both}.alias-phone-letter{position:absolute;right:-7px;top:34px;font-size:190px;font-weight:900;line-height:1;opacity:.09}.alias-phone-guessers{display:flex;align-items:center;justify-content:space-between}.alias-phone-guessers small{font:850 7px/1 ui-monospace,monospace;letter-spacing:.12em;opacity:.55}.alias-phone-guessers>div{display:flex}.alias-phone-guessers i{display:grid;width:28px;height:28px;margin-left:-6px;place-items:center;border:1px solid currentColor;border-radius:50%;font-style:normal;font-size:9px}.alias-phone-timebar{position:relative;display:flex;align-items:center;gap:10px;height:25px;margin-top:10px}.alias-phone-timebar:before{content:"";height:4px;flex:1;background:rgba(255,255,255,.1)}.alias-phone-timebar i{position:absolute;width:54%;height:4px;background:currentColor;animation:alias-timebar 7s linear infinite}.alias-phone-timebar span{font:850 9px/1 ui-monospace,monospace}.alias-phone-actions{display:grid;grid-template-columns:1fr 1.08fr;gap:9px;margin-top:10px}.alias-phone-actions button{display:flex;align-items:center;justify-content:center;gap:8px;min-height:63px;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer;transition:transform .13s ease,filter .13s ease}.alias-phone-actions button:active{transform:scale(.96)}.alias-phone-actions button span{display:flex;flex-direction:column;gap:4px;text-align:left}.alias-phone-actions b{font-size:10px}.alias-phone-actions small{font:800 6px/1 ui-monospace,monospace;opacity:.55}.alias-phone-footer{position:absolute;z-index:5;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:space-between;height:48px;padding:0 21px;font:800 7px/1 ui-monospace,monospace;letter-spacing:.1em}.alias-phone-footer span{display:flex;align-items:center;gap:6px}.alias-phone-footer i,.alias-tv-live i{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor;animation:alias-live 1.25s ease-in-out infinite}

        .alias-tv-header{position:relative;z-index:5;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;height:126px;padding:0 68px;border-bottom:1px solid currentColor}.alias-tv-brand{display:flex;align-items:center;gap:16px}.alias-tv-brand span{display:flex;flex-direction:column;gap:6px}.alias-tv-brand b{font-size:24px;letter-spacing:.04em}.alias-tv-brand small,.alias-tv-round span{font:800 9px/1 ui-monospace,monospace;letter-spacing:.16em;opacity:.45}.alias-tv-round{text-align:center}.alias-tv-round span,.alias-tv-round b{display:block}.alias-tv-round b{margin-top:8px;font-size:20px}.alias-tv-live{justify-self:end;display:flex;align-items:center;gap:10px;font:850 9px/1 ui-monospace,monospace;letter-spacing:.15em}.alias-tv-main{position:relative;z-index:3;display:grid;grid-template-columns:400px 1fr 430px;gap:55px;align-items:center;height:894px;padding:65px 75px}.alias-tv-timer-zone{text-align:center}.alias-preview-timer{position:relative;width:300px;height:300px;margin:auto}.alias-preview-timer svg{width:100%;height:100%;transform:rotate(-90deg)}.alias-preview-timer circle{fill:none;stroke:currentColor;stroke-width:9;opacity:.1}.alias-preview-timer circle.progress{opacity:1;stroke-dasharray:478;stroke-dashoffset:118;stroke-linecap:round;filter:drop-shadow(0 0 8px currentColor);animation:alias-ring 7s linear infinite}.alias-preview-timer b,.alias-preview-timer span{position:absolute;left:0;right:0;text-align:center}.alias-preview-timer b{top:103px;font:900 70px/1 ui-monospace,monospace}.alias-preview-timer span{top:180px;font:850 9px/1 ui-monospace,monospace;letter-spacing:.16em;opacity:.4}.alias-tv-timer-zone>small{font:800 8px/1 ui-monospace,monospace;letter-spacing:.14em;opacity:.35}.alias-tv-focus{text-align:center}.alias-tv-focus>span,.alias-tv-score-zone>span{font:850 10px/1 ui-monospace,monospace;letter-spacing:.18em;opacity:.45}.alias-tv-focus h2{margin:20px 0 22px;font-size:104px;line-height:.78;letter-spacing:-.065em;animation:alias-name-in .55s cubic-bezier(.2,.9,.25,1.1) both}.alias-tv-team{display:flex;align-items:center;justify-content:center}.alias-tv-team i{display:grid;width:52px;height:52px;margin-left:-7px;place-items:center;border:1px solid currentColor;border-radius:50%;font-style:normal;font-weight:850}.alias-tv-team span{margin-left:18px;font-size:13px;font-weight:800}.alias-tv-letter{display:flex;align-items:center;justify-content:center;gap:22px}.alias-tv-letter small{font:850 9px/1.4 ui-monospace,monospace;letter-spacing:.16em}.alias-tv-letter b{font-size:100px;line-height:.7}.alias-tv-stats{display:flex;justify-content:center;gap:12px;margin-top:38px}.alias-tv-stats>span{display:grid;grid-template-columns:34px auto;grid-template-rows:auto auto;gap:2px 8px;align-items:center;min-width:150px;padding:12px 17px;border:1px solid currentColor;text-align:left}.alias-tv-stats .alias-preview-glyph{grid-row:1/3}.alias-tv-stats b{font:900 25px/1 ui-monospace,monospace}.alias-tv-stats small{font:800 7px/1 ui-monospace,monospace;letter-spacing:.1em;opacity:.45}.alias-tv-score-zone{align-self:stretch;display:flex;flex-direction:column;justify-content:center}.alias-tv-scoreboard{display:flex;flex-direction:column;gap:9px;margin-top:18px}.alias-tv-scoreboard>div{display:grid;grid-template-columns:32px 1fr auto;gap:14px;align-items:center;padding:15px 17px;border:1px solid currentColor;opacity:.46}.alias-tv-scoreboard>div.is-leading{opacity:1}.alias-tv-scoreboard span{font:800 8px/1 ui-monospace,monospace}.alias-tv-scoreboard b{font-size:14px}.alias-tv-scoreboard strong{font:900 26px/1 ui-monospace,monospace}.alias-tv-footer{position:absolute;z-index:5;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:space-between;height:60px;padding:0 68px;border-top:1px solid currentColor;font:800 8px/1 ui-monospace,monospace;letter-spacing:.13em;opacity:.65}.alias-preview-decor,.alias-preview-tv-decor{position:absolute;inset:0;pointer-events:none}.alias-preview-decor i,.alias-preview-tv-decor i{position:absolute}

        .phone-broadcast,.tv-broadcast{background:radial-gradient(circle at 50% 35%,rgba(255,63,147,.16),transparent 35%),#090812;color:#ff4f9c;font-family:"Avenir Next",Avenir,sans-serif}.phone-broadcast{color:#ff60aa}.phone-broadcast .alias-phone-header{border-color:rgba(255,63,147,.25)}.phone-broadcast .alias-phone-word-card{border:1px solid rgba(255,63,147,.27);background:linear-gradient(145deg,rgba(255,63,147,.11),rgba(8,7,16,.86));clip-path:polygon(0 0,95% 0,100% 5%,100% 100%,5% 100%,0 95%)}.phone-broadcast .alias-phone-word-card h2{color:#fff;text-shadow:0 0 34px rgba(255,63,147,.45)}.phone-broadcast .alias-phone-actions button:last-child{border-color:#c9ff4f;background:#c9ff4f;color:#11170a}.phone-broadcast .alias-phone-footer,.tv-broadcast .alias-tv-footer{background:rgba(255,63,147,.07);border-color:rgba(255,63,147,.22)}.phone-broadcast .alias-preview-decor:before,.tv-broadcast .alias-preview-tv-decor:before{content:"";position:absolute;top:-50%;left:36%;width:18%;height:200%;background:linear-gradient(90deg,transparent,rgba(255,63,147,.07),transparent);transform:rotate(16deg);animation:alias-beam 5s ease-in-out infinite alternate}.tv-broadcast .alias-tv-header{border-color:rgba(255,63,147,.25)}.tv-broadcast .alias-tv-focus h2{color:#fff;text-shadow:0 0 36px rgba(255,63,147,.35)}.tv-broadcast .alias-tv-team i,.tv-broadcast .alias-tv-scoreboard>div,.tv-broadcast .alias-tv-stats>span{border-color:rgba(255,63,147,.3)}.tv-broadcast .alias-tv-scoreboard>div.is-leading{background:rgba(255,63,147,.12);box-shadow:inset 4px 0 #ff3f93}.tv-broadcast .alias-tv-stats>span:last-child{color:#c9ff4f}.tv-broadcast .alias-preview-timer{color:#ff3f93}

        .concept-editorial{background:#e7e0d4;color:#15120e;border-color:#cfc4b2}.concept-editorial:before{background:linear-gradient(90deg,#d81767,transparent 55%) top left/65% 2px no-repeat}.concept-editorial .alias-concept-copy>span,.concept-editorial .alias-concept-copy p{color:#675f55}.concept-editorial .alias-concept-copy h1{font-family:Georgia,"Times New Roman",serif;font-weight:500}.concept-editorial .alias-concept-copy>div i{border-color:#b9ac98;color:#7b173f}.concept-editorial .alias-preview-device-label{color:#665f57}.phone-editorial,.tv-editorial{background:#f4efe5;color:#15120e;font-family:Georgia,"Times New Roman",serif}.phone-editorial:before,.tv-editorial:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 62px,rgba(17,16,14,.035) 63px);pointer-events:none}.phone-editorial .alias-phone-header{border-color:#18140f}.phone-editorial .alias-phone-word-card{border-block:3px solid #15120e;background:#ede4d5}.phone-editorial .alias-phone-card-meta{color:#d81767}.phone-editorial .alias-phone-word-card h2{font-weight:500;color:#d81767;text-align:left;font-size:58px;transform:rotate(-2deg)}.phone-editorial .alias-phone-letter{color:#d81767}.phone-editorial .alias-phone-guessers i{border-radius:0;background:#15120e;color:#fff}.phone-editorial .alias-phone-timebar:before{background:rgba(17,16,14,.15)}.phone-editorial .alias-phone-actions button{font-family:"Avenir Next",sans-serif}.phone-editorial .alias-phone-actions button:first-child{border-color:#15120e}.phone-editorial .alias-phone-actions button:last-child{border-color:#d81767;background:#d81767;color:#fff}.phone-editorial .alias-phone-footer{background:#15120e;color:#f4efe5}.tv-editorial .alias-tv-header{height:150px;border-color:#15120e}.tv-editorial .alias-tv-main{grid-template-columns:320px 1fr 510px;height:870px;padding:45px 90px}.tv-editorial .alias-tv-focus{text-align:left}.tv-editorial .alias-tv-focus>span{color:#d81767;opacity:1}.tv-editorial .alias-tv-focus h2{font-size:150px;font-weight:500;color:#d81767;text-align:left}.tv-editorial .alias-tv-team,.tv-editorial .alias-tv-letter{justify-content:flex-start}.tv-editorial .alias-tv-team i{border-radius:0;background:#15120e;color:#fff}.tv-editorial .alias-tv-stats{justify-content:flex-start}.tv-editorial .alias-tv-stats>span,.tv-editorial .alias-tv-scoreboard>div{border-color:#afa391}.tv-editorial .alias-tv-scoreboard>div.is-leading{background:#d81767;color:#fff}.tv-editorial .alias-preview-timer{width:245px;height:245px;color:#d81767}.tv-editorial .alias-preview-timer b{top:82px}.tv-editorial .alias-preview-timer span{top:150px}.tv-editorial .alias-tv-footer{background:#15120e;color:#f4efe5;border-color:#15120e;opacity:1}.tv-editorial .alias-preview-tv-decor i:nth-child(-n+6){top:165px;width:140px;height:12px;background:#d81767;opacity:.12;animation:alias-type-strip 4s ease-in-out infinite alternate}.tv-editorial .alias-preview-tv-decor i:nth-child(1){left:40px}.tv-editorial .alias-preview-tv-decor i:nth-child(2){left:210px;animation-delay:.3s}.tv-editorial .alias-preview-tv-decor i:nth-child(3){right:30px;animation-delay:.6s}

        .concept-arcade{background:linear-gradient(180deg,#08091e,#050615);border-color:#262865}.concept-arcade .alias-concept-copy h1{font-family:ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:-.08em}.phone-arcade,.tv-arcade{background:linear-gradient(180deg,#0a0c2e,#040517);color:#33f4ff;font-family:ui-monospace,Menlo,monospace}.phone-arcade:after,.tv-arcade:after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(51,244,255,.025) 4px)}.phone-arcade .alias-phone-header{border-color:#33f4ff;box-shadow:0 2px 0 #ff2ca8}.phone-arcade .alias-phone-word-card{border:2px solid #33f4ff;background:rgba(51,244,255,.035);box-shadow:inset 0 0 35px rgba(51,244,255,.06),0 0 18px rgba(51,244,255,.08);clip-path:polygon(0 0,92% 0,100% 7%,100% 100%,8% 100%,0 93%)}.phone-arcade .alias-phone-word-card h2{color:#fff;text-shadow:4px 4px #ff2ca8}.phone-arcade .alias-phone-letter{color:#ff2ca8;opacity:.18}.phone-arcade .alias-phone-guessers i{border-radius:4px;border-color:#ff2ca8;color:#ff2ca8}.phone-arcade .alias-phone-actions button:first-child{border-color:#ff2ca8;color:#ff86cf}.phone-arcade .alias-phone-actions button:last-child{border-color:#33f4ff;background:#33f4ff;color:#041217;box-shadow:0 0 22px rgba(51,244,255,.35)}.phone-arcade .alias-phone-footer,.tv-arcade .alias-tv-footer{background:#ff2ca8;color:#08091e;border:0;opacity:1}.tv-arcade .alias-tv-header{border-color:#33f4ff;box-shadow:0 3px 0 #ff2ca8}.tv-arcade .alias-tv-main{grid-template-columns:360px 1fr 430px}.tv-arcade .alias-tv-focus h2{color:#fff;text-shadow:7px 7px #ff2ca8}.tv-arcade .alias-tv-team i,.tv-arcade .alias-tv-stats>span,.tv-arcade .alias-tv-scoreboard>div{border-radius:6px;border-color:#33f4ff}.tv-arcade .alias-tv-scoreboard>div.is-leading{background:#ff2ca8;color:#09091f;border-color:#ff2ca8;box-shadow:0 0 24px rgba(255,44,168,.28)}.tv-arcade .alias-tv-stats>span:first-child{background:#33f4ff;color:#07151a}.tv-arcade .alias-preview-timer{color:#33f4ff}.tv-arcade .alias-preview-tv-decor i{width:7px;height:7px;background:#ff2ca8;box-shadow:0 0 10px #ff2ca8;animation:alias-pixel-float 3.5s ease-in-out infinite}.tv-arcade .alias-preview-tv-decor i:nth-child(3n){background:#33f4ff}.tv-arcade .alias-preview-tv-decor i:nth-child(1){left:12%;top:23%}.tv-arcade .alias-preview-tv-decor i:nth-child(2){left:34%;top:18%;animation-delay:.6s}.tv-arcade .alias-preview-tv-decor i:nth-child(3){right:14%;top:31%;animation-delay:1.1s}.tv-arcade .alias-preview-tv-decor i:nth-child(4){left:18%;bottom:19%;animation-delay:1.6s}.tv-arcade .alias-preview-tv-decor i:nth-child(5){right:28%;bottom:16%;animation-delay:2s}

        .concept-workshop{background:#3a1825;border-color:#744052}.concept-workshop .alias-concept-copy h1{font-family:"Trebuchet MS","Avenir Next",sans-serif;letter-spacing:-.045em}.phone-workshop,.tv-workshop{background:radial-gradient(circle at 50% 10%,#7c2948,#431425 58%,#30101b);color:#fff4e8;font-family:"Trebuchet MS","Avenir Next",sans-serif}.phone-workshop .alias-phone-header{border-color:#ffb49c}.phone-workshop .alias-phone-under-card{position:absolute;inset:0;display:block;border:1px solid #eadfce;border-radius:18px;background:#fff0d8;box-shadow:0 10px 22px rgba(36,7,18,.18);pointer-events:none}.phone-workshop .alias-phone-under-card-back{z-index:0;transform:translate(14px,16px) rotate(1.2deg)}.phone-workshop .alias-phone-under-card-middle{z-index:1;transform:translate(7px,8px) rotate(.35deg)}.phone-workshop .alias-phone-word-card{transform:rotate(-1deg);border:0;border-radius:18px;background:#fff0d8;color:#321520;box-shadow:0 12px 26px rgba(36,7,18,.24);will-change:transform,opacity;animation:alias-workshop-card-in .32s cubic-bezier(.2,.9,.25,1.08) both}.phone-workshop .alias-phone-word-card.is-exiting-left{animation:alias-workshop-card-left .36s cubic-bezier(.55,.02,.78,.2) forwards}.phone-workshop .alias-phone-word-card.is-exiting-right{animation:alias-workshop-card-right .36s cubic-bezier(.55,.02,.78,.2) forwards}.phone-workshop .alias-phone-word-card:before,.tv-workshop .alias-tv-focus:before{content:"";position:absolute;inset:12px;border:1px dashed rgba(49,20,31,.25);border-radius:12px}.phone-workshop .alias-phone-card-meta{color:#a52557}.phone-workshop .alias-phone-word-card h2{color:#3b1422;font-size:51px}.phone-workshop .alias-phone-letter{color:#d92f72}.phone-workshop .alias-phone-guessers{color:#5c2b39}.phone-workshop .alias-phone-guessers i{background:#d92f72;color:#fff;border:0}.phone-workshop .alias-phone-actions button{border-radius:14px}.phone-workshop .alias-phone-actions button:disabled{cursor:default;filter:saturate(.7);opacity:.72}.phone-workshop .alias-phone-actions button:first-child{border-color:#ffb49c}.phone-workshop .alias-phone-actions button:last-child{border-color:#ff7b54;background:#ff7b54;color:#3b1422;box-shadow:0 6px 0 #a92d31}.phone-workshop .alias-phone-footer,.tv-workshop .alias-tv-footer{background:#2c0c18;border-color:#ffb49c}.tv-workshop .alias-tv-header{border-color:#ffb49c}.tv-workshop .alias-tv-main{grid-template-columns:360px 1fr 470px}.tv-workshop .alias-tv-timer-zone{transform:rotate(-2deg);padding:35px 15px;border-radius:20px;background:#fff0d8;color:#3b1422;box-shadow:12px 14px 0 #d92f72}.tv-workshop .alias-tv-focus{position:relative;padding:60px 40px;border-radius:24px;background:#fff0d8;color:#3b1422;box-shadow:12px 14px 0 #ff7b54;transform:rotate(1deg);animation:alias-card-settle .65s cubic-bezier(.2,.9,.3,1.15) both}.tv-workshop .alias-tv-focus h2{color:#d92f72}.tv-workshop .alias-tv-team i{background:#d92f72;color:#fff;border:0}.tv-workshop .alias-tv-stats>span,.tv-workshop .alias-tv-scoreboard>div{border-radius:13px;border-color:#ffb49c;background:rgba(255,240,216,.07)}.tv-workshop .alias-tv-scoreboard>div.is-leading{background:#fff0d8;color:#3b1422}.tv-workshop .alias-preview-timer{color:#d92f72}.tv-workshop .alias-preview-tv-decor i{width:28px;height:38px;border-radius:4px;background:#ff7b54;opacity:.55;animation:alias-confetti 4s ease-in-out infinite}.tv-workshop .alias-preview-tv-decor i:nth-child(2n){width:18px;height:18px;border-radius:50%;background:#d92f72}.tv-workshop .alias-preview-tv-decor i:nth-child(1){left:5%;top:18%;transform:rotate(24deg)}.tv-workshop .alias-preview-tv-decor i:nth-child(2){right:6%;top:24%;animation-delay:.8s}.tv-workshop .alias-preview-tv-decor i:nth-child(3){left:8%;bottom:17%;animation-delay:1.4s}.tv-workshop .alias-preview-tv-decor i:nth-child(4){right:12%;bottom:12%;animation-delay:2s}

        .alias-flow-jump{display:flex;align-items:center;justify-content:center;gap:12px;width:min(430px,100%);min-height:54px;margin:24px auto 0;border:1px solid #ffb49c;border-radius:13px;background:#fff0d8;color:#3b1422;text-decoration:none;font-size:12px;font-weight:900;box-shadow:6px 7px 0 #d92f72;transition:transform .18s cubic-bezier(.2,.8,.2,1)}.alias-flow-jump:hover{transform:translateY(-2px)}.alias-flow-jump span{font-size:18px}.alias-workshop-full-flow{--concept-accent:#d92f72;position:relative;width:min(1500px,100%);margin:70px auto 0;padding:38px;border:1px solid #744052;background:linear-gradient(155deg,#451725,#2f101b 64%,#230b14);overflow:hidden}.alias-workshop-full-flow:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 119px,rgba(255,240,216,.018) 120px);pointer-events:none}.alias-flow-heading{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:10px 50px}.alias-flow-heading>span{grid-column:1/3;color:#ff8bac;font:850 10px/1 ui-monospace,monospace;letter-spacing:.18em}.alias-flow-heading h2{margin:12px 0 0;font:800 clamp(46px,6vw,82px)/.9 "Trebuchet MS",sans-serif;letter-spacing:-.055em}.alias-flow-heading p{align-self:end;margin:0;color:rgba(255,244,232,.58);line-height:1.55}.alias-flow-nav{position:relative;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:30px}.alias-flow-nav button{display:grid;grid-template-columns:30px 1fr;grid-template-rows:auto auto;gap:4px 8px;min-height:66px;padding:12px;border:1px solid rgba(255,240,216,.12);background:rgba(255,240,216,.035);color:rgba(255,244,232,.55);text-align:left;cursor:pointer;transition:transform .18s cubic-bezier(.2,.8,.2,1),background .18s,border-color .18s}.alias-flow-nav button:hover{transform:translateY(-2px);border-color:#d92f72}.alias-flow-nav button.is-active{border-color:#ff8bac;background:#fff0d8;color:#3b1422;box-shadow:5px 6px 0 #d92f72}.alias-flow-nav button span{grid-row:1/3;color:#ff6f9b;font:850 10px/1 ui-monospace,monospace}.alias-flow-nav button b{font-size:12px}.alias-flow-nav button small{font-size:8px;opacity:.62}.alias-flow-actions{position:relative;display:flex;align-items:center;justify-content:space-between;margin:20px 0 14px;padding:10px 14px;border-block:1px solid rgba(255,240,216,.1);color:#ffb49c;font:800 8px/1 ui-monospace,monospace;letter-spacing:.12em}.alias-flow-actions>span{display:flex;align-items:center;gap:8px}.alias-flow-actions>span i{width:7px;height:7px;border-radius:50%;background:#ff7b54;box-shadow:0 0 12px #ff7b54}.alias-flow-actions button{display:flex;align-items:center;gap:8px;border:0;background:transparent;color:#fff4e8;font-weight:800;cursor:pointer}.alias-flow-devices{position:relative}.alias-flow-phone-shell{background:#200912}.alias-flow-phone{background:radial-gradient(circle at 50% 5%,#7c2948,#431425 55%,#2c0c18);color:#fff4e8;font-family:"Trebuchet MS","Avenir Next",sans-serif;animation:alias-flow-enter .4s cubic-bezier(.2,.9,.25,1.05) both}.alias-flow-phone .alias-phone-header{border-color:rgba(255,180,156,.5)}.alias-flow-phone-main{height:680px;padding:18px 18px 58px;overflow:hidden}.alias-flow-kicker{color:#ffb49c;font:850 7px/1 ui-monospace,monospace;letter-spacing:.14em}.alias-flow-phone-main>h2{margin:13px 0 18px;font-size:44px;line-height:.84;letter-spacing:-.05em}.alias-flow-primary,.alias-flow-secondary,.alias-flow-link{width:100%;border:0;font-family:inherit;cursor:pointer}.alias-flow-primary{display:flex;align-items:center;justify-content:center;gap:12px;min-height:55px;margin-top:12px;border-radius:13px;background:#ff7b54;color:#3b1422;box-shadow:0 6px 0 #a92d31;font-size:12px;font-weight:900}.alias-flow-primary.is-tall{min-height:82px;margin-top:22px;font-size:18px}.alias-flow-primary span{font-size:18px}.alias-flow-secondary{display:flex;align-items:center;justify-content:center;gap:7px;min-height:43px;margin-top:10px;border:1px solid #ffb49c;border-radius:12px;background:transparent;color:#fff4e8;font-size:8px;font-weight:900}.alias-flow-link{margin-top:10px;background:none;color:#ffb49c;font-size:8px;font-weight:800}.alias-flow-mode-cards{display:flex;flex-direction:column;gap:9px}.alias-flow-mode-cards article{display:grid;grid-template-columns:38px 1fr 24px;align-items:center;gap:10px;padding:14px;border:1px solid #d4c5b1;border-radius:14px;background:#fff0d8;color:#3b1422;box-shadow:4px 5px 0 rgba(255,240,216,.3);transform:rotate(.5deg);animation:alias-card-deal .46s cubic-bezier(.2,.9,.25,1.1) both}.alias-flow-mode-cards article:nth-child(2){animation-delay:.08s;transform:rotate(-.7deg)}.alias-flow-mode-cards article.is-selected{border:2px solid #d92f72;box-shadow:5px 6px 0 #d92f72}.alias-flow-mode-cards article span{display:flex;flex-direction:column}.alias-flow-mode-cards article b{font-size:15px}.alias-flow-mode-cards article small{font-size:8px;opacity:.58}.alias-flow-mode-cards article>i{display:grid;width:22px;height:22px;place-items:center;border-radius:50%;background:#d92f72;color:white;font-style:normal;font-weight:900}.alias-flow-avatars{display:flex;justify-content:center;gap:15px}.alias-flow-avatars>span{display:flex;align-items:center;gap:7px}.alias-flow-avatars i{display:grid;width:42px;height:42px;place-items:center;border:2px solid #fff0d8;border-radius:50%;background:#d92f72;color:#fff;font-style:normal;font-weight:900}.alias-flow-avatars b{font-size:13px}.alias-flow-avatars.is-compact{justify-content:flex-start;gap:0;margin-top:15px}.alias-flow-avatars.is-compact>span{margin-right:-7px}.alias-flow-avatars.is-compact i{width:30px;height:30px;border-width:1px;font-size:9px}.alias-flow-avatars.is-compact b{display:none}.alias-flow-mode-cards+.alias-flow-avatars{margin-top:20px}.alias-flow-team-pick{display:grid;grid-template-columns:1fr 1fr;gap:9px}.alias-flow-team-pick>article{min-height:236px;padding:16px;border:1px solid #e8dac6;border-radius:15px;background:#fff0d8;color:#3b1422;box-shadow:5px 6px 0 rgba(255,240,216,.25);animation:alias-card-deal .4s cubic-bezier(.2,.9,.25,1.05) both}.alias-flow-team-pick>article:nth-child(2){animation-delay:.08s}.alias-flow-team-pick>article.is-active{box-shadow:5px 6px 0 #d92f72}.alias-flow-team-pick small,.alias-flow-team-pick b{display:block}.alias-flow-team-pick small{color:#a52557;font:800 7px/1 ui-monospace,monospace}.alias-flow-team-pick b{margin-top:12px;font-size:21px}.alias-flow-team-pick em{display:block;margin-top:18px;color:#a52557;font-size:8px;font-style:normal;font-weight:800}.alias-flow-player-list{display:flex;flex-direction:column;gap:6px}.alias-flow-player-list article{display:grid;grid-template-columns:24px 38px 1fr auto;align-items:center;gap:8px;padding:8px 11px;border-radius:10px;background:#fff0d8;color:#3b1422;animation:alias-chip-in .3s both;animation-delay:calc(var(--i,0)*.04s)}.alias-flow-player-list article>span{color:#a52557;font:800 8px ui-monospace,monospace}.alias-flow-player-list article>i{display:grid;width:30px;height:30px;place-items:center;border-radius:50%;background:#d92f72;color:#fff;font-style:normal;font-size:9px}.alias-flow-player-list article b{font-size:12px}.alias-flow-player-list article small{color:#a52557;font:800 7px ui-monospace,monospace}.alias-flow-name-card{position:relative;display:flex;height:180px;flex-direction:column;justify-content:center;padding:20px;border-radius:18px;background:#fff0d8;color:#3b1422;box-shadow:7px 8px 0 #d92f72;transform:rotate(-1deg);animation:alias-card-flip .5s cubic-bezier(.2,.9,.25,1.05) both}.alias-flow-name-card small{color:#a52557;font:800 8px ui-monospace,monospace}.alias-flow-name-card b{font-size:42px}.alias-flow-name-card i{width:100%;height:2px;background:#d92f72}.alias-flow-suggestions{display:flex;gap:6px;margin-top:16px}.alias-flow-suggestions span{padding:7px 8px;border:1px solid #ffb49c;border-radius:99px;font-size:7px;font-weight:800}.alias-flow-other-team{display:flex;align-items:center;justify-content:space-between;margin-top:17px;padding:12px;border:1px solid rgba(255,240,216,.2);border-radius:12px}.alias-flow-other-team span{font-size:7px;color:#ffb49c}.alias-flow-other-team b{font-size:9px}.alias-flow-other-team i{width:12px;height:12px;border:2px solid #ff7b54;border-top-color:transparent;border-radius:50%;animation:alias-spin 1s linear infinite}.alias-flow-letter-rule{display:flex;height:285px;flex-direction:column;align-items:center;justify-content:center;border-radius:20px;background:#fff0d8;color:#3b1422;box-shadow:8px 9px 0 #d92f72;transform:rotate(-1deg);animation:alias-card-flip .5s both}.alias-flow-letter-rule small{width:190px;text-align:center;color:#a52557;font:800 8px/1.4 ui-monospace,monospace}.alias-flow-letter-rule b{font-size:130px;line-height:.9;color:#d92f72}.alias-flow-letter-rule span{font-size:9px}.alias-flow-rule-note{display:flex;align-items:center;gap:13px;margin-top:19px;padding:14px;border:1px solid #ffb49c;border-radius:13px}.alias-flow-rule-note span{display:flex;flex-direction:column}.alias-flow-rule-note b{font-size:13px}.alias-flow-rule-note small{font-size:8px;color:#ffb49c}.alias-flow-ready-deck{position:relative;height:350px;margin-top:20px}.alias-flow-ready-deck>i,.alias-flow-active-stack>i{position:absolute;inset:14px 5px 0;border-radius:20px;background:#fff0d8}.alias-flow-ready-deck>i:first-child,.alias-flow-active-stack>i:first-child{transform:translate(11px,13px) rotate(2deg);opacity:.7}.alias-flow-ready-deck>i:nth-child(2),.alias-flow-active-stack>i:nth-child(2){transform:translate(5px,6px) rotate(.7deg);opacity:.9}.alias-flow-ready-deck article{position:absolute;z-index:2;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:20px;background:#fff0d8;color:#3b1422;box-shadow:0 16px 30px rgba(28,4,12,.25);animation:alias-card-flip .55s both}.alias-flow-ready-deck article small{margin-top:20px;color:#a52557;font:800 8px ui-monospace,monospace}.alias-flow-ready-deck article b{font-size:46px}.alias-flow-ready-deck article em{margin-top:20px;font-size:7px;font-style:normal;color:#a52557}.alias-flow-ready-copy{margin:18px auto 0;max-width:280px;text-align:center;color:#ffcfbd;font-size:10px;line-height:1.5}.alias-flow-roundline{display:flex;justify-content:space-between;color:#ffcfbd;font:800 8px ui-monospace,monospace}.alias-flow-roundline b{font-size:19px;color:#fff}.alias-flow-mini-progress{height:4px;margin-top:7px;background:rgba(255,255,255,.12)}.alias-flow-mini-progress i{display:block;width:68%;height:100%;background:#ff7b54;animation:alias-flow-progress 7s linear infinite}.alias-flow-active-stack{position:relative;height:440px;margin-top:14px}.alias-flow-active-stack>i{inset:10px 3px 0}.alias-flow-active-stack article{position:absolute;z-index:2;inset:0;display:flex;flex-direction:column;padding:20px;border-radius:18px;background:#fff0d8;color:#3b1422;box-shadow:0 14px 30px rgba(28,4,12,.25);animation:alias-workshop-card-in .32s both}.alias-flow-active-stack article>small{color:#a52557;font:800 8px ui-monospace,monospace}.alias-flow-active-stack article>em{position:absolute;right:18px;top:12px;color:#d92f72;font:900 90px/1 sans-serif;font-style:normal;opacity:.1}.alias-flow-active-stack article>b{margin:auto;text-align:center;font-size:47px}.alias-flow-action-row{display:grid;grid-template-columns:1fr 1.08fr;gap:8px;margin-top:11px}.alias-flow-action-row button{display:flex;min-height:60px;align-items:center;justify-content:center;gap:8px;border:1px solid #ffb49c;border-radius:13px;background:transparent;color:#fff4e8}.alias-flow-action-row button:last-child{border:0;background:#ff7b54;color:#3b1422;box-shadow:0 5px 0 #a92d31}.alias-flow-action-row button span{display:flex;flex-direction:column;text-align:left}.alias-flow-action-row button b{font-size:9px}.alias-flow-action-row button small{font-size:6px;opacity:.7}.alias-flow-listen-card{display:flex;min-height:430px;margin-top:20px;flex-direction:column;align-items:center;justify-content:center;padding:28px;border-radius:22px;background:#fff0d8;color:#3b1422;box-shadow:8px 9px 0 #d92f72;animation:alias-card-flip .5s both}.alias-flow-listen-card>small{margin-top:22px;color:#a52557;font:800 7px/1.4 ui-monospace,monospace;text-align:center}.alias-flow-listen-card>b{margin-top:10px;text-align:center;font-size:38px;line-height:.9}.alias-flow-listen-card>em{margin-top:18px;padding:7px 13px;border-radius:99px;background:#d92f72;color:#fff;font-style:normal;font-weight:900}.alias-flow-listen-card>div{width:100%;margin-top:30px}.alias-flow-listen-card>div span{font:900 17px ui-monospace,monospace}.alias-flow-listen-card>div i{display:block;height:4px;margin-top:6px;background:#d92f72;animation:alias-flow-progress 7s linear infinite}.alias-flow-live-score{display:flex;justify-content:center;gap:8px;margin-top:15px}.alias-flow-live-score span{display:flex;align-items:center;gap:5px;padding:9px;border:1px solid #ffb49c;border-radius:11px;font:800 7px ui-monospace,monospace}.alias-flow-live-score b{font-size:15px}.alias-flow-result-score{display:flex;height:175px;flex-direction:column;align-items:center;justify-content:center;border-radius:18px;background:#fff0d8;color:#3b1422;box-shadow:7px 8px 0 #d92f72;animation:alias-score-pop .48s cubic-bezier(.2,.9,.25,1.2) both}.alias-flow-result-score small{color:#a52557;font:800 8px ui-monospace,monospace}.alias-flow-result-score b{font-size:72px;line-height:.9;color:#d92f72}.alias-flow-result-score span{font-size:8px}.alias-flow-result-stats{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.alias-flow-result-stats>span{display:grid;grid-template-columns:28px 1fr;grid-template-rows:auto auto;padding:11px;border:1px solid #ffb49c;border-radius:12px}.alias-flow-result-stats i{grid-row:1/3;font-style:normal}.alias-flow-result-stats b{font-size:20px}.alias-flow-result-stats small{font-size:7px}.alias-flow-word-history{display:flex;gap:5px;margin-top:10px;overflow:hidden}.alias-flow-word-history span{padding:6px;border-radius:6px;background:rgba(255,240,216,.09);font-size:7px}.alias-flow-winner{display:flex;height:270px;flex-direction:column;align-items:center;justify-content:center;margin-top:18px;border-radius:22px;background:#fff0d8;color:#3b1422;box-shadow:9px 10px 0 #d92f72;animation:alias-trophy-rise .6s cubic-bezier(.2,.9,.25,1.12) both}.alias-flow-winner small{margin-top:8px;color:#a52557;font:800 7px ui-monospace,monospace}.alias-flow-winner b{font-size:36px}.alias-flow-winner strong{font-size:58px;line-height:.9;color:#d92f72}.alias-flow-winner span{font-size:7px}.alias-flow-final-list{display:flex;flex-direction:column;gap:5px;margin-top:16px}.alias-flow-final-list article{display:grid;grid-template-columns:24px 1fr auto;padding:8px 11px;border-bottom:1px solid rgba(255,240,216,.16)}.alias-flow-final-list article span{color:#ffb49c;font:800 8px ui-monospace,monospace}.alias-flow-final-list article b{font-size:11px}.alias-flow-final-list article strong{font-size:15px;color:#ffb49c}

        .alias-flow-tv{background:radial-gradient(circle at 50% 0,#7f2b4a,#451525 55%,#2b0c18);color:#fff4e8;font-family:"Trebuchet MS","Avenir Next",sans-serif;animation:alias-flow-enter .45s cubic-bezier(.2,.9,.25,1.05) both}.alias-flow-tv>header{position:relative;z-index:5;display:flex;height:126px;align-items:center;justify-content:space-between;padding:0 70px;border-bottom:1px solid rgba(255,180,156,.45);background:rgba(44,12,24,.52)}.alias-flow-tv>header>div{display:flex;align-items:center;gap:16px}.alias-flow-tv>header span{display:flex;flex-direction:column}.alias-flow-tv>header b{font-size:24px}.alias-flow-tv>header small{color:#ffb49c;font:800 9px ui-monospace,monospace;letter-spacing:.12em}.alias-flow-tv>header em{font:800 10px ui-monospace,monospace;font-style:normal;letter-spacing:.14em}.alias-flow-tv>main{position:relative;height:894px;padding:58px 72px}.alias-flow-tv>footer{position:absolute;left:0;right:0;bottom:0;display:flex;height:60px;align-items:center;justify-content:space-between;padding:0 70px;border-top:1px solid rgba(255,180,156,.35);background:#2c0c18;color:#ffb49c;font:800 8px ui-monospace,monospace;letter-spacing:.12em}.alias-flow-tv-lobby,.alias-flow-tv-ready,.alias-flow-tv-setup,.alias-flow-tv-finished,.alias-flow-tv-result{height:100%;text-align:center}.alias-flow-tv-lobby>small,.alias-flow-tv-ready>small,.alias-flow-tv-setup>small,.alias-flow-tv-finished>small,.alias-flow-tv-result>small{color:#ffb49c;font:800 11px ui-monospace,monospace;letter-spacing:.18em}.alias-flow-tv-lobby h2,.alias-flow-tv-ready h2,.alias-flow-tv-setup h2{margin:22px 0 30px;font-size:64px;line-height:.9}.alias-flow-tv-lobby p,.alias-flow-tv-ready p,.alias-flow-tv-setup p{margin-top:30px;color:#ffcfbd;font-size:16px}.alias-flow-tv-deck{position:relative;width:240px;height:200px;margin:0 auto 28px}.alias-flow-tv-deck>i,.alias-flow-tv-playercard>i{position:absolute;inset:0;border-radius:28px;background:#fff0d8}.alias-flow-tv-deck>i:first-child,.alias-flow-tv-playercard>i:first-child{transform:translate(25px,25px) rotate(5deg);opacity:.65}.alias-flow-tv-deck>i:nth-child(2),.alias-flow-tv-playercard>i:nth-child(2){transform:translate(12px,12px) rotate(2deg);opacity:.85}.alias-flow-tv-deck article{position:absolute;z-index:2;inset:0;display:grid;place-items:center;border-radius:28px;background:#fff0d8;color:#d92f72;box-shadow:0 28px 50px rgba(24,2,10,.3);animation:alias-card-flip .55s both}.alias-flow-tv-teamtables,.alias-flow-tv-namecards{display:grid;grid-template-columns:1fr 1fr;gap:42px;width:1200px;margin:auto}.alias-flow-tv-teamtables article,.alias-flow-tv-namecards article{min-height:330px;padding:45px;border-radius:30px;background:#fff0d8;color:#3b1422;box-shadow:15px 17px 0 #d92f72;animation:alias-card-deal .5s both}.alias-flow-tv-teamtables article:nth-child(2),.alias-flow-tv-namecards article:nth-child(2){animation-delay:.1s;box-shadow:15px 17px 0 #ff7b54}.alias-flow-tv-teamtables article>b{display:block;margin-bottom:50px;font-size:45px}.alias-flow-tv-teamtables .alias-flow-avatars{flex-direction:column;align-items:flex-start}.alias-flow-tv-namecards article{display:flex;flex-direction:column;align-items:center;justify-content:center}.alias-flow-tv-namecards span{color:#a52557;font:800 10px ui-monospace,monospace}.alias-flow-tv-namecards b{font-size:70px}.alias-flow-tv-namecards small{color:#a52557!important}.alias-flow-tv-order{display:grid;grid-template-columns:repeat(3,1fr);gap:15px;width:1100px;margin:auto}.alias-flow-tv-order article{display:grid;grid-template-columns:42px 58px 1fr;align-items:center;padding:18px;border-radius:18px;background:#fff0d8;color:#3b1422;text-align:left;animation:alias-chip-in .35s both}.alias-flow-tv-order article>span{color:#a52557;font:800 11px ui-monospace,monospace}.alias-flow-tv-order article>i{display:grid;width:46px;height:46px;place-items:center;border-radius:50%;background:#d92f72;color:#fff;font-style:normal;font-weight:900}.alias-flow-tv-order article>b{font-size:19px}.alias-flow-tv-bigletter{display:flex;width:700px;height:450px;flex-direction:column;align-items:center;justify-content:center;margin:auto;border-radius:36px;background:#fff0d8;color:#3b1422;box-shadow:18px 20px 0 #d92f72;animation:alias-card-flip .55s both}.alias-flow-tv-bigletter span,.alias-flow-tv-bigletter small{color:#a52557!important;font:800 10px ui-monospace,monospace}.alias-flow-tv-bigletter b{font-size:240px;line-height:.9;color:#d92f72}.alias-flow-tv-playercard{position:relative;width:650px;height:460px;margin:auto}.alias-flow-tv-playercard article{position:absolute;z-index:2;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:36px;background:#fff0d8;color:#3b1422;box-shadow:0 28px 50px rgba(24,2,10,.3);animation:alias-card-flip .55s both}.alias-flow-tv-playercard article small{margin-top:25px;color:#a52557;font:800 10px ui-monospace,monospace}.alias-flow-tv-playercard article b{font-size:90px}.alias-flow-tv-playercard article span{font-size:16px;color:#a52557}.alias-flow-tv-ready h2{margin-bottom:8px}.alias-flow-tv-playing{display:grid;height:100%;grid-template-columns:350px 1fr 430px;align-items:center;gap:60px}.alias-flow-tv-clock{position:relative;width:310px;height:310px}.alias-flow-tv-clock svg{width:100%;height:100%;transform:rotate(-90deg)}.alias-flow-tv-clock circle{fill:none;stroke:#fff0d8;stroke-width:9;opacity:.12}.alias-flow-tv-clock circle.is-progress{opacity:1;stroke:#ff7b54;stroke-dasharray:471;stroke-dashoffset:118;stroke-linecap:round;filter:drop-shadow(0 0 9px #ff7b54);animation:alias-ring 7s linear infinite}.alias-flow-tv-clock>b,.alias-flow-tv-clock>small{position:absolute;left:0;right:0;text-align:center}.alias-flow-tv-clock>b{top:96px;font:900 84px ui-monospace,monospace}.alias-flow-tv-clock>small{top:195px;color:#ffb49c;font:800 10px ui-monospace,monospace}.alias-flow-tv-now{text-align:center}.alias-flow-tv-now>small,.alias-flow-tv-playing aside>small{color:#ffb49c;font:800 10px ui-monospace,monospace;letter-spacing:.16em}.alias-flow-tv-now>h2{margin:20px 0 28px;font-size:100px;line-height:.8}.alias-flow-tv-now .alias-flow-avatars{margin-bottom:25px}.alias-flow-tv-lettercard{display:flex;align-items:center;justify-content:center;gap:20px}.alias-flow-tv-lettercard span{color:#ffb49c;font:800 10px ui-monospace,monospace}.alias-flow-tv-lettercard b{font-size:100px;color:#ff7b54}.alias-flow-tv-counters{display:flex;justify-content:center;gap:12px}.alias-flow-tv-counters>span,.alias-flow-tv-result>div>span{display:grid;grid-template-columns:36px auto;grid-template-rows:auto auto;min-width:150px;padding:13px;border:1px solid #ffb49c;border-radius:14px;text-align:left}.alias-flow-tv-counters i,.alias-flow-tv-result>div i{grid-row:1/3;font-style:normal}.alias-flow-tv-counters b,.alias-flow-tv-result>div b{font-size:27px}.alias-flow-tv-counters small,.alias-flow-tv-result>div small{font-size:7px}.alias-flow-tv-playing aside,.alias-flow-tv-result aside{display:flex;flex-direction:column;gap:9px}.alias-flow-tv-playing aside article,.alias-flow-tv-result aside article{display:grid;grid-template-columns:30px 1fr auto;align-items:center;padding:15px;border:1px solid rgba(255,180,156,.45);border-radius:14px;opacity:.65}.alias-flow-tv-playing aside article.is-first,.alias-flow-tv-result aside article.is-first{background:#fff0d8;color:#3b1422;opacity:1}.alias-flow-tv-playing aside span,.alias-flow-tv-result aside span{font:800 8px ui-monospace,monospace}.alias-flow-tv-playing aside b,.alias-flow-tv-result aside b{font-size:14px}.alias-flow-tv-playing aside strong,.alias-flow-tv-result aside strong{font-size:25px}.alias-flow-tv-result>h2{margin:32px 0 0;color:#ff7b54;font-size:170px;line-height:.8;animation:alias-score-pop .55s both}.alias-flow-tv-result>p{font-size:20px;font-weight:900}.alias-flow-tv-result>div{display:flex;justify-content:center;gap:14px;margin-top:35px}.alias-flow-tv-result aside{display:grid;grid-template-columns:repeat(4,1fr);width:1100px;margin:45px auto 0}.alias-flow-tv-finished .alias-flow-tv-trophy{margin:0 auto 18px;color:#ff7b54;animation:alias-trophy-rise .6s both}.alias-flow-tv-finished>h2{margin:20px 0 0;font-size:120px;line-height:.8}.alias-flow-tv-finished>strong{display:block;margin-top:20px;color:#ff7b54;font-size:78px}.alias-flow-tv-finished>strong span{font-size:14px}.alias-flow-tv-finished>div:last-child{display:flex;width:850px;justify-content:center;gap:12px;margin:42px auto}.alias-flow-tv-finished article{display:grid;min-width:230px;grid-template-columns:32px 1fr auto;align-items:center;padding:16px;border:1px solid #ffb49c;border-radius:15px}.alias-flow-tv-finished article:first-child{background:#fff0d8;color:#3b1422}.alias-flow-tv-finished article span{font:800 9px ui-monospace,monospace}.alias-flow-tv-finished article b{font-size:16px;text-align:left}.alias-flow-tv-finished article strong{font-size:25px}

        .alias-motion-note{display:flex;align-items:center;gap:28px;margin-top:25px;padding-top:20px;border-top:1px solid rgba(255,255,255,.09);color:rgba(255,255,255,.4);font-size:11px}.concept-editorial .alias-motion-note{border-color:#c7bbab;color:#665f57}.alias-motion-note span{display:flex;align-items:center;gap:8px;flex:none;color:var(--concept-accent);font:850 8px/1 ui-monospace,monospace;letter-spacing:.13em}.alias-motion-note span i{width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 10px currentColor}.alias-motion-note p{margin:0;line-height:1.45}.alias-preview-comparison{margin-top:70px;padding:38px;border:1px solid rgba(255,255,255,.1)}.alias-preview-comparison>span,.alias-preview-footer span{color:#ff4e9d;font:850 9px/1 ui-monospace,monospace;letter-spacing:.18em}.alias-preview-comparison h2{margin:12px 0 25px;font-size:38px}.alias-preview-comparison>div{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.alias-preview-comparison button{display:flex;align-items:stretch;min-height:105px;padding:0;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.025);color:#fff;text-align:left;cursor:pointer}.alias-preview-comparison button>i{width:16px;background:linear-gradient(var(--swatch),var(--swatch-two));transition:width .2s}.alias-preview-comparison button:hover>i{width:28px}.alias-preview-comparison button>span{display:flex;flex-direction:column;gap:8px;padding:18px}.alias-preview-comparison button b{font-size:14px}.alias-preview-comparison button small{color:rgba(255,255,255,.42);line-height:1.45}.alias-preview-footer{display:grid;grid-template-columns:1fr 1.4fr;gap:40px;margin-top:42px;padding:38px;border:1px solid rgba(255,255,255,.1);background:linear-gradient(110deg,rgba(255,78,157,.09),transparent)}.alias-preview-footer div{display:flex;flex-direction:column;gap:10px}.alias-preview-footer b{font-size:27px}.alias-preview-footer p{margin:0;color:rgba(255,255,255,.5);line-height:1.6}

        @keyframes alias-orbit{to{transform:rotate(360deg)}}@keyframes alias-word-in{from{opacity:0;transform:translateY(18px) scale(.94);filter:blur(7px)}to{opacity:1;transform:none;filter:none}}@keyframes alias-name-in{from{opacity:0;transform:translateY(22px);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}@keyframes alias-timebar{from{width:78%}to{width:18%}}@keyframes alias-ring{from{stroke-dashoffset:80}to{stroke-dashoffset:390}}@keyframes alias-live{0%,100%{opacity:.35;transform:scale(.8)}50%{opacity:1;transform:scale(1.15)}}@keyframes alias-beam{from{transform:translateX(-180px) rotate(16deg)}to{transform:translateX(240px) rotate(16deg)}}@keyframes alias-type-strip{from{transform:translateX(-35px)}to{transform:translateX(55px)}}@keyframes alias-pixel-float{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-24px);opacity:1}}@keyframes alias-card-settle{from{opacity:0;transform:translateY(35px) rotate(5deg)}to{opacity:1;transform:rotate(1deg)}}@keyframes alias-workshop-card-in{from{opacity:0;filter:blur(3px);transform:translateY(24px) scale(.96) rotate(2deg)}to{opacity:1;filter:none;transform:rotate(-1deg)}}@keyframes alias-workshop-card-left{from{opacity:1;transform:rotate(-1deg)}to{opacity:0;transform:translateX(-145%) rotate(-13deg) scale(.94)}}@keyframes alias-workshop-card-right{from{opacity:1;transform:rotate(-1deg)}to{opacity:0;transform:translateX(145%) rotate(13deg) scale(.94)}}@keyframes alias-confetti{0%,100%{transform:translateY(0) rotate(0);opacity:.2}50%{transform:translateY(-35px) rotate(160deg);opacity:.8}}

        @keyframes alias-flow-enter{from{opacity:0;filter:blur(5px);transform:translateY(16px)}to{opacity:1;filter:none;transform:none}}@keyframes alias-card-deal{from{opacity:0;filter:blur(3px);transform:translateY(-45px) rotate(-8deg) scale(.94)}to{opacity:1;filter:none}}@keyframes alias-card-flip{from{opacity:0;filter:blur(4px);transform:perspective(700px) rotateY(18deg) translateY(18px) scale(.96)}to{opacity:1;filter:none}}@keyframes alias-chip-in{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}@keyframes alias-score-pop{from{opacity:0;filter:blur(5px);transform:translateY(20px) scale(.92)}to{opacity:1;filter:none;transform:none}}@keyframes alias-trophy-rise{from{opacity:0;filter:blur(5px);transform:translateY(30px) scale(.9)}to{opacity:1;filter:none;transform:none}}@keyframes alias-flow-progress{from{width:82%}to{width:18%}}@keyframes alias-spin{to{transform:rotate(360deg)}}

        @media(max-width:1450px){.alias-preview-devices{grid-template-columns:390px 700px}.alias-preview-tv-column,.alias-preview-tv-shell{width:700px}.alias-preview-tv-shell{height:394px}.alias-preview-tv{transform:scale(.365)}}@media(max-width:1160px){.alias-preview-hero nav{grid-template-columns:repeat(2,1fr)}.alias-preview-devices{grid-template-columns:390px;justify-items:center}.alias-preview-tv-column,.alias-preview-tv-shell{width:700px}.alias-concept-copy{grid-template-columns:1fr}.alias-concept-copy>span,.alias-concept-copy>div{grid-column:1}.alias-concept-copy p{max-width:760px}.alias-preview-toolbar{align-items:stretch;flex-direction:column}.alias-preview-replay{justify-content:center}.alias-flow-heading{grid-template-columns:1fr}.alias-flow-heading>span{grid-column:1}.alias-flow-nav{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.alias-preview-page{padding:18px 10px 55px}.alias-preview-hero{min-height:0;padding:34px 20px 28px;clip-path:none}.alias-preview-hero h1{font-size:55px}.alias-preview-hero>p{font-size:14px}.alias-preview-hero nav{grid-template-columns:1fr}.alias-preview-toolbar{padding:10px}.alias-preview-mode-switch{grid-template-columns:1fr}.alias-concept-stage,.alias-workshop-full-flow{margin-top:28px;padding:22px 10px}.alias-concept-copy,.alias-flow-heading{padding-inline:8px}.alias-concept-copy h1,.alias-flow-heading h2{font-size:42px}.alias-flow-nav{grid-template-columns:1fr}.alias-flow-actions{align-items:flex-start;flex-direction:column;gap:12px}.alias-preview-devices{grid-template-columns:320px}.alias-preview-phone-column,.alias-preview-phone-shell{width:320px}.alias-preview-phone-shell{height:693px;border-radius:42px}.alias-preview-phone{width:304px;height:677px;border-radius:34px;transform-origin:top left}.alias-phone-main{padding:14px 14px 50px}.alias-flow-phone-main{height:529px;padding:13px 14px 49px}.alias-flow-phone-main>h2{font-size:35px}.alias-flow-phone-main .alias-flow-ready-deck{height:275px}.alias-flow-phone-main .alias-flow-active-stack{height:330px}.alias-flow-phone-main .alias-flow-listen-card{min-height:330px}.alias-flow-phone-main .alias-flow-winner{height:205px}.alias-flow-phone-main .alias-flow-team-pick>article{min-height:180px}.alias-flow-phone-main .alias-flow-letter-rule{height:220px}.alias-flow-phone-main .alias-flow-mode-cards article{padding:10px}.alias-flow-phone-main .alias-flow-primary{min-height:47px}.alias-flow-phone-main .alias-flow-primary.is-tall{min-height:62px}.alias-phone-card-stack{margin-top:10px}.alias-phone-word-card{min-height:350px;padding:15px}.alias-phone-word-card h2{font-size:43px}.alias-phone-actions button{min-height:54px}.alias-preview-tv-column,.alias-preview-tv-shell{width:320px}.alias-preview-tv-shell{height:180px}.alias-preview-tv{transform:scale(.1667)}.alias-motion-note{align-items:flex-start;flex-direction:column;gap:10px;padding-inline:8px}.alias-preview-comparison{margin-top:35px;padding:22px 12px}.alias-preview-comparison>div{grid-template-columns:1fr}.alias-preview-comparison h2{font-size:28px}.alias-preview-footer{grid-template-columns:1fr;gap:20px;padding:24px 18px}.alias-preview-hero-orbit{display:none}}@media(prefers-reduced-motion:reduce){.alias-preview-page *,.alias-preview-page *::before,.alias-preview-page *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
        .alias-flow-mode-cards article span{min-width:0}.alias-flow-mode-cards article b{display:flex;align-items:center;justify-content:space-between;gap:6px}.alias-flow-mode-cards article b em{flex:none;font-family:inherit;font-size:15px;font-style:normal;font-weight:800;line-height:1;opacity:.62;white-space:nowrap}
        /* Preserve the responsive preview scale while the full-flow TV canvas enters. */
        .alias-preview-tv.alias-flow-tv{animation-name:alias-flow-tv-enter}
        .alias-flow-tv-reference-playing{display:grid;height:100%;grid-template-columns:360px minmax(0,1fr) 470px;gap:55px;align-items:center}.alias-flow-tv-reference-playing .alias-tv-timer-zone{align-self:center}.alias-flow-tv-reference-playing .alias-tv-focus{min-width:0}.alias-flow-tv-reference-playing .alias-tv-score-zone{height:100%}
        .alias-flow-word-ledger{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr);gap:8px;margin-top:10px}.alias-flow-word-ledger article{min-width:0;padding:9px;border:1px solid rgba(255,180,156,.38);border-radius:10px;background:rgba(255,240,216,.07)}.alias-flow-word-ledger article>b{display:flex;align-items:center;gap:5px;color:#ffcfbd;font:800 6px ui-monospace,monospace;letter-spacing:.06em}.alias-flow-word-ledger article>b i{display:grid;width:14px;height:14px;place-items:center;border-radius:50%;background:#ff7b54;color:#3b1422;font-style:normal}.alias-flow-word-ledger article.is-skipped>b i{border:1px solid #ffb49c;background:transparent;color:#ffb49c}.alias-flow-word-ledger article>div{display:flex;flex-wrap:wrap;gap:4px;margin-top:7px}.alias-flow-word-ledger article span{padding:4px 5px;border-radius:5px;background:#fff0d8;color:#3b1422;font:800 6px ui-monospace,monospace}.alias-flow-word-ledger article.is-skipped span{background:rgba(255,240,216,.12);color:#ffcfbd;text-decoration:line-through;text-decoration-thickness:1px}
        .alias-flow-tv-result>h2{margin-top:22px;font-size:150px}.alias-flow-tv-result>div{margin-top:24px}.alias-flow-word-ledger.is-tv{grid-template-columns:minmax(0,1.35fr) minmax(0,.65fr);width:1100px;margin:24px auto 0;text-align:left}.alias-flow-word-ledger.is-tv article{padding:14px 17px;border-radius:15px}.alias-flow-word-ledger.is-tv article>b{font-size:9px}.alias-flow-word-ledger.is-tv article>b i{width:20px;height:20px}.alias-flow-word-ledger.is-tv article>div{gap:7px;margin-top:10px}.alias-flow-word-ledger.is-tv article span{padding:7px 9px;border-radius:7px;font-size:9px}.alias-flow-tv-result>.alias-flow-word-ledger+aside{margin-top:24px}
        .alias-flow-mode-control{display:grid;grid-template-columns:minmax(250px,.7fr) minmax(480px,1.3fr);align-items:center;gap:28px;margin:30px 0 18px;padding:20px;border:1px solid rgba(255,78,157,.28);background:linear-gradient(110deg,rgba(255,78,157,.09),rgba(255,255,255,.025))}.alias-flow-mode-control>div{display:flex;min-width:0;flex-direction:column;gap:5px}.alias-flow-mode-control>div span{color:#ff4e9d;font:850 8px/1 ui-monospace,monospace;letter-spacing:.16em}.alias-flow-mode-control>div b{font-size:18px}.alias-flow-mode-control>div small{color:rgba(255,255,255,.45);font-size:10px;line-height:1.45}.alias-flow-mode-control .alias-preview-mode-switch{width:100%}.alias-flow-mode-control .alias-preview-mode-switch button{min-height:60px;cursor:pointer}.alias-flow-mode-control .alias-preview-mode-switch button:focus-visible{outline:2px solid #fff;outline-offset:3px}
        @media(max-width:900px){.alias-flow-mode-control{grid-template-columns:1fr}.alias-flow-mode-control .alias-preview-mode-switch{grid-template-columns:1fr 1fr}}@media(max-width:520px){.alias-flow-mode-control{margin-top:22px;padding:14px}.alias-flow-mode-control .alias-preview-mode-switch{grid-template-columns:1fr}}
        .alias-preview-page .alias-phone-word-card h2{overflow-wrap:normal;word-break:normal;hyphens:none}.alias-preview-page .alias-phone-word-card h2.alias-word-size-medium{font-size:42px}.alias-preview-page .alias-phone-word-card h2.alias-word-size-long{font-size:34px}.alias-preview-page .alias-phone-word-card h2.alias-word-size-xlong{font-size:28px}
        @keyframes alias-flow-tv-enter{from{opacity:0;filter:blur(5px)}to{opacity:1;filter:none}}
      `}</style>
    </div>
  );
}
