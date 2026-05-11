// ── State: Persistence, migrations, pub/sub, versioning ──

import { DATA_VERSION, STATE_KEY, VERSIONS_KEY, MAX_SAVED_VERSIONS } from './config.js';
import {
    DEFAULT_PLACES, DEFAULT_TODOS, DEFAULT_ITINERARY, DEFAULT_PACKING, DEFAULT_RULES
} from './data.js';
import { showToast } from './toast.js';
import { esc, formatTimeAgo, setStateRef } from './helpers.js';

// ── Pub/Sub ──
const listeners = {};

export function subscribe(event, fn) {
    (listeners[event] ||= []).push(fn);
}

export function emit(event, data) {
    (listeners[event] || []).forEach(fn => fn(data));
}

// ── State Object ──
export let state = { places: [], todos: [], itinerary: [], packing: [], rules: [], version: DATA_VERSION };

// ── Migrations ──
const STATE_MIGRATIONS = {
    17: function migrateV17toV18(s) {
        if (s.itinerary && s.places) {
            const placesByName = new Map();
            const placesByNameLower = new Map();
            s.places.forEach(p => {
                placesByName.set(p.name, p.id);
                placesByNameLower.set(p.name.toLowerCase(), p.id);
            });
            s.itinerary.forEach(day => {
                if (!day.items) return;
                day.items.forEach(item => {
                    if (item.placeId != null || item.isNote) return;
                    const id = placesByName.get(item.name) ?? placesByNameLower.get(item.name?.toLowerCase());
                    if (id != null) item.placeId = id;
                });
            });
        }
        s.version = 18;
    },
    18: function migrateV18toV19(s) {
        // Add rules array if missing
        if (!s.rules) {
            s.rules = [
                "Keep rooms tidy",
                "Be prepared with your packing",
                "Text/call to coordinate meetups",
                "Stay on schedule for reservations",
                "Close windows & doors when out",
                "Keep CASH — many places are cash-only",
            ];
        }
        s.version = 19;
    },
};

// T1.8: MIN_VERSION lifted from 14 → 17 because we only define migrations
// 17→18 and 18→19. Anyone with stored state at v14/15/16 was being silently
// wiped on load. Treating those (rare) cases as unmigratable now falls through
// to the defaults path consistently rather than failing partway.
function applyMigrations(s) {
    const MIN_VERSION = 17;
    if (!s.version || s.version < MIN_VERSION) return false;
    while (s.version < DATA_VERSION) {
        const migrate = STATE_MIGRATIONS[s.version];
        if (!migrate) return false;
        migrate(s);
    }
    return s.version === DATA_VERSION;
}

// ── Load / Save ──
function stripStaleGooglePhotoUrls(s) {
    // Google Places CDN URLs are tied to an API key. When the key is
    // restricted/expired/throttled the CDN serves a placeholder map-X
    // image instead of a 404, so we can't detect failure at <img> load
    // time. Cheapest fix: never trust them — purge on load.
    if (!s?.places) return;
    s.places.forEach(p => {
        if (p.photoUrl && /googleusercontent\.com|googleapis\.com|ggpht\.com/.test(p.photoUrl)) {
            delete p.photoUrl;
        }
    });
}

export function loadState() {
    try {
        const raw = localStorage.getItem(activeStorageKey);
        if (raw) {
            const s = JSON.parse(raw);
            if (s.version === DATA_VERSION) {
                stripStaleGooglePhotoUrls(s);
                state = s; setStateRef(state); return;
            }
            if (applyMigrations(s)) {
                stripStaleGooglePhotoUrls(s);
                state = s; setStateRef(state); save(); return;
            }
        }
    } catch (e) { /* corrupt data, fall through to defaults */ }
    state.places = JSON.parse(JSON.stringify(DEFAULT_PLACES));
    state.todos = JSON.parse(JSON.stringify(DEFAULT_TODOS));
    state.itinerary = JSON.parse(JSON.stringify(DEFAULT_ITINERARY));
    state.packing = JSON.parse(JSON.stringify(DEFAULT_PACKING));
    state.rules = JSON.parse(JSON.stringify(DEFAULT_RULES));
    state.version = DATA_VERSION;
    setStateRef(state);
    save();
}

// Active storage key — can be changed by trips module for multi-trip support
let activeStorageKey = STATE_KEY;

export function setStorageKey(key) { activeStorageKey = key; }
export function getStorageKey() { return activeStorageKey; }

