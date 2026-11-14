/**
 * The way in (docs/plan-compte.md C4), as on the mock-up of 11 November: the board veiled behind a
 * sheet of paper; an address, then the link it receives or the code it carries; then, the first
 * time, the house's name and flag. Everything goes through the accounts of the game (`api.ts`).
 */
import { useState } from "react";
import { type Account, ApiError, api } from "../../api.js";
import { Emblem } from "../../art/logo.js";

/** The flag's colours a player may take: red is kept for « yours » on everyone's screen. */
export const FLAG_COLORS = [
  { id: "lagoon", name: "Lapis", hex: "#2f4a7a" },
  { id: "emerald", name: "Vert de mer", hex: "#2f6b5e" },
  { id: "gold", name: "Ocre", hex: "#b07a2a" },
  { id: "violet", name: "Prune", hex: "#6b3a5e" },
  { id: "ink", name: "Encre", hex: "#2a2725" },
] as const;
export const flagHex = (color?: string) =>
  FLAG_COLORS.find((c) => c.id === color)?.hex ??
  (color === "vermilion" ? "var(--pc-accent)" : "#2a2725");

/** The charges of a flag, drawn in a box of 34. */
export const CHARGES: Record<string, { name: string; d: string }> = {
  lion: {
    name: "Lion",
    d: "M4 30 C4 18 10 10 18 10 C26 10 30 16 30 22 L24 22 L24 30 Z M14 6 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0",
  },
  anchor: {
    name: "Ancre",
    d: "M15 2 h4 v6 h6 v4 h-6 v14 c5 0 9 -3 10 -7 l3 1 c-1 7 -7 11 -15 11 c-8 0 -14 -4 -15 -11 l3 -1 c1 4 5 7 10 7 v-14 h-6 v-4 h6 z",
  },
  key: {
    name: "Clé",
    d: "M10 4 a8 8 0 1 1 0 16 a8 8 0 1 1 0 -16 z M10 9 a3 3 0 1 0 0 6 a3 3 0 1 0 0 -6 z M16 11 h16 v4 h-3 v5 h-4 v-5 h-9 z",
  },
  star: {
    name: "Étoile",
    d: "M17 2 l4.5 10 l10.5 1 l-8 7 l2.5 10.5 l-9.5 -5.5 l-9.5 5.5 l2.5 -10.5 l-8 -7 l10.5 -1 z",
  },
  tower: { name: "Tour", d: "M6 32 V8 h4 v4 h4 v-4 h6 v4 h4 v-4 h4 v24 z" },
  ship: { name: "Nef", d: "M17 2 v20 h-12 z M19 6 l10 16 h-10 z M2 24 h30 l-5 7 h-20 z" },
  wheat: {
    name: "Blé",
    d: "M17 32 V10 M17 14 c-6 -2 -8 -6 -8 -10 c5 1 8 4 8 10 M17 14 c6 -2 8 -6 8 -10 c-5 1 -8 4 -8 10 M17 22 c-6 -2 -8 -6 -8 -10 c5 1 8 4 8 10 M17 22 c6 -2 8 -6 8 -10 c-5 1 -8 4 -8 10",
  },
  crown: { name: "Couronne", d: "M3 26 L5 8 L12 16 L17 4 L22 16 L29 8 L31 26 Z" },
};

/** A house's flag: its colour, its charge, on a staff. */
export function HouseFlag({
  color,
  symbol,
  size = 92,
}: { color?: string; symbol?: string; size?: number }) {
  const charge = CHARGES[symbol ?? "lion"] ?? CHARGES.lion;
  return (
    <svg
      width={size}
      height={(size * 104) / 92}
      viewBox="0 0 92 104"
      role="img"
      aria-label="Ton pavillon"
    >
      <rect x="8" y="4" width="5" height="98" rx="2" fill="#17150f" />
      <path
        d="M13 8 H86 L72 33 L86 58 H13 Z"
        fill={flagHex(color)}
        stroke="#17150f"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <g
        transform="translate(30 16)"
        fill="#fbfaf7"
        stroke={symbol === "wheat" ? "#fbfaf7" : "none"}
        strokeWidth={symbol === "wheat" ? 2 : 0}
      >
        <path d={charge?.d} />
      </g>
    </svg>
  );
}

