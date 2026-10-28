import { fr } from "../../i18n.js";
import { Label, Sheet, clock } from "../../ui.js";
import { actText, currentAct } from "../Acts.js";
import { AtoutsLine } from "../Atouts.js";
import { NoticeList } from "../Bell.js";
import { Carnet, SeasonTiles, carnetRewards } from "../Comptoir.js";
import { Criee } from "../Criee.js";
import type { GameProps } from "../Game.js";
import { JournalSection } from "../Journal.js";
import { LetterLine } from "../Letter.js";
import { seasonCount } from "../seasonCount.js";

/**
 * The notices, behind the bell of the HUD: everything that used to be a banner over the screens
 * (the season and its act, the gazette's event, a Criée, the last sprint), the
 * day's notebook with its rewards, the season's goals, then the news.
 */
export function NoticesSheet(
  props: GameProps & { open: boolean; onClose: () => void; onRead: () => void },
) {
  const { view, catalog, now } = props;
  const t = fr.game.map.notice;
  const act = currentAct(view, now);
  const { current, next } = view.gazette;
  const event = current ?? next;
  const { label: seasonLabel, left: daysLeft } = seasonCount(catalog.world, now);
  // The season as a ring (Lagune): the share of the month gone, in gold.
  const span = Math.max(1, catalog.world.endsAt - catalog.world.startsAt);
  const gone = Math.min(1, Math.max(0, (now - catalog.world.startsAt) / span));
  const ring = 2 * Math.PI * 24;
  return (
    <Sheet open={props.open} onClose={props.onClose} title={t.title}>
      <div className="space-y-5">
        <section className="space-y-2">
          <div className="flex items-center gap-3">
            <svg
              viewBox="-30 -30 60 60"
              className="h-14 w-14 shrink-0 -rotate-90"
              aria-hidden="true"
            >
              <circle r="24" fill="none" stroke="rgb(var(--night-4))" strokeWidth="4" />
              <circle
                r="24"
                fill="none"
                stroke="rgb(var(--gold))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(ring * Math.max(0.02, gone)).toFixed(1)} ${ring.toFixed(1)}`}
              />
            </svg>
            <div className="min-w-0">
              {/* One line for the season: its day, and how many are left. */}
              <p className="meta font-semibold text-gold">
                {seasonLabel}
                {daysLeft > 3 && (
                  <span className="font-normal text-cream-dim"> · {t.daysLeft(daysLeft)}</span>
                )}
              </p>
              {act && (
                <p className="text-sm">
                  <span className="font-semibold">{actText(act).title}</span>
                  <span className="text-cream-dim"> · {actText(act).text}</span>
                </p>
              )}
            </div>
          </div>
          {daysLeft > 0 && daysLeft <= 3 && (
            <p className="cut border border-gold/60 bg-gold/10 px-3 py-2 text-sm text-gold">
              {fr.game.season.lastSprint(daysLeft)}
            </p>
          )}
        </section>

        <LetterLine {...props} />
        <AtoutsLine {...props} />

        <Criee {...props} />

        {event && (
          // The gazette's event, as a star about to rise (Lagune): a card with its own glow.
          <section className="space-y-1 rounded-2xl bg-gradient-to-br from-vermilion/15 to-night-3 p-3 ring-1 ring-inset ring-vermilion/40">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <Label className="text-vermilion">{t.event}</Label>
              <span className="meta">
                {current
                  ? `${fr.game.gazette.endsIn} ${clock(event.endsAt - now)}`
                  : `${fr.game.gazette.startsIn} ${clock(event.startsAt - now)}`}
              </span>
            </div>
            <p className="font-display text-base font-extrabold">
              {(fr.game.gazette.events[event.code] ?? [event.code])[0]}
            </p>
            <p className="text-sm text-cream-dim">
              {(fr.game.gazette.events[event.code] ?? ["", ""])[1]}
            </p>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <Label className="text-gold">{t.carnet}</Label>
            {carnetRewards(props) > 0 && (
              <span className="meta text-gold">{fr.game.carnet.rewards(carnetRewards(props))}</span>
            )}
          </div>
          <Carnet {...props} />
        </section>

        <section className="space-y-3">
          <Label>{t.yourSeason}</Label>
          <SeasonTiles {...props} />
        </section>

        <JournalSection {...props} />

        <section className="space-y-2">
          <Label>{t.news}</Label>
          {props.open && <NoticeList {...props} onRead={props.onRead} />}
        </section>
      </div>
    </Sheet>
  );
}
