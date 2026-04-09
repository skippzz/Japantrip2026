// ── Places: Grid rendering, filtering, CRUD, detail/edit modals ──

import { state, save } from './state.js';
import {
    esc, getArea, getVenue, getPhotoPath, slugify,
    mapsSearchUrl, mapsNavUrl
} from './helpers.js';
import { CATEGORY_ICONS, CITY_COLORS, MARKER_COLORS, ENABLE_API_PHOTOS } from './config.js';
import { showToast } from './toast.js';

// ── Module-local filter state ──
let placeFilter = 'all';
let areaFilter = 'all';
let placeSearch = '';
let placeSort = 'default';
let statusFilters = new Set();
export function setPlaceSort(val) { placeSort = val; }

// Allow external code to set filter state (for event binding in app.js)
export function setPlaceFilter(val) { placeFilter = val; }
export function setAreaFilter(area) { areaFilter = area; renderPlaces(); }
export function setPlaceSearch(val) { placeSearch = val; }
export function getPlaceFilter() { return placeFilter; }
export function getAreaFilter() { return areaFilter; }

// ══════════════════════════════════════════════════════════════
//  PLACES GRID
// ══════════════════════════════════════════════════════════════
export function getFilteredPlaces() {
    let arr = state.places;
    if (placeFilter !== 'all') arr = arr.filter(p => p.category === placeFilter || p.city === placeFilter);
    if (areaFilter !== 'all') arr = arr.filter(p => getArea(p) === areaFilter);
    if (placeSearch) arr = arr.filter(p =>
        p.name.toLowerCase().includes(placeSearch) ||
        (p.description||'').toLowerCase().includes(placeSearch) ||
        getArea(p).toLowerCase().includes(placeSearch)
    );
    if (statusFilters.size > 0) {
        const scheduledIds = new Set();
        const scheduledNames = new Set();
        state.itinerary.forEach(d => d.items.forEach(it => {
            if (it.placeId != null) scheduledIds.add(it.placeId);
            if (it.name) scheduledNames.add(it.name);
        }));

        arr = arr.filter(p => {
            const isScheduled = scheduledIds.has(p.id) || scheduledNames.has(p.name);
            const isReserved = !!p.reserved;
            const venue = getVenue(p);

            if (statusFilters.has('scheduled') && !isScheduled) return false;
            if (statusFilters.has('unscheduled') && isScheduled) return false;
            if (statusFilters.has('reserved') && !isReserved) return false;
            if (statusFilters.has('indoor') && venue !== 'indoor' && venue !== 'both') return false;
            if (statusFilters.has('outdoor') && venue !== 'outdoor' && venue !== 'both') return false;
            return true;
        });
    }
    return arr;
}

export function getAreasForCurrentFilter() {
    // Only show area chips when a city filter is active
    const cities = ['Tokyo','Kyoto','Osaka','Nara','Fuji','Izu'];
    if (!cities.includes(placeFilter)) return [];
    const areas = new Set();
    state.places.forEach(p => {
        if (p.city === placeFilter) {
            const a = getArea(p);
            if (a) areas.add(a);
        }
    });
    return [...areas].sort();
}