const SAID: Record<string, string> = {
  network: "Le serveur ne répond pas. Réessaie dans un instant.",
  invalid_code: "Ce code ne va pas. Vérifie-le, ou ouvre le lien du mail.",
  code_expired: "Ce code a expiré : demande un nouveau lien.",
  too_many_requests: "Trop d'essais : attends une minute.",
  pseudo_taken: "Ce nom est déjà pris par une autre Maison.",
  invalid_email: "Cette adresse ne va pas.",
  invalid_input: "Cette adresse ne va pas.",
  disposable_email: "Une adresse jetable ne peut pas garder ta Maison.",
};
const said = (e: unknown) =>
  e instanceof ApiError
    ? (SAID[e.code] ?? "Ça n'a pas marché. Réessaie.")
    : "Ça n'a pas marché. Réessaie.";

/** The sheet of the way in: an address, then the code or the link. */
export function Entree({ onIn }: { onIn: (a: Account) => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ask = async () => {
    setBusy(true);
    setError("");
    try {
      await api.requestLink(email.trim());
      setSent(true);
    } catch (e) {
      setError(said(e));
    } finally {
      setBusy(false);
    }
  };
  const enter = async () => {
    setBusy(true);
    setError("");
    try {
      onIn(await api.verifyCode(email.trim(), code.trim()));
    } catch (e) {
      setError(said(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pc-in" data-planche-entree>
      <div className="pc-in-veil" />
      <div className="pc-in-brand">
        <Emblem size={54} />
        <span>fondaco</span>
      </div>
      <section className="pc-in-sheet">
        <div className="pc-in-head">
          <h1>Une Maison de commerce à Venise</h1>
          <p>Tire tes fils vers les villes, bâtis ton île et bats ton rival de la semaine.</p>
        </div>
        {!sent ? (
          <>
            <div className="pc-in-promise">
              <div>
                <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                  <rect
                    x="4"
                    y="9"
                    width="18"
                    height="13"
                    rx="2"
                    fill="#fbfaf7"
                    stroke="#17150f"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M4 9 L13 3 L22 9"
                    fill="none"
                    stroke="#17150f"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <rect x="11" y="14" width="4" height="8" fill="var(--pc-accent)" />
                </svg>
                Ta Maison, pour toujours
              </div>
              <div>
                <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                  <path
                    d="M3 20 C8 20 8 7 13 7 C18 7 18 20 23 20"
                    fill="none"
                    stroke="var(--pc-accent)"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                  />
                </svg>
                Sur tous tes appareils
              </div>
              <div>
                <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                  <rect x="5" y="4" width="3" height="19" rx="1" fill="#17150f" />
                  <path d="M8 5 H21 L17 9.5 L21 14 H8 Z" fill="#17150f" />
                </svg>
                Un rival chaque semaine
              </div>
            </div>
            <form
              className="pc-in-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (email.includes("@") && !busy) void ask();
              }}
            >
              <label htmlFor="pc-in-mail">Ton adresse mail</label>
              <input
                id="pc-in-mail"
                type="email"
                autoComplete="email"
                placeholder="toi@exemple.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-entree-mail
              />
              <button
                type="submit"
                className="pc-in-go"
                disabled={!email.includes("@") || busy}
                data-entree-ask
              >
                Recevoir mon lien
                <small>sans mot de passe · il arrive en une minute</small>
              </button>
            </form>
            <p className="pc-in-small">Déjà une Maison ? Le même lien la rouvre, où que tu sois.</p>
          </>
        ) : (
          <form
            className="pc-in-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim().length >= 6 && !busy) void enter();
            }}
          >
            <p className="pc-in-sent">
              Un lien est parti vers <b>{email}</b>. Ouvre-le sur cet appareil, ou tape le code
              qu'il contient.
            </p>
            <label htmlFor="pc-in-code">Le code du mail</label>
            <input
              id="pc-in-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              data-entree-code
            />
            <button
              type="submit"
              className="pc-in-go"
              disabled={code.trim().length < 6 || busy}
              data-entree-enter
            >
              Entrer
            </button>
            <button type="button" className="pc-in-quiet" onClick={() => setSent(false)}>
              Changer d'adresse
            </button>
          </form>
        )}
        {error ? <p className="pc-in-error">{error}</p> : null}
      </section>
    </div>
  );
}

