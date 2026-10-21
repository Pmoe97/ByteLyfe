/* =====================================================================
 * 04-data-careers.js — every job ladder, part-time job and gig.
 *
 * JOBS[id] = { name, emoji, cat, ladder: [[title, salary], ...], req, special? }
 *   salary: US-baseline yearly pay (scaled by country econ)
 *   req: { age, maxAge, edu: 'high'|'assoc'|'bachelor'|'master', majors: [...],
 *          degree: 'md'|'jd'|..., trade: 'electrician'|..., smarts, looks,
 *          sk: { skill: min }, license, clean (no felonies), drink (legal drinking age) }
 *   special: 'fame' | 'sports' | 'military' | 'politics' — promotion runs on skill
 *            and special actions instead of the plain performance meter.
 *   skill: the skill that grows on the job / drives special promotions.
 *   appointed: promotions come by appointment (42-courts.js), not the performance meter;
 *              no raise or promotion requests and no retirement nudges.
 * Pure data.
 * ===================================================================== */

const JOB_CATS = {
  service: 'Service & Retail', office: 'Office & Admin', transport: 'Transport & Logistics', trades: 'Skilled Trades',
  public: 'Public Service', health: 'Healthcare', tech: 'Tech & Engineering', science: 'Science', business: 'Business & Finance',
  law: 'Law', education: 'Education', media: 'Media & Design', fame: 'Entertainment', sports: 'Pro Sports',
  military: 'Military', politics: 'Politics',
};

