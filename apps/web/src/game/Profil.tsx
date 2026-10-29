import { useEffect, useState } from "react";
import { ApiError, api } from "../api.js";
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
import { LANG, LANGS, type Lang, keepLang, locale } from "../lang.js";
import { LegalLinks } from "../legal/Legal.js";
import { setSoundEnabled, soundEnabled } from "../sound.js";
import {
  PALETTES,
  type PaletteId,
  TEXT_SIZES,
  type TextSize,
  applyTextSize,
  choosePalette,
  currentPalette,
  currentTextSize,
  needsPass,
} from "../theme.js";
import { Big, Donut, Label, Panel, Ribbon, Segmented, Sheet, Slab, Switch } from "../ui.js";
import { Gallery, useDynasty } from "./Dynasty.js";
import type { GameProps } from "./Game.js";
import { HouseSummary } from "./House.js";
import { CompanyPanel } from "./MyCompany.js";
import { PalmaresView } from "./Palmares.js";
import { PassPanel } from "./PassPanel.js";
import { PushSettings } from "./PushSettings.js";
import { leagueOf } from "./Sfida.js";
import { gameApi } from "./api.js";
import { d, whole } from "./format.js";
import { palaceGap } from "./politics.js";
import type { Palmares, Profile, RankingRow } from "./types.js";

