import { Emblem } from "../art/logo.js";
import { fr } from "../i18n.js";
import { LANG } from "../lang.js";
import { MentionsEn, PrivacyEn, TITLES_EN, TermsEn } from "./LegalEn.js";
import { LEGAL } from "./info.js";
import { Contact, H2, List, Missing, P, value } from "./parts.js";

/** The three legal pages, by their path. */
export const LEGAL_PAGES = {
  "/mentions-legales": "mentions",
  "/confidentialite": "privacy",
  "/conditions": "terms",
} as const;
export type LegalPageName = (typeof LEGAL_PAGES)[keyof typeof LEGAL_PAGES];

export function legalPageAt(pathname: string): LegalPageName | null {
  return LEGAL_PAGES[pathname.replace(/\/$/, "") as keyof typeof LEGAL_PAGES] ?? null;
}

function Mentions() {
  return (
    <>
      <H2>Éditeur</H2>
      <P>
        Fondaco est édité par {LEGAL.publisher}, particulier.
        <br />
        Adresse : {value(LEGAL.address, "adresse postale")}
        <br />
        Contact : <Contact />
      </P>
      <H2>Directeur de la publication</H2>
      <P>{LEGAL.publisher}</P>
      <H2>Hébergement</H2>
      <P>
        Le jeu et sa base de données sont hébergés par {LEGAL.host.name}, {LEGAL.host.city},{" "}
        <a className="text-gold underline" href={LEGAL.host.url}>
          {LEGAL.host.url.replace("https://", "")}
        </a>
        .
        <br />
        Adresse : {value(LEGAL.host.address, "adresse postale de l'hébergeur")}
      </P>
      <H2>Propriété intellectuelle</H2>
      <P>
        Le jeu, ses règles, ses textes, ses illustrations et son code sont la propriété de{" "}
        {LEGAL.publisher}. Toute reproduction, même partielle, sans autorisation écrite est
        interdite. Les polices de caractères sont utilisées sous leur propre licence libre (SIL Open
        Font License).
      </P>
      <H2>Signaler un contenu</H2>
      <P>
        Un message ou un nom de marchand qui vous semble illicite ou blessant peut être signalé
        depuis le jeu (fil de compagnie) ou à l'adresse <Contact />.
      </P>
    </>
  );
}

