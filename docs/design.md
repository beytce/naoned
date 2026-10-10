# Identité visuelle

Comptoirs a sa propre identité : Venise la nuit, des ducats et la lagune. Elle doit rester reconnaissable et ne ressembler ni à un gabarit générique ni à un autre jeu.

## Couleurs

| Rôle | Couleur | Usage |
| --- | --- | --- |
| Nuit | `#13101A` (fonds `#1B1724`, `#241E2F`, `#2E2740`) | Fond de l'application, panneaux |
| Or des ducats | `#F4B740` | Action principale, argent, titres, éléments actifs |
| Lagune | `#2FC6B4` | Production, prix de vente, progression |
| Vermillon | `#EF5A4C` | Alertes, erreurs, matériaux manquants |
| Crème | `#F7EAD7` | Texte |

## Typographie (embarquée, sans appel à Google)

- **Unbounded** : titres, chiffres et boutons, en majuscules.
- **Space Grotesk** : texte courant.
- **Space Mono** : petits libellés en majuscules très espacées (`.label`).

## Formes

- Boutons et badges **en biais** (`skewX(-10deg)`) avec une ombre décalée de couleur contrastée (`Slab`).
- Panneaux en **cartouche** : coin supérieur droit coupé (`Panel`).
- Onglets soulignés en **deux couleurs** : lagune et or (`Tabs`).
- Barres de progression **rayées** (`Ribbon`), grands chiffres pour l'argent et les comptes à rebours (`Big`).

## Illustrations

Tout est en SVG maison, dans `apps/web/src/art` : ressources, bâtiments (le moulin et la scierie tournent pendant la production), panorama de Venise, scènes des régions, blasons (3 formes × 6 émaux × 8 meubles), Lorenzo le facteur qui guide le joueur, médailles des trophées. Pas d'image externe.

## Guide du joueur

1. **Introduction** : 4 écrans illustrés avant le choix de la région (rejouable depuis le profil ou l'aide).
2. **Lorenzo** : guide interactif qui assombrit l'écran, entoure en or l'élément à toucher et explique pourquoi. Il lit l'état réel du jeu, donc il suit le joueur même s'il fait les choses dans un autre ordre. Un élément ciblé porte un attribut `data-coach`.
3. **Comment jouer** : aide permanente (icône « ? » en haut).
