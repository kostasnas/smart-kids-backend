// server.js - Smart Kids Search - Full Skroutz Categories
import http from 'http';
import { URL } from 'url';
import cors from 'cors';

const PORT = process.env.PORT || 3001;
const SERPAPI_KEY = 'a2377d128c1ba155eb58dd575a16079c31730f0fdeab9d05014b01b8870053f1';

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

  // 1. ΠΑΙΔΙΚΑ ΠΑΠΟΥΤΣΙΑ
  SHOES: {
    label: 'Παιδικά Παπούτσια',
    triggers: ['παπουτσια','παπουτσι','πεδιλα','μποτακια','μπαλαρινες','sneakers','shoes','boots','σανδαλια'],
    filters: {
      type: ['Sneakers / Αθλητικά','Casual / Καθημερινά','Πέδιλα / Σανδάλια','Μποτάκια','Μπαλαρίνες','Παντόφλες / Slippers','Πρώτα Βήματα'],
      closure: ['Κορδόνια','Velcro / Σκρατς','Slip-On','Φερμουάρ'],
      features: ['Αδιάβροχα','Διαπνέοντα / Mesh','Memory Foam','Αντιολισθητικά','Ανατομικά'],
      season: ['Καλοκαιρινά','Χειμωνιάτικα','All Season'],
      brand: ['Nike','Adidas','Puma','New Balance','Skechers','Converse','Vans','Reebok','ASICS','Fila','Geox','Clarks']
    },
    keywords: {
      type: {
        'Sneakers / Αθλητικά': ['αθλητικα','sneakers','sport','running','trainer'],
        'Casual / Καθημερινά': ['casual','καθημερινα'],
        'Πέδιλα / Σανδάλια': ['πεδιλα','σανδαλια','sandal'],
        'Μποτάκια': ['μποτακια','boot'],
        'Μπαλαρίνες': ['μπαλαρινες','ballerina','flat'],
        'Παντόφλες / Slippers': ['παντοφλες','slipper'],
        'Πρώτα Βήματα': ['πρωτα βηματα','first steps','prewalker']
      },
      closure: {
        'Κορδόνια': ['κορδονια','lace'],
        'Velcro / Σκρατς': ['velcro','σκρατς','scratch'],
        'Slip-On': ['slip'],
        'Φερμουάρ': ['φερμουαρ','zip']
      },
      features: {
        'Αδιάβροχα': ['αδιαβροχ','waterproof','gore-tex'],
        'Διαπνέοντα / Mesh': ['mesh','breathable','αεριζομεν'],
        'Memory Foam': ['memory foam']
      },
      season: {
        'Καλοκαιρινά': ['καλοκαιρινα','summer'],
        'Χειμωνιάτικα': ['χειμωνιατικα','winter']
      },
      brand: {
        'Nike': ['nike'],'Adidas': ['adidas'],'Puma': ['puma'],
        'New Balance': ['new balance'],'Skechers': ['skechers'],
        'Converse': ['converse'],'Vans': ['vans'],'Reebok': ['reebok'],
        'ASICS': ['asics'],'Fila': ['fila'],'Geox': ['geox'],'Clarks': ['clarks']
      }
    }
  },

  // 2. ΠΑΙΔΙΚΗ & ΒΡΕΦΙΚΗ ΜΟΔΑ
  CLOTHES: {
    label: 'Παιδική & Βρεφική Μόδα',
    triggers: ['ρουχα','μπλουζα','παντελονι','φορμα','φουστα','μπουφαν','φορεμα','ζακετα','κολαν','σορτς','πιτζαμα','εσωρουχα','καλτσες','μαγιο'],
    filters: {
      type: ['Μπλούζες / T-Shirts','Παντελόνια / Τζιν','Φόρμες / Jogging','Φορέματα','Φούστες','Μπουφάν / Jackets','Ζακέτες / Fleece','Κολάν / Leggings','Σορτς','Εσώρουχα / Κάλτσες','Πιτζάμες','Μαγιό / Beachwear','Σετ Ρούχων'],
      ageSize: ['Νεογέννητο','0-3 μηνών','3-6 μηνών','6-12 μηνών','12-18 μηνών','1-2 ετών','2-4 ετών','4-6 ετών','6-8 ετών','8-10 ετών','10-12 ετών','12-14 ετών','14-16 ετών'],
      gender: ['Αγόρι','Κορίτσι','Unisex'],
      season: ['Καλοκαιρινά','Χειμωνιάτικα','Ανοιξιάτικα/Φθινοπωρινά','All Season'],
      material: ['100% Βαμβάκι','Fleece','Denim / Τζιν','Συνθετικό','Οργανικό Βαμβάκι'],
      brand: ['Zara Kids','H&M','DPAM','Orchestra','Next','GAP Kids','Carter\'s','Mothercare','Benetton','Mayoral']
    },
    keywords: {
      type: {
        'Μπλούζες / T-Shirts': ['μπλουζα','t-shirt','tshirt','top'],
        'Παντελόνια / Τζιν': ['παντελονι','trouser','jeans','jean'],
        'Φόρμες / Jogging': ['φορμα','tracksuit','jogger','jogging'],
        'Φορέματα': ['φορεμα','dress'],
        'Μπουφάν / Jackets': ['μπουφαν','jacket','coat'],
        'Ζακέτες / Fleece': ['ζακετα','fleece','cardigan','hoodie'],
        'Κολάν / Leggings': ['κολαν','legging'],
        'Σορτς': ['σορτς','short'],
        'Πιτζάμες': ['πιτζαμα','pyjama','pajama'],
        'Μαγιό / Beachwear': ['μαγιο','swimsuit','beachwear']
      },
      ageSize: {
        'Νεογέννητο': ['νεογεννητο','newborn','premature'],
        '0-3 μηνών': ['0-3μ','0/3','56cm'],
        '3-6 μηνών': ['3-6μ','3/6','62cm','68cm'],
        '6-12 μηνών': ['6-12μ','6/12','74cm','80cm'],
        '12-18 μηνών': ['12-18μ','12/18','86cm'],
        '1-2 ετών': ['1-2','92cm','98cm'],
        '2-4 ετών': ['2-4','104cm','110cm','2/4'],
        '4-6 ετών': ['4-6','116cm','122cm','4/6'],
        '6-8 ετών': ['6-8','128cm','134cm','6/8'],
        '8-10 ετών': ['8-10','140cm','146cm','8/10'],
        '10-12 ετών': ['10-12','152cm','158cm'],
        '12-14 ετών': ['12-14','164cm'],
        '14-16 ετών': ['14-16','170cm']
      },
      material: {
        '100% Βαμβάκι': ['100% cotton','cotton','βαμβακι'],
        'Fleece': ['fleece','φλις'],
        'Denim / Τζιν': ['denim','jeans','jean'],
        'Οργανικό Βαμβάκι': ['organic','βιολογικο']
      },
      brand: {
        'Zara Kids': ['zara'],'H&M': ['h&m','h m'],'DPAM': ['dpam'],
        'Orchestra': ['orchestra'],'Next': ['next'],'GAP Kids': ['gap'],
        'Benetton': ['benetton'],'Mayoral': ['mayoral']
      }
    }
  },

  // 3. ΠΑΙΧΝΙΔΙΑ
  TOYS: {
    label: 'Παιχνίδια',
    triggers: ['παιχνιδι','παιχνιδια','κουκλα','αυτοκινητακι','lego','επιτραπεζιο','puzzle','παζλ','λουτρινο','playmobil','toy'],
    filters: {
      ageRange: ['0-12 μηνών','1-3 ετών','3-5 ετών','5-7 ετών','7-10 ετών','10-12 ετών','12+ ετών'],
      category: ['Βρεφικά / Αισθητηριακά','Κούκλες & Λούτρινα','Αυτοκινητάκια & Οχήματα','Κατασκευές & LEGO','Επιτραπέζια & Παζλ','Εκπαιδευτικά','Διαδραστικά / Ηλεκτρονικά','Δημιουργία & Τέχνη','Εξωτερικού Χώρου','Μουσικά','RC / Τηλεκατεύθυνση'],
      brand: ['LEGO','LEGO Duplo','Playmobil','Mattel','Hasbro','Fisher-Price','Ravensburger','Hot Wheels','Barbie','Clementoni'],
      character: ['Spiderman','Batman','Frozen','Barbie','Paw Patrol','Disney','Marvel','Star Wars','Minecraft','Pokemon']
    },
    keywords: {
      ageRange: {
        '0-12 μηνών': ['baby','βρεφικο','0-12','rattle'],
        '1-3 ετών': ['1-3','duplo','18μ'],
        '3-5 ετών': ['3+','3-5','3 ετων'],
        '5-7 ετών': ['5+','5-7','6 ετων'],
        '7-10 ετών': ['7+','7-10','8 ετων'],
        '10-12 ετών': ['10+','10-12'],
        '12+ ετών': ['12+','teen']
      },
      category: {
        'Βρεφικά / Αισθητηριακά': ['κουδουνιστρα','rattle','mobile','βρεφικο'],
        'Κούκλες & Λούτρινα': ['κουκλα','doll','λουτρινο','plush','teddy','stuffed'],
        'Αυτοκινητάκια & Οχήματα': ['αυτοκινητακι','car','truck','vehicle','τρενο','train'],
        'Κατασκευές & LEGO': ['lego','duplo','κατασκευη','block','brick'],
        'Επιτραπέζια & Παζλ': ['επιτραπεζιο','board game','puzzle','παζλ'],
        'Δημιουργία & Τέχνη': ['χρωμα','paint','art','craft','ζωγραφ'],
        'Εξωτερικού Χώρου': ['εξωτερικου','outdoor','sandbox','αμμοδοχειο'],
        'RC / Τηλεκατεύθυνση': ['rc','remote','drone','τηλεκατευθυνση']
      },
      brand: {
        'LEGO': ['lego'],'LEGO Duplo': ['duplo'],
        'Playmobil': ['playmobil'],'Mattel': ['mattel'],
        'Hasbro': ['hasbro'],'Fisher-Price': ['fisher-price','fisher price'],
        'Ravensburger': ['ravensburger'],'Hot Wheels': ['hot wheels'],
        'Barbie': ['barbie'],'Clementoni': ['clementoni']
      },
      character: {
        'Spiderman': ['spiderman','spider-man'],
        'Batman': ['batman'],'Frozen': ['frozen','elsa'],
        'Barbie': ['barbie'],'Paw Patrol': ['paw patrol'],
        'Disney': ['disney'],'Marvel': ['marvel','avengers'],
        'Star Wars': ['star wars'],'Minecraft': ['minecraft'],
        'Pokemon': ['pokemon']
      }
    }
  },

  // 4. ΣΧΟΛΙΚΑ
  SCHOOL: {
    label: 'Σχολικά',
    triggers: ['σχολικη','σχολικα','τσαντα πλατης','backpack','μολυβι','τετραδιο','κασετινα','γραφικη υλη'],
    filters: {
      type: ['Σχολικές Τσάντες','Κασετίνες','Μολύβια & Στυλό','Τετράδια & Μπλοκ','Ζωγραφική & Τέχνη','Χάρακες & Γεωμετρικά','Σχολικά Σετ'],
      ageSize: ['Νηπιαγωγείο (3-6ε)','Α-Β Δημοτικού (6-8ε)','Γ-Δ Δημοτικού (8-10ε)','Ε-ΣΤ Δημοτικού (10-12ε)','Γυμνάσιο (12-15ε)'],
      character: ['Spiderman','Frozen','Disney','Unicorn','Dinosaur','Paw Patrol','Minecraft','Among Us'],
      brand: ['Polo','Lyra','Faber-Castell','Pelikan','Herlitz','Maped','Staedtler']
    },
    keywords: {
      type: {
        'Σχολικές Τσάντες': ['τσαντα','backpack','bag'],
        'Κασετίνες': ['κασετινα','pencil case'],
        'Μολύβια & Στυλό': ['μολυβι','pencil','pen','στυλο'],
        'Τετράδια & Μπλοκ': ['τετραδιο','notebook','μπλοκ'],
        'Ζωγραφική & Τέχνη': ['ζωγραφ','art','χρωμα','marker','pastel']
      },
      character: {
        'Spiderman': ['spiderman'],'Frozen': ['frozen','elsa'],
        'Disney': ['disney'],'Unicorn': ['unicorn','μονοκερος'],
        'Dinosaur': ['dinosaur','dino'],'Paw Patrol': ['paw patrol'],
        'Minecraft': ['minecraft'],'Among Us': ['among us']
      },
      brand: {
        'Faber-Castell': ['faber'],'Pelikan': ['pelikan'],
        'Maped': ['maped'],'Staedtler': ['staedtler']
      }
    }
  },

  // 5. ΦΡΟΝΤΙΔΑ & ΥΓΙΕΙΝΗ ΜΩΡΟΥ
  BABY_CARE: {
    label: 'Φροντίδα & Υγιεινή Μωρού',
    triggers: ['πανες','μπιμπερο','βρεφικο','κουδουνιστρα','βρεφος','βρεφοτροφη','baby care','βρεφικη φροντιδα'],
    filters: {
      type: ['Πάνες','Μπιμπερό & Θηλασμός','Βρεφικές Τροφές','Περιποίηση & Υγιεινή','Μπάνιο','Τάιζμα & Αξεσουάρ','Βρεφικά Παιχνίδια 0-12μ'],
      ageRange: ['Νεογέννητο','0-3 μηνών','3-6 μηνών','6-12 μηνών','12-18 μηνών','18-24 μηνών'],
      brand: ['Pampers','Huggies','Chicco','Philips Avent','NUK','MAM','Tommee Tippee','Fisher-Price','Mustela','Johnson\'s']
    },
    keywords: {
      type: {
        'Πάνες': ['πανα','diaper','nappy'],
        'Μπιμπερό & Θηλασμός': ['μπιμπερο','bottle','θηλη','breast pump'],
        'Βρεφικές Τροφές': ['βρεφοτροφη','βρεφικη τροφη','baby food'],
        'Περιποίηση & Υγιεινή': ['κρεμα','cream','σαμπουαν','shampoo','lotion'],
        'Μπάνιο': ['μπανιερακι','bath','tub'],
        'Τάιζμα & Αξεσουάρ': ['κουταλακι','μπολ','bowl','bib','σαλιαρα']
      },
      ageRange: {
        'Νεογέννητο': ['νεογεννητο','newborn','nb'],
        '0-3 μηνών': ['0-3μ','0+'],
        '3-6 μηνών': ['3-6μ','3+'],
        '6-12 μηνών': ['6-12μ','6+'],
        '12-18 μηνών': ['12-18μ','12+']
      },
      brand: {
        'Pampers': ['pampers'],'Huggies': ['huggies'],
        'Chicco': ['chicco'],'Philips Avent': ['avent'],
        'NUK': ['nuk'],'MAM': ['mam'],
        'Tommee Tippee': ['tommee'],'Mustela': ['mustela']
      }
    }
  },

  // 6. ΚΑΡΟΤΣΙΑ & ΜΕΤΑΚΙΝΗΣΗ
  STROLLER: {
    label: 'Καρότσια & Μετακίνηση',
    triggers: ['καροτσι','καρότσι','stroller','pram','buggy','marsippos','μαρσιπος'],
    filters: {
      type: ['Mono / Solo','Duo / Travel System','Ελαφρύ / Umbrella','Jogger','Δίδυμα','Ηλεκτρικό'],
      features: ['Αναστρέψιμο Κάθισμα','Ανάκλιση 180° (Flat)','Μεγάλο Καλάθι','Αναδιπλούμενο','Ανάρτηση','Συμβατό με Car Seat','Βραδύτητα'],
      frameType: ['Αλουμίνιο','Ανοξείδωτο Ατσάλι'],
      brand: ['Cybex','Bugaboo','Maxi-Cosi','Chicco','Joie','Kinderkraft','Yoyo (Babyzen)','UPPAbaby','Silver Cross','Nuna']
    },
    keywords: {
      type: {
        'Duo / Travel System': ['duo','travel system'],
        'Ελαφρύ / Umbrella': ['ελαφρυ','umbrella','lightweight'],
        'Jogger': ['jogger','running'],
        'Δίδυμα': ['διδυμ','twin','double'],
        'Ηλεκτρικό': ['ηλεκτρικ','electric']
      },
      features: {
        'Ανάκλιση 180° (Flat)': ['180','flat','lie flat'],
        'Αναδιπλούμενο': ['αναδιπλ','fold','compact'],
        'Συμβατό με Car Seat': ['car seat','καθισμα','travel system']
      },
      brand: {
        'Cybex': ['cybex'],'Bugaboo': ['bugaboo'],
        'Maxi-Cosi': ['maxi-cosi','maxicosi'],
        'Chicco': ['chicco'],'Joie': ['joie'],
        'Kinderkraft': ['kinderkraft'],'Yoyo (Babyzen)': ['yoyo','babyzen'],
        'UPPAbaby': ['uppababy'],'Silver Cross': ['silver cross'],
        'Nuna': ['nuna']
      }
    }
  },

  // 7. ΚΑΘΙΣΜΑΤΑ ΑΥΤΟΚΙΝΗΤΟΥ
  CAR_SEAT: {
    label: 'Καθίσματα Αυτοκινήτου',
    triggers: ['καθισμα αυτοκινητου','καθισματακι','car seat','isofix','παιδικο καθισμα','βρεφικο καθισμα'],
    filters: {
      group: ['Ομάδα 0+ (0-13kg)','Ομάδα 1 (9-18kg)','Ομάδα 2/3 (15-36kg)','Ομάδα 0+/1 (0-18kg)','Ομάδα 1/2/3 (9-36kg)','i-Size (40-105cm)','i-Size (61-105cm)','i-Size (100-150cm)'],
      installation: ['ISOfix','ISOfix + Top Tether','Ζώνη Αυτοκινήτου','ISOfix + Βάση'],
      rotation: ['Στροφή 360°','Ναι','Όχι'],
      direction: ['Προς τα εμπρός','Προς τα πίσω','Και οι δύο κατευθύνσεις'],
      features: ['Ανάκλιση (Recline)','Πλευρική Προστασία (SPS)','Booster','Αντ/κό Ρεύμα Αέρα','Πλενόμενο κάλυμμα'],
      brand: ['Cybex','Maxi-Cosi','Britax Römer','Chicco','Joie','Kinderkraft','Recaro','BeSafe','Nuna','GB','Graco','Osann']
    },
    keywords: {
      group: {
        'Ομάδα 0+ (0-13kg)': ['0-13','group 0','0+kg'],
        'Ομάδα 1 (9-18kg)': ['9-18','group 1'],
        'Ομάδα 2/3 (15-36kg)': ['15-36','group 2','group 3'],
        'Ομάδα 1/2/3 (9-36kg)': ['9-36'],
        'i-Size (40-105cm)': ['40-105','i-size'],
        'i-Size (100-150cm)': ['100-150']
      },
      installation: {
        'ISOfix': ['isofix','iso fix'],
        'Ζώνη Αυτοκινήτου': ['ζωνη','belt']
      },
      rotation: { 'Στροφή 360°': ['360','περιστροφη','swivel'] },
      direction: {
        'Προς τα πίσω': ['rear','πισω','rearward'],
        'Προς τα εμπρός': ['forward','εμπρος']
      },
      features: {
        'Ανάκλιση (Recline)': ['recline','ανακλιση'],
        'Πλευρική Προστασία (SPS)': ['sps','side protection','πλευρικη'],
        'Booster': ['booster']
      },
      brand: {
        'Cybex': ['cybex'],'Maxi-Cosi': ['maxi-cosi','maxicosi'],
        'Britax Römer': ['britax'],'Chicco': ['chicco'],
        'Joie': ['joie'],'Kinderkraft': ['kinderkraft'],
        'Recaro': ['recaro'],'BeSafe': ['besafe'],
        'Nuna': ['nuna'],'GB': [' gb '],'Graco': ['graco']
      }
    }
  },

  // 8. ΠΑΙΔΙΚΑ ΕΠΙΠΛΑ & ΔΙΑΚΟΣΜΗΣΗ
  FURNITURE: {
    label: 'Παιδικά Έπιπλα & Διακόσμηση',
    triggers: ['κρεβατι','επιπλα','γραφειο','ντουλαπα','κουνιετα','παιδικο δωματιο','bed','desk','παιδικη καρεκλα'],
    filters: {
      type: ['Κρεβάτια','Κουνιέτες / Bassinets','Γραφεία','Καρέκλες Γραφείου','Ντουλάπες','Ράφια & Βιβλιοθήκες','Φωτιστικά','Χαλιά'],
      ageRange: ['Βρεφικά (0-2ε)','Παιδικά (3-10ε)','Εφηβικά (11-16ε)'],
      style: ['Μοντέρνο','Skandinavian','Disney / Character','Παραδοσιακό / Κλασικό'],
      material: ['Μασίφ Ξύλο','MDF','Μέταλλο','Πλαστικό'],
      brand: ['IKEA','Cilek','Lifetime','Fun House','Kettler']
    },
    keywords: {
      type: {
        'Κρεβάτια': ['κρεβατι','bed'],
        'Κουνιέτες / Bassinets': ['κουνιετα','crib','bassinet','κουνια'],
        'Γραφεία': ['γραφειο','desk'],
        'Καρέκλες Γραφείου': ['καρεκλα γραφειου','office chair'],
        'Ντουλάπες': ['ντουλαπα','wardrobe'],
        'Ράφια & Βιβλιοθήκες': ['ραφι','bookshelf','βιβλιοθηκη']
      },
      style: {
        'Skandinavian': ['skandinavian','nordic','σκανδιναβ'],
        'Disney / Character': ['disney','princess','superhero']
      },
      brand: {
        'IKEA': ['ikea'],'Cilek': ['cilek'],'Lifetime': ['lifetime']
      }
    }
  },

  // 9. ΠΑΙΔΙΚΟΣ ΑΘΛΗΤΙΣΜΟΣ
  SPORTS: {
    label: 'Παιδικός Αθλητισμός',
    triggers: ['ποδηλατο','μπαλα','πατινια','σκουτερ','scooter','bicycle','bike','κρανος','ηλεκτρικο πατινι','ηλεκτρικο ποδηλατο'],
    filters: {
      sport: ['Ποδηλασία','Ποδόσφαιρο','Μπάσκετ','Κολύμβηση','Πατινάζ / Skateboard','Τένις / Badminton','Γυμναστική'],
      type: ['Ποδήλατα','Ηλεκτρικά Ποδήλατα','Σκούτερ / Πατίνια','Ηλεκτρικά Πατίνια','Μπάλες','Κράνη','Προστατευτικά (Επιγονατίδες κτλ)','Εξοπλισμός Κολύμβησης'],
      ageRange: ['2-4 ετών','4-6 ετών','6-9 ετών','9-12 ετών','12+ ετών'],
      brand: ['Decathlon','Nike','Adidas','Wilson','Spalding','Kinderkraft','Puky','Micro']
    },
    keywords: {
      type: {
        'Ποδήλατα': ['ποδηλατο','bicycle','bike'],
        'Ηλεκτρικά Ποδήλατα': ['ηλεκτρικο ποδηλατο','electric bike'],
        'Σκούτερ / Πατίνια': ['σκουτερ','scooter','πατινι','skate'],
        'Ηλεκτρικά Πατίνια': ['ηλεκτρικο πατινι','electric scooter'],
        'Μπάλες': ['μπαλα','ball'],
        'Κράνη': ['κρανος','helmet'],
        'Προστατευτικά (Επιγονατίδες κτλ)': ['προστατευτικ','pad','knee','elbow']
      },
      sport: {
        'Ποδόσφαιρο': ['ποδοσφαιρο','football','soccer'],
        'Μπάσκετ': ['μπασκετ','basketball'],
        'Κολύμβηση': ['κολυμβηση','swimming','μαγιο'],
        'Πατινάζ / Skateboard': ['πατιναζ','skating','skateboard']
      },
      brand: {
        'Decathlon': ['decathlon'],'Nike': ['nike'],'Adidas': ['adidas'],
        'Wilson': ['wilson'],'Kinderkraft': ['kinderkraft'],
        'Puky': ['puky'],'Micro': ['micro']
      }
    }
  },

  // 10. ΕΠΟΧΙΑΚΑ / ΓΙΟΡΤΕΣ
  SEASONAL: {
    label: 'Εποχιακά / Γιορτές',
    triggers: ['στολη','λαμπαδα','αποκριες','αποκρια','πασχα','χριστουγεννιατικα','costume','halloween'],
    filters: {
      occasion: ['Απόκριες / Halloween','Πάσχα','Χριστούγεννα','Γενέθλια'],
      ageSize: ['0-12 μηνών','1-2 ετών','2-4 ετών','4-6 ετών','6-8 ετών','8-10 ετών','10-12 ετών','12-14 ετών'],
      character: [
        'Spiderman','Batman','Superman','Iron Man','Captain America','Hulk','Thor','Flash',
        'Elsa','Anna','Ariel','Belle','Cinderella','Rapunzel','Moana',
        'Mickey Mouse','Minnie Mouse','Paw Patrol',
        'Harry Potter','Dracula','Witch','Zombie','Skeleton',
        'Unicorn','Mermaid','Fairy','Princess','Pirate','Ninja','Dinosaur','Astronaut'
      ],
      theme: ['Superheroes / Marvel / DC','Disney Princess','Disney Classic','Horror / Τρόμος','Fantasy / Φαντασία','Animals / Ζώα','Professions / Επαγγέλματα']
    },
    keywords: {
      occasion: {
        'Απόκριες / Halloween': ['αποκριες','αποκρια','halloween','carnival'],
        'Πάσχα': ['πασχα','easter','λαμπαδα'],
        'Χριστούγεννα': ['χριστουγεννα','christmas','xmas']
      },
      ageSize: {
        '0-12 μηνών': ['baby','βρεφικο','0-12μ'],
        '1-2 ετών': ['1-2','92','98'],
        '2-4 ετών': ['2-4','104','110','2/4'],
        '4-6 ετών': ['4-6','116','122','4/6'],
        '6-8 ετών': ['6-8','128','134','6/8'],
        '8-10 ετών': ['8-10','140','146'],
        '10-12 ετών': ['10-12','152','158'],
        '12-14 ετών': ['12-14','164']
      },
      character: {
        'Spiderman': ['spiderman','spider-man'],
        'Batman': ['batman'],'Superman': ['superman'],
        'Iron Man': ['iron man','ironman'],
        'Captain America': ['captain america'],
        'Hulk': ['hulk'],'Thor': ['thor'],
        'Elsa': ['elsa'],'Anna': ['anna','frozen'],
        'Ariel': ['ariel'],'Belle': ['belle'],
        'Cinderella': ['cinderella'],'Rapunzel': ['rapunzel'],
        'Mickey Mouse': ['mickey'],'Minnie Mouse': ['minnie'],
        'Paw Patrol': ['paw patrol'],
        'Dracula': ['dracula','vampire'],
        'Witch': ['witch','μαγισσα'],
        'Zombie': ['zombie'],'Skeleton': ['skeleton'],
        'Unicorn': ['unicorn','μονοκερος'],
        'Mermaid': ['mermaid','γοργονα'],
        'Princess': ['princess','πριγκιπισσα'],
        'Pirate': ['pirate','πειρατης'],
        'Ninja': ['ninja'],'Dinosaur': ['dinosaur','dino'],
        'Astronaut': ['astronaut','αστροναυτης']
      },
      theme: {
        'Superheroes / Marvel / DC': ['superhero','marvel','avengers','dc '],
        'Disney Princess': ['princess','disney princess'],
        'Disney Classic': ['disney','mickey','minnie'],
        'Horror / Τρόμος': ['horror','zombie','skeleton','vampire','witch'],
        'Animals / Ζώα': ['animal','ζωο','lion','tiger'],
        'Professions / Επαγγέλματα': ['doctor','police','firefighter','pilot','chef']
      }
    }
  },

  // 11. ΠΑΙΔΙΚΗ ΤΕΧΝΟΛΟΓΙΑ
  TECH: {
    label: 'Παιδική Τεχνολογία',
    triggers: ['tablet','ταμπλετ','smartwatch','παιδικο tablet','ηλεκτρικο οχημα','console','nintendo','playstation'],
    filters: {
      type: ['Tablets','Smartwatches / GPS Παιδικά','Gaming Consoles','Ηλεκτρικά Οχήματα (Ride-On)','Ακουστικά','Εκπαιδευτικά Tech','Κάμερες για Παιδιά'],
      ageRange: ['3-5 ετών','5-8 ετών','8-12 ετών','12+ ετών'],
      brand: ['Apple','Samsung','Amazon Fire','Nintendo','PlayStation','Xbox','Leapfrog','VTech','Kidfun']
    },
    keywords: {
      type: {
        'Tablets': ['tablet','ταμπλετ','ipad'],
        'Smartwatches / GPS Παιδικά': ['smartwatch','watch','gps παιδικο'],
        'Gaming Consoles': ['console','playstation','nintendo','xbox','switch'],
        'Ηλεκτρικά Οχήματα (Ride-On)': ['ride on','ηλεκτρικο αυτοκινητο','electric car','γουρουνακι'],
        'Εκπαιδευτικά Tech': ['leapfrog','vtech','εκπαιδευτικο']
      },
      brand: {
        'Apple': ['apple','ipad'],'Samsung': ['samsung'],
        'Amazon Fire': ['amazon','fire tablet'],
        'Nintendo': ['nintendo','switch'],
        'PlayStation': ['playstation','ps4','ps5'],
        'Xbox': ['xbox'],'Leapfrog': ['leapfrog'],'VTech': ['vtech']
      }
    }
  },

  // 12. ΗΛΕΚΤΡΙΚΑ ΟΧΗΜΑΤΑ / RIDE-ON
  ELECTRIC_VEHICLES: {
    label: 'Ηλεκτρικά Οχήματα & Ride-On',
    triggers: ['ηλεκτρικο αυτοκινητο','ride on','γουρουνακι','ηλεκτρικο οχημα','μηχανακι παιδικο','electric car kids'],
    filters: {
      type: ['Αυτοκίνητα','Μοτοσυκλέτες / ATV','Τρακτέρ','Quad','Γουρούνες (UTV)'],
      voltage: ['6V','12V','24V'],
      seats: ['1 Θέση','2 Θέσεις'],
      ageRange: ['1-3 ετών','3-5 ετών','5-8 ετών','8+ ετών'],
      features: ['Τηλεχειριστήριο Γονέα','MP3 / USB','Δερμάτινο Κάθισμα','4x4 / 4WD','Πόρτες που Ανοίγουν'],
      brand: ['Injusa','Peg Perego','Kingtoys','Toyz','Babycar']
    },
    keywords: {
      type: {
        'Αυτοκίνητα': ['αυτοκινητο','car'],
        'Μοτοσυκλέτες / ATV': ['μοτοσυκλετα','atv','moto'],
        'Quad': ['quad'],
        'Γουρούνες (UTV)': ['γουρουνα','utv']
      },
      voltage: {
        '6V': ['6v','6 volt'],
        '12V': ['12v','12 volt'],
        '24V': ['24v','24 volt']
      },
      features: {
        'Τηλεχειριστήριο Γονέα': ['τηλεχειριστηριο','remote parent','remote control'],
        'MP3 / USB': ['mp3','usb','bluetooth'],
        '4x4 / 4WD': ['4x4','4wd','four wheel']
      },
      brand: {
        'Injusa': ['injusa'],'Peg Perego': ['peg perego'],
        'Kingtoys': ['kingtoys'],'Toyz': ['toyz']
      }
    }
  }
};

