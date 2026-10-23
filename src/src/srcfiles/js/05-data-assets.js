/* =====================================================================
 * 05-data-assets.js — homes, rentals, vehicles, valuables, pets,
 * vacations and investments. Prices are US-baseline dollars.
 * Brand names are invented on purpose. Multi-unit homes (units > 1) house
 * you and tenants at once (49-cities.js); their beds are per unit.
 * Pure data.
 * ===================================================================== */

const HOUSE_TYPES = [
  { id: 'studio', name: 'Studio Apartment', emoji: '🏢', base: 110000, beds: [0, 1], w: 10 },
  { id: 'condo', name: 'Condo', emoji: '🏙️', base: 210000, beds: [1, 2], w: 12 },
  { id: 'townhouse', name: 'Townhouse', emoji: '🏘️', base: 290000, beds: [2, 3], w: 12 },
  { id: 'cabin', name: 'Cabin', emoji: '🌲', base: 160000, beds: [1, 3], w: 5 },
  { id: 'house', name: 'House', emoji: '🏠', base: 380000, beds: [3, 4], w: 14 },
  { id: 'farmhouse', name: 'Farmhouse', emoji: '🌾', base: 320000, beds: [3, 5], w: 5 },
  { id: 'family', name: 'Family Home', emoji: '🏡', base: 560000, beds: [4, 5], w: 9 },
  { id: 'duplex', name: 'Duplex', emoji: '🏘️', base: 470000, beds: [2, 3], w: 5, units: 2 },
  { id: 'fourplex', name: 'Fourplex', emoji: '🏘️', base: 880000, beds: [2, 2], w: 3, units: 4 },
  { id: 'apartments', name: 'Apartment Building', emoji: '🏢', base: 2600000, beds: [1, 2], w: 1.5, units: 10 },
  { id: 'beach', name: 'Beach House', emoji: '🏖️', base: 950000, beds: [3, 5], w: 4 },
  { id: 'luxury', name: 'Luxury Home', emoji: '🏛️', base: 1500000, beds: [4, 6], w: 4 },
  { id: 'penthouse', name: 'Penthouse', emoji: '🌆', base: 3200000, beds: [3, 5], w: 2 },
  { id: 'mansion', name: 'Mansion', emoji: '🏰', base: 6500000, beds: [6, 10], w: 2 },
  { id: 'castle', name: 'Castle', emoji: '🏯', base: 22000000, beds: [10, 30], w: 0.6 },
];
const HOUSE_ADJ = ['Charming', 'Cozy', 'Modern', 'Rustic', 'Spacious', 'Historic', 'Renovated', 'Quaint', 'Sunny', 'Stylish', 'Drafty', 'Classic'];

const RENTAL_TYPES = [
  { id: 'room', name: 'Room in a Shared House', emoji: '🛏️', rent: 7200 },
  { id: 'studio', name: 'Studio Apartment', emoji: '🏢', rent: 13000 },
  { id: 'apt1', name: 'One-Bedroom Apartment', emoji: '🏙️', rent: 18000 },
  { id: 'apt2', name: 'Two-Bedroom Apartment', emoji: '🏘️', rent: 25000 },
  { id: 'house', name: 'Rented House', emoji: '🏠', rent: 34000 },
  { id: 'luxury', name: 'Luxury Apartment', emoji: '🌆', rent: 72000 },
];