// Wave 4: multi-tab sync. Other tabs editing the same trip should refresh.
// Suppress writes initiated by this tab (the event only fires in other tabs).
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key !== activeStorageKey || !e.newValue) return;
        try {
            const next = JSON.parse(e.newValue);
            if (next?.version === DATA_VERSION) {
                Object.assign(state, next);
                setStateRef(state);
                emit('renderAll');
                showToast?.('Updated from another tab', 'info', 2500);
            }
        } catch { /* ignore */ }
    });
}

export function save() {
    try {
        localStorage.setItem(activeStorageKey, JSON.stringify(state));
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            showToast('Storage full! Export your data as JSON to avoid losing changes.', 'error', 6000);
        } else {
            showToast('Failed to save: ' + e.message, 'error');
        }
    }
}

export function getStorageUsageKB() {
    try {
        const data = localStorage.getItem(activeStorageKey) || '';
        return (new Blob([data]).size / 1024).toFixed(1);
    } catch { return '?'; }
}

// ── Export / Import ──
export function exportData() {
    if (!state || !state.places || !state.places.length) {
        showToast('Nothing to export — state is empty. Try refreshing first.', 'error');
        return;
    }
    const defaultName = `japan-trip-backup-${new Date().toISOString().slice(0, 10)}`;
    const fileName = prompt('Save file as:', defaultName);
    if (!fileName) return;
    const totalItems = state.itinerary.reduce((sum, d) => sum + d.items.length, 0);
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.json') ? fileName : fileName + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported: ${state.places.length} places, ${state.itinerary.length} days, ${totalItems} activities.`, 'success');
}