export function renderPlaces() {
    let places = getFilteredPlaces();
    if (placeSort === 'name') places.sort((a, b) => a.name.localeCompare(b.name));
    else if (placeSort === 'name-desc') places.sort((a, b) => b.name.localeCompare(a.name));
    else if (placeSort === 'city') places.sort((a, b) => a.city.localeCompare(b.city) || a.name.localeCompare(b.name));
    else if (placeSort === 'category') places.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    else if (placeSort === 'scheduled') {
        const scheduled = new Set();
        state.itinerary.forEach(d => d.items.forEach(it => { if (it.placeId != null) scheduled.add(it.placeId); if (it.name) scheduled.add(it.name); }));
        places.sort((a, b) => {
            const aS = scheduled.has(a.id) || scheduled.has(a.name) ? 0 : 1;
            const bS = scheduled.has(b.id) || scheduled.has(b.name) ? 0 : 1;
            return aS - bS || a.name.localeCompare(b.name);
        });
    }
    document.getElementById('places-count').textContent = `${places.length} place${places.length!==1?'s':''}`;
    // Render area sub-filter bar
    const areaBar = document.getElementById('area-bar');
    if (areaBar) {
        const areas = getAreasForCurrentFilter();
        if (areas.length > 0) {
            areaBar.innerHTML = `<span class="area-chip${areaFilter==='all'?' active':''}" onclick="setAreaFilter('all')">All Areas</span>` +
                areas.map(a => `<span class="area-chip${areaFilter===a?' active':''}" onclick="setAreaFilter('${esc(a)}')">${esc(a)}</span>`).join('');
            areaBar.style.display = '';
        } else {
            areaBar.innerHTML = '';
            areaBar.style.display = 'none';
        }
    }
    const grid = document.getElementById('places-grid');
    grid.innerHTML = places.map(p => {
        const photo = getPhotoPath(p);
        const catClass = (p.category||'').toLowerCase();
        const navUrl = mapsNavUrl(p.name, p.city, p.lat, p.lng, p.address);
        const scheduledDays = [];
        state.itinerary.forEach((day, idx) => {
            if (day.items.some(it => it.placeId === p.id || it.name === p.name)) {
                scheduledDays.push(idx + 1);
            }
        });
        const dayBadge = scheduledDays.length
            ? `<span class="place-day-badge" title="Scheduled on Day ${scheduledDays.join(', ')}">Day ${scheduledDays.join(', ')}</span>`
            : '<span class="place-unscheduled-badge">Not scheduled</span>';
        return `
        <div class="place-card" data-id="${p.id}" onclick="openDetail(${p.id})">
            <div class="card-thumb ${catClass}">
                <img src="${photo}" class="thumb-img" alt="${esc(p.name)}" loading="lazy" onerror="this.style.display='none'">
                <span class="thumb-icon">${CATEGORY_ICONS[p.category]||'📍'}</span>
                <span class="thumb-city">${esc(getArea(p) ? getArea(p) + ', ' + p.city : p.city)}</span>
            </div>
            <div class="card-body">
                <h3 class="card-name">${esc(p.name)}${p.reserved?'<span class="badge-reserved">✓ Reserved</span>':''}${dayBadge}</h3>
                <p class="card-desc">${esc(p.description||'')}</p>
                <div class="card-tags">
                    <span class="tag ${catClass}">${p.category}</span>
                    ${getArea(p) ? `<span class="tag tag-area">${esc(getArea(p))}</span>` : ''}
                    <span class="tag tag-city">${esc(p.city)}</span>
                </div>
                <div class="card-meta">
                    ${p.hours?`<span>🕐 ${esc(p.hours)}</span>`:''}
                    ${p.cost?`<span>💰 ${esc(p.cost)}</span>`:''}
                </div>
                <div class="card-actions" onclick="event.stopPropagation()">
                    <a href="${navUrl}" target="_blank" class="btn-navigate">📍 Navigate</a>
                    <button class="btn btn-ghost btn-sm edit-only" onclick="openPlaceModal(${p.id})">✏️</button>
                    <button class="btn btn-ghost btn-sm edit-only" onclick="deletePlace(${p.id})" style="color:var(--red)">🗑️</button>
                </div>
            </div>
        </div>`;
    }).join('');

    // Update filter badges with counts
    document.querySelectorAll('#filter-bar .chip[data-filter]').forEach(chip => {
        const filter = chip.dataset.filter;
        let count = 0;
        if (filter === 'all') count = state.places.length;
        else if (['Tokyo','Kyoto','Osaka','Nara','Fuji','Izu'].includes(filter)) count = state.places.filter(p => p.city === filter).length;
        else count = state.places.filter(p => p.category === filter).length;
        let badge = chip.querySelector('.chip-count');
        if (!badge) { badge = document.createElement('span'); badge.className = 'chip-count'; chip.appendChild(badge); }
        badge.textContent = count;
    });

    // Active filter summary
    const activeEl = document.getElementById('active-filters');
    if (activeEl) {
        const active = [];
        if (placeFilter !== 'all') active.push(placeFilter);
        if (areaFilter !== 'all') active.push(areaFilter);
        statusFilters.forEach(s => active.push(s));
        if (placeSearch) active.push(`"${placeSearch}"`);
        if (active.length) {
            activeEl.style.display = '';
            activeEl.innerHTML = `<span class="active-filters-text">Filters: ${active.join(' + ')} (${places.length} places)</span> <button class="btn btn-ghost btn-sm" onclick="clearAllFilters()">Clear all</button>`;
        } else {
            activeEl.style.display = 'none';
        }
    }
}

