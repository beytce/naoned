# Déploiement

Un seul service : le serveur Fastify sert l'API (`/api/…`) et l'application web construite. La base est un PostgreSQL ; les migrations s'appliquent au démarrage. Les e-mails de connexion partent par [Resend](https://resend.com).

## Variables d'environnement

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | oui | URL PostgreSQL (`postgres://…`), fournie par Railway |
| `APP_URL` | oui | URL publique du jeu, sans `/` final (ex. `https://comptoirs.up.railway.app`) ; sert aux liens de connexion |
| `RESEND_API_KEY` | oui | Clé API Resend |
| `MAIL_FROM` | non | Expéditeur, par défaut `Fondaco <onboarding@resend.dev>` |
| `VAPID_PUBLIC_KEY` | non | Clé publique des notifications push ; sans elle, notifications dans le jeu seulement |
| `VAPID_PRIVATE_KEY` | non | Clé privée des notifications push (secrète) |
| `VAPID_SUBJECT` | non | Contact de l'émetteur, par défaut `mailto:contact@comptoirs.app` |
| `ADMIN_EMAILS` | non | Adresses (séparées par des virgules) autorisées sur `/admin` : rétention, échanges suspects, répétition de fin de saison, attribution du Pass |
| `ALERT_WEBHOOK_URL` | non | Webhook Discord ou Slack : alerte si le monde est bloqué, si une erreur serveur survient, si le grand livre a un écart ou lors d'une relève de déploiement |
| `PORT` | non | Fourni par Railway |
| `NODE_ENV` | non | `production` (déjà fixé dans le Dockerfile) |

Le serveur refuse de démarrer en production sans `RESEND_API_KEY` ou avec une base PGlite.

## Railway, pas à pas

1. **Resend** : créer un compte sur resend.com, puis une clé API (*API Keys → Create*). Sans domaine vérifié, l'expéditeur `onboarding@resend.dev` ne peut écrire qu'à l'adresse du compte Resend : suffisant pour un premier test. Pour inviter des joueurs, vérifier un domaine (*Domains*) et régler `MAIL_FROM` (ex. `Comptoirs <bonjour@mondomaine.fr>`).
2. **Projet** : sur railway.com, *New Project → Deploy from GitHub repo* et choisir `naoned` (branche à déployer : celle qui contient ce code). Railway lit `railway.json` et construit le `Dockerfile`.
3. **Base** : dans le projet, *New → Database → PostgreSQL*. Dans le service web, onglet *Variables*, ajouter `DATABASE_URL` avec la référence `${{Postgres.DATABASE_URL}}`.
4. **Domaine** : service web → *Settings → Networking → Generate Domain*. Recopier l'URL obtenue dans la variable `APP_URL`.
5. **Clé e-mail** : ajouter `RESEND_API_KEY` (et `MAIL_FROM` si un domaine est vérifié).
6. **Notifications push** (facultatif) : sur un ordinateur, dans le dépôt, lancer `pnpm --filter @comptoirs/server vapid`. La commande affiche une clé publique et une clé privée : les copier dans `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY`. Ne jamais publier la clé privée ; en changer invalide les abonnements des joueurs.
7. Railway redéploie. Le contrôle de santé `/api/health` doit passer au vert.
8. **Vérification du jalon** : ouvrir l'URL sur un téléphone, demander un lien, l'ouvrir depuis l'e-mail, choisir un nom de marchand. Sur iPhone : *Partager → Sur l'écran d'accueil* ; sur Android : *Installer l'application*.

Coût indicatif : l'offre Hobby de Railway (environ 5 $ par mois, usage inclus) suffit au jalon 2 ; Resend est gratuit jusqu'à 3 000 e-mails par mois. Ces tarifs évoluent : vérifier sur les sites.

## E-mails de connexion (Resend)

Sans domaine vérifié, Resend n'envoie qu'à l'adresse du compte Resend lui-même (`onboarding@resend.dev`, l'expéditeur par défaut) : toute autre personne qui demande un lien de connexion voit « L'e-mail n'a pas pu être envoyé », et le journal du serveur montre `Resend: 403 …`. Pour ouvrir le jeu à tous :

