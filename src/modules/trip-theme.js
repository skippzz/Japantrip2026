// ── Per-trip theming ──
// Phase 3.2. Allows each trip to override --accent and city colours.
// Stored on the trip object as `theme: { accent: '#xxx' }`.

import { getActiveTrip } from './trips.js';

export function applyTripTheme() {
    const trip = getActiveTrip();
    const root = document.documentElement;
    // Reset overrides
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-bg');
    root.style.removeProperty('--accent-hover');
    if (!trip?.theme) return;
    if (trip.theme.accent) {
        root.style.setProperty('--accent', trip.theme.accent);
        // Derive bg + hover variants from base
        root.style.setProperty('--accent-bg', hexToRgba(trip.theme.accent, .1));
        root.style.setProperty('--accent-hover', shade(trip.theme.accent, -15));
    }
}

function hexToRgba(hex, alpha) {
    const m = hex.replace('#', '').match(/(\w{2})(\w{2})(\w{2})/);
    if (!m) return hex;
    const [, r, g, b] = m.map((x, i) => i === 0 ? null : parseInt(x, 16));
    return `rgba(${r},${g},${b},${alpha})`;
}
function shade(hex, pct) {
    const m = hex.replace('#', '').match(/(\w{2})(\w{2})(\w{2})/);
    if (!m) return hex;
    const adjust = (c) => Math.max(0, Math.min(255, parseInt(c, 16) + Math.round(255 * pct / 100)));
    return '#' + adjust(m[1]).toString(16).padStart(2, '0')
              + adjust(m[2]).toString(16).padStart(2, '0')
              + adjust(m[3]).toString(16).padStart(2, '0');
}

if (typeof window !== 'undefined') {
    window.applyTripTheme = applyTripTheme;
}
