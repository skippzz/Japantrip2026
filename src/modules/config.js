// ── Config: Colors, icons, markers, and constants ──

export const DATA_VERSION = 19;

export const CITY_COLORS = {
    Tokyo:'#3b82f6', Kyoto:'#ef4444', Osaka:'#f59e0b',
    Nara:'#10b981', Fuji:'#8b5cf6', Izu:'#06b6d4', Other:'#6b7280'
};

export const CATEGORY_ICONS = {
    Food:'🍜', Shopping:'🛍️', Attractions:'⛩️',
    Entertainment:'🎮', Hotel:'🏨', Onsen:'♨️'
};

export const MARKER_COLORS = {
    Food:'#f59e0b', Shopping:'#8b5cf6', Attractions:'#10b981',
    Entertainment:'#3b82f6', Hotel:'#ec4899', Onsen:'#ef4444'
};

// Runtime Places API photo fetching. Photo responses are persisted by the
// service worker's image cache (Cache Storage), so we only hit Google once
// per photo per device. The SW also rejects suspiciously small responses
// (< 5KB) so Google's "for development purposes only" placeholder image
// — which it returns as HTTP 200 when a key is restricted/throttled —
// never gets cached as if it were a real photo.
export const ENABLE_API_PHOTOS = true;

export const MAX_SAVED_VERSIONS = 10;
export const VERSIONS_KEY = 'japanTripVersions';
export const STATE_KEY = 'japanTripData';
export const HOTELS_KEY = 'japan-hotels';
export const THEME_KEY = 'japan-theme';
export const PHOTOS_URL_KEY = 'japan-photos-url';
