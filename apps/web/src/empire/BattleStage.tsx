/**
 * The Battle (docs/plan-terraferme-porcellana.md § 4 nonies, lot T6b): the live match of the
 * Terraferma as a scene of its own, full screen. Before: what it is and « Jouer » (a lobby always
 * open, the empty places taken by the computer); the lobby, its players and its countdown; the
 * match, on the Terraferma's board and interface, live; its end, the ranking and « Rejouer ».
 * Without an account (B4), at `/bataille`, a guest plays at once; a private room's link,
 * `/bataille/CODE`, brings friends to it.
 */
import { Suspense, useEffect, useState } from "react";
import { ApiError } from "../api.js";
import type { TerraAction } from "../game/types.js";
import { OLD_HOME } from "../home.js";
import { fr } from "../i18n.js";
import { Slab } from "../ui.js";
import { TerraPlay } from "./Terra.js";
import { type BattleRank, type BattleState, empireApi } from "./api.js";

const t = fr.empire.battle;

/** The page `/bataille` (B4): the Battle on its own, with or without an account. */
export function BattlePage({ room }: { room: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  return (
    <BattleStage
      now={now}
      room={room}
      backLabel={fr.appName}
      onBack={() => window.location.assign(OLD_HOME)}
    />
  );
}

/** The link of a private room, to share. */
const roomLink = (code: string) => `${window.location.origin}/bataille/${code}`;

export function BattleStage({
  now,
  onBack,
  room = null,
  backLabel = fr.empire.terra.back,
}: {
  now: number;
  onBack: () => void;
  /** A private room's code, from its link (B4). */
  room?: string | null;
  /** Where « ‹ » goes back to: the map, or the Fondaco's door on the page `/bataille`. */
  backLabel?: string;
}) {
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const share = (code: string) => {
    const url = roomLink(code);
    if (navigator.share) void navigator.share({ title: t.title, url }).catch(() => undefined);
    else
      void navigator.clipboard
        ?.writeText(url)
        .then(() => setCopied(true))
        .catch(() => undefined);
  };
  // The public ranking of the cotes (B3), opened from the card.
  const [ranking, setRanking] = useState<BattleRank[] | null>(null);
  const showRanking = () =>
    void empireApi
      .battleRanking()
      .then((r) => setRanking(r.ranking))
      .catch(() => setRanking([]));
  const live = battle?.phase === "lobby" || battle?.phase === "playing";
  // The match is read each second while it runs, each five otherwise.
  useEffect(() => {
    let gone = false;
    const load = () =>
      empireApi
        .battle()
        .then((r) => !gone && setBattle(r.battle))
        // A world without the Battle (a monthly one) answers no: shown closed.
        .catch((e) => !gone && e instanceof ApiError && setBattle({ phase: "off" }));
    load();
    const id = window.setInterval(load, live ? 1_000 : 5_000);
    return () => {
      gone = true;
      window.clearInterval(id);
    };
  }, [live]);
  const call = (p: Promise<{ battle: BattleState }>) =>
    p
      .then((r) => {
        setBattle(r.battle);
        setError(null);
      })
      .catch((e) => setError(fr.empire.errors[e instanceof ApiError ? e.code : ""] ?? t.failed));
  const send = (a: TerraAction) =>
    empireApi
      .battleAct(a)
      .then((r) => {
        setBattle(r.battle);
        return r.ok;
      })
      .catch(() => false);
  const match = battle && (battle.phase === "playing" || battle.phase === "done") ? battle : null;
  const left = match ? Math.max(0, Math.ceil((match.endsAt - now) / 1_000)) : 0;

  return (
    <div
      className="porcellana fixed inset-0 z-40 overflow-hidden lg:top-[var(--topbar,0px)]"
      data-battle-stage={battle?.phase ?? "loading"}
    >
      {match?.view ? (
        <Suspense fallback={null}>
          <TerraPlay
            v={match.view}
            now={now}
            busy={false}
            send={send}
            className="absolute inset-0"
            onBack={onBack}
          />
        </Suspense>
      ) : null}

      {match && match.phase === "playing" && (
        <div className="pointer-events-none absolute inset-x-0 top-28 z-40 flex justify-center">
          <span
            className="pc-pill px-4 py-1.5 text-sm font-extrabold tabular-nums"
            data-battle-clock=""
          >
            {t.left(Math.floor(left / 60), left % 60)}
          </span>
        </div>
      )}

      {(!match || match.phase === "done") && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 px-4">
          <section
            className="w-full max-w-sm space-y-3 rounded-3xl bg-white p-5 shadow-lg"
            data-battle-card=""
          >
            {!battle || battle.phase === "off" ? (
              <p className="text-sm">{battle ? t.off : t.loading}</p>
            ) : battle.phase === "none" ? (
              <>
                <h2 className="font-display text-2xl font-black">{t.title}</h2>
                <p className="text-sm">{t.pitch(battle.minutes, battle.players)}</p>
                <p className="text-sm font-bold" data-battle-rating="">
                  {t.rating(battle.rating)}
                </p>
                {!battle.guest && <p className="text-xs text-black/60">{t.gloryHint}</p>}
                {battle.guest && battle.name && (
                  <p className="text-sm" data-battle-guest="">
                    {t.guest(battle.name)}{" "}
                    <a href={OLD_HOME} className="font-bold text-[#C23B2E] underline">
                      {t.signUp}
                    </a>
                  </p>
                )}
                {room && (
                  <Slab className="w-full" onClick={() => void call(empireApi.battleJoin(room))}>
                    {t.roomJoin(room)}
                  </Slab>
                )}
                <Slab
                  tone={room ? "ghost" : undefined}
                  className="w-full"
                  onClick={() => void call(empireApi.battleJoin())}
                >
                  {t.play}
                </Slab>
                <Slab
                  tone="ghost"
                  className="w-full"
                  onClick={() => void call(empireApi.battleRoom())}
                >
                  {t.roomOpen}
                </Slab>
              </>
            ) : battle.phase === "lobby" && battle.room ? (
              <>
                <h2 className="font-display text-2xl font-black" data-battle-room={battle.room}>
                  {t.roomTitle(battle.room)}
                </h2>
                <p className="text-sm tabular-nums">
                  {t.roomWaiting(battle.waiting, battle.players)}
                </p>
                <p className="select-all break-all rounded-xl bg-black/5 px-3 py-2 text-xs">
                  {roomLink(battle.room)}
                </p>
                <Slab tone="ghost" className="w-full" onClick={() => share(battle.room ?? "")}>
                  {copied ? t.roomCopied : t.roomShare}
                </Slab>
                {battle.host && (
                  <Slab className="w-full" onClick={() => void call(empireApi.battleRoomStart())}>
                    {t.roomStart}
                  </Slab>
                )}
                <Slab
                  tone="ghost"
                  className="w-full"
                  onClick={() => void call(empireApi.battleLeave())}
                >
                  {t.leave}
                </Slab>
              </>
            ) : battle.phase === "lobby" ? (
              <>
                <h2 className="font-display text-2xl font-black">{t.lobby}</h2>
                <p className="text-sm tabular-nums">
                  {t.waiting(
                    battle.waiting,
                    battle.players,
                    Math.max(0, Math.ceil(((battle.startsAt ?? now) - now) / 1_000)),
                  )}
                </p>
                <Slab
                  tone="ghost"
                  className="w-full"
                  onClick={() => void call(empireApi.battleLeave())}
                >
                  {t.leave}
                </Slab>
              </>
            ) : battle.phase === "done" ? (
              <>
                <h2 className="font-display text-2xl font-black">{t.over}</h2>
                {!battle.ranked ? (
                  <p className="text-sm">{t.roomUnranked}</p>
                ) : (
                  battle.rating !== null &&
                  battle.ratingAfter !== null && (
                    <p className="text-sm font-bold" data-battle-rating="">
                      {t.ratingMoved(battle.rating, battle.ratingAfter)}
                    </p>
                  )
                )}
                {(battle.glory ?? 0) > 0 && (
                  <p className="text-sm font-bold text-[#C23B2E]" data-battle-glory="">
                    {t.glory(battle.glory ?? 0)}
                  </p>
                )}
                {battle.guest && (
                  <a href={OLD_HOME} className="block text-sm font-bold text-[#C23B2E] underline">
                    {t.signUp}
                  </a>
                )}
                <ol className="space-y-1 text-sm">
                  {(battle.result ?? []).map((r, k) => (
                    <li
                      key={`${k}:${r.pseudo ?? ""}`}
                      className={`flex justify-between ${r.me ? "font-extrabold text-[#C23B2E]" : ""}`}
                    >
                      <span>
                        {k + 1}. {r.me ? t.you : (r.pseudo ?? t.someone)}
                      </span>
                      <span className="tabular-nums">{t.cells(r.cells)}</span>
                    </li>
                  ))}
                </ol>
                <Slab className="w-full" onClick={() => void call(empireApi.battleJoin())}>
                  {t.again}
                </Slab>
              </>
            ) : null}
            {error && <p className="text-sm text-[#C23B2E]">{error}</p>}
            {ranking ? (
              <ol className="max-h-52 space-y-1 overflow-y-auto text-sm" data-battle-ranking="">
                {ranking.length === 0 && <li>{t.noRanking}</li>}
                {ranking.map((r) => (
                  <li
                    key={r.rank}
                    className={`flex justify-between ${r.me ? "font-extrabold text-[#C23B2E]" : ""}`}
                  >
                    <span>
                      {r.rank}. {r.pseudo ?? t.someone}
                    </span>
                    <span className="tabular-nums">{r.rating}</span>
                  </li>
                ))}
              </ol>
            ) : (
              battle &&
              battle.phase !== "off" && (
                <Slab tone="ghost" className="w-full" onClick={showRanking}>
                  {t.ranking}
                </Slab>
              )
            )}
            <Slab tone="ghost" className="w-full" onClick={onBack}>
              ‹ {backLabel}
            </Slab>
          </section>
        </div>
      )}
    </div>
  );
}
