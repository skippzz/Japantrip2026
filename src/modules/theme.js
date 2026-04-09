// ── Theme: Light/Dark mode toggle ──

import { THEME_KEY } from './config.js';
import { DARK_MAP_STYLES } from './data.js';

// Refs set by app.js after map init
let _gmap = null;
let _dayMaps = null;

export function setMapRefs(gmap, dayMaps) {
    _gmap = gmap;
    _dayMaps = dayMaps;
}

export function getMapStyles() {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    return theme === 'dark' ? DARK_MAP_STYLES : [];
}

export function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
        applyTheme(saved);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        applyTheme('light');
    } else {
        applyTheme('dark');
    }
}

export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'light' ? '☀️' : '🌙';
    localStorage.setItem(THEME_KEY, theme);
}

export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(current === 'dark' ? 'light' : 'dark');
    const styles = getMapStyles();
    if (_gmap) _gmap.setOptions({ styles });
    if (_dayMaps) Object.values(_dayMaps).forEach(m => m.setOptions({ styles }));
}
