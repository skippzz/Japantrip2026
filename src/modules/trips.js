// ── Trips: Multi-trip management, trip setup, trip switching ──

import { state, save, emit, setStorageKey } from './state.js';
import { esc, setStateRef } from './helpers.js';
import { showToast } from './toast.js';
import { TRIP_TEMPLATES, DEFAULT_PLACES } from './data.js';

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
            // Copy loaded state into the shared state object
            Object.assign(state, { places: [], todos: [], itinerary: [], packing: [] });
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

// Stats shown on each template card.
function templateStats(t) {
    const days = t.itinerary?.length || 0;
    const items = (t.itinerary || []).reduce((n, d) => n + (d.items?.length || 0), 0);
    const places = t.placeIds?.length || 0;
    const todos = t.todos?.length || 0;
    return `${days} day${days !== 1 ? 's' : ''} · ${items} activit${items !== 1 ? 'ies' : 'y'} · ${places} place${places !== 1 ? 's' : ''} · ${todos} todo${todos !== 1 ? 's' : ''}`;
}

export function openTemplatesGallery() {
    const cards = Object.entries(TRIP_TEMPLATES).map(([key, t]) => `
        <div class="template-card">
            <div class="template-card-title">${esc(t.name)}</div>
            <div class="template-card-desc">${esc(t.description || '')}</div>
            <div class="template-card-stats">${templateStats(t)}</div>
            <div class="template-card-actions">
                <button class="btn btn-accent btn-sm" onclick="useTemplateForNewTrip('${key}')">Use for new trip</button>
                <button class="btn btn-ghost btn-sm" onclick="applyTemplateToCurrentTrip('${key}')">Apply to current trip</button>
            </div>
        </div>`).join('');

    const html = `
        <h2>Trip Templates</h2>
        <p class="data-hint" style="margin-bottom:1rem">Starter templates with pre-built itineraries and curated places. Use for a new trip or apply to your current one.</p>
        <div class="template-grid">${cards}</div>
        <div class="form-actions" style="margin-top:1rem">
            <button class="btn btn-ghost" onclick="closeModal('modal-detail')">Close</button>
        </div>`;
    document.getElementById('detail-content').innerHTML = html;
    window.openModal?.('modal-detail');
}

// Opens the New Trip modal with a template pre-selected.
export function useTemplateForNewTrip(templateKey) {
    openNewTripModal();
    // After the modal renders, select the template and refresh preview.
    requestAnimationFrame(() => {
        const sel = document.getElementById('new-trip-template');
        if (sel) {
            sel.value = templateKey;
            sel.dispatchEvent(new Event('change'));
        }
    });
}

// Apply a template to the CURRENT active trip.
// Shows a 3-option warning modal: Create new trip · Override current · Cancel.
export function applyTemplateToCurrentTrip(templateKey) {
    const template = TRIP_TEMPLATES[templateKey];
    if (!template) { showToast('Template not found.', 'error'); return; }

    const activeTrip = getActiveTrip();
    const activeName = activeTrip?.name || 'current trip';

    const html = `
        <h2>Apply "${esc(template.name)}"?</h2>
        <p style="margin:.5rem 0 1rem;color:var(--text-2)">
            This will <strong>replace the itinerary</strong> of "<strong>${esc(activeName)}</strong>".
            Places, todos, rules and packing from the template will be <strong>added</strong> to your existing ones (duplicates by id/text are skipped — nothing is removed).
        </p>
        <p class="data-hint" style="margin-bottom:1rem">⚠️ The replace cannot be undone. Consider exporting a JSON backup from the sidebar first.</p>
        <div class="template-warning-actions">
            <button class="btn btn-accent" onclick="useTemplateForNewTrip('${templateKey}')">Create new trip instead</button>
            <button class="btn btn-ghost" onclick="confirmOverrideWithTemplate('${templateKey}')" style="color:#ef4444">Override current trip</button>
            <button class="btn btn-ghost" onclick="closeModal('modal-detail')">Cancel</button>
        </div>`;
    document.getElementById('detail-content').innerHTML = html;
    window.openModal?.('modal-detail');
}

// Actually perform the override after the user confirms in the warning modal.
export function confirmOverrideWithTemplate(templateKey) {
    const template = TRIP_TEMPLATES[templateKey];
    if (!template) return;
    const activeTrip = getActiveTrip();
    if (!activeTrip) { showToast('No active trip.', 'error'); return; }

    // Work out the user's day count from current trip dates, if any.
    let userDayCount = 0;
    if (activeTrip.dateStart && activeTrip.dateEnd) {
        const s = new Date(activeTrip.dateStart), e = new Date(activeTrip.dateEnd);
        userDayCount = Math.ceil((e - s) / 86400000) + 1;
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
        showToast(`Extended trip to ${template.durationDays} days to fit template.`, 'info');
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
    showToast(`Applied "${template.name}" to ${activeTrip.name}.`, 'success');
}
