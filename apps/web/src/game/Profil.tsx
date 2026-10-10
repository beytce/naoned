import { useEffect, useState } from "react";
import { api } from "../api.js";
import {
  CREST_COLORS,
  CREST_SHAPES,
  CREST_SYMBOLS,
  Crest,
  type CrestData,
  defaultCrest,
} from "../art/crest.js";
import { Medal } from "../art/icons.js";
import { P } from "../art/palette.js";
import { fr } from "../i18n.js";
import { Big, Donut, Label, Panel, Ribbon, Sheet, Slab } from "../ui.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import type { Profile } from "./types.js";

function Titles({ profile }: { profile: Profile }) {
  const [at, setAt] = useState(profile.title.index);
  const show = [at - 1, at, at + 1];
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {show.map((i) => {
          const t = profile.titles[i];
          if (!t) return <div key={i} />;
          const reached = i <= profile.title.index;
          const current = i === profile.title.index;
          return (
            <div key={t.code} className="text-center">
              <span
                className={`slab inline-block px-2 py-0.5 font-display text-sm font-extrabold ${current ? "bg-gold text-night" : "bg-night-4 text-cream-dim"}`}
              >
                <span>{i + 1}</span>
              </span>
              <div
                className={`slab mt-2 flex h-24 flex-col items-center justify-center px-2 ring-1 ${current ? "bg-night-3 ring-2 ring-gold" : "bg-night-2 ring-line"}`}
              >
                <span className="flex flex-col items-center">
                  <span className="font-display text-xs font-extrabold uppercase">{t.name}</span>
                  <span className="mt-1 font-mono text-[10px] text-muted">
                    {t.from.toLocaleString("fr-FR")} d
                  </span>
                </span>
              </div>
              <p className={`label mt-2 ${reached ? "text-lagoon" : ""}`}>
                {reached ? "✓ acquis" : "à venir"}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between px-6 font-display text-xl text-cream-dim">
        <button type="button" onClick={() => setAt(0)} aria-label="Premier">
          «
        </button>
        <button type="button" onClick={() => setAt(Math.max(0, at - 1))} aria-label="Précédent">
          ‹
        </button>
        <button
          type="button"
          onClick={() => setAt(Math.min(profile.titles.length - 1, at + 1))}
          aria-label="Suivant"
        >
          ›
        </button>
        <button type="button" onClick={() => setAt(profile.titles.length - 1)} aria-label="Dernier">
          »
        </button>
      </div>
    </div>
  );
}

function CrestEditor({ props, onClose }: { props: GameProps; onClose: () => void }) {
  const [crest, setCrest] = useState<CrestData>(
    props.account.crest ?? defaultCrest(props.account.id),
  );
  const [busy, setBusy] = useState(false);
  const row = <T extends string>(label: string, values: readonly T[], key: keyof CrestData) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="-mx-1 flex flex-wrap gap-2">
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setCrest({ ...crest, [key]: v })}
            className={`rounded-lg p-1 ring-2 ${crest[key] === v ? "bg-night-4 ring-gold" : "ring-transparent"}`}
          >
            <Crest crest={{ ...crest, [key]: v }} size={40} />
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Crest crest={crest} size={84} />
        <h3 className="font-display text-xl font-extrabold uppercase">{fr.game.crestTitle}</h3>
      </div>
      {row(fr.game.shape, CREST_SHAPES, "shape")}
      {row(fr.game.color, CREST_COLORS, "color")}
      {row(fr.game.symbol, CREST_SYMBOLS, "symbol")}
      <Slab
        size="lg"
        className="w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            props.onAccount(await api.setCrest(crest));
            onClose();
          } finally {
            setBusy(false);
          }
        }}
      >
        {fr.game.save}
      </Slab>
    </div>
  );
}

