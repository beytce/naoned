# Les tutoriels guidés (8 novembre 2026)

Décision du porteur du 8 novembre 2026 : « le parcours du début est mal fait et peu
compréhensible. Il faut vraiment que le jeu guide sans que le joueur ne puisse cliquer ailleurs
afin de finir facilement le tuto. Ensuite il faut qu'il y ait des tutos pour chaque nouveau truc
(la Porta, la Terraferme) afin que le joueur n'ait pas à tout comprendre par lui-même. »

Ses choix (questions du 8 novembre) :

- **Fin du tutoriel du début** : au Fondaco niveau 2. Le parcours :
  1. bâtir le camp ;
  2. lancer, récolter ;
  3. livrer Padoue ;
  4. bâtir la scierie ;
  5. acheter au Marché ce qui manque ;
  6. monter le Fondaco.
- **Sortie** : aucun bouton « Passer » à l'écran. Seul « Passer les tutoriels », dans le profil,
  existe pour les joueurs qui connaissent déjà le jeu.
- **Tutoriels de nouveauté** : la Porta, la Terraferme, la Remise et les véhicules, l'intérieur
  des ateliers.
- **Maisons déjà avancées** : le tutoriel du début ne se rejoue pas. Chaque tutoriel de nouveauté
  se lance à la première ouverture du lieu. « Revoir les tutoriels », dans le profil, les rejoue.

## Le projecteur

`apps/web/src/empire/tutor/Spotlight.tsx`. L'écran est voilé, et une seule chose reste éclairée
(un anneau rouge qui respire). Lorenzo parle dans une bulle, sur l'autre moitié de l'écran. Rien
d'autre ne se touche, et aucune touche du clavier ne ferme quoi que ce soit.

Ce qui est éclairé est le premier élément d'une **chaîne** de sélecteurs qui est en vue et
touchable (rien ne le recouvre en son milieu). La chaîne commence par le geste le plus profond :
le bouton « Bâtir » de la feuille ouverte, sinon « Bâtir un atelier » sur la fiche, sinon la
case. Elle suit donc d'elle-même ce que le joueur ouvre.

Deux secours :
- si une case de la carte est hors de l'écran, la caméra y glisse (`tutor/focus.ts`) ;
- si rien de la chaîne n'est en vue pendant 1,2 s, le chemin du retour s'éclaire : la fermeture
  d'une feuille ou d'une fiche, sinon la Carte.

## Le tutoriel du début

`tutor/script.ts` (pur, testé dans `test/tutor.test.ts`) et `tutor/FirstTutor.tsx`. L'étape se
lit dans l'état de la partie (l'accueil de `next.ts`, puis la scierie, les matériaux du niveau 2,
le Fondaco). Aucun pas n'est mémorisé : un rechargement reprend où l'on en est. Les trois cartes
d'accueil passent d'abord, sans « Passer ». La dernière carte (« Bravo ! Ton Fondaco monte au
niveau 2 ») se ferme par « Continuer ». Ensuite, la carte de Lorenzo et son bouton rouge
reprennent, sans voile.

Parcours de bout en bout : `pnpm --filter @comptoirs/web e2e:guided`
(`e2e/tutorial-empire.mjs`). Un joueur qui ne touche que ce qui brille doit atteindre la dernière
carte, en 1280×800 et 390×844. Il entre ensuite dans un atelier et y suit le tutoriel de
l'intérieur.

## Les tutoriels de nouveauté

`tutor/features.ts` et `tutor/FeatureTutors.tsx`. Chacun démarre quand son lieu apparaît à
l'écran (`when`), joue une fois sur l'appareil, ne démarre jamais pendant le tutoriel du début,
et s'avance par « Suivant » (« Compris » à la fin). Ce qui est montré n'est pas touchable pendant
l'explication.

| Tutoriel | Déclencheur | Étapes |
|---|---|---|
| Porta | `[data-porta-dock]` | 5 : les terres de Rome, le quai, les portes, lancer, reliques et risques (règle 2) |
| Remise | `[data-remise]` | 4 : la Remise, la flotte, les modèles, livrer |
| Intérieur | `[data-interior-scene]` | 5 : l'en-tête, le goulot, récolter et relancer, poser un poste, le conseil |
| Terraferme | onglet Terraferme de la Compagnie | 3 : une semaine à armes égales, l'empire ne risque rien, le classement |

**La Terraferme** : une autre session déploie la nouvelle Terraferme. Son tutoriel ne s'appuie
que sur l'onglet de la Compagnie et dit les règles qui restent. Une fois son écran posé, il suffit
d'ajouter ses ancres (par exemple `data-terra-*`) dans la chaîne de chaque étape de
`features.ts`, et, s'il le faut, des étapes dans `fr.empire.tutorFeatures.terra`.

## Mémoire

L'appareil seul garde les tutoriels (`localStorage`, clé `fondaco:tutor`, dans `tutor/flags.ts`).
Une fenêtre privée les rejoue, sans dommage.