const JOBS = {
  // ---- Service & retail ----
  fastfood: { name: 'Fast Food', emoji: '🍔', cat: 'service', ladder: [['Crew Member', 21000], ['Shift Leader', 26000], ['Assistant Manager', 35000], ['Restaurant Manager', 52000]], req: { age: 16 }, skill: 'cooking' },
  retail: { name: 'Retail', emoji: '🛍️', cat: 'service', ladder: [['Sales Associate', 23000], ['Senior Associate', 27000], ['Department Lead', 36000], ['Store Manager', 58000], ['District Manager', 92000]], req: { age: 16 }, skill: 'charisma' },
  server: { name: 'Restaurant Service', emoji: '🍽️', cat: 'service', ladder: [['Server', 24000], ['Head Server', 32000], ["Maître d'", 46000]], req: { age: 16, looks: 30 }, skill: 'charisma' },
  bartender: { name: 'Bartending', emoji: '🍸', cat: 'service', ladder: [['Barback', 22000], ['Bartender', 33000], ['Head Bartender', 42000], ['Bar Manager', 56000]], req: { age: 18, drink: true }, skill: 'charisma' },
  janitor: { name: 'Custodial', emoji: '🧹', cat: 'service', ladder: [['Custodian', 26000], ['Senior Custodian', 31000], ['Facilities Supervisor', 46000]], req: { age: 18 } },
  trainer: { name: 'Fitness Training', emoji: '🏋️', cat: 'service', ladder: [['Personal Trainer', 33000], ['Head Trainer', 50000], ['Fitness Director', 78000]], req: { age: 18, sk: { fitness: 50 } }, skill: 'fitness' },
  barber: { name: 'Barbering', emoji: '💈', cat: 'service', ladder: [['Barber Apprentice', 22000], ['Barber', 34000], ['Master Barber', 52000]], req: { age: 17 }, skill: 'art' },

  // ---- Office ----
  callcenter: { name: 'Customer Support', emoji: '🎧', cat: 'office', ladder: [['Support Rep', 29000], ['Senior Rep', 34000], ['Team Lead', 42000], ['Support Manager', 62000]], req: { age: 18, edu: 'high' }, skill: 'charisma' },
  receptionist: { name: 'Office Administration', emoji: '🗂️', cat: 'office', ladder: [['Receptionist', 30000], ['Administrative Assistant', 38000], ['Office Manager', 55000], ['Operations Director', 95000]], req: { age: 18, edu: 'high' } },
  bank: { name: 'Retail Banking', emoji: '🏦', cat: 'business', ladder: [['Bank Teller', 32000], ['Personal Banker', 42000], ['Branch Manager', 76000]], req: { age: 18, edu: 'high', clean: true }, skill: 'business' },
  insurance: { name: 'Insurance Sales', emoji: '📋', cat: 'business', ladder: [['Insurance Agent', 45000], ['Senior Agent', 68000], ['Agency Manager', 98000]], req: { age: 18, edu: 'high', sk: { charisma: 15 } }, skill: 'charisma' },
  realestate: { name: 'Real Estate', emoji: '🏡', cat: 'business', ladder: [['Junior Agent', 32000], ['Real Estate Agent', 62000], ['Senior Agent', 95000], ['Broker', 140000]], req: { age: 18, edu: 'high', sk: { charisma: 20 } }, skill: 'charisma' },

  // ---- Transport ----
  warehouse: { name: 'Warehouse', emoji: '📦', cat: 'transport', ladder: [['Warehouse Associate', 30000], ['Forklift Operator', 36000], ['Shift Supervisor', 47000], ['Distribution Manager', 72000]], req: { age: 18 }, skill: 'fitness' },
  delivery: { name: 'Trucking', emoji: '🚚', cat: 'transport', ladder: [['Delivery Driver', 33000], ['Truck Driver', 50000], ['Senior Trucker', 62000], ['Fleet Manager', 82000]], req: { age: 18, license: true }, skill: 'driving' },
  flight_attendant: { name: 'Flight Attendant', emoji: '🛫', cat: 'transport', ladder: [['Flight Attendant', 36000], ['Senior Flight Attendant', 48000], ['Purser', 63000]], req: { age: 18, edu: 'high', looks: 45 }, skill: 'charisma' },
  pilot: { name: 'Airline Pilot', emoji: '✈️', cat: 'transport', ladder: [['Flight Instructor', 48000], ['First Officer', 95000], ['Captain', 185000], ['Senior Captain', 255000]], req: { age: 21, edu: 'bachelor', smarts: 55, clean: true } },
  mail: { name: 'Postal Service', emoji: '📮', cat: 'public', ladder: [['Mail Carrier', 40000], ['Senior Carrier', 50000], ['Postmaster', 75000]], req: { age: 18, edu: 'high', license: true, clean: true } },

  // ---- Trades ----
  construction: { name: 'Construction', emoji: '🏗️', cat: 'trades', ladder: [['Laborer', 34000], ['Equipment Operator', 46000], ['Foreman', 64000], ['Site Manager', 88000]], req: { age: 18, sk: { fitness: 25 } }, skill: 'fitness' },
  farm: { name: 'Farming', emoji: '🚜', cat: 'trades', ladder: [['Farmhand', 25000], ['Farmer', 40000], ['Farm Manager', 66000]], req: { age: 16 } },
  fishing: { name: 'Commercial Fishing', emoji: '🎣', cat: 'trades', ladder: [['Deckhand', 30000], ['Fisherman', 46000], ['Boat Captain', 78000]], req: { age: 18, sk: { fitness: 20 } } },
  electrician: { name: 'Electrician', emoji: '⚡', cat: 'trades', ladder: [['Apprentice Electrician', 38000], ['Journeyman Electrician', 60000], ['Master Electrician', 86000]], req: { age: 18, trade: 'electrician' } },
  plumber: { name: 'Plumbing', emoji: '🔧', cat: 'trades', ladder: [['Apprentice Plumber', 36000], ['Journeyman Plumber', 58000], ['Master Plumber', 84000]], req: { age: 18, trade: 'plumbing' } },
  mechanic: { name: 'Auto Repair', emoji: '🔩', cat: 'trades', ladder: [['Lube Technician', 30000], ['Auto Mechanic', 46000], ['Master Technician', 64000], ['Service Manager', 85000]], req: { age: 18, trade: 'automotive' }, skill: 'driving' },
  chef: { name: 'Culinary', emoji: '👨‍🍳', cat: 'trades', ladder: [['Line Cook', 30000], ['Sous Chef', 46000], ['Head Chef', 66000], ['Executive Chef', 98000]], req: { age: 18, trade: 'culinary' }, skill: 'cooking' },
  stylist: { name: 'Hair Styling', emoji: '💇', cat: 'trades', ladder: [['Salon Assistant', 24000], ['Hair Stylist', 36000], ['Senior Stylist', 52000], ['Salon Director', 78000]], req: { age: 18, trade: 'cosmetology' }, skill: 'art' },
  welder: { name: 'Welding', emoji: '🔩', cat: 'trades', ladder: [['Welder Apprentice', 35000], ['Welder', 50000], ['Welding Inspector', 76000]], req: { age: 18, trade: 'welding' } },
  hvac: { name: 'HVAC', emoji: '❄️', cat: 'trades', ladder: [['HVAC Apprentice', 36000], ['HVAC Technician', 54000], ['HVAC Supervisor', 76000]], req: { age: 18, trade: 'hvac' } },
  carpenter: { name: 'Carpentry', emoji: '🔨', cat: 'trades', ladder: [['Apprentice Carpenter', 34000], ['Carpenter', 50000], ['Master Carpenter', 72000]], req: { age: 18, trade: 'carpentry' }, skill: 'art' },

  // ---- Public service ----
  security: { name: 'Security', emoji: '🛡️', cat: 'public', ladder: [['Security Guard', 29000], ['Senior Guard', 35000], ['Security Supervisor', 48000], ['Head of Security', 75000]], req: { age: 18, sk: { fitness: 15 } }, skill: 'martial' },
  police: { name: 'Law Enforcement', emoji: '👮', cat: 'public', ladder: [['Police Cadet', 42000], ['Patrol Officer', 56000], ['Detective', 74000], ['Sergeant', 86000], ['Lieutenant', 100000], ['Captain', 122000], ['Chief of Police', 165000]], req: { age: 18, edu: 'high', sk: { fitness: 30 }, clean: true }, skill: 'martial' },
  firefighter: { name: 'Fire Service', emoji: '🚒', cat: 'public', ladder: [['Probationary Firefighter', 38000], ['Firefighter', 52000], ['Fire Engineer', 63000], ['Fire Lieutenant', 76000], ['Fire Captain', 92000], ['Fire Chief', 135000]], req: { age: 18, edu: 'high', sk: { fitness: 40 }, clean: true }, skill: 'fitness' },
  paramedic: { name: 'Emergency Medical Services', emoji: '🚑', cat: 'health', ladder: [['EMT', 34000], ['Paramedic', 50000], ['Senior Paramedic', 62000], ['EMS Supervisor', 80000]], req: { age: 18, trade: 'paramedic', clean: true } },
  social_worker: { name: 'Social Work', emoji: '🤝', cat: 'public', ladder: [['Caseworker', 38000], ['Social Worker', 53000], ['Senior Social Worker', 70000]], req: { age: 21, edu: 'bachelor', majors: ['psychology', 'sociology', 'education', 'criminaljustice'], clean: true } },

  // ---- Healthcare ----
  dental_hygienist: { name: 'Dental Hygiene', emoji: '😁', cat: 'health', ladder: [['Dental Assistant', 40000], ['Dental Hygienist', 78000], ['Lead Hygienist', 88000]], req: { age: 18, trade: 'dental' } },
  nurse: { name: 'Nursing', emoji: '👩‍⚕️', cat: 'health', ladder: [['Nursing Assistant', 36000], ['Registered Nurse', 79000], ['Charge Nurse', 93000], ['Nurse Manager', 118000]], req: { age: 21, edu: 'bachelor', majors: ['nursing'], clean: true } },
  therapist: { name: 'Mental Health', emoji: '🛋️', cat: 'health', ladder: [['Counselor', 48000], ['Therapist', 72000], ['Clinical Director', 105000]], req: { age: 23, edu: 'master', majors: ['psychology', 'sociology'] } },
  doctor: { name: 'Medicine', emoji: '🩺', cat: 'health', ladder: [['Medical Intern', 62000], ['Resident', 68000], ['Attending Physician', 235000], ['Department Head', 340000], ['Chief of Medicine', 460000]], req: { age: 25, degree: 'md', smarts: 60, clean: true } },
  surgeon: { name: 'Surgery', emoji: '🏥', cat: 'health', ladder: [['Surgical Resident', 70000], ['Surgeon', 380000], ['Chief Surgeon', 560000]], req: { age: 25, degree: 'md', smarts: 78, clean: true } },
  dentist: { name: 'Dentistry', emoji: '🦷', cat: 'health', ladder: [['Associate Dentist', 135000], ['Dentist', 175000], ['Practice Owner', 260000]], req: { age: 25, degree: 'dds' } },
  pharmacist: { name: 'Pharmacy', emoji: '💊', cat: 'health', ladder: [['Staff Pharmacist', 122000], ['Senior Pharmacist', 138000], ['Pharmacy Director', 168000]], req: { age: 24, degree: 'pharmd', clean: true } },
  vet: { name: 'Veterinary Medicine', emoji: '🐶', cat: 'health', ladder: [['Associate Veterinarian', 96000], ['Veterinarian', 112000], ['Senior Veterinarian', 136000], ['Clinic Owner', 185000]], req: { age: 25, degree: 'dvm' } },

  // ---- Tech & science ----
  it: { name: 'IT Support', emoji: '🖥️', cat: 'tech', ladder: [['IT Technician', 42000], ['Systems Administrator', 68000], ['IT Manager', 105000]], req: { age: 18, edu: 'high', sk: { coding: 25 } }, skill: 'coding' },
  software: { name: 'Software Engineering', emoji: '👩‍💻', cat: 'tech', ladder: [['Junior Developer', 76000], ['Software Engineer', 108000], ['Senior Engineer', 145000], ['Staff Engineer', 185000], ['Engineering Director', 235000], ['CTO', 330000]], req: { age: 21, edu: 'bachelor', majors: ['cs', 'math', 'engineering', 'physics'], smarts: 50 }, skill: 'coding' },
  data: { name: 'Data Science', emoji: '📊', cat: 'tech', ladder: [['Data Analyst', 66000], ['Data Scientist', 112000], ['Senior Data Scientist', 148000], ['Head of Data', 205000]], req: { age: 21, edu: 'bachelor', majors: ['math', 'economics', 'cs', 'physics', 'finance'], smarts: 55 }, skill: 'coding' },
  engineer: { name: 'Engineering', emoji: '⚙️', cat: 'tech', ladder: [['Junior Engineer', 71000], ['Engineer', 93000], ['Senior Engineer', 122000], ['Principal Engineer', 152000], ['VP of Engineering', 215000]], req: { age: 21, edu: 'bachelor', majors: ['engineering', 'physics'], smarts: 55 } },
  architect: { name: 'Architecture', emoji: '📐', cat: 'tech', ladder: [['Architectural Intern', 50000], ['Architect', 84000], ['Senior Architect', 112000], ['Principal Architect', 172000]], req: { age: 21, edu: 'bachelor', majors: ['architecture'] }, skill: 'art' },
  scientist: { name: 'Research Science', emoji: '🧪', cat: 'science', ladder: [['Lab Technician', 42000], ['Research Associate', 61000], ['Scientist', 92000], ['Senior Scientist', 122000], ['Research Director', 172000]], req: { age: 21, edu: 'bachelor', majors: ['biology', 'chemistry', 'physics'], smarts: 55 } },
  astronaut: { name: 'Space Program', emoji: '🚀', cat: 'science', ladder: [['Astronaut Candidate', 78000], ['Astronaut', 115000], ['Mission Commander', 165000]], req: { age: 26, maxAge: 50, edu: 'master', majors: ['physics', 'engineering', 'biology', 'chemistry', 'cs', 'math'], smarts: 82, sk: { fitness: 55 }, clean: true } },

  // ---- Business & finance ----
  accountant: { name: 'Accounting', emoji: '🧮', cat: 'business', ladder: [['Junior Accountant', 53000], ['Accountant', 66000], ['Senior Accountant', 86000], ['Controller', 132000], ['CFO', 255000]], req: { age: 21, edu: 'bachelor', majors: ['accounting', 'finance', 'business', 'economics', 'math'] }, skill: 'business' },
  marketing: { name: 'Marketing', emoji: '📣', cat: 'business', ladder: [['Marketing Assistant', 43000], ['Marketing Coordinator', 56000], ['Marketing Manager', 92000], ['Marketing Director', 142000], ['CMO', 265000]], req: { age: 21, edu: 'bachelor', majors: ['business', 'marketing', 'communications', 'psychology', 'journalism', 'design'] }, skill: 'business' },
  finance: { name: 'Investment Banking', emoji: '💹', cat: 'business', ladder: [['Financial Analyst', 76000], ['Investment Associate', 112000], ['Vice President', 185000], ['Managing Director', 360000]], req: { age: 21, edu: 'bachelor', majors: ['finance', 'economics', 'business', 'math', 'accounting'], smarts: 55 }, skill: 'business' },
  hr: { name: 'Human Resources', emoji: '👔', cat: 'business', ladder: [['HR Assistant', 41000], ['HR Generalist', 59000], ['HR Manager', 92000], ['VP of People', 172000]], req: { age: 21, edu: 'bachelor', majors: ['business', 'psychology', 'sociology', 'communications'] }, skill: 'charisma' },
  executive: { name: 'Corporate Management', emoji: '🏢', cat: 'business', ladder: [['Management Trainee', 62000], ['Manager', 98000], ['Senior Manager', 142000], ['Vice President', 255000], ['CEO', 950000]], req: { age: 23, degree: 'mba' }, skill: 'business' },

  // ---- Law ----
  paralegal: { name: 'Paralegal', emoji: '📑', cat: 'law', ladder: [['Legal Assistant', 39000], ['Paralegal', 53000], ['Senior Paralegal', 70000]], req: { age: 19, edu: 'assoc' } },
  lawyer: { name: 'Law', emoji: '⚖️', cat: 'law', ladder: [['Junior Associate', 92000], ['Associate', 132000], ['Senior Associate', 182000], ['Partner', 360000], ['Managing Partner', 620000]], req: { age: 24, degree: 'jd', clean: true }, skill: 'charisma' },
  judge: { name: 'Judiciary', emoji: '👩‍⚖️', cat: 'law', appointed: true, ladder: [['Magistrate', 142000], ['District Judge', 192000], ['Appellate Judge', 225000], ['Supreme Court Justice', 285000]], req: { age: 35, degree: 'jd', smarts: 70, clean: true } },

  // ---- Education ----
  teacher: { name: 'Teaching', emoji: '🍎', cat: 'education', ladder: [['Substitute Teacher', 34000], ['Teacher', 51000], ['Senior Teacher', 64000], ['Vice Principal', 88000], ['Principal', 112000]], req: { age: 21, edu: 'bachelor', clean: true }, skill: 'charisma' },
  professor: { name: 'Academia', emoji: '🎓', cat: 'education', ladder: [['Adjunct Professor', 46000], ['Assistant Professor', 82000], ['Associate Professor', 102000], ['Professor', 138000], ['Dean', 225000]], req: { age: 26, degree: 'phd' }, skill: 'writing' },
  librarian: { name: 'Library Science', emoji: '📚', cat: 'education', ladder: [['Library Assistant', 31000], ['Librarian', 56000], ['Head Librarian', 76000]], req: { age: 21, edu: 'bachelor', majors: ['english', 'history', 'education', 'philosophy', 'communications'] }, skill: 'writing' },

  // ---- Media & design ----
  journalist: { name: 'Journalism', emoji: '📰', cat: 'media', ladder: [['Junior Reporter', 38000], ['Reporter', 53000], ['Senior Correspondent', 78000], ['Editor-in-Chief', 145000]], req: { age: 21, edu: 'bachelor', majors: ['journalism', 'english', 'communications', 'polisci', 'history'] }, skill: 'writing' },
  designer: { name: 'Graphic Design', emoji: '🖍️', cat: 'media', ladder: [['Junior Designer', 43000], ['Graphic Designer', 59000], ['Senior Designer', 80000], ['Creative Director', 138000]], req: { age: 21, edu: 'bachelor', majors: ['design', 'art', 'architecture', 'film'] }, skill: 'art' },
  photographer: { name: 'Photography', emoji: '📷', cat: 'media', ladder: [['Photo Assistant', 28000], ['Photographer', 45000], ['Senior Photographer', 68000]], req: { age: 18, sk: { art: 25 } }, skill: 'art' },

  // ---- Entertainment (special: fame) ----
  actor: { name: 'Acting', emoji: '🎬', cat: 'fame', special: 'fame', skill: 'acting', ladder: [['Extra', 18000], ['Commercial Actor', 36000], ['TV Guest Star', 85000], ['Series Regular', 260000], ['Film Lead', 1200000], ['Movie Star', 8000000]], req: { age: 16, sk: { acting: 15 } } },
  musician: { name: 'Music', emoji: '🎤', cat: 'fame', special: 'fame', skill: 'music', ladder: [['Street Performer', 12000], ['Gigging Musician', 28000], ['Session Musician', 55000], ['Signed Artist', 160000], ['Chart-Topper', 1500000], ['Music Legend', 10000000]], req: { age: 14, sk: { music: 20 } } },
  model: { name: 'Modeling', emoji: '📸', cat: 'fame', special: 'fame', skill: 'charisma', looksDriven: true, ladder: [['Catalog Model', 26000], ['Runway Model', 62000], ['Fashion Model', 185000], ['Supermodel', 2200000]], req: { age: 16, maxAge: 45, looks: 70 } },
  author: { name: 'Writing', emoji: '📖', cat: 'fame', special: 'fame', skill: 'writing', ladder: [['Freelance Writer', 22000], ['Published Author', 48000], ['Bestselling Author', 320000], ['Literary Icon', 2000000]], req: { age: 16, sk: { writing: 25 } } },
  director: { name: 'Film Directing', emoji: '🎥', cat: 'fame', special: 'fame', skill: 'art', ladder: [['Production Assistant', 30000], ['Music Video Director', 62000], ['Indie Director', 130000], ['Studio Director', 750000], ['Auteur', 4500000]], req: { age: 18, sk: { art: 25, acting: 10 } } },
  producer: { name: 'Music Production', emoji: '🎚️', cat: 'fame', special: 'fame', skill: 'music', ladder: [['Studio Intern', 20000], ['Beatmaker', 42000], ['Producer', 115000], ['Hitmaker', 850000], ['Super Producer', 5200000]], req: { age: 16, sk: { music: 25 } } },
  comedian: { name: 'Comedy', emoji: '🎙️', cat: 'fame', special: 'fame', skill: 'acting', ladder: [['Open-Mic Comic', 9000], ['Club Comedian', 32000], ['Touring Comic', 120000], ['Comedy Special Star', 900000], ['Comedy Legend', 6000000]], req: { age: 18, sk: { acting: 10, charisma: 15 } } },

  // ---- Pro sports (special) ----
  athlete: { name: 'Pro Athlete', emoji: '🏆', cat: 'sports', special: 'sports', skill: 'athletics', ladder: [['Minor League Player', 42000], ['Bench Player', 480000], ['Starting Player', 2200000], ['All-Star', 8500000], ['League MVP', 22000000]], req: { age: 18, maxAge: 30, sk: { athletics: 45, fitness: 40 } } },
  fighter: { name: 'Pro Fighter', emoji: '🥊', cat: 'sports', special: 'sports', skill: 'martial', ladder: [['Amateur Fighter', 15000], ['Pro Fighter', 90000], ['Ranked Contender', 450000], ['Champion', 3500000]], req: { age: 18, maxAge: 32, sk: { martial: 45, fitness: 45 } } },
  racer: { name: 'Racing Driver', emoji: '🏎️', cat: 'sports', special: 'sports', skill: 'driving', ladder: [['Karting Prodigy', 8000], ['Junior Formula Driver', 40000], ['Formula Two Driver', 160000], ['Grand Prix Driver', 3200000], ['World Champion', 14000000]], req: { age: 14, maxAge: 30, sk: { driving: 30, fitness: 25 } } },
  // After the playing days (41-sports.js runs their seasons).
  coach: { name: 'Coaching', emoji: '📋', cat: 'sports', special: 'coach', skill: 'athletics', ladder: [['Assistant Coach', 70000], ['Head Coach', 450000], ['Championship Coach', 2600000]], req: { age: 28, sk: { athletics: 40, charisma: 20 } } },
  gm: { name: 'Front Office', emoji: '🗂️', cat: 'sports', special: 'coach', skill: 'business', ladder: [['Scout', 55000], ['Assistant GM', 140000], ['General Manager', 950000], ['President of Operations', 3200000]], req: { age: 26, sk: { athletics: 25, business: 30 } } },

  // ---- Military (special) ----
  military: { name: 'Military (Enlisted)', emoji: '🎖️', cat: 'military', special: 'military', skill: 'fitness', ladder: [['Private', 29000], ['Corporal', 35000], ['Sergeant', 43000], ['Staff Sergeant', 53000], ['Master Sergeant', 66000], ['Sergeant Major', 82000]], req: { age: 18, maxAge: 35, edu: 'high', sk: { fitness: 20 }, clean: true } },
  officer: { name: 'Military (Officer)', emoji: '⭐', cat: 'military', special: 'military', skill: 'charisma', ladder: [['Second Lieutenant', 46000], ['First Lieutenant', 56000], ['Captain', 70000], ['Major', 86000], ['Lieutenant Colonel', 106000], ['Colonel', 128000], ['General', 195000]], req: { age: 21, maxAge: 35, edu: 'bachelor', sk: { fitness: 30 }, clean: true } },

  // ---- Politics (special: elections) ----
  politician: { name: 'Politics', emoji: '🏛️', cat: 'politics', special: 'politics', skill: 'charisma', ladder: [['City Council Member', 48000], ['Mayor', 105000], ['Governor', 165000], ['Senator', 180000], ['Head of State', 400000]], req: { age: 25, edu: 'bachelor', sk: { charisma: 20 }, clean: true } },
};
const JOB_IDS = Object.keys(JOBS);

