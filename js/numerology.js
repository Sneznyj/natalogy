/* Нумерология (без интерфейса). Пифагорейская система: числа сводятся к цифре, мастер-числа 11, 22, 33 сохраняются.
   Жизненный путь — по частям (день, месяц, год сводятся отдельно, потом сумма). Имя: кириллица по кругу А1…З9, И1…Р9, С1…Щ9, Ъ1…Я6,
   латиница A1…I9, J1…R9, S1…Z8; душа — гласные, личность — согласные. Квадрат Пифагора — четыре рабочих числа (метод Александрова).
   Личный год = день + месяц рождения + текущий год (с 1 января). */
(function (root) {
  'use strict';
  const MASTERS = [11, 22, 33];
  const digits = (n) => String(Math.abs(n)).split('').map(Number);
  const digitSum = (n) => digits(n).reduce((a, b) => a + b, 0);
  /** Свести к одной цифре, сохраняя мастер-числа из keep. { value, chain: [1998, 27, 9] } */
  function reduceChain(n, keep) {
    keep = keep || MASTERS;
    const chain = [n];
    while (n > 9 && !keep.includes(n)) { n = digitSum(n); chain.push(n); }
    return { value: n, chain };
  }
  const reduce = (n, keep) => reduceChain(n, keep).value;

  function lifePath(y, m, d) {
    const day = reduceChain(d, [11, 22]), month = reduceChain(m, [11]), year = reduceChain(digitSum(y), MASTERS);
    year.chain.unshift(y);
    const sum = day.value + month.value + year.value;
    const total = reduceChain(sum, MASTERS);
    return { value: total.value, day, month, year, sum, chain: total.chain };
  }
  const birthday = (d) => reduceChain(d, [11, 22]);
  function personalYear(m, d, year) {
    const sum = reduce(d, []) + reduce(m, []) + reduce(digitSum(year), []);
    return { value: reduce(sum, []), sum };
  }
  const personalMonth = (py, month) => reduce(py + reduce(month, []), []);
  const personalDay = (pm, day) => reduce(pm + reduce(day, []), []);
  const universalDay = (y, m, d) => reduce(reduce(d, []) + reduce(m, []) + reduce(digitSum(y), []), []);

  const RU = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  const EN = 'abcdefghijklmnopqrstuvwxyz';
  const VOWELS = 'аеёиоуыэюяaeiouy';
  function letterValue(ch) {
    const c = String(ch).toLowerCase();
    let i = RU.indexOf(c); if (i >= 0) return (i % 9) + 1;
    i = EN.indexOf(c); if (i >= 0) return (i % 9) + 1;
    return 0;
  }
  const isVowel = (ch) => VOWELS.includes(String(ch).toLowerCase());
  /** Числа имени: судьбы/выражения (все буквы), души (гласные), личности (согласные). null — букв нет. */
  function nameNumbers(name) {
    const words = String(name || '').trim().split(/[\s\-–—]+/).filter(Boolean).map((w) => {
      const letters = Array.from(w).filter((c) => letterValue(c)).map((c) => ({ ch: c, v: letterValue(c), vowel: isVowel(c) }));
      return { word: w, letters, sum: letters.reduce((a, l) => a + l.v, 0) };
    }).filter((w) => w.letters.length);
    if (!words.length) return null;
    const all = words.flatMap((w) => w.letters);
    const sumOf = (ls) => ls.reduce((a, l) => a + l.v, 0);
    const ex = sumOf(all), so = sumOf(all.filter((l) => l.vowel)), pe = sumOf(all.filter((l) => !l.vowel));
    return {
      words,
      expression: Object.assign(reduceChain(ex), { sum: ex }),
      soul: so ? Object.assign(reduceChain(so), { sum: so }) : null,
      personality: pe ? Object.assign(reduceChain(pe), { sum: pe }) : null,
    };
  }

  const LINES = { goal: [1, 4, 7], family: [2, 5, 8], habits: [3, 6, 9], self: [1, 2, 3], money: [4, 5, 6], talent: [7, 8, 9], spirit: [1, 5, 9], temper: [3, 5, 7] };
  function pythagoras(y, m, d) {
    const pad = (n) => String(n).padStart(2, '0');
    const date = pad(d) + pad(m) + String(y);
    const dd = date.split('').map(Number);
    const w1 = dd.reduce((a, b) => a + b, 0);
    const w2 = digitSum(w1);
    const first = +pad(d)[0] || +pad(d)[1];
    const raw3 = w1 - 2 * first, w3 = Math.abs(raw3), w4 = digitSum(w3);
    const all = dd.concat(digits(w1), digits(w2), digits(w3), digits(w4)).filter((x) => x > 0);
    const counts = {}; for (let i = 1; i <= 9; i++) counts[i] = 0;
    for (const x of all) counts[x]++;
    const lines = {}; for (const [k, cells] of Object.entries(LINES)) lines[k] = cells.reduce((a, c) => a + counts[c], 0);
    return { work: [w1, w2, w3, w4], negative3: raw3 < 0, first, counts, lines, total: all.length };
  }
  /** Совместимость по числам пути: 1–10 (одно число — 8, «друзья» — 9, напряжённые пары — 4–5). */
  const PAIR = { '1-1': 6, '1-2': 7, '1-3': 9, '1-4': 5, '1-5': 9, '1-6': 6, '1-7': 7, '1-8': 6, '1-9': 8, '2-2': 8, '2-3': 6, '2-4': 9, '2-5': 4, '2-6': 9, '2-7': 6, '2-8': 9, '2-9': 7, '3-3': 7, '3-4': 4, '3-5': 9, '3-6': 9, '3-7': 5, '3-8': 6, '3-9': 9, '4-4': 7, '4-5': 4, '4-6': 8, '4-7': 8, '4-8': 9, '4-9': 5, '5-5': 7, '5-6': 5, '5-7': 9, '5-8': 6, '5-9': 7, '6-6': 8, '6-7': 5, '6-8': 8, '6-9': 9, '7-7': 7, '7-8': 5, '7-9': 8, '8-8': 6, '8-9': 6, '9-9': 7 };
  const base = (n) => (n > 9 ? reduce(n, []) : n);
  function pairScore(a, b) { const x = base(a), y = base(b); return PAIR[Math.min(x, y) + '-' + Math.max(x, y)] || 6; }

  root.NNum = { MASTERS, digits, digitSum, reduce, reduceChain, lifePath, birthday, personalYear, personalMonth, personalDay, universalDay, letterValue, isVowel, nameNumbers, pythagoras, LINES, pairScore, base };
})(typeof window !== 'undefined' ? window : globalThis);