const CAR_CLASSES = [
  { id: 'beater', name: 'Used Hatchback', emoji: '🚗', base: 4500, used: true, w: 10 },
  { id: 'compact', name: 'Compact', emoji: '🚗', base: 22000, w: 10 },
  { id: 'sedan', name: 'Sedan', emoji: '🚘', base: 30000, w: 10 },
  { id: 'pickup', name: 'Pickup Truck', emoji: '🚚', base: 42000, w: 7 },
  { id: 'suv', name: 'SUV', emoji: '🚙', base: 46000, w: 8 },
  { id: 'minivan', name: 'Minivan', emoji: '🚐', base: 38000, w: 5 },
  { id: 'electric', name: 'Electric Sedan', emoji: '🔋', base: 48000, w: 6 },
  { id: 'moto', name: 'Motorcycle', emoji: '🏍️', base: 14000, w: 5 },
  { id: 'classic', name: 'Classic Coupe', emoji: '🚙', base: 65000, used: true, w: 3 },
  { id: 'sports', name: 'Sports Car', emoji: '🏎️', base: 85000, w: 4 },
  { id: 'luxury', name: 'Luxury Sedan', emoji: '🚘', base: 110000, w: 4 },
  { id: 'super', name: 'Supercar', emoji: '🏎️', base: 320000, w: 1.5 },
  { id: 'hyper', name: 'Hypercar', emoji: '🏁', base: 2200000, w: 0.4 },
];
const CAR_BRANDS = ['Arden', 'Kestrel', 'Valora', 'Nimbus', 'Orrin', 'Halcyon', 'Strada', 'Brio', 'Talon', 'Veloce', 'Meridian', 'Solano', 'Rook', 'Fenwick', 'Aurelia', 'Calder', 'Juno', 'Marlowe', 'Vesper', 'Pellar'];

const BOAT_TYPES = [
  { id: 'jetski', name: 'Jet Ski', emoji: '🚤', base: 12000 },
  { id: 'fishing', name: 'Fishing Boat', emoji: '🛶', base: 35000 },
  { id: 'speed', name: 'Speedboat', emoji: '🚤', base: 90000 },
  { id: 'sail', name: 'Sailboat', emoji: '⛵', base: 160000 },
  { id: 'houseboat', name: 'Houseboat', emoji: '🛥️', base: 220000 },
  { id: 'yacht', name: 'Yacht', emoji: '🛥️', base: 2500000 },
  { id: 'superyacht', name: 'Superyacht', emoji: '🛳️', base: 40000000 },
];
const AIRCRAFT_TYPES = [
  { id: 'prop', name: 'Propeller Plane', emoji: '🛩️', base: 300000 },
  { id: 'heli', name: 'Helicopter', emoji: '🚁', base: 1800000 },
  { id: 'jet', name: 'Private Jet', emoji: '✈️', base: 25000000 },
];

const JEWELRY_TYPES = [
  { id: 'ring', name: 'Ring', emoji: '💍', base: 1500 },
  { id: 'necklace', name: 'Necklace', emoji: '📿', base: 2500 },
  { id: 'watch', name: 'Watch', emoji: '⌚', base: 8000 },
  { id: 'earrings', name: 'Earrings', emoji: '💎', base: 1200 },
  { id: 'bracelet', name: 'Bracelet', emoji: '📿', base: 2000 },
  { id: 'tiara', name: 'Tiara', emoji: '👑', base: 50000 },
];
const JEWEL_MATERIALS = [['Silver', 0.3], ['Gold', 1], ['Rose Gold', 1.1], ['Platinum', 1.8], ['Emerald', 2.6], ['Sapphire', 2.8], ['Ruby', 3], ['Diamond', 4.2]];

const INSTRUMENTS = [
  { id: 'ukulele', name: 'Ukulele', emoji: '🪕', base: 120 },
  { id: 'guitar', name: 'Guitar', emoji: '🎸', base: 600 },
  { id: 'keyboard', name: 'Keyboard', emoji: '🎹', base: 500 },
  { id: 'violin', name: 'Violin', emoji: '🎻', base: 1200 },
  { id: 'drums', name: 'Drum Kit', emoji: '🥁', base: 1500 },
  { id: 'sax', name: 'Saxophone', emoji: '🎷', base: 2000 },
  { id: 'trumpet', name: 'Trumpet', emoji: '🎺', base: 900 },
  { id: 'dj', name: 'DJ Setup', emoji: '🎧', base: 2500 },
  { id: 'cello', name: 'Cello', emoji: '🎻', base: 3000 },
  { id: 'piano', name: 'Grand Piano', emoji: '🎹', base: 28000 },
];

const ART_PIECES = ['Abstract canvas', 'Landscape painting', 'Bronze sculpture', 'Vintage poster', 'Portrait in oils', 'Street-art print', 'Marble bust', 'Watercolor seascape', 'Signed photograph', 'Ceramic vase'];
const ART_ARTISTS = ['A. Moreau', 'J. Okafor', 'L. Haverford', 'K. Tanaka', 'M. Ostrowski', 'R. Delacroix-Hunt', 'S. Varga', 'an unknown artist', 'T. Lindqvist', 'P. Abara'];