export function applyStatusFilter() {
    statusFilters.clear();
    document.querySelectorAll('#status-filters input:checked').forEach(cb => {
        statusFilters.add(cb.dataset.status);
    });
    renderPlaces();
}

export function clearAllFilters() {
    placeFilter = 'all'; areaFilter = 'all'; placeSearch = '';
    statusFilters.clear();
    document.getElementById('place-search').value = '';
    document.querySelectorAll('#filter-bar .chip').forEach(c => c.classList.remove('active'));
    document.querySelector('#filter-bar .chip[data-filter="all"]')?.classList.add('active');
    document.querySelectorAll('#status-filters input').forEach(cb => cb.checked = false);
    if (document.getElementById('place-sort')) document.getElementById('place-sort').value = 'default';
    renderPlaces();
}

export function renderReservationSummary() {
    const reserved = state.places.filter(p => p.reserved);
    if (reserved.length === 0) {
        showToast('No reservations yet. Mark places as reserved in the detail view.', 'info');
        return;
    }

    const dayMap = new Map();
    state.itinerary.forEach((day, idx) => {
        day.items.forEach(it => {
            const key = it.placeId ?? it.name;
            if (!dayMap.has(key)) dayMap.set(key, []);
            dayMap.get(key).push(idx + 1);
        });
    });

    let html = '<h2>Reservation Summary</h2>';
    html += '<div class="res-summary-list">';
    reserved.forEach(p => {
        const days = dayMap.get(p.id) || dayMap.get(p.name) || [];
        const dayStr = days.length ? `Day ${days.join(', ')}` : 'Not scheduled';
        html += `
        <div class="res-summary-item">
            <div class="res-summary-name">${esc(p.name)}</div>
            <div class="res-summary-meta">
                <span>${esc(p.city)}</span> · <span>${esc(p.category)}</span> · <span>${dayStr}</span>
            </div>
            ${p.confirmationNo ? `<div class="res-summary-field">Confirmation: <strong>${esc(p.confirmationNo)}</strong></div>` : ''}
            ${p.bookedBy ? `<div class="res-summary-field">Booked by: ${esc(p.bookedBy)}</div>` : ''}
            ${p.hours ? `<div class="res-summary-field">Hours: ${esc(p.hours)}</div>` : ''}
            <div class="res-summary-actions">
                <a href="${mapsNavUrl(p.name, p.city, p.lat, p.lng, p.address)}" target="_blank" class="btn btn-sm btn-ghost">📍 Navigate</a>
                <button class="btn btn-sm btn-ghost" onclick="openDetail(${p.id})">View</button>
            </div>
        </div>`;
    });
    html += '</div>';
    html += `<div class="data-hint" style="margin-top:8px">${reserved.length} reservation${reserved.length !== 1 ? 's' : ''}</div>`;

    document.getElementById('detail-content').innerHTML = html;
    window.openModal?.('modal-detail');
}

