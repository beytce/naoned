# Audit du 13 novembre 2026 — 06. Expert UX/UI et direction artistique

Auditeur : expert UX/UI et direction artistique. Référence : la règle d'or 8 (« Tout se voit »), la toile de l'audit visuel validée par le porteur le 11 novembre (`docs/audit-visuel-2026-11-11/00-audit.md`, ses captures `apres/`), la marque (`apps/web/brand/`), Porcellana (`docs/plan-porcellana.md` : un monde blanc porcelaine, un seul accent rouge, des bâtiments biseautés, la fiche au clic).
Serveur à moi (port 3666, base PGlite neuve, lundi 16 novembre 2026, 10 h), web déjà construit, Chromium en WebGL logiciel. Captures : `docs/audit-2026-11-13/captures/ux/` ; maquette de la pile réorganisée : `captures/ux/maquette-pile.html` (et `.png`).

## 1. Verdict

**Est-ce beau, clair et cohérent ? 5,5 / 10.** (Beau : 7. Clair : 4. Cohérent : 5,5.)

La matière tient toujours : la porcelaine, les biseaux, l'eau d'un tenant qui vire à l'encre, la Passe qui se lit d'un coup, l'île au terrain coloré et la marque à l'arche sont les plus beaux objets du jeu, et chaque fiche, prise seule, est propre (Nunito et Manrope, une croix, une touche rouge). Mais depuis la toile du 11 novembre, sept fonctions sont arrivées (Compagnie, Guerre, Marée, Muda, Gazette, Problème du jour, détroits noirs), et chacune s'est posée **par-dessus** la planche au lieu de s'y fondre : six pilules cerclées de rouge sous le médaillon, une quarantaine d'étiquettes en sept styles qui se chevauchent, des fiches de texte et de listes. La planche validée par le porteur (`apres/planche-pc.jpg` : huit Maisons, dix étiquettes, un fil rouge en héros) est devenue un tableau d'affichage où le fil, seul geste du jeu, ne se voit plus.

## 2. Ce que j'ai fait

- **Lundi 16 novembre, 10 h (heure du jeu)**, sur un téléphone (390 × 844, tactile) puis sur un ordinateur (1280 × 800) : page d'accueil, courriel, lien magique, fondation (« Ca' Lustro », « Ca' Smalto »), un atelier bâti (par l'API, pour avoir une île qui produit).
- À l'écran, comme un joueur : la planche à l'échelle du sestiere puis de la lagune ; une ville (Padoue), une tour (Bouche de Cannaregio) ; le médaillon (fiche de la Maison, puis « Ta façade et ton Livre ») ; les six pilules l'une après l'autre (Compagnie, Guerre, Marée, Muda, Gazette, Problème du jour) ; le rang (palais du Doge) ; un détroit noir (le Turc) ; l'île ; « Forcer le passage » jusqu'au damier de la Passe ; quatre tabulations au clavier.
- À chaque écran, une mesure du DOM : couleurs de texte, polices et tailles, cibles de moins de 44 px, champs sans étiquette ; puis un second passage qui compte les étiquettes qui se chevauchent et la place prise par la pile.
- Pour l'assaut en 3D, le Lido, l'Arsenal, la discussion de compagnie et la marée du samedi, je me suis servi des captures récentes des parcours (`docs/guerre-captures/`, `docs/arsenal-captures/`, `docs/compagnie-captures/`, `docs/maree-captures/`), que j'ai relues une à une.
- Limite : je n'ai pas tendu de fil moi-même (l'île n'avait pas encore produit dans la fenêtre de la séance). Le fil est jugé sur `apres/planche-pc.jpg` et `maree-d-2-samedi-planche.png`.

## 3. Constats

