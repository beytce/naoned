import { fr } from "../i18n.js";
import { shareUrl } from "../origin.js";
import { d } from "./format.js";
import type { Ceremony } from "./types.js";

/** The lines of a season's chronicle, as written on its card. */
export function chronicleLines(data: Ceremony, pseudo: string): string[] {
  const t = fr.game.chronicle;
  return [
    t.who(pseudo, data.rank, data.players),
    t.sales(d(data.turnover ?? data.worth)),
    data.milestone.name ? t.title(data.milestone.name) : "",
    data.award ? t.award(data.award) : "",
    t.renown(data.totalRenown.current.name),
  ].filter(Boolean);
}

/**
 * The season's chronicle as an image to share (1080 × 1350): the game's name, the season, the
 * merchant's rank and sales, its title and renown, in the Lagune palette. Drawn on a canvas.
 */
export async function chronicleImage(data: Ceremony, pseudo: string): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d");
  if (!g) return null;
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#1D304D");
  sky.addColorStop(1, "#16263E");
  g.fillStyle = sky;
  g.fillRect(0, 0, W, H);
  // A frame of thin gold, cut at the corners like the game's cards.
  g.strokeStyle = "#F4C554";
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(90, 60);
  g.lineTo(W - 60, 60);
  g.lineTo(W - 60, H - 90);
  g.lineTo(W - 90, H - 60);
  g.lineTo(60, H - 60);
  g.lineTo(60, 90);
  g.closePath();
  g.stroke();
  g.textAlign = "center";
  g.fillStyle = "#ECF5FF";
  g.font = "800 112px 'Archivo Variable', Archivo, system-ui, sans-serif";
  g.fillText("FONDACO", W / 2, 250);
  g.fillStyle = "#9CB4D2";
  g.font = "36px 'Space Mono', ui-monospace, monospace";
  g.fillText(data.season.toUpperCase(), W / 2, 320);
  g.fillStyle = "#F4C554";
  g.font = "800 260px 'Archivo Variable', Archivo, system-ui, sans-serif";
  g.fillText(`${data.rank}${data.rank === 1 ? "er" : "e"}`, W / 2, 640);
  g.font = "44px 'Space Grotesk', system-ui, sans-serif";
  let y = 760;
  for (const [i, line] of chronicleLines(data, pseudo).entries()) {
    g.fillStyle = i === 0 ? "#ECF5FF" : "#C2D4EA";
    g.fillText(line, W / 2, y, W - 200);
    y += 76;
  }
  g.fillStyle = "#6EC8F5";
  g.font = "32px 'Space Mono', ui-monospace, monospace";
  g.fillText(fr.game.chronicle.footer, W / 2, H - 120);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

/** Shares the chronicle (the phone's share sheet), else downloads it. */
export async function shareChronicle(data: Ceremony, pseudo: string): Promise<void> {
  const blob = await chronicleImage(data, pseudo);
  if (!blob) return;
  const file = new File([blob], `fondaco-${data.season.replace(/\s+/g, "-").toLowerCase()}.png`, {
    type: "image/png",
  });
  const text = chronicleLines(data, pseudo).join(" · ");
  // The game's address goes with the picture, carrying who shared it.
  const link = shareUrl(window.location.origin, pseudo);
  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], text, url: link }).catch(() => undefined);
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