function Titles({ profile }: { profile: Profile }) {
  const [at, setAt] = useState(profile.title.index);
  const show = [at - 1, at, at + 1];
  // Lagune: the titles as a constellation, the path lit in gold up to the one held.
  return (
    <div>
      <div className="relative grid grid-cols-3 gap-2">
        <span
          aria-hidden="true"
          className="absolute left-[16%] right-[16%] top-5 h-0.5 bg-[linear-gradient(90deg,rgb(var(--gold-soft))_0_50%,rgb(var(--line))_50%_100%)]"
        />
        {show.map((i) => {
          const t = profile.titles[i];
          if (!t) return <div key={i} />;
          const reached = i <= profile.title.index;
          const current = i === profile.title.index;
          return (
            <div key={t.code} className="relative flex flex-col items-center text-center">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full font-display text-sm font-extrabold ${current ? "bg-gold text-ink shadow-[0_0_18px_rgb(var(--gold)/0.45)]" : reached ? "bg-gold-soft text-ink" : "bg-night-3 text-cream-dim ring-2 ring-inset ring-line"}`}
              >
                {i + 1}
              </span>
              <span className="mt-2 font-display text-xs font-extrabold leading-tight [overflow-wrap:anywhere]">
                {t.name}
              </span>
              <span className="mt-0.5 text-xs text-muted">{t.from.toLocaleString(locale)} d</span>
              <span className={`mt-1 text-xs ${reached ? "text-lagoon" : "text-cream-dim"}`}>
                {reached ? fr.misc.reached : fr.misc.upcoming}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between px-2 font-display text-xl text-cream-dim">
        {(
          [
            ["«", fr.misc.first, 0],
            ["‹", fr.misc.prev, Math.max(0, at - 1)],
            ["›", fr.misc.next, Math.min(profile.titles.length - 1, at + 1)],
            ["»", fr.misc.last, profile.titles.length - 1],
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

/** The size of the text, 100 to 130 % (E3-11 of the experts). */
/** French or English (E3-8): kept on this device and for the pushes, the game reloads in it. */
function LanguageSetting() {
  return (
    <section className="space-y-3">
      <Label>{fr.game.language}</Label>
      <Segmented
        value={LANG}
        options={LANGS.map((l) => ({ value: l, label: fr.game.languageNames[l] ?? l }))}
        onChange={async (v) => {
          const next = v as Lang;
          if (next === LANG) return;
          keepLang(next);
          await api.setLang(next).catch(() => undefined);
          window.location.reload();
        }}
      />
    </section>
  );
}

function TextSizeSetting() {
  const [size, setSize] = useState<TextSize>(currentTextSize());
  return (
    <section className="space-y-3">
      <Label>{fr.game.textSize}</Label>
      {window.innerWidth < 360 && <p className="meta">{fr.game.textSizeNarrow}</p>}
      <Segmented
        value={String(size)}
        options={TEXT_SIZES.map((s) => ({ value: String(s), label: `${s} %` }))}
        onChange={(v) => {
          const next = Number(v) as TextSize;
          applyTextSize(next);
          setSize(next);
        }}
      />
    </section>
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
  // The house's line (R4), its portraits in the gallery.
  const [dynasty] = useDynasty();
  const [palmares, setPalmares] = useState<Palmares | null>(null);
  const [terra, setTerra] = useState<{
    rating: number;
    weeks: { week: number; rank: number; of: number; glory: number; rating: number }[];
  } | null>(null);
  const [condotta, setCondotta] = useState<{ best: number; grade: string } | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [typed, setTyped] = useState("");
  const [resetting, setResetting] = useState(false);
  const [busyReset, setBusyReset] = useState(false);
  // The profile reads first; each line opens its view (refonte UX, lot 7).
  const [section, setSection] = useState<"home" | "heritage" | "guild" | "record" | "settings">(
    "home",
  );
  const [rows, setRows] = useState<RankingRow[]>([]);
  useEffect(() => {
    gameApi
      .ranking()
      .then((r) => setRows(r.rows))
      .catch(() => setRows([]));
  }, []);
  const where = palaceGap(rows);
  useEffect(() => {
    gameApi
      .profile()
      .then((r) => {
        setProfile(r.profile);
        setPalmares(r.palmares);
        setTerra(r.terra ?? null);
        setCondotta(r.condotta ?? null);
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
      {section === "home" ? (
        <>
          <header className="flex items-center gap-5 pr-12">
            <div className="relative">
              {/* Lagune: the crest in the ring of the title's progress. */}
              <span className="relative flex h-[8.5rem] w-[8.5rem] items-center justify-center">
                <svg
                  viewBox="-70 -70 140 140"
                  className="absolute inset-0 -rotate-90"
                  aria-hidden="true"
                >
                  <circle r="62" fill="none" stroke="rgb(var(--night-4))" strokeWidth="6" />
                  <circle
                    r="62"
                    fill="none"
                    stroke="rgb(var(--gold))"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${(389.6 * Math.max(0.02, profile?.title.progress ?? 0)).toFixed(1)} 389.6`}
                  />
                </svg>
                <span className="rounded-full bg-night-3 p-2.5">
                  <Crest crest={crest} size={84} />
                </span>
              </span>
              {profile && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-night-4 px-3 py-1 font-display text-xs font-extrabold text-gold-soft ring-1 ring-inset ring-gold/50">
                  {profile.title.current.name}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="break-words font-display text-2xl font-extrabold leading-tight [font-stretch:105%]">
                {props.account.pseudo}
              </h1>
              <p className="mt-1 text-sm text-cream-dim">
                {[
                  dynasty?.current
                    ? fr.game.profile.generation(
                        dynasty.current.given,
                        Math.max(1, dynasty.generations.length),
                      )
                    : props.names.region(props.view.player.region),
                  props.lustre ? fr.game.profile.league(leagueOf(props.lustre.tier)) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <button
                type="button"
                className="label inline-flex min-h-11 items-center rounded-full px-3.5 text-info ring-1 ring-inset ring-line transition active:scale-95 mt-2"
                onClick={() => setEditing(true)}
              >
                ✎ {fr.game.editCrest}
              </button>
              {props.account.pseudoDefault && <RenameOnce props={props} />}
            </div>
          </header>

          {/* Where the house stands against the forty palaces (refonte UX, lot 7). */}
          {where && (
            <button
              type="button"
              onClick={() => props.setSheet("canal")}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl bg-night-3 px-4 text-left text-sm ring-1 ring-inset ring-edge"
            >
              <span>
                {where.inside
                  ? fr.game.profile.palace(where.rank)
                  : fr.game.profile.toPalaces(where.rank, whole(where.gap))}
              </span>
              <span aria-hidden="true">›</span>
            </button>
          )}
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
                      props.level.xp.toLocaleString(locale),
                      props.level.to.toLocaleString(locale),
                    )}
                  />
                </div>
              </>
            )}
          </Panel>

          {/* Four figures (maquette `Profil`): worth, Influence, prestige, the duel's league. */}
          <div className="grid grid-cols-2 gap-2">
            {[
              [fr.game.netWorth, d(worth.total)],
              [fr.game.profile.influence, props.influence ?? "—"],
              [fr.game.profile.prestige, palmares?.renown.current.name ?? "—"],
              [
                fr.game.profile.duel,
                props.lustre ? `${leagueOf(props.lustre.tier)} · ${props.lustre.value}` : "—",
              ],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-night-3 px-3 py-2.5">
                <p className="text-xs text-cream-dim">{label}</p>
                <p className="font-display text-base font-extrabold">{value}</p>
              </div>
            ))}
          </div>
          {/* Then a line a part of the house, each opening its view (maquette `Profil`). */}
          <nav className="divide-y divide-line/60 rounded-2xl bg-night-3 px-4">
            {(
              [
                ["shares", fr.game.profile.lines.shares],
                ["heritage", fr.game.profile.lines.heritage],
                ["guild", fr.game.profile.lines.guild],
                ["record", fr.game.profile.lines.record],
                ["help", fr.game.help],
                ["settings", fr.game.profile.lines.settings],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                data-profile={key}
                onClick={() => {
                  if (key === "shares") props.setSheet("shares");
                  else if (key === "help") props.openHelp();
                  else setSection(key);
                }}
                className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm font-semibold"
              >
                {label}
                <span className="text-cream-dim" aria-hidden="true">
                  ›
                </span>
              </button>
            ))}
          </nav>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setSection("home")}
            className="label -ml-1 flex h-11 items-center gap-1 text-gold"
          >
            ‹ {fr.game.profile.back}
          </button>
          {section === "heritage" && (
            <Gallery
              view={dynasty}
              house={props.account.pseudo ?? ""}
              crest={props.account.crest ?? defaultCrest(props.account.id)}
            />
          )}
          {section === "guild" && <CompanyPanel props={props} />}
          {section === "record" && (
            <>
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
                      <div key={String(label)} className="rounded-2xl bg-night-3 p-3">
                        <Big className="text-2xl text-cream">{value}</Big>
                        <p className="mt-1 text-xs leading-tight text-cream-dim">{label}</p>
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
                          <p className="font-sans text-xs text-muted">
                            {b.value}/{b.goal}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {terra && (
                <section className="space-y-2">
                  <h2 className="font-display text-2xl font-extrabold">
                    {fr.game.terraRecord.title}
                  </h2>
                  <p className="text-sm">{fr.game.terraRecord.rating(terra.rating)}</p>
                  {condotta && (
                    <p className="text-sm text-gold">
                      ⚑ {fr.game.condotta.record(condotta.grade, condotta.best)}
                    </p>
                  )}
                  {terra.weeks.length === 0 ? (
                    <p className="meta">{fr.game.terraRecord.none}</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-cream-dim">
                      {terra.weeks.map((w) => (
                        <li key={w.week}>
                          {fr.game.terraRecord.week(w.week + 1, w.rank, w.of, w.glory, w.rating)}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}

              {palmares && (
                <section className="space-y-3">
                  <h2 className="font-display text-2xl font-extrabold">{fr.game.palmares.title}</h2>
                  <PalmaresView data={palmares} />
                </section>
              )}

              <div className="mt-4 space-y-6">
                {props.level && (
                  <p className="text-sm text-cream-dim">{fr.game.merchantLevel.help}</p>
                )}
                <HouseSummary {...props} />
                {profile && (
                  <section className="space-y-4">
                    <h3 className="font-display text-lg font-extrabold">{fr.game.profileTitle}</h3>
                    <Ribbon
                      value={profile.title.progress}
                      label={
                        profile.title.next
                          ? `${d(profile.turnover).replace(" d", "")} / ${profile.title.next.from.toLocaleString(locale)} d`
                          : fr.game.maxTitle
                      }
                    />
                    {profile.title.next && (
                      <p className="meta">{fr.game.nextTitle(profile.title.next.name)}</p>
                    )}
                    <Titles profile={profile} />
                  </section>
                )}
              </div>
            </>
          )}
          {section === "settings" && (
            <>
              <div className="mt-6 space-y-8">
                <PalettePicker
                  pass={props.view.pass.active && props.view.pass.perks.cosmetics}
                  offered={props.view.pass.enabled && props.view.pass.perks.cosmetics}
                />

                <LanguageSetting />
                <TextSizeSetting />
                <SoundSetting />
                <HapticsSetting />

                <PushSettings />

                <section className="space-y-3">
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
                    className="label flex min-h-12 w-full items-center justify-center text-cream-dim"
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
                      className="flex min-h-12 items-center justify-center cut bg-night-4 px-3 py-2 text-center font-display text-xs font-extrabold uppercase tracking-wide text-cream ring-1 ring-inset ring-line hover:ring-cream-dim/40"
                    >
                      {fr.game.data.export}
                    </a>
                    <a
                      href="/api/game/ledger.csv"
                      download
                      className="flex min-h-12 items-center justify-center cut bg-night-4 px-3 py-2 text-center font-display text-xs font-extrabold uppercase tracking-wide text-cream ring-1 ring-inset ring-line hover:ring-cream-dim/40"
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
                  <Slab
                    tone="vermilion"
                    size="sm"
                    className="w-full"
                    onClick={() => setResetting(true)}
                  >
                    {fr.game.reset.title}
                  </Slab>
                </section>
              </div>
              <PassPanel props={props} extra={props.passInfo} />
            </>
          )}
        </>
      )}

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
            disabled={typed.trim().toUpperCase() !== fr.misc.deleteWord}
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

/** The name proposed at the door, changed once and for free (E3-5 of the experts). */
function RenameOnce({ props }: { props: GameProps }) {
  const t = fr.game.rename;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(props.account.pseudo ?? "");
  const [error, setError] = useState<string | null>(null);
  if (!open)
    return (
      <button
        type="button"
        className="mt-1 block min-h-11 text-sm text-info"
        onClick={() => setOpen(true)}
      >
        {t.open}
      </button>
    );
  return (
    <form
      className="mt-2 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        if (!/^[\p{L}\p{N}_-]{3,20}$/u.test(name)) return setError(fr.pseudoInvalid);
        try {
          props.onAccount(await api.setPseudo(name));
        } catch (err) {
          const known = err instanceof ApiError ? fr.errors[err.code] : undefined;
          setError(known ?? fr.errors.unknown ?? null);
        }
      }}
    >
      <input
        aria-label={fr.pseudoLabel}
        value={name}
        maxLength={20}
        onChange={(e) => setName(e.target.value.replace(/\s/g, "_"))}
        className="w-full rounded-lg bg-night-2 px-3 py-2 text-base ring-1 ring-inset ring-line"
      />
      {error && <p className="text-sm text-vermilion">{error}</p>}
      <Slab size="sm" type="submit" className="w-full">
        {t.save}
      </Slab>
    </form>
  );
}
