/**
 * The company (docs/plan-compagnie.md K5, the mock-up's screen 4a): founded with a name and a
 * flag, or joined by a link; its members and their roles; its beacon, fed with goods; its thread,
 * under the old game's rules; the signs it laid this week; the link to invite.
 */
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { CHARGES, FLAG_COLORS, HouseFlag } from "./Entree.js";

export interface CompagnieView {
  id: string;
  name: string;
  code: string;
  flag: { color: string; symbol: string };
  max: number;
  members: {
    id: string;
    pseudo: string | null;
    role: "doge" | "capitaine" | null;
    world: string | null;
    house: string | null;
    me: boolean;
  }[];
  phare: {
    points: number;
    level: number;
    next: number | null;
    max: number;
    given: number;
    cap: number;
  };
}

interface Message {
  id: string;
  pseudo: string | null;
  body: string;
  at: number;
  mine: boolean;
}

export interface Sign {
  kind: string;
  target: string;
  by: string;
  mine: boolean;
}

const SAID: Record<string, string> = {
  invalid_name: "Le nom doit avoir de 3 à 24 lettres, sans mot grossier.",
  name_taken: "Ce nom est déjà pris.",
  already_member: "Tu es déjà dans une compagnie.",
  left_recently: "Tu as quitté une compagnie il y a moins de trois jours.",
  company_full: "Cette compagnie est complète (12 Maisons).",
  unknown_company: "Ce lien d'invitation n'existe plus.",
  message_refused: "Ce message n'est pas permis (pas de liens, pas de grossièretés).",
  message_too_fast: "Un message toutes les 10 secondes.",
  message_too_many: "50 messages par jour au plus.",
  message_too_long: "280 caractères au plus.",
  beacon_cap: "Tu as déjà porté au phare tout ce que permet la journée.",
  planche_short: "Ton entrepôt n'a pas assez de ces marchandises.",
  not_doge: "Seul le doge de la compagnie nomme les capitaines.",
  too_many_captains: "Trois capitaines au plus.",
};

const SIGN_NAMES: Record<string, string> = {
  attaque: "J'attaque ce port",
  tour: "Tenez cette tour",
  besoin: "Besoin de",
};

/** The beacon, drawn: its light grows with its level. */
function Phare({ level, max }: { level: number; max: number }) {
  return (
    <svg
      width="64"
      height="96"
      viewBox="0 0 64 96"
      role="img"
      aria-label={`Le phare, niveau ${level} sur ${max}`}
    >
      {Array.from({ length: max }, (_, k) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: a ring is a level.
          key={k}
          cx="32"
          cy="22"
          r={8 + k * 5}
          fill="none"
          stroke={k < level ? "var(--pc-accent)" : "#e6e1d8"}
          strokeOpacity={k < level ? 0.75 - k * 0.12 : 1}
          strokeWidth="2"
        />
      ))}
      <path d="M24 92 L27 34 H37 L40 92 Z" fill="#fbfaf7" stroke="#17150f" strokeWidth="1.6" />
      <path
        d="M25.5 60 H38.5 M26.5 46 H37.5 M25 76 H39"
        stroke="var(--pc-accent)"
        strokeWidth="3"
      />
      <rect
        x="25"
        y="24"
        width="14"
        height="10"
        rx="2"
        fill={level > 0 ? "#f2c14e" : "#ddd6cb"}
        stroke="#17150f"
        strokeWidth="1.6"
      />
      <path d="M23 24 L32 16 L41 24 Z" fill="#17150f" />
    </svg>
  );
}

/**
 * The guided first visit (decision of 8 November: each new place has its own short tutorial):
 * founding (a name, a flag, found), or, in a company, its members, its beacon, its thread, the
 * link. Kept as seen once its last step is done.
 */
