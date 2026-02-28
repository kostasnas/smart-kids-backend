// server.js - Smart Kids Search - Full Skroutz Categories & Direct Links Fix
import http from 'http';
import { URL } from 'url';
import fetch from 'node-fetch'; // Βεβαιώσου ότι έχεις κάνει npm install node-fetch αν δεν υπάρχει

const PORT = process.env.PORT || 3001;
const SERPAPI_KEY = process.env.SERPAPI_KEY || 'a2377d128c1ba155eb58dd575a16079c31730f0fdeab9d05014b01b8870053f1';

// ============================================================
// NORMALIZE GREEK ACCENTS
// ============================================================
function normalizeGreek(str) {
  return (str || '').toLowerCase()
    .replace(/ά/g,'α').replace(/έ/g,'ε').replace(/ή/g,'η')
    .replace(/ί/g,'ι').replace(/ό/g,'ο').replace(/ύ/g,'υ')
    .replace(/ώ/g,'ω').replace(/ϊ/g,'ι').replace(/ϋ/g,'υ')
    .replace(/ΐ/g,'ι').replace(/ΰ/g,'υ');
}

function nm(str) { return normalizeGreek(str); }

// ============================================================
// ALL 12 CATEGORIES - SKROUTZ ACCURATE
// ============================================================
const CATEGORIES = {
  SHOES: {
    label: 'Παιδικά Παπούτσια',
    triggers: ['παπουτσια','παπουτσι','πεδιλα','μποτακια','μπαλαρινες','sneakers','shoes','boots','σανδαλια'],
    filters: {
      type: ['Sneakers / Αθλητικά','Casual / Καθημερινά','Πέδιλα / Σανδάλια','Μποτάκια','Μπαλαρίνες','Παντόφλες / Slippers','Πρώτα Βήματα'],
      brand: ['Nike','Adidas','Puma','New Balance','Skechers','Converse','Vans','Reebok','ASICS','Fila','Geox','Clarks']
    },
    keywords: {
      type: {
        'Sneakers / Αθλητικά': ['αθλητικα','sneakers','sport','running','trainer'],
        'Πέδιλα / Σανδάλια': ['πεδιλα','σανδαλια','sandal'],
        'Μποτάκια': ['μποτακια','boot']
      },
      brand: { 'Nike': ['nike'],'Adidas': ['adidas'],'Puma': ['puma'] }
    }
  },
  CLOTHES: {
    label: 'Παιδική & Βρεφική Μόδα',
    triggers: ['ρουχα','μπλουζα','παντελονι','φορμα','φουστα','μπουφαν','φορεμα','ζακετα','κολαν','σορτς','πιτζαμα','εσωρουχα','καλτσες','μαγιο'],
    filters: {
      type: ['Μπλούζες / T-Shirts','Παντελόνια / Τζιν','Φόρμες / Jogging','Φορέματα','Μπουφάν / Jackets'],
      gender: ['Αγόρι','Κορίτσι','Unisex'],
      brand: ['Zara Kids','H&M','DPAM','Orchestra','Next','GAP Kids','Carter\'s','Mothercare','Benetton','Mayoral']
    },
    keywords: {
      type: { 'Μπλούζες / T-Shirts': ['μπλουζα','t-shirt','tshirt'], 'Φορέματα': ['φορεμα','dress'] },
      brand: { 'Zara Kids': ['zara'],'H&M': ['h&m','h m'],'DPAM': ['dpam'] }
    }
  },
  TOYS: { label: 'Παιχνίδια', triggers: ['παιχνιδι'], filters: {}, keywords: {} },
  SCHOOL: { label: 'Σχολικά', triggers: ['σχολικα'], filters
