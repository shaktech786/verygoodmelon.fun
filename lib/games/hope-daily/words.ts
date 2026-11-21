export interface WordData {
  word: string
  /** First hint: a gentle nudge toward the word that does not give it away */
  clue: string
  fact: string
  category: Category
}

export const CATEGORIES = ['Energy', 'Health', 'Nature', 'Peace', 'Rights', 'Tech'] as const
export type Category = (typeof CATEGORIES)[number]

export const MIN_WORD_LENGTH = 5
export const MAX_WORD_LENGTH = 12

const entry = (word: string, category: Category, clue: string, fact: string): WordData => ({ word, clue, fact, category })

/**
 * Curated words, each with its own clue and a hopeful fact.
 *
 * Facts are written to stay true: they describe things that already happened,
 * with their dates, rather than "now" figures that go stale. Numbers are rounded
 * down to what the sources clearly support.
 */
export const wordList: WordData[] = [
  // Health
  entry('VACCINE', 'Health', 'A small shot that teaches the body to fight', 'Smallpox, which killed hundreds of millions of people over the centuries, was declared eradicated in 1980 thanks to vaccination.'),
  entry('INSULIN', 'Health', 'The hormone that changed life with diabetes', 'In 1922 a 14-year-old named Leonard Thompson became the first person treated with insulin, turning a fatal illness into a manageable one.'),
  entry('PENICILLIN', 'Health', 'A mould that became a medicine', 'Alexander Fleming noticed penicillin in 1928; once it was mass-produced in the 1940s, antibiotics went on to save many millions of lives.'),
  entry('HEALS', 'Health', 'What a body does after a cut', 'Oral rehydration solution, a simple mix of clean water, salt and sugar, has saved tens of millions of children from dehydration since the 1970s.'),
  entry('POLIO', 'Health', 'A paralysing disease that is nearly gone', 'Wild polio cases fell by more than 99% after the Global Polio Eradication Initiative began in 1988.'),
  entry('MIDWIFE', 'Health', 'Someone who helps babies arrive', 'Worldwide, the share of births attended by skilled health staff rose from about six in ten in 2000 to more than eight in ten by 2020.'),
  entry('NURSE', 'Health', 'A carer on a hospital ward', 'Florence Nightingale’s attention to hygiene and careful record keeping in the 1850s helped turn nursing into a trained, respected profession.'),
  entry('CURES', 'Health', 'What medicine hopes to find', 'Hepatitis C, once a lifelong infection, can now be cured in most people with a course of pills taken for 8 to 12 weeks.'),
  entry('EYESIGHT', 'Health', 'What glasses help you keep', 'Cataract surgery, one of the most common operations in the world, restores sight in a procedure that often takes less than half an hour.'),
  entry('MEASLES', 'Health', 'A rash illness that vaccines prevent', 'Measles vaccination is estimated to have prevented more than 50 million deaths between 2000 and 2021.'),
  entry('MALARIA', 'Health', 'A fever carried by mosquitoes', 'China was certified malaria-free in 2021, after reporting around 30 million cases a year in the 1940s.'),
  entry('HYGIENE', 'Health', 'Keeping clean to stay well', 'In 1847 Ignaz Semmelweis showed that doctors washing their hands could dramatically cut deaths among new mothers.'),
  entry('ANESTHESIA', 'Health', 'The sleep that makes surgery painless', 'In 1846 a public demonstration of ether in Boston showed that surgery could be painless, changing medicine for good.'),
  entry('XRAYS', 'Health', 'Light that sees through skin', 'Wilhelm Röntgen discovered X-rays in 1895, and within months doctors were using them to find broken bones.'),
  entry('STETHOSCOPE', 'Health', 'A doctor’s listening tool', 'René Laennec invented the stethoscope in 1816, starting with a simple rolled-up tube of paper.'),
  entry('TRANSPLANT', 'Health', 'Giving an organ a new home', 'The first successful kidney transplant, between identical twin brothers, took place in Boston in 1954.'),
  entry('DONOR', 'Health', 'Someone who gives blood to a stranger', 'A single blood donation can help more than one patient, because it can be separated into red cells, plasma and platelets.'),
  entry('BLOOD', 'Health', 'It flows through your veins', 'Karl Landsteiner discovered the blood groups in 1901, which made safe transfusions possible.'),
  entry('LIFESPAN', 'Health', 'How long a life lasts', 'Global life expectancy more than doubled between 1900 and 2019, from around 32 years to over 70.'),
  entry('NEWBORN', 'Health', 'A baby who has only just arrived', 'The worldwide death rate for children under five fell by more than half between 1990 and 2019.'),
  entry('CHILDHOOD', 'Health', 'The years of growing up', 'In 1800 around four in ten children died before turning five; by 2020 the global figure was under one in twenty.'),
  entry('ERADICATE', 'Health', 'To wipe out completely', 'Guinea worm disease fell from an estimated 3.5 million cases in 1986 to just 14 human cases in 2023.'),
  entry('LEPROSY', 'Health', 'An ancient illness that is now curable', 'Since multidrug therapy became widely available in the 1980s, more than 16 million people have been cured of leprosy.'),
  entry('TUBERCULOSIS', 'Health', 'A lung disease once called consumption', 'Diagnosis and treatment for TB are estimated to have saved more than 70 million lives between 2000 and 2021.'),
  entry('RECOVERY', 'Health', 'Getting well again', 'In high-income countries, about nine in ten children diagnosed with the most common childhood leukaemia now survive, up from very few in the 1960s.'),
  entry('ASPIRIN', 'Health', 'A common pain pill from willow bark', 'Aspirin was first sold in 1899 and is still on the World Health Organization’s list of essential medicines.'),
  entry('IODINE', 'Health', 'An element added to table salt', 'Adding iodine to salt, now done in most countries, has greatly reduced goitre and protected children’s brain development.'),
  entry('VITAMIN', 'Health', 'A tiny nutrient with a big job', 'In 1747 James Lind showed that citrus fruit cured scurvy, an illness that had killed huge numbers of sailors.'),
  entry('SANITATION', 'Health', 'Drains, sewers and clean streets', 'London’s sewer system, built by Joseph Bazalgette after the Great Stink of 1858, helped end the city’s cholera epidemics.'),
  entry('TREATMENT', 'Health', 'Care that helps you get better', 'The number of people receiving HIV treatment grew from under a million in 2000 to around 30 million by 2023.'),
  entry('WALKING', 'Health', 'Moving on foot, one step at a time', 'Studies consistently find that regular brisk walking lowers the risk of heart disease, even in amounts as small as 20 minutes a day.'),
  entry('SLEEP', 'Health', 'What you do at night', 'Sleep helps the brain store what it learned during the day, which is why new skills often feel easier after a night’s rest.'),
  entry('REVIVE', 'Health', 'Bring back to life', 'CPR given by a bystander can double or even triple a person’s chance of surviving a cardiac arrest.'),
  entry('HEARING', 'Health', 'The sense that catches sound', 'Cochlear implants, first approved for adults in the 1980s, have helped about a million people around the world to hear.'),
  entry('GLASSES', 'Health', 'They sit on your nose', 'Spectacles were invented in Italy in the late 1200s, and they have been lengthening reading and working lives ever since.'),
  entry('SCANNER', 'Health', 'A machine that looks inside you', 'Magnetic resonance imaging, first used on a human body in 1977, lets doctors see soft tissue without surgery or radiation.'),
  entry('PACEMAKER', 'Health', 'A small device that keeps a heart in rhythm', 'The first fully implanted pacemaker was fitted in Sweden in 1958; its patient, Arne Larsson, lived to the age of 86.'),
  entry('ULTRASOUND', 'Health', 'Sound waves that show a baby before birth', 'Ultrasound has been used to check on babies before birth since the late 1950s, without any radiation.'),
  entry('GLOVES', 'Health', 'They keep a surgeon’s hands clean', 'Rubber surgical gloves were introduced in the 1890s, helping to make operations far safer.'),
  entry('AMBULANCE', 'Health', 'A vehicle that rushes to help', 'Organised ambulance services trace back to Dominique Larrey’s “flying ambulances”, which carried wounded soldiers to care in the 1790s.'),
  entry('HOSPICE', 'Health', 'A place of comfort at the end of life', 'Cicely Saunders opened St Christopher’s Hospice in London in 1967, starting the modern movement for gentle, dignified end-of-life care.'),
  entry('THERAPY', 'Health', 'Talking things through with a professional', 'Cognitive behavioural therapy, developed in the 1960s, is one of the most widely studied and effective treatments for anxiety.'),
  entry('IMMUNITY', 'Health', 'Protection your body builds', 'In 1885 Louis Pasteur used a new rabies vaccine to save a nine-year-old boy named Joseph Meister.'),
  entry('PASTEURISE', 'Health', 'Heat milk gently to make it safe', 'Heating milk briefly to kill germs, an idea that grew from Louis Pasteur’s work in the 1860s, made milk far safer to drink.'),
  entry('CATTLE', 'Health', 'Cows, bulls and oxen', 'Rinderpest, a deadly cattle plague, was declared eradicated in 2011, only the second disease ever wiped out.'),
  entry('PREVENT', 'Health', 'Stop something before it starts', 'Vaccination against HPV, introduced in 2006, has sharply reduced cervical cancer among vaccinated women.'),
  entry('PROSTHETIC', 'Health', 'An artificial limb', 'Modern prosthetic legs with springy carbon-fibre blades let amputee athletes run at elite speeds.'),
  entry('HEARTS', 'Health', 'They beat in every chest', 'The first human heart transplant was performed in Cape Town in 1967, and many thousands now take place every year.'),
  entry('WATER', 'Health', 'Every living thing needs it', 'Between 2000 and 2020, around two billion people gained access to safely managed drinking water.'),
  entry('TOILETS', 'Health', 'Plumbing that protects health', 'Between 2000 and 2020 the share of people with no toilet at all fell by more than half worldwide.'),
  entry('SMILES', 'Health', 'What friendly faces wear', 'Fluoride toothpaste, in wide use since the 1970s, has helped cut tooth decay in children across many countries.'),

  // Energy
  entry('SOLAR', 'Energy', 'Power from our nearest star', 'The first practical silicon solar cell was demonstrated at Bell Labs in 1954; panels now power homes, satellites and whole towns.'),
  entry('WINDMILL', 'Energy', 'The old ancestor of a wind turbine', 'People have used windmills for over a thousand years, and their modern descendants now supply a growing share of the world’s electricity.'),
  entry('TURBINE', 'Energy', 'Blades that spin to make power', 'A single modern offshore wind turbine can make enough electricity for thousands of homes.'),
  entry('HYDRO', 'Energy', 'Power from moving water', 'Norway makes most of its electricity from hydropower, using rivers and lakes fed by rain and snow.'),
  entry('GEOTHERMAL', 'Energy', 'Heat from deep inside the earth', 'In Iceland, around nine in ten homes are heated with geothermal energy from beneath their feet.'),
  entry('BATTERY', 'Energy', 'It stores power for later', 'Lithium-ion battery prices fell by more than 80% between 2010 and 2023, making electric cars and home storage affordable.'),
  entry('SUNLIGHT', 'Energy', 'It warms your face on a clear day', 'More energy from the sun reaches Earth in about an hour and a half than all of humanity uses in a year.'),
  entry('CLEAN', 'Energy', 'Free from dirt and smoke', 'Solar module prices fell by around 90% during the 2010s, making clean power one of the cheapest ways to make electricity.'),
  entry('ELECTRICITY', 'Energy', 'What flows through the wires', 'The share of people in the world with access to electricity grew from about 78% in 2000 to over 90% by 2021.'),
  entry('BULBS', 'Energy', 'They glow in lamps', 'LED bulbs use at least 75% less energy than old incandescent bulbs and can last many times longer.'),
  entry('EFFICIENT', 'Energy', 'Doing more with less', 'A typical new American fridge uses about a quarter of the electricity of one from the mid-1970s, while holding more.'),
  entry('HEATPUMP', 'Energy', 'It moves warmth instead of burning fuel', 'A heat pump can deliver three or more units of heat for every unit of electricity it uses.'),
  entry('TIDES', 'Energy', 'The sea rising and falling twice a day', 'The La Rance tidal power station in France has been making electricity from the tides since 1966.'),
  entry('BICYCLE', 'Energy', 'Two wheels and pedals', 'The Netherlands has more bicycles than people, and cycling there is an everyday way to get to school and work.'),
  entry('ELECTRIC', 'Energy', 'Powered by a current', 'In 2023, more than eight in ten new cars sold in Norway were fully electric.'),
  entry('RECYCLE', 'Energy', 'Make old things useful again', 'Aluminium can be recycled again and again, and recycling it uses about 95% less energy than making it new.'),
  entry('COMPOST', 'Energy', 'Kitchen scraps turned into soil', 'Composting food scraps returns nutrients to the soil and keeps them out of landfill, where they would release methane.'),
  entry('RENEWABLE', 'Energy', 'Energy that keeps coming back', 'In 2023, more than four in five of the new power plants added worldwide, by capacity, ran on renewable energy.'),
  entry('WINDY', 'Energy', 'Weather for flying kites', 'Denmark gets around half of its electricity from wind power in a typical year.'),
  entry('INSULATION', 'Energy', 'A warm layer inside walls and lofts', 'Insulating a home’s loft and walls can cut the heat it loses by a large share, keeping people warm for less.'),
  entry('PANELS', 'Energy', 'Flat rectangles that soak up sun', 'Solar panels usually come with performance warranties of 25 years, and many keep working well beyond that.'),
  entry('MICROGRID', 'Energy', 'A small local power network', 'Small solar-powered grids now bring electricity to villages far from any national power line.'),
  entry('TRAINS', 'Energy', 'They run on rails', 'Travelling by train typically produces far less carbon per passenger than driving alone or flying the same distance.'),
  entry('LANTERN', 'Energy', 'A light you can carry', 'Small solar lanterns have replaced smoky kerosene lamps in millions of homes, giving children clean light to study by.'),
  entry('STOVES', 'Energy', 'Where cooking happens', 'Clean cooking stoves cut the indoor smoke that harms families who cook over open fires.'),
  entry('UNLEADED', 'Energy', 'Petrol without a harmful metal', 'Leaded petrol was phased out worldwide in 2021, when the last stocks were used up in Algeria.'),
  entry('WATTS', 'Energy', 'The unit that measures power', 'James Watt’s improved steam engine of the 1770s used far less coal than earlier designs, and the unit of power is named after him.'),
  entry('DYNAMO', 'Energy', 'A machine that turns motion into current', 'Michael Faraday showed in 1831 that moving a magnet near a wire makes electricity, the principle behind almost every power station.'),
  entry('SPARK', 'Energy', 'A tiny flash that starts a fire', 'Alessandro Volta built the first electric battery in 1800 by stacking discs of metal and brine-soaked cloth.'),
  entry('RIVERBOAT', 'Energy', 'A vessel for inland waters', 'Electric ferries now cross fjords in Norway, carrying cars and passengers without burning fuel.'),
  entry('CHARGER', 'Energy', 'It fills a battery back up', 'Public charging points for electric cars grew from a few thousand worldwide in 2010 to millions by 2023.'),
  entry('SOLSTICE', 'Energy', 'The longest or shortest day of the year', 'People have tracked the sun for thousands of years; Stonehenge lines up with the sunrise of the summer solstice.'),
  entry('OFFSHORE', 'Energy', 'Out at sea, away from the coast', 'The world’s first offshore wind farm opened off Denmark in 1991, and offshore wind now powers millions of homes.'),
  entry('THERMAL', 'Energy', 'To do with heat', 'Solar water heaters on rooftops supply hot water to tens of millions of homes, especially in China.'),
  entry('FURNACE', 'Energy', 'A very hot oven for metal', 'Electric arc furnaces make new steel mostly from scrap, using far less energy than making steel from iron ore.'),
  entry('MOTION', 'Energy', 'Movement', 'Regenerative brakes in electric trains and cars turn the energy of slowing down back into electricity.'),

  // Nature
  entry('WHALE', 'Nature', 'The largest animal in the sea', 'After a worldwide pause on commercial whaling took effect in 1986, many humpback whale populations recovered strongly.'),
  entry('OZONE', 'Nature', 'A high layer that shields us from the sun', 'The 1987 Montreal Protocol, the first treaty ratified by every UN member state, is helping the ozone layer heal.'),
  entry('EAGLE', 'Nature', 'A bird on many flags and coins', 'The bald eagle, down to about 400 nesting pairs in the lower 48 United States in the 1960s, was taken off the endangered list in 2007.'),
  entry('PANDA', 'Nature', 'A black-and-white bamboo eater', 'In 2016 the giant panda was moved from “endangered” to “vulnerable” after decades of forest protection in China.'),
  entry('GORILLA', 'Nature', 'A gentle great ape', 'Mountain gorillas, which numbered around 250 in the early 1980s, grew to more than 1,000 thanks to protection and community work.'),
  entry('WILDCAT', 'Nature', 'A cat that belongs to no one', 'The Iberian lynx grew from fewer than 100 animals in 2002 to more than 2,000 by 2023.'),
  entry('OTTER', 'Nature', 'A playful river swimmer', 'Otters, once nearly gone from much of England because of pesticides, have returned to rivers in every English county.'),
  entry('BEAVER', 'Nature', 'A builder of dams', 'Beavers, hunted out of Britain centuries ago, are back in Scottish and English rivers, where their dams help slow floods.'),
  entry('WOLVES', 'Nature', 'Pack animals that howl', 'Wolves were brought back to Yellowstone in 1995, and the park’s rivers, trees and wildlife have been changing around their return.'),
  entry('BISON', 'Nature', 'A huge shaggy plains animal', 'American bison fell to fewer than 1,000 by the late 1800s; conservation has brought their numbers back to hundreds of thousands.'),
  entry('CORAL', 'Nature', 'Reefs are built from it', 'Scientists and volunteers now grow corals in underwater nurseries and replant them on damaged reefs.'),
  entry('FOREST', 'Nature', 'Many trees together', 'Costa Rica roughly doubled its forest cover between the 1980s and the 2010s by paying landowners to protect and replant.'),
  entry('TREES', 'Nature', 'They give shade and fresh air', 'A large street tree can cool the air around it by several degrees on a hot day.'),
  entry('GREEN', 'Nature', 'The colour of growing things', 'Satellite images showed the Earth became measurably greener between 2000 and 2017, with China and India leading the change.'),
  entry('POLLINATE', 'Nature', 'What bees do for flowers', 'About three quarters of the world’s major food crops benefit at least in part from animal pollinators.'),
  entry('WETLAND', 'Nature', 'A marsh, swamp or bog', 'Wetlands soak up floodwater like sponges, and the Ramsar Convention has protected thousands of them since 1971.'),
  entry('RIVERS', 'Nature', 'They run down to the sea', 'The River Thames was declared biologically dead in 1957; today seals and porpoises are seen in it.'),
  entry('OCEAN', 'Nature', 'The great salt water', 'In 2023 nations agreed the High Seas Treaty, the first global agreement to protect marine life in international waters.'),
  entry('WILDERNESS', 'Nature', 'Untamed land', 'Yellowstone, created in 1872, is widely considered the world’s first national park; there are now thousands of them.'),
  entry('SEEDS', 'Nature', 'What a plant grows from', 'The Svalbard Global Seed Vault, opened in 2008, keeps safe backup copies of more than a million seed samples from around the world.'),
  entry('FALCON', 'Nature', 'The fastest diving bird', 'The peregrine falcon, devastated by the pesticide DDT, recovered after DDT was banned and left the US endangered list in 1999.'),
  entry('CONDOR', 'Nature', 'A giant vulture of the Americas', 'California condors fell to just 27 birds in 1987; careful breeding and release brought them back to more than 500.'),
  entry('PARROT', 'Nature', 'A bright bird that can mimic speech', 'New Zealand’s flightless kākāpō parrot grew from about 50 birds in the 1990s to more than 200 through devoted care.'),
  entry('HUMPBACK', 'Nature', 'A singing whale with long fins', 'Humpback whales off eastern Australia grew from a few hundred in the 1960s to tens of thousands.'),
  entry('SEAHORSE', 'Nature', 'A tiny fish that swims upright', 'Seahorses have been found living in the River Thames, a river once declared biologically dead.'),
  entry('BREATHE', 'Nature', 'What your lungs do', 'After London’s deadly smog of 1952, the Clean Air Act of 1956 began clearing the city’s air.'),
  entry('RAINDROP', 'Nature', 'A single drop from a cloud', 'Acid rain in Europe and North America fell sharply after limits on sulphur pollution from the 1980s onward.'),
  entry('REWILD', 'Nature', 'Let nature take back over', 'Since 2001 the Knepp estate in England has let farmland return to the wild, and rare birds and butterflies have flourished there.'),
  entry('MANGROVE', 'Nature', 'A tree whose roots stand in the sea', 'Mangrove forests shield coasts from storms, and many countries are replanting them along their shores.'),
  entry('BUTTERFLY', 'Nature', 'It began as a caterpillar', 'The large blue butterfly died out in Britain in 1979, was reintroduced, and now thrives at dozens of sites.'),
  entry('KITES', 'Nature', 'They fly on strings, or soar as birds', 'Red kites, down to a few pairs in Wales, were reintroduced to England and Scotland from 1989 and now number in the thousands.'),
  entry('SALMON', 'Nature', 'A fish that swims upstream to spawn', 'Salmon have returned in large numbers to the River Tyne, once one of the most polluted rivers in Britain.'),
  entry('TIGER', 'Nature', 'A striped big cat', 'India’s wild tiger count more than doubled between 2006 and 2022.'),
  entry('OSPREY', 'Nature', 'A fish-catching hawk', 'Ospreys, gone from England for about 150 years, returned to breed in the Lake District in 2001.'),
  entry('STORK', 'Nature', 'A tall bird of folklore', 'In 2020 white storks bred in the wild in Britain for the first time in over 600 years.'),
  entry('SEABIRD', 'Nature', 'A bird that lives by the sea', 'South Georgia was declared free of invasive rats in 2018, letting millions of seabirds nest safely again.'),
  entry('TORTOISE', 'Nature', 'A slow reptile with a dome-shaped shell', 'Only 14 Española giant tortoises were left in the 1960s; a breeding programme returned more than 2,000 to their island.'),
  entry('ANTELOPE', 'Nature', 'A graceful horned grazer', 'The Arabian oryx, extinct in the wild by 1972, was reintroduced and in 2011 became the first animal to go from “extinct in the wild” to “vulnerable”.'),
  entry('HORSES', 'Nature', 'Animals with manes and hooves', 'Przewalski’s horses, once extinct in the wild, roam the grasslands of Mongolia again after reintroduction in the 1990s.'),
  entry('PEATLAND', 'Nature', 'Boggy ground made of old plants', 'Peatlands cover only about 3% of the world’s land but store roughly twice as much carbon as all its forests.'),
  entry('TOPSOIL', 'Nature', 'The rich upper layer of the ground', 'A handful of healthy soil can hold billions of living microbes that help plants grow.'),
  entry('AMAZON', 'Nature', 'The world’s largest rainforest', 'Brazil cut deforestation in the Amazon by around 80% between 2004 and 2012 through enforcement and protected areas.'),
  entry('TERRACES', 'Nature', 'Steps cut into a hillside', 'Restoration of China’s Loess Plateau from the 1990s turned eroded hills into green, productive land for millions of farmers.'),
  entry('BLOSSOM', 'Nature', 'Spring flowers on a tree', 'Many cities plant street trees that flower in spring, and studies link green streets with lower stress.'),
  entry('MEADOW', 'Nature', 'A field of grass and wildflowers', 'Roadside verges managed for wildflowers can become rich meadows that feed bees and butterflies.'),
  entry('HEDGEHOG', 'Nature', 'A small spiny night visitor', 'Gardeners help hedgehogs roam by cutting small gaps in fences, linking gardens into safe corridors.'),
  entry('RHINO', 'Nature', 'A horned giant of the savanna', 'Southern white rhinos, reduced to fewer than 100 around 1900, were brought back to many thousands by protection.'),
  entry('SNOWDROP', 'Nature', 'An early white flower of late winter', 'Snowdrops push up through cold ground each year, often flowering while snow is still about.'),
  entry('ACORN', 'Nature', 'The seed of an oak', 'A single oak tree can support hundreds of species of insects, birds and fungi.'),
  entry('PUFFIN', 'Nature', 'A seabird with a colourful beak', 'In Maine, puffins were coaxed back to nest on islands they had abandoned, starting with a project in 1973.'),
  entry('MARINE', 'Nature', 'To do with the sea', 'Fish inside well-protected marine reserves typically grow larger and more plentiful, spilling over into nearby waters.'),
  entry('CLEANUP', 'Nature', 'Tidying a beach or a park', 'Volunteers around the world remove millions of kilograms of litter from beaches every year during coastal clean-up days.'),
  entry('REEFS', 'Nature', 'Underwater cities of coral', 'Some corals are naturally more heat-tolerant, and scientists are breeding them to help reefs adapt.'),

  // Rights
  entry('VOTES', 'Rights', 'What an election counts', 'In 1893 New Zealand became the first self-governing country to give women the vote in national elections.'),
  entry('SUFFRAGE', 'Rights', 'The right to vote', 'Women can now vote in almost every country in the world, a change that took place within a little over a century.'),
  entry('EQUAL', 'Rights', 'The same for everyone', 'Worldwide, girls and boys now enrol in primary school at nearly equal rates.'),
  entry('LITERACY', 'Rights', 'Being able to read and write', 'In 1820 only about one in eight adults in the world could read; by 2020 almost nine in ten could.'),
  entry('SCHOOL', 'Rights', 'Where children learn', 'In 1950 about half of the world’s adults had never been to school; by 2015 it was fewer than one in six.'),
  entry('ABOLITION', 'Rights', 'Ending something for good', 'In 1833 Britain passed the Slavery Abolition Act after decades of campaigning by abolitionists and by enslaved people themselves.'),
  entry('FREEDOM', 'Rights', 'Being free', 'In 1865 the Thirteenth Amendment abolished slavery in the United States.'),
  entry('RIGHTS', 'Rights', 'What every person is owed', 'The Universal Declaration of Human Rights, adopted in 1948, has been translated into more than 500 languages.'),
  entry('VOICE', 'Rights', 'What lets you speak up', 'In 1963 Martin Luther King Jr. shared his dream with a crowd of about 250,000 people in Washington.'),
  entry('PRIDE', 'Rights', 'A warm feeling about who you are', 'In 2001 the Netherlands became the first country to let same-sex couples marry; dozens of countries have since followed.'),
  entry('BALLOT', 'Rights', 'A paper you vote on', 'The secret ballot, first used widely in Australia in 1856, lets people vote freely without fear.'),
  entry('JUSTICE', 'Rights', 'Fairness under the law', 'Magna Carta, sealed in 1215, set down the idea that even a ruler is subject to the law.'),
  entry('BRAILLE', 'Rights', 'Raised dots read with the fingers', 'Louis Braille invented his reading system as a teenager in the 1820s; it is now used in many languages around the world.'),
  entry('ACCESS', 'Rights', 'A way in', 'The Americans with Disabilities Act of 1990 made ramps, accessible transport and fair hiring a legal right.'),
  entry('WHEELCHAIR', 'Rights', 'A chair that rolls', 'The first Paralympic Games were held in Rome in 1960 with about 400 athletes; thousands now take part.'),
  entry('LABOUR', 'Rights', 'Work, and the people who do it', 'In 1919 the new International Labour Organization adopted its first convention, on the eight-hour working day.'),
  entry('CHILDREN', 'Rights', 'Young people', 'The number of children in child labour fell by about 86 million between 2000 and 2020.'),
  entry('LIBRARY', 'Rights', 'A room full of books to borrow', 'Andrew Carnegie paid for more than 2,500 public libraries around the world between 1883 and 1929.'),
  entry('GRADUATE', 'Rights', 'To finish a course of study', 'Women now outnumber men in university enrolment worldwide, a reversal of the pattern a few generations ago.'),
  entry('PENSION', 'Rights', 'Income for later life', 'Germany introduced the first national old-age pension in 1889, and most countries now have one.'),
  entry('WEEKEND', 'Rights', 'Saturday and Sunday', 'In 1926 Henry Ford moved his factories to a five-day, 40-hour week, helping make the two-day weekend normal.'),
  entry('PARENTS', 'Rights', 'Mothers and fathers', 'In 1974 Sweden became the first country to offer paid parental leave to fathers as well as mothers.'),
  entry('COURAGE', 'Rights', 'Being brave when it matters', 'In 1955 Rosa Parks refused to give up her bus seat, sparking the Montgomery bus boycott and a wave of change.'),
  entry('ELECTION', 'Rights', 'A day when people choose leaders', 'India’s general elections are the largest democratic exercise in history, with hundreds of millions of voters.'),
  entry('CITIZEN', 'Rights', 'A member of a country', 'The share of people living in democracies grew from a small minority in 1900 to roughly half of the world by the 2000s.'),
  entry('TEACHERS', 'Rights', 'People who help others learn', 'The number of trained teachers in the world grew enormously as school became free and compulsory in country after country.'),
  entry('DIGNITY', 'Rights', 'The worth every person has', 'The first article of the Universal Declaration of Human Rights says all people are born free and equal in dignity and rights.'),
  entry('MOTHERS', 'Rights', 'Women who raise children', 'The number of women dying from pregnancy and childbirth worldwide fell by about a third between 2000 and 2020.'),
  entry('ASYLUM', 'Rights', 'Protection in a new country', 'The 1951 Refugee Convention set out the right of people fleeing persecution not to be sent back into danger.'),
  entry('UNIONS', 'Rights', 'Workers standing together', 'Trade unions won many things people now take for granted, such as paid holidays and safety rules at work.'),
  entry('SIGNING', 'Rights', 'Talking with your hands', 'Sign languages are full languages with their own grammar, and many countries now recognise them in law.'),
  entry('ALPHABET', 'Rights', 'From A to Z', 'In 1443 King Sejong introduced Hangul, an alphabet designed so that ordinary people in Korea could learn to read quickly.'),
  entry('INCLUSION', 'Rights', 'Making room for everyone', 'In 2006 the UN adopted the Convention on the Rights of Persons with Disabilities, now ratified by most of the world.'),
  entry('MARCHERS', 'Rights', 'People walking together for a cause', 'In 1930 Gandhi and his followers walked about 380 kilometres to the sea in the Salt March, a peaceful protest seen around the world.'),
  entry('JURORS', 'Rights', 'Citizens who decide a trial', 'Trial by a jury of ordinary citizens has been part of English law for centuries and spread to many other countries.'),

  // Peace
  entry('PEACE', 'Peace', 'When the fighting stops', 'Norway and Sweden separated peacefully in 1905, without a shot being fired.'),
  entry('TREATY', 'Peace', 'A signed promise between nations', 'The 1959 Antarctic Treaty set aside a whole continent for peace and science.'),
  entry('NEIGHBOURS', 'Peace', 'The people next door', 'Canada and the United States share the world’s longest international border and have been at peace for more than 200 years.'),
  entry('AGREEMENT', 'Peace', 'When both sides say yes', 'The Good Friday Agreement of 1998 brought peace to Northern Ireland after decades of conflict.'),
  entry('UNITY', 'Peace', 'Many becoming one', 'The fall of the Berlin Wall in 1989 reunited families who had been kept apart for nearly thirty years.'),
  entry('RELIEF', 'Peace', 'Help in hard times', 'UNICEF was created in 1946 to help children after the Second World War and now works in more than 190 countries and territories.'),
  entry('KINDNESS', 'Peace', 'Gentle care for others', 'Every year people around the world make more than 100 million blood donations for strangers they will never meet.'),
  entry('VOLUNTEER', 'Peace', 'Someone who helps for free', 'Hundreds of millions of people around the world give their time as volunteers every year.'),
  entry('HUMANITY', 'Peace', 'All of us together', 'The Red Cross was founded in 1863 after Henry Dunant saw wounded soldiers left without care after a battle.'),
  entry('DIPLOMACY', 'Peace', 'Solving disagreements with talk', 'The 1978 Camp David Accords led to a peace treaty between Egypt and Israel that has held since 1979.'),
  entry('MEDIATOR', 'Peace', 'Someone who helps two sides agree', 'Chile and Argentina settled their long dispute over the Beagle Channel with the Pope’s mediation in 1984.'),
  entry('FRIENDSHIP', 'Peace', 'What good friends share', 'After the Second World War, towns in former enemy countries began twinning with each other; thousands of such links now exist.'),
  entry('ATHLETES', 'Peace', 'People who compete in sport', 'The modern Olympic Games, revived in 1896, bring together athletes from more than 200 nations.'),
  entry('REFUGE', 'Peace', 'A safe place', 'In 2016 a team of refugee athletes competed at the Olympic Games for the first time.'),
  entry('RECONCILE', 'Peace', 'To make friends again', 'South Africa’s Truth and Reconciliation Commission began in 1996 to help a nation face its past and heal.'),
  entry('DISARM', 'Peace', 'To lay down weapons', 'The world’s stockpile of nuclear warheads has fallen by more than 80% since its peak in the mid-1980s.'),
  entry('LANDMINE', 'Peace', 'A hidden danger in the ground', 'The 1997 Mine Ban Treaty has been joined by more than 160 countries, and tens of millions of stockpiled mines have been destroyed.'),
  entry('CEASEFIRE', 'Peace', 'When the guns fall silent', 'Colombia’s 2016 peace agreement ended more than 50 years of conflict with the FARC.'),
  entry('TRUCE', 'Peace', 'A pause in fighting', 'At Christmas 1914, soldiers on opposite sides of the First World War met in no man’s land to sing and exchange gifts.'),
  entry('CHOIR', 'Peace', 'People singing together', 'Studies of choirs have found that singers’ heartbeats can fall into step as they sing together.'),
  entry('WEBSITE', 'Tech', 'A page on the internet', 'In 1993 CERN released the software for the World Wide Web free for anyone to use, without patents or fees.'),
  entry('NONVIOLENCE', 'Peace', 'Change without force', 'Research on movements from 1900 to 2006 found that nonviolent campaigns succeeded about twice as often as violent ones.'),
  entry('VELVET', 'Peace', 'A soft, smooth fabric', 'Czechoslovakia’s Velvet Revolution of 1989 ended decades of one-party rule without bloodshed.'),
  entry('HUMANCHAIN', 'Peace', 'People holding hands in a line', 'In 1989 about two million people held hands in a chain stretching some 675 kilometres across Estonia, Latvia and Lithuania.'),
  entry('PEACEFUL', 'Peace', 'Calm and free of conflict', 'Costa Rica abolished its army in 1948 and has invested in schools and health care instead.'),
  entry('LETTERS', 'Peace', 'What a postbox swallows', 'The Universal Postal Union, founded in 1874, lets a letter cross almost any border on Earth.'),
  entry('ORCHESTRA', 'Peace', 'Many musicians playing as one', 'The West-Eastern Divan Orchestra, founded in 1999, brings together young Israeli and Arab musicians.'),
  entry('LANGUAGE', 'Peace', 'Words a people share', 'Esperanto was created in 1887 to help people from different nations talk as equals.'),
  entry('NEUTRAL', 'Peace', 'Taking no side', 'Switzerland has not fought in an international war since 1815.'),
  entry('HANDSHAKE', 'Peace', 'A greeting with hands', 'The 1995 Dayton Agreement ended the war in Bosnia and Herzegovina.'),
  entry('PEACETIME', 'Peace', 'The years without war', 'The Rush–Bagot Agreement of 1817 limited warships on the Great Lakes, an early step toward a peaceful border.'),
  entry('APOLOGY', 'Peace', 'Saying sorry and meaning it', 'In 2008 Australia’s prime minister formally apologised to the Stolen Generations of Aboriginal and Torres Strait Islander people.'),
  entry('GENEROUS', 'Peace', 'Glad to give', 'In large global surveys, more than half of people say they helped a stranger in the past month.'),
  entry('GRATITUDE', 'Peace', 'Thankfulness', 'Studies find that writing down a few things you are thankful for can lift mood over the following weeks.'),
  entry('COOPERATE', 'Peace', 'Work together', 'The International Space Station has been built and crewed by people from more than a dozen countries working together.'),
  entry('SANCTUARY', 'Peace', 'A safe and quiet place', 'The Peace Palace in The Hague, opened in 1913, houses courts where countries settle disputes by law instead of force.'),
  entry('CHARITY', 'Peace', 'Giving to those in need', 'Rotary’s volunteers raised money for polio vaccination for decades, helping bring the disease close to eradication.'),
  entry('EMBASSY', 'Peace', 'A country’s home in another country', 'The Vienna Convention of 1961 set out protections that let diplomats talk safely even between rival countries.'),

  // Tech
  entry('ONLINE', 'Tech', 'Connected to the internet', 'By 2023, about two thirds of the people in the world were using the internet.'),
  entry('PRINTING', 'Tech', 'Putting words on paper by machine', 'Gutenberg’s printing press, from the 1450s, made books far cheaper and helped knowledge spread across Europe.'),
  entry('TELESCOPE', 'Tech', 'A tube that brings far things near', 'The Hubble Space Telescope, launched in 1990, has made more than 1.5 million observations of the universe.'),
  entry('FORECAST', 'Tech', 'A guess about tomorrow’s weather', 'Weather forecasts have gained roughly a day of accuracy every decade since the 1980s, giving people more time to prepare for storms.'),
  entry('SATELLITE', 'Tech', 'It circles the Earth', 'Since 1972 the Landsat satellites have photographed the Earth continuously, helping track forests, farms and water.'),
  entry('ASTRONAUT', 'Tech', 'Someone who travels into space', 'In 1969 Apollo 11 landed people on the Moon, a moment watched live by hundreds of millions on Earth.'),
  entry('GENOME', 'Tech', 'The full set of a living thing’s DNA', 'The Human Genome Project, completed in 2003, made its map of human DNA freely available to scientists everywhere.'),
  entry('MICROSCOPE', 'Tech', 'A lens for seeing tiny things', 'In the 1670s Antonie van Leeuwenhoek became the first person to see bacteria, through a microscope he made himself.'),
  entry('MOBILE', 'Tech', 'A phone you carry', 'M-Pesa, launched in Kenya in 2007, let millions of people send and save money by phone without a bank account.'),
  entry('SHARE', 'Tech', 'To give part of what you have', 'Wikipedia, started in 2001, is written by volunteers and free to read in more than 300 languages.'),
  entry('SOFTWARE', 'Tech', 'Programs that run on computers', 'Linux, free software started by a student in 1991, now runs most of the world’s web servers and every one of the top 500 supercomputers.'),
  entry('LEARN', 'Tech', 'What curiosity helps you do', 'The brain keeps forming new connections throughout life, so it is never too late to learn something new.'),
  entry('ORBIT', 'Tech', 'A path around a planet', 'The International Space Station has had people living aboard continuously since November 2000.'),
  entry('VOYAGER', 'Tech', 'A long-distance traveller', 'Voyager 1, launched in 1977, became the most distant human-made object and kept sending messages home for decades.'),
  entry('IRRIGATION', 'Tech', 'Bringing water to crops', 'Drip irrigation, developed in Israel in the 1960s, delivers water straight to plant roots and wastes far less of it.'),
  entry('HARVEST', 'Tech', 'Gathering ripe crops', 'World cereal production more than tripled between 1961 and the 2010s, while the land used for it grew far less.'),
  entry('WHEAT', 'Tech', 'A grain for bread', 'Norman Borlaug’s high-yield wheat helped Mexico, India and Pakistan greatly increase their harvests, earning him the 1970 Nobel Peace Prize.'),
  entry('PADDY', 'Tech', 'A flooded field for rice', 'New rice varieties released from the 1960s helped many Asian countries grow far more food on the same land.'),
  entry('PROGRESS', 'Tech', 'Moving forward, step by step', 'The share of people in extreme poverty fell from around four in ten in 1990 to under one in ten by 2019.'),
  entry('FLIGHT', 'Tech', 'Travelling through the air', 'The Wright brothers’ first powered flight in 1903 lasted 12 seconds; 66 years later people walked on the Moon.'),
  entry('SEATBELT', 'Tech', 'It holds you safe in a car', 'Nils Bohlin of Volvo invented the three-point seatbelt in 1959, and Volvo made the design free for every carmaker.'),
  entry('ALARMS', 'Tech', 'They beep to warn you', 'Working smoke alarms roughly halve the risk of dying in a home fire.'),
  entry('LIGHTNING', 'Tech', 'A flash in a stormy sky', 'Benjamin Franklin’s lightning rod, from the 1750s, still protects buildings from fire today.'),
  entry('NAVIGATE', 'Tech', 'Find your way', 'After 1983 the United States opened satellite navigation to civilian use, and GPS now helps rescue teams find people in trouble.'),
  entry('ELEVATOR', 'Tech', 'A moving room between floors', 'In 1854 Elisha Otis demonstrated his safety brake, making lifts safe and tall buildings practical.'),
  entry('GENES', 'Tech', 'Instructions inherited from your parents', 'The first CRISPR-based treatment, for sickle cell disease, was approved in 2023, eleven years after the method was described.'),
  entry('RESEARCH', 'Tech', 'Careful study to find something new', 'Decades of patient work on mRNA by Katalin Karikó and Drew Weissman made fast vaccines possible and won the 2023 Nobel Prize.'),
  entry('PAPER', 'Tech', 'You write on it', 'Paper was invented in China around 2,000 years ago and later spread along trade routes to the rest of the world.'),
  entry('COMPASS', 'Tech', 'It always points north', 'The magnetic compass, used for navigation in China and Europe by the 1100s, helped sailors find their way safely.'),
  entry('VACCINES', 'Tech', 'Shots that protect us', 'Vaccines against measles, polio, tetanus and other diseases are estimated to have saved over 150 million lives between 1974 and 2024.'),
  entry('RADIO', 'Tech', 'Voices through the air', 'In 1901 Guglielmo Marconi sent a radio signal across the Atlantic, connecting continents without wires.'),
  entry('TELEPHONE', 'Tech', 'A device for talking far away', 'Alexander Graham Bell made the first telephone call in 1876, asking his assistant Thomas Watson to come and see him.'),
  entry('CAMERA', 'Tech', 'It captures a picture', 'The first photograph of the whole Earth from far away, taken in 1972, became one of the most shared images in history.'),
  entry('EARTHRISE', 'Tech', 'A planet coming up over the Moon', 'In 1968 the crew of Apollo 8 photographed the Earth rising over the Moon, an image many credit with inspiring care for the planet.'),
  entry('CALCULATE', 'Tech', 'Work out the numbers', 'Katherine Johnson’s calculations helped send the first Americans into orbit and to the Moon.'),
  entry('BRIDGE', 'Tech', 'It carries a road over water', 'The Øresund Bridge, opened in 2000, links Denmark and Sweden so people can live in one country and work in the other.'),
  entry('TUNNEL', 'Tech', 'A passage under ground or sea', 'The Channel Tunnel, opened in 1994, linked Britain and France by rail beneath the sea.'),
  entry('ROBOTS', 'Tech', 'Machines that move on their own', 'Rovers on Mars have driven across its surface for decades, studying rocks from millions of kilometres away.'),
  entry('ROVER', 'Tech', 'A wheeled explorer', 'Opportunity was designed to work on Mars for 90 days and kept exploring for nearly 15 years.'),
  entry('TRANSLATE', 'Tech', 'Turn words into another language', 'The Rosetta Stone, found in 1799, let scholars read Egyptian hieroglyphs again after more than a thousand years.'),
  entry('CIPHERS', 'Tech', 'Secret codes', 'Codebreakers at Bletchley Park, including Alan Turing, are credited with helping to shorten the Second World War.'),
  entry('PROGRAMMER', 'Tech', 'Someone who writes code', 'Ada Lovelace wrote what is often called the first computer program in 1843, for a machine not yet built.'),
  entry('ENGINEER', 'Tech', 'Someone who designs and builds', 'The Netherlands’ Delta Works, built after the flood of 1953, protect millions of people living below sea level.'),
  entry('DESALINATE', 'Tech', 'Remove the salt from seawater', 'Israel now gets much of its household drinking water from seawater with the salt removed.'),
  entry('FERTILE', 'Tech', 'Good for growing things', 'Farmers using no-till methods leave the soil undisturbed, protecting it from erosion and keeping it alive.'),
  entry('ARCHIVE', 'Tech', 'A collection kept for the future', 'The Internet Archive has saved hundreds of billions of web pages since 1996 so they are not lost.'),
  entry('MAPPING', 'Tech', 'Drawing the shape of a place', 'Volunteers on OpenStreetMap have mapped roads and buildings in disaster zones within days to help relief teams.'),
  entry('TELEGRAPH', 'Tech', 'Messages sent along a wire', 'The first transatlantic telegraph cable, in 1858, carried a message between Britain and America in hours rather than weeks.'),
]

const DAY_MS = 24 * 60 * 60 * 1000
const START = Date.UTC(2025, 0, 1)
const SHUFFLE_SEED = 20250101

// A fixed, seeded shuffle: themes are mixed day to day, and every word returns
// exactly once per full pass of the list.
function seededOrder(length: number, seed: number): number[] {
  const order = Array.from({ length }, (_, i) => i)
  let state = seed >>> 0
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

const DAILY_ORDER = seededOrder(wordList.length, SHUFFLE_SEED)

/** The word for the UTC day containing `date`. */
export function getWordForDay(date: Date): WordData {
  const day = Math.floor((date.getTime() - START) / DAY_MS)
  const position = ((day % wordList.length) + wordList.length) % wordList.length
  return wordList[DAILY_ORDER[position]]
}

/** The word of the day. Changes at midnight UTC. */
export function getWordOfDay(): WordData {
  return getWordForDay(new Date())
}
