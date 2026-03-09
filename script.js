/* ============================================================
   JAPAN 2026 TRAVEL PLANNER — v2
   Vertical timeline · Edit mode · Baked-in photos
   ============================================================ */

// ── FEATURE FLAGS ──
const ENABLE_API_PHOTOS = false;  // Flip to true to re-enable runtime Google Places photo fetching

// ── CONFIG ──
const DATA_VERSION = 17;

const CITY_COLORS = {
    Tokyo:'#3b82f6', Kyoto:'#ef4444', Osaka:'#f59e0b',
    Nara:'#10b981', Fuji:'#8b5cf6', Izu:'#06b6d4', Other:'#6b7280'
};
const CATEGORY_ICONS  = { Food:'🍜', Shopping:'🛍️', Attractions:'⛩️', Entertainment:'🎮', Hotel:'🏨', Onsen:'♨️' };
const MARKER_COLORS   = { Food:'#f59e0b', Shopping:'#8b5cf6', Attractions:'#10b981', Entertainment:'#3b82f6', Hotel:'#ec4899', Onsen:'#ef4444' };

// ── NEIGHBORHOOD / AREA MAPPING ──
const PLACE_AREAS = {
    // TOKYO — Shinjuku
    1:'Shinjuku', 9:'Shinjuku', 14:'Shinjuku', 35:'Shinjuku', 37:'Shinjuku',
    41:'Shinjuku', 42:'Shinjuku', 101:'Shinjuku', 121:'Shinjuku', 45:'Shinjuku',
    // TOKYO — Ginza
    2:'Ginza', 8:'Ginza', 18:'Ginza', 20:'Ginza',
    // TOKYO — Shibuya
    3:'Shibuya', 7:'Shibuya', 10:'Shibuya', 11:'Shibuya', 17:'Shibuya',
    19:'Shibuya', 21:'Shibuya', 25:'Shibuya', 30:'Shibuya', 31:'Shibuya', 38:'Shibuya', 43:'Shibuya',
    // TOKYO — Harajuku
    23:'Harajuku', 29:'Harajuku', 100:'Harajuku',
    // TOKYO — Asakusa
    5:'Asakusa', 6:'Asakusa', 13:'Asakusa', 26:'Asakusa', 27:'Asakusa', 51:'Asakusa',
    // TOKYO — Tokyo Station
    12:'Tokyo Station', 16:'Tokyo Station', 24:'Tokyo Station',
    // TOKYO — Other areas
    4:'Nihonbashi', 15:'Tsukiji', 28:'Oshiage', 22:'Ikebukuro', 44:'Ikebukuro',
    34:'Azabudai', 32:'Minato', 36:'Minato', 39:'Shimokitazawa',
    33:'Maihama', 40:'Maihama', 102:'Kanda', 135:'Kamakura',

    // KYOTO — Arashiyama
    77:'Arashiyama', 82:'Arashiyama', 87:'Arashiyama', 90:'Arashiyama', 126:'Arashiyama', 128:'Arashiyama',
    // KYOTO — Higashiyama
    76:'Higashiyama', 81:'Higashiyama', 86:'Higashiyama', 88:'Higashiyama', 106:'Higashiyama', 130:'Higashiyama',
    // KYOTO — Gion / Downtown
    80:'Gion', 78:'Downtown', 79:'Nishiki', 91:'Nishiki', 118:'Downtown', 129:'Downtown', 120:'Shijo',
    // KYOTO — Kita / Kinugasa
    75:'Kinugasa', 105:'Kinugasa',
    // KYOTO — Philosopher's Path / Sakyo
    83:'Sakyo', 84:'Sakyo',
    // KYOTO — Other
    50:'Fushimi', 89:'Kurama', 85:'Yamazaki',

    // OSAKA — Namba / Dotonbori
    49:'Namba', 61:'Namba', 65:'Namba', 68:'Namba', 69:'Namba', 71:'Namba',
    107:'Namba', 108:'Namba', 48:'Namba',
    // OSAKA — Shinsaibashi
    70:'Shinsaibashi', 109:'Shinsaibashi', 131:'Shinsaibashi',
    // OSAKA — Shinsekai
    62:'Shinsekai', 67:'Shinsekai',
    // OSAKA — Osaka Castle area
    46:'Osaka Castle', 119:'Osaka Castle', 127:'Chuo',
    // OSAKA — Umeda / Kita
    47:'Umeda', 72:'Umeda',
    // OSAKA — Bay Area / Outer
    63:'Tempozan', 64:'Tempozan', 66:'Sumiyoshi', 73:'Nagai', 74:'Minoo', 110:'Ikoma',

    // NARA
    92:'Nara Park', 93:'Nara Park', 94:'Nara Park', 95:'Nara Park',
    111:'Nara Park', 112:'Nara Park', 132:'Nara Park',
    96:'Naramachi', 113:'Naramachi',

    // FUJI
    53:'Kawaguchiko', 59:'Kawaguchiko', 99:'Kawaguchiko', 116:'Kawaguchiko', 125:'Kawaguchiko',
    98:'Lake Saiko', 133:'Lake Saiko',
    54:'Fujiyoshida', 114:'Fujiyoshida', 134:'Fujiyoshida',
    52:'Fujinomiya', 97:'Fujinomiya',
    55:'Oshino', 115:'Yamanakako',

    // IZU
    56:'Ito', 57:'Ito', 103:'Ito', 104:'Ito', 117:'Ito',
    58:'Shuzenji', 123:'Shuzenji', 124:'Shuzenji',
    122:'Kawazu', 60:'Numazu',
};
function getArea(p) { return p.area || PLACE_AREAS[p.id] || ''; }

const PLACE_VENUE = {
    // indoor places
    1:'indoor',2:'indoor',3:'indoor',4:'indoor',7:'indoor',8:'indoor',9:'indoor',10:'indoor',
    11:'indoor',12:'indoor',14:'indoor',17:'indoor',18:'indoor',19:'indoor',20:'indoor',
    21:'indoor',22:'indoor',23:'indoor',24:'indoor',25:'indoor',29:'indoor',30:'indoor',
    31:'indoor',34:'indoor',35:'indoor',36:'indoor',37:'indoor',38:'indoor',39:'indoor',
    41:'indoor',42:'indoor',43:'indoor',44:'indoor',45:'indoor',47:'indoor',48:'indoor',
    49:'indoor',61:'indoor',62:'indoor',64:'indoor',65:'indoor',67:'indoor',68:'indoor',
    69:'indoor',70:'indoor',71:'indoor',72:'indoor',78:'indoor',79:'indoor',85:'indoor',
    86:'indoor',91:'indoor',96:'indoor',100:'indoor',101:'indoor',102:'indoor',107:'indoor',
    108:'indoor',109:'indoor',110:'indoor',113:'indoor',118:'indoor',120:'indoor',125:'indoor',
    127:'indoor',129:'indoor',130:'indoor',131:'indoor',
    // outdoor places
    5:'outdoor',6:'outdoor',13:'outdoor',15:'outdoor',26:'outdoor',27:'outdoor',28:'outdoor',
    33:'outdoor',40:'outdoor',50:'outdoor',51:'outdoor',52:'outdoor',53:'outdoor',54:'outdoor',
    55:'outdoor',56:'outdoor',57:'outdoor',58:'outdoor',59:'outdoor',60:'outdoor',66:'outdoor',
    73:'outdoor',74:'outdoor',75:'outdoor',76:'outdoor',77:'outdoor',80:'outdoor',81:'outdoor',
    82:'outdoor',83:'outdoor',84:'outdoor',87:'outdoor',88:'outdoor',89:'outdoor',90:'outdoor',
    92:'outdoor',93:'outdoor',94:'outdoor',95:'outdoor',97:'outdoor',98:'outdoor',99:'outdoor',
    103:'outdoor',104:'outdoor',105:'outdoor',106:'outdoor',111:'outdoor',112:'outdoor',
    114:'outdoor',115:'outdoor',116:'outdoor',117:'outdoor',119:'outdoor',122:'outdoor',
    123:'outdoor',124:'outdoor',126:'outdoor',128:'outdoor',132:'outdoor',133:'outdoor',
    134:'outdoor',135:'outdoor',
    // both (indoor option available)
    16:'both',32:'both',46:'both',63:'both',
};
function getVenue(p) { return p.venue || PLACE_VENUE[p.id] || ''; }

// ── TOAST NOTIFICATIONS ──
function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { success:'✓', error:'✕', info:'ℹ', warn:'⚠' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type]||icons.info}</span><span class="toast-msg">${esc(message)}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

// ── THEME (Light / Dark) ──
function initTheme() {
    const saved = localStorage.getItem('japan-theme');
    if (saved) {
        applyTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        applyTheme('light');
    } else {
        applyTheme('dark');
    }
}
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
    localStorage.setItem('japan-theme', theme);
}
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
    const styles = getMapStyles();
    if (gmap) gmap.setOptions({ styles });
    Object.values(dayMaps).forEach(m => m.setOptions({ styles }));
}

