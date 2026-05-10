// ── Weather: Open-Meteo per-city daily forecast ──
// Phase 4.6. Free, no API key, no rate limit for personal use.
// Caches results in localStorage for 6h to minimise calls.

const CACHE_KEY = 'jp_weather_cache';
const CACHE_TTL = 6 * 60 * 60 * 1000;

// Approximate coords for the trip cities
const CITY_COORDS = {
    Tokyo:    { lat: 35.6762, lng: 139.6503 },
    Kyoto:    { lat: 35.0116, lng: 135.7681 },
    Osaka:    { lat: 34.6937, lng: 135.5023 },
    Nara:     { lat: 34.6851, lng: 135.8048 },
    Fuji:     { lat: 35.4878, lng: 138.7810 },
    Hakone:   { lat: 35.2324, lng: 139.1069 },
    Izu:      { lat: 34.9657, lng: 139.0986 },
};

const WMO_ICONS = {
    0: { icon:'☀️', label:'Clear' },
    1: { icon:'🌤', label:'Mostly clear' },
    2: { icon:'⛅', label:'Partly cloudy' },
    3: { icon:'☁️', label:'Overcast' },
    45: { icon:'🌫', label:'Fog' },
    48: { icon:'🌫', label:'Fog' },
    51: { icon:'🌦', label:'Light drizzle' },
    53: { icon:'🌦', label:'Drizzle' },
    55: { icon:'🌧', label:'Heavy drizzle' },
    61: { icon:'🌧', label:'Light rain' },
    63: { icon:'🌧', label:'Rain' },
    65: { icon:'🌧', label:'Heavy rain' },
    71: { icon:'🌨', label:'Light snow' },
    73: { icon:'🌨', label:'Snow' },
    75: { icon:'❄️', label:'Heavy snow' },
    80: { icon:'🌦', label:'Showers' },
    81: { icon:'🌧', label:'Showers' },
    82: { icon:'⛈', label:'Heavy showers' },
    95: { icon:'⛈', label:'Thunderstorm' },
    96: { icon:'⛈', label:'Thunderstorm hail' },
    99: { icon:'⛈', label:'Heavy thunderstorm' },
};
function wmoToIcon(code) { return WMO_ICONS[code] || { icon:'·', label:'' }; }

function loadCache() {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; }
    catch { return {}; }
}
function saveCache(c) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* ok */ }
}

function fresh(entry) {
    return entry && entry.ts && (Date.now() - entry.ts < CACHE_TTL);
}

// Fetch daily forecasts for a single city for next 16 days.
async function fetchCityForecast(city) {
    const c = CITY_COORDS[city];
    if (!c) return null;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&forecast_days=16`;
    try {
        const res = await fetch(url, { cache: 'force-cache' });
        if (!res.ok) throw new Error('weather HTTP ' + res.status);
        const data = await res.json();
        return data.daily;
    } catch { return null; }
}

// Returns: { 'YYYY-MM-DD': {code, max, min, pop} } for the city, cached.
export async function getWeatherForCity(city) {
    if (!city) return null;
    const cache = loadCache();
    if (fresh(cache[city])) return cache[city].data;
    const daily = await fetchCityForecast(city);
    if (!daily) return cache[city]?.data || null;
    const out = {};
    for (let i = 0; i < daily.time.length; i++) {
        out[daily.time[i]] = {
            code: daily.weather_code[i],
            max: Math.round(daily.temperature_2m_max[i]),
            min: Math.round(daily.temperature_2m_min[i]),
            pop: daily.precipitation_probability_max[i] ?? null,
        };
    }
    cache[city] = { ts: Date.now(), data: out };
    saveCache(cache);
    return out;
}

// Returns the weather entry for a city + ISO date (YYYY-MM-DD), or null.
export async function getWeatherForDay(city, dateISO) {
    const c = await getWeatherForCity(city);
    return c?.[dateISO] || null;
}

// Build a tiny chip for display: "☀️ 24° / 18°"
export function weatherChipHtml(weather) {
    if (!weather) return '';
    const ic = wmoToIcon(weather.code);
    const pop = weather.pop != null ? ` <span class="weather-pop">${weather.pop}%</span>` : '';
    return `<span class="weather-chip" title="${ic.label}${weather.pop != null ? ' · ' + weather.pop + '% precip' : ''}">${ic.icon} ${weather.max}° / ${weather.min}°${pop}</span>`;
}

// Sync helper for callers that have the chip-id pattern
export function attachWeatherChip(chipId, city, dateISO) {
    getWeatherForDay(city, dateISO).then(w => {
        if (!w) return;
        const el = document.getElementById(chipId);
        if (el) el.innerHTML = weatherChipHtml(w);
    });
}

// Pre-warm the cache for a list of cities, in background.
export function prewarmWeather(cities) {
    for (const c of cities) getWeatherForCity(c);
}

if (typeof window !== 'undefined') {
    window.getWeatherForCity = getWeatherForCity;
    window.getWeatherForDay = getWeatherForDay;
}
