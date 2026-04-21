// ── Trips: Multi-trip management, trip setup, trip switching ──

import { state, save, emit, setStorageKey, autoSaveVersion } from './state.js';
import { esc, setStateRef } from './helpers.js';
import { showToast } from './toast.js';
import { TRIP_TEMPLATES, DEFAULT_PLACES, USER_TEMPLATES_KEY } from './data.js';

// ── Template seeding helpers ──
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Date-only prefix: "Jun 1 (Tue)". Used when a template provides a descriptive suffix.
function formatDatePrefix(date) {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()} (${DAY_NAMES[date.getDay()]})`;
}

// Fallback prefix with Day N: "Jun 1 (Tue) — Day 1". Used when no template suffix exists.
function formatDayPrefix(date, dayIndex) {
    return `${formatDatePrefix(date)} — Day ${dayIndex + 1}`;
}

// Templates store titles like "May 16 (Fri) — Tokyo: Arrival".
// Rewrite using the user's actual dateStart; keep the descriptive suffix after " — ".
function rewriteDayTitle(templateTitle, date, dayIndex) {
    if (!templateTitle) return formatDayPrefix(date, dayIndex);
    const splitIdx = templateTitle.indexOf(' — ');
    const suffix = splitIdx === -1 ? templateTitle.trim() : templateTitle.slice(splitIdx + 3).trim();
    return suffix ? `${formatDatePrefix(date)} — ${suffix}` : formatDayPrefix(date, dayIndex);
}

// Deep-clone items and regenerate their ids to avoid collisions with other trips.
function cloneItemsWithFreshIds(items, dayIdx) {
    if (!Array.isArray(items)) return [];
    const base = Date.now();
    return items.map((item, i) => ({
        ...item,
        id: 'it' + base + '-' + dayIdx + '-' + i,
    }));
}

// Build itinerary from a template, anchored at dateStart.
// Returns { itinerary, extendedDays } where extendedDays > 0 means user's range was shorter
// than the template and extra days were appended to reach template length.
function buildItineraryFromTemplate(template, dateStart, userDayCount) {
    if (!template?.itinerary?.length) return { itinerary: [], extendedDays: 0 };
    const templateDays = template.itinerary.length;
    const targetDays = Math.max(userDayCount || 0, templateDays);
    const start = dateStart ? new Date(dateStart) : new Date();
    const itinerary = [];
    for (let i = 0; i < targetDays; i++) {
        const date = new Date(start.getTime() + i * 86400000);
        const src = template.itinerary[i];
        const id = 'd' + String(i + 1).padStart(2, '0');
        if (src) {
            itinerary.push({
                id,
                title: rewriteDayTitle(src.title, date, i),
                items: cloneItemsWithFreshIds(src.items, i),
            });
        } else {
            itinerary.push({ id, title: formatDayPrefix(date, i), items: [] });
        }
    }
    return { itinerary, extendedDays: Math.max(0, templateDays - (userDayCount || 0)) };
}

// Resolve a template's placeIds into full place objects from DEFAULT_PLACES.
// Unknown ids are silently skipped.
function resolvePlaceIds(placeIds) {
    if (!Array.isArray(placeIds) || !placeIds.length) return [];
    const byId = new Map(DEFAULT_PLACES.map(p => [p.id, p]));
    return placeIds
        .map(id => byId.get(id))
        .filter(Boolean)
        .map(p => JSON.parse(JSON.stringify(p))); // deep clone so trip edits don't mutate defaults
}

// Merge b into a by key extractor; existing entries in a are preserved.
function mergeAdditive(a, b, keyFn) {
    const seen = new Set(a.map(keyFn));
    const out = [...a];
    for (const item of b) {
        const k = keyFn(item);
        if (k == null || seen.has(k)) continue;
        seen.add(k);
        out.push(item);
    }
    return out;
}

// Compute end date given a start date + day count.
function addDays(dateStartStr, days) {
    if (!dateStartStr) return '';
    const d = new Date(dateStartStr);
    d.setDate(d.getDate() + days - 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

const TRIPS_META_KEY = 'travelPlannerTrips';

// ══════════════════════════════════════════════════════════════
//  TRIP METADATA
// ══════════════════════════════════════════════════════════════
// tripsMeta = { activeTrip: 'trip-id', trips: [{ id, name, destination, dates, created }] }

function loadTripsMeta() {
    try {
        const raw = localStorage.getItem(TRIPS_META_KEY);
        if (raw) return JSON.parse(raw);
    } catch { /* corrupt */ }
    return null;
}

function saveTripsMeta(meta) {
    try {
        localStorage.setItem(TRIPS_META_KEY, JSON.stringify(meta));
    } catch (e) {
        showToast('Failed to save trip metadata.', 'error');
    }
}

function ensureTripsMeta() {
    let meta = loadTripsMeta();
    if (!meta) {
        // First time — create meta with the current Japan trip as the only trip
        meta = {
            activeTrip: 'trip-japan-2026',
            trips: [{
                id: 'trip-japan-2026',
                name: 'Japan 2026',
                destination: 'Japan',
                dateStart: '2026-05-16',
                dateEnd: '2026-06-02',
                created: Date.now(),
                storageKey: 'japanTripData', // backward compat: uses the original key
            }]
        };
        saveTripsMeta(meta);
    }
    return meta;
}

// ══════════════════════════════════════════════════════════════
//  TRIP CRUD
// ══════════════════════════════════════════════════════════════
export function getTrips() {
    return ensureTripsMeta().trips;
}

export function getActiveTrip() {
    const meta = ensureTripsMeta();
    return meta.trips.find(t => t.id === meta.activeTrip) || meta.trips[0] || null;
}

export function switchTrip(tripId) {
    const meta = ensureTripsMeta();
    const trip = meta.trips.find(t => t.id === tripId);
    if (!trip) { showToast('Trip not found.', 'error'); return; }

    // Save current trip state
    save();

    // Switch
    meta.activeTrip = tripId;
    saveTripsMeta(meta);

    // Load the new trip's state
    setStorageKey(trip.storageKey);
    loadTripState(trip);
    // Reset UI state for new trip
    window._expandedDays?.clear();
    if (state.itinerary?.length) window._expandedDays?.add(state.itinerary[0].id);
    Object.keys(window._dayMaps || {}).forEach(k => delete window._dayMaps[k]);
    emit('renderAll');
    showToast(`Switched to: ${trip.name}`, 'success');
}

function loadTripState(trip) {
    try {
        const raw = localStorage.getItem(trip.storageKey);
        if (raw) {
            const s = JSON.parse(raw);
            // Reset all keyed collections so switching trips never leaks data from the previous one.
            Object.assign(state, { places: [], todos: [], itinerary: [], packing: [], rules: [] });
            Object.assign(state, s);
            setStateRef(state);
            return;
        }
    } catch { /* corrupt */ }
    // Empty trip — initialize with blank state
    state.places = [];
    state.todos = [];
    state.itinerary = [];
    state.packing = [];
    state.rules = [];
    setStateRef(state);
}

export function createTrip(name, destination, dateStart, dateEnd, templateKey) {
    if (!name || !name.trim()) { showToast('Trip name is required.', 'warn'); return null; }
    if (dateStart && dateEnd) {
        const s = new Date(dateStart), e = new Date(dateEnd);
        if (isNaN(s.getTime()) || isNaN(e.getTime())) { showToast('Invalid dates.', 'warn'); return null; }
        if (e < s) { showToast('End date must be after start date.', 'warn'); return null; }
    }

    const meta = ensureTripsMeta();
    const id = 'trip-' + Date.now();
    const storageKey = 'tripData-' + id;
    const template = TRIP_TEMPLATES[templateKey] || TRIP_TEMPLATES.blank;

    // Compute user's day count from date range (if provided).
    let userDayCount = 0;
    if (dateStart && dateEnd) {
        const s = new Date(dateStart), e = new Date(dateEnd);
        userDayCount = Math.ceil((e - s) / 86400000) + 1;
    }

    // Build itinerary from template — extends user's range if shorter than template.
    const { itinerary, extendedDays } = buildItineraryFromTemplate(template, dateStart, userDayCount);

    // If template is longer than user's range, extend trip's dateEnd to match template length.
    let effectiveDateEnd = dateEnd || '';
    if (extendedDays > 0 && dateStart && template.durationDays) {
        effectiveDateEnd = addDays(dateStart, template.durationDays);
        showToast(`Extended trip to ${template.durationDays} days to fit template.`, 'info');
    }

    const trip = {
        id,
        name: name.trim(),
        destination: destination || '',
        dateStart: dateStart || '',
        dateEnd: effectiveDateEnd,
        created: Date.now(),
        storageKey,
    };

    meta.trips.push(trip);
    saveTripsMeta(meta);

    // Initialize state from template
    const newState = {
        places: resolvePlaceIds(template.placeIds),
        todos: (template.todos || []).map((text, i) => ({ id: 'td' + (Date.now() + i), text, done: false })),
        rules: [...(template.rules || [])],
        itinerary,
        packing: (template.packing || []).map(p => ({ ...p, id: p.id || 'pk' + (Date.now() + Math.random()) })),
        version: state.version
    };

    try {
        localStorage.setItem(storageKey, JSON.stringify(newState));
    } catch {
        showToast('Failed to create trip — storage may be full.', 'error');
        return null;
    }

    showToast(`Created trip: ${trip.name}`, 'success');
    return trip;
}

export function deleteTrip(tripId) {
    const meta = ensureTripsMeta();
    const idx = meta.trips.findIndex(t => t.id === tripId);
    if (idx === -1) return;
    const trip = meta.trips[idx];

    if (meta.trips.length <= 1) {
        showToast('Cannot delete the last trip.', 'warn');
        return;
    }

    if (!confirm(`Delete "${trip.name}"? This cannot be undone.`)) return;

    // Remove trip data
    try { localStorage.removeItem(trip.storageKey); } catch { /* ok */ }

    meta.trips.splice(idx, 1);

    // If deleting active trip, switch to another
    if (meta.activeTrip === tripId) {
        meta.activeTrip = meta.trips[0].id;
        loadTripState(meta.trips[0]);
        emit('renderAll');
    }

    saveTripsMeta(meta);
    renderTripManager();
    showToast(`Deleted: ${trip.name}`, 'info');
}

export function renameTrip(tripId) {
    const meta = ensureTripsMeta();
    const trip = meta.trips.find(t => t.id === tripId);
    if (!trip) return;

    const name = prompt('Rename trip:', trip.name);
    if (!name || !name.trim()) return;

    trip.name = name.trim();
    saveTripsMeta(meta);
    renderTripManager();
}

// ══════════════════════════════════════════════════════════════
//  TRIP MANAGER UI
// ══════════════════════════════════════════════════════════════
export function renderTripManager() {
    const container = document.getElementById('trip-manager');
    if (!container) return;

    const meta = ensureTripsMeta();
    const activeId = meta.activeTrip;

    container.innerHTML = meta.trips.map(trip => {
        const isActive = trip.id === activeId;
        const dates = trip.dateStart && trip.dateEnd
            ? `${trip.dateStart} → ${trip.dateEnd}`
            : 'No dates set';

        // Get trip stats
        let stats = '';
        try {
            const raw = localStorage.getItem(trip.storageKey);
            if (raw) {
                const s = JSON.parse(raw);
                const places = s.places?.length || 0;
                const days = s.itinerary?.length || 0;
                stats = `${places} places · ${days} days`;
            }
        } catch { stats = ''; }

        return `
        <div class="trip-card ${isActive ? 'active' : ''}" onclick="switchTrip('${trip.id}')">
            <div class="trip-card-header">
                <div class="trip-card-name">${esc(trip.name)}${isActive ? ' <span class="badge-active">Active</span>' : ''}</div>
                <div class="trip-card-actions" onclick="event.stopPropagation()">
                    ${isActive ? `<button onclick="openTripEditor('${trip.id}')" title="Edit trip settings">⚙️</button>` : ''}
                    <button onclick="renameTrip('${trip.id}')" title="Rename">✏️</button>
                    ${!isActive ? `<button onclick="deleteTrip('${trip.id}')" title="Delete">🗑️</button>` : ''}
                </div>
            </div>
            <div class="trip-card-meta">
                ${trip.destination ? `<span>${esc(trip.destination)}</span> · ` : ''}
                <span>${dates}</span>
            </div>
            ${stats ? `<div class="trip-card-stats">${stats}</div>` : ''}
        </div>`;
    }).join('');
}

export function openNewTripModal() {
    const templateOptions = Object.entries(TRIP_TEMPLATES)
        .map(([key, t]) => `<option value="${key}">${esc(t.name)}</option>`)
        .join('');

    const html = `
        <h2>Create New Trip</h2>
        <div class="form-group"><label>Trip Name *</label><input type="text" id="new-trip-name" placeholder="e.g. Italy 2027" required></div>
        <div class="form-group"><label>Destination</label><input type="text" id="new-trip-dest" placeholder="e.g. Italy, Thailand, Korea"></div>
        <div class="form-row">
            <div class="form-group"><label>Start Date</label><input type="date" id="new-trip-start"></div>
            <div class="form-group"><label>End Date</label><input type="date" id="new-trip-end"></div>
        </div>
        <div class="form-group">
            <label>Template</label>
            <select id="new-trip-template">
                ${templateOptions}
            </select>
            <p class="data-hint" id="template-preview" style="margin-top:4px"></p>
        </div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="closeModal('modal-detail')">Cancel</button>
            <button class="btn btn-accent" onclick="createAndSwitchTrip()">Create Trip</button>
        </div>`;
    document.getElementById('detail-content').innerHTML = html;

    // Template preview
    const sel = document.getElementById('new-trip-template');
    const preview = document.getElementById('template-preview');
    const updatePreview = () => {
        const t = TRIP_TEMPLATES[sel.value];
        if (t && preview) preview.textContent = templateStats(t);
    };
    sel?.addEventListener('change', updatePreview);
    updatePreview();

    window.openModal?.('modal-detail');
}

export function openTripEditor(tripId) {
    const meta = ensureTripsMeta();
    const trip = meta.trips.find(t => t.id === (tripId || meta.activeTrip));
    if (!trip) return;

    const html = `
        <h2>Edit Trip Settings</h2>
        <div class="form-group"><label>Trip Name</label><input type="text" id="edit-trip-name" value="${esc(trip.name)}"></div>
        <div class="form-group"><label>Destination</label><input type="text" id="edit-trip-dest" value="${esc(trip.destination || '')}"></div>
        <div class="form-row">
            <div class="form-group"><label>Start Date</label><input type="date" id="edit-trip-start" value="${trip.dateStart || ''}"></div>
            <div class="form-group"><label>End Date</label><input type="date" id="edit-trip-end" value="${trip.dateEnd || ''}"></div>
        </div>
        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--bg-4)">
            <h3 style="color:var(--text-2);font-size:.85rem;margin-bottom:.5rem">Danger Zone</h3>
            <div class="data-actions">
                <button class="btn btn-ghost btn-sm" onclick="resetTripItinerary()" style="color:#ef4444">Reset Itinerary</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteTrip('${trip.id}')" style="color:#ef4444">Delete Trip</button>
            </div>
        </div>
        <div class="form-actions" style="margin-top:1rem">
            <button class="btn btn-ghost" onclick="closeModal('modal-detail')">Cancel</button>
            <button class="btn btn-accent" onclick="saveTripSettings()">Save Changes</button>
        </div>`;
    document.getElementById('detail-content').innerHTML = html;
    window.openModal?.('modal-detail');
}

export function saveTripSettings() {
    const meta = ensureTripsMeta();
    const trip = meta.trips.find(t => t.id === meta.activeTrip);
    if (!trip) return;

    const name = document.getElementById('edit-trip-name')?.value?.trim();
    if (!name) { showToast('Trip name is required.', 'warn'); return; }

    trip.name = name;
    trip.destination = document.getElementById('edit-trip-dest')?.value?.trim() || '';
    trip.dateStart = document.getElementById('edit-trip-start')?.value || '';
    trip.dateEnd = document.getElementById('edit-trip-end')?.value || '';

    saveTripsMeta(meta);
    renderTripManager();
    window.closeModal?.('modal-detail');
    showToast('Trip settings saved.', 'success');
}

export function resetTripItinerary() {
    if (!confirm('Reset the entire itinerary? All scheduled activities will be removed. Places will be kept.')) return;
    state.itinerary.forEach(day => { day.items = []; });
    // Clean up map instances
    Object.keys(window._dayMaps || {}).forEach(k => delete window._dayMaps[k]);
    save();
    emit('renderAll');
    window.closeModal?.('modal-detail');
    showToast('Itinerary reset.', 'info');
}

export function createAndSwitchTrip() {
    const name = document.getElementById('new-trip-name')?.value;
    const dest = document.getElementById('new-trip-dest')?.value;
    const start = document.getElementById('new-trip-start')?.value;
    const end = document.getElementById('new-trip-end')?.value;
    const template = document.getElementById('new-trip-template')?.value || 'blank';

    const trip = createTrip(name, dest, start, end, template);
    if (trip) {
        window.closeModal?.('modal-detail');
        switchTrip(trip.id);
        renderTripManager();
    }
}

// ══════════════════════════════════════════════════════════════
//  TEMPLATES GALLERY
// ══════════════════════════════════════════════════════════════

// ── User templates (localStorage-backed) ──
function loadUserTemplates() {
    try { return JSON.parse(localStorage.getItem(USER_TEMPLATES_KEY)) || {}; }
    catch { return {}; }
}
function saveUserTemplates(map) {
    try { localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(map)); return true; }
    catch { showToast('Could not save template — storage may be full.', 'error'); return false; }
}

// Returns merged built-in + user templates, with a `_source` marker on each.
function getAllTemplates() {
    const built = Object.fromEntries(
        Object.entries(TRIP_TEMPLATES).map(([k, t]) => [k, { ...t, _source: 'built-in' }])
    );
    const user = Object.fromEntries(
        Object.entries(loadUserTemplates()).map(([k, t]) => [k, { ...t, _source: 'user' }])
    );
    return { ...built, ...user };
}

// Numeric stats for a template.
function computeTemplateStats(t) {
    const days = t.itinerary?.length || 0;
    const items = (t.itinerary || []).reduce((n, d) => n + (d.items?.length || 0), 0);
    const places = t.placeIds?.length || 0;
    const todos = t.todos?.length || 0;
    const rules = t.rules?.length || 0;
    const packing = t.packing?.length || 0;
    return { days, items, places, todos, rules, packing };
}

// Two-line stat grid used on cards.
function templateStatsGrid(t) {
    const s = computeTemplateStats(t);
    return `
        <div class="template-stats-grid">
            <div><span class="num">${s.days}</span> day${s.days !== 1 ? 's' : ''}</div>
            <div><span class="num">${s.places}</span> place${s.places !== 1 ? 's' : ''}</div>
            <div><span class="num">${s.items}</span> item${s.items !== 1 ? 's' : ''}</div>
            <div><span class="num">${s.todos}</span> todo${s.todos !== 1 ? 's' : ''}</div>
        </div>`;
}

function renderTemplateCard(key, t) {
    const isUser = t._source === 'user';
    const badge = t.featured
        ? '<span class="template-badge template-badge-featured">Recommended</span>'
        : isUser ? '<span class="template-badge template-badge-user">Yours</span>' : '';
    const dests = (t.destinations && t.destinations.length)
        ? `<div class="template-card-dests">${t.destinations.map(d => `<span class="template-dest-chip">${esc(d)}</span>`).join('')}</div>`
        : '';
    const userActions = isUser ? `
        <button class="template-icon-btn" onclick="event.stopPropagation(); exportTemplate('${key}')" title="Export template JSON">⬇</button>
        <button class="template-icon-btn" onclick="event.stopPropagation(); deleteUserTemplate('${key}')" title="Delete template">🗑</button>
    ` : '';
    return `
        <div class="template-card ${t.featured ? 'is-featured' : ''}">
            <div class="template-card-header">
                <div class="template-card-title">${esc(t.name)}</div>
                <div class="template-card-icons">${userActions}</div>
            </div>
            ${badge ? `<div class="template-card-badges">${badge}</div>` : ''}
            <div class="template-card-desc">${esc(t.description || '')}</div>
            ${dests}
            ${templateStatsGrid(t)}
            <div class="template-card-actions">
                <button class="btn btn-accent btn-sm" onclick="useTemplateForNewTrip('${key}')">Use this template</button>
                <button class="btn btn-ghost btn-sm" onclick="openTemplatePreview('${key}')">Preview</button>
                <button class="btn btn-ghost btn-sm" onclick="applyTemplateToCurrentTrip('${key}')">Apply to current</button>
            </div>
        </div>`;
}

// Collect unique tags across all templates (for filter chips).
function collectTags(templates) {
    const set = new Set();
    Object.values(templates).forEach(t => (t.tags || []).forEach(tag => set.add(tag)));
    return [...set].sort();
}

export function openTemplatesGallery(activeTag = '') {
    const all = getAllTemplates();
    const tags = collectTags(all);
    const filtered = activeTag
        ? Object.fromEntries(Object.entries(all).filter(([, t]) => (t.tags || []).includes(activeTag)))
        : all;

    const tagChips = tags.map(tag => `
        <button class="template-tag-chip ${tag === activeTag ? 'active' : ''}" onclick="openTemplatesGallery('${esc(tag).replace(/'/g, "\\'")}')">${esc(tag)}</button>
    `).join('');

    const allChip = `<button class="template-tag-chip ${!activeTag ? 'active' : ''}" onclick="openTemplatesGallery('')">All</button>`;

    const cards = Object.entries(filtered)
        .sort(([, a], [, b]) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
        .map(([key, t]) => renderTemplateCard(key, t))
        .join('');

    const html = `
        <div class="template-gallery-header">
            <h2>Trip Templates</h2>
            <div class="template-gallery-toolbar">
                <button class="btn btn-ghost btn-sm" onclick="openSaveCurrentAsTemplate()">💾 Save current as template</button>
                <button class="btn btn-ghost btn-sm" onclick="document.getElementById('template-import-file').click()">📥 Import JSON</button>
                <input type="file" id="template-import-file" accept=".json,application/json" style="display:none" onchange="importTemplateFromFile(this.files[0])">
            </div>
        </div>
        <p class="data-hint" style="margin-bottom:.75rem">Starter templates with pre-built itineraries and curated places. Use for a new trip, apply to your current one, or preview the day-by-day breakdown first.</p>
        <div class="template-tag-chips">${allChip}${tagChips}</div>
        <div class="template-grid">${cards || '<div class="data-hint" style="padding:1rem 0">No templates match this filter.</div>'}</div>
        <div class="form-actions" style="margin-top:1rem">
            <button class="btn btn-ghost" onclick="closeModal('modal-detail')">Close</button>
        </div>`;
    document.getElementById('detail-content').innerHTML = html;
    window.openModal?.('modal-detail');
}

// Read-only day-by-day preview of a template.
export function openTemplatePreview(templateKey) {
    const all = getAllTemplates();
    const t = all[templateKey];
    if (!t) { showToast('Template not found.', 'error'); return; }

    const days = (t.itinerary || []).map((d, i) => {
        const items = (d.items || []).map(it => `
            <li class="preview-item ${it.isNote ? 'is-note' : ''}">
                ${it.time ? `<span class="preview-time">${esc(it.time)}</span>` : ''}
                <span class="preview-name">${esc(it.name || '(untitled)')}</span>
                ${it.desc ? `<span class="preview-desc">${esc(it.desc)}</span>` : ''}
            </li>
        `).join('');
        return `
            <details class="preview-day" ${i < 2 ? 'open' : ''}>
                <summary>${esc(d.title || `Day ${i + 1}`)} <span class="preview-count">${(d.items || []).length}</span></summary>
                ${items ? `<ul class="preview-items">${items}</ul>` : '<p class="data-hint" style="margin:.5rem 0 .25rem">(empty day)</p>'}
            </details>`;
    }).join('');

    const html = `
        <h2>Preview — ${esc(t.name)}</h2>
        <p class="data-hint" style="margin-bottom:.75rem">${esc(t.description || '')}</p>
        ${templateStatsGrid(t)}
        <div class="template-preview-body">
            ${days || '<p class="data-hint">This template has no itinerary days.</p>'}
        </div>
        <div class="form-actions" style="margin-top:1rem;flex-wrap:wrap">
            <button class="btn btn-ghost" onclick="openTemplatesGallery('')">← Back to gallery</button>
            <button class="btn btn-accent" onclick="useTemplateForNewTrip('${templateKey}')">Use for new trip</button>
            <button class="btn btn-ghost" onclick="applyTemplateToCurrentTrip('${templateKey}')">Apply to current</button>
        </div>`;
    document.getElementById('detail-content').innerHTML = html;
    window.openModal?.('modal-detail');
}

// Opens the New Trip modal with a template pre-selected. If invoked from the
// replace-warning flow, we also pre-fill trip name + dates from the active trip
// so the user doesn't have to retype them.
export function useTemplateForNewTrip(templateKey) {
    openNewTripModal();
    const activeTrip = getActiveTrip();
    const all = getAllTemplates();
    const template = all[templateKey];
    requestAnimationFrame(() => {
        const sel = document.getElementById('new-trip-template');
        if (sel) {
            sel.value = templateKey;
            sel.dispatchEvent(new Event('change'));
        }
        // Pre-fill name suggestion from template.
        const nameInput = document.getElementById('new-trip-name');
        if (nameInput && !nameInput.value && template) {
            nameInput.value = template.name;
        }
        // Pre-fill dates from active trip (if it has any) as a starting suggestion.
        const startInput = document.getElementById('new-trip-start');
        const endInput = document.getElementById('new-trip-end');
        if (startInput && endInput && activeTrip) {
            if (!startInput.value && activeTrip.dateStart) startInput.value = activeTrip.dateStart;
            if (!endInput.value && activeTrip.dateEnd) endInput.value = activeTrip.dateEnd;
        }
    });
}

// ── Diff computation for apply-warning preview ──
function computeApplyDiff(template, currentState, currentTrip) {
    const templateStats = computeTemplateStats(template);
    const current = {
        days: currentState.itinerary?.length || 0,
        items: (currentState.itinerary || []).reduce((n, d) => n + (d.items?.length || 0), 0),
        places: currentState.places?.length || 0,
        todos: currentState.todos?.length || 0,
        rules: currentState.rules?.length || 0,
        packing: currentState.packing?.length || 0,
    };
    // Places merge — count how many new place ids the template will add.
    const currentPlaceIds = new Set((currentState.places || []).map(p => p.id));
    const newPlaceCount = (template.placeIds || []).filter(id => !currentPlaceIds.has(id)).length;
    // Todos merge by lowercased text.
    const currentTodoText = new Set((currentState.todos || []).map(t => (t.text || '').trim().toLowerCase()));
    const newTodoCount = (template.todos || []).filter(t => !currentTodoText.has((t || '').trim().toLowerCase())).length;
    // Rules merge by lowercased text.
    const currentRuleText = new Set((currentState.rules || []).map(r => (r || '').trim().toLowerCase()));
    const newRuleCount = (template.rules || []).filter(r => !currentRuleText.has((r || '').trim().toLowerCase())).length;
    // Packing merge by lowercased name.
    const currentPackText = new Set((currentState.packing || []).map(p => (p.name || '').trim().toLowerCase()));
    const newPackingCount = (template.packing || []).filter(p => !currentPackText.has((p.name || '').trim().toLowerCase())).length;

    // Day extension — use trip's current dateStart/dateEnd as user day count.
    let userDayCount = 0;
    if (currentTrip?.dateStart && currentTrip?.dateEnd) {
        const s = new Date(currentTrip.dateStart), e = new Date(currentTrip.dateEnd);
        if (!isNaN(s) && !isNaN(e)) userDayCount = Math.ceil((e - s) / 86400000) + 1;
    }
    const templateDays = templateStats.days;
    const extensionDays = Math.max(0, templateDays - userDayCount);
    const afterDays = Math.max(userDayCount, templateDays);

    return {
        current,
        template: templateStats,
        after: {
            days: afterDays,
            items: templateStats.items,                  // itinerary is replaced
            places: current.places + newPlaceCount,
            todos: current.todos + newTodoCount,
            rules: current.rules + newRuleCount,
            packing: current.packing + newPackingCount,
        },
        delta: {
            places: newPlaceCount,
            todos: newTodoCount,
            rules: newRuleCount,
            packing: newPackingCount,
            extensionDays,
        },
    };
}

// Apply a template to the CURRENT active trip.
// Shows a diff-preview modal with 3 actions: create new trip · replace · cancel.
export function applyTemplateToCurrentTrip(templateKey) {
    const all = getAllTemplates();
    const template = all[templateKey];
    if (!template) { showToast('Template not found.', 'error'); return; }

    const activeTrip = getActiveTrip();
    if (!activeTrip) { showToast('No active trip — create one first.', 'warn'); return; }

    // Require a valid dateStart before we can rewrite day titles.
    if (!activeTrip.dateStart) {
        const html = `
            <h2>Set a start date first</h2>
            <p style="margin:.5rem 0 1rem;color:var(--text-2)">
                "<strong>${esc(activeTrip.name)}</strong>" has no start date, so we can't rewrite the
                template's day titles. Set a start date in <strong>Edit Trip Settings</strong> and try again.
            </p>
            <div class="form-actions">
                <button class="btn btn-ghost" onclick="closeModal('modal-detail')">Cancel</button>
                <button class="btn btn-accent" onclick="openTripEditor('${activeTrip.id}')">Open Trip Settings</button>
            </div>`;
        document.getElementById('detail-content').innerHTML = html;
        window.openModal?.('modal-detail');
        return;
    }

    const diff = computeApplyDiff(template, state, activeTrip);
    const blankTemplate = (template.itinerary?.length || 0) === 0;

    const row = (label, current, after, deltaText) => `
        <tr>
            <td>${label}</td>
            <td class="num">${current}</td>
            <td class="num">${after}${deltaText ? ` <span class="delta">${deltaText}</span>` : ''}</td>
        </tr>`;

    const extensionNote = diff.delta.extensionDays > 0
        ? `<p class="diff-extension-note">⚠ Your trip is ${diff.current.days} days; this template is ${diff.template.days} days. The trip end date will be extended by <strong>${diff.delta.extensionDays} day${diff.delta.extensionDays !== 1 ? 's' : ''}</strong>.</p>`
        : '';

    const blankWarning = blankTemplate
        ? `<p class="diff-extension-note">⚠ This is the blank template — applying it will <strong>empty all itinerary days</strong>.</p>`
        : '';

    const html = `
        <h2>Apply "${esc(template.name)}" to "${esc(activeTrip.name)}"?</h2>
        <p style="margin:.5rem 0 .75rem;color:var(--text-2)">
            Itinerary will be <strong>replaced</strong>. Places, todos, rules and packing will be <strong>merged additively</strong> (duplicates skipped — nothing removed).
        </p>
        <p class="data-hint" style="margin-bottom:.75rem">A snapshot of your current state will be saved automatically — you can restore it from Saved Versions in the sidebar if something goes wrong.</p>
        ${extensionNote}
        ${blankWarning}
        <table class="diff-table">
            <thead><tr><th></th><th>Current</th><th>After apply</th></tr></thead>
            <tbody>
                ${row('Itinerary days', diff.current.days, diff.after.days, diff.delta.extensionDays > 0 ? `+${diff.delta.extensionDays}` : '')}
                ${row('Activities', diff.current.items, diff.after.items, '(replaced)')}
                ${row('Places', diff.current.places, diff.after.places, diff.delta.places > 0 ? `+${diff.delta.places} new` : '')}
                ${row('Todos', diff.current.todos, diff.after.todos, diff.delta.todos > 0 ? `+${diff.delta.todos} new` : '')}
                ${row('Rules', diff.current.rules, diff.after.rules, diff.delta.rules > 0 ? `+${diff.delta.rules} new` : '')}
                ${row('Packing', diff.current.packing, diff.after.packing, diff.delta.packing > 0 ? `+${diff.delta.packing} new` : '')}
            </tbody>
        </table>
        <div class="template-warning-actions">
            <button class="btn btn-accent" onclick="useTemplateForNewTrip('${templateKey}')">🆕 Create new trip instead</button>
            <button class="btn btn-danger" id="replace-confirm-btn" onclick="confirmReplaceWithTemplate('${templateKey}')">⚠ Replace "${esc(activeTrip.name)}"</button>
            <button class="btn btn-ghost" onclick="closeModal('modal-detail')">Cancel</button>
        </div>`;
    document.getElementById('detail-content').innerHTML = html;
    window.openModal?.('modal-detail');
}

// Perform the replace after the user confirms in the diff-preview modal.
// Auto-snapshots the current state to saved-versions for undo.
export function confirmReplaceWithTemplate(templateKey) {
    const all = getAllTemplates();
    const template = all[templateKey];
    if (!template) return;
    const activeTrip = getActiveTrip();
    if (!activeTrip) { showToast('No active trip.', 'error'); return; }
    if (!activeTrip.dateStart) { showToast('Trip needs a start date first.', 'warn'); return; }

    // Loading state on the confirm button so the user sees something happening.
    const btn = document.getElementById('replace-confirm-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Applying…'; btn.classList.add('is-loading'); }

    // Defer the heavy work so the button state repaints first.
    setTimeout(() => {
        // Auto-snapshot BEFORE mutating anything.
        const snapName = `Before applying "${template.name}" — ${new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`;
        autoSaveVersion(snapName);

        let userDayCount = 0;
        if (activeTrip.dateStart && activeTrip.dateEnd) {
            const s = new Date(activeTrip.dateStart), e = new Date(activeTrip.dateEnd);
            if (!isNaN(s) && !isNaN(e)) userDayCount = Math.ceil((e - s) / 86400000) + 1;
        }

        // REPLACE itinerary.
        const { itinerary, extendedDays } = buildItineraryFromTemplate(template, activeTrip.dateStart, userDayCount);
        state.itinerary = itinerary;

        // If template extends beyond current trip length, bump the trip's dateEnd.
        if (extendedDays > 0 && activeTrip.dateStart && template.durationDays) {
            activeTrip.dateEnd = addDays(activeTrip.dateStart, template.durationDays);
            const meta = ensureTripsMeta();
            const stored = meta.trips.find(t => t.id === activeTrip.id);
            if (stored) stored.dateEnd = activeTrip.dateEnd;
            saveTripsMeta(meta);
        }

        // ADDITIVE merge for places, todos, rules, packing.
        const templatePlaces = resolvePlaceIds(template.placeIds);
        state.places = mergeAdditive(state.places || [], templatePlaces, p => p.id);

        const templateTodos = (template.todos || []).map((text, i) => ({ id: 'td' + (Date.now() + i), text, done: false }));
        state.todos = mergeAdditive(state.todos || [], templateTodos, t => (t.text || '').trim().toLowerCase());

        state.rules = mergeAdditive(state.rules || [], [...(template.rules || [])], r => (r || '').trim().toLowerCase());

        const templatePacking = (template.packing || []).map(p => ({ ...p, id: p.id || 'pk' + (Date.now() + Math.random()) }));
        state.packing = mergeAdditive(state.packing || [], templatePacking, p => (p.name || '').trim().toLowerCase());

        // Clean up map instances (day ids may have changed).
        Object.keys(window._dayMaps || {}).forEach(k => delete window._dayMaps[k]);
        window._expandedDays?.clear();
        if (state.itinerary[0]) window._expandedDays?.add(state.itinerary[0].id);

        save();
        emit('renderAll');
        renderTripManager();
        window.closeModal?.('modal-detail');
        const extensionMsg = extendedDays > 0 ? ` (trip extended to ${template.durationDays} days)` : '';
        showToast(`Replaced "${activeTrip.name}" with "${template.name}"${extensionMsg}. Previous state saved.`, 'success');
    }, 20);
}

// Back-compat: keep the old export name so any external caller doesn't break.
export const confirmOverrideWithTemplate = confirmReplaceWithTemplate;

// ══════════════════════════════════════════════════════════════
//  SAVE CURRENT TRIP AS TEMPLATE
// ══════════════════════════════════════════════════════════════
export function openSaveCurrentAsTemplate() {
    const activeTrip = getActiveTrip();
    const stats = {
        days: state.itinerary?.length || 0,
        places: state.places?.length || 0,
        items: (state.itinerary || []).reduce((n, d) => n + (d.items?.length || 0), 0),
    };

    const html = `
        <h2>Save current trip as template</h2>
        <p class="data-hint" style="margin-bottom:1rem">This saves your current itinerary, places, todos, rules and packing into a reusable template. Templates are stored locally in your browser.</p>
        <div class="form-group"><label>Template name *</label><input type="text" id="save-tpl-name" placeholder="e.g. Tokyo Week" value="${esc(activeTrip?.name || '')}"></div>
        <div class="form-group"><label>Description</label><textarea id="save-tpl-desc" rows="2" placeholder="What is this template good for?"></textarea></div>
        <div class="form-group"><label>Tags (comma separated)</label><input type="text" id="save-tpl-tags" placeholder="e.g. Japan, City Break, 7 days"></div>
        <div class="form-group"><label>Destinations (comma separated)</label><input type="text" id="save-tpl-dests" placeholder="e.g. Tokyo, Kyoto"></div>
        <div class="data-hint" style="margin:.5rem 0 1rem">Will include: ${stats.days} days · ${stats.items} activities · ${stats.places} places · ${state.todos?.length || 0} todos · ${state.rules?.length || 0} rules · ${state.packing?.length || 0} packing items.</div>
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="openTemplatesGallery('')">Back</button>
            <button class="btn btn-accent" onclick="confirmSaveCurrentAsTemplate()">Save template</button>
        </div>`;
    document.getElementById('detail-content').innerHTML = html;
    window.openModal?.('modal-detail');
}

export function confirmSaveCurrentAsTemplate() {
    const name = document.getElementById('save-tpl-name')?.value?.trim();
    if (!name) { showToast('Template name is required.', 'warn'); return; }
    const description = document.getElementById('save-tpl-desc')?.value?.trim() || '';
    const tagsRaw = document.getElementById('save-tpl-tags')?.value || '';
    const destsRaw = document.getElementById('save-tpl-dests')?.value || '';
    const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
    const destinations = destsRaw.split(',').map(d => d.trim()).filter(Boolean);

    const key = 'user-' + Date.now();
    const days = state.itinerary?.length || 0;
    const template = {
        name,
        description,
        tags: tags.length ? tags : ['User'],
        destinations,
        featured: false,
        durationDays: days || null,
        // Deep-clone so future edits to the live trip don't mutate the template.
        itinerary: JSON.parse(JSON.stringify(state.itinerary || [])),
        placeIds: (state.places || []).map(p => p.id).filter(id => id != null),
        packing: JSON.parse(JSON.stringify(state.packing || [])),
        todos: (state.todos || []).map(t => t.text).filter(Boolean),
        rules: [...(state.rules || [])],
        createdAt: Date.now(),
    };

    const userTemplates = loadUserTemplates();
    userTemplates[key] = template;
    if (!saveUserTemplates(userTemplates)) return;
    showToast(`Saved template: "${name}"`, 'success');
    openTemplatesGallery('');
}

export function deleteUserTemplate(key) {
    const userTemplates = loadUserTemplates();
    const t = userTemplates[key];
    if (!t) return;
    if (!confirm(`Delete template "${t.name}"? This cannot be undone.`)) return;
    delete userTemplates[key];
    saveUserTemplates(userTemplates);
    showToast(`Deleted template: "${t.name}"`, 'info');
    openTemplatesGallery('');
}

// ══════════════════════════════════════════════════════════════
//  TEMPLATE IMPORT / EXPORT
// ══════════════════════════════════════════════════════════════
export function exportTemplate(key) {
    const all = getAllTemplates();
    const t = all[key];
    if (!t) { showToast('Template not found.', 'error'); return; }
    // Strip runtime-only fields.
    const payload = { ...t };
    delete payload._source;
    const blob = new Blob([JSON.stringify({ type: 'travel-planner-template', version: 1, template: payload }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (t.name || 'template').replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() + '.template.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported template: "${t.name}"`, 'success');
}

