import 'reflect-metadata';
import { Database } from './database';
import { cleanHtml, visibleText } from './content';

const people = [
  { _id: 'mira', name: 'Mira Chen', color: '#dce8d9' },
  { _id: 'eli', name: 'Eli Brooks', color: '#ecdcc8' },
  { _id: 'noor', name: 'Noor Ali', color: '#dce3ee' },
  { _id: 'jules', name: 'Jules Reed', color: '#eadce5' },
  { _id: 'sam', name: 'Sam Rivera', color: '#eee6c9' },
];

const pages = [
  {
    address: 'tidepool.zz',
    title: 'Notes from the tidepool',
    authorId: 'mira',
    heading: 'The ocean, at ankle height.',
    label: 'FIELD NOTES / 01',
    paragraphs: [
      'At low tide, the shore leaves little worlds behind. This morning a hermit crab was testing a shell twice its size. It walked around the rim, disappeared inside, and came back out. Some houses are beautiful but impossible to carry.',
      'Anemones look like flowers until a shadow passes over them. Then the whole garden closes. I keep a notebook of these small changes: the temperature of a pool, the color of a limpet, the exact minute the water returns.',
      'The best equipment is patience. Sit on a dry rock for twenty minutes and the apparently empty water begins to move. Barnacles open. Shrimp reveal themselves as tiny commas. What looked like a stone turns out to have an opinion about where it should be.',
      'Please leave everything where you found it. A turned stone is a roof removed from a house. Put it back gently, the same way up. The tide will bring enough change without our help.',
    ],
    links: [
      ['moss.zz', 'A slower kind of garden'],
      ['night-train.zz', 'Take the long way home'],
      ['lost-lighthouse.zz', 'The lighthouse keeper’s notebook (last seen in winter)'],
    ],
  },
  {
    address: 'moss.zz',
    title: 'A small green atlas',
    authorId: 'mira',
    heading: 'Pay attention to the overlooked.',
    label: 'A SMALL GREEN ATLAS',
    paragraphs: [
      'Moss makes a forest out of a brick. Its leaves are small enough that a single drop of rain becomes weather. On the north side of our garden wall there are at least four species, though I can only name two.',
      'Unlike the tomato plants, these gardens ask almost nothing of me. They take water straight through their leaves and spend dry weeks waiting. The word for this patience is poikilohydry, a useful thing to know on an otherwise ordinary Tuesday.',
      'I began drawing moss because photographs never quite caught its depth. Under a hand lens, each cushion has avenues and clearings. Sometimes an ant crosses the page before I can finish its portrait.',
      'Try a walk with one rule: look only at the first six inches above the ground. You will come home from a different neighborhood than the one you left.',
    ],
    links: [
      ['observatory.zz', 'From the very small to the very distant'],
      ['seed-library.zz', 'Borrow something that grows'],
      ['tidepool.zz', 'Back to the shore'],
    ],
  },
  {
    address: 'observatory.zz',
    title: 'The backyard observatory',
    authorId: 'noor',
    heading: 'A clear sky is an invitation.',
    label: 'THE BACKYARD OBSERVATORY',
    paragraphs: [
      'Our telescope lives beside the kitchen door. It is scratched, slightly wobbly, and more than enough to see the rings of Saturn. The first time a neighbor saw them, she stepped away from the eyepiece and laughed.',
      'Dark adaptation takes time. Put the phone away, make tea, and let your eyes find the stars. Jupiter usually arrives before the rest, a steady light above the roofs. The constellations follow like guests who know they are welcome.',
      'Tonight’s notebook: a meteor over the western chimney, two satellites, and the moon caught in the branches of an ash tree. Astronomy is as much about keeping appointments as it is about knowing names.',
      'Clouds are not a failed evening. They are an excuse to read old observing logs, mend a tripod, or visit the person next door. The universe can wait for tomorrow.',
    ],
    links: [
      ['radio-room.zz', 'Listen to the sky'],
      ['paper-plane.zz', 'Fold a little flight'],
      ['night-train.zz', 'Watch stars through a train window'],
    ],
  },
  {
    address: 'radio-room.zz',
    title: 'Signals from the spare room',
    authorId: 'noor',
    heading: 'There is somebody out there.',
    label: 'RADIO ROOM / ON AIR',
    paragraphs: [
      'The receiver is older than I am. Its tuning dial has the names of cities that no longer broadcast on these frequencies, but at night it still finds voices between the static.',
      'Shortwave travels strangely. A signal can bounce off the ionosphere and arrive from the other side of the world, while the station in the next town disappears. Weather, sunlight, and a wire strung between two trees all have a say.',
      'I collect the moments before a station identifies itself: a breath, a bell, the opening notes of a song. For a few seconds the sound belongs to no particular place.',
      'Last night I heard a shipping forecast, a language lesson, and someone describing how to repair a bicycle. I understood very little of the lesson. I understood everything about the bicycle.',
    ],
    links: [
      ['repair-cafe.zz', 'Things worth repairing'],
      ['night-train.zz', 'The midnight service'],
      ['silent-station.zz', 'An old station frequency'],
    ],
  },
  {
    address: 'night-train.zz',
    title: 'Letters from the night train',
    authorId: 'eli',
    heading: 'The journey is a place, too.',
    label: 'LETTERS IN TRANSIT',
    paragraphs: [
      'At eleven, the carriage settles into its own small country. Someone unwraps a sandwich. Someone folds a coat into a pillow. Outside, lit kitchens pass like individual frames of a film.',
      'I prefer the slow train because it stops in places the timetable barely acknowledges. Each platform has a bench, a clock, and a person who seems to have been expecting us.',
      'The dining car serves terrible coffee in excellent cups. I drink it anyway and write postcards I will not post until morning. There is something generous about a message that takes the long way.',
      'Before dawn we cross the estuary. For a minute the train and its reflection travel together over black water. Then the city begins, and everybody remembers where they are going.',
    ],
    links: [
      ['bread-club.zz', 'Breakfast at the next stop'],
      ['paper-plane.zz', 'A letter that can fly'],
      ['tidepool.zz', 'Where the estuary meets the sea'],
    ],
  },
  {
    address: 'bread-club.zz',
    title: 'The Sunday bread club',
    authorId: 'eli',
    heading: 'Flour, water, time, company.',
    label: 'SUNDAY BREAD CLUB',
    paragraphs: [
      'We meet on Sunday mornings with dough in covered bowls. Nobody agrees on the perfect loaf, which is fortunate, because nobody has ever made the same loaf twice.',
      'Sourdough is a conversation with a culture you cannot see. Temperature changes the pace. Whole grain flour changes the appetite. A starter that smells of apples on Friday may smell of yogurt by Saturday.',
      'Our simplest recipe is five hundred grams of flour, three hundred and fifty grams of water, a hundred grams of starter, and ten grams of salt. Mix, rest, fold, wait. The waiting is the part most recipes underestimate.',
      'Bring a jar if you would like some starter. Bring butter if you would like to be popular. Bring yourself even if your bread did not rise; there is always more than enough to share.',
    ],
    links: [
      ['seed-library.zz', 'The other lending library'],
      ['repair-cafe.zz', 'Fix the kitchen scale'],
      ['night-train.zz', 'A loaf for the journey'],
    ],
  },
  {
    address: 'seed-library.zz',
    title: 'The neighborhood seed library',
    authorId: 'jules',
    heading: 'Borrow a seed. Return a story.',
    label: 'OPEN EVERY SATURDAY',
    paragraphs: [
      'The library occupies three drawers in the community hall. The packets are labeled in different handwriting: runner beans, marigolds, a tomato known only as Grandad’s Yellow.',
      'Take what you can grow. If the plants set seed, bring some back next season. If they do not, tell us what happened. A failed experiment is useful information, and the slugs are remarkably well organized this year.',
      'Saving seeds is a way of remembering a place. The beans that thrive here have learned our short summers, our heavy soil, and our habit of planting a week too early.',
      'This Saturday we are sorting sunflower seeds and making paper envelopes. There will be tea, spare pots, and a spirited discussion about compost.',
    ],
    links: [
      ['moss.zz', 'Gardens without a gardener'],
      ['bread-club.zz', 'Another culture to share'],
      ['field-recordings.zz', 'Listen to the allotment'],
    ],
  },
  {
    address: 'repair-cafe.zz',
    title: 'The repair café',
    authorId: 'jules',
    heading: 'Broken is a beginning.',
    label: 'SECOND SATURDAY / COMMUNITY HALL',
    paragraphs: [
      'On the second Saturday of the month, we put tools on the long tables and make coffee. People bring lamps, chairs, radios, and the belief that a thing might have another useful year in it.',
      'The most common repair is a loose connection. The second most common is cleaning something that has never been cleaned. We keep a little notebook of unusual faults, but most objects simply need attention.',
      'Last month we repaired a cassette player, sharpened six pairs of scissors, and failed honorably to fix a clock. Its owner stayed for cake and said she liked the silence anyway.',
      'You do not need to know how to mend anything. Watching is how most of us began. Bring the missing screws in a jar, if you still have them.',
    ],
    links: [
      ['radio-room.zz', 'A receiver with another life'],
      ['paper-plane.zz', 'Make something from almost nothing'],
      ['missing-manual.zz', 'The missing service manual'],
    ],
  },
  {
    address: 'paper-plane.zz',
    title: 'The paper aerodrome',
    authorId: 'sam',
    heading: 'Ordinary paper. Brief miracles.',
    label: 'THE PAPER AERODROME',
    paragraphs: [
      'A good paper plane is a compromise between staying up and going somewhere. Too much weight in the nose and it dives. Too little and it stalls, appearing briefly surprised by gravity.',
      'Start with a sheet you have already used. Old meeting notes fly particularly well. Fold carefully along the center line, then give the wings a small upward bend at the tips.',
      'We test our designs in the corridor after everyone has gone home. The record is twenty-three floor tiles, held by a plane made from a bus timetable.',
      'Write a message inside before you fold it. Most flights end within a few seconds, but sometimes the landing is the beginning of a conversation.',
    ],
    links: [
      ['field-recordings.zz', 'Sounds from the landing strip'],
      ['observatory.zz', 'Aim a little higher'],
      ['night-train.zz', 'Other ways to travel'],
    ],
  },
  {
    address: 'field-recordings.zz',
    title: 'An atlas of ordinary sounds',
    authorId: 'sam',
    heading: 'Close your eyes. Stay a while.',
    label: 'AN ATLAS OF ORDINARY SOUNDS',
    paragraphs: [
      'The city has a different map when you listen. The railway bridge is a low note. The market is a hundred overlapping conversations. The park gate always announces you in the same rusty voice.',
      'I write descriptions of sounds instead of recording them. Rain on the greenhouse: a handful of dry rice poured slowly onto paper. Wind in the reeds: somebody turning the pages of a very large book.',
      'At the allotment, bees work the lavender while a distant lawnmower argues with a blackbird. Neither wins. By evening the only sound is water finding its way through soil.',
      'Try this: stand somewhere familiar for two minutes without speaking. Count the sounds you recognize. Then listen for the one you cannot name.',
    ],
    links: [
      ['tidepool.zz', 'The shore has a voice'],
      ['seed-library.zz', 'Sounds that grow'],
      ['radio-room.zz', 'Listening beyond the neighborhood'],
    ],
  },
];