// Part-time jobs: one title, flat pay. Compatible with school.
const PT_JOBS = {
  grocery: { name: 'Grocery Bagger', emoji: '🛒', pay: 9000, req: { age: 14 } },
  usher: { name: 'Movie Theater Usher', emoji: '🍿', pay: 9000, req: { age: 14 } },
  icecream: { name: 'Ice Cream Scooper', emoji: '🍦', pay: 8500, req: { age: 14 } },
  carwash: { name: 'Car Wash Attendant', emoji: '🧽', pay: 9500, req: { age: 14 } },
  library: { name: 'Library Page', emoji: '📗', pay: 8000, req: { age: 14 } },
  lifeguard: { name: 'Lifeguard', emoji: '🏊', pay: 11000, req: { age: 15, sk: { fitness: 25 } } },
  camp: { name: 'Camp Counselor', emoji: '🏕️', pay: 7000, req: { age: 15 } },
  cashier: { name: 'Part-Time Cashier', emoji: '🧾', pay: 11000, req: { age: 15 } },
  tutor: { name: 'Tutor', emoji: '✏️', pay: 12000, req: { age: 15, smarts: 65 } },
  barista: { name: 'Barista', emoji: '☕', pay: 12000, req: { age: 16 } },
  server: { name: 'Part-Time Server', emoji: '🍝', pay: 12500, req: { age: 16 } },
  pizza: { name: 'Pizza Delivery Driver', emoji: '🍕', pay: 13000, req: { age: 16, license: true } },
  gym: { name: 'Gym Front Desk', emoji: '🏋️', pay: 10000, req: { age: 16 } },
  pet_store: { name: 'Pet Store Clerk', emoji: '🐹', pay: 10000, req: { age: 15 } },
};

