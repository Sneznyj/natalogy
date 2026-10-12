/* Plain-language texts (English): planets, signs, houses, life areas and "why" phrases. Same shape as texts-ru.js. */
(function (root) {
  'use strict';
  const P = {
    sun: { name: 'Sun', gen: 'the Sun', your: 'your Sun', yourAcc: 'your Sun', yourDat: 'your Sun', area: 'confidence and goals', short: 'who you are — your core and strength', good: 'more energy and visibility', bad: 'friction with your plans' },
    moon: { name: 'Moon', gen: 'the Moon', your: 'your Moon', yourAcc: 'your Moon', yourDat: 'your Moon', area: 'feelings and wellbeing', short: 'what you need to feel safe', good: 'a warm mood', bad: 'mood swings' },
    mercury: { name: 'Mercury', gen: 'Mercury', your: 'your Mercury', yourAcc: 'your Mercury', yourDat: 'your Mercury', area: 'thinking and talking', short: 'how you think and speak', good: 'words and agreements come easily', bad: 'misunderstandings and mix-ups' },
    venus: { name: 'Venus', gen: 'Venus', your: 'your Venus', yourAcc: 'your Venus', yourDat: 'your Venus', area: 'love and money', short: 'what you love and how you attract', good: 'affection and pleasant spending', bad: 'overspending and whims' },
    mars: { name: 'Mars', gen: 'Mars', your: 'your Mars', yourAcc: 'your Mars', yourDat: 'your Mars', area: 'energy and action', short: 'how you act and go after things', good: 'drive and decisiveness', bad: 'haste and arguments' },
    jupiter: { name: 'Jupiter', gen: 'Jupiter', your: 'your Jupiter', yourAcc: 'your Jupiter', yourDat: 'your Jupiter', area: 'luck and growth', short: 'where you are lucky and where you grow', good: 'luck and growth', bad: 'excess and overpromising' },
    saturn: { name: 'Saturn', gen: 'Saturn', your: 'your Saturn', yourAcc: 'your Saturn', yourDat: 'your Saturn', area: 'duties and structure', short: 'where you need discipline and grow up', good: 'support and order', bad: 'pressure and tests' },
    uranus: { name: 'Uranus', gen: 'Uranus', your: 'your Uranus', yourAcc: 'your Uranus', yourDat: 'your Uranus', area: 'freedom and change', short: 'where you are unlike anyone else', good: 'fresh ideas', bad: 'sudden changes' },
    neptune: { name: 'Neptune', gen: 'Neptune', your: 'your Neptune', yourAcc: 'your Neptune', yourDat: 'your Neptune', area: 'dreams and intuition', short: 'dreams, inspiration and illusions', good: 'inspiration and intuition', bad: 'fog and illusions' },
    pluto: { name: 'Pluto', gen: 'Pluto', your: 'your Pluto', yourAcc: 'your Pluto', yourDat: 'your Pluto', area: 'power and deep change', short: 'where you go through rebirth', good: 'the strength to change deeply', bad: 'pressure and power struggles' },
    node: { name: 'North Node', gen: 'the North Node', your: 'your North Node', yourAcc: 'your North Node', yourDat: 'your North Node', area: 'path of growth', short: 'where you are meant to grow' },
    chiron: { name: 'Chiron', gen: 'Chiron', your: 'your Chiron', yourAcc: 'your Chiron', yourDat: 'your Chiron', area: 'wounds and healing', short: 'where it hurts — and where you can help others' },
    lilith: { name: 'Lilith', gen: 'Lilith', your: 'your Lilith', yourAcc: 'your Lilith', yourDat: 'your Lilith', area: 'forbidden desires', short: 'your shadow and provocation' },
    fortune: { name: 'Part of Fortune', gen: 'the Part of Fortune', your: 'your Part of Fortune', yourAcc: 'your Part of Fortune', yourDat: 'your Part of Fortune', area: 'luck', short: 'where luck comes most easily' },
    asc: { name: 'Ascendant', gen: 'the Ascendant', your: 'your Ascendant', yourAcc: 'your Ascendant', yourDat: 'your Ascendant', area: 'looks and first impressions', short: 'how people see you at first sight' },
    mc: { name: 'Midheaven', gen: 'the Midheaven', your: 'your Midheaven', yourAcc: 'your Midheaven', yourDat: 'your Midheaven', area: 'career and reputation', short: 'your calling and public role' },
  };
  const S = {
    aries: { name: 'Aries', gen: 'Aries', in: 'in Aries', style: 'boldly, fast and directly', partner: 'courage and thrill', money: 'through bold decisions and speed', essence: 'courage' },
    taurus: { name: 'Taurus', gen: 'Taurus', in: 'in Taurus', style: 'calmly, reliably and with taste', partner: 'reliability and taste', money: 'through quality, taste and patience', essence: 'reliability' },
    gemini: { name: 'Gemini', gen: 'Gemini', in: 'in Gemini', style: 'lightly, curiously and talkatively', partner: 'wit and ease', money: 'through words, connections and several income streams', essence: 'lightness and curiosity' },
    cancer: { name: 'Cancer', gen: 'Cancer', in: 'in Cancer', style: 'caringly, sensitively and homely', partner: 'care and warmth', money: 'through care, home and trust', essence: 'sensitivity' },
    leo: { name: 'Leo', gen: 'Leo', in: 'in Leo', style: 'brightly, warmly and generously', partner: 'radiance and generosity', money: 'through a personal brand, creativity and the stage', essence: 'warmth and pride' },
    virgo: { name: 'Virgo', gen: 'Virgo', in: 'in Virgo', style: 'precisely, neatly and usefully', partner: 'reliability in small things', money: 'through precise work and usefulness', essence: 'precision' },
    libra: { name: 'Libra', gen: 'Libra', in: 'in Libra', style: 'beautifully, diplomatically and in partnership', partner: 'beauty and equality', money: 'through beauty, partnership and agreements', essence: 'diplomacy' },
    scorpio: { name: 'Scorpio', gen: 'Scorpio', in: 'in Scorpio', style: 'deeply, passionately and all the way', partner: 'depth and loyalty', money: 'through depth, crises and shared money', essence: 'depth and strength' },
    sagittarius: { name: 'Sagittarius', gen: 'Sagittarius', in: 'in Sagittarius', style: 'broadly, honestly and with faith', partner: 'freedom and meaning', money: 'through knowledge, travel abroad and big ideas', essence: 'freedom and optimism' },
    capricorn: { name: 'Capricorn', gen: 'Capricorn', in: 'in Capricorn', style: 'seriously, patiently and for results', partner: 'seriousness and solid status', money: 'through career, status and long projects', essence: 'seriousness' },
    aquarius: { name: 'Aquarius', gen: 'Aquarius', in: 'in Aquarius', style: 'unusually, freely and with an idea', partner: 'freedom and originality', money: 'through technology, communities and unusual ideas', essence: 'independence' },
    pisces: { name: 'Pisces', gen: 'Pisces', in: 'in Pisces', style: 'gently, intuitively and with imagination', partner: 'tenderness and understanding', money: 'through creativity, helping and intuition', essence: 'softness and dreaminess' },
  };
  const H = {
    1: { name: 'house 1', where: 'in how you present yourself', area: 'you: looks, character, beginnings', with: 'with how you present yourself', to: 'into self-expression' },
    2: { name: 'house 2', where: 'in money and what you value', area: 'money, possessions, self-worth', with: 'with money and values', to: 'into money and possessions' },
    3: { name: 'house 3', where: 'in talking, learning and short trips', area: 'communication, learning, siblings, neighbours', with: 'with communication, learning and trips', to: 'into talking and learning' },
    4: { name: 'house 4', where: 'in home and family', area: 'home, family, roots', with: 'with home and family', to: 'into home and family' },
    5: { name: 'house 5', where: 'in creativity, romance and fun', area: 'romance, children, creativity, play', with: 'with creativity and pleasure', to: 'into creativity and love' },
    6: { name: 'house 6', where: 'in daily work and health', area: 'daily work, health, routine', with: 'with daily work', to: 'into work and health' },
    7: { name: 'house 7', where: 'in partnership and marriage', area: 'partners, marriage, contracts', with: 'with partners', to: 'into partnership' },
    8: { name: 'house 8', where: 'in shared money, crises and intimacy', area: 'shared money, loans, crises, intimacy', with: 'with shared money and other people’s resources', to: 'into shared matters and depth' },
    9: { name: 'house 9', where: 'in travel, study and beliefs', area: 'long trips, higher education, worldview', with: 'with study, travel and abroad', to: 'into study, travel and meaning' },
    10: { name: 'house 10', where: 'in career and reputation', area: 'career, status, goals', with: 'with career and status', to: 'into career' },
    11: { name: 'house 11', where: 'in friends, teams and online', area: 'friends, teams, communities, the internet', with: 'with friends, teams and the internet', to: 'into friends, teams and the internet' },
    12: { name: 'house 12', where: 'in solitude, intuition and the hidden', area: 'rest, the hidden, intuition', with: 'with solitude and the inner world', to: 'into solitude and the inner world' },
  };
  const ASP = {
    conj: { name: 'conjunction', verb: 'meets', soft: null }, sextile: { name: 'sextile', verb: 'helps', soft: true, dat: true }, trine: { name: 'trine', verb: 'supports', soft: true },
    square: { name: 'square', verb: 'presses on', soft: false }, opp: { name: 'opposition', verb: 'opposes', soft: false, dat: true }, quincunx: { name: 'quincunx', verb: 'clashes with', soft: false, dat: true },
  };
  const SPH = {
    love: { name: 'Love', short: 'relationships, dates, intimacy', tips: { 2: ['A great day for a date or an important talk about feelings', 'Say the warm words first — they will be heard'], 1: ['Good for meetings and gentle confessions', 'Give someone close a small surprise'], 0: ['An ordinary day: no big steps, just be there'], '-1': ['Don’t sort out the relationship in the heat of the moment', 'Give your partner more space'], '-2': ['A hard day for feelings: postpone serious talks', 'Don’t decide on a breakup in anger'] } },
    money: { name: 'Money', short: 'purchases, deals, income', tips: { 2: ['Good for money talks and big purchases', 'Ask for a raise or name your price'], 1: ['Good for shopping and paying bills', 'A good day to start saving'], 0: ['Ordinary spending — no risk'], '-1': ['Don’t shop on impulse — wait a day', 'Double-check numbers and change'], '-2': ['Don’t sign deals or lend money', 'Postpone big purchases'] } },
    career: { name: 'Work', short: 'career, bosses, results', tips: { 2: ['A day to show results and ask for more', 'Good for an interview or an important meeting'], 1: ['Push your ideas — you will be noticed', 'Good for closing tasks and planning'], 0: ['Steady work rhythm — finish what you started'], '-1': ['Don’t argue with your boss; double-check your work', 'Better to finish than to start'], '-2': ['Save your strength: complaints and delays are possible', 'Postpone big career decisions'] } },
    launch: { name: 'Launches', short: 'new projects, starts, publishing', tips: { 2: ['A great day to launch a project or publish something new', 'Start what you have been putting off'], 1: ['You can start — pick the best hours below', 'Good for announcements'], 0: ['An average day to start: prepare, test, plan'], '-1': ['Better not to launch anything new: finish and check', 'If you are launching anyway — check everything twice'], '-2': ['Don’t launch anything new today', 'A good day for fixes and tidying up'] } },
    talk: { name: 'Talks', short: 'negotiations, messages, study', tips: { 2: ['The best time for negotiations, calls and speeches', 'Study and exams will go smoothly'], 1: ['Good for agreeing and writing important letters', 'Reach out to someone you haven’t heard from in a while'], 0: ['Ordinary conversations, no big agreements'], '-1': ['Be precise — it’s easy to be misunderstood', 'Reread messages before sending'], '-2': ['Don’t sign contracts or start arguments', 'Reschedule important negotiations'] } },
    energy: { name: 'Energy', short: 'strength, sport, health', tips: { 2: ['Plenty of strength: sport, big tasks, a push', 'Good for starting a new habit'], 1: ['Good tone — get moving', 'You’ll get more done than usual'], 0: ['Even energy — keep your usual routine'], '-1': ['Don’t overload yourself; more sleep and water', 'Keep your workout gentle'], '-2': ['A recovery day: fewer tasks, more rest', 'Take care on the road and with sharp tools'] } },
    rest: { name: 'Rest', short: 'creativity, hobbies, recovery', tips: { 2: ['Inspiration peaks: create, walk, dream', 'A perfect day for holidays and hobbies'], 1: ['Good for creativity and walks', 'Allow yourself a treat'], 0: ['An ordinary day — find half an hour for yourself'], '-1': ['Rest may not feel joyful — choose simple things', 'Don’t expect too much from the weekend'], '-2': ['Anxious and foggy: fewer screens, more quiet', 'Don’t make big decisions on emotions'] } },
  };
  const LEVEL = { 2: 'great', 1: 'good', 0: 'steady', '-1': 'careful', '-2': 'hard' };
  const LEVEL_DAY = { 2: 'A strong day', 1: 'A good day', 0: 'A calm day', '-1': 'A tricky day', '-2': 'A hard day' };
  const MOON_SIGN = {
    aries: 'Moon in Aries: fast and bold — good for starting, easy to flare up.', taurus: 'Moon in Taurus: calm and tasty — a day for money, body and comfort.',
    gemini: 'Moon in Gemini: lots of talk and news — good for communication and study.', cancer: 'Moon in Cancer: a sensitive day — home, family, care.',
    leo: 'Moon in Leo: you want attention — good for performing and creating.', virgo: 'Moon in Virgo: a day for order, lists and health.',
    libra: 'Moon in Libra: beautiful and diplomatic — meetings, dates, agreements.', scorpio: 'Moon in Scorpio: deep feelings — don’t push, don’t be jealous.',
    sagittarius: 'Moon in Sagittarius: you want space — travel, study, plans.', capricorn: 'Moon in Capricorn: a day for serious work and discipline.',
    aquarius: 'Moon in Aquarius: fresh ideas and friends — good for tech and experiments.', pisces: 'Moon in Pisces: soft and dreamy — creativity and rest, not numbers.',
  };
  const PHASE8 = ['New moon', 'Waxing crescent', 'First quarter', 'Waxing moon', 'Full moon', 'Waning moon', 'Last quarter', 'Balsamic moon'];
  const phaseIdx = (a) => (a < 15 || a >= 345 ? 0 : a < 84 ? 1 : a < 96 ? 2 : a < 168 ? 3 : a < 192 ? 4 : a < 264 ? 5 : a < 276 ? 6 : 7);
  const PHASE_TIP = ['Make wishes and plan; start in a day or two', 'Time to start and try', 'Act even if it’s hard', 'Bring things to results', 'Emotions peak — don’t decide in the heat', 'Share, thank, give', 'Sum up and clear out', 'Rest and finish'];
  const RETRO = {
    mercury: { name: 'Mercury retrograde', tip: 'Double-check contracts, messages and tickets. Good for finishing old things, bad for starting new ones.' },
    venus: { name: 'Venus retrograde', tip: 'Don’t change prices or make expensive purchases. People from the past return.' },
    mars: { name: 'Mars retrograde', tip: 'Energy turns inward: don’t start fights or risky ventures.' },
    jupiter: { name: 'Jupiter retrograde', tip: 'Growth happens inside: revise your plans.' }, saturn: { name: 'Saturn retrograde', tip: 'Time to rework duties and deadlines.' },
    uranus: { name: 'Uranus retrograde', tip: 'Change ripens inside.' }, neptune: { name: 'Neptune retrograde', tip: 'Illusions clear.' }, pluto: { name: 'Pluto retrograde', tip: 'Time to look honestly at your fears.' },
  };
  const SHADOW = { mercury: 'Finish rather than start: Mercury is crossing the degrees of its turn.', venus: 'Careful with prices and purchases: Venus is in the degrees of its turn.', mars: 'Don’t force things: Mars is in the degrees of its turn.' };
  const ECLIPSE = { solar: 'A solar eclipse is near: better not to start new things; events are unpredictable.', lunar: 'A lunar eclipse is near: emotions and endings — not the time to start.' };
  const fmtTime = (d, tz) => { try { return new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' }).format(d); } catch (e) { return d.toISOString().slice(11, 16); } };
  const gend = (str) => String(str).replace(/\{([^{}|]*)\|([^{}]*)\}/g, (m, a) => a);
  const ord = (n) => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
  function reason(r, tz) {
    switch (r.kind) {
      case 'transit': {
        const t = P[r.T], n = P[r.N], a = ASP[r.type];
        const when = r.T === 'moon' && r.exactAt ? ` (around ${fmtTime(r.exactAt, tz)})` : '';
        return `${t.name} ${a.verb} ${n.yourAcc}${when}: ${r.v >= 0 ? t.good : t.bad} in “${n.area}”`;
      }
      case 'moonHouse': return `The Moon is in your ${ord(r.house)} house: focus ${H[r.house].where}`;
      case 'phase': return ({ newMoon: 'New moon — time to plan rather than start', waxing: 'Waxing Moon — what you start will grow', waxingLate: 'The Moon is almost full — good for bringing things to results', fullMoon: 'Full moon — emotions peak', waning: 'Waning Moon — better for finishing than starting' })[r.key];
      case 'voc': return `Void of course Moon for ${Math.round(r.minutes / 60)} h in daytime — things started now tend to stall`;
      case 'retro': return `${RETRO[r.id].name}: ${RETRO[r.id].tip.split('.')[0].toLowerCase()}`;
      case 'shadow': return `${P[r.id].name} shadow: ${SHADOW[r.id].split(':')[0].toLowerCase()}`;
      case 'station': return `${P[r.id].name} ${r.dir === 'retro' ? 'stations retrograde' : 'stations direct'} — its themes peak, don’t rush`;
      case 'eclipse': return 'An eclipse is near — not the time to start';
      default: return '';
    }
  }
  function headline(day) {
    const list = Object.entries(day.spheres).sort((a, b) => b[1].score - a[1].score);
    const best = list.filter(([, v]) => v.level >= 1).slice(0, 2).map(([k]) => SPH[k].name.toLowerCase());
    const worst = list.filter(([, v]) => v.level <= -1).slice(-2).map(([k]) => SPH[k].name.toLowerCase());
    let s = LEVEL_DAY[day.overall.level];
    if (best.length) s += ` for ${best.join(' and ')}`;
    if (worst.length) s += `. Careful with ${worst.join(', ')}`;
    return s + '.';
  }
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const WD_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // ---------- v2: day title, do / better not, activities, timed events ----------
  const TITLE = {
    up: { love: 'Tenderness', money: 'Money', career: 'Career', launch: 'Launch', talk: 'Talks', energy: 'Charged', rest: 'Inspiration' },
    mid: { love: 'Warmth', money: 'Shopping', career: 'Getting things done', launch: 'Go ahead', talk: 'Connect', energy: 'Action', rest: 'Cosy' },
    flat: 'Steady',
    down: { love: 'No quarrels', money: 'Hold the wallet', career: 'No rush', launch: 'Slow down', talk: 'Quieter', energy: 'Save energy', rest: 'Stillness' },
  };
  function dayTitle(day) {
    const list = Object.entries(day.spheres).sort((a, b) => b[1].ptsF - a[1].ptsF);
    const [bk, bv] = list[0], [wk, wv] = list[list.length - 1];
    const o = day.overall.level;
    if (o <= -1 || (wv.level <= -2 && bv.level < 2)) return TITLE.down[wk];
    if (bv.level >= 2 || (o >= 1 && bv.level >= 1)) return TITLE.up[bk];
    if (bv.level >= 1) return TITLE.mid[bk];
    if (wv.level <= -1) return TITLE.down[wk];
    return TITLE.flat;
  }
  const TAGS = {
    love: { ok: ['dates', 'warm words'], bad: ['relationship showdowns', 'jealousy'] },
    money: { ok: ['shopping', 'asking to be paid'], bad: ['impulse buys', 'lending money'] },
    career: { ok: ['showing results', 'interviews'], bad: ['arguing with the boss', 'changing jobs'] },
    launch: { ok: ['starting new things', 'publishing'], bad: ['launching new things', 'taking risks'] },
    talk: { ok: ['negotiations', 'important emails'], bad: ['signing contracts', 'arguments'] },
    energy: { ok: ['sport', 'big tasks'], bad: ['overload', 'rushing'] },
    rest: { ok: ['creativity', 'walks'], bad: ['emotional decisions', 'too much screen time'] },
  };
  function dayTags(day) {
    const list = Object.entries(day.spheres).sort((a, b) => b[1].ptsF - a[1].ptsF);
    const ok = [], bad = [];
    for (const [k, v] of list) if (v.level >= 1 && ok.length < 3) ok.push(TAGS[k].ok[0]);
    if (list[0][1].level >= 2 && ok.length < 4) ok.push(TAGS[list[0][0]].ok[1]);
    for (const [k, v] of list.slice().reverse()) if (v.level <= -1 && bad.length < 3) bad.push(TAGS[k].bad[0]);
    if (list[list.length - 1][1].level <= -2 && bad.length < 4) bad.push(TAGS[list[list.length - 1][0]].bad[1]);
    return { ok: [...new Set(ok)], bad: [...new Set(bad)] };
  }
  const ACT = {
    date: { name: 'A date', icon: 'love', hint: 'love, rest and talks' },
    contract: { name: 'Sign a contract', icon: 'edit', hint: 'talks, money and starts' },
    purchase: { name: 'A big purchase', icon: 'money', hint: 'money and a good start' },
    interview: { name: 'Interview, key meeting', icon: 'career', hint: 'work and talks' },
    launch: { name: 'Launch, publish', icon: 'launch', hint: 'launches and work' },
    moneytalk: { name: 'Ask for money', icon: 'crown', hint: 'money, talks and work' },
    study: { name: 'Study, exam', icon: 'bulb', hint: 'talks and focus' },
    sport: { name: 'Sport, hard effort', icon: 'energy', hint: 'energy' },
    trip: { name: 'A trip', icon: 'route', hint: 'rest, talks and energy' },
    rest: { name: 'Rest, creativity', icon: 'rest', hint: 'rest and love' },
  };
  const EV_SHORT = { sun: ['visibility', 'friction with plans'], moon: ['warm mood', 'mood swings'], mercury: ['clear words', 'mix-ups'], venus: ['affection', 'overspending'], mars: ['drive', 'haste, arguments'], jupiter: ['luck', 'overdoing it'], saturn: ['support', 'heaviness, debts'], uranus: ['fresh ideas', 'surprises'], neptune: ['inspiration', 'fog'], pluto: ['power', 'pressure'] };
  const PHASE4 = ['New moon', 'First quarter', 'Full moon', 'Last quarter'];
  const PH4_TIP = [PHASE_TIP[0], PHASE_TIP[2], PHASE_TIP[4], PHASE_TIP[6]];
  function evText(e, tz) {
    switch (e.kind) {
      case 'transit': {
        const t = P[e.T], n = P[e.N], a = ASP[e.type];
        const good = e.v >= 0;
        return { title: `${t.name} ${a.verb} ${n.yourAcc}`, short: EV_SHORT[e.T][good ? 0 : 1], text: `${(good ? t.good : t.bad).replace(/^./, (c) => c.toUpperCase())} in “${n.area}”.`, ctx: e.tHouse && e.nHouse ? `${t.name} in house ${e.tHouse} → ${n.your} (house ${e.nHouse})` : '' };
      }
      case 'ingress': return { title: `${P[e.T].name} enters ${S[e.sign].name}`, short: `${P[e.T].name} ${S[e.sign].in}`, text: e.T === 'moon' ? MOON_SIGN[e.sign] : `${P[e.T].area.replace(/^./, (c) => c.toUpperCase())} — ${S[e.sign].style}.`, ctx: '' };
      case 'phase': return { title: PHASE4[e.phase], short: PHASE4[e.phase].toLowerCase(), text: PH4_TIP[e.phase] + '.', ctx: '' };
      case 'vocStart': return { title: 'Void of course Moon', short: `void until ${fmtTime(e.end, tz)}`, text: `Until ${fmtTime(e.end, tz)} things started tend to stall: good for rest, finishing and thinking rather than starting.`, ctx: '' };
      case 'vocEnd': return { title: 'The Moon is back on course', short: 'go ahead', text: 'The void of course period is over — you can start and agree on things.', ctx: '' };
      case 'station': return { title: `${P[e.T].name} stations ${e.dir === 'retro' ? 'retrograde' : 'direct'}`, short: e.dir === 'retro' ? 'station, turns back' : 'station, turns forward', text: `“${P[e.T].area}” peaks — don’t rush decisions.`, ctx: '' };
      case 'eclipse': { const sol = String(e.type || e.kindOf || '').includes('solar'); return { title: sol ? 'Solar eclipse' : 'Lunar eclipse', short: 'eclipse', text: ECLIPSE[sol ? 'solar' : 'lunar'], ctx: '' }; }
      default: return { title: '', short: '', text: '', ctx: '' };
    }
  }
  root.NTexts = root.NTexts || {};
  root.NTexts.en = { P, S, H, ASP, SPH, LEVEL, LEVEL_DAY, MOON_SIGN, PHASE8, PHASE_TIP, RETRO, SHADOW, ECLIPSE, gend, phaseIdx, reason, headline, signName: (id) => S[id].name, planetName: (id) => P[id].name, MONTHS, MONTHS_N: MONTHS, WD, WD_FULL, fmtTime, monthDay: (d, m) => `${MONTHS[m - 1]} ${d}`, dayTitle, dayTags, ACT, evText, PHASE4, TAGS };
})(typeof window !== 'undefined' ? window : globalThis);
