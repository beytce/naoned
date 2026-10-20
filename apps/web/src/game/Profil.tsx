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
import { hapticsEnabled, setHapticsEnabled } from "../haptics.js";
import { fr } from "../i18n.js";
import { LegalLinks } from "../legal/Legal.js";
import { setSoundEnabled, soundEnabled } from "../sound.js";
import { PALETTES, type PaletteId, choosePalette, currentPalette, needsPass } from "../theme.js";
import { Big, Donut, Label, Panel, Ribbon, Sheet, Slab, Switch } from "../ui.js";
import type { GameProps } from "./Game.js";
import { HouseSummary } from "./House.js";
import { PalmaresView } from "./Palmares.js";
import { PassPanel } from "./PassPanel.js";
import { PushSettings } from "./PushSettings.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import type { Palmares, Profile } from "./types.js";

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
                className={`slab inline-block px-2 py-0.5 font-display text-sm font-extrabold ${current ? "bg-gold text-ink" : "bg-night-4 text-cream-dim"}`}
              >
                <span>{i + 1}</span>
              </span>
              <div
                className={`slab mt-2 flex h-24 flex-col items-center justify-center px-1.5 text-center ring-1 ${current ? "bg-night-3 ring-2 ring-info" : "bg-night-2 ring-line"}`}
              >
                <span className="flex flex-col items-center">
                  <span className="font-display text-xs font-extrabold uppercase leading-tight [font-stretch:100%] [overflow-wrap:anywhere]">
                    {t.name}
                  </span>
                  <span className="mt-1 font-mono text-xs text-muted">
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
      <div className="mt-3 flex justify-between px-2 font-display text-xl text-cream-dim">
        {(
          [
            ["«", "Premier", 0],
            ["‹", "Précédent", Math.max(0, at - 1)],
            ["›", "Suivant", Math.min(profile.titles.length - 1, at + 1)],
            ["»", "Dernier", profile.titles.length - 1],
          ] as const
        ).map(([glyph, label, to]) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            disabled={to === at}
            onClick={() => setAt(to)}
            className="h-11 w-11 rounded-full transition hover:text-cream active:scale-95 disabled:opacity-30"
          >
            {glyph}
          </button>
        ))}
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
            className={`rounded-lg p-1 ring-2 ${crest[key] === v ? "bg-night-4 ring-info" : "ring-transparent"}`}
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

function SoundSetting() {
  const [on, setOn] = useState(soundEnabled());
  return (
    <Switch
      checked={on}
      onChange={(v) => {
        setSoundEnabled(v);
        setOn(v);
      }}
      label={fr.game.sound}
      hint={fr.game.soundHint}
    />
  );
}

function HapticsSetting() {
  const [on, setOn] = useState(hapticsEnabled());
  return (
    <Switch
      checked={on}
      onChange={(v) => {
        setHapticsEnabled(v);
        setOn(v);
      }}
      label={fr.game.haptics}
      hint={fr.game.hapticsHint}
    />
  );
}

