/* Матрица судьбы (метод Н. Ладини) и чакры — расчёт без интерфейса (14.10, просьба Алины).
   Числа сводятся к арканам 1–22 (больше 22 — сумма цифр). A — день, B — месяц, C — год (сумма цифр), D = A+B+C, E = A+B+C+D (центр).
   Родовой квадрат: F = A+B (лево-верх), G = B+C (право-верх), H = D+A (лево-низ), I = C+D (право-низ).
   К центру: по линии A — O=A+S, S=A+E, W=S+E; по линии B — P=B+T, T=B+E, X=T+E; по линии C — Q=N+C, N=C+E; по линии D — R=J+D, J=D+E.
   Линия любви и денег: L = J+N (пересечение), M = L+N (точка денег), K = J+L (точка любви). Кармический хвост — D, R, J.
   Предназначения: Небо B+D, Земля A+C, личное = Небо+Земля; мужское F+I, женское G+H, социальное = М+Ж; духовное = личное+социальное; планетарное = социальное+духовное.
   Карта здоровья (чакры): физика A,O,S,W,E,N,C; энергия B,P,T,X,E,J,D; эмоции — суммы; «итого» — суммы столбцов.
   Прогноз по возрастам: обход по кругу A(0)→F(10)→B(20)→G(30)→C(40)→I(50)→D(60)→H(70)→A(80), на каждом отрезке 7 точек через 1,25 года.
   Совместимость: A…I пары = суммы A…I обоих, остальное — по тем же формулам. Формулы сверены с открытыми калькуляторами Ладини. */
(function (root) {
  'use strict';
  const red = (n) => { n = Math.abs(Math.round(n)); while (n > 22) n = String(n).split('').reduce((a, d) => a + +d, 0); return n === 0 ? 22 : n; };
  const digits = (n) => String(n).split('').reduce((a, d) => a + +d, 0);

  function derive(a, b, c, base) {
    const p = Object.assign({ a, b, c }, base || {});
    p.d = p.d != null ? p.d : red(a + b + c);
    p.e = p.e != null ? p.e : red(a + b + c + p.d);
    p.f = p.f != null ? p.f : red(a + b);
    p.g = p.g != null ? p.g : red(b + c);
    p.h = p.h != null ? p.h : red(p.d + a);
    p.i = p.i != null ? p.i : red(c + p.d);
    p.j = red(p.d + p.e); p.n = red(c + p.e);
    p.l = red(p.j + p.n); p.m = red(p.l + p.n); p.k = red(p.j + p.l);
    p.q = red(p.n + c); p.r = red(p.j + p.d);
    p.s = red(a + p.e); p.t = red(b + p.e); p.o = red(a + p.s); p.pp = red(b + p.t);
    p.u = red(p.f + p.g + p.h + p.i); p.v = red(p.e + p.u); p.w = red(p.s + p.e); p.x = red(p.t + p.e);
    p.f2 = red(p.f + p.u); p.f1 = red(p.f + p.f2); p.g2 = red(p.g + p.u); p.g1 = red(p.g + p.g2);
    p.i2 = red(p.i + p.u); p.i1 = red(p.i + p.i2); p.h2 = red(p.h + p.u); p.h1 = red(p.h + p.h2);
    return p;
  }
  function purposes(p) {
    const sky = red(p.b + p.d), earth = red(p.a + p.c), personal = red(sky + earth);
    const male = red(p.f + p.i), female = red(p.g + p.h), social = red(male + female);
    const spiritual = red(personal + social), planetary = red(social + spiritual);
    return { sky, earth, personal, male, female, social, spiritual, planetary };
  }
  // карта здоровья: 7 чакр сверху вниз
  const CHAKRAS = ['sahasrara', 'ajna', 'vishuddha', 'anahata', 'manipura', 'svadhisthana', 'muladhara'];
  function chakras(p) {
    const phys = [p.a, p.o, p.s, p.w, p.e, p.n, p.c], en = [p.b, p.pp, p.t, p.x, p.e, p.j, p.d];
    const rows = CHAKRAS.map((id, i) => ({ id, phys: phys[i], energy: en[i], emo: red(phys[i] + en[i]) }));
    const sum = (k) => red(rows.reduce((a, r) => a + r[k], 0));
    return { rows, total: { phys: sum('phys'), energy: sum('energy'), emo: sum('emo') } };
  }
  /** Точки возраста по кругу: [{ age, n }] от 0 до 80 через 1,25 года. */
  function ages(p) {
    const ring = [['a', 0], ['f', 10], ['b', 20], ['g', 30], ['c', 40], ['i', 50], ['d', 60], ['h', 70], ['a', 80]];
    const out = [];
    for (let k = 0; k < 8; k++) {
      const X = p[ring[k][0]], Y = p[ring[k + 1][0]], a0 = ring[k][1];
      const mid = red(X + Y), q1 = red(X + mid), q0 = red(X + q1), q2 = red(mid + q1), q3 = red(mid + Y), q25 = red(mid + q3), q4 = red(q3 + Y);
      // порядок по возрасту: X, X+1,25, +2,5, +3,75, середина +5, +6,25, +7,5, +8,75
      [X, q0, q1, q2, mid, q25, q3, q4].forEach((n, i) => out.push({ age: a0 + i * 1.25, n }));
    }
    out.push({ age: 80, n: p.a });
    return out;
  }
  function calc(y, mo, d) {
    const a = red(d), b = red(mo), c = red(digits(y));
    const p = derive(a, b, c);
    return { p, purpose: purposes(p), chakra: chakras(p), ages: ages(p), tail: [p.d, p.r, p.j], date: { y, mo, d } };
  }
  /** Совместимость двух матриц. */
  function compat(m1, m2) {
    const s = (k) => red(m1.p[k] + m2.p[k]);
    const p = derive(s('a'), s('b'), s('c'), { d: s('d'), e: s('e'), f: s('f'), g: s('g'), h: s('h'), i: s('i') });
    return { p, purpose: purposes(p), tail: [p.d, p.r, p.j] };
  }
  /** Где человек сейчас на круге возрастов: текущая точка и следующие. */
  function ageAt(m, age) {
    const list = m.ages;
    let i = list.findIndex((x, k) => age >= x.age && (k === list.length - 1 || age < list[k + 1].age));
    if (age >= 80) { const cyc = age - 80; i = list.findIndex((x, k) => cyc >= x.age && (k === list.length - 1 || cyc < list[k + 1].age)); }
    return { idx: Math.max(0, i), list };
  }
  // семилетние периоды чакр: 0–7 Муладхара … 42–49 Сахасрара, дальше новый круг
  const PERIOD_ORDER = ['muladhara', 'svadhisthana', 'manipura', 'anahata', 'vishuddha', 'ajna', 'sahasrara'];
  function chakraPeriods(age) {
    const out = [];
    for (let k = 0; k < 12; k++) { const from = k * 7, to = from + 7; out.push({ id: PERIOD_ORDER[k % 7], from, to, cycle: Math.floor(k / 7) + 1, current: age >= from && age < to }); }
    return out;
  }
  root.NMatrix = { red, calc, compat, ageAt, chakraPeriods, CHAKRAS, PERIOD_ORDER };
})(typeof window !== 'undefined' ? window : globalThis);