| Id | Gravité | Constat | Preuve | Proposition |
| --- | --- | --- | --- | --- |
| UX-1 | P1 | **La pile de six pilules sous le médaillon** (Compagnie, La Guerre, Marée · sem. 1, La Muda, La Gazette, Problème du jour) occupe la colonne gauche de 12 à 329 px de haut et jusqu'à 158 px de large sur téléphone (15 % de l'écran, le haut de la planche) ; elle cache 6 étiquettes au sestiere et 10 à la lagune. Six lieux au même rang, sans ordre ni jour : on ne sait pas lequel attend un geste aujourd'hui. | `p-03-lagune.png` ; mesure DOM : `stack {top 12, bot 329, right 158}`, `pinsUnderStack 10` ; `LabPlanche.tsx:2021-2170` | Remplacer la pile par **la semaine** (un ruban de sept jours en bas, chaque jour porte son objet) et rendre les lieux permanents à la planche (phare, convoi au môle, encre au Large). Maquette : `maquette-pile.png`. |
| UX-2 | P1 | **Le rouge ne veut plus dire « à toi »** : les six pilules sont cerclées de rouge (`box-shadow: 0 0 0 2px #c8102e`), comme Ta Maison, le bouton d'action et les détroits noirs (liseré rouge de « Gênes · L'amiral Doria », « Turc · Le Kapudan Pacha »). Sur la planche au sestiere, on compte au moins dix objets rouges, dont un seul est à toi. | `planche.css:1524` ; `d-03-lagune.png` | Pilules (ou ce qui les remplace) en encre ; le rouge réservé à ta Maison, ton fil, ton pavillon et l'unique action. Le danger (détroit noir, menace) en encre et or, pas en rouge. |
| UX-3 | P1 | **Deux rouges et quatre variantes** : le jeton `--pc-accent` vaut `#c23b2e`, mais 14 occurrences codent `#c8102e` en dur (pilules, drapeau de la Guerre, ombre du focus), plus `#c7372f` (8), `#a8302a` (8), `#e0614f` (4), `#8a2a20` (2), et un saumon `#ff8a7a` pour « ta flottille » à la Guerre. Côte à côte, le rouge des pilules (bleuté) et celui de « Ta Maison » (orangé) se voient. | `grep` des couleurs dans `porcellana/planche`, `passe`, `ile`, `guerre` ; `guerre/assaut.css:285` ; `p-08-guerre.png` (« 0 » saumon) | Un seul rouge par jeton (`--pc-accent`, `--pc-accent-deep` pour l'ombre de la touche) ; interdire les hex rouges en dur (règle de lint sur les fichiers `.css`/`.tsx` de `porcellana/`). |
| UX-4 | P1 | **Les étiquettes se chevauchent et dominent l'image** (déjà le n° 9 de l'audit visuel, aggravé par les 48 Maisons) : au sestiere sur téléphone, 28 étiquettes dont 8 se chevauchent ; à la lagune, 43 étiquettes, 11 paires qui se touchent, 18 étiquettes recouvertes (« Bouche de Cannaregio · Ivo le Borgne » sous « Le canal de Curzola », « Canal 1 · Kemal Reis » sur « Ca' Cappello »). Aucun code d'évitement. | `p-03-lagune.png`, `p-04-ville.png` ; mesure DOM `pairs 11, overlapped 18` ; aucune occurrence de `overlap`/`collide`/`declutter` dans `LabPlanche.tsx`, `PlancheBoard.tsx` | Un tri par priorité (toi, ton rival, ta cible, tes fils, puis le reste) et un regroupement « +3 » dès que deux étiquettes se touchent ; à la lagune, les tours en simple pastille (sceau + cadenas), le nom au toucher. |
| UX-5 | P1 | **Sept styles d'étiquette au lieu d'« une étiquette, trois tailles »** (principe 3 de la toile) : ville (blanche avec jauge), tour (encre), tour à toi ou détroit noir (encre à liseré rouge), ville lointaine (gris ardoise : Murano, Chioggia), Maison (texte gris avec carré), Ta Maison (rouge), rival (blanche cerclée d'encre + badge), plus la sortie d'un capitaine (encre à liseré or) et le nom de sestiere (capitales espacées). | `d-03-lagune.png`, `maree-d-2-samedi-planche.png` | Revenir aux trois tailles de la toile : ville, passage, Maison ; le rouge pour toi seul ; l'état (verrouillé, menacé, tenu) en pictogramme dans l'étiquette, pas en couleur de fond. |
| UX-6 | P1 | **À 1280 px, l'échelle (lagune / sestiere / île) recouvre la dernière pilule** : le panneau est centré à mi-hauteur (`top: 50%`), il commence à 320 px quand « Problème du jour » finit à 331 px. | `d-03-lagune.png`, `d-12-palais.png` ; mesure `scaleTop 320`, `dailyBottom 331` ; `planche.css:257-268` | Ancrer l'échelle en bas à gauche (au-dessus de la nouvelle), ou la mettre dans la bourse ; ne plus rien centrer verticalement dans un coin déjà occupé. |
| UX-7 | P1 | **Sur téléphone, l'échelle a disparu** (`display: none` sous 640 px) : pas de bouton « île » ni « lagune » sur la planche. On n'entre dans son île que par la fiche d'une ville ou de la Maison ; le joueur débutant ne le devine pas. | `planche.css:545-547` ; `p-03-lagune.png` (aucune échelle) | Garder les trois échelons au téléphone, en un segment compact (3 × 44 px) en bas à droite, ou un geste de pincement montré une fois. |
| UX-8 | P1 | **La nouvelle du bas recouvre les fiches** sur téléphone : « Commande scellée à Raguse… » reste posée sur la fiche de la Muda, de la Gazette et de la Marée, et en cache le bas (la route d'Alexandrie, les ligues). | `p-09-muda.png` ; `maree` et `gazette` du même passage | Taire la nouvelle tant qu'une fiche est ouverte (ou la mettre dans la fiche quand elle la concerne). |
| UX-9 | P2 | **À 1280 px, la légende du péril recouvre le bouton d'action** de la fiche : « Voir Ca' Dolfin sur la planche » est coupé par « lagune ━━ le Large · péril » ; même chose sur la fiche de la Marée (dernier paragraphe). | `d-12-palais.png`, `d-11` (dossier de travail) | Fiche de droite limitée à `100vh - 120px` et la légende masquée tant qu'une fiche est ouverte. |
| UX-10 | P1 | **Règle 8 : les fiches sont des textes et des listes.** La Guerre : sous un joli schéma des douze ports, une liste de cartes « Ca' Loredan · Lagune de Murano · Puissance 0 · l'ordinateur » avec douze boutons « Pas aujourd'hui ». Le palais du Doge : « Le Négoce / La Passe / La Garde » en trois paragraphes de texte et une liste de ligues. La Muda : la route d'Alexandrie en liste numérotée. Le Livre : cinq compteurs à zéro et trois lignes de reliques. La Gazette du lundi : une seule phrase. | `p-08-guerre.png`, `d-12-palais.png`, `p-09-muda.png`, `p-06b-livre.png` | Chaque fiche part d'une image : la Guerre = le schéma des ports seul, toucher un port pour l'ouvrir ; la Muda = la route dessinée (Venise → Zara → Curzola → Otrante → Alexandrie, la nef qui avance) ; le palais = un podium et une échelle de ligues dessinée ; la Gazette = une une imprimée, même vide (« premier numéro dimanche »). |
| UX-11 | P1 | **Le combat de l'assaut se raconte en texte** : sous la scène 3D, un journal « Canal sud : une barque touche Galère 3 (1). Canal sud : Galère 3 frappe une barque (2)… » de cinq à dix lignes ; au bilan sur ordinateur, ce journal et la carte « 2 sceaux brisés » flottent à gauche d'une colonne vide. Les étiquettes des trois canaux se chevauchent (« La bouche » glisse sous « Canal nord » et « Canal sud ») ; la ruse est une pastille violette (`#6b3a5e`), un deuxième accent. | `docs/guerre-captures/assaut-p-3-manche.png`, `guerre-d-4-bilan.png` ; `guerre/assaut.css:143` ; `AssautScreen.tsx:379-381` | Les coups joués sur la scène (le boulet qui part, la barque qui coule, le sceau qui casse) ; le journal en repli (un bouton « le récit »). La ruse en encre avec son pictogramme. Au bilan, la carte centrée sous la scène. |
| UX-12 | P2 | **La fiche de la Compagnie** apporte cinq couleurs de pavillon (bleu, vert, ocre, prune, encre) et un ocre `#b07a2a` réutilisé à l'Arsenal ; le bouton « Fonder la compagnie » grisé est le même gris que le fond de la fiche ; « Signaler », sous chaque message, est en rouge comme une action. | `p-07-compagnie.png`, `compagnie-3-discussion.png` ; `Entree.tsx:14`, `Compagnie.tsx:481-488` | Les pavillons gardent leurs couleurs (c'est leur rôle), mais sourdes et seulement sur le drapeau ; « Signaler » en encre douce ; la touche inactive en contour pointillé, pas en aplat gris. |
| UX-13 | P2 | **Vocabulaire et chiffres qui ne s'accordent pas** : la bourse dit « 1ᵉ sur 12 » (le sestiere), le palais « 1ᵉ sur 48 » (la lagune), sans dire de quoi ; l'échelle dit « lagune / sestiere » mais l'ancienne capture « monde / lagune » ; la Guerre dit « sceaux » au milieu d'un score « ta flottille / la flottille adverse ». | `d-12-palais.png` ; `LabPlanche.tsx:728, 2213` ; `Palais.tsx:217` | « 1ᵉ du sestiere » dans la bourse, « 1ᵉ de la lagune » au palais ; un glossaire des écrans de la planche (D1 du plan de publication) relu à chaque nouveau lieu. |
| UX-14 | P1 | **Cibles tactiles trop petites** : les six pilules font 26 px de haut ; les étiquettes de la planche (qui sont des boutons) 32 à 37 px, collées les unes aux autres ; les « + Rive / + Pré » de l'île 32 px ; l'échelle 44 × 48 (bon). Sur téléphone, 51 à 79 éléments touchables de moins de 44 px par écran. | mesure DOM `tinyN` (`audit-p.json`) ; `planche.css:1515-1527` | 44 px minimum pour tout ce qui se touche hors de la planche ; sur la planche, une zone de toucher élargie (padding invisible) et le regroupement d'UX-4. |
| UX-15 | P2 | **Textes trop petits** : 8 px pour les noms des ports de la Guerre (12 occurrences), 7 px pour les lettres N / P / G du palais, 9 px pour « la lagune ↑ / le Large ↓ » de la marée, 10 px pour « rival », 10,5 px pour les compteurs du Livre et « chantier · 8 min » de l'île. | `audit-p.json` (`small`) ; `p-08-guerre.png`, `d-12-palais.png` | Plancher de 11 px pour tout texte, 12 px pour ce qu'on doit lire ; au-dessous, un pictogramme. |
| UX-16 | P2 | **Contraste limite** : l'encre douce `#7a736a` sur le papier `#f6f4f0` fait 4,26:1 (sous 4,5:1 pour le texte courant) ; le gris `#a8a094` (pastilles vides, légendes) 2,48:1 ; le bouton « Recevoir mon lien » inactif, blanc sur rose pâle, environ 2,2:1, se lit mal alors que c'est le premier geste du jeu. | calcul WCAG ; `p-00-accueil` (dossier de travail) | `--pc-ink-soft` foncé d'un cran (`#6b645c`, 5,3:1) ; le bouton inactif en contour, son texte en encre. |
| UX-17 | P2 | **Champs sans étiquette accessible** : le courriel de l'accueil, le nom de la Maison, le nom et le code de compagnie n'ont ni `<label for>` ni `aria-label` (seulement un `placeholder`). | mesure DOM `noname` sur `00-accueil`, `01-fonder`, `07-compagnie` | `aria-label` ou `<label>` lié pour chaque champ. |
| UX-18 | P2 | **Deux fiches à la fois, et des fiches qui s'empilent sur la planche** : sur téléphone, la fiche monte jusqu'à 70 % de l'écran (Guerre, Compagnie) et la pile de pilules reste visible et active au-dessus ; la planche derrière devient une bande grise (fiche de la Maison : la caméra part, la planche est vide). | `p-07-compagnie.png`, `p-06b-livre.png` | Une fiche ouverte masque la pile (ou la semaine) ; la caméra cadre l'objet de la fiche au-dessus d'elle (ta Maison au-dessus de sa fiche). |
| UX-19 | P2 | **La marée se dit dans un schéma abstrait** (huit carrés gris et une ligne pointillée rouge) alors que la planche montre déjà l'encre au Large. | `maree` (dossier de travail), `docs/maree-captures/maree-d-3-samedi-maree.png` | Ouvrir la marée **sur la planche** : la caméra recule, l'encre monte d'une rangée en animation, les tours menacées clignotent ; la fiche ne garde que les ligues. |

### 3.1 La cohérence, écran par écran

Mesures prises sur téléphone (390 × 844), le lundi 10 h. « Couleurs » : teintes de texte distinctes à l'écran, hors blanc et encre. « < 44 px » : éléments touchables trop petits (la planche comprise). « Image d'abord » : l'écran s'ouvre-t-il sur un objet ou sur du texte ?

| Écran | Accent | Couleurs hors palette | Plus petit texte | < 44 px | Image d'abord ? |
| --- | --- | --- | --- | --- | --- |
| Accueil | rouge marque | aucune | 11,5 px | 0 | oui (planche floutée, trois pictos) |
| Fonder sa Maison | rouge | 5 pavillons | 11 px | 1 | oui (le drapeau) |
| Planche, sestiere | rouge ×10 objets | or (sortie), ardoise | 10 px | 30+ | **non : étiquettes d'abord** |
| Planche, lagune | rouge ×10 objets | or, ardoise | 10 px | 73 | **non** |
| Ville (Padoue) | une touche rouge | aucune | 12 px | 61 | à moitié (jetons de marchandises en texte) |
| Tour | une touche rouge, trois sceaux rouges | aucune | 10,5 px | 52 | à moitié |
| Maison | une touche rouge, médaillon | aucune | 11 px | 52 | non (barre et liste de paliers) |
| Livre | aucune | 4 couleurs de reliques | 10,5 px | 51 | non (compteurs) |
| Compagnie | contour rouge du formulaire | 5 pavillons, ocre | 12 px | 51 | à moitié (le drapeau) |
| Guerre | « 0 » saumon | `#ff8a7a` | **8 px** | 51 | oui puis liste |
| Muda | « dim » en rouge | aucune | 11 px | 51 | oui (jours, nef) puis liste |
| Gazette (lundi) | aucune | aucune | 12 px | 51 | **non : une phrase** |
| Marée | pointillé rouge | or (`#f2c14e`) sur les tours menacées | 9 px | 51 | schéma abstrait |
| Palais du Doge | « Toi : … » en rouge ×3 | aucune | **7 px** | 51 | **non : trois paragraphes** |
| Problème du jour | une touche rouge | aucune | 12 px | 51 | non (texte et touche) |
| Détroit noir | aucune | encre pleine | 12 px | 79 | à moitié (carte encre) |
| Île | une touche rouge, drapeau | terrains (voulus) | 10,5 px | 8 | **oui** |
| Passe | rives rouges, menace en rouge | aucune | 11 px | 0 | **oui** |
| Assaut 3D (captures) | sceaux rouges, ballons rouges | violet de la ruse | ~11 px | — | oui puis **journal en texte** |

Lecture : la grammaire des fiches (titre Nunito 24 px, sous-titre gris, croix ronde, une touche rouge en bas) est tenue partout ; ce qui dérive, ce sont **les couleurs secondaires** (saumon, violet, or, ocre), **les textes minuscules** dans les schémas (Guerre, palais, marée) et **la part du texte** dans les fiches récentes (Guerre, palais, Gazette, Livre, Muda).

### 3.2 Ce qui bouge sur la planche (règle 8)

- **Bouge** : la caméra qui glisse d'une échelle à l'autre ; le nœud du Problème du jour qui bat (1,6 s) ; les barques sur un fil tendu (vu dans les captures, pas dans ma séance) ; la nef de la Muda au môle le samedi ; la marée qui « monte d'une rangée » chaque lundi (en principe : je ne l'ai vue que figée sur les captures).
- **Ne bouge pas, alors qu'il le faudrait** : la sortie d'un capitaine (une étiquette encre à liseré or « Barberousse sort · 16 h », pas de navire qui sort du Large) ; la commande scellée (une phrase en bas, rien sur Raguse) ; le rival (un badge « RIVAL », pas de fil adverse qui s'allonge) ; la Guerre (rien sur la planche ne dit qu'on est en semaine de guerre) ; le phare de la compagnie (il n'existe que dans sa fiche) ; la Gazette (rien ne s'imprime le dimanche).
- **Ce qui est encore un tableau ou une liste** : la liste des ports adverses (Guerre), la liste des étapes de la route (Muda), les ligues (Marée), les trois classements (palais), le journal de l'assaut, les reliques (Livre), la discussion (compagnie, c'est normal).

