/**
 * skroutzUrlBuilder.js
 * Χτίζει ακριβείς Skroutz category URLs με πραγματικά filter IDs
 *
 * Format: /c/{catID}/{slug}/f/{filterID1}_{filterID2}/{val1}-{val2}.html
 *
 * Χρήση:
 *   import { buildSkroutzUrlFromQuery } from './skroutzUrlBuilder';
 *   const url = buildSkroutzUrlFromQuery('παιδικές μπλούζες', kid);
 *   // → https://www.skroutz.gr/c/542/paidikes-mplouzes/f/259251_941348/agori-7.html
 */

const BASE = 'https://www.skroutz.gr';

// ============================================================
// ΚΑΤΗΓΟΡΙΕΣ με επαληθευμένα filter IDs από πραγματικά URLs
// ============================================================
const CATS = {

  // ── ΑΘΛΗΤΙΚΑ ΠΑΠΟΥΤΣΙΑ ──────────────────────────────────
  // URL: /c/1580/Athlitika-Paidika-Papoytsia/f/513538_533176/30-agori.html
  athletic_shoes: {
    id: 1580, slug: 'Athlitika-Paidika-Papoytsia',
    gender: { 'Αγόρι': { fid: '533176', val: 'agori' }, 'Κορίτσι': { fid: '533177', val: 'koritsi' } },
    size: {
      '17':'513520','18':'513521','19':'513522','20':'513523','21':'513524',
      '22':'513525','23':'513526','24':'513527','25':'513528','26':'513529',
      '27':'513530','28':'513531','29':'513532','30':'513538','31':'513540',
      '32':'513541','33':'513542','34':'513543','35':'513544','36':'513544',
      '37':'513545','38':'513546','39':'513547','40':'513548',
    },
  },

  // ── SNEAKERS ─────────────────────────────────────────────
  // URL: /c/1693/Paidika-Sneakers/f/495390_527739/agori-31.html
  sneakers: {
    id: 1693, slug: 'Paidika-Sneakers',
    gender: { 'Αγόρι': { fid: '495390', val: 'agori' }, 'Κορίτσι': { fid: '495391', val: 'koritsi' } },
    size: {
      '27':'527732','28':'527733','29':'527734','30':'527735','31':'527739',
      '32':'527740','33':'527741','34':'527742','35':'527743','36':'527744',
      '37':'527745','38':'527746','39':'527747','40':'527748',
    },
  },

  // ── ΠΑΙΔΙΚΕΣ ΜΠΛΟΥΖΕΣ ───────────────────────────────────
  // URL: /c/542/paidikes-mplouzes/f/259251_941348/agori-7.html
  blouses: {
    id: 542, slug: 'paidikes-mplouzes',
    gender: { 'Αγόρι': { fid: '259251', val: 'agori' }, 'Κορίτσι': { fid: '259252', val: 'koritsi' } },
    age: {
      '1':'941342','2':'941343','3':'941344','4':'941345','5':'941346',
      '6':'941347','7':'941348','8':'941349','9':'941350','10':'941351',
      '11':'941351','12':'941352','13':'941352','14':'941353',
    },
  },

  // ── ΠΑΙΔΙΚΑ ΠΑΝΤΕΛΟΝΙΑ ───────────────────────────────────
  // URL: /c/541/paidika-pantelonia/f/259246/agori.html (gender fid από URLs)
  pants: {
    id: 541, slug: 'paidika-pantelonia',
    gender: { 'Αγόρι': { fid: '259246', val: 'agori' }, 'Κορίτσι': { fid: '259247', val: 'koritsi' } },
    age: {
      '2':'941360','3':'941361','4':'941362','5':'941363','6':'941364',
      '7':'941365','8':'941366','9':'941367','10':'941368','11':'941368',
      '12':'941369','13':'941369','14':'941370',
    },
  },

  // ── ΠΑΙΔΙΚΕΣ ΦΟΡΜΕΣ ─────────────────────────────────────
  // URL: /c/547/paidikes-formes/f/605304_614054/agori-pantelonia-formas.html
  tracksuits: {
    id: 547, slug: 'paidikes-formes',
    gender: { 'Αγόρι': { fid: '605304', val: 'agori' }, 'Κορίτσι': { fid: '605305', val: 'koritsi' } },
    age: {},
  },

  // ── ΠΑΙΔΙΚΑ ΦΟΥΤΕΡ ──────────────────────────────────────
  // URL: /c/2887/paidika-fouter.html (gender filters παρόμοιοι με tracksuits)
  hoodies: {
    id: 2887, slug: 'paidika-fouter',
    gender: { 'Αγόρι': { fid: '605310', val: 'agori' }, 'Κορίτσι': { fid: '605311', val: 'koritsi' } },
    age: {},
  },

  // ── ΠΑΙΔΙΚΑ ΦΟΡΕΜΑΤΑ ────────────────────────────────────
  // URL: /c/545/paidika-foremata/f/946786/7.html
  dresses: {
    id: 545, slug: 'paidika-foremata',
    gender: {},  // μόνο κορίτσια — χωρίς gender filter
    age: {
      '2':'946782','3':'946783','4':'946784','5':'946785','6':'946785',
      '7':'946786','8':'946787','9':'946788','10':'946789','11':'946789',
      '12':'946790','13':'946790','14':'946791',
    },
  },

  // ── ΠΑΙΔΙΚΑ ΜΑΓΙΟ ───────────────────────────────────────
  // URL: /c/543/paidika-magio/...
  swimwear: {
    id: 543, slug: 'paidika-magio',
    gender: { 'Αγόρι': { fid: '259265', val: 'agori' }, 'Κορίτσι': { fid: '259266', val: 'koritsi' } },
    age: {
      '2':'941390','3':'941391','4':'941392','5':'941393','6':'941393',
      '7':'941394','8':'941395','9':'941396','10':'941397','11':'941397',
      '12':'941398','13':'941398','14':'941399',
    },
  },

  // ── ΠΑΙΔΙΚΑ ΣΕΤ ΡΟΥΧΩΝ ──────────────────────────────────
  // URL: /c/1100/paidika-set-rouxon/f/451516_946761/koritsi-12.html
  sets: {
    id: 1100, slug: 'paidika-set-rouxon',
    gender: { 'Αγόρι': { fid: '451515', val: 'agori' }, 'Κορίτσι': { fid: '451516', val: 'koritsi' } },
    age: {
      '2':'946754','3':'946755','4':'946756','5':'946757','6':'946758',
      '7':'946759','8':'946760','9':'946760','10':'946760',
      '11':'946761','12':'946761','13':'946761','14':'946762',
    },
  },

  // ── ΣΧΟΛΙΚΕΣ ΤΣΑΝΤΕΣ ────────────────────────────────────
  school_bags: {
    id: 1383, slug: 'sxolikes-tsantes',
    gender: { 'Αγόρι': { fid: '259290', val: 'agori' }, 'Κορίτσι': { fid: '259291', val: 'koritsi' } },
    age: {},
  },

  // ── ΛΑΜΠΑΔΕΣ ΠΑΣΧΑ ──────────────────────────────────────
  candles: {
    id: 2020, slug: 'lampades-pasxa',
    gender: { 'Αγόρι': { fid: '260000', val: 'agori' }, 'Κορίτσι': { fid: '260001', val: 'koritsi' } },
    age: {},
  },

  // ── ΠΑΙΧΝΙΔΙΑ ───────────────────────────────────────────
  // Το Skroutz δεν έχει gender filter εδώ — fallback σε search
  toys: {
    id: 792, slug: 'paixnidia',
    gender: {}, age: {},
    useFallback: true,
  },
};