// Pets. life: [min, max] years. cost: adoption fee. upkeep: per year.
const PET_SPECIES = {
  dog: { name: 'Dog', emoji: '🐕', life: [10, 16], cost: 300, upkeep: 1200, breeds: ['Labrador', 'Beagle', 'Golden Retriever', 'Poodle', 'Bulldog', 'German Shepherd', 'Dachshund', 'Husky', 'Corgi', 'Mutt', 'Chihuahua', 'Border Collie'] },
  cat: { name: 'Cat', emoji: '🐈', life: [13, 20], cost: 150, upkeep: 800, breeds: ['Tabby', 'Siamese', 'Maine Coon', 'Persian', 'Ragdoll', 'Black Cat', 'Calico', 'Sphynx', 'Bengal'] },
  rabbit: { name: 'Rabbit', emoji: '🐇', life: [8, 12], cost: 80, upkeep: 400, breeds: ['Lop', 'Dutch', 'Lionhead', 'Rex'] },
  hamster: { name: 'Hamster', emoji: '🐹', life: [2, 3], cost: 25, upkeep: 120, breeds: ['Syrian', 'Dwarf', 'Roborovski'] },
  guinea: { name: 'Guinea Pig', emoji: '🐹', life: [5, 7], cost: 40, upkeep: 250, breeds: ['Abyssinian', 'Peruvian', 'American'] },
  parrot: { name: 'Parrot', emoji: '🦜', life: [20, 60], cost: 900, upkeep: 500, breeds: ['African Grey', 'Macaw', 'Cockatoo', 'Budgie', 'Cockatiel'] },
  fish: { name: 'Goldfish', emoji: '🐠', life: [3, 10], cost: 10, upkeep: 60, breeds: ['Comet', 'Fantail', 'Oranda'] },
  turtle: { name: 'Turtle', emoji: '🐢', life: [20, 40], cost: 60, upkeep: 200, breeds: ['Box Turtle', 'Red-Eared Slider', 'Tortoise'] },
  snake: { name: 'Snake', emoji: '🐍', life: [15, 25], cost: 120, upkeep: 250, breeds: ['Corn Snake', 'Ball Python', 'King Snake'] },
  lizard: { name: 'Lizard', emoji: '🦎', life: [10, 15], cost: 100, upkeep: 250, breeds: ['Bearded Dragon', 'Leopard Gecko', 'Iguana'] },
  ferret: { name: 'Ferret', emoji: '🦦', life: [6, 10], cost: 200, upkeep: 400, breeds: ['Sable', 'Albino', 'Cinnamon'] },
  hedgehog: { name: 'Hedgehog', emoji: '🦔', life: [4, 6], cost: 200, upkeep: 250, breeds: ['African Pygmy'] },
  pig: { name: 'Pig', emoji: '🐖', life: [12, 18], cost: 400, upkeep: 900, breeds: ['Potbellied', 'Mini Pig'] },
  goat: { name: 'Goat', emoji: '🐐', life: [12, 16], cost: 250, upkeep: 600, breeds: ['Pygmy Goat', 'Nubian'] },
  horse: { name: 'Horse', emoji: '🐎', life: [25, 32], cost: 8000, upkeep: 6000, breeds: ['Thoroughbred', 'Arabian', 'Mustang', 'Clydesdale', 'Appaloosa', 'Pony'] },
  tiger: { name: 'Tiger', emoji: '🐅', life: [15, 22], cost: 35000, upkeep: 14000, breeds: ['Bengal Tiger', 'Siberian Tiger', 'White Tiger'], exotic: true },
  monkey: { name: 'Capuchin Monkey', emoji: '🐒', life: [20, 35], cost: 9000, upkeep: 2800, breeds: ['Capuchin', 'Squirrel Monkey', 'Tamarin'], exotic: true },
  otter: { name: 'Otter', emoji: '🦦', life: [12, 16], cost: 5000, upkeep: 2000, breeds: ['Asian Small-Clawed', 'River Otter'], exotic: true },
  fennec: { name: 'Fennec Fox', emoji: '🦊', life: [10, 14], cost: 4000, upkeep: 1400, breeds: ['Desert Fennec', 'Silver Morph'], exotic: true },
  alpaca: { name: 'Alpaca', emoji: '🦙', life: [15, 20], cost: 3200, upkeep: 1500, breeds: ['Huacaya', 'Suri'], exotic: true },
  falcon: { name: 'Falcon', emoji: '🦅', life: [14, 20], cost: 6000, upkeep: 1800, breeds: ['Peregrine Falcon', 'Gyrfalcon', 'Harris Hawk'], exotic: true },
  chameleon: { name: 'Chameleon', emoji: '🦎', life: [5, 8], cost: 800, upkeep: 350, breeds: ['Panther Chameleon', 'Veiled Chameleon'], exotic: true },
};
const PET_NAMES = ['Biscuit', 'Luna', 'Max', 'Bella', 'Charlie', 'Coco', 'Pepper', 'Milo', 'Daisy', 'Rocky', 'Nala', 'Oreo', 'Ziggy', 'Mochi', 'Pickles', 'Waffles', 'Bandit', 'Shadow', 'Peanut', 'Ginger', 'Tofu', 'Gizmo', 'Noodle', 'Juniper', 'Sir Fluffington', 'Beans', 'Clover', 'Duke', 'Hazel', 'Pumpkin', 'Sprout', 'Mango', 'Simba', 'Thor', 'Cleo', 'Bao', 'Kiko'];

