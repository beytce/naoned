import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { Admin } from "./Admin.js";
import { type Account, ApiError, api, tokenFromLocation } from "./api.js";
import { Sign } from "./art/logo.js";
import { Skyline } from "./art/scenes.js";
import { Game } from "./game/Game.js";
import { fr } from "./i18n.js";
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
        <Sign size={64} />
        <h1 className="mt-3 font-display text-[2.6rem] font-extrabold uppercase leading-none tracking-tight text-cream">
          {fr.appName}
        </h1>
        <Label className="mt-3">{fr.season}</Label>
      </header>
      <Skyline className="-mx-5 mt-4 w-[calc(100%+2.5rem)] max-w-none animate-floaty" />
      <section className="flex flex-1 flex-col justify-start pt-2">{children}</section>
    </main>
  );
}

const inputClass =
  "w-full rounded-xl bg-night-3 px-4 py-4 text-base text-cream ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-gold";

function Login(props: { sentTo?: string; onSent: (email: string) => void; onReset: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (props.sentTo) {
    return (
      <div className="animate-rise space-y-5 text-center">
        <h2 className="font-display text-xl font-semibold uppercase">{fr.checkInbox}</h2>
        <p className="text-cream-dim">{fr.linkSentTo(props.sentTo)}</p>
        <button type="button" onClick={props.onReset} className="label text-gold">
          {fr.otherAddress}
        </button>
      </div>
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
    </form>
  );
}

function PseudoForm({ onDone }: { onDone: (account: Account) => void }) {
  const [pseudo, setPseudo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
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
          onChange={(e) => setPseudo(e.target.value)}
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
