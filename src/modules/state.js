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

function applyMigrations(s) {
    const MIN_VERSION = 14;
    if (!s.version || s.version < MIN_VERSION) return false;
    while (s.version < DATA_VERSION) {
        const migrate = STATE_MIGRATIONS[s.version];
        if (!migrate) return false;
        migrate(s);
    }
    return s.version === DATA_VERSION;
}

// ── Load / Save ──
export function loadState() {
    try {
        const raw = localStorage.getItem(activeStorageKey);
        if (raw) {
            const s = JSON.parse(raw);
            if (s.version === DATA_VERSION) { state = s; setStateRef(state); return; }
            if (applyMigrations(s)) { state = s; setStateRef(state); save(); return; }
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
            state = imported;
            state.version = DATA_VERSION;
            setStateRef(state);
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
function getSavedVersions() {
    try { return JSON.parse(localStorage.getItem(VERSIONS_KEY)) || []; }
    catch { return []; }
}

function saveSavedVersions(versions) {
    try { localStorage.setItem(VERSIONS_KEY, JSON.stringify(versions)); }
    catch { showToast('Could not save version list — storage may be full.', 'error'); }
}

export function quickSave() {
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
    setStateRef(state);
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
