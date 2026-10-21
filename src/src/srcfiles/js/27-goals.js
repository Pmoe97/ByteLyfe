/* =====================================================================
 * 27-goals.js — achievements (kept forever, across lives), bucket-list
 * goals (three per life), and the legacy titles you earn at death.
 * ===================================================================== */

const LC = (s, k) => lifeCount(s, k);
const ACHIEVEMENTS = [
  { id: 'first_steps', name: 'First Steps', emoji: '👣', desc: 'Reach age 5.', check: (s) => A(s) >= 5 },
  { id: 'adult', name: 'Grown Up', emoji: '🎂', desc: 'Reach age 18.', check: (s) => A(s) >= 18 },
  { id: 'over_hill', name: 'Over the Hill', emoji: '⛰️', desc: 'Reach age 50.', check: (s) => A(s) >= 50 },
  { id: 'golden', name: 'Golden Years', emoji: '🌅', desc: 'Reach age 80.', check: (s) => A(s) >= 80 },
  { id: 'centenarian', name: 'Centenarian', emoji: '💯', desc: 'Reach age 100.', check: (s) => A(s) >= 100 },
  { id: 'graduate', name: 'Graduate', emoji: '🎓', desc: 'Finish high school.', check: (s) => hasHighSchool(s) },
  { id: 'degree', name: 'Degree Holder', emoji: '📜', desc: "Earn a bachelor's degree.", check: (s) => eduRank(s) >= 3 },
  { id: 'doctor', name: 'Doctor in the House', emoji: '🩺', desc: 'Earn a medical degree.', check: (s) => hasDegree(s, 'md') },
  { id: 'lawyer', name: 'Objection!', emoji: '⚖️', desc: 'Earn a law degree.', check: (s) => hasDegree(s, 'jd') },
  { id: 'phd', name: 'Doctor of Philosophy', emoji: '🔬', desc: 'Earn a PhD.', check: (s) => hasDegree(s, 'phd') },
  { id: 'hired', name: 'Gainfully Employed', emoji: '💼', desc: 'Get a full-time job.', check: (s) => LC(s, 'jobs') >= 1 },
  { id: 'top_rung', name: 'Top of the Ladder', emoji: '🔝', desc: 'Reach the top of any career.', check: (s) => !!M(s).career && M(s).career.level === JOBS[M(s).career.id].ladder.length - 1 },
  { id: 'ceo', name: 'Corner Office', emoji: '🏢', desc: 'Become a CEO.', check: (s) => !!M(s).career && M(s).career.id === 'executive' && M(s).career.level === 4 },
  { id: 'head_of_state', name: 'Leader of the Nation', emoji: '🏛️', desc: 'Become Head of State.', check: (s) => !!M(s).career && M(s).career.id === 'politician' && M(s).career.level === 4 },
  { id: 'movie_star', name: 'Movie Star', emoji: '🎬', desc: 'Become a movie star.', check: (s) => !!M(s).career && M(s).career.id === 'actor' && M(s).career.level === 5 },
  { id: 'legend', name: 'Music Legend', emoji: '🎤', desc: 'Become a music legend.', check: (s) => !!M(s).career && M(s).career.id === 'musician' && M(s).career.level === 5 },
  { id: 'mvp', name: 'MVP', emoji: '🏆', desc: 'Win league MVP.', check: (s) => !!M(s).career && M(s).career.id === 'athlete' && M(s).career.level === 4 },
  { id: 'general', name: 'Four Stars', emoji: '⭐', desc: 'Become a general.', check: (s) => !!M(s).career && M(s).career.id === 'officer' && M(s).career.level === 6 },
  { id: 'astronaut', name: 'To the Stars', emoji: '🚀', desc: 'Become an astronaut.', check: (s) => !!M(s).career && M(s).career.id === 'astronaut' && M(s).career.level >= 1 },
  { id: 'retired', name: 'Gone Fishing', emoji: '🎣', desc: 'Retire.', check: (s) => !!M(s).retired },
  { id: 'thousandaire', name: 'Five Figures', emoji: '💵', desc: 'Have $10,000.', check: (s) => netWorth(s) >= 10000 },
  { id: 'millionaire', name: 'Millionaire', emoji: '💰', desc: 'Be worth $1 million.', check: (s) => netWorth(s) >= 1e6 },
  { id: 'billionaire', name: 'Billionaire', emoji: '🤑', desc: 'Be worth $1 billion.', check: (s) => netWorth(s) >= 1e9 },
  { id: 'jackpot', name: 'Jackpot!', emoji: '🎰', desc: 'Win the lottery jackpot.', check: (s) => LC(s, 'jackpots') >= 1 },
  { id: 'homeowner', name: 'Homeowner', emoji: '🏡', desc: 'Buy a home.', check: (s) => LC(s, 'housesBought') >= 1 },
  { id: 'mogul', name: 'Property Mogul', emoji: '🏘️', desc: 'Own five homes at once.', check: (s) => M(s).assets.filter((a) => a.kind === 'house').length >= 5 },
  { id: 'gearhead', name: 'Gearhead', emoji: '🏎️', desc: 'Own five vehicles at once.', check: (s) => M(s).assets.filter((a) => a.kind === 'car').length >= 5 },
  { id: 'castle', name: 'King of the Castle', emoji: '🏯', desc: 'Own a castle.', check: (s) => M(s).assets.some((a) => a.type === 'castle') },
  { id: 'first_love', name: 'First Love', emoji: '💕', desc: 'Start a relationship.', check: (s) => LC(s, 'partners') >= 1 },
  { id: 'married', name: 'Tied the Knot', emoji: '💒', desc: 'Get married.', check: (s) => LC(s, 'marriages') >= 1 },
  { id: 'serial_spouse', name: 'Serial Spouse', emoji: '💍', desc: 'Get married four times.', check: (s) => LC(s, 'marriages') >= 4 },
  { id: 'parent', name: 'Parenthood', emoji: '👶', desc: 'Have a child.', check: (s) => LC(s, 'kids') >= 1 },
  { id: 'big_family', name: 'Big Family', emoji: '👨‍👩‍👧‍👦', desc: 'Have five kids.', check: (s) => LC(s, 'kids') >= 5 },
  { id: 'grandparent', name: 'Grandparent', emoji: '👵', desc: 'Have a grandchild.', check: (s) => relPeople(s, ['grandchild'], { dead: true }).length >= 1 },
  { id: 'dynasty', name: 'Dynasty', emoji: '🌳', desc: 'Reach generation 5.', check: (s) => s.gen >= 5 },
  { id: 'pet_lover', name: 'Pet Lover', emoji: '🐾', desc: 'Adopt three pets in one life.', check: (s) => LC(s, 'pets') >= 3 },
  { id: 'popular', name: 'Social Butterfly', emoji: '🦋', desc: 'Have ten friends at once.', check: (s) => relPeople(s, ['friend', 'bestie']).length >= 10 },
  { id: 'heartbreaker', name: 'Heartbreaker', emoji: '💔', desc: 'Go through ten breakups.', check: (s) => LC(s, 'breakups') >= 10 },
  { id: 'influencer', name: 'Influencer', emoji: '📱', desc: 'Reach 1 million followers.', check: (s) => !!M(s).socials && M(s).socials.followers >= 1e6 },
  { id: 'viral', name: 'Gone Viral', emoji: '🚀', desc: 'Have a post go viral.', check: (s) => LC(s, 'viral') >= 1 },
  { id: 'famous', name: 'Household Name', emoji: '🌟', desc: 'Reach 90 fame.', check: (s) => M(s).fame >= 90 },
  { id: 'saint', name: 'Saint', emoji: '😇', desc: 'Reach 100 karma.', check: (s) => M(s).karma >= 100 },
  { id: 'devil', name: 'Pure Evil', emoji: '😈', desc: 'Drop to 0 karma.', check: (s) => M(s).karma <= 0 },
  { id: 'genius', name: 'Genius', emoji: '🧠', desc: 'Reach 100 smarts.', check: (s) => P(s).stats.smarts >= 100 },
  { id: 'gorgeous', name: 'Drop-Dead Gorgeous', emoji: '💅', desc: 'Reach 100 looks.', check: (s) => P(s).stats.looks >= 100 },
  { id: 'master', name: 'Mastery', emoji: '🥇', desc: 'Max out any skill.', check: (s) => SKILL_IDS.some((k) => skill(s, k) >= 99) },
  { id: 'jailbird', name: 'Jailbird', emoji: '⛓️', desc: 'Go to prison.', check: (s) => LC(s, 'prisonStints') >= 1 },
  { id: 'escape', name: 'Escape Artist', emoji: '🕳️', desc: 'Escape from prison.', check: (s) => LC(s, 'escapes') >= 1 },
  { id: 'acquitted', name: 'Not Guilty', emoji: '🎉', desc: 'Get acquitted at trial.', check: (s) => LC(s, 'acquittals') >= 1 },
  { id: 'kingpin', name: 'Kingpin', emoji: '💎', desc: 'Steal $1 million in one life.', check: (s) => LC(s, 'crimeLoot') >= 1e6 },
  { id: 'globetrotter', name: 'Globetrotter', emoji: '🌍', desc: 'Take ten vacations.', check: (s) => LC(s, 'vacations') >= 10 },
  { id: 'expat', name: 'Expat', emoji: '🛂', desc: 'Move to another country.', check: (s) => LC(s, 'countries') >= 1 },
  { id: 'survivor', name: 'Survivor', emoji: '🎗️', desc: 'Beat cancer.', check: (s) => LC(s, 'cancerBeaten') >= 1 },
  { id: 'philanthropist', name: 'Philanthropist', emoji: '💝', desc: 'Donate $1 million in one life.', check: (s) => LC(s, 'donated') >= 1e6 },
  { id: 'medal', name: 'Decorated', emoji: '🎖️', desc: 'Earn a military medal.', check: (s) => LC(s, 'medals') >= 1 },
  { id: 'won_election', name: 'Elected', emoji: '🗳️', desc: 'Win an election.', check: (s) => LC(s, 'elections') >= 1 },
  { id: 'founder', name: 'Founder', emoji: '🚀', desc: 'Start a business.', check: (s) => LC(s, 'companiesFounded') >= 1 },
  { id: 'in_the_black', name: 'In the Black', emoji: '📗', desc: 'Have a company turn a profit.', check: (s) => LC(s, 'profitableYears') >= 1 },
  { id: 'big_employer', name: 'Job Creator', emoji: '🏭', desc: 'Employ 100 people.', check: (s) => sum(companies(s), (c) => headcount(c)) >= 100 },
  { id: 'unicorn', name: 'Unicorn', emoji: '🦄', desc: 'Own a company worth $1 billion.', check: (s) => companies(s).some((c) => coWorth(c) >= 1e9) },
  { id: 'ipo', name: 'Ring the Bell', emoji: '🔔', desc: 'Take a company public.', check: (s) => LC(s, 'ipos') >= 1 },
  { id: 'exit', name: 'The Big Exit', emoji: '🥂', desc: 'Sell a company for $1 million or more.', check: (s) => LC(s, 'exitValue') >= 1e6 },
  { id: 'serial', name: 'Serial Entrepreneur', emoji: '🔁', desc: 'Found three companies in one life.', check: (s) => LC(s, 'companiesFounded') >= 3 },
  { id: 'family_business', name: 'Family Business', emoji: '🏢', desc: 'Inherit a company.', check: (s) => LC(s, 'inheritedCompanies') >= 1 },
  { id: 'lessons', name: 'Lessons Learned', emoji: '📉', desc: 'Have a company go bankrupt.', check: (s) => LC(s, 'bizFails') >= 1 },
  { id: 'takeover', name: 'Hostile Takeover', emoji: '🦈', desc: 'Buy another company.', check: (s) => LC(s, 'acquisitions') >= 1 },
  { id: 'champion', name: 'Champion', emoji: '🏆', desc: 'Win a league championship.', check: (s) => LC(s, 'championships') >= 1 },
  { id: 'mvp', name: 'Most Valuable', emoji: '🏅', desc: 'Win a league MVP award.', check: (s) => LC(s, 'mvps') >= 1 },
  { id: 'belt', name: 'Undisputed', emoji: '🥊', desc: 'Win a world title belt.', check: (s) => LC(s, 'beltWon') >= 1 },
  { id: 'race_winner', name: 'Chequered Flag', emoji: '🏁', desc: 'Win a race.', check: (s) => LC(s, 'raceWins') >= 1 },
  { id: 'world_champion', name: 'World Champion', emoji: '🏎️', desc: 'Win the Grand Prix World Series.', check: (s) => LC(s, 'worldTitles') >= 1 },
  { id: 'builder', name: 'The Builder', emoji: '📋', desc: 'Win a title as a coach, executive or team owner.', check: (s) => LC(s, 'coachTitles') + LC(s, 'ownerTitles') >= 1 },
  { id: 'hall_of_fame', name: 'Hall of Famer', emoji: '🏛️', desc: 'Get inducted into the Hall of Fame.', check: (s) => LC(s, 'hallOfFame') >= 1 },
  { id: 'chart_topper', name: 'Number One', emoji: '💿', desc: 'Top the album chart.', check: (s) => LC(s, 'numberOnes') >= 1 },
  { id: 'bestseller', name: 'Bestseller', emoji: '📖', desc: 'Top the bestseller list.', check: (s) => LC(s, 'bestsellers') >= 1 },
  { id: 'blockbuster', name: 'Blockbuster', emoji: '🎥', desc: 'Be part of a film that grosses $100 million.', check: (s) => LC(s, 'blockbusters') >= 1 },
  { id: 'award_winner', name: 'And the Winner Is...', emoji: '🏆', desc: 'Win an award for your work.', check: (s) => LC(s, 'awards') >= 1 },
  { id: 'trophy_case', name: 'Trophy Case', emoji: '🏅', desc: 'Win awards at three different award shows.', check: (s) => !!M(s).sb && M(s).sb.shows.length >= 3 },
  { id: 'own_label', name: 'On Your Own Terms', emoji: '🎚️', desc: 'Release your work through a label or studio you own.', check: (s) => LC(s, 'ownReleases') >= 1 },
  { id: 'made_man', name: 'Made', emoji: '🕴️', desc: 'Become a made member of a crime family.', check: (s) => LC(s, 'madeMan') >= 1 },
  { id: 'the_don', name: 'The Don', emoji: '👔', desc: 'Run a crime family.', check: (s) => LC(s, 'becameBoss') >= 1 },
  { id: 'kingpin', name: 'Kingpin', emoji: '💊', desc: 'Run a cartel.', check: (s) => LC(s, 'cartelBoss') >= 1 },
  { id: 'professional', name: 'The Professional', emoji: '🎯', desc: 'Complete 5 contracts.', check: (s) => LC(s, 'contracts') >= 5 },
  { id: 'curator', name: 'Curator of Crime', emoji: '🏛️', desc: 'Open a private museum full of stolen treasures.', check: (s) => LC(s, 'museums') >= 1 },
  { id: 'street_king', name: 'Street King', emoji: '🏁', desc: 'Win 10 street races.', check: (s) => !!M(s).uw && M(s).uw.races >= 10 },
  { id: 'born_royal', name: 'Born Royal', emoji: '👶', desc: 'Be born into a royal family.', check: (s) => LC(s, 'royalBirth') >= 1 },
  { id: 'crowned', name: 'Long Live the Crown', emoji: '👑', desc: 'Take the throne.', check: (s) => LC(s, 'crowned') >= 1 },
  { id: 'step_down', name: 'The Quiet Exit', emoji: '🚪', desc: 'Abdicate the throne or give up a royal title.', check: (s) => LC(s, 'abdications') + LC(s, 'renounced') >= 1 },
  { id: 'jubilee', name: 'Silver Jubilee', emoji: '🎉', desc: 'Reign for 25 years.', check: (s) => { const cr = crown(s); const r = cr && cr.reigns[cr.reigns.length - 1]; return !!r && r.pid === s.playerId && s.year - r.from >= 25; } },
  { id: 'franchise_king', name: 'Franchise King', emoji: '🏪', desc: 'Have 25 franchised locations.', check: (s) => companies(s).some((c) => c.franchise && c.franchise.outlets >= 25) },
  { id: 'market_leader', name: 'Market Leader', emoji: '🥇', desc: 'Outsell every rival in your industry.', check: (s) => companies(s).some((c) => !c.closed && c.last && c.last.revenue > 0 && industryRivals(s, c.ind).every((f) => f.rev < c.last.revenue)) },
  { id: 'stock_picker', name: 'Stock Picker', emoji: '💹', desc: 'Make $100,000 in gains selling stocks.', check: (s) => LC(s, 'stockGains') >= price(s, 100000) },
  { id: 'hitmaker', name: 'Hitmaker', emoji: '🔥', desc: 'Launch three hit products.', check: (s) => LC(s, 'hits') >= 3 },
  { id: 'see_you_in_court', name: 'See You in Court', emoji: '⚖️', desc: 'File a lawsuit.', check: (s) => LC(s, 'lawsuitsFiled') >= 1 },
  { id: 'jackpot_justice', name: 'Jackpot Justice', emoji: '💰', desc: 'Win $1 million in a single lawsuit.', check: (s) => LC(s, 'bigVerdicts') >= 1 },
  { id: 'small_claims', name: 'Small Claims, Big Win', emoji: '🧾', desc: 'Win in small claims court.', check: (s) => LC(s, 'smallClaimsWon') >= 1 },
  { id: 'case_dismissed', name: 'Case Dismissed', emoji: '🛡️', desc: 'Beat a lawsuit someone filed against you.', check: (s) => LC(s, 'suitsBeaten') >= 1 },
  { id: 'order_in_court', name: 'Order in the Court', emoji: '🔨', desc: 'Rule on 25 cases as a judge.', check: (s) => LC(s, 'rulings') >= 25 },
  { id: 'highest_court', name: 'Highest Court in the Land', emoji: '🏛️', desc: 'Be confirmed to the Supreme Court.', check: (s) => LC(s, 'supremeCourt') >= 1 },
  { id: 'storyteller', name: 'Storyteller', emoji: '📖', desc: 'See five story chains through to the end in one life.', check: (s) => LC(s, 'storiesDone') >= 5 },
  { id: 'festive', name: 'Festive', emoji: '🎉', desc: 'Celebrate ten holidays in one life.', check: (s) => LC(s, 'holidays') >= 10 },
  { id: 'marathoner', name: 'Marathoner', emoji: '🏅', desc: 'Finish a marathon.', check: (s) => LC(s, 'marathons') >= 1 },
  { id: 'legal_eagle', name: 'Legal Eagle', emoji: '🦅', desc: 'Win 10 trials for your clients.', check: (s) => LC(s, 'clientWins') >= 10 },
  { id: 'stage_parent', name: 'Stage Parent', emoji: '🎬', desc: 'Raise a child star.', check: (s) => LC(s, 'childStar') >= 1 },
  { id: 'old_school_tie', name: 'Old School Tie', emoji: '🏛️', desc: 'Send a child to boarding school.', check: (s) => LC(s, 'boarding') >= 1 },
  { id: 'matchmaker', name: 'Matchmaker', emoji: '💑', desc: 'Arrange a marriage for one of your children.', check: (s) => LC(s, 'arranged') >= 1 },
  { id: 'succession', name: 'Succession', emoji: '🗝️', desc: 'Pass the family business to the heir you named.', check: (s) => LC(s, 'heirBusiness') >= 1 },
  { id: 'family_way', name: 'Keep It in the Family', emoji: '🕴️', desc: 'Take over the crime family your parent left you.', check: (s) => LC(s, 'mobHeir') >= 1 },
];

