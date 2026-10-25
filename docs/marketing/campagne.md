# Campagne de lancement

La date de lancement n'est pas fixée (décision du porteur, 24 octobre 2026). Le calendrier compte en jours à partir de l'ouverture (J0), qui tombe toujours le 1er d'un mois, puisque les saisons sont des mois civils.

Objectif chiffré, repris du critère de sortie du MVP (`docs/CADRAGE.md`) : **au moins 100 inscrits venus de communautés extérieures** sur une saison, et **25 % encore actifs à J+14**. Budget publicitaire : zéro (communautés, bouche-à-oreille). Cible : adultes de 25 à 55 ans, amateurs de gestion, de stratégie et de tableurs, qui jouent en sessions courtes sur mobile et longues sur PC.

## Le message

**Une phrase** : *Fondaco, le Travian du commerce : bâtissez la plus grande maison marchande de Venise en un mois, contre de vrais joueurs, gratuitement sur PC et mobile.*

Les quatre promesses, dans cet ordre (une par visuel) :

1. **Un mois, une saison, tout le monde repart à zéro** — l'argument décisif face aux jeux par navigateur où les anciens écrasent les nouveaux. On peut arriver le 1er et gagner.
2. **Un vrai marché tenu par les joueurs** — le Rialto, ses offres, les galères de la Muda. Les prix naissent des joueurs, pas d'une table.
3. **Des sessions courtes** — on lance la production, on revient récolter, on charge les mules. Trois minutes sur mobile, une soirée sur PC.
4. **La Terraferme** — une carte de conquête chaque semaine : on pose son comptoir, on lance des fronts contre ses voisins, les nations et Milan, on s'allie. Le premier de la semaine devient Signore et impose un décret au marché la semaine suivante.

Ton : sobre, historique, un peu de panache. On ne promet rien que le jeu ne tient pas : pas de « milliers de joueurs », pas de « gagnez de l'argent ». Le monde est complété par des maisons marchandes tenues par l'ordinateur (marquées PNJ) : le dire si on le demande, c'est un atout (« le monde est vivant dès le premier joueur »).

## Calendrier (J0 : le 1er du mois de l'ouverture, heure de Paris)

