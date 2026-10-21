/* =====================================================================
 * 08-data-business.js — industries, staff roles, pricing, budgets and
 * name parts for the business expansion. US-baseline dollars.
 *
 * INDUSTRIES[id]:
 *   start     cost to open (first location + setup)    locBuild  cost of each extra location
 *   rent      overhead per location per year             unit      yearly revenue one worker produces at full demand
 *   perLoc    staff (ops + sales) one location can hold  cogs      share of revenue spent on goods and other costs
 *   wage      pay multiplier for every role              mult      valuation as a multiple of revenue
 *   scale     size of marketing/R&D budgets              life      years a product stays fresh
 *   skill     founder skill that helps (cooking, coding...)
 *   qpow      how much product quality drives demand (1 = normal, 2 = hits-driven)
 *   vol       yearly revenue swing                       hype      pre-revenue valuation for startup-y industries
 *   salesShare  share of headcount autopilot gives to sales
 *   req       founder requirements ({ degree } or { anyDegree: [...] })
 *   franchise others can license the brand and open outlets (see FRANCHISE_FEES)
 *   rivalSizes  revenue ranges (in locations' worth) for its rival firms, when the default is too big
 *   roles     what each role is called here              place     what a location is called
 *   prodA / prodB  product name parts                    product   what a product is called
 * Pure data.
 * ===================================================================== */

