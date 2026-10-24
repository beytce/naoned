import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Admin } from "./Admin.js";
import { type Account, ApiError, api, tokenFromLocation } from "./api.js";
import { Emblem } from "./art/logo.js";
import { Skyline } from "./art/scenes.js";
import { Game } from "./game/Game.js";
import { fr } from "./i18n.js";
import { LegalLinks, LegalPage, legalPageAt } from "./legal/Legal.js";
import { Label, Slab } from "./ui.js";

type Screen =
  | { name: "loading" }
  | { name: "login"; sentTo?: string }
  | { name: "verifying" }
  | { name: "invalidLink" }
  | { name: "pseudo"; account: Account }
  | { name: "home"; account: Account };

function errorText(err: unknown): string {
  const code = err instanceof ApiError ? err.code : "unknown";
  return fr.errors[code] ?? fr.errors.unknown ?? "";
}

function screenFor(account: Account): Screen {
  return account.pseudo ? { name: "home", account } : { name: "pseudo", account };
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "loading" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice; a token is single-use.
    started.current = true;
    const token = tokenFromLocation(window.location);
    if (token) {
      setScreen({ name: "verifying" });
      window.history.replaceState(null, "", "/");
      api
        .verify(token)
        .then((account) => setScreen(screenFor(account)))
        .catch(() => setScreen({ name: "invalidLink" }));
      return;
    }
    api
      .me()
      .then((account) => setScreen(screenFor(account)))
      .catch(() => setScreen({ name: "login" }));
  }, []);

  const logout = async () => {
    await api.logout().catch(() => undefined);
    setScreen({ name: "login" });
  };

  // The legal pages are read with or without an account.
  const legal = legalPageAt(window.location.pathname);
  if (legal) return <LegalPage page={legal} />;
  if (screen.name === "home" && window.location.pathname === "/admin") return <Admin />;
  if (screen.name === "home") {
    return (
      <Game
        account={screen.account}
        onAccount={(account) => setScreen({ name: "home", account })}
        onLogout={logout}
      />
    );
  }

  return (
    <Hero>
      {screen.name === "loading" && <p className="text-center text-muted">…</p>}
      {screen.name === "verifying" && <p className="text-center">{fr.signingIn}</p>}
      {screen.name === "login" && (
        <Login
          sentTo={screen.sentTo}
          onSent={(email) => setScreen({ name: "login", sentTo: email })}
          onReset={() => setScreen({ name: "login" })}
          onSignedIn={(account) => setScreen(screenFor(account))}
        />
      )}
      {screen.name === "invalidLink" && (
        <div className="space-y-6 text-center">
          <p>{fr.invalidLink}</p>
          <Slab onClick={() => setScreen({ name: "login" })}>{fr.askNewLink}</Slab>
        </div>
      )}
      {screen.name === "pseudo" && (
        <PseudoForm onDone={(account) => setScreen(screenFor(account))} />
      )}
    </Hero>
  );
}

function Hero({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="flex flex-col items-center text-center">
        <Emblem size={88} className="drop-shadow-xl" />
        <h1 className="mt-3 font-display text-[2.6rem] font-extrabold uppercase leading-none tracking-tight text-cream">
          {fr.appName}
        </h1>
        <Label className="mt-3">{fr.season}</Label>
      </header>
      <Skyline className="-mx-5 mt-4 w-[calc(100%+2.5rem)] max-w-none animate-floaty" />
      <section className="flex flex-1 flex-col justify-start pt-2">{children}</section>
      <LegalLinks className="mt-8" />
    </main>
  );
}

const inputClass =
  "w-full rounded-md bg-night-3 px-4 py-4 text-base text-cream ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold";

/** The app installed on the home screen: its link would open in the browser, not here. */
function standalone(): boolean {
  return (
    (navigator as { standalone?: boolean }).standalone === true ||
    (window.matchMedia?.("(display-mode: standalone)").matches ?? false)
  );
}

