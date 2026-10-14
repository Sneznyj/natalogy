/* ИИ-помощник: собирает расчёты в короткий набор фактов и спрашивает сервер (server/ai-worker).
   Считает всё приложение, ИИ только объясняет. Имя и город на сервер не уходят.
   Без сервера (или без сети) отвечает встроенный помощник по правилам — по тем же расчётам. */
(function (root) {
  'use strict';
  const AC = root.AstroCore, NS = root.NScore, UI = root.NUI;
  const r1 = (x) => Math.round(x * 10) / 10;
  const dstr = (d) => `${d.y}-${UI.pad(d.mo)}-${UI.pad(d.d)}`;

  function natalFacts(chart) {
    const pts = chart.points.filter((p) => !['fortune'].includes(p.id)).map((p) => ({ p: p.id, sign: p.sign, deg: r1(p.lon % 30), house: p.house || undefined, retro: p.retro || undefined, dignity: p.dignity || undefined }));
    const asp = chart.aspects.filter((a) => ['conj', 'sextile', 'square', 'trine', 'opp'].includes(a.type)).slice(0, 18).map((a) => ({ a: a.a, b: a.b, type: a.type, orb: r1(a.orb) }));
    const out = { planets: pts, aspects: asp, elements: chart.summary.elements, stelliums: chart.summary.stelliums, dominant: chart.summary.dominant };
    if (chart.houses) out.cusps = chart.houses.cusps.map((c, i) => ({ h: i + 1, sign: AC.signOf(c), deg: r1(c % 30) }));
    else out.note = 'birth time unknown: houses, ASC and MC are not used';
    return out;
  }

  /** Факты для вопроса: натал + сегодня + ближайшие 45 дней + медленные транзиты (+ пара). */
  async function facts(person, opts) {
    opts = opts || {};
    const here = UI.here(), tz = here.tz;
    const natal = UI.chartOf(person);
    const now = UI.todayIn(tz);
    const start = opts.date || now;
    const days = await root.NCompute.range(person, start.y, start.mo, start.d, 45, tz);
    const TX = root.NTexts.en || root.NTexts.ru;
    const day0 = days[0];
    const summarizeDay = (d) => ({ date: dstr(d), overall: d.overall.level, spheres: Object.fromEntries(NS.SPHERES.map((s) => [s, d.spheres[s].level])), moon: d.flags.moonSign, moonHouse: d.flags.moonHouse || undefined, retro: d.flags.retro.filter((x) => ['mercury', 'venus', 'mars'].includes(x)), voc_hours_daytime: r1(d.flags.vocMinutes / 60) || undefined });
    const best = {};
    for (const s of NS.SPHERES) {
      const sorted = days.map((d) => ({ d, v: d.spheres[s].score })).sort((a, b) => b.v - a.v);
      best[s] = { best: sorted.slice(0, 4).map((x) => dstr(x.d)), avoid: sorted.slice(-3).map((x) => dstr(x.d)) };
    }
    const reasons = day0.reasons.filter((r) => Math.abs(r.v) > 0.15).slice(0, 10).map((r) => ({ sphere: r.sphere, effect: r1(r.v), kind: r.kind, transit: r.T, natal: r.N, aspect: r.type, id: r.id, house: r.house }));
    const slow = AC.transits(natal, AC.addDays(day0.start, -20), AC.addDays(day0.start, 60), { transiting: ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] })
      .slice(0, 12).map((e) => AC.transitSpan(e)).map((e) => ({ transit: e.transiting, aspect: e.type, natal: e.natal, from: e.start.toISOString().slice(0, 10), to: e.end.toISOString().slice(0, 10), exact: e.exact.map((x) => x.toISOString().slice(0, 10)) }));
    const retro = AC.retrogradePeriods(['mercury', 'venus', 'mars', 'jupiter', 'saturn'], AC.addDays(day0.start, -10), AC.addDays(day0.start, 90))
      .map((r) => ({ planet: r.id, from: r.start.toISOString().slice(0, 10), to: r.end.toISOString().slice(0, 10) }));
    const age = now.y - person.y - ((now.mo < person.mo || (now.mo === person.mo && now.d < person.d)) ? 1 : 0);
    const f = {
      app: 'natalogy', today: dstr(now), timezone: tz, person: { gender: person.gender === 'f' ? 'female' : 'male', age, birth_time_known: person.timeKnown !== false },
      natal: natalFacts(natal), day: summarizeDay(day0), day_reasons: reasons, next_days: days.slice(1, 15).map(summarizeDay), best_days_45: best, slow_transits: slow, retrogrades: retro,
      profection: (() => { try { const pr = AC.profection(natal, new Date()); return { house: pr.house, sign: pr.sign, lord: pr.lord }; } catch (e) { return undefined; } })(),
    };
    if (opts.partner) {
      const cb = UI.chartOf(opts.partner);
      const syn = AC.synastry(natal, cb);
      f.partner = { gender: opts.partner.gender === 'f' ? 'female' : 'male', natal: natalFacts(cb), synastry: { total: syn.total, spheres: syn.spheres, aspects: syn.aspects.slice(0, 16).map((x) => ({ a: x.a, b: x.b, type: x.type, orb: r1(x.orb) })) } };
    }
    return f;
  }

  async function ask(question, person, opts) {
    opts = opts || {};
    const cfg = root.NCONFIG || {};
    const f = await facts(person, opts);
    if (opts.extra) Object.assign(f, opts.extra); // доп. факты раздела (например, соляр на год)
    if (!cfg.aiEndpoint) return { answer: local(question, person, f), local: true };
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 45000);
      const r = await fetch(cfg.aiEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ question: String(question).slice(0, 600), lang: UI.lang(), facts: f, history: (opts.history || []).slice(-6), device: root.NStore.deviceId() }) });
      clearTimeout(tm);
      const j = await r.json().catch(() => ({}));
      if (r.status === 429) return { answer: j.message || UI.t('ai.limit', 'На сегодня вопросы закончились. Завтра лимит обновится.'), limit: true, left: 0 };
      if (!r.ok || !j.answer) throw new Error(j.error || 'ai error ' + r.status);
      return { answer: j.answer, left: j.left };
    } catch (e) {
      return { answer: local(question, person, f) + '\n\n' + UI.t('ai.offline', '(ИИ сейчас недоступен — ответ собран по расчётам приложения.)'), local: true };
    }
  }

  // ---------- встроенный помощник: понятный ответ из тех же расчётов ----------
  const KEYS = {
    love: /любов|отношен|свидан|парн|девушк|муж|жен|брак|свадьб|чувств|love|date|relationship|partner|marri/i,
    money: /деньг|финанс|покуп|зарплат|доход|продаж|цен|инвест|money|buy|salary|income|price|sale/i,
    career: /работ|карьер|начальн|собеседов|должност|бизнес|job|career|boss|interview|business|work/i,
    launch: /запуск|старт|выпуск|выложи|публик|открыт|релиз|проект|начать|launch|start|release|publish|open/i,
    talk: /переговор|договор|подпис|звон|письм|учёб|учеб|экзамен|выступ|negotiat|contract|sign|call|exam|study|speech/i,
    energy: /спорт|здоров|сил|энерги|трениров|sport|health|energy|workout|gym/i,
    rest: /отдых|отпуск|творч|вдохнов|хобби|rest|vacation|holiday|creative|hobby/i,
  };
  function local(q, person, f) {
    const TX = UI.TX(), L = UI.lang();
    const sph = Object.keys(KEYS).find((k) => KEYS[k].test(q)) || null;
    const fmt = (s) => { const [y, m, d] = s.split('-').map(Number); return TX.monthDay(d, m); };
    const lines = [];
    if (sph) {
      const b = f.best_days_45[sph];
      const lv = f.day.spheres[sph];
      lines.push(UI.t('loc.today', 'Сегодня для сферы «{s}»: {l}.', { s: TX.SPH[sph].name, l: TX.LEVEL[lv] }) + ' ' + TX.gend(TX.SPH[sph].tips[lv][0], person.gender) + '.');
      lines.push(UI.t('loc.best', 'Лучшие дни в ближайшие полтора месяца: {d}.', { d: b.best.map(fmt).join(', ') }));
      lines.push(UI.t('loc.avoid', 'Лучше избегать: {d}.', { d: b.avoid.map(fmt).join(', ') }));
    } else {
      const head = TX.headline({ spheres: Object.fromEntries(Object.entries(f.day.spheres).map(([k, v]) => [k, { level: v, score: v }])), overall: { level: f.day.overall } });
      lines.push(UI.t('loc.day', 'Коротко о сегодняшнем дне: {h}', { h: head }));
      const top = Object.entries(f.best_days_45).map(([k, v]) => `${TX.SPH[k].name.toLowerCase()} — ${fmt(v.best[0])}`).slice(0, 4);
      lines.push(UI.t('loc.next', 'Ближайшие сильные дни: {l}.', { l: top.join('; ') }));
    }
    const r = f.retrogrades.filter((x) => ['mercury', 'venus', 'mars'].includes(x.planet));
    if (r.length) lines.push(UI.t('loc.retro', 'Учитывай: {r}.', { r: r.map((x) => `${TX.RETRO[x.planet].name} ${fmt(x.from)}–${fmt(x.to)}`).join(', ') }));
    if (!sph) lines.push(UI.t('loc.hint', 'Спроси точнее — например, «когда лучше запускать проект?» или «как сегодня с деньгами?»'));
    return lines.join('\n');
  }

  // дела в вопросе — для наглядного графика под ответом
  const ACT_KEYS = {
    contract: /договор|подпис|сделк|contract|sign|deal/i,
    date: /свидан|date\b|dating/i,
    purchase: /покуп|купить|приобр|buy|purchase/i,
    interview: /собеседов|интервью|начальник|повышени|interview|boss|promotion/i,
    launch: /запуск|запуст|старт|выложи|публик|релиз|launch|release|publish/i,
    moneytalk: /зарплат|попросить денег|гонорар|прибавк|raise|fee|salary/i,
    study: /экзамен|учёб|учеб|курс|exam|study|course/i,
    sport: /спорт|трениров|зал\b|бег|sport|workout|gym|run/i,
    trip: /поездк|путешеств|отпуск|перелёт|перелет|trip|travel|flight|vacation/i,
  };
  /** Что спрашивают: сфера и/или дело (для графика под ответом). */
  function detect(q) {
    const act = Object.keys(ACT_KEYS).find((k) => ACT_KEYS[k].test(q)) || null;
    const sphere = Object.keys(KEYS).find((k) => KEYS[k].test(q)) || null;
    return { act, sphere };
  }

  root.NAI = { ask, facts, local, detect };
})(window);