const INDUSTRIES = {
  foodtruck: {
    name: 'Food Truck', franchise: true, emoji: '🚚', start: 45000, locBuild: 35000, rent: 12000, unit: 115000, perLoc: 3, cogs: 0.45, wage: 0.75, mult: 0.8, scale: 0.25, life: 5, skill: 'cooking', salesShare: 0.25,
    roles: { ops: 'Cook', sales: 'Cashier', marketing: 'Promoter', rnd: 'Recipe Developer', manager: 'Shift Lead' }, place: 'truck', product: 'menu item',
    prodA: ['Spicy', 'Smoky', 'Loaded', 'Honey', 'Garlic', 'Firecracker', 'Street'], prodB: ['Tacos', 'Burger', 'Noodles', 'Wings', 'Burrito', 'Fries', 'Bao'],
    names: [['Rolling', 'Street', 'Wild', 'Golden', 'Hungry', 'Big', 'Lucky'], ['Tacos', 'Bites', 'Grill', 'Wok', 'Eats', 'Kitchen']],
  },
  cafe: {
    name: 'Coffee Shop', franchise: true, emoji: '☕', start: 120000, locBuild: 90000, rent: 45000, unit: 115000, perLoc: 8, cogs: 0.45, wage: 0.75, mult: 1.1, scale: 0.5, life: 6, skill: 'cooking', salesShare: 0.35,
    roles: { ops: 'Barista', sales: 'Cashier', marketing: 'Social Media Manager', rnd: 'Menu Developer', manager: 'Store Manager' }, place: 'café', product: 'drink',
    prodA: ['Maple', 'Honey', 'Iced', 'Lavender', 'Mocha', 'Caramel', 'Oat'], prodB: ['Latte', 'Cold Brew', 'Mocha', 'Chai', 'Frappé', 'Espresso'],
    names: [['Bean', 'Daily', 'Copper', 'Morning', 'Little', 'Cozy', 'Velvet'], ['Grind', 'Roasters', 'Brew', 'Coffee Co.', 'Café', 'Cup']],
  },
  bakery: {
    name: 'Bakery', franchise: true, emoji: '🥐', start: 90000, locBuild: 70000, rent: 35000, unit: 115000, perLoc: 6, cogs: 0.45, wage: 0.75, mult: 1.1, scale: 0.5, life: 6, skill: 'cooking', salesShare: 0.3,
    roles: { ops: 'Baker', sales: 'Counter Clerk', marketing: 'Promoter', rnd: 'Pastry Chef', manager: 'Bakery Manager' }, place: 'bakery', product: 'pastry',
    prodA: ['Butter', 'Cinnamon', 'Sourdough', 'Chocolate', 'Lemon', 'Almond'], prodB: ['Croissant', 'Loaf', 'Cupcake', 'Tart', 'Bun', 'Cookie'],
    names: [['Sweet', 'Golden', 'Rise', 'Flour', 'Sunny', 'Honey'], ['Bakery', 'Bakehouse', 'Patisserie', 'Crumbs', 'Ovens']],
  },
  restaurant: {
    name: 'Restaurant', franchise: true, emoji: '🍽️', start: 250000, locBuild: 200000, rent: 90000, unit: 135000, perLoc: 15, cogs: 0.5, wage: 0.8, mult: 1.2, scale: 1, life: 6, skill: 'cooking', salesShare: 0.35,
    roles: { ops: 'Cook', sales: 'Server', marketing: 'Promoter', rnd: 'Head Chef', manager: 'General Manager' }, place: 'restaurant', product: 'dish',
    prodA: ['Truffle', 'Grilled', 'Braised', 'Crispy', 'Smoked', 'Wild', 'Classic'], prodB: ['Risotto', 'Steak', 'Ramen', 'Salmon', 'Pasta', 'Curry', 'Tacos'],
    names: [['The Golden', 'Blue', 'Olive', 'Copper', 'Rustic', 'Saffron', 'Ember'], ['Spoon', 'Table', 'Kitchen', 'Bistro', 'Tavern', 'House']],
  },
  brewery: {
    name: 'Craft Brewery', emoji: '🍺', start: 400000, locBuild: 300000, rent: 80000, unit: 140000, perLoc: 10, cogs: 0.45, wage: 0.9, mult: 1.8, scale: 1, life: 4, skill: 'cooking', salesShare: 0.3,
    roles: { ops: 'Brewer', sales: 'Sales Rep', marketing: 'Brand Manager', rnd: 'Brewmaster', manager: 'Taproom Manager' }, place: 'taproom', product: 'beer',
    prodA: ['Hazy', 'Golden', 'Midnight', 'Citrus', 'Smoky', 'Wild'], prodB: ['IPA', 'Lager', 'Stout', 'Pale Ale', 'Sour', 'Porter'],
    names: [['Hop', 'Iron', 'Barrel', 'Foggy', 'Old', 'Twin'], ['Brewing Co.', 'Ales', 'Brewery', 'Brewhouse']],
  },
  salon: {
    name: 'Salon & Spa', franchise: true, emoji: '💇', start: 80000, locBuild: 60000, rent: 40000, unit: 100000, perLoc: 8, cogs: 0.3, wage: 0.85, mult: 1.2, scale: 0.5, life: 5, skill: 'art', salesShare: 0.2,
    roles: { ops: 'Stylist', sales: 'Receptionist', marketing: 'Promoter', rnd: 'Creative Director', manager: 'Salon Manager' }, place: 'salon', product: 'treatment',
    prodA: ['Signature', 'Luxe', 'Glow', 'Express', 'Hot Stone', 'Balayage'], prodB: ['Facial', 'Cut', 'Color', 'Massage', 'Blowout', 'Package'],
    names: [['Glow', 'Velvet', 'Luxe', 'Bloom', 'Mirror', 'Halo'], ['Salon', 'Studio', 'Spa', 'Beauty Bar']],
  },
  gym: {
    name: 'Fitness Gym', franchise: true, emoji: '🏋️', start: 300000, locBuild: 250000, rent: 120000, unit: 105000, perLoc: 12, cogs: 0.35, wage: 0.8, mult: 1.5, scale: 1, life: 5, skill: 'fitness', salesShare: 0.3,
    roles: { ops: 'Trainer', sales: 'Membership Rep', marketing: 'Brand Manager', rnd: 'Program Designer', manager: 'Gym Manager' }, place: 'gym', product: 'class',
    prodA: ['Power', 'Spin', 'Zen', 'HIIT', 'Boxing', 'Core'], prodB: ['Class', 'Program', 'Bootcamp', 'Studio', 'Challenge'],
    names: [['Iron', 'Pulse', 'Peak', 'Forge', 'Titan', 'Flex'], ['Fitness', 'Gym', 'Athletics', 'Training Club']],
  },
  fashion: {
    name: 'Clothing Brand', emoji: '👗', start: 150000, locBuild: 100000, rent: 60000, unit: 150000, perLoc: 12, cogs: 0.45, wage: 1, mult: 2, scale: 1, life: 2, skill: 'art', qpow: 1.3, salesShare: 0.4, hype: 3,
    roles: { ops: 'Production Worker', sales: 'Store Associate', marketing: 'Marketing Manager', rnd: 'Designer', manager: 'Store Manager' }, place: 'store', product: 'collection',
    prodA: ['Urban', 'Coastal', 'Midnight', 'Vintage', 'Essential', 'Neon'], prodB: ['Collection', 'Line', 'Capsule', 'Edit', 'Drop'],
    names: [['Thread', 'Vela', 'North', 'Mode', 'Atelier', 'Loom'], ['& Co.', 'Apparel', 'Clothing', 'Studio', 'Label']],
  },
  construction: {
    name: 'Construction Company', emoji: '🏗️', start: 200000, locBuild: 150000, rent: 50000, unit: 215000, perLoc: 30, cogs: 0.55, wage: 1.3, mult: 1.2, scale: 1.5, life: 10, skill: 'business', salesShare: 0.1,
    roles: { ops: 'Builder', sales: 'Estimator', marketing: 'Marketing Lead', rnd: 'Architect', manager: 'Site Manager' }, place: 'yard', product: 'service',
    prodA: ['Custom', 'Green', 'Rapid', 'Luxury', 'Commercial'], prodB: ['Homes', 'Renovations', 'Builds', 'Remodels', 'Projects'],
    names: [['Bedrock', 'Ironclad', 'Summit', 'Keystone', 'Granite', 'Cornerstone'], ['Builders', 'Construction', 'Contracting', 'Works']],
  },
  realestate: {
    name: 'Real Estate Agency', franchise: true, emoji: '🏡', start: 60000, locBuild: 50000, rent: 40000, unit: 120000, perLoc: 12, cogs: 0.2, wage: 1.1, mult: 1.5, scale: 0.8, life: 10, skill: 'charisma', salesShare: 0.6,
    roles: { ops: 'Agent', sales: 'Lead Generator', marketing: 'Marketing Lead', rnd: 'Market Analyst', manager: 'Broker' }, place: 'office', product: 'service',
    prodA: ['Luxury', 'First-Home', 'Commercial', 'Vacation', 'Relocation'], prodB: ['Listings', 'Program', 'Service', 'Package'],
    names: [['Keyhole', 'Hearth', 'Skyline', 'Doorstep', 'Harbor', 'Crest'], ['Realty', 'Properties', 'Real Estate', 'Homes']],
  },
  agency: {
    name: 'Marketing Agency', emoji: '📣', start: 40000, locBuild: 40000, rent: 35000, unit: 140000, perLoc: 25, cogs: 0.25, wage: 1.4, mult: 1.8, scale: 0.8, life: 4, skill: 'charisma', salesShare: 0.25,
    roles: { ops: 'Account Manager', sales: 'Business Developer', marketing: 'Brand Strategist', rnd: 'Creative Director', manager: 'Agency Director' }, place: 'office', product: 'service',
    prodA: ['Viral', 'Social', 'Influencer', 'Brand', 'Video'], prodB: ['Campaigns', 'Package', 'Studio', 'Strategy'],
    names: [['Loud', 'Spark', 'Signal', 'Bright', 'Echo', 'Prism'], ['Agency', 'Media', 'Creative', 'Collective']],
  },
  consulting: {
    name: 'Consulting Firm', emoji: '📊', start: 30000, locBuild: 40000, rent: 30000, unit: 175000, perLoc: 25, cogs: 0.15, wage: 2, mult: 2, scale: 1, life: 6, skill: 'business', salesShare: 0.15,
    roles: { ops: 'Consultant', sales: 'Partner', marketing: 'Thought-Leadership Lead', rnd: 'Research Director', manager: 'Managing Director' }, place: 'office', product: 'practice',
    prodA: ['Strategy', 'Digital', 'Operations', 'Growth', 'Risk'], prodB: ['Practice', 'Advisory', 'Group', 'Program'],
    names: [['Meridian', 'Clearwater', 'Bridgepoint', 'Halcyon', 'Pinnacle', 'Northgate'], ['Partners', 'Consulting', 'Advisors', 'Group']],
  },
  tech: {
    name: 'Tech Startup', emoji: '💻', start: 50000, locBuild: 80000, rent: 40000, unit: 240000, perLoc: 60, cogs: 0.15, wage: 2.4, mult: 6, scale: 2, life: 4, skill: 'coding', qpow: 2, vol: 0.3, hype: 25, salesShare: 0.2,
    roles: { ops: 'Engineer', sales: 'Sales Rep', marketing: 'Growth Marketer', rnd: 'Product Designer', manager: 'Engineering Manager' }, place: 'office', product: 'app',
    prodA: ['Cloud', 'Smart', 'Quick', 'Pocket', 'Hyper', 'Open', 'Bright', 'Zen'], prodB: ['Notes', 'Pay', 'Chat', 'Fit', 'Maps', 'Sync', 'Docs', 'Shop'],
    names: [['Byte', 'Nimbus', 'Pixel', 'Quantum', 'Vector', 'Lumen', 'Orbit'], ['Labs', 'Systems', 'AI', 'Technologies', 'Software', '.io']],
  },
  games: {
    name: 'Game Studio', emoji: '🎮', start: 80000, locBuild: 80000, rent: 45000, unit: 210000, perLoc: 50, cogs: 0.25, wage: 1.9, mult: 4, scale: 1.5, life: 3, skill: 'coding', qpow: 2, vol: 0.35, hype: 12, salesShare: 0.1,
    roles: { ops: 'Developer', sales: 'Publishing Rep', marketing: 'Community Manager', rnd: 'Game Designer', manager: 'Producer' }, place: 'studio', product: 'game',
    prodA: ['Dungeon', 'Star', 'Pixel', 'Shadow', 'Kingdom', 'Turbo', 'Cozy'], prodB: ['Quest', 'Legends', 'Racers', 'Farm', 'Tactics', 'Odyssey'],
    names: [['Moonlit', 'Arcade', 'Lucky Dice', 'Paper Crane', 'Red Pixel', 'Stormforge'], ['Games', 'Studios', 'Interactive', 'Entertainment']],
  },
  label: {
    name: 'Record Label', emoji: '💿', start: 100000, locBuild: 80000, rent: 50000, unit: 165000, perLoc: 20, cogs: 0.4, wage: 1.2, mult: 3, scale: 1, life: 2, skill: 'music', qpow: 1.5, vol: 0.35, hype: 5, salesShare: 0.2,
    roles: { ops: 'Producer', sales: 'Distribution Rep', marketing: 'Promoter', rnd: 'A&R Scout', manager: 'Label Manager' }, place: 'studio', product: 'album',
    prodA: ['Neon', 'Velvet', 'Electric', 'Midnight', 'Golden', 'Broken'], prodB: ['Dreams', 'Hearts', 'Highway', 'Summer', 'Echoes', 'Skies'],
    names: [['Vinyl', 'Echo', 'Night Owl', 'Blue Note', 'Static', 'Gold Dust'], ['Records', 'Music', 'Sound', 'Recordings']],
  },
  film: {
    name: 'Film Studio', emoji: '🎬', start: 500000, locBuild: 400000, rent: 120000, unit: 230000, perLoc: 40, cogs: 0.45, wage: 1.5, mult: 3, scale: 3, life: 2, skill: 'acting', qpow: 1.5, vol: 0.4, hype: 6, salesShare: 0.15,
    roles: { ops: 'Crew Member', sales: 'Distribution Exec', marketing: 'Publicist', rnd: 'Director', manager: 'Producer' }, place: 'soundstage', product: 'film',
    prodA: ['The Last', 'Return of the', 'Dark', 'Silent', 'Endless', 'Brave'], prodB: ['Horizon', 'Kingdom', 'Witness', 'Heist', 'Summer', 'Frontier'],
    names: [['Silver', 'Starlight', 'Lantern', 'Golden Hour', 'Wide Angle', 'Crimson'], ['Pictures', 'Studios', 'Films', 'Entertainment']],
  },
  clinic: {
    name: 'Medical Practice', emoji: '🩺', start: 300000, locBuild: 250000, rent: 90000, unit: 430000, perLoc: 12, cogs: 0.3, wage: 4, mult: 1.5, scale: 1, life: 10, skill: 'charisma', salesShare: 0.15, req: { degree: 'md' },
    roles: { ops: 'Doctor', sales: 'Front Desk', marketing: 'Outreach Lead', rnd: 'Medical Director', manager: 'Practice Manager' }, place: 'clinic', product: 'service',
    prodA: ['Family', 'Urgent', 'Sports', 'Pediatric', 'Wellness'], prodB: ['Care', 'Clinic', 'Program', 'Service'],
    names: [['Riverside', 'Evergreen', 'Lakeview', 'Harbor', 'Cedar', 'Bright'], ['Medical', 'Health', 'Family Practice', 'Clinic']],
  },
  dental: {
    name: 'Dental Practice', emoji: '🦷', start: 250000, locBuild: 200000, rent: 70000, unit: 375000, perLoc: 10, cogs: 0.3, wage: 3.5, mult: 1.5, scale: 1, life: 10, skill: 'charisma', salesShare: 0.15, req: { degree: 'dds' },
    roles: { ops: 'Dentist', sales: 'Front Desk', marketing: 'Outreach Lead', rnd: 'Clinical Director', manager: 'Office Manager' }, place: 'office', product: 'service',
    prodA: ['Family', 'Cosmetic', 'Express', 'Whitening', 'Orthodontic'], prodB: ['Care', 'Plan', 'Service', 'Package'],
    names: [['Bright', 'Pearl', 'Smile', 'Gentle', 'Sunrise'], ['Dental', 'Dentistry', 'Smiles', 'Dental Care']],
  },
  lawfirm: {
    name: 'Law Firm', emoji: '⚖️', start: 80000, locBuild: 80000, rent: 60000, unit: 265000, perLoc: 20, cogs: 0.15, wage: 3, mult: 1.8, scale: 1, life: 10, skill: 'charisma', salesShare: 0.15, req: { degree: 'jd' },
    roles: { ops: 'Attorney', sales: 'Rainmaker', marketing: 'Marketing Lead', rnd: 'Senior Counsel', manager: 'Managing Partner' }, place: 'office', product: 'practice',
    prodA: ['Corporate', 'Family', 'Criminal', 'Injury', 'Estate'], prodB: ['Practice', 'Group', 'Division', 'Team'],
    names: [['Sterling', 'Ashford', 'Whitmore', 'Blackwell', 'Hale'], ['& Partners', 'Law', 'Legal', 'LLP']],
  },
  pharma: {
    name: 'Biotech Company', emoji: '🧬', start: 2000000, locBuild: 2000000, rent: 300000, unit: 310000, perLoc: 80, cogs: 0.3, wage: 2.6, mult: 6, scale: 5, life: 12, skill: 'business', qpow: 2, vol: 0.45, hype: 40, salesShare: 0.15, req: { anyDegree: ['phd', 'md', 'pharmd'] },
    roles: { ops: 'Lab Scientist', sales: 'Medical Rep', marketing: 'Brand Manager', rnd: 'Research Lead', manager: 'Program Director' }, place: 'lab', product: 'drug',
    prodA: ['Zy', 'Vor', 'Lum', 'Pax', 'Tri', 'Nex', 'Cora', 'Ven'], prodB: ['atrin', 'oxane', 'ivir', 'umab', 'olol', 'astin', 'eva'],
    names: [['Helix', 'Genova', 'Cellular', 'NovaCure', 'Apex', 'BioNorth'], ['Bio', 'Therapeutics', 'Pharma', 'Biosciences']],
  },
  hotel: {
    name: 'Hotel', franchise: true, emoji: '🏨', start: 3000000, locBuild: 3000000, rent: 400000, unit: 120000, perLoc: 40, cogs: 0.4, wage: 0.85, mult: 2, scale: 3, life: 12, skill: 'charisma', salesShare: 0.2,
    roles: { ops: 'Hotel Staff', sales: 'Sales Manager', marketing: 'Brand Manager', rnd: 'Experience Designer', manager: 'Hotel Manager' }, place: 'hotel', product: 'experience',
    prodA: ['Ocean', 'Garden', 'Skyline', 'Royal', 'Spa'], prodB: ['Suites', 'Wing', 'Package', 'Experience'],
    names: [['The Grand', 'Harbor', 'Silver Pine', 'Azure', 'Royal Oak'], ['Hotel', 'Resort', 'Inn', 'Suites']],
  },
  airline: {
    name: 'Airline', emoji: '✈️', start: 40000000, locBuild: 30000000, rent: 4000000, unit: 335000, perLoc: 150, cogs: 0.6, wage: 1.6, mult: 1.3, scale: 20, life: 15, skill: 'business', vol: 0.25, salesShare: 0.1,
    roles: { ops: 'Flight Crew', sales: 'Sales Agent', marketing: 'Brand Manager', rnd: 'Route Planner', manager: 'Operations Director' }, place: 'hub', product: 'route',
    prodA: ['Coastal', 'Global', 'Red-Eye', 'Island', 'Express'], prodB: ['Route', 'Shuttle', 'Connection', 'Service'],
    names: [['Sky', 'Horizon', 'Aurora', 'Swift', 'Polar', 'Sunward'], ['Air', 'Airways', 'Airlines', 'Jet']],
  },
  // A pro team. Its seasons and titles are run by 41-sports.js.
  sportsteam: {
    name: 'Sports Franchise', emoji: '🏟️', start: 250000000, locBuild: 600000000, rent: 15000000, unit: 1600000, perLoc: 60, cogs: 0.25, wage: 8, mult: 4, scale: 8, life: 3, skill: 'athletics', qpow: 1.3, vol: 0.2, salesShare: 0.15,
    rivalSizes: [[0.8, 1.5], [1.5, 3], [3, 6]],
    roles: { ops: 'Player', sales: 'Ticket Sales Rep', marketing: 'Marketing Director', rnd: 'Scout', manager: 'Coach' }, place: 'arena', product: 'roster',
    prodA: ['Rebuilt', 'Veteran', 'Young', 'Gritty', 'All-Star', 'Hungry'], prodB: ['Roster', 'Lineup', 'Squad', 'Core'],
    names: [['Harbor', 'Capital', 'Riverside', 'Northside', 'Bay City', 'Summit'], ['Comets', 'Titans', 'Wolves', 'Royals', 'Storm', 'Rangers']],
  },
};
const INDUSTRY_IDS = Object.keys(INDUSTRIES);