### 3.3 La pile de lieux réorganisée (schéma en mots)

```
TÉLÉPHONE 390 × 844                          ORDINATEUR 1280 × 800
┌──────────────────────────────┐             ┌──────────────────────────────────────────────┐
│ (◠)¹             ◉ 2 400 ▮▮▮ 1ᵉ │           │ (◠) Ca' Smalto            ◉ 2 400 ▮▮▮▮▮ 1ᵉ du sestiere │
│                              │             │                                  ┌──────────┐ │
│      la planche, dégagée     │             │      la planche, dégagée         │ une fiche│ │
│   phare ⌂ près de ta Maison  │             │                                  │ à la fois│ │
│   nef ⛵ amarrée au môle      │             │                                  │ [action] │ │
│   ▒▒▒ l'encre au Large ▒▒▒   │             │ [lagune|sestiere|île]            └──────────┘ │
│ ┌──────────────────────────┐ │             │        ┌ lun mar mer jeu ven sam dim ┐        │
│ │ lun mar mer jeu ven sam dim│ │           │        └  ●   ⚑   ⚑   ⚑   ⚑   ⛵  ▤  ┘        │
│ │  ●   ⚑   ⚑   ⚑   ⚑   ⛵  ▤ │ │            └──────────────────────────────────────────────┘
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

- **En haut à gauche, le médaillon seul** : il ouvre la Maison (niveau, façade, Livre, profil) ; la compagnie devient un onglet de cette fiche (« ta Maison et les tiens ») et son phare un objet posé près de ta Maison.
- **En haut à droite, la bourse** : ducats, bobines dessinées, rang « du sestiere » ; le rang ouvre le palais.
- **En bas, la semaine** : sept cases de 44 × 58 px au téléphone, 60 × 80 px à l'ordinateur ; aujourd'hui en encre ; chaque jour porte l'objet qui l'occupe (nœud du Problème chaque jour, pavillon de la Guerre du mardi au vendredi, nef de la Muda le samedi, feuille de la Gazette le dimanche) ; **une seule pastille rouge**, sur aujourd'hui, et seulement si un geste t'y attend. Toucher un jour ouvre sa fiche ; la marée se lit dans le titre du ruban (« marée 1, sem. 1 sur 6 ») et l'encre au Large ouvre sa fiche.
- **L'échelle** descend en bas à gauche à l'ordinateur et revient au téléphone en segment compact.
- **Une fiche à la fois** : quand une fiche est ouverte, la semaine se replie en une pastille, la nouvelle et la légende du péril se taisent.

### 3.4 Accessibilité de base

- **Clavier** : la tabulation atteint les étiquettes de la planche dans l'ordre du DOM (la 4ᵉ tabulation tombe sur « Raguse », pas sur le médaillon ni la pile) ; le focus se voit bien (contour encre 2 px et halo rouge). À reprendre : l'ordre (médaillon, bourse, semaine, puis la planche), et un raccourci « aller à ma Maison ».
- **Étiquettes** : les boutons d'icône en ont (médaillon, bobines, rang, Problème du jour, croix « Fermer la fiche ») ; les champs de saisie n'en ont pas (UX-17) ; les 43 étiquettes de la planche sont toutes des boutons lus par un lecteur d'écran, sans regroupement (« Bouche de Cannaregio · Ivo le Borgne », « Ca' Zane »…), ce qui en fait une liste de 50 boutons à parcourir.
- **Contraste** : encre sur papier excellent (16:1) ; blanc sur rouge `#c23b2e` 5,3:1 (bon) ; encre douce `#7a736a` limite (4,26:1) ; gris des pastilles vides `#a8a094` insuffisant (2,48:1) ; bouton inactif de l'accueil insuffisant (UX-16).
- **Mouvements réduits** : respectés partout où je les ai cherchés (planche, île, assaut, pulsations CSS).
- **Langue** : la page déclare `lang="fr"` (`apps/web/dist/index.html`) ; les nombres sont formatés à la française (« 2 400 »).
- **Lecteur d'écran et annonces** : le journal de l'assaut est `aria-live="polite"` (bon) ; la nouvelle du bas et le changement de jour de la semaine ne sont pas annoncés.

