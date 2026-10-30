import { GoodsMark } from "../art/goods.js";
import { d, hourOf, minutesLabel } from "../game/format.js";
import { fr } from "../i18n.js";
import { Label, Sheet, Slab } from "../ui.js";
import { Choice, regionName } from "./World.js";
import { affordable, buildingName, opensAt, shownAt } from "./logic.js";
import type {
  EmpireAction,
  EmpirePayload,
  EmpireStaffMember,
  EmpireWorkshop,
  KnowledgeNode,
} from "./types.js";

type Act = (a: EmpireAction) => Promise<void>;
const t = fr.empire.identity;
const goodName = (p: EmpirePayload, code: string) =>
  fr.themeNames.resource[code] ?? p.goods[code] ?? code;

/** An effect's bps as a share for the eye (a display, never an amount). */
const share = (bps: number) => (bps / 100).toLocaleString("fr-FR");

/** What a set of effects gives, in words. */
export function effectsText(effects: Record<string, number>): string {
  return Object.entries(effects)
    .map(([k, v]) => (t.effects[k] ?? k).replace("{%}", `${share(v)} %`).replace("{p}", share(v)))
    .join(", ");
}

/** A good with its quality: « Drap fin ». */
export function qualityName(p: EmpirePayload, code: string): string {
  const [good = "", quality] = code.split(":");
  return quality ? `${goodName(p, good)} ${t.qualities[quality] ?? quality}` : goodName(p, good);
}

const memberName = (m: EmpireStaffMember) =>
  m.family ?? t.memberLine(t.roles[m.role] ?? m.role, t.rarities[m.rarity] ?? m.rarity, m.level);

/** A workshop's identity: its module places, its neighbourhood, its master, its place on the ring. */
export function WorkshopIdentity({
  p,
  ws,
  busy,
  act,
}: {
  p: EmpirePayload;
  ws: EmpireWorkshop;
  busy: boolean;
  act: Act;
}) {
  const view = p.view;
  if (!view) return null;
  const places = view.workshopPlaces[ws.id];
  const researched = view.research.modules.filter((m) => m.kind === "workshop" && m.level > 0);
  const master = view.identity.staff.members.find(
    (m) => m.role === "master" && m.placedAt === ws.id,
  );
  const ring = view.house.workshops.filter(
    (w) => (w.region ?? "veneto") === (ws.region ?? "veneto"),
  );
  const i = ring.findIndex((w) => w.id === ws.id);
  const prev = ring[i - 1];
  const next = ring[i + 1];
  return (
    <div className="mt-3 space-y-2">
      {places && places.slots > 0 && researched.length > 0 && (
        <div>
          <p className="text-xs text-cream-dim">{t.modules}</p>
          <div className="mt-1 grid gap-2 sm:grid-cols-2">
            {Array.from({ length: places.slots }, (_, slot) => (
              <Choice
                // biome-ignore lint/suspicious/noArrayIndexKey: a place is its index
                key={slot}
                label={t.slot(slot + 1)}
                value={ws.fitted?.[slot] ?? ""}
                onChange={(module) =>
                  module && void act({ type: "empireFit", workshopId: ws.id, slot, module })
                }
                options={[
                  ["", t.emptySlot],
                  ...researched.map((m): [string, string] => [
                    m.code,
                    fr.empire.moduleNames[m.code]?.[0] ?? m.code,
                  ]),
                ]}
              />
            ))}
          </div>
        </div>
      )}
      {places && places.neighbourBps > 0 && (
        <p className="text-xs text-gold">{t.neighbours(places.neighbourBps / 100)}</p>
      )}
      {master && <p className="text-xs text-cream-dim">{t.master(memberName(master))}</p>}
      {ring.length > 1 && (
        <div className="flex gap-2">
          {prev && (
            <Slab
              size="sm"
              tone="ghost"
              busy={busy}
              onClick={() => void act({ type: "empireSwap", a: ws.id, b: prev.id })}
            >
              {t.moveLeft}
            </Slab>
          )}
          {next && (
            <Slab
              size="sm"
              tone="ghost"
              busy={busy}
              onClick={() => void act({ type: "empireSwap", a: ws.id, b: next.id })}
            >
              {t.moveRight}
            </Slab>
          )}
        </div>
      )}
    </div>
  );
}

