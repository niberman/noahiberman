-- Draft blog seeds for noahiberman.com
-- Run in the Supabase SQL editor. All posts are inserted as UNPUBLISHED
-- drafts (is_published = false) - review and publish from the dashboard.
-- Dates in `created_at` only; `published_at` stays NULL until publishing.

INSERT INTO blog_posts (title, slug, excerpt, content, images, tags, is_published, published_at)
VALUES
(
  'Buy, lease, or rent an SR22T: the actual math',
  'sr22t-buy-lease-rent-math',
  'Renting a Cirrus for two years costs what the whole plane costs. I ran the numbers on buy vs lease vs rent for 500 hours a year of mountain flying.',
  E'# Buy, lease, or rent an SR22T: the actual math\n\nI plan to fly about 500 hours a year, and the mission is specific: a Cirrus that can get to Aspen or Glenwood on a whim.\n\n**Renting.** A Cirrus that can do that mission rents for about $500 an hour around here. Overnight trips need planning weeks out. The whole point of the plane - leaving for the mountains when the weather opens - is defeated by the reservation book.\n\n**Leasing.** There are no leasing options in Colorado. That settles that.\n\n**Buying.** Late-model SR22Ts with under 1,000 hours on the airframe run $500k to $700k. Ownership works out to roughly $150 an hour at my flying rate. Purchase through the Cirrus Embark program includes the transition training. Two years of renting equals the entire price of the plane.\n\nSome of the planes I looked at need ADS-B In - about $5k installed, or a couple hundred for a portable.\n\nFor comparison: the Cessnas in the rental fleet have 10,000+ hours on their airframes. The Cirrus I am looking at are about ten years old with a tenth of that.\n\nBuying wins on cost, on availability, and on the actual mission.',
  '[]'::jsonb,
  ARRAY['aviation','analysis'],
  false,
  NULL
),
(
  'What BASE Camp actually taught me',
  'base-camp-postmortem',
  'Selected as one of six ventures, a summer of workshops and mentors, and a final pitch. What the accelerator changed - and what it did not.',
  E'# What BASE Camp actually taught me\n\nIn April I got the email: selected for the 2026 BASE Camp cohort at DU''s Daniels College of Business, one of six ventures, with a stipend and a faculty mentor.\n\nThe program ran through the summer and ended with a final pitch on August 27. In between: market research workshops, elevator pitch drills, an opportunity validation canvas, and weekly sessions with mentors who had actually built things.\n\nThe honest lesson: I came in expecting to be scolded for pivoting too much. The mentors reframed it - pivot, stop, or continue were always the three valid outcomes. The point of the summer was skill-building, not a guaranteed company.\n\nWhat I actually took away: discovery, pricing, and scoping come before a single line of code. Enthusiasm is not urgency. Validate before you build.',
  '[]'::jsonb,
  ARRAY['startups','base-camp','du'],
  false,
  NULL
),
(
  'I sent twenty cold emails in one day',
  'twenty-cold-emails-one-day',
  'Each one individually researched and written for a specific Denver restaurant group. What I asked for, and what came back.',
  E'# I sent twenty cold emails in one day\n\nOn July 28 I sat down and sent about twenty emails to Denver restaurant groups and hospitality organizations. Not a mail merge - each one written for the specific operator, about the specific problem I wanted to study: how shift-level execution actually gets tracked.\n\nIce cream shops, coffee roasters, chicken franchises, restaurant associations. The ask was fifteen minutes of their time for student research.\n\nWhat came back was better than a response rate: real conversations with operators, introductions to franchising faculty, and a complimentary registration to the Global Franchise Summit.\n\nThe lesson is not that cold email works. The lesson is that specific, honest, researched outreach works, and it is indistinguishable from caring.',
  '[]'::jsonb,
  ARRAY['startups','outreach','denver'],
  false,
  NULL
),
(
  'Learning to fly helicopters after airplanes',
  'helicopter-add-on-diary',
  'A year of training at Mile High Rotors for the rotorcraft add-on. Fixed-wing habits that helped, and the ones that nearly bent metal.',
  E'# Learning to fly helicopters after airplanes\n\nAfter earning my fixed-wing commercial certificate I spent the back half of 2024 at Mile High Rotors adding the rotorcraft-helicopter rating. It finished in January 2025.\n\nA helicopter does not want to fly the way an airplane does. An airplane trimmed properly more or less flies itself; a helicopter requires constant, small control inputs forever. The fixed-wing habit of relaxing your grip when things get busy is exactly wrong in a Robinson.\n\nWhat transferred: airspace, weather, regulations, radio work, judgment. What did not: almost everything your hands know.\n\nHovering is the hardest skill I have learned in aviation, and the most satisfying.',
  '[]'::jsonb,
  ARRAY['aviation','helicopter','training'],
  false,
  NULL
),
(
  'A year in Bilbao',
  'a-year-in-bilbao',
  'Homestay, business Spanish, and a flight club outreach in Spanish. What a full year abroad actually does to you.',
  E'# A year in Bilbao\n\nFrom August 2024 to May 2025 I lived in Bilbao with a host family and studied at the Universidad de Deusto - advanced composition, business Spanish, conversation, and a control systems course with LabVIEW.\n\nThe year looked like: morning classes in Spanish, afternoons exploring the city, and weekends on trains and budget airlines - Marrakech, Sevilla, Frankfurt, Zermatt.\n\nI even emailed Spanish aeroclubs about discovery flights, in Spanish. Real Aeroclub de Vizcaya and the Aeroclub de Navarra both answered.\n\nYou do not come back the same. The Spanish stopped being a school subject and became a working tool - I now teach and build software in it.',
  '[]'::jsonb,
  ARRAY['spain','bilbao','personal'],
  false,
  NULL
)
ON CONFLICT (slug) DO NOTHING;