// One-off gigs (max a few per year). pay: [lo, hi] US-baseline dollars.
const GIGS = {
  lemonade: { name: 'Sell lemonade', emoji: '🍋', ages: [5, 13], pay: [3, 60] },
  lawns: { name: 'Mow lawns', emoji: '🌿', ages: [10, 99], pay: [40, 320], sk: 'fitness' },
  babysit: { name: 'Babysit', emoji: '🍼', ages: [12, 99], pay: [50, 420] },
  dogs: { name: 'Walk dogs', emoji: '🐕', ages: [10, 99], pay: [30, 260], sk: 'fitness' },
  cars: { name: 'Wash cars', emoji: '🚿', ages: [10, 99], pay: [20, 220] },
  oddjobs: { name: 'Odd jobs for neighbors', emoji: '🧰', ages: [13, 99], pay: [50, 420] },
  tutoring: { name: 'Tutor a student', emoji: '📐', ages: [14, 99], pay: [100, 650], req: { smarts: 60 } },
  delivery: { name: 'Food delivery shift', emoji: '🛵', ages: [16, 99], pay: [180, 1400] },
  rideshare: { name: 'Rideshare driving', emoji: '🚕', ages: [18, 99], pay: [300, 2600], req: { license: true }, sk: 'driving' },
  busking: { name: 'Busk on the street', emoji: '🎻', ages: [10, 99], pay: [10, 900], req: { sk: { music: 15 } }, sk: 'music', scale: 'music' },
  art: { name: 'Sell artwork online', emoji: '🖼️', ages: [12, 99], pay: [40, 3200], req: { sk: { art: 20 } }, sk: 'art', scale: 'art' },
  writing: { name: 'Freelance writing', emoji: '📝', ages: [15, 99], pay: [150, 3200], req: { sk: { writing: 25 } }, sk: 'writing', scale: 'writing' },
  coding: { name: 'Freelance coding', emoji: '⌨️', ages: [14, 99], pay: [400, 9000], req: { sk: { coding: 30 } }, sk: 'coding', scale: 'coding' },
  housesit: { name: 'House-sit', emoji: '🔑', ages: [16, 99], pay: [100, 650] },
  catering: { name: 'Cater a party', emoji: '🥘', ages: [16, 99], pay: [200, 2400], req: { sk: { cooking: 30 } }, sk: 'cooking', scale: 'cooking' },
};

