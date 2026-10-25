import { LEGAL } from "./info.js";
import { Contact, H2, List, Missing, P, value } from "./parts.js";

/**
 * The legal pages in English (E3-8 of the experts): the same commitments as the French pages,
 * which remain the reference under French law.
 */
export const TITLES_EN = {
  mentions: "Legal notice",
  privacy: "Privacy policy",
  terms: "Terms of use",
} as const;

function FrenchReference() {
  return (
    <P>
      This translation is provided for convenience; in case of difference, the French version
      prevails.
    </P>
  );
}

export function MentionsEn() {
  return (
    <>
      <H2>Publisher</H2>
      <P>
        Fondaco is published by {LEGAL.publisher}, a private individual.
        <br />
        Address: {value(LEGAL.address, "postal address")}
        <br />
        Contact: <Contact />
      </P>
      <H2>Publication director</H2>
      <P>{LEGAL.publisher}</P>
      <H2>Hosting</H2>
      <P>
        The game and its database are hosted by {LEGAL.host.name}, {LEGAL.host.cityEn},{" "}
        <a className="text-gold underline" href={LEGAL.host.url}>
          {LEGAL.host.url.replace("https://", "")}
        </a>
        .
        <br />
        Address: {value(LEGAL.host.address, "host's postal address")}
      </P>
      <H2>Intellectual property</H2>
      <P>
        The game, its rules, texts, illustrations and code are the property of {LEGAL.publisher}.
        Any reproduction, even partial, without written permission is forbidden. The typefaces are
        used under their own free licence (SIL Open Font License).
      </P>
      <H2>Reporting content</H2>
      <P>
        A message or merchant name that seems unlawful or hurtful to you can be reported from the
        game (company thread) or at <Contact />.
      </P>
      <FrenchReference />
    </>
  );
}

export function PrivacyEn() {
  return (
    <>
      <P>
        This page says what personal data Fondaco processes, why, for how long, and how to exercise
        your rights. Fondaco sells no data, shows no advertising and uses no third-party audience
        measurement tool.
      </P>
      <H2>Data controller</H2>
      <P>
        {LEGAL.publisher}, reachable at <Contact />.
      </P>
      <H2>Data processed</H2>
      <List
        items={[
          "Your account: e-mail address, merchant name, coat of arms, interface language, sign-in dates.",
          "Your game: region, workshops, stock, ducats, offers and trades at the Rialto, deliveries, rankings and record.",
          "Your company, if you join one: its name, its members, the date you joined, the invitations you share.",
          "Your messages in your company's thread, and the reports you make.",
          "Measures of game use: sessions, tutorial steps, game actions, linked to your account.",
          "Where your account comes from: the shared link (the name of the merchant who shared it) or the campaign (utm parameters) you arrived by, recorded when the account is created.",
          "Anonymous counters of the way into the game (landing seen, link requested, account created, region chosen, first batch), per day and per campaign, linked to nobody.",
          "Technical data: the session cookie, the server logs (which contain the IP address of each request) and, if you turn them on, your browser's notification subscription.",
        ]}
      />
      <H2>Why, and on what basis</H2>
      <List
        items={[
          "Signing you in (link sent by e-mail) and running your game: performance of the terms of use you accept by creating an account.",
          "Keeping the game secure, fighting cheating and moderating the company threads: the publisher's legitimate interest.",
          "Improving the game from the measures of use (retention, difficulty, balance): the publisher's legitimate interest.",
          "Sending you notifications on your device: your consent, given by turning them on and withdrawn by turning them off (profile or browser).",
        ]}
      />
      <H2>Who has access</H2>
      <List
        items={[
          "Other players see your merchant name, coat of arms, rank, offers at the Rialto and, in your company, your messages. Never your e-mail address.",
          <span key="host">
            {LEGAL.host.name} ({LEGAL.host.cityEn}) hosts the server and the database. Hosting
            region: {value(LEGAL.hostingRegion, "region chosen in Railway")}.
          </span>,
          <span key="mail">
            {LEGAL.mail.name} ({LEGAL.mail.addressEn}) sends the sign-in e-mails: it receives your
            e-mail address and the link.
          </span>,
          "The browsers' notification services (Google, Mozilla, Apple…) receive your subscription's identifier and the text of the notifications, if you turned them on.",
        ]}
      />
      <P>
        These providers are established in the United States: your data may be processed there.
        These transfers rely on the safeguards provided by the European regulation (EU–US Data
        Privacy Framework or standard contractual clauses):{" "}
        <Missing what="Railway's and Resend's safeguards to check" />.
      </P>
      <H2>For how long</H2>
      <List
        items={[
          "The sign-in link: 15 minutes, and a single use.",
          "The session: 30 days after signing in, or until you sign out.",
          "The account, the game, the messages and the measures of use: until the account is deleted.",
          <span key="logs">
            The server logs: according to the host's retention period (
            <Missing what="Railway's log retention" />
            ).
          </span>,
        ]}
      />
      <P>
        When you delete your account, your e-mail address, merchant name, coat of arms, sessions,
        notifications, subscriptions and measures of use are erased. Your merchant stays in the
        current season without a name, so that the other players' trades stay fair; you leave your
        company and your messages there are erased.
      </P>
      <H2>Cookies and storage</H2>
      <P>
        Fondaco uses only one cookie: your session's, needed to stay signed in. The game also keeps
        a few preferences on your device (language, palette, haptics, screens already seen) and, for
        the visit, the campaign or shared link you arrived by. No advertising or audience
        measurement cookie: so no consent is asked. The fonts are served by the game's server.
      </P>
      <H2>Your rights</H2>
      <P>
        You can access your data, have it corrected or erased, ask for its portability, object to a
        processing or ask for its restriction. From your profile, you can already download your data
        and delete your account. For the rest, write to <Contact />. If you believe your rights are
        not respected, you can refer the matter to the CNIL, the French data protection authority (
        <a className="text-gold underline" href="https://www.cnil.fr">
          cnil.fr
        </a>
        ), or to the authority of your country.
      </P>
      <H2>Age</H2>
      <P>Fondaco is open from the age of 15. Below that age, a parent's consent is needed.</P>
      <H2>Security</H2>
      <P>
        No password: signing in goes through a single-use link. Links and sessions are kept in the
        database only as a fingerprint, and exchanges with the server are encrypted (HTTPS).
      </P>
      <FrenchReference />
    </>
  );
}

