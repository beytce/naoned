import type { LetterWords, lettersFr } from "./i18n.letters.js";

/** The words of the Letter of the day in English (see `i18n.letters.ts`). */

const endChoices: LetterWords["choices"] = {
  toast: [
    "Raise a glass to the month",
    "One last glass to the month gone. The next begins tomorrow.",
  ],
  rest: ["Rest", "You close the counter a little early. Tomorrow, a new month."],
};

export const lettersEn: typeof lettersFr = {
  senders: {
    lorenzo: ["Lorenzo", "postman of San Polo"],
    faraj: ["Faraj", "your friend in Alexandria"],
    contarini: ["The widow Contarini", "Ca' Contarini, on the Grand Canal"],
    senate: ["Ser Marin Zane", "secretary to the Senate"],
    spy: ["A Milanese", "no name; the ink smells of orange"],
  },
  episodes: {
    lorenzo_hello: {
      text: "Messer, I am Lorenzo, postman of San Polo. Each morning I will bring the House its mail: friends, nobles, men of the Senate, and now and then people one would rather not know. I never read the letters. Almost never.",
      choices: {
        tip: [
          "A tip for Lorenzo",
          'Lorenzo raises his cap: "Messer is a true lord. I shall remember it."',
        ],
        thanks: ["Thank him", '"Until tomorrow, Messer." He leaves whistling.'],
      },
    },
    faraj_loan: {
      text: "My Venetian brother, peace upon your House. My caravan from Suez waits in Alexandria, but the cadi holds my camels until I pay the customs. Lend me enough to pay it: I will give you back twice as much on my return, God willing and the sea calm.",
      choices: {
        lend: [
          "Lend to Faraj",
          "Your purse leaves for Alexandria. Faraj promises to be back in six days.",
        ],
        decline: [
          "Decline politely",
          "Faraj bears no grudge: he slips two sacks of salt onto his next galley.",
        ],
      },
    },
    contarini_dowry: {
      text: "Messer, we have not met, but your House is said to be honest. My niece Lucia is to marry this month, and the dowry my late husband left has been lost among the notaries. A widow has only her friends. Will you be one of them?",
      choices: {
        give: [
          "Help with the dowry",
          "The widow thanks you in a fine hand. Ca' Contarini is open to you.",
        ],
        regret: ["Decline", 'An icy "Very well." One does not refuse a Contarini twice.'],
      },
    },
    senate_bread: {
      text: "To the merchant of the House, greetings. The workmen of the Arsenal lack bread this week: galleys are not caulked on an empty stomach. The Serenissima will remember those who fed her.",
      choices: {
        give: [
          "Send bread to the Arsenal",
          "The bread goes to the Arsenal. Ser Marin writes your name in a register bound in red leather.",
        ],
        later: ["Not this week", "Ser Marin does not answer. Nor does he forget."],
      },
    },
    spy_offer: {
      text: "Signore, I know where the lances of Milan will ride this month. A wise House would pay to learn it before the others. Leave a purse under the third step of the Bareteri bridge. Burn this letter.",
      choices: {
        buy: [
          "Leave the purse",
          "The purse vanishes in the night. Another letter will come, no doubt.",
        ],
        burn: ["Burn the letter", "The letter burns. It smelled of orange even in the smoke."],
      },
    },
    lorenzo_gondola: {
      text: "Messer, disaster! My gondola sprang a leak on the rio della Madonnetta, and without her I walk my round: you would have your mail at noon. Four planks, and she floats again tonight.",
      choices: {
        lend: ["Give him planks", "Lorenzo goes off, planks on his shoulder, singing out of tune."],
        laugh: [
          "Laugh about it",
          '"Messer has a hard heart, but he is right: it is funny." He laughs too, a little.',
        ],
      },
    },
    faraj_storm: {
      text: "My brother, a storm cast us onto the coast of Crete. My camels are in Alexandria, but I am here, with a ship without rigging. Pray for me, or send me enough to buy ropes: I will not forget it.",
      choices: {
        pray: [
          "Pray for him",
          "You light a candle at San Giacomo di Rialto. The rest is in God's hands.",
        ],
        send: ["Send money for ropes", "Your money leaves for Crete on the first galley."],
      },
    },
    faraj_market: {
      text: "My brother, the market of Alexandria hums: the salt of the Red Sea is good this year, and spices are coming in from the Indies. I can slip a little of one or the other onto my next galley. Which do you prefer?",
      choices: {
        salt: ["Salt", "Two sacks of salt come in with the evening galley."],
        spices: ["Spices", "A small sack of spices arrives and scents the whole warehouse."],
      },
    },
    senate_tax: {
      text: "Messer, the Senate debates a tithe for the war against Milan. Some would give everything to the condottieri, others keep the roads of trade open. The Senate listens to the Houses that deliver: what is your view?",
      choices: {
        war: [
          "For the war",
          "Ser Marin reads your view to the Senate. The condottieri salute you in passing.",
        ],
        trade: [
          "For trade",
          "Ser Marin reads your view to the Senate. The merchants of the Rialto nod.",
        ],
      },
    },
    contarini_tea: {
      text: "My friend, come to Ca' Contarini tomorrow at vespers. Procurator Morosini will be there; he is looking for reliable Houses for the deliveries of San Marco. Wear your finest doublet.",
      choices: {
        go: ["Go", "Procurator Morosini places an order with you, and the widow smiles from afar."],
        excuse: [
          "Send apologies",
          "The widow understands: business first. She will invite you again.",
        ],
      },
    },
    contarini_cold_note: {
      text: "Messer, I am told your House prospers; I am glad for you. We have hardly spoken, you and I. My niece is still looking for her dowry, and Venice gossips.",
      choices: {
        apologize: [
          "Send a note and a gift",
          'A card comes back: "The gift was too much. The note was not." The door of Ca\' Contarini opens.',
        ],
        ignore: ["Do not answer", "The Grand Canal flows between your two houses."],
      },
    },
    spy_map: {
      text: "Signore, here is what was promised: a map, names of cities, days. Keep it for yourself and your troops. Or take it to the Senate, if you love senators more than gold. As for me, I do not know you.",
      choices: {
        keep: ["Keep the map", "The map goes into your chest. It weighs more than parchment."],
        hand: [
          "Take it to the Senate",
          'Ser Marin studies the map at length: "The Serenissima owes you something."',
        ],
      },
    },
    rialto_shadow: {
      text: "Messer, a man has been following you at the Rialto for three days. Grey cloak, riding boots, and he smells of orange. I say nothing, I just say.",
      choices: {
        warn: [
          "Warn the constables",
          "The constables make a round. Your neighbour thanks you: someone was stealing his bales.",
        ],
        ignore: ["Shrug", "A grey cloak, in Venice? There are a thousand."],
      },
    },
    lorenzo_wedding: {
      text: "Messer, my daughter Nina marries on Sunday at San Polo! A gondolier, good lad, bad voice. If Messer had a little wine for the wedding, we would drink to your House all night.",
      choices: {
        wine: ["Give wine", "They drink to your House until dawn. The gondolier sings, badly."],
        wishes: [
          "Send your wishes",
          "Lorenzo reads your wishes at the wedding. Nina cries a little.",
        ],
      },
    },
    faraj_spices: {
      text: "My brother, a merchant from Calicut lets me have pepper and ginger at a good price, but he wants gold at once. I pass them on to you at cost: three sacks, for friendship and for my credit.",
      choices: {
        buy: ["Buy the spices", "Three sacks of spices arrive, sealed with Faraj's arms."],
        decline: ["Not this time", "Faraj will sell them in Genoa. He sighs, by letter."],
      },
    },
    senate_census: {
      text: "Messer, the Senate is drawing up the estimo of the Houses: workshops, warehouses, vehicles. Those who declare everything earn the gratitude of the Republic. Those who declare little earn its curiosity.",
      choices: {
        honest: [
          "Declare everything",
          'Ser Marin stamps your declaration: "A clear House is a safe House."',
        ],
        vague: ["Stay vague", "Ser Marin raises an eyebrow, and a register."],
      },
    },
    contarini_debt: {
      text: "My friend, I must tell you something. My husband owed money to a banker of Milan, who threatens to seize Lucia's warehouse. I would repay you once the vineyards of Conegliano are sold. Or should the Senate be told?",
      choices: {
        pay: [
          "Pay the debt",
          "The Milanese banker leaves Ca' Contarini, paid and vexed. The widow takes your hands.",
        ],
        senate: [
          "Warn the Senate",
          "Ser Marin has the banker expelled. The widow is saved, and a little embarrassed.",
        ],
      },
    },
    contarini_gossip: {
      text: "Messer, have you heard? The procurator's wife bought twelve mirrors from Murano, and her husband knew nothing of it. All Venice laughs. Come, I will tell you the rest.",
      choices: {
        listen: [
          "Go and listen",
          "Between two rumours, the widow slips you the name of a serious buyer.",
        ],
        leave: ["Leave the gossip", "You leave the mirrors to the procurator."],
      },
    },
    lorenzo_rialto: {
      text: "Messer, they talk about your House at the Rialto tavern! Some say you are rising, others that you are falling. If Messer paid for a round, they would say you are rising.",
      choices: {
        round: [
          "Pay for a round",
          "The whole Rialto drinks to your House. Tomorrow they will say you are rising.",
        ],
        work: ["Back to work", "You let the Rialto talk, and you work. Work pays too."],
      },
    },
    spy_silence: {
      text: "Signore, you kept my map. The Council of Ten would pay dearly to know who bought it. I am discreet, but discretion has a price.",
      choices: {
        pay: [
          "Pay for his silence",
          "The purse vanishes under the third step. The Milanese will write no more. Perhaps.",
        ],
        refuse: ["Refuse", '"As you wish, signore." The ink smells of orange, and of threat.'],
      },
    },
    senate_thanks: {
      text: "Messer, thanks to your map our troops met the lances of Milan at the right ford. The Senate thanks you and has voted a reward: it awaits you at the treasurer of San Marco.",
      choices: {
        accept: [
          "Accept the reward",
          "The treasurer of San Marco counts your ducats twice. Ser Marin greets you.",
        ],
        modest: [
          "Take only a part",
          '"The Republic does not forget modesty." Ser Marin shakes your hand.',
        ],
      },
    },
    faraj_poem: {
      text: "My brother, tonight in Alexandria the moon rises over the harbour like a silver coin one would not dare to spend. I think of Venice, and of you. Answer me in verse, if you dare.",
      choices: {
        verse: [
          "Answer in verse",
          "Your verses are bad. Faraj finds them magnificent, and sends you salt.",
        ],
        prose: ["Answer in prose", "Faraj reads your letter on the quay, and laughs heartily."],
      },
    },
    faraj_yusuf: {
      text: "My brother, my son Yusuf comes to Venice to learn trade. He is sixteen, with good hands and too many ideas. Can you lodge and feed him for a few days? He eats almost nothing, says his mother.",
      choices: {
        host: [
          "Host Yusuf",
          "Yusuf arrives, eats a great deal, and asks a hundred questions about ledgers.",
        ],
        inn: ["Find him an inn", "Yusuf settles at the White Lion inn. He visits you anyway."],
      },
    },
    senate_muda: {
      text: "Messer, the galleys of the Muda are coming, and the Senate would like to see the great Houses at the evening incanto. A full hall raises the bids, and the Republic profits. Do you promise to be there?",
      choices: {
        promise: [
          "Promise to be there",
          "Ser Marin puts you on his list. A small advance follows, for the honour.",
        ],
        decline: ["Promise nothing", '"As you please." Ser Marin crosses out a line.'],
      },
    },
    contarini_ball: {
      text: "My friend, I give a ball on Saturday. All the nobility of the Grand Canal will be there, and more than one patrician seeks a trusted House for his affairs. I kept you a place near the musicians.",
      choices: {
        dance: [
          "Go and dance",
          "You dance badly, but with the right people. A patrician entrusts you with a deal.",
        ],
        excuse: ["Send apologies", 'The widow sighs: "Work, always work."'],
      },
    },
    contarini_doors: {
      text: "Messer, Ca' Contarini gives a ball on Saturday. You are not invited, but they say a gift opens many doors on the Grand Canal.",
      choices: {
        gift: ["Send a gift", "An invitation arrives that very evening, in your name."],
        shrug: ["Walk on", "The music of the ball drifts across the canal to your counter."],
      },
    },
    lorenzo_acqua: {
      text: "Messer, the acqua alta rose last night up to the steps of San Marco! The neighbours of the calle lost everything; their flour floats in the canal. A little bread would help them. Or Messer guards his warehouse: that is fair too.",
      choices: {
        help: [
          "Give bread to the neighbours",
          "The whole calle blesses you. Lorenzo says you are the best of the sestiere.",
        ],
        guard: ["Guard the warehouse", "Your warehouse stays dry. You even sell your sandbags."],
      },
    },
    spy_taken: {
      text: "Messer, the Council of Ten arrested a Milanese last night under the Bareteri bridge. In his papers, a list of names; yours is on it. I write as a friend: come and explain yourself before you are ordered to.",
      choices: {
        confess: [
          "Confess all to Ser Marin",
          'Ser Marin listens, sighs, and has you pay a fine: "The Republic forgives those who speak."',
        ],
        deny: ["Deny", '"As you wish." Ser Marin closes the file. Not quite.'],
      },
    },
    spy_gone: {
      text: "Messer, the grey cloak of the Rialto, the one who smelled of orange: they say the constables took him last night. The Rialto breathes again.",
      choices: {
        relief: ["Good riddance", "The market is calmer, and business better."],
        drink: [
          "Drink with Lorenzo",
          "Lorenzo drinks to the Serenissima, then to you, then to his gondola.",
        ],
      },
    },
    faraj_caravan: {
      text: "My brother, a second caravan leaves for Suez, larger than the first. Whoever puts gold in it will draw almost twice as much, if the Bedouins sleep and the sea is kind. It is a wager, I will not hide it.",
      choices: {
        invest: ["Invest", "Your share leaves with the camels. Back in five days, God willing."],
        decline: [
          "Do not wager",
          'Faraj understands: "The wise man keeps his ducats, the fool his dreams."',
        ],
      },
    },
    senate_fire: {
      text: "Messer, fire broke out last night in the holds of the Arsenal! Wood is needed to raise the scaffolds before the next galley. The Republic will pay, but it pays those who come.",
      choices: {
        planks: [
          "Send planks",
          "Your planks are among the first to arrive. Ser Marin has you paid on the spot.",
        ],
        pray: ["Pray for the Arsenal", "The Arsenal will be rebuilt. Without you."],
      },
    },
    contarini_lucia: {
      text: "My friend, Lucia married this morning at San Zaccaria, her dowry found at last. She wanted to write to you herself, but she still trembles. You are one of our friends: come and drink to her health tonight.",
      choices: {
        toast: [
          "Drink to her health",
          "Lucia's husband, a shipowner, makes you an offer that comes just in time.",
        ],
        gift: [
          "Give the couple a gift",
          "Lucia puts your gift on her mantelpiece. The whole Contarini family sees it.",
        ],
      },
    },
    contarini_news: {
      text: "Messer, the Grand Canal talks of nothing but the wedding of Lucia Contarini. The gondoliers sing its menus, the tailors its gowns. You were not there, but you are told all about it.",
      choices: {
        read: [
          "Read the account",
          "Between two dishes, you learn who is buying silk in Venice this week.",
        ],
        burn: ["Burn the gazette", "Less gossip, more work."],
      },
    },
    lorenzo_retire: {
      text: "Messer, my knees tell me it is time to leave the round to Nina's husband. He sings badly, but he rows well. And yet you are my best customer. What do you say?",
      choices: {
        stay: [
          "Persuade him to stay",
          'Lorenzo stays, with a bonus for his knees: "For you, Messer, I will row until I am a hundred."',
        ],
        bless: [
          "Wish him a good retirement",
          "Lorenzo gives you his last flask. He will come by anyway, to chat.",
        ],
      },
    },
    yusuf_home: {
      text: "My brother, Yusuf is going home to Alexandria. He says Venetians write everything down, even what they eat, and he wants to do the same. I owe you my son, and his ledgers.",
      choices: {
        farewell: ["Say goodbye", "Yusuf leaves you two sacks of spices and a spotless ledger."],
        keep: ["Ask him to stay", "Yusuf stays a little longer. Faraj sighs, proud."],
      },
    },
    faraj_ink: {
      text: "My brother, ink is scarce in Alexandria this week, so I will be brief: I am well, the sea is calm, and I think of you. Write to me.",
      choices: {
        reply: ["Answer him", "Faraj answers with a sack of salt and three lines of pale ink."],
        silence: ["Later", "The letter waits on your desk."],
      },
    },
    senate_book: {
      text: "Messer, your name was spoken in the Senate, and well. You are mentioned for the great affairs of the Republic: supplies, galleys, embassies. Ser Marin recommends you. Do you accept the honour?",
      choices: {
        accept: [
          "Accept the honour",
          "Your name enters the register of trusted Houses. An advance from the Republic follows.",
        ],
        decline: [
          "Stay discreet",
          '"Modesty is rare at the Rialto." Ser Marin respects you a little more.',
        ],
      },
    },
    senate_note: {
      text: "Messer, the Senate publishes the list of Houses that served the Republic this month. Yours is not on it, but a few days remain.",
      choices: {
        read: ["Read the list", "You find two Houses on it that pay well. Useful."],
        file: ["File the letter", "The letter joins the pile of letters from the Senate."],
      },
    },
    lorenzo_masks: {
      text: "Messer, my cousin makes the finest masks of the calle dei Botteri. A House's mask impresses at the Rialto. And nobody knows who is bargaining.",
      choices: {
        buy: ["Buy a mask", "Your mask is gilded, with a merchant's nose. Lorenzo applauds."],
        none: ["Keep your face", "Your face will do: the Rialto knows it."],
      },
    },
    contarini_will: {
      text: "My friend, I have made my will, which does not mean I intend to die. You are in it, for a small sum; meanwhile, I give it to you while I live. One never knows.",
      choices: {
        thanks: ["Thank her", 'The widow laughs: "Don\'t make that face, I shall bury you all."'],
        refuse: [
          "Refuse respectfully",
          'The widow puts the money away: "You are too proud. That is why I like you."',
        ],
      },
    },
    contarini_far: {
      text: "Messer, I am off for a few days to my villa on the Brenta: the Grand Canal is too noisy at the end of the month. If you pass through Padua, let me know.",
      choices: {
        reply: [
          "Answer her",
          "The widow recommends you to a merchant of Padua. A small deal comes of it.",
        ],
        silence: ["Do not answer", "The Brenta is far, and the month almost over."],
      },
    },
    faraj_moon: {
      text: "My brother, the new moon approaches, and with it a new month of trade. I am already preparing the bales. What more can I tell you? That I am glad to have you as a friend in Venice.",
      choices: {
        wait: ["Wait for the new moon", "Faraj waits for you too, across the sea."],
        reply: [
          "Write to him",
          "Faraj answers with a sack of salt and a rather poor drawing of a pyramid.",
        ],
      },
    },
    end_ten: {
      text: "Messer, the month ends, and your name is still in the Milanese's file. The Council of Ten accuses you of nothing: it simply watches you. Next month, choose your friends with care.",
      choices: endChoices,
    },
    end_two_shores: {
      text: "Messer, what a month! Faraj calls you brother, the widow Contarini calls you friend, and all San Polo says your House has one foot in Alexandria and the other on the Grand Canal. To the House of two shores!",
      choices: endChoices,
    },
    end_senate: {
      text: "Messer, at the end of this month the Republic counts you among its trusted Houses. The Senate pays no compliments: it keeps registers. Yours stands well.",
      choices: endChoices,
    },
    end_faraj: {
      text: "My brother, this month you trusted me, and I came back. Between Alexandria and Venice lie a thousand miles of sea, and a single friend. The new moon will find us still in business.",
      choices: endChoices,
    },
    end_palazzo: {
      text: "My friend, this month you entered Ca' Contarini as a merchant, and you leave it a friend of the family. The Grand Canal has noticed: next month, it will open other doors to you.",
      choices: endChoices,
    },
    end_popular: {
      text: "Messer, at the tavern they drink to your House every evening. The nobles do not know you yet, but the people of San Polo do. That is no small thing: they do the rowing.",
      choices: endChoices,
    },
    end_plain: {
      text: "Messer, the month ends. Your House kept its books and served its cities: in Venice, that is already a story. Next month, perhaps, a letter will change everything.",
      choices: endChoices,
    },
  },
  followups: {
    lorenzo_tip: [
      'Lorenzo leaves two flasks of wine at your door: "From my cousin, for a generous lord."',
      "",
    ],
    faraj_back: [
      "Faraj is back! His caravan got through, and he repays twice your loan, with a smile as wide as the Nile.",
      "Six days, then seven, then ten: no news of Faraj. Perhaps the sea kept your loan.",
    ],
    lorenzo_fish: [
      "Lorenzo's gondola floats again, and his wife baked bread for you: eight loaves, still warm.",
      "",
    ],
    faraj_rope: [
      'Faraj has his ropes and sends you a length of Damascus silk: "For the ropes, and for friendship."',
      "",
    ],
    lorenzo_cake: [
      "Nina sends you ten loaves of the wedding bread, and thanks to the lord who made all San Polo drink.",
      "",
    ],
    contarini_repaid: [
      "The vineyards of Conegliano are sold: the widow Contarini repays you, with interest she refuses to discuss.",
      "The vineyards of Conegliano froze. The widow writes, sorry: she will not be able to repay you.",
    ],
    yusuf_gift: [
      'Faraj sends you two lengths of silk: "For my son\'s bread; he speaks of you at every meal."',
      "",
    ],
    faraj_caravan_back: [
      "The caravan has arrived! Faraj sends your share, almost twice your stake.",
      "The Bedouins were not asleep: the caravan is lost, and your stake with it. Faraj weeps, by letter.",
    ],
  },
};