function PalettePicker({ pass, offered }: { pass: boolean; offered: boolean }) {
  const [chosen, setChosen] = useState<PaletteId>(currentPalette());
  return (
    <section className="space-y-3">
      <div>
        <Label>{fr.game.palette}</Label>
        <p className="mt-1 text-xs text-cream-dim">{fr.game.paletteHint}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {/* The Pass's palette is not offered while the Pass is off. */}
        {PALETTES.filter((p) => offered || !needsPass(p.id)).map((p) => {
          const on = p.id === chosen;
          const locked = needsPass(p.id) && !pass;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              disabled={locked}
              title={locked ? fr.game.pass.paletteLocked : undefined}
              onClick={() => {
                choosePalette(p.id);
                setChosen(p.id);
              }}
              className={`flex items-center gap-3 cut border bg-night-3 p-3 text-left transition disabled:opacity-50 ${on ? "border-info" : "border-line hover:border-cream-dim/40"}`}
            >
              <span
                className="flex h-10 w-10 shrink-0 items-end justify-center gap-0.5 overflow-hidden cut p-1.5"
                style={{ background: p.swatch[0] }}
              >
                {p.swatch.slice(1).map((c) => (
                  <span key={c} className="h-4 w-2 rounded-sm" style={{ background: c }} />
                ))}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{p.name}</span>
                {needsPass(p.id) && (
                  <span className="block text-xs text-gold">{fr.game.pass.seal}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** The merchant's profile, a sheet over the map (from their arms or name in the HUD). */
export function ProfileSheet(props: GameProps) {
  const open = props.sheet === "profile";
  return (
    <Sheet open={open} onClose={() => props.setSheet(null)}>
      {open && <ProfileBody {...props} />}
    </Sheet>
  );
}

function ProfileBody(props: GameProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [palmares, setPalmares] = useState<Palmares | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState("");
  const [resetting, setResetting] = useState(false);
  const [busyReset, setBusyReset] = useState(false);
  useEffect(() => {
    gameApi
      .profile()
      .then((r) => {
        setProfile(r.profile);
        setPalmares(r.palmares);
      })
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
    <div className="space-y-8 pt-2">
      <header className="flex items-center gap-5 pr-12">
        <div className="relative">
          <div className="rounded-full bg-night-3 p-3 ring-4 ring-gold/70">
            <Crest crest={crest} size={96} />
          </div>
          {profile && (
            <span className="slab absolute -bottom-3 left-1 bg-gold px-3 py-1 font-display text-xs font-extrabold uppercase text-ink">
              <span>{profile.title.current.name}</span>
            </span>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="break-words font-display text-2xl font-extrabold leading-tight [font-stretch:105%]">
            {props.account.pseudo}
          </h1>
          <p className="label mt-2 text-cream-dim">
            {props.names.region(props.view.player.region)}
          </p>
          <button type="button" className="label mt-2 text-info" onClick={() => setEditing(true)}>
            ✎ {fr.game.editCrest}
          </button>
        </div>
      </header>

      {/* One house, one progression: the level that lasts, then the season's title, the renown
          and the Influence on one line; their detail folded underneath. */}
      <Panel glow="gold">
        <Label>{fr.game.house.card}</Label>
        {props.level && (
          <>
            <h2 className="mt-1 font-display text-2xl font-extrabold">
              {fr.game.merchantLevel.title(props.level.level)}
            </h2>
            <div className="mt-2">
              <Ribbon
                value={props.level.progress}
                label={fr.game.merchantLevel.progress(
                  props.level.xp.toLocaleString("fr-FR"),
                  props.level.to.toLocaleString("fr-FR"),
                )}
              />
            </div>
          </>
        )}
        <p className="note mt-3">
          {[
            profile ? fr.game.house.titleOf(profile.title.current.name) : null,
            palmares ? fr.game.house.renownOf(palmares.renown.points) : null,
            props.influence !== null ? fr.game.house.influenceOf(props.influence) : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <details className="group mt-3">
          <summary className="label cursor-pointer list-none text-info">
            <span className="group-open:hidden">▸ {fr.game.house.more}</span>
            <span className="hidden group-open:inline">▾ {fr.game.house.less}</span>
          </summary>
          <div className="mt-4 space-y-6">
            {props.level && <p className="text-sm text-cream-dim">{fr.game.merchantLevel.help}</p>}
            <HouseSummary {...props} />
            {profile && (
              <section className="space-y-4">
                <h3 className="font-display text-lg font-extrabold">{fr.game.profileTitle}</h3>
                <Ribbon
                  value={profile.title.progress}
                  label={
                    profile.title.next
                      ? `${d(profile.turnover).replace(" d", "")} / ${profile.title.next.from.toLocaleString("fr-FR")} d`
                      : fr.game.maxTitle
                  }
                />
                {profile.title.next && (
                  <p className="note">{fr.game.nextTitle(profile.title.next.name)}</p>
                )}
                <Titles profile={profile} />
              </section>
            )}
          </div>
        </details>
      </Panel>

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
                <span className="h-3 w-3 rounded-sm" style={{ background: p.color }} />
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
              <div key={String(label)} className="cut bg-night-3 p-3 ring-1 ring-line">
                <Big className="text-2xl text-gold">{value}</Big>
                <p className="mt-2 font-mono text-xs uppercase leading-tight tracking-wider text-muted">
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
                  className={`mt-1 text-xs leading-tight ${b.earned ? "text-cream" : "text-muted"}`}
                >
                  {b.name}
                </p>
                {!b.earned && (
                  <p className="font-mono text-xs text-muted">
                    {b.value}/{b.goal}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {palmares && (
        <section className="space-y-3">
          <h2 className="font-display text-2xl font-extrabold">{fr.game.palmares.title}</h2>
          <PalmaresView data={palmares} />
        </section>
      )}

      <PassPanel props={props} extra={props.passInfo} />

      {/* The settings, folded: the profile reads first. */}
      <details className="group space-y-6 border-t border-line pt-5">
        <summary className="flex cursor-pointer list-none items-center justify-between font-display text-lg font-extrabold uppercase">
          {fr.game.map.settings}
          <span className="text-gold transition group-open:rotate-90">›</span>
        </summary>
        <div className="mt-6 space-y-8">
          <PalettePicker pass={props.view.pass.active} offered={props.view.pass.enabled} />

          <SoundSetting />
          <HapticsSetting />

          <PushSettings />

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
              className="label w-full pt-2 text-center text-cream-dim"
            >
              {fr.logout}
            </button>
          </section>

          <section className="space-y-3">
            <div>
              <Label>{fr.game.data.title}</Label>
              <p className="mt-1 text-xs text-cream-dim">{fr.game.data.help}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href="/api/me/export"
                download
                className="cut bg-night-4 px-3 py-2 text-center font-display text-xs font-extrabold uppercase tracking-wide text-cream ring-1 ring-inset ring-line hover:ring-cream-dim/40"
              >
                {fr.game.data.export}
              </a>
              <a
                href="/api/game/ledger.csv"
                download
                className="cut bg-night-4 px-3 py-2 text-center font-display text-xs font-extrabold uppercase tracking-wide text-cream ring-1 ring-inset ring-line hover:ring-cream-dim/40"
              >
                {fr.game.data.ledgerCsv}
              </a>
              <Slab tone="ghost" size="sm" onClick={() => setDeleting(true)}>
                {fr.game.data.delete}
              </Slab>
            </div>
            <LegalLinks className="pt-2" />
          </section>

          <section className="border-t border-vermilion/40 pt-6">
            <Slab tone="vermilion" size="sm" className="w-full" onClick={() => setResetting(true)}>
              {fr.game.reset.title}
            </Slab>
          </section>
        </div>
      </details>

      <Sheet open={resetting} onClose={() => setResetting(false)}>
        <div className="space-y-5">
          <h3 className="font-display text-xl font-extrabold uppercase text-vermilion">
            {fr.game.reset.title}
          </h3>
          <p className="text-cream-dim">{fr.game.reset.text}</p>
          <Slab
            tone="vermilion"
            size="lg"
            className="w-full"
            disabled={busyReset}
            onClick={async () => {
              setBusyReset(true);
              await props.resetGame();
              setBusyReset(false);
              setResetting(false);
            }}
          >
            {fr.game.reset.confirm}
          </Slab>
          <button
            type="button"
            className="label w-full text-center"
            onClick={() => setResetting(false)}
          >
            {fr.game.reset.cancel}
          </button>
        </div>
      </Sheet>

      <Sheet open={deleting} onClose={() => setDeleting(false)}>
        <div className="space-y-4">
          <h3 className="font-display text-xl font-extrabold uppercase text-vermilion">
            {fr.game.data.delete}
          </h3>
          <p className="text-sm text-cream-dim">{fr.game.data.deleteText}</p>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={fr.game.data.typeToConfirm}
            className="w-full cut bg-night-3 px-4 py-3 text-cream ring-1 ring-line placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-vermilion"
          />
          <Slab
            tone="vermilion"
            className="w-full"
            disabled={typed.trim().toUpperCase() !== "SUPPRIMER"}
            onClick={async () => {
              await api.deleteAccount().catch(() => undefined);
              window.location.href = "/";
            }}
          >
            {fr.game.data.confirm}
          </Slab>
        </div>
      </Sheet>

      <Sheet open={editing} onClose={() => setEditing(false)}>
        {editing && <CrestEditor props={props} onClose={() => setEditing(false)} />}
      </Sheet>
    </div>
  );
}
