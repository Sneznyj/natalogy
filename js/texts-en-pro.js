/* Pro mode (English): method names, astrocartography lines (do / avoid), firdaria, patterns. */
(function (root) {
  'use strict';
  const T = root.NTexts.en;
  T.chartTypes = { natal: 'Natal', transit: 'Transits', solar: 'Solar return', lunar: 'Lunar return', directions: 'Directions', progressions: 'Progressions', horary: 'Horary', synastry: 'Synastry', composite: 'Composite' };
  T.houseSystems = { placidus: 'Placidus', koch: 'Koch', porphyry: 'Porphyry', equal: 'Equal', whole: 'Whole sign' };
  T.angles = { asc: 'rising (ASC)', dsc: 'setting (DSC)', mc: 'zenith (MC)', ic: 'nadir (IC)' };
  T.acg = {
    sun: { mc: { g: 'Career, recognition, leadership — you get noticed here', b: 'Don’t go it alone: pride pushes people away' }, ic: { g: 'Home, roots, family, inner strength', b: 'Harder to be in the public eye' }, asc: { g: 'Confidence, energy, a fresh start', b: 'Ego and leadership conflicts' }, dsc: { g: 'Bright partners, strong alliances', b: 'Dissolving in someone else’s light' } },
    moon: { mc: { g: 'Working with people, care, popularity', b: 'Mood swings in public' }, ic: { g: 'Comfort, family, a sense of home', b: 'Getting stuck in the past' }, asc: { g: 'Sensitivity, softness, people’s trust', b: 'Vulnerability and touchiness' }, dsc: { g: 'Warm relationships, family', b: 'Emotional dependency' } },
    mercury: { mc: { g: 'Study, writing, media, trade', b: 'Busyness and scattering' }, ic: { g: 'Working from home, study', b: 'Restless thoughts' }, asc: { g: 'Communication, deals, connections', b: 'Nervousness' }, dsc: { g: 'Contracts, business partners', b: 'Empty talk' } },
    venus: { mc: { g: 'Beauty, art, money through taste', b: 'Laziness and idleness' }, ic: { g: 'A beautiful home, family harmony', b: 'Overspending on comfort' }, asc: { g: 'Charm, love, a pleasant life', b: 'Superficiality' }, dsc: { g: 'Love and marriage, good alliances', b: 'Idealising a partner' } },
    mars: { mc: { g: 'Sport, business, ambition, wins', b: 'Conflicts with bosses' }, ic: { g: 'Renovation, building, home energy', b: 'Family quarrels' }, asc: { g: 'Courage, sport, drive', b: 'Aggression and injuries — take care' }, dsc: { g: 'Passion and strong rivals', b: 'Disputes and lawsuits' } },
    jupiter: { mc: { g: 'Career growth, luck, recognition', b: 'Promising more than you can' }, ic: { g: 'A big home, family prosperity', b: 'Complacency' }, asc: { g: 'Optimism, luck, opportunities', b: 'Weight gain and excess' }, dsc: { g: 'Generous partners and patrons', b: 'Depending on others’ generosity' } },
    saturn: { mc: { g: 'A long serious career, status', b: 'Heavy load and slow growth' }, ic: { g: 'Stability, real estate', b: 'Coldness and loneliness at home' }, asc: { g: 'Discipline, maturing', b: 'Fatigue, limitations' }, dsc: { g: 'Reliable long-term alliances', b: 'Cold or heavy relationships' } },
    uranus: { mc: { g: 'Tech, startups, freedom at work', b: 'Sudden career changes' }, ic: { g: 'Freedom, an unusual home', b: 'Unstable housing' }, asc: { g: 'Renewal, freedom, insights', b: 'Nervous tension, surprises' }, dsc: { g: 'Unusual, free relationships', b: 'Sudden breakups' } },
    neptune: { mc: { g: 'Art, music, spirituality, film', b: 'Career fog, deception' }, ic: { g: 'Retreat, a place by water, creativity', b: 'Illusions about home, dampness' }, asc: { g: 'Inspiration, intuition, softness', b: 'Losing yourself, addictions' }, dsc: { g: 'Romance, spiritual unions', b: 'Deceptive partners' } },
    pluto: { mc: { g: 'Power, influence, deep transformation', b: 'Power struggles, pressure' }, ic: { g: 'Rebirth, working with the past', b: 'Heavy family stories' }, asc: { g: 'Strong charisma, change', b: 'Crises and control' }, dsc: { g: 'Deep powerful unions', b: 'Jealousy and manipulation' } },
  };
  T.firdar = { sun: 'Sun period: goals, recognition, personal power', moon: 'Moon period: family, home, feelings, the people around', mercury: 'Mercury period: study, communication, business and connections', venus: 'Venus period: love, beauty, pleasure, money', mars: 'Mars period: struggle, energy, bold steps', jupiter: 'Jupiter period: growth, luck, teachers and expansion', saturn: 'Saturn period: responsibility, work, being tested', node: 'North Node period: a step onto a new path', southNode: 'South Node period: endings, letting go of the old' };
  T.firdarLong = {
    sun: 'A time to show yourself: goals, career, recognition, relations with bosses and your father. You want to be seen and independent; things go well where you are in the centre and answer for the result.',
    moon: 'Focus on home, family, feelings and health. Mother, loved ones, everyday life, moves and a sense of safety matter. Life runs in waves of mood — take extra care of yourself.',
    mercury: 'A period of study, communication and business. Documents, negotiations, trips, trade, writing, new skills and contacts. The mind is quick — a good time to learn and build connections.',
    venus: 'Love, beauty and pleasure come first. Relationships, marriage, creativity, money, comfort and gifts of fate. Don’t slip into laziness and overspending.',
    mars: 'A time for action and bold steps. Competition, sport, fighting for what is yours, business, moves. Lots of energy — channel it into work, or it leaks into quarrels, haste and injuries.',
    jupiter: 'A period of growth and expansion. Study, travel, patrons, luck, rising income and status, family and children. Plan big — but don’t promise more than you can deliver.',
    saturn: 'A period of responsibility and maturing. Work, obligations, tests of strength, long projects, real estate. Slow but solid: what you build now lasts for years.',
    node: 'A short North Node period (3 years): a step onto a new path, fateful meetings and events that turn life forward.',
    southNode: 'A short South Node period (2 years): endings and summing up. Let go of what has run its course — it frees room for a new cycle.',
  };
  T.firdarSub = {
    sun: 'goals, recognition, bosses and father, the wish to be seen', moon: 'home, family, mother, mood, health, moves', mercury: 'study, documents, negotiations, trips, siblings',
    venus: 'love, marriage, beauty, pleasure, money and gifts', mars: 'bold steps, competition, sport; risk of quarrels and injuries', jupiter: 'growth, luck, patrons, study, travel', saturn: 'responsibility, work, limits, maturing, long projects',
  };
  T.firdarMix = (maj, sub, majName, subName) => (maj === sub ? `A pure ${majName} period: its themes sound at full strength — ${T.firdarSub[sub]}.` : `Background: ${majName} (${T.firdarSub[maj] || ''}); ${subName} adds: ${T.firdarSub[sub]}.`);
  T.firdarDig = { strong: 'The planet is strong in your chart — this sub-period goes easier and luckier.', weak: 'The planet is weak in your chart — more effort and tests, less ease.' };
  T.trx = {
    what: 'A transit is when a planet in the sky right now forms an aspect (a special angle) to a point of your birth chart. While the aspect is active, the themes of that point are “switched on”. Slow planets (Jupiter, Saturn, Uranus, Neptune, Pluto) act for months and change life; fast ones (Sun, Moon, Mercury, Venus, Mars) last days and hours — the background of mood and events.',
    planet: {
      sun: 'The Sun puts a spotlight on the theme: focus, strength and attention from others. Lasts 2–3 days.', moon: 'The Moon sets the mood for a few hours: emotions, wellbeing, everyday details.',
      mercury: 'Mercury brings talks, news, messages, trips and thoughts about this theme. 1–3 days, longer when retrograde.', venus: 'Venus softens: liking, pleasure, beauty, money, reconciliation. 2–4 days.',
      mars: 'Mars adds energy and drive: to act, argue, take risks. A few days.', jupiter: 'Jupiter expands and opens doors: growth, luck, teachers, travel. 2–4 weeks, may repeat three times due to retrograde motion.',
      saturn: 'Saturn tests your strength: responsibility, deadlines, limits, maturing. 1–3 months, often three times. The result is solid if you don’t run from the work.',
      uranus: 'Uranus brings sudden change, freedom and surprises. It acts for months, and events often strike on the days of the exact aspect.',
      neptune: 'Neptune blurs boundaries: inspiration, dreams, intuition — but also fog, illusions, fatigue. Acts softly for 1–2 years.',
      pluto: 'Pluto is deep transformation: what is outworn leaves, a new strength is born. Acts for 1–3 years; changes are irreversible.',
      node: 'The lunar Node is a point of destiny: meetings and events that turn your life path.', chiron: 'Chiron touches old wounds — and gives a chance to heal them, to help yourself and others.',
    },
    aspect: {
      conj: 'Conjunction — fusion: the planet’s energy enters this theme directly. The strongest aspect; plus or minus depends on the planets.', sextile: 'Sextile — an opportunity: it helps if you take a step towards it.',
      trine: 'Trine — flow and ease: things fall into place, just use it.', square: 'Square — tension and challenge: it pushes you to act and change something.',
      opp: 'Opposition — standoff: events come through other people, look for balance.', quincunx: 'Quincunx — awkwardness: you have to adjust and correct things.',
    },
    combo: {
      sun: { soft: 'strength and confidence — a good time to show yourself', hard: 'clashes with plans and egos — don’t push', conj: 'the theme is in the spotlight, new goals' },
      moon: { soft: 'a warm mood, support from loved ones', hard: 'emotions jump — don’t decide in the heat of the moment', conj: 'feelings are heightened, you want care' },
      mercury: { soft: 'words and agreements come easily', hard: 'misunderstandings and confusion — double-check', conj: 'lots of thoughts, talks and news' },
      venus: { soft: 'liking, pleasure, pleasant money', hard: 'extra spending and whims — keep the measure', conj: 'love and beauty are near' },
      mars: { soft: 'energy and courage in action', hard: 'haste and conflicts — cool down before deciding', conj: 'a push and a burst' },
      jupiter: { soft: 'luck comes by itself — expand boldly', hard: 'don’t overpromise or overpay: excess is the main risk', conj: 'a new cycle of growth — plant seeds' },
      saturn: { soft: 'work gives a solid result, support and recognition', hard: 'load, delays and tests — patience and a plan', conj: 'the start of a new cycle of responsibility' },
      uranus: { soft: 'fresh ideas and freedom come easily', hard: 'sudden shake-ups — don’t cling to the outworn', conj: 'a sharp renewal: life changes direction' },
      neptune: { soft: 'inspiration, intuition, creativity', hard: 'fog and illusions — check facts and people', conj: 'old boundaries dissolve, subtle changes' },
      pluto: { soft: 'strength and influence grow — change deeply', hard: 'pressure and control struggles — let go of what’s outworn', conj: 'the theme is reborn — no way back' },
      node: { soft: 'the right people and events find you', hard: 'a fork in the road — choose growth over habit', conj: 'a fateful meeting or event' },
      chiron: { soft: 'healing and wisdom from past experience', hard: 'old pain hurts — be gentle with yourself', conj: 'an old wound asks for attention' },
    },
    advice: { soft: 'How to use it: start, ask, negotiate — this theme has support now.', hard: 'How to get through: don’t push or rush, break the task into steps, protect your energy and relationships. Tension brings growth when you channel it into action.', conj: 'How to live it: the theme is in focus — deal with it consciously rather than going with the flow.' },
    phase: { applying: 'The aspect is applying — its strength is growing.', separating: 'The aspect is separating — the peak has passed, the influence fades.', exact: 'The aspect is nearly exact — peak influence.' },
  };
  T.acgAngle = {
    asc: 'Rising line (ASC): in these places the planet was rising over the horizon at your birth. Its energy shows in you yourself — appearance, wellbeing, behaviour and how people perceive you.',
    dsc: 'Setting line (DSC): here the planet was setting. Its themes come through other people — partners, clients, loved ones and rivals.',
    mc: 'Zenith line (MC): here the planet stood at the top of the sky. It is about career, status, reputation and who you are in society.',
    ic: 'Nadir line (IC): here the planet was underfoot, at the lowest point. It is about home, family, roots, property and inner calm.',
  };
  T.acgPlanet = {
    sun: 'Sun — confidence, vitality, recognition.', moon: 'Moon — feelings, care, family, popularity.', mercury: 'Mercury — mind, communication, study, deals.', venus: 'Venus — love, beauty, pleasure, money.', mars: 'Mars — energy, courage, sport, struggle.',
    jupiter: 'Jupiter — luck, growth, opportunities, generosity.', saturn: 'Saturn — discipline, work, responsibility, tests.', uranus: 'Uranus — freedom, change, technology, surprises.', neptune: 'Neptune — inspiration, dreams, spirituality, illusions.', pluto: 'Pluto — power, influence, deep change.',
  };
  T.firdarYearNote ='Annual firdaria: the solar year from your birthday is divided among the rulers in the same proportions as the major 75-year cycle, starting from the ruler of the current major period. Schools differ in method.';
  T.patterns = { grandTrine: 'Grand trine', tSquare: 'T-square', grandCross: 'Grand cross', yod: 'Yod (finger of fate)', kite: 'Kite', mysticRectangle: 'Mystic rectangle', stellium: 'Stellium' };
  T.dig = { domicile: 'domicile', exaltation: 'exaltation', triplicity: 'triplicity', term: 'term', face: 'face', detriment: 'detriment', fall: 'fall' };
  T.horaryStr = { ascEarly: 'Ascendant in the first 3° — too early to judge', ascLate: 'Ascendant in the last 3° — too late, the matter is settled', saturnAngle1: 'Saturn in the 1st — the astrologer may err', saturnAngle7: 'Saturn in the 7th — be careful with conclusions', viaCombusta: 'Moon in the Via Combusta (15° Libra — 15° Scorpio)', moonLate: 'Moon in the last degrees of a sign' };
  T.shapes = { bundle: 'bundle', bowl: 'bowl', bucket: 'bucket', locomotive: 'locomotive', seesaw: 'seesaw', splay: 'splay', splash: 'splash' };
})(typeof window !== 'undefined' ? window : globalThis);
