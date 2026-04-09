// ── Itinerary: Vertical timeline rendering, day management, SortableJS ──

import { state, save } from './state.js';
import {
    esc, getDayCity, parseDayTitle, getDayWalkingEstimate,
    getArea, getVenue, getHoursConflict, mapsNavUrl,
    findPlaceForItem, downloadBlob
} from './helpers.js';
import { CATEGORY_ICONS } from './config.js';
import { TRIP_START, TRIP_END } from './data.js';
import { showToast } from './toast.js';
import { getDaySegments, getDaySummary, optimizeRoute } from './routing.js';

// ── Shared mutable UI state via window ──
// window._editMode      — boolean (set by app.js)
// window._expandedDays  — Set (set by app.js)
// window._dayMaps       — object (set by app.js)
// window._timelineSortables — array for tracking Sortable instances

if (!window._timelineSortables) window._timelineSortables = [];

let itinSearch = '';
export function setItinSearch(val) { itinSearch = val; }

let rainMode = false;
export function toggleRainMode() {
    rainMode = !rainMode;
    const btn = document.getElementById('rain-toggle');
    if (btn) btn.classList.toggle('active', rainMode);
    renderItinerary();
}

// ══════════════════════════════════════════════════════════════
//  ITINERARY — VERTICAL TIMELINE
// ══════════════════════════════════════════════════════════════
export function renderItinerary() {
    document.querySelector('.floating-navigate')?.remove();
    const container = document.getElementById('itinerary-list');
    document.getElementById('day-counter').textContent = `${state.itinerary.length} days · May 16 – Jun 2, 2026`;

    container.innerHTML = state.itinerary.map((day, idx) => {
        const city = getDayCity(day);
        const cityClass = city.toLowerCase();
        const isExpanded = window._expandedDays.has(day.id);
        const {date, subtitle} = parseDayTitle(day.title);
        const summary = getDaySummary(day);

        // Build smart summary chips for header
        let summaryHtml = '';
        if (summary) {
            const chips = [];
            if (summary.travelKm > 0) chips.push(`<span class="day-stops" title="Total travel distance">🚶 ~${summary.travelKm}km</span>`);
            if (summary.travelMin > 0) chips.push(`<span class="day-stops" title="Total travel time">⏱ ~${summary.travelMin}min</span>`);
            if (summary.paceEmoji) chips.push(`<span class="day-stops" title="${summary.paceLabel} pace">${summary.paceEmoji} ${summary.paceLabel}</span>`);
            summaryHtml = chips.join('');
        } else {
            const km = getDayWalkingEstimate(day);
            if (km) summaryHtml = `<span class="day-stops" title="Estimated walking distance">🚶 ~${km}km</span>`;
        }

        // Build timeline with travel segments
        const timelineHtml = buildTimelineWithSegments(day, city);

        return `
        <div class="day-card ${isExpanded?'expanded':''} city-${cityClass}" data-day-id="${day.id}">
            <div class="day-header" onclick="toggleDay('${day.id}')">
                <div class="day-header-left">
                    <div class="day-num ${cityClass}">${idx+1}</div>
                    <div class="day-info">
                        <div class="day-title">${esc(date)}</div>
                        ${subtitle ? `<div class="day-subtitle">${esc(subtitle)}</div>` : ''}
                    </div>
                </div>
                <div class="day-header-right">
                    ${summaryHtml}
                    <span class="day-stops">${day.items.length} stop${day.items.length!==1?'s':''}</span>
                    <button class="day-share-btn" onclick="event.stopPropagation(); shareDayCard('${day.id}')" title="Share as image">📤</button>
                    <div class="day-edit-actions edit-only" onclick="event.stopPropagation()">
                        <button title="Duplicate day" onclick="duplicateDay('${day.id}')">📋</button>
                        <button title="Optimize route" onclick="optimizeDayRoute('${day.id}')">🔄</button>
                        <button title="Delete day" onclick="deleteDay('${day.id}')">🗑️</button>
                    </div>
                    <span class="day-chevron">▼</span>
                </div>
            </div>
            <div class="day-body">
                <div class="day-body-inner">
                    <div class="day-map-wrap" id="daymap-wrap-${day.id}">
                        <div class="day-map" id="daymap-${day.id}"></div>
                        <button class="day-map-expand" onclick="event.stopPropagation(); expandDayMap('${day.id}')" title="Enlarge map">⛶</button>
                    </div>
                    <div class="timeline" data-day-id="${day.id}">
                        ${timelineHtml}
                    </div>
                    <div class="day-add-item edit-only">
                        <button onclick="openItinItemModal('${day.id}')">+ Add activity</button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    // Search filtering
    if (itinSearch) {
        const q = itinSearch.toLowerCase();
        document.querySelectorAll('.day-card').forEach(card => {
            const dayId = card.dataset.dayId;
            const day = state.itinerary.find(d => d.id === dayId);
            if (!day) return;
            const hasMatch = day.items.some(it =>
                it.name?.toLowerCase().includes(q) || it.desc?.toLowerCase().includes(q)
            );
            if (!hasMatch) {
                card.style.display = 'none';
            }
            // Highlight matching items
            card.querySelectorAll('.tl-item').forEach(el => {
                const itemId = el.dataset.itemId;
                const item = day.items.find(i => i.id === itemId);
                if (item && (item.name?.toLowerCase().includes(q) || item.desc?.toLowerCase().includes(q))) {
                    el.classList.add('search-highlight');
                }
            });
        });
    }

    // Nearby suggestions hint
    if (window._expandedDays.size > 0) {
        document.querySelectorAll('.day-card.expanded').forEach(card => {
            const dayId = card.dataset.dayId;
            const day = state.itinerary.find(d => d.id === dayId);
            if (day && day.items.length >= 2) {
                const nearbyEl = card.querySelector('.day-nearby-hint');
                if (!nearbyEl) {
                    const nearby = window.getNearbyForDay?.(dayId);
                    if (nearby && nearby.length > 0) {
                        const names = nearby.slice(0, 3).map(n => n.place.name).join(', ');
                        const more = nearby.length > 3 ? ` +${nearby.length - 3} more` : '';
                        const hint = document.createElement('div');
                        hint.className = 'day-nearby-hint';
                        hint.innerHTML = `<span>📍 ${nearby.length} unadded nearby: ${names}${more}</span>`;
                        hint.title = 'Click to scroll to places pool';
                        hint.onclick = () => {
                            const pool = document.getElementById('place-pool');
                            if (pool) pool.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        };
                        const bodyInner = card.querySelector('.day-body-inner');
                        if (bodyInner) bodyInner.appendChild(hint);
                    }
                }
            }
        });
    }

    // SortableJS — destroy previous instances, recreate only in edit mode
    window._timelineSortables.forEach(s => s.destroy());
    window._timelineSortables = [];
    if (window._editMode) {
        document.querySelectorAll('.timeline').forEach(el => {
            window._timelineSortables.push(new Sortable(el, {
                group: 'itinerary',
                animation: 200,
                ghostClass: 'sortable-ghost',
                handle: '.tl-grip',
                onEnd: handleItinSort,
                onAdd: function(evt) { window.handlePoolDrop?.(evt); }
            }));
        });
    }

    // Day-of-trip mode: auto-expand today and highlight next activity
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (today >= TRIP_START && today <= TRIP_END) {
        const tripDayIdx = Math.floor((today - TRIP_START) / 86400000);
        const todayDay = state.itinerary[tripDayIdx];
        if (todayDay) {
            if (window._expandedDays.size === 0 || (window._expandedDays.size === 1 && window._expandedDays.has(state.itinerary[0]?.id))) {
                window._expandedDays.add(todayDay.id);
            }

            const nowMins = now.getHours() * 60 + now.getMinutes();
            const card = document.querySelector(`[data-day-id="${todayDay.id}"]`);
            if (card) {
                card.classList.add('today-card');
                const items = todayDay.items.filter(it => !it.visited);
                for (const it of items) {
                    if (!it.time) continue;
                    const timeParts = it.time.trim().split(/\s*[-–]\s*/);
                    const startStr = timeParts[0];
                    const match = startStr.match(/(\d{1,2}):?(\d{2})?/);
                    if (match) {
                        const h = parseInt(match[1]), m = parseInt(match[2] || '0');
                        const itemMins = h * 60 + m;
                        if (itemMins >= nowMins) {
                            const el = card.querySelector(`[data-item-id="${it.id}"]`);
                            if (el) {
                                el.classList.add('next-activity');
                                const place = findPlaceForItem(it);
                                if (place) {
                                    const navUrl = mapsNavUrl(place.name, place.city, place.lat, place.lng, place.address);
                                    const floatBtn = document.createElement('a');
                                    floatBtn.href = navUrl;
                                    floatBtn.target = '_blank';
                                    floatBtn.className = 'floating-navigate';
                                    floatBtn.innerHTML = `📍 Navigate to ${place.name}`;
                                    document.body.querySelector('.main')?.appendChild(floatBtn);
                                }
                            }
                            break;
                        }
                    }
                }
            }
        }
    }
}

// ── Build timeline HTML with travel segments between items ──
function buildTimelineWithSegments(day, city) {
    if (!day.items.length) return '<div class="timeline-drop-hint">Drag places here or use + Add activity</div>';

    // Build a map: toItem.id → travel segment (show segment BEFORE the destination item)
    const segments = getDaySegments(day);
    const segmentBeforeItem = new Map();
    for (const seg of segments) {
        if (seg.travel) segmentBeforeItem.set(seg.toItem.id, seg);
    }

    let html = '';
    for (let i = 0; i < day.items.length; i++) {
        const item = day.items[i];
        // Show travel segment before this place item (if one exists)
        if (!item.isNote) {
            const seg = segmentBeforeItem.get(item.id);
            if (seg) {
                html += `<div class="tl-travel-segment"><span class="tl-travel-label">${seg.travel.label}</span></div>`;
            }
        }
        html += renderTimelineItem(item, day, city);
    }
    return html;
}

// ── Optimize route for a day ──
export function optimizeDayRoute(dayId) {
    const day = state.itinerary.find(d => d.id === dayId);
    if (!day) return;

    const result = optimizeRoute(day);
    if (!result) {
        showToast('Route is already optimal (or too few stops to optimize).', 'info');
        return;
    }

    if (!confirm(`Optimize route? Saves ~${result.savedKm} km (${result.beforeKm} km → ${result.afterKm} km). This will reorder free activities.`)) return;

    day.items = result.items;
    save();
    renderItinerary();
    window.renderDashboard?.();
    window.initDayMap?.(dayId);
    showToast(`Route optimized! Saved ~${result.savedKm} km.`, 'success');
}

export function renderTimelineItem(it, day, city) {
    const cityClass = city.toLowerCase();
    const place = findPlaceForItem(it);
    const note = it.isNote;
    const navUrl = place ? mapsNavUrl(place.name, city, place.lat, place.lng, place.address) : mapsNavUrl(it.name, city);
    const hoursWarn = !note ? getHoursConflict(it, place) : null;
    return `
    <div class="tl-item ${it.visited?'visited':''} ${note?'is-note':''} ${rainMode && place && getVenue(place) === 'outdoor' ? 'rain-dimmed' : ''} ${rainMode && place && getVenue(place) === 'indoor' ? 'rain-highlighted' : ''}" data-item-id="${it.id}">
        <span class="tl-grip edit-only-inline" title="Drag to reorder or drop in pool">⠿</span>
        <div class="tl-dot ${note?'':cityClass}"></div>
        ${(it.time || it.timeEnd) ? `<div class="tl-time">${esc([it.time, it.timeEnd].filter(Boolean).join(' – '))}</div>` : ''}
        <div class="tl-name">${note?'📝 ':''}${esc(it.name)}${note?'<span class="tl-note-badge">note</span>':''}${!note && place && getArea(place) ? `<span class="tl-area">${esc(getArea(place))}</span>` : ''}${!note && place && place.reserved ? '<span class="badge-reserved">✓</span>' : ''}${!note && place && getVenue(place) === 'outdoor' ? '<span class="tl-venue" title="Outdoor">☀️</span>' : ''}${!note && place && getVenue(place) === 'indoor' ? '<span class="tl-venue" title="Indoor">🏠</span>' : ''}</div>
        ${it.desc ? `<div class="tl-desc">${esc(it.desc)}</div>` : ''}
        ${hoursWarn ? `<div class="tl-hours-warn">⚠️ ${hoursWarn}</div>` : ''}
        <div class="tl-actions">
            ${note ? '' : `<a href="${navUrl}" target="_blank" class="btn-navigate">📍 Navigate</a>`}
            <button class="tl-edit-btn" onclick="toggleVisited('${day.id}','${it.id}')">${it.visited ? '↩️ Undo' : '✅ Done'}</button>
            <button class="tl-edit-btn edit-only" onclick="openItinItemModal('${day.id}','${it.id}')">✏️ Edit</button>
            <button class="tl-edit-btn edit-only" onclick="deleteItinItem('${day.id}','${it.id}')">🗑️</button>
        </div>
    </div>`;
}

export function toggleDay(dayId) {
    if (window._expandedDays.has(dayId)) {
        window._expandedDays.delete(dayId);
        delete window._dayMaps[dayId]; // free map instance on collapse
    } else {
        window._expandedDays.add(dayId);
    }
    renderItinerary();
    if (window._expandedDays.has(dayId)) window.initDayMap?.(dayId);
}

export function toggleVisited(dayId, itemId) {
    const day = state.itinerary.find(d=>d.id===dayId); if(!day) return;
    const item = day.items.find(i=>i.id===itemId); if(!item) return;
    item.visited = !item.visited;
    save(); renderItinerary(); window.renderDashboard?.();

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (item.visited && typeof window.confetti === 'function' && !prefersReducedMotion) {
        const allDone = day.items.every(i => i.visited);
        if (allDone) {
            window.confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
            showToast(`Day complete! 🎉 All ${day.items.length} activities done!`, 'success', 4000);
            const tripDone = state.itinerary.every(d => d.items.length === 0 || d.items.every(i => i.visited));
            if (tripDone) {
                setTimeout(() => window.confetti({ particleCount: 300, spread: 160, origin: { y: 0.5 } }), 800);
                showToast('🎌 ENTIRE TRIP COMPLETE! What an adventure!', 'success', 6000);
            }
        }
    }
}

export function handleItinSort() {
    const newItin = [];
    document.querySelectorAll('.day-card').forEach(dayEl => {
        const dayId = dayEl.dataset.dayId;
        const day = state.itinerary.find(d => d.id === dayId);
        if (!day) return;
        const items = [];
        dayEl.querySelectorAll('.tl-item').forEach(itemEl => {
            const itemId = itemEl.dataset.itemId;
            for (const d of state.itinerary) {
                const f = d.items.find(i => i.id === itemId);
                if (f) { items.push(f); break; }
            }
        });
        newItin.push({ ...day, items });
    });
    state.itinerary = newItin; save();
    setTimeout(() => { renderItinerary(); window.renderPlacePool?.(); window.renderDashboard?.(); }, 0);
}

export function addItineraryDay() {
    const title = `Day ${state.itinerary.length+1} — New Day`;
    const id = 'day'+Date.now();
    state.itinerary.push({ id, title, items:[] });
    window._expandedDays.add(id);
    save(); renderItinerary(); window.renderPlacePool?.(); populateDaySelect(); window.renderDashboard?.();
}

export function duplicateDay(dayId) {
    const day = state.itinerary.find(d => d.id === dayId);
    if (!day) return;
    const idx = state.itinerary.indexOf(day);
    const copy = JSON.parse(JSON.stringify(day));
    copy.id = 'day' + Date.now();
    copy.title = day.title + ' (copy)';
    copy.items = copy.items.map(it => ({ ...it, id: 'it' + Date.now() + Math.random().toString(36).slice(2, 6), visited: false }));
    state.itinerary.splice(idx + 1, 0, copy);
    window._expandedDays.add(copy.id);
    save(); renderItinerary(); window.renderPlacePool?.(); window.renderDashboard?.();
    showToast('Day duplicated!', 'success');
}

export function deleteDay(id) {
    if (!confirm('Delete this entire day?')) return;
    state.itinerary = state.itinerary.filter(d=>d.id!==id);
    window._expandedDays.delete(id);
    if (window._dayMaps[id]) delete window._dayMaps[id];
    save(); renderItinerary(); window.renderPlacePool?.(); populateDaySelect(); window.renderDashboard?.();
}

// ── Itinerary Item Modal ──
export function openItinItemModal(dayId, itemId) {
    const form = document.getElementById('itin-form');
    form.reset();
    document.getElementById('ii-day-id').value = dayId;
    document.getElementById('ii-item-id').value = itemId || '';
    document.getElementById('ii-time-end').value = '';
    document.getElementById('ii-note').checked = false;
    document.getElementById('modal-itin-title').textContent = itemId ? 'Edit Activity' : 'Add Activity';

    if (itemId) {
        const day = state.itinerary.find(d=>d.id===dayId);
        const item = day?.items.find(i=>i.id===itemId);
        if (item) {
            document.getElementById('ii-time').value = item.time || '';
            document.getElementById('ii-time-end').value = item.timeEnd || '';
            document.getElementById('ii-name').value = item.name || '';
            document.getElementById('ii-desc').value = item.desc || '';
            document.getElementById('ii-note').checked = !!item.isNote;
        }
    }
    window.openModal?.('modal-itin');
}

export function handleItinItemSubmit(e) {
    e.preventDefault();
    const dayId = document.getElementById('ii-day-id').value;
    const itemId = document.getElementById('ii-item-id').value;
    const data = {
        time: document.getElementById('ii-time').value.trim(),
        timeEnd: document.getElementById('ii-time-end').value.trim() || undefined,
        name: document.getElementById('ii-name').value.trim(),
        desc: document.getElementById('ii-desc').value.trim(),
        isNote: document.getElementById('ii-note').checked,
    };
    const day = state.itinerary.find(d=>d.id===dayId);
    if (!day) return;

    if (itemId) {
        const item = day.items.find(i=>i.id===itemId);
        if (item) Object.assign(item, data);
    } else {
        day.items.push({ id:'it'+Date.now(), ...data, visited:false });
    }
    save(); renderItinerary(); window.renderPlacePool?.(); window.renderDashboard?.(); window.closeModal?.('modal-itin');
}

export function deleteItinItem(dayId, itemId) {
    const day = state.itinerary.find(d=>d.id===dayId);
    if (day) { day.items = day.items.filter(i=>i.id!==itemId); save(); renderItinerary(); window.renderPlacePool?.(); window.renderDashboard?.(); }
}

export function populateDaySelect() {
    const sel = document.getElementById('day-select');
    sel.innerHTML = '<option value="">Jump to day...</option>' +
        state.itinerary.map((d, i) => {
            const {date, subtitle} = parseDayTitle(d.title);
            return `<option value="${d.id}">Day ${i+1} — ${date}${subtitle ? ' — '+subtitle : ''}</option>`;
        }).join('');
}

export function jumpToDay(dayId) {
    window._expandedDays.add(dayId);
    renderItinerary();
    const el = document.querySelector(`[data-day-id="${dayId}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function shareDayCard(dayId) {
    if (typeof window.html2canvas === 'undefined') { showToast('Image library not loaded yet', 'warn'); return; }
    const dayIdx = state.itinerary.findIndex(d => d.id === dayId);
    const day = state.itinerary[dayIdx];
    if (!day) return;

    if (!window._expandedDays.has(dayId)) {
        window._expandedDays.add(dayId);
        renderItinerary();
    }

    showToast('Generating image...', 'info', 2000);

    setTimeout(() => {
        const card = document.querySelector(`[data-day-id="${dayId}"]`);
        if (!card) return;

        const clone = card.cloneNode(true);
        const computedBg = getComputedStyle(document.documentElement).getPropertyValue('--bg-1').trim() || '#0b0f19';
        clone.style.width = '420px';
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.background = computedBg;
        clone.classList.add('expanded');

        clone.querySelectorAll('.edit-only, .edit-only-inline, .day-share-btn, .day-map, .tl-grip').forEach(e => e.remove());

        const watermark = document.createElement('div');
        const wmColor = getComputedStyle(document.documentElement).getPropertyValue('--text-2').trim() || '#9ca3af';
        watermark.style.cssText = `text-align:center;padding:8px;font-size:11px;opacity:.5;color:${wmColor}`;
        watermark.textContent = 'Japan 2026 \u00b7 Day ' + (dayIdx + 1);
        clone.querySelector('.day-body-inner')?.appendChild(watermark);

        document.body.appendChild(clone);

        window.html2canvas(clone, {
            backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-1').trim() || '#0b0f19',
            scale: 2,
            useCORS: true,
            logging: false,
        }).then(canvas => {
            clone.remove();
            canvas.toBlob(blob => {
                if (!blob) { showToast('Failed to generate image', 'error'); return; }
                const {date, subtitle} = parseDayTitle(day.title);
                const fname = `day${dayIdx+1}-${(subtitle||date).replace(/[^a-zA-Z0-9]/g,'-')}.png`;

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], fname, { type: 'image/png' })] })) {
                    navigator.share({
                        title: `Day ${dayIdx+1} — ${date}`,
                        text: subtitle || date,
                        files: [new File([blob], fname, { type: 'image/png' })],
                    }).catch(() => downloadBlob(blob, fname));
                } else {
                    downloadBlob(blob, fname);
                }
                showToast('Day card image ready!', 'success');
            }, 'image/png');
        }).catch(() => { clone.remove(); showToast('Failed to capture day card', 'error'); });
    }, 200);
}