export function importTemplateFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const text = String(e.target.result).replace(/^﻿/, '').trim();
            const payload = JSON.parse(text);
            // Accept either the wrapped shape (type/version/template) or a raw template object.
            const template = payload?.template || payload;
            if (!template || typeof template !== 'object' || !template.name) {
                showToast('Invalid template file — missing name.', 'error');
                return;
            }
            // Coerce required fields to safe defaults.
            const safe = {
                name: String(template.name),
                description: String(template.description || ''),
                tags: Array.isArray(template.tags) ? template.tags : ['Imported'],
                destinations: Array.isArray(template.destinations) ? template.destinations : [],
                featured: false,
                durationDays: Number.isFinite(template.durationDays) ? template.durationDays : (Array.isArray(template.itinerary) ? template.itinerary.length : null),
                itinerary: Array.isArray(template.itinerary) ? template.itinerary : [],
                placeIds: Array.isArray(template.placeIds) ? template.placeIds : [],
                packing: Array.isArray(template.packing) ? template.packing : [],
                todos: Array.isArray(template.todos) ? template.todos : [],
                rules: Array.isArray(template.rules) ? template.rules : [],
                createdAt: Date.now(),
                imported: true,
            };
            const userTemplates = loadUserTemplates();
            const key = 'user-' + Date.now();
            userTemplates[key] = safe;
            if (!saveUserTemplates(userTemplates)) return;
            showToast(`Imported template: "${safe.name}"`, 'success');
            openTemplatesGallery('');
        } catch (err) {
            showToast('Failed to read template file: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
}