function Privacy() {
  return (
    <>
      <P>
        Cette page dit quelles données personnelles Fondaco traite, pourquoi, combien de temps, et
        comment exercer vos droits. Fondaco ne vend aucune donnée, n'affiche aucune publicité et
        n'utilise aucun outil de mesure d'audience tiers.
      </P>
      <H2>Responsable du traitement</H2>
      <P>
        {LEGAL.publisher}, joignable à l'adresse <Contact />.
      </P>
      <H2>Données traitées</H2>
      <List
        items={[
          "Votre compte : adresse e-mail, nom de marchand, blason, langue de l'interface, dates de connexion.",
          "Votre partie : région, ateliers, stocks, ducats, offres et échanges au Rialto, livraisons, classements et palmarès.",
          "Votre compagnie, si vous en rejoignez une : son nom, ses membres, la date de votre arrivée, les invitations que vous partagez.",
          "Vos messages dans le fil de votre compagnie, et les signalements que vous faites.",
          "Les mesures d'usage du jeu : sessions, étapes du tutoriel, actions de jeu, rattachées à votre compte.",
          "D'où vient votre compte : le lien partagé (le nom du marchand qui l'a partagé) ou la campagne (paramètres utm) par lesquels vous êtes arrivé, enregistrés à la création du compte.",
          "Des compteurs anonymes de l'entrée dans le jeu (accueil vu, lien demandé, compte créé, région choisie, premier lot), par jour et par campagne, qui ne sont rattachés à personne.",
          "Des données techniques : le cookie de session, les journaux du serveur (qui contiennent l'adresse IP de chaque requête) et, si vous les activez, l'abonnement aux notifications de votre navigateur.",
        ]}
      />
      <H2>Pourquoi, et sur quelle base</H2>
      <List
        items={[
          "Vous connecter (lien envoyé par e-mail) et faire fonctionner votre partie : exécution des conditions d'utilisation que vous acceptez en créant un compte.",
          "Assurer la sécurité du jeu, lutter contre la triche et modérer le fil des compagnies : intérêt légitime de l'éditeur.",
          "Améliorer le jeu à partir des mesures d'usage (rétention, difficulté, équilibre) : intérêt légitime de l'éditeur.",
          "Vous envoyer des notifications sur votre appareil : votre consentement, donné en les activant et retiré en les coupant (profil ou navigateur).",
        ]}
      />
      <H2>Qui y a accès</H2>
      <List
        items={[
          "Les autres joueurs voient votre nom de marchand, votre blason, votre rang, vos offres au Rialto et, dans votre compagnie, vos messages. Jamais votre adresse e-mail.",
          <span key="host">
            {LEGAL.host.name} ({LEGAL.host.city}) héberge le serveur et la base de données. Région
            d'hébergement : {value(LEGAL.hostingRegion, "région choisie dans Railway")}.
          </span>,
          <span key="mail">
            {LEGAL.mail.name} ({LEGAL.mail.address}) envoie les e-mails de connexion : il reçoit
            votre adresse e-mail et le lien.
          </span>,
          "Les services de notification des navigateurs (Google, Mozilla, Apple…) reçoivent l'identifiant de votre abonnement et le texte des notifications, si vous les avez activées.",
        ]}
      />
      <P>
        Ces prestataires sont établis aux États-Unis : vos données peuvent y être traitées. Ces
        transferts s'appuient sur les garanties prévues par le règlement européen (cadre de
        protection des données UE–États-Unis ou clauses contractuelles types) :{" "}
        <Missing what="garanties de Railway et de Resend à vérifier" />.
      </P>
      <H2>Combien de temps</H2>
      <List
        items={[
          "Le lien de connexion : 15 minutes, et une seule utilisation.",
          "La session : 30 jours après la connexion, ou jusqu'à la déconnexion.",
          "Le compte, la partie, les messages et les mesures d'usage : jusqu'à la suppression du compte.",
          <span key="logs">
            Les journaux du serveur : selon la durée de conservation de l'hébergeur (
            <Missing what="durée des journaux de Railway" />
            ).
          </span>,
        ]}
      />
      <P>
        Quand vous supprimez votre compte, votre adresse e-mail, votre nom de marchand, votre
        blason, vos sessions, vos notifications, vos abonnements et vos mesures d'usage sont
        effacés. Votre marchand reste dans la saison en cours sans nom, pour que les échanges des
        autres joueurs restent justes ; vous quittez votre compagnie et vos messages y sont effacés.
      </P>
      <H2>Cookies et stockage</H2>
      <P>
        Fondaco n'utilise qu'un cookie : celui de votre session, indispensable pour rester connecté.
        Le jeu garde aussi sur votre appareil quelques préférences (palette, retours haptiques,
        écrans déjà vus) et, le temps de la visite, la campagne ou le lien partagé par lesquels vous
        êtes arrivé. Aucun cookie publicitaire ni de mesure d'audience : aucun consentement n'est
        donc demandé. Les polices sont servies par le serveur du jeu.
      </P>
      <H2>Vos droits</H2>
      <P>
        Vous pouvez accéder à vos données, les faire rectifier ou effacer, en demander la
        portabilité, vous opposer à un traitement ou en demander la limitation. Depuis votre profil,
        vous pouvez déjà télécharger vos données et supprimer votre compte. Pour le reste, écrivez à{" "}
        <Contact />. Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la
        CNIL (
        <a className="text-gold underline" href="https://www.cnil.fr">
          cnil.fr
        </a>
        ).
      </P>
      <H2>Âge</H2>
      <P>
        Fondaco est ouvert à partir de 15 ans. Avant cet âge, l'accord d'un parent est nécessaire.
      </P>
      <H2>Sécurité</H2>
      <P>
        Pas de mot de passe : la connexion passe par un lien à usage unique. Les liens et les
        sessions ne sont gardés en base que sous forme d'empreinte, et les échanges avec le serveur
        sont chiffrés (HTTPS).
      </P>
    </>
  );
}