const TUTO_FOUND = [
  "Donne un nom à ta compagnie : il se verra sur la planche et à la Guerre.",
  "Choisis la couleur et la pièce de son pavillon : il flottera sur les Maisons de tes membres.",
  "Fonde-la : tu en seras le doge, et tu pourras inviter tes amis par un lien.",
];
const TUTO_MEMBER = [
  "Tes membres : jusqu'à douze Maisons, de toutes les lagunes. Le doge nomme ses capitaines.",
  "Le phare : chacun y porte des marchandises, un peu chaque jour. Il arme les ports de tous à la Guerre.",
  "La discussion : courte et polie, sans liens ; un message que trois membres signalent est masqué.",
  "Le lien d'invitation : qui arrive par lui rejoint ta compagnie, et ta lagune s'il y a de la place.",
];
const tutoSeen = () => {
  try {
    return localStorage.getItem("fondaco.compagnie.tuto") === "1";
  } catch {
    return false;
  }
};
const tutoDone = () => {
  try {
    localStorage.setItem("fondaco.compagnie.tuto", "1");
  } catch {
    // A private window: the guide comes again.
  }
};

/** Founding a company: a name and a flag. */
function Fonder({
  onFound,
  onJoin,
  guide,
}: {
  onFound: (name: string, color: string, symbol: string) => void;
  onJoin: (code: string) => void;
  /** Whether the guided first visit is on. */
  guide: boolean;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("emerald");
  const [symbol, setSymbol] = useState("anchor");
  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  /** The founding's guided step follows the gestures: a name, then the flag, then found. */
  const step = !guide ? -1 : name.trim().length < 3 ? 0 : !touched ? 1 : 2;
  return (
    <div className="pc-co-found" data-compagnie-found>
      <p>
        Une compagnie, ce sont jusqu'à douze Maisons, de toutes les lagunes, qui partent en guerre
        ensemble, se parlent et nourrissent un phare commun.
      </p>
      {step >= 0 ? (
        <p className="pc-co-guide" data-compagnie-guide>
          {TUTO_FOUND[step]}
        </p>
      ) : null}
      <div className="pc-co-flagrow" data-glow={String(step === 0)}>
        <HouseFlag color={color} symbol={symbol} size={64} />
        <label className="pc-co-name">
          <span>Le nom de ta compagnie</span>
          <input
            data-compagnie-name
            value={name}
            maxLength={24}
            placeholder="La Tana"
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </div>
      <fieldset
        data-glow={String(step === 1)}
        className="pc-in-colors pc-co-set"
        aria-label="La couleur du pavillon"
      >
        {FLAG_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            aria-label={c.name}
            aria-pressed={color === c.id}
            style={{ background: c.hex }}
            onClick={() => {
              setColor(c.id);
              setTouched(true);
            }}
          />
        ))}
      </fieldset>
      <fieldset className="pc-co-charges pc-co-set" aria-label="La pièce du pavillon">
        {Object.entries(CHARGES).map(([k, ch]) => (
          <button
            key={k}
            type="button"
            aria-label={ch.name}
            aria-pressed={symbol === k}
            onClick={() => {
              setSymbol(k);
              setTouched(true);
            }}
          >
            <svg width="22" height="22" viewBox="0 0 34 34" aria-hidden="true">
              <path d={ch.d} fill="currentColor" />
            </svg>
          </button>
        ))}
      </fieldset>
      <button
        type="button"
        className="pc-passe-go"
        data-glow={String(step === 2)}
        data-compagnie-go
        disabled={name.trim().length < 3}
        onClick={() => onFound(name, color, symbol)}
      >
        Fonder la compagnie
      </button>
      <label className="pc-co-name">
        <span>Ou rejoindre par le code d'une invitation</span>
        <span className="pc-co-joinrow">
          <input
            data-compagnie-code
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
          />
          <button
            type="button"
            className="pc-passe-quiet"
            disabled={code.length < 4}
            onClick={() => onJoin(code)}
          >
            Rejoindre
          </button>
        </span>
      </label>
    </div>
  );
}