### 3.5 Ordre de grandeur de l'effort

| Chantier | Écrans touchés | Effort estimé |
| --- | --- | --- |
| Un seul rouge par jeton, lint des hex en dur | tous | petit (une demi-journée) |
| Échelle en bas à gauche, retour au téléphone ; nouvelle et légende muettes sous une fiche | planche | petit |
| 44 px, 11 px, étiquettes des champs, `--pc-ink-soft` foncé | tous | petit |
| La semaine à la place de la pile | planche, six fiches | moyen (deux à trois jours) |
| Étiquettes en trois tailles et évitement des chevauchements | planche | moyen |
| Fiches qui partent d'une image (Guerre, Muda, palais, marée, Gazette) | cinq fiches | moyen à grand |
| Coups de l'assaut joués sur la scène | assaut 3D | grand |

## 4. Ce qui marche

- **La matière Porcellana** : porcelaine mate, biseaux, l'eau d'un seul tenant lavée vers l'encre, les terres en biscuit. Aucune capture ne ressemble à un autre jeu.
- **La Passe** (`p-16-passe.png`) : deux rives rouges, deux rives noires, les deux comptes côte à côte (« 7 cases manquent à ton fil / 6 à la chaîne »), la menace dite en une ligne rouge, le courant fléché, le capitaine en tête. C'est l'écran le plus fidèle à la règle 8 et à la toile.
- **L'île** (`p-15-ile.png`) : le terrain se voit (argile, sable, pré, forêt, rive), les cases à acheter pâles et pointillées, le chantier daté sur le bâtiment, une seule touche rouge « Bâtir un atelier ».
- **Le schéma des ports de la Guerre** et le ruban des jours de la Muda (lun … dim, sam en encre, dim en rouge) : deux bonnes images, à mettre au premier plan.
- **La marque** : l'arche rouge tracée d'un seul fil, nette à 36 px dans le médaillon et sur la page d'accueil ; le nom « fondaco » en minuscules.
- **La fiche au clic** : une seule touche rouge par fiche, une croix ronde à droite, un titre en Nunito 24 px : la grammaire tient d'une fiche à l'autre (ville, tour, Maison, détroit noir).
- **Deux polices seulement** (Nunito pour les titres et les chiffres, Manrope pour le texte), sur tous les écrans mesurés.
- **Mouvements réduits respectés** : `prefers-reduced-motion` coupe l'animation de la planche, de l'île et de l'assaut (`PlancheBoard.tsx:137`, `IleBoard.tsx:194`, `AssautBoard.tsx:87`) et les pulsations CSS (`planche.css:748, 1468, 1545`).
- **Le focus clavier se voit** (contour encre de 2 px et halo rouge) et les boutons d'icône ont un `aria-label` (médaillon, bobines, rang, Problème du jour).