// ── HELPERS ──
function slugify(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function getPhotoPath(p) {
    if (p.photoUrl) return p.photoUrl;           // runtime-fetched photo (API mode)
    return `photos/${slugify(p.name)}.jpg`;       // baked-in local photo
}
function getDayCity(day) {
    const t = day.title.toLowerCase();
    if (t.includes('kyoto'))  return 'Kyoto';
    if (t.includes('osaka'))  return 'Osaka';
    if (t.includes('nara'))   return 'Nara';
    if (t.includes('fuji'))   return 'Fuji';
    if (t.includes('izu'))    return 'Izu';
    return 'Tokyo';
}
function parseDayTitle(title) {
    const parts = title.split(' — ');
    return { date: parts[0] || title, subtitle: parts.slice(1).join(' — ') || '' };
}
function mapsNavUrl(name, city, lat, lng, address) {
    // Directions — use name+address for best Google resolution
    const dest = address
        ? encodeURIComponent(name + ', ' + address)
        : encodeURIComponent(name + ', ' + city + ', Japan');
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=transit`;
}
function mapsSearchUrl(name, city, lat, lng, address) {
    // Drop a pin and show place details — use name+address for Google to find the exact business
    const query = address ? name + ', ' + address : name + ', ' + city + ', Japan';
    return `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=17`;
}
function findPlaceByName(name) {
    if (!name) return null;
    return state.places.find(p => p.name === name)
        || state.places.find(p => p.name.toLowerCase() === name.toLowerCase());
}
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ══════════════════════════════════════════════════════════════
//  DEFAULT DATA (all 135 places, itinerary, todos, packing)
// ══════════════════════════════════════════════════════════════

const DEFAULT_PLACES = [
    { id:1,  name:"Ichiran Ramen",city:"Tokyo",category:"Food",description:"Famous tonkotsu ramen chain with private individual booths. Customise broth richness, noodle firmness, garlic, scallion and pork. Open 24 hours.",hours:"24 hours",cost:"~¥1,000",address:"B1 Peace Bldg, 3-34-11 Shinjuku, Shinjuku-ku, Tokyo",lat:35.6919,lng:139.7043,notes:"Cash OK, card OK",url:"https://en.ichiran.com/shop/tokyo/shinjuku/" },
    { id:2,  name:"Bar Centifolia",city:"Tokyo",category:"Food",description:"Upscale cocktail bar in Ginza known for refined atmosphere and creative cocktails. Reservation recommended.",hours:"18:00 – 02:00",cost:"¥¥¥",address:"Ginza, Chuo City, Tokyo",lat:35.6713,lng:139.7642,notes:"Smart casual dress code" },
    { id:3,  name:"Hello Donuts",city:"Tokyo",category:"Food",description:"Cute donut shop serving colourful, Instagram-worthy mochi donuts and classic varieties.",hours:"11:00 – 22:00",cost:"~¥400–800",address:"Shibuya, Tokyo",lat:35.6595,lng:139.6983,notes:"Credit card accepted" },
    { id:4,  name:"Godaime Hanayama Udon Nihonbashi",city:"Tokyo",category:"Food",description:"Popular udon restaurant in Nihonbashi serving thick, chewy handmade noodles.",hours:"11:00 – 15:00, 17:00 – 20:00",cost:"~¥1,000–1,500",address:"Nihonbashi, Chuo City, Tokyo",lat:35.6838,lng:139.7740,notes:"Credit card accepted" },
    { id:5,  name:"Ippuku & Matcha",city:"Tokyo",category:"Food",description:"Cozy matcha cafe near Senso-ji serving premium matcha lattes, desserts and traditional tea.",hours:"11:00 – 18:00",cost:"~¥500–1,200",address:"Asakusa, Taito City, Tokyo",lat:35.7138,lng:139.7940,notes:"Cash preferred" },
    { id:6,  name:"Asakusaimahan Kinrakuei",city:"Tokyo",category:"Food",description:"Historic sukiyaki and wagyu beef restaurant in Asakusa, serving premium marbled beef since 1895.",hours:"11:00 – 22:00",cost:"~¥3,000–8,000",address:"2-17-10 Nishi-Asakusa, Taito City, Tokyo",lat:35.7133,lng:139.7912,notes:"Reservations recommended. Credit card accepted." },
    { id:7,  name:"Tofu Cuisine Sorano Shibuya",city:"Tokyo",category:"Food",description:"Elegant tofu-focused restaurant serving luxurious multi-course tofu kaiseki meals.",hours:"15:00 – 22:00",cost:"~¥3,000–6,000",address:"Shibuya, Shibuya City, Tokyo",lat:35.6585,lng:139.6975,notes:"Credit card accepted" },
    { id:8,  name:"Udon Maruka",city:"Tokyo",category:"Food",description:"Popular Sanuki-style udon shop near Ginza. Famous for silky handmade noodles and rich broth.",hours:"11:00 – 14:30",cost:"~¥800–1,200",address:"Ginza, Chuo City, Tokyo",lat:35.6683,lng:139.7561,notes:"Closed Sundays. Cash preferred." },
    { id:9,  name:"2D Cafe",city:"Tokyo",category:"Food",description:"Unique cafe designed to look like a black-and-white manga drawing. Drinks and desserts in 2D-style tableware.",hours:"11:00 – 22:00",cost:"~¥800–1,500",address:"Shin-Okubo, Shinjuku City, Tokyo",lat:35.7009,lng:139.7005,notes:"Credit card accepted" },
    { id:10, name:"NAMU CAFE",city:"Tokyo",category:"Food",description:"Korean-Japanese fusion cafe in Shibuya with aesthetic interior and specialty lattes.",hours:"11:00 – 20:00",cost:"~¥600–1,200",address:"Shibuya, Tokyo",lat:35.6595,lng:139.6950,notes:"Credit card accepted" },
    { id:11, name:"CAFE REISSUE",city:"Tokyo",category:"Food",description:"Famous for incredible latte art — baristas draw detailed portraits on your coffee.",hours:"10:00 – 19:00",cost:"~¥800–1,500",address:"Shibuya, Tokyo",lat:35.6612,lng:139.6980,notes:"Closed Mondays" },
    { id:12, name:"Bakery Bank",city:"Tokyo",category:"Food",description:"Artisan bakery and cafe known for signature curry buns and freshly baked bread.",hours:"08:00 – 18:00",cost:"~¥300–800",address:"Tokyo Station area, Tokyo",lat:35.6812,lng:139.7671,notes:"Closed Wednesdays" },
    { id:13, name:"Ikeda-ya TeaStore",city:"Tokyo",category:"Food",description:"Traditional matcha shop offering premium Japanese green tea and matcha products.",hours:"10:00 – 19:00",cost:"~¥500–2,000",address:"Asakusa, Taito City, Tokyo",lat:35.7125,lng:139.7950 },
    { id:14, name:"Shinjuku Shokudo",city:"Tokyo",category:"Food",description:"Bustling late-night eatery near Shinjuku Station — ramen, gyoza, rice bowls.",hours:"09:00 – 02:00",cost:"~¥700–1,500",address:"Shinjuku, Tokyo",lat:35.6896,lng:139.7006,notes:"Everyday. Cash OK." },
    { id:15, name:"Unitora Nakadori (Tsukiji)",city:"Tokyo",category:"Food",description:"Popular udon stall at Tsukiji Outer Market serving fresh handmade udon with dashi broth.",hours:"07:00 – 18:00",cost:"~¥500–1,000",address:"Tsukiji Outer Market, Chuo City, Tokyo",lat:35.6654,lng:139.7707,notes:"Cash only. Get there early." },
    { id:16, name:"Tokyo Ramen Street",city:"Tokyo",category:"Food",description:"Ramen alley inside Tokyo Station with multiple acclaimed shops — try different regional styles.",hours:"07:30 – 23:00",cost:"~¥900–1,500",address:"Tokyo Ramen Street, Tokyo Station, Chiyoda, Tokyo",lat:35.6812,lng:139.7669,notes:"Multiple shops" },
    { id:17, name:"Kakigoya by the Sea",city:"Tokyo",category:"Food",description:"Seasonal oyster restaurant serving fresh grilled oysters. Reservation recommended in winter.",hours:"17:00 – 22:00",cost:"~¥3,000–5,000",address:"Shibuya, Tokyo",lat:35.6562,lng:139.6980 },
    { id:18, name:"GU",city:"Tokyo",category:"Shopping",description:"Uniqlo's trendy sister brand offering affordable casual fashion. Multiple floors in the Ginza flagship.",hours:"11:00 – 21:00",cost:"¥¥",address:"5 Chome-7-7 Ginza, Chuo City, Tokyo 104-0061",lat:35.6697,lng:139.7638,notes:"Near Uniqlo Ginza" },
    { id:19, name:"Shibuya 109",city:"Tokyo",category:"Shopping",description:"Iconic cylindrical fashion building — 10 floors of trendy Japanese pop fashion, streetwear and accessories.",hours:"10:00 – 21:00",cost:"¥–¥¥",address:"2-29-1 Dogenzaka, Shibuya City, Tokyo 150-0043",lat:35.6593,lng:139.6983 },
    { id:20, name:"Uniqlo Ginza",city:"Tokyo",category:"Shopping",description:"World's largest Uniqlo flagship — 12 floors of clothing. Connected to GU. Automatic self-checkout.",hours:"11:00 – 21:00",cost:"¥–¥¥",address:"6-9-5 Ginza, Chuo City, Tokyo 104-0061",lat:35.6706,lng:139.7649,notes:"12 floors!" },
    { id:21, name:"LOFT",city:"Tokyo",category:"Shopping",description:"Japanese lifestyle store — stationery, home goods, beauty, travel accessories and unique gifts.",hours:"11:00 – 21:00",cost:"¥–¥¥",address:"21-1 Udagawacho, Shibuya City, Tokyo",lat:35.6620,lng:139.6985,notes:"Great for souvenirs" },
    { id:22, name:"Animate Ikebukuro",city:"Tokyo",category:"Shopping",description:"World's largest anime store — 9 floors of manga, anime figures, merchandise, CDs and doujinshi.",hours:"11:00 – 20:00",cost:"¥–¥¥¥",address:"1-20-7 Higashi-Ikebukuro, Toshima City, Tokyo",lat:35.7295,lng:139.7188,notes:"Anime paradise" },
    { id:23, name:"Takeshita Street",city:"Tokyo",category:"Shopping",description:"Harajuku's famous pedestrian shopping street — colourful fashion boutiques, crepe stands, quirky shops.",hours:"10:00 – 20:00",cost:"¥–¥¥",address:"Takeshita-dori, Jingumae, Shibuya City, Tokyo",lat:35.6702,lng:139.7027,notes:"Crowded on weekends" },
    { id:24, name:"Tokyo Character Street",city:"Tokyo",category:"Shopping",description:"Underground area in Tokyo Station with official stores for Pokémon, Ghibli, Sanrio, etc.",hours:"10:00 – 20:30",cost:"¥–¥¥",address:"First Avenue Tokyo Station B1, Chiyoda, Tokyo",lat:35.6809,lng:139.7673,notes:"Inside Tokyo Station" },
    { id:25, name:"WOMB",city:"Tokyo",category:"Entertainment",description:"Famous nightclub in Shibuya with multiple floors, massive sound system and international DJ events.",hours:"23:00 – 05:00 (event nights)",cost:"~¥2,500–4,000 entry",address:"2-16 Maruyamacho, Shibuya City, Tokyo",lat:35.6563,lng:139.6959 },
    { id:26, name:"Senso-ji Temple",city:"Tokyo",category:"Attractions",description:"Tokyo's oldest Buddhist temple (645 AD) in Asakusa. Iconic Kaminarimon gate with giant red lantern.",hours:"Main hall 06:00 – 17:00, grounds 24h",cost:"Free",address:"2-3-1 Asakusa, Taito City, Tokyo 111-0032",lat:35.7148,lng:139.7967,notes:"Visit early morning to avoid crowds" },
    { id:27, name:"Nakamise Shopping Street",city:"Tokyo",category:"Attractions",description:"Historic 250m shopping street leading to Senso-ji — traditional snacks, souvenirs and crafts since Edo period.",hours:"10:00 – 17:00",cost:"Free to walk",address:"Nakamise-dori, Asakusa, Taito City, Tokyo",lat:35.7120,lng:139.7955,notes:"Try melon pan and ningyo-yaki" },
    { id:28, name:"Tokyo Skytree",city:"Tokyo",category:"Attractions",description:"Japan's tallest structure at 634m with two observation decks (350m and 450m). Panoramic views of Tokyo and Mt. Fuji.",hours:"10:00 – 21:00",cost:"¥2,100–3,400",address:"1-1-2 Oshiage, Sumida City, Tokyo 131-0045",lat:35.7101,lng:139.8107,notes:"Book online to skip queues" },
    { id:29, name:"Meiji Shrine",city:"Tokyo",category:"Attractions",description:"Major Shinto shrine in a 170-acre forested park near Harajuku. Dedicated to Emperor Meiji. Serene atmosphere.",hours:"Sunrise – Sunset",cost:"Free",address:"1-1 Yoyogikamizonocho, Shibuya City, Tokyo 151-8557",lat:35.6764,lng:139.6993 },
    { id:30, name:"Shibuya Crossing",city:"Tokyo",category:"Attractions",description:"The world's busiest pedestrian scramble crossing — up to 3,000 people cross at once.",hours:"24 hours",cost:"Free",address:"Shibuya Scramble Crossing, Shibuya City, Tokyo",lat:35.6595,lng:139.7004,notes:"Most impressive at night" },
    { id:31, name:"Shibuya Sky",city:"Tokyo",category:"Attractions",description:"Open-air rooftop observation deck on the 46th floor of Scramble Square (229m). 360° panoramic views.",hours:"10:00 – 22:30",cost:"¥2,500",address:"2-24-12 Shibuya, Shibuya City, Tokyo 150-0002",lat:35.6584,lng:139.7022,notes:"Book timed tickets online. Sunset popular.",url:"https://www.shibuya-scramble-square.com/sky/" },
    { id:32, name:"Tokyo Tower",city:"Tokyo",category:"Attractions",description:"Iconic 333m tower. Two observation decks at 150m and 250m. Beautiful orange illumination at night.",hours:"09:00 – 22:30",cost:"¥1,200–2,800",address:"4-2-8 Shibakoen, Minato City, Tokyo 105-0011",lat:35.6586,lng:139.7454,notes:"Night views recommended" },
    { id:33, name:"Tokyo DisneySea",city:"Tokyo",category:"Attractions",description:"Unique nautical-themed Disney park — only in Japan. Seven themed ports and world-class rides. Plan a full day.",hours:"08:00 – 22:00 (varies)",cost:"¥7,900–10,900",address:"1-13 Maihama, Urayasu, Chiba 279-0031",lat:35.6267,lng:139.8850,notes:"Buy tickets online. Weekdays less crowded.",url:"https://www.tokyodisneyresort.jp/en/tds/" },
    { id:34, name:"teamLab Borderless",city:"Tokyo",category:"Attractions",description:"Immersive digital art museum with 70+ interactive installations that flow between rooms. Now at Azabudai Hills.",hours:"10:00 – 21:00",cost:"¥3,800",address:"Azabudai Hills Garden Plaza B, B1, Toranomon, Minato, Tokyo",lat:35.6608,lng:139.7381,notes:"Book timed tickets weeks in advance.",url:"https://www.teamlab.art/e/borderless-azabudai/" },
    { id:35, name:"Tokyo Metropolitan Gov. Building",city:"Tokyo",category:"Attractions",description:"Free observation decks on the 45th floor (202m) of the Shinjuku government building. Stunning night views.",hours:"09:30 – 23:00",cost:"Free",address:"2-8-1 Nishi-Shinjuku, Shinjuku City, Tokyo",lat:35.6896,lng:139.6922,notes:"Free!" },
    { id:36, name:"Shiba Park",city:"Tokyo",category:"Attractions",description:"One of Japan's oldest parks with beautiful views of Tokyo Tower. Cherry blossoms in spring.",hours:"24 hours",cost:"Free",address:"Shibakoen, Minato City, Tokyo",lat:35.6545,lng:139.7487 },
    { id:37, name:"Suga Jinja (Your Name Shrine)",city:"Tokyo",category:"Attractions",description:"The famous staircase shrine from the anime film 'Your Name' (Kimi no Na wa). Iconic pilgrimage spot.",hours:"24 hours",cost:"Free",address:"5 Suganomachi, Shinjuku City, Tokyo",lat:35.6911,lng:139.7190 },
    { id:38, name:"Miyashita Park",city:"Tokyo",category:"Attractions",description:"Rooftop park above Shibuya with shopping complex — stores, restaurants and a rooftop skate park.",hours:"Park 08:00 – 23:00, Shops 11:00 – 21:00",cost:"Free (park)",address:"6-20-10 Jingumae, Shibuya City, Tokyo",lat:35.6615,lng:139.6990 },
    { id:39, name:"Shelter Shimokitazawa",city:"Tokyo",category:"Entertainment",description:"Legendary underground live music venue — indie rock, punk and alternative bands since 1991.",hours:"Varies by event",cost:"~¥2,000–4,000",address:"2-6-10 Kitazawa, Setagaya City, Tokyo",lat:35.6612,lng:139.6685 },
    { id:40, name:"PokéPark Kanto",city:"Tokyo",category:"Entertainment",description:"Pokémon-themed amusement area with rides, games and character meet-and-greets.",hours:"10:00 – 20:00",cost:"¥¥",address:"LaLaPort Toyosu, 2-4-9 Toyosu, Koto City, Tokyo",lat:35.6280,lng:139.8810 },
    { id:41, name:"Shinjuku Golden Gai",city:"Tokyo",category:"Entertainment",description:"Network of 6 narrow alleys with 200+ tiny bars, each seating 5–10 people. Eclectic themed bars.",hours:"19:00 – late",cost:"¥500–1,500/drink",address:"1-1 Kabukicho, Shinjuku City, Tokyo",lat:35.6938,lng:139.7048,notes:"Some bars charge cover ¥300–1,000" },
    { id:42, name:"Omoide Yokocho",city:"Tokyo",category:"Entertainment",description:"'Memory Lane' — atmospheric alley of tiny yakitori bars near Shinjuku Station. Post-war nostalgia.",hours:"17:00 – 00:00",cost:"~¥500–2,000",address:"1-2 Nishi-Shinjuku, Shinjuku City, Tokyo",lat:35.6930,lng:139.6987,notes:"Cash only" },
    { id:43, name:"Shibuya Parco",city:"Tokyo",category:"Entertainment",description:"Modern mall with fashion, galleries, Nintendo TOKYO store, Pokémon Center, cinema and rooftop.",hours:"11:00 – 21:00",cost:"Free entry",address:"15-1 Udagawacho, Shibuya City, Tokyo",lat:35.6618,lng:139.6979,notes:"Nintendo TOKYO on 6F!" },
    { id:44, name:"Round One Ikebukuro",city:"Tokyo",category:"Entertainment",description:"Massive entertainment complex — bowling, arcade, karaoke, billiards, darts, batting cages.",hours:"10:00 – 06:00",cost:"Varies",address:"1-10 Higashi-Ikebukuro, Toshima City, Tokyo",lat:35.7297,lng:139.7115 },
    { id:45, name:"Kazu Plaza Hotel Tokyo",city:"Tokyo",category:"Hotel",description:"Well-located hotel with comfortable rooms and good transportation access.",hours:"Check-in 15:00 / Check-out 11:00",cost:"¥¥",address:"Nakano / West Tokyo area",lat:35.6762,lng:139.6503 },
    { id:46, name:"Osaka Castle",city:"Osaka",category:"Attractions",description:"Iconic 16th-century castle and symbol of Osaka. 8-floor museum with panoramic city views from the top.",hours:"09:00 – 17:00",cost:"¥600",address:"1-1 Osakajo, Chuo Ward, Osaka 540-0002",lat:34.6873,lng:135.5262,notes:"Cherry blossoms in spring" },
    { id:47, name:"Maashiko Ozumi Paris",city:"Osaka",category:"Food",description:"Popular Osaka eatery serving French-Japanese fusion pastries and brunch.",hours:"10:00 – 18:00",cost:"~¥800–1,500",address:"Namba Parks, 2-10-70 Nambanaka, Naniwa Ward, Osaka",lat:34.6655,lng:135.5020 },
    { id:48, name:"Unagi Kushiyaki Idume",city:"Osaka",category:"Food",description:"Specialty grilled eel (unagi) kushiyaki restaurant — fresh charcoal-grilled eel skewers with tare sauce.",hours:"11:00 – 21:00",cost:"~¥1,500–3,000",address:"2-3-17 Sennichimae, Chuo Ward, Osaka",lat:34.6685,lng:135.5013,notes:"tabelog.com rated" },
    { id:49, name:"Riceball Gori-chan Namba",city:"Osaka",category:"Food",description:"Beloved onigiri shop in Namba — freshly made with premium rice and creative fillings.",hours:"11:00 – 20:00",cost:"~¥200–500",address:"2-3-34 Namba, Chuo Ward, Osaka",lat:34.6627,lng:135.5014,notes:"Quick, cheap, delicious" },
    { id:50, name:"Fushimi Inari Taisha",city:"Kyoto",category:"Attractions",description:"Thousands of vermillion torii gates forming tunnels up Mount Inari. Full hike ~2-3 hours. Iconic.",hours:"24 hours",cost:"Free",address:"68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto 612-0882",lat:34.9671,lng:135.7727,notes:"Go early morning to avoid crowds" },
    { id:51, name:"ASAKUSA SUMO CLUB",city:"Tokyo",category:"Entertainment",description:"Experience sumo firsthand — watch practice, learn rules, try sumo moves with retired wrestlers.",hours:"By reservation",cost:"~¥8,000–12,000",address:"Asakusa, Taito City, Tokyo",lat:35.7155,lng:139.7960,url:"https://asakusasumoclub.com/" },
    { id:52, name:"Mt. Fuji 5th Station (Fujinomiya)",city:"Fuji",category:"Attractions",description:"The most popular starting point for climbing Mt. Fuji at 2,400m elevation. Stunning views even without climbing.",hours:"Jul–Sep (climbing season)",cost:"¥1,000 conservation fee",address:"Fujinomiya 5th Station, Fujinomiya, Shizuoka",lat:35.3378,lng:138.7350,notes:"Bus from Shin-Fuji or Fujinomiya Station." },
    { id:53, name:"Fuji Five Lakes (Kawaguchiko)",city:"Fuji",category:"Attractions",description:"Lake Kawaguchiko is the most accessible of the five lakes at the base of Mt. Fuji. Iconic reflections.",hours:"24 hours",cost:"Free (area)",address:"Kawaguchiko, Fujikawaguchiko, Minamitsuru, Yamanashi",lat:35.5161,lng:138.7519,notes:"Take Fuji Excursion train from Shinjuku (~2hrs)" },
    { id:54, name:"Chureito Pagoda",city:"Fuji",category:"Attractions",description:"Iconic five-story red pagoda with Mt. Fuji in the background — one of Japan's most photographed spots. 398 steps up.",hours:"24 hours",cost:"Free",address:"Arakurayama Sengen Park, 3353-1 Shimoyoshida, Fujiyoshida, Yamanashi",lat:35.4982,lng:138.8092,notes:"Best at sunrise." },
    { id:55, name:"Oshino Hakkai",city:"Fuji",category:"Attractions",description:"Eight crystal-clear spring water ponds fed by snowmelt from Mt. Fuji. Traditional thatched-roof farmhouses.",hours:"09:00 – 17:00",cost:"¥300",address:"Oshino Hakkai, Oshino, Minamitsuru, Yamanashi",lat:35.4627,lng:138.8355 },
    { id:56, name:"Ito Onsen",city:"Izu",category:"Onsen",description:"Charming seaside hot spring town on the Izu Peninsula. Ocean-view onsen baths, fresh seafood.",hours:"Varies by ryokan/onsen",cost:"¥500–2,000 (public baths)",address:"Ito, Shizuoka Prefecture",lat:34.9657,lng:139.0986,notes:"1.5 hrs from Tokyo by train." },
    { id:57, name:"Jogasaki Coast",city:"Izu",category:"Attractions",description:"Dramatic volcanic coastline near Ito with rugged cliffs, a famous suspension bridge (48m high) and sea caves.",hours:"24 hours",cost:"Free",address:"Jogasaki Coast, Ito, Shizuoka",lat:34.9020,lng:139.1290,notes:"2-3 hr walking trail." },
    { id:58, name:"Shuzenji Onsen",city:"Izu",category:"Onsen",description:"One of the oldest hot spring towns in Izu. Bamboo groves, a historic temple, red bridges over the Katsura River.",hours:"24 hours (town)",cost:"¥350–1,500 (public baths)",address:"Shuzenji, Izu, Shizuoka",lat:34.9739,lng:138.9332 },
    { id:59, name:"Lake Kawaguchi Music Forest",city:"Fuji",category:"Attractions",description:"European-style museum on Lake Kawaguchi shores. Music boxes, organ concerts with Mt. Fuji views.",hours:"10:00 – 17:00",cost:"¥1,800",address:"3077-20 Kawaguchi, Fujikawaguchiko, Yamanashi",lat:35.5205,lng:138.7670 },
    { id:60, name:"Numazu Fish Market",city:"Izu",category:"Food",description:"Fresh-from-the-ocean seafood market at Numazu Port. Famous for shirasu don, fresh sashimi.",hours:"06:00 – 15:00",cost:"~¥1,000–2,500",address:"Numazu Port, Numazu, Shizuoka",lat:35.0856,lng:138.8573,notes:"Go early for best selection." },
    { id:61, name:"Dotonbori",city:"Osaka",category:"Attractions",description:"Osaka's most famous entertainment district — neon lights, Glico Running Man sign, canal walks and street food.",hours:"24 hours (shops 11:00–23:00)",cost:"Free to walk",address:"Dotonbori, Chuo Ward, Osaka",lat:34.6687,lng:135.5013,notes:"Most iconic at night" },
    { id:62, name:"Tsutenkaku",city:"Osaka",category:"Attractions",description:"Iconic 103m tower in Shinsekai district. Observation deck with city views plus the Billiken lucky god statue.",hours:"10:00 – 20:00",cost:"¥900",address:"1-18-6 Ebisuhigashi, Naniwa Ward, Osaka",lat:34.6526,lng:135.5063 },
    { id:63, name:"Osaka Aquarium Kaiyukan",city:"Osaka",category:"Attractions",description:"One of the world's largest aquariums — 15 tanks representing the Pacific Rim. Star: whale sharks.",hours:"10:00 – 20:00",cost:"¥2,700",address:"1-1-10 Kaigandori, Minato Ward, Osaka",lat:34.6545,lng:135.4290,notes:"Book online" },
    { id:64, name:"Universal Studios Japan",city:"Osaka",category:"Attractions",description:"Major theme park with Super Nintendo World, Harry Potter and more. Plan a full day.",hours:"09:00 – 21:00 (varies)",cost:"¥8,600–9,800",address:"2-1-33 Sakurajima, Konohana Ward, Osaka",lat:34.6654,lng:135.4323,notes:"Buy tickets + Express Pass online.",url:"https://www.usj.co.jp/web/en/us" },
    { id:65, name:"Namba Yasaka Jinja",city:"Osaka",category:"Attractions",description:"Striking shrine with a giant lion head stage (Ema-den) — 12m tall with glowing eyes. Very photogenic.",hours:"24 hours",cost:"Free",address:"2-9-19 Motomachi, Naniwa Ward, Osaka",lat:34.6597,lng:135.4958 },
    { id:66, name:"Sumiyoshi Taisha",city:"Osaka",category:"Attractions",description:"One of Japan's oldest shrines (3rd century) with iconic arched Taikobashi bridge.",hours:"06:00 – 17:00",cost:"Free",address:"2-9-89 Sumiyoshi, Sumiyoshi Ward, Osaka",lat:34.6128,lng:135.4930 },
    { id:67, name:"MEGA Don Quijote Shinsekai",city:"Osaka",category:"Shopping",description:"Massive discount store in Shinsekai — electronics, snacks, cosmetics, souvenirs. Tax-free for tourists.",hours:"24 hours",cost:"¥–¥¥",address:"3-4 Ebisuhigashi, Naniwa Ward, Osaka",lat:34.6517,lng:135.5060,notes:"Tax-free with passport" },
    { id:68, name:"Wagyu Yakiniku Kurono Namba",city:"Osaka",category:"Food",description:"Premium whole-cow wagyu yakiniku in Ura-Namba. High-quality cuts at reasonable prices.",hours:"17:00 – 00:00",cost:"~¥4,000–8,000",address:"Ura-Namba, Chuo Ward, Osaka",lat:34.6648,lng:135.5030,notes:"Reservation recommended" },
    { id:69, name:"Yakiniku Kitan Hozenji",city:"Osaka",category:"Food",description:"Popular yakiniku near Hozenji Temple. Quality wagyu in an atmospheric alley setting.",hours:"17:00 – 23:00",cost:"~¥4,000–7,000",address:"Hozenji Yokocho, Chuo Ward, Osaka",lat:34.6685,lng:135.5028 },
    { id:70, name:"Pokémon Cafe Osaka",city:"Osaka",category:"Food",description:"Official Pokémon-themed cafe — character-shaped meals, themed drinks and exclusive merch.",hours:"10:30 – 22:00",cost:"~¥1,500–2,500",address:"Shinsaibashi PARCO, Chuo Ward, Osaka",lat:34.6723,lng:135.5006,notes:"Book online — sells out fast!" },
    { id:71, name:"Hozen-ji Temple",city:"Osaka",category:"Attractions",description:"Tiny atmospheric temple in a stone-paved alley near Dotonbori. Moss-covered Fudo Myoo statue.",hours:"24 hours",cost:"Free",address:"1-2-16 Namba, Chuo Ward, Osaka",lat:34.6686,lng:135.5026 },
    { id:72, name:"Nakazakicho",city:"Osaka",category:"Attractions",description:"Trendy retro neighbourhood with vintage cafes, indie shops in renovated old wooden houses.",hours:"Varies",cost:"Free to walk",address:"Nakazakicho, Kita Ward, Osaka",lat:34.7071,lng:135.5068,notes:"Great for coffee" },
    { id:73, name:"teamLab Botanical Garden Osaka",city:"Osaka",category:"Attractions",description:"Outdoor digital art transforming the Nagai Botanical Garden at night with interactive light installations.",hours:"18:30 – 21:30",cost:"¥1,600",address:"Nagai Park, Higashisumiyoshi Ward, Osaka",lat:34.6158,lng:135.5176 },
    { id:74, name:"Katsuoji Temple",city:"Osaka",category:"Attractions",description:"Mountain temple famous for thousands of daruma dolls. Beautiful autumn colours.",hours:"08:00 – 17:00",cost:"¥400",address:"2914-1 Kasuganomachi, Minoo, Osaka",lat:34.8670,lng:135.4700,notes:"30 min bus from Minoo Station" },
    { id:75, name:"Kinkaku-ji (Golden Pavilion)",city:"Kyoto",category:"Attractions",description:"Iconic Zen temple covered in gold leaf, reflecting in a mirror pond.",hours:"09:00 – 17:00",cost:"¥500",address:"1 Kinkakujicho, Kita Ward, Kyoto 603-8361",lat:35.0394,lng:135.7292 },
    { id:76, name:"Kiyomizu-dera",city:"Kyoto",category:"Attractions",description:"UNESCO World Heritage hillside temple with famous wooden stage offering panoramic views.",hours:"06:00 – 18:00",cost:"¥400",address:"1-294 Kiyomizu, Higashiyama Ward, Kyoto 605-0862",lat:35.0050,lng:135.7850 },
    { id:77, name:"Arashiyama Bamboo Forest",city:"Kyoto",category:"Attractions",description:"Towering bamboo groves creating a magical tunnel pathway. Best early morning.",hours:"24 hours",cost:"Free",address:"Sagatenryuji, Ukyo Ward, Kyoto",lat:35.0170,lng:135.6713,notes:"Go before 8 AM" },
    { id:78, name:"Nijo Castle",city:"Kyoto",category:"Attractions",description:"UNESCO World Heritage castle (1603). Famous 'nightingale floors' that chirp when walked on.",hours:"08:45 – 17:00",cost:"¥1,030",address:"541 Nijojocho, Nakagyo Ward, Kyoto 604-8301",lat:35.0142,lng:135.7481 },
    { id:79, name:"Nishiki Market",city:"Kyoto",category:"Food",description:"'Kyoto's Kitchen' — 400m covered market with 100+ stalls. Fresh seafood, pickles, matcha sweets, knives.",hours:"10:00 – 18:00",cost:"Free to walk",address:"Nishiki Market, Nakagyo Ward, Kyoto",lat:35.0051,lng:135.7649,notes:"Try dashimaki tamago and yuba" },
    { id:80, name:"Pontocho Alley",city:"Kyoto",category:"Entertainment",description:"Atmospheric narrow stone-paved alley along the Kamo River lined with restaurants and teahouses. Lantern-lit.",hours:"17:00 – 00:00",cost:"Varies",address:"Pontocho, Nakagyo Ward, Kyoto",lat:35.0046,lng:135.7706,notes:"Most atmospheric after dark" },
    { id:81, name:"Yasaka Pagoda (Hokan-ji)",city:"Kyoto",category:"Attractions",description:"Iconic five-story pagoda in Higashiyama — THE classic Kyoto photo spot.",hours:"10:00 – 16:00 (exterior 24h)",cost:"¥400 (interior)",address:"Higashiyama Ward, Kyoto",lat:35.0024,lng:135.7805 },
    { id:82, name:"Tenryu-ji Temple",city:"Kyoto",category:"Attractions",description:"UNESCO World Heritage Zen temple in Arashiyama with finest landscape gardens.",hours:"08:30 – 17:00",cost:"¥500",address:"68 Sagatenryuji, Ukyo Ward, Kyoto",lat:35.0156,lng:135.6746 },
    { id:83, name:"Nanzen-ji Temple",city:"Kyoto",category:"Attractions",description:"Impressive Zen temple with massive Sanmon gate and photogenic brick Suirokaku aqueduct.",hours:"08:40 – 17:00",cost:"¥500",address:"Nanzenji Fukuchicho, Sakyo Ward, Kyoto",lat:35.0113,lng:135.7923 },
    { id:84, name:"Philosopher's Path",city:"Kyoto",category:"Attractions",description:"Scenic 2km stone path along a cherry-tree-lined canal connecting Nanzen-ji to Ginkaku-ji.",hours:"24 hours",cost:"Free",address:"Tetsugaku no Michi, Sakyo Ward, Kyoto",lat:35.0226,lng:135.7939,notes:"Beautiful cherry blossoms" },
    { id:85, name:"Suntory Yamazaki Distillery",city:"Kyoto",category:"Entertainment",description:"Japan's first malt whisky distillery (1923). Tours, tasting rooms and whisky library.",hours:"10:00 – 16:45",cost:"¥1,000 (tour)",address:"5-2-1 Yamazaki, Shimamoto, Osaka (near Kyoto border)",lat:34.8938,lng:135.6773,notes:"Book 3+ months ahead!",url:"https://www.suntory.co.jp/factory/yamazaki/" },
    { id:86, name:"teamLab Biovortex Kyoto",city:"Kyoto",category:"Attractions",description:"Newest teamLab museum — immersive nature-themed digital art installations.",hours:"10:00 – 21:00",cost:"¥2,400",address:"Higashiyama Ward, Kyoto",lat:35.0056,lng:135.7722 },
    { id:87, name:"Hozugawa River Boat Ride",city:"Kyoto",category:"Attractions",description:"Thrilling 16km river boat ride through the Hozu gorge from Kameoka to Arashiyama.",hours:"09:00 – 15:30",cost:"¥4,100",address:"Hozugawa Kudari, Kameoka, Kyoto",lat:35.0122,lng:135.5747,notes:"~2 hour ride. Book in advance." },
    { id:88, name:"Wargo Antique Kimono Rental",city:"Kyoto",category:"Shopping",description:"Rent beautiful antique kimono for a day exploring Kyoto in traditional style.",hours:"09:00 – 18:00",cost:"~¥3,500–8,000",address:"Higashiyama Ward, Kyoto",lat:35.0033,lng:135.7794,notes:"Return by 17:30" },
    { id:89, name:"Kurama Hot Spring",city:"Kyoto",category:"Onsen",description:"Mountain onsen north of Kyoto — outdoor rotenburo baths surrounded by cedar forest.",hours:"10:00 – 21:00",cost:"¥1,000",address:"Kurama Honmachi, Sakyo Ward, Kyoto",lat:35.1179,lng:135.7695,notes:"Eizan Railway from Demachiyanagi" },
    { id:90, name:"Otagi Nenbutsuji Temple",city:"Kyoto",category:"Attractions",description:"Hidden temple in Arashiyama with 1,200 unique carved stone rakan statues — each with a different expression.",hours:"08:00 – 17:00",cost:"¥300",address:"2-5 Sagatorimoto, Ukyo Ward, Kyoto",lat:35.0287,lng:135.6590 },
    { id:91, name:"Hayakawa Hamonoten",city:"Kyoto",category:"Shopping",description:"Traditional Japanese knife shop at Nishiki Market. Handmade kitchen knives — quintessential Kyoto souvenir.",hours:"10:00 – 18:00",cost:"¥¥–¥¥¥",address:"Nishiki Market, Nakagyo Ward, Kyoto",lat:35.0053,lng:135.7645 },
    { id:92, name:"Todai-ji Temple",city:"Nara",category:"Attractions",description:"World's largest wooden building housing a 15m tall bronze Great Buddha. UNESCO World Heritage.",hours:"07:30 – 17:30",cost:"¥600",address:"406-1 Zoshicho, Nara 630-8211",lat:34.6887,lng:135.8398 },
    { id:93, name:"Kasuga Taisha Shrine",city:"Nara",category:"Attractions",description:"Ancient Shinto shrine (768 AD) with thousands of stone and bronze lanterns.",hours:"06:30 – 17:30",cost:"¥500 (inner shrine)",address:"160 Kasuganocho, Nara 630-8212",lat:34.6832,lng:135.8499 },
    { id:94, name:"Isuien Garden",city:"Nara",category:"Attractions",description:"Elegant Meiji-era Japanese garden with borrowed scenery of Todai-ji's roof.",hours:"09:30 – 16:30",cost:"¥650",address:"74 Suimoncho, Nara 630-8208",lat:34.6885,lng:135.8422 },
    { id:95, name:"Nara National Museum",city:"Nara",category:"Attractions",description:"Premier museum for Buddhist art — stunning sculptures, scrolls and temple treasures.",hours:"09:30 – 17:00",cost:"¥700",address:"50 Noboriojicho, Nara 630-8213",lat:34.6851,lng:135.8410 },
    { id:96, name:"Harushika Sake Brewery",city:"Nara",category:"Food",description:"Historic sake brewery offering tastings of 5 varieties for ¥500.",hours:"09:00 – 17:00",cost:"¥500 (tasting)",address:"50-1 Fukuchiincho, Nara",lat:34.6815,lng:135.8360,notes:"Includes souvenir cup" },
    { id:97, name:"Shiraito Falls",city:"Fuji",category:"Attractions",description:"200m-wide curtain waterfall fed by Mt. Fuji snowmelt. UNESCO World Heritage.",hours:"24 hours",cost:"Free",address:"Shiraito Falls, Fujinomiya, Shizuoka",lat:35.3194,lng:138.5870 },
    { id:98, name:"Saiko Iyashi-no-Sato Nemba",city:"Fuji",category:"Attractions",description:"Traditional thatched-roof village on Lake Saiko with craft workshops and Mt. Fuji views.",hours:"09:00 – 17:00",cost:"¥500",address:"2710 Saiko, Fujikawaguchiko, Yamanashi",lat:35.4922,lng:138.6880 },
    { id:99, name:"Lawson Fujikawaguchiko (Fuji View)",city:"Fuji",category:"Attractions",description:"The famous Lawson with a perfect Mt. Fuji backdrop — one of the most photographed spots in Japan.",hours:"24 hours",cost:"Free",address:"Fujikawaguchiko Town Hall, Yamanashi",lat:35.5022,lng:138.7655,notes:"The viral photo spot!" },
    { id:100, name:"Chuomachi Tactical Crafts (Laforet Harajuku)",city:"Tokyo",category:"Shopping",description:"Tactical/military inspired fashion with Japanese twist in Laforet Harajuku.",hours:"11:00 – 20:00",cost:"¥–¥¥",address:"Laforet Harajuku, 1-11-6 Jingumae, Shibuya, Tokyo",lat:35.6696,lng:139.7047 },
    { id:101, name:"Kabukicho",city:"Tokyo",category:"Entertainment",description:"Tokyo's famous entertainment and nightlife district in Shinjuku. Neon streets, arcades, late-night eats.",hours:"24 hours",cost:"Free to walk",address:"Kabukicho, Shinjuku City, Tokyo",lat:35.6949,lng:139.7031,notes:"Lively at night" },
    { id:102, name:"Hotel Niwa Tokyo",city:"Tokyo",category:"Hotel",description:"Modern boutique hotel in Kanda with Japanese garden. Near Tokyo Station and Akihabara.",hours:"Check-in 15:00 / Check-out 11:00",cost:"¥¥",address:"1-1-16 Misaki-cho, Chiyoda, Tokyo",lat:35.6964,lng:139.7579 },
    { id:103, name:"Izu Teddy Bear Museum",city:"Izu",category:"Attractions",description:"Cute museum with antique teddy bears, including Totoro exhibits. Near Ito.",hours:"09:30 – 17:00",cost:"¥1,500",address:"1064-2 Yawatano, Ito, Shizuoka",lat:34.9300,lng:139.1040 },
    { id:104, name:"Izu Granpal Park",city:"Izu",category:"Attractions",description:"Amusement park near Ito with rides and beautiful illuminations at night.",hours:"09:30 – 17:00 (illumination until 21:00)",cost:"¥1,600",address:"1090 Futo, Ito, Shizuoka",lat:34.9228,lng:139.1167 },
    { id:105, name:"Ryoan-ji",city:"Kyoto",category:"Attractions",description:"UNESCO Zen temple famous for its enigmatic rock garden — 15 stones on raked white gravel.",hours:"08:00 – 17:00",cost:"¥500",address:"13 Ryoanji Goryonoshitacho, Ukyo Ward, Kyoto",lat:35.0345,lng:135.7184 },
    { id:106, name:"Shorin-ji Temple",city:"Kyoto",category:"Attractions",description:"Beautiful Rinzai Zen temple near Fushimi Inari. Peaceful garden, fewer tourists.",hours:"09:00 – 16:00",cost:"Free",address:"Fukakusa, Fushimi Ward, Kyoto",lat:35.0072,lng:135.7704 },
    { id:107, name:"Round1 Stadium Sennichimae",city:"Osaka",category:"Entertainment",description:"Multi-floor entertainment complex in Namba — arcade, bowling, karaoke, billiards.",hours:"10:00 – 06:00",cost:"~¥500–3,000",address:"Sennichimae, Chuo Ward, Osaka",lat:34.6636,lng:135.5047 },
    { id:108, name:"Kitan Hibiki",city:"Osaka",category:"Food",description:"Upscale yakiniku — premium wagyu in an intimate setting. Part of the Kitan restaurant group.",hours:"17:00 – 23:00",cost:"~¥5,000–10,000",address:"Namba, Chuo Ward, Osaka",lat:34.6670,lng:135.5028,notes:"Reservation recommended" },
    { id:109, name:"TORCH TORCH Shinsaibashi PARCO",city:"Osaka",category:"Shopping",description:"Jewellery brand inspired by Dark Souls, Bloodborne and other games. Handcrafted rings.",hours:"10:00 – 20:00",cost:"¥¥¥",address:"Shinsaibashi PARCO, Chuo Ward, Osaka",lat:34.6723,lng:135.5006 },
    { id:110, name:"Ikoma Sanjo Amusement Park",city:"Osaka",category:"Attractions",description:"Retro hilltop amusement park on Mt. Ikoma. Old-school rides with panoramic views.",hours:"10:00 – 17:00",cost:"Free entry (rides ¥300–500)",address:"Mt. Ikoma, Ikoma, Nara",lat:34.6785,lng:135.6793,notes:"Cable car ride up" },
    { id:111, name:"Yoshikien Garden",city:"Nara",category:"Attractions",description:"Three adjacent gardens near Todai-ji. Free for foreign tourists with passport.",hours:"09:00 – 17:00",cost:"Free (foreigners)",address:"Noboriojicho, Nara 630-8213",lat:34.6886,lng:135.8418,notes:"Show passport" },
    { id:112, name:"Ukimido Pavilion",city:"Nara",category:"Attractions",description:"Elegant hexagonal floating pavilion on Sagi-ike Pond. Beautiful reflections at dawn.",hours:"24 hours",cost:"Free",address:"Nara Park, Nara 630-8213",lat:34.6843,lng:135.8458 },
    { id:113, name:"Meoto Daikokusha",city:"Nara",category:"Attractions",description:"Small shrine for married couple deities — popular for love and marriage blessings.",hours:"09:00 – 17:00",cost:"Free",address:"Naramachi, Nara",lat:34.6796,lng:135.8325 },
    { id:114, name:"Arakurayama Sengen Park",city:"Fuji",category:"Attractions",description:"The park housing Chureito Pagoda. One of the best Mt. Fuji viewpoints in Japan.",hours:"24 hours",cost:"Free",address:"Arakura, Fujiyoshida, Yamanashi",lat:35.3985,lng:138.7987 },
    { id:115, name:"Lake Yamanaka",city:"Fuji",category:"Attractions",description:"Largest of the Fuji Five Lakes — water sports, cycling, stunning Fuji reflections.",hours:"24 hours",cost:"Free",address:"Yamanakako, Minamitsuru District, Yamanashi",lat:35.4068,lng:138.8674 },
    { id:116, name:"Fujisan Yume No Ohashi Bridge",city:"Fuji",category:"Attractions",description:"Elegant bridge over Lake Kawaguchi — perfect Mt. Fuji photo frame. Beautiful at sunrise.",hours:"24 hours",cost:"Free",address:"Kawaguchiko, Fujikawaguchiko, Yamanashi",lat:35.5126,lng:138.7588 },
    { id:117, name:"Tsubaki-hana Garden",city:"Izu",category:"Attractions",description:"Tranquil botanical garden with camellia varieties, seasonal flowers and coastal views.",hours:"09:00 – 17:00",cost:"¥500",address:"Ito, Shizuoka",lat:34.8640,lng:139.1265 },
    { id:118, name:"Onigiri Ranma",city:"Kyoto",category:"Food",description:"Artisanal onigiri shop — handcrafted with premium rice and creative fillings.",hours:"08:00 – 15:00",cost:"~¥300–600",address:"20-2 Susukinobabacho, Saga-Tenryuji, Ukyo Ward, Kyoto (Arashiyama)",lat:35.0164,lng:135.6718,notes:"Popular — may have queues" },
    { id:119, name:"Hokoku Shrine",city:"Osaka",category:"Attractions",description:"Grand Shinto shrine in Osaka Castle Park dedicated to Toyotomi Hideyoshi.",hours:"06:00 – 17:00",cost:"Free",address:"Osaka Castle Park, Chuo Ward, Osaka",lat:34.6865,lng:135.5264 },
    { id:120, name:"Shijo Kawaramachi Onsen Sora Niwa Terrace Kyoto",city:"Kyoto",category:"Onsen",description:"Rooftop open-air onsen in the heart of Kyoto's Shijo Kawaramachi shopping district. City views from the terrace baths.",hours:"06:00 – 00:00",cost:"~¥1,500–2,500",address:"Shijo Kawaramachi, Shimogyo Ward, Kyoto 600-8002",lat:35.0037,lng:135.7688,notes:"Towel rental available. Great after a long day walking." },
    { id:121, name:"Keio Plaza Hotel Tokyo",city:"Tokyo",category:"Hotel",description:"Grand luxury hotel in Shinjuku with panoramic views, multiple restaurants and excellent transport access.",hours:"Check-in 14:00 / Check-out 11:00",cost:"¥¥¥",address:"2-2-1 Nishi-Shinjuku, Shinjuku City, Tokyo 160-8330",lat:35.6933,lng:139.6917,notes:"Direct access to Shinjuku Station west exit." },
    { id:122, name:"Amagiso",city:"Izu",category:"Onsen",description:"Famous riverside onsen ryokan in Kawazu. Stunning open-air baths perched over the river with waterfall views.",hours:"Check-in 15:00 / Check-out 10:00",cost:"¥¥¥",address:"359-1 Kawazu, Kawazu-cho, Kamo-gun, Shizuoka 413-0501",lat:34.7558,lng:138.9698,notes:"Iconic waterfall-view rotenburo. Book well in advance." },
    { id:123, name:"Ryokufuso",city:"Izu",category:"Hotel",description:"Traditional Japanese ryokan near Shuzenji. Tranquil garden setting with private onsen baths.",hours:"Check-in 15:00 / Check-out 10:00",cost:"¥¥¥",address:"Shuzenji, Izu, Shizuoka",lat:34.9725,lng:138.9340,notes:"Ryokan with kaiseki dinner included." },
    { id:124, name:"Shouhoukaku Kogetsu",city:"Izu",category:"Hotel",description:"Luxury ryokan in Shuzenji Onsen with elegant rooms, private open-air baths and multi-course kaiseki.",hours:"Check-in 15:00 / Check-out 11:00",cost:"¥¥¥",address:"765-2 Shuzenji, Izu, Shizuoka 410-2416",lat:34.9733,lng:138.9348,notes:"One of Shuzenji's finest ryokans." },
    { id:125, name:"Ubuya",city:"Fuji",category:"Hotel",description:"Famous luxury ryokan on Lake Kawaguchi with every room facing Mt. Fuji. Iconic Fuji views from the bath.",hours:"Check-in 15:00 / Check-out 10:00",cost:"¥¥¥",address:"10 Azagawa, Fujikawaguchiko, Minamitsuru, Yamanashi 401-0303",lat:35.5069,lng:138.7509,notes:"Advance booking essential. Unbeatable Mt. Fuji views." },
    { id:126, name:"Unagi Hirokawa",city:"Kyoto",category:"Food",description:"Famous grilled eel restaurant in Arashiyama. Rich charcoal-grilled unagi served over rice.",hours:"11:00 – 20:00",cost:"~¥2,500–4,000",address:"44-1 Sagatenryuji Tsukurimichicho, Ukyo Ward, Kyoto",lat:35.0145,lng:135.6768,notes:"Often long queues — go early." },
    { id:127, name:"Ikasuri Jinja (Zama Shrine)",city:"Osaka",category:"Attractions",description:"One of Osaka's oldest shrines, over 1,800 years old. Known for warding off evil and illness.",hours:"06:00 – 17:00",cost:"Free",address:"2-4-13 Watanabe, Chuo Ward, Osaka 541-0043",lat:34.6839,lng:135.5078 },
    { id:128, name:"Kyoto Arashiyama Onsen Kadensho",city:"Kyoto",category:"Onsen",description:"Hot spring resort in Arashiyama with outdoor baths, sauna and Katsura River views.",hours:"11:00 – 21:00 (day visit)",cost:"~¥1,000–1,500",address:"Sagatenryuji Susukinobabacho, Ukyo Ward, Kyoto 616-8385",lat:35.0122,lng:135.6760,notes:"Great after exploring Arashiyama." },
    { id:129, name:"Fujiya Ryokan",city:"Kyoto",category:"Hotel",description:"Traditional machiya-style ryokan in central Kyoto. Intimate, beautifully restored wooden townhouse.",hours:"Check-in 15:00 / Check-out 10:00",cost:"¥¥¥",address:"Fuyacho, Aneyakoji-dori, Nakagyo Ward, Kyoto 604-8113",lat:35.0082,lng:135.7640,notes:"Small and charming. Book early." },
    { id:130, name:"KANADE",city:"Kyoto",category:"Food",description:"Stylish modern cafe in Higashiyama serving matcha desserts, coffee and light meals in a traditional setting.",hours:"10:00 – 18:00",cost:"~¥800–1,500",address:"Higashiyama Ward, Kyoto",lat:35.0010,lng:135.7782 },
    { id:131, name:"Nihonbashi Nishikawa Daimaru Shinsaibashi",city:"Osaka",category:"Food",description:"Premium Japanese ice cream and bedding brand. Famous for incredibly smooth soft-serve ice cream.",hours:"10:00 – 20:00",cost:"~¥400–800",address:"Daimaru Shinsaibashi, Chuo Ward, Osaka 542-8501",lat:34.6729,lng:135.5010,notes:"Try the signature sleeping pillow ice cream." },
    { id:132, name:"Manyo Botanical Gardens",city:"Nara",category:"Attractions",description:"Beautiful garden in Nara Park featuring plants mentioned in ancient Japanese poetry (Manyoshu).",hours:"09:00 – 16:30",cost:"Free",address:"Kasugano-cho, Nara 630-8212",lat:34.6828,lng:135.8475,notes:"Closed Mondays." },
    { id:133, name:"Saiko Nenba-hama",city:"Fuji",category:"Attractions",description:"Scenic lakeside beach on Lake Saiko with beautiful Mt. Fuji views and clear water. Great for photos.",hours:"24 hours",cost:"Free",address:"Saiko, Fujikawaguchiko, Minamitsuru, Yamanashi",lat:35.4905,lng:138.6898 },
    { id:134, name:"Fuji-Honcho Main Street",city:"Fuji",category:"Attractions",description:"Charming shopping street in Fujiyoshida with Mt. Fuji backdrop. Retro storefronts, local shops and cafes.",hours:"Varies by shop",cost:"Free to walk",address:"Honcho, Fujiyoshida, Yamanashi",lat:35.4875,lng:138.8028,notes:"Great for Fuji photos down the street." },
    { id:135, name:"Sasuke Inari Shrine",city:"Tokyo",category:"Attractions",description:"Hidden hillside shrine in Kamakura with dozens of red torii gates winding through the forest. Mystical atmosphere.",hours:"24 hours",cost:"Free",address:"2-22-12 Sasuke, Kamakura, Kanagawa 248-0017",lat:35.3213,lng:139.5459,notes:"Day trip from Tokyo (~1hr by train)." },
];

const DEFAULT_TODOS = [
    { id:"t1", text:"Book flight tickets", done:true },
    { id:"t2", text:"Book accommodations 1/3", done:false },
    { id:"t3", text:"Create packing list", done:false },
    { id:"t4", text:"Plan travel itinerary", done:false },
    { id:"t5", text:"Make restaurant and attraction reservations", done:false },
    { id:"t6", text:"Purchase transportation passes", done:false },
    { id:"t7", text:"Purchase e-SIM", done:false },
    { id:"t8", text:"Learn basic Japanese phrases", done:false },
];

const DEFAULT_ITINERARY = [
    // TOKYO BLOCK 1 — May 16–18 (Open / Unplanned)
    { id:"d01", title:"May 16 (Fri) — Tokyo: Arrival", items:[] },
    { id:"d02", title:"May 17 (Sat) — Tokyo: Free Day", items:[
        { id:"it1771690169976", time:"", name:"Mt. Fuji 5th Station (Fujinomiya)", desc:"The most popular starting point for climbing Mt. Fuji at 2,400m elevation. Stunning views even without climbing.", visited:false },
    ]},
    { id:"d03", title:"May 18 (Sun) — Tokyo: Free Day", items:[] },

    // FUJI — May 19–20
    { id:"d04", title:"May 19 (Mon) — Fuji Day 1", items:[
        { id:"i14", time:"7 AM", name:"Train to Kawaguchiko", desc:"Fuji Excursion from Shinjuku (~2 hrs direct)", visited:false },
    ]},
    { id:"d05", title:"May 20 (Tue) — Fuji Day 2", items:[] },

    // IZU — May 21
    { id:"d06", title:"May 21 (Wed) — Izu Peninsula", items:[
        { id:"i20", time:"8 AM", name:"Train to Ito", desc:"Odoriko Express from Kawaguchiko/Tokyo (~1.5 hrs)", visited:false },
        { id:"i24", time:"6:30 PM", name:"Return to base", desc:"Train back via Mishima or stay at ryokan", visited:false },
    ]},

    // KYOTO — May 22–25
    { id:"d07", title:"May 22 (Thu) — Travel to Kyoto", items:[
        { id:"it1771698705393", time:"", name:"Shijo Kawaramachi Onsen Sora Niwa Terrace Kyoto", desc:"Rooftop open-air onsen in the heart of Kyoto's Shijo Kawaramachi shopping district. City views from the terrace baths.", visited:false },
        { id:"it1771698901445", time:"", name:"Hayakawa Hamonoten", desc:"Traditional Japanese knife shop at Nishiki Market. Handmade kitchen knives — quintessential Kyoto souvenir.", visited:false },
        { id:"it1772974502014", time:"15:30", name:"Nishiki Market", desc:"'Kyoto\\'s Kitchen' — 400m covered market with 100+ stalls. Fresh seafood, pickles, matcha sweets, knives.", visited:false },
        { id:"it1772974779828", time:"", name:"Kawaramachi Shopping", desc:"Explore Shijo-Kawaramachi area shops", visited:false, isNote:true },
        { id:"it1772974821824", time:"", name:"Miltons Bar", desc:"Cocktail bar plan", visited:false, isNote:true },
    ]},
    { id:"d08", title:"May 23 (Fri) — Kyoto", items:[
        { id:"it1771698618494", time:"8:30", name:"Onigiri Ranma", desc:"Artisanal onigiri shop — handcrafted with premium rice and creative fillings.", visited:false },
        { id:"it1771698602220", time:"9:00", name:"Arashiyama Bamboo Forest", desc:"Towering bamboo groves creating a magical tunnel pathway. Best early morning.", visited:false },
        { id:"it1771698645916", time:"9:30-10:00", name:"Tenryu-ji Temple", desc:"UNESCO World Heritage Zen temple in Arashiyama with finest landscape gardens.", visited:false },
        { id:"it1772975484674", time:"11:20", name:"Saga-toriimoto preserved street", desc:"Walk through the atmospheric Meiji-era preserved street", visited:false, isNote:true },
        { id:"it1771698608280", time:"11:30", name:"Otagi Nenbutsuji Temple", desc:"Hidden temple in Arashiyama with 1,200 unique carved stone rakan statues — each with a different expression.", visited:false },
        { id:"it1771698614817", time:"12:30-13:00", name:"Unagi Hirokawa", desc:"Famous grilled eel restaurant in Arashiyama. Rich charcoal-grilled unagi served over rice.", visited:false },
        { id:"it1773005974632", time:"", name:"Ryoan-ji", desc:"UNESCO Zen temple famous for its enigmatic rock garden — 15 stones on raked white gravel.", visited:false },
        { id:"it1773005969697", time:"", name:"Kinkaku-ji (Golden Pavilion)", desc:"Iconic Zen temple covered in gold leaf, reflecting in a mirror pond.", visited:false },
        { id:"it1772977347037", time:"", name:"Hotel terrace onsen break", desc:"Head back to the hotel for a relaxing onsen session", visited:false, isNote:true },
        { id:"it1771698726545", time:"19:00", name:"Dinner — Kyoto tempura (Gion Horten)", desc:"Tempura dinner in Gion area", visited:false, isNote:true },
        { id:"it1771698741488", time:"22:00", name:"Late night drinks", desc:"Find a bar in the Gion/Pontocho area", visited:false, isNote:true },
    ]},
    { id:"d09", title:"May 24 (Sat) — Kyoto", items:[
        { id:"it1772977699571", time:"8:00", name:"Fushimi Inari Taisha", desc:"Thousands of vermillion torii gates forming tunnels up Mount Inari. Full hike ~2-3 hours. Iconic.", visited:false },
        { id:"it1772977993420", time:"11:30-13:00", name:"Kiyomizu-dera", desc:"UNESCO World Heritage hillside temple with famous wooden stage offering panoramic views.", visited:false },
        { id:"it1772978722604", time:"", name:"Yasaka Pagoda (Hokan-ji)", desc:"Iconic five-story pagoda in Higashiyama — THE classic Kyoto photo spot.", visited:false },
        { id:"it1772978075951", time:"13:00-16:00", name:"Higashiyama walking — Matsubara, Sannenzaka, Ninnenzaka", desc:"Stroll through the traditional lanes connecting Kiyomizu to Yasaka", visited:false, isNote:true },
        { id:"it1772979079407", time:"", name:"Pontocho Alley", desc:"Atmospheric narrow stone-paved alley along the Kamo River lined with restaurants and teahouses. Lantern-lit.", visited:false },
        { id:"it1771698786508", time:"", name:"Gion evening — spot maiko/geisha", desc:"Walk through Gion's Hanamikoji street at dusk to see maiko heading to appointments", visited:false, isNote:true },
        { id:"it1772978628455", time:"", name:"Yasaka Shrine", desc:"Grand vermillion shrine at the east end of Shijo-dori, gateway to Gion", visited:false },
    ]},
    { id:"d10", title:"May 25 (Sun) — Kyoto: Last Day", items:[
        { id:"it1772978862536", time:"", name:"Nanzen-ji Temple", desc:"Impressive Zen temple with massive Sanmon gate and photogenic brick Suirokaku aqueduct.", visited:false },
        { id:"it1772978861442", time:"", name:"Philosopher\\'s Path", desc:"Scenic 2km stone path along a cherry-tree-lined canal connecting Nanzen-ji to Ginkaku-ji.", visited:false },
        { id:"it1772978967968", time:"", name:"Ginkaku-ji (Silver Pavilion)", desc:"Understated Zen temple with exquisite moss garden and sand cone", visited:false },
        { id:"it1772978950844", time:"", name:"Daigo-ji Temple", desc:"UNESCO temple famous for cherry blossoms and a five-story pagoda", visited:false },
        { id:"it1772979053828", time:"", name:"Nijo Castle", desc:"UNESCO World Heritage castle (1603). Famous \\'nightingale floors\\' that chirp when walked on.", visited:false },
        { id:"it1772979040923", time:"", name:"Samurai experience activity", desc:"Try a sword-fighting or samurai dress-up experience", visited:false, isNote:true },
        { id:"it1772979097305", time:"", name:"KANADE", desc:"Stylish modern cafe in Higashiyama serving matcha desserts, coffee and light meals in a traditional setting.", visited:false },
        { id:"it1772979066571", time:"", name:"teamLab Biovortex Kyoto", desc:"Newest teamLab museum — immersive nature-themed digital art installations.", visited:false },
    ]},

    // TRANSITION + OSAKA — May 26–29
    { id:"d11", title:"May 26 (Mon) — Kyoto → Osaka", items:[
        { id:"i45", time:"10 AM", name:"Train Kyoto → Osaka", desc:"JR Special Rapid (~30 min)", visited:false },
        { id:"it1772980109262", time:"", name:"Osaka Castle", desc:"Iconic 16th-century castle and symbol of Osaka. 8-floor museum with panoramic city views from the top.", visited:false },
        { id:"it1772980111520", time:"", name:"Hokoku Shrine", desc:"Grand Shinto shrine in Osaka Castle Park dedicated to Toyotomi Hideyoshi.", visited:false },
        { id:"it1772980129753", time:"", name:"Umeda Sky Building", desc:"Floating Garden Observatory — panoramic city views from the rooftop", visited:false },
        { id:"it1772980145148", time:"", name:"Grand Front Osaka shopping", desc:"Browse shops and grab food at the Grand Front complex near Umeda", visited:false, isNote:true },
        { id:"it1772981946857", time:"", name:"Tsutenkaku", desc:"Iconic 103m tower in Shinsekai district. Observation deck with city views plus the Billiken lucky god statue.", visited:false },
    ]},
    { id:"d12", title:"May 27 (Tue) — Nara Day Trip", items:[
        { id:"i50", time:"9 AM", name:"Train Osaka → Nara", desc:"JR or Kintetsu (~45 min from Namba)", visited:false },
        { id:"it1772979537019", time:"", name:"Isuien Garden", desc:"Elegant Meiji-era Japanese garden with borrowed scenery of Todai-ji\\'s roof.", visited:false },
        { id:"it1772979537920", time:"", name:"Kasuga Taisha Shrine", desc:"Ancient Shinto shrine (768 AD) with thousands of stone and bronze lanterns.", visited:false },
        { id:"it1772979538314", time:"", name:"Manyo Botanical Gardens", desc:"Beautiful garden in Nara Park featuring plants mentioned in ancient Japanese poetry (Manyoshu).", visited:false },
        { id:"it1772979538917", time:"", name:"Nara National Museum", desc:"Premier museum for Buddhist art — stunning sculptures, scrolls and temple treasures.", visited:false },
        { id:"it1772979539344", time:"", name:"Todai-ji Temple", desc:"World\\'s largest wooden building housing a 15m tall bronze Great Buddha. UNESCO World Heritage.", visited:false },
        { id:"it1772979539808", time:"", name:"Ukimido Pavilion", desc:"Elegant hexagonal floating pavilion on Sagi-ike Pond. Beautiful reflections at dawn.", visited:false },
        { id:"it1772979540248", time:"", name:"Yoshikien Garden", desc:"Three adjacent gardens near Todai-ji. Free for foreign tourists with passport.", visited:false },
        { id:"it1772979540772", time:"", name:"Harushika Sake Brewery", desc:"Historic sake brewery offering tastings of 5 varieties for ¥500.", visited:false },
        { id:"it1772979541216", time:"", name:"Meoto Daikokusha", desc:"Small shrine for married couple deities — popular for love and marriage blessings.", visited:false },
        { id:"i50i", time:"2 PM", name:"Return to Osaka", desc:"Train back, evening in Dotonbori", visited:false },
        { id:"it1772981088590", time:"15:00", name:"Kuromon Market", desc:"'Osaka's Kitchen' — fresh seafood, street food, and snacks", visited:false },
        { id:"it1772981167813", time:"", name:"Dotonbori", desc:"Osaka\\'s most famous entertainment district — neon lights, Glico Running Man sign, canal walks and street food.", visited:false },
        { id:"it1772981309316", time:"", name:"Hozen-ji Temple", desc:"Tiny atmospheric temple in a stone-paved alley near Dotonbori. Moss-covered Fudo Myoo statue.", visited:false },
        { id:"it1772981265954", time:"", name:"Wagyu dinner", desc:"Find a great wagyu spot in Namba/Dotonbori area", visited:false, isNote:true },
        { id:"it1772981346001", time:"22:00", name:"Hollow Bar", desc:"Late night cocktails", visited:false, isNote:true },
        { id:"it1772981138261", time:"12:30AM", name:"Round1 Stadium Sennichimae", desc:"Multi-floor entertainment complex in Namba — arcade, bowling, karaoke, billiards.", visited:false },
    ]},
    { id:"d13", title:"May 28 (Wed) — Osaka", items:[
        { id:"it1772981463912", time:"", name:"Universal Studios Japan", desc:"Major theme park with Super Nintendo World, Harry Potter and more. Plan a full day.", visited:false },
    ]},

    // TOKYO BLOCK 2 — May 29 – Jun 2
    { id:"d14", title:"May 29 (Thu) — Osaka → Tokyo", items:[
        { id:"i53", time:"10 AM", name:"Shinkansen to Tokyo", desc:"Bullet train back (~2h30)", visited:false },
    ]},
    { id:"d15", title:"May 30 (Fri) — Tokyo", items:[] },
    { id:"d16", title:"May 31 (Sat) — Tokyo", items:[] },
    { id:"d17", title:"Jun 1 (Sun) — Tokyo: Last Full Day", items:[] },
    { id:"d18", title:"Jun 2 (Mon) — Departure", items:[
        { id:"i69", time:"", name:"Fly home", desc:"Check out, head to Narita/Haneda. Safe travels!", visited:false },
    ]},
];

const DEFAULT_PACKING = [
    { id:"pk1",name:"Sweater",cat:"Clothes",qty:1,notes:"",packed:false },
    { id:"pk2",name:"T-shirt",cat:"Clothes",qty:5,notes:"",packed:false },
    { id:"pk3",name:"Jacket",cat:"Clothes",qty:1,notes:"Rain jacket",packed:false },
    { id:"pk4",name:"Underwear",cat:"Clothes",qty:14,notes:"",packed:false },
    { id:"pk5",name:"Pants",cat:"Clothes",qty:3,notes:"",packed:false },
    { id:"pk6",name:"Socks",cat:"Clothes",qty:7,notes:"",packed:false },
    { id:"pk7",name:"Phone charger",cat:"Electronics",qty:1,notes:"USB-C",packed:false },
    { id:"pk8",name:"Power bank",cat:"Electronics",qty:1,notes:"20,000 mAh",packed:false },
    { id:"pk9",name:"Earbuds",cat:"Electronics",qty:1,notes:"",packed:false },
    { id:"pk10",name:"Passport",cat:"Essentials",qty:1,notes:"Check expiry",packed:false },
    { id:"pk11",name:"Travel insurance docs",cat:"Essentials",qty:1,notes:"",packed:false },
    { id:"pk12",name:"Yen cash",cat:"Essentials",qty:1,notes:"¥50,000+",packed:false },
    { id:"pk13",name:"Toothbrush",cat:"Toiletries",qty:1,notes:"",packed:false },
    { id:"pk14",name:"Sunscreen",cat:"Toiletries",qty:1,notes:"SPF 50",packed:false },
    { id:"pk15",name:"Walking shoes",cat:"Shoes",qty:1,notes:"Comfortable!",packed:false },
    { id:"pk16",name:"Sandals",cat:"Shoes",qty:1,notes:"",packed:false },
    { id:"pk17",name:"Day backpack",cat:"Miscellaneous",qty:1,notes:"Foldable",packed:false },
    { id:"pk18",name:"Umbrella",cat:"Miscellaneous",qty:1,notes:"Compact",packed:false },
];

// ══════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════
let state = { places:[], todos:[], itinerary:[], packing:[], version:DATA_VERSION };
let domReady = false;
let editMode = false;
let currentView = 'dashboard';
let placeFilter = 'all';
let areaFilter = 'all';
let placeSearch = '';
let packingFilter = 'all';
let expandedDays = new Set();
let poolFilter = 'all';
let poolSearch = '';
let poolSortableInstance = null;

// Google Maps state
let gmap = null, gmarkers = [], placesService = null, infoWindow = null, autocompleteWidget = null;
let dayMaps = {}; // cache of day mini-maps

// Photo fetching state (API mode)
let photoQueue = [], isProcessingPhotos = false;

// ══════════════════════════════════════════════════════════════
//  PERSISTENCE
// ══════════════════════════════════════════════════════════════
function loadState() {
    try {
        const raw = localStorage.getItem('japanTripData');
        if (raw) { const s = JSON.parse(raw); if (s.version === DATA_VERSION) { state = s; return; } }
    } catch(e) {}
    state.places = JSON.parse(JSON.stringify(DEFAULT_PLACES));
    state.todos = JSON.parse(JSON.stringify(DEFAULT_TODOS));
    state.itinerary = JSON.parse(JSON.stringify(DEFAULT_ITINERARY));
    state.packing = JSON.parse(JSON.stringify(DEFAULT_PACKING));
    state.version = DATA_VERSION;
    save();
}
function save() { localStorage.setItem('japanTripData', JSON.stringify(state)); }

function exportData() {
    if (!state || !state.places || !state.places.length) {
        showToast('Nothing to export — state is empty. Try refreshing first.', 'error');
        return;
    }
    const totalItems = state.itinerary.reduce((sum, d) => sum + d.items.length, 0);
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `japan-trip-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported: ${state.places.length} places, ${state.itinerary.length} days, ${totalItems} activities.`, 'success');
}

function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let text = e.target.result;
            // Strip BOM and any leading whitespace/garbage
            text = text.replace(/^\uFEFF/, '').trim();
            const imported = JSON.parse(text);
            if (!imported.places || !imported.itinerary) {
                showToast('Invalid file — missing places or itinerary data.', 'error');
                return;
            }
            if (!confirm(`Import ${imported.places.length} places and ${imported.itinerary.length} days? This will replace your current data.`)) return;
            state = imported;
            state.version = DATA_VERSION;
            save();
            renderAll();
            showToast('Import successful!', 'success');
        } catch(err) {
            showToast('Failed to read file: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
const JAPAN_FACTS = [
    'Japan has 5.52 million vending machines — one for every 23 people.',
    'There are more pets than children in Japan.',
    'Trains in Japan are so punctual, delays of even a minute trigger formal apologies.',
    'Japan has over 6,800 islands, but 97% of the population lives on just four.',
    'You can buy square watermelons in Japan — designed to fit in refrigerators.',
    'Japan\'s crime rate is so low that people leave belongings unattended on cafe tables.',
    'Kit-Kat has over 200 flavors in Japan, including wasabi and sake.',
    'The Tokyo subway system carries 8.7 million passengers per day.',
    'Japan has over 30,000 onsen (hot spring) facilities.',
    'There are more deer than people in Nara.',
    'Cherry blossom season lasts only about 2 weeks.',
    'Conveyor belt sushi (kaiten-zushi) was invented in Osaka in 1958.',
];

document.addEventListener('DOMContentLoaded', () => {
    // Loading screen
    const loadEl = document.getElementById('loading-screen');
    const factEl = document.getElementById('loading-fact');
    if (factEl) factEl.textContent = JAPAN_FACTS[Math.floor(Math.random() * JAPAN_FACTS.length)];
    setTimeout(() => {
        if (loadEl) { loadEl.classList.add('fade-out'); setTimeout(() => loadEl.remove(), 600); }
    }, 1200);

    initTheme();
    loadState();
    if (state.itinerary.length) expandedDays.add(state.itinerary[0].id);
    currentView = 'dashboard';
    renderAll();
    bindEvents();
    domReady = true;

    setTimeout(() => {
        if (typeof google === 'undefined' || !google.maps) {
            const fb = document.getElementById('map-fallback');
            const mapEl = document.getElementById('map');
            if (fb) fb.style.display = '';
            if (mapEl) mapEl.style.display = 'none';
        }
    }, 8000);
});

function renderAll() {
    renderDashboard();
    renderTodos();
    renderItinerary();
    renderPlacePool();
    populateDaySelect();
    renderPlaces();
    renderPacking();
    renderHotelCards();
    renderGuide();
    loadPhotosUrl();
}

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
const TRIP_START = new Date(2026, 4, 16); // May 16, 2026
const TRIP_END   = new Date(2026, 5, 2);  // Jun 2, 2026

function renderDashboard() {
    const el = document.getElementById('dashboard-content');
    if (!el) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msPerDay = 86400000;

    // Countdown or "during trip" state
    const daysUntil = Math.ceil((TRIP_START - today) / msPerDay);
    const tripDay = Math.floor((today - TRIP_START) / msPerDay) + 1;
    const isDuring = today >= TRIP_START && today <= TRIP_END;
    const isPast = today > TRIP_END;

    let heroExtra = '';
    if (isDuring) {
        const todayDayObj = state.itinerary[tripDay - 1];
        heroExtra = `<button class="dash-during" onclick="goToToday()">📍 Go to Today — Day ${tripDay}</button>`;
    } else if (isPast) {
        heroExtra = `<div style="color:var(--text-2);font-size:.9rem;margin-top:.5rem">Trip complete! Hope it was amazing 🎌</div>`;
    } else {
        const days = Math.max(0, daysUntil);
        const weeks = Math.floor(days / 7);
        const remDays = days % 7;
        heroExtra = `
            <div class="dash-countdown">
                <div class="dash-cd-unit"><span class="dash-cd-num">${weeks}</span><span class="dash-cd-label">weeks</span></div>
                <div class="dash-cd-unit"><span class="dash-cd-num">${remDays}</span><span class="dash-cd-label">days</span></div>
            </div>`;
    }

    // Stats
    const totalPlaces = state.places.length;
    const totalActivities = state.itinerary.reduce((s, d) => s + d.items.length, 0);
    const visitedCount = state.itinerary.reduce((s, d) => s + d.items.filter(i => i.visited).length, 0);
    const packedCount = state.packing.filter(p => p.packed).length;
    const packedTotal = state.packing.length;
    const packedPct = packedTotal ? Math.round(packedCount / packedTotal * 100) : 0;
    const unaddedCount = getUnaddedPlaces().length;
    const reservedCount = state.places.filter(p => p.reserved).length;
    const citySet = new Set(state.places.map(p => p.city));

    // Mini calendar
    const calHtml = state.itinerary.map((day, idx) => {
        const city = getDayCity(day);
        const cityClass = city.toLowerCase();
        const {date, subtitle} = parseDayTitle(day.title);
        const isToday = isDuring && (idx + 1) === tripDay;
        return `
            <div class="dash-cal-day ${isToday?'today':''}" onclick="switchView('itinerary'); setTimeout(()=>jumpToDay('${day.id}'),100)">
                <div class="dash-cal-num ${cityClass}">${idx+1}</div>
                <div class="dash-cal-label">${esc(date.replace(/^May |^Jun /,''))}${subtitle ? ' · '+esc(subtitle) : ''}</div>
                <span class="dash-cal-count">${day.items.length}</span>
            </div>`;
    }).join('');

    el.innerHTML = `
        <div class="dash-hero">
            <div class="dash-title">Japan 2026</div>
            <div class="dash-subtitle">May 16 – Jun 2 · ${state.itinerary.length} days · ${citySet.size} cities</div>
            ${heroExtra}
        </div>

        <div class="dash-grid">
            <div class="dash-stat" onclick="switchView('places')">
                <span class="dash-stat-icon">📍</span>
                <div class="dash-stat-info">
                    <div class="dash-stat-num">${totalPlaces}</div>
                    <div class="dash-stat-label">Places saved</div>
                </div>
            </div>
            <div class="dash-stat" onclick="switchView('itinerary')">
                <span class="dash-stat-icon">📅</span>
                <div class="dash-stat-info">
                    <div class="dash-stat-num">${totalActivities}</div>
                    <div class="dash-stat-label">Scheduled activities</div>
                </div>
            </div>
            <div class="dash-stat" onclick="switchView('itinerary')">
                <span class="dash-stat-icon">✅</span>
                <div class="dash-stat-info">
                    <div class="dash-stat-num">${visitedCount} / ${totalActivities}</div>
                    <div class="dash-stat-label">Completed</div>
                </div>
            </div>
            <div class="dash-stat" onclick="switchView('packing')">
                <span class="dash-stat-icon">🎒</span>
                <div class="dash-stat-info">
                    <div class="dash-stat-num">${packedPct}%</div>
                    <div class="dash-stat-label">${packedCount}/${packedTotal} packed</div>
                </div>
            </div>
            <div class="dash-stat" onclick="switchView('itinerary')">
                <span class="dash-stat-icon">📌</span>
                <div class="dash-stat-info">
                    <div class="dash-stat-num">${unaddedCount}</div>
                    <div class="dash-stat-label">Unadded places</div>
                </div>
            </div>
            <div class="dash-stat">
                <span class="dash-stat-icon">🎫</span>
                <div class="dash-stat-info">
                    <div class="dash-stat-num">${reservedCount}</div>
                    <div class="dash-stat-label">Reservations made</div>
                </div>
            </div>
        </div>

        <div class="dash-section">
            <div class="dash-section-title">🗓️ Trip Calendar</div>
            <div class="dash-calendar">${calHtml}</div>
        </div>

        <div class="dash-section">
            <div class="dash-section-title">⚡ Quick Access</div>
            <div class="dash-quick-links">
                <div class="dash-link" onclick="switchView('itinerary')">📅 Itinerary</div>
                <div class="dash-link" onclick="switchView('places')">📍 All Places</div>
                <div class="dash-link" onclick="switchView('map')">🗺️ Map View</div>
                <div class="dash-link" onclick="switchView('packing')">🎒 Packing List</div>
                <div class="dash-link" onclick="toggleSidebar()">📥 Export / Import</div>
                <div class="dash-link" onclick="switchView('itinerary')">📌 ${unaddedCount} Unadded Places</div>
            </div>
        </div>
    `;
}

function goToToday() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tripDay = Math.floor((today - TRIP_START) / 86400000);
    if (tripDay >= 0 && tripDay < state.itinerary.length) {
        switchView('itinerary');
        setTimeout(() => jumpToDay(state.itinerary[tripDay].id), 100);
    }
}

// ══════════════════════════════════════════════════════════════
//  GOOGLE MAPS READY
// ══════════════════════════════════════════════════════════════
window.onGoogleMapsReady = function() {
    if (!domReady) {
        document.addEventListener('DOMContentLoaded', () => {
            initMap(); initAutocomplete(); initExpandedDayMaps();
            if (ENABLE_API_PHOTOS) startPhotoFetching();
        });
        return;
    }
    initMap();
    initAutocomplete();
    initExpandedDayMaps();
    if (ENABLE_API_PHOTOS) startPhotoFetching();
};

// ══════════════════════════════════════════════════════════════
//  EVENT BINDING
// ══════════════════════════════════════════════════════════════
function bindEvents() {
    // Nav (top + bottom)
    document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
    document.querySelectorAll('.bottom-tab').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.view === 'more') { toggleSidebar(); return; }
        switchView(b.dataset.view);
    }));
    // Sidebar
    document.getElementById('sidebar-btn').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-backdrop').addEventListener('click', closeSidebar);
    document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    // Edit mode
    document.getElementById('edit-btn').addEventListener('click', toggleEditMode);
    // Day select
    document.getElementById('day-select').addEventListener('change', e => { if (e.target.value) jumpToDay(e.target.value); });
    // Place filters
    document.getElementById('filter-bar').addEventListener('click', e => {
        const c = e.target.closest('.chip'); if (!c) return;
        document.querySelectorAll('#filter-bar .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active'); placeFilter = c.dataset.filter; areaFilter = 'all'; renderPlaces();
    });
    // Place search
    document.getElementById('place-search').addEventListener('input', e => { placeSearch = e.target.value.toLowerCase(); renderPlaces(); });
    // Packing tabs
    document.getElementById('packing-tabs').addEventListener('click', e => {
        const t = e.target.closest('.chip'); if (!t) return;
        document.querySelectorAll('#packing-tabs .chip').forEach(x => x.classList.remove('active'));
        t.classList.add('active'); packingFilter = t.dataset.cat; renderPacking();
    });
    // Buttons
    document.getElementById('add-place-btn').addEventListener('click', () => openPlaceModal());
    document.getElementById('add-day-btn').addEventListener('click', addItineraryDay);
    document.getElementById('add-packing-btn').addEventListener('click', () => openModal('modal-packing'));
    document.getElementById('todo-add-btn').addEventListener('click', addTodo);
    document.getElementById('todo-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
    // Export/Import
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; });
    // Pool filters
    document.getElementById('pool-search').addEventListener('input', e => { poolSearch = e.target.value.toLowerCase(); renderPlacePool(); });
    document.getElementById('pool-city-filter').addEventListener('change', e => { poolFilter = e.target.value; renderPlacePool(); });
    // Guide tabs
    document.getElementById('guide-tabs')?.addEventListener('click', e => {
        const t = e.target.closest('.chip'); if (!t) return;
        document.querySelectorAll('#guide-tabs .chip').forEach(x => x.classList.remove('active'));
        t.classList.add('active'); guideTab = t.dataset.gtab; renderGuide();
    });
    // Map
    document.getElementById('map-fit').addEventListener('click', fitMapToAll);
    document.getElementById('map-filter').addEventListener('change', e => updateMapMarkers(e.target.value));
    // Form submissions
    document.getElementById('place-form').addEventListener('submit', handlePlaceSubmit);
    document.getElementById('itin-form').addEventListener('submit', handleItinItemSubmit);
    document.getElementById('packing-form').addEventListener('submit', handlePackingSubmit);
    // Modal close buttons (data-close attribute)
    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => closeModal(btn.dataset.close));
    });
    // Close modal on backdrop click
    document.querySelectorAll('.modal-overlay').forEach(ov => {
        ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov.id); });
    });
    // Escape key
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
            closeSidebar();
        }
    });
}

// ══════════════════════════════════════════════════════════════
//  VIEW SWITCHING
// ══════════════════════════════════════════════════════════════
function switchView(name) {
    currentView = name;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${name}`).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    document.querySelectorAll('.bottom-tab').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    if (name === 'map' && gmap) {
        setTimeout(() => { google.maps.event.trigger(gmap, 'resize'); fitMapToAll(); }, 150);
    }
    if (name === 'dashboard') renderDashboard();
    if (name === 'guide') renderGuide();
}

