import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
mkdirSync("out", { recursive: true });
const base = `
@font-face{font-family:A;src:url(archivo.woff2);font-weight:100 900}
@font-face{font-family:G;src:url(sg.woff2)}
@font-face{font-family:M;src:url(sm.woff2)}
*{box-sizing:border-box;margin:0}
body{width:var(--w);height:var(--h);overflow:hidden;background:#1e1611;color:#F6E8CC;font-family:G,sans-serif;position:relative}
.bg{position:absolute;inset:0;background:radial-gradient(ellipse 70% 55% at 70% 40%,rgba(232,178,76,.20),transparent 70%),radial-gradient(ellipse 60% 50% at 15% 90%,rgba(125,181,150,.16),transparent 70%),#1e1611}
.grain{position:absolute;inset:0;background-image:radial-gradient(rgba(246,232,204,.07) 1px,transparent 1px);background-size:22px 22px}
.brand{display:flex;align-items:center;gap:18px;font-family:A;font-weight:900;letter-spacing:-.01em;text-transform:uppercase}
.brand img{border-radius:22%}
.kick{font-family:M;font-weight:700;text-transform:uppercase;letter-spacing:.18em;color:#E8B24C}
h1{font-family:A;font-weight:900;text-transform:uppercase;line-height:.95;letter-spacing:-.015em}
h1 em{font-style:normal;color:#E8B24C}
p.sub{color:#CFBC9C;line-height:1.35}
.phone{position:absolute;border-radius:58px;padding:14px;background:linear-gradient(145deg,#4a372a,#17100c);box-shadow:0 40px 90px rgba(0,0,0,.65),0 0 0 2px rgba(246,232,204,.12),0 0 80px rgba(232,178,76,.12)}
.phone .scr{width:100%;height:100%;border-radius:46px;background-size:cover;background-position:top center}
.win{position:absolute;border-radius:18px;overflow:hidden;background:#120d0a;box-shadow:0 40px 100px rgba(0,0,0,.7),0 0 0 2px rgba(246,232,204,.10)}
.win .bar{height:34px;background:#2e221a;display:flex;align-items:center;gap:8px;padding-left:16px}
.win .bar i{width:11px;height:11px;border-radius:50%;background:#5a4434}
.win .scr{width:100%;height:calc(100% - 34px);background-size:cover;background-position:center}
.chips{display:flex;flex-wrap:wrap;gap:12px}
.chip{font-family:M;font-weight:700;text-transform:uppercase;letter-spacing:.1em;border:2px solid rgba(232,178,76,.55);color:#F3D492;border-radius:999px;padding:10px 20px}
.cta{display:inline-block;background:#E8B24C;color:#1e1611;font-family:A;font-weight:900;text-transform:uppercase;border-radius:999px;letter-spacing:.02em}
`;
const phone = (img, x, y, w, rot = 0) =>
  `<div class="phone" style="left:${x}px;top:${y}px;width:${w}px;height:${w * 2.165}px;transform:rotate(${rot}deg)"><div class="scr" style="background-image:url(${img})"></div></div>`;
const win = (img, x, y, w, h) =>
  `<div class="win" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><div class="bar"><i></i><i></i><i></i></div><div class="scr" style="background-image:url(${img})"></div></div>`;
const brand = (s) =>
  `<div class="brand" style="font-size:${s}px"><img src="logo.png" width="${s * 1.7}" height="${s * 1.7}">Fondaco</div>`;