// Bucket-list goals: three random ones per life.
const GOALS = [
  { id: 'g_degree', text: "Earn a bachelor's degree", emoji: '🎓', check: (s) => eduRank(s) >= 3 },
  { id: 'g_grad', text: 'Earn a graduate degree', emoji: '📚', check: (s) => eduRank(s) >= 4 },
  { id: 'g_rich', text: 'Become a millionaire', emoji: '💰', check: (s) => netWorth(s) >= 1e6 },
  { id: 'g_house', text: 'Own your own home', emoji: '🏡', check: (s) => M(s).assets.some((a) => a.kind === 'house') },
  { id: 'g_marry', text: 'Get married', emoji: '💒', check: (s) => LC(s, 'marriages') >= 1 },
  { id: 'g_kids', text: 'Have two kids', emoji: '👶', check: (s) => LC(s, 'kids') >= 2 },
  { id: 'g_90', text: 'Live to 90', emoji: '🎂', check: (s) => A(s) >= 90 },
  { id: 'g_travel', text: 'Take five vacations', emoji: '✈️', check: (s) => LC(s, 'vacations') >= 5 },
  { id: 'g_fame', text: 'Become famous (60+ fame)', emoji: '🌟', check: (s) => M(s).fame >= 60 },
  { id: 'g_top', text: 'Reach the top of a career', emoji: '🔝', check: (s) => !!M(s).career && M(s).career.level === JOBS[M(s).career.id].ladder.length - 1 },
  { id: 'g_fit', text: 'Get to 80 fitness', emoji: '💪', check: (s) => skill(s, 'fitness') >= 80 },
  { id: 'g_skill', text: 'Master a skill (90+)', emoji: '🥇', check: (s) => SKILL_IDS.some((k) => skill(s, k) >= 90) },
  { id: 'g_friends', text: 'Have five friends at once', emoji: '🤗', check: (s) => relPeople(s, ['friend', 'bestie']).length >= 5 },
  { id: 'g_pet', text: 'Adopt a pet', emoji: '🐾', check: (s) => LC(s, 'pets') >= 1 },
  { id: 'g_karma', text: 'Reach 90 karma', emoji: '😇', check: (s) => M(s).karma >= 90 },
  { id: 'g_abroad', text: 'Live in another country', emoji: '🛂', check: (s) => LC(s, 'countries') >= 1 },
  { id: 'g_doctor', text: 'Become a doctor', emoji: '🩺', check: (s) => !!M(s).career && ['doctor', 'surgeon'].includes(M(s).career.id) },
  { id: 'g_lawyer', text: 'Become a lawyer', emoji: '⚖️', check: (s) => !!M(s).career && M(s).career.id === 'lawyer' },
  { id: 'g_star', text: 'Make it in show business', emoji: '🎬', check: (s) => !!M(s).career && JOBS[M(s).career.id].special === 'fame' && M(s).career.level >= 3 },
  { id: 'g_office', text: 'Win an election', emoji: '🗳️', check: (s) => LC(s, 'elections') >= 1 },
  { id: 'g_car', text: 'Buy a sports car or better', emoji: '🏎️', check: (s) => M(s).assets.some((a) => ['sports', 'super', 'hyper'].includes(a.type)) },
  { id: 'g_followers', text: 'Reach 100K followers', emoji: '📱', check: (s) => !!M(s).socials && M(s).socials.followers >= 100000 },
  { id: 'g_grandkid', text: 'Meet a grandchild', emoji: '👵', check: (s) => relPeople(s, ['grandchild'], { dead: true }).length >= 1 },
  { id: 'g_debtfree', text: 'Be debt-free at 40 with $100K', emoji: '🧾', check: (s) => A(s) >= 40 && !M(s).loans.length && M(s).money >= price(s, 100000) },
  { id: 'g_charity', text: 'Donate $50,000 to charity', emoji: '💝', check: (s) => LC(s, 'donated') >= price(s, 50000) },
  { id: 'g_clean', text: 'Reach 60 without a criminal record', emoji: '🧼', check: (s) => A(s) >= 60 && !M(s).record.length },
  { id: 'g_business', text: 'Start your own business', emoji: '🚀', check: (s) => LC(s, 'companiesFounded') >= 1 },
  { id: 'g_ipo', text: 'Take a company public', emoji: '🔔', check: (s) => LC(s, 'ipos') >= 1 },
  { id: 'g_staff', text: 'Employ 50 people at once', emoji: '🏭', check: (s) => sum(companies(s), (c) => headcount(c)) >= 50 },
  { id: 'g_lawsuit', text: 'Win a lawsuit', emoji: '⚖️', check: (s) => LC(s, 'lawsuitsWon') >= 1 },
  { id: 'g_marathon', text: 'Run a marathon', emoji: '🏃', check: (s) => LC(s, 'marathons') >= 1 },
  { id: 'g_judge', text: 'Become a judge', emoji: '🔨', check: (s) => !!M(s).career && M(s).career.id === 'judge' },
];