// ══════════════════════════════════════════════════════════════
//  SIDEBAR
// ══════════════════════════════════════════════════════════════
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-backdrop').classList.toggle('open');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('open');
}

// ══════════════════════════════════════════════════════════════
//  EDIT MODE
// ══════════════════════════════════════════════════════════════
function toggleEditMode() {
    editMode = !editMode;
    document.body.classList.toggle('edit-mode', editMode);
    document.getElementById('edit-btn').textContent = editMode ? '✏️' : '🔒';
    document.getElementById('edit-btn').title = editMode ? 'Edit mode ON — click to lock' : 'Toggle edit mode';
    // Re-render itinerary and pool to add/remove SortableJS
    renderItinerary();
    renderPlacePool();
}

// ══════════════════════════════════════════════════════════════
//  MODALS
// ══════════════════════════════════════════════════════════════
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) {
    if (id === 'modal-day-map' && expandedDayMapInstance) {
        expandedDayMapInstance.setMap(null);
        expandedDayMapInstance = null;
    }
    document.getElementById(id).classList.remove('open');
}

// ══════════════════════════════════════════════════════════════
//  TODOS
// ══════════════════════════════════════════════════════════════
function renderTodos() {
    const list = document.getElementById('todo-list');
    list.innerHTML = state.todos.map(t => `
        <li>
            <input type="checkbox" ${t.done?'checked':''} onchange="toggleTodo('${t.id}')">
            <span class="${t.done?'done':''}">${esc(t.text)}</span>
            <button class="todo-del edit-only" onclick="deleteTodo('${t.id}')">✕</button>
        </li>
    `).join('');
}
function toggleTodo(id) { const t=state.todos.find(x=>x.id===id); if(t){t.done=!t.done; save(); renderTodos();} }
function deleteTodo(id) { state.todos=state.todos.filter(x=>x.id!==id); save(); renderTodos(); }
function addTodo() {
    const inp=document.getElementById('todo-input'), text=inp.value.trim();
    if(!text) return;
    state.todos.push({id:'td'+Date.now(), text, done:false});
    inp.value=''; save(); renderTodos();
}

