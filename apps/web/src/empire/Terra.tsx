import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api.js";
import { gameApi } from "../game/api.js";
import { hourOf } from "../game/format.js";
import {
  TerraFronts,
  TerraOverlay,
  placementOpen,
  terraTap,
  useCondotta,
  useTerraShapes,
} from "../game/map/TerraLayer.js";
import { cellAt } from "../game/terraShapes.js";
import type { CompanyView, TerraAction, TerraView } from "../game/types.js";
import { fr } from "../i18n.js";
import { Label, Slab } from "../ui.js";
import { empireApi } from "./api.js";
import type { EmpireAction, EmpirePayload } from "./types.js";

type Act = (a: EmpireAction) => Promise<void>;
const t = fr.empire.terra;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/**
 * A map of the Terraferma on its own (Lagune): the land and its holders, the fronts marching; a
 * touch picks a cell. The theatre's and the Condotta's both.
 */
function Board({
  v,
  cell,
  onCell,
}: {
  v: TerraView;
  cell: number | null;
  onCell: (cell: number | null) => void;
}) {
  const s = useTerraShapes(v);
  const svg = useRef<SVGSVGElement>(null);
  if (!s) return null;
  const xs = s.edges.map((e) => e.x);
  const ys = s.edges.map((e) => e.y);
  const pad = s.map.size;
  const box = [
    Math.min(...xs) - pad,
    Math.min(...ys) - pad,
    Math.max(...xs) - Math.min(...xs) + 2 * pad,
    Math.max(...ys) - Math.min(...ys) + 2 * pad,
  ];
  return (
    <svg
      ref={svg}
      viewBox={box.join(" ")}
      data-terra-board
      className="mt-2 w-full touch-manipulation bg-night-2 ring-1 ring-inset ring-line"
      role="img"
      aria-label={t.board}
      // The keyboard lets go of the cell picked; the cells themselves are picked by touch.
      onKeyDown={(e) => {
        if (e.key === "Escape") onCell(null);
      }}
      onClick={(e) => {
        const el = svg.current;
        const m = el?.getScreenCTM();
        if (!el || !m) return;
        const pt = el.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const at = pt.matrixTransform(m.inverse());
        // Before its camp, any land; after, its border and its own land.
        const picked = v.me ? terraTap(v, s, at.x, at.y) : cellAt(s.map, s.land, at.x, at.y);
        onCell(picked === cell ? null : picked);
      }}
    >
      <TerraOverlay v={v} s={s} cell={cell} />
      <TerraFronts v={v} s={s} />
    </svg>
  );
}

/** What a touched cell offers: the camp before the week's placement ends, a front after. */
function CellActions({
  v,
  cell,
  now,
  busy,
  send,
}: {
  v: TerraView;
  cell: number | null;
  now: number;
  busy: boolean;
  send: (a: TerraAction) => void;
}) {
  const mine = v.fronts.filter((f) => f.mine);
  return (
    <div className="mt-2 space-y-2">
      {cell !== null && !v.me && placementOpen(v, now) && (
        <Slab
          size="sm"
          className="w-full"
          busy={busy}
          onClick={() => send({ type: "terraPlace", cell })}
        >
          {t.place}
        </Slab>
      )}
      {cell !== null && v.me && cell in v.costs && (
        <Slab
          size="sm"
          className="w-full"
          busy={busy}
          onClick={() => send({ type: "terraFront", aim: cell, shareBps: 5_000 })}
        >
          {t.front(v.costs[cell] ?? 0)}
        </Slab>
      )}
      {cell === null && <p className="text-xs text-cream-dim">{v.me ? t.pickFront : t.pickCamp}</p>}
      {mine.length > 0 && (
        <ul className="space-y-1">
          {mine.map((f) => (
            <li key={f.id} className="flex items-center gap-2 text-sm text-cream">
              <span className="flex-1">{t.frontLine(f.troops)}</span>
              <Slab
                size="sm"
                tone="ghost"
                busy={busy}
                onClick={() => send({ type: "terraRecall", frontId: f.id })}
              >
                {t.recall}
              </Slab>
            </li>
          ))}
        </ul>
      )}
      {v.me && (
        <p className="text-xs text-cream-dim">
          {t.me(v.me.troops, v.me.cells, v.me.glory, v.me.rank)}
        </p>
      )}
    </div>
  );
}