export function CompagnieSheet({
  close,
  goods,
  stock,
  signs,
  onSaid,
  onChange,
}: {
  close: ReactNode;
  /** The goods' names, for the beacon. */
  goods: Record<string, string>;
  /** One's store, for the beacon. */
  stock: Record<string, number>;
  signs: Sign[];
  onSaid: (text: string) => void;
  /** Called when the company (or the board, after a gift) changed. */
  onChange: () => void;
}) {
  const [c, setC] = useState<CompagnieView | null | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [gift, setGift] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  /** The guided first visit: the step in the company, or -1 once seen. */
  const [guide, setGuide] = useState(() => (tutoSeen() ? -1 : 0));
  const next = () => {
    if (guide + 1 >= TUTO_MEMBER.length) {
      tutoDone();
      setGuide(-1);
    } else setGuide(guide + 1);
  };
  const call = useCallback(
    async (path: string, body?: unknown) => {
      const res = await fetch(`/api/planche/compagnie${path}`, {
        method: body === undefined ? "GET" : "POST",
        credentials: "same-origin",
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        compagnie?: CompagnieView | null;
        messages?: Message[];
        error?: string;
      };
      if (json.error) onSaid(SAID[json.error] ?? "Ce geste n'est pas possible.");
      if (json.compagnie !== undefined) setC(json.compagnie);
      if (json.messages) setMessages(json.messages);
      return json;
    },
    [onSaid],
  );
  useEffect(() => {
    void call("");
  }, [call]);
  const inCompany = !!c;
  // The thread, read every 15 seconds while the sheet is open.
  useEffect(() => {
    if (!inCompany) return;
    void call("/messages");
    const timer = window.setInterval(() => void call("/messages"), 15_000);
    return () => window.clearInterval(timer);
  }, [inCompany, call]);

  const me = c?.members.find((m) => m.me);
  const giftTotal = Object.values(gift).reduce((n, x) => n + x, 0);
  const left = c ? c.phare.cap - c.phare.given : 0;
  const link = c ? `${window.location.origin}/?co=${c.code}` : "";
  return (
    <section className="pc-planche-card pc-pl-card pc-co" data-compagnie>
      <div className="pc-pl-head">
        <div>
          <h2>{c ? c.name : "Une compagnie"}</h2>
          <span>
            {c
              ? `${c.members.length} Maison${c.members.length > 1 ? "s" : ""} sur ${c.max} · ${me?.role === "doge" ? "tu en es le doge" : me?.role === "capitaine" ? "tu en es capitaine" : "tu en es membre"}`
              : "Tu n'es dans aucune compagnie"}
          </span>
        </div>
        {close}
      </div>
      {c === undefined ? null : !c ? (
        <Fonder
          guide={guide >= 0}
          onFound={(name, color, symbol) =>
            void call("", { name, flag: { color, symbol } }).then((j) => {
              if (j.compagnie) {
                onSaid(`${j.compagnie.name} est fondée : invite tes amis par son lien.`);
                onChange();
              }
            })
          }
          onJoin={(code) =>
            void call("/join", { code }).then((j) => {
              if (j.compagnie) {
                onSaid(`Tu as rejoint ${j.compagnie.name}.`);
                onChange();
              }
            })
          }
        />
      ) : (
        <>
          {guide >= 0 ? (
            <div className="pc-co-guide" data-compagnie-guide>
              <span>{TUTO_MEMBER[guide]}</span>
              <button
                type="button"
                className="pc-passe-go"
                data-compagnie-guide-next
                onClick={next}
              >
                {guide + 1 >= TUTO_MEMBER.length ? "Compris" : "Suivant"}
              </button>
            </div>
          ) : null}
          <div className="pc-co-top" data-glow={String(guide === 0)}>
            <HouseFlag color={c.flag.color} symbol={c.flag.symbol} size={56} />
            <ul className="pc-co-members" aria-label="Les membres">
              {c.members.map((m) => (
                <li key={m.id} data-me={String(m.me)}>
                  <b>Ca’ {m.pseudo ?? "Bembo"}</b>
                  {m.role ? (
                    <i data-role={m.role}>{m.role === "doge" ? "doge" : "capitaine"}</i>
                  ) : null}
                  {me?.role === "doge" && !m.me ? (
                    <button
                      type="button"
                      onClick={() =>
                        void call("/role", {
                          member: m.id,
                          role: m.role === "capitaine" ? null : "capitaine",
                        })
                      }
                    >
                      {m.role === "capitaine" ? "Membre" : "Capitaine"}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
          <section
            className="pc-co-phare"
            data-phare
            data-glow={String(guide === 1)}
            aria-label="Le phare"
          >
            <Phare level={c.phare.level} max={c.phare.max} />
            <div>
              <b>
                Le phare · niveau {c.phare.level}
                {c.phare.next !== null
                  ? ` · ${c.phare.points} sur ${c.phare.next}`
                  : " · au sommet"}
              </b>
              <span>
                {c.phare.level >= 4
                  ? "Deux places de port de plus par passe pour chaque membre."
                  : c.phare.level >= 2
                    ? "Une place de port de plus par passe pour chaque membre ; deux au niveau 4."
                    : "Au niveau 2, une place de port de plus par passe pour chaque membre."}{" "}
                Au niveau 5, une ruse du port adverse vue à chaque assaut.
              </span>
              <span>
                Tu peux encore y porter {left} marchandise{left > 1 ? "s" : ""} aujourd'hui.
              </span>
              <div className="pc-co-gift">
                {Object.entries(stock)
                  .filter(([, n]) => n > 0)
                  .slice(0, 8)
                  .map(([g, n]) => (
                    <button
                      key={g}
                      type="button"
                      data-gift={g}
                      disabled={left - giftTotal < 10 || (gift[g] ?? 0) + 10 > n}
                      onClick={() => setGift({ ...gift, [g]: (gift[g] ?? 0) + 10 })}
                    >
                      {goods[g] ?? g} {gift[g] ? `· ${gift[g]}` : "+10"}
                    </button>
                  ))}
              </div>
              <button
                type="button"
                className="pc-passe-go"
                data-phare-give
                disabled={giftTotal === 0}
                onClick={() =>
                  void call("/phare", { goods: gift }).then((j) => {
                    if (j.compagnie) {
                      onSaid(`${giftTotal} marchandises portées au phare.`);
                      setGift({});
                      onChange();
                    }
                  })
                }
              >
                Porter au phare {giftTotal ? `· ${giftTotal}` : ""}
              </button>
            </div>
          </section>
          {signs.length ? (
            <section aria-label="Les signes de la semaine">
              <h3 className="pc-mn-h3">Les signes de la semaine</h3>
              <ul className="pc-co-signs">
                {signs.map((s) => (
                  <li key={`${s.kind}${s.target}${s.by}`}>
                    <b>{s.mine ? "Toi" : s.by}</b> · {SIGN_NAMES[s.kind] ?? s.kind}{" "}
                    {s.kind === "besoin" ? (goods[s.target.slice(5)] ?? "").toLowerCase() : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section
            className="pc-co-thread"
            data-glow={String(guide === 2)}
            aria-label="La discussion"
          >
            <h3 className="pc-mn-h3">La discussion</h3>
            <ol data-compagnie-thread>
              {messages.map((m) => (
                <li key={m.id} data-mine={String(m.mine)}>
                  <b>Ca’ {m.pseudo ?? "Bembo"}</b>
                  <span>{m.body}</span>
                  {m.mine ? null : (
                    <button
                      type="button"
                      aria-label="Signaler ce message"
                      onClick={() =>
                        void call("/report", { message: m.id }).then(() =>
                          onSaid("Message signalé."),
                        )
                      }
                    >
                      Signaler
                    </button>
                  )}
                </li>
              ))}
              {!messages.length ? (
                <li className="pc-co-empty">Personne n'a encore écrit.</li>
              ) : null}
            </ol>
            <form
              className="pc-co-write"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                void call("/messages", { body: text }).then((j) => {
                  if (j.messages) setText("");
                });
              }}
            >
              <label className="pc-sr" htmlFor="pc-co-input">
                Ton message
              </label>
              <input
                id="pc-co-input"
                data-compagnie-input
                value={text}
                maxLength={280}
                placeholder="280 caractères, sans liens"
                onChange={(e) => setText(e.target.value)}
              />
              <button
                type="submit"
                className="pc-passe-go"
                data-compagnie-send
                disabled={!text.trim()}
              >
                Envoyer
              </button>
            </form>
          </section>
          <div className="pc-pl-acts" data-glow={String(guide === 3)}>
            <button
              type="button"
              className="pc-passe-quiet"
              data-compagnie-invite
              onClick={() => {
                navigator.clipboard?.writeText(link).catch(() => {});
                setCopied(true);
              }}
            >
              {copied ? "Lien copié" : "Copier le lien d'invitation"}
              <small>{link.replace(/^https?:\/\//, "")}</small>
            </button>
            <button
              type="button"
              className="pc-passe-quiet"
              onClick={() =>
                void call("/leave", {}).then(() => {
                  onSaid("Tu as quitté la compagnie.");
                  onChange();
                })
              }
            >
              Quitter la compagnie
            </button>
          </div>
        </>
      )}
    </section>
  );
}
