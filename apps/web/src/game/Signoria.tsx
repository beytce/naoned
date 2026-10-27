import { Crest, defaultCrest } from "../art/crest.js";
import { fr } from "../i18n.js";
import { Rules, Sheet } from "../ui.js";
import type { GameProps } from "./Game.js";
import { MerchantName } from "./Name.js";
import { signoriaOf, useSignoria } from "./signoria.js";
import type { SignoriaView, SupplierPerson } from "./types.js";

const t = () => fr.game.signoria;

const crestOf = (p: SupplierPerson) => p.crest ?? defaultCrest(p.id);

/** A share in whole per cent, never a 0 % for some points. */
function pctOf(part: number, total: number): number {
  if (total <= 0 || part <= 0) return 0;
  return Math.max(1, Math.round((part * 100) / total));
}

/** The arcs of a city's gauge: the three first, the rest, each with its colour. */
function arcs(line: SignoriaView["cities"][number]) {
  const total = Math.max(1, line.total);
  const out: { share: number; tone: string }[] = [];
  let shown = 0;
  line.top.forEach((p, i) => {
    shown += p.points;
    // Lapis is "you" (design.md); the others in cream, fading with their rank.
    out.push({
      share: p.points / total,
      tone: p.me ? "rgb(var(--info))" : `rgb(var(--cream) / ${0.75 - i * 0.2})`,
    });
  });
  if (!line.top.some((p) => p.me) && line.mine > 0) {
    shown += line.mine;
    out.push({ share: line.mine / total, tone: "rgb(var(--info))" });
  }
  if (total > shown) out.push({ share: (total - shown) / total, tone: "rgb(var(--cream) / 0.12)" });
  return out;
}

/**
 * A city's gauge, drawn as a ring around its monument (in the orbit's coordinates, 0 to 100):
 * the three first on it, the merchant's own share in lapis, the rest faint. Empty, a dotted ring.
 */
export function SignoriaRing({
  line,
  r,
}: {
  line: SignoriaView["cities"][number] | null;
  r: number;
}) {
  const c = 2 * Math.PI * r;
  if (!line || line.total <= 0)
    return (
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="rgb(var(--cream) / 0.18)"
        strokeWidth="1.2"
        strokeDasharray="0.6 1.4"
      />
    );
  let at = 0;
  return (
    <g transform="rotate(-90 50 50)">
      {arcs(line).map((a, i) => {
        // A small gap between arcs, so that the shares read apart.
        const len = Math.max(0, a.share * c - 0.8);
        const el = (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: the arcs keep their order.
            key={i}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={a.tone}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-at}
          />
        );
        at += a.share * c;
        return el;
      })}
    </g>
  );
}

/** The Podestà's crest and the merchant's share, under the city up close. */
export function SignoriaLine({ props, code }: { props: GameProps; code: string }) {
  const data = useSignoria(props.view);
  const line = signoriaOf(data, code);
  if (!props.view.signoria || !line) return null;
  const mine = pctOf(line.mine, line.total);
  return (
    <p className="mt-2 flex items-center justify-center gap-2 text-xs text-cream-dim">
      {line.podesta ? (
        <>
          <Crest crest={crestOf(line.podesta)} size={18} />
          <span className={line.podesta.me ? "text-info" : "text-cream"}>
            {t().podesta} ·{" "}
            {line.podesta.me ? (
              t().you
            ) : (
              <MerchantName pseudo={line.podesta.pseudo} bot={line.podesta.bot} fallback="—" />
            )}
          </span>
        </>
      ) : (
        <span>{t().vacant}</span>
      )}
      {mine > 0 && <span className="text-info">· {t().mine(mine)}</span>}
    </p>
  );
}

/** A city's Signoria: its Podestà, the gauge's three first and the merchant's points. */
export function SignoriaSheet(props: GameProps) {
  const [kind, city] = (props.sheet ?? "").split(":");
  const open = kind === "signoria" && !!city;
  const data = useSignoria(props.view, open);
  const line = signoriaOf(data, city ?? "");
  const rules = data?.rules;
  const sg = props.view.signoria;
  return (
    <Sheet
      open={open}
      onClose={() => props.setSheet(null)}
      kicker={t().kicker}
      title={t().title(props.names.city(city ?? ""))}
      summary={sg && t().line(Math.round(sg.tollBps / 100), sg.previewMinutes)}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0" aria-hidden="true">
            <SignoriaRing line={line} r={40} />
            {line?.podesta && (
              <foreignObject x="26" y="26" width="48" height="48">
                <div className="flex h-full w-full items-center justify-center">
                  <Crest crest={crestOf(line.podesta)} size={40} />
                </div>
              </foreignObject>
            )}
          </svg>
          <div className="min-w-0 flex-1">
            <p className="label">{t().podesta}</p>
            <p className="truncate font-place text-base font-bold uppercase tracking-[0.15em]">
              {line?.podesta ? (
                line.podesta.me ? (
                  <span className="text-info">{t().you}</span>
                ) : (
                  <MerchantName pseudo={line.podesta.pseudo} bot={line.podesta.bot} fallback="—" />
                )
              ) : (
                <span className="text-cream-dim">{t().vacant}</span>
              )}
            </p>
            <p className="meta mt-1">{t().decided}</p>
          </div>
        </div>
        {line && line.total === 0 && <p className="meta">{t().none}</p>}
        {line && line.total > 0 && (
          <ol className="space-y-1 text-sm">
            {line.top.map((p, i) => (
              <li
                key={p.id}
                className={`flex items-center gap-2 rounded-2xl bg-night-3 px-3 py-2 ${p.me ? "ring-1 ring-inset ring-info/60" : ""}`}
              >
                <span className="w-4 shrink-0 text-cream-dim">{i + 1}.</span>
                <Crest crest={crestOf(p)} size={20} />
                <span className={`min-w-0 flex-1 truncate ${p.me ? "text-info" : ""}`}>
                  {p.me ? t().you : <MerchantName pseudo={p.pseudo} bot={p.bot} fallback="—" />}
                </span>
                <span className="font-display tabular-nums text-cream-dim">
                  {t().share(pctOf(p.points, line.total))}
                </span>
              </li>
            ))}
            {!line.top.some((p) => p.me) && (
              <li className="flex items-center gap-2 rounded-2xl px-3 py-2 text-info">
                <span className="w-4 shrink-0" />
                <span className="flex-1">{t().you}</span>
                <span className="font-display tabular-nums">
                  {t().share(pctOf(line.mine, line.total))}
                </span>
              </li>
            )}
          </ol>
        )}
        {rules && (
          <Rules id="signoria">
            {t().help(
              rules.cityPointsPerHour,
              Math.round(rules.decayBps / 100),
              rules.maxCities,
              Math.round(rules.tollBps / 100),
              rules.previewMinutes,
            )}
          </Rules>
        )}
      </div>
    </Sheet>
  );
}