/**
 * The Terraferma's tab of the empire (CADRAGE-v3 § 8): the week (open or Contesa), the house's
 * theatre and its map, the entry, the Contesa's roster for the Capo and the Consiglieri, the
 * honours; and the Condotta, played on its own map.
 */
/** The Terraferma pane of the Compagnie tab: its theatre, the Contesa's roster, the Condotta. */
export function TerraBody({
  p,
  now,
  open,
  busy,
  act,
}: {
  p: EmpirePayload;
  now: number;
  /** The pane is shown: the board is fetched while it is. */
  open: boolean;
  busy: boolean;
  act: Act;
}) {
  const view = p.view;
  const [board, setBoard] = useState<TerraView | null>(null);
  const [cell, setCell] = useState<number | null>(null);
  const [condottaOn, setCondottaOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const condotta = useCondotta(open && condottaOn);
  const theatre = view?.terra.theatre ?? null;
  useEffect(() => {
    if (!open || !theatre) return;
    const load = () =>
      empireApi
        .terra()
        .then((r) => setBoard(r.terra?.view ?? null))
        .catch(() => undefined);
    load();
    const id = setInterval(load, 5_000);
    return () => clearInterval(id);
  }, [open, theatre]);
  if (!view) return null;
  const tv = view.terra;
  const send = (a: TerraAction) =>
    void act({ type: "empireTerra", action: a }).then(() =>
      empireApi
        .terra()
        .then((r) => setBoard(r.terra?.view ?? null))
        .catch(() => undefined),
    );
  const entry = Object.entries(tv.entry)
    .map(([g, n]) => `${n} ${goodName(p, g)}`)
    .join(", ");
  const st = condotta.status;
  const match = st && "view" in st ? st.view : null;
  const condottaError = (e: unknown) =>
    setError(fr.empire.errors[e instanceof ApiError ? e.code : ""] ?? fr.errors.unknown ?? "");
  return (
    <>
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-cream-dim">
        {tv.contesa ? t.contesaWeek : t.openWeek}
      </p>
      <p className="mt-1 text-sm text-cream-dim">{t.summary}</p>
      <section className="mt-3" data-terra>
        {theatre ? (
          <>
            <p className="text-sm text-cream">
              {theatre.kind === "contesa"
                ? t.contesaTheatre(theatre.companies.length)
                : t.theatre(theatre.band + 1, theatre.members)}
            </p>
            {board ? (
              <>
                <Board v={board} cell={cell} onCell={setCell} />
                <CellActions v={board} cell={cell} now={now} busy={busy} send={send} />
              </>
            ) : (
              <p className="mt-2 text-sm text-cream-dim">{t.loading}</p>
            )}
          </>
        ) : tv.contesa ? (
          <p className="text-sm text-cream-dim">{t.contesaOnly}</p>
        ) : tv.placementUntil !== null && now < tv.placementUntil ? (
          <div className="space-y-2">
            <p className="text-sm text-cream-dim">{t.joinText(entry, hourOf(tv.placementUntil))}</p>
            <Slab
              className="w-full"
              busy={busy}
              onClick={() => void act({ type: "empireTerraJoin" })}
            >
              {t.join}
            </Slab>
          </div>
        ) : (
          <p className="text-sm text-cream-dim">{t.closedWeek}</p>
        )}
        <p className="mt-3 text-xs text-cream-dim">
          {t.rewards(tv.seals)}
          {tv.best ? ` · ${t.grade(t.tiers[tv.best] ?? tv.best)}` : ""}
        </p>
      </section>

      {tv.nextContesa && <Roster p={p} now={now} busy={busy} />}
      {tv.honours && (
        <p className="mt-3 text-xs text-gold">
          {t.honours(tv.honours.trophies, tv.honours.lustre, tv.honours.blazon.length)}
        </p>
      )}

      <section className="mt-5" data-condotta-play>
        <Label>{fr.empire.company.condotta.title}</Label>
        {!condottaOn ? (
          <Slab size="sm" tone="ghost" className="mt-2" onClick={() => setCondottaOn(true)}>
            {t.condotta.show}
          </Slab>
        ) : !st || st.phase === "off" ? (
          <p className="mt-1 text-sm text-cream-dim">{t.condotta.off}</p>
        ) : st.phase === "none" ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <p className="w-full text-xs text-cream-dim">
              {t.condotta.tier(st.level, st.tierCap ?? st.levels)}
            </p>
            <Slab
              size="sm"
              onClick={() =>
                void gameApi.condottaOpen(false).then(condotta.refresh).catch(condottaError)
              }
            >
              {t.condotta.alone}
            </Slab>
            {st.company && (
              <Slab
                size="sm"
                tone="ghost"
                onClick={() =>
                  void gameApi.condottaOpen(true).then(condotta.refresh).catch(condottaError)
                }
              >
                {t.condotta.withCompany}
              </Slab>
            )}
          </div>
        ) : st.phase === "lobby" ? (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-cream-dim">{t.condotta.lobby(st.players.length)}</p>
            {!st.joined && (
              <Slab
                size="sm"
                onClick={() =>
                  void gameApi.condottaJoin(st.lobby).then(condotta.refresh).catch(condottaError)
                }
              >
                {t.condotta.join}
              </Slab>
            )}
          </div>
        ) : match ? (
          <>
            <p className="mt-1 text-sm text-cream">
              {st.phase === "done"
                ? st.result?.won
                  ? t.condotta.won
                  : t.condotta.lost
                : t.condotta.playing(st.playedLevel)}
            </p>
            <Board v={match} cell={cell} onCell={setCell} />
            <CellActions
              v={match}
              cell={cell}
              now={now}
              busy={busy}
              send={(a) => void gameApi.condottaAct(a).then(condotta.refresh).catch(condottaError)}
            />
          </>
        ) : null}
        {error && <p className="mt-2 text-sm text-vermilion">{error}</p>}
      </section>
    </>
  );
}