export function Profil(props: GameProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    gameApi
      .profile()
      .then((r) => setProfile(r.profile))
      .catch(() => setProfile(null));
  }, []);
  const crest = props.account.crest ?? defaultCrest(props.account.id);
  const worth = profile?.netWorth ?? props.view.netWorth;
  const parts = [
    { label: fr.game.cash, value: Number(worth.cash), color: P.gold },
    { label: fr.game.stockValue, value: Number(worth.stock), color: P.lagoon },
    { label: fr.game.buildingsValue, value: Number(worth.buildings), color: P.vermilion },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Slab tone="ghost" size="sm" onClick={() => setEditing(true)}>
          {fr.game.editCrest}
        </Slab>
      </div>
      <header className="-mt-4 flex items-center gap-5">
        <div className="relative">
          <div className="rounded-full bg-night-3 p-3 ring-4 ring-gold/70">
            <Crest crest={crest} size={96} />
          </div>
          {profile && (
            <span className="slab absolute -bottom-3 left-1 bg-gold px-3 py-1 font-display text-xs font-extrabold uppercase text-night">
              <span>{profile.title.current.name}</span>
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-extrabold">{props.account.pseudo}</h1>
          <p className="label mt-2 text-lagoon">{props.names.region(props.view.player.region)}</p>
        </div>
      </header>

      {profile && (
        <section className="space-y-4">
          <h2 className="font-display text-2xl font-extrabold">{fr.game.profileTitle}</h2>
          <Ribbon
            value={profile.title.progress}
            label={
              profile.title.next
                ? `${d(worth.total).replace(" d", "")} / ${profile.title.next.from.toLocaleString("fr-FR")} d`
                : fr.game.maxTitle
            }
          />
          {profile.title.next && (
            <p className="label">{fr.game.nextTitle(profile.title.next.name)}</p>
          )}
          <Titles profile={profile} />
        </section>
      )}

      <Panel>
        <Label>{fr.game.netWorth}</Label>
        <div className="mt-3 flex items-center gap-5">
          <div className="relative">
            <Donut parts={parts} size={120} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Big className="text-sm">{d(worth.total)}</Big>
            </div>
          </div>
          <ul className="space-y-2 text-sm">
            {parts.map((p) => (
              <li key={p.label} className="flex items-center gap-2">
                <span className="h-3 w-3" style={{ background: p.color }} />
                <span className="text-cream-dim">{p.label}</span>
                <span className="font-display font-semibold">{d(String(p.value))}</span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      {profile && (
        <section className="space-y-3">
          <Label>{fr.game.statsTitle}</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              [fr.game.stats.rank, profile.rank ? `#${profile.rank}` : "—"],
              [fr.game.stats.buildings, profile.buildings],
              [fr.game.stats.trades, profile.stats.trades],
              [fr.game.stats.citySold, profile.stats.citySold],
              [fr.game.stats.delivered, profile.stats.delivered],
              [fr.game.stats.days, profile.stats.days],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-night-3 p-3 ring-1 ring-line">
                <Big className="text-2xl text-gold">{value}</Big>
                <p className="mt-2 font-mono text-[10px] uppercase leading-tight tracking-wider text-muted">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {profile && (
        <section className="space-y-3">
          <Label>{fr.game.trophies}</Label>
          <div className="grid grid-cols-4 gap-3">
            {profile.badges.map((b) => (
              <div key={b.code} className="text-center">
                <div className="flex justify-center">
                  <Medal earned={b.earned} size={40} />
                </div>
                <p
                  className={`mt-1 text-[11px] leading-tight ${b.earned ? "text-cream" : "text-muted"}`}
                >
                  {b.name}
                </p>
                {!b.earned && (
                  <p className="font-mono text-[10px] text-muted">
                    {b.value}/{b.goal}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <Slab tone="ghost" className="w-full" onClick={props.openHelp}>
          {fr.game.help}
        </Slab>
        <div className="grid grid-cols-2 gap-3">
          <Slab tone="ghost" size="sm" onClick={props.replayIntro}>
            {fr.game.replayIntro}
          </Slab>
          <Slab tone="ghost" size="sm" onClick={props.replayGuide}>
            {fr.game.replayGuide}
          </Slab>
        </div>
        <button
          type="button"
          onClick={props.onLogout}
          className="label w-full pt-2 text-center text-vermilion"
        >
          {fr.logout}
        </button>
      </section>

      <Sheet open={editing} onClose={() => setEditing(false)}>
        {editing && <CrestEditor props={props} onClose={() => setEditing(false)} />}
      </Sheet>
    </div>
  );
}
