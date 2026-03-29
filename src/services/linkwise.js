// ============================================
// LINKWISE AFFILIATE DEEPLINK HELPER
// Affiliate ID: CD28202
// ============================================

const LINKWISE_AFFILIATE_ID = 'CD28202';

// Program IDs ανά κατάστημα
const LINKWISE_PROGRAMS = {
  // Παιχνίδια
  'moustakastoys.gr':    '10784',
  'blablatoys.gr':       '13506',
  'toys.gr':             '11307',

  // Παιδικά ρούχα / είδη
  'agnotis.com':         '11562',
  'babykid.gr':          '11036',
  'baby-valley.gr':      '14015',
  'accessoire.gr':       '13208',

  // Παπούτσια
  'camper.com':          '14114',
  'serafinoshoes.gr':    '13255',
  'spartoo.gr':          '399',

  // Αθλητικά
  'siontisathletics.gr': '13884',

  // Ηλεκτρονικά / Γενικά
  'kotsovolos.gr':       '138',
  'public.gr':           '469',

  // Μόδα
  'shein.com':           '13924',
  'euqs.shein.com':      '13924',
};

/**
 * Μετατρέπει οποιοδήποτε product URL σε Linkwise affiliate deeplink.
 * Αν το κατάστημα δεν υπάρχει στη λίστα, επιστρέφει το αρχικό URL.
 */
export function toAffiliateLink(url) {
  if (!url) return url;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');

    // Βρες το program ID
    const programId = LINKWISE_PROGRAMS[hostname];
    if (!programId) return url; // Δεν υπάρχει affiliate → επιστροφή αρχικού

    const encodedUrl = encodeURIComponent(url);
    return `https://go.linkwi.se/z/${programId}-0/${LINKWISE_AFFILIATE_ID}/?lnkurl=${encodedUrl}`;
  } catch (e) {
    return url;
  }
}

/**
 * Ελέγχει αν ένα URL έχει affiliate program
 */
export function hasAffiliateProgram(url) {
  if (!url) return false;
  try {
    const hostname = new URL(url).hostname.replace('www.', '');
    return !!LINKWISE_PROGRAMS[hostname];
  } catch {
    return false;
  }
}

export default { toAffiliateLink, hasAffiliateProgram };