export function importData(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            let text = e.target.result;
            text = text.replace(/^\uFEFF/, '').trim();
            const imported = JSON.parse(text);
            if (!imported.places || !imported.itinerary) {
                showToast('Invalid file — missing places or itinerary data.', 'error');
                return;
            }
            if (!confirm(`Import ${imported.places.length} places and ${imported.itinerary.length} days? This will replace your current data.`)) return;
            // T3.51 (refined): try migrating the imported state. Files with no
            // `.version` field (older exports) get the same field-padding
            // treatment as unmigratable v<MIN_VERSION files instead of being
            // accepted as-is — they would otherwise miss migration-added fields
            // like `.rules` (added in v18→v19) silently.
            const ver = imported.version;
            if (ver && ver < DATA_VERSION) {
                if (!applyMigrations(imported)) {
                    if (!imported.rules) imported.rules = [];
                    if (!imported.packing) imported.packing = [];
                    if (!imported.todos) imported.todos = [];
                    imported.version = DATA_VERSION;
                }
            } else if (ver && ver > DATA_VERSION) {
                showToast(`File is from a newer version (v${ver}). Loading anyway — some features may be missing.`, 'warn', 5000);
                imported.version = DATA_VERSION;
            } else {
                // No version OR version === DATA_VERSION — pad common
                // migration-added fields so we don't end up with undefined
                // arrays after import of an older versionless export.
                if (!imported.rules) imported.rules = [];
                if (!imported.packing) imported.packing = [];
                if (!imported.todos) imported.todos = [];
                imported.version = DATA_VERSION;
            }
            state = imported;
            // T3.51: clear stale photoUrl entries — those are ephemeral Google
            // CDN URLs that may have expired by import time.
            (state.places || []).forEach(p => { delete p.photoUrl; });
            setStateRef(state);
            // Reset UI state
            window._expandedDays?.clear();
            if (state.itinerary?.length) window._expandedDays?.add(state.itinerary[0].id);
            Object.keys(window._dayMaps || {}).forEach(k => delete window._dayMaps[k]);
            save();
            emit('renderAll');
            showToast('Import successful!', 'success');
        } catch (err) {
            showToast('Failed to read file: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}

// ── Save Versioning ──
// T2.16: per-trip namespaced version key. The original VERSIONS_KEY was global,
// so quick-saves on Trip A would overwrite Trip B's snapshots when at MAX
// capacity. We derive a per-trip key from the active storage key. Old global
// data continues to be readable via getLegacyVersions() for one-time merge.
function activeVersionsKey() {
    return VERSIONS_KEY + ':' + activeStorageKey;
}
function getSavedVersions() {
    try {
        const cur = JSON.parse(localStorage.getItem(activeVersionsKey())) || [];
        if (cur.length) return cur;
        // Migrate legacy global versions on first read of the legacy trip's key.
        if (activeStorageKey === STATE_KEY) {
            const legacy = JSON.parse(localStorage.getItem(VERSIONS_KEY)) || [];
            if (legacy.length) {
                localStorage.setItem(activeVersionsKey(), JSON.stringify(legacy));
                return legacy;
            }
        }
        return [];
    }
    catch { return []; }
}

function saveSavedVersions(versions) {
    try { localStorage.setItem(activeVersionsKey(), JSON.stringify(versions)); }
    catch { showToast('Could not save version list — storage may be full.', 'error'); }
}

// Non-interactive snapshot — used by destructive flows (e.g. template replace) to
// guarantee an undo point. Silently drops oldest if at MAX_SAVED_VERSIONS.
// T2.18: skip auto-snapshots when state is essentially empty (no places, no
// itinerary items) — pollutes the version list otherwise.
export function autoSaveVersion(name) {
    try {
        const itemsCount = (state.itinerary || []).reduce((n, d) => n + (d.items?.length || 0), 0);
        const placesCount = state.places?.length || 0;
        if (itemsCount === 0 && placesCount === 0) return false;
        const versions = getSavedVersions();
        if (versions.length >= MAX_SAVED_VERSIONS) versions.pop();
        versions.unshift({
            name,
            timestamp: Date.now(),
            snapshot: JSON.parse(JSON.stringify(state)),
            auto: true,
        });
        saveSavedVersions(versions);
        renderSavedVersions();
        return true;
    } catch {
        return false;
    }
}

export function quickSave() {
    // Wave 1: same empty-state guard as autoSaveVersion so users don't
    // pollute the snapshot list with no-content captures.
    const itemsCount = (state.itinerary || []).reduce((n, d) => n + (d.items?.length || 0), 0);
    const placesCount = state.places?.length || 0;
    if (itemsCount === 0 && placesCount === 0) {
        showToast('Nothing to save yet — add some places or activities first.', 'warn');
        return;
    }
    const defaultName = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    const name = prompt('Name this save:', defaultName);
    if (!name) return;

    const versions = getSavedVersions();
    if (versions.length >= MAX_SAVED_VERSIONS) {
        if (!confirm(`You have ${MAX_SAVED_VERSIONS} saved versions. The oldest will be removed. Continue?`)) return;
        versions.pop();
    }
    versions.unshift({
        name,
        timestamp: Date.now(),
        snapshot: JSON.parse(JSON.stringify(state))
    });
    saveSavedVersions(versions);
    renderSavedVersions();
    showToast(`Saved: "${name}"`, 'success');
}

export function loadVersion(index) {
    const versions = getSavedVersions();
    const v = versions[index];
    if (!v) return;
    if (!confirm(`Load "${v.name}"? This will replace your current data.`)) return;
    state = JSON.parse(JSON.stringify(v.snapshot));
    if (state.version !== DATA_VERSION) applyMigrations(state);
    if (!state.rules) state.rules = [];
    setStateRef(state);
    window._expandedDays?.clear();
    if (state.itinerary?.length) window._expandedDays?.add(state.itinerary[0].id);
    Object.keys(window._dayMaps || {}).forEach(k => delete window._dayMaps[k]);
    save();
    emit('renderAll');
    showToast(`Loaded: "${v.name}"`, 'success');
}

export function deleteVersion(index) {
    const versions = getSavedVersions();
    const v = versions[index];
    if (!v || !confirm(`Delete saved version "${v.name}"?`)) return;
    versions.splice(index, 1);
    saveSavedVersions(versions);
    renderSavedVersions();
    showToast('Version deleted.', 'info');
}

export function renameVersion(index) {
    const versions = getSavedVersions();
    const v = versions[index];
    if (!v) return;
    const name = prompt('Rename version:', v.name);
    if (!name) return;
    v.name = name;
    saveSavedVersions(versions);
    renderSavedVersions();
}

export function renderSavedVersions() {
    const container = document.getElementById('saved-versions-list');
    const usageEl = document.getElementById('storage-usage');
    if (!container) return;

    const versions = getSavedVersions();
    if (usageEl) usageEl.textContent = `Storage: ~${getStorageUsageKB()} KB used`;

    if (versions.length === 0) {
        container.innerHTML = '<div class="pool-empty">No saved versions yet. Use Quick Save to create one.</div>';
        return;
    }

    container.innerHTML = versions.map((v, i) => {
        const date = new Date(v.timestamp);
        const ago = formatTimeAgo(date);
        return `<div class="saved-version-item">
            <div class="saved-version-info" onclick="loadVersion(${i})" title="Click to load">
                <div class="saved-version-name">${esc(v.name)}</div>
                <div class="saved-version-date">${ago}</div>
            </div>
            <div class="saved-version-actions">
                <button onclick="renameVersion(${i})" title="Rename">✏️</button>
                <button onclick="deleteVersion(${i})" title="Delete">🗑️</button>
            </div>
        </div>`;
    }).join('');
}
