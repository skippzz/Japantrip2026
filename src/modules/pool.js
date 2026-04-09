// ── Place Pool: Unadded places sidebar with drag-and-drop ──

import { state, save } from './state.js';
import { esc, getArea, findPlaceByName, parseDayTitle } from './helpers.js';
import { CATEGORY_ICONS } from './config.js';
import { showToast } from './toast.js';
import { getNearbyUnaddedPlaces } from './routing.js';

// ── Module-local filter state ──
let poolFilter = 'all';
let poolSearch = '';
let poolSortableInstance = null;

// Allow external code to set poolSearch/poolFilter (for event binding in app.js)
export function setPoolSearch(val) { poolSearch = val; }
export function setPoolFilter(val) { poolFilter = val; }
export function getPoolFilter() { return poolFilter; }

// ══════════════════════════════════════════════════════════════
//  PLACE POOL (unadded places panel)
// ══════════════════════════════════════════════════════════════
export function getUnaddedPlaces() {
    const addedIds = new Set();
    const addedNames = new Set();
    state.itinerary.forEach(day => {
        day.items.forEach(item => {
            if (item.placeId != null) addedIds.add(item.placeId);
            if (item.name) addedNames.add(item.name);
        });
    });
    return state.places.filter(p => !addedIds.has(p.id) && !addedNames.has(p.name));
}

export function getNearbyForDay(dayId) {
    const day = state.itinerary.find(d => d.id === dayId);
    if (!day) return [];
    const addedIds = new Set();
    const addedNames = new Set();
    state.itinerary.forEach(d => {
        d.items.forEach(item => {
            if (item.placeId != null) addedIds.add(item.placeId);
            if (item.name) addedNames.add(item.name);
        });
    });
    return getNearbyUnaddedPlaces(day, state.places, addedIds, addedNames);
}

export function renderPlacePool() {
    const container = document.getElementById('pool-list');
    const countEl = document.getElementById('pool-count');
    if (!container || !countEl) return;

    const allUnadded = getUnaddedPlaces();
    let places = [...allUnadded];

    // Populate city/area dropdown dynamically
    const citySelect = document.getElementById('pool-city-filter');
    if (citySelect) {
        const prev = citySelect.value || poolFilter;
        const cities = ['Tokyo','Kyoto','Osaka','Nara','Fuji','Izu'];
        let optHtml = '<option value="all">All Cities / Areas</option>';
        cities.forEach(city => {
            const cityPlaces = places.filter(p => p.city === city);
            if (cityPlaces.length === 0) return;
            optHtml += `<option value="city:${city}">${city} (${cityPlaces.length})</option>`;
            // Collect areas for this city
            const areaSet = new Set();
            cityPlaces.forEach(p => { const a = getArea(p); if (a) areaSet.add(a); });
            [...areaSet].sort().forEach(a => {
                const cnt = cityPlaces.filter(p => getArea(p) === a).length;
                optHtml += `<option value="area:${a}">  └ ${a} (${cnt})</option>`;
            });
        });
        citySelect.innerHTML = optHtml;
        citySelect.value = prev;
        poolFilter = citySelect.value || 'all';
    }

    // Apply city/area filter
    if (poolFilter !== 'all') {
        if (poolFilter.startsWith('city:')) {
            const city = poolFilter.slice(5);
            places = places.filter(p => p.city === city);
        } else if (poolFilter.startsWith('area:')) {
            const area = poolFilter.slice(5);
            places = places.filter(p => getArea(p) === area);
        } else {
            // Legacy plain city filter fallback
            places = places.filter(p => p.city === poolFilter);
        }
    }
    // Apply search (also searches area/neighborhood)
    if (poolSearch) {
        const q = poolSearch.toLowerCase();
        places = places.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.city.toLowerCase().includes(q) ||
            (p.category||'').toLowerCase().includes(q) ||
            getArea(p).toLowerCase().includes(q)
        );
    }

    // Sort by city, then area, then name
    places.sort((a, b) => a.city.localeCompare(b.city) || getArea(a).localeCompare(getArea(b)) || a.name.localeCompare(b.name));

    const totalUnadded = allUnadded.length;
    countEl.textContent = `${places.length}${places.length !== totalUnadded ? ' / ' + totalUnadded : ''} unadded`;

    container.innerHTML = places.length ? places.map(p => `
        <div class="pool-item" data-place-id="${p.id}" data-place-name="${esc(p.name)}" onclick="openDetail(${p.id})" style="cursor:pointer">
            <span class="pool-icon">${CATEGORY_ICONS[p.category] || '📍'}</span>
            <div class="pool-info">
                <div class="pool-name" title="${esc(p.name)}">${esc(p.name)}</div>
                <div class="pool-meta">${getArea(p) ? esc(getArea(p)) + ' · ' : ''}${esc(p.city)} · ${p.category}</div>
            </div>
            <button class="pool-add-btn edit-only" onclick="event.stopPropagation(); addPlaceToDay(${p.id})" title="Add to selected day">+</button>
        </div>
    `).join('') : '<div class="pool-empty">All places are scheduled! 🎉</div>';

    // Populate the target day select
    populatePoolTargetDay();

    // Set up SortableJS for pool (edit mode only)
    if (poolSortableInstance) { poolSortableInstance.destroy(); poolSortableInstance = null; }
    if (window._editMode) {
        poolSortableInstance = new Sortable(container, {
            group: { name: 'itinerary', pull: 'clone', put: true },
            sort: false,
            animation: 150,
            ghostClass: 'sortable-ghost',
            filter: '.pool-add-btn',
            onAdd: handleReturnToPool
        });
    }
}

