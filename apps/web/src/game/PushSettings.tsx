import { useEffect, useState } from "react";
import { fr } from "../i18n.js";
import { Label, Panel, Slab, Switch } from "../ui.js";
import { gameApi } from "./api.js";
import {
  currentSubscription,
  disablePush,
  enablePush,
  needsHomeScreen,
  pushSupported,
} from "./push.js";
import type { NotificationKind, PushSettings as Settings } from "./types.js";

/** Profile section: push on this device, and which kinds of notices to receive. */
export function PushSettings() {
  const t = fr.game.notices.push;
  const [settings, setSettings] = useState<Settings | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    gameApi
      .pushSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
    currentSubscription()
      .then((s) => setOn(s !== null))
      .catch(() => setOn(false));
  }, []);

  if (!settings) return null;

  const blocked = !settings.publicKey
    ? t.unavailable
    : !pushSupported()
      ? needsHomeScreen()
        ? t.homeScreen
        : t.unsupported
      : needsHomeScreen()
        ? t.homeScreen
        : null;

  const toggleKind = async (kind: NotificationKind) => {
    const off = settings.off.includes(kind)
      ? settings.off.filter((k) => k !== kind)
      : [...settings.off, kind];
    setSettings({ ...settings, off });
    await gameApi.setPushOff(off).catch(() => undefined);
  };

  return (
    <section className="space-y-3">
      <Label>{t.title}</Label>
      <Panel>
        <p className="text-sm text-cream-dim">{t.help}</p>
        {blocked ? (
          <p className="mt-3 text-sm text-gold">{blocked}</p>
        ) : (
          <Slab
            className="mt-4 w-full"
            tone={on ? "ghost" : "gold"}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage(null);
              try {
                if (on) {
                  await disablePush();
                  setOn(false);
                } else if (settings.publicKey) {
                  const res = await enablePush(settings.publicKey);
                  setOn(res === "ok");
                  if (res === "denied") setMessage(t.denied);
                  if (res === "unsupported") setMessage(t.unsupported);
                }
              } catch {
                setMessage(t.unsupported);
              } finally {
                setBusy(false);
              }
            }}
          >
            {on ? t.disable : t.enable}
          </Slab>
        )}
        {message && <p className="mt-3 text-sm text-vermilion">{message}</p>}
        <div className="mt-4 space-y-2">
          {settings.kinds.map((kind) => (
            <Switch
              key={kind}
              checked={
                settings.optIn?.includes(kind)
                  ? settings.off.includes(kind)
                  : !settings.off.includes(kind)
              }
              onChange={() => toggleKind(kind)}
              label={t.kinds[kind]}
            />
          ))}
        </div>
      </Panel>
    </section>
  );
}