async function seed() {
  const db = new Database();
  await db.onModuleInit();
  try {
    for (const person of people)
      await db.people.updateOne({ _id: person._id }, { $setOnInsert: person }, { upsert: true });
    for (const page of pages) {
      const html = cleanHtml(
        `<article><p style="color: #74806b; font-size: 12px">${page.label}</p><h1>${page.heading}</h1>${page.paragraphs.map((p) => `<p>${p}</p>`).join('')}<blockquote>A small corner of the web, kept by ${people.find((p) => p._id === page.authorId)!.name}.</blockquote><h2>Keep wandering</h2><ul>${page.links.map(([address, label]) => `<li><a href="${address}">${label}</a></li>`).join('')}</ul><details><summary>A note in the margin</summary><p>Leave this open, wander away, and return. There is room to pick up where you left off.</p></details></article>`,
      );
      await db.sites.updateOne(
        { address: page.address },
        {
          $setOnInsert: {
            address: page.address,
            title: page.title,
            authorId: page.authorId,
            html,
            text: visibleText(html),
            publishedAt: '2026-09-01T09:00:00.000Z',
          },
        },
        { upsert: true },
      );
    }
    for (let personIndex = 0; personIndex < people.length; personIndex++) {
      const count = personIndex === 0 ? 41 : 15;
      for (let index = 0; index < count; index++) {
        const page = pages[(index + personIndex * 2) % pages.length];
        const missing = index % 13 === 12;
        const id = `seed-${people[personIndex]._id}-${String(index).padStart(3, '0')}`;
        await db.visits.updateOne(
          { _id: id },
          {
            $setOnInsert: {
              _id: id,
              personId: people[personIndex]._id,
              address: missing ? 'lost-lighthouse.zz' : page.address,
              title: missing ? 'Address not found' : page.title,
              source: index === 0 ? 'typed' : index % 7 === 0 ? 'back' : 'link',
              outcome: missing ? 'missing' : 'found',
              visitedAt: new Date(
                Date.UTC(2026, 8, 20, 10) + index * (3_600_000 / (count - 1)),
              ).toISOString(),
            },
          },
          { upsert: true },
        );
      }
    }
    console.log('Seed ready: 10 sites, 5 people, 101 visits. Existing data left intact.');
  } finally {
    await db.onModuleDestroy();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
