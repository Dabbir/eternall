import { addDays, startOfWeek } from './dates';
import { createEntry } from './entries';
import type { Entry, EntryDraft, EntryMeta } from './types';

interface Seed {
  weeksAgo: number;
  day: number; // 0 = Monday
  hour: number;
  draft: EntryDraft;
  meta: EntryMeta;
}

const m = (section: EntryMeta['section'], mood: EntryMeta['mood'], starred = false): EntryMeta => ({ section, mood, starred });

const SEEDS: Seed[] = [
  // ── Five weeks ago: a rainy, heads-down week
  {
    weeksAgo: 5, day: 0, hour: 8,
    draft: { kind: 'note', body: 'First cold morning of the season. The radiator clanked twice and then decided to cooperate. I am choosing to read that as a good omen.' },
    meta: m('life', 3),
  },
  {
    weeksAgo: 5, day: 1, hour: 19,
    draft: {
      kind: 'story', title: 'The Spreadsheet That Ate October',
      body: `It started as a quick budget review and became a three-week archaeology dig through every subscription I have ever forgotten about.\n\nThere was the language app I opened twice. The cloud storage plan for photos I already back up elsewhere. A magazine — a real, paper one — that I had apparently been paying for since a dentist's waiting room in 2023.\n\nI cancelled eleven things. The total came to more than a nice dinner every month, which is a sobering way to measure inattention. But the strangest part was the relief. Every cancelled line felt like closing a tab I hadn't realised was still open in my head.\n\nI kept one: the paper magazine. It turns out I do read it, just never on purpose. I think that counts.\n\nThe lesson, if there is one, is that nothing is automatic. Everything costs something, even the things you stopped noticing. Especially those.`,
    },
    meta: m('work', 2),
  },
  {
    weeksAgo: 5, day: 3, hour: 13,
    draft: { kind: 'quote', body: 'You don’t have to finish the book to have read it.', attribution: 'Ines, at the library café' },
    meta: m('people', 3),
  },
  {
    weeksAgo: 5, day: 4, hour: 22,
    draft: { kind: 'list', title: 'Rainy day rations', items: ['A pot of dal, double the garlic', 'The second half of that detective novel', 'Wool socks, the ugly ones', 'One very long phone call'] },
    meta: m('life', 2),
  },

  // ── Four weeks ago: things look up
  {
    weeksAgo: 4, day: 0, hour: 9,
    draft: {
      kind: 'story', title: 'Learning to Bake Bread With My Hands, Not My Phone',
      body: `For years I baked by recipe app: grams, timers, a little chime when it was time to fold. The bread was fine. It was also somehow never mine.\n\nThis week my neighbour Tomás watched me check my phone mid-knead and laughed. "The dough will tell you," he said, which sounded like nonsense until he pressed a floury thumb into my loaf and showed me how it sprang back, slowly, like something waking up.\n\nSo I tried it his way. No timer. I watched the bowl instead of the clock. I poked it, too often probably. The first loaf was dense enough to use as a doorstop. The second was better. The third had that crackle when it cooled on the rack — the sound I'd been chasing for years.\n\nI think I'd been outsourcing my attention. The app was doing the noticing for me, and so I never learned to notice. Now my kitchen has flour on every surface and my phone stays in the other room.\n\nTomás got the third loaf. He said it needed more salt. He also ate half of it standing up.`,
    },
    meta: m('life', 4, true),
  },
  {
    weeksAgo: 4, day: 2, hour: 18,
    draft: { kind: 'note', body: 'Finally said no to a meeting that could have been an email, and the sky did not fall. Productive afternoon instead.' },
    meta: m('work', 4),
  },
  {
    weeksAgo: 4, day: 4, hour: 21,
    draft: { kind: 'quote', body: 'Bread is just patience you can eat.', attribution: 'Tomás, next door' },
    meta: m('people', 5),
  },
  {
    weeksAgo: 4, day: 5, hour: 11,
    draft: { kind: 'list', title: 'Songs on repeat this week', items: ['Something slow with a cello in it', 'An old Fela Kuti record from the shop', 'The song from the café that I Shazamed twice', 'Rain sounds, unironically'] },
    meta: m('culture', 4),
  },

  // ── Three weeks ago: a trip
  {
    weeksAgo: 3, day: 4, hour: 7,
    draft: { kind: 'note', body: 'Early train out of the city. Everyone in the carriage is asleep except me and a toddler, and we are both thrilled about it.' },
    meta: m('elsewhere', 5),
  },
  {
    weeksAgo: 3, day: 5, hour: 20,
    draft: {
      kind: 'story', title: 'Two Days in a Town Where Nobody Knew Me',
      body: `I picked the town because the train went there and I had never heard of it. That was the whole plan.\n\nIt had one bookshop, two bakeries in quiet competition, and a harbour where fishermen were mending nets with a patience I found almost unbearable to watch. I walked everywhere. I talked to more strangers in two days than I usually do in two months, mostly because there was nothing else to do and nobody else to talk to.\n\nThe woman who ran the guesthouse told me the town had been "about to become popular" for forty years. She seemed relieved it never quite happened.\n\nI don't know what I expected to find. Maybe a version of myself without the usual noise. What I found instead was that the noise follows you, but it gets quieter when there's a harbour to look at.\n\nOn the train home I wrote three pages in a notebook, the first time in months. I'm not sure they're any good. I'm sure they're mine.`,
    },
    meta: m('elsewhere', 5, true),
  },
  {
    weeksAgo: 3, day: 5, hour: 15,
    draft: { kind: 'quote', body: 'This town has been about to become popular for forty years.', attribution: 'The guesthouse owner' },
    meta: m('elsewhere', 4),
  },
  {
    weeksAgo: 3, day: 6, hour: 10,
    draft: { kind: 'list', title: 'Souvenirs that cost nothing', items: ['A smooth grey stone from the harbour', 'The bakery’s paper bag, folded flat', 'A train ticket with a coffee ring', 'The name of a fisherman’s boat: “Second Chance”'] },
    meta: m('elsewhere', 5),
  },

  // ── Two weeks ago: busy and a bit frayed
  {
    weeksAgo: 2, day: 0, hour: 23,
    draft: { kind: 'note', body: 'Launch week. I have answered forty-one messages and eaten one actual meal. Writing this so future me remembers to never schedule a launch on a Monday again.' },
    meta: m('work', 2),
  },
  {
    weeksAgo: 2, day: 2, hour: 22,
    draft: {
      kind: 'story', title: 'What the Launch Taught Me About Asking for Help',
      body: `We shipped. That is the headline and also, honestly, a small miracle.\n\nThe week was a pile-up: a bug we found on Tuesday that should have been found in September, a vendor who went quiet, and a team running on the specific kind of caffeine that tastes like regret. I tried to hold all of it myself, which is a habit I'm good at and should be worse at.\n\nOn Wednesday night, Priya messaged: "What can I take off your plate?" I almost said nothing. I said three things instead. She took all three and finished two of them before I'd finished my coffee.\n\nI've always thought of asking for help as a tax on other people. It isn't. It's an invitation. People want to be useful; I was hoarding the chance.\n\nNext launch, I'm handing out plates on day one.`,
    },
    meta: m('work', 3),
  },
  {
    weeksAgo: 2, day: 3, hour: 9,
    draft: { kind: 'quote', body: 'What can I take off your plate?', attribution: 'Priya, at 11:40pm' },
    meta: m('work', 4),
  },
  {
    weeksAgo: 2, day: 6, hour: 12,
    draft: { kind: 'note', body: 'Slept eleven hours. Went for a slow run along the canal. Two swans, one heron, zero notifications. Recovered.' },
    meta: m('body', 4),
  },

  // ── Last week: a good, ordinary week
  {
    weeksAgo: 1, day: 0, hour: 7,
    draft: { kind: 'note', body: 'Started the morning pages habit again. Three pages, longhand, before coffee. Mostly complaints about the coffee I had not yet had.' },
    meta: m('ideas', 3),
  },
  {
    weeksAgo: 1, day: 1, hour: 20,
    draft: {
      kind: 'story', title: 'My Grandmother’s Recipe Box, Finally Opened',
      body: `The box has lived on my shelf for three years. Tin, dented, with a faded strawberry on the lid. I hadn't opened it since the funeral because I wasn't ready for her handwriting.\n\nOn Tuesday I was ready, or at least ready enough.\n\nInside: sixty-odd cards, some typed, most in her looping blue script. Recipes, yes, but also notes in the margins that read like a diary. "Too sweet for Ahmed." "Made for the new neighbours, 1987 — they never returned the dish!" "Double this. Always double this."\n\nI made her lemon cake, the one marked with three stars. It was not as good as hers. It was close enough that I had to sit down for a minute.\n\nI'm going to make every card in the box. One a week, maybe. I'll write my own notes in the margins next to hers, so whoever opens it next gets both of us.`,
    },
    meta: m('people', 4, true),
  },
  {
    weeksAgo: 1, day: 2, hour: 12,
    draft: { kind: 'quote', body: 'Double this. Always double this.', attribution: 'Grandma, in the margin of a recipe card' },
    meta: m('people', 5),
  },
  {
    weeksAgo: 1, day: 3, hour: 19,
    draft: { kind: 'list', title: 'Small wins', items: ['Fixed the wobbly table with a folded receipt', 'Remembered a friend’s birthday without a reminder', 'Finished a crossword in pen', 'Ran 5k without stopping'] },
    meta: m('life', 5),
  },
  {
    weeksAgo: 1, day: 4, hour: 18,
    draft: { kind: 'note', body: 'Watched an old film at the tiny cinema on Elm Street. Eleven people in the audience. Everybody laughed at the same line, which felt like a secret handshake.' },
    meta: m('culture', 4),
  },
  {
    weeksAgo: 1, day: 6, hour: 16,
    draft: { kind: 'note', body: 'Lazy Sunday. Lemon cake, attempt two. Better. Still not hers.' },
    meta: m('life', 4),
  },

  // ── This week (only seeded up to today)
  {
    weeksAgo: 0, day: 0, hour: 8,
    draft: { kind: 'note', body: 'New week, clean desk, ambitious list. Let’s see how long that lasts.' },
    meta: m('work', 4),
  },
  {
    weeksAgo: 0, day: 1, hour: 21,
    draft: { kind: 'quote', body: 'You’re allowed to be a beginner at something at any age.', attribution: 'My pottery teacher' },
    meta: m('ideas', 4),
  },
];

/** A believable six-week archive, dated relative to `now`. Entries never land in the future. */
export function sampleEntries(now: Date = new Date()): Entry[] {
  const thisMonday = startOfWeek(now);
  const out: Entry[] = [];
  for (const seed of SEEDS) {
    const date = addDays(thisMonday, seed.day - seed.weeksAgo * 7);
    date.setHours(seed.hour, (seed.day * 7 + seed.hour * 3) % 60, 0, 0);
    if (date.getTime() > now.getTime()) continue;
    out.push(createEntry(seed.draft, seed.meta, date));
  }
  return out;
}
