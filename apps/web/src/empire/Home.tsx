import { type ReactNode, useEffect, useState } from "react";
import type { Account } from "../api.js";
import { fr } from "../i18n.js";
import { EmpireGame } from "./EmpireGame.js";
import { type EmpireAnswer, empireApi } from "./api.js";

/**
 * Which game the world plays: the persistent empire when the server opens one, else the monthly
 * season's (until the switch, CADRAGE-v3 § 12). Asked once, at the door.
 */
export function EmpireOrSeason({ account, season }: { account: Account; season: ReactNode }) {
  const [kind, setKind] = useState<"asking" | "season" | EmpireAnswer>("asking");
  useEffect(() => {
    let live = true;
    empireApi
      .view()
      .then((v) => live && setKind(v.kind === "empire" ? v : "season"))
      // An older server, or none: the season's game, as before.
      .catch(() => live && setKind("season"));
    return () => {
      live = false;
    };
  }, []);
  if (kind === "asking")
    return (
      <p className="flex min-h-[100dvh] items-center justify-center bg-night text-cream-dim">
        {fr.empire.loading}
      </p>
    );
  if (kind === "season") return <>{season}</>;
  return <EmpireGame account={account} first={kind} />;
}
