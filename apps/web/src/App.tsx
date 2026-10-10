import { type FormEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { type Account, ApiError, api, tokenFromLocation } from "./api.js";
import { fr } from "./i18n.js";

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

  return (
    <Shell>
      {screen.name === "loading" && <p className="text-center opacity-70">…</p>}
      {screen.name === "verifying" && <p className="text-center">{fr.signingIn}</p>}
      {screen.name === "login" && (
        <Login
          sentTo={screen.sentTo}
          onSent={(email) => setScreen({ name: "login", sentTo: email })}
          onReset={() => setScreen({ name: "login" })}
        />
      )}
      {screen.name === "invalidLink" && (
        <div className="space-y-4 text-center">
          <p>{fr.invalidLink}</p>
          <Button onClick={() => setScreen({ name: "login" })}>{fr.askNewLink}</Button>
        </div>
      )}
      {screen.name === "pseudo" && (
        <PseudoForm onDone={(account) => setScreen(screenFor(account))} />
      )}
      {screen.name === "home" && (
        <div className="space-y-6 text-center">
          <h2 className="font-serif text-2xl">{fr.welcome(screen.account.pseudo ?? "")}</h2>
          <p className="opacity-80">{fr.comingSoon}</p>
          <button type="button" onClick={logout} className="text-sm underline opacity-70">
            {fr.logout}
          </button>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))]">
      <header className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-bold text-rust dark:text-gold">{fr.appName}</h1>
        <p className="mt-1 text-xs uppercase tracking-widest opacity-60">{fr.season}</p>
      </header>
      <section className="flex flex-1 flex-col justify-center">{children}</section>
    </main>
  );
}

function Button(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className="w-full rounded-lg bg-rust px-4 py-3.5 text-base font-semibold text-white shadow-sm active:bg-rust-light disabled:opacity-50"
    >
      {props.children}
    </button>
  );
}

const inputClass =
  "w-full rounded-lg border border-ink/20 bg-white px-4 py-3.5 text-base outline-none focus:border-rust dark:border-ink-light/20 dark:bg-black/30";

function Login(props: { sentTo?: string; onSent: (email: string) => void; onReset: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (props.sentTo) {
    return (
      <div className="space-y-4 text-center">
        <h2 className="font-serif text-2xl">{fr.checkInbox}</h2>
        <p className="opacity-80">{fr.linkSentTo(props.sentTo)}</p>
        <button type="button" onClick={props.onReset} className="text-sm underline opacity-70">
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
    <form onSubmit={submit} className="space-y-4">
      <p className="text-center font-serif text-lg">{fr.tagline}</p>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{fr.emailLabel}</span>
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
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? fr.sending : fr.sendLink}
      </Button>
      <p className="text-center text-xs opacity-60">{fr.noPassword}</p>
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
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-center font-serif text-2xl">{fr.choosePseudo}</h2>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{fr.pseudoLabel}</span>
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
      <p className="text-xs opacity-60">{fr.pseudoHelp}</p>
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <Button type="submit" disabled={busy}>
        {fr.confirm}
      </Button>
    </form>
  );
}
