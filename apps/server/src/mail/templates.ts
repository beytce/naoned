import type { Mail } from "./mailer.js";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** The sign-in mail: the code first (to type in the installed app), then the link. */
export function magicLinkMail(
  to: string,
  link: string,
  code: string,
  validMinutes: number,
  lang: "fr" | "en" = "fr",
): Mail {
  const shown = `${code.slice(0, 3)} ${code.slice(3)}`;
  if (lang === "en") return magicLinkMailEn(to, link, shown, validMinutes);
  const text = [
    "Bonjour,",
    "",
    `Votre code de connexion à Fondaco : ${shown}`,
    "Saisissez-le dans le jeu (sur iPhone, c'est le plus sûr).",
    "",
    "Ou touchez ce lien :",
    link,
    "",
    `Le code et le lien sont valables ${validMinutes} minutes ; le premier utilisé sert, une seule fois.`,
    "Si vous n'avez pas demandé à vous connecter, ignorez cet e-mail.",
  ].join("\n");
  const html = `<p>Bonjour,</p>
<p>Votre code de connexion à Fondaco :</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:4px;font-family:monospace">${shown}</p>
<p>Saisissez-le dans le jeu (sur iPhone, c'est le plus sûr), ou touchez ce lien :</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#E0AD4B;color:#0F1B1E;border-radius:6px;text-decoration:none">Se connecter à Fondaco</a></p>
<p>Le code et le lien sont valables ${validMinutes} minutes ; le premier utilisé sert, une seule fois.<br>Si vous n'avez pas demandé à vous connecter, ignorez cet e-mail.</p>`;
  return { to, subject: `${shown} : votre code de connexion à Fondaco`, text, html };
}

/** The same mail in English (E3-8). */
function magicLinkMailEn(to: string, link: string, shown: string, validMinutes: number): Mail {
  const text = [
    "Hello,",
    "",
    `Your Fondaco sign-in code: ${shown}`,
    "Type it in the game (on iPhone, that is the safest).",
    "",
    "Or tap this link:",
    link,
    "",
    `The code and the link are valid for ${validMinutes} minutes; the first one used works, once.`,
    "If you did not ask to sign in, ignore this e-mail.",
  ].join("\n");
  const html = `<p>Hello,</p>
<p>Your Fondaco sign-in code:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:4px;font-family:monospace">${shown}</p>
<p>Type it in the game (on iPhone, that is the safest), or tap this link:</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#E0AD4B;color:#0F1B1E;border-radius:6px;text-decoration:none">Sign in to Fondaco</a></p>
<p>The code and the link are valid for ${validMinutes} minutes; the first one used works, once.<br>If you did not ask to sign in, ignore this e-mail.</p>`;
  return { to, subject: `${shown}: your Fondaco sign-in code`, text, html };
}