const PET_TRICKS = ['Sit', 'Shake', 'Fetch', 'Roll over', 'High-five', 'Speak', 'Play dead', 'Backflip'];
const PET_SHOW_LEVELS = [
  { id: 'local', name: 'Neighborhood Pet Fair', fee: 50, purse: 300, minRel: 30, desc: 'Fun community pet show for local pets.' },
  { id: 'regional', name: 'Regional Kennel & Pet Championship', fee: 200, purse: 1500, minRel: 50, desc: 'Competitive show with certified judges.' },
  { id: 'national', name: 'National Grand Pet Championship', fee: 600, purse: 6000, minRel: 70, desc: 'The most prestigious all-breed show in the country.' },
];

const VACATIONS = [
  { id: 'camping', name: 'Camping trip', emoji: '🏕️', cost: 400, happy: [3, 9], minAge: 12 },
  { id: 'roadtrip', name: 'Road trip', emoji: '🚗', cost: 1200, happy: [4, 10], minAge: 16 },
  { id: 'city', name: 'City break', emoji: '🌃', cost: 2500, happy: [5, 11], minAge: 16 },
  { id: 'themepark', name: 'Theme park getaway', emoji: '🎢', cost: 2000, happy: [6, 12], minAge: 12 },
  { id: 'beach', name: 'Beach resort', emoji: '🏝️', cost: 3500, happy: [7, 14], minAge: 16 },
  { id: 'backpack', name: 'Backpacking abroad', emoji: '🎒', cost: 3000, happy: [6, 14], minAge: 18, abroad: true },
  { id: 'ski', name: 'Ski trip', emoji: '⛷️', cost: 4500, happy: [6, 13], minAge: 16 },
  { id: 'cruise', name: 'Cruise', emoji: '🛳️', cost: 6000, happy: [7, 14], minAge: 18, abroad: true },
  { id: 'island', name: 'Private island villa', emoji: '🌺', cost: 18000, happy: [10, 18], minAge: 18, abroad: true },
  { id: 'safari', name: 'Safari', emoji: '🦒', cost: 9000, happy: [8, 16], minAge: 18, abroad: true },
  { id: 'world', name: 'Around-the-world tour', emoji: '🌍', cost: 45000, happy: [14, 25], minAge: 18, abroad: true },
  { id: 'space', name: 'Orbital space flight', emoji: '🚀', cost: 450000, happy: [20, 35], minAge: 21 },
];