## 5. Mes trois recommandations prioritaires

1. **Rendre la planche au fil : supprimer la pile, poser la semaine.** Le médaillon seul en haut à gauche, la bourse en haut à droite, un ruban de sept jours en bas (aujourd'hui en encre, une pastille rouge seulement si un geste t'attend) ; le phare de la compagnie, le convoi au môle, l'encre au Large et le palais du Doge deviennent des objets qu'on touche sur la planche. L'échelle descend en bas à gauche (et revient au téléphone). Maquette : `captures/ux/maquette-pile.png`.
2. **Une étiquette, trois tailles, et un tri.** Revenir au principe 3 de la toile : ville, passage, Maison ; rouge pour toi seul ; l'état en pictogramme ; un évitement des chevauchements par priorité avec regroupement « +n ». Et un seul rouge, par jeton, dans tout le code de `porcellana/` (UX-2, UX-3, UX-5).
3. **Chaque fiche part d'une image.** La Guerre ouvre sur le schéma des ports, la Muda sur sa route dessinée, la marée sur la planche elle-même, l'assaut joue ses coups sur la scène ; listes et journaux passent derrière un « détail ». Au passage : 44 px pour toute cible, 11 px de texte au moins, étiquettes des champs, la nouvelle et la légende qui se taisent quand une fiche est ouverte.

