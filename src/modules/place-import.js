// ── Place Import: Smart import from Google Maps links or text search ──
//
// Supports:
//   1. Full Google Maps URLs (google.com/maps/place/...)
//   2. Short Google Maps links (maps.app.goo.gl/..., share.google/...)
//   3. Plain text search ("Animate Osaka")
//

import { showToast } from './toast.js';
import { detectCategoryFromTypes, detectCityFromAddress } from './destination.js';

// ══════════════════════════════════════════════════════════════
//  URL DETECTION
// ══════════════════════════════════════════════════════════════
function isUrl(str) {
    return /^https?:\/\//i.test(str.trim());
}

function isShortUrl(url) {
    return /maps\.app\.goo\.gl|goo\.gl\/maps|share\.google/i.test(url);
}

// ── Extract place name or coords from a full Google Maps URL ──
function parseFullGoogleUrl(url) {
    const result = {};

    // Extract place name from /place/Name+Here/
    const nameMatch = url.match(/\/place\/([^/@?]+)/);
    if (nameMatch) {
        result.query = decodeURIComponent(nameMatch[1]).replace(/\+/g, ' ');
    }

    // Extract coordinates from @lat,lng
    const coordMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (coordMatch) {
        result.lat = parseFloat(coordMatch[1]);
        result.lng = parseFloat(coordMatch[2]);
    }

    // Extract query param ?q=...
    const qMatch = url.match(/[?&]q=([^&]+)/);
    if (qMatch && !result.query) {
        const decoded = decodeURIComponent(qMatch[1]).replace(/\+/g, ' ');
        // Only use if it's not just coordinates
        if (!/^-?\d+\.\d+,-?\d+\.\d+$/.test(decoded)) {
            result.query = decoded;
        }
    }

    return (result.query || result.lat) ? result : null;
}

// ══════════════════════════════════════════════════════════════
//  GOOGLE PLACES HELPERS
// ══════════════════════════════════════════════════════════════
function getPlacesService() {
    const svc = window._placesService;
    if (!svc) {
        showToast('Google Maps still loading — try again in a moment.', 'warn');
        return null;
    }
    return svc;
}

const DETAIL_FIELDS = [
    'name', 'formatted_address', 'address_components', 'geometry',
    'opening_hours', 'types', 'photos', 'website', 'url',
    'price_level', 'place_id', 'editorial_summary', 'reviews'
];

function fetchDetailsAndFill(placeId, fallbackResult) {
    const svc = getPlacesService();
    if (!svc) return;

    try {

        svc.getDetails({ placeId, fields: DETAIL_FIELDS }, (result, status) => {

            if (status === google.maps.places.PlacesServiceStatus.OK && result) {
                fillFormFromResult(result);
            } else if (fallbackResult) {
                // getDetails failed but we have a textSearch result — use it directly
                showToast('Using basic info (details API restricted).', 'info');
                fillFormFromResult(fallbackResult);
            } else {
                showToast(`Lookup failed (${status}). Try a different search.`, 'error');
            }
        });
    } catch (e) {
        if (fallbackResult) {
            fillFormFromResult(fallbackResult);
        } else {
            showToast('Place lookup failed. Try a different search.', 'error');
        }
    }
}

function textSearchAndFill(query) {
    const svc = getPlacesService();
    if (!svc) return;


    svc.textSearch({ query: query + ', Japan' }, (results, status) => {

        if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
            const top = results[0];
            // textSearch already returns name, address, geometry, types, photos
            // Try getDetails for extra info (hours, website), fall back to textSearch data
            if (top.place_id) {
                fetchDetailsAndFill(top.place_id, top);
            } else {
                fillFormFromResult(top);
            }
        } else {
            showToast(`No results for "${query}". Status: ${status}`, 'error');
        }
    });
}

function nearbySearchAndFill(lat, lng) {
    const svc = getPlacesService();
    if (!svc) return;

    svc.nearbySearch({
        location: { lat, lng },
        radius: 200,
    }, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
            fetchDetailsAndFill(results[0].place_id);
        } else {
            showToast('No places found at those coordinates.', 'error');
        }
    });
}

// ══════════════════════════════════════════════════════════════
//  RESOLVE SHORT URLS
// ══════════════════════════════════════════════════════════════
async function resolveShortUrl(shortUrl) {
    // Try to follow the redirect to get the full Google Maps URL.
    // This may fail due to CORS — we handle that gracefully.
    try {
        const resp = await fetch(shortUrl, { redirect: 'follow' });
        // If we get here, the browser followed the redirect
        // resp.url should be the final URL
        if (resp.url && resp.url.includes('google.com/maps')) {
            return resp.url;
        }
        // Try reading the HTML for a redirect meta tag or canonical URL
        const html = await resp.text();
        const metaMatch = html.match(/content="[^"]*url=([^"]+)"/i)
                       || html.match(/href="(https:\/\/www\.google\.com\/maps[^"]+)"/i);
        if (metaMatch) return metaMatch[1];
    } catch (e) {
        // CORS blocked — expected for most short URLs
    }
    return null;
}

// ══════════════════════════════════════════════════════════════
//  FORMAT HELPERS
// ══════════════════════════════════════════════════════════════
function formatOpeningHours(oh) {
    if (!oh) return '';
    if (oh.weekday_text?.length) {
        const times = oh.weekday_text.map(t => t.replace(/^[^:]+:\s*/, ''));
        const unique = [...new Set(times)];
        if (unique.length === 1) return unique[0];
        return times[0] || '';
    }
    if (oh.periods?.length === 1 && oh.periods[0].open && !oh.periods[0].close) {
        return '24 hours';
    }
    return '';
}