1. Sur resend.com, *Domains → Add Domain* : un domaine (ou sous-domaine, par exemple `mail.mondomaine.fr`) qui vous appartient.
2. Ajouter chez le registraire du domaine les enregistrements DNS que Resend affiche (SPF, DKIM), attendre que le domaine passe à *Verified*.
3. Dans Railway, régler `MAIL_FROM`, par exemple `Fondaco <connexion@mail.mondomaine.fr>` (l'adresse doit être sur le domaine vérifié), puis redéployer.

Au démarrage, le serveur avertit dans ses journaux tant que `MAIL_FROM` utilise `resend.dev`.

## Monde de jeu

Les saisons suivent les mois civils (heure de Paris). Au premier démarrage, le serveur crée le monde « Venise 1450 · <mois> », qui commence à cet instant et se termine à la fin du mois (ou du mois suivant s'il reste moins de 14 jours). Les mises à jour reprennent le même monde. Chaque action enregistre en base ses commandes (`world_commands`), avec le grand livre, les mouvements de stock et les échanges, dans la même transaction ; l'état complet (`world_states`) n'est réécrit qu'une fois par minute (ou toutes les 200 versions) et à l'arrêt du service. Au démarrage, le serveur reprend le dernier état complet et rejoue les commandes enregistrées depuis : le moteur est déterministe.

- **Fin de saison** : le premier tick après minuit le 1er du mois fige le classement, distribue les récompenses (Renommée, Pass Négociant), ferme le monde et ouvre le mois suivant. Pour répéter une clôture sur un monde de test : `/admin` → « Fin de saison (répétition) ».
- Un seul exemplaire du service doit tourner (pas de mise à l'échelle horizontale dans Railway) : le monde est tenu en mémoire et les actions sont traitées une par une. Lors d'un déploiement, Railway démarre la nouvelle instance avant d'arrêter l'ancienne : la nouvelle prend la main sur le monde (colonne `world_states.owner`) et l'ancienne s'arrête à sa prochaine écriture. Les parties ouvertes perdent leur ligne en direct et se reconnectent d'elles-mêmes à la nouvelle instance.
- Le marché du PNJ, l'entretien et les chantiers avancent chaque minute ; la production est calculée à la lecture.
- Des maisons marchandes PNJ complètent le monde jusqu'à 40 marchands actifs (`bots.population` dans les réglages du monde) ; elles se retirent à mesure que des joueurs arrivent. Mettre `bots.population` à 0 les arrête.
- **En direct** : chaque partie ouverte garde une ligne WebSocket (`/api/live`, sur le même port que l'API, rien à régler dans Railway). Le serveur y dit à un marchand quand une action a touché ses affaires, et à tous à chaque tick ; la partie relit alors sa vue. Sans cette ligne (réseau qui la coupe), elle relit toutes les 15 s comme avant ; avec, toutes les 60 s par précaution.
- Les notifications (cloche, push) sont calculées chaque minute ; la semaine se clôt à la première minute après chaque période de 7 jours depuis l'ouverture du monde.
- Les six invariants du grand livre sont vérifiés au démarrage puis toutes les heures ; un écart apparaît dans les journaux sous « invariant violations » (et en alerte si `ALERT_WEBHOOK_URL` est réglé).

## Exploitation

- **Sauvegardes** : activer les sauvegardes de la base PostgreSQL dans Railway (onglet *Backups* du service Postgres) et faire une fois un essai de restauration sur une base de test. À défaut, une copie quotidienne avec `pg_dump "$DATABASE_URL" > fondaco-$(date +%F).sql` depuis un poste ou une tâche planifiée.
- **Surveillance** : un service de disponibilité gratuit (UptimeRobot, Better Stack…) qui interroge `https://<domaine>/api/health` toutes les 5 minutes. Le contrôle répond 503 si la base ne répond pas ou si le monde n'a plus avancé depuis 5 minutes. Pour les alertes, créer un webhook dans un salon Discord (*Paramètres du salon → Intégrations → Webhooks*) et le coller dans `ALERT_WEBHOOK_URL`.
- **Intégration continue** : `.github/workflows/ci.yml` lance le lint, les types, les tests et la construction de l'application à chaque push. Ne déployer qu'une branche au vert.
- **Triche** : `/admin` liste les paires de marchands qui échangent souvent entre eux loin du prix de référence. Les offres entre joueurs sont de toute façon limitées au quart et au quadruple du prix de référence.
- **Données personnelles** : chaque joueur peut télécharger ses données et supprimer son compte depuis son profil.
- **Pages légales** : mentions légales (`/mentions-legales`), politique de confidentialité (`/confidentialite`) et conditions d'utilisation (`/conditions`), liées depuis l'écran de connexion et le profil. **Avant d'ouvrir le jeu au public**, remplir dans `apps/web/src/legal/info.ts` ce qui s'affiche en rouge « à compléter » : adresse postale de l'éditeur, e-mail de contact, adresse de l'hébergeur, région d'hébergement choisie dans Railway, garanties des transferts de Railway et de Resend, durée de conservation des journaux. Faire relire les textes avant une diffusion large.
- **Pass Négociant** : désactivé (`pass.enabled` à `false` dans les réglages du monde) ; le profil annonce son arrivée la saison prochaine.

## Sécurité

Voir `docs/audit-securite-2026-10.md`. En production, le serveur :

- envoie une politique de sécurité du contenu (scripts du site seulement, jamais dans le cadre d'un autre site), `nosniff`, `Referrer-Policy` et HSTS ;
- ne fait confiance qu'au **dernier** proxy pour l'adresse du client (`X-Forwarded-For`), celui de Railway. **Si l'on ajoute un proxy devant Railway (Cloudflare…)**, toutes les requêtes sembleraient venir de lui et partageraient les limites de connexion : il faudra alors faire confiance à un saut de plus dans `apps/server/src/app.ts` (`trustProxy`) ;
- refuse les écritures et la ligne en direct ouvertes depuis une autre origine que `APP_URL` : `APP_URL` doit être exactement l'adresse publique du jeu ;
- masque les jetons de connexion dans les journaux ;
- limite le rythme par session (300 actions et 300 vues par minute, 60 messages, 30 abonnements push) et à 5 parties ouvertes par marchand ;
- n'envoie les notifications push qu'aux services des navigateurs (Google, Mozilla, Microsoft, Apple).

L'image tourne sous l'utilisateur `node`, pas `root`. La CI échoue si `pnpm audit --prod` signale une vulnérabilité haute.

## En local

```sh
pnpm install
pnpm dev   # serveur sur :3000 (PGlite dans apps/server/.data), web sur :5173
```

Ouvrir http://localhost:5173. Sans `RESEND_API_KEY`, l'e-mail de connexion est affiché dans le terminal du serveur : copier le lien dans le navigateur.

Pour utiliser un PostgreSQL local : `DATABASE_URL=postgres://… pnpm dev`. Les tests du serveur tournent sur PGlite, ou sur PostgreSQL avec `TEST_DATABASE_URL=postgres://… pnpm test`.

## Test de charge

```sh
LOAD_DATABASE_URL=postgres://… pnpm --filter @comptoirs/server load -- --players 200 --minutes 10 --push
```

N marchands jouent par l'API (en processus) sur une base créée pour l'occasion : un tick et les PNJ chaque minute, les vues relues comme le ferait l'application (sans `--push`, tous les marchands en ligne toutes les 15 s à la fois), une action par minute environ. Le script affiche les temps de réponse par requête et la taille de l'état complet. Sans `LOAD_DATABASE_URL`, il tourne sur PGlite.

Mesures du 16 octobre 2026, 200 marchands dont 30 % en ligne, PostgreSQL 16 local :

| | Avant | Vue moins chère | + commandes journalisées | + en direct (`--push`) |
| --- | --- | --- | --- | --- |
| Vue (GET /api/game), p50 · p95 | 2,0 s · 2,6 s | 1,1 s · 1,5 s | 1,0 s · 1,4 s | 0,24 s · 0,33 s |
| Action, p50 · p95 | 1,2 s · 2,1 s | 1,0 s · 1,8 s | 0,75 s · 1,4 s | 0,21 s · 0,45 s |
| Commande enregistrée, p50 | 0,40 s | 0,06 s | 0,03 s | 0,02 s |

L'état complet pèse environ 450 Ko pour 200 marchands. La vue d'un marchand coûte 6 ms de calcul (20 ms avant que le classement soit gardé pour la minute).

## Image Docker

```sh
docker build -t comptoirs .
docker run -p 3000:3000 -e DATABASE_URL=… -e APP_URL=http://localhost:3000 -e RESEND_API_KEY=… comptoirs
```

En cas de limite de téléchargement sur Docker Hub, l'image de base se change avec `--build-arg NODE_IMAGE=…` (par exemple `mirror.gcr.io/library/node:22-slim`).