// ============================================================
// DETECT CATEGORY
// ============================================================
function detectCategory(query) {
  const q = nm(query);
  for (const [name, cat] of Object.entries(CATEGORIES)) {
    if (cat.triggers.some(t => q.includes(nm(t)))) return name;
  }
  return 'GENERAL';
}

// ============================================================
// EXTRACT ATTRIBUTES
// ============================================================
function extractAttributes(item, category) {
  const title = nm(item.title || '');
  const attrs = {};
  const cat = CATEGORIES[category];
  if (!cat?.keywords) return attrs;

  for (const [filterType, valueKeywords] of Object.entries(cat.keywords)) {
    for (const [value, keywords] of Object.entries(valueKeywords)) {
      if (keywords.some(kw => title.includes(nm(kw)))) {
        if (!attrs[filterType]) attrs[filterType] = [];
        if (!attrs[filterType].includes(value)) attrs[filterType].push(value);
      }
    }
  }

  // Color - all categories
  const colors = {
    'κόκκινο': ['κοκκινο','red'], 'μπλε': ['μπλε','blue','navy'],
    'ροζ': ['ροζ','pink'], 'μαύρο': ['μαυρο','black'],
    'άσπρο': ['ασπρο','white','λευκο'], 'κίτρινο': ['κιτρινο','yellow'],
    'πράσινο': ['πρασινο','green'], 'πορτοκαλί': ['πορτοκαλι','orange'],
    'γκρι': ['γκρι','gray','grey'], 'καφέ': ['καφε','brown'],
    'μωβ': ['μωβ','purple','violet'], 'χρυσό': ['χρυσο','gold'],
  };
  for (const [color, kws] of Object.entries(colors)) {
    if (kws.some(kw => title.includes(kw))) { attrs.color = color; break; }
  }

  return attrs;
}

