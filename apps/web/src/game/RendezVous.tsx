import { useEffect, useState } from "react";
import { fr } from "../i18n.js";
import { Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { hourOf } from "./format.js";
import { currentSubscription, enablePush, needsHomeScreen, pushSupported } from "./push.js";
import { eveningBatches } from "./workshops.js";

/**
 * Asking to notify, the browser's window opened only on the merchant's touch (E3-1 of the
 * experts): « Me prévenir », then what came of it. Hidden when this device is subscribed or push
 * cannot work here; on an iPhone outside the home screen, the way to get there.
 */
export function NotifyAsk({ onAnswered }: { onAnswered?: () => void }) {
  const t = fr.game.coach.rendezvous;
  const [key, setKey] = useState<string | null>(null);
  const [state, setState] = useState<"ask" | "busy" | "ok" | "denied" | "hidden">("hidden");
  useEffect(() => {
    if (!pushSupported() && !needsHomeScreen()) return;
    gameApi
      .pushSettings()
      .then(async (s) => {
        if (!s.publicKey) return;
        setKey(s.publicKey);
        setState((await currentSubscription().catch(() => null)) ? "hidden" : "ask");
      })
      .catch(() => undefined);
  }, []);
  if (state === "hidden") return null;
  if (state === "ok") return <p className="meta mt-2 text-lagoon">{t.notified}</p>;
  if (state === "denied") return <p className="meta mt-2 text-gold">{t.denied}</p>;
  const ios = needsHomeScreen();
  return (
    <div className="mt-2 space-y-1">
      <Slab
        size="sm"
        tone="ghost"
        className="w-full"
        disabled={state === "busy"}
        onClick={async () => {
          // This session asked: the invitation to install waits for another one.
          askedThisSession();
          if (ios || !key) {
            void gameApi.pushAsk(false, true).catch(() => undefined);
            setState("denied");
            onAnswered?.();
            return;
          }
          setState("busy");
          const res = await enablePush(key).catch(() => "denied" as const);
          void gameApi.pushAsk(res === "ok", false).catch(() => undefined);
          setState(res === "ok" ? "ok" : "denied");
          onAnswered?.();
        }}
      >
        {t.notify}
      </Slab>
      <p className="meta">{ios ? fr.game.notices.push.homeScreen : t.notifyHelp}</p>
    </div>
  );
}

/**
 * The guide's last card (E3-1): every idle workshop launched until the evening in one touch, the
 * hours to come back (from the server's agenda), and the means to be told.
 */
export function RendezVous({ props }: { props: GameProps }) {
  const t = fr.game.coach.rendezvous;
  const idle = props.view.buildings.filter((b) => !b.job && b.canStart > 0);
  const [launched, setLaunched] = useState(false);
  const { queuesEndAt, nextWaveAt } = props.view.agenda;
  return (
    <div className="mt-2 space-y-2">
      {idle.length > 0 && !launched ? (
        <Slab
          size="sm"
          className="w-full"
          disabled={props.busy}
          onClick={async () => {
            for (const b of idle) {
              await props.act({
                type: "startProduction",
                buildingId: b.id,
                batches: eveningBatches(props, b),
              });
            }
            setLaunched(true);
          }}
        >
          {t.launch}
        </Slab>
      ) : (
        launched && <p className="meta text-lagoon">{t.launched}</p>
      )}
      <p className="text-sm leading-snug">
        {t.line(
          queuesEndAt && queuesEndAt > props.now ? hourOf(queuesEndAt) : null,
          nextWaveAt ? hourOf(nextWaveAt) : null,
        )}
      </p>
      <NotifyAsk />
    </div>
  );
}

const ASKED = "fondaco.askedPush";

function askedThisSession(): void {
  try {
    sessionStorage.setItem(ASKED, "1");
  } catch {
    // No storage: the invitation to install may come in the same session, nothing worse.
  }
}

/** Whether this visit already asked to notify (then no invitation to install in it). */
export function askedInThisSession(): boolean {
  try {
    return sessionStorage.getItem(ASKED) === "1";
  } catch {
    return false;
  }
}
