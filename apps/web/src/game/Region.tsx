import { useEffect, useState } from "react";
import { BuildingArt } from "../art/buildings.js";
import { GoodsMark, goodsColour } from "../art/goods.js";
import { fr } from "../i18n.js";
import { pendingInvite } from "../origin.js";
import { Slab } from "../ui.js";
import type { Names } from "./Game.js";
import { gameApi } from "./api.js";
import type { Catalog, CompanyInvitation } from "./types.js";

const SELLS: Record<string, string> = {
  terraferma: "bread",
  lagoon: "bricks",
  dolomites: "planks",
};
/** What each trade must buy: fuel for the ovens, bread for the workers, the other material. */
const NEEDS: Record<string, string[]> = {
  terraferma: ["wood", "bricks", "planks"],
  lagoon: ["wood", "bread", "planks"],
  dolomites: ["bread", "bricks"],
};

export function Region(props: {
  catalog: Catalog;
  names: Names;
  onJoin: (region: string) => Promise<void>;
  toast: string | null;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  // Who comes by a company's link sees the trade the company lacks (E2-8 of the experts).
  const [invitation, setInvitation] = useState<CompanyInvitation | null>(null);
  useEffect(() => {
    let code: string | null = null;
    try {
      code = pendingInvite(localStorage);
    } catch {
      code = null;
    }
    if (code)
      gameApi
        .invitation(code)
        .then(setInvitation)
        .catch(() => undefined);
  }, []);
  const lacks = invitation && !invitation.full ? invitation.missingRegion : null;
  const has = invitation?.regions.map((r) => fr.region.jobs[r]?.name ?? r) ?? [];
  const bonus = props.catalog.rules.regionBonusBps / 100;
  const regions = props.catalog.regions;
  // The company's missing trade first, else the first: the one to read before choosing.
  const [chosen, setChosen] = useState<string | null>(null);
  const r = regions.find((x) => x.code === (chosen ?? lacks)) ?? regions[0];
  if (!r) return null;
  const sells = SELLS[r.code] ?? "bread";
  const needs = NEEDS[r.code] ?? [];
  const chip =
    "inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-semibold";
  return (
    <main
      className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]"
      style={{
        backgroundImage:
          "radial-gradient(ellipse at 50% 22%, rgb(var(--info) / 0.1), transparent 60%)",
      }}
    >
      <header className="space-y-2 text-center">
        <p className="text-sm text-cream-dim">{props.catalog.world.name}</p>
        <h1 className="font-place text-xl font-bold uppercase tracking-[0.15em] text-gold">
          {fr.region.title}
        </h1>
        <p className="text-sm text-cream-dim">{fr.region.help}</p>
      </header>
      {/* Lagune: the regions as stars, each its raw good at its heart; the chosen one comes forward. */}
      <div className="mt-5 grid grid-cols-3 items-center gap-2">
        {regions.map((x, k) => {
          const on = x.code === r.code;
          const colour = goodsColour(x.bonusResource);
          return (
            <button
              key={x.code}
              type="button"
              aria-pressed={on}
              onClick={() => setChosen(x.code)}
              className="flex animate-rise flex-col items-center gap-2 rounded-3xl py-2 transition active:scale-95"
              style={{ animationDelay: `${k * 80}ms` }}
            >
              <span
                className="relative grid place-items-center rounded-full bg-night-2 transition-all"
                style={{
                  width: on ? 84 : 60,
                  height: on ? 84 : 60,
                  boxShadow: on
                    ? `0 0 0 3px rgb(var(--info)), 0 0 30px ${colour}40`
                    : `0 0 0 2px ${colour}99`,
                }}
              >
                <GoodsMark code={x.bonusResource} size={on ? 42 : 28} />
                {(lacks === x.code || (props.catalog.recommendedRegion === x.code && !lacks)) && (
                  <span
                    className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full bg-gold ring-2 ring-night"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span
                className={`max-w-full font-place text-[0.7rem] font-bold uppercase tracking-[0.04em] min-[380px]:text-xs min-[380px]:tracking-[0.12em] ${on ? "text-cream" : "text-cream-dim"}`}
              >
                {fr.region.jobs[x.code]?.name ?? x.name}
              </span>
            </button>
          );
        })}
      </div>

      <section
        key={r.code}
        className="mt-5 flex animate-rise flex-col rounded-3xl bg-night-3 p-4 ring-1 ring-inset ring-line"
      >
        <h2 className="font-display text-xl font-extrabold leading-tight">
          {fr.region.jobs[r.code]?.name ?? r.name}
          <span className="font-sans text-sm font-normal text-cream-dim">
            {" "}
            · {props.names.region(r.code)}
          </span>
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={`${chip} bg-night-2`}>
            <GoodsMark code={r.bonusResource} size={18} />
            {fr.region.bonus(bonus, props.names.resource(r.bonusResource))}
          </span>
          {lacks === r.code && invitation && (
            <span
              title={fr.game.myCompany.regionHelp(invitation.name, has)}
              className={`${chip} text-gold ring-1 ring-inset ring-gold/60`}
            >
              {fr.game.myCompany.regionBadge}
            </span>
          )}
          {props.catalog.recommendedRegion === r.code && lacks !== r.code && (
            <span
              title={fr.region.recommendedHelp}
              className={`${chip} text-gold ring-1 ring-inset ring-gold/60`}
            >
              {fr.region.recommended}
            </span>
          )}
        </div>
        <p className="mt-3 text-sm text-cream-dim">{fr.region.jobs[r.code]?.text}</p>
        {lacks === r.code && invitation && (
          <p className="mt-1 text-sm text-gold">
            {fr.game.myCompany.regionHelp(invitation.name, has)}
          </p>
        )}
        <div className="mt-4 flex items-end gap-1">
          {r.startingBuildings.map((b) => (
            <div key={b} className="flex-1 text-center">
              <BuildingArt type={b} className="mx-auto h-12 w-16" />
              <p className="text-xs text-cream-dim">{props.names.building(b)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
          {/* Marks above the words: three goods never squeeze their names. */}
          <div className="space-y-1 rounded-2xl bg-night-2 p-3">
            <GoodsMark code={sells} size={26} />
            <p className="text-xs text-cream-dim">{fr.region.sells}</p>
            <p className="text-sm font-semibold">{props.names.resource(sells)}</p>
          </div>
          <div className="min-w-0 space-y-1 rounded-2xl bg-night-2 p-3">
            <div className="flex gap-1">
              {needs.map((n) => (
                <GoodsMark key={n} code={n} size={26} />
              ))}
            </div>
            <p className="text-xs text-cream-dim">{fr.region.needs}</p>
            <p className="text-sm font-semibold">
              {needs.map((n) => props.names.resource(n)).join(", ")}
            </p>
          </div>
        </div>
        <Slab
          size="lg"
          className="mt-5 w-full"
          disabled={busy !== null}
          onClick={async () => {
            setBusy(r.code);
            await props.onJoin(r.code);
            setBusy(null);
          }}
        >
          {busy === r.code ? "…" : fr.region.settle}
        </Slab>
      </section>
      {props.toast && <p className="mt-3 text-sm text-vermilion">{props.toast}</p>}
    </main>
  );
}