// ============================================================
// COLLECT FILTERS - Skroutz Order
// ============================================================
function collectFilters(products, category) {
  const sets = {};
  products.forEach(p => {
    Object.entries(p.attributes || {}).forEach(([key, value]) => {
      if (!sets[key]) sets[key] = new Set();
      if (Array.isArray(value)) value.forEach(v => v && sets[key].add(v));
      else if (value) sets[key].add(value);
    });
  });

  const result = {};
  const cat = CATEGORIES[category];

  if (cat?.filters) {
    Object.keys(cat.filters).forEach(filterType => {
      if (sets[filterType]?.size > 0) {
        const defined = cat.filters[filterType];
        const found = Array.from(sets[filterType]);
        const sorted = [...defined.filter(d => found.includes(d)), ...found.filter(f => !defined.includes(f))];
        if (sorted.length > 0) result[filterType] = sorted;
      }
    });
  }

  if (sets.color?.size > 0) result.color = Array.from(sets.color);

  const total = Object.values(result).flat().length;
  console.log(`📊 ${Object.keys(result).length} filter types | ${total} options: ${Object.keys(result).join(', ')}`);
  return result;
}

// ============================================================
// SCORE
// ============================================================
function scoreProduct(item, gender) {
  const title = nm(item.title || '');
  const source = (item.source || '').toLowerCase();
  let priceValue = null;
  if (item.price) {
    const m = item.price.match(/[\d.,]+/);
    if (m) priceValue = parseFloat(m[0].replace(',', '.'));
  }
  const genderKws = {
    'Αγόρι': { pos: ['αγορι','boys','boy'], neg: ['κοριτσι','girls','girl','ροζ','pink','princess'] },
    'Κορίτσι': { pos: ['κοριτσι','girls','girl'], neg: ['αγορι','boys','boy'] }
  };
  let genderScore = 0;
  if (gender && genderKws[gender]) {
    if (genderKws[gender].pos.some(k => title.includes(k))) genderScore += 100;
    if (genderKws[gender].neg.some(k => title.includes(k))) genderScore -= 150;
  }
  const shopScores = { 'intersport': 95, 'cosmos': 90, 'dpam': 90, 'jumbo': 85, 'decathlon': 85 };
  let shopScore = 50;
  for (const [s, sc] of Object.entries(shopScores)) { if (source.includes(s)) { shopScore = sc; break; } }
  const priceScore = priceValue ? Math.max(0, 100 - priceValue / 2) : 50;
  const ratingScore = item.rating ? (item.rating / 5) * 100 : 50;
  const reviewsScore = Math.min((item.reviews || 0) / 10, 50);
  return {
    priceValue, rating: item.rating || null, reviews: item.reviews || 0,
    genderScore, finalScore: Math.round(priceScore * 0.35 + ratingScore * 0.25 + reviewsScore * 0.15 + shopScore * 0.15 + genderScore * 0.10),
    buyLink: item.product_link || item.link
  };
}

