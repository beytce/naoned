import { fr } from "../../i18n.js";
import { Label, Sheet, clock } from "../../ui.js";
import { actText, currentAct } from "../Acts.js";
import { NoticeList } from "../Bell.js";
import { Carnet, SeasonTiles, carnetRewards } from "../Comptoir.js";
import { Criee } from "../Criee.js";
import type { GameProps } from "../Game.js";
import { JournalSection } from "../Journal.js";

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
  const daysLeft = Math.ceil((catalog.world.endsAt - now) / 86_400_000);
  const days = Math.max(
    1,
    Math.round((catalog.world.endsAt - catalog.world.startsAt) / 86_400_000),
  );
  return (
    <Sheet open={props.open} onClose={props.onClose} title={t.title}>
      <div className="space-y-5">
        <section className="space-y-1">
          <p className="meta font-semibold text-gold">{t.season(Math.min(view.day, days), days)}</p>
          {act && (
            <p className="text-sm">
              <span className="font-semibold">{actText(act).title}</span>
              <span className="text-cream-dim"> · {actText(act).text}</span>
            </p>
          )}
          {daysLeft > 0 && daysLeft <= 3 ? (
            <p className="cut border border-gold/60 bg-gold/10 px-3 py-2 text-sm text-gold">
              {fr.game.season.lastSprint(daysLeft)}
            </p>
          ) : (
            daysLeft > 0 && <p className="text-xs text-cream-dim">{t.daysLeft(daysLeft)}</p>
          )}
        </section>

        <Criee {...props} />

        {event && (
          <section className="space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <Label className="text-cream-dim">{t.event}</Label>
              <span className="meta">
                {current
                  ? `${fr.game.gazette.endsIn} ${clock(event.endsAt - now)}`
                  : `${fr.game.gazette.startsIn} ${clock(event.startsAt - now)}`}
              </span>
            </div>
            <p className="font-display text-sm font-extrabold uppercase">
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
