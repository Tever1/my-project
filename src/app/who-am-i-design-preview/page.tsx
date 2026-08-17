"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { WhoAmIIcon } from "@/components/games/WhoAmIIcon";

type ConceptId = "neon" | "kinetic" | "masquerade" | "clay" | "clay-dark" | "clay-blue";
type DemoMoment = "turn" | "guess" | "win";
type LayoutId = "orbit" | "deck" | "split" | "constellation";
type CipherId = "archive" | "lens";
type CipherMoment = "turn" | "guess" | "judge" | "reveal" | "results";
type ClayPhoneScreenId =
  | "lobby-host"
  | "lobby-player"
  | "turn"
  | "streak"
  | "waiting"
  | "guess"
  | "confirm"
  | "judge"
  | "wrong"
  | "correct"
  | "guessed"
  | "results";
type ClayTvScreenId = "lobby" | "turn" | "dispute" | "wrong" | "correct" | "results";

type Concept = {
  id: ConceptId;
  number: string;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  secondary: string;
  tags: string[];
  motion: string[];
};

const concepts: Concept[] = [
  {
    id: "neon",
    number: "01",
    name: "Неоновая загадка",
    subtitle: "Световой след · Глубина · Фокус",
    description:
      "Ночной сценический мир, где вопрос ощущается как поиск сигнала. Свет ведёт взгляд от игрока к скрытому персонажу, а каждый ответ оставляет заметный импульс.",
    accent: "#66e8ff",
    secondary: "#6e7dff",
    tags: ["кинематографично", "холодный неон", "глубокий фокус"],
    motion: ["карточки входят из глубины", "ответ расходится световой волной", "персонаж проявляется через фокус"],
  },
  {
    id: "kinetic",
    number: "02",
    name: "Кинетический шрифт",
    subtitle: "Типографика · Ритм · Цветовой сдвиг",
    description:
      "Цифровая сцена, где слова сами становятся игровыми объектами. Огромные буквы, вопросительные знаки и цветовые плоскости реагируют на каждый ответ. Ни фактуры, ни имитации бумаги — только чистый экранный цвет.",
    accent: "#ff4d00",
    secondary: "#5636ff",
    tags: ["кинетический шрифт", "цифровой цвет", "большой масштаб"],
    motion: ["буквы сдвигают цветовые слои", "ответ перестраивает ритм экрана", "имя победителя занимает всю сцену"],
  },
  {
    id: "masquerade",
    number: "03",
    name: "Хроматический маскарад",
    subtitle: "Маски · Призмы · Тайная личность",
    description:
      "Мир тайных образов, где личность скрыта за переливающейся цифровой маской. Тёмное стекло, призматические грани и цветные отражения создают ощущение праздничного маскарада без театрального декора.",
    accent: "#ffca5c",
    secondary: "#d958ff",
    tags: ["призматическое стекло", "цифровые маски", "цветные отражения"],
    motion: ["маска собирается из призматических граней", "ответ меняет цвет отражений", "персонаж проявляется за снятой маской"],
  },
  {
    id: "clay",
    number: "04",
    name: "Пластилиновый мир",
    subtitle: "Игрушки · Объём · Прыжок",
    description:
      "Добрый объёмный мир из мягких игрушечных форм. Карточки выглядят слепленными руками, кнопки приятно продавливаются, а скрытый персонаж живёт внутри пружинящей капсулы.",
    accent: "#ff7a91",
    secondary: "#7459df",
    tags: ["soft 3D", "конфетная палитра", "игрушечная сцена"],
    motion: ["формы тянутся и сжимаются", "кнопки мягко продавливаются", "персонаж выпрыгивает из капсулы"],
  },
  {
    id: "clay-dark",
    number: "05",
    name: "Пластилиновая ночь",
    subtitle: "Матовый объём · Ягоды · Мягкий свет",
    description:
      "Тёмная версия пластилинового мира: глубокая сливовая сцена, матовые графитовые формы и мягкие ягодно-мятные акценты. Объём строится на свете и тени, а не на неоновом свечении.",
    accent: "#ff668f",
    secondary: "#69d5b5",
    tags: ["тёмный soft 3D", "матовый пластилин", "камерная сцена"],
    motion: ["формы медленно всплывают из тени", "нажатие оставляет мягкий след", "победа зажигает тёплый свет внутри форм"],
  },
  {
    id: "clay-blue",
    number: "06",
    name: "Голубая пластилиновая ночь",
    subtitle: "Фирменный голубой · Матовый объём · Глубина",
    description:
      "Тёмная пластилиновая сцена, где фирменный голубой «Кто я?» становится главным материалом. Синие тени, голубые капсулы и мягкие световые пятна делают игру узнаваемой, не превращая её в неон.",
    accent: "#38bdf8",
    secondary: "#0284c7",
    tags: ["фирменный голубой", "тёмный soft 3D", "глубокий синий"],
    motion: ["голубые формы медленно всплывают", "ответ мягко продавливает голубую капсулу", "персонаж открывается в тёплом голубом свете"],
  },
];

const layoutConcepts: Array<{
  id: LayoutId;
  number: string;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  secondary: string;
}> = [
  {
    id: "orbit",
    number: "07",
    name: "Орбитальный пульт",
    subtitle: "Центральная сцена · Радиальные действия",
    description: "Тайная личность занимает центр экрана. «Нет» и «Да» становятся крупными секторами вокруг неё, а попытка угадать — отдельной капсулой под большим пальцем.",
    accent: "#38bdf8",
    secondary: "#f472b6",
  },
  {
    id: "deck",
    number: "08",
    name: "Живая колода",
    subtitle: "Стопка карт · Боковые лопатки",
    description: "Текущий ход — это большая цифровая карта поверх остальных. Игроки живут в компактной ленте сверху, а ответы вынесены в две боковые кнопки-лопатки, меняющие наклон колоды.",
    accent: "#ff6b35",
    secondary: "#623cea",
  },
  {
    id: "split",
    number: "09",
    name: "Разделённая сцена",
    subtitle: "Две половины · Один жест",
    description: "В ходе игры весь нижний экран превращается в две огромные зоны ответа. Между ними плавает круглая кнопка «Я знаю». Состав игроков и прогресс уходят в тонкую верхнюю ленту.",
    accent: "#b8f34a",
    secondary: "#ff4f87",
  },
  {
    id: "constellation",
    number: "10",
    name: "Созвездие игроков",
    subtitle: "Карта игроков · Боковая рейка",
    description: "Игроки больше не спрятаны в списке: они становятся узлами живой карты вокруг текущего хода. Все действия собраны на вертикальной рейке справа, поэтому центр остаётся чистой игровой сценой.",
    accent: "#7dd3fc",
    secondary: "#c084fc",
  },
];

const cipherConcepts: Array<{
  id: CipherId;
  number: string;
  name: string;
  subtitle: string;
  description: string;
}> = [
  {
    id: "archive",
    number: "11",
    name: "Точный архив",
    subtitle: "Тёмное стекло · Строгие слои · Чистая геометрия",
    description:
      "Собранная и ясная версия зашифрованной личности. Активный игрок находится в центре, персонажи остальных — в компактной ленте, а три ответа объединены в одну архитектурную панель.",
  },
  {
    id: "lens",
    number: "12",
    name: "Глубокая линза",
    subtitle: "Оптическая глубина · Мягкие изгибы · Живое преломление",
    description:
      "Более пространственная версия той же системы. Стеклянные слои изгибаются как линзы, символы медленно перестраиваются внутри, а нижняя панель ощущается цельным физическим объектом.",
  },
];

const players = [
  { name: "Аня", character: "Клеопатра", initial: "А" },
  { name: "Макс", character: "Гарри Поттер", initial: "М" },
  { name: "Катя", character: "???", initial: "К" },
  { name: "Дима", character: "Чебурашка", initial: "Д" },
];

function DeviceLabel({ tv = false }: { tv?: boolean }) {
  return (
    <div className="wai-preview-device-label">
      <span>{tv ? "Игровое поле · TV" : "Телефон игрока"}</span>
      <b>{tv ? "1920 × 1080" : "390 × 844"}</b>
    </div>
  );
}

function PlayerAvatar({ player, small = false }: { player: (typeof players)[number]; small?: boolean }) {
  return <span className={`wai-preview-avatar${small ? " is-small" : ""}`}>{player.initial}</span>;
}

