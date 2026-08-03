/* ================================================================
   TRIPLE CROWN 2026 — TOURNAMENT DATA
   This is the ONLY file to edit. The page (index.html) reads it
   and draws everything: fixtures, results, standings, NRR,
   squads, officials, partners. Never edit index.html.

   To enter a result: on that match, set status: "result", write
   the result line, fill motm and scorecard, and fill score:
     score: {
       oversAllotted: 45,
       home: { runs: 213, wkts: 10, overs: "43.2" },
       away: { runs: 214, wkts: 2,  overs: "38.4" }
     }
   overs is overs-and-balls in quotes ("43.2" = 43 ov 2 balls).
   A side bowled out is automatically treated as having faced
   its full allotted overs for net run rate.
   ================================================================ */

/* ============================================================
   CONTENT — edit fixtures, results and streams here.
   status: "upcoming" | "result"
   When a match is played: set status to "result", fill result
   and scorecard (Play-Cricket URL). The stream link stays as
   the same YouTube URL (it becomes the replay).
   crest: path to PNG once uploaded, e.g. "assets/ireland.png"
   ============================================================ */
const TEAMS = {
  ENG: { name: "England",  crest: "assets/england.png" },
  WAL: { name: "Wales",    crest: "assets/wales.png" },
  SCO: { name: "Scotland", crest: "assets/scotland.png" },
  IRE: { name: "Ireland",  crest: "assets/ireland.png" }
};

const DAYS = [
  {
    label: "Day One", date: "Tuesday 28 July", start: "12:00pm",
    matches: [
      { home: "ENG", away: "IRE", stream: "https://www.youtube.com/live/SRkXD_KjxpA",
        scorecard: "https://triplecrown.play-cricket.com/website/results/7616872",
        status: "result",
        result: "England won by 8 wickets",
        motm: "Darren Stevens",
        score: {
          oversAllotted: 45,
          home: { runs: 242, wkts: 2, overs: "32.5" },
          away: { runs: 241, wkts: 8, overs: "45.0" }
        }
      },
      { home: "WAL", away: "SCO", stream: "https://www.youtube.com/watch?v=3cbs9of-xqY",
        scorecard: "https://triplecrown.play-cricket.com/website/results/7616873",
        status: "result",
        result: "Scotland won by 2 wickets",
        motm: "Kyle Coetzer",
        score: {
          oversAllotted: 45,
          home: { runs: 239, wkts: 5, overs: "45.0" },
          away: { runs: 243, wkts: 8, overs: "43.5" }
        }
      }
    ]
  },
  {
    label: "Day Two", date: "Wednesday 29 July", start: "11:00am",
    matches: [
      { home: "ENG", away: "SCO", stream: "https://www.youtube.com/live/E1VH7Vn2Iho",
        scorecard: "https://triplecrown.play-cricket.com/website/results/7616869",
        status: "result",
        result: "England won by 217 runs",
        motm: "Ben Frazer",
        score: {
          oversAllotted: 45,
          home: { runs: 340, wkts: 9, overs: "45.0" },
          away: { runs: 123, wkts: 10, overs: "25.4" }
        }
      },
      { home: "WAL", away: "IRE", stream: "https://www.youtube.com/watch?v=khe2quK-6LQ",
        scorecard: "https://triplecrown.play-cricket.com/website/results/7616871",
        status: "result",
        result: "Ireland won by 7 wickets",
        motm: "Kenny Carroll",
        score: {
          oversAllotted: 45,
          home: { runs: 303, wkts: 8, overs: "45.0" },
          away: { runs: 306, wkts: 3, overs: "32.3" }
        }
      }
    ]
  },
  {
    label: "Day Three", date: "Thursday 30 July", start: "10:30am",
    matches: [
      { home: "ENG", away: "WAL", stream: "https://www.youtube.com/live/-wWzAgtbITU",
        scorecard: "https://triplecrown.play-cricket.com/website/results/7616870",
        status: "result",
        result: "England won by 181 runs",
        motm: "Ryan Canning",
        score: {
          oversAllotted: 45,
          home: { runs: 401, wkts: 8, overs: "45.0" },
          away: { runs: 220, wkts: 10, overs: "41.5" }
        }
      },
      { home: "IRE", away: "SCO", stream: "https://www.youtube.com/watch?v=B-Y9ZU-M3Es",
        scorecard: "https://triplecrown.play-cricket.com/website/results/7616874",
        status: "result",
        result: "Ireland won by 65 runs",
        motm: "Conor Kelly",
        score: {
          oversAllotted: 45,
          home: { runs: 253, wkts: 9, overs: "45.0" },
          away: { runs: 188, wkts: 10, overs: "39.4" }
        }
      }
    ]
  }
];

