// ── Trips: Multi-trip management, trip setup, trip switching ──

import { state, save, emit, setStorageKey } from './state.js';
import { esc, setStateRef } from './helpers.js';
import { showToast } from './toast.js';
import { TRIP_TEMPLATES } from './data.js';

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
    const template = TRIP_TEMPLATES[templateKey] || TRIP_TEMPLATES.general;

    const trip = {
        id,
        name: name.trim(),
        destination: destination || '',
        dateStart: dateStart || '',
        dateEnd: dateEnd || '',
        created: Date.now(),
        storageKey,
    };

    meta.trips.push(trip);
    saveTripsMeta(meta);

    // Initialize state from template
    const newState = {
        places: [],
        todos: template.todos.map((text, i) => ({ id: 'td' + (Date.now() + i), text, done: false })),
        rules: [...template.rules],
        itinerary: [],
        packing: [],
        version: state.version
    };

    // Generate itinerary days from date range
    if (dateStart && dateEnd) {
        const start = new Date(dateStart);
        const end = new Date(dateEnd);
        const days = Math.ceil((end - start) / 86400000) + 1;
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 0; i < Math.min(days, 60); i++) {
            const d = new Date(start.getTime() + i * 86400000);
            const title = `${monthNames[d.getMonth()]} ${d.getDate()} (${dayNames[d.getDay()]}) — Day ${i + 1}`;
            newState.itinerary.push({ id: 'd' + String(i + 1).padStart(2, '0'), title, items: [] });
        }
    }

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
            <label>Template (todos & rules)</label>
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
        if (t && preview) {
            preview.textContent = t.todos.length
                ? `${t.todos.length} todos, ${t.rules.length} rules`
                : 'Blank — no todos or rules';
        }
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
    const template = document.getElementById('new-trip-template')?.value || 'general';

    const trip = createTrip(name, dest, start, end, template);
    if (trip) {
        window.closeModal?.('modal-detail');
        switchTrip(trip.id);
        renderTripManager();
    }
}