## Annexe : captures

| Fichier | Ce qu'elle montre |
| --- | --- |
| `p-03-lagune.png` | Téléphone, la lagune : la pile de six pilules, 43 étiquettes, 11 chevauchements, la nouvelle en bas. |
| `d-03-lagune.png` | Ordinateur, la lagune : l'échelle sur « Problème du jour », les sept styles d'étiquettes, dix objets rouges. |
| `p-04-ville.png` | Téléphone, la fiche de Padoue : propre, mais sous un amas d'étiquettes. |
| `p-07-compagnie.png` | La fondation d'une compagnie : cinq couleurs, la touche inactive grise. |
| `p-08-guerre.png` | La Guerre : le schéma des ports (bon), puis la liste des ports et « Pas aujourd'hui » ×12 ; noms de ports à 8 px ; « 0 » saumon. |
| `p-09-muda.png` | La Muda : le ruban des jours (bon), la route en liste, la nouvelle posée sur la fiche. |
| `d-12-palais.png` | Le palais du Doge : trois paragraphes, « sur 48 » contre « sur 12 » dans la bourse, la légende sur la touche rouge. |
| `p-06b-livre.png` | Le Livre de la Maison : cinq compteurs à zéro et des lignes de reliques ; la planche vide derrière. |
| `p-15-ile.png` | L'île : le terrain qui se voit, une seule touche rouge. |
| `p-16-passe.png` | La Passe : l'écran de référence. |
| `maquette-pile.html` / `.png` | La pile de lieux réorganisée : avant / après, téléphone et ordinateur. |
