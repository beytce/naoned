# Déploiement

Un seul service : le serveur Fastify sert l'API (`/api/…`) et l'application web construite. La base est un PostgreSQL ; les migrations s'appliquent au démarrage. Les e-mails de connexion partent par [Resend](https://resend.com).

## Variables d'environnement

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `DATABASE_URL` | oui | URL PostgreSQL (`postgres://…`), fournie par Railway |
| `APP_URL` | oui | URL publique du jeu, sans `/` final (ex. `https://comptoirs.up.railway.app`) ; sert aux liens de connexion |
| `RESEND_API_KEY` | oui | Clé API Resend |
| `MAIL_FROM` | non | Expéditeur, par défaut `Comptoirs <onboarding@resend.dev>` |
| `VAPID_PUBLIC_KEY` | non | Clé publique des notifications push ; sans elle, notifications dans le jeu seulement |
| `VAPID_PRIVATE_KEY` | non | Clé privée des notifications push (secrète) |
| `VAPID_SUBJECT` | non | Contact de l'émetteur, par défaut `mailto:contact@comptoirs.app` |
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

## Monde de jeu

Au premier démarrage, le serveur crée le monde « Venise 1450 — bêta », qui commence à cet instant et dure 42 jours. Les mises à jour suivantes reprennent le même monde : son état est enregistré en base après chaque action, avec le grand livre, les mouvements de stock et les échanges.

- Un seul exemplaire du service doit tourner (pas de mise à l'échelle horizontale dans Railway) : le monde est tenu en mémoire et les actions sont traitées une par une. Un second exemplaire serait détecté et refusé à la première écriture.
- Le marché du PNJ, l'entretien et les chantiers avancent chaque minute ; la production est calculée à la lecture.
- Des maisons marchandes PNJ complètent le monde jusqu'à 15 marchands actifs (`bots.population` dans les réglages du monde) ; elles se retirent à mesure que des joueurs arrivent. Mettre `bots.population` à 0 les arrête.
- Les notifications (cloche, push) sont calculées chaque minute ; la semaine se clôt à la première minute après chaque période de 7 jours depuis l'ouverture du monde.
- Les six invariants du grand livre sont vérifiés au démarrage puis toutes les heures ; un écart apparaît dans les journaux sous « invariant violations ».

## En local

```sh
pnpm install
pnpm dev   # serveur sur :3000 (PGlite dans apps/server/.data), web sur :5173
```

Ouvrir http://localhost:5173. Sans `RESEND_API_KEY`, l'e-mail de connexion est affiché dans le terminal du serveur : copier le lien dans le navigateur.

Pour utiliser un PostgreSQL local : `DATABASE_URL=postgres://… pnpm dev`. Les tests du serveur tournent sur PGlite, ou sur PostgreSQL avec `TEST_DATABASE_URL=postgres://… pnpm test`.

## Image Docker

```sh
docker build -t comptoirs .
docker run -p 3000:3000 -e DATABASE_URL=… -e APP_URL=http://localhost:3000 -e RESEND_API_KEY=… comptoirs
```

En cas de limite de téléchargement sur Docker Hub, l'image de base se change avec `--build-arg NODE_IMAGE=…`.
