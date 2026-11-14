/*
 * England Over 40s Cricket — Partnership Prospectus
 * CONTENT FILE. This is the only file to edit when wording, figures or images change.
 * Layout lives in prospectus.css and prospectus.js.
 *
 * Figures: see the Media & Audience Fact Sheet (12 November 2026).
 * "pdfUrl" is the PDF that sits in this folder. Leave it empty to hide the download button.
 */
window.PROSPECTUS = {
  meta: {
    edition: "Partnership Prospectus 2027",
    siteUrl: "https://www.eng40scricket.co.uk/",
    enquiryUrl: "https://www.eng40scricket.co.uk/sponsors/enquiry/",
    email: "englandover40scricket@outlook.com",
    pdfUrl: "England-Over-40s-Cricket-Partnership-Prospectus-2027.pdf"
  },

  hero: {
    eyebrow: "Partnership Prospectus 2027",
    titleLines: ["England", "Over 40s", "Cricket"],
    strap: "Third in the world. Champions at home. Ready for Australia.",
    support: "Recognised and supported by the England and Wales Cricket Board",
    image: { src: "assets/hero.jpg", alt: "An England batter celebrates with arms raised, bat and cap aloft" }
  },

  year: {
    eyebrow: "2026 in numbers",
    heading: "A year that speaks for itself",
    stats: [
      { figure: "3rd", caption: "in the world, from 15 nations at the IMC Over 40s World Cup", feature: true },
      { figure: "3 from 3", caption: "Triple Crown champions on home soil" },
      { figure: "231*", caption: "by Darren Stevens: the highest score in IMC Masters cricket, at any age group" },
      { figure: "4m+", caption: "views on Facebook and Instagram, with no paid promotion" },
      { figure: "19", caption: "matches streamed live with commentary" }
    ],
    body: "England won six of their eight matches at the World Cup in Guyana, beat India 2–0 in the home series and went unbeaten through the Triple Crown.",
    image: { src: "assets/team-world-cup.jpg", alt: "The England Over 40s squad at the 2026 World Cup in Guyana" },
    caption: "The England squad, IMC Over 40s World Cup, Guyana, October 2026."
  },

  about: {
    eyebrow: "Who we are",
    heading: "International cricket for players aged 40 and over",
    intro: "England Over 40s Cricket is the national representative programme for the over-40s game. We select on merit from around 100 of the country's best players in the age group, including former first-class professionals, and compete against the leading cricketing nations at home and overseas.",
    squads: [
      { name: "England Over 40s", text: "The senior side: World Cups, the Triple Crown and one-day internationals." },
      { name: "England Over 40s Lions", text: "The development side, with its own fixtures and touring programme." }
    ],
    pointsTitle: "Run properly",
    points: [
      "Recognised and supported by the England and Wales Cricket Board",
      "Affiliated to International Masters Cricket",
      "A not-for-profit company with a full set of governance policies",
      "Every match live-scored; senior fixtures streamed with commentary"
    ],
    image: { src: "assets/anthem.jpg", alt: "England players line up arm in arm for the national anthem" },
    support: {
      heading: "Recognised and supported by the ECB",
      text: "A letter of support from the England and Wales Cricket Board is available on request."
    },
    leadershipTitle: "Leadership",
    leadership: [
      "Christopher Mays, Director of Cricket",
      "David Hughes, Head Coach",
      "Darren Stevens, Captain",
      "Sean Park, Vice-Captain",
      "Steven Naylor, Director & Commercial Lead"
    ]
  },

  programme: {
    eyebrow: "The 2027 programme",
    heading: "Two tours to Australia. A Triple Crown in Ireland. A full home summer.",
    items: [
      { when: "April", what: "England Lions tour", where: "Brisbane, Australia" },
      { when: "Summer", what: "Home internationals and Lions fixtures", where: "Grounds across England" },
      { when: "Summer", what: "Triple Crown: England, Ireland, Scotland, Wales", where: "Ireland, venue to be announced" },
      { when: "Nov – Dec", what: "England senior tour", where: "Brisbane, Australia" }
    ],
    image: { src: "assets/home-squad.jpg", alt: "The England Over 40s squad at a home fixture in 2026" },
    horizon: {
      label: "On the horizon",
      text: "The next IMC Over 40s T20 World Cup. A two-year partnership beginning in 2027 is positioned to carry through to it."
    },
    note: "Programme correct at 12 November 2026 and subject to confirmation by host boards."
  },

  audience: {
    eyebrow: "Our audience",
    heading: "A focused audience that is hard to reach any other way",
    stats: [
      { figure: "9 in 10", caption: "are men" },
      { figure: "6 in 10", caption: "are aged 35 to 54" },
      { figure: "8 in 10", caption: "are in the United Kingdom" }
    ],
    agesTitle: "Followers by age",
    ages: [
      { label: "18–24", value: 3 },
      { label: "25–34", value: 12 },
      { label: "35–44", value: 31, core: true },
      { label: "45–54", value: 28, core: true },
      { label: "55–64", value: 15 },
      { label: "65+", value: 11 }
    ],
    body: "Beyond the UK, our following is strongest in Pakistan, Australia, South Africa and India: the countries we play. Our Facebook video was watched in more than 100 countries in 2026.",
    image: { src: "assets/batting.jpg", alt: "An England batter cuts the ball during the World Cup in Guyana" },
    source: "Source: Facebook and Instagram audience data, November 2026. Age chart shows Facebook followers."
  },

  reach: {
    eyebrow: "Reach and broadcast",
    heading: "Small programme. Serious reach.",
    social: {
      title: "Social",
      stats: [
        { figure: "4m+", caption: "views across Facebook and Instagram in 2026" },
        { figure: "1.75m", caption: "of them in the four weeks around the World Cup" },
        { figure: "66,000", caption: "people reached in a single day at our peak" },
        { figure: "100%", caption: "organic: nothing boosted, nothing bought" }
      ]
    },
    chart: {
      title: "Instagram views by month, 2026",
      months: [
        { label: "Jan", value: 1597 },
        { label: "Feb", value: 695 },
        { label: "Mar", value: 14866 },
        { label: "Apr", value: 2319 },
        { label: "May", value: 56792 },
        { label: "Jun", value: 24742 },
        { label: "Jul", value: 398220, mark: "Triple Crown", show: "398k" },
        { label: "Aug", value: 126759 },
        { label: "Sep", value: 149968 },
        { label: "Oct", value: 946658, mark: "World Cup", show: "947k", peak: true }
      ],
      caption: "Around 23,000 people a day on Facebook through the World Cup fortnight, and 21,000 a day during the Triple Crown."
    },
    live: {
      title: "Live",
      stats: [
        { figure: "19", caption: "matches streamed live in 2026, with commentary, graphics and replays" },
        { figure: "2,000–3,500", caption: "views a match, rising to almost 7,000 for the World Cup semi-final" },
        { figure: "110,000", caption: "views of England's World Cup matches across our own channel and other broadcasters' streams" },
        { figure: "2×", caption: "Over 40s viewing on our YouTube channel has doubled in 2026" }
      ]
    },
    source: "Source: Meta Business Suite account-level views, 1 January to 11 November 2026, including collaboration posts; YouTube Studio and public YouTube view counts. Views include repeat views. World Cup figure is approximate. YouTube comparison covers Over 40s videos, 2025 against 2026 to 11 November."
  },

  brand: {
    eyebrow: "Where your brand appears",
    heading: "On the shirt. On the stream. In the feed.",
    items: [
      { title: "Playing shirt", text: "Front and sleeve positions, seen in every photograph and every frame of the stream.", image: { src: "assets/shirt.jpg", alt: "Close view of an England playing shirt showing sleeve and chest logos" } },
      { title: "Presentations", text: "Player of the Match and trophy moments, photographed and posted.", image: { src: "assets/presentation.jpg", alt: "A Player of the Match award being presented after a match" } },
      { title: "Zing stumps", text: "Lit on every wicket and in shot for every ball, with your branding on the stumps.", image: { src: "assets/zing-stumps.jpg", alt: "Zing stumps light up as the bails come off" } },
      { title: "Training and travel wear", text: "Worn through warm-ups, presentations and tours. Pictured with the World Cup trophy caps.", image: { src: "assets/training-kit.jpg", alt: "The England squad in training kit in front of a scoreboard in Guyana" } },
      { title: "Live stream and boundary", text: "Your logo on screen in the broadcast graphics, ball by ball, and on boundary boards in the line of the cameras, with commentary mentions.", wide: true, image: { src: "assets/live-stream.jpg", alt: "A frame from a live stream showing a partner logo in the corner, a partner board on the boundary and the score graphic" } },
      { title: "Social media and website", text: "Credited on team sheets, match graphics, results and highlights, and listed with logo and link on our website." }
    ],
    note: "Some images show partner branding from earlier seasons. Training shirts in Guyana carried the logos of Thom's Honey and Iggy's Fund, two causes we support."
  },

  levels: {
    eyebrow: "Partnership levels",
    heading: "Four levels. One conversation.",
    tiers: [
      { name: "Premium Partner", lead: true, idealFor: "National brands, financial services, major corporates" },
      { name: "Gold Partner", idealFor: "Regional businesses and growing brands" },
      { name: "Silver Partner", idealFor: "Local businesses and service providers" },
      { name: "Zing Stumps Partner", idealFor: "Technology and equipment brands" }
    ],
    rows: [
      { label: "Term", values: ["Two years", "Annual", "Annual", "Annual"] },
      { label: "Playing shirt", values: ["Lead position", "", "One sleeve*", ""] },
      { label: "Training kit", values: ["Yes", "Yes", "", ""] },
      { label: "Live stream", values: ["Logo on all streams", "Logo on selected streams", "", "In shot every ball"] },
      { label: "Ground signage", values: ["Prime position, all matches", "Major tournaments", "Selected matches", "Branded stumps, all matches"] },
      { label: "Social media", values: ["Regular features and credits", "Regular credits", "Monthly mentions, match graphics", "Credits in highlights"] },
      { label: "Presentations", values: ["Trophy and award recognition", "", "", ""] },
      { label: "Content", values: ["Behind-the-scenes access", "", "", ""] },
      { label: "Website", values: ["Lead listing", "Listed", "Listed", "Listed"] },
      { label: "Sector exclusivity", values: ["Yes", "By agreement", "By agreement", "Sole partner"] },
      { label: "End-of-season report", values: ["Yes", "Yes", "Yes", "Yes"] }
    ],
    statement: "Every partnership is tailored. Investment levels are available on request.",
    footnote: "* Both sleeve positions are held by current partners. Future availability on request."
  },

  signature: {
    eyebrow: "Signature opportunities",
    heading: "For brands that want to own a moment",
    items: [
      { title: "Lions Tour Partner", tag: "Brisbane · April", text: "Your name on the tour, the travel wear and every piece of tour content.", feature: true },
      { title: "England Tour Partner", tag: "Brisbane · November–December", text: "The senior side in Australia, with your brand on the tour from squad announcement to final match.", feature: true },
      { title: "Stream Presenting Partner", text: "“Live with” your brand across every streamed match of the season." },
      { title: "Content Series Partner", text: "A named series: player profiles, highlights or a tour diary. Our captain's introduction alone passed 100,000 Instagram views." },
      { title: "Player Partner", text: "Support an individual player's season, with personal content in return." },
      { title: "Supply Partner", text: "Provide a product or service the squad uses, in exchange for partner rights." }
    ],
    example: {
      eyebrow: "Supply partnership in practice",
      title: "The World Cup trophy cap",
      text: "Trophy caps are presented to the senior team when they represent England at a World Cup. They are provided by our Kit Partner, Gentlemen & Players.",
      image: { src: "assets/trophy-cap.jpg", alt: "A navy velvet England Over 40s trophy cap embroidered with the three lions, the player's name and Over 40s World Cup Guyana 2026" }
    },
    note: "Hospitality, player appearances and business networking can be built into any partnership by arrangement.",
    image: { src: "assets/bat-raised.jpg", alt: "An England batter raises his bat to the pavilion alongside his batting partner" }
  },

  partners: {
    eyebrow: "Partners and proof",
    heading: "Trusted by the brands already with us",
    list: [
      { name: "Sporta Tours", role: "Travel Partner", logo: "assets/logo-sporta-tours.png" },
      { name: "Gentlemen & Players", role: "Kit Partner", logo: "assets/logo-gentlemen-players.png" },
      { name: "De'Longhi", role: "Player of the Match Partner", logo: "assets/logo-delonghi.png" },
      { name: "ATHLO", role: "Sleeve Partner", logo: "assets/logo-athlo.png" },
      { name: "ANWA Properties", role: "Sleeve Partner", logo: "assets/logo-anwa.png", dark: true },
      { name: "NV Play", role: "Streaming Platform", logo: "assets/logo-nv-play.png" }
    ],
    proofTitle: "What our partners received in 2026",
    proof: [
      { figure: "2.2m+", caption: "views on Facebook and Instagram posts that credited our partners" },
      { figure: "3 in 4", caption: "Facebook views were on a post that named a partner" },
      { figure: "22", caption: "posts naming our Player of the Match across both platforms" }
    ],
    source: "Partner roles at November 2026. Exposure figures counted from post captions, 1 January to 12 November 2026."
  },

  working: {
    eyebrow: "How we work with partners",
    heading: "Straightforward, responsive and measured",
    steps: [
      { title: "We listen first", text: "Every partnership starts with your objectives, not our rate card." },
      { title: "We agree it in writing", text: "A clear agreement setting out rights, term and sector protection." },
      { title: "We activate it properly", text: "Your brand applied correctly across kit, stream, ground and social, with artwork approved by you." },
      { title: "We keep you involved", text: "A single point of contact, and advance notice of fixtures, tours and content." },
      { title: "We report back", text: "An end-of-season report showing where your brand appeared and how many people saw it.", feature: true }
    ],
    image: { src: "assets/keeper.jpg", alt: "An England wicketkeeper smiles between deliveries" }
  },

  contact: {
    eyebrow: "Next steps",
    heading: "Let's talk",
    body: "If your business would like to be part of the programme, we would be glad to discuss the right fit.",
    name: "Steven Naylor",
    role: "Director & Commercial Lead",
    enquireLabel: "Start a conversation",
    social: "Facebook, Instagram and YouTube: England Over 40s Cricket",
    company: "Over 40s Cricket England Ltd · Registered in England and Wales, company number 15282587",
    image: { src: "assets/closing.jpg", alt: "An England batter raises his helmet and bat after reaching a milestone at the World Cup in Guyana" }
  }
};
