// ── Destination Config: Extensible per-country configuration ──
// This is the foundation for multi-destination support.
// All UI (filters, dropdowns, colors, chips) should be generated from this config.

export const DESTINATION = {
    name: 'Japan',
    countryCode: 'jp',
    defaultZoom: 6,
    center: { lat: 36.2, lng: 138.2 },

    cities: [
        { id: 'tokyo',  name: 'Tokyo',  color: '#3b82f6' },
        { id: 'kyoto',  name: 'Kyoto',  color: '#ef4444' },
        { id: 'osaka',  name: 'Osaka',  color: '#f59e0b' },
        { id: 'nara',   name: 'Nara',   color: '#10b981' },
        { id: 'fuji',   name: 'Fuji',   color: '#8b5cf6' },
        { id: 'izu',    name: 'Izu',    color: '#06b6d4' },
    ],

    categories: [
        { id: 'Food',          icon: '🍜', markerColor: '#f59e0b' },
        { id: 'Shopping',      icon: '🛍️', markerColor: '#8b5cf6' },
        { id: 'Attractions',   icon: '⛩️', markerColor: '#10b981' },
        { id: 'Entertainment', icon: '🎮', markerColor: '#3b82f6' },
        { id: 'Hotel',         icon: '🏨', markerColor: '#ec4899' },
        { id: 'Onsen',         icon: '♨️', markerColor: '#ef4444' },
    ],

    currency: { code: 'JPY', symbol: '¥', defaultRate: 0.22 },

    emergencyNumbers: {
        police: '110',
        ambulance: '119',
        fire: '119',
        embassy: '+81-3-3224-5000',
    },

    // Google Places types → app category mapping
    typeToCategoryMap: {
        restaurant: 'Food', cafe: 'Food', bakery: 'Food', bar: 'Food',
        meal_delivery: 'Food', meal_takeaway: 'Food', food: 'Food',
        store: 'Shopping', shopping_mall: 'Shopping', clothing_store: 'Shopping',
        shoe_store: 'Shopping', electronics_store: 'Shopping', book_store: 'Shopping',
        convenience_store: 'Shopping', department_store: 'Shopping', supermarket: 'Shopping',
        tourist_attraction: 'Attractions', museum: 'Attractions', park: 'Attractions',
        temple: 'Attractions', shrine: 'Attractions', church: 'Attractions',
        zoo: 'Attractions', aquarium: 'Attractions', art_gallery: 'Attractions',
        garden: 'Attractions', castle: 'Attractions', monument: 'Attractions',
        amusement_park: 'Entertainment', movie_theater: 'Entertainment',
        bowling_alley: 'Entertainment', casino: 'Entertainment', stadium: 'Entertainment',
        night_club: 'Entertainment',
        lodging: 'Hotel', hotel: 'Hotel', ryokan: 'Hotel',
        spa: 'Onsen',
    },

    // City detection: address component → city name mapping
    addressToCityMap: {
        'tokyo': 'Tokyo', 'shinjuku': 'Tokyo', 'shibuya': 'Tokyo', 'chiyoda': 'Tokyo',
        'minato': 'Tokyo', 'taito': 'Tokyo', 'sumida': 'Tokyo', 'chuo': 'Tokyo',
        'toshima': 'Tokyo', 'setagaya': 'Tokyo', 'meguro': 'Tokyo', 'shinagawa': 'Tokyo',
        'urayasu': 'Tokyo', 'kamakura': 'Tokyo',
        'kyoto': 'Kyoto', 'ukyo': 'Kyoto', 'sakyo': 'Kyoto', 'higashiyama': 'Kyoto',
        'shimogyo': 'Kyoto', 'nakagyo': 'Kyoto', 'fushimi': 'Kyoto', 'kita-ku, kyoto': 'Kyoto',
        'osaka': 'Osaka', 'naniwa': 'Osaka', 'tennoji': 'Osaka', 'chuo-ku, osaka': 'Osaka',
        'namba': 'Osaka', 'kita-ku, osaka': 'Osaka', 'minoo': 'Osaka', 'ikoma': 'Osaka',
        'nara': 'Nara',
        'fujikawaguchiko': 'Fuji', 'fujiyoshida': 'Fuji', 'fujinomiya': 'Fuji',
        'yamanakako': 'Fuji', 'oshino': 'Fuji',
        'ito': 'Izu', 'shuzenji': 'Izu', 'kawazu': 'Izu', 'numazu': 'Izu', 'izu': 'Izu',
    },
};

// ── Helper functions derived from config ──

export function getCityColor(cityName) {
    const city = DESTINATION.cities.find(c => c.name === cityName);
    return city?.color || '#6b7280';
}

export function getCategoryIcon(catId) {
    const cat = DESTINATION.categories.find(c => c.id === catId);
    return cat?.icon || '📍';
}

export function getCategoryMarkerColor(catId) {
    const cat = DESTINATION.categories.find(c => c.id === catId);
    return cat?.markerColor || '#3b82f6';
}

export function detectCategoryFromTypes(googleTypes) {
    if (!googleTypes || !googleTypes.length) return 'Attractions';
    for (const t of googleTypes) {
        const mapped = DESTINATION.typeToCategoryMap[t];
        if (mapped) return mapped;
    }
    return 'Attractions';
}

export function detectCityFromAddress(addressComponents) {
    if (!addressComponents) return null;
    const map = DESTINATION.addressToCityMap;
    for (const comp of addressComponents) {
        const lower = comp.long_name.toLowerCase();
        if (map[lower]) return map[lower];
        const short = comp.short_name.toLowerCase();
        if (map[short]) return map[short];
    }
    return null;
}