// ══════════════════════════════════════════════════════════════
//  ITINERARY — VERTICAL TIMELINE
// ══════════════════════════════════════════════════════════════
function renderItinerary() {
    const container = document.getElementById('itinerary-list');
    document.getElementById('day-counter').textContent = `${state.itinerary.length} days · May 16 – Jun 2, 2026`;

    container.innerHTML = state.itinerary.map((day, idx) => {
        const city = getDayCity(day);
        const cityClass = city.toLowerCase();
        const isExpanded = expandedDays.has(day.id);
        const {date, subtitle} = parseDayTitle(day.title);

        return `
        <div class="day-card ${isExpanded?'expanded':''} city-${cityClass}" data-day-id="${day.id}">
            <div class="day-header" onclick="toggleDay('${day.id}')">
                <div class="day-header-left">
                    <div class="day-num ${cityClass}">${idx+1}</div>
                    <div class="day-info">
                        <div class="day-title">${esc(date)}</div>
                        ${subtitle ? `<div class="day-subtitle">${esc(subtitle)}</div>` : ''}
                    </div>
                </div>
                <div class="day-header-right">
                    ${(() => { const km = getDayWalkingEstimate(day); return km ? `<span class="day-stops" title="Estimated walking distance">🚶 ~${km}km</span>` : ''; })()}
                    <span class="day-stops">${day.items.length} stop${day.items.length!==1?'s':''}</span>
                    <button class="day-share-btn" onclick="event.stopPropagation(); shareDayCard('${day.id}')" title="Share as image">📤</button>
                    <div class="day-edit-actions edit-only" onclick="event.stopPropagation()">
                        <button title="Delete day" onclick="deleteDay('${day.id}')">🗑️</button>
                    </div>
                    <span class="day-chevron">▼</span>
                </div>
            </div>
            <div class="day-body">
                <div class="day-body-inner">
                    <div class="day-map-wrap" id="daymap-wrap-${day.id}">
                        <div class="day-map" id="daymap-${day.id}"></div>
                        <button class="day-map-expand" onclick="event.stopPropagation(); expandDayMap('${day.id}')" title="Enlarge map">⛶</button>
                    </div>
                    <div class="timeline" data-day-id="${day.id}">
                        ${day.items.length ? day.items.map(it => renderTimelineItem(it, day, city)).join('') : '<div class="timeline-drop-hint">Drag places here or use + Add activity</div>'}
                    </div>
                    <div class="day-add-item edit-only">
                        <button onclick="openItinItemModal('${day.id}')">+ Add activity</button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    // SortableJS — only in edit mode, handle-based dragging
    if (editMode) {
        document.querySelectorAll('.timeline').forEach(el => {
            new Sortable(el, {
                group: 'itinerary',
                animation: 200,
                ghostClass: 'sortable-ghost',
                handle: '.tl-grip',
                onEnd: handleItinSort,
                onAdd: handlePoolDrop
            });
        });
    }
}


function parseTimeToMinutes(str) {
    if (!str) return null;
    str = str.trim().toLowerCase().replace(/\s+/g,' ');
    // Handle "HH:MM" 24h format
    let m = str.match(/^(\d{1,2}):(\d{2})$/);
    if (m) return parseInt(m[1])*60 + parseInt(m[2]);
    // Handle "H AM/PM" or "H:MM AM/PM"
    m = str.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
    if (m) {
        let h = parseInt(m[1]), min = parseInt(m[2]||'0');
        if (m[3]==='pm' && h!==12) h+=12;
        if (m[3]==='am' && h===12) h=0;
        return h*60+min;
    }
    // Handle ranges like "8:30" or "15:30" from first part
    m = str.match(/^(\d{1,2})(?::(\d{2}))?/);
    if (m) {
        let h = parseInt(m[1]), min = parseInt(m[2]||'0');
        if (h <= 24) return h*60+min;
    }
    return null;
}

function parseHoursRange(hoursStr) {
    if (!hoursStr) return null;
    if (/24\s*hours?/i.test(hoursStr)) return {open:0, close:1440};
    const parts = hoursStr.split(/\s*[–—-]\s*/);
    if (parts.length < 2) return null;
    const open = parseTimeToMinutes(parts[0]);
    const close = parseTimeToMinutes(parts[1]);
    if (open === null || close === null) return null;
    return {open, close: close <= open ? close+1440 : close};
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getDayWalkingEstimate(day) {
    const coords = [];
    for (const it of day.items) {
        if (it.isNote) continue;
        const p = findPlaceByName(it.name);
        if (p && p.lat && p.lng) coords.push({lat: p.lat, lng: p.lng});
    }
    if (coords.length < 2) return null;
    let totalKm = 0;
    for (let i = 1; i < coords.length; i++) {
        totalKm += haversineKm(coords[i-1].lat, coords[i-1].lng, coords[i].lat, coords[i].lng);
    }
    return (totalKm * 1.4).toFixed(1); // 1.4x factor for actual walking vs straight line
}

function formatMinutesTo24h(mins) {
    if (mins == null || mins < 0) return '';
    const h = Math.floor(mins / 60) % 24, m = mins % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function getHoursConflict(it, place) {
    if (!place || !place.hours) return null;
    let startMins = it.time ? parseTimeToMinutes(it.time) : null;
    let endMins = it.timeEnd ? parseTimeToMinutes(it.timeEnd) : null;
    if (!it.timeEnd && it.time && /^\d{1,2}(?::\d{2})?\s*[-–]\s*\d{1,2}/.test(it.time)) {
        const parts = it.time.split(/\s*[-–]\s*/);
        if (parts.length >= 2) endMins = parseTimeToMinutes(parts[1].trim()) ?? startMins;
    }
    endMins = endMins ?? startMins;
    if (startMins === null) return null;
    const hours = parseHoursRange(place.hours);
    if (!hours) return null;
    if (startMins < hours.open) return `Opens at ${formatMinutesTo24h(hours.open)}`;
    if (endMins > hours.close) return `Closes at ${formatMinutesTo24h(hours.close)}`;
    return null;
}

function renderTimelineItem(it, day, city) {
    const cityClass = city.toLowerCase();
    const place = findPlaceByName(it.name);
    const note = it.isNote;
    const navUrl = place ? mapsNavUrl(place.name, city, place.lat, place.lng, place.address) : mapsNavUrl(it.name, city);
    const hoursWarn = !note ? getHoursConflict(it, place) : null;
    return `
    <div class="tl-item ${it.visited?'visited':''} ${note?'is-note':''}" data-item-id="${it.id}">
        <span class="tl-grip edit-only-inline" title="Drag to reorder or drop in pool">⠿</span>
        <div class="tl-dot ${note?'':cityClass}"></div>
        ${(it.time || it.timeEnd) ? `<div class="tl-time">${esc([it.time, it.timeEnd].filter(Boolean).join(' – '))}</div>` : ''}
        <div class="tl-name">${note?'📝 ':''}${esc(it.name)}${note?'<span class="tl-note-badge">note</span>':''}${!note && place && getArea(place) ? `<span class="tl-area">${esc(getArea(place))}</span>` : ''}${!note && place && place.reserved ? '<span class="badge-reserved">✓</span>' : ''}${!note && place && getVenue(place) === 'outdoor' ? '<span class="tl-venue" title="Outdoor">☀️</span>' : ''}${!note && place && getVenue(place) === 'indoor' ? '<span class="tl-venue" title="Indoor">🏠</span>' : ''}</div>
        ${it.desc ? `<div class="tl-desc">${esc(it.desc)}</div>` : ''}
        ${hoursWarn ? `<div class="tl-hours-warn">⚠️ ${hoursWarn}</div>` : ''}
        <div class="tl-actions">
            ${note ? '' : `<a href="${navUrl}" target="_blank" class="btn-navigate">📍 Navigate</a>`}
            <button class="tl-edit-btn" onclick="toggleVisited('${day.id}','${it.id}')">${it.visited ? '↩️ Undo' : '✅ Done'}</button>
            <button class="tl-edit-btn edit-only" onclick="openItinItemModal('${day.id}','${it.id}')">✏️ Edit</button>
            <button class="tl-edit-btn edit-only" onclick="deleteItinItem('${day.id}','${it.id}')">🗑️</button>
        </div>
    </div>`;
}

function toggleDay(dayId) {
    if (expandedDays.has(dayId)) expandedDays.delete(dayId);
    else expandedDays.add(dayId);
    renderItinerary();
    if (expandedDays.has(dayId)) initDayMap(dayId);
}

function initDayMap(dayId) {
    if (typeof google === 'undefined' || !google.maps) return;
    const day = state.itinerary.find(d => d.id === dayId);
    if (!day) return;
    const el = document.getElementById(`daymap-${dayId}`);
    if (!el) return;

    const coords = [];
    for (const it of day.items) {
        if (it.isNote) continue;
        const p = findPlaceByName(it.name);
        if (p && p.lat && p.lng) coords.push({ lat: p.lat, lng: p.lng, name: it.name, cat: p.category });
    }

    const wrap = document.getElementById(`daymap-wrap-${dayId}`);
    if (coords.length === 0) { if (wrap) wrap.style.display = 'none'; return; }
    if (wrap) wrap.style.display = ''; el.style.display = '';

    const map = new google.maps.Map(el, {
        center: coords[0],
        zoom: 13,
        styles: getMapStyles(),
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'cooperative',
    });

    const bounds = new google.maps.LatLngBounds();
    const path = [];

    coords.forEach((c, i) => {
        const color = MARKER_COLORS[c.cat] || '#3b82f6';
        new google.maps.Marker({
            position: { lat: c.lat, lng: c.lng },
            map,
            title: c.name,
            label: { text: String(i + 1), color: '#fff', fontWeight: '700', fontSize: '11px' },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color, fillOpacity: 1,
                strokeColor: '#fff', strokeWeight: 2, scale: 14,
            },
        });
        bounds.extend({ lat: c.lat, lng: c.lng });
        path.push({ lat: c.lat, lng: c.lng });
    });

    if (path.length >= 2) {
        new google.maps.Polyline({
            path,
            geodesic: true,
            strokeColor: '#3b82f6',
            strokeOpacity: 0.6,
            strokeWeight: 3,
            icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 3, fillColor: '#3b82f6', fillOpacity: 1, strokeWeight: 0 }, offset: '50%' }],
            map,
        });
    }

    if (coords.length > 1) {
        map.fitBounds(bounds, 30);
    }

    dayMaps[dayId] = map;
}

let expandedDayMapInstance = null;
function expandDayMap(dayId) {
    if (typeof google === 'undefined' || !google.maps) { showToast('Map not loaded yet', 'warn'); return; }
    const day = state.itinerary.find(d => d.id === dayId);
    if (!day) return;
    const coords = [];
    for (const it of day.items) {
        if (it.isNote) continue;
        const p = findPlaceByName(it.name);
        if (p && p.lat && p.lng) coords.push({ lat: p.lat, lng: p.lng, name: it.name, cat: p.category });
    }
    if (coords.length === 0) { showToast('No places with coordinates in this day', 'info'); return; }

    const modal = document.getElementById('modal-day-map');
    const container = document.getElementById('day-map-expanded');
    if (!modal || !container) return;
    container.innerHTML = '';
    const {date, subtitle} = parseDayTitle(day.title);
    document.getElementById('day-map-modal-title').textContent = `Map — ${date}${subtitle ? ': ' + subtitle : ''}`;
    openModal('modal-day-map');

    const map = new google.maps.Map(container, {
        center: coords[0],
        zoom: 14,
        styles: getMapStyles(),
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true,
        gestureHandling: 'greedy',
    });
    const bounds = new google.maps.LatLngBounds();
    const path = [];
    coords.forEach((c, i) => {
        const color = MARKER_COLORS[c.cat] || '#3b82f6';
        new google.maps.Marker({
            position: { lat: c.lat, lng: c.lng },
            map,
            title: c.name,
            label: { text: String(i + 1), color: '#fff', fontWeight: '700', fontSize: '12px' },
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color, fillOpacity: 1,
                strokeColor: '#fff', strokeWeight: 2, scale: 16,
            },
        });
        bounds.extend({ lat: c.lat, lng: c.lng });
        path.push({ lat: c.lat, lng: c.lng });
    });
    if (path.length >= 2) {
        new google.maps.Polyline({
            path, geodesic: true, strokeColor: '#3b82f6', strokeOpacity: 0.6, strokeWeight: 4,
            icons: [{ icon: { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 4, fillColor: '#3b82f6', fillOpacity: 1, strokeWeight: 0 }, offset: '50%' }],
            map,
        });
    }
    if (coords.length > 1) map.fitBounds(bounds, 40);
    expandedDayMapInstance = map;
}

function initExpandedDayMaps() {
    expandedDays.forEach(dayId => initDayMap(dayId));
}

function jumpToDay(dayId) {
    expandedDays.add(dayId);
    renderItinerary();
    const el = document.querySelector(`[data-day-id="${dayId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function shareDayCard(dayId) {
    if (typeof html2canvas === 'undefined') { showToast('Image library not loaded yet', 'warn'); return; }
    const dayIdx = state.itinerary.findIndex(d => d.id === dayId);
    const day = state.itinerary[dayIdx];
    if (!day) return;

    if (!expandedDays.has(dayId)) {
        expandedDays.add(dayId);
        renderItinerary();
    }

    showToast('Generating image...', 'info', 2000);

    setTimeout(() => {
        const card = document.querySelector(`[data-day-id="${dayId}"]`);
        if (!card) return;

        const clone = card.cloneNode(true);
        const computedBg = getComputedStyle(document.documentElement).getPropertyValue('--bg-1').trim() || '#0b0f19';
        clone.style.width = '420px';
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.background = computedBg;
        clone.classList.add('expanded');

        clone.querySelectorAll('.edit-only, .edit-only-inline, .day-share-btn, .day-map, .tl-grip').forEach(e => e.remove());

        const watermark = document.createElement('div');
        const wmColor = getComputedStyle(document.documentElement).getPropertyValue('--text-2').trim() || '#9ca3af';
        watermark.style.cssText = `text-align:center;padding:8px;font-size:11px;opacity:.5;color:${wmColor}`;
        watermark.textContent = 'Japan 2026 \u00b7 Day ' + (dayIdx + 1);
        clone.querySelector('.day-body-inner')?.appendChild(watermark);

        document.body.appendChild(clone);

        html2canvas(clone, {
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-1').trim() || '#0b0f19',
            scale: 2,
            useCORS: true,
            logging: false,
        }).then(canvas => {
            clone.remove();
            canvas.toBlob(blob => {
                if (!blob) { showToast('Failed to generate image', 'error'); return; }
                const {date, subtitle} = parseDayTitle(day.title);
                const fname = `day${dayIdx+1}-${(subtitle||date).replace(/[^a-zA-Z0-9]/g,'-')}.png`;

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], fname, { type: 'image/png' })] })) {
                    navigator.share({
                        title: `Day ${dayIdx+1} — ${date}`,
                        text: subtitle || date,
                        files: [new File([blob], fname, { type: 'image/png' })],
                    }).catch(() => downloadBlob(blob, fname));
                } else {
                    downloadBlob(blob, fname);
                }
                showToast('Day card image ready!', 'success');
            }, 'image/png');
        }).catch(() => { clone.remove(); showToast('Failed to capture day card', 'error'); });
    }, 200);
}