// Investment options. Yearly return ~ gauss(mean, sd), floored at -90%.
const INVESTMENTS = {
  savings: { name: 'High-yield savings', emoji: '🐖', mean: 0.03, sd: 0.005 },
  bonds: { name: 'Government bonds', emoji: '📜', mean: 0.04, sd: 0.04 },
  index: { name: 'Index fund', emoji: '📈', mean: 0.07, sd: 0.15 },
  stocks: { name: 'Hand-picked stocks', emoji: '🧾', mean: 0.08, sd: 0.3 },
  crypto: { name: 'Crypto', emoji: '💠', mean: 0.12, sd: 0.75 },
};
const INVEST_IDS = Object.keys(INVESTMENTS);

// Home renovation projects. Shared projects enhance the entire property;
// unit-specific projects can be built in specific units of multi-unit buildings.
const RENOVATION_PROJECTS = {
  solar: { id: 'solar', name: 'Rooftop Solar Array', emoji: '☀️', shared: true, base: 18000, valBoost: 0.08, rentBoost: 0.05, desc: 'Clean solar power that cuts annual upkeep by up to 50%.' },
  pool: { id: 'pool', name: 'In-Ground Swimming Pool', emoji: '🏊', shared: true, base: 45000, valBoost: 0.14, rentBoost: 0.15, desc: 'Heated luxury pool with flagstone patio and night lighting.' },
  porch: { id: 'porch', name: 'Wraparound Front Porch', emoji: '🏡', shared: true, base: 15000, valBoost: 0.07, rentBoost: 0.08, desc: 'Classic covered cedar porch with rocking chairs.' },
  koi_pond: { id: 'koi_pond', name: 'Japanese Koi Pond', emoji: '🐟', shared: true, base: 12000, valBoost: 0.06, rentBoost: 0.06, desc: 'Tranquil landscaped water garden with stone waterfall and live koi.' },
  sauna: { id: 'sauna', name: 'Cedar Barrel Sauna', emoji: '🧖', shared: true, base: 14000, valBoost: 0.07, rentBoost: 0.08, desc: 'Aromatic red cedar dry sauna with heated volcanic stones.' },
  gameroom: { id: 'gameroom', name: 'Arcade & Game Room', emoji: '🕹️', shared: false, base: 22000, valBoost: 0.09, rentBoost: 0.14, desc: 'Custom game lounge with retro arcade cabinets, billiards and pinball.' },
  aquarium: { id: 'aquarium', name: 'Coral Reef Aquarium', emoji: '🐠', shared: false, base: 16000, valBoost: 0.07, rentBoost: 0.10, desc: 'Spectacular built-in saltwater living reef tank with exotic fish.' },
  observatory: { id: 'observatory', name: 'Rooftop Observatory', emoji: '🔭', shared: false, base: 35000, valBoost: 0.12, rentBoost: 0.16, desc: 'Motorized revolving dome with a computerized optical telescope.' },
  chef_kitchen: { id: 'chef_kitchen', name: 'Chef’s Kitchen', emoji: '🍳', shared: false, base: 38000, valBoost: 0.15, rentBoost: 0.20, desc: 'Commercial six-burner gas range, marble waterfall island and wine fridge.' },
  theater: { id: 'theater', name: 'Private Home Cinema', emoji: '🎬', shared: false, base: 28000, valBoost: 0.11, rentBoost: 0.15, desc: 'Acoustically treated theater with 4K laser projector and leather recliners.' },
};
const RENOVATION_IDS = Object.keys(RENOVATION_PROJECTS);

const CONTRACTOR_TIERS = [
  { id: 'budget', name: 'Budget Handyman Crew', emoji: '🔨', mult: 0.7, reliable: 0.45, skill: 0.4, desc: 'Cheapest bid. High risk of delays, cutting corners or surprises.' },
  { id: 'reputable', name: 'Licensed General Contractor', emoji: '👷', mult: 1.0, reliable: 0.85, skill: 0.78, desc: 'Bonded and insured with a solid portfolio and written guarantee.' },
  { id: 'luxury', name: 'Master Architectural Firm', emoji: '📐', mult: 1.5, reliable: 0.98, skill: 0.96, desc: 'Top-tier luxury builders. Flawless craftsmanship and bespoke finishes.' },
];

