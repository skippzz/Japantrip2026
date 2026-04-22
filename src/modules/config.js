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

export const ENABLE_API_PHOTOS = false;

export const MAX_SAVED_VERSIONS = 10;
export const VERSIONS_KEY = 'japanTripVersions';
export const STATE_KEY = 'japanTripData';
export const HOTELS_KEY = 'japan-hotels';
export const THEME_KEY = 'japan-theme';
export const PHOTOS_URL_KEY = 'japan-photos-url';