function downloadBlob(blob, fname) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fname; a.click();
    URL.revokeObjectURL(url);
}

function populateDaySelect() {
    const sel = document.getElementById('day-select');
    sel.innerHTML = '<option value="">Jump to day...</option>' +
        state.itinerary.map((d, i) => {
            const {date, subtitle} = parseDayTitle(d.title);
            return `<option value="${d.id}">Day ${i+1} — ${date}${subtitle ? ' — '+subtitle : ''}</option>`;
        }).join('');
}

function toggleVisited(dayId, itemId) {
    const day = state.itinerary.find(d=>d.id===dayId); if(!day) return;
    const item = day.items.find(i=>i.id===itemId); if(!item) return;
    item.visited = !item.visited;
    save(); renderItinerary(); renderDashboard();

    if (item.visited && typeof confetti === 'function') {
        const allDone = day.items.every(i => i.visited);
        if (allDone) {
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            showToast(`Day complete! 🎉 All ${day.items.length} activities done!`, 'success', 4000);
            const tripDone = state.itinerary.every(d => d.items.length === 0 || d.items.every(i => i.visited));
            if (tripDone) {
                setTimeout(() => confetti({ particleCount: 300, spread: 160, origin: { y: 0.5 } }), 800);
                showToast('🎌 ENTIRE TRIP COMPLETE! What an adventure!', 'success', 6000);
            }
        }
    }
}