export function deletePlace(id) {
    const place = state.places.find(p => p.id === id);
    if (!place) return;
    const inDays = [];
    state.itinerary.forEach((day, idx) => {
        if (day.items.some(it => it.placeId === id || it.name === place.name)) inDays.push(idx + 1);
    });
    const warn = inDays.length ? `\n\nThis place is scheduled on Day ${inDays.join(', ')}. Those activities will also be removed.` : '';
    if (!confirm(`Delete "${place.name}"?${warn}`)) return;
    state.places = state.places.filter(p => p.id !== id);
    // Cascade: remove itinerary items referencing this place
    state.itinerary.forEach(day => {
        day.items = day.items.filter(it => it.placeId !== id && it.name !== place.name);
    });
    save(); renderPlaces(); window.updateMapMarkers?.(); window.renderPlacePool?.(); window.renderItinerary?.(); window.renderDashboard?.();
}

export function toggleReserved(id, checked) {
    const p = state.places.find(x=>x.id===id);
    if (!p) return;
    p.reserved = checked;
    if (!checked) { p.confirmationNo = ''; p.bookedBy = ''; }
    save(); renderPlaces(); window.renderItinerary?.(); window.renderDashboard?.();
    const fields = document.getElementById(`res-fields-${id}`);
    if (fields) fields.style.display = checked ? '' : 'none';
    showToast(checked ? `${esc(p.name)} marked as reserved` : `${esc(p.name)} reservation removed`, checked ? 'success' : 'info');
}

export function updateResField(id, field, value) {
    const p = state.places.find(x=>x.id===id);
    if (p) { p[field] = value.trim(); save(); }
}

// ══════════════════════════════════════════════════════════════
//  PLACE DETAIL MODAL
// ══════════════════════════════════════════════════════════════
export function openDetail(id) {
    const p = state.places.find(x=>x.id===id); if(!p) return;
    const photo = getPhotoPath(p);
    const nameQ = encodeURIComponent(p.name + ', ' + p.city + ', Japan');
    const embedQ = (p.lat && p.lng) ? `${p.lat},${p.lng}` : nameQ;
    const embedUrl = `https://maps.google.com/maps?q=${embedQ}&z=16&output=embed`;
    const navUrl = mapsNavUrl(p.name, p.city, p.lat, p.lng, p.address);
    const searchUrl = mapsSearchUrl(p.name, p.city, p.lat, p.lng, p.address);

    document.getElementById('detail-content').innerHTML = `
        <div class="detail-header">
            <h2>${esc(p.name)}</h2>
            <div class="detail-address">📍 ${esc(getArea(p) ? getArea(p) + ', ' + (p.address || p.city) : (p.address || p.city))}</div>
        </div>
        <div class="detail-tags">
            <span class="tag ${(p.category||'').toLowerCase()}">${p.category}</span>
            ${getArea(p) ? `<span class="tag tag-area">${esc(getArea(p))}</span>` : ''}
            <span class="tag tag-city">${esc(p.city)}</span>
        </div>
        <img src="${photo}" alt="${esc(p.name)}" class="detail-photo" onerror="this.style.display='none'">
        <div class="detail-map-wrap">
            <iframe src="${embedUrl}" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
        <div class="detail-info">
            ${p.hours ? `<div class="detail-info-item"><label>Hours</label><span>${esc(p.hours)}</span></div>` : ''}
            ${p.cost ? `<div class="detail-info-item"><label>Cost</label><span>${esc(p.cost)}</span></div>` : ''}
            ${p.notes ? `<div class="detail-info-item"><label>Notes</label><span>${esc(p.notes)}</span></div>` : ''}
        </div>
        ${p.description ? `<p class="detail-desc">${esc(p.description)}</p>` : ''}
        <div class="detail-reservation">
            <label><input type="checkbox" ${p.reserved?'checked':''} onchange="toggleReserved(${p.id}, this.checked)"> Reservation Made</label>
            <div class="detail-res-fields" style="${p.reserved?'':'display:none'}" id="res-fields-${p.id}">
                <input type="text" placeholder="Confirmation #" value="${esc(p.confirmationNo||'')}" onchange="updateResField(${p.id},'confirmationNo',this.value)">
                <input type="text" placeholder="Booked by" value="${esc(p.bookedBy||'')}" onchange="updateResField(${p.id},'bookedBy',this.value)">
            </div>
        </div>
        <div class="detail-actions">
            <a href="${navUrl}" target="_blank" class="btn-navigate" style="font-size:.85rem;padding:.55rem 1.1rem">📍 Navigate Here</a>
            <a href="${searchUrl}" target="_blank" class="btn btn-ghost">Open in Google Maps</a>
            ${p.url ? `<a href="${p.url}" target="_blank" class="btn btn-ghost">Website</a>` : ''}
            <button class="btn btn-ghost edit-only" onclick="closeModal('modal-detail'); openPlaceModal(${p.id})">✏️ Edit</button>
        </div>
    `;
    window.openModal?.('modal-detail');
}

