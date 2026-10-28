/**
 * The words of the Letter of the day (R10, docs/plan-rupture.md), by the ids of the month's script
 * (`packages/engine/src/themes/venice1450.letters.ts`): who writes, the letter, and for each choice
 * its button and what came of it. The consequences that come days later: [came, did not come].
 */

export interface LetterWords {
  text: string;
  choices: Record<string, [label: string, after: string]>;
}

const endChoices: LetterWords["choices"] = {
  toast: [
    "Lever son verre au mois",
    "Un dernier verre au mois qui finit. Le prochain commence demain.",
  ],
  rest: ["Se reposer", "Vous fermez le comptoir un peu plus tôt. Demain, un nouveau mois."],
};

export const lettersFr = {
  senders: {
    lorenzo: ["Lorenzo", "facteur de San Polo"],
    faraj: ["Faraj", "votre ami d'Alexandrie"],
    contarini: ["La veuve Contarini", "Ca' Contarini, sur le Grand Canal"],
    senate: ["Ser Marin Zane", "secrétaire du Sénat"],
    spy: ["Un Milanais", "sans nom ; l'encre sent l'orange"],
  } as Record<string, [name: string, title: string]>,
  episodes: {
    lorenzo_hello: {
      text: "Messer, je suis Lorenzo, facteur de San Polo. Chaque matin, je vous porterai le courrier de la Maison : des amis, des nobles, des gens du Sénat, et parfois des gens qu'on préfère ne pas connaître. Je ne lis jamais les lettres. Presque jamais.",
      choices: {
        tip: [
          "Un pourboire pour Lorenzo",
          "Lorenzo soulève son bonnet : « Messer est un vrai seigneur. Je m'en souviendrai. »",
        ],
        thanks: ["Le remercier", "« À demain, Messer. » Il repart en sifflant."],
      },
    },
    faraj_loan: {
      text: "Mon frère vénitien, la paix sur ta Maison. Ma caravane de Suez attend à Alexandrie, mais le cadi bloque mes chameaux tant que je n'ai pas payé la douane. Prête-moi de quoi la payer : je te rendrai le double à mon retour, si Dieu le veut et si la mer est calme.",
      choices: {
        lend: [
          "Prêter à Faraj",
          "Votre bourse part pour Alexandrie. Faraj promet de revenir dans six jours.",
        ],
        decline: [
          "Refuser poliment",
          "Faraj ne vous en veut pas : il glisse deux sacs de sel dans sa prochaine galère.",
        ],
      },
    },
    contarini_dowry: {
      text: "Messer, nous ne nous connaissons pas, mais on dit votre Maison honnête. Ma nièce Lucia doit se marier ce mois-ci, et la dot qu'a laissée mon défunt mari s'est perdue chez les notaires. Une veuve n'a que ses amis. Serez-vous de ceux-là ?",
      choices: {
        give: [
          "Aider à la dot",
          "La veuve vous remercie d'une écriture fine. Ca' Contarini vous est ouverte.",
        ],
        regret: ["Décliner", "Un « Fort bien. » glacé. On ne refuse pas deux fois une Contarini."],
      },
    },
    senate_bread: {
      text: "Au marchand de la Maison, salut. Les ouvriers de l'Arsenal manquent de pain cette semaine : les galères ne se calfatent pas le ventre vide. La Sérénissime saura se souvenir de ceux qui l'ont nourrie.",
      choices: {
        give: [
          "Envoyer du pain à l'Arsenal",
          "Le pain part à l'Arsenal. Ser Marin inscrit votre nom dans un registre relié de cuir rouge.",
        ],
        later: ["Pas cette semaine", "Ser Marin ne répond pas. Il n'oublie pas non plus."],
      },
    },
    spy_offer: {
      text: "Signore, je sais par où chevaucheront les lances de Milan ce mois-ci. Une Maison avisée paierait pour l'apprendre avant les autres. Laissez une bourse sous la troisième marche du pont des Bareteri. Brûlez cette lettre.",
      choices: {
        buy: [
          "Laisser la bourse",
          "La bourse disparaît dans la nuit. Une autre lettre viendra, sans doute.",
        ],
        burn: ["Brûler la lettre", "La lettre brûle. Elle sentait l'orange jusque dans la fumée."],
      },
    },
    lorenzo_gondola: {
      text: "Messer, malheur ! Ma gondole a pris l'eau au rio de la Madonnetta, et sans elle je fais ma tournée à pied : vous auriez votre courrier à midi. Quatre planches, et je la remets à flot ce soir.",
      choices: {
        lend: [
          "Lui donner des planches",
          "Lorenzo repart, les planches sur l'épaule, en chantant faux.",
        ],
        laugh: [
          "En rire",
          "« Messer a le cœur dur, mais il a raison : c'est drôle. » Il rit aussi, un peu.",
        ],
      },
    },
    faraj_storm: {
      text: "Mon frère, une tempête nous a jetés sur la côte de Crète. Mes chameaux sont à Alexandrie, mais moi je suis ici, avec un navire sans cordages. Prie pour moi, ou envoie-moi de quoi acheter des cordes : je ne l'oublierai pas.",
      choices: {
        pray: [
          "Prier pour lui",
          "Vous allumez un cierge à San Giacomo di Rialto. Le reste est entre les mains de Dieu.",
        ],
        send: [
          "Envoyer de quoi acheter des cordes",
          "Votre argent part pour la Crète par la première galère.",
        ],
      },
    },
    faraj_market: {
      text: "Mon frère, le marché d'Alexandrie bruisse : le sel de la mer Rouge est bon cette année, et les épices arrivent des Indes. Je peux glisser un peu de l'un ou de l'autre dans ma prochaine galère. Que préfères-tu ?",
      choices: {
        salt: ["Du sel", "Deux sacs de sel arrivent avec la galère du soir."],
        spices: ["Des épices", "Un petit sac d'épices arrive, qui parfume tout l'entrepôt."],
      },
    },
    senate_tax: {
      text: "Messer, le Sénat débat d'une décime pour la guerre contre Milan. Les uns veulent tout donner aux condottieres, les autres garder ouvertes les routes de la marchandise. On écoute les Maisons qui livrent : quel est votre avis ?",
      choices: {
        war: [
          "Pour la guerre",
          "Ser Marin lit votre avis au Sénat. Les condottieres vous saluent au passage.",
        ],
        trade: [
          "Pour le commerce",
          "Ser Marin lit votre avis au Sénat. Les marchands du Rialto hochent la tête.",
        ],
      },
    },
    contarini_tea: {
      text: "Mon ami, venez demain à Ca' Contarini, à l'heure des vêpres. Il y aura le procurateur Morosini, qui cherche des Maisons sûres pour les livraisons de Saint-Marc. Mettez votre plus beau pourpoint.",
      choices: {
        go: [
          "Y aller",
          "Le procurateur Morosini vous passe une commande, et la veuve vous sourit de loin.",
        ],
        excuse: ["S'excuser", "La veuve comprend : les affaires d'abord. Elle vous réinvitera."],
      },
    },
    contarini_cold_note: {
      text: "Messer, on me dit que votre Maison prospère ; j'en suis heureuse pour vous. Nous ne nous sommes guère parlé, vous et moi. Ma nièce cherche encore sa dot, et Venise jase.",
      choices: {
        apologize: [
          "Envoyer un mot et un présent",
          "Un billet revient : « Le présent était de trop. Le mot, non. » La porte de Ca' Contarini s'ouvre.",
        ],
        ignore: ["Ne pas répondre", "Le Grand Canal coule entre vos deux maisons."],
      },
    },
    spy_map: {
      text: "Signore, voici ce qui était promis : une carte, des noms de villes, des jours. Gardez-la pour vous et vos troupes. Ou portez-la au Sénat, si vous aimez les sénateurs plus que l'or. Moi, je ne vous connais pas.",
      choices: {
        keep: [
          "Garder la carte",
          "La carte rejoint votre coffre. Elle pèse plus lourd qu'un parchemin.",
        ],
        hand: [
          "La porter au Sénat",
          "Ser Marin examine longuement la carte : « La Sérénissime vous doit quelque chose. »",
        ],
      },
    },
    rialto_shadow: {
      text: "Messer, un homme vous suit au Rialto depuis trois jours. Manteau gris, bottes de cavalier, et il sent l'orange. Je ne dis rien, je dis juste.",
      choices: {
        warn: [
          "Prévenir les sbires",
          "Les sbires font une ronde. Votre voisin vous remercie : on lui volait ses balles.",
        ],
        ignore: ["Hausser les épaules", "Un manteau gris, à Venise ? Il y en a mille."],
      },
    },
    lorenzo_wedding: {
      text: "Messer, ma fille Nina se marie dimanche à San Polo ! Un gondolier, bon garçon, mauvaise voix. Si Messer avait un peu de vin pour la noce, on boirait à votre Maison toute la nuit.",
      choices: {
        wine: ["Offrir du vin", "On boit à votre Maison jusqu'à l'aube. Le gondolier chante, mal."],
        wishes: ["Envoyer ses vœux", "Lorenzo lit vos vœux à la noce. Nina pleure un peu."],
      },
    },
    faraj_spices: {
      text: "Mon frère, un marchand de Calicut me cède du poivre et du gingembre à bon prix, mais il veut de l'or tout de suite. Je te les passe au prix coûtant : trois sacs, pour l'amitié et pour mon crédit.",
      choices: {
        buy: ["Acheter les épices", "Trois sacs d'épices arrivent, cachetés aux armes de Faraj."],
        decline: ["Pas cette fois", "Faraj les vendra à Gênes. Il soupire, par lettre."],
      },
    },
    senate_census: {
      text: "Messer, le Sénat dresse l'estimo des Maisons : ateliers, entrepôts, véhicules. Ceux qui déclarent tout ont droit à la reconnaissance de la République. Ceux qui déclarent peu ont droit à sa curiosité.",
      choices: {
        honest: [
          "Tout déclarer",
          "Ser Marin tamponne votre déclaration : « Une Maison claire est une Maison sûre. »",
        ],
        vague: ["Rester vague", "Ser Marin lève un sourcil, et un registre."],
      },
    },
    contarini_debt: {
      text: "Mon ami, je dois vous dire une chose. Mon mari devait de l'argent à un banquier de Milan, qui menace de saisir l'entrepôt de Lucia. Je vous rembourserais après la vente des vignes de Conegliano. Ou faut-il le dire au Sénat ?",
      choices: {
        pay: [
          "Payer la dette",
          "Le banquier milanais quitte Ca' Contarini, payé et vexé. La veuve vous prend les mains.",
        ],
        senate: [
          "Prévenir le Sénat",
          "Ser Marin fait expulser le banquier. La veuve est sauvée, et un peu gênée.",
        ],
      },
    },
    contarini_gossip: {
      text: "Messer, savez-vous la dernière ? La femme du procurateur a acheté douze miroirs de Murano, et son mari n'en savait rien. Tout Venise en rit. Venez, je vous dirai le reste.",
      choices: {
        listen: [
          "Aller écouter",
          "Entre deux ragots, la veuve vous glisse le nom d'un acheteur sérieux.",
        ],
        leave: ["Laisser les ragots", "Vous laissez les miroirs au procurateur."],
      },
    },
    lorenzo_rialto: {
      text: "Messer, on parle de votre Maison à l'osteria du Rialto ! Les uns disent que vous montez, les autres que vous tombez. Si Messer payait une tournée, on dirait que vous montez.",
      choices: {
        round: [
          "Payer une tournée",
          "Tout le Rialto boit à votre Maison. Demain, on dira que vous montez.",
        ],
        work: [
          "Retourner au travail",
          "Vous laissez parler le Rialto, et vous travaillez. Le travail paie aussi.",
        ],
      },
    },
    spy_silence: {
      text: "Signore, vous avez gardé ma carte. Le Conseil des Dix paierait cher pour savoir qui l'a achetée. Je suis discret, mais la discrétion a un prix.",
      choices: {
        pay: [
          "Payer son silence",
          "La bourse disparaît sous la troisième marche. Le Milanais ne vous écrira plus. Peut-être.",
        ],
        refuse: [
          "Refuser",
          "« Comme vous voudrez, signore. » L'encre sent l'orange, et la menace.",
        ],
      },
    },
    senate_thanks: {
      text: "Messer, grâce à votre carte, nos troupes ont attendu les lances de Milan au bon gué. Le Sénat vous remercie et a voté une gratification : elle vous attend chez le caissier de Saint-Marc.",
      choices: {
        accept: [
          "Accepter la gratification",
          "Le caissier de Saint-Marc compte vos ducats deux fois. Ser Marin vous salue.",
        ],
        modest: [
          "N'en prendre qu'une part",
          "« La République n'oublie pas la modestie. » Ser Marin vous serre la main.",
        ],
      },
    },
    faraj_poem: {
      text: "Mon frère, ce soir à Alexandrie, la lune se lève sur le port comme une pièce d'argent qu'on n'oserait pas dépenser. Je pense à Venise, et à toi. Réponds-moi en vers, si tu l'oses.",
      choices: {
        verse: [
          "Répondre en vers",
          "Vos vers sont mauvais. Faraj les trouve magnifiques, et vous envoie du sel.",
        ],
        prose: ["Répondre en prose", "Faraj lit votre lettre sur le port, et rit de bon cœur."],
      },
    },
    faraj_yusuf: {
      text: "Mon frère, mon fils Yusuf arrive à Venise pour apprendre le négoce. Il a seize ans, de bonnes mains et trop d'idées. Peux-tu le loger et le nourrir quelques jours ? Il ne mange presque rien, dit sa mère.",
      choices: {
        host: [
          "Héberger Yusuf",
          "Yusuf arrive, mange beaucoup, et pose cent questions sur les livres de compte.",
        ],
        inn: [
          "Lui trouver une auberge",
          "Yusuf s'installe à l'auberge du Lion Blanc. Il passe vous voir quand même.",
        ],
      },
    },
    senate_muda: {
      text: "Messer, les galères de la Muda arrivent, et le Sénat voudrait voir les grandes Maisons à l'incanto du soir. Une salle pleine fait monter les enchères, et la République en profite. Promettez-vous d'y être ?",
      choices: {
        promise: [
          "Promettre d'y être",
          "Ser Marin vous inscrit sur sa liste. Une petite avance suit, pour l'honneur.",
        ],
        decline: ["Ne rien promettre", "« Libre à vous. » Ser Marin raye une ligne."],
      },
    },
    contarini_ball: {
      text: "Mon ami, je donne un bal samedi. Toute la noblesse du Grand Canal y sera, et plus d'un patricien cherche une Maison de confiance pour ses affaires. Je vous ai gardé une place près des musiciens.",
      choices: {
        dance: [
          "Aller danser",
          "Vous dansez mal, mais avec les bonnes personnes. Un patricien vous confie une affaire.",
        ],
        excuse: ["S'excuser", "La veuve soupire : « Le travail, toujours le travail. »"],
      },
    },
    contarini_doors: {
      text: "Messer, Ca' Contarini donne un bal samedi. Vous n'êtes pas invité, mais on dit qu'un présent ouvre bien des portes sur le Grand Canal.",
      choices: {
        gift: ["Envoyer un présent", "Un carton d'invitation arrive le soir même, à votre nom."],
        shrug: ["Passer son chemin", "La musique du bal traverse le canal jusqu'à votre comptoir."],
      },
    },
    lorenzo_acqua: {
      text: "Messer, l'acqua alta est montée cette nuit jusqu'aux marches de Saint-Marc ! Les voisins de la calle ont tout perdu, leur farine flotte dans le canal. Un peu de pain les aiderait. Ou bien Messer protège son entrepôt : c'est juste aussi.",
      choices: {
        help: [
          "Donner du pain aux voisins",
          "Toute la calle vous bénit. Lorenzo dit que vous êtes le meilleur du sestiere.",
        ],
        guard: [
          "Protéger l'entrepôt",
          "Votre entrepôt reste au sec. Vous revendez même vos sacs de sable.",
        ],
      },
    },
    spy_taken: {
      text: "Messer, le Conseil des Dix a arrêté un Milanais cette nuit, sous le pont des Bareteri. Dans ses papiers, une liste de noms ; le vôtre y est. Je vous écris en ami : venez vous expliquer avant qu'on vous l'ordonne.",
      choices: {
        confess: [
          "Tout avouer à Ser Marin",
          "Ser Marin écoute, soupire, et vous fait payer une amende : « La République pardonne à ceux qui parlent. »",
        ],
        deny: ["Nier", "« Comme vous voudrez. » Ser Marin referme le dossier. Pas tout à fait."],
      },
    },
    spy_gone: {
      text: "Messer, le manteau gris du Rialto, celui qui sentait l'orange : on dit que les sbires l'ont pris cette nuit. Le Rialto respire.",
      choices: {
        relief: ["Tant mieux", "Le marché est plus calme, et les affaires meilleures."],
        drink: [
          "Trinquer avec Lorenzo",
          "Lorenzo trinque à la Sérénissime, puis à vous, puis à sa gondole.",
        ],
      },
    },
    faraj_caravan: {
      text: "Mon frère, une deuxième caravane part pour Suez, plus grande que la première. Celui qui y met de l'or en tirera presque le double, si les Bédouins dorment et si la mer est sage. C'est un pari, je ne te le cache pas.",
      choices: {
        invest: [
          "Investir",
          "Votre part part avec les chameaux. Retour dans cinq jours, si Dieu le veut.",
        ],
        decline: [
          "Ne pas parier",
          "Faraj comprend : « Le sage garde ses ducats, le fou garde ses rêves. »",
        ],
      },
    },
    senate_fire: {
      text: "Messer, le feu a pris cette nuit dans les cales de l'Arsenal ! Il faut du bois pour relever les échafaudages avant la prochaine galère. La République paiera, mais elle paie ceux qui viennent.",
      choices: {
        planks: [
          "Envoyer des planches",
          "Vos planches arrivent parmi les premières. Ser Marin vous fait payer sur-le-champ.",
        ],
        pray: ["Prier pour l'Arsenal", "L'Arsenal sera reconstruit. Sans vous."],
      },
    },
    contarini_lucia: {
      text: "Mon ami, Lucia s'est mariée ce matin à San Zaccaria, sa dot enfin retrouvée. Elle voulait vous écrire elle-même, mais elle tremble encore. Vous êtes de nos amis : venez boire à sa santé ce soir.",
      choices: {
        toast: [
          "Boire à sa santé",
          "Le mari de Lucia, armateur, vous fait une proposition qui tombe à pic.",
        ],
        gift: [
          "Offrir un présent aux mariés",
          "Lucia pose votre présent sur sa cheminée. Toute la famille Contarini le voit.",
        ],
      },
    },
    contarini_news: {
      text: "Messer, le Grand Canal ne parle que du mariage de Lucia Contarini. Les gondoliers en chantent les menus, les tailleurs les robes. Vous n'y étiez pas, mais on vous en fait le récit.",
      choices: {
        read: [
          "Lire le récit",
          "Au détour d'un menu, vous apprenez qui achète la soie à Venise cette semaine.",
        ],
        burn: ["Brûler la gazette", "Moins de ragots, plus de travail."],
      },
    },
    lorenzo_retire: {
      text: "Messer, mes genoux me disent qu'il est temps de laisser la tournée au mari de Nina. Il chante mal, mais il rame bien. Pourtant, vous êtes mon meilleur client. Qu'en dites-vous ?",
      choices: {
        stay: [
          "Le convaincre de rester",
          "Lorenzo reste, avec une prime pour ses genoux : « Pour vous, Messer, je ramerai jusqu'à cent ans. »",
        ],
        bless: [
          "Lui souhaiter une bonne retraite",
          "Lorenzo vous offre sa dernière fiasque. Il reviendra quand même, pour bavarder.",
        ],
      },
    },
    yusuf_home: {
      text: "Mon frère, Yusuf rentre à Alexandrie. Il dit que les Vénitiens écrivent tout, même ce qu'ils mangent, et qu'il veut faire pareil. Je te dois mon fils, et ses livres de compte.",
      choices: {
        farewell: [
          "Lui dire au revoir",
          "Yusuf vous laisse deux sacs d'épices et un livre de compte impeccable.",
        ],
        keep: ["Lui proposer de rester", "Yusuf reste encore un peu. Faraj soupire, fier."],
      },
    },
    faraj_ink: {
      text: "Mon frère, l'encre est rare à Alexandrie cette semaine, alors je serai bref : je vais bien, la mer est calme, et je pense à toi. Écris-moi.",
      choices: {
        reply: ["Lui répondre", "Faraj répond par un sac de sel et trois lignes d'encre pâle."],
        silence: ["Plus tard", "La lettre attend sur votre table."],
      },
    },
    senate_book: {
      text: "Messer, votre nom a été prononcé au Sénat, et en bien. On parle de vous pour les grandes affaires de la République : fournitures, galères, ambassades. Ser Marin vous recommande. Acceptez-vous l'honneur ?",
      choices: {
        accept: [
          "Accepter l'honneur",
          "Votre nom entre au registre des Maisons de confiance. Une avance de la République suit.",
        ],
        decline: [
          "Rester discret",
          "« La modestie est rare au Rialto. » Ser Marin vous respecte un peu plus.",
        ],
      },
    },
    senate_note: {
      text: "Messer, le Sénat publie la liste des Maisons qui ont servi la République ce mois-ci. La vôtre n'y est pas, mais il reste quelques jours.",
      choices: {
        read: ["Lire la liste", "Vous y trouvez deux Maisons qui achètent cher. Utile."],
        file: ["Ranger la lettre", "La lettre rejoint la pile des lettres du Sénat."],
      },
    },
    lorenzo_masks: {
      text: "Messer, mon cousin fait les plus beaux masques de la calle des Botteri. Un masque de Maison, ça impressionne au Rialto. Et personne ne sait qui négocie.",
      choices: {
        buy: [
          "Acheter un masque",
          "Votre masque est doré, avec un nez de marchand. Lorenzo applaudit.",
        ],
        none: ["Garder son visage", "Votre visage suffit : on le connaît au Rialto."],
      },
    },
    contarini_will: {
      text: "Mon ami, j'ai fait mon testament, ce qui ne veut pas dire que je compte mourir. Vous y êtes, pour une petite somme ; en attendant, je vous la donne de mon vivant. On ne sait jamais.",
      choices: {
        thanks: [
          "La remercier",
          "La veuve rit : « Ne faites pas cette tête, je vous enterrerai tous. »",
        ],
        refuse: [
          "Refuser avec respect",
          "La veuve range l'argent : « Vous êtes trop fier. C'est pour cela que je vous aime bien. »",
        ],
      },
    },
    contarini_far: {
      text: "Messer, je pars quelques jours dans ma villa de la Brenta : le Grand Canal est trop bruyant en fin de mois. Si vous passez par Padoue, faites-moi signe.",
      choices: {
        reply: [
          "Lui répondre",
          "La veuve vous recommande à un marchand de Padoue. Une petite affaire en sort.",
        ],
        silence: ["Ne pas répondre", "La Brenta est loin, et le mois presque fini."],
      },
    },
    faraj_moon: {
      text: "Mon frère, la nouvelle lune approche, et avec elle un nouveau mois de commerce. Je prépare déjà les ballots. Que te dire de plus ? Que je suis content de t'avoir pour ami à Venise.",
      choices: {
        wait: ["Attendre la nouvelle lune", "Faraj vous attend aussi, de l'autre côté de la mer."],
        reply: [
          "Lui écrire",
          "Faraj répond par un sac de sel et un dessin de pyramide, assez raté.",
        ],
      },
    },
    end_ten: {
      text: "Messer, le mois s'achève, et votre nom est toujours dans le dossier du Milanais. Le Conseil des Dix ne vous accuse de rien : il vous regarde, simplement. Le mois prochain, choisissez vos amis avec soin.",
      choices: endChoices,
    },
    end_two_shores: {
      text: "Messer, quel mois ! Faraj vous appelle son frère, la veuve Contarini son ami, et tout San Polo dit que votre Maison a un pied à Alexandrie et l'autre sur le Grand Canal. À la Maison des deux rives !",
      choices: endChoices,
    },
    end_senate: {
      text: "Messer, à la fin de ce mois, la République vous compte parmi ses Maisons de confiance. Le Sénat ne fait pas de compliments : il tient des registres. Le vôtre est en bonne place.",
      choices: endChoices,
    },
    end_faraj: {
      text: "Mon frère, ce mois-ci tu m'as fait confiance, et je suis revenu. Entre Alexandrie et Venise, il y a mille milles de mer, et un seul ami. La nouvelle lune nous trouvera encore en affaires.",
      choices: endChoices,
    },
    end_palazzo: {
      text: "Mon ami, ce mois-ci vous êtes entré à Ca' Contarini en marchand, et vous en sortez en ami de la famille. Le Grand Canal l'a remarqué : le mois prochain, il vous ouvrira d'autres portes.",
      choices: endChoices,
    },
    end_popular: {
      text: "Messer, à l'osteria, on boit à votre Maison chaque soir. Les nobles ne vous connaissent pas encore, mais le peuple de San Polo, si. Ce n'est pas rien : c'est lui qui rame.",
      choices: endChoices,
    },
    end_plain: {
      text: "Messer, le mois s'achève. Votre Maison a tenu ses comptes et livré ses villes : à Venise, c'est déjà une histoire. Le mois prochain, peut-être, une lettre changera tout.",
      choices: endChoices,
    },
  } as Record<string, LetterWords>,
  followups: {
    lorenzo_tip: [
      "Lorenzo dépose deux fiasques de vin devant votre porte : « De la part de mon cousin, pour un seigneur généreux. »",
      "",
    ],
    faraj_back: [
      "Faraj est revenu ! Sa caravane est passée, et il vous rend le double de votre prêt, avec un sourire grand comme le Nil.",
      "Six jours, puis sept, puis dix : aucune nouvelle de Faraj. La mer a peut-être gardé votre prêt.",
    ],
    lorenzo_fish: [
      "La gondole de Lorenzo flotte de nouveau, et sa femme a cuit du pain pour vous : huit miches, encore tièdes.",
      "",
    ],
    faraj_rope: [
      "Faraj a ses cordes et vous envoie un coupon de soie de Damas : « Pour les cordes, et pour l'amitié. »",
      "",
    ],
    lorenzo_cake: [
      "Nina vous envoie dix miches du pain de la noce, et un merci pour le seigneur qui a fait boire tout San Polo.",
      "",
    ],
    contarini_repaid: [
      "Les vignes de Conegliano sont vendues : la veuve Contarini vous rembourse, avec des intérêts qu'elle refuse de discuter.",
      "Les vignes de Conegliano ont gelé. La veuve vous écrit, désolée : elle ne pourra pas vous rembourser.",
    ],
    yusuf_gift: [
      "Faraj vous envoie deux coupons de soie : « Pour le pain de mon fils, qui parle de toi à chaque repas. »",
      "",
    ],
    faraj_caravan_back: [
      "La caravane est arrivée ! Faraj vous envoie votre part, presque le double de votre mise.",
      "Les Bédouins ne dormaient pas : la caravane est perdue, et votre mise avec elle. Faraj pleure, par lettre.",
    ],
  } as Record<string, [came: string, missed: string]>,
};