async function fetchQuery(query) {
  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&hl=el&gl=gr&num=20&api_key=${SERPAPI_KEY}`;
    return await (await fetch(url)).json();
  } catch { return null; }
}

// ============================================================
// SERVER
// ============================================================
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  if (parsedUrl.pathname === '/api/search' && req.method === 'GET') {
    try {
      const baseQuery = parsedUrl.searchParams.get('q') || '';
      const gender = parsedUrl.searchParams.get('gender') || '';
      const age = parseInt(parsedUrl.searchParams.get('age')) || 5;
      const category = detectCategory(baseQuery);
      const catLabel = CATEGORIES[category]?.label || 'General';

      console.log(`\n${'='.repeat(55)}`);
      console.log(`🔍 "${baseQuery}" → 📂 ${catLabel}`);
      console.log(`${'='.repeat(55)}`);

      const genderGr = gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι';
      const genderEn = gender === 'Αγόρι' ? 'boys' : 'girls';
      const queries = [
        `${baseQuery} παιδικά ${genderGr}`,
        `kids ${baseQuery} ${genderEn}`,
        `${baseQuery} ${genderGr}`
      ];

      const raw = await Promise.all(queries.map(fetchQuery));
      const seenIds = new Set();
      const all = [];
      raw.forEach(data => data?.shopping_results?.forEach(item => {
        const id = item.product_id || item.link || item.title;
        if (!seenIds.has(id)) { seenIds.add(id); all.push(item); }
      }));

      console.log(`✅ ${all.length} products fetched`);

      let enriched = all.map(item => ({
        ...item, ...scoreProduct(item, gender),
        attributes: extractAttributes(item, category), category
      })).filter(p => p.genderScore > -50);

      enriched.sort((a, b) => b.finalScore - a.finalScore);
      const availableFilters = collectFilters(enriched, category);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ shopping_results: enriched, metadata: { total: enriched.length, category, categoryLabel: catLabel, availableFilters } }));

    } catch (err) {
      console.error('❌', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Search failed' }));
    }
  } else { 
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Smart Kids API is Online and Ready! 🚀'); 
  }

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(55)}`);
  console.log(`🚀 SMART KIDS - Full Skroutz Categories`);
  console.log(`   Server is live on Render!`);
  console.log(`   Port: ${PORT}`);
  console.log(`${'='.repeat(55)}\n`);
});