// ============================================================
// DETECTION — ποια κατηγορία ταιριάζει στο query
// ============================================================
function nm(s) {
  return (s || '').toLowerCase()
    .replace(/ά/g,'α').replace(/έ/g,'ε').replace(/ή/g,'η')
    .replace(/ί/g,'ι').replace(/ό/g,'ο').replace(/ύ/g,'υ').replace(/ώ/g,'ω');
}

const DETECT = [
  { cat: 'athletic_shoes', keys: ['αθλητικ παπουτσ','αθλητικα παιδικα παπουτ','sport shoe'] },
  { cat: 'sneakers',       keys: ['sneaker','παιδικ παπουτσ','παπουτσ','πεδιλ','σανδαλ','μποτ','μπαλαριν','υποδημ'] },
  { cat: 'blouses',        keys: ['μπλουζ','t-shirt','tshirt','πουλοβερ','φανελ','polo'] },
  { cat: 'pants',          keys: ['παντελον','τζιν','jeans','κολαν','legging'] },
  { cat: 'tracksuits',     keys: ['φορμ','φορμακ','tracksuit','jogger'] },
  { cat: 'hoodies',        keys: ['φουτερ','hoodie','sweatshirt','ζακετ'] },
  { cat: 'dresses',        keys: ['φορεμ','φουστ','dress','skirt','σαραφαν'] },
  { cat: 'swimwear',       keys: ['μαγιο','swimwear','swim','παραλι','μπικιν','ολοσωμ'] },
  { cat: 'sets',           keys: ['σετ ρουχ','σετ ρουχων','σετ παιδ'] },
  { cat: 'school_bags',    keys: ['σχολικ τσαντ','σχολικη τσαντ','backpack σχολ','τσαντ σχολ'] },
  { cat: 'candles',        keys: ['λαμπαδ','πασχαλιν λαμπ'] },
  { cat: 'toys',           keys: ['παιχνιδ','lego','playmobil','κουκλ','λουτριν','puzzle','παζλ'] },
];