/** The first time: the house's name and flag, seen by everyone on the board. */
export function Fonder({ account, onDone }: { account: Account; onDone: (a: Account) => void }) {
  const [name, setName] = useState(account.pseudo ?? "");
  const [color, setColor] = useState<string>(
    account.crest?.color && account.crest.color !== "vermilion" ? account.crest.color : "lagoon",
  );
  const [symbol, setSymbol] = useState<string>(account.crest?.symbol ?? "lion");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const found = async () => {
    setBusy(true);
    setError("");
    try {
      let a = await api.setPseudo(name.trim());
      a = await api.setCrest({ shape: account.crest?.shape ?? "banner", color, symbol });
      onDone(a);
    } catch (e) {
      setError(said(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="pc-in" data-planche-fonder>
      <div className="pc-in-veil" />
      <section className="pc-in-sheet pc-in-found">
        <div className="pc-in-head">
          <span className="pc-in-step">Premier pas</span>
          <h1>Fonde ta Maison</h1>
          <p>
            Son nom et son pavillon se verront sur la planche, sur ta façade et dans la Gazette.
          </p>
        </div>
        <div className="pc-in-preview">
          <HouseFlag color={color} symbol={symbol} size={76} />
          <div>
            <b>Ca’ {name.trim() || "…"}</b>
            <span>Niveau 1 · Bottega</span>
          </div>
        </div>
        <label htmlFor="pc-in-name" className="pc-in-label">
          Son nom
        </label>
        <div className="pc-in-name">
          <span>Ca’</span>
          <input
            id="pc-in-name"
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            data-fonder-name
          />
        </div>
        <span className="pc-in-label">Son pavillon</span>
        <div className="pc-in-colors">
          {FLAG_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-label={c.name}
              aria-pressed={color === c.id}
              style={{ background: c.hex }}
              onClick={() => setColor(c.id)}
            />
          ))}
        </div>
        <div className="pc-in-charges">
          {Object.entries(CHARGES).map(([id, c]) => (
            <button
              key={id}
              type="button"
              aria-pressed={symbol === id}
              onClick={() => setSymbol(id)}
            >
              <svg width="22" height="22" viewBox="0 0 34 34" aria-hidden="true">
                <path
                  d={c.d}
                  fill={id === "wheat" ? "none" : "#17150f"}
                  stroke={id === "wheat" ? "#17150f" : "none"}
                  strokeWidth="2"
                />
              </svg>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
        <p className="pc-in-small">
          Chez toi, ta Maison reste rouge : ce pavillon est celui que voient les autres.
        </p>
        <button
          type="button"
          className="pc-in-go"
          disabled={busy || name.trim().length < 3}
          onClick={() => void found()}
          data-fonder-go
        >
          Fonder Ca’ {name.trim() || "…"}
          <small>ton île t'attend · le Fondaco et trois cases</small>
        </button>
        {error ? <p className="pc-in-error">{error}</p> : null}
      </section>
    </div>
  );
}

/** The profile, behind the medallion: name, flag, way out, the former game. */
export function Profil({
  account,
  lagoon,
  close,
  onOut,
  onFlag,
}: {
  account: Account;
  lagoon?: string;
  close: () => void;
  onOut: () => void;
  onFlag: () => void;
}) {
  return (
    <section className="pc-planche-card pc-pl-card pc-in-profile" data-planche-profil>
      <div className="pc-pl-head">
        <div>
          <h2>Ca’ {account.pseudo}</h2>
          <span>
            {lagoon ? `${lagoon} · ` : ""}
            {account.email}
          </span>
        </div>
        <button type="button" className="pc-pl-x" aria-label="Fermer la fiche" onClick={close}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M2 2 L12 12 M12 2 L2 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
      <div className="pc-in-preview">
        <HouseFlag color={account.crest?.color} symbol={account.crest?.symbol} size={60} />
        <button type="button" className="pc-passe-quiet" onClick={onFlag}>
          Changer de nom ou de pavillon
        </button>
      </div>
      <div className="pc-pl-acts">
        <a className="pc-passe-quiet" href="/ancien">
          L'ancien Fondaco
        </a>
        <button type="button" className="pc-passe-quiet" onClick={onOut} data-profil-out>
          Se déconnecter
        </button>
      </div>
      <p className="pc-in-small">
        Ta Maison est à toi pour de bon : elle t'attend sur tous tes appareils.
      </p>
    </section>
  );
}