/** The next Contesa's roster: the Capo or a Consigliere picks 5, 10 or 15 partners. */
function Roster({ p, now, busy }: { p: EmpirePayload; now: number; busy: boolean }) {
  const tv = p.view?.terra;
  const [c, setC] = useState<CompanyView["company"]>(null);
  const [picked, setPicked] = useState<string[]>(tv?.roster?.members ?? []);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    gameApi
      .company()
      .then((v) => setC(v.company))
      .catch(() => setC(null));
  }, []);
  if (!tv || !c) return null;
  const may = c.myRole === "capo" || c.myRole === "consigliere";
  const until = tv.rosterUntil;
  return (
    <section className="mt-5" data-roster>
      <Label>{t.roster.title}</Label>
      <p className="mt-1 text-xs text-cream-dim">
        {tv.roster ? t.roster.set(tv.roster.members.length) : t.roster.none}
        {until ? ` · ${t.roster.until(hourOf(until))}` : ""}
      </p>
      {may && until !== null && now < until && (
        <>
          <ul className="mt-2 space-y-1">
            {c.members.map((m) =>
              m.id ? (
                <li key={m.id}>
                  <label className="flex items-center gap-2 text-sm text-cream">
                    <input
                      type="checkbox"
                      checked={picked.includes(m.id)}
                      onChange={(e) => {
                        const id = m.id ?? "";
                        setPicked(
                          e.target.checked ? [...picked, id] : picked.filter((x) => x !== id),
                        );
                      }}
                    />
                    {m.pseudo ?? "—"}
                  </label>
                </li>
              ) : null,
            )}
          </ul>
          <Slab
            size="sm"
            className="mt-2"
            busy={busy}
            onClick={() =>
              void empireApi
                .roster(picked)
                .then((r) =>
                  setNote(r.error ? (fr.empire.errors[r.error] ?? r.error) : t.roster.saved),
                )
                .catch((e) =>
                  setNote(
                    fr.empire.errors[e instanceof ApiError ? e.code : ""] ??
                      fr.errors.unknown ??
                      "",
                  ),
                )
            }
          >
            {t.roster.save(picked.length)}
          </Slab>
          {note && <p className="mt-1 text-xs text-cream-dim">{note}</p>}
        </>
      )}
    </section>
  );
}