function PhoneMockup({ concept, motionKey }: { concept: Concept; motionKey: number }) {
  const [yesStreak, setYesStreak] = useState(1);
  const [moment, setMoment] = useState<DemoMoment>("turn");

  const answer = (value: "yes" | "no") => {
    setMoment("turn");
    setYesStreak((current) => (value === "yes" ? (current >= 3 ? 0 : current + 1) : 0));
  };

  return (
    <div className="wai-preview-device-column wai-preview-phone-column">
      <DeviceLabel />
      <div className="wai-preview-phone-shell">
        <div key={`${concept.id}-${motionKey}`} className={`wai-preview-phone wai-phone-${concept.id}`}>
          <div className="wai-phone-atmosphere" aria-hidden="true"><i /><i /><i /></div>
          <div className="wai-phone-status"><span>21:47</span><b>● ● ●</b></div>
          <header className="wai-phone-header">
            <div className="wai-phone-brand"><WhoAmIIcon name="profile" /><span><b>КТО Я?</b><small>PARTY HUB</small></span></div>
            <em>A7QX</em>
          </header>

          <main className="wai-phone-main">
            {moment === "turn" && (
              <>
                <div className="wai-phone-kicker"><i /> ТВОЙ ХОД</div>
                <h3>Задай вопрос<br/><span>про себя</span></h3>
                <p className="wai-phone-instruction">Остальные отвечают вслух. Зафиксируй ответ на экране.</p>

                <section className="wai-phone-identity-card">
                  <div className="wai-phone-hidden-mark"><WhoAmIIcon name="profile" /></div>
                  <div><small>ТВОЙ ПЕРСОНАЖ</small><b>СКРЫТ</b></div>
                  <strong>?</strong>
                </section>

                <div className="wai-phone-roster">
                  {players.map((player, index) => (
                    <div key={player.name} className={index === 2 ? "is-current" : ""}>
                      <PlayerAvatar player={player} small />
                      <span><b>{player.name}</b><small>{index === 2 ? "это ты" : player.character}</small></span>
                      {index === 2 && <WhoAmIIcon name="pointer" />}
                    </div>
                  ))}
                </div>

                <div className="wai-phone-streak" aria-label={`Да подряд: ${yesStreak} из 3`}>
                  <span>«ДА» ПОДРЯД</span>
                  <div>{[0, 1, 2].map((item) => <i key={item} className={item < yesStreak ? "is-filled" : ""} />)}</div>
                </div>
              </>
            )}

            {moment === "guess" && (
              <section className="wai-phone-guess-card">
                <div className="wai-phone-guess-icon"><WhoAmIIcon name="profile" /></div>
                <small>ПОПЫТКА УГАДАТЬ</small>
                <h3>Так кто же ты?</h3>
                <label><span>ИМЯ ПЕРСОНАЖА</span><b>Чебурашка</b><i /></label>
                <p>Если написание не совпадёт, ответ можно передать судье.</p>
              </section>
            )}

            {moment === "win" && (
              <section className="wai-phone-win-card">
                <div className="wai-phone-win-burst" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</div>
                <WhoAmIIcon name="celebrate" />
                <small>ТОЧНО В ЦЕЛЬ</small>
                <h3>Ты — Клеопатра!</h3>
                <b>+80 ОЧКОВ</b>
                <p>Понадобилось всего 3 вопроса</p>
              </section>
            )}
          </main>

          <footer className="wai-phone-actions">
            {moment === "turn" ? (
              <>
                <div><button type="button" onClick={() => answer("no")}><WhoAmIIcon name="cross" />НЕТ</button><button type="button" onClick={() => answer("yes")}><WhoAmIIcon name="check" />ДА</button></div>
                <button type="button" className="is-primary" onClick={() => setMoment("guess")}><WhoAmIIcon name="profile" />Я ЗНАЮ!</button>
              </>
            ) : moment === "guess" ? (
              <><button type="button" className="is-primary" onClick={() => setMoment("win")}>УГАДАТЬ!</button><button type="button" onClick={() => setMoment("turn")}>ОТМЕНА</button></>
            ) : (
              <button type="button" className="is-primary" onClick={() => setMoment("turn")}>СМОТРЕТЬ ИГРУ</button>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
}

function TvMockup({ concept, motionKey }: { concept: Concept; motionKey: number }) {
  return (
    <div className="wai-preview-device-column wai-preview-tv-column">
      <DeviceLabel tv />
      <div className="wai-preview-tv-shell">
        <div key={`${concept.id}-${motionKey}`} className={`wai-preview-tv wai-tv-${concept.id}`}>
          <div className="wai-tv-atmosphere" aria-hidden="true"><i /><i /><i /><i /></div>
          <header className="wai-tv-header">
            <div className="wai-tv-brand"><span><WhoAmIIcon name="profile" /></span><div><b>КТО Я?</b><small>PARTY HUB</small></div></div>
            <div className="wai-tv-now"><small>СЕЙЧАС ХОДИТ</small><b>КАТЯ</b></div>
            <div className="wai-tv-progress"><WhoAmIIcon name="check" /><span>УГАДАЛИ</span><b>2 / 6</b></div>
          </header>

          <main className="wai-tv-main">
            <section className="wai-tv-hero">
              <div className="wai-tv-hero-person">
                <div className="wai-tv-avatar-orbit"><span>К</span><i /><i /></div>
                <div><small>СЕЙЧАС ХОДИТ</small><h3>КАТЯ</h3><p>«Да» подряд <b>1 / 3</b></p></div>
              </div>
              <div className="wai-tv-hidden-card">
                <span><WhoAmIIcon name="profile" /></span>
                <div><small>ТАЙНАЯ ЛИЧНОСТЬ</small><b>ПЕРСОНАЖ СКРЫТ</b><p>Откроется после верного ответа</p></div>
                <strong>?</strong>
              </div>
            </section>

            <div className="wai-tv-player-strip">
              {players.concat([{ name: "Света", character: "Шрек", initial: "С" }, { name: "Лёша", character: "Бэтмен", initial: "Л" }]).map((player, index) => (
                <div key={player.name} className={index < 2 ? "is-guessed" : index === 2 ? "is-current" : ""}>
                  <PlayerAvatar player={player} small /><b>{player.name}</b>{index < 2 && <WhoAmIIcon name="check" />}
                </div>
              ))}
            </div>
          </main>

          <footer className="wai-tv-footer"><span>У КАТИ НА ТЕЛЕФОНЕ</span><b>НЕТ · ДА · Я ЗНАЮ!</b><em><i /> 6 В ИГРЕ</em></footer>
        </div>
      </div>
    </div>
  );
}

function LayoutPhone({ layout }: { layout: (typeof layoutConcepts)[number] }) {
  const [moment, setMoment] = useState<DemoMoment>("turn");
  const [yesStreak, setYesStreak] = useState(1);

  const answer = (value: "yes" | "no") => {
    setYesStreak((current) => (value === "yes" ? (current >= 3 ? 0 : current + 1) : 0));
  };

  const answerButtons = (
    <div className="wai-layout-answer-controls">
      <button type="button" className="is-no" onClick={() => answer("no")}><WhoAmIIcon name="cross" /><span>НЕТ</span></button>
      <button type="button" className="is-yes" onClick={() => answer("yes")}><WhoAmIIcon name="check" /><span>ДА</span></button>
      <button type="button" className="is-guess" onClick={() => setMoment("guess")}><WhoAmIIcon name="profile" /><span>Я ЗНАЮ!</span></button>
    </div>
  );

  return (
    <div className="wai-preview-device-column wai-preview-phone-column">
      <DeviceLabel />
      <div className="wai-preview-phone-shell">
        <div className={`wai-layout-phone layout-${layout.id}`} style={{ "--layout-accent": layout.accent, "--layout-secondary": layout.secondary } as CSSProperties}>
          <header className="wai-layout-phone-head">
            <span><WhoAmIIcon name="profile" /><b>КТО Я?</b></span>
            <em>A7QX</em>
          </header>

          {moment === "turn" && (
            <main className="wai-layout-turn">
              <div className="wai-layout-player-rail">
                {players.map((player, index) => <span key={player.name} className={index === 2 ? "is-current" : ""}><PlayerAvatar player={player} small /><b>{player.name}</b></span>)}
              </div>
              <section className="wai-layout-focus">
                <small>ТВОЙ ХОД · «ДА» {yesStreak}/3</small>
                <div className="wai-layout-secret"><WhoAmIIcon name="profile" /><strong>?</strong><span>ПЕРСОНАЖ<br/><b>СКРЫТ</b></span></div>
                <h3>Задай вопрос<br/><em>про себя</em></h3>
              </section>
              {answerButtons}
            </main>
          )}

          {moment === "guess" && (
            <main className="wai-layout-guess">
              <button type="button" className="wai-layout-close" onClick={() => setMoment("turn")}>×</button>
              <span><WhoAmIIcon name="profile" /></span>
              <small>ПОПЫТКА УГАДАТЬ</small>
              <h3>Так кто же ты?</h3>
              <label><small>ИМЯ ПЕРСОНАЖА</small><b>Чебурашка</b></label>
              <button type="button" className="wai-layout-submit" onClick={() => setMoment("win")}>УГАДАТЬ!</button>
            </main>
          )}

          {moment === "win" && (
            <main className="wai-layout-win">
              <WhoAmIIcon name="celebrate" />
              <small>ТОЧНО В ЦЕЛЬ</small>
              <h3>Ты — Клеопатра!</h3>
              <b>+80 ОЧКОВ</b>
              <button type="button" className="wai-layout-submit" onClick={() => setMoment("turn")}>СМОТРЕТЬ ИГРУ</button>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

function LayoutTv({ layout }: { layout: (typeof layoutConcepts)[number] }) {
  const tvPlayers = players.concat([{ name: "Света", character: "Шрек", initial: "С" }, { name: "Лёша", character: "Бэтмен", initial: "Л" }]);
  return (
    <div className="wai-preview-device-column wai-preview-tv-column">
      <DeviceLabel tv />
      <div className="wai-preview-tv-shell">
        <div className={`wai-layout-tv layout-${layout.id}`} style={{ "--layout-accent": layout.accent, "--layout-secondary": layout.secondary } as CSSProperties}>
          <header><span><WhoAmIIcon name="profile" /><b>КТО Я?</b></span><em>КАТЯ ХОДИТ · 1/3 «ДА»</em><strong>2 / 6 УГАДАЛИ</strong></header>
          <main>
            <div className="wai-layout-tv-roster">{tvPlayers.map((player, index) => <span key={player.name} className={index === 2 ? "is-current" : ""}><PlayerAvatar player={player} small /><b>{player.name}</b></span>)}</div>
            <section className="wai-layout-tv-stage">
              <div className="wai-layout-tv-person"><span>К</span><small>СЕЙЧАС ХОДИТ</small><h3>КАТЯ</h3></div>
              <div className="wai-layout-tv-secret"><WhoAmIIcon name="profile" /><span><small>ТАЙНАЯ ЛИЧНОСТЬ</small><b>ПЕРСОНАЖ СКРЫТ</b></span><strong>?</strong></div>
            </section>
          </main>
          <footer>НА ТЕЛЕФОНЕ КАТИ: <b>НЕТ · ДА · Я ЗНАЮ!</b></footer>
        </div>
      </div>
    </div>
  );
}

function LayoutConceptSection({ layout }: { layout: (typeof layoutConcepts)[number] }) {
  return (
    <section id={`layout-${layout.id}`} className={`wai-preview-concept wai-layout-concept layout-concept-${layout.id}`} style={{ "--wai-accent": layout.accent, "--wai-secondary": layout.secondary } as CSSProperties}>
      <div className="wai-preview-concept-head">
        <div className="wai-preview-concept-number">{layout.number}</div>
        <div className="wai-preview-concept-copy"><span>{layout.subtitle}</span><h2>{layout.name}</h2><p>{layout.description}</p><div className="wai-preview-tags"><i>НОВАЯ КОМПОЗИЦИЯ</i><i>ТОТ ЖЕ ФУНКЦИОНАЛ</i></div></div>
      </div>
      <div className="wai-preview-devices"><LayoutPhone layout={layout} /><LayoutTv layout={layout} /></div>
    </section>
  );
}

function CipherPlayerRibbon() {
  return (
    <div className="wai-cipher-player-ribbon" aria-label="Игроки">
      {players.map((player, index) => (
        <span key={player.name} className={index === 2 ? "is-current" : ""}>
          <PlayerAvatar player={player} small />
          <b>{player.name}</b>
          <small>{index === 2 ? "ТВОЙ ХОД" : player.character}</small>
        </span>
      ))}
    </div>
  );
}

function CipherGlassStack({ streak, compact = false, autoDemo = false }: { streak: number; compact?: boolean; autoDemo?: boolean }) {
  const glyphs = ["К", "?", "Я", "Л", "И", "Ц", "Н", "О", "С", "Т", "Ь"];

  return (
    <div className={`wai-cipher-stack streak-${streak}${compact ? " is-compact" : ""}${autoDemo ? " is-auto-demo" : ""}`} aria-label={`Серия «Да»: ${streak} из 3`}>
      {[0, 1, 2].map((layer) => (
        <div key={layer} className={`wai-cipher-glass-layer layer-${layer + 1}`}>
          {glyphs.slice(layer * 3, layer * 3 + 5).map((glyph, index) => (
            <i key={`${glyph}-${index}`}>{glyph}</i>
          ))}
        </div>
      ))}
      <div className="wai-cipher-lock">
        <span>ЛИЧНОСТЬ</span>
        <strong>???</strong>
        <small>{3 - streak} {3 - streak === 1 ? "СЛОЙ" : streak === 3 ? "СЛОЁВ" : "СЛОЯ"} ЗАКРЫТО</small>
      </div>
    </div>
  );
}

function CipherPhone({ concept }: { concept: (typeof cipherConcepts)[number] }) {
  const [moment, setMoment] = useState<CipherMoment>("turn");
  const [yesStreak, setYesStreak] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const stateMotion = prefersReducedMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0 } }
    : { initial: { opacity: 0, y: 8, filter: "blur(4px)" }, animate: { opacity: 1, y: 0, filter: "blur(0px)" }, exit: { opacity: 0, y: -4, filter: "blur(3px)" }, transition: { duration: .34, ease: [.2, .8, .2, 1] as [number, number, number, number] } };

  const showTurn = () => setMoment("turn");
  const answerYes = () => setYesStreak((current) => (current >= 3 ? 0 : current + 1));
  const answerNo = () => setYesStreak(0);

  return (
    <div className="wai-preview-device-column wai-preview-phone-column">
      <DeviceLabel />
      <div className="wai-cipher-state-tabs" aria-label="Состояния телефона">
        {([
          ["turn", "ХОД"],
          ["guess", "ОТВЕТ"],
          ["judge", "СУДЬЯ"],
          ["results", "ФИНАЛ"],
        ] as Array<[CipherMoment, string]>).map(([state, label]) => (
          <button key={state} type="button" className={moment === state ? "is-active" : ""} onClick={() => setMoment(state)}>{label}</button>
        ))}
      </div>
      <div className="wai-preview-phone-shell">
        <div className={`wai-cipher-phone cipher-${concept.id}`}>
          <div className="wai-cipher-ambient" aria-hidden="true"><i /><i /><i /></div>

          <AnimatePresence mode="wait" initial={false}>
          {moment === "turn" && (
            <motion.main key="turn" className="wai-cipher-turn" {...stateMotion}>
              <header className="wai-cipher-phone-header"><b>КТО Я?</b><span>A7QX</span></header>
              <CipherPlayerRibbon />
              <section className="wai-cipher-active-player">
                <span>К</span>
                <div><small>ТВОЙ ХОД</small><h3>КАТЯ</h3><p>Задай вопрос о себе</p></div>
              </section>
              <CipherGlassStack streak={yesStreak} />
              <div className="wai-cipher-streak-copy"><span>«ДА» ПОДРЯД</span><b>{yesStreak} / 3</b></div>
              <div className="wai-cipher-control-deck">
                <button type="button" className="is-no" onClick={answerNo}><small>ПЕРЕДАТЬ ХОД</small><b>НЕТ</b></button>
                <button type="button" className="is-guess" onClick={() => setMoment("guess")}><small>ОТКРЫТЬ ОТВЕТ</small><b>Я ЗНАЮ!</b></button>
                <button type="button" className="is-yes" onClick={answerYes}><small>ЕЩЁ ВОПРОС</small><b>ДА</b></button>
              </div>
            </motion.main>
          )}

          {moment === "guess" && (
            <motion.main key="guess" className="wai-cipher-clean-state wai-cipher-guess-state" {...stateMotion}>
              <button type="button" className="wai-cipher-back" onClick={showTurn}>ОТМЕНА</button>
              <div className="wai-cipher-state-mark">02</div>
              <small>ПОПЫТКА УГАДАТЬ</small>
              <h3>Кто ты?</h3>
              <label><span>ИМЯ ПЕРСОНАЖА</span><b>Чебурашка<i /></b></label>
              <p>Напиши имя. Если оно не совпадёт точно, ответ проверит другой игрок.</p>
              <button type="button" className="wai-cipher-primary" onClick={() => setMoment("reveal")}>УГАДАТЬ</button>
            </motion.main>
          )}

          {moment === "judge" && (
            <motion.main key="judge" className="wai-cipher-clean-state wai-cipher-judge-state" {...stateMotion}>
              <div className="wai-cipher-state-mark">?</div>
              <small>ТЫ — СУДЬЯ</small>
              <h3>Сравни ответы</h3>
              <div className="wai-cipher-comparison">
                <article><small>ДОГАДКА КАТИ</small><b>Чебурашка</b></article>
                <i>VS</i>
                <article><small>ПЕРСОНАЖ</small><b>Чебурашка</b></article>
              </div>
              <div className="wai-cipher-verdict">
                <button type="button" onClick={showTurn}>ОТКЛОНИТЬ</button>
                <button type="button" onClick={() => setMoment("reveal")}>ВЕРНО</button>
              </div>
            </motion.main>
          )}

          {moment === "reveal" && (
            <motion.main key="reveal" className="wai-cipher-clean-state wai-cipher-reveal-state" {...stateMotion}>
              <div className="wai-cipher-reveal-glass" aria-hidden="true"><i /><i /></div>
              <small>ЛИЧНОСТЬ РАСКРЫТА</small>
              <div className="wai-cipher-decoded-name" aria-label="Чебурашка">
                {[..."ЧЕБУРАШКА"].map((letter, index) => <span key={`${letter}-${index}`} style={{ "--letter-delay": `${index * 70}ms` } as CSSProperties}>{letter}</span>)}
              </div>
              <p>Буквы выстроились. Ответ принят.</p>
              <strong>+80 ОЧКОВ</strong>
              <button type="button" className="wai-cipher-primary" onClick={() => setMoment("results")}>ОТКРЫТЬ АРХИВ</button>
            </motion.main>
          )}

          {moment === "results" && (
            <motion.main key="results" className="wai-cipher-clean-state wai-cipher-results-state" {...stateMotion}>
              <small>АРХИВ ЛИЧНОСТЕЙ</small>
              <h3>Игра раскрыта</h3>
              <div className="wai-cipher-result-list">
                {[
                  ["01", "АНЯ", "КЛЕОПАТРА", "100"],
                  ["02", "КАТЯ", "ЧЕБУРАШКА", "80"],
                  ["03", "МАКС", "ГАРРИ ПОТТЕР", "60"],
                ].map(([place, name, character, score]) => (
                  <article key={name}><span>{place}</span><div><b>{name}</b><small>{character}</small></div><strong>{score}</strong></article>
                ))}
              </div>
              <button type="button" className="wai-cipher-primary" onClick={showTurn}>СМОТРЕТЬ ИГРУ</button>
            </motion.main>
          )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function CipherTv({ concept }: { concept: (typeof cipherConcepts)[number] }) {
  const ranking = [
    ["01", "АНЯ", "100"],
    ["02", "КАТЯ", "80"],
    ["03", "МАКС", "60"],
    ["04", "ДИМА", "40"],
  ];

  return (
    <div className="wai-preview-device-column wai-preview-tv-column wai-cipher-tv-column">
      <DeviceLabel tv />
      <div className="wai-preview-tv-shell">
        <div className={`wai-cipher-tv cipher-${concept.id}`}>
          <div className="wai-cipher-tv-ambient" aria-hidden="true"><i /><i /></div>
          <header><b>КТО Я?</b><span>РАУНД 1 · КАТЯ ХОДИТ</span><em>2 / 6 УГАДАЛИ</em></header>
          <main>
            <section className="wai-cipher-tv-stage">
              <div className="wai-cipher-tv-player"><span>К</span><small>СЕЙЧАС ХОДИТ</small><h3>КАТЯ</h3><p>Задаёт вопрос о себе</p></div>
              <CipherGlassStack streak={0} compact autoDemo />
              <div className="wai-cipher-tv-streak"><span>«ДА» ПОДРЯД</span><b>0 → 3</b></div>
            </section>
            <aside className="wai-cipher-tv-ranking"><small>РЕЙТИНГ</small>{ranking.map(([place, name, score]) => <div key={name} className={name === "КАТЯ" ? "is-current" : ""}><span>{place}</span><b>{name}</b><strong>{score}</strong></div>)}</aside>
          </main>
          <footer><span>НА ТЕЛЕФОНЕ КАТИ</span><b>НЕТ · Я ЗНАЮ! · ДА</b></footer>
        </div>
      </div>
    </div>
  );
}

function CipherConceptSection({ concept }: { concept: (typeof cipherConcepts)[number] }) {
  const [motionKey, setMotionKey] = useState(0);

  return (
    <section id={`cipher-${concept.id}`} className={`wai-preview-concept wai-cipher-concept cipher-concept-${concept.id}`}>
      <div className="wai-preview-concept-head">
        <div className="wai-preview-concept-number">{concept.number}</div>
        <div className="wai-preview-concept-copy">
          <span>{concept.subtitle}</span>
          <h2>{concept.name}</h2>
          <p>{concept.description}</p>
          <div className="wai-preview-tags"><i>ЗАШИФРОВАННАЯ ЛИЧНОСТЬ</i><i>ТЁМНОЕ СТЕКЛО</i><i>ТОТ ЖЕ ФУНКЦИОНАЛ</i></div>
        </div>
        <button type="button" className="wai-preview-replay" onClick={() => setMotionKey((key) => key + 1)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 7v5h-5M19 12a7 7 0 1 0-2 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Повторить анимации
        </button>
      </div>
      <div key={motionKey} className="wai-preview-devices"><CipherPhone concept={concept} /><CipherTv concept={concept} /></div>
      <div className="wai-preview-motion-notes">
        <b>ХАРАКТЕР ДВИЖЕНИЯ</b>
        <span><i>1</i>каждое «Да» плавно сдвигает один слой стекла</span>
        <span><i>2</i>фон живёт лёгким параллаксом без яркого свечения</span>
        <span><i>3</i>символы редко перестраиваются внутри глубины</span>
      </div>
    </section>
  );
}

function ConceptSection({ concept }: { concept: Concept }) {
  const [motionKey, setMotionKey] = useState(0);
  const style = { "--wai-accent": concept.accent, "--wai-secondary": concept.secondary } as CSSProperties;

  return (
    <section id={concept.id} className={`wai-preview-concept concept-${concept.id}`} style={style}>
      <div className="wai-preview-concept-head">
        <div className="wai-preview-concept-number">{concept.number}</div>
        <div className="wai-preview-concept-copy">
          <span>{concept.subtitle}</span>
          <h2>{concept.name}</h2>
          <p>{concept.description}</p>
          <div className="wai-preview-tags">{concept.tags.map((tag) => <i key={tag}>{tag}</i>)}</div>
        </div>
        <button type="button" className="wai-preview-replay" onClick={() => setMotionKey((key) => key + 1)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 7v5h-5M19 12a7 7 0 1 0-2 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Повторить анимацию
        </button>
      </div>

      <div className="wai-preview-devices">
        <PhoneMockup concept={concept} motionKey={motionKey} />
        <TvMockup concept={concept} motionKey={motionKey} />
      </div>

      <div className="wai-preview-motion-notes">
        <b>ХАРАКТЕР ДВИЖЕНИЯ</b>
        {concept.motion.map((item, index) => <span key={item}><i>{index + 1}</i>{item}</span>)}
      </div>
    </section>
  );
}

const clayPhoneScreens: Array<{ id: ClayPhoneScreenId; number: string; title: string; note: string }> = [
  { id: "lobby-host", number: "01", title: "Лобби · хост", note: "Состав игроков и запуск" },
  { id: "lobby-player", number: "02", title: "Лобби · игрок", note: "Ожидание ведущего" },
  { id: "turn", number: "03", title: "Твой ход", note: "Первый вопрос" },
  { id: "streak", number: "04", title: "Серия «Да»", note: "Два ответа подряд" },
  { id: "waiting", number: "05", title: "Чужой ход", note: "Ответы вслух" },
  { id: "guess", number: "06", title: "Я знаю!", note: "Ввод персонажа" },
  { id: "confirm", number: "07", title: "Оспаривание", note: "Нет точного совпадения" },
  { id: "judge", number: "08", title: "Судья", note: "Сравнение двух ответов" },
  { id: "wrong", number: "09", title: "Неверно", note: "Возврат в игру" },
  { id: "correct", number: "10", title: "Угадано", note: "Раскрытие персонажа" },
  { id: "guessed", number: "11", title: "Уже угадал", note: "Наблюдение за игрой" },
  { id: "results", number: "12", title: "Финал", note: "Рейтинг и персонажи" },
];

const clayTvScreens: Array<{ id: ClayTvScreenId; number: string; title: string; note: string }> = [
  { id: "lobby", number: "01", title: "Сбор игроков", note: "QR, код и состав комнаты" },
  { id: "turn", number: "02", title: "Игра", note: "Активный игрок и серия «Да»" },
  { id: "dispute", number: "03", title: "Оспаривание", note: "Вердикт остаётся приватным" },
  { id: "wrong", number: "04", title: "Неверная попытка", note: "Общий результат без раскрытия" },
  { id: "correct", number: "05", title: "Личность раскрыта", note: "Персонаж и начисленные очки" },
  { id: "results", number: "06", title: "Финал", note: "Полный рейтинг игры" },
];

const clayFlowPlayers = [
  ["А", "АНЯ", "100"],
  ["М", "МАКС", "60"],
  ["К", "КАТЯ", "80"],
  ["Д", "ДИМА", "40"],
];

function ClayBlob({ letter, active = false }: { letter: string; active?: boolean }) {
  return <span className={`wai-clay-blob${active ? " is-active" : ""}`}>{letter}</span>;
}

function ClayPhoneHeader() {
  return (
    <header className="wai-clay-phone-header">
      <span><WhoAmIIcon name="profile" /><b>КТО Я?</b></span>
      <em>A7QX</em>
    </header>
  );
}

function ClayMiniRoster({ current = "К" }: { current?: string }) {
  return (
    <div className="wai-clay-mini-roster">
      {clayFlowPlayers.map(([letter, name]) => (
        <span key={name} className={letter === current ? "is-current" : ""}>
          <ClayBlob letter={letter} active={letter === current} />
          <small>{name}</small>
        </span>
      ))}
    </div>
  );
}

function ClayAnswerDeck({ streak = 0 }: { streak?: number }) {
  return (
    <div className="wai-clay-answer-deck">
      <button type="button" className="is-no"><WhoAmIIcon name="cross" /><b>НЕТ</b><small>передать ход</small></button>
      <button type="button" className="is-guess"><WhoAmIIcon name="profile" /><b>Я ЗНАЮ!</b><small>назвать персонажа</small></button>
      <button type="button" className="is-yes"><WhoAmIIcon name="check" /><b>ДА</b><small>{streak >= 2 ? "ещё один" : "ещё вопрос"}</small></button>
    </div>
  );
}

function ClayPhoneScene({ id }: { id: ClayPhoneScreenId }) {
  const ranking = [
    ["1", "АНЯ", "КЛЕОПАТРА", "100"],
    ["2", "КАТЯ", "ЧЕБУРАШКА", "80"],
    ["3", "МАКС", "ГАРРИ ПОТТЕР", "60"],
    ["4", "ДИМА", "ШРЕК", "40"],
  ];

  if (id === "lobby-host" || id === "lobby-player") {
    return (
      <>
        <ClayPhoneHeader />
        <main className="wai-clay-phone-body wai-clay-lobby">
          <span className="wai-clay-kicker">КОМНАТА ГОТОВА</span>
          <h3>Кто скрывается<br/>внутри?</h3>
          <div className="wai-clay-secret-toy"><i /><i /><WhoAmIIcon name="profile" /><strong>?</strong></div>
          <div className="wai-clay-lobby-list">
            {clayFlowPlayers.map(([letter, name], index) => <div key={name}><ClayBlob letter={letter} /><b>{name}</b>{index === 0 && <WhoAmIIcon name="star" />}</div>)}
          </div>
          {id === "lobby-host" ? <button type="button" className="wai-clay-main-button">НАЧАТЬ ИГРУ <WhoAmIIcon name="pointer" /></button> : <div className="wai-clay-wait-pill"><i /> ВЕДУЩИЙ ЗАПУСКАЕТ ИГРУ</div>}
        </main>
      </>
    );
  }

  if (id === "turn" || id === "streak") {
    const streak = id === "streak" ? 2 : 0;
    return (
      <>
        <ClayPhoneHeader />
        <main className="wai-clay-phone-body wai-clay-turn">
          <ClayMiniRoster />
          <section className="wai-clay-active-card">
            <div><ClayBlob letter="К" active /><span><small>ТВОЙ ХОД</small><b>КАТЯ</b></span></div>
            <p>{streak === 2 ? "Ты почти раскрыла персонажа" : "Задай вопрос о себе"}</p>
          </section>
          <div className={`wai-clay-mystery streak-${streak}`}>
            <i /><i /><i />
            <span><WhoAmIIcon name="profile" /><strong>?</strong></span>
            <small>ПЕРСОНАЖ СКРЫТ</small>
          </div>
          <div className="wai-clay-streak"><span>«ДА» ПОДРЯД</span><div>{[0, 1, 2].map((dot) => <i key={dot} className={dot < streak ? "is-filled" : ""} />)}</div><b>{streak}/3</b></div>
          <ClayAnswerDeck streak={streak} />
        </main>
      </>
    );
  }

  if (id === "waiting" || id === "guessed") {
    return (
      <>
        <ClayPhoneHeader />
        <main className="wai-clay-phone-body wai-clay-observer">
          <ClayMiniRoster current="М" />
          <div className="wai-clay-observer-stage">
            <ClayBlob letter={id === "guessed" ? "К" : "М"} active />
            <small>{id === "guessed" ? "ТЫ УЖЕ УГАДАЛА" : "СЕЙЧАС ХОДИТ"}</small>
            <h3>{id === "guessed" ? "КАТЯ" : "МАКС"}</h3>
            <p>{id === "guessed" ? "Твой персонаж — Чебурашка. Наблюдай за остальными." : "Отвечай на вопросы Макса вслух: только «Да» или «Нет»."}</p>
          </div>
          <div className="wai-clay-soft-message"><WhoAmIIcon name={id === "guessed" ? "celebrate" : "profile"} /><span><b>{id === "guessed" ? "+80 ОЧКОВ" : "ЖДИ СВОЙ ХОД"}</b><small>{id === "guessed" ? "2 место сейчас" : "персонаж Макса виден только тебе"}</small></span></div>
        </main>
      </>
    );
  }

  if (id === "guess") {
    return (
      <main className="wai-clay-phone-body wai-clay-focus-state">
        <button type="button" className="wai-clay-close">ОТМЕНА</button>
        <div className="wai-clay-focus-icon"><WhoAmIIcon name="profile" /></div>
        <span className="wai-clay-kicker">ПОПЫТКА УГАДАТЬ</span>
        <h3>Кто ты?</h3>
        <label><small>ИМЯ ПЕРСОНАЖА</small><b>Чебурашка<i /></b></label>
        <p>Если написание отличается, попытку можно передать другому игроку на проверку.</p>
        <button type="button" className="wai-clay-main-button">УГАДАТЬ</button>
      </main>
    );
  }

  if (id === "confirm") {
    return (
      <main className="wai-clay-phone-body wai-clay-focus-state is-warm">
        <div className="wai-clay-focus-icon"><WhoAmIIcon name="pointer" /></div>
        <span className="wai-clay-kicker">НЕ СОВПАЛО АВТОМАТИЧЕСКИ</span>
        <h3>Это всё равно<br/>верный ответ?</h3>
        <div className="wai-clay-quote"><small>ТВОЙ ОТВЕТ</small><b>«Чебурашка»</b></div>
        <p>Случайный игрок увидит ответ и настоящего персонажа. Его решение окончательное.</p>
        <button type="button" className="wai-clay-main-button">ПОДТВЕРДИТЬ</button>
      </main>
    );
  }

  if (id === "judge") {
    return (
      <main className="wai-clay-phone-body wai-clay-focus-state wai-clay-judge">
        <div className="wai-clay-focus-icon"><WhoAmIIcon name="profile" /></div>
        <span className="wai-clay-kicker">ТЫ — СУДЬЯ</span>
        <h3>Засчитать<br/>ответ Кати?</h3>
        <div className="wai-clay-compare"><article><small>ОТВЕТ КАТИ</small><b>Чебурашка</b></article><i>≈</i><article><small>ПЕРСОНАЖ</small><b>Чебурашка</b></article></div>
        <p>Твой вердикт увидят все игроки.</p>
        <div className="wai-clay-verdict"><button type="button"><WhoAmIIcon name="cross" />ОТКЛОНИТЬ</button><button type="button"><WhoAmIIcon name="check" />ВЕРНО</button></div>
      </main>
    );
  }

  if (id === "wrong" || id === "correct") {
    const correct = id === "correct";
    return (
      <main className={`wai-clay-phone-body wai-clay-reveal${correct ? " is-correct" : " is-wrong"}`}>
        <div className="wai-clay-reveal-burst" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className="wai-clay-reveal-mark"><WhoAmIIcon name={correct ? "celebrate" : "cross"} /></div>
        <span className="wai-clay-kicker">{correct ? "ЛИЧНОСТЬ РАСКРЫТА" : "НЕВЕРНАЯ ПОПЫТКА"}</span>
        <h3>{correct ? "Ты —\nЧебурашка!" : "Пока\nне угадала"}</h3>
        <div className="wai-clay-score">{correct ? "+80 ОЧКОВ" : "ХОД ПЕРЕХОДИТ ДАЛЬШЕ"}</div>
        <p>{correct ? "Понадобилось всего 3 вопроса" : "Персонаж остаётся тайной. Попробуешь снова в следующем круге."}</p>
        <button type="button" className="wai-clay-main-button">{correct ? "СМОТРЕТЬ ИГРУ" : "ПОНЯТНО"}</button>
      </main>
    );
  }

  return (
    <main className="wai-clay-phone-body wai-clay-results">
      <div className="wai-clay-focus-icon"><WhoAmIIcon name="trophy" /></div>
      <span className="wai-clay-kicker">ИГРА ОКОНЧЕНА</span>
      <h3>Все личности<br/>раскрыты</h3>
      <div className="wai-clay-ranking">{ranking.map(([place, name, character, score]) => <article key={name}><span>{place}</span><div><b>{name}</b><small>{character}</small></div><strong>{score}</strong></article>)}</div>
      <button type="button" className="wai-clay-main-button">ИГРАТЬ СНОВА</button>
    </main>
  );
}

function ClayPhoneFrame({ screen }: { screen: (typeof clayPhoneScreens)[number] }) {
  return (
    <article className="wai-clay-flow-item">
      <div className="wai-clay-flow-label"><span>{screen.number}</span><div><b>{screen.title}</b><small>{screen.note}</small></div></div>
      <div className="wai-clay-phone-shell"><div className="wai-clay-phone"><div className="wai-clay-phone-atmosphere" aria-hidden="true"><i /><i /><i /></div><ClayPhoneScene id={screen.id} /></div></div>
    </article>
  );
}

function ClayTvScene({ id }: { id: ClayTvScreenId }) {
  const isOverlay = id === "dispute" || id === "wrong" || id === "correct";
  const ranking = clayFlowPlayers.map(([letter, name, score], index) => [String(index + 1).padStart(2, "0"), letter, name, score]);

  if (id === "lobby") {
    return (
      <main className="wai-clay-tv-lobby">
        <section><div className="wai-clay-tv-logo"><WhoAmIIcon name="profile" /></div><span>PARTY GAMES HUB</span><h3>Кто я?</h3><p>Угадай, кем тебя назначили. Задавай вопросы, на которые можно ответить «Да» или «Нет».</p><div className="wai-clay-tv-people">{clayFlowPlayers.map(([letter, name], index) => <span key={name}><ClayBlob letter={letter} /><b>{name}</b>{index === 0 && <WhoAmIIcon name="star" />}</span>)}</div></section>
        <aside><div className="wai-clay-qr"><i /><i /><i /><i /><i /></div><small>КОД КОМНАТЫ</small><b>A7QX</b><span>partyhub.local/join</span></aside>
      </main>
    );
  }

  if (id === "results") {
    return (
      <main className="wai-clay-tv-results"><div className="wai-clay-tv-title"><div><WhoAmIIcon name="trophy" /></div><span><small>ИГРА ОКОНЧЕНА</small><h3>Все личности раскрыты</h3></span></div><section>{ranking.map(([place, letter, name, score], index) => <article key={name} className={index === 0 ? "is-winner" : ""}><span>{place}</span><ClayBlob letter={letter} active={index === 0} /><div><b>{name}</b><small>{["КЛЕОПАТРА", "ЧЕБУРАШКА", "ГАРРИ ПОТТЕР", "ШРЕК"][index]} · {index + 2} вопроса</small></div><strong>{score}</strong></article>)}</section></main>
    );
  }

  return (
    <>
      <header className="wai-clay-tv-header"><span><WhoAmIIcon name="profile" /><b>КТО Я?</b></span><em>КАТЯ ХОДИТ · «ДА» 2/3</em><strong>2 / 4 УГАДАЛИ</strong></header>
      <main className="wai-clay-tv-game">
        <section className={isOverlay ? "is-dimmed" : ""}>
          <div className="wai-clay-tv-active"><ClayBlob letter="К" active /><span><small>СЕЙЧАС ХОДИТ</small><h3>КАТЯ</h3><p>Задаёт вопрос о себе</p></span></div>
          <div className="wai-clay-tv-mystery"><i /><i /><i /><WhoAmIIcon name="profile" /><strong>?</strong><small>ПЕРСОНАЖ СКРЫТ</small></div>
          <div className="wai-clay-tv-dots"><span>«ДА» ПОДРЯД</span><i className="is-filled" /><i className="is-filled" /><i /></div>
        </section>
        <aside className={isOverlay ? "is-dimmed" : ""}><small>РЕЙТИНГ</small>{ranking.map(([place, letter, name, score]) => <article key={name} className={name === "КАТЯ" ? "is-current" : ""}><span>{place}</span><ClayBlob letter={letter} /><b>{name}</b><strong>{score}</strong></article>)}</aside>
        {isOverlay && <div className={`wai-clay-tv-overlay is-${id}`}><div><WhoAmIIcon name={id === "correct" ? "celebrate" : id === "wrong" ? "cross" : "profile"} /></div><small>{id === "dispute" ? "ОСПАРИВАНИЕ ОТВЕТА" : id === "correct" ? "ЛИЧНОСТЬ РАСКРЫТА" : "НЕВЕРНАЯ ПОПЫТКА"}</small><h3>{id === "dispute" ? "Катя передала ответ судье" : id === "correct" ? "Катя — Чебурашка!" : "Катя пока не угадала"}</h3><p>{id === "dispute" ? "Вердикт принимается на телефоне случайного игрока" : id === "correct" ? "+80 очков · 3 вопроса" : "Персонаж остаётся скрытым"}</p></div>}
      </main>
      <footer className="wai-clay-tv-footer"><span>{id === "dispute" ? "ОЖИДАЕМ РЕШЕНИЕ СУДЬИ" : "НА ТЕЛЕФОНЕ КАТИ"}</span><b>{id === "dispute" ? "ОТВЕТ НЕ ПОКАЗЫВАЕТСЯ НА TV" : "НЕТ · Я ЗНАЮ! · ДА"}</b></footer>
    </>
  );
}

function ClayTvFrame({ screen }: { screen: (typeof clayTvScreens)[number] }) {
  return (
    <article className="wai-clay-flow-item wai-clay-tv-item">
      <div className="wai-clay-flow-label"><span>{screen.number}</span><div><b>{screen.title}</b><small>{screen.note}</small></div></div>
      <div className="wai-clay-tv-shell"><div className="wai-clay-tv"><div className="wai-clay-tv-atmosphere" aria-hidden="true"><i /><i /><i /></div><ClayTvScene id={screen.id} /></div></div>
    </article>
  );
}

function ClayBlueFullFlow() {
  return (
    <section id="clay-blue-full-flow" className="wai-clay-flow">
      <header className="wai-clay-flow-head">
        <span>УТВЕРЖДЁННОЕ НАПРАВЛЕНИЕ · ПОЛНЫЙ FLOW</span>
        <h2>Голубая<br/><em>пластилиновая ночь</em></h2>
        <p>Полный набор экранов без изменения игровой механики. Мягкие слепленные формы становятся навигацией, состояниями и обратной связью, а фирменный голубой остаётся главным материалом игры.</p>
        <div><i>12 MOBILE</i><i>6 TV</i><i>390 × 844</i><i>1920 × 1080</i></div>
      </header>

      <div className="wai-clay-flow-subhead"><span>01</span><div><b>Телефон игрока</b><small>Все роли и состояния полного игрового цикла</small></div></div>
      <div className="wai-clay-phone-grid">{clayPhoneScreens.map((screen) => <ClayPhoneFrame key={screen.id} screen={screen} />)}</div>

      <div className="wai-clay-flow-subhead is-tv"><span>02</span><div><b>Общий экран · TV</b><small>Публичные состояния без раскрытия приватной информации</small></div></div>
      <div className="wai-clay-tv-grid">{clayTvScreens.map((screen) => <ClayTvFrame key={screen.id} screen={screen} />)}</div>

      <div className="wai-clay-motion-strip"><b>АНИМАЦИОННЫЙ ЯЗЫК</b><span><i>1</i>пластилиновые формы дышат и медленно меняют силуэт</span><span><i>2</i>кнопки продавливаются, а карточки мягко пружинят</span><span><i>3</i>правильный ответ раскрывается из светящейся капсулы</span></div>
    </section>
  );
}

export default function WhoAmIDesignPreviewPage() {
  return (
    <main className="wai-preview-page">
      <header className="wai-preview-intro">
        <nav><Link href="/">PARTY GAMES HUB</Link><span>DESIGN LAB · WHO AM I?</span></nav>
        <div className="wai-preview-intro-grid">
          <div><span className="wai-preview-eyebrow">6 НАПРАВЛЕНИЙ · MOBILE + TV</span><h1>Кто<br/><em>я?</em></h1></div>
          <div><p>Шесть разных ответов на один вопрос: каким должен быть визуальный мир игры про тайную личность?</p><div className="wai-preview-jump">{concepts.map((concept) => <a key={concept.id} href={`#${concept.id}`}><b>{concept.number}</b>{concept.name}</a>)}</div></div>
        </div>
        <div className="wai-preview-scroll"><i /> ЛИСТАЙ, СРАВНИВАЙ, НАЖИМАЙ КНОПКИ</div>
      </header>

      {concepts.map((concept) => <ConceptSection key={concept.id} concept={concept} />)}

      <ClayBlueFullFlow />

      <section id="interface-architectures" className="wai-layout-intro">
        <span>НОВЫЙ ЭТАП ПОИСКА</span>
        <h2>Не перекраска.<br/><em>Новый интерфейс.</em></h2>
        <p>Ещё четыре варианта с другой композицией, геометрией кнопок и иерархией. Функции и игровые состояния те же.</p>
        <nav>{layoutConcepts.map((layout) => <a key={layout.id} href={`#layout-${layout.id}`}><b>{layout.number}</b>{layout.name}</a>)}</nav>
      </section>

      {layoutConcepts.map((layout) => <LayoutConceptSection key={layout.id} layout={layout} />)}

      <section id="encrypted-identity" className="wai-cipher-intro">
        <span>ПРЕДЫДУЩИЙ ЭТАП ПОИСКА</span>
        <h2>Зашифрованная<br/><em>личность.</em></h2>
        <p>Два интерфейса по итогам интервью: тёмное стекло, холодный голубой акцент, активный игрок в центре, лента участников и единая панель из трёх действий.</p>
        <nav>{cipherConcepts.map((concept) => <a key={concept.id} href={`#cipher-${concept.id}`}><b>{concept.number}</b>{concept.name}</a>)}</nav>
      </section>

      {cipherConcepts.map((concept) => <CipherConceptSection key={concept.id} concept={concept} />)}

      <footer className="wai-preview-end"><WhoAmIIcon name="profile" /><span>«Голубая пластилиновая ночь» · полный mobile + TV flow готов к сравнению</span></footer>

      <style jsx global>{`
        :root { color-scheme: dark; }
        html { scroll-behavior: smooth; }
        body { margin: 0; background: #080a0f; }
        * { box-sizing: border-box; }
        button, a { -webkit-tap-highlight-color: transparent; }
        .wai-preview-page { min-height: 100vh; overflow: hidden; background: #080a0f; color: #f7f7f4; font-family: var(--font-geist-sans), Inter, system-ui, sans-serif; }
        .wai-preview-intro { min-height: 92vh; padding: 34px clamp(24px, 5vw, 86px) 54px; background: radial-gradient(circle at 75% 25%, rgba(56,189,248,.12), transparent 32%), radial-gradient(circle at 20% 80%, rgba(196,70,45,.1), transparent 36%), #080a0f; display: flex; flex-direction: column; }
        .wai-preview-intro nav { display: flex; justify-content: space-between; align-items: center; color: #9aa1ac; font: 600 11px/1 var(--font-geist-mono), monospace; letter-spacing: .18em; }
        .wai-preview-intro nav a { color: white; text-decoration: none; }
        .wai-preview-intro-grid { flex: 1; display: grid; grid-template-columns: minmax(320px, 1.05fr) minmax(360px, .95fr); align-items: center; gap: 8vw; max-width: 1500px; width: 100%; margin: 0 auto; }
        .wai-preview-eyebrow { color: #79ddf5; font: 600 12px/1 var(--font-geist-mono), monospace; letter-spacing: .24em; }
        .wai-preview-intro h1 { margin: 22px 0 0; font-size: clamp(110px, 16vw, 250px); line-height: .72; letter-spacing: -.08em; font-weight: 850; }
        .wai-preview-intro h1 em { color: transparent; font-style: normal; -webkit-text-stroke: 2px #79ddf5; }
        .wai-preview-intro-grid > div:last-child > p { max-width: 610px; margin: 0 0 42px; color: #c4c7cd; font-size: clamp(23px, 2.1vw, 36px); line-height: 1.18; letter-spacing: -.03em; }
        .wai-preview-jump { display: grid; gap: 2px; }
        .wai-preview-jump a { display: grid; grid-template-columns: 48px 1fr; padding: 16px 18px; border-top: 1px solid #282c33; color: #b4bac4; text-decoration: none; font-size: 17px; transition: color .25s, padding-left .25s, background .25s; }
        .wai-preview-jump a:last-child { border-bottom: 1px solid #282c33; }
        .wai-preview-jump a:hover { padding-left: 26px; color: white; background: rgba(255,255,255,.035); }
        .wai-preview-jump b { color: #626b79; font: 500 12px/1.5 var(--font-geist-mono), monospace; }
        .wai-preview-scroll { display: flex; align-items: center; gap: 12px; color: #69717d; font: 600 10px/1 var(--font-geist-mono), monospace; letter-spacing: .18em; }
        .wai-preview-scroll i { width: 48px; height: 1px; background: #69717d; animation: wai-scroll-line 1.8s ease-in-out infinite; transform-origin: left; }
        @keyframes wai-scroll-line { 50% { transform: scaleX(.35); opacity: .45; } }

        .wai-preview-concept { position: relative; min-height: 100vh; padding: 76px clamp(18px, 4vw, 72px) 92px; border-top: 1px solid rgba(255,255,255,.1); overflow: hidden; isolation: isolate; }
        .wai-preview-concept::before { content: ""; position: absolute; inset: 0; z-index: -2; }
        .wai-preview-concept::after { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none; }
        .wai-preview-concept-head { max-width: 1600px; margin: 0 auto 44px; display: grid; grid-template-columns: 80px minmax(0, 1fr) auto; gap: 28px; align-items: start; }
        .wai-preview-concept-number { color: var(--wai-accent); font: 500 16px/1 var(--font-geist-mono), monospace; }
        .wai-preview-concept-copy > span { color: var(--wai-accent); font: 650 11px/1 var(--font-geist-mono), monospace; letter-spacing: .18em; }
        .wai-preview-concept-copy h2 { margin: 12px 0 10px; font-size: clamp(42px, 5vw, 78px); line-height: .95; letter-spacing: -.055em; }
        .wai-preview-concept-copy p { max-width: 780px; margin: 0; color: rgba(255,255,255,.62); font-size: 18px; line-height: 1.5; }
        .wai-preview-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
        .wai-preview-tags i { border: 1px solid color-mix(in srgb, var(--wai-accent) 34%, transparent); border-radius: 999px; padding: 7px 11px; color: color-mix(in srgb, var(--wai-accent) 80%, white); font: 500 10px/1 var(--font-geist-mono), monospace; letter-spacing: .08em; font-style: normal; text-transform: uppercase; }
        .wai-preview-replay { display: flex; align-items: center; gap: 9px; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; padding: 12px 16px; background: rgba(255,255,255,.06); color: inherit; cursor: pointer; font: 600 12px/1 var(--font-geist-sans), sans-serif; transition: transform .2s, background .2s; }
        .wai-preview-replay:hover { transform: translateY(-2px); background: rgba(255,255,255,.11); }
        .wai-preview-replay:active { transform: scale(.97); }
        .wai-preview-replay svg { width: 18px; }
        .wai-preview-devices { max-width: 1600px; margin: 0 auto; display: grid; grid-template-columns: minmax(280px, 360px) minmax(600px, 1fr); gap: clamp(28px, 4vw, 64px); align-items: end; }
        .wai-preview-device-column { min-width: 0; }
        .wai-preview-device-label { display: flex; justify-content: space-between; margin-bottom: 11px; color: rgba(255,255,255,.47); font: 600 9px/1 var(--font-geist-mono), monospace; letter-spacing: .12em; text-transform: uppercase; }
        .wai-preview-device-label b { color: var(--wai-accent); }
        .wai-preview-phone-shell { position: relative; width: 100%; aspect-ratio: 390/844; border: 7px solid #17181c; border-radius: 45px; padding: 6px; background: #030405; box-shadow: 0 34px 70px -26px rgba(0,0,0,.75), inset 0 0 0 1px #3b3e43; overflow: hidden; }
        .wai-preview-phone-shell::before { content: ""; position: absolute; z-index: 20; top: 14px; left: 50%; width: 31%; height: 25px; border-radius: 999px; background: #050506; transform: translateX(-50%); }
        .wai-preview-phone { position: relative; width: 100%; height: 100%; border-radius: 34px; overflow: hidden; display: flex; flex-direction: column; padding: 16px 16px 14px; }
        .wai-phone-atmosphere { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
        .wai-phone-atmosphere i { position: absolute; display: block; }
        .wai-phone-status { position: relative; z-index: 2; display: flex; justify-content: space-between; padding: 3px 7px 14px; font-size: 9px; font-weight: 700; }
        .wai-phone-status b { letter-spacing: 2px; font-size: 7px; }
        .wai-phone-header { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; padding: 7px 2px 12px; }
        .wai-phone-brand { display: flex; align-items: center; gap: 8px; }
        .wai-phone-brand > svg { width: 24px; height: 24px; padding: 4px; border-radius: 8px; background: var(--wai-accent); color: #071014; }
        .wai-phone-brand span { display: flex; flex-direction: column; }
        .wai-phone-brand b { font-size: 12px; line-height: 1; letter-spacing: -.02em; }
        .wai-phone-brand small { margin-top: 3px; opacity: .46; font-size: 6px; letter-spacing: .16em; }
        .wai-phone-header em { padding: 6px 8px; border-radius: 999px; background: rgba(255,255,255,.08); font: 600 7px/1 var(--font-geist-mono), monospace; letter-spacing: .12em; font-style: normal; }
        .wai-phone-main { position: relative; z-index: 2; flex: 1; min-height: 0; display: flex; flex-direction: column; }
        .wai-phone-kicker { display: flex; align-items: center; gap: 7px; margin-top: 8px; color: var(--wai-accent); font: 650 8px/1 var(--font-geist-mono), monospace; letter-spacing: .17em; }
        .wai-phone-kicker i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 12px currentColor; }
        .wai-phone-main > h3 { margin: 8px 0 5px; font-size: clamp(24px, 2.2vw, 36px); line-height: .9; letter-spacing: -.055em; }
        .wai-phone-main > h3 span { color: var(--wai-accent); }
        .wai-phone-instruction { margin: 0 0 12px; max-width: 270px; color: rgba(255,255,255,.48); font-size: 9px; line-height: 1.4; }
        .wai-phone-identity-card { position: relative; display: grid; grid-template-columns: 38px 1fr auto; align-items: center; gap: 10px; min-height: 66px; padding: 10px 13px; border-radius: 17px; overflow: hidden; }
        .wai-phone-hidden-mark { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--wai-accent) 15%, transparent); color: var(--wai-accent); }
        .wai-phone-hidden-mark svg { width: 22px; }
        .wai-phone-identity-card div:nth-child(2) { display: flex; flex-direction: column; }
        .wai-phone-identity-card small { color: rgba(255,255,255,.42); font: 600 6px/1 var(--font-geist-mono), monospace; letter-spacing: .13em; }
        .wai-phone-identity-card b { margin-top: 4px; font-size: 13px; }
        .wai-phone-identity-card strong { color: var(--wai-accent); font-size: 35px; line-height: 1; }
        .wai-phone-roster { display: grid; gap: 5px; margin-top: 10px; }
        .wai-phone-roster > div { display: flex; align-items: center; gap: 8px; min-height: 43px; padding: 5px 8px; border-radius: 13px; }
        .wai-phone-roster > div > span:nth-child(2) { display: flex; min-width: 0; flex: 1; flex-direction: column; }
        .wai-phone-roster b { font-size: 10px; }
        .wai-phone-roster small { overflow: hidden; color: rgba(255,255,255,.45); font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }
        .wai-phone-roster > div > svg { width: 16px; color: var(--wai-accent); animation: wai-pointer 1.2s ease-in-out infinite; }
        @keyframes wai-pointer { 50% { transform: translateX(4px); } }
        .wai-preview-avatar { width: 60px; height: 60px; flex: 0 0 auto; border-radius: 50%; display: inline-grid; place-items: center; background: linear-gradient(145deg, color-mix(in srgb, var(--wai-secondary) 74%, white), var(--wai-secondary)); color: white; font-weight: 800; box-shadow: inset 0 1px rgba(255,255,255,.35); }
        .wai-preview-avatar.is-small { width: 29px; height: 29px; font-size: 10px; }
        .wai-phone-streak { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding: 9px 11px; border-radius: 13px; color: rgba(255,255,255,.55); font: 600 7px/1 var(--font-geist-mono), monospace; letter-spacing: .13em; }
        .wai-phone-streak div { display: flex; gap: 5px; }
        .wai-phone-streak i { width: 21px; height: 5px; border-radius: 999px; background: rgba(255,255,255,.12); transition: transform .3s, background .3s, box-shadow .3s; }
        .wai-phone-streak i.is-filled { background: var(--wai-accent); box-shadow: 0 0 12px color-mix(in srgb, var(--wai-accent) 55%, transparent); transform: scaleY(1.25); }
        .wai-phone-actions { position: relative; z-index: 3; display: flex; flex-direction: column; gap: 6px; padding-top: 9px; }
        .wai-phone-actions > div { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .wai-phone-actions button { min-height: 38px; border: 1px solid rgba(255,255,255,.16); border-radius: 13px; background: rgba(255,255,255,.08); color: inherit; cursor: pointer; font: 750 9px/1 var(--font-geist-sans), sans-serif; letter-spacing: .08em; transition: transform .16s, filter .16s; }
        .wai-phone-actions button:hover { filter: brightness(1.12); }
        .wai-phone-actions button:active { transform: scale(.94); }
        .wai-phone-actions button svg { width: 13px; margin-right: 5px; vertical-align: -3px; }
        .wai-phone-actions button.is-primary { border-color: transparent; background: var(--wai-accent); color: #071014; box-shadow: 0 9px 24px -12px var(--wai-accent); }
        .wai-phone-guess-card, .wai-phone-win-card { flex: 1; margin: 12px 0 4px; padding: 26px 18px; border-radius: 25px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; animation: wai-card-arrive .65s cubic-bezier(.2,.8,.2,1.2) both; }
        @keyframes wai-card-arrive { from { opacity: 0; transform: translateY(24px) scale(.9) rotate(-2deg); } }
        .wai-phone-guess-icon { width: 58px; height: 58px; border-radius: 19px; display: grid; place-items: center; background: var(--wai-accent); color: #071014; box-shadow: 0 14px 32px -14px var(--wai-accent); }
        .wai-phone-guess-icon svg { width: 30px; }
        .wai-phone-guess-card > small, .wai-phone-win-card > small { margin-top: 16px; color: var(--wai-accent); font: 650 7px/1 var(--font-geist-mono), monospace; letter-spacing: .17em; }
        .wai-phone-guess-card h3, .wai-phone-win-card h3 { margin: 7px 0 18px; font-size: 25px; letter-spacing: -.05em; }
        .wai-phone-guess-card label { width: 100%; padding: 12px 14px; border: 1px solid var(--wai-accent); border-radius: 15px; text-align: left; box-shadow: 0 0 0 3px color-mix(in srgb, var(--wai-accent) 12%, transparent); }
        .wai-phone-guess-card label span { display: block; opacity: .42; font: 600 6px/1 var(--font-geist-mono), monospace; letter-spacing: .14em; }
        .wai-phone-guess-card label b { display: inline-block; margin-top: 6px; font-size: 16px; }
        .wai-phone-guess-card label i { display: inline-block; width: 1px; height: 17px; margin-left: 2px; background: var(--wai-accent); vertical-align: -3px; animation: wai-blink 1s steps(1) infinite; }
        @keyframes wai-blink { 50% { opacity: 0; } }
        .wai-phone-guess-card p, .wai-phone-win-card p { margin: 13px 0 0; color: rgba(255,255,255,.45); font-size: 8px; line-height: 1.4; }
        .wai-phone-win-card > svg { width: 68px; color: var(--wai-accent); animation: wai-win-pop .8s cubic-bezier(.2,.8,.2,1.3) both; }
        @keyframes wai-win-pop { from { transform: scale(.25) rotate(-45deg); opacity: 0; } 65% { transform: scale(1.18) rotate(7deg); } }
        .wai-phone-win-card > b { padding: 7px 12px; border-radius: 999px; background: color-mix(in srgb, var(--wai-accent) 15%, transparent); color: var(--wai-accent); font: 700 9px/1 var(--font-geist-mono), monospace; }
        .wai-phone-win-burst { position: absolute; width: 180px; height: 180px; }
        .wai-phone-win-burst i { position: absolute; left: 50%; top: 50%; width: 5px; height: 30px; border-radius: 5px; background: var(--wai-accent); transform-origin: 50% 90px; animation: wai-ray 1s ease-out both; }
        .wai-phone-win-burst i:nth-child(1) { transform: translate(-50%,-90px) rotate(0deg); } .wai-phone-win-burst i:nth-child(2) { transform: translate(-50%,-90px) rotate(30deg); } .wai-phone-win-burst i:nth-child(3) { transform: translate(-50%,-90px) rotate(60deg); } .wai-phone-win-burst i:nth-child(4) { transform: translate(-50%,-90px) rotate(90deg); } .wai-phone-win-burst i:nth-child(5) { transform: translate(-50%,-90px) rotate(120deg); } .wai-phone-win-burst i:nth-child(6) { transform: translate(-50%,-90px) rotate(150deg); } .wai-phone-win-burst i:nth-child(7) { transform: translate(-50%,-90px) rotate(180deg); } .wai-phone-win-burst i:nth-child(8) { transform: translate(-50%,-90px) rotate(210deg); } .wai-phone-win-burst i:nth-child(9) { transform: translate(-50%,-90px) rotate(240deg); } .wai-phone-win-burst i:nth-child(10) { transform: translate(-50%,-90px) rotate(270deg); } .wai-phone-win-burst i:nth-child(11) { transform: translate(-50%,-90px) rotate(300deg); } .wai-phone-win-burst i:nth-child(12) { transform: translate(-50%,-90px) rotate(330deg); }
        @keyframes wai-ray { from { opacity: 0; height: 0; } 45% { opacity: .8; } to { opacity: 0; height: 30px; } }

        .wai-preview-tv-shell { width: 100%; aspect-ratio: 16/9; border: 8px solid #17181c; border-radius: 25px; padding: 5px; background: #030405; box-shadow: 0 35px 80px -30px rgba(0,0,0,.8), inset 0 0 0 1px #3b3e43; overflow: hidden; }
        .wai-preview-tv { position: relative; width: 100%; height: 100%; border-radius: 13px; overflow: hidden; display: flex; flex-direction: column; padding: 2.4% 3%; }
        .wai-tv-atmosphere { position: absolute; inset: 0; pointer-events: none; }
        .wai-tv-atmosphere i { position: absolute; display: block; }
        .wai-tv-header { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; }
        .wai-tv-brand { display: flex; align-items: center; gap: 9px; }
        .wai-tv-brand > span { width: 37px; height: 37px; border-radius: 12px; display: grid; place-items: center; background: var(--wai-accent); color: #071014; }
        .wai-tv-brand svg { width: 23px; }
        .wai-tv-brand div { display: flex; flex-direction: column; }
        .wai-tv-brand b { font-size: clamp(10px, 1.15vw, 19px); line-height: 1; }
        .wai-tv-brand small { margin-top: 4px; opacity: .42; font-size: clamp(4px, .45vw, 7px); letter-spacing: .15em; }
        .wai-tv-now, .wai-tv-progress { border: 1px solid rgba(255,255,255,.13); background: rgba(255,255,255,.07); backdrop-filter: blur(12px); }
        .wai-tv-now { display: flex; align-items: baseline; gap: 8px; border-radius: 999px; padding: 8px 14px; }
        .wai-tv-now small { opacity: .4; font: 600 clamp(4px,.45vw,7px)/1 var(--font-geist-mono), monospace; letter-spacing: .13em; }
        .wai-tv-now b { color: var(--wai-accent); font-size: clamp(9px, 1vw, 16px); }
        .wai-tv-progress { justify-self: end; display: flex; align-items: center; gap: 6px; border-radius: 999px; padding: 8px 12px; font-size: clamp(6px,.7vw,11px); }
        .wai-tv-progress svg { width: 14px; color: var(--wai-accent); }
        .wai-tv-progress span { opacity: .5; }
        .wai-tv-progress b { font-family: var(--font-geist-mono), monospace; color: var(--wai-accent); }
        .wai-tv-main { position: relative; z-index: 2; flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6%; }
        .wai-tv-hero { width: min(72%, 780px); min-height: 57%; border-radius: 23px; padding: 3.5%; display: flex; flex-direction: column; gap: 14%; }
        .wai-tv-hero-person { display: flex; align-items: center; gap: 5%; }
        .wai-tv-avatar-orbit { position: relative; width: clamp(68px, 9vw, 142px); aspect-ratio: 1; flex: 0 0 auto; display: grid; place-items: center; }
        .wai-tv-avatar-orbit span { position: relative; z-index: 2; width: 72%; height: 72%; display: grid; place-items: center; border-radius: 50%; background: linear-gradient(145deg, var(--wai-secondary), color-mix(in srgb, var(--wai-secondary) 65%, black)); color: white; font-size: clamp(28px, 4.4vw, 70px); font-weight: 800; box-shadow: inset 0 2px rgba(255,255,255,.28); }
        .wai-tv-avatar-orbit i { position: absolute; inset: 7%; border: 1px solid color-mix(in srgb, var(--wai-accent) 64%, transparent); border-radius: 50%; animation: wai-orbit 3.4s linear infinite; }
        .wai-tv-avatar-orbit i:last-child { inset: 0; border-style: dashed; opacity: .4; animation-direction: reverse; animation-duration: 6s; }
        @keyframes wai-orbit { to { transform: rotate(360deg); } }
        .wai-tv-hero-person > div:last-child small { color: var(--wai-accent); font: 650 clamp(5px,.55vw,9px)/1 var(--font-geist-mono), monospace; letter-spacing: .17em; }
        .wai-tv-hero-person h3 { margin: 3px 0; font-size: clamp(34px, 6vw, 96px); line-height: .85; letter-spacing: -.06em; }
        .wai-tv-hero-person p { display: inline-flex; gap: 6px; margin: 5px 0 0; border-radius: 999px; padding: 5px 8px; background: color-mix(in srgb, var(--wai-accent) 12%, transparent); color: rgba(255,255,255,.5); font-size: clamp(5px,.6vw,10px); }
        .wai-tv-hero-person p b { color: var(--wai-accent); }
        .wai-tv-hidden-card { position: relative; min-height: 40%; display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 3%; padding: 2.8% 3.5%; border-radius: 18px; overflow: hidden; }
        .wai-tv-hidden-card > span { width: clamp(35px,4.3vw,68px); aspect-ratio: 1; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, var(--wai-accent) 13%, transparent); color: var(--wai-accent); }
        .wai-tv-hidden-card svg { width: 55%; }
        .wai-tv-hidden-card div { display: flex; flex-direction: column; }
        .wai-tv-hidden-card small { opacity: .42; font: 600 clamp(4px,.42vw,7px)/1 var(--font-geist-mono), monospace; letter-spacing: .14em; }
        .wai-tv-hidden-card b { margin-top: 5px; font-size: clamp(9px,1.3vw,21px); }
        .wai-tv-hidden-card p { margin: 2px 0 0; opacity: .38; font-size: clamp(5px,.62vw,10px); }
        .wai-tv-hidden-card strong { color: var(--wai-accent); opacity: .6; font-size: clamp(45px, 7vw, 112px); line-height: .7; animation: wai-question-breathe 2.8s ease-in-out infinite; }
        @keyframes wai-question-breathe { 50% { transform: scale(1.08) rotate(4deg); opacity: 1; } }
        .wai-tv-player-strip { display: flex; justify-content: center; gap: 1%; width: 88%; }
        .wai-tv-player-strip > div { min-width: 0; display: flex; align-items: center; gap: 5px; flex: 1; border: 1px solid rgba(255,255,255,.1); border-radius: 999px; padding: 4px 6px; background: rgba(255,255,255,.055); }
        .wai-tv-player-strip .wai-preview-avatar { width: clamp(19px,2.3vw,37px); height: clamp(19px,2.3vw,37px); font-size: clamp(6px,.75vw,12px); }
        .wai-tv-player-strip b { min-width: 0; overflow: hidden; flex: 1; opacity: .65; font-size: clamp(5px,.7vw,11px); text-overflow: ellipsis; white-space: nowrap; }
        .wai-tv-player-strip svg { width: 12px; color: #64e395; }
        .wai-tv-player-strip .is-current { border-color: color-mix(in srgb, var(--wai-accent) 55%, transparent); background: color-mix(in srgb, var(--wai-accent) 12%, transparent); }
        .wai-tv-footer { position: relative; z-index: 2; display: flex; align-items: center; gap: 8px; font-size: clamp(5px,.55vw,9px); }
        .wai-tv-footer span { opacity: .38; }
        .wai-tv-footer b { color: var(--wai-accent); }
        .wai-tv-footer em { margin-left: auto; display: flex; align-items: center; gap: 5px; opacity: .58; font-style: normal; }
        .wai-tv-footer em i { width: 5px; height: 5px; border-radius: 50%; background: #5ce18a; box-shadow: 0 0 8px #5ce18a; }
        .wai-preview-motion-notes { max-width: 1600px; margin: 36px auto 0; display: grid; grid-template-columns: 200px repeat(3, 1fr); gap: 10px; }
        .wai-preview-motion-notes > b, .wai-preview-motion-notes > span { min-height: 58px; display: flex; align-items: center; gap: 9px; border-top: 1px solid rgba(255,255,255,.13); padding: 12px 4px; color: rgba(255,255,255,.57); font-size: 12px; }
        .wai-preview-motion-notes > b { color: var(--wai-accent); font: 650 10px/1.4 var(--font-geist-mono), monospace; letter-spacing: .13em; }
        .wai-preview-motion-notes span i { width: 22px; height: 22px; flex: 0 0 auto; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--wai-accent) 42%, transparent); border-radius: 50%; color: var(--wai-accent); font: 600 8px/1 var(--font-geist-mono), monospace; font-style: normal; }

        .concept-neon::before { background: radial-gradient(circle at 78% 45%, rgba(58,68,210,.25), transparent 28%), radial-gradient(circle at 18% 60%, rgba(0,205,255,.16), transparent 32%), #060916; }
        .concept-neon::after { opacity: .17; background-image: linear-gradient(rgba(102,232,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(102,232,255,.15) 1px, transparent 1px); background-size: 48px 48px; mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent); }
        .wai-phone-neon, .wai-tv-neon { background: radial-gradient(circle at 78% 25%, rgba(80,85,255,.28), transparent 30%), radial-gradient(circle at 10% 70%, rgba(0,220,255,.19), transparent 30%), linear-gradient(145deg,#050919,#0a1029); font-family: var(--font-geist-sans), sans-serif; }
        .wai-phone-neon .wai-phone-identity-card, .wai-phone-neon .wai-phone-streak, .wai-phone-neon .wai-phone-roster > div, .wai-phone-neon .wai-phone-guess-card, .wai-phone-neon .wai-phone-win-card, .wai-tv-neon .wai-tv-hero, .wai-tv-neon .wai-tv-hidden-card { border: 1px solid rgba(102,232,255,.19); background: rgba(8,18,43,.62); box-shadow: inset 0 1px rgba(255,255,255,.06), 0 18px 38px -28px #66e8ff; backdrop-filter: blur(14px); }
        .wai-phone-neon .wai-phone-atmosphere i { width: 180px; height: 1px; top: 30%; left: -40px; background: linear-gradient(90deg,transparent,var(--wai-accent),transparent); box-shadow: 0 0 18px var(--wai-accent); animation: neon-scan 4s ease-in-out infinite; }
        .wai-phone-neon .wai-phone-atmosphere i:nth-child(2) { top: 68%; animation-delay: -2s; }
        @keyframes neon-scan { 50% { transform: translateX(220px); opacity: .2; } }
        .wai-tv-neon .wai-tv-atmosphere i { width: 25%; aspect-ratio: 1; border: 1px solid rgba(102,232,255,.2); border-radius: 50%; right: -5%; top: 18%; animation: neon-ring 8s linear infinite; }
        .wai-tv-neon .wai-tv-atmosphere i:nth-child(2) { width: 36%; right: -11%; top: 8%; animation-direction: reverse; }
        @keyframes neon-ring { to { transform: rotate(360deg) scale(1.08); } }
        .wai-tv-neon .wai-tv-hero { animation: neon-depth .8s cubic-bezier(.16,.8,.2,1) both; }
        @keyframes neon-depth { from { opacity: 0; transform: perspective(900px) translateZ(-240px) scale(.84); filter: blur(12px); } }

        .concept-kinetic { color: #fff; }
        .concept-kinetic::before { background: linear-gradient(112deg,#5636ff 0 27%,#111 27% 54%,#ff4d00 54% 76%,#d9ff3f 76%); }
        .concept-kinetic::after { opacity: .22; background: linear-gradient(90deg,transparent 0 48%,rgba(255,255,255,.5) 48% 49%,transparent 49%),linear-gradient(12deg,transparent 0 65%,rgba(255,255,255,.28) 65% 66%,transparent 66%); animation: kinetic-field 6s ease-in-out infinite alternate; }
        .concept-kinetic .wai-preview-concept-copy h2 { font-family: Impact, "Arial Black", sans-serif; font-weight: 900; letter-spacing: -.045em; text-transform: uppercase; }
        .concept-kinetic .wai-preview-tags i, .concept-kinetic .wai-preview-replay { border: 2px solid currentColor; border-radius: 0; background: #111; color: white; box-shadow: 5px 5px 0 #d9ff3f; }
        .wai-phone-kinetic, .wai-tv-kinetic { background: linear-gradient(155deg,#5636ff 0 28%,#121212 28% 68%,#ff4d00 68%); color: white; font-family: "Arial Black", Impact, sans-serif; }
        .wai-phone-kinetic::before, .wai-tv-kinetic::before { content: "?"; position: absolute; right: -8%; top: 9%; color: rgba(217,255,63,.92); font: 900 210px/.8 Impact,sans-serif; transform: rotate(9deg); animation: kinetic-question 3.2s cubic-bezier(.2,.8,.2,1) infinite alternate; }
        .wai-phone-kinetic .wai-phone-brand > svg, .wai-tv-kinetic .wai-tv-brand > span { border-radius: 0; background: #d9ff3f; color: #111; transform: skewY(-7deg); }
        .wai-phone-kinetic .wai-phone-header em, .wai-phone-kinetic .wai-phone-roster > div, .wai-phone-kinetic .wai-phone-streak { border: 2px solid white; border-radius: 0; background: #111; color: white; }
        .wai-phone-kinetic .wai-phone-identity-card, .wai-phone-kinetic .wai-phone-guess-card, .wai-phone-kinetic .wai-phone-win-card { border: 0; border-radius: 0; background: #f5f1e8; color: #111; box-shadow: 8px 8px 0 #d9ff3f; animation: kinetic-card .65s cubic-bezier(.16,.8,.2,1.2) both; }
        .wai-phone-kinetic .wai-phone-instruction, .wai-phone-kinetic .wai-phone-roster small, .wai-phone-kinetic .wai-phone-guess-card p, .wai-phone-kinetic .wai-phone-win-card p { color: rgba(255,255,255,.64); font-family: var(--font-geist-sans),sans-serif; }
        .wai-phone-kinetic .wai-phone-guess-card p, .wai-phone-kinetic .wai-phone-win-card p { color: rgba(17,17,17,.62); }
        .wai-phone-kinetic .wai-phone-actions button { border: 2px solid white; border-radius: 0; background: #111; color: white; box-shadow: 4px 4px 0 #5636ff; }
        .wai-phone-kinetic .wai-phone-actions button.is-primary { background: #d9ff3f; color: #111; box-shadow: 4px 4px 0 #ff4d00; }
        .wai-phone-kinetic .wai-phone-atmosphere i { width: 150px; height: 24px; top: 36%; left: -48px; background: #ff4d00; transform: rotate(-18deg); animation: kinetic-bar 2.8s ease-in-out infinite alternate; }
        .wai-phone-kinetic .wai-phone-atmosphere i:nth-child(2) { top: 73%; left: auto; right: -55px; background: #d9ff3f; animation-delay: -1.4s; }
        @keyframes kinetic-field { to { transform: translateX(5%) skewX(-5deg); } }
        @keyframes kinetic-question { to { transform: translate(-18px,14px) rotate(-5deg) scale(1.08); } }
        @keyframes kinetic-bar { to { transform: translateX(90px) rotate(8deg); } }
        @keyframes kinetic-card { from { opacity: 0; transform: translateX(-70px) skewX(-8deg); } 72% { transform: translateX(5px) skewX(2deg); } }
        .wai-tv-kinetic .wai-tv-now, .wai-tv-kinetic .wai-tv-progress, .wai-tv-kinetic .wai-tv-player-strip > div { border: 2px solid white; border-radius: 0; background: #111; color: white; }
        .wai-tv-kinetic .wai-tv-hero { border: 0; border-radius: 0; background: #f5f1e8; color: #111; box-shadow: 12px 12px 0 #d9ff3f; animation: kinetic-card .7s cubic-bezier(.16,.8,.2,1.2) both; }
        .wai-tv-kinetic .wai-tv-hidden-card { border: 0; border-radius: 0; background: #5636ff; color: white; }
        .wai-tv-kinetic .wai-tv-hero-person p { color: rgba(17,17,17,.6); }

        .concept-masquerade::before { background: radial-gradient(circle at 18% 32%,rgba(217,88,255,.2),transparent 30%),radial-gradient(circle at 82% 68%,rgba(61,221,212,.18),transparent 30%),linear-gradient(145deg,#090712,#201229 55%,#0a1720); }
        .concept-masquerade::after { opacity: .45; background: conic-gradient(from 110deg at 72% 46%,transparent,#ffca5c33,#d958ff44,#3dddd433,transparent 55%); filter: blur(18px); animation: mask-prism 8s ease-in-out infinite alternate; }
        .concept-masquerade .wai-preview-concept-copy h2 { font-family: Georgia,"Times New Roman",serif; font-weight: 500; font-style: italic; letter-spacing: -.055em; }
        .concept-masquerade .wai-preview-tags i, .concept-masquerade .wai-preview-replay { border-color: rgba(255,202,92,.28); background: rgba(255,255,255,.07); color: #fff7dd; backdrop-filter: blur(16px); }
        .wai-phone-masquerade, .wai-tv-masquerade { background: radial-gradient(circle at 18% 18%,rgba(217,88,255,.22),transparent 29%),radial-gradient(circle at 82% 78%,rgba(61,221,212,.18),transparent 27%),linear-gradient(145deg,#080611,#211126 58%,#07151c); color: #fff9ec; font-family: Georgia,"Times New Roman",serif; }
        .wai-phone-masquerade::before, .wai-tv-masquerade::before { content: ""; position: absolute; width: 46%; aspect-ratio: 1.55; right: -8%; top: 19%; border: 1px solid rgba(255,255,255,.24); border-radius: 55% 45% 58% 42%; background: linear-gradient(135deg,rgba(255,202,92,.3),rgba(217,88,255,.22) 45%,rgba(61,221,212,.2)); clip-path: polygon(0 18%,42% 5%,51% 35%,60% 5%,100% 18%,88% 85%,58% 66%,50% 100%,42% 66%,12% 85%); backdrop-filter: blur(12px); animation: mask-float 4.5s ease-in-out infinite; }
        .wai-phone-masquerade .wai-phone-brand > svg, .wai-tv-masquerade .wai-tv-brand > span { border-radius: 50% 50% 45% 55%; background: linear-gradient(145deg,#ffdd85,#d59a2b); color: #2a1621; box-shadow: 0 0 24px -10px #ffca5c; }
        .wai-phone-masquerade .wai-phone-header em, .wai-phone-masquerade .wai-phone-roster > div, .wai-phone-masquerade .wai-phone-streak { border: 1px solid rgba(255,202,92,.18); background: rgba(24,15,33,.66); color: #fff9ec; backdrop-filter: blur(14px); }
        .wai-phone-masquerade .wai-phone-identity-card, .wai-phone-masquerade .wai-phone-guess-card, .wai-phone-masquerade .wai-phone-win-card { border: 1px solid rgba(255,202,92,.28); background: linear-gradient(135deg,rgba(255,255,255,.13),rgba(217,88,255,.08)); box-shadow: inset 0 1px rgba(255,255,255,.18),0 24px 40px -28px #d958ff; backdrop-filter: blur(18px); animation: mask-reveal .9s cubic-bezier(.2,.8,.2,1.1) both; }
        .wai-phone-masquerade .wai-phone-instruction, .wai-phone-masquerade .wai-phone-roster small, .wai-phone-masquerade .wai-phone-guess-card p, .wai-phone-masquerade .wai-phone-win-card p { color: rgba(255,249,236,.56); font-family: var(--font-geist-sans),sans-serif; }
        .wai-phone-masquerade .wai-phone-actions button { border: 1px solid rgba(255,202,92,.3); background: rgba(26,16,35,.78); color: #fff9ec; backdrop-filter: blur(14px); }
        .wai-phone-masquerade .wai-phone-actions button.is-primary { background: linear-gradient(135deg,#ffca5c,#d958ff); color: #24101e; }
        .wai-phone-masquerade .wai-phone-atmosphere i { width: 88px; height: 120px; top: 34%; left: -28px; background: linear-gradient(150deg,rgba(255,202,92,.18),rgba(217,88,255,.25),rgba(61,221,212,.14)); clip-path: polygon(50% 0,100% 37%,78% 100%,20% 85%,0 28%); filter: blur(.2px); animation: prism-turn 5s ease-in-out infinite alternate; }
        .wai-phone-masquerade .wai-phone-atmosphere i:nth-child(2) { width: 54px; height: 76px; top: 70%; left: auto; right: -14px; animation-delay: -2.5s; }
        @keyframes mask-prism { to { transform: translateX(-8%) rotate(12deg); } }
        @keyframes mask-float { 50% { transform: translateY(-10px) rotate(4deg); filter: hue-rotate(20deg); } }
        @keyframes prism-turn { to { transform: rotate(16deg) translateY(-12px); filter: hue-rotate(35deg); } }
        @keyframes mask-reveal { from { opacity: 0; transform: perspective(700px) rotateY(38deg) scale(.88); filter: blur(8px); } }
        .wai-tv-masquerade .wai-tv-now, .wai-tv-masquerade .wai-tv-progress, .wai-tv-masquerade .wai-tv-player-strip > div { border: 1px solid rgba(255,202,92,.2); background: rgba(23,14,31,.67); color: #fff9ec; backdrop-filter: blur(14px); }
        .wai-tv-masquerade .wai-tv-hero { border: 1px solid rgba(255,202,92,.28); background: linear-gradient(135deg,rgba(255,255,255,.12),rgba(217,88,255,.08)); box-shadow: inset 0 1px rgba(255,255,255,.18),0 28px 46px -32px #d958ff; backdrop-filter: blur(18px); animation: mask-reveal .9s cubic-bezier(.2,.8,.2,1.1) both; }
        .wai-tv-masquerade .wai-tv-hidden-card { border: 1px solid rgba(255,202,92,.3); background: linear-gradient(135deg,rgba(255,202,92,.12),rgba(217,88,255,.18),rgba(61,221,212,.1)); }

        .concept-clay { color: #352759; }
        .concept-clay::before { background: radial-gradient(circle at 15% 30%,#ffd0dc,transparent 34%),radial-gradient(circle at 84% 24%,#c9f5dd,transparent 30%),linear-gradient(145deg,#f8e8ff,#cfc7ff); }
        .concept-clay::after { opacity: .35; background: radial-gradient(circle at 70% 70%,rgba(116,89,223,.22) 0 10%,transparent 11%),radial-gradient(circle at 20% 80%,rgba(255,122,145,.28) 0 8%,transparent 9%); filter: blur(12px); }
        .concept-clay .wai-preview-concept-copy h2 { font-family: "Arial Rounded MT Bold", var(--font-geist-sans), sans-serif; font-weight: 800; letter-spacing: -.055em; }
        .concept-clay .wai-preview-concept-copy p, .concept-clay .wai-preview-device-label, .concept-clay .wai-preview-motion-notes > span { color: rgba(53,39,89,.64); }
        .concept-clay .wai-preview-tags i, .concept-clay .wai-preview-replay { border: 0; background: rgba(255,255,255,.55); color: #352759; box-shadow: inset 0 2px rgba(255,255,255,.7),0 8px 20px -14px #7459df; }
        .concept-clay .wai-preview-motion-notes > b, .concept-clay .wai-preview-motion-notes > span { border-color: rgba(53,39,89,.17); }
        .wai-phone-clay, .wai-tv-clay { background: radial-gradient(circle at 18% 20%,#ffd2df,transparent 34%),radial-gradient(circle at 82% 72%,#c5f3d9,transparent 30%),linear-gradient(145deg,#f8e7ff,#cfc6ff); color: #352759; font-family: "Arial Rounded MT Bold", var(--font-geist-sans), sans-serif; }
        .wai-phone-clay .wai-phone-brand > svg, .wai-tv-clay .wai-tv-brand > span { border-radius: 45% 55% 48% 52%; color: white; box-shadow: inset 0 3px rgba(255,255,255,.35),0 8px 15px -10px #7459df; animation: clay-squish 3s ease-in-out infinite; }
        .wai-phone-clay .wai-phone-header em, .wai-phone-clay .wai-phone-roster > div, .wai-phone-clay .wai-phone-streak { border: 0; background: rgba(255,255,255,.56); color: #352759; box-shadow: inset 0 2px rgba(255,255,255,.68),0 10px 22px -18px #7459df; }
        .wai-phone-clay .wai-phone-instruction, .wai-phone-clay .wai-phone-roster small, .wai-phone-clay .wai-phone-guess-card p, .wai-phone-clay .wai-phone-win-card p { color: rgba(53,39,89,.55); }
        .wai-phone-clay .wai-phone-identity-card, .wai-phone-clay .wai-phone-guess-card, .wai-phone-clay .wai-phone-win-card { border: 0; border-radius: 30px 23px 28px 21px; background: rgba(255,255,255,.64); box-shadow: inset 0 3px rgba(255,255,255,.8),0 18px 30px -22px #7459df; animation: clay-arrive .8s cubic-bezier(.2,.8,.2,1.28) both; }
        .wai-phone-clay .wai-phone-actions button { border: 0; border-radius: 18px 14px 19px 15px; background: rgba(255,255,255,.72); color: #352759; box-shadow: inset 0 3px rgba(255,255,255,.8),0 5px 0 rgba(116,89,223,.22); }
        .wai-phone-clay .wai-phone-actions button:active { transform: translateY(4px) scale(.98); box-shadow: inset 0 2px rgba(255,255,255,.5),0 1px 0 rgba(116,89,223,.22); }
        .wai-phone-clay .wai-phone-actions button.is-primary { background: var(--wai-accent); color: white; }
        .wai-phone-clay .wai-phone-atmosphere i { width: 78px; height: 62px; top: 19%; right: -18px; border-radius: 58% 42% 63% 37%; background: #c5f3d9; box-shadow: inset 0 8px rgba(255,255,255,.35); animation: clay-float 4.6s ease-in-out infinite; }
        .wai-phone-clay .wai-phone-atmosphere i:nth-child(2) { width: 48px; height: 48px; top: 70%; left: -12px; background: #ffd2df; animation-delay: -2.1s; }
        @keyframes clay-float { 50% { transform: translateY(-12px) rotate(9deg) scale(1.08,.94); } }
        @keyframes clay-squish { 50% { transform: scale(1.07,.93) rotate(3deg); } }
        @keyframes clay-arrive { from { opacity: 0; transform: translateY(44px) scale(.78,1.15); } 72% { transform: translateY(-3px) scale(1.06,.95); } }
        .wai-tv-clay .wai-tv-now, .wai-tv-clay .wai-tv-progress, .wai-tv-clay .wai-tv-player-strip > div { border: 0; background: rgba(255,255,255,.6); color: #352759; box-shadow: inset 0 2px rgba(255,255,255,.7),0 10px 22px -18px #7459df; }
        .wai-tv-clay .wai-tv-hero { border: 0; border-radius: 40px 30px 44px 34px; background: rgba(255,255,255,.62); box-shadow: inset 0 4px rgba(255,255,255,.78),0 25px 42px -30px #7459df; animation: clay-stage .9s cubic-bezier(.2,.8,.2,1.28) both; }
        @keyframes clay-stage { from { opacity: 0; transform: translateY(45px) scale(.82,1.12); } 70% { transform: translateY(-4px) scale(1.04,.97); } }
        .wai-tv-clay .wai-tv-hidden-card { border: 0; border-radius: 28px 20px 30px 22px; background: linear-gradient(145deg,#ffd2df,#ff91aa); color: #352759; box-shadow: inset 0 4px rgba(255,255,255,.4); }
        .wai-tv-clay .wai-tv-footer, .wai-tv-clay .wai-tv-footer b { color: #352759; }
        .wai-tv-clay .wai-tv-atmosphere i { width: 15%; aspect-ratio: 1; top: 16%; right: 4%; border-radius: 55% 45% 62% 38%; background: rgba(197,243,217,.8); box-shadow: inset 0 12px rgba(255,255,255,.32); animation: clay-float 6s ease-in-out infinite; }
        .wai-tv-clay .wai-tv-atmosphere i:nth-child(2) { width: 8%; top: 67%; right: auto; left: 3%; background: rgba(255,210,223,.9); animation-delay: -3s; }

        .concept-clay-dark { color: #f6eef8; }
        .concept-clay-dark::before { background: radial-gradient(circle at 16% 28%,rgba(255,102,143,.2),transparent 34%),radial-gradient(circle at 82% 72%,rgba(105,213,181,.14),transparent 30%),linear-gradient(145deg,#100b17,#21132b 52%,#14101d); }
        .concept-clay-dark::after { opacity: .48; background: radial-gradient(circle at 72% 68%,rgba(255,102,143,.2) 0 9%,transparent 10%),radial-gradient(circle at 19% 78%,rgba(105,213,181,.18) 0 7%,transparent 8%); filter: blur(16px); }
        .concept-clay-dark .wai-preview-concept-copy h2 { font-family: "Arial Rounded MT Bold", var(--font-geist-sans), sans-serif; font-weight: 800; letter-spacing: -.055em; }
        .concept-clay-dark .wai-preview-concept-copy p, .concept-clay-dark .wai-preview-device-label, .concept-clay-dark .wai-preview-motion-notes > span { color: rgba(246,238,248,.62); }
        .concept-clay-dark .wai-preview-tags i, .concept-clay-dark .wai-preview-replay { border: 0; background: rgba(255,255,255,.075); color: #f6eef8; box-shadow: inset 0 2px rgba(255,255,255,.08),0 12px 24px -18px #000; }
        .concept-clay-dark .wai-preview-motion-notes > b, .concept-clay-dark .wai-preview-motion-notes > span { border-color: rgba(246,238,248,.13); }
        .wai-phone-clay-dark, .wai-tv-clay-dark { background: radial-gradient(circle at 15% 18%,rgba(255,102,143,.17),transparent 31%),radial-gradient(circle at 84% 78%,rgba(105,213,181,.12),transparent 27%),linear-gradient(145deg,#0f0a15,#21142a 58%,#15101c); color: #f7f0f8; font-family: "Arial Rounded MT Bold", var(--font-geist-sans), sans-serif; }
        .wai-phone-clay-dark .wai-phone-brand > svg, .wai-tv-clay-dark .wai-tv-brand > span { border-radius: 45% 55% 48% 52%; color: #241220; box-shadow: inset 0 3px rgba(255,255,255,.28),0 10px 20px -12px rgba(255,102,143,.38); animation: clay-dark-breathe 3.6s ease-in-out infinite; }
        .wai-phone-clay-dark .wai-phone-header em, .wai-phone-clay-dark .wai-phone-roster > div, .wai-phone-clay-dark .wai-phone-streak { border: 0; background: rgba(51,37,61,.82); color: #f7f0f8; box-shadow: inset 0 2px rgba(255,255,255,.07),inset 0 -3px rgba(0,0,0,.14),0 14px 25px -20px #000; }
        .wai-phone-clay-dark .wai-phone-instruction, .wai-phone-clay-dark .wai-phone-roster small, .wai-phone-clay-dark .wai-phone-guess-card p, .wai-phone-clay-dark .wai-phone-win-card p { color: rgba(247,240,248,.5); }
        .wai-phone-clay-dark .wai-phone-identity-card, .wai-phone-clay-dark .wai-phone-guess-card, .wai-phone-clay-dark .wai-phone-win-card { border: 0; border-radius: 30px 23px 28px 21px; background: linear-gradient(145deg,rgba(62,44,72,.96),rgba(36,25,45,.97)); box-shadow: inset 0 3px rgba(255,255,255,.09),inset 0 -5px rgba(0,0,0,.16),0 22px 35px -26px #000; animation: clay-dark-rise .9s cubic-bezier(.2,.8,.2,1.2) both; }
        .wai-phone-clay-dark .wai-phone-actions button { border: 0; border-radius: 18px 14px 19px 15px; background: #33263d; color: #f7f0f8; box-shadow: inset 0 3px rgba(255,255,255,.08),inset 0 -4px rgba(0,0,0,.16),0 6px 0 #1a1220; }
        .wai-phone-clay-dark .wai-phone-actions button:active { transform: translateY(4px) scale(.98,.96); box-shadow: inset 0 2px rgba(255,255,255,.05),inset 0 -1px rgba(0,0,0,.12),0 2px 0 #1a1220; }
        .wai-phone-clay-dark .wai-phone-actions button.is-primary { background: linear-gradient(145deg,#ff779a,#e64d78); color: #25121d; box-shadow: inset 0 3px rgba(255,255,255,.25),inset 0 -4px rgba(94,13,48,.2),0 6px 0 #7b2649; }
        .wai-phone-clay-dark .wai-phone-atmosphere i { width: 82px; height: 64px; top: 18%; right: -18px; border-radius: 58% 42% 63% 37%; background: #34233e; box-shadow: inset 10px 10px rgba(255,255,255,.035),inset -8px -8px rgba(0,0,0,.13); animation: clay-dark-float 5.2s ease-in-out infinite; }
        .wai-phone-clay-dark .wai-phone-atmosphere i:nth-child(2) { width: 48px; height: 48px; top: 69%; left: -12px; background: #24453f; animation-delay: -2.6s; }
        @keyframes clay-dark-float { 50% { transform: translateY(-10px) rotate(7deg) scale(1.06,.95); } }
        @keyframes clay-dark-breathe { 50% { transform: scale(1.05,.94) rotate(2deg); filter: brightness(1.08); } }
        @keyframes clay-dark-rise { from { opacity: 0; transform: translateY(38px) scale(.82,1.1); filter: brightness(.55); } 70% { transform: translateY(-3px) scale(1.04,.97); } }
        .wai-tv-clay-dark .wai-tv-now, .wai-tv-clay-dark .wai-tv-progress, .wai-tv-clay-dark .wai-tv-player-strip > div { border: 0; background: rgba(54,39,64,.82); color: #f7f0f8; box-shadow: inset 0 2px rgba(255,255,255,.07),inset 0 -3px rgba(0,0,0,.14),0 14px 24px -20px #000; }
        .wai-tv-clay-dark .wai-tv-hero { border: 0; border-radius: 40px 30px 44px 34px; background: linear-gradient(145deg,rgba(61,43,71,.94),rgba(34,24,43,.96)); box-shadow: inset 0 4px rgba(255,255,255,.08),inset 0 -8px rgba(0,0,0,.13),0 28px 44px -32px #000; animation: clay-dark-stage 1s cubic-bezier(.2,.8,.2,1.22) both; }
        @keyframes clay-dark-stage { from { opacity: 0; transform: translateY(42px) scale(.84,1.1); filter: brightness(.5); } 70% { transform: translateY(-4px) scale(1.035,.975); } }
        .wai-tv-clay-dark .wai-tv-hidden-card { border: 0; border-radius: 28px 20px 30px 22px; background: linear-gradient(145deg,#592a44,#301e38); color: #f8eff6; box-shadow: inset 0 4px rgba(255,255,255,.09),inset 0 -6px rgba(0,0,0,.14); }
        .wai-tv-clay-dark .wai-tv-footer, .wai-tv-clay-dark .wai-tv-footer b { color: #f7f0f8; }
        .wai-tv-clay-dark .wai-tv-atmosphere i { width: 15%; aspect-ratio: 1; top: 15%; right: 4%; border-radius: 55% 45% 62% 38%; background: #33213d; box-shadow: inset 14px 12px rgba(255,255,255,.035),inset -9px -10px rgba(0,0,0,.14); animation: clay-dark-float 6.5s ease-in-out infinite; }
        .wai-tv-clay-dark .wai-tv-atmosphere i:nth-child(2) { width: 8%; top: 67%; right: auto; left: 3%; background: #23463f; animation-delay: -3.2s; }

        .concept-clay-blue { color: #effaff; }
        .concept-clay-blue::before { background: radial-gradient(circle at 16% 27%,rgba(56,189,248,.3),transparent 34%),radial-gradient(circle at 84% 73%,rgba(2,132,199,.25),transparent 31%),linear-gradient(145deg,#050d18,#071a2b 53%,#06111f); }
        .concept-clay-blue::after { opacity: .58; background: radial-gradient(circle at 72% 67%,rgba(56,189,248,.28) 0 10%,transparent 11%),radial-gradient(circle at 20% 80%,rgba(2,132,199,.3) 0 8%,transparent 9%); filter: blur(17px); }
        .concept-clay-blue .wai-preview-concept-copy h2 { font-family: "Arial Rounded MT Bold", var(--font-geist-sans), sans-serif; font-weight: 800; letter-spacing: -.055em; }
        .concept-clay-blue .wai-preview-concept-copy p, .concept-clay-blue .wai-preview-device-label, .concept-clay-blue .wai-preview-motion-notes > span { color: rgba(226,246,255,.64); }
        .concept-clay-blue .wai-preview-tags i, .concept-clay-blue .wai-preview-replay { border: 0; background: rgba(56,189,248,.12); color: #e9f9ff; box-shadow: inset 0 2px rgba(255,255,255,.08),0 12px 25px -18px #0284c7; }
        .concept-clay-blue .wai-preview-motion-notes > b, .concept-clay-blue .wai-preview-motion-notes > span { border-color: rgba(56,189,248,.18); }
        .wai-phone-clay-blue, .wai-tv-clay-blue { background: radial-gradient(circle at 14% 17%,rgba(56,189,248,.27),transparent 30%),radial-gradient(circle at 85% 79%,rgba(2,132,199,.23),transparent 29%),linear-gradient(145deg,#04101c,#08243a 58%,#061522); color: #effaff; font-family: "Arial Rounded MT Bold", var(--font-geist-sans), sans-serif; }
        .wai-phone-clay-blue .wai-phone-brand > svg, .wai-tv-clay-blue .wai-tv-brand > span { border-radius: 45% 55% 48% 52%; background: linear-gradient(145deg,#61d0ff,#209edc); color: #04243a; box-shadow: inset 0 3px rgba(255,255,255,.31),inset 0 -4px rgba(2,86,132,.17),0 10px 21px -13px #38bdf8; animation: clay-blue-breathe 3.5s ease-in-out infinite; }
        .wai-phone-clay-blue .wai-phone-header em, .wai-phone-clay-blue .wai-phone-roster > div, .wai-phone-clay-blue .wai-phone-streak { border: 0; background: rgba(11,45,70,.88); color: #effaff; box-shadow: inset 0 2px rgba(114,211,255,.1),inset 0 -3px rgba(0,0,0,.17),0 14px 26px -21px #000; }
        .wai-phone-clay-blue .wai-phone-roster > div.is-current { background: linear-gradient(145deg,rgba(25,112,160,.94),rgba(10,59,91,.95)); }
        .wai-phone-clay-blue .wai-phone-instruction, .wai-phone-clay-blue .wai-phone-roster small, .wai-phone-clay-blue .wai-phone-guess-card p, .wai-phone-clay-blue .wai-phone-win-card p { color: rgba(224,246,255,.54); }
        .wai-phone-clay-blue .wai-phone-identity-card, .wai-phone-clay-blue .wai-phone-guess-card, .wai-phone-clay-blue .wai-phone-win-card { border: 0; border-radius: 30px 23px 28px 21px; background: linear-gradient(145deg,rgba(15,70,105,.97),rgba(7,35,56,.98)); box-shadow: inset 0 3px rgba(133,220,255,.12),inset 0 -5px rgba(0,0,0,.18),0 22px 36px -26px #000; animation: clay-blue-rise .9s cubic-bezier(.2,.8,.2,1.2) both; }
        .wai-phone-clay-blue .wai-phone-hidden-mark { background: rgba(56,189,248,.2); }
        .wai-phone-clay-blue .wai-phone-actions button { border: 0; border-radius: 18px 14px 19px 15px; background: #0d3856; color: #effaff; box-shadow: inset 0 3px rgba(127,217,255,.1),inset 0 -4px rgba(0,0,0,.18),0 6px 0 #041b2c; }
        .wai-phone-clay-blue .wai-phone-actions button:active { transform: translateY(4px) scale(.98,.96); box-shadow: inset 0 2px rgba(127,217,255,.07),inset 0 -1px rgba(0,0,0,.14),0 2px 0 #041b2c; }
        .wai-phone-clay-blue .wai-phone-actions button.is-primary { background: linear-gradient(145deg,#67d3ff,#22a6e5); color: #04243a; box-shadow: inset 0 3px rgba(255,255,255,.3),inset 0 -4px rgba(2,86,132,.17),0 6px 0 #026b9f; }
        .wai-phone-clay-blue .wai-phone-atmosphere i { width: 84px; height: 66px; top: 18%; right: -18px; border-radius: 58% 42% 63% 37%; background: #0c4569; box-shadow: inset 12px 10px rgba(103,211,255,.09),inset -8px -8px rgba(0,0,0,.15); animation: clay-blue-float 5.2s ease-in-out infinite; }
        .wai-phone-clay-blue .wai-phone-atmosphere i:nth-child(2) { width: 49px; height: 49px; top: 69%; left: -12px; background: #096495; animation-delay: -2.6s; }
        @keyframes clay-blue-float { 50% { transform: translateY(-11px) rotate(8deg) scale(1.07,.94); } }
        @keyframes clay-blue-breathe { 50% { transform: scale(1.055,.94) rotate(2deg); filter: brightness(1.08); } }
        @keyframes clay-blue-rise { from { opacity: 0; transform: translateY(39px) scale(.82,1.1); filter: brightness(.56); } 70% { transform: translateY(-3px) scale(1.04,.97); } }
        .wai-tv-clay-blue .wai-tv-now, .wai-tv-clay-blue .wai-tv-progress, .wai-tv-clay-blue .wai-tv-player-strip > div { border: 0; background: rgba(10,47,73,.88); color: #effaff; box-shadow: inset 0 2px rgba(121,215,255,.1),inset 0 -3px rgba(0,0,0,.16),0 14px 25px -20px #000; }
        .wai-tv-clay-blue .wai-tv-player-strip > div.is-current { background: linear-gradient(145deg,rgba(22,104,150,.95),rgba(9,58,89,.96)); }
        .wai-tv-clay-blue .wai-tv-hero { border: 0; border-radius: 40px 30px 44px 34px; background: linear-gradient(145deg,rgba(14,67,102,.96),rgba(6,34,54,.98)); box-shadow: inset 0 4px rgba(132,220,255,.11),inset 0 -8px rgba(0,0,0,.15),0 28px 45px -32px #000; animation: clay-blue-stage 1s cubic-bezier(.2,.8,.2,1.22) both; }
        @keyframes clay-blue-stage { from { opacity: 0; transform: translateY(42px) scale(.84,1.1); filter: brightness(.52); } 70% { transform: translateY(-4px) scale(1.035,.975); } }
        .wai-tv-clay-blue .wai-tv-hidden-card { border: 0; border-radius: 28px 20px 30px 22px; background: linear-gradient(145deg,#0d79ad,#075078); color: #effaff; box-shadow: inset 0 4px rgba(159,228,255,.16),inset 0 -6px rgba(0,0,0,.16); }
        .wai-tv-clay-blue .wai-tv-footer, .wai-tv-clay-blue .wai-tv-footer b { color: #effaff; }
        .wai-tv-clay-blue .wai-tv-atmosphere i { width: 15%; aspect-ratio: 1; top: 15%; right: 4%; border-radius: 55% 45% 62% 38%; background: #0a4163; box-shadow: inset 14px 12px rgba(114,214,255,.08),inset -9px -10px rgba(0,0,0,.15); animation: clay-blue-float 6.5s ease-in-out infinite; }
        .wai-tv-clay-blue .wai-tv-atmosphere i:nth-child(2) { width: 8%; top: 67%; right: auto; left: 3%; background: #086997; animation-delay: -3.2s; }

        .wai-layout-intro { min-height: 78vh; padding: 11vh clamp(24px,7vw,120px); display: flex; flex-direction: column; justify-content: center; border-top: 1px solid #26303b; background: radial-gradient(circle at 82% 18%,rgba(56,189,248,.18),transparent 28%),linear-gradient(145deg,#070a10,#101823); }
        .wai-layout-intro > span { color: #38bdf8; font: 650 11px/1 var(--font-geist-mono),monospace; letter-spacing: .24em; }
        .wai-layout-intro h2 { max-width: 1120px; margin: 24px 0; font-size: clamp(54px,8vw,126px); line-height: .88; letter-spacing: -.065em; }
        .wai-layout-intro h2 em { color: #38bdf8; font-style: normal; }
        .wai-layout-intro > p { max-width: 820px; margin: 0 0 42px; color: #9ea8b7; font-size: 20px; line-height: 1.55; }
        .wai-layout-intro nav { display: grid; grid-template-columns: repeat(4,1fr); max-width: 1200px; border: 1px solid #2a3541; }
        .wai-layout-intro nav a { min-height: 90px; display: flex; flex-direction: column; justify-content: space-between; gap: 18px; border-right: 1px solid #2a3541; padding: 17px; color: #d8dee7; text-decoration: none; }
        .wai-layout-intro nav a:last-child { border-right: 0; }
        .wai-layout-intro nav b { color: #637184; font: 500 11px/1 var(--font-geist-mono),monospace; }

        .wai-layout-concept::before { background: var(--layout-bg,#0b1118); }
        .layout-concept-orbit { --layout-bg: radial-gradient(circle at 70% 50%,rgba(244,114,182,.14),transparent 26%),radial-gradient(circle at 20% 30%,rgba(56,189,248,.18),transparent 30%),#06101c; }
        .layout-concept-deck { --layout-bg: linear-gradient(135deg,#e8f1ff 0 52%,#d9ff5a 52%); color:#171525; }
        .layout-concept-deck .wai-preview-concept-copy p,.layout-concept-deck .wai-preview-device-label { color:rgba(23,21,37,.64); }
        .layout-concept-deck .wai-preview-tags i { color:#171525; border-color:rgba(23,21,37,.24); }
        .layout-concept-split { --layout-bg: linear-gradient(120deg,#181727,#23213a); }
        .layout-concept-constellation { --layout-bg: radial-gradient(circle at 50% 48%,rgba(192,132,252,.16),transparent 28%),#02070f; }
        .wai-layout-concept .wai-preview-concept-copy h2 { max-width: 980px; }

        .wai-layout-phone { position:relative; width:100%; height:100%; overflow:hidden; border-radius:34px; background:#07111d; color:#f7fbff; font-family:var(--font-geist-sans),sans-serif; }
        .wai-layout-phone button { min-height:44px; border:0; color:inherit; cursor:pointer; font:750 10px/1 var(--font-geist-sans),sans-serif; letter-spacing:.08em; }
        .wai-layout-phone-head { position:absolute; z-index:20; top:16px; left:16px; right:16px; display:flex; align-items:center; justify-content:space-between; }
        .wai-layout-phone-head > span { display:flex; align-items:center; gap:7px; }
        .wai-layout-phone-head svg { width:20px; color:var(--layout-accent); }
        .wai-layout-phone-head b { font-size:10px; }
        .wai-layout-phone-head em { font:600 7px/1 var(--font-geist-mono),monospace; font-style:normal; opacity:.55; }
        .wai-layout-turn { position:relative; height:100%; padding:58px 15px 15px; }
        .wai-layout-player-rail { position:relative; z-index:5; display:flex; gap:5px; }
        .wai-layout-player-rail > span { min-width:0; display:flex; align-items:center; gap:4px; opacity:.45; }
        .wai-layout-player-rail > span.is-current { opacity:1; }
        .wai-layout-player-rail .wai-preview-avatar { width:23px; height:23px; font-size:8px; }
        .wai-layout-player-rail b { overflow:hidden; font-size:7px; text-overflow:ellipsis; white-space:nowrap; }
        .wai-layout-focus { display:flex; flex-direction:column; align-items:center; text-align:center; }
        .wai-layout-focus > small { color:var(--layout-accent); font:650 7px/1 var(--font-geist-mono),monospace; letter-spacing:.14em; }
        .wai-layout-focus h3 { margin:12px 0 0; font-size:26px; line-height:.92; letter-spacing:-.055em; }
        .wai-layout-focus h3 em { color:var(--layout-accent); font-style:normal; }
        .wai-layout-secret { position:relative; display:grid; place-items:center; }
        .wai-layout-secret > svg { width:34px; }
        .wai-layout-secret > strong { font-size:46px; line-height:1; }
        .wai-layout-secret > span { font:600 6px/1.3 var(--font-geist-mono),monospace; letter-spacing:.12em; }
        .wai-layout-answer-controls button { display:flex; align-items:center; justify-content:center; gap:6px; transition:transform .18s,filter .18s; }
        .wai-layout-answer-controls button:active { transform:scale(.92); }
        .wai-layout-answer-controls svg { width:17px; }
        .wai-layout-guess,.wai-layout-win { height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:38px 22px 20px; text-align:center; background:radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--layout-accent) 20%,transparent),transparent 36%); }
        .wai-layout-guess > span,.wai-layout-win > svg { width:66px; height:66px; display:grid; place-items:center; border-radius:50%; background:var(--layout-accent); color:#06111d; }
        .wai-layout-guess > span svg { width:34px; margin-top:15px; }
        .wai-layout-guess > small,.wai-layout-win > small { margin-top:16px; color:var(--layout-accent); font:650 7px/1 var(--font-geist-mono),monospace; letter-spacing:.16em; }
        .wai-layout-guess h3,.wai-layout-win h3 { margin:8px 0 18px; font-size:27px; letter-spacing:-.05em; }
        .wai-layout-guess label { width:100%; display:flex; flex-direction:column; gap:6px; border-bottom:2px solid var(--layout-accent); padding:12px 3px; text-align:left; }
        .wai-layout-guess label small { opacity:.5; font:600 6px/1 var(--font-geist-mono),monospace; letter-spacing:.12em; }
        .wai-layout-guess label b { font-size:17px; }
        .wai-layout-close { position:absolute; top:22px; right:18px; width:44px; border-radius:50%; background:rgba(255,255,255,.08); font-size:22px!important; }
        .wai-layout-submit { width:100%; margin-top:18px; border-radius:999px; background:var(--layout-accent); color:#07111d!important; }
        .wai-layout-win > b { border-radius:999px; padding:8px 12px; background:color-mix(in srgb,var(--layout-accent) 18%,transparent); color:var(--layout-accent); }

        .wai-layout-tv { position:relative; width:100%; height:100%; overflow:hidden; border-radius:13px; padding:2.4% 3%; background:#07111d; color:#f7fbff; font-family:var(--font-geist-sans),sans-serif; }
        .wai-layout-tv > header { position:relative; z-index:5; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:12px; }
        .wai-layout-tv > header > span { display:flex; align-items:center; gap:7px; }
        .wai-layout-tv > header svg { width:22px; color:var(--layout-accent); }
        .wai-layout-tv > header b { font-size:clamp(9px,1vw,16px); }
        .wai-layout-tv > header em { justify-self:center; color:var(--layout-accent); font:650 clamp(5px,.55vw,9px)/1 var(--font-geist-mono),monospace; font-style:normal; }
        .wai-layout-tv > header strong { justify-self:end; font-size:clamp(5px,.6vw,10px); }
        .wai-layout-tv > main { position:relative; height:82%; }
        .wai-layout-tv-roster > span { display:flex; align-items:center; gap:5px; opacity:.45; }
        .wai-layout-tv-roster > span.is-current { opacity:1; }
        .wai-layout-tv-roster b { font-size:clamp(5px,.65vw,10px); }
        .wai-layout-tv-stage { position:absolute; }
        .wai-layout-tv-person { display:flex; flex-direction:column; }
        .wai-layout-tv-person > span { display:grid; place-items:center; width:clamp(60px,8vw,130px); aspect-ratio:1; border-radius:50%; background:var(--layout-secondary); font-size:clamp(26px,4vw,66px); font-weight:850; }
        .wai-layout-tv-person small,.wai-layout-tv-secret small { color:var(--layout-accent); font:650 clamp(4px,.48vw,8px)/1 var(--font-geist-mono),monospace; letter-spacing:.13em; }
        .wai-layout-tv-person h3 { margin:5px 0 0; font-size:clamp(30px,5vw,78px); line-height:.85; }
        .wai-layout-tv-secret { display:flex; align-items:center; gap:12px; }
        .wai-layout-tv-secret > svg { width:clamp(28px,4vw,62px); color:var(--layout-accent); }
        .wai-layout-tv-secret > span { display:flex; flex-direction:column; gap:5px; }
        .wai-layout-tv-secret b { font-size:clamp(8px,1.2vw,19px); }
        .wai-layout-tv-secret strong { color:var(--layout-accent); font-size:clamp(45px,8vw,125px); line-height:.7; }
        .wai-layout-tv > footer { position:absolute; bottom:2.5%; left:3%; right:3%; font-size:clamp(5px,.55vw,9px); opacity:.55; }
        .wai-layout-tv > footer b { color:var(--layout-accent); }

        .layout-orbit.wai-layout-phone { background:radial-gradient(circle at 50% 47%,rgba(56,189,248,.23),transparent 30%),#06101c; }
        .layout-orbit .wai-layout-player-rail { justify-content:center; }
        .layout-orbit .wai-layout-player-rail b { display:none; }
        .layout-orbit .wai-layout-focus { margin-top:38px; }
        .layout-orbit .wai-layout-secret { width:150px; height:150px; margin:15px 0 3px; border:1px solid rgba(56,189,248,.42); border-radius:50%; background:rgba(7,24,40,.72); box-shadow:0 0 0 17px rgba(56,189,248,.06),0 0 0 34px rgba(244,114,182,.035); }
        .layout-orbit .wai-layout-secret > svg { position:absolute; top:28px; color:var(--layout-accent); }
        .layout-orbit .wai-layout-secret > span { position:absolute; bottom:28px; }
        .layout-orbit .wai-layout-answer-controls { position:absolute; left:16px; right:16px; bottom:15px; height:152px; }
        .layout-orbit .wai-layout-answer-controls .is-no,.layout-orbit .wai-layout-answer-controls .is-yes { position:absolute; top:0; width:78px; height:78px; border-radius:50%; flex-direction:column; }
        .layout-orbit .wai-layout-answer-controls .is-no { left:12px; background:#16263a; }
        .layout-orbit .wai-layout-answer-controls .is-yes { right:12px; background:var(--layout-accent); color:#06101c; }
        .layout-orbit .wai-layout-answer-controls .is-guess { position:absolute; left:0; right:0; bottom:0; border-radius:999px; background:var(--layout-secondary); }
        .layout-orbit.wai-layout-tv { background:radial-gradient(circle at 55% 50%,rgba(56,189,248,.2),transparent 30%),#06101c; }
        .layout-orbit .wai-layout-tv-roster { position:absolute; inset:8% 4% 1%; }
        .layout-orbit .wai-layout-tv-roster > span { position:absolute; flex-direction:column; }
        .layout-orbit .wai-layout-tv-roster > span:nth-child(1){left:3%;top:18%}.layout-orbit .wai-layout-tv-roster > span:nth-child(2){left:13%;bottom:9%}.layout-orbit .wai-layout-tv-roster > span:nth-child(3){right:5%;top:12%}.layout-orbit .wai-layout-tv-roster > span:nth-child(4){right:14%;bottom:8%}.layout-orbit .wai-layout-tv-roster > span:nth-child(5){left:37%;top:0}.layout-orbit .wai-layout-tv-roster > span:nth-child(6){right:37%;bottom:0}
        .layout-orbit .wai-layout-tv-stage { inset:15% 24%; display:flex; align-items:center; justify-content:center; gap:8%; border:1px solid rgba(56,189,248,.24); border-radius:50%; }
        .layout-orbit .wai-layout-tv-secret { padding:5%; border-radius:50%; background:rgba(9,28,47,.8); }

        .layout-deck.wai-layout-phone { background:linear-gradient(155deg,#f4f7ff,#dfe8ff); color:#171525; }
        .layout-deck .wai-layout-phone-head em,.layout-deck .wai-layout-focus > small { color:#623cea; }
        .layout-deck .wai-layout-player-rail { overflow:hidden; padding:5px; border-radius:999px; background:white; }
        .layout-deck .wai-layout-player-rail > span { flex:1; }
        .layout-deck .wai-layout-player-rail b { display:none; }
        .layout-deck .wai-layout-focus { position:relative; height:420px; margin-top:12px; justify-content:center; border:3px solid #171525; border-radius:28px; background:#fff; box-shadow:9px 10px 0 #623cea; transform:rotate(-1.5deg); }
        .layout-deck .wai-layout-focus::before,.layout-deck .wai-layout-focus::after { content:""; position:absolute; inset:7px -8px -9px 8px; z-index:-1; border:3px solid #171525; border-radius:28px; background:#ff6b35; transform:rotate(4deg); }
        .layout-deck .wai-layout-focus::after { background:#d9ff5a; transform:rotate(-4deg); }
        .layout-deck .wai-layout-secret { width:130px; height:165px; border:2px solid #171525; border-radius:20px; background:#d9ff5a; }
        .layout-deck .wai-layout-secret > span { margin-top:8px; }
        .layout-deck .wai-layout-answer-controls .is-no,.layout-deck .wai-layout-answer-controls .is-yes { position:absolute; z-index:8; top:46%; width:64px; height:118px; border:3px solid #171525; background:white; color:#171525; flex-direction:column; }
        .layout-deck .wai-layout-answer-controls .is-no { left:-6px; border-radius:0 28px 28px 0; }
        .layout-deck .wai-layout-answer-controls .is-yes { right:-6px; border-radius:28px 0 0 28px; background:#d9ff5a; }
        .layout-deck .wai-layout-answer-controls .is-guess { position:absolute; z-index:8; left:38px; right:38px; bottom:18px; border-radius:18px; background:#623cea; color:white; box-shadow:0 6px 0 #332078; }
        .layout-deck.wai-layout-tv { background:linear-gradient(135deg,#eef3ff 0 72%,#d9ff5a 72%); color:#171525; }
        .layout-deck .wai-layout-tv-roster { position:absolute; left:0; top:13%; bottom:7%; width:18%; display:flex; flex-direction:column; justify-content:center; gap:6%; }
        .layout-deck .wai-layout-tv-roster > span { border-radius:999px; padding:4px; background:white; }
        .layout-deck .wai-layout-tv-stage { left:22%; right:3%; top:11%; bottom:6%; display:grid; grid-template-columns:.7fr 1.3fr; align-items:center; gap:5%; border:3px solid #171525; border-radius:24px; padding:5%; background:white; box-shadow:10px 10px 0 #623cea; transform:rotate(-1deg); }
        .layout-deck .wai-layout-tv-secret { border-radius:20px; padding:5%; background:#d9ff5a; }

        .layout-split.wai-layout-phone { background:#171625; }
        .layout-split .wai-layout-player-rail { justify-content:space-between; border-bottom:1px solid rgba(255,255,255,.14); padding-bottom:8px; }
        .layout-split .wai-layout-player-rail b { display:none; }
        .layout-split .wai-layout-focus { height:255px; justify-content:center; }
        .layout-split .wai-layout-secret { width:100%; grid-template-columns:50px auto 1fr; text-align:left; }
        .layout-split .wai-layout-secret > span { margin-left:10px; }
        .layout-split .wai-layout-answer-controls { position:absolute; left:0; right:0; bottom:0; height:310px; display:grid; grid-template-columns:1fr 1fr; }
        .layout-split .wai-layout-answer-controls .is-no,.layout-split .wai-layout-answer-controls .is-yes { min-height:100%; flex-direction:column; font-size:18px; }
        .layout-split .wai-layout-answer-controls .is-no { background:#302d48; }
        .layout-split .wai-layout-answer-controls .is-yes { background:var(--layout-accent); color:#151820; }
        .layout-split .wai-layout-answer-controls .is-guess { position:absolute; z-index:4; left:50%; top:50%; width:96px; height:96px; border:8px solid #171625; border-radius:50%; background:var(--layout-secondary); transform:translate(-50%,-50%); flex-direction:column; }
        .layout-split .wai-layout-answer-controls .is-guess:active { transform:translate(-50%,-50%) scale(.92); }
        .layout-split.wai-layout-tv { background:linear-gradient(90deg,#302d48 0 50%,#b8f34a 50%); color:white; }
        .layout-split .wai-layout-tv > header { mix-blend-mode:difference; }
        .layout-split .wai-layout-tv-roster { position:absolute; top:4%; left:4%; right:4%; display:flex; justify-content:space-between; }
        .layout-split .wai-layout-tv-stage { inset:20% 8% 8%; display:grid; grid-template-columns:1fr 1fr; align-items:center; gap:12%; }
        .layout-split .wai-layout-tv-person { align-items:flex-end; text-align:right; }
        .layout-split .wai-layout-tv-secret { color:#171625; }

        .layout-constellation.wai-layout-phone { background:radial-gradient(circle at 43% 45%,rgba(125,211,252,.18),transparent 28%),#02070f; }
        .layout-constellation .wai-layout-player-rail { position:absolute; inset:78px 78px 130px 12px; }
        .layout-constellation .wai-layout-player-rail > span { position:absolute; flex-direction:column; opacity:.7; }
        .layout-constellation .wai-layout-player-rail > span:nth-child(1){left:4%;top:9%}.layout-constellation .wai-layout-player-rail > span:nth-child(2){right:2%;top:23%}.layout-constellation .wai-layout-player-rail > span:nth-child(3){left:9%;bottom:20%}.layout-constellation .wai-layout-player-rail > span:nth-child(4){right:7%;bottom:7%}
        .layout-constellation .wai-layout-focus { position:absolute; left:35px; right:90px; top:185px; }
        .layout-constellation .wai-layout-secret { width:145px; height:145px; border:1px solid rgba(125,211,252,.35); border-radius:50%; background:rgba(5,21,34,.8); box-shadow:0 0 42px -18px var(--layout-accent); }
        .layout-constellation .wai-layout-secret::before,.layout-constellation .wai-layout-secret::after { content:""; position:absolute; width:130px; height:1px; background:linear-gradient(90deg,transparent,var(--layout-accent),transparent); transform:rotate(28deg); opacity:.35; }
        .layout-constellation .wai-layout-secret::after { transform:rotate(-38deg); }
        .layout-constellation .wai-layout-answer-controls { position:absolute; right:11px; top:104px; bottom:90px; width:62px; display:flex; flex-direction:column; justify-content:center; gap:10px; }
        .layout-constellation .wai-layout-answer-controls button { min-height:74px; border:1px solid rgba(125,211,252,.24); border-radius:999px; flex-direction:column; background:rgba(10,29,45,.86); }
        .layout-constellation .wai-layout-answer-controls .is-yes { background:var(--layout-accent); color:#03101a; }
        .layout-constellation .wai-layout-answer-controls .is-guess { min-height:112px; background:var(--layout-secondary); }
        .layout-constellation.wai-layout-tv { background:radial-gradient(circle at 53% 48%,rgba(125,211,252,.17),transparent 28%),#02070f; }
        .layout-constellation .wai-layout-tv-roster { position:absolute; inset:5% 3%; }
        .layout-constellation .wai-layout-tv-roster > span { position:absolute; flex-direction:column; }
        .layout-constellation .wai-layout-tv-roster > span:nth-child(1){left:3%;top:15%}.layout-constellation .wai-layout-tv-roster > span:nth-child(2){left:16%;bottom:5%}.layout-constellation .wai-layout-tv-roster > span:nth-child(3){right:4%;top:12%}.layout-constellation .wai-layout-tv-roster > span:nth-child(4){right:14%;bottom:5%}.layout-constellation .wai-layout-tv-roster > span:nth-child(5){left:35%;top:0}.layout-constellation .wai-layout-tv-roster > span:nth-child(6){right:34%;bottom:0}
        .layout-constellation .wai-layout-tv-stage { inset:19% 25% 8%; display:flex; align-items:center; justify-content:center; gap:9%; border:1px solid rgba(125,211,252,.2); border-radius:50%; }
        .layout-constellation .wai-layout-tv-secret { border-radius:24px; padding:5%; background:rgba(8,27,43,.78); }

        .wai-cipher-intro { min-height:78vh; padding:clamp(76px,10vw,150px) clamp(24px,7vw,120px); border-top:1px solid rgba(125,211,252,.16); background:radial-gradient(circle at 75% 28%,rgba(56,189,248,.08),transparent 24%),linear-gradient(145deg,#05070a,#080d12 55%,#05070a); }
        .wai-cipher-intro > span { color:#70c8ed; font:650 11px/1 var(--font-geist-mono),monospace; letter-spacing:.24em; }
        .wai-cipher-intro h2 { margin:28px 0 30px; font-size:clamp(68px,10vw,160px); line-height:.82; letter-spacing:-.075em; }
        .wai-cipher-intro h2 em { color:#75c8e8; font-style:normal; font-weight:440; }
        .wai-cipher-intro > p { max-width:760px; color:#99a7b1; font-size:clamp(19px,2vw,30px); line-height:1.3; letter-spacing:-.025em; }
        .wai-cipher-intro nav { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); max-width:780px; margin-top:48px; border-top:1px solid rgba(255,255,255,.12); }
        .wai-cipher-intro nav a { display:grid; grid-template-columns:46px 1fr; padding:18px 14px; border-bottom:1px solid rgba(255,255,255,.12); color:#c9d3d9; text-decoration:none; transition:background .18s cubic-bezier(.2,.8,.2,1),color .18s cubic-bezier(.2,.8,.2,1); }
        .wai-cipher-intro nav a:hover { color:white; background:rgba(56,189,248,.055); }
        .wai-cipher-intro nav b { color:#4d7183; font:600 11px/1.5 var(--font-geist-mono),monospace; }
        .wai-cipher-concept { --wai-accent:#79c9ec; --wai-secondary:#163b4d; background:radial-gradient(circle at 12% 36%,rgba(56,189,248,.055),transparent 24%),linear-gradient(145deg,#05070a,#090e13 55%,#040608); }
        .wai-cipher-concept .wai-preview-concept-copy h2 { max-width:1000px; }
        .wai-cipher-state-tabs { display:grid; grid-template-columns:repeat(4,1fr); gap:3px; width:100%; margin-bottom:9px; }
        .wai-cipher-state-tabs button { min-height:28px; border:1px solid rgba(255,255,255,.1); border-radius:7px; background:rgba(255,255,255,.025); color:#65737c; cursor:pointer; font:650 6px/1 var(--font-geist-mono),monospace; letter-spacing:.12em; transition:color .18s cubic-bezier(.2,.8,.2,1),background .18s cubic-bezier(.2,.8,.2,1),transform .18s cubic-bezier(.2,.8,.2,1); }
        .wai-cipher-state-tabs button:hover,.wai-cipher-state-tabs button.is-active { color:#bcecff; background:rgba(56,189,248,.09); }
        .wai-cipher-state-tabs button:active { transform:scale(.97); }
        .wai-cipher-phone { position:relative; width:100%; height:100%; overflow:hidden; border-radius:34px; background:#06090d; color:#eaf4f8; font-family:var(--font-geist-sans),sans-serif; animation:wai-cipher-device-in .72s cubic-bezier(.2,.8,.2,1) both; }
        .wai-cipher-phone button { color:inherit; cursor:pointer; font-family:inherit; }
        .wai-cipher-ambient,.wai-cipher-tv-ambient { position:absolute; inset:0; overflow:hidden; pointer-events:none; }
        .wai-cipher-ambient i,.wai-cipher-tv-ambient i { position:absolute; display:block; border:1px solid rgba(125,211,252,.08); background:linear-gradient(145deg,rgba(255,255,255,.035),rgba(56,189,248,.015)); box-shadow:inset 0 1px rgba(255,255,255,.04); transform:rotate(-7deg); animation:wai-cipher-drift 9s cubic-bezier(.45,0,.35,1) 3 alternate both; }
        .wai-cipher-ambient i:nth-child(1){width:190px;height:330px;left:-95px;top:115px}.wai-cipher-ambient i:nth-child(2){width:210px;height:290px;right:-130px;top:240px;animation-delay:-3s}.wai-cipher-ambient i:nth-child(3){width:150px;height:220px;left:100px;bottom:-160px;animation-delay:-6s}
        @keyframes wai-cipher-drift { to { transform:translate3d(8px,-7px,0) rotate(-5deg); opacity:.62; } }
        @keyframes wai-cipher-device-in { from { opacity:0; transform:translateY(12px) scale(.985); filter:blur(5px); } }
        .wai-cipher-turn { position:relative; z-index:2; height:100%; display:flex; flex-direction:column; padding:17px 14px 13px; }
        .wai-cipher-phone-header { display:flex; align-items:center; justify-content:space-between; }
        .wai-cipher-phone-header b { font-size:10px; letter-spacing:.08em; }
        .wai-cipher-phone-header span { color:#65737c; font:650 7px/1 var(--font-geist-mono),monospace; letter-spacing:.15em; }
        .wai-cipher-player-ribbon { display:flex; gap:6px; margin:17px -14px 0; padding:0 14px 8px; overflow:hidden; }
        .wai-cipher-player-ribbon > span { min-width:83px; display:grid; grid-template-columns:25px 1fr; grid-template-rows:auto auto; column-gap:6px; align-items:center; padding:7px 8px; border-radius:13px; background:rgba(255,255,255,.025); box-shadow:inset 0 0 0 1px rgba(255,255,255,.055); opacity:.42; }
        .wai-cipher-player-ribbon > span.is-current { min-width:105px; background:rgba(56,189,248,.075); box-shadow:inset 0 0 0 1px rgba(125,211,252,.16),0 8px 22px -18px #38bdf8; opacity:1; }
        .wai-cipher-player-ribbon .wai-preview-avatar { grid-row:1/3; width:25px; height:25px; background:#101a21; color:#9dddf5; font-size:8px; }
        .wai-cipher-player-ribbon b { overflow:hidden; font-size:7px; text-overflow:ellipsis; white-space:nowrap; }
        .wai-cipher-player-ribbon small { overflow:hidden; color:#60707a; font:550 5px/1 var(--font-geist-mono),monospace; text-overflow:ellipsis; white-space:nowrap; }
        .wai-cipher-active-player { display:flex; align-items:center; gap:12px; margin-top:11px; }
        .wai-cipher-active-player > span { display:grid; place-items:center; width:48px; height:48px; border-radius:15px; background:linear-gradient(145deg,#18252c,#0a1015); color:#9fdcf4; font-size:21px; font-weight:780; box-shadow:inset 0 1px rgba(255,255,255,.1),0 12px 24px -18px #000; }
        .wai-cipher-active-player div { display:grid; grid-template-columns:auto 1fr; align-items:end; column-gap:7px; }
        .wai-cipher-active-player small { grid-column:1/3; color:#6fbfe0; font:650 6px/1 var(--font-geist-mono),monospace; letter-spacing:.15em; }
        .wai-cipher-active-player h3 { margin:4px 0 0; font-size:24px; line-height:.9; letter-spacing:-.045em; }
        .wai-cipher-active-player p { margin:0 0 1px; color:#61717b; font-size:8px; }
        .wai-cipher-stack { position:relative; flex:none; width:100%; height:246px; margin-top:9px; perspective:900px; }
        .wai-cipher-glass-layer { position:absolute; inset:9px 23px 10px; overflow:hidden; border-radius:23px; background:linear-gradient(145deg,rgba(33,48,58,.66),rgba(5,10,14,.78)); box-shadow:inset 0 1px rgba(255,255,255,.12),inset 0 -1px rgba(56,189,248,.07),0 20px 38px -28px #000; backdrop-filter:blur(6px); transition:transform .72s cubic-bezier(.32,.72,0,1),opacity .48s cubic-bezier(.2,.8,.2,1),filter .48s cubic-bezier(.2,.8,.2,1); animation:wai-cipher-layer-focus .72s cubic-bezier(.2,.8,.2,1) both; will-change:transform,opacity; }
        .wai-cipher-glass-layer.layer-2 { animation-delay:.08s; }
        .wai-cipher-glass-layer.layer-3 { animation-delay:.16s; }
        .wai-cipher-glass-layer::after { content:""; position:absolute; inset:0; background:linear-gradient(112deg,transparent 18%,rgba(255,255,255,.055) 42%,transparent 59%); transform:translateX(-70%); animation:wai-cipher-glint 7.5s cubic-bezier(.45,0,.35,1) 3 both; }
        .wai-cipher-glass-layer.layer-1 { transform:translate3d(-8px,6px,10px) rotateY(2deg) rotate(-1.2deg); }
        .wai-cipher-glass-layer.layer-2 { inset:15px 17px 5px 28px; transform:translate3d(5px,-2px,20px) rotateY(-2deg) rotate(.8deg); }
        .wai-cipher-glass-layer.layer-3 { inset:22px 29px 0 18px; transform:translate3d(0,0,30px) rotate(.2deg); }
        .wai-cipher-stack.streak-1 .layer-1,.wai-cipher-stack.streak-2 .layer-1,.wai-cipher-stack.streak-3 .layer-1 { transform:translate3d(-110%,8px,10px) rotate(-5deg); opacity:.16; filter:blur(2px); }
        .wai-cipher-stack.streak-2 .layer-2,.wai-cipher-stack.streak-3 .layer-2 { transform:translate3d(108%,-4px,20px) rotate(4deg); opacity:.14; filter:blur(2px); }
        .wai-cipher-stack.streak-3 .layer-3 { transform:translate3d(0,-105%,30px) rotate(-2deg); opacity:.1; filter:blur(2px); }
        .wai-cipher-glass-layer i { position:absolute; color:rgba(190,220,232,.15); font-style:normal; font-size:42px; font-weight:650; transition:transform .72s cubic-bezier(.32,.72,0,1),opacity .5s cubic-bezier(.2,.8,.2,1); animation:wai-cipher-symbol 8s cubic-bezier(.45,0,.35,1) 3 alternate both; }
        .wai-cipher-glass-layer i:nth-child(1){left:14%;top:13%}.wai-cipher-glass-layer i:nth-child(2){right:12%;top:28%;font-size:26px}.wai-cipher-glass-layer i:nth-child(3){left:38%;bottom:15%;font-size:35px}.wai-cipher-glass-layer i:nth-child(4){right:35%;top:11%;font-size:19px}.wai-cipher-glass-layer i:nth-child(5){right:9%;bottom:9%;font-size:23px}
        .wai-cipher-stack.streak-1 .layer-2 i:nth-child(1),.wai-cipher-stack.streak-2 .layer-3 i:nth-child(1) { transform:translate3d(34px,12px,0); }
        .wai-cipher-stack.streak-1 .layer-2 i:nth-child(3),.wai-cipher-stack.streak-2 .layer-3 i:nth-child(3) { transform:translate3d(-24px,-17px,0); }
        .wai-cipher-stack.streak-2 .layer-3 i:nth-child(2) { transform:translate3d(-36px,24px,0); }
        @keyframes wai-cipher-layer-focus { from { opacity:0; filter:blur(7px); } }
        @keyframes wai-cipher-glint { 0%,22% { transform:translateX(-80%); opacity:0; } 43% { opacity:1; } 65%,100% { transform:translateX(90%); opacity:0; } }
        @keyframes wai-cipher-symbol { 50% { opacity:.42; } }
        .wai-cipher-lock { position:absolute; z-index:8; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; }
        .wai-cipher-lock span { color:#657681; font:650 6px/1 var(--font-geist-mono),monospace; letter-spacing:.24em; }
        .wai-cipher-lock strong { margin:8px 0 6px; color:#b8d7e4; font-size:45px; line-height:.8; letter-spacing:.18em; text-indent:.18em; text-shadow:0 0 24px rgba(56,189,248,.14); }
        .wai-cipher-lock small { color:#58839a; font:600 5px/1 var(--font-geist-mono),monospace; letter-spacing:.16em; }
        .wai-cipher-streak-copy { display:flex; justify-content:space-between; margin:0 8px 8px; color:#64727a; font:650 6px/1 var(--font-geist-mono),monospace; letter-spacing:.13em; }
        .wai-cipher-streak-copy b { color:#83cae8; }
        .wai-cipher-control-deck { display:grid; grid-template-columns:.86fr 1.28fr .86fr; min-height:94px; margin-top:auto; border-radius:24px 24px 18px 18px; padding:5px; background:linear-gradient(155deg,#17222a,#070b0f); box-shadow:inset 0 1px rgba(255,255,255,.12),0 20px 35px -24px #000; }
        .wai-cipher-control-deck button { min-width:0; border:0; background:linear-gradient(155deg,rgba(255,255,255,.045),rgba(255,255,255,.008)); transition:transform .18s cubic-bezier(.2,.8,.2,1),background .18s cubic-bezier(.2,.8,.2,1); }
        .wai-cipher-control-deck button:active { transform:scale(.97); }
        .wai-cipher-control-deck button small { display:block; margin-bottom:8px; color:#53616a; font:600 4px/1 var(--font-geist-mono),monospace; letter-spacing:.12em; }
        .wai-cipher-control-deck button b { font-size:14px; letter-spacing:-.02em; }
        .wai-cipher-control-deck .is-no { border-radius:20px 9px 9px 14px; color:#83919a; }
        .wai-cipher-control-deck .is-guess { margin:-8px 4px -1px; border-radius:18px 18px 12px 12px; background:linear-gradient(160deg,#1b3643,#091117); color:#bceaff; box-shadow:inset 0 0 0 1px rgba(125,211,252,.16),0 12px 25px -20px #38bdf8; }
        .wai-cipher-control-deck .is-yes { border-radius:9px 20px 14px 9px; color:#9fdcf4; }
        .wai-cipher-clean-state { position:relative; z-index:3; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:32px 22px 22px; background:radial-gradient(circle at 50% 42%,rgba(56,189,248,.055),transparent 34%),#06090d; text-align:center; }
        .wai-cipher-back { position:absolute; top:24px; right:20px; min-height:32px; border:0; background:transparent; color:#65747d!important; font:650 6px/1 var(--font-geist-mono),monospace!important; letter-spacing:.13em; }
        .wai-cipher-state-mark { display:grid; place-items:center; width:58px; height:58px; margin-bottom:16px; border-radius:19px; background:linear-gradient(145deg,#192832,#091015); color:#8ed4f0; font-size:19px; font-weight:750; box-shadow:inset 0 1px rgba(255,255,255,.1); }
        .wai-cipher-clean-state > small { color:#68b7d7; font:650 6px/1 var(--font-geist-mono),monospace; letter-spacing:.2em; }
        .wai-cipher-clean-state > h3 { margin:8px 0 28px; font-size:31px; line-height:.95; letter-spacing:-.055em; }
        .wai-cipher-guess-state label { width:100%; display:flex; flex-direction:column; gap:9px; padding:18px 4px; border-bottom:1px solid rgba(125,211,252,.34); text-align:left; }
        .wai-cipher-guess-state label span { color:#59666e; font:600 6px/1 var(--font-geist-mono),monospace; letter-spacing:.13em; }
        .wai-cipher-guess-state label b { font-size:20px; }
        .wai-cipher-guess-state label i { display:inline-block; width:1px; height:20px; margin-left:3px; background:#79c9ec; vertical-align:-4px; animation:wai-blink 1s steps(1) infinite; }
        .wai-cipher-guess-state p { margin:15px 0 0; color:#5d6971; font-size:8px; line-height:1.45; text-align:left; }
        .wai-cipher-primary { width:100%; min-height:50px; margin-top:auto; border:0; border-radius:15px; background:#b3e5f7; color:#061016!important; font-size:10px; font-weight:800; letter-spacing:.1em; transition:transform .18s cubic-bezier(.2,.8,.2,1); }
        .wai-cipher-primary:active { transform:scale(.97); }
        .wai-cipher-comparison { position:relative; width:100%; display:grid; gap:8px; }
        .wai-cipher-comparison article { min-height:88px; display:flex; flex-direction:column; align-items:flex-start; justify-content:center; gap:9px; padding:15px 17px; border-radius:18px; background:linear-gradient(145deg,rgba(34,49,59,.72),rgba(7,12,16,.82)); box-shadow:inset 0 1px rgba(255,255,255,.09); text-align:left; }
        .wai-cipher-comparison article:last-child { box-shadow:inset 0 1px rgba(255,255,255,.09),inset 0 0 0 1px rgba(125,211,252,.13); }
        .wai-cipher-comparison small { color:#5e707b; font:600 6px/1 var(--font-geist-mono),monospace; letter-spacing:.12em; }
        .wai-cipher-comparison b { font-size:17px; }
        .wai-cipher-comparison > i { position:absolute; z-index:2; left:50%; top:50%; display:grid; place-items:center; width:29px; height:29px; border-radius:50%; background:#101b22; color:#6faec8; font:650 6px/1 var(--font-geist-mono),monospace; font-style:normal; transform:translate(-50%,-50%); }
        .wai-cipher-verdict { width:100%; display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-top:auto; }
        .wai-cipher-verdict button { min-height:50px; border:0; border-radius:15px; background:#11191e; color:#76848c; font-size:8px; font-weight:750; }
        .wai-cipher-verdict button:last-child { background:#b3e5f7; color:#061016; }
        .wai-cipher-reveal-state { overflow:hidden; }
        .wai-cipher-reveal-glass { position:absolute; inset:0; pointer-events:none; }
        .wai-cipher-reveal-glass i { position:absolute; inset:8% 10%; border-radius:28px; background:linear-gradient(145deg,rgba(23,82,109,.72),rgba(3,19,29,.84)); box-shadow:inset 0 1px rgba(186,230,253,.2); }
        .wai-cipher-reveal-glass i:first-child { clip-path:inset(0 50% 0 0); animation:wai-cipher-reveal-left 1.15s cubic-bezier(.32,.72,0,1) .15s both; }
        .wai-cipher-reveal-glass i:last-child { clip-path:inset(0 0 0 50%); animation:wai-cipher-reveal-right 1.15s cubic-bezier(.32,.72,0,1) .15s both; }
        .wai-cipher-reveal-state > small,.wai-cipher-reveal-state > p,.wai-cipher-reveal-state > strong,.wai-cipher-reveal-state > button,.wai-cipher-decoded-name { position:relative; z-index:2; }
        .wai-cipher-decoded-name { display:flex; justify-content:center; gap:1px; margin:24px -12px 12px; }
        .wai-cipher-decoded-name span { display:inline-block; color:#c8efff; font-size:27px; font-weight:820; letter-spacing:-.055em; text-shadow:0 0 22px rgba(56,189,248,.3); animation:wai-cipher-letter-lock .62s cubic-bezier(.2,.8,.2,1) calc(.5s + var(--letter-delay)) both; }
        .wai-cipher-reveal-state > p { margin:0; color:#63747e; font-size:9px; }
        .wai-cipher-reveal-state > strong { margin-top:22px; border-radius:999px; padding:9px 15px; background:rgba(56,189,248,.1); color:#89d8f7; font-size:10px; letter-spacing:.1em; animation:wai-cipher-score-in .5s cubic-bezier(.2,.8,.2,1) 1.3s both; }
        @keyframes wai-cipher-reveal-left { to { transform:translate3d(-115%,0,0) rotate(-4deg); opacity:.12; filter:blur(2px); } }
        @keyframes wai-cipher-reveal-right { to { transform:translate3d(115%,0,0) rotate(4deg); opacity:.12; filter:blur(2px); } }
        @keyframes wai-cipher-letter-lock { from { opacity:0; transform:translate3d(var(--cipher-letter-x,18px),14px,0) rotate(8deg); filter:blur(6px); } }
        @keyframes wai-cipher-score-in { from { opacity:0; transform:translateY(8px) scale(.94); filter:blur(3px); } }
        .wai-cipher-results-state { justify-content:flex-start; padding-top:58px; }
        .wai-cipher-results-state > h3 { margin-bottom:20px; }
        .wai-cipher-result-list { width:100%; display:grid; gap:7px; }
        .wai-cipher-result-list article { display:grid; grid-template-columns:28px 1fr auto; align-items:center; gap:10px; min-height:68px; padding:10px 14px; border-radius:17px; background:linear-gradient(145deg,rgba(31,45,54,.68),rgba(7,12,16,.82)); box-shadow:inset 0 1px rgba(255,255,255,.08); text-align:left; animation:wai-cipher-result-in .5s cubic-bezier(.2,.8,.2,1) both; }
        .wai-cipher-result-list article:nth-child(2){animation-delay:.08s}.wai-cipher-result-list article:nth-child(3){animation-delay:.16s}
        @keyframes wai-cipher-result-in { from { opacity:0; transform:translateY(8px); filter:blur(3px); } }
        .wai-cipher-result-list article > span { color:#5f8191; font:650 8px/1 var(--font-geist-mono),monospace; }
        .wai-cipher-result-list article > div { display:flex; flex-direction:column; gap:4px; }
        .wai-cipher-result-list b { font-size:11px; }
        .wai-cipher-result-list small { color:#60717b; font:550 6px/1 var(--font-geist-mono),monospace; }
        .wai-cipher-result-list strong { color:#95d9f3; font-size:15px; }
        .wai-cipher-tv-column { padding-top:37px; }
        .wai-cipher-tv { position:relative; width:100%; height:100%; overflow:hidden; border-radius:13px; padding:2.5% 3%; background:#06090d; color:#edf6f9; font-family:var(--font-geist-sans),sans-serif; animation:wai-cipher-device-in .82s cubic-bezier(.2,.8,.2,1) .08s both; }
        .wai-cipher-tv > header { position:relative; z-index:3; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; }
        .wai-cipher-tv > header b { font-size:clamp(9px,1vw,16px); letter-spacing:.08em; }
        .wai-cipher-tv > header span { color:#78bedc; font:650 clamp(5px,.55vw,9px)/1 var(--font-geist-mono),monospace; letter-spacing:.13em; }
        .wai-cipher-tv > header em { justify-self:end; color:#67767f; font:600 clamp(5px,.55vw,9px)/1 var(--font-geist-mono),monospace; font-style:normal; }
        .wai-cipher-tv > main { position:relative; z-index:2; height:82%; display:grid; grid-template-columns:minmax(0,1fr) 24%; gap:4%; padding-top:3%; }
        .wai-cipher-tv-stage { position:relative; display:grid; grid-template-columns:32% 1fr; align-items:center; gap:3%; padding:4%; border-radius:clamp(14px,2vw,30px); background:linear-gradient(145deg,rgba(29,43,52,.46),rgba(4,8,11,.7)); box-shadow:inset 0 1px rgba(255,255,255,.075); }
        .wai-cipher-tv-player { position:relative; z-index:5; display:flex; flex-direction:column; align-items:flex-start; }
        .wai-cipher-tv-player > span { display:grid; place-items:center; width:clamp(58px,8vw,124px); aspect-ratio:1; margin-bottom:8%; border-radius:28%; background:linear-gradient(145deg,#1d2d36,#091015); color:#a5def3; font-size:clamp(24px,4vw,60px); font-weight:780; box-shadow:inset 0 1px rgba(255,255,255,.1),0 22px 38px -30px #000; }
        .wai-cipher-tv-player small { color:#72bad8; font:650 clamp(4px,.48vw,8px)/1 var(--font-geist-mono),monospace; letter-spacing:.14em; }
        .wai-cipher-tv-player h3 { margin:5px 0 2px; font-size:clamp(36px,5.8vw,88px); line-height:.8; letter-spacing:-.065em; }
        .wai-cipher-tv-player p { margin:0; color:#66757d; font-size:clamp(6px,.75vw,12px); }
        .wai-cipher-tv .wai-cipher-stack { width:100%; height:85%; min-height:0; margin:0; }
        .wai-cipher-tv .wai-cipher-stack.is-auto-demo .layer-1 { animation:wai-cipher-tv-layer-one 8s cubic-bezier(.32,.72,0,1) .8s 2 both; }
        .wai-cipher-tv .wai-cipher-stack.is-auto-demo .layer-2 { animation:wai-cipher-tv-layer-two 8s cubic-bezier(.32,.72,0,1) .8s 2 both; }
        .wai-cipher-tv .wai-cipher-stack.is-auto-demo .layer-3 { animation:wai-cipher-tv-layer-three 8s cubic-bezier(.32,.72,0,1) .8s 2 both; }
        @keyframes wai-cipher-tv-layer-one { 0%,10%,92%,100% { transform:translate3d(-8px,6px,10px) rotate(-1.2deg); opacity:1; } 24%,78% { transform:translate3d(-112%,8px,10px) rotate(-5deg); opacity:.14; } }
        @keyframes wai-cipher-tv-layer-two { 0%,29%,92%,100% { transform:translate3d(5px,-2px,20px) rotate(.8deg); opacity:1; } 44%,78% { transform:translate3d(110%,-4px,20px) rotate(4deg); opacity:.12; } }
        @keyframes wai-cipher-tv-layer-three { 0%,49%,92%,100% { transform:translate3d(0,0,30px) rotate(.2deg); opacity:1; } 64%,78% { transform:translate3d(0,-108%,30px) rotate(-2deg); opacity:.1; } }
        .wai-cipher-tv .wai-cipher-stack .wai-cipher-lock strong { font-size:clamp(35px,5vw,78px); }
        .wai-cipher-tv .wai-cipher-stack .wai-cipher-lock span,.wai-cipher-tv .wai-cipher-stack .wai-cipher-lock small { font-size:clamp(4px,.45vw,7px); }
        .wai-cipher-tv-streak { position:absolute; left:4%; bottom:5%; display:flex; gap:12px; color:#63737c; font:650 clamp(4px,.46vw,7px)/1 var(--font-geist-mono),monospace; letter-spacing:.13em; }
        .wai-cipher-tv-streak b { color:#8bcfe9; }
        .wai-cipher-tv-ranking { display:flex; flex-direction:column; gap:4%; padding:8% 8%; border-radius:clamp(14px,2vw,30px); background:linear-gradient(145deg,rgba(27,40,48,.52),rgba(5,9,12,.78)); box-shadow:inset 0 1px rgba(255,255,255,.07); }
        .wai-cipher-tv-ranking > small { margin-bottom:4%; color:#667781; font:650 clamp(4px,.46vw,7px)/1 var(--font-geist-mono),monospace; letter-spacing:.17em; }
        .wai-cipher-tv-ranking > div { flex:1; display:grid; grid-template-columns:18% 1fr auto; align-items:center; gap:6%; padding:0 6%; border-radius:999px; color:#71808a; background:rgba(255,255,255,.018); }
        .wai-cipher-tv-ranking > div { animation:wai-cipher-ranking-in .48s cubic-bezier(.2,.8,.2,1) both; }
        .wai-cipher-tv-ranking > div:nth-of-type(1){animation-delay:.28s}.wai-cipher-tv-ranking > div:nth-of-type(2){animation-delay:.36s}.wai-cipher-tv-ranking > div:nth-of-type(3){animation-delay:.44s}.wai-cipher-tv-ranking > div:nth-of-type(4){animation-delay:.52s}
        @keyframes wai-cipher-ranking-in { from { opacity:0; transform:translateX(8px); filter:blur(3px); } }
        .wai-cipher-tv-ranking > div.is-current { color:#d8f3fc; background:rgba(56,189,248,.075); box-shadow:inset 0 0 0 1px rgba(125,211,252,.12); }
        .wai-cipher-tv-ranking span { font:650 clamp(4px,.45vw,7px)/1 var(--font-geist-mono),monospace; }
        .wai-cipher-tv-ranking b { font-size:clamp(5px,.72vw,11px); }
        .wai-cipher-tv-ranking strong { color:#83c7e2; font-size:clamp(5px,.7vw,11px); }
        .wai-cipher-tv > footer { position:absolute; z-index:3; left:3%; right:3%; bottom:2.6%; display:flex; justify-content:space-between; color:#55636b; font:600 clamp(4px,.48vw,8px)/1 var(--font-geist-mono),monospace; letter-spacing:.1em; }
        .wai-cipher-tv > footer b { color:#739eb0; }
        .wai-cipher-tv-ambient i:first-child { width:42%; height:130%; left:33%; top:-25%; }
        .wai-cipher-tv-ambient i:last-child { width:34%; height:95%; right:-16%; bottom:-28%; animation-delay:-4s; }
        .cipher-concept-archive { background:radial-gradient(circle at 14% 34%,rgba(56,189,248,.16),transparent 28%),radial-gradient(circle at 86% 70%,rgba(2,132,199,.13),transparent 31%),linear-gradient(145deg,#04111a,#071d2a 52%,#030a0f); }
        .cipher-concept-archive .wai-preview-concept-number { color:#38bdf8; }
        .cipher-concept-archive .wai-preview-tags i { border-color:rgba(56,189,248,.3); color:#9edfff; background:rgba(2,132,199,.1); }
        .cipher-archive.wai-cipher-phone { background:radial-gradient(circle at 48% 39%,rgba(56,189,248,.17),transparent 33%),linear-gradient(165deg,#03131e,#062638 54%,#020a10); }
        .cipher-archive .wai-cipher-phone-header b { color:#7dd3fc; }
        .cipher-archive .wai-cipher-phone-header span { color:#38bdf8; }
        .cipher-archive .wai-cipher-player-ribbon > span.is-current { background:linear-gradient(145deg,rgba(56,189,248,.3),rgba(2,132,199,.16)); box-shadow:inset 0 0 0 1px rgba(125,211,252,.42),0 10px 24px -16px #0284c7; }
        .cipher-archive .wai-cipher-player-ribbon > span.is-current .wai-preview-avatar,.cipher-archive .wai-cipher-active-player > span { background:linear-gradient(145deg,#38bdf8,#0284c7); color:#03131e; box-shadow:inset 0 1px rgba(255,255,255,.38),0 12px 26px -15px #0284c7; }
        .cipher-archive .wai-cipher-glass-layer { background:linear-gradient(145deg,rgba(13,75,108,.78),rgba(3,25,38,.86)); box-shadow:inset 0 1px rgba(186,230,253,.23),inset 0 -1px rgba(2,132,199,.34),0 22px 42px -26px #0284c7; }
        .cipher-archive .wai-cipher-glass-layer.layer-2 { background:linear-gradient(145deg,rgba(9,91,133,.7),rgba(2,30,47,.88)); }
        .cipher-archive .wai-cipher-glass-layer.layer-3 { background:linear-gradient(145deg,rgba(14,116,166,.62),rgba(2,36,56,.9)); }
        .cipher-archive .wai-cipher-glass-layer i { color:rgba(186,230,253,.31); }
        .cipher-archive .wai-cipher-lock strong { color:#bae6fd; text-shadow:0 0 30px rgba(56,189,248,.46); }
        .cipher-archive .wai-cipher-lock span,.cipher-archive .wai-cipher-lock small,.cipher-archive .wai-cipher-streak-copy b { color:#38bdf8; }
        .cipher-archive .wai-cipher-control-deck { background:linear-gradient(155deg,#0c405b,#041722); box-shadow:inset 0 1px rgba(186,230,253,.22),0 22px 38px -23px #0284c7; }
        .cipher-archive .wai-cipher-control-deck .is-guess { background:linear-gradient(160deg,#38bdf8,#0284c7); color:#03131e; box-shadow:inset 0 1px rgba(255,255,255,.38),0 15px 28px -16px #0284c7; }
        .cipher-archive .wai-cipher-control-deck .is-guess small { color:rgba(3,19,30,.62); }
        .cipher-archive .wai-cipher-control-deck .is-yes { background:linear-gradient(155deg,rgba(56,189,248,.3),rgba(2,132,199,.17)); color:#bae6fd; }
        .cipher-archive .wai-cipher-clean-state { background:radial-gradient(circle at 50% 40%,rgba(56,189,248,.16),transparent 36%),linear-gradient(165deg,#03131e,#051d2a 60%,#020a10); }
        .cipher-archive .wai-cipher-state-mark { background:linear-gradient(145deg,#38bdf8,#0284c7); color:#03131e; box-shadow:inset 0 1px rgba(255,255,255,.36),0 15px 30px -18px #0284c7; }
        .cipher-archive .wai-cipher-comparison article:last-child,.cipher-archive .wai-cipher-result-list article:first-child { background:linear-gradient(145deg,rgba(14,116,166,.4),rgba(3,34,51,.88)); box-shadow:inset 0 0 0 1px rgba(56,189,248,.28); }
        .cipher-archive.wai-cipher-tv { background:radial-gradient(ellipse at 38% 48%,rgba(56,189,248,.17),transparent 38%),linear-gradient(145deg,#03131e,#062638 58%,#020a10); }
        .cipher-archive .wai-cipher-tv-stage { background:linear-gradient(145deg,rgba(8,73,105,.5),rgba(3,24,37,.78)); box-shadow:inset 0 1px rgba(186,230,253,.18),0 24px 48px -38px #0284c7; }
        .cipher-archive .wai-cipher-tv-player > span { background:linear-gradient(145deg,#38bdf8,#0284c7); color:#03131e; box-shadow:inset 0 1px rgba(255,255,255,.36),0 22px 40px -24px #0284c7; }
        .cipher-archive .wai-cipher-tv-ranking { background:linear-gradient(145deg,rgba(7,65,94,.62),rgba(3,20,30,.82)); box-shadow:inset 0 1px rgba(186,230,253,.14); }
        .cipher-archive .wai-cipher-tv-ranking > div.is-current { color:#f0f9ff; background:linear-gradient(90deg,rgba(56,189,248,.32),rgba(2,132,199,.17)); box-shadow:inset 0 0 0 1px rgba(125,211,252,.32); }
        .cipher-lens.wai-cipher-phone { background:radial-gradient(ellipse at 50% 42%,rgba(56,189,248,.055),transparent 34%),#05080b; }
        .cipher-lens .wai-cipher-glass-layer { border-radius:50% 48% 45% 52% / 18% 20% 22% 17%; background:radial-gradient(ellipse at 45% 18%,rgba(138,196,220,.09),transparent 38%),linear-gradient(150deg,rgba(27,43,53,.68),rgba(4,9,12,.8)); }
        .cipher-lens .wai-cipher-glass-layer.layer-1 { transform:translate3d(-13px,4px,10px) rotateY(5deg) rotate(-3deg); }
        .cipher-lens .wai-cipher-glass-layer.layer-2 { transform:translate3d(9px,-1px,20px) rotateY(-5deg) rotate(2.4deg); }
        .cipher-lens .wai-cipher-glass-layer.layer-3 { transform:translate3d(0,0,30px) rotate(-.8deg); }
        .cipher-lens .wai-cipher-stack.streak-1 .layer-1,.cipher-lens .wai-cipher-stack.streak-2 .layer-1,.cipher-lens .wai-cipher-stack.streak-3 .layer-1 { transform:translate3d(-110%,9px,10px) rotate(-7deg); }
        .cipher-lens .wai-cipher-stack.streak-2 .layer-2,.cipher-lens .wai-cipher-stack.streak-3 .layer-2 { transform:translate3d(108%,-8px,20px) rotate(6deg); }
        .cipher-lens .wai-cipher-control-deck { border-radius:42px 42px 21px 21px; background:radial-gradient(ellipse at 50% 0,rgba(125,211,252,.08),transparent 38%),linear-gradient(155deg,#17242c,#060a0e); }
        .cipher-lens .wai-cipher-control-deck .is-no { border-radius:38px 12px 12px 18px; }
        .cipher-lens .wai-cipher-control-deck .is-guess { border-radius:38px 38px 15px 15px; }
        .cipher-lens .wai-cipher-control-deck .is-yes { border-radius:12px 38px 18px 12px; }
        .cipher-lens.wai-cipher-tv { background:radial-gradient(ellipse at 42% 50%,rgba(56,189,248,.055),transparent 38%),#05080b; }
        .cipher-lens .wai-cipher-tv-stage,.cipher-lens .wai-cipher-tv-ranking { border-radius:42% 18% 24% 17% / 14% 20% 17% 22%; }
        .cipher-lens .wai-cipher-tv-player > span { border-radius:50% 44% 48% 45%; }

        .wai-clay-flow { position:relative; padding:100px clamp(18px,4vw,72px) 120px; border-top:1px solid rgba(106,211,255,.18); overflow:hidden; background:radial-gradient(circle at 8% 4%,rgba(56,189,248,.22),transparent 28%),radial-gradient(circle at 91% 29%,rgba(2,132,199,.16),transparent 24%),linear-gradient(155deg,#030b13 0%,#061827 46%,#04101b 100%); color:#eefaff; }
        .wai-clay-flow::before,.wai-clay-flow::after { content:""; position:absolute; z-index:0; border-radius:48% 52% 61% 39% / 57% 38% 62% 43%; pointer-events:none; filter:blur(1px); }
        .wai-clay-flow::before { width:340px; height:270px; top:420px; right:-150px; background:#0a4163; box-shadow:inset 40px 28px rgba(117,219,255,.07),inset -28px -30px rgba(0,0,0,.22); animation:clay-flow-float 9s ease-in-out infinite; }
        .wai-clay-flow::after { width:260px; height:220px; top:42%; left:-150px; background:#07507a; box-shadow:inset 34px 25px rgba(117,219,255,.08),inset -20px -24px rgba(0,0,0,.2); animation:clay-flow-float 11s ease-in-out -4s infinite reverse; }
        .wai-clay-flow > * { position:relative; z-index:1; }
        .wai-clay-flow-head { max-width:1500px; margin:0 auto 86px; }
        .wai-clay-flow-head > span { color:#7bdcff; font:650 11px/1 var(--font-geist-mono),monospace; letter-spacing:.22em; }
        .wai-clay-flow-head h2 { margin:20px 0 24px; max-width:1050px; font-family:"Arial Rounded MT Bold",var(--font-geist-sans),sans-serif; font-size:clamp(58px,8vw,132px); line-height:.82; letter-spacing:-.065em; }
        .wai-clay-flow-head h2 em { color:#38bdf8; font-style:normal; }
        .wai-clay-flow-head p { max-width:850px; margin:0; color:rgba(226,246,255,.66); font-size:20px; line-height:1.55; }
        .wai-clay-flow-head > div { display:flex; flex-wrap:wrap; gap:9px; margin-top:28px; }
        .wai-clay-flow-head > div i { border-radius:999px; padding:9px 13px; background:rgba(56,189,248,.12); color:#dff6ff; font:600 10px/1 var(--font-geist-mono),monospace; letter-spacing:.1em; font-style:normal; box-shadow:inset 0 2px rgba(255,255,255,.06); }
        .wai-clay-flow-subhead { max-width:1500px; margin:0 auto 30px; display:flex; align-items:center; gap:16px; }
        .wai-clay-flow-subhead.is-tv { margin-top:110px; }
        .wai-clay-flow-subhead > span { display:grid; width:44px; height:44px; place-items:center; border-radius:46% 54% 55% 45%; background:linear-gradient(145deg,#69d6ff,#168fc7); color:#032137; font:800 12px/1 var(--font-geist-mono),monospace; box-shadow:inset 0 3px rgba(255,255,255,.28),inset 0 -4px rgba(1,72,108,.22),0 9px 24px -14px #38bdf8; }
        .wai-clay-flow-subhead div { display:flex; flex-direction:column; gap:3px; }
        .wai-clay-flow-subhead b { font-size:24px; letter-spacing:-.03em; }
        .wai-clay-flow-subhead small { color:rgba(226,246,255,.5); font-size:13px; }
        .wai-clay-phone-grid { max-width:1500px; margin:0 auto; display:grid; grid-template-columns:repeat(4,minmax(220px,1fr)); gap:40px 26px; align-items:start; }
        .wai-clay-tv-grid { max-width:1500px; margin:0 auto; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:48px 28px; }
        .wai-clay-flow-item { min-width:0; }
        .wai-clay-flow-label { min-height:52px; margin-bottom:12px; display:flex; align-items:flex-start; gap:11px; }
        .wai-clay-flow-label > span { padding-top:3px; color:#38bdf8; font:650 10px/1 var(--font-geist-mono),monospace; }
        .wai-clay-flow-label > div { display:flex; flex-direction:column; gap:3px; }
        .wai-clay-flow-label b { color:#effaff; font-size:14px; }
        .wai-clay-flow-label small { color:rgba(225,246,255,.42); font-size:10px; }
        .wai-clay-phone-shell { position:relative; width:100%; aspect-ratio:390/844; padding:7px; border-radius:35px; background:linear-gradient(150deg,#1a4158,#03111c 62%); box-shadow:0 28px 55px -34px #000,inset 0 1px rgba(175,229,255,.23); }
        .wai-clay-phone { position:relative; height:100%; overflow:hidden; border-radius:29px; background:radial-gradient(circle at 18% 12%,rgba(56,189,248,.25),transparent 31%),radial-gradient(circle at 84% 82%,rgba(2,132,199,.2),transparent 28%),linear-gradient(145deg,#04101c,#08243a 58%,#061522); color:#effaff; font-family:"Arial Rounded MT Bold",var(--font-geist-sans),sans-serif; isolation:isolate; }
        .wai-clay-phone-atmosphere i,.wai-clay-tv-atmosphere i { position:absolute; z-index:-1; display:block; border-radius:54% 46% 61% 39% / 48% 59% 41% 52%; background:#0b4569; box-shadow:inset 12px 10px rgba(115,218,255,.08),inset -9px -10px rgba(0,0,0,.17); animation:clay-flow-float 6.5s ease-in-out infinite; }
        .wai-clay-phone-atmosphere i:nth-child(1) { width:90px; height:70px; top:11%; right:-40px; }
        .wai-clay-phone-atmosphere i:nth-child(2) { width:55px; height:55px; bottom:19%; left:-25px; background:#096391; animation-delay:-2.4s; }
        .wai-clay-phone-atmosphere i:nth-child(3) { width:35px; height:27px; bottom:6%; right:11%; background:#0a3957; animation-delay:-4s; }
        @keyframes clay-flow-float { 50% { transform:translateY(-9px) rotate(5deg) scale(1.06,.95); } }
        .wai-clay-phone-header { height:7.4%; padding:0 7%; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(116,216,255,.1); }
        .wai-clay-phone-header > span { display:flex; align-items:center; gap:7px; font-size:10px; letter-spacing:.08em; }
        .wai-clay-phone-header svg { width:20px; height:20px; padding:4px; border-radius:47% 53% 42% 58%; background:linear-gradient(145deg,#67d3ff,#209edc); color:#04243a; box-shadow:inset 0 2px rgba(255,255,255,.3),inset 0 -3px rgba(2,86,132,.18); }
        .wai-clay-phone-header em { border-radius:999px; padding:5px 8px; background:#0d3856; color:#bcecff; font:700 7px/1 var(--font-geist-mono),monospace; letter-spacing:.12em; font-style:normal; box-shadow:inset 0 2px rgba(127,217,255,.08),inset 0 -3px rgba(0,0,0,.18); }
        .wai-clay-phone-body { position:relative; z-index:1; height:100%; padding:8% 7% 7%; display:flex; flex-direction:column; align-items:center; text-align:center; }
        .wai-clay-phone-header + .wai-clay-phone-body { height:92.6%; }
        .wai-clay-kicker { color:#7fdcff; font:700 7px/1 var(--font-geist-mono),monospace; letter-spacing:.17em; }
        .wai-clay-phone-body h3 { margin:4% 0; font-size:clamp(18px,2vw,30px); line-height:.92; letter-spacing:-.055em; }
        .wai-clay-phone-body p { color:rgba(224,246,255,.54); font:500 clamp(7px,.72vw,11px)/1.45 var(--font-geist-sans),sans-serif; }
        .wai-clay-blob { display:grid; flex:0 0 auto; place-items:center; width:30px; height:30px; border-radius:47% 53% 58% 42% / 53% 42% 58% 47%; background:linear-gradient(145deg,#123f59,#08273b); color:#bfeeff; font:800 10px/1 var(--font-geist-sans),sans-serif; box-shadow:inset 0 3px rgba(131,220,255,.1),inset 0 -4px rgba(0,0,0,.2),0 6px 12px -9px #000; }
        .wai-clay-blob.is-active { background:linear-gradient(145deg,#6ad7ff,#1694d0); color:#03243a; box-shadow:inset 0 3px rgba(255,255,255,.34),inset 0 -4px rgba(2,86,132,.19),0 9px 18px -12px #38bdf8; animation:clay-blob-breathe 3.4s ease-in-out infinite; }
        @keyframes clay-blob-breathe { 50% { transform:scale(1.07,.94) rotate(2deg); } }
        .wai-clay-secret-toy { position:relative; width:46%; aspect-ratio:1; margin:3% 0 5%; display:grid; place-items:center; border-radius:44% 56% 61% 39% / 55% 43% 57% 45%; background:linear-gradient(145deg,#0e4e75,#082d47); box-shadow:inset 0 7px rgba(127,218,255,.1),inset 0 -9px rgba(0,0,0,.18),0 22px 28px -24px #000; animation:clay-blob-breathe 4s ease-in-out infinite; }
        .wai-clay-secret-toy svg { width:36%; height:36%; color:#8be2ff; }
        .wai-clay-secret-toy strong { position:absolute; right:17%; top:14%; font-size:18px; color:#54c9f7; }
        .wai-clay-secret-toy i { position:absolute; width:16%; aspect-ratio:1; border-radius:50%; background:#38bdf8; opacity:.2; }
        .wai-clay-secret-toy i:first-child { left:-3%; top:23%; }.wai-clay-secret-toy i:nth-child(2) { right:4%; bottom:6%; }
        .wai-clay-lobby-list { width:100%; display:grid; grid-template-columns:1fr 1fr; gap:5px; }
        .wai-clay-lobby-list > div { min-width:0; padding:5px 7px; display:flex; align-items:center; gap:5px; border-radius:12px 9px 13px 10px; background:rgba(10,48,74,.9); box-shadow:inset 0 2px rgba(121,216,255,.08),inset 0 -3px rgba(0,0,0,.16); }
        .wai-clay-lobby-list .wai-clay-blob { width:22px; height:22px; font-size:8px; }.wai-clay-lobby-list b { overflow:hidden; font-size:7px; text-overflow:ellipsis; }.wai-clay-lobby-list svg { width:9px; color:#ffd677; }
        .wai-clay-main-button { width:100%; min-height:9%; margin-top:auto; border:0; border-radius:15px 12px 17px 13px; background:linear-gradient(145deg,#67d3ff,#22a6e5); color:#04243a; font:800 clamp(8px,.85vw,13px)/1 var(--font-geist-sans),sans-serif; letter-spacing:.04em; box-shadow:inset 0 3px rgba(255,255,255,.3),inset 0 -4px rgba(2,86,132,.18),0 5px 0 #025f8e; transition:transform .18s,box-shadow .18s; }
        .wai-clay-main-button:active { transform:translateY(3px) scale(.98,.96); box-shadow:inset 0 2px rgba(255,255,255,.2),inset 0 -1px rgba(2,86,132,.16),0 2px 0 #025f8e; }
        .wai-clay-main-button svg { width:1.2em; vertical-align:-.2em; }
        .wai-clay-wait-pill { width:100%; margin-top:auto; padding:7% 4%; border-radius:15px 12px 17px 13px; background:rgba(10,49,75,.9); color:#9fdcf3; font:650 7px/1 var(--font-geist-mono),monospace; letter-spacing:.08em; box-shadow:inset 0 2px rgba(124,217,255,.08),inset 0 -4px rgba(0,0,0,.16); }
        .wai-clay-wait-pill i { display:inline-block; width:5px; height:5px; margin-right:5px; border-radius:50%; background:#38bdf8; animation:clay-wait-pulse 1.6s ease-in-out infinite; }
        @keyframes clay-wait-pulse { 50% { opacity:.25; transform:scale(.72); } }
        .wai-clay-mini-roster { width:100%; display:flex; justify-content:center; gap:5px; }
        .wai-clay-mini-roster > span { min-width:0; display:flex; flex-direction:column; align-items:center; gap:2px; opacity:.45; }.wai-clay-mini-roster > span.is-current { opacity:1; }.wai-clay-mini-roster small { max-width:42px; overflow:hidden; color:#c7ecfb; font:600 6px/1 var(--font-geist-mono),monospace; text-overflow:ellipsis; }
        .wai-clay-active-card { width:100%; margin-top:8%; padding:6%; border-radius:22px 17px 24px 18px; background:linear-gradient(145deg,rgba(16,74,110,.97),rgba(7,36,57,.98)); box-shadow:inset 0 3px rgba(133,220,255,.1),inset 0 -5px rgba(0,0,0,.18),0 18px 28px -24px #000; }
        .wai-clay-active-card > div { display:flex; align-items:center; justify-content:center; gap:8px; }.wai-clay-active-card span { display:flex; flex-direction:column; align-items:flex-start; }.wai-clay-active-card small { color:#78d9fc; font:700 6px/1 var(--font-geist-mono),monospace; letter-spacing:.12em; }.wai-clay-active-card b { font-size:15px; }.wai-clay-active-card p { margin:6px 0 0; }
        .wai-clay-mystery { position:relative; width:58%; aspect-ratio:1.18; margin:7% 0 4%; display:grid; place-items:center; border-radius:43% 57% 55% 45% / 58% 42% 58% 42%; background:linear-gradient(145deg,#0b4569,#062b43); box-shadow:inset 0 8px rgba(125,218,255,.09),inset 0 -10px rgba(0,0,0,.18),0 24px 32px -28px #000; }
        .wai-clay-mystery > span { display:flex; align-items:center; gap:5px; color:#8fe3ff; }.wai-clay-mystery svg { width:28px; height:28px; }.wai-clay-mystery strong { font-size:28px; }.wai-clay-mystery small { position:absolute; bottom:12%; color:#8bcbe3; font:650 6px/1 var(--font-geist-mono),monospace; letter-spacing:.12em; }
        .wai-clay-mystery > i { position:absolute; width:33%; height:70%; border-radius:45% 55% 58% 42%; border:1px solid rgba(113,214,255,.1); transition:transform .55s cubic-bezier(.2,.8,.2,1.2); }.wai-clay-mystery > i:first-child { transform:translateX(-48%) rotate(-9deg); }.wai-clay-mystery > i:nth-child(2) { transform:rotate(4deg); }.wai-clay-mystery > i:nth-child(3) { transform:translateX(48%) rotate(12deg); }.wai-clay-mystery.streak-2 > i:first-child { transform:translate(-85%,-6%) rotate(-18deg); }.wai-clay-mystery.streak-2 > i:nth-child(2) { transform:translate(0,-7%) rotate(8deg); }
        .wai-clay-streak { width:100%; display:flex; align-items:center; justify-content:center; gap:6px; color:#9bdcf4; font:700 6px/1 var(--font-geist-mono),monospace; letter-spacing:.08em; }.wai-clay-streak div { display:flex; gap:3px; }.wai-clay-streak i { width:6px; height:6px; border-radius:50%; background:#123d58; box-shadow:inset 0 1px rgba(255,255,255,.08); }.wai-clay-streak i.is-filled { background:#54caff; box-shadow:0 0 9px rgba(56,189,248,.55); }
        .wai-clay-answer-deck { width:100%; margin-top:auto; display:grid; grid-template-columns:.9fr 1.2fr .9fr; gap:4px; }.wai-clay-answer-deck button { min-width:0; min-height:54px; border:0; padding:5px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; border-radius:14px 11px 16px 12px; background:#0d3856; color:#dff7ff; box-shadow:inset 0 3px rgba(127,217,255,.09),inset 0 -4px rgba(0,0,0,.19),0 4px 0 #041b2c; transition:transform .18s,box-shadow .18s; }.wai-clay-answer-deck button:active { transform:translateY(3px) scale(.97,.95); box-shadow:inset 0 2px rgba(127,217,255,.06),0 1px 0 #041b2c; }.wai-clay-answer-deck button.is-guess { background:linear-gradient(145deg,#67d3ff,#22a6e5); color:#04243a; box-shadow:inset 0 3px rgba(255,255,255,.3),inset 0 -4px rgba(2,86,132,.17),0 4px 0 #026b9f; }.wai-clay-answer-deck svg { width:12px; }.wai-clay-answer-deck b { font-size:7px; }.wai-clay-answer-deck small { max-width:100%; overflow:hidden; opacity:.55; font-size:4.5px; text-overflow:ellipsis; white-space:nowrap; }
        .wai-clay-observer { padding-top:8%; }.wai-clay-observer-stage { width:100%; margin:auto 0 6%; display:flex; flex-direction:column; align-items:center; }.wai-clay-observer-stage .wai-clay-blob { width:84px; height:76px; margin-bottom:9%; font-size:27px; }.wai-clay-observer-stage > small { color:#71d4f7; font:700 7px/1 var(--font-geist-mono),monospace; letter-spacing:.13em; }.wai-clay-observer-stage h3 { margin:4% 0 6%; font-size:24px; }.wai-clay-observer-stage p { max-width:90%; }.wai-clay-soft-message { width:100%; padding:6%; display:flex; align-items:center; gap:8px; border-radius:18px 14px 20px 15px; background:rgba(10,48,74,.9); text-align:left; box-shadow:inset 0 3px rgba(121,216,255,.08),inset 0 -4px rgba(0,0,0,.16); }.wai-clay-soft-message > svg { width:26px; height:26px; color:#72d6fb; }.wai-clay-soft-message span { display:flex; flex-direction:column; gap:3px; }.wai-clay-soft-message b { font-size:8px; }.wai-clay-soft-message small { color:#84bfd5; font-size:6px; }
        .wai-clay-focus-state { padding-top:16%; }.wai-clay-close { position:absolute; top:4%; right:7%; border:0; background:transparent; color:#87bfd4; font:650 6px/1 var(--font-geist-mono),monospace; letter-spacing:.1em; }.wai-clay-focus-icon { width:74px; height:70px; margin-bottom:7%; display:grid; place-items:center; border-radius:46% 54% 59% 41% / 55% 43% 57% 45%; background:linear-gradient(145deg,#56cfff,#168fc7); color:#03243a; box-shadow:inset 0 5px rgba(255,255,255,.25),inset 0 -7px rgba(2,86,132,.2),0 17px 25px -18px #38bdf8; animation:clay-blob-breathe 3.8s ease-in-out infinite; }.wai-clay-focus-icon svg { width:34px; height:34px; }.wai-clay-focus-state h3 { margin:5% 0 9%; font-size:28px; }.wai-clay-focus-state label,.wai-clay-quote { width:100%; padding:7%; display:flex; flex-direction:column; align-items:flex-start; gap:6px; border-radius:18px 14px 20px 15px; background:#0b304a; text-align:left; box-shadow:inset 0 3px rgba(125,218,255,.08),inset 0 -5px rgba(0,0,0,.18); }.wai-clay-focus-state label small,.wai-clay-quote small { color:#74cfee; font:650 6px/1 var(--font-geist-mono),monospace; letter-spacing:.13em; }.wai-clay-focus-state label b,.wai-clay-quote b { width:100%; display:flex; justify-content:space-between; font-size:15px; }.wai-clay-focus-state label i { width:6px; height:16px; border-radius:4px; background:#50c7f5; animation:clay-wait-pulse 1s ease-in-out infinite; }.wai-clay-focus-state > p { margin:7% 4%; }.wai-clay-focus-state.is-warm .wai-clay-focus-icon { background:linear-gradient(145deg,#ffd07d,#e99532); color:#4d2b06; box-shadow:inset 0 5px rgba(255,255,255,.28),inset 0 -7px rgba(116,59,5,.16),0 17px 25px -18px #f59e0b; }.wai-clay-focus-state.is-warm .wai-clay-kicker { color:#ffd38d; }.wai-clay-focus-state.is-warm .wai-clay-quote { background:#44301c; }
        .wai-clay-judge { padding-top:9%; }.wai-clay-judge h3 { margin-bottom:5%; }.wai-clay-compare { width:100%; display:grid; grid-template-columns:1fr; gap:4px; }.wai-clay-compare article { padding:6%; display:flex; flex-direction:column; align-items:flex-start; gap:5px; border-radius:16px 13px 18px 14px; background:#0b304a; text-align:left; box-shadow:inset 0 3px rgba(125,218,255,.08),inset 0 -4px rgba(0,0,0,.17); }.wai-clay-compare article:last-child { background:linear-gradient(145deg,#155b82,#0b3d5d); }.wai-clay-compare small { color:#72cce9; font:650 5px/1 var(--font-geist-mono),monospace; letter-spacing:.12em; }.wai-clay-compare b { font-size:12px; }.wai-clay-compare > i { height:0; z-index:2; color:#77d8fb; font:800 8px/1 var(--font-geist-mono),monospace; font-style:normal; }.wai-clay-verdict { width:100%; margin-top:auto; display:grid; grid-template-columns:1fr 1fr; gap:5px; }.wai-clay-verdict button { min-height:48px; border:0; border-radius:14px 11px 16px 12px; background:#143b52; color:#bddfec; font:750 6px/1 var(--font-geist-sans),sans-serif; box-shadow:inset 0 3px rgba(255,255,255,.06),inset 0 -4px rgba(0,0,0,.18),0 4px 0 #031a29; }.wai-clay-verdict button:last-child { background:linear-gradient(145deg,#67d3ff,#22a6e5); color:#04243a; box-shadow:inset 0 3px rgba(255,255,255,.3),inset 0 -4px rgba(2,86,132,.17),0 4px 0 #026b9f; }.wai-clay-verdict svg { width:10px; margin-right:3px; vertical-align:-2px; }
        .wai-clay-reveal { justify-content:center; }.wai-clay-reveal-burst { position:absolute; inset:18% 15% auto; aspect-ratio:1; }.wai-clay-reveal-burst i { position:absolute; left:48%; top:48%; width:8px; height:38%; border-radius:999px; background:linear-gradient(#5bd0ff,transparent); transform-origin:50% 100%; opacity:.48; animation:clay-reveal-ray 1.5s ease-out both; }.wai-clay-reveal-burst i:nth-child(2){transform:rotate(72deg)}.wai-clay-reveal-burst i:nth-child(3){transform:rotate(144deg)}.wai-clay-reveal-burst i:nth-child(4){transform:rotate(216deg)}.wai-clay-reveal-burst i:nth-child(5){transform:rotate(288deg)}@keyframes clay-reveal-ray{from{opacity:0;scale:.2}60%{opacity:.55}to{opacity:.18;scale:1}}
        .wai-clay-reveal-mark { z-index:1; width:112px; height:104px; margin-bottom:9%; display:grid; place-items:center; border-radius:43% 57% 62% 38% / 55% 41% 59% 45%; background:linear-gradient(145deg,#67d3ff,#1c9bd6); color:#03243a; box-shadow:inset 0 8px rgba(255,255,255,.26),inset 0 -10px rgba(2,86,132,.19),0 20px 35px -21px #38bdf8; animation:clay-reveal-pop .8s cubic-bezier(.2,.85,.2,1.25) both; }.wai-clay-reveal-mark svg { width:52px; height:52px; }.wai-clay-reveal.is-wrong .wai-clay-reveal-mark { background:linear-gradient(145deg,#ff929e,#cc5061); color:#45141b; box-shadow:inset 0 8px rgba(255,255,255,.2),inset 0 -10px rgba(93,15,26,.17),0 20px 35px -23px #ef6074; }.wai-clay-reveal h3 { white-space:pre-line; font-size:28px; }.wai-clay-score { margin:3% 0 5%; padding:5% 8%; border-radius:16px 13px 18px 14px; background:#0b3b59; color:#82ddff; font:800 9px/1 var(--font-geist-mono),monospace; letter-spacing:.08em; box-shadow:inset 0 3px rgba(125,218,255,.08),inset 0 -4px rgba(0,0,0,.17); }@keyframes clay-reveal-pop{from{opacity:0;transform:translateY(30px) scale(.6,1.2)}70%{transform:translateY(-3px) scale(1.06,.95)}}
        .wai-clay-results { padding-top:7%; }.wai-clay-results .wai-clay-focus-icon { width:62px; height:58px; margin-bottom:5%; }.wai-clay-results .wai-clay-focus-icon svg { width:28px; }.wai-clay-results h3 { margin:4% 0 6%; font-size:22px; }.wai-clay-ranking { width:100%; display:flex; flex-direction:column; gap:4px; }.wai-clay-ranking article { padding:5% 5%; display:grid; grid-template-columns:18px 1fr auto; align-items:center; gap:6px; border-radius:14px 11px 15px 12px; background:#0b304a; text-align:left; box-shadow:inset 0 2px rgba(125,218,255,.07),inset 0 -3px rgba(0,0,0,.16); animation:clay-row-in .55s cubic-bezier(.2,.85,.2,1.15) both; }.wai-clay-ranking article:nth-child(2){animation-delay:.12s}.wai-clay-ranking article:nth-child(3){animation-delay:.24s}.wai-clay-ranking article:nth-child(4){animation-delay:.36s}.wai-clay-ranking article > span { color:#68cdeb; font:700 7px/1 var(--font-geist-mono),monospace; }.wai-clay-ranking article > div { min-width:0; display:flex; flex-direction:column; gap:2px; }.wai-clay-ranking b { overflow:hidden; font-size:7px; text-overflow:ellipsis; }.wai-clay-ranking small { overflow:hidden; color:#7eaec1; font-size:5px; text-overflow:ellipsis; white-space:nowrap; }.wai-clay-ranking strong { color:#8fe1ff; font:800 8px/1 var(--font-geist-mono),monospace; }@keyframes clay-row-in{from{opacity:0;transform:translateY(12px) scale(.94)}}
        .wai-clay-tv-shell { width:100%; aspect-ratio:16/9; padding:6px; border-radius:22px; background:linear-gradient(150deg,#1b435a,#03111c 62%); box-shadow:0 32px 70px -40px #000,inset 0 1px rgba(175,229,255,.23); }
        .wai-clay-tv { position:relative; height:100%; overflow:hidden; border-radius:17px; background:radial-gradient(circle at 16% 19%,rgba(56,189,248,.24),transparent 30%),radial-gradient(circle at 84% 81%,rgba(2,132,199,.18),transparent 28%),linear-gradient(145deg,#04101c,#08243a 58%,#061522); color:#effaff; font-family:"Arial Rounded MT Bold",var(--font-geist-sans),sans-serif; isolation:isolate; }
        .wai-clay-tv-atmosphere i:nth-child(1) { width:18%; aspect-ratio:1.3; top:13%; right:-7%; }.wai-clay-tv-atmosphere i:nth-child(2) { width:11%; aspect-ratio:1; bottom:10%; left:-5%; background:#096391; animation-delay:-2.4s; }.wai-clay-tv-atmosphere i:nth-child(3) { width:6%; aspect-ratio:1.2; top:8%; left:38%; background:#0a3957; animation-delay:-4s; }
        .wai-clay-tv-header { height:15%; padding:0 4%; display:grid; grid-template-columns:1fr auto 1fr; align-items:center; border-bottom:1px solid rgba(116,216,255,.1); }.wai-clay-tv-header > span { display:flex; align-items:center; gap:7px; font-size:12px; }.wai-clay-tv-header > span svg { width:25px; height:25px; padding:5px; border-radius:47% 53% 42% 58%; background:linear-gradient(145deg,#67d3ff,#209edc); color:#04243a; }.wai-clay-tv-header em { padding:7px 12px; border-radius:999px; background:#0d3856; color:#bcecff; font:700 7px/1 var(--font-geist-mono),monospace; letter-spacing:.08em; font-style:normal; box-shadow:inset 0 2px rgba(127,217,255,.08),inset 0 -3px rgba(0,0,0,.18); }.wai-clay-tv-header strong { justify-self:end; color:#86dcfa; font:800 8px/1 var(--font-geist-mono),monospace; }
        .wai-clay-tv-game { position:relative; height:74%; padding:3.5% 4%; display:grid; grid-template-columns:1fr 28%; gap:3%; }.wai-clay-tv-game > section,.wai-clay-tv-game > aside { transition:opacity .3s,filter .3s; }.wai-clay-tv-game .is-dimmed { opacity:.27; filter:saturate(.65); }.wai-clay-tv-game > section { position:relative; padding:4%; display:grid; grid-template-columns:38% 1fr; align-items:center; gap:5%; border-radius:29px 22px 31px 24px; background:linear-gradient(145deg,rgba(15,70,105,.96),rgba(7,35,56,.97)); box-shadow:inset 0 4px rgba(133,220,255,.1),inset 0 -7px rgba(0,0,0,.18),0 22px 34px -28px #000; }.wai-clay-tv-active { display:flex; flex-direction:column; align-items:center; text-align:center; }.wai-clay-tv-active .wai-clay-blob { width:82px; height:76px; font-size:27px; }.wai-clay-tv-active > span { display:flex; flex-direction:column; align-items:center; }.wai-clay-tv-active small { margin-top:10px; color:#74d2f4; font:700 6px/1 var(--font-geist-mono),monospace; letter-spacing:.12em; }.wai-clay-tv-active h3 { margin:3px 0 1px; font-size:27px; }.wai-clay-tv-active p { margin:0; color:#83afc0; font-size:8px; }.wai-clay-tv-mystery { position:relative; width:85%; aspect-ratio:1.8; display:grid; place-items:center; justify-self:center; border-radius:43% 57% 55% 45% / 58% 42% 58% 42%; background:linear-gradient(145deg,#0b4569,#062b43); box-shadow:inset 0 8px rgba(125,218,255,.09),inset 0 -10px rgba(0,0,0,.18),0 24px 32px -28px #000; }.wai-clay-tv-mystery > i { position:absolute; width:31%; height:76%; border-radius:45% 55% 58% 42%; border:1px solid rgba(113,214,255,.1); }.wai-clay-tv-mystery > i:first-child{transform:translateX(-66%) rotate(-12deg)}.wai-clay-tv-mystery > i:nth-child(2){transform:rotate(5deg)}.wai-clay-tv-mystery > i:nth-child(3){transform:translateX(66%) rotate(13deg)}.wai-clay-tv-mystery svg { width:36px; height:36px; color:#8fe3ff; }.wai-clay-tv-mystery strong { margin-left:6px; color:#8fe3ff; font-size:33px; }.wai-clay-tv-mystery small { position:absolute; bottom:12%; color:#8bcbe3; font:650 6px/1 var(--font-geist-mono),monospace; letter-spacing:.12em; }.wai-clay-tv-dots { position:absolute; left:50%; bottom:7%; display:flex; align-items:center; gap:5px; transform:translateX(-50%); color:#91cce2; font:700 6px/1 var(--font-geist-mono),monospace; }.wai-clay-tv-dots i { width:6px; height:6px; border-radius:50%; background:#123d58; }.wai-clay-tv-dots i.is-filled { background:#54caff; box-shadow:0 0 9px rgba(56,189,248,.55); }
        .wai-clay-tv-game > aside { padding:8% 7%; border-radius:24px 18px 26px 20px; background:rgba(9,43,67,.94); box-shadow:inset 0 3px rgba(121,216,255,.08),inset 0 -5px rgba(0,0,0,.17); }.wai-clay-tv-game > aside > small { color:#72d2f5; font:700 6px/1 var(--font-geist-mono),monospace; letter-spacing:.14em; }.wai-clay-tv-game > aside article { margin-top:6%; padding:5% 4%; display:grid; grid-template-columns:18px 24px 1fr auto; align-items:center; gap:4px; border-radius:11px 9px 12px 10px; color:#9ec7d6; }.wai-clay-tv-game > aside article.is-current { background:linear-gradient(145deg,#155c83,#0b3e5d); color:#effaff; box-shadow:inset 0 2px rgba(135,222,255,.1),inset 0 -3px rgba(0,0,0,.17); }.wai-clay-tv-game > aside article > span { font:700 5px/1 var(--font-geist-mono),monospace; }.wai-clay-tv-game > aside article .wai-clay-blob { width:21px; height:20px; font-size:6px; }.wai-clay-tv-game > aside article b { overflow:hidden; font-size:6px; text-overflow:ellipsis; }.wai-clay-tv-game > aside article strong { color:#83dcfc; font:800 6px/1 var(--font-geist-mono),monospace; }
        .wai-clay-tv-footer { height:11%; padding:0 4%; display:flex; align-items:center; justify-content:center; gap:9px; color:#7db9d0; font:650 6px/1 var(--font-geist-mono),monospace; letter-spacing:.08em; }.wai-clay-tv-footer b { color:#e5f7fd; }
        .wai-clay-tv-overlay { position:absolute; z-index:4; left:50%; top:50%; width:66%; padding:5% 7%; display:flex; flex-direction:column; align-items:center; border-radius:34px 27px 37px 29px; background:linear-gradient(145deg,rgba(14,67,102,.99),rgba(6,34,54,.99)); text-align:center; transform:translate(-50%,-50%); box-shadow:inset 0 5px rgba(132,220,255,.11),inset 0 -8px rgba(0,0,0,.18),0 28px 55px -28px #000; animation:clay-reveal-pop .72s cubic-bezier(.2,.85,.2,1.25) both; }.wai-clay-tv-overlay > div { width:58px; height:54px; display:grid; place-items:center; border-radius:46% 54% 59% 41%; background:linear-gradient(145deg,#67d3ff,#1c9bd6); color:#03243a; box-shadow:inset 0 5px rgba(255,255,255,.25),inset 0 -7px rgba(2,86,132,.2); }.wai-clay-tv-overlay > div svg { width:27px; height:27px; }.wai-clay-tv-overlay > small { margin-top:12px; color:#77d8fb; font:700 6px/1 var(--font-geist-mono),monospace; letter-spacing:.13em; }.wai-clay-tv-overlay h3 { margin:5px 0; font-size:25px; letter-spacing:-.04em; }.wai-clay-tv-overlay p { margin:0; color:#89b4c5; font-size:8px; }.wai-clay-tv-overlay.is-wrong > div { background:linear-gradient(145deg,#ff929e,#cc5061); color:#45141b; }.wai-clay-tv-overlay.is-dispute > div { background:linear-gradient(145deg,#ffd07d,#e99532); color:#4d2b06; }
        .wai-clay-tv-lobby { height:100%; padding:8% 7%; display:grid; grid-template-columns:1fr 34%; align-items:center; gap:8%; }.wai-clay-tv-lobby section { min-width:0; }.wai-clay-tv-logo { width:66px; height:60px; display:grid; place-items:center; border-radius:45% 55% 60% 40%; background:linear-gradient(145deg,#67d3ff,#1c9bd6); color:#03243a; box-shadow:inset 0 5px rgba(255,255,255,.25),inset 0 -7px rgba(2,86,132,.2); }.wai-clay-tv-logo svg { width:34px; }.wai-clay-tv-lobby section > span { display:block; margin-top:16px; color:#71d4f7; font:700 6px/1 var(--font-geist-mono),monospace; letter-spacing:.15em; }.wai-clay-tv-lobby h3 { margin:5px 0; font-size:54px; line-height:.9; letter-spacing:-.06em; }.wai-clay-tv-lobby p { max-width:90%; margin:10px 0 18px; color:#8ab3c2; font-size:10px; line-height:1.4; }.wai-clay-tv-people { display:flex; gap:6px; }.wai-clay-tv-people > span { padding:5px 8px 5px 5px; display:flex; align-items:center; gap:4px; border-radius:999px; background:#0b304a; box-shadow:inset 0 2px rgba(125,218,255,.08),inset 0 -3px rgba(0,0,0,.16); }.wai-clay-tv-people .wai-clay-blob { width:23px; height:22px; font-size:7px; }.wai-clay-tv-people b { font-size:6px; }.wai-clay-tv-people svg { width:8px; color:#ffd677; }.wai-clay-tv-lobby aside { padding:10%; display:flex; flex-direction:column; align-items:center; border-radius:28px 22px 30px 24px; background:linear-gradient(145deg,rgba(15,70,105,.96),rgba(7,35,56,.98)); box-shadow:inset 0 4px rgba(133,220,255,.1),inset 0 -7px rgba(0,0,0,.18),0 22px 34px -28px #000; }.wai-clay-qr { width:82%; aspect-ratio:1; padding:12%; display:grid; grid-template-columns:repeat(3,1fr); gap:5px; border-radius:18px 14px 20px 15px; background:#dff7ff; }.wai-clay-qr i { border-radius:2px; background:#062b43; }.wai-clay-qr i:nth-child(2),.wai-clay-qr i:nth-child(4){opacity:.35}.wai-clay-tv-lobby aside small { margin-top:12px; color:#79cce9; font:700 5px/1 var(--font-geist-mono),monospace; letter-spacing:.15em; }.wai-clay-tv-lobby aside b { margin-top:4px; color:#9ce6ff; font:800 20px/1 var(--font-geist-mono),monospace; letter-spacing:.14em; }.wai-clay-tv-lobby aside span { margin-top:7px; color:#769daf; font-size:6px; }
        .wai-clay-tv-results { height:100%; padding:6% 8%; display:flex; flex-direction:column; }.wai-clay-tv-title { display:flex; align-items:center; justify-content:center; gap:12px; }.wai-clay-tv-title > div { width:52px; height:48px; display:grid; place-items:center; border-radius:45% 55% 60% 40%; background:linear-gradient(145deg,#67d3ff,#1c9bd6); color:#03243a; }.wai-clay-tv-title svg { width:25px; }.wai-clay-tv-title > span { display:flex; flex-direction:column; }.wai-clay-tv-title small { color:#74d5f7; font:700 6px/1 var(--font-geist-mono),monospace; letter-spacing:.13em; }.wai-clay-tv-title h3 { margin:3px 0 0; font-size:25px; }.wai-clay-tv-results > section { width:82%; margin:auto; display:flex; flex-direction:column; gap:5px; }.wai-clay-tv-results article { padding:2% 3%; display:grid; grid-template-columns:24px 30px 1fr auto; align-items:center; gap:8px; border-radius:15px 12px 17px 13px; background:#0b304a; box-shadow:inset 0 2px rgba(125,218,255,.07),inset 0 -4px rgba(0,0,0,.16); animation:clay-row-in .55s cubic-bezier(.2,.85,.2,1.15) both; }.wai-clay-tv-results article:nth-child(2){animation-delay:.12s}.wai-clay-tv-results article:nth-child(3){animation-delay:.24s}.wai-clay-tv-results article:nth-child(4){animation-delay:.36s}.wai-clay-tv-results article.is-winner { background:linear-gradient(145deg,#155c83,#0b3e5d); }.wai-clay-tv-results article > span { color:#70d0ef; font:700 6px/1 var(--font-geist-mono),monospace; }.wai-clay-tv-results article .wai-clay-blob { width:28px; height:27px; font-size:8px; }.wai-clay-tv-results article > div { display:flex; flex-direction:column; }.wai-clay-tv-results article b { font-size:9px; }.wai-clay-tv-results article small { color:#79a8ba; font-size:6px; }.wai-clay-tv-results article strong { color:#8fe1ff; font:800 10px/1 var(--font-geist-mono),monospace; }
        .wai-clay-motion-strip { max-width:1500px; margin:90px auto 0; padding-top:24px; border-top:1px solid rgba(113,214,255,.14); display:grid; grid-template-columns:180px repeat(3,1fr); gap:15px; align-items:center; }.wai-clay-motion-strip > b { color:#72d2f5; font:700 9px/1 var(--font-geist-mono),monospace; letter-spacing:.15em; }.wai-clay-motion-strip > span { display:flex; align-items:center; gap:10px; color:#99bfd0; font-size:12px; }.wai-clay-motion-strip i { display:grid; flex:0 0 auto; width:25px; height:25px; place-items:center; border-radius:47% 53% 58% 42%; background:#0d496e; color:#9ce5ff; font:700 8px/1 var(--font-geist-mono),monospace; font-style:normal; box-shadow:inset 0 2px rgba(130,220,255,.1),inset 0 -3px rgba(0,0,0,.17); }

        .wai-preview-end { min-height: 240px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; border-top: 1px solid #24272e; background: #080a0f; color: #858d99; text-align: center; }
        .wai-preview-end svg { width: 42px; color: #66e8ff; }

        @media (max-width: 980px) {
          .wai-preview-intro-grid { grid-template-columns: 1fr; gap: 50px; padding: 70px 0; }
          .wai-preview-intro h1 { font-size: clamp(100px, 30vw, 180px); }
          .wai-preview-concept-head { grid-template-columns: 44px 1fr; }
          .wai-preview-replay { grid-column: 2; justify-self: start; }
          .wai-preview-devices { grid-template-columns: minmax(260px, 350px); justify-content: center; }
          .wai-preview-tv-column { width: min(92vw, 760px); margin-left: 50%; transform: translateX(-50%); }
          .wai-preview-motion-notes { grid-template-columns: 1fr; }
          .wai-clay-phone-grid { grid-template-columns:repeat(2,minmax(220px,1fr)); }
          .wai-clay-tv-grid { grid-template-columns:1fr; }
          .wai-clay-motion-strip { grid-template-columns:1fr; }
        }
        @media (max-width: 560px) {
          .wai-preview-intro { min-height: auto; }
          .wai-preview-intro nav span { display: none; }
          .wai-preview-concept { padding-top: 58px; }
          .wai-preview-concept-head { grid-template-columns: 1fr; gap: 12px; }
          .wai-preview-concept-number { display: none; }
          .wai-preview-replay { grid-column: 1; }
          .wai-preview-tv-column { width: 720px; transform: translateX(-50%) scale(.52); transform-origin: top center; margin-bottom: -195px; }
          .wai-preview-device-label { font-size: 8px; }
          .wai-clay-flow { padding-inline:16px; }
          .wai-clay-phone-grid { grid-template-columns:1fr; max-width:320px; }
          .wai-clay-tv-grid { gap:34px; }
          .wai-clay-tv-shell { width:720px; transform:scale(.43); transform-origin:top left; margin-bottom:-238px; }
          .wai-clay-tv-item { width:310px; }
          .wai-clay-flow-head p { font-size:16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          html { scroll-behavior: auto; }
          *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
        }
      `}</style>
    </main>
  );
}