/** The Arte: chosen at the Casa 7, a minor one at the 13. */
export function ArteSection({ p, busy, act }: { p: EmpirePayload; busy: boolean; act: Act }) {
  const view = p.view;
  if (!view) return null;
  const a = view.identity.arte;
  const casa = view.house.casa;
  if (!shownAt(casa, a.fromCasa)) return null;
  return (
    <section className="mt-5">
      <Label>{t.arte}</Label>
      {casa < a.fromCasa ? (
        <p className="mt-1 text-sm text-cream-dim">{t.arteClosed(a.fromCasa)}</p>
      ) : (
        <>
          <ul className="mt-2 space-y-2">
            {a.options.map((o) => {
              const chain = o.buildings.map((b) => buildingName(p, b)).join(", ");
              const mine = o.code === a.current;
              const minor = o.code === a.minor;
              return (
                <li
                  key={o.code}
                  data-arte={o.code}
                  className="flex flex-wrap items-center gap-2 border-b border-line/60 pb-2 text-sm"
                >
                  <span className="flex-1 text-cream">
                    {t.arteNames[o.code] ?? o.code}
                    {(mine || minor) && (
                      <span className="text-gold"> · {mine ? t.arte : t.arteMinor}</span>
                    )}
                    <span className="block text-xs text-cream-dim">
                      {[chain && t.chainOf(chain), effectsText(o.effects)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {!mine && (
                    <Slab
                      size="sm"
                      tone="ghost"
                      busy={busy}
                      onClick={() => void act({ type: "empireChooseArte", arte: o.code })}
                    >
                      {t.arteChoose}
                    </Slab>
                  )}
                  {!mine && !minor && a.current && casa >= a.minorFromCasa && (
                    <Slab
                      size="sm"
                      tone="ghost"
                      busy={busy}
                      onClick={() =>
                        void act({ type: "empireChooseArte", arte: o.code, minor: true })
                      }
                    >
                      {t.arteMinor}
                    </Slab>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-xs text-cream-dim">
            {a.current ? t.arteRenounce : ""}
            {casa < a.minorFromCasa ? ` ${t.arteMinorClosed(a.minorFromCasa)}` : ""}
          </p>
        </>
      )}
    </section>
  );
}

/** The knowledge's tree in the Scuola: four branches learnt in order, a capstone at the end. */
export function Knowledge({ p, busy, act }: { p: EmpirePayload; busy: boolean; act: Act }) {
  const view = p.view;
  if (!view) return null;
  const k = view.identity.knowledge;
  if (k.slots === 0 && !shownAt(view.house.casa, opensAt(p, "scuola"))) return null;
  const full = k.learning.length >= k.slots;
  const row = (n: KnowledgeNode) => {
    const at = k.learning.find((l) => l.code === n.code);
    return (
      <li
        key={n.code}
        data-knowledge={n.code}
        className={`flex items-center gap-2 border-b border-line/60 pb-2 text-sm ${n.state === "locked" ? "opacity-50" : ""}`}
      >
        <span className="flex-1 text-cream">
          {t.nodeNames[n.code] ?? n.code}
          <span className="block text-xs text-cream-dim">{effectsText(n.effects)}</span>
        </span>
        {n.state === "learnt" ? (
          <span className="text-xs text-gold">{t.learnt}</span>
        ) : at ? (
          <span className="text-xs text-cream-dim">{t.learning(hourOf(at.endsAt))}</span>
        ) : n.state === "open" ? (
          <Slab
            size="sm"
            tone="ghost"
            busy={busy}
            disabled={full || !affordable(p.cash, n.cost)}
            onClick={() => void act({ type: "empireLearn", code: n.code })}
          >
            {t.learn(d(n.cost), minutesLabel(n.minutes))}
          </Slab>
        ) : null}
      </li>
    );
  };
  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between">
        <Label>{t.knowledge}</Label>
        {k.slots > 0 && (
          <span className="text-xs text-cream-dim">
            {t.knowledgePlaces(k.learning.length, k.slots)}
          </span>
        )}
      </div>
      {k.slots === 0 ? (
        <p className="mt-1 text-sm text-cream-dim">{t.knowledgeClosed}</p>
      ) : (
        k.branches.map((b) => (
          <div key={b.code} className="mt-3">
            <p className="font-display text-sm font-bold text-cream">
              {t.branchNames[b.code] ?? b.code}
            </p>
            <ul className="mt-1 space-y-2">{b.nodes.map(row)}</ul>
            <p className="mt-2 text-xs text-cream-dim">{t.capstoneChoice}</p>
            <ul className="mt-1 space-y-2">{b.capstones.map(row)}</ul>
          </div>
        ))
      )}
    </section>
  );
}

/** Where a member of the staff may work, by its role. */
function placesFor(p: EmpirePayload, place: string): [string, string][] {
  const view = p.view;
  if (!view) return [];
  if (place === "workshop")
    return view.house.workshops.map((w) => [
      w.id,
      `${buildingName(p, w.type)} ${w.level} · ${regionName(w.region ?? "veneto")}`,
    ]);
  if (place === "vehicle")
    return view.vehicles.mine.map((v) => [v.id, fr.empire.vehicleNames[v.type] ?? v.type]);
  return view.regions
    .filter((r) => r.code === "veneto" || r.counter > 0)
    .map((r) => [r.code, regionName(r.code)]);
}

/** The family's tab: its generation and Heritage, its traits, and the staff it composes. */
export function FamilySheet({
  p,
  open,
  busy,
  onClose,
  act,
}: {
  p: EmpirePayload;
  open: boolean;
  busy: boolean;
  onClose: () => void;
  act: Act;
}) {
  const view = p.view;
  if (!view) return null;
  const f = view.identity.family;
  const st = view.identity.staff;
  const traitsLeft = f.heritage - f.lineage.length;
  const roomy = st.members.length < st.slots;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      docked
      kicker={t.tab}
      title={t.family}
      summary={`${t.generation(f.generation)} · ${t.heritage(f.heritage)}`}
    >
      <section>
        <Label>{t.traits}</Label>
        <ul className="mt-2 space-y-2">
          {f.traits.map((tr) => {
            const mine = f.lineage.includes(tr.code);
            return (
              <li
                key={tr.code}
                className="flex items-center gap-2 border-b border-line/60 pb-2 text-sm"
              >
                <span className="flex-1 text-cream">
                  {t.traitNames[tr.code] ?? tr.code}
                  <span className="block text-xs text-cream-dim">{effectsText(tr.effects)}</span>
                </span>
                {mine ? (
                  <span className="text-xs text-gold">{t.learnt}</span>
                ) : traitsLeft > 0 ? (
                  <Slab
                    size="sm"
                    tone="ghost"
                    busy={busy}
                    onClick={() => void act({ type: "empireLineage", trait: tr.code })}
                  >
                    {t.takeTrait}
                  </Slab>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-5">
        <div className="flex items-baseline justify-between">
          <Label>{t.staff}</Label>
          <span className="text-xs text-cream-dim">
            {t.staffPlaces(st.members.length, st.slots)}
          </span>
        </div>
        <ul className="mt-2 space-y-3">
          {st.members.map((m) => {
            const role = st.roles.find((r) => r.role === m.role);
            const options = placesFor(p, role?.place ?? "");
            return (
              <li
                key={m.id}
                data-staff={m.id}
                className="cut bg-night-2 p-3 ring-1 ring-inset ring-line/70"
              >
                <p className="font-display font-bold text-cream">{memberName(m)}</p>
                <p className="text-xs text-cream-dim">
                  {m.family
                    ? `${t.memberLine(t.roles[m.role] ?? m.role, t.rarities[m.rarity] ?? m.rarity, m.level)} · `
                    : ""}
                  {m.placedAt
                    ? t.placedAt(options.find(([v]) => v === m.placedAt)?.[1] ?? m.placedAt)
                    : t.unplaced}
                </p>
                <div className="mt-2">
                  <Choice
                    label={t.placeOn}
                    value={m.placedAt ?? ""}
                    onChange={(at) => at && void act({ type: "empirePlace", staffId: m.id, at })}
                    options={[["", t.unplaced], ...options]}
                  />
                </div>
                {m.tiersOpen > 0 && role && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {role.paths.map((path, i) => (
                      <Slab
                        // biome-ignore lint/suspicious/noArrayIndexKey: a path is its index
                        key={i}
                        size="sm"
                        tone="ghost"
                        busy={busy}
                        onClick={() => void act({ type: "empireSkill", staffId: m.id, path: i })}
                      >
                        {t.path(i)} · {effectsText(path)}
                      </Slab>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          {st.roles.map((r) => (
            <Slab
              key={r.role}
              size="sm"
              tone="ghost"
              busy={busy}
              disabled={!roomy || !affordable(p.cash, st.hireCost)}
              onClick={() => void act({ type: "empireHire", role: r.role })}
            >
              {t.hire(t.roles[r.role] ?? r.role, d(st.hireCost))}
            </Slab>
          ))}
        </div>
      </section>
    </Sheet>
  );
}

/** The court of Venice: the only buyer of the fine and exquisite goods, a daily book. */
export function Court({ p, busy, act }: { p: EmpirePayload; busy: boolean; act: Act }) {
  const view = p.view;
  const goods = Object.entries(p.stock).filter(([g, n]) => n > 0 && g.includes(":"));
  if (!view || goods.length === 0) return null;
  return (
    <section className="mt-5">
      <div className="flex items-baseline justify-between">
        <Label>{t.court}</Label>
        <span className="text-xs text-cream-dim">{t.courtLeft(view.courtLeft)}</span>
      </div>
      <ul className="mt-2 space-y-2">
        {goods.map(([code, qty]) => (
          <li
            key={code}
            className="flex items-center gap-2 border-b border-line/60 pb-2 text-sm text-cream"
          >
            <GoodsMark code={code.split(":")[0] ?? ""} size={24} />
            <span className="flex-1">
              {qty} {qualityName(p, code)}
            </span>
            <Slab
              size="sm"
              tone="ghost"
              busy={busy}
              disabled={view.courtLeft <= 0}
              onClick={() => void act({ type: "empireCourt", good: code, qty })}
            >
              {t.courtSell}
            </Slab>
          </li>
        ))}
      </ul>
    </section>
  );
}
