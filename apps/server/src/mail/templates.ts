import type { Mail } from "./mailer.js";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function magicLinkMail(to: string, link: string, validMinutes: number): Mail {
  const text = [
    "Bonjour,",
    "",
    "Voici votre lien de connexion à Comptoirs :",
    link,
    "",
    `Il est valable ${validMinutes} minutes et ne sert qu'une fois.`,
    "Si vous n'avez pas demandé ce lien, ignorez cet e-mail.",
  ].join("\n");
  const html = `<p>Bonjour,</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#7c2d12;color:#fff;border-radius:6px;text-decoration:none">Se connecter à Comptoirs</a></p>
<p>Il est valable ${validMinutes} minutes et ne sert qu'une fois.<br>Si vous n'avez pas demandé ce lien, ignorez cet e-mail.</p>`;
  return { to, subject: "Votre lien de connexion à Comptoirs", text, html };
}