function Terms() {
  return (
    <>
      <H2>Objet</H2>
      <P>
        Fondaco est un jeu de commerce multijoueur gratuit, édité par {LEGAL.publisher}. Ces
        conditions s'appliquent dès la création d'un compte.
      </P>
      <H2>Une bêta</H2>
      <P>
        Le jeu est en cours de développement. Ses règles, son équilibrage et ses écrans peuvent
        changer, une saison peut être corrigée ou recommencée, et le service peut être interrompu
        pour maintenance. Il est fourni tel quel, sans garantie de disponibilité.
      </P>
      <H2>Compte</H2>
      <List
        items={[
          "Il faut une adresse e-mail valide et avoir au moins 15 ans (ou l'accord d'un parent).",
          "Un seul compte par personne. Vous êtes responsable de l'accès à votre messagerie, qui donne accès à votre compte.",
          "Le nom de marchand ne doit être ni injurieux, ni trompeur, ni emprunté à une autre personne. Un nom contraire à ces règles peut être changé ou retiré.",
        ]}
      />
      <H2>Gratuité et biens virtuels</H2>
      <P>
        Le jeu est gratuit et ne propose aucun achat. Les ducats, marchandises, ateliers et
        récompenses sont virtuels : ils n'ont aucune valeur monétaire, ne s'échangent pas contre de
        l'argent et ne se cèdent pas, pas plus que les comptes. Un Pass Négociant arrivera la saison
        prochaine ; ses conditions seront publiées avant son ouverture.
      </P>
      <H2>Conduite</H2>
      <P>
        Respectez les autres joueurs. Dans le fil des compagnies sont interdits les insultes, le
        harcèlement, les propos discriminatoires, les contenus illicites et la publicité. Un message
        signalé par trois membres est masqué ; les signalements sont examinés par l'éditeur.
      </P>
      <H2>Triche</H2>
      <P>Sont interdits :</P>
      <List
        items={[
          "jouer avec plusieurs comptes ;",
          "automatiser le jeu (scripts, robots, outils qui jouent à votre place) ;",
          "exploiter un défaut du jeu plutôt que le signaler ;",
          "arranger des échanges entre comptes pour transférer des richesses.",
        ]}
      />
      <P>
        Selon la gravité : avertissement, retrait des classements et des récompenses, suspension ou
        suppression du compte.
      </P>
      <H2>Responsabilité</H2>
      <P>
        L'éditeur fait de son mieux pour que le jeu fonctionne et que les données soient
        sauvegardées, mais ne peut être tenu responsable d'une interruption, d'une perte de
        progression ou de biens virtuels, ni d'un usage du jeu contraire à ces conditions.
      </P>
      <H2>Fin du compte</H2>
      <P>
        Vous pouvez supprimer votre compte à tout moment depuis votre profil. L'éditeur peut
        suspendre ou supprimer un compte qui ne respecte pas ces conditions.
      </P>
      <H2>Modifications</H2>
      <P>
        Ces conditions peuvent évoluer avec le jeu. Un changement important est annoncé dans le jeu
        ; continuer à jouer vaut acceptation.
      </P>
      <H2>Droit applicable</H2>
      <P>
        Ces conditions sont soumises au droit français. En cas de désaccord, écrivez d'abord à{" "}
        <Contact /> pour trouver une solution amiable ; à défaut, les tribunaux français sont
        compétents.
      </P>
      <P>
        Vos données personnelles : voir la{" "}
        <a className="text-gold underline" href="/confidentialite">
          politique de confidentialité
        </a>
        .
      </P>
    </>
  );
}

const TITLES: Record<LegalPageName, string> = {
  mentions: "Mentions légales",
  privacy: "Politique de confidentialité",
  terms: "Conditions d'utilisation",
};

/** A legal page, readable without an account. */
export function LegalPage({ page }: { page: LegalPageName }) {
  const en = LANG === "en";
  const titles = en ? TITLES_EN : TITLES;
  return (
    <main className="mx-auto max-w-2xl px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))]">
      <a href="/" className="label flex items-center gap-2 text-gold">
        <Emblem size={28} /> ← {fr.appName}
      </a>
      <h1 className="mt-6 font-display text-3xl font-extrabold uppercase leading-tight text-cream">
        {titles[page]}
      </h1>
      <p className="meta mt-2">
        {en ? `Last updated: ${LEGAL.updatedEn}` : `Dernière mise à jour : ${LEGAL.updated}`}
      </p>
      {en ? (
        page === "mentions" ? (
          <MentionsEn />
        ) : page === "privacy" ? (
          <PrivacyEn />
        ) : (
          <TermsEn />
        )
      ) : page === "mentions" ? (
        <Mentions />
      ) : page === "privacy" ? (
        <Privacy />
      ) : (
        <Terms />
      )}
      <LegalLinks className="mt-10 border-t border-line pt-5" />
    </main>
  );
}

/** Links to the three pages (login screen, profile, the pages themselves). */
export function LegalLinks({ className = "" }: { className?: string }) {
  return (
    <nav
      aria-label={LANG === "en" ? "Legal information" : "Informations légales"}
      className={`flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted ${className}`}
    >
      {Object.entries(LEGAL_PAGES).map(([path, page]) => (
        <a key={path} href={path} className="underline-offset-2 hover:text-cream hover:underline">
          {(LANG === "en" ? TITLES_EN : TITLES)[page]}
        </a>
      ))}
    </nav>
  );
}