/* ============================================================
   SCORES — when a match finishes, set status: "result", write
   the result line, fill motm with the Man of the Match name
   (shown with the De'Longhi credit), and fill score like this
   example (all matches are 45-over ODIs):

   score: {
     oversAllotted: 45,                                  // overs per side for this match
     home: { runs: 213, wkts: 10, overs: "43.2" },       // overs = overs.balls actually faced
     away: { runs: 214, wkts: 2,  overs: "38.4" }
   }

   NRR rule applied automatically: a side bowled out (10 wkts)
   is treated as having faced its full allotted overs.
   The standings table (P, W, L, Pts, NRR) computes itself —
   never edit it by hand.
   ============================================================ */

/* Squads: list players in order; append " (c)" for captain, " (wk)"
   for wicketkeeper. An empty array shows "Squad to be announced". */
const SQUADS = {
  ENG: [
    "Darren Stevens (c)", "Taqi Abbas", "George Brooksbank", "Jackson Thompson",
    "Ryan Canning (wk)", "Ben Frazer", "Sean Heather", "Jayden Levitt",
    "Steven Naylor", "Sean Park (vc)", "Chris Peploe", "Iresh Saxena",
    "Richard Sims", "Jonny Wightman"
  ],
  WAL: [
    "Gareth Edwards (c)", "Rob Franklin", "Simon Jones", "Dylan Mcphee",
    "Owain Hopkins", "John Davies (wk)", "Michael Martin", "James Breese",
    "Ben Edkins", "Ryan Evans", "Dean Oram", "Atif Qureshi", "Nick Morgan"
  ],
  SCO: [
    "Shaun Coetzer (c)", "Stuart Campbell", "Paul Flanagan", "Craig Black",
    "Sahil Chopra", "Kyle Coetzer", "Julian De Jager", "Ryan Hepburn",
    "David Holloway", "Chris Keltie", "Umair Khan", "Imran Saim",
    "Daniel Styer", "John Vaughan Davies"
  ],
  IRE: [
    "John Anderson (c)", "Kenny Carroll", "Phil Eaglestone", "Stephen Ogilby",
    "Jonny Robinson", "Alan Eastwood", "Rory McCann", "Ehtesham Ahmed",
    "Paul Ryan", "Conor Kelly", "Bilal Azhar", "Connor Mullen",
    "Ross Durity", "Andrew Cowden", "Yaqoob Ali"
  ]
};

/* Umpires officiating across the tournament. */
const OFFICIALS = ["John Holland", "Chris Johnson", "Rafiq Patel", "Keith Boyall"];

/* Sponsors: uniform structure — name, role, url, logo, tile (light|dark). */
const SPONSORS = [
  { name: "ANWA", role: "Tournament Partner", url: "https://anwaproperties.com", logo: "assets/sponsor-anwa.png", tile: "dark" },
  { name: "Sporta Tours", role: "Tournament Partner", url: "https://www.sportatours.com/", logo: "assets/sponsor-sporta.png", tile: "light" },
  { name: "HertsPhysio", role: "Physiotherapy Partner — on-site physio throughout the tournament", url: "https://hertsphysio.co.uk/", logo: "assets/sponsor-hertsphysio.png", tile: "light" },
  { name: "Athlo", role: "Tournament Partner", url: "https://www.athlo.app/", logo: "assets/sponsor-athlo.png", tile: "dark" },
  { name: "Gentlemen & Players", role: "Kit Supplier", url: "https://www.gentlemenplayers.com/", logo: "assets/sponsor-gp.png", tile: "light" },
  { name: "De'Longhi UK", role: "Player of the Match Sponsor", url: "https://www.delonghi.com/en-gb", logo: "assets/sponsor-delonghi.png", tile: "light" },
  { name: "NV Play", role: "Streaming Partner", url: "https://www.nvplay.com/", logo: "assets/sponsor-nvplay.png", tile: "light" }
];
