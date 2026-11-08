/**
 * The catalogue (docs/plan-porcellana.md § 4, lot 2): every model of the game, its family, its
 * name, what it does, how its work shows — what the laboratory lays out for the owner to validate,
 * family by family, and what the map will take its models from.
 */
import type { Palette } from "./materials.js";
import { lockedPlot, mountain, rocks } from "./models/decor.js";
import { fondaco } from "./models/fondaco.js";
import { grove, plot } from "./models/ground.js";
import { muranoFurnace, ropeWalk, saltPans, zattera } from "./models/lot7.js";
import { market } from "./models/market.js";
import type { Built, ModelOpts } from "./models/model.js";
import { arsenal, campo, depot, porta, post } from "./models/places.js";
import { salute, town, veniceHouses } from "./models/towns.js";
import { type Vehicle, cart, gondola, mule, rider, ship } from "./models/vehicles.js";
import {
  brickworks,
  clayPit,
  farm,
  field,
  glassworks,
  lumberCamp,
  mill,
  palazzo,
  sandPit,
  sawmill,
} from "./models/workshops.js";

export type Family = "ateliers" | "lieux" | "villes" | "decor" | "vehicules" | "lot7";

export const FAMILIES: { key: Family; name: string }[] = [
  { key: "ateliers", name: "Ateliers" },
  { key: "lieux", name: "Lieux" },
  { key: "villes", name: "Villes" },
  { key: "decor", name: "Décor" },
  { key: "vehicules", name: "Véhicules" },
  { key: "lot7", name: "Lot 7 (propositions)" },
];

export interface Entry {
  key: string;
  family: Family;
  name: string;
  /** What it is, in the card's grey line. */
  sub: string;
  /** How its work shows (empty when nothing in it works). */
  sign: string;
  make?: (P: Palette, o: ModelOpts) => Built;
  vehicle?: (P: Palette, o: ModelOpts) => Vehicle;
  /** It stands by the water (a quay, a ship): the laboratory gives it the lagoon to the south. */
  water?: boolean;
  /** It floats: a model (not a vehicle) laid on a tile of water. */
  floats?: boolean;
}