function formatPriceLevel(pl) {
    if (pl == null) return '';
    return ['Free', '~¥500–1,000', '~¥1,000–3,000', '~¥3,000–8,000', '~¥8,000+'][pl] || '';
}

// ══════════════════════════════════════════════════════════════
//  FILL THE ADD/EDIT PLACE FORM
// ══════════════════════════════════════════════════════════════
function buildDescription(detail, category) {
    // Try editorial_summary first (Google's own description)
    if (detail.editorial_summary?.text) return detail.editorial_summary.text;

    // Build from available data
    const parts = [];
    const name = detail.name || '';
    const types = (detail.types || [])
        .filter(t => !['point_of_interest', 'establishment', 'premise', 'political', 'geocode'].includes(t))
        .map(t => t.replace(/_/g, ' '));

    if (types.length) {
        const typeStr = types.slice(0, 2).join(' & ');
        parts.push(typeStr.charAt(0).toUpperCase() + typeStr.slice(1));
    }

    // Extract a snippet from the top review
    if (detail.reviews?.length) {
        const best = detail.reviews.reduce((a, b) => (b.rating > a.rating ? b : a), detail.reviews[0]);
        if (best.text) {
            // Take first sentence, max 120 chars
            let snippet = best.text.split(/[.!?]/)[0].trim();
            if (snippet.length > 120) snippet = snippet.substring(0, 117) + '...';
            if (snippet.length > 20) parts.push(snippet);
        }
    }

    return parts.join('. ') + (parts.length ? '.' : '');
}

function fillFormFromResult(detail) {
    const types = detail.types || [];
    const loc = detail.geometry?.location;
    const lat = loc ? (typeof loc.lat === 'function' ? loc.lat() : loc.lat) : null;
    const lng = loc ? (typeof loc.lng === 'function' ? loc.lng() : loc.lng) : null;
    const city = detectCityFromAddress(detail.address_components) || '';
    const category = detectCategoryFromTypes(types);
    const photoUrl = detail.photos?.length
        ? detail.photos[0].getUrl({ maxWidth: 400, maxHeight: 300 }) : '';
    const description = buildDescription(detail, category);

    // Reset form
    const form = document.getElementById('place-form');
    if (form) form.reset();
    document.getElementById('f-id').value = '';

    // Fill fields
    const set = (id, v) => { const el = document.getElementById(id); if (el && v != null && v !== '') el.value = v; };
    set('f-name', detail.name);
    set('f-address', detail.formatted_address || detail.vicinity || '');
    set('f-lat', lat);
    set('f-lng', lng);
    set('f-hours', formatOpeningHours(detail.opening_hours));
    set('f-cost', formatPriceLevel(detail.price_level));
    set('f-url', detail.website || detail.url || '');
    set('f-desc', description);

    // City dropdown
    if (city) {
        const cityEl = document.getElementById('f-city');
        if (cityEl) cityEl.value = [...cityEl.options].some(o => o.value === city) ? city : 'Other';
    }

    // Category dropdown
    if (category) {
        const catEl = document.getElementById('f-category');
        if (catEl) catEl.value = category;
    }

    // Store photo URL for use when saving (picked up by handlePlaceSubmit)
    window._importedPhotoUrl = photoUrl;

    // Open modal for review
    window.openModal?.('modal-place');
    const titleEl = document.getElementById('modal-place-title');
    if (titleEl) titleEl.textContent = 'Review Imported Place';

    showToast(`Found: ${detail.name || 'place'}${city ? ' · ' + city : ''}. Review and save!`, 'success', 4000);
}

// ══════════════════════════════════════════════════════════════
//  MAIN ENTRY POINT: SMART IMPORT
// ══════════════════════════════════════════════════════════════
export async function smartImport(input) {

    if (!input || !input.trim()) {
        showToast('Paste a Google Maps link or type a place name.', 'warn');
        return;
    }

    input = input.trim();

    // ── Case 1: Not a URL → text search ──
    if (!isUrl(input)) {
        showToast('Searching...', 'info', 2000);
        textSearchAndFill(input);
        return;
    }

    // ── Case 2: Short URL (goo.gl, share.google) → resolve then parse ──
    if (isShortUrl(input)) {
        showToast('Resolving short link...', 'info', 3000);
        const fullUrl = await resolveShortUrl(input);
        if (fullUrl) {
            const parsed = parseFullGoogleUrl(fullUrl);
            if (parsed?.query) {
                showToast('Found place name, looking up...', 'info', 2000);
                textSearchAndFill(parsed.query);
                return;
            }
            if (parsed?.lat) {
                nearbySearchAndFill(parsed.lat, parsed.lng);
                return;
            }
        }
        // Resolution failed — try to open and let user get the name
        showToast('Couldn\'t resolve short link. Opening it so you can copy the place name...', 'warn', 5000);
        window.open(input, '_blank');
        return;
    }

    // ── Case 3: Full Google Maps URL → parse and lookup ──
    const parsed = parseFullGoogleUrl(input);
    if (parsed) {
        showToast('Looking up place...', 'info', 2000);
        if (parsed.query) {
            textSearchAndFill(parsed.query);
        } else if (parsed.lat) {
            nearbySearchAndFill(parsed.lat, parsed.lng);
        }
        return;
    }

    // ── Fallback: treat as search text ──
    showToast('Searching...', 'info', 2000);
    textSearchAndFill(input);
}

// ── UI handler ──
export function handleSmartImport() {
    const el = document.getElementById('smart-import-input');
    if (el) {
        smartImport(el.value);
        el.value = '';
    }
}