// ══════════════════════════════════════════════════════════════
//  PLACE ADD/EDIT MODAL
// ══════════════════════════════════════════════════════════════
export function openPlaceModal(editId) {
    const form = document.getElementById('place-form');
    form.reset(); document.getElementById('f-id').value = '';
    document.getElementById('modal-place-title').textContent = 'Add New Place';
    if (editId) {
        const p = state.places.find(x=>x.id===editId);
        if (p) {
            document.getElementById('modal-place-title').textContent = 'Edit Place';
            document.getElementById('f-id').value = p.id;
            document.getElementById('f-name').value = p.name;
            document.getElementById('f-city').value = p.city;
            document.getElementById('f-category').value = p.category;
            document.getElementById('f-hours').value = p.hours||'';
            document.getElementById('f-address').value = p.address||'';
            document.getElementById('f-lat').value = p.lat||'';
            document.getElementById('f-lng').value = p.lng||'';
            document.getElementById('f-desc').value = p.description||'';
            document.getElementById('f-cost').value = p.cost||'';
            document.getElementById('f-notes').value = p.notes||'';
            document.getElementById('f-url').value = p.url||'';
            document.getElementById('f-area').value = p.area || getArea(p) || '';
        }
    }
    window.openModal?.('modal-place');
}

export function handlePlaceSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('f-id').value;
    const data = {
        name: document.getElementById('f-name').value.trim(),
        city: document.getElementById('f-city').value,
        category: document.getElementById('f-category').value,
        hours: document.getElementById('f-hours').value.trim(),
        address: document.getElementById('f-address').value.trim(),
        lat: parseFloat(document.getElementById('f-lat').value) || null,
        lng: parseFloat(document.getElementById('f-lng').value) || null,
        description: document.getElementById('f-desc').value.trim(),
        cost: document.getElementById('f-cost').value.trim(),
        notes: document.getElementById('f-notes').value.trim(),
        url: document.getElementById('f-url').value.trim(),
        area: document.getElementById('f-area').value.trim() || undefined,
    };
    if (id) {
        const p = state.places.find(x=>x.id===parseInt(id));
        if (p) {
            const oldName = p.name;
            Object.assign(p, data);
            // Update itinerary references: sync name for display, placeId for lookups
            state.itinerary.forEach(day => {
                day.items.forEach(it => {
                    if (it.placeId === p.id || it.name === oldName) {
                        it.placeId = p.id;
                        it.name = data.name;
                    }
                });
            });
        }
    } else {
        data.id = Date.now();
        // Pick up photo from smart import if available
        if (window._importedPhotoUrl) {
            data.photoUrl = window._importedPhotoUrl;
            window._importedPhotoUrl = null;
        }
        state.places.push(data);
        if (ENABLE_API_PHOTOS && window._placesService) { window.startPhotoFetching?.(); }
    }
    save(); renderPlaces(); window.updateMapMarkers?.(); window.renderPlacePool?.(); window.renderItinerary?.(); window.renderDashboard?.(); window.closeModal?.('modal-place');
}