// Portrait posts 1080×1350: one idea each.
const posts = [
  [
    "01-marchand",
    "Saison 1 · Venise 1450",
    "Devenez le <em>premier marchand</em> de Venise",
    "Un comptoir, deux ateliers, 1 000 ducats. Un mois pour bâtir la plus grande maison de commerce de la Sérénissime.",
    "m_map.png",
    ["Gratuit", "PC & mobile", "Sans téléchargement"],
  ],
  [
    "02-produire",
    "Produire · livrer · prospérer",
    "Vos ateliers <em>tournent</em> pendant que vous vivez",
    "Argile, briques, planches, pain : lancez la production, revenez récolter, chargez vos mules et livrez les villes de Vénétie.",
    "m_ateliers.png",
    ["Sessions courtes", "Production en temps réel"],
  ],
  [
    "03-rialto",
    "Le Rialto",
    "Un vrai marché, <em>tenu par les joueurs</em>",
    "Ici, les prix ne sont pas écrits d’avance : ils naissent des offres des marchands. Achetez bas, livrez haut, guettez les galères de la Muda.",
    "m_rialto.png",
    ["Carnet d’ordres", "Économie réelle"],
  ],
  [
    "04-familles",
    "Campagne de Terraferme",
    "Prêtez <em>allégeance</em> à une grande famille",
    "Contarini, Morosini, Mocenigo ou Dandolo : levez des lances, prenez des terres à Milan, gagnez la semaine et imposez vos décrets au Rialto.",
    "m_fam.png",
    ["4 familles", "Décrets hebdomadaires"],
  ],
  [
    "05-saison",
    "Un mois, une saison",
    "Chaque mois, <em>tout le monde</em> repart à zéro",
    "Pas de retard impossible à rattraper. Classement de la semaine, classement de la saison, et le titre de Doge pour le meilleur.",
    "m_classement.png",
    ["Saisons mensuelles", "Équitable"],
  ],
];
const pages = [];
for (const [id, kick, title, sub, img, chips] of posts) {
  pages.push([
    `post-${id}`,
    1080,
    1350,
    `
  <div class="bg"></div><div class="grain"></div>
  <div style="position:absolute;left:72px;top:64px">${brand(34)}</div>
  <div style="position:absolute;left:72px;top:200px;width:520px">
    <div class="kick" style="font-size:20px;margin-bottom:26px">${kick}</div>
    <h1 style="font-size:${title.length > 50 ? 64 : 72}px">${title}</h1>
    <p class="sub" style="font-size:27px;margin-top:30px">${sub}</p>
    <div class="chips" style="margin-top:36px">${chips.map((c) => `<span class="chip" style="font-size:16px">${c}</span>`).join("")}</div>
  </div>
  ${phone(img, 610, 170, 430, 4)}
  <div style="position:absolute;left:72px;bottom:64px" class="kick"><span style="font-size:18px;color:#7DB596">Jouer gratuitement · navigateur PC & mobile</span></div>`,
  ]);
}
// Social card 1200×630 (Open Graph, Discord, X, Reddit).
pages.push([
  "og-1200x630",
  1200,
  630,
  `
  <div class="bg"></div><div class="grain"></div>
  <div style="position:absolute;left:60px;top:52px">${brand(26)}</div>
  <div style="position:absolute;left:60px;top:150px;width:430px">
    <div class="kick" style="font-size:14px;margin-bottom:16px">Jeu de commerce multijoueur</div>
    <h1 style="font-size:50px">Le Travian <em>du commerce</em>, à Venise</h1>
    <p class="sub" style="font-size:19px;margin-top:18px">Produisez, livrez, spéculez au Rialto. Une saison par mois, gratuit sur PC et mobile.</p>
  </div>
  ${win("d_map.png", 520, 80, 680, 459)}
  ${phone("m_rialto.png", 1000, 150, 180, 3)}`,
]);
// Story 1080×1920.
pages.push([
  "story-1080x1920",
  1080,
  1920,
  `
  <div class="bg"></div><div class="grain"></div>
  <div style="position:absolute;left:0;right:0;top:110px;display:flex;justify-content:center">${brand(44)}</div>
  <div style="position:absolute;left:80px;right:80px;top:290px;text-align:center">
    <div class="kick" style="font-size:24px;margin-bottom:28px">Saison 1 · Venise 1450</div>
    <h1 style="font-size:92px">Bâtissez votre <em>empire marchand</em></h1>
  </div>
  ${phone("m_fam.png", 120, 760, 380, -6)}
  ${phone("m_map.png", 580, 720, 380, 5)}
  <div style="position:absolute;left:0;right:0;bottom:150px;text-align:center"><span class="cta" style="font-size:40px;padding:28px 60px">Jouer gratuitement</span>
  <p class="sub" style="font-size:26px;margin-top:28px">PC & mobile · sans téléchargement</p></div>`,
]);
// Wide key art 1920×1080 (press kit, itch.io, YouTube, Discord banner).
pages.push([
  "keyart-1920x1080",
  1920,
  1080,
  `
  <div class="bg"></div><div class="grain"></div>
  <div style="position:absolute;left:110px;top:100px">${brand(44)}</div>
  <div style="position:absolute;left:110px;top:290px;width:640px">
    <div class="kick" style="font-size:22px;margin-bottom:26px">Jeu de commerce multijoueur · saison mensuelle</div>
    <h1 style="font-size:96px">Devenez le <em>premier marchand</em> de Venise</h1>
    <p class="sub" style="font-size:30px;margin-top:34px">Ateliers, routes, Rialto et grandes familles : une économie vivante, tenue par les joueurs.</p>
    <div style="margin-top:50px"><span class="cta" style="font-size:30px;padding:22px 46px">Jouer gratuitement</span></div>
  </div>
  ${win("d_fam.png", 790, 140, 1080, 709)}
  ${phone("m_ateliers.png", 1560, 430, 260, 4)}`,
]);
// Discord / X banner 1500×500.
pages.push([
  "banner-1500x500",
  1500,
  500,
  `
  <div class="bg"></div><div class="grain"></div>
  <div style="position:absolute;left:70px;top:70px">${brand(30)}</div>
  <div style="position:absolute;left:70px;top:180px;width:620px"><h1 style="font-size:60px">Le commerce de Venise, <em>entre joueurs</em></h1>
  <p class="sub" style="font-size:22px;margin-top:18px">Une saison par mois · PC & mobile · gratuit</p></div>
  ${win("d_map.png", 790, 33, 640, 434)}`,
]);

const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
});
for (const [name, w, h, body] of pages) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>:root{--w:${w}px;--h:${h}px}${base}</style></head><body>${body}</body></html>`;
  writeFileSync(`kit/${name}.html`, html);
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await p.goto(`file://${process.cwd()}/kit/${name}.html`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `out/${name}.jpg`, type: "jpeg", quality: 88 });
  await p.close();
}
await b.close();