// Legacy titles at death, in priority order. The first three that match are shown.
const LEGACY_TITLES = [
  { id: 'monarch', name: 'Monarch', emoji: '👑', check: (s) => LC(s, 'crowned') >= 1 },
  { id: 'royal', name: 'Royal', emoji: '🏰', check: (s) => !!s.crown && royalBlood(s, P(s)) },
  { id: 'don', name: 'The Don', emoji: '👔', check: (s) => LC(s, 'becameBoss') + LC(s, 'cartelBoss') >= 1 },
  { id: 'legend', name: 'Living Legend', emoji: '🏆', check: (s) => LC(s, 'awards') >= 5 },
  { id: 'justice', name: 'The Honorable', emoji: '🔨', check: (s) => LC(s, 'supremeCourt') >= 1 || LC(s, 'judgeYears') >= 10 },
  { id: 'goat', name: 'The GOAT', emoji: '🐐', check: (s) => LC(s, 'championships') + LC(s, 'mvps') + LC(s, 'beltWon') + LC(s, 'worldTitles') >= 3 },
  { id: 'gone_soon', name: 'Gone Too Soon', emoji: '🥀', check: (s) => A(s) < 25 },
  { id: 'fugitive', name: 'Fugitive', emoji: '🕶️', check: (s) => M(s).wanted > 0 },
  { id: 'villain', name: 'Villain', emoji: '😈', check: (s) => M(s).karma <= 10 || LC(s, 'murders') >= 2 },
  { id: 'tycoon', name: 'Tycoon', emoji: '🤑', check: (s) => netWorth(s) >= 1e8 },
  { id: 'mogul', name: 'Business Mogul', emoji: '🏢', check: (s) => LC(s, 'exitValue') >= 5e7 || companies(s).some((c) => coWorth(c) >= 1e8) },
  { id: 'star', name: 'Superstar', emoji: '🌟', check: (s) => M(s).fame >= 80 },
  { id: 'politician', name: 'Statesman', emoji: '🏛️', check: (s) => LC(s, 'elections') >= 2 },
  { id: 'jailbird', name: 'Jailbird', emoji: '⛓️', check: (s) => LC(s, 'prisonYears') >= 10 },
  { id: 'saint', name: 'Saint', emoji: '😇', check: (s) => M(s).karma >= 90 },
  { id: 'centenarian', name: 'Centenarian', emoji: '💯', check: (s) => A(s) >= 100 },
  { id: 'millionaire', name: 'Millionaire', emoji: '💰', check: (s) => netWorth(s) >= 1e6 },
  { id: 'scholar', name: 'Scholar', emoji: '🎓', check: (s) => eduRank(s) >= 5 },
  { id: 'family', name: 'Family Builder', emoji: '👨‍👩‍👧‍👦', check: (s) => LC(s, 'kids') >= 4 },
  { id: 'heartbreaker', name: 'Heartbreaker', emoji: '💔', check: (s) => LC(s, 'breakups') + LC(s, 'divorces') >= 6 },
  { id: 'athlete', name: 'Athlete', emoji: '🏅', check: (s) => skill(s, 'athletics') >= 80 || skill(s, 'fitness') >= 85 },
  { id: 'globetrotter', name: 'Globetrotter', emoji: '🌍', check: (s) => LC(s, 'vacations') >= 8 },
  { id: 'litigious', name: 'Serial Litigant', emoji: '📁', check: (s) => LC(s, 'lawsuitsFiled') >= 6 },
  { id: 'workaholic', name: 'Workaholic', emoji: '💼', check: (s) => LC(s, 'workYears') >= 45 },
  { id: 'broke', name: 'Broke', emoji: '📉', check: (s) => netWorth(s) < 0 },
  { id: 'lonely', name: 'Lone Wolf', emoji: '🐺', check: (s) => A(s) >= 40 && !LC(s, 'partners') },
];

