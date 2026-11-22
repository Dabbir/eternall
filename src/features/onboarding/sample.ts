import { fingerprintOf } from '../../domain/capsule';
import { addDays, addYears, parseISO } from '../../domain/time';
import { DATA_VERSION, type AppData, type Capsule, type Chapter, type Inscription, type ISODate, type Tone } from '../../domain/types';
import { createId } from '../../lib/id';

type Seed = [age: number, dayOfYear: number, tone: Tone, title: string, body: string];

/** A believable life, expressed relative to the birth date so it always lines up with "today". */
const MEMORIES: Seed[] = [
  [4, 40, 'wonder', 'First snow I can remember', 'Grandpa lifted me onto the wall so I could see the whole valley gone white. I tried to eat it and he laughed so hard he had to sit down.'],
  [6, 250, 'bold', 'Rode without stabilisers', 'Dad let go somewhere around the bakery and I didn’t notice until the corner.'],
  [8, 120, 'tender', 'Avó taught me to fold bread', 'Flour on everything. She said the dough knows when you’re impatient.'],
  [10, 300, 'grief', 'Goodbye, Biscuit', 'Fourteen years old, which Mum said was a long life for a dog. It didn’t feel long.'],
  [12, 200, 'wonder', 'The night of the meteor shower', 'Lay on the car roof with my cousins counting. I got to forty-one before falling asleep.'],
  [14, 30, 'bold', 'Stood up in assembly', 'Read my poem about the river out loud. Voice shook the entire time. Did it anyway.'],
  [15, 180, 'joy', 'Summer of the broken radio', 'It only played one station. We learned every song on it.'],
  [17, 160, 'calm', 'Last day of school', 'Walked home the long way, past the harbour, not wanting it to end or wanting it to go on.'],
  [18, 260, 'bold', 'Moved to Leeds', 'Two suitcases and a plant. The plant did not survive the first winter. I did.'],
  [19, 75, 'joy', 'Found my people', 'Six of us in a kitchen built for two, arguing about films until the sun came up.'],
  [20, 330, 'grief', 'Avó', 'Flew home for the funeral. Made her bread that night with shaking hands. It was nearly right.'],
  [21, 150, 'joy', 'Graduation in the rain', 'Gowns soaked, caps everywhere, Mum crying under a borrowed umbrella.'],
  [22, 20, 'calm', 'First flat with my name on the door', 'A radiator that sang at night. I loved it anyway.'],
  [22, 210, 'bold', 'Said yes to the job', 'Terrified. Bought a proper coat to look like someone who knew what they were doing.'],
  [23, 100, 'tender', 'Met J. at the bookshop', 'We reached for the same book. That actually happens, it turns out.'],
  [24, 220, 'wonder', 'Northern lights from the ferry', 'Everyone on deck went silent at once.'],
  [25, 45, 'grief', 'The year it all fell apart', 'Lost the job and the flat in the same month. Kept walking anyway, mostly in circles.'],
  [25, 280, 'calm', 'Learned to sit with it', 'Started running in the mornings. Not fast. Just out.'],
  [26, 190, 'joy', 'Ran my first half marathon', '2:14:07. Cried at mile twelve for no reason and every reason.'],
  [27, 10, 'bold', 'Moved to Lisbon on a whim', 'Sold almost everything. Kept the coat.'],
  [27, 140, 'wonder', 'Tram 28 at golden hour', 'The whole city the colour of apricots.'],
  [28, 230, 'tender', 'J. came to visit and stayed', 'Two weeks became two months became a key on a ribbon.'],
  [29, 60, 'joy', 'Our terrace tomatoes', 'Eleven tomatoes. We named them all.'],
  [29, 300, 'calm', 'Sundays at the miradouro', 'Coffee, the river, no plans. The best kind of week.'],
  [30, 100, 'joy', 'Thirty, and lighter than twenty', 'Dinner on the floor of the new place because the table hadn’t arrived.'],
  [30, 250, 'grief', 'Dad’s diagnosis', 'Long calls. Learning a new vocabulary nobody wants.'],
  [31, 30, 'bold', 'Opened the workshop', 'Ceramics, finally. A borrowed kiln and a hand-painted sign.'],
  [31, 200, 'tender', 'Dad held my first bowl', 'Turned it over and over. Said it was too good to eat from. We ate from it.'],
  [32, 90, 'wonder', 'A stranger bought every cup', 'Walked in, said “all of these”, and left me speechless and with an empty shelf.'],
  [32, 290, 'calm', 'The quiet month', 'Nothing happened and it was wonderful.'],
  [33, 50, 'joy', 'J. and I, at the registry office', 'Eight guests, one cake, too much wine. Perfect.'],
  [33, 220, 'tender', 'Teaching Saturday classes', 'A nine-year-old made a lopsided owl and declared it a masterpiece. It was.'],
];

