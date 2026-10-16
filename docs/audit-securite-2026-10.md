# Audit de sécurité — 16 octobre 2026

Périmètre : `apps/server` (Fastify, authentification, routes du jeu, WebSocket, notifications push), `apps/web` (rendu des contenus joueurs), `Dockerfile`, dépendances de production (`pnpm audit --prod`). Lecture du code et essais en local ; aucun test d'intrusion sur la production.

## Ce qui est sain

- **Connexion par lien magique** : jeton de 256 bits, stocké haché (SHA-256), usage unique et atomique (`UPDATE … WHERE used_at IS NULL RETURNING`), 15 minutes ; 5 liens par adresse et par heure ; la réponse ne dit jamais si l'adresse a un compte. Le jeton est retiré de l'URL (`history.replaceState`) avant l'appel à `/api/auth/verify`, et la vérification se fait en POST : un antivirus de messagerie qui « préclique » le lien ne le consomme pas.
- **Session** : cookie `httpOnly`, `SameSite=Lax`, `Secure` en production, stocké haché en base, 30 jours. Les comptes PNJ ne peuvent pas ouvrir de session.
- **Entrées** : toutes les routes valident leur corps avec zod (bornes sur les quantités, longueurs, UUID) ; requêtes SQL paramétrées par Drizzle, aucun `sql.raw` ; pseudo restreint à `[\p{L}\p{N}_-]{3,20}`, blason en listes fermées.
- **XSS** : aucun `dangerouslySetInnerHTML` ni `innerHTML` ; React échappe les messages de famille et les pseudos.
- **Autorisation** : chaque route de jeu passe par `requireAccount` ; les actions agissent sur `account.id`, jamais sur un identifiant fourni par le client ; les routes d'administration vérifient la liste `ADMIN_EMAILS`.
- **Fil de famille** : membre seulement, 2 000 caractères, délai entre messages, plafond quotidien, signalement, masquage par l'administration.
- **RGPD** : export et suppression du compte (suppression confirmée par la saisie de SUPPRIMER).

## Constats, du plus grave au moins grave

