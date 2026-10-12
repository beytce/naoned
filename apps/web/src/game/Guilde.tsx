import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../api.js";
import { CREST_COLORS, CREST_SYMBOLS, Crest } from "../art/crest.js";
import { fr } from "../i18n.js";
import { Badge, Big, Label, Panel, Ribbon, Slab, Stat, clock } from "../ui.js";
import { WorksitePanel } from "./Acts.js";
import type { GameProps } from "./Game.js";
import { gameApi } from "./api.js";
import { d } from "./format.js";
import { store } from "./store.js";
import type { GuildMessage, GuildsView, MyGuildView, ProposalKind, ProposalView } from "./types.js";

const t = () => fr.game.guilds;

/** A guild's emblem, "colour-symbol" (or a symbol alone), on a banner. */
export function GuildCrest({ emblem, size = 48 }: { emblem: string; size?: number }) {
  const [a = "", b] = emblem.split("-");
  const symbol = b ?? a;
  const color = b ? a : CREST_COLORS[symbol.length % CREST_COLORS.length];
  return <Crest crest={{ shape: "banner", color: color ?? "gold", symbol }} size={size} />;
}

function personName(props: GameProps, id: string | null): string {
  if (!id) return "—";
  return props.people[id] ?? fr.game.anonymous;
}

/** Ducats typed by the merchant, as deniers. */
function deniersOf(ducats: string): number {
  const n = Number(ducats.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

function DucatsInput(props: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-night-2 px-3 py-2">
      <span className="label shrink-0">{props.label}</span>
      <input
        inputMode="decimal"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-right font-display text-base tabular-nums outline-none"
      />
      <span className="text-sm text-cream-dim">d</span>
    </label>
  );
}

/** No guild yet: the guilds to join, and founding one's own. */
function Outside({ g, props }: { g: GuildsView; props: GameProps }) {
  const rules = props.catalog.guildRules;
  const open = g.opensAt <= props.now;
  const min = BigInt(rules.minStake);
  const [stake, setStake] = useState(String(Number(min) / 100));
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>("gold");
  const [symbol, setSymbol] = useState<string>("lion");
  const amount = deniersOf(stake);
  const enough = BigInt(amount) >= min;
  return (
    <div className="space-y-4">
      {!open && <p className="text-sm text-lagoon">{t().opensIn(clock(g.opensAt - props.now))}</p>}
      <Panel>
        <Label>{t().stakeTitle}</Label>
        <p className="mt-1 text-sm text-cream-dim">{t().stakeHelp(d(rules.minStake))}</p>
        <div className="mt-3 flex gap-2">
          <DucatsInput value={stake} onChange={setStake} label={t().stake} />
        </div>
      </Panel>
      <Label>{t().joinTitle}</Label>
      {g.list.length === 0 && <p className="text-sm text-cream-dim">{t().none}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {g.list.map((x) => {
          const full = x.members >= rules.maxMembers;
          return (
            <Panel key={x.id}>
              <div className="flex items-center gap-3">
                <GuildCrest emblem={x.emblem} size={52} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-lg font-extrabold uppercase">
                    {x.name}
                  </h3>
                  <p className="text-xs text-cream-dim">
                    {t().members(x.members, rules.maxMembers)} · {t().treasury} {d(x.treasury)}
                  </p>
                </div>
                {!x.open && <Badge tone="ghost">{t().closed}</Badge>}
              </div>
              <Slab
                className="mt-3 w-full"
                size="sm"
                disabled={!open || !x.open || full || !enough || props.busy}
                onClick={() => props.act({ type: "joinGuild", guildId: x.id, stake: amount })}
              >
                {full ? t().full : t().join(d(BigInt(amount)))}
              </Slab>
            </Panel>
          );
        })}
      </div>
      <Panel glow="gold">
        <Label className="text-gold">{t().foundTitle}</Label>
        <p className="mt-1 text-sm text-cream-dim">{t().foundHelp(d(rules.foundingCost))}</p>
        <div className="mt-3 flex items-center gap-3">
          <GuildCrest emblem={`${color}-${symbol}`} size={64} />
          <input
            value={name}
            maxLength={32}
            onChange={(e) => setName(e.target.value)}
            placeholder={t().namePlaceholder}
            aria-label={t().namePlaceholder}
            className="min-w-0 flex-1 rounded-xl border border-line bg-night-2 px-3 py-2.5 text-sm"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CREST_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={color === c}
              aria-label={c}
              onClick={() => setColor(c)}
              className={`rounded-lg p-0.5 ring-2 ${color === c ? "ring-gold" : "ring-transparent"}`}
            >
              <Crest crest={{ shape: "round", color: c, symbol: "star" }} size={26} />
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CREST_SYMBOLS.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={symbol === s}
              aria-label={s}
              onClick={() => setSymbol(s)}
              className={`rounded-lg p-0.5 ring-2 ${symbol === s ? "ring-gold" : "ring-transparent"}`}
            >
              <Crest crest={{ shape: "round", color, symbol: s }} size={30} />
            </button>
          ))}
        </div>
        <Slab
          className="mt-4 w-full"
          disabled={!open || name.trim().length < 2 || !enough || props.busy}
          onClick={() =>
            props.act({
              type: "foundGuild",
              name: name.trim(),
              emblem: `${color}-${symbol}`,
              stake: amount,
            })
          }
        >
          {t().found(d(BigInt(amount) + BigInt(rules.foundingCost)))}
        </Slab>
      </Panel>
    </div>
  );
}

