# Maquettes Lagune du 28 octobre 2026

Ces fichiers sont les sources des maquettes cliquables de la refonte UX. Ils ont d'abord été faits dans un canevas privé claude.ai (https://claude.ai/artifact/4ZEBS1oVaE5tm7asDHtunN, visible seulement si le porteur le partage). Ils ont ensuite été corrigés selon `docs/audit-ux-expert-2026-10-28.md`.

Le plan de mise en œuvre est dans `docs/plan-refonte-ux.md` : décisions finales, correspondance avec `apps/web`, ordre des lots. **C'est lui qu'on lit d'abord.**

## Lire un fichier

Chaque `X.dc.html` est un écran de 390 × 844 px. Il ne s'ouvre pas tel quel dans un navigateur : il a besoin du moteur du canevas, `support.js`, qui n'est pas ici. Il se lit comme une spécification :

- **`<helmet>`** : les polices et le CSS. Les animations y sont, avec leurs durées et leurs courbes (`@keyframes`), ainsi que la règle `prefers-reduced-motion`.
- **`<x-dc>`** : le balisage.
  - `{{x}}` est une valeur calculée ;
  - `<sc-for list as>` est une boucle ;
  - `<sc-if value>` est une condition ;
  - `onClick="{{fn}}"` est un geste ;
  - `<a href="Y.dc.html">` mène à un autre écran.
- **`<script type="text/x-dc">`** : `class Component extends DCLogic`, avec l'état (`this.state`) et `renderVals()`, qui renvoie les valeurs du balisage. On y trouve les enchaînements, par exemple `setTimeout` pour une animation en plusieurs temps.
- **`data-props`** : des réglages de démonstration.
  - `Aujourdhui` : `done` (tâches faites, le coffre s'ouvre) ;
  - `Mole` : `evening` (le soir ou de jour) et `closed` (lot adjugé).

`canvas.json` donne :
- la place et le titre de chaque écran ;
- les **notes d'interaction** (`notes.n1` à `n6`), qui décrivent les parcours entre écrans.

## Les écrans

| Fichier | Écran |
| --- | --- |
| `Connexion`, `Metier` | Entrée : e-mail, puis nom et métier |
| `Main` | La carte (refonte simple), fiche d'un lieu, 5 onglets |
| `Cadran` | Le calendrier du mois |
| `Cloche` | Messages |
| `Aujourdhui` | Tâches du jour et coffre |
| `Comptoir`, `Production`, `Batir` | Mes ateliers, un atelier, bâtir |
| `Lettre`, `Atout` | Les moments : la lettre du jour, l'Atout du lundi |
| `Venise` | Les quatre lieux de Venise |
| `Rialto`, `Negoce` | Le Marché ; acheter / vendre une marchandise (briques) |
| `Palais` | Politique : rumeurs, élection, villes |
| `Mole` | Enchères |
| `Canal` | Les 40 palais |
| `Classement`, `Fiche`, `Profil` | Classement et duel ; fiche d'un joueur ; votre Maison |
| `Ville`, `Terraferme` | Une ville (Vérone) ; la Conquête |
| `BonRetour`, `Saison` | Bon retour ; fin du mois |
| `CarteAvant` | L'ancienne carte, gardée pour comparer (à ne pas implémenter) |