function handleItinSort() {
    const newItin = [];
    document.querySelectorAll('.day-card').forEach(dayEl => {
        const dayId = dayEl.dataset.dayId;
        const day = state.itinerary.find(d => d.id === dayId);
        if (!day) return;
        const items = [];
        dayEl.querySelectorAll('.tl-item').forEach(itemEl => {
            const itemId = itemEl.dataset.itemId;
            for (const d of state.itinerary) {
                const f = d.items.find(i => i.id === itemId);
                if (f) { items.push(f); break; }
            }
        });
        newItin.push({ ...day, items });
    });
    state.itinerary = newItin; save();
    setTimeout(() => { renderItinerary(); renderPlacePool(); renderDashboard(); }, 0);
}

function addItineraryDay() {
    const title = `Day ${state.itinerary.length+1} — New Day`;
    const id = 'day'+Date.now();
    state.itinerary.push({ id, title, items:[] });
    expandedDays.add(id);
    save(); renderItinerary(); renderPlacePool(); populateDaySelect(); renderDashboard();
}

function deleteDay(id) {
    if (!confirm('Delete this entire day?')) return;
    state.itinerary = state.itinerary.filter(d=>d.id!==id);
    expandedDays.delete(id);
    if (dayMaps[id]) delete dayMaps[id];
    save(); renderItinerary(); renderPlacePool(); populateDaySelect(); renderDashboard();
}

// ── Itinerary Item Modal ──
function openItinItemModal(dayId, itemId) {
    const form = document.getElementById('itin-form');
    form.reset();
    document.getElementById('ii-day-id').value = dayId;
    document.getElementById('ii-item-id').value = itemId || '';
    document.getElementById('ii-time-end').value = '';
    document.getElementById('ii-note').checked = false;
    document.getElementById('modal-itin-title').textContent = itemId ? 'Edit Activity' : 'Add Activity';

    if (itemId) {
        const day = state.itinerary.find(d=>d.id===dayId);
        const item = day?.items.find(i=>i.id===itemId);
        if (item) {
            document.getElementById('ii-time').value = item.time || '';
            document.getElementById('ii-time-end').value = item.timeEnd || '';
            document.getElementById('ii-name').value = item.name || '';
            document.getElementById('ii-desc').value = item.desc || '';
            document.getElementById('ii-note').checked = !!item.isNote;
        }
    }
    openModal('modal-itin');
}

function handleItinItemSubmit(e) {
    e.preventDefault();
    const dayId = document.getElementById('ii-day-id').value;
    const itemId = document.getElementById('ii-item-id').value;
    const data = {
        time: document.getElementById('ii-time').value.trim(),
        timeEnd: document.getElementById('ii-time-end').value.trim() || undefined,
        name: document.getElementById('ii-name').value.trim(),
        desc: document.getElementById('ii-desc').value.trim(),
        isNote: document.getElementById('ii-note').checked,
    };
    const day = state.itinerary.find(d=>d.id===dayId);
    if (!day) return;

    if (itemId) {
        const item = day.items.find(i=>i.id===itemId);
        if (item) Object.assign(item, data);
    } else {
        day.items.push({ id:'it'+Date.now(), ...data, visited:false });
    }
    save(); renderItinerary(); renderPlacePool(); renderDashboard(); closeModal('modal-itin');
}

function deleteItinItem(dayId, itemId) {
    const day = state.itinerary.find(d=>d.id===dayId);
    if (day) { day.items = day.items.filter(i=>i.id!==itemId); save(); renderItinerary(); renderPlacePool(); renderDashboard(); }
}

// ══════════════════════════════════════════════════════════════
//  PLACE POOL (unadded places panel)
// ══════════════════════════════════════════════════════════════
function getUnaddedPlaces() {
    const addedNames = new Set();
    state.itinerary.forEach(day => {
        day.items.forEach(item => addedNames.add(item.name));
    });
    return state.places.filter(p => !addedNames.has(p.name));
}