const pct = (bps: number) => `${Math.round(bps / 100)} %`;

function proposalText(props: GameProps, p: Pick<ProposalView, "kind" | "value" | "target">) {
  switch (p.kind) {
    case "toll":
      return t().proposal.toll(pct(p.value));
    case "dividend":
      return t().proposal.dividend(pct(p.value));
    case "bounty":
      return t().proposal.bounty(d(BigInt(p.value)));
    case "open":
      return p.value === 1 ? t().proposal.open : t().proposal.close;
    case "exclude":
      return t().proposal.exclude(personName(props, p.target));
    case "war":
      return t().proposal.war;
  }
}

function Proposal({ p, g, props }: { p: ProposalView; g: MyGuildView; props: GameProps }) {
  return (
    <li className="rounded-xl bg-night-2 p-3 ring-1 ring-inset ring-line/70">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{proposalText(props, p)}</p>
        {p.status === "open" ? (
          <span className="label shrink-0 text-lagoon">{clock(p.closesAt - props.now)}</span>
        ) : (
          <Badge tone={p.status === "passed" ? "lagoon" : "ghost"}>
            {p.status === "passed" ? t().passed : t().rejected}
          </Badge>
        )}
      </div>
      <p className="mt-1 text-xs text-cream-dim">{t().by(personName(props, p.by))}</p>
      <div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-night-4">
        <span
          className="absolute inset-y-0 left-0 bg-lagoon"
          style={{ width: `${(p.yes / Math.max(1, p.total)) * 100}%` }}
        />
        <span
          className="absolute inset-y-0 right-0 bg-vermilion"
          style={{ width: `${(p.no / Math.max(1, p.total)) * 100}%` }}
        />
        <span className="absolute inset-y-0 left-1/2 w-px bg-cream/60" />
      </div>
      <p className="mt-1 flex justify-between text-[11px] text-cream-dim">
        <span>
          {t().yes} {Math.round((p.yes / Math.max(1, p.total)) * 100)} %
        </span>
        <span>{t().majority}</span>
        <span>
          {t().no} {Math.round((p.no / Math.max(1, p.total)) * 100)} %
        </span>
      </p>
      {p.status === "open" && (
        <div className="mt-2 flex gap-2">
          <Slab
            size="sm"
            tone={p.mine === true ? "lagoon" : "ghost"}
            className="flex-1"
            disabled={props.busy || g.carats === 0}
            onClick={() => props.act({ type: "vote", proposalId: p.id, yes: true })}
          >
            {t().yes}
          </Slab>
          <Slab
            size="sm"
            tone={p.mine === false ? "vermilion" : "ghost"}
            className="flex-1"
            disabled={props.busy || g.carats === 0}
            onClick={() => props.act({ type: "vote", proposalId: p.id, yes: false })}
          >
            {t().no}
          </Slab>
        </div>
      )}
    </li>
  );
}