// Interview questions for regular jobs: answers are shuffled; `m` is the odds modifier.
const INTERVIEW_QS = [
  { q: 'Why do you want to work here?', a: [['I really admire what this company does.', 0.15], ['Honestly? I need the money.', 0], ['I heard there are free snacks.', -0.1]] },
  { q: 'What is your greatest weakness?', a: [['I sometimes take on too much, but I am learning to delegate.', 0.15], ['I work too hard.', 0], ['Mornings. And people.', -0.12]] },
  { q: 'Where do you see yourself in five years?', a: [['Growing into a leadership role here.', 0.15], ['Still employed, hopefully.', 0], ['Running this place. Possibly from a yacht.', -0.05]] },
  { q: 'Tell me about a time you handled conflict.', a: [['I listened first, then found a compromise.', 0.15], ['I avoided it until it went away.', -0.05], ['I won.', -0.1]] },
  { q: 'Why should we hire you over other candidates?', a: [['I bring a strong work ethic and fresh ideas.', 0.15], ['I am available immediately.', 0.05], ['Because I asked nicely?', -0.08]] },
  { q: 'How do you handle pressure?', a: [['I break big problems into small steps.', 0.15], ['I drink a lot of coffee.', 0], ['Badly, but quietly.', -0.1]] },
  { q: 'Do you have any questions for us?', a: [['What does success look like in this role?', 0.15], ['How soon do I get paid?', -0.05], ['No.', -0.08]] },
];