| Quand | Quoi |
| --- | --- |
| **J−15 → J−7** | Remplir `apps/web/src/legal/info.ts` (adresse, contact, site). Choisir le domaine et y pointer `APP_URL`. Créer le serveur Discord (salons : #annonces, #aide, #rialto, #terraferme, #bugs). |
| **J−7 → J−1** | Teasing : un visuel par jour sur X/Bluesky/Instagram (posts 01 à 05), bannière Discord. Page itch.io (jeu HTML « lien externe ») avec la key art et les captures. Messages aux modérateurs des subreddits pour vérifier les règles d'autopromotion. |
| **J0 (ouverture)** | Posts Reddit et forums (textes ci-dessous), annonce Discord, story « Jouer gratuitement ». Être présent toute la journée pour répondre. |
| **J1** | Première semaine de la Terraferme : post 04 « Prenez la Terraferme ». |
| **Chaque dimanche soir** | Clôture de la semaine : podium, Signore de la Terraferme et son décret (capture de la carte et du classement). C'est le contenu récurrent qui fait revenir. |
| **Trois jours avant la fin du mois** | « Dernier sprint » (le jeu notifie déjà trois jours avant la fin). |
| **Le 1er du mois suivant** | Cérémonie de clôture : annonce du Doge du mois, invitation à la saison suivante. Bilan chiffré de la campagne (voir « Mesurer »). |

## Où publier

| Canal | Pourquoi | Format |
| --- | --- | --- |
| r/incremental_games, r/BrowserGames, r/WebGames, r/tycoon, r/playmygame | Cœur de cible (gestion, navigateur, sessions courtes) | Post texte + galerie (key art, carte de la Terraferme, Rialto). Lire les règles : la plupart imposent le flair « dev » et une participation hors autopromotion. |
| r/france (le samedi, fil d'autopromotion), r/jeuxvideo, forum jeuxvideo.com « Jeux par navigateur » | Public francophone : l'interface est en français | Post texte FR |
| Serveurs Discord de jeux de gestion et de jeux incrémentaux | Bouche-à-oreille des joueurs assidus | Message court + OG |
| itch.io | Vitrine durable, référencement | Key art, 5 captures PC, 5 captures mobile, texte long |
| X / Bluesky / Instagram / Threads | Rythme quotidien, partage par les joueurs | Posts 1080×1350, story 1080×1920 |
| TikTok / Shorts (facultatif) | La carte qui bouge (charrettes, marches) se montre mieux en vidéo | Enregistrement d'écran mobile de 15 s : récolte → chargement → livraison payée |

## Textes prêts à publier

### Reddit (FR)

> **Fondaco — un jeu de commerce multijoueur à Venise, une saison par mois (gratuit, navigateur PC et mobile)**
>
> Bonjour ! Je développe Fondaco, un jeu de gestion par navigateur dans la Vénétie de 1450. Vous tenez un comptoir : vos ateliers produisent (argile, briques, bois, pain…), vous chargez vos mules et livrez les commandes des villes, vous achetez et vendez au Rialto, le marché tenu par les joueurs.
>
> Ce qui le distingue :
> - **Une saison = un mois civil.** Le 1er, tout le monde repart de zéro ; le meilleur devient Doge.
> - **Les prix viennent des joueurs** (carnet d'ordres), avec un teneur de marché pour que le jeu reste jouable à toute heure.
> - **Sessions courtes** sur mobile, plus longues sur PC si on veut optimiser.
> - Chaque semaine, **la Terraferme** : une carte de conquête entre marchands, nations et Milan. Le premier devient Signore et impose un décret au marché la semaine suivante.
>
> Pas de pay-to-win : pas d'achat de ducats, de ressources ni de vitesse. La saison s'ouvre le 1er [mois]. Tous les retours sont bienvenus, je réponds ici toute la journée.
>
> [lien du jeu]

### Reddit (EN)

À publier seulement une fois l'interface anglaise et ses mentions légales en ligne (E3-8) : lancement d'abord sur les communautés francophones, les posts anglais ensuite.

> **Fondaco — a multiplayer trading game set in 1450 Venice, one season per month (free, browser, PC & mobile)**
>
> Hi! I'm making Fondaco, a browser management game. You run a trading house: your workshops produce clay, bricks, planks and bread, you load your mules to fill city orders, and you trade on the Rialto, a player-driven order book.
>
> - **Seasons last one calendar month**: everyone restarts on the 1st, the top merchant becomes Doge.
> - **Player-made prices**, with a market maker so it's playable at any hour.
> - **Short sessions** on mobile, deeper optimisation on PC.
> - Every week, **the Terraferma**: a conquest map between merchants, nations and Milan. The week's first becomes Signore and imposes a decree on the market for the next week.
>
> No pay-to-win: you can't buy ducats, goods or speed. The game is in English and French (Venetian names kept in Italian). Feedback very welcome!
>
> [game link]

### Discord / message court

> 🦁 **Fondaco** — bâtissez la plus grande maison marchande de Venise en un mois. Ateliers, routes, Rialto entre joueurs, la Terraferme à conquérir chaque semaine. Gratuit, PC et mobile, sans téléchargement. Saison de [mois] ouverte le 1er : [lien du jeu]

### Légendes des visuels

| Visuel | Légende |
| --- | --- |
| `post-01-marchand` | Un comptoir, deux ateliers, 1 000 ducats. Un mois pour devenir le premier marchand de Venise. |
| `post-02-produire` | Vos ateliers tournent pendant que vous vivez. Revenez récolter, chargez vos mules, livrez. |
| `post-03-rialto` | Au Rialto, les prix ne sont pas écrits d'avance : ils naissent des offres des marchands. |
| `post-04-familles` (à refaire : il montre encore les familles) | Posez votre comptoir, lancez vos fronts : chaque semaine, la Terraferme couronne un Signore. |
| `post-05-saison` | Chaque mois, tout le monde repart à zéro. Le meilleur devient Doge. |

## Les visuels

Dans `docs/marketing/visuels/` :

| Fichier | Taille | Usage |
| --- | --- | --- |
| `post-01-marchand.jpg` … `post-05-saison.jpg` | 1080×1350 | Instagram, X, Bluesky, Threads, galerie Reddit |
| `story-1080x1920.jpg` | 1080×1920 | Stories Instagram, TikTok, Shorts (fond) |
| `keyart-1920x1080.jpg` | 1920×1080 | itch.io, dossier de presse, YouTube, annonce Discord |
| `og-1200x630.jpg` | 1200×630 | Aperçu de lien (Open Graph), Discord, X |
| `banner-1500x500.jpg` | 1500×500 | Bannière X, Bluesky, Discord |

Captures brutes de l'interface (sans texte ajouté) dans `docs/marketing/captures/` : PC en 1280×800 (×2), mobile en 390×844 (×3). Elles sont prises dans le vrai jeu ; **la carte des familles est mise en scène** (terres réparties entre les familles, marches en cours, scores de la semaine). **Elle est périmée** : les familles ont été retirées au profit de la Terraferme, et cette capture comme `post-04-familles` sont à refaire sur la carte de la Terraferme (le banc `apps/web/e2e/fixtures/make-terra-midweek.ts` met en scène une semaine). Le reste (ateliers, Rialto, classement, livraisons en route) vient d'une partie réellement jouée.

Pour les refaire après un changement d'interface : `docs/marketing/outils/` (`cap.mjs` prend une capture d'un écran avec Playwright, `mock.mjs` mettait en scène une semaine de familles (à remplacer par la fixture de la Terraferme), `gen.mjs` compose les visuels). Ils supposent `pnpm dev` lancé, un fichier de session Playwright `state.json`, et les polices et captures copiées à côté dans `kit/`.

## Mesurer

- **Inscriptions par canal** : un lien par canal avec `?utm_source=reddit` (etc.). Le jeu ne lit pas encore ces paramètres : en attendant, les compter côté hébergeur (journaux) ou ajouter la question « Comment nous avez-vous connus ? » au Discord. Lire les UTM dans la télémétrie serait un petit ajout (à noter dans `IDEAS.md` si on le veut).
- **Rétention** : tableau `/admin` (J1, J7, J14, sessions par jour) — c'est le chiffre qui compte pour le critère de sortie.
- **Où l'on décroche** : événements `tutorial_step` (les 10 premières minutes).
- Bilan le 1er du mois suivant l'ouverture : inscrits par canal, actifs à J+14, retours qualitatifs (Discord, commentaires Reddit) → ce qu'on garde pour décembre.

## Avant de publier

- [x] Audit de sécurité corrigé (16 octobre).
- [ ] Visuel `post-04-familles` et capture de la carte refaits sur la Terraferme.
- [ ] Pages légales complètes (`apps/web/src/legal/info.ts` : adresse, contact, site, région d'hébergement).
- [ ] Domaine définitif dans `APP_URL` ; balise `og:image` pointant vers `og-1200x630.jpg`.
- [ ] Envoi d'e-mails Resend sur un domaine vérifié (pas `onboarding@resend.dev`), sinon les liens magiques finissent en indésirables.
- [ ] Discord prêt, quelqu'un disponible le jour de l'ouverture pour répondre.