/** A new proposal: what to change, and to what. */
function Propose({ g, props }: { g: MyGuildView; props: GameProps }) {
  const rules = props.catalog.guildRules;
  const [kind, setKind] = useState<Exclude<ProposalKind, "war">>("dividend");
  const [value, setValue] = useState("30");
  const [target, setTarget] = useState(g.members.find((m) => !m.me)?.playerId ?? "");
  const n = Number(value.replace(",", "."));
  const proposal =
    kind === "exclude"
      ? ({ kind, target } as const)
      : kind === "open"
        ? ({ kind, value: g.open ? 0 : 1 } as const)
        : kind === "bounty"
          ? ({ kind, value: Math.round(n * 100) } as const)
          : ({ kind, value: Math.round(n * 100) } as const);
  const valid =
    kind === "exclude"
      ? !!target
      : kind === "open"
        ? true
        : Number.isFinite(n) &&
          n >= 0 &&
          (kind === "toll"
            ? n * 100 <= rules.maxTollBps
            : kind === "dividend"
              ? n <= 100
              : n * 100 <= Number(rules.maxBountyPerUnit));
  const kinds: Exclude<ProposalKind, "war">[] = ["dividend", "toll", "bounty", "open", "exclude"];
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-full px-3 py-1.5 text-xs ring-1 ring-inset ${kind === k ? "bg-cream text-night ring-cream" : "bg-night-3 text-cream-dim ring-line"}`}
          >
            {t().kinds[k]}
          </button>
        ))}
      </div>
      {kind === "exclude" ? (
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full rounded-xl border border-line bg-night-2 px-3 py-2.5 text-sm"
        >
          {g.members
            .filter((m) => !m.me)
            .map((m) => (
              <option key={m.playerId} value={m.playerId}>
                {personName(props, m.playerId)}
              </option>
            ))}
        </select>
      ) : kind === "open" ? (
        <p className="text-sm text-cream-dim">{g.open ? t().proposal.close : t().proposal.open}</p>
      ) : (
        <label className="flex items-center gap-2 rounded-xl border border-line bg-night-2 px-3 py-2">
          <span className="label shrink-0">{t().kinds[kind]}</span>
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-right font-display text-base tabular-nums outline-none"
          />
          <span className="text-sm text-cream-dim">{kind === "bounty" ? "d / unité" : "%"}</span>
        </label>
      )}
      <p className="text-xs text-cream-dim">{t().kindHelp[kind]}</p>
      <Slab
        className="w-full"
        size="sm"
        disabled={!valid || props.busy}
        onClick={() => props.act({ type: "propose", proposal })}
      >
        {t().propose}
      </Slab>
    </div>
  );
}

function Mine({ g, props }: { g: MyGuildView; props: GameProps }) {
  const rules = props.catalog.guildRules;
  const [amount, setAmount] = useState("100");
  const [leaving, setLeaving] = useState(false);
  const [proposing, setProposing] = useState(false);
  const deniers = deniersOf(amount);
  const weight = g.members.find((m) => m.me)?.weight ?? 0;
  const totalWeight = g.members.reduce((n, m) => n + m.weight, 0);
  const alone = g.members.length === 1;
  const refund = alone
    ? BigInt(g.treasury)
    : (BigInt(g.share) * BigInt(10_000 - rules.exitFeeBps)) / 10_000n;
  const open = g.proposals.filter((p) => p.status === "open");
  const closed = g.proposals.filter((p) => p.status !== "open").slice(0, 5);
  return (
    <div className="space-y-4">
      <Panel glow="gold">
        <div className="flex items-center gap-3">
          <GuildCrest emblem={g.emblem} size={64} />
          <div className="min-w-0 flex-1">
            <Label>{t().yours}</Label>
            <h2 className="truncate font-display text-2xl font-extrabold uppercase">{g.name}</h2>
            <p className="text-xs text-cream-dim">
              {t().members(g.members.length, rules.maxMembers)}
              {g.open ? "" : ` · ${t().closed}`}
            </p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label={t().treasury} value={d(g.treasury)} tone="gold" />
          <Stat label={t().value100} value={d(g.valueOf100)} />
          <Stat label={t().myCarats} value={g.carats.toLocaleString("fr-FR")} tone="lagoon" />
          <Stat label={t().myShare} value={d(g.share)} />
        </div>
        <p className="mt-2 text-xs text-cream-dim">
          {t().myWeight(
            Math.round((weight / Math.max(1, totalWeight)) * 100),
            pct(rules.maxVoteBps),
          )}
        </p>
        <div className="mt-3 flex gap-2">
          <DucatsInput value={amount} onChange={setAmount} label={t().invest} />
          <Slab
            size="sm"
            disabled={deniers <= 0 || props.busy}
            onClick={() => props.act({ type: "investGuild", amount: deniers })}
          >
            {t().investGo}
          </Slab>
        </div>
        <p className="mt-1 text-xs text-cream-dim">{t().investHelp}</p>
      </Panel>

      <Panel>
        <Label>{t().settings}</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Stat label={t().kinds.dividend} value={pct(g.dividendBps)} />
          <Stat label={t().kinds.toll} value={pct(g.tollBps)} />
          <Stat label={t().kinds.bounty} value={`${d(g.bountyPerUnit)} / u.`} />
          <Stat label={t().kinds.open} value={g.open ? t().openYes : t().closed} />
        </div>
      </Panel>

      <Panel glow={open.length > 0 ? "lagoon" : undefined}>
        <div className="flex items-center justify-between gap-2">
          <Label className="text-lagoon">{t().votes}</Label>
          <button
            type="button"
            className="label text-gold"
            onClick={() => setProposing(!proposing)}
          >
            {proposing ? t().cancel : `+ ${t().newProposal}`}
          </button>
        </div>
        <p className="mt-1 text-xs text-cream-dim">{t().votesHelp(rules.voteHours)}</p>
        {proposing && <Propose g={g} props={props} />}
        <ul className="mt-3 space-y-2">
          {open.length === 0 && <li className="text-sm text-cream-dim">{t().noVote}</li>}
          {open.map((p) => (
            <Proposal key={p.id} p={p} g={g} props={props} />
          ))}
        </ul>
        {closed.length > 0 && (
          <details className="mt-3">
            <summary className="label cursor-pointer">{t().history}</summary>
            <ul className="mt-2 space-y-2">
              {closed.map((p) => (
                <Proposal key={p.id} p={p} g={g} props={props} />
              ))}
            </ul>
          </details>
        )}
      </Panel>

      <WorksitePanel {...props} />
      <Thread />

      <Panel>
        <Label>{t().roll}</Label>
        <ul className="mt-3 space-y-3">
          {g.members.map((m) => (
            <li key={m.playerId}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className={m.me ? "font-semibold text-gold" : ""}>
                  {m.me ? t().you : personName(props, m.playerId)}{" "}
                  {props.bots.has(m.playerId) && <Badge tone="ghost">{fr.game.npc}</Badge>}
                  {m.playerId === g.founder && <Badge tone="ghost">{t().founder}</Badge>}
                </span>
                <Big className="text-sm">{m.carats.toLocaleString("fr-FR")}</Big>
              </div>
              <div className="mt-1">
                <Ribbon value={g.caratsIssued > 0 ? m.carats / g.caratsIssued : 0} tone="lagoon" />
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel>
        {leaving ? (
          <div className="space-y-2">
            <p className="text-sm text-cream-dim">
              {alone ? t().leaveLast(d(refund)) : t().leaveHelp(d(refund), pct(rules.exitFeeBps))}
            </p>
            <div className="flex gap-2">
              <Slab
                tone="vermilion"
                size="sm"
                className="flex-1"
                disabled={props.busy}
                onClick={() => props.act({ type: "leaveGuild" })}
              >
                {t().leaveConfirm}
              </Slab>
              <Slab tone="ghost" size="sm" onClick={() => setLeaving(false)}>
                {t().cancel}
              </Slab>
            </div>
          </div>
        ) : (
          <button type="button" className="label text-cream-dim" onClick={() => setLeaving(true)}>
            {t().leave}
          </button>
        )}
      </Panel>
    </div>
  );
}

const THREAD_POLL_MS = 15_000;

/** The guild's thread: members talk, report what should not be there. */
function Thread() {
  const [messages, setMessages] = useState<GuildMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());
  const show = useCallback((list: GuildMessage[]) => {
    setMessages(list);
    const last = list.at(-1);
    if (last) store.set("guildSeen", String(last.at));
  }, []);
  useEffect(() => {
    let alive = true;
    const load = () =>
      gameApi
        .guildThread()
        .then((r) => alive && show(r.messages))
        .catch(() => {});
    load();
    const timer = setInterval(load, THREAD_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [show]);
  const send = async () => {
    setSending(true);
    setError(null);
    try {
      show((await gameApi.sayToGuild(text)).messages);
      setText("");
    } catch (e) {
      const errors = t().thread.errors;
      setError(errors[e instanceof ApiError ? e.code : ""] ?? errors.other ?? null);
    } finally {
      setSending(false);
    }
  };
  return (
    <Panel>
      <Label className="text-lagoon">{t().thread.title}</Label>
      <p className="mt-1 text-xs text-cream-dim">{t().thread.help}</p>
      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {messages.length === 0 && <li className="text-sm text-cream-dim">{t().thread.empty}</li>}
        {messages.map((m) => (
          <li
            key={m.id}
            className={`rounded-xl px-3 py-2 text-sm ${m.mine ? "ml-6 bg-lagoon/15" : "mr-6 bg-night-3"}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="label text-gold">{m.mine ? t().thread.me : (m.pseudo ?? "—")}</span>
              <span className="label">{clockTime(m.at)}</span>
            </div>
            <p className="mt-1 whitespace-pre-wrap break-words">{m.body}</p>
            {!m.mine && (
              <button
                type="button"
                disabled={reported.has(m.id)}
                className="label mt-1 text-cream-dim disabled:opacity-50"
                onClick={async () => {
                  await gameApi.reportMessage(m.id).catch(() => {});
                  setReported(new Set([...reported, m.id]));
                }}
              >
                {reported.has(m.id) ? t().thread.reported : t().thread.report}
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void send();
        }}
      >
        <input
          value={text}
          maxLength={280}
          onChange={(e) => setText(e.target.value)}
          placeholder={t().thread.placeholder}
          aria-label={t().thread.placeholder}
          className="min-w-0 flex-1 rounded-xl border border-line bg-night-2 px-3 py-2.5 text-sm"
        />
        <Slab size="sm" disabled={sending || !text.trim()} onClick={() => void send()}>
          {t().thread.send}
        </Slab>
      </form>
      {error && <p className="mt-2 text-sm text-vermilion">{error}</p>}
    </Panel>
  );
}

/** "14:05", Paris time like the rest of the game's clock. */
function clockTime(at: number): string {
  return new Date(at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

/** The guilds: found or join one, put ducats in its treasury for carats, vote, talk. */
export function Guilde(props: GameProps) {
  const g = props.view.guilds;
  if (!g) return null;
  return (
    <section className="space-y-4">
      <header>
        <Label className="text-gold">⚑ {t().kicker}</Label>
        <h1 className="mt-2 font-display text-[2rem] font-extrabold uppercase leading-[1.05]">
          {t().title}
        </h1>
        <p className="mt-2 text-sm text-cream-dim">{t().help}</p>
      </header>
      {g.mine ? <Mine g={g.mine} props={props} /> : <Outside g={g} props={props} />}
    </section>
  );
}