function renderPlacePool() {
    const container = document.getElementById('pool-list');
    const countEl = document.getElementById('pool-count');
    if (!container || !countEl) return;

    const allUnadded = getUnaddedPlaces();
    let places = [...allUnadded];

    // Populate city/area dropdown dynamically
    const citySelect = document.getElementById('pool-city-filter');
    if (citySelect) {
        const prev = citySelect.value || poolFilter;
        const cities = ['Tokyo','Kyoto','Osaka','Nara','Fuji','Izu'];
        let optHtml = '<option value="all">All Cities / Areas</option>';
        cities.forEach(city => {
            const cityPlaces = places.filter(p => p.city === city);
            if (cityPlaces.length === 0) return;
            optHtml += `<option value="city:${city}">${city} (${cityPlaces.length})</option>`;
            // Collect areas for this city
            const areaSet = new Set();
            cityPlaces.forEach(p => { const a = getArea(p); if (a) areaSet.add(a); });
            [...areaSet].sort().forEach(a => {
                const cnt = cityPlaces.filter(p => getArea(p) === a).length;
                optHtml += `<option value="area:${a}">  └ ${a} (${cnt})</option>`;
            });
        });
        citySelect.innerHTML = optHtml;
        citySelect.value = prev;
        poolFilter = citySelect.value || 'all';
    }

    // Apply city/area filter
    if (poolFilter !== 'all') {
        if (poolFilter.startsWith('city:')) {
            const city = poolFilter.slice(5);
            places = places.filter(p => p.city === city);
        } else if (poolFilter.startsWith('area:')) {
            const area = poolFilter.slice(5);
            places = places.filter(p => getArea(p) === area);
        } else {
            // Legacy plain city filter fallback
            places = places.filter(p => p.city === poolFilter);
        }
    }
    // Apply search (also searches area/neighborhood)
    if (poolSearch) {
        const q = poolSearch.toLowerCase();
        places = places.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.city.toLowerCase().includes(q) ||
            (p.category||'').toLowerCase().includes(q) ||
            getArea(p).toLowerCase().includes(q)
        );
    }

    // Sort by city, then area, then name
    places.sort((a, b) => a.city.localeCompare(b.city) || getArea(a).localeCompare(getArea(b)) || a.name.localeCompare(b.name));

    const totalUnadded = allUnadded.length;
    countEl.textContent = `${places.length}${places.length !== totalUnadded ? ' / ' + totalUnadded : ''} unadded`;

    container.innerHTML = places.length ? places.map(p => `
        <div class="pool-item" data-place-id="${p.id}" data-place-name="${esc(p.name)}" onclick="openDetail(${p.id})" style="cursor:pointer">
            <span class="pool-icon">${CATEGORY_ICONS[p.category] || '📍'}</span>
            <div class="pool-info">
                <div class="pool-name" title="${esc(p.name)}">${esc(p.name)}</div>
                <div class="pool-meta">${getArea(p) ? esc(getArea(p)) + ' · ' : ''}${esc(p.city)} · ${p.category}</div>
            </div>
            <button class="pool-add-btn edit-only" onclick="event.stopPropagation(); addPlaceToDay(${p.id})" title="Add to selected day">+</button>
        </div>
    `).join('') : '<div class="pool-empty">All places are scheduled! 🎉</div>';

    // Populate the target day select
    populatePoolTargetDay();

    // Set up SortableJS for pool (edit mode only)
    if (poolSortableInstance) { poolSortableInstance.destroy(); poolSortableInstance = null; }
    if (editMode) {
        poolSortableInstance = new Sortable(container, {
            group: { name: 'itinerary', pull: 'clone', put: true },
            sort: false,
            animation: 150,
            ghostClass: 'sortable-ghost',
            filter: '.pool-add-btn',
            onAdd: handleReturnToPool
        });
    }
}

function populatePoolTargetDay() {
    const sel = document.getElementById('pool-target-day');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '<option value="">Add to day...</option>' +
        state.itinerary.map((d, i) => {
            const {date, subtitle} = parseDayTitle(d.title);
            return `<option value="${d.id}">Day ${i+1} — ${date}</option>`;
        }).join('');
    if (prev) sel.value = prev;
}

function addPlaceToDay(placeId) {
    const place = state.places.find(p => p.id === placeId);
    if (!place) return;

    const sel = document.getElementById('pool-target-day');
    let targetDay = null;

    // Priority: selected day in dropdown, then first expanded day
    if (sel && sel.value) {
        targetDay = state.itinerary.find(d => d.id === sel.value);
    }
    if (!targetDay) {
        for (const day of state.itinerary) {
            if (expandedDays.has(day.id)) { targetDay = day; break; }
        }
    }
    if (!targetDay) {
        showToast('Select a target day from the dropdown, or expand a day first.', 'warn');
        return;
    }

    targetDay.items.push({
        id: 'it' + Date.now(),
        time: '',
        timeEnd: undefined,
        name: place.name,
        desc: place.description ? place.description.substring(0, 150) : '',
        visited: false,
        isNote: false
    });

    expandedDays.add(targetDay.id);
    save();
    renderItinerary();
    renderPlacePool();
    renderDashboard();
}

function handlePoolDrop(evt) {
    // Only handle pool items (they have data-place-id attribute)
    if (!evt.item || !evt.item.dataset.placeId) return;

    const placeId = parseInt(evt.item.dataset.placeId);
    const place = state.places.find(p => p.id === placeId);
    if (!place) return;

    // The timeline has data-day-id, or find it from parent .day-card
    const dayId = evt.to.dataset.dayId || evt.to.closest('.day-card')?.dataset.dayId;
    const day = state.itinerary.find(d => d.id === dayId);
    if (!day) return;

    const newItem = {
        id: 'it' + Date.now(),
        time: '',
        timeEnd: undefined,
        name: place.name,
        desc: place.description ? place.description.substring(0, 150) : '',
        visited: false,
        isNote: false
    };

    day.items.splice(evt.newIndex, 0, newItem);
    save();

    setTimeout(() => {
        renderItinerary();
        renderPlacePool();
        renderDashboard();
    }, 0);
}

function handleReturnToPool(evt) {
    // A timeline item was dropped into the pool — remove it from itinerary
    const itemId = evt.item?.dataset?.itemId;
    if (!itemId) {
        // Not a timeline item (shouldn't happen), just re-render
        setTimeout(() => { renderItinerary(); renderPlacePool(); renderDashboard(); }, 0);
        return;
    }

    for (const day of state.itinerary) {
        const idx = day.items.findIndex(i => i.id === itemId);
        if (idx !== -1) {
            day.items.splice(idx, 1);
            break;
        }
    }

    save();
    setTimeout(() => {
        renderItinerary();
        renderPlacePool();
        renderDashboard();
    }, 0);
}

// ══════════════════════════════════════════════════════════════
//  PLACES GRID
// ══════════════════════════════════════════════════════════════
function getFilteredPlaces() {
    let arr = state.places;
    if (placeFilter !== 'all') arr = arr.filter(p => p.category === placeFilter || p.city === placeFilter);
    if (areaFilter !== 'all') arr = arr.filter(p => getArea(p) === areaFilter);
    if (placeSearch) arr = arr.filter(p =>
        p.name.toLowerCase().includes(placeSearch) ||
        (p.description||'').toLowerCase().includes(placeSearch) ||
        getArea(p).toLowerCase().includes(placeSearch)
    );
    return arr;
}
function getAreasForCurrentFilter() {
    // Only show area chips when a city filter is active
    const cities = ['Tokyo','Kyoto','Osaka','Nara','Fuji','Izu'];
    if (!cities.includes(placeFilter)) return [];
    const areas = new Set();
    state.places.forEach(p => {
        if (p.city === placeFilter) {
            const a = getArea(p);
            if (a) areas.add(a);
        }
    });
    return [...areas].sort();
}

function renderPlaces() {
    const places = getFilteredPlaces();
    document.getElementById('places-count').textContent = `${places.length} place${places.length!==1?'s':''}`;
    // Render area sub-filter bar
    const areaBar = document.getElementById('area-bar');
    if (areaBar) {
        const areas = getAreasForCurrentFilter();
        if (areas.length > 0) {
            areaBar.innerHTML = `<span class="area-chip${areaFilter==='all'?' active':''}" onclick="setAreaFilter('all')">All Areas</span>` +
                areas.map(a => `<span class="area-chip${areaFilter===a?' active':''}" onclick="setAreaFilter('${esc(a)}')">${esc(a)}</span>`).join('');
            areaBar.style.display = '';
        } else {
            areaBar.innerHTML = '';
            areaBar.style.display = 'none';
        }
    }
    const grid = document.getElementById('places-grid');
    grid.innerHTML = places.map(p => {
        const photo = getPhotoPath(p);
        const catClass = (p.category||'').toLowerCase();
        const navUrl = mapsNavUrl(p.name, p.city, p.lat, p.lng, p.address);
        return `
        <div class="place-card" data-id="${p.id}" onclick="openDetail(${p.id})">
            <div class="card-thumb ${catClass}">
                <img src="${photo}" class="thumb-img" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'">
                <span class="thumb-icon">${CATEGORY_ICONS[p.category]||'📍'}</span>
                <span class="thumb-city">${esc(getArea(p) ? getArea(p) + ', ' + p.city : p.city)}</span>
            </div>
            <div class="card-body">
                <h3 class="card-name">${esc(p.name)}${p.reserved?'<span class="badge-reserved">✓ Reserved</span>':''}</h3>
                <p class="card-desc">${esc(p.description||'')}</p>
                <div class="card-tags">
                    <span class="tag ${catClass}">${p.category}</span>
                    ${getArea(p) ? `<span class="tag tag-area">${esc(getArea(p))}</span>` : ''}
                    <span class="tag tag-city">${esc(p.city)}</span>
                </div>
                <div class="card-meta">
                    ${p.hours?`<span>🕐 ${esc(p.hours)}</span>`:''}
                    ${p.cost?`<span>💰 ${esc(p.cost)}</span>`:''}
                </div>
                <div class="card-actions" onclick="event.stopPropagation()">
                    <a href="${navUrl}" target="_blank" class="btn-navigate">📍 Navigate</a>
                    <button class="btn btn-ghost btn-sm edit-only" onclick="openPlaceModal(${p.id})">✏️</button>
                    <button class="btn btn-ghost btn-sm edit-only" onclick="deletePlace(${p.id})" style="color:var(--red)">🗑️</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

function setAreaFilter(area) {
    areaFilter = area;
    renderPlaces();
}

function deletePlace(id) {
    if (!confirm('Delete this place?')) return;
    state.places = state.places.filter(p=>p.id!==id);
    save(); renderPlaces(); updateMapMarkers(); renderPlacePool(); renderItinerary(); renderDashboard();
}

function toggleReserved(id, checked) {
    const p = state.places.find(x=>x.id===id);
    if (!p) return;
    p.reserved = checked;
    if (!checked) { p.confirmationNo = ''; p.bookedBy = ''; }
    save(); renderPlaces(); renderItinerary(); renderDashboard();
    const fields = document.getElementById(`res-fields-${id}`);
    if (fields) fields.style.display = checked ? '' : 'none';
    showToast(checked ? `${esc(p.name)} marked as reserved` : `${esc(p.name)} reservation removed`, checked ? 'success' : 'info');
}

function updateResField(id, field, value) {
    const p = state.places.find(x=>x.id===id);
    if (p) { p[field] = value.trim(); save(); }
}

// ══════════════════════════════════════════════════════════════
//  PLACE DETAIL MODAL
// ══════════════════════════════════════════════════════════════
function openDetail(id) {
    const p = state.places.find(x=>x.id===id); if(!p) return;
    const photo = getPhotoPath(p);
    const nameQ = encodeURIComponent(p.name + ', ' + p.city + ', Japan');
    const embedQ = (p.lat && p.lng) ? `${p.lat},${p.lng}` : nameQ;
    const embedUrl = `https://maps.google.com/maps?q=${embedQ}&z=16&output=embed`;
    const navUrl = mapsNavUrl(p.name, p.city, p.lat, p.lng, p.address);
    const searchUrl = mapsSearchUrl(p.name, p.city, p.lat, p.lng, p.address);

    document.getElementById('detail-content').innerHTML = `
        <div class="detail-header">
            <h2>${esc(p.name)}</h2>
            <div class="detail-address">📍 ${esc(getArea(p) ? getArea(p) + ', ' + (p.address || p.city) : (p.address || p.city))}</div>
        </div>
        <div class="detail-tags">
            <span class="tag ${(p.category||'').toLowerCase()}">${p.category}</span>
            ${getArea(p) ? `<span class="tag tag-area">${esc(getArea(p))}</span>` : ''}
            <span class="tag tag-city">${esc(p.city)}</span>
        </div>
        <img src="${photo}" alt="${esc(p.name)}" class="detail-photo" onerror="this.style.display='none'">
        <div class="detail-map-wrap">
            <iframe src="${embedUrl}" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
        <div class="detail-info">
            ${p.hours ? `<div class="detail-info-item"><label>Hours</label><span>${esc(p.hours)}</span></div>` : ''}
            ${p.cost ? `<div class="detail-info-item"><label>Cost</label><span>${esc(p.cost)}</span></div>` : ''}
            ${p.notes ? `<div class="detail-info-item"><label>Notes</label><span>${esc(p.notes)}</span></div>` : ''}
        </div>
        ${p.description ? `<p class="detail-desc">${esc(p.description)}</p>` : ''}
        <div class="detail-reservation">
            <label><input type="checkbox" ${p.reserved?'checked':''} onchange="toggleReserved(${p.id}, this.checked)"> Reservation Made</label>
            <div class="detail-res-fields" style="${p.reserved?'':'display:none'}" id="res-fields-${p.id}">
                <input type="text" placeholder="Confirmation #" value="${esc(p.confirmationNo||'')}" onchange="updateResField(${p.id},'confirmationNo',this.value)">
                <input type="text" placeholder="Booked by" value="${esc(p.bookedBy||'')}" onchange="updateResField(${p.id},'bookedBy',this.value)">
            </div>
        </div>
        <div class="detail-actions">
            <a href="${navUrl}" target="_blank" class="btn-navigate" style="font-size:.85rem;padding:.55rem 1.1rem">📍 Navigate Here</a>
            <a href="${searchUrl}" target="_blank" class="btn btn-ghost">Open in Google Maps</a>
            ${p.url ? `<a href="${p.url}" target="_blank" class="btn btn-ghost">Website</a>` : ''}
            <button class="btn btn-ghost edit-only" onclick="closeModal('modal-detail'); openPlaceModal(${p.id})">✏️ Edit</button>
        </div>
    `;
    openModal('modal-detail');
}

// ══════════════════════════════════════════════════════════════
//  PLACE ADD/EDIT MODAL
// ══════════════════════════════════════════════════════════════
function openPlaceModal(editId) {
    const form = document.getElementById('place-form');
    form.reset(); document.getElementById('f-id').value = '';
    document.getElementById('modal-place-title').textContent = 'Add New Place';
    if (editId) {
        const p = state.places.find(x=>x.id===editId);
        if (p) {
            document.getElementById('modal-place-title').textContent = 'Edit Place';
            document.getElementById('f-id').value = p.id;
            document.getElementById('f-name').value = p.name;
            document.getElementById('f-city').value = p.city;
            document.getElementById('f-category').value = p.category;
            document.getElementById('f-hours').value = p.hours||'';
            document.getElementById('f-address').value = p.address||'';
            document.getElementById('f-lat').value = p.lat||'';
            document.getElementById('f-lng').value = p.lng||'';
            document.getElementById('f-desc').value = p.description||'';
            document.getElementById('f-cost').value = p.cost||'';
            document.getElementById('f-notes').value = p.notes||'';
            document.getElementById('f-url').value = p.url||'';
            document.getElementById('f-area').value = p.area || getArea(p) || '';
        }
    }
    openModal('modal-place');
}

function handlePlaceSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('f-id').value;
    const data = {
        name: document.getElementById('f-name').value.trim(),
        city: document.getElementById('f-city').value,
        category: document.getElementById('f-category').value,
        hours: document.getElementById('f-hours').value.trim(),
        address: document.getElementById('f-address').value.trim(),
        lat: parseFloat(document.getElementById('f-lat').value) || null,
        lng: parseFloat(document.getElementById('f-lng').value) || null,
        description: document.getElementById('f-desc').value.trim(),
        cost: document.getElementById('f-cost').value.trim(),
        notes: document.getElementById('f-notes').value.trim(),
        url: document.getElementById('f-url').value.trim(),
        area: document.getElementById('f-area').value.trim() || undefined,
    };
    if (id) {
        const p = state.places.find(x=>x.id===parseInt(id));
        if (p) {
            const oldName = p.name;
            Object.assign(p, data);
            if (oldName !== data.name) {
                state.itinerary.forEach(day => {
                    day.items.forEach(it => {
                        if (it.name === oldName) it.name = data.name;
                    });
                });
            }
        }
    } else {
        data.id = Date.now();
        state.places.push(data);
        if (ENABLE_API_PHOTOS && placesService) { photoQueue.push(data); processPhotoQueue(); }
    }
    save(); renderPlaces(); updateMapMarkers(); renderPlacePool(); renderItinerary(); renderDashboard(); closeModal('modal-place');
}

// ══════════════════════════════════════════════════════════════
//  PACKING LIST
// ══════════════════════════════════════════════════════════════
function renderPacking() {
    const filtered = packingFilter==='all' ? state.packing : state.packing.filter(p=>p.cat===packingFilter);
    const packed = state.packing.filter(p=>p.packed).length;
    const total = state.packing.length;
    const pct = total ? Math.round(packed/total*100) : 0;

    document.getElementById('packing-progress').innerHTML = `
        ${packed}/${total} packed (${pct}%)
        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
    `;

    document.getElementById('packing-body').innerHTML = filtered.map(p => `
        <tr class="${p.packed?'packed-row':''}">
            <td>${esc(p.name)}</td>
            <td><span class="tag tag-city" style="font-size:.7rem">${esc(p.cat)}</span></td>
            <td>${p.qty}</td>
            <td style="font-size:.78rem;color:var(--text-2)">${esc(p.notes||'—')}</td>
            <td><input type="checkbox" ${p.packed?'checked':''} onchange="togglePacked('${p.id}')"></td>
            <td class="edit-only"><button class="packing-del" onclick="deletePacking('${p.id}')">✕</button></td>
        </tr>
    `).join('');
}

function togglePacked(id) { const p=state.packing.find(x=>x.id===id); if(p){p.packed=!p.packed; save(); renderPacking();} }
function deletePacking(id) { state.packing=state.packing.filter(x=>x.id!==id); save(); renderPacking(); }

function handlePackingSubmit(e) {
    e.preventDefault();
    state.packing.push({
        id:'pk'+Date.now(),
        name:document.getElementById('p-name').value.trim(),
        cat:document.getElementById('p-cat').value,
        qty:parseInt(document.getElementById('p-qty').value)||1,
        notes:document.getElementById('p-notes').value.trim(),
        packed:false,
    });
    save(); renderPacking(); closeModal('modal-packing');
    document.getElementById('packing-form').reset();
}

// ══════════════════════════════════════════════════════════════
//  GOOGLE MAPS
// ══════════════════════════════════════════════════════════════
const DARK_MAP_STYLES = [
    { elementType:"geometry", stylers:[{color:"#1d2c4d"}] },
    { elementType:"labels.text.fill", stylers:[{color:"#8ec3b9"}] },
    { elementType:"labels.text.stroke", stylers:[{color:"#1a3646"}] },
    { featureType:"administrative.country", elementType:"geometry.stroke", stylers:[{color:"#4b6878"}] },
    { featureType:"poi", elementType:"geometry", stylers:[{color:"#283d6a"}] },
    { featureType:"poi.park", elementType:"geometry.fill", stylers:[{color:"#023e58"}] },
    { featureType:"road", elementType:"geometry", stylers:[{color:"#304a7d"}] },
    { featureType:"road.highway", elementType:"geometry", stylers:[{color:"#2c6675"}] },
    { featureType:"water", elementType:"geometry", stylers:[{color:"#0e1626"}] },
];

function getMapStyles() {
    return (document.documentElement.getAttribute('data-theme') === 'light') ? [] : DARK_MAP_STYLES;
}

function initMap() {
    gmap = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 36.2, lng: 138.2 }, zoom: 6,
        styles: getMapStyles(), mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
    });
    infoWindow = new google.maps.InfoWindow();
    placesService = new google.maps.places.PlacesService(gmap);
    updateMapMarkers();
}

