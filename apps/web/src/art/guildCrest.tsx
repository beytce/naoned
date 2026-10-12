import { CREST_COLORS, Crest } from "./crest.js";

/** A guild's emblem, "colour-symbol" (or a symbol alone), on a banner. */
export function GuildCrest({ emblem, size = 48 }: { emblem: string; size?: number }) {
  const [a = "", b] = emblem.split("-");
  const symbol = b ?? a;
  const color = b ? a : CREST_COLORS[symbol.length % CREST_COLORS.length];
  return <Crest crest={{ shape: "banner", color: color ?? "gold", symbol }} size={size} />;
}
