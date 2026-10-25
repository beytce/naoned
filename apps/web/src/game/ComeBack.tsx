import { useEffect, useState } from "react";
import { Lorenzo } from "../art/scenes.js";
import { fr } from "../i18n.js";
import { LorenzoCard, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { NotifyAsk, askedInThisSession } from "./RendezVous.js";
import { gameApi } from "./api.js";
import { currentSubscription, needsHomeScreen, pushSupported } from "./push.js";
import { store } from "./store.js";

/** The browser's offer to install, kept from the moment it comes (Chrome, Edge, Android). */
interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}
let installPrompt: InstallPrompt | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installPrompt = e as InstallPrompt;
  });
}

function standalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

/**
 * After the guide, what makes one come back (E3-1 and E3-4 of the experts): one reminder to be
 * told, at the third session, if the guide's card was not answered yes; the invitation to install
 * from the second session, never in a visit that already asked to notify. One at a time.
 */
export function ComeBack(props: GameProps) {
  const ask = props.pushAsk;
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    currentSubscription()
      .then((s) => setSubscribed(s !== null))
      .catch(() => setSubscribed(false));
  }, []);
  if (closed || !ask || subscribed === null || store.get("guideDone") !== "1") return null;
  const t = fr.game.coach;

  const remind =
    !subscribed && ask.count === 1 && ask.sessions >= 3 && (pushSupported() || needsHomeScreen());
  if (remind) {
    return (
      <Prompt
        text={t.rendezvous.reminder}
        onLater={() => {
          // The one reminder: « later » counts as its answer, it does not come again.
          void gameApi.pushAsk(false, needsHomeScreen()).catch(() => undefined);
          setClosed(true);
        }}
        later={t.rendezvous.later}
      >
        <NotifyAsk onAnswered={() => setTimeout(() => setClosed(true), 2_500)} />
      </Prompt>
    );
  }

  const install =
    installPrompt !== null &&
    !standalone() &&
    ask.sessions >= 2 &&
    !askedInThisSession() &&
    store.get("installLater") !== "1";
  if (install) {
    return (
      <Prompt
        text={fr.game.coach.install.text}
        later={fr.game.coach.install.later}
        onLater={() => {
          store.set("installLater", "1");
          setClosed(true);
        }}
      >
        <Slab
          size="sm"
          className="mt-2 w-full"
          onClick={async () => {
            await installPrompt?.prompt().catch(() => undefined);
            installPrompt = null;
            setClosed(true);
          }}
        >
          {fr.game.coach.install.action}
        </Slab>
      </Prompt>
    );
  }
  return null;
}

function Prompt({
  text,
  later,
  onLater,
  children,
}: {
  text: string;
  later: string;
  onLater: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[44] mx-auto max-w-md animate-rise lg:bottom-28">
      <LorenzoCard
        bubble
        portrait={<Lorenzo size={40} />}
        name={fr.game.coach.name}
        foot={
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              className="-my-2 -mr-2 h-11 px-2 text-sm text-cream-dim"
              onClick={onLater}
            >
              {later}
            </button>
          </div>
        }
      >
        <p className="mt-1 text-sm leading-snug">{text}</p>
        {children}
      </LorenzoCard>
    </div>
  );
}