export function populatePoolTargetDay() {
    const sel = document.getElementById('pool-target-day');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '<option value="">Add to day...</option>' +
        state.itinerary.map((d, i) => {
            const {date, subtitle} = parseDayTitle(d.title);
            return `<option value="${d.id}">Day ${i+1} — ${date}</option>`;
        }).join('');
    if (prev) sel.value = prev;
}

export function addPlaceToDay(placeId) {
    const place = state.places.find(p => p.id === placeId);
    if (!place) return;

    const sel = document.getElementById('pool-target-day');
    let targetDay = null;

    // Priority: selected day in dropdown, then first expanded day
    if (sel && sel.value) {
        targetDay = state.itinerary.find(d => d.id === sel.value);
    }
    if (!targetDay) {
        for (const day of state.itinerary) {
            if (window._expandedDays.has(day.id)) { targetDay = day; break; }
        }
    }
    if (!targetDay) {
        showToast('Select a target day from the dropdown, or expand a day first.', 'warn');
        return;
    }

    // Prevent duplicates in same day
    const alreadyInDay = targetDay.items.some(it => it.placeId === place.id || it.name === place.name);
    if (alreadyInDay) {
        if (!confirm(`"${place.name}" is already in this day. Add again?`)) return;
    }

    targetDay.items.push({
        id: 'it' + Date.now(),
        placeId: place.id,
        time: '',
        timeEnd: undefined,
        name: place.name,
        desc: place.description ? place.description.substring(0, 150) : '',
        visited: false,
        isNote: false
    });

    window._expandedDays.add(targetDay.id);
    save();
    window.renderItinerary?.();
    renderPlacePool();
    window.renderDashboard?.();
}

export function handlePoolDrop(evt) {
    // Only handle pool items (they have data-place-id attribute)
    if (!evt.item || !evt.item.dataset.placeId) return;

    const placeId = parseInt(evt.item.dataset.placeId);
    const place = state.places.find(p => p.id === placeId);
    if (!place) return;

    // The timeline has data-day-id, or find it from parent .day-card
    const dayId = evt.to.dataset.dayId || evt.to.closest('.day-card')?.dataset.dayId;
    const day = state.itinerary.find(d => d.id === dayId);
    if (!day) return;

    const newItem = {
        id: 'it' + Date.now(),
        placeId: place.id,
        time: '',
        timeEnd: undefined,
        name: place.name,
        desc: place.description ? place.description.substring(0, 150) : '',
        visited: false,
        isNote: false
    };

    day.items.splice(evt.newIndex, 0, newItem);
    save();

    setTimeout(() => {
        window.renderItinerary?.();
        renderPlacePool();
        window.renderDashboard?.();
    }, 0);
}

export function handleReturnToPool(evt) {
    // A timeline item was dropped into the pool — remove it from itinerary
    const itemId = evt.item?.dataset?.itemId;
    if (!itemId) {
        // Not a timeline item (shouldn't happen), just re-render
        setTimeout(() => { window.renderItinerary?.(); renderPlacePool(); window.renderDashboard?.(); }, 0);
        return;
    }

    for (const day of state.itinerary) {
        const idx = day.items.findIndex(i => i.id === itemId);
        if (idx !== -1) {
            day.items.splice(idx, 1);
            break;
        }
    }

    save();
    setTimeout(() => {
        window.renderItinerary?.();
        renderPlacePool();
        window.renderDashboard?.();
    }, 0);
}