export const CATALOGUE: Entry[] = [
  // The chains of Venice, proposed for the owner's eye (docs/plan-publication.md lot 7).
  {
    key: "salt_pans",
    family: "lot7",
    name: "Saline de Chioggia",
    sub: "Eau de la lagune → sel",
    sign: "Les tas de sel blanchissent sur les bassins secs.",
    make: saltPans,
  },
  {
    key: "murano",
    family: "lot7",
    name: "Fornace de Murano",
    sub: "Sable + soude du Levant → cristallo",
    sign: "La bouche du four rougeoie, la cheminée fume.",
    make: muranoFurnace,
  },
  {
    key: "rope_walk",
    family: "lot7",
    name: "Corderie de la Tana",
    sub: "Chanvre → cordages, pour l'Arsenal",
    sign: "La roue file, la corde rouge s'allonge.",
    make: ropeWalk,
  },
  {
    key: "zattera",
    family: "lot7",
    name: "Zattera du Cadore",
    sub: "Le bois des Dolomites descend la Piave",
    sign: "Le radeau tangue, le zatterieri rame.",
    make: zattera,
    floats: true,
  },
  {
    key: "lumber_camp",
    family: "ateliers",
    name: "Camp de bûcherons",
    sub: "Bois",
    sign: "La hache frappe le billot.",
    make: lumberCamp,
  },
  {
    key: "sawmill",
    family: "ateliers",
    name: "Scierie",
    sub: "Bois → planches",
    sign: "La lame tourne.",
    make: sawmill,
  },
  {
    key: "mill",
    family: "ateliers",
    name: "Moulin",
    sub: "Blé → farine",
    sign: "Les ailes tournent.",
    make: mill,
  },
  {
    key: "farm",
    family: "ateliers",
    name: "Ferme",
    sub: "Blé",
    sign: "Le grain monte dans le silo.",
    make: farm,
  },
  {
    key: "glassworks",
    family: "ateliers",
    name: "Verrerie",
    sub: "Sable → verre de Murano",
    sign: "Le four rougeoie, la fumée monte.",
    make: glassworks,
  },
  {
    key: "clay_pit",
    family: "ateliers",
    name: "Glaisière",
    sub: "Argile",
    sign: "Le treuil pivote.",
    make: clayPit,
  },
  {
    key: "sand_pit",
    family: "ateliers",
    name: "Sablière",
    sub: "Sable",
    sign: "Le tamis tremble.",
    make: sandPit,
  },
  {
    key: "brickworks",
    family: "ateliers",
    name: "Briqueterie",
    sub: "Argile → briques",
    sign: "Le four rougeoie, les deux cheminées fument.",
    make: brickworks,
  },
  {
    key: "palazzo",
    family: "ateliers",
    name: "Palazzo",
    sub: "Atelier de luxe",
    sign: "La polifora s'éclaire.",
    make: palazzo,
  },
  {
    key: "field",
    family: "ateliers",
    name: "Champ",
    sub: "Les terres d'une ferme",
    sign: "",
    make: field,
  },
  {
    key: "fondaco",
    family: "lieux",
    name: "Le Fondaco",
    sub: "Ton comptoir",
    sign: "Le drapeau flotte.",
    make: fondaco,
  },
  {
    key: "market",
    family: "lieux",
    name: "San Marco",
    sub: "Le Marché · la Dogana",
    sign: "",
    make: market,
  },
  {
    key: "depot",
    family: "lieux",
    name: "La Remise",
    sub: "Le quai",
    sign: "La grue charge.",
    make: depot,
    water: true,
  },
  {
    key: "campo",
    family: "lieux",
    name: "Le Campo",
    sub: "La porte de la Terraferme",
    sign: "",
    make: campo,
  },
  {
    key: "porta",
    family: "lieux",
    name: "La Porta",
    sub: "Vers les terres de Rome",
    sign: "Ouverte, la herse se lève.",
    make: porta,
  },
  {
    key: "arsenal",
    family: "lieux",
    name: "L'Arsenal",
    sub: "Les navires",
    sign: "",
    make: arsenal,
  },
  {
    key: "post",
    family: "lieux",
    name: "Comptoir",
    sub: "Un comptoir de la maison",
    sign: "",
    make: post,
  },
  {
    key: "hamlet1",
    family: "villes",
    name: "Hameau",
    sub: "Ville de taille 1",
    sign: "Ses commandes en caisses au quai.",
    make: (P, o) => town(P, { ...o, size: 1 }),
  },
  {
    key: "hamlet2",
    family: "villes",
    name: "Village",
    sub: "Ville de taille 2",
    sign: "Ses commandes en caisses au quai.",
    make: (P, o) => town(P, { ...o, size: 2 }),
  },
  {
    key: "town3",
    family: "villes",
    name: "Bourg",
    sub: "Ville de taille 3, son campanile",
    sign: "Ses commandes en caisses au quai.",
    make: (P, o) => town(P, { ...o, size: 3 }),
  },
  {
    key: "city4",
    family: "villes",
    name: "Cité",
    sub: "Ville de taille 4, son église",
    sign: "Ses commandes en caisses au quai.",
    make: (P, o) => town(P, { ...o, size: 4 }),
  },
  {
    key: "city5",
    family: "villes",
    name: "Capitale",
    sub: "Ville de taille 5",
    sign: "Ses commandes en caisses au quai.",
    make: (P, o) => town(P, { ...o, size: 5 }),
  },
  {
    key: "venice",
    family: "villes",
    name: "Venise",
    sub: "Ses maisons, leurs cheminées",
    sign: "",
    make: veniceHouses,
    water: true,
  },
  {
    key: "salute",
    family: "villes",
    name: "La Salute",
    sub: "Venise",
    sign: "",
    make: (P) => salute(P),
    water: true,
  },
  {
    key: "grove",
    family: "decor",
    name: "Bosquet",
    sub: "Arbres ronds, cyprès, sapins",
    sign: "",
    make: (P, o) => grove(P, o.seed, 9, undefined, o.keepOff),
  },
  {
    key: "forest",
    family: "decor",
    name: "Forêt",
    sub: "Sapins",
    sign: "",
    make: (P, o) => grove(P, o.seed, 12, ["fir"], o.keepOff),
  },
  {
    key: "rocks",
    family: "decor",
    name: "Rochers",
    sub: "Pierres taillées",
    sign: "",
    make: rocks,
  },
  {
    key: "mountain",
    family: "decor",
    name: "Montagne",
    sub: "Gradins taillés, cime blanche",
    sign: "",
    make: mountain,
  },
  {
    key: "plot",
    family: "decor",
    name: "Parcelle libre",
    sub: "Une case à acheter",
    sign: "Le « + » se lève au toucher.",
    make: (P) => plot(P),
  },
  {
    key: "locked",
    family: "decor",
    name: "Parcelle fermée",
    sub: "La Casa n'y atteint pas encore",
    sign: "",
    make: (P) => lockedPlot(P),
  },
  {
    key: "cart",
    family: "vehicules",
    name: "Charrette",
    sub: "Deux roues, ses caisses",
    sign: "Les roues tournent en route.",
    vehicle: cart,
  },
  {
    key: "mule",
    family: "vehicules",
    name: "Mulet",
    sub: "Deux caisses en bât",
    sign: "Il marche en route.",
    vehicle: mule,
  },
  {
    key: "rider",
    family: "vehicules",
    name: "Cavalier",
    sub: "Sous son drap d'accent",
    sign: "Il marche en route.",
    vehicle: rider,
  },
  {
    key: "ship",
    family: "vehicules",
    name: "Navire",
    sub: "Sa voile d'accent",
    sign: "Il tangue en mer.",
    vehicle: ship,
    water: true,
  },
  {
    key: "gondola",
    family: "vehicules",
    name: "Gondole",
    sub: "Noire, sur la lagune",
    sign: "",
    vehicle: (P) => gondola(P),
    water: true,
  },
];
