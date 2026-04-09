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
    const places = getFilteredPlaces();
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
}

export function deletePlace(id) {
    if (!confirm('Delete this place?')) return;
    state.places = state.places.filter(p=>p.id!==id);
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