// Staff roles. pay: US-baseline yearly pay before the industry wage multiplier.
const BIZ_ROLES = {
  ops: { name: 'Production', emoji: '🛠️', pay: 34000, desc: 'Make and deliver what you sell. More of them = more capacity.' },
  sales: { name: 'Sales', emoji: '🤝', pay: 40000, desc: 'Bring in customers. Boosts demand.' },
  marketing: { name: 'Marketing', emoji: '📣', pay: 55000, desc: 'Build your reputation every year.' },
  rnd: { name: 'R&D', emoji: '💡', pay: 65000, desc: 'Make your products better.' },
  manager: { name: 'Management', emoji: '🧭', pay: 75000, desc: 'Keep everyone efficient and happy. About one per twelve staff.' },
};
const BIZ_ROLE_IDS = Object.keys(BIZ_ROLES);
const PAY_LEVELS = {
  low: { name: 'Bargain pay', mult: 0.85, skill: -8, morale: -12 },
  market: { name: 'Market pay', mult: 1, skill: 0, morale: 0 },
  high: { name: 'Top pay', mult: 1.3, skill: 10, morale: 10 },
};

const PRICE_TIERS = {
  budget: { name: 'Budget', emoji: '🏷️', price: 0.7, desc: 'Cheap and cheerful. Lots of customers, thin margins.' },
  standard: { name: 'Standard', emoji: '⚖️', price: 1, desc: 'Fair prices. A safe default.' },
  premium: { name: 'Premium', emoji: '💎', price: 1.6, desc: 'Higher prices. Needs good products (quality 50+).' },
  luxury: { name: 'Luxury', emoji: '👑', price: 2.6, desc: 'Sky-high prices. Only works with excellent products (quality 70+).' },
};
const PRICE_TIER_IDS = Object.keys(PRICE_TIERS);