function Login(props: {
  sentTo?: string;
  onSent: (email: string) => void;
  onReset: () => void;
  onSignedIn: (account: Account) => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (props.sentTo) {
    return (
      <CodeForm
        email={props.sentTo}
        onSignedIn={props.onSignedIn}
        onReset={props.onReset}
        onResend={async () => {
          await api.requestLink(props.sentTo ?? "");
        }}
      />
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.requestLink(email);
      props.onSent(email.trim());
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="animate-rise space-y-5">
      <p className="text-center text-lg leading-snug text-cream-dim">{fr.tagline}</p>
      <ul className="space-y-1 text-sm text-cream-dim">
        {fr.promises.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="text-info">✦</span>
            {p}
          </li>
        ))}
      </ul>
      <label className="block space-y-2">
        <Label>{fr.emailLabel}</Label>
        <input
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={fr.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>
      {error && <p className="text-sm text-vermilion">{error}</p>}
      <Slab type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? fr.sending : fr.sendLink}
      </Slab>
      <p className="text-center text-xs text-muted">{fr.noPassword}</p>
      <p className="text-center text-xs text-muted">
        {fr.accept[0]}
        <a href="/conditions" className="underline">
          {fr.accept[1]}
        </a>
        {fr.accept[2]}
        <a href="/confidentialite" className="underline">
          {fr.accept[3]}
        </a>
        {fr.accept[4]}
      </p>
    </form>
  );
}

/**
 * The mail is gone: its code typed here (one field, digits, pasted or filled in by the phone),
 * sent at the sixth digit; or its link touched, in this browser.
 */
function CodeForm(props: {
  email: string;
  onSignedIn: (account: Account) => void;
  onReset: () => void;
  onResend: () => Promise<void>;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const app = standalone();

  const send = async (digits: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      props.onSignedIn(await api.verifyCode(props.email, digits));
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "invalid_code" ? fr.code.wrong : errorText(err),
      );
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="animate-rise space-y-5 text-center"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) void send(code);
      }}
    >
      <h2 className="font-display text-xl font-semibold uppercase">{fr.checkInbox}</h2>
      {/* The field first: on a small phone, the keyboard covers what lies below. */}
      <label className="block space-y-2 text-left">
        <Label>{fr.code.label}</Label>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          aria-label={fr.code.label}
          placeholder="000 000"
          value={code.length > 3 ? `${code.slice(0, 3)} ${code.slice(3)}` : code}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(digits);
            if (digits.length === 6) void send(digits);
          }}
          className={`${inputClass} text-center font-mono text-3xl tracking-[0.3em]`}
        />
      </label>
      <p className={`text-sm ${app ? "font-semibold text-gold" : "text-cream-dim"}`}>
        {fr.code.iosHint}
      </p>
      {error && <p className="text-sm text-vermilion">{error}</p>}
      <Slab type="submit" size="lg" className="w-full" disabled={busy || code.length < 6}>
        {busy ? fr.signingIn : fr.code.submit}
      </Slab>
      <p className="text-sm text-cream-dim">{fr.linkSentTo(props.email)}</p>
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          disabled={resent}
          onClick={async () => {
            setError(null);
            try {
              await props.onResend();
              setResent(true);
            } catch (err) {
              setError(errorText(err));
            }
          }}
          className="label min-h-11 text-gold disabled:opacity-40"
        >
          {fr.code.resend}
        </button>
        <button type="button" onClick={props.onReset} className="label min-h-11 text-gold">
          {fr.otherAddress}
        </button>
      </div>
    </form>
  );
}

function PseudoForm({ onDone }: { onDone: (account: Account) => void }) {
  const [pseudo, setPseudo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    // The server's rule, said precisely before asking it.
    if (!/^[\p{L}\p{N}_-]{3,20}$/u.test(pseudo)) {
      setError(fr.pseudoInvalid);
      return;
    }
    setBusy(true);
    try {
      onDone(await api.setPseudo(pseudo));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="animate-rise space-y-5">
      <h2 className="text-center font-display text-xl font-semibold uppercase">
        {fr.choosePseudo}
      </h2>
      <label className="block space-y-2">
        <Label>{fr.pseudoLabel}</Label>
        <input
          required
          minLength={3}
          maxLength={20}
          autoComplete="nickname"
          value={pseudo}
          // A space becomes "_" as it is typed: "Ser Marco" gives "Ser_Marco".
          onChange={(e) => setPseudo(e.target.value.replace(/\s/g, "_"))}
          className={inputClass}
        />
      </label>
      <p className="text-xs text-muted">{fr.pseudoHelp}</p>
      {error && <p className="text-sm text-vermilion">{error}</p>}
      <Slab type="submit" size="lg" className="w-full" disabled={busy}>
        {fr.confirm}
      </Slab>
    </form>
  );
}
