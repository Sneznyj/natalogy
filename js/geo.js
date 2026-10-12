/* Города: встроенный список (работает без сети) + поиск Open-Meteo (бесплатно, без ключа).
   Часовой пояс — IANA: смещение на дату рождения считает Intl (с учётом летнего времени прошлых лет). */
(function (root) {
  'use strict';
  // [рус, англ, страна рус, страна англ, широта, долгота, пояс]
  const RAW = [
    ['Москва', 'Moscow', 'Россия', 'Russia', 55.7558, 37.6173, 'Europe/Moscow'], ['Санкт-Петербург', 'Saint Petersburg', 'Россия', 'Russia', 59.9386, 30.3141, 'Europe/Moscow'],
    ['Новосибирск', 'Novosibirsk', 'Россия', 'Russia', 55.0302, 82.9204, 'Asia/Novosibirsk'], ['Екатеринбург', 'Yekaterinburg', 'Россия', 'Russia', 56.8389, 60.6057, 'Asia/Yekaterinburg'],
    ['Казань', 'Kazan', 'Россия', 'Russia', 55.7963, 49.1088, 'Europe/Moscow'], ['Нижний Новгород', 'Nizhny Novgorod', 'Россия', 'Russia', 56.3269, 44.0059, 'Europe/Moscow'],
    ['Челябинск', 'Chelyabinsk', 'Россия', 'Russia', 55.1644, 61.4368, 'Asia/Yekaterinburg'], ['Самара', 'Samara', 'Россия', 'Russia', 53.1959, 50.1002, 'Europe/Samara'],
    ['Омск', 'Omsk', 'Россия', 'Russia', 54.9885, 73.3242, 'Asia/Omsk'], ['Ростов-на-Дону', 'Rostov-on-Don', 'Россия', 'Russia', 47.2357, 39.7015, 'Europe/Moscow'],
    ['Уфа', 'Ufa', 'Россия', 'Russia', 54.7388, 55.9721, 'Asia/Yekaterinburg'], ['Красноярск', 'Krasnoyarsk', 'Россия', 'Russia', 56.0153, 92.8932, 'Asia/Krasnoyarsk'],
    ['Воронеж', 'Voronezh', 'Россия', 'Russia', 51.6608, 39.2003, 'Europe/Moscow'], ['Пермь', 'Perm', 'Россия', 'Russia', 58.0105, 56.2502, 'Asia/Yekaterinburg'],
    ['Волгоград', 'Volgograd', 'Россия', 'Russia', 48.708, 44.5133, 'Europe/Volgograd'], ['Краснодар', 'Krasnodar', 'Россия', 'Russia', 45.0355, 38.9753, 'Europe/Moscow'],
    ['Саратов', 'Saratov', 'Россия', 'Russia', 51.5336, 46.0343, 'Europe/Saratov'], ['Тюмень', 'Tyumen', 'Россия', 'Russia', 57.153, 65.5343, 'Asia/Yekaterinburg'],
    ['Иркутск', 'Irkutsk', 'Россия', 'Russia', 52.2896, 104.2806, 'Asia/Irkutsk'], ['Владивосток', 'Vladivostok', 'Россия', 'Russia', 43.1155, 131.8855, 'Asia/Vladivostok'],
    ['Хабаровск', 'Khabarovsk', 'Россия', 'Russia', 48.4802, 135.0719, 'Asia/Vladivostok'], ['Ярославль', 'Yaroslavl', 'Россия', 'Russia', 57.6261, 39.8845, 'Europe/Moscow'],
    ['Томск', 'Tomsk', 'Россия', 'Russia', 56.4846, 84.9476, 'Asia/Tomsk'], ['Калининград', 'Kaliningrad', 'Россия', 'Russia', 54.7104, 20.4522, 'Europe/Kaliningrad'],
    ['Тула', 'Tula', 'Россия', 'Russia', 54.193, 37.6178, 'Europe/Moscow'], ['Сочи', 'Sochi', 'Россия', 'Russia', 43.5855, 39.7231, 'Europe/Moscow'],
    ['Псков', 'Pskov', 'Россия', 'Russia', 57.8136, 28.3496, 'Europe/Moscow'], ['Великий Новгород', 'Veliky Novgorod', 'Россия', 'Russia', 58.5228, 31.2698, 'Europe/Moscow'],
    ['Мурманск', 'Murmansk', 'Россия', 'Russia', 68.9585, 33.0827, 'Europe/Moscow'], ['Архангельск', 'Arkhangelsk', 'Россия', 'Russia', 64.5393, 40.5187, 'Europe/Moscow'],
    ['Якутск', 'Yakutsk', 'Россия', 'Russia', 62.0355, 129.6755, 'Asia/Yakutsk'], ['Симферополь', 'Simferopol', 'Крым', 'Crimea', 44.9521, 34.1024, 'Europe/Simferopol'],
    ['Минск', 'Minsk', 'Беларусь', 'Belarus', 53.9006, 27.559, 'Europe/Minsk'], ['Гомель', 'Gomel', 'Беларусь', 'Belarus', 52.4345, 30.9754, 'Europe/Minsk'],
    ['Брест', 'Brest', 'Беларусь', 'Belarus', 52.0976, 23.7341, 'Europe/Minsk'], ['Гродно', 'Grodno', 'Беларусь', 'Belarus', 53.6694, 23.8131, 'Europe/Minsk'],
    ['Витебск', 'Vitebsk', 'Беларусь', 'Belarus', 55.1904, 30.2049, 'Europe/Minsk'], ['Могилёв', 'Mogilev', 'Беларусь', 'Belarus', 53.9168, 30.3449, 'Europe/Minsk'],
    ['Ганцевичи', 'Hantsavichy', 'Беларусь', 'Belarus', 52.757, 26.433, 'Europe/Minsk'], ['Пинск', 'Pinsk', 'Беларусь', 'Belarus', 52.1229, 26.0951, 'Europe/Minsk'],
    ['Киев', 'Kyiv', 'Украина', 'Ukraine', 50.4501, 30.5234, 'Europe/Kiev'], ['Харьков', 'Kharkiv', 'Украина', 'Ukraine', 49.9935, 36.2304, 'Europe/Kiev'],
    ['Одесса', 'Odesa', 'Украина', 'Ukraine', 46.4825, 30.7233, 'Europe/Kiev'], ['Днепр', 'Dnipro', 'Украина', 'Ukraine', 48.4647, 35.0462, 'Europe/Kiev'],
    ['Львов', 'Lviv', 'Украина', 'Ukraine', 49.8397, 24.0297, 'Europe/Kiev'],
    ['Алматы', 'Almaty', 'Казахстан', 'Kazakhstan', 43.2389, 76.8897, 'Asia/Almaty'], ['Астана', 'Astana', 'Казахстан', 'Kazakhstan', 51.1694, 71.4491, 'Asia/Almaty'],
    ['Ташкент', 'Tashkent', 'Узбекистан', 'Uzbekistan', 41.2995, 69.2401, 'Asia/Tashkent'], ['Бишкек', 'Bishkek', 'Киргизия', 'Kyrgyzstan', 42.8746, 74.5698, 'Asia/Bishkek'],
    ['Душанбе', 'Dushanbe', 'Таджикистан', 'Tajikistan', 38.5598, 68.787, 'Asia/Dushanbe'], ['Баку', 'Baku', 'Азербайджан', 'Azerbaijan', 40.4093, 49.8671, 'Asia/Baku'],
    ['Ереван', 'Yerevan', 'Армения', 'Armenia', 40.1792, 44.4991, 'Asia/Yerevan'], ['Тбилиси', 'Tbilisi', 'Грузия', 'Georgia', 41.7151, 44.8271, 'Asia/Tbilisi'],
    ['Батуми', 'Batumi', 'Грузия', 'Georgia', 41.6168, 41.6367, 'Asia/Tbilisi'], ['Кутаиси', 'Kutaisi', 'Грузия', 'Georgia', 42.2679, 42.6946, 'Asia/Tbilisi'],
    ['Кишинёв', 'Chisinau', 'Молдова', 'Moldova', 47.0105, 28.8638, 'Europe/Chisinau'], ['Рига', 'Riga', 'Латвия', 'Latvia', 56.9496, 24.1052, 'Europe/Riga'],
    ['Вильнюс', 'Vilnius', 'Литва', 'Lithuania', 54.6872, 25.2797, 'Europe/Vilnius'], ['Таллин', 'Tallinn', 'Эстония', 'Estonia', 59.437, 24.7536, 'Europe/Tallinn'],
    ['Стамбул', 'Istanbul', 'Турция', 'Turkey', 41.0082, 28.9784, 'Europe/Istanbul'], ['Анталья', 'Antalya', 'Турция', 'Turkey', 36.8969, 30.7133, 'Europe/Istanbul'],
    ['Берлин', 'Berlin', 'Германия', 'Germany', 52.52, 13.405, 'Europe/Berlin'], ['Мюнхен', 'Munich', 'Германия', 'Germany', 48.1351, 11.582, 'Europe/Berlin'],
    ['Прага', 'Prague', 'Чехия', 'Czechia', 50.0755, 14.4378, 'Europe/Prague'], ['Варшава', 'Warsaw', 'Польша', 'Poland', 52.2297, 21.0122, 'Europe/Warsaw'],
    ['Белград', 'Belgrade', 'Сербия', 'Serbia', 44.7866, 20.4489, 'Europe/Belgrade'], ['Будапешт', 'Budapest', 'Венгрия', 'Hungary', 47.4979, 19.0402, 'Europe/Budapest'],
    ['Вена', 'Vienna', 'Австрия', 'Austria', 48.2082, 16.3738, 'Europe/Vienna'], ['Лондон', 'London', 'Великобритания', 'United Kingdom', 51.5074, -0.1278, 'Europe/London'],
    ['Париж', 'Paris', 'Франция', 'France', 48.8566, 2.3522, 'Europe/Paris'], ['Рим', 'Rome', 'Италия', 'Italy', 41.9028, 12.4964, 'Europe/Rome'],
    ['Милан', 'Milan', 'Италия', 'Italy', 45.4642, 9.19, 'Europe/Rome'], ['Мадрид', 'Madrid', 'Испания', 'Spain', 40.4168, -3.7038, 'Europe/Madrid'],
    ['Барселона', 'Barcelona', 'Испания', 'Spain', 41.3851, 2.1734, 'Europe/Madrid'], ['Лиссабон', 'Lisbon', 'Португалия', 'Portugal', 38.7223, -9.1393, 'Europe/Lisbon'],
    ['Хельсинки', 'Helsinki', 'Финляндия', 'Finland', 60.1699, 24.9384, 'Europe/Helsinki'], ['Стокгольм', 'Stockholm', 'Швеция', 'Sweden', 59.3293, 18.0686, 'Europe/Stockholm'],
    ['Амстердам', 'Amsterdam', 'Нидерланды', 'Netherlands', 52.3676, 4.9041, 'Europe/Amsterdam'], ['Цюрих', 'Zurich', 'Швейцария', 'Switzerland', 47.3769, 8.5417, 'Europe/Zurich'],
    ['Афины', 'Athens', 'Греция', 'Greece', 37.9838, 23.7275, 'Europe/Athens'], ['Лимассол', 'Limassol', 'Кипр', 'Cyprus', 34.7071, 33.0226, 'Asia/Nicosia'],
    ['Тель-Авив', 'Tel Aviv', 'Израиль', 'Israel', 32.0853, 34.7818, 'Asia/Jerusalem'], ['Дубай', 'Dubai', 'ОАЭ', 'UAE', 25.2048, 55.2708, 'Asia/Dubai'],
    ['Бангкок', 'Bangkok', 'Таиланд', 'Thailand', 13.7563, 100.5018, 'Asia/Bangkok'], ['Пхукет', 'Phuket', 'Таиланд', 'Thailand', 7.8804, 98.3923, 'Asia/Bangkok'],
    ['Бали (Денпасар)', 'Bali (Denpasar)', 'Индонезия', 'Indonesia', -8.6705, 115.2126, 'Asia/Makassar'], ['Пекин', 'Beijing', 'Китай', 'China', 39.9042, 116.4074, 'Asia/Shanghai'],
    ['Шанхай', 'Shanghai', 'Китай', 'China', 31.2304, 121.4737, 'Asia/Shanghai'], ['Токио', 'Tokyo', 'Япония', 'Japan', 35.6762, 139.6503, 'Asia/Tokyo'],
    ['Сеул', 'Seoul', 'Корея', 'South Korea', 37.5665, 126.978, 'Asia/Seoul'], ['Сингапур', 'Singapore', 'Сингапур', 'Singapore', 1.3521, 103.8198, 'Asia/Singapore'],
    ['Дели', 'Delhi', 'Индия', 'India', 28.6139, 77.209, 'Asia/Kolkata'], ['Мумбаи', 'Mumbai', 'Индия', 'India', 19.076, 72.8777, 'Asia/Kolkata'],
    ['Гоа', 'Goa (Panaji)', 'Индия', 'India', 15.4909, 73.8278, 'Asia/Kolkata'], ['Каир', 'Cairo', 'Египет', 'Egypt', 30.0444, 31.2357, 'Africa/Cairo'],
    ['Нью-Йорк', 'New York', 'США', 'USA', 40.7128, -74.006, 'America/New_York'], ['Майами', 'Miami', 'США', 'USA', 25.7617, -80.1918, 'America/New_York'],
    ['Чикаго', 'Chicago', 'США', 'USA', 41.8781, -87.6298, 'America/Chicago'], ['Лос-Анджелес', 'Los Angeles', 'США', 'USA', 34.0522, -118.2437, 'America/Los_Angeles'],
    ['Сан-Франциско', 'San Francisco', 'США', 'USA', 37.7749, -122.4194, 'America/Los_Angeles'], ['Сиэтл', 'Seattle', 'США', 'USA', 47.6062, -122.3321, 'America/Los_Angeles'],
    ['Хьюстон', 'Houston', 'США', 'USA', 29.7604, -95.3698, 'America/Chicago'], ['Денвер', 'Denver', 'США', 'USA', 39.7392, -104.9903, 'America/Denver'],
    ['Остин', 'Austin', 'США', 'USA', 30.2672, -97.7431, 'America/Chicago'], ['Бостон', 'Boston', 'США', 'USA', 42.3601, -71.0589, 'America/New_York'],
    ['Торонто', 'Toronto', 'Канада', 'Canada', 43.6532, -79.3832, 'America/Toronto'], ['Ванкувер', 'Vancouver', 'Канада', 'Canada', 49.2827, -123.1207, 'America/Vancouver'],
    ['Мехико', 'Mexico City', 'Мексика', 'Mexico', 19.4326, -99.1332, 'America/Mexico_City'], ['Сан-Паулу', 'São Paulo', 'Бразилия', 'Brazil', -23.5505, -46.6333, 'America/Sao_Paulo'],
    ['Буэнос-Айрес', 'Buenos Aires', 'Аргентина', 'Argentina', -34.6037, -58.3816, 'America/Argentina/Buenos_Aires'], ['Сидней', 'Sydney', 'Австралия', 'Australia', -33.8688, 151.2093, 'Australia/Sydney'],
    ['Мельбурн', 'Melbourne', 'Австралия', 'Australia', -37.8136, 144.9631, 'Australia/Melbourne'], ['Окленд', 'Auckland', 'Новая Зеландия', 'New Zealand', -36.8485, 174.7633, 'Pacific/Auckland'],
  ];
  const CITIES = RAW.map(([ru, en, cru, cen, lat, lon, tz]) => ({ name: ru, nameEn: en, country: cru, countryEn: cen, lat, lon, tz }));
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[-‐]/g, ' ').trim();
  const cache = {};
  const label = (c, lang) => (lang === 'en' ? `${c.nameEn || c.name}, ${c.countryEn || c.country}` : `${c.name}, ${c.country}`);
  async function search(q, lang) {
    const nq = norm(q);
    if (!nq) return [];
    const local = CITIES.filter((c) => norm(c.name).startsWith(nq) || norm(c.nameEn).startsWith(nq)).slice(0, 6);
    let remote = [];
    if (nq.length >= 2 && root.NCONFIG && root.NCONFIG.geocoder) {
      const key = lang + ':' + nq;
      try {
        if (!cache[key]) {
          const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 4500);
          const r = await fetch(`${root.NCONFIG.geocoder}?count=8&format=json&language=${lang === 'en' ? 'en' : 'ru'}&name=${encodeURIComponent(q.trim())}`, { signal: ctl.signal });
          clearTimeout(tm);
          const j = await r.json();
          cache[key] = (j.results || []).filter((x) => x.timezone).map((x) => ({ name: x.name, nameEn: x.name, country: [x.admin1, x.country].filter(Boolean).join(', '), countryEn: [x.admin1, x.country].filter(Boolean).join(', '), lat: x.latitude, lon: x.longitude, tz: x.timezone }));
        }
        remote = cache[key];
      } catch (e) { remote = []; }
    }
    const seen = new Set(local.map((c) => Math.round(c.lat * 10) + ':' + Math.round(c.lon * 10)));
    return local.concat(remote.filter((c) => !seen.has(Math.round(c.lat * 10) + ':' + Math.round(c.lon * 10)))).slice(0, 10);
  }
  function browserTz() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } }
  /** Город по умолчанию для «где я сейчас»: по часовому поясу браузера. */
  function guessHere() { const tz = browserTz(); return CITIES.find((c) => c.tz === tz) || { name: tz, nameEn: tz, country: '', countryEn: '', lat: 0, lon: 0, tz, guessed: true }; }
  const fmtCoord = (lat, lon, lang) => lang === 'en' ? `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}` : `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'с. ш.' : 'ю. ш.'}, ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'в. д.' : 'з. д.'}`;
  root.NGeo = { CITIES, search, label, browserTz, guessHere, fmtCoord };
})(window);