function assignGoals(s) {
  M(s).goals = pickN(GOALS, 3).map((g) => ({ id: g.id, done: false }));
}
function legacyTitles(s) {
  const out = [];
  for (const t of LEGACY_TITLES) {
    try { if (t.check(s)) out.push(t); } catch (e) { /* ignore */ }
    if (out.length >= 3) break;
  }
  return out;
}

function checkAchievements(s) {
  if (!s.player || !s.playerId || !s.people[s.playerId]) return;
  const m = M(s);
  for (const a of ACHIEVEMENTS) {
    if (m.achievements.includes(a.id)) continue;
    let ok = false;
    try { ok = a.check(s); } catch (e) { ok = false; }
    if (!ok) continue;
    m.achievements.push(a.id);
    if (!onAchievement(a.id)) continue; // already unlocked in an earlier life: count it quietly
    log(s, `🏅 Achievement unlocked: ${a.name}`, 'good');
    if (!s.dead) popup(s, { emoji: a.emoji, title: 'Achievement unlocked!', text: `${a.name}: ${a.desc}`, tone: 'good' });
  }
}
function checkGoals(s) {
  if (!s.player || s.dead) return;
  for (const g of M(s).goals) {
    if (g.done) continue;
    const def = GOALS.find((x) => x.id === g.id);
    let ok = false;
    try { ok = def && def.check(s); } catch (e) { ok = false; }
    if (!ok) continue;
    g.done = true;
    g.year = s.year;
    add(s, { happy: 10, karma: 2 });
    announce(s, { emoji: '✅', title: 'Goal complete!', text: `You completed a life goal: ${def.text}.`, tone: 'good', log: `✅ Goal complete: ${def.text}` });
  }
}
// Called after anything changes the life.
function afterChange(s) {
  if (!s || !s.player) return;
  checkAchievements(s);
  checkGoals(s);
}