const SPEND_NAMES = ['None', 'Light', 'Moderate', 'Heavy', 'Massive'];
const MKT_SPEND = [0, 15000, 75000, 400000, 2000000];
const MKT_REP = [0, 2, 4, 7, 11];
const RND_SPEND = [0, 20000, 100000, 500000, 2500000];
const RND_QUALITY = [0, 1, 2, 4, 6];
const PRODUCT_BUDGETS = [['Shoestring', 10000, 0], ['Solid', 50000, 6], ['Big bet', 250000, 12], ['Moonshot', 1000000, 18]];
const OWNER_SALARIES = [0, 30000, 80000, 200000, 750000, 3000000];
// Royalty rates franchisees pay on their sales: [rate, name, how strongly it attracts new franchisees].
const FRANCHISE_FEES = [[0.04, 'Low', 1.5], [0.06, 'Standard', 1], [0.09, 'High', 0.55]];

const INVESTOR_NAMES = ['Northstar Ventures', 'Blue Harbor Capital', 'Summit Peak Partners', 'Ironwood Ventures', 'Lumen Capital', 'Redbridge Partners', 'Atlas Growth Fund', 'Kestrel Capital', 'Greenfield Angels', 'Polaris Ventures', 'Copperline Capital', 'Tidewater Partners'];
const BUYER_NAMES = ['Omnivex Holdings', 'Globacorp', 'Titan Industries', 'Meridian Group', 'Apex Brands', 'Stellar Conglomerate', 'Crownpoint Capital', 'United Ventures'];