function updateMapMarkers(cityFilter) {
    gmarkers.forEach(m => m.setMap(null));
    gmarkers = [];
    const filtered = (cityFilter && cityFilter !== 'all')
        ? state.places.filter(p => p.city === cityFilter) : state.places;

    filtered.forEach(p => {
        if (!p.lat || !p.lng) return;
        const color = MARKER_COLORS[p.category] || '#3b82f6';
        const marker = new google.maps.Marker({
            position: { lat: p.lat, lng: p.lng }, map: gmap, title: p.name,
            icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: color, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 10 },
        });
        marker.addListener('click', () => {
            const navUrl = mapsNavUrl(p.name, p.city, p.lat, p.lng, p.address);
            const photo = getPhotoPath(p);
            infoWindow.setContent(`
                <div style="min-width:200px;font-family:-apple-system,sans-serif;color:#1f2937">
                    <img src="${photo}" style="width:100%;height:100px;object-fit:cover;border-radius:6px 6px 0 0" onerror="this.style.display='none'">
                    <div style="padding:8px 10px 10px">
                        <strong style="font-size:13px">${esc(p.name)}</strong><br>
                        <span style="font-size:11px;color:#6b7280">${getArea(p) ? esc(getArea(p)) + ' · ' : ''}${esc(p.address||p.city)}</span><br>
                        ${p.hours?`<span style="font-size:11px">🕐 ${esc(p.hours)}</span><br>`:''}
                        <a href="${navUrl}" target="_blank" style="font-size:12px;color:#2563eb;text-decoration:none;font-weight:600">📍 Navigate →</a>
                    </div>
                </div>
            `);
            infoWindow.open(gmap, marker);
        });
        gmarkers.push(marker);
    });
}

function fitMapToAll() {
    if (!gmarkers.length) return;
    const bounds = new google.maps.LatLngBounds();
    gmarkers.forEach(m => bounds.extend(m.getPosition()));
    gmap.fitBounds(bounds, 40);
}

// ══════════════════════════════════════════════════════════════
//  GOOGLE PLACES AUTOCOMPLETE (Edit mode)
// ══════════════════════════════════════════════════════════════
function initAutocomplete() {
    const input = document.getElementById('f-address');
    autocompleteWidget = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'jp' },
        fields: ['place_id', 'geometry', 'formatted_address', 'name'],
    });
    autocompleteWidget.addListener('place_changed', () => {
        const place = autocompleteWidget.getPlace();
        if (place.geometry) {
            document.getElementById('f-lat').value = place.geometry.location.lat();
            document.getElementById('f-lng').value = place.geometry.location.lng();
        }
        if (place.formatted_address) document.getElementById('f-address').value = place.formatted_address;
        if (place.name && !document.getElementById('f-name').value) document.getElementById('f-name').value = place.name;
    });
}

// ══════════════════════════════════════════════════════════════
//  GUIDE — PHRASES + TRANSPORT
// ══════════════════════════════════════════════════════════════
let guideTab = 'phrases';
let phraseSearch = '';

const PHRASES = [
    { cat:'Greetings', en:'Hello', jp:'こんにちは', rm:'Konnichiwa' },
    { cat:'Greetings', en:'Good morning', jp:'おはようございます', rm:'Ohayou gozaimasu' },
    { cat:'Greetings', en:'Good evening', jp:'こんばんは', rm:'Konbanwa' },
    { cat:'Greetings', en:'Goodbye', jp:'さようなら', rm:'Sayounara' },
    { cat:'Greetings', en:'Thank you', jp:'ありがとうございます', rm:'Arigatou gozaimasu' },
    { cat:'Greetings', en:'Excuse me / Sorry', jp:'すみません', rm:'Sumimasen' },
    { cat:'Greetings', en:'Yes / No', jp:'はい / いいえ', rm:'Hai / Iie' },
    { cat:'Greetings', en:'Please', jp:'お願いします', rm:'Onegaishimasu' },
    { cat:'Restaurant', en:'A table for 8 please', jp:'8人です', rm:'Hachi-nin desu' },
    { cat:'Restaurant', en:'Menu please', jp:'メニューをお願いします', rm:'Menyuu o onegaishimasu' },
    { cat:'Restaurant', en:'This one please', jp:'これをお願いします', rm:'Kore o onegaishimasu' },
    { cat:'Restaurant', en:'Check please', jp:'お会計お願いします', rm:'Okaikei onegaishimasu' },
    { cat:'Restaurant', en:'It was delicious', jp:'おいしかったです', rm:'Oishikatta desu' },
    { cat:'Restaurant', en:'No meat please', jp:'肉なしでお願いします', rm:'Niku nashi de onegaishimasu' },
    { cat:'Restaurant', en:'I\'m allergic to...', jp:'...アレルギーがあります', rm:'...arerugii ga arimasu' },
    { cat:'Restaurant', en:'Water please', jp:'お水お願いします', rm:'Omizu onegaishimasu' },
    { cat:'Restaurant', en:'Let\'s eat! (before meal)', jp:'いただきます', rm:'Itadakimasu' },
    { cat:'Restaurant', en:'That was a feast (after meal)', jp:'ごちそうさまでした', rm:'Gochisousama deshita' },
    { cat:'Directions', en:'Where is...?', jp:'...はどこですか？', rm:'...wa doko desu ka?' },
    { cat:'Directions', en:'Train station', jp:'駅', rm:'Eki' },
    { cat:'Directions', en:'Left / Right / Straight', jp:'左 / 右 / まっすぐ', rm:'Hidari / Migi / Massugu' },
    { cat:'Directions', en:'How far is it?', jp:'どのくらいかかりますか？', rm:'Dono kurai kakarimasu ka?' },
    { cat:'Directions', en:'Please take me here (taxi)', jp:'ここまでお願いします', rm:'Koko made onegaishimasu' },
    { cat:'Shopping', en:'How much is this?', jp:'これはいくらですか？', rm:'Kore wa ikura desu ka?' },
    { cat:'Shopping', en:'Too expensive', jp:'高すぎます', rm:'Takasugimasu' },
    { cat:'Shopping', en:'I\'ll take this', jp:'これをください', rm:'Kore o kudasai' },
    { cat:'Shopping', en:'Tax-free please', jp:'免税でお願いします', rm:'Menzei de onegaishimasu' },
    { cat:'Shopping', en:'Do you accept credit cards?', jp:'カードは使えますか？', rm:'Kaado wa tsukaemasu ka?' },
    { cat:'Emergency', en:'Help!', jp:'助けて！', rm:'Tasukete!' },
    { cat:'Emergency', en:'Call an ambulance', jp:'救急車を呼んでください', rm:'Kyuukyuusha o yonde kudasai' },
    { cat:'Emergency', en:'I\'m lost', jp:'道に迷いました', rm:'Michi ni mayoimashita' },
    { cat:'Emergency', en:'I don\'t understand', jp:'わかりません', rm:'Wakarimasen' },
    { cat:'Emergency', en:'Do you speak English?', jp:'英語を話せますか？', rm:'Eigo o hanasemasu ka?' },
    { cat:'Emergency', en:'Hospital', jp:'病院', rm:'Byouin' },
    { cat:'Train Station', en:'One ticket to... please', jp:'...まで一枚お願いします', rm:'...made ichimai onegaishimasu' },
    { cat:'Train Station', en:'Which platform?', jp:'何番ホームですか？', rm:'Nanban hoomu desu ka?' },
    { cat:'Train Station', en:'Is this the train to...?', jp:'...行きの電車ですか？', rm:'...iki no densha desu ka?' },
    { cat:'Train Station', en:'Last train', jp:'終電', rm:'Shuuden' },
    { cat:'Train Station', en:'Reserved seat', jp:'指定席', rm:'Shiteiseki' },
    { cat:'Polite', en:'I\'m sorry to bother you', jp:'お邪魔します', rm:'Ojama shimasu' },
    { cat:'Polite', en:'Cheers! (drinking)', jp:'乾杯！', rm:'Kanpai!' },
    { cat:'Polite', en:'Nice to meet you', jp:'はじめまして', rm:'Hajimemashite' },
    { cat:'Polite', en:'My name is...', jp:'...と申します', rm:'...to moushimasu' },
    { cat:'Onsen', en:'Where is the changing room?', jp:'脱衣所はどこですか？', rm:'Datsuijo wa doko desu ka?' },
    { cat:'Onsen', en:'Is there a towel?', jp:'タオルはありますか？', rm:'Taoru wa arimasu ka?' },
    { cat:'Onsen', en:'Men / Women', jp:'男 / 女', rm:'Otoko / Onna' },
];

function renderGuide() {
    const el = document.getElementById('guide-content');
    if (!el) return;

    if (guideTab === 'phrases') {
        const q = phraseSearch.toLowerCase();
        const filtered = q ? PHRASES.filter(p => p.en.toLowerCase().includes(q) || p.jp.includes(q) || p.rm.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)) : PHRASES;
        const cats = [...new Set(filtered.map(p => p.cat))];
        el.innerHTML = `
            <input type="text" class="phrase-search" placeholder="Search phrases..." value="${esc(phraseSearch)}" oninput="phraseSearch=this.value; renderGuide()">
            ${cats.map(cat => `
                <div class="phrase-section">
                    <div class="phrase-section-title">${esc(cat)}</div>
                    ${filtered.filter(p => p.cat === cat).map(p => `
                        <div class="phrase-card">
                            <div>
                                <div class="phrase-en">${esc(p.en)}</div>
                                <div class="phrase-romaji">${esc(p.rm)}</div>
                            </div>
                            <div class="phrase-jp">${esc(p.jp)}</div>
                            <button class="phrase-speak" onclick="speakJapanese('${esc(p.jp)}')" title="Speak">🔊</button>
                        </div>`).join('')}
                </div>`).join('')}`;
    } else {
        el.innerHTML = `
            <div class="transport-card">
                <h3>🚄 JR Pass (Japan Rail Pass)</h3>
                <p><strong>7-day pass: ~¥50,000 / 14-day: ~¥80,000 / 21-day: ~¥100,000</strong></p>
                <ul>
                    <li>Covers all JR trains including Shinkansen (except Nozomi & Mizuho)</li>
                    <li>Use <strong>Hikari</strong> or <strong>Kodama</strong> Shinkansen instead of Nozomi</li>
                    <li>Also covers JR local trains, some JR buses, and the JR ferry to Miyajima</li>
                    <li>Activate at any JR ticket office with your passport</li>
                </ul>
                <div class="transport-tip">💡 For this trip (Tokyo → Kyoto → Osaka → Tokyo), a 14-day pass likely pays for itself. Calculate your routes on japan-guide.com/e/e2361.html</div>
            </div>
            <div class="transport-card">
                <h3>💳 Suica / Pasmo (IC Card)</h3>
                <p>Rechargeable contactless card for trains, buses, convenience stores, and vending machines.</p>
                <ul>
                    <li>Buy at any train station kiosk (¥500 deposit)</li>
                    <li>Tap in, tap out — fare is auto-calculated</li>
                    <li>Works across ALL cities (Tokyo, Kyoto, Osaka, Nara)</li>
                    <li>Top up at station machines or convenience stores</li>
                    <li>Keep ¥2,000–3,000 loaded for daily use</li>
                </ul>
                <div class="transport-tip">💡 Apple Pay / Google Pay Suica is available — add it to your phone wallet for tap-and-go without a physical card</div>
            </div>
            <div class="transport-card">
                <h3>🚌 Kyoto Bus Pass</h3>
                <p><strong>1-day pass: ¥700</strong> — unlimited city bus rides.</p>
                <ul>
                    <li>Buy on the bus or at Kyoto Station tourist info</li>
                    <li>Each single ride is ¥230, so 4+ rides = worth it</li>
                    <li>Covers most tourist routes (Kinkaku-ji, Gion, Arashiyama)</li>
                    <li>NOT valid on subway — only buses</li>
                </ul>
            </div>
            <div class="transport-card">
                <h3>📦 Luggage Forwarding (Takkyubin)</h3>
                <p>Send luggage between hotels instead of carrying it on trains. Life-changing.</p>
                <ul>
                    <li>Available at any convenience store (7-Eleven, Lawson, FamilyMart)</li>
                    <li>Cost: ~¥2,000–3,000 per bag (size-dependent)</li>
                    <li>Next-day delivery between cities</li>
                    <li>Ask your hotel front desk to help fill the form</li>
                    <li>Main services: <strong>Yamato (ヤマト / Kuroneko)</strong> or <strong>Sagawa</strong></li>
                </ul>
                <div class="transport-tip">💡 Send bags from Tokyo hotel → Kyoto hotel the day before you travel. Arrive in Kyoto luggage-free!</div>
            </div>
            <div class="transport-card">
                <h3>🚇 Key Routes for This Trip</h3>
                <ul>
                    <li><strong>Tokyo → Kawaguchiko:</strong> Fuji Excursion from Shinjuku (~2h, JR Pass + surcharge)</li>
                    <li><strong>Tokyo → Kyoto:</strong> Shinkansen Hikari (~2h20, JR Pass)</li>
                    <li><strong>Kyoto → Osaka:</strong> JR Special Rapid (~30min, JR Pass)</li>
                    <li><strong>Osaka → Nara:</strong> JR Yamatoji Rapid (~45min, JR Pass) or Kintetsu (~35min, not JR)</li>
                    <li><strong>Osaka → Tokyo:</strong> Shinkansen Hikari (~2h30, JR Pass)</li>
                </ul>
            </div>`;
    }
}

function speakJapanese(text) {
    if (!('speechSynthesis' in window)) { showToast('Speech not supported in this browser', 'warn'); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    const voices = synth.getVoices();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.85;
    const jpVoice = voices.find(v => v.lang.startsWith('ja'));
    if (jpVoice) u.voice = jpVoice;
    synth.speak(u);
}

// ══════════════════════════════════════════════════════════════
//  HOTEL ADDRESS CARDS
// ══════════════════════════════════════════════════════════════
const DEFAULT_HOTELS = [
    { city:'Tokyo',  nameJp:'京王プラザホテル', addrJp:'〒160-8330 東京都新宿区西新宿2-2-1', nameEn:'Keio Plaza Hotel Tokyo', mapUrl:'https://www.google.com/maps?q=Keio+Plaza+Hotel+Tokyo' },
    { city:'Kyoto',  nameJp:'ホテル名未定', addrJp:'京都市', nameEn:'TBD — Kyoto hotel', mapUrl:'#' },
    { city:'Osaka',  nameJp:'ホテル名未定', addrJp:'大阪市', nameEn:'TBD — Osaka hotel', mapUrl:'#' },
];

function loadHotels() {
    const saved = localStorage.getItem('japan-hotels');
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_HOTELS));
}
function saveHotels(hotels) { localStorage.setItem('japan-hotels', JSON.stringify(hotels)); }

function renderHotelCards() {
    const container = document.getElementById('hotel-cards');
    if (!container) return;
    const hotels = loadHotels();
    container.innerHTML = hotels.map(h => `
        <div class="hotel-card" data-city="${h.city}">
            <div class="hotel-city">${esc(h.city)}</div>
            <div class="hotel-name-jp">${esc(h.nameJp)}</div>
            <div class="hotel-addr-jp">${esc(h.addrJp)}</div>
            <div class="hotel-name-en">${esc(h.nameEn)}</div>
            <div class="hotel-actions">
                <button class="btn btn-sm btn-ghost" onclick="copyHotel('${h.city}')">📋 Copy</button>
                <a class="btn btn-sm btn-navigate" href="${h.mapUrl}" target="_blank">📍 Map</a>
            </div>
        </div>`).join('');
}

function copyHotel(city) {
    const hotels = loadHotels();
    const h = hotels.find(x => x.city === city);
    if (!h) return;
    const text = `${h.nameJp}\n${h.addrJp}\n${h.nameEn}`;
    navigator.clipboard.writeText(text).then(() => showToast('Hotel address copied!', 'success'));
}

function openHotelEditor() {
    const hotels = loadHotels();
    const html = hotels.map((h, i) => `
        <div style="margin-bottom:1rem;padding:.75rem;background:var(--bg-2);border-radius:8px">
            <div style="font-weight:700;color:var(--accent);margin-bottom:.4rem">${h.city}</div>
            <div class="form-group"><label>Name (Japanese)</label><input type="text" value="${esc(h.nameJp)}" id="hed-jp-${i}"></div>
            <div class="form-group"><label>Address (Japanese)</label><input type="text" value="${esc(h.addrJp)}" id="hed-addr-${i}"></div>
            <div class="form-group"><label>Name (English)</label><input type="text" value="${esc(h.nameEn)}" id="hed-en-${i}"></div>
            <div class="form-group"><label>Google Maps URL</label><input type="text" value="${esc(h.mapUrl)}" id="hed-url-${i}"></div>
        </div>`).join('');

    document.getElementById('detail-content').innerHTML = `
        <h2>Edit Hotel Addresses</h2>
        ${html}
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="closeModal('modal-detail')">Cancel</button>
            <button class="btn btn-accent" onclick="saveHotelEditor()">Save</button>
        </div>`;
    openModal('modal-detail');
}

function saveHotelEditor() {
    const hotels = loadHotels();
    hotels.forEach((h, i) => {
        h.nameJp = document.getElementById(`hed-jp-${i}`).value.trim();
        h.addrJp = document.getElementById(`hed-addr-${i}`).value.trim();
        h.nameEn = document.getElementById(`hed-en-${i}`).value.trim();
        h.mapUrl = document.getElementById(`hed-url-${i}`).value.trim();
    });
    saveHotels(hotels);
    renderHotelCards();
    closeModal('modal-detail');
    showToast('Hotel addresses saved!', 'success');
}

// ══════════════════════════════════════════════════════════════
//  CURRENCY CONVERTER
// ══════════════════════════════════════════════════════════════
function convertCurrency(from) {
    const rate = parseFloat(document.getElementById('currency-rate').value) || 0;
    if (from === 'yen') {
        const yen = parseFloat(document.getElementById('currency-yen').value) || 0;
        document.getElementById('currency-local').value = yen ? (yen * rate).toFixed(2) : '';
    } else {
        const local = parseFloat(document.getElementById('currency-local').value) || 0;
        document.getElementById('currency-yen').value = local && rate ? Math.round(local / rate) : '';
    }
}

function setYen(amount) {
    document.getElementById('currency-yen').value = amount;
    convertCurrency('yen');
}

// ══════════════════════════════════════════════════════════════
//  GOOGLE PHOTOS ALBUM LINK
// ══════════════════════════════════════════════════════════════
function loadPhotosUrl() {
    const url = localStorage.getItem('japan-photos-url') || '';
    const link = document.getElementById('photos-link');
    const input = document.getElementById('photos-url');
    if (link) link.href = url || '#';
    if (input) input.value = url;
}
function savePhotosUrl(url) {
    localStorage.setItem('japan-photos-url', url.trim());
    loadPhotosUrl();
    showToast('Photos album link saved!', 'success');
}

// ══════════════════════════════════════════════════════════════
//  PHOTO FETCHING (disabled by default — flip ENABLE_API_PHOTOS)
// ══════════════════════════════════════════════════════════════
function startPhotoFetching() {
    if (!ENABLE_API_PHOTOS || !placesService) return;
    photoQueue = state.places.filter(p => !p.photoUrl);
    processPhotoQueue();
}

function processPhotoQueue() {
    if (!ENABLE_API_PHOTOS) return;
    if (isProcessingPhotos || photoQueue.length === 0) return;
    isProcessingPhotos = true;
    const place = photoQueue.shift();
    const query = place.name + ', ' + place.city + ', Japan';
    placesService.findPlaceFromQuery({ query, fields: ['photos', 'place_id'] }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.[0]) {
            const r = results[0];
            if (r.photos?.length) {
                place.photoUrl = r.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 });
                save();
                // Update card if visible
                const card = document.querySelector(`.place-card[data-id="${place.id}"]`);
                if (card) {
                    const img = card.querySelector('.thumb-img');
                    if (img) { img.src = place.photoUrl; img.style.display = ''; }
                }
            }
            if (r.place_id) place.googlePlaceId = r.place_id;
        }
        isProcessingPhotos = false;
        setTimeout(processPhotoQueue, 200);
    });
}