| # | Gravité | Constat | Correctif proposé |
| --- | --- | --- | --- |
| 1 | **Haute** | **Dépendances vulnérables** : `fastify` 5.2.1 (8 avis « high » : contournement de validation par `Content-Type`, URL malformées, etc.), `@fastify/static` 8.0.3 (traversée de chemin, contournement de garde), `drizzle-orm` 0.38.3 (injection SQL par identifiants mal échappés). Le code n'utilise ni schémas Fastify ni identifiants dynamiques, ce qui limite l'exposition, mais `@fastify/static` sert directement l'application en production. | Monter `fastify` ≥ 5.12.5, `@fastify/static` ≥ 10.1.2, `drizzle-orm` ≥ 0.45.2 (et `drizzle-kit`), relancer `pnpm test` et `pnpm typecheck`. Ajouter `pnpm audit --prod --audit-level high` à la CI. |
| 2 | **Haute** | **SSRF par les notifications push** : `POST /api/notifications/push/subscribe` accepte n'importe quelle URL comme `endpoint` ; le serveur y enverra ensuite des requêtes POST (`web-push`). Un joueur peut faire viser au serveur une adresse interne (réseau privé Railway, `169.254.169.254`, `localhost:3000`…). | N'accepter que `https:` et les hôtes des services push connus (`fcm.googleapis.com`, `*.push.services.mozilla.com`, `*.notify.windows.com`, `web.push.apple.com`, `*.push.apple.com`) ; plafonner le nombre d'abonnements par compte (ex. 10). |
| 3 | **Moyenne** | **Limitation de débit contournable** : `trustProxy: true` fait confiance à tout l'en-tête `X-Forwarded-For`, donc `req.ip` est choisi par le client. Les limites de `/api/auth/request` (10 / 15 min) et `/api/auth/verify` (20 / 15 min) par IP tombent : on peut envoyer des liens à des milliers d'adresses (coût Resend, réputation du domaine d'envoi). | `trustProxy: 1` (un seul saut : le proxy de Railway), ou la liste des plages du proxy. Ajouter une limite globale sur `/api/auth/request` (par exemple 200 / heure) et une alerte. |
| 4 | **Moyenne** | **Aucun en-tête de sécurité** : ni `Content-Security-Policy`, ni `frame-ancestors` / `X-Frame-Options` (le jeu peut être intégré dans une iframe : détournement de clic sur Acheter, Envoyer…), ni `Strict-Transport-Security`, ni `X-Content-Type-Options`, ni `Referrer-Policy`. | Ajouter `@fastify/helmet` en production : CSP `default-src 'self'` (+ `connect-src 'self' wss:`, `img-src 'self' data:`, `style-src 'self' 'unsafe-inline'` tant que des styles en ligne existent), `frame-ancestors 'none'`, HSTS 1 an, `nosniff`, `Referrer-Policy: same-origin`. |
| 5 | **Moyenne** | **Jetons de connexion dans les journaux** : en production, Fastify journalise chaque requête avec son URL ; la page `/connexion?token=…` est servie par le serveur, donc le jeton apparaît en clair dans les logs Railway pendant sa durée de validité (15 min, usage unique). | Sérialiseur de requête qui masque `token=` dans `req.url` (`logger: { serializers: { req } }`). |
| 6 | **Basse** | **Pas de limite de débit sur le jeu** : `/api/game/actions`, `/api/game` et la connexion WebSocket `/api/live` ne sont pas limités ; un compte peut ouvrir des centaines de sockets ou marteler les actions (chaque action sérialise le monde). | Limite par compte (ex. 10 actions / s, 300 / min) via `@fastify/rate-limit` avec `keyGenerator` sur le cookie de session ; au plus 5 sockets par compte (fermer la plus ancienne). |
| 7 | **Basse** | **WebSocket sans contrôle d'origine** : `/api/live` accepte toute origine. Le cookie `SameSite=Lax` empêche déjà l'usage depuis un autre site, et le canal n'envoie que « rafraîchis ta vue ». | Refuser la poignée de main si `Origin` ≠ `APP_URL`. |
| 8 | **Basse** | **Défense en profondeur CSRF** : la protection repose sur `SameSite=Lax` et sur la validation zod (un formulaire `text/plain` envoyé depuis un autre site arrive en chaîne et échoue à la validation). `POST /api/game/reset` et `/api/auth/logout` n'ont pas de corps. | Rejeter les requêtes non `GET` dont l'en-tête `Origin` est présent et différent de `APP_URL`. |
| 9 | **Basse** | **Image Docker** : le conteneur tourne en `root`, embarque tout le dépôt et les dépendances de développement (simulateur, Vite, Biome…). | `USER node`, `pnpm deploy --prod` du serveur dans l'étape finale, ne copier que `apps/web/dist`. |
| 10 | Info | **Usurpation de pseudo** : les lettres Unicode autorisent des homoglyphes (« Contarіni » avec un і cyrillique). | Normaliser (NFKC) et refuser les mélanges d'alphabets, ou se limiter à l'alphabet latin étendu. |
| 11 | Info | `esbuild` ≤ 0.24.2 (via Vite 5) : le serveur de développement répond à n'importe quel site. Sans effet en production. | Monter Vite à une version qui embarque esbuild ≥ 0.25 lors d'une prochaine mise à jour. |

## Corrigé le 16 octobre 2026

| # | Correctif | Vérification |
| --- | --- | --- |
| 1 | `fastify` 5.12.7, `@fastify/static` 10.1.6, `drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11, autres plugins Fastify et `tsx` à jour ; `pnpm audit --prod --audit-level high` dans la CI | `pnpm audit --prod` : aucune vulnérabilité ; `db:generate` : aucun changement de schéma |
| 2 | `isPushEndpoint` : HTTPS, port par défaut, hôtes des services push uniquement ; 10 appareils par personne | `test/push.test.ts`, `test/notify.test.ts` |
| 3 | `trustProxy` : seul le saut voisin (le proxy de Railway) est cru | `test/hardening.test.ts` (une adresse inventée en tête de `X-Forwarded-For` ne remet pas le compteur à zéro) |
| 4 | CSP, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, HSTS en production | `test/hardening.test.ts` ; application construite servie par le serveur et parcourue dans Chromium (Rialto, carte, familles, ligne en direct) sans aucune violation de CSP |
| 5 | Jetons masqués dans les URL journalisées (`redactUrl`) | `test/hardening.test.ts`, journaux du serveur |
| 6 | Rythme par session : actions et vue 300 / min, messages de famille 60, adhésion et remise à zéro 30, abonnements push 30 ; 5 sockets par marchand, la plus ancienne fermée | `test/live.test.ts`, `test/hardening.test.ts` |
| 7, 8 | Écritures et `/api/live` refusées (403) si l'en-tête `Origin` diffère de `APP_URL` | `test/hardening.test.ts` |
| 9 | Image : `USER node`, serveur lancé sans pnpm (reçoit le signal d'arrêt) | image construite et lancée contre PostgreSQL 16 : `whoami` = `node`, `/api/health` OK, arrêt immédiat |

Restent ouverts : #10 (homoglyphes dans les pseudos, à trancher) et #11 (Vite 5 en développement seulement). L'image embarque encore les dépendances de développement : l'alléger (`pnpm deploy --prod`) est un chantier à part, sans gain de sécurité immédiat maintenant qu'elle ne tourne plus en `root`.