export function TermsEn() {
  return (
    <>
      <H2>Purpose</H2>
      <P>
        Fondaco is a free multiplayer trading game, published by {LEGAL.publisher}. These terms
        apply from the creation of an account.
      </P>
      <H2>A beta</H2>
      <P>
        The game is under development. Its rules, balance and screens may change, a season may be
        corrected or restarted, and the service may be interrupted for maintenance. It is provided
        as is, with no guarantee of availability.
      </P>
      <H2>Account</H2>
      <List
        items={[
          "You need a valid e-mail address and to be at least 15 (or have a parent's consent).",
          "One account per person. You are responsible for access to your mailbox, which gives access to your account.",
          "The merchant name must be neither insulting, nor misleading, nor borrowed from another person. A name breaking these rules may be changed or removed.",
        ]}
      />
      <H2>Free play and virtual goods</H2>
      <P>
        The game is free and offers no purchase. Ducats, goods, workshops and rewards are virtual:
        they have no monetary value, cannot be exchanged for money and cannot be transferred, any
        more than accounts. If a paid offer ever opens, its terms will be published before it does.
      </P>
      <H2>Conduct</H2>
      <P>
        Respect the other players. In the company threads, insults, harassment, discriminatory
        remarks, unlawful content and advertising are forbidden. A message reported by three members
        is hidden; reports are reviewed by the publisher.
      </P>
      <H2>Cheating</H2>
      <P>The following are forbidden:</P>
      <List
        items={[
          "playing with several accounts;",
          "automating the game (scripts, bots, tools that play for you);",
          "exploiting a flaw of the game rather than reporting it;",
          "arranging trades between accounts to transfer wealth.",
        ]}
      />
      <P>
        Depending on the seriousness: a warning, removal from the rankings and rewards, suspension
        or deletion of the account.
      </P>
      <H2>Liability</H2>
      <P>
        The publisher does their best for the game to work and the data to be backed up, but cannot
        be held liable for an interruption, a loss of progress or of virtual goods, or a use of the
        game contrary to these terms.
      </P>
      <H2>End of the account</H2>
      <P>
        You can delete your account at any time from your profile. The publisher may suspend or
        delete an account that does not respect these terms.
      </P>
      <H2>Changes</H2>
      <P>
        These terms may change with the game. An important change is announced in the game;
        continuing to play means accepting it.
      </P>
      <H2>Applicable law</H2>
      <P>
        These terms are governed by French law. In case of disagreement, first write to <Contact />{" "}
        to find an amicable solution; failing that, the French courts have jurisdiction, without
        prejudice to the protective rules of your country of residence.
      </P>
      <P>
        Your personal data: see the{" "}
        <a className="text-gold underline" href="/confidentialite">
          privacy policy
        </a>
        .
      </P>
      <FrenchReference />
    </>
  );
}
