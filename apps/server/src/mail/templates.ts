import type { Mail } from "./mailer.js";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** The sign-in mail: the code first (to type in the installed app), then the link. */
export function magicLinkMail(to: string, link: string, code: string, validMinutes: number): Mail {
  const shown = `${code.slice(0, 3)} ${code.slice(3)}`;
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