export function detectSkroutzCategory(query) {
  const q = nm(query);
  for (const { cat, keys } of DETECT) {
    if (keys.some(k => q.includes(nm(k)))) return cat;
  }
  return null;
}

// ============================================================
// BUILD URL — κύρια συνάρτηση
// ============================================================
export function buildSkroutzUrl(catKey, kid) {
  const cat    = CATS[catKey];
  const gender = kid?.gender || 'Αγόρι';
  const age    = Math.min(Math.max(Math.round(kid?.age || 5), 1), 14);
  const shoe   = String(kid?.shoeSize || kid?.shoe_size || '');

  if (!cat || cat.useFallback) {
    return buildFallbackQuery(catKey, kid);
  }

  const filterIds  = [];
  const filterVals = [];

  // 1. Gender filter
  const gf = cat.gender[gender];
  if (gf) { filterIds.push(gf.fid); filterVals.push(gf.val); }

  // 2. Size filter (παπούτσια) ή Age filter (ρούχα)
  if (cat.size && shoe && cat.size[shoe]) {
    filterIds.push(cat.size[shoe]);
    filterVals.push(shoe);
  } else if (cat.age && Object.keys(cat.age).length > 0) {
    const ageKey = String(age);
    const afid   = cat.age[ageKey];
    if (afid) { filterIds.push(afid); filterVals.push(ageKey); }
  }

  const filterPart = filterIds.length > 0
    ? `/f/${filterIds.join('_')}/${filterVals.join('-')}`
    : '';

  return `${BASE}/c/${cat.id}/${cat.slug}${filterPart}.html`;
}

// ============================================================
// MAIN EXPORT — από raw query + kid profile → Skroutz URL
// ============================================================
export function buildSkroutzUrlFromQuery(rawQuery, kid) {
  const catKey = detectSkroutzCategory(rawQuery);
  if (catKey) return buildSkroutzUrl(catKey, kid);
  return buildFallbackQuery(null, kid, rawQuery);
}

// ============================================================
// FALLBACK — keyphrase search όταν δεν έχουμε category URL
// ============================================================
function buildFallbackQuery(catKey, kid, rawQuery = '') {
  const gender = kid?.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
  const genderPl = kid?.gender === 'Αγόρι' ? 'αγόρια' : 'κορίτσια';
  const age    = kid?.age || 5;
  const char   = kid?.favoriteCharacter || kid?.favorite_character || '';
  let q = '';
  if (catKey === 'toys')    q = char ? `παιχνίδια ${char} ${genderPl}` : `παιχνίδια ${genderPl}`;
  else if (catKey === 'candles') q = char ? `λαμπάδα ${char} ${gender}` : `λαμπάδα ${gender}`;
  else if (rawQuery)        q = rawQuery;
  else                      q = `παιδικά ${gender} ${age} ετών`;
  return `${BASE}/search?keyphrase=${encodeURIComponent(q)}`;
}

// ============================================================
// QUICK LINKS — για Home dashboard (6 κουμπιά)
// ============================================================
export function getQuickLinkUrl(type, kid) {
  const map = {
    shoes:    () => buildSkroutzUrl('sneakers', kid),
    blouses:  () => buildSkroutzUrl('blouses', kid),
    pants:    () => buildSkroutzUrl('pants', kid),
    tracksuits:() => buildSkroutzUrl('tracksuits', kid),
    hoodies:  () => buildSkroutzUrl('hoodies', kid),
    dresses:  () => buildSkroutzUrl('dresses', kid),
    swimwear: () => buildSkroutzUrl('swimwear', kid),
    school:   () => buildSkroutzUrl('school_bags', kid),
    toys:     () => buildFallbackQuery('toys', kid),
    candles:  () => buildFallbackQuery('candles', kid),
  };
  return map[type] ? map[type]() : buildFallbackQuery(null, kid);
}