const CHAPTERS: [title: string, fromAge: number, fromDay: number, toAge: number | null, toDay: number, ink: Chapter['ink'], note: string][] = [
  ['Childhood in Porto', 0, 0, 11, 364, 'ochre', 'The steep streets, Avó’s kitchen, the river.'],
  ['The Leeds years', 18, 255, 21, 200, 'tide', 'Rain, friends, and finding out who I was.'],
  ['First job, small flat', 21, 201, 26, 360, 'slate', 'Learning to be an adult, badly then less badly.'],
  ['Lisbon', 27, 5, 30, 364, 'clay', 'Light, terraces, J.'],
  ['The workshop', 31, 25, null, 0, 'moss', 'Clay under my fingernails, finally.'],
];

export async function createSampleArchive(today: ISODate): Promise<AppData> {
  const birthDate = addDays(addYears(today, -34), -128);
  const at = (age: number, day: number) => addDays(addYears(birthDate, age), day);
  const past = (d: ISODate) => parseISO(d) <= parseISO(today);
  const stamp = new Date().toISOString();

  const inscriptions: Inscription[] = MEMORIES.map(([age, day, tone, title, body]) => ({
    id: createId(), date: at(age, day), title, body, tone, createdAt: stamp, updatedAt: stamp,
  })).filter((i) => past(i.date));

  // A few memories in the current week and the same week last year make "Echoes" come alive.
  inscriptions.push(
    { id: createId(), date: addDays(today, -1), title: 'Kiln opened — the blue glaze took', body: 'Months of failed tests and then, today, exactly the blue of the river at seven in the morning.', tone: 'joy', createdAt: stamp, updatedAt: stamp },
    { id: createId(), date: addDays(addYears(today, -1), 1), title: 'Walked Dad around the garden', body: 'Slow, arm in arm. He named every plant, even the weeds.', tone: 'tender', createdAt: stamp, updatedAt: stamp },
    { id: createId(), date: addDays(addYears(today, -3), 2), title: 'Storm over the Tagus', body: 'We watched it from the window with all the lights off.', tone: 'wonder', createdAt: stamp, updatedAt: stamp },
  );

  const chapters: Chapter[] = CHAPTERS.map(([title, fa, fd, ta, td, ink, note]) => ({
    id: createId(),
    title,
    start: at(fa, fd),
    end: ta === null ? null : at(ta, td),
    ink,
    note,
  }));

  const letters: { title: string; body: string; sealedOn: ISODate; opensOn: ISODate; opened: boolean }[] = [
    {
      title: 'Open when the workshop turns one',
      body: `Dear Mira,\n\nIf you’re reading this, you didn’t give up in the first winter. I’m writing with clay drying on my wrists and absolutely no idea whether anyone will come through that door.\n\nWhatever happened — busy or empty, profit or not — I hope you remember that you were brave enough to try.\n\nWith love from the beginning,\nMira`,
      sealedOn: at(31, 28),
      opensOn: at(32, 28),
      opened: true,
    },
    {
      title: 'A letter from last autumn',
      body: `Mira,\n\nRight now Dad is doing better than the doctors expected, and you’re terrified to believe it. By the time this opens you’ll know more than I do.\n\nWhatever you know now: call him. Not because you should. Because he lights up when it’s you.\n\nAnd please — take one Sunday off. The kiln can wait. The river can’t, not forever.\n\nM.`,
      sealedOn: addDays(today, -380),
      opensOn: addDays(today, -2),
      opened: false,
    },
    {
      title: 'For our fifth anniversary',
      body: 'J., if Mira lets you read this over her shoulder: you were right about the terrace.',
      sealedOn: addDays(today, -40),
      opensOn: at(38, 50),
      opened: false,
    },
    {
      title: 'Open on your fortieth birthday',
      body: 'Forty. I wonder if you still have the coat.',
      sealedOn: addDays(today, -200),
      opensOn: at(40, 0),
      opened: false,
    },
  ];

  const capsules: Capsule[] = await Promise.all(
    letters.map(async ({ opened, ...l }) => ({
      id: createId(),
      ...l,
      fingerprint: await fingerprintOf(l),
      openedAt: opened ? `${addDays(l.opensOn, 1)}T09:30:00.000Z` : null,
    })),
  );

  return {
    version: DATA_VERSION,
    profile: { name: 'Mira', birthDate, horizonYears: 90, createdAt: stamp },
    inscriptions,
    capsules,
    chapters,
    settings: { theme: 'system', lens: 'moments' },
  };
}
