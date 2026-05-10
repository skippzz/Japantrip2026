// ── Dashboard: Today screen with rhythm-model hero + supporting stats ──

import { esc, getDayCity, parseDayTitle, findPlaceForItem, mapsNavUrl } from './helpers.js';
import { state } from './state.js';
import { TRIP_START, TRIP_END } from './data.js';
import { getUnaddedPlaces } from './pool.js';
import { getActiveTrip } from './trips.js';
import { getWeatherForDay, weatherChipHtml, prewarmWeather } from './weather.js';

// ── Phase 1.9: trip-rhythm context ──
// The Today screen renders a single contextual hero based on where the user is
// in the trip's lifecycle. No mode toggle — just content prioritisation.
//   pre       : > 7 days out
//   imminent  : 7 days out → trip start
//   active    : during trip days
//   wind-down : final 2 days of trip
//   post      : after trip ends

const MS_PER_DAY = 86400000;

export function getTripContext() {
    const trip = getActiveTrip();
    let tripStart = TRIP_START, tripEnd = TRIP_END;
    if (trip?.dateStart) tripStart = new Date(trip.dateStart);
    if (trip?.dateEnd) tripEnd = new Date(trip.dateEnd);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const daysUntil = Math.ceil((tripStart - today) / MS_PER_DAY);
    const daysAfter = Math.ceil((today - tripEnd) / MS_PER_DAY);
    const tripDayIdx = Math.floor((today - tripStart) / MS_PER_DAY);
    const tripLen = state.itinerary.length;

    let phase = 'pre';
    if (today > tripEnd) phase = 'post';
    else if (today >= tripStart) {
        // active or wind-down
        const remaining = tripLen - tripDayIdx - 1;
        phase = (remaining <= 1) ? 'wind-down' : 'active';
    } else if (daysUntil <= 7) phase = 'imminent';

    const currentDay = (phase === 'active' || phase === 'wind-down') ? state.itinerary[tripDayIdx] : null;
    const nextDay = (phase === 'pre' || phase === 'imminent') ? state.itinerary[0] : (currentDay ? state.itinerary[tripDayIdx + 1] : null);

    // Find the now/next activity within current day (active/wind-down only)
    let nowItem = null, nextItem = null, upcomingItems = [];
    if (currentDay?.items?.length) {
        const nowMins = now.getHours() * 60 + now.getMinutes();
        const itemsWithTime = currentDay.items
            .filter(it => !it.visited && it.time)
            .map(it => {
                const m = it.time.trim().match(/(\d{1,2}):?(\d{2})?/);
                if (!m) return null;
                const startMins = parseInt(m[1]) * 60 + parseInt(m[2] || '0');
                // crude end estimate: 90min if no range
                const range = it.time.split(/\s*[-–]\s*/);
                let endMins = startMins + 90;
                if (range[1]) {
                    const m2 = range[1].match(/(\d{1,2}):?(\d{2})?/);
                    if (m2) endMins = parseInt(m2[1]) * 60 + parseInt(m2[2] || '0');
                }
                return { ...it, startMins, endMins };
            })
            .filter(Boolean)
            .sort((a, b) => a.startMins - b.startMins);

        nowItem = itemsWithTime.find(it => it.startMins <= nowMins && nowMins < it.endMins);
        const future = itemsWithTime.filter(it => it.startMins > nowMins);
        nextItem = future[0];
        upcomingItems = future.slice(0, 3);
    }

    return {
        phase,
        trip,
        tripStart, tripEnd,
        daysUntil: Math.max(0, daysUntil),
        daysAfter: Math.max(0, daysAfter),
        tripDayIdx, tripLen,
        currentDay, nextDay,
        nowItem, nextItem, upcomingItems,
        today,
    };
}

function renderActivityRow(it, opts = {}) {
    const place = findPlaceForItem(it);
    const navBtn = (place && opts.showNav)
        ? `<a class="today-row-nav" href="${esc(mapsNavUrl(place.name, place.city, place.lat, place.lng, place.address))}" target="_blank" rel="noopener">📍 Navigate</a>`
        : '';
    return `
        <div class="today-row${opts.featured ? ' is-featured' : ''}">
            ${it.time ? `<div class="today-row-time">${esc(it.time)}</div>` : ''}
            <div class="today-row-body">
                <div class="today-row-name">${esc(it.name || 'Activity')}</div>
                ${it.desc ? `<div class="today-row-desc">${esc(it.desc)}</div>` : ''}
            </div>
            ${navBtn}
        </div>`;
}

function renderHotelMini() {
    // Read first hotel from the new DEFAULT_HOTELS (or the active trip's hotel if extended later)
    // For now: show the first place of category Hotel that matches the active trip block.
    const hotelPlace = state.places?.find(p => p.category === 'Hotel');
    if (!hotelPlace) return '';
    const navUrl = mapsNavUrl(hotelPlace.name, hotelPlace.city, hotelPlace.lat, hotelPlace.lng, hotelPlace.address);
    return `
        <button class="today-hotel" onclick="openHotelTaxiCard()">
            <div class="today-hotel-icon">🏨</div>
            <div class="today-hotel-body">
                <div class="today-hotel-label">Hotel · tap to show address</div>
                <div class="today-hotel-name">${esc(hotelPlace.name)}</div>
            </div>
            <a class="today-hotel-nav" href="${esc(navUrl)}" target="_blank" onclick="event.stopPropagation()" rel="noopener">📍</a>
        </button>`;
}

// Phase 4.5: smart suggestions — un-visited items in current/nearby days
function renderSmartSuggestions(ctx) {
    if (!ctx.currentDay) return '';
    // T2.21: explicit bounds so the slice doesn't silently shrink at trip end.
    const startIdx = Math.max(0, ctx.tripDayIdx);
    const endIdx = Math.min(state.itinerary.length, ctx.tripDayIdx + 3);
    const win = state.itinerary.slice(startIdx, endIdx);
    const unvisited = win.flatMap(d => (d.items || []).filter(i => !i.visited && !i.isNote)).slice(0, 3);
    if (!unvisited.length) return '';
    return `
        <div class="today-block">
            <div class="today-block-label">Don't forget</div>
            ${unvisited.map(it => `
                <div class="today-suggestion">
                    <span>${esc(it.name)}</span>
                </div>
            `).join('')}
        </div>`;
}

// T1.6 helper: format a Date as local "YYYY-MM-DD" without UTC conversion.
function localDateISO(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function renderTodayHero(ctx) {
    const tripName = ctx.trip?.name || 'Japan 2026';
    if (ctx.phase === 'pre') {
        const previewDay = ctx.nextDay;
        return `
            <div class="today-hero hero-pre">
                <div class="today-hero-eyebrow">${ctx.daysUntil > 0 ? `${ctx.daysUntil} days to ${esc(tripName)}` : 'Trip starts today'}</div>
                <div class="today-hero-title">🌸 Almost there</div>
                ${previewDay ? `
                    <button class="today-card-preview" onclick="switchView('itinerary'); setTimeout(()=>jumpToDay('${previewDay.id}'),100)">
                        <div class="today-card-preview-eyebrow">Preview · Day 1</div>
                        <div class="today-card-preview-title">${esc(previewDay.title || 'Day 1')}</div>
                        <div class="today-card-preview-meta">${previewDay.items.length} planned activities</div>
                    </button>
                ` : ''}
            </div>`;
    }
    if (ctx.phase === 'imminent') {
        return `
            <div class="today-hero hero-imminent">
                <div class="today-hero-eyebrow">${ctx.daysUntil <= 1 ? 'Tomorrow you fly to Japan' : `${ctx.daysUntil} days to ${esc(tripName)}`}</div>
                <div class="today-hero-title">✈ Get ready</div>
                ${ctx.nextDay ? `
                    <button class="today-card-preview" onclick="switchView('itinerary'); setTimeout(()=>jumpToDay('${ctx.nextDay.id}'),100)">
                        <div class="today-card-preview-eyebrow">Day 1 plan</div>
                        <div class="today-card-preview-title">${esc(ctx.nextDay.title || 'Day 1')}</div>
                        <div class="today-card-preview-meta">${ctx.nextDay.items.length} activities</div>
                    </button>
                ` : ''}
                <button class="today-action-row" onclick="switchView('packing')">
                    <span class="today-action-row-icon">🎒</span>
                    <span>Open packing list</span>
                    <span class="today-action-row-arrow">→</span>
                </button>
            </div>`;
    }
    if (ctx.phase === 'active' || ctx.phase === 'wind-down') {
        return `
            <div class="today-hero hero-active">
                <div class="today-hero-eyebrow">Day ${ctx.tripDayIdx + 1} of ${ctx.tripLen}<span id="hero-weather-chip" class="hero-weather-slot"></span></div>
                <div class="today-hero-title">${esc(ctx.currentDay?.title || 'Today')}</div>

                ${ctx.nowItem ? `
                    <div class="today-block">
                        <div class="today-block-label">Happening now</div>
                        ${renderActivityRow(ctx.nowItem, { showNav: true, featured: true })}
                    </div>
                ` : ''}

                ${ctx.upcomingItems.length ? `
                    <div class="today-block">
                        <div class="today-block-label">${ctx.nowItem ? 'Up next' : 'Today'}</div>
                        ${ctx.upcomingItems.map(it => renderActivityRow(it, { showNav: false })).join('')}
                    </div>
                ` : ''}

                ${!ctx.nowItem && !ctx.upcomingItems.length ? `
                    <div class="today-block today-block-empty">
                        <div>No more activities scheduled today.</div>
                    </div>
                ` : ''}

                ${renderSmartSuggestions(ctx)}

                ${renderHotelMini()}

                <button class="today-action-row" onclick="switchView('itinerary'); setTimeout(()=>jumpToDay('${ctx.currentDay?.id || ''}'),100)">
                    <span class="today-action-row-icon">📅</span>
                    <span>Open today's full plan</span>
                    <span class="today-action-row-arrow">→</span>
                </button>
            </div>`;
    }
    if (ctx.phase === 'post') {
        const total = state.itinerary.reduce((s, d) => s + d.items.length, 0);
        const visited = state.itinerary.reduce((s, d) => s + d.items.filter(i => i.visited).length, 0);
        const cities = new Set(state.places.map(p => p.city)).size;
        return `
            <div class="today-hero hero-post">
                <div class="today-hero-eyebrow">Welcome home</div>
                <div class="today-hero-title">🌸 Trip complete</div>
                <div class="today-recap-stats">
                    <div><strong>${ctx.tripLen}</strong><span>days</span></div>
                    <div><strong>${visited}</strong><span>of ${total} done</span></div>
                    <div><strong>${cities}</strong><span>cities</span></div>
                </div>
                <button class="today-action-row" onclick="openTemplatesGallery('')">
                    <span class="today-action-row-icon">🌸</span>
                    <span>Plan your next trip</span>
                    <span class="today-action-row-arrow">→</span>
                </button>
            </div>`;
    }
    return '';
}

export function renderDashboard() {
    const el = document.getElementById('dashboard-content');
    if (!el) return;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msPerDay = 86400000;

    // Countdown or "during trip" state
    const daysUntil = Math.ceil((TRIP_START - today) / msPerDay);
    const tripDay = Math.floor((today - TRIP_START) / msPerDay) + 1;
    const isDuring = today >= TRIP_START && today <= TRIP_END;
    const isPast = today > TRIP_END;

    let heroExtra = '';
    if (isDuring) {
        heroExtra = `<button class="dash-during" onclick="goToToday()">📍 Go to Today — Day ${tripDay}</button>`;
    } else if (isPast) {
        heroExtra = `<div style="color:var(--text-2);font-size:.9rem;margin-top:.5rem">Trip complete! Hope it was amazing 🎌</div>`;
    } else {
        const days = Math.max(0, daysUntil);
        const weeks = Math.floor(days / 7);
        const remDays = days % 7;
        heroExtra = `
            <div class="dash-countdown">
                <div class="dash-cd-unit"><span class="dash-cd-num">${weeks}</span><span class="dash-cd-label">weeks</span></div>
                <div class="dash-cd-unit"><span class="dash-cd-num">${remDays}</span><span class="dash-cd-label">days</span></div>
            </div>`;
    }

    // Stats
    const totalPlaces = state.places.length;
    const totalActivities = state.itinerary.reduce((s, d) => s + d.items.length, 0);
    const visitedCount = state.itinerary.reduce((s, d) => s + d.items.filter(i => i.visited).length, 0);
    const packedCount = state.packing.filter(p => p.packed).length;
    const packedTotal = state.packing.length;
    const packedPct = packedTotal ? Math.round(packedCount / packedTotal * 100) : 0;
    const unaddedCount = getUnaddedPlaces().length;
    const reservedCount = state.places.filter(p => p.reserved).length;
    const citySet = new Set(state.places.map(p => p.city));

    // Mini calendar
    const calHtml = state.itinerary.map((day, idx) => {
        const city = getDayCity(day);
        const cityClass = city.toLowerCase();
        const {date, subtitle} = parseDayTitle(day.title);
        const isToday = isDuring && (idx + 1) === tripDay;
        return `
            <div class="dash-cal-day ${isToday?'today':''}" onclick="switchView('itinerary'); setTimeout(()=>jumpToDay('${day.id}'),100)">
                <div class="dash-cal-num ${cityClass}">${idx+1}</div>
                <div class="dash-cal-label">${esc(date.replace(/^May |^Jun /,''))}${subtitle ? ' · '+esc(subtitle) : ''}</div>
                <span class="dash-cal-count">${day.items.length}</span>
            </div>`;
    }).join('');

    // Empty-state onboarding — only when the trip has no activities scheduled yet.
    const emptyStateHtml = (totalActivities === 0) ? `
        <div class="empty-state-card">
            <h3>Start from a template?</h3>
            <p>Your trip has no scheduled activities yet. Browse starter templates to kickstart your itinerary, or build from scratch.</p>
            <button class="btn btn-accent" onclick="openTemplatesGallery()">🧩 Browse Trip Templates</button>
        </div>` : '';

    // Phase 1.9: contextual rhythm hero up top, then the existing stats below
    const ctx = getTripContext();
    const todayHeroHtml = renderTodayHero(ctx);

    // Phase 4.6: async weather decoration after render
    if (ctx.currentDay) {
        const city = getDayCity(ctx.currentDay) || 'Tokyo';
        // T1.6: Build a LOCAL date string (not toISOString → UTC) so users west
        // of UTC don't see yesterday's forecast. Forecast data is keyed to
        // Asia/Tokyo timezone server-side; here we just need the user's local
        // calendar day, not UTC.
        const dateISO = localDateISO(ctx.today);
        getWeatherForDay(city, dateISO).then(w => {
            if (w) {
                const el2 = document.getElementById('hero-weather-chip');
                if (el2) el2.innerHTML = ' · ' + weatherChipHtml(w);
            }
        });
    }
    // Pre-warm cache for upcoming trip cities
    prewarmWeather([...new Set(state.itinerary.map(getDayCity).filter(Boolean))]);

    el.innerHTML = `
        ${todayHeroHtml}

        <div class="dash-hero dash-hero-mini">
            <div class="dash-title">Japan 2026</div>
            <div class="dash-subtitle">May 16 – Jun 2 · ${state.itinerary.length} days · ${citySet.size} cities</div>
            ${heroExtra}
        </div>

        ${emptyStateHtml}

        <div class="dash-grid">
            <div class="dash-stat" onclick="switchView('places')">
                <span class="dash-stat-icon">📍</span>
                <div class="dash-stat-info">
                    <div class="dash-stat-num">${totalPlaces}</div>
                    <div class="dash-stat-label">Places saved</div>
                </div>
            </div>
            <div class="dash-stat" onclick="switchView('itinerary')">
                <span class="dash-stat-icon">📅</span>
                <div class="dash-stat-info">
                    <div class="dash-stat-num">${totalActivities}</div>
                    <div class="dash-stat-label">Scheduled activities</div>
                </div>
            </div>
            <div class="dash-stat" onclick="switchView('itinerary')">
                <span class="dash-stat-icon">✅</span>
                <div class="dash-stat-info">
                    <div class="dash-stat-num">${visitedCount} / ${totalActivities}</div>
                    <div class="dash-stat-label">Completed</div>
                </div>
            </div>
            <div class="dash-stat" onclick="switchView('packing')">
                <span class="dash-stat-icon">🎒</span>
                <div class="dash-stat-info">
                    <div class="dash-stat-num">${packedPct}%</div>
                    <div class="dash-stat-label">${packedCount}/${packedTotal} packed</div>
                </div>
            </div>
            <div class="dash-stat" onclick="switchView('itinerary')">
                <span class="dash-stat-icon">📌</span>
                <div class="dash-stat-info">
                    <div class="dash-stat-num">${unaddedCount}</div>
                    <div class="dash-stat-label">Unadded places</div>
                </div>
            </div>
            <div class="dash-stat">
                <span class="dash-stat-icon">🎫</span>
                <div class="dash-stat-info">
                    <div class="dash-stat-num">${reservedCount}</div>
                    <div class="dash-stat-label">Reservations made</div>
                </div>
            </div>
        </div>

        <div class="dash-section">
            <div class="dash-section-title">🗓️ Trip Calendar</div>
            <div class="dash-calendar">${calHtml}</div>
        </div>

        <div class="dash-section">
            <div class="dash-section-title">⚡ Quick Access</div>
            <div class="dash-quick-links">
                <div class="dash-link" onclick="switchView('itinerary')">📅 Itinerary</div>
                <div class="dash-link" onclick="switchView('places')">📍 All Places</div>
                <div class="dash-link" onclick="switchView('map')">🗺️ Map View</div>
                <div class="dash-link" onclick="switchView('packing')">🎒 Packing List</div>
                <div class="dash-link" onclick="openTemplatesGallery()">🧩 Browse Trip Templates</div>
                <div class="dash-link" onclick="toggleSidebar()">📥 Export / Import</div>
                <div class="dash-link" onclick="switchView('itinerary')">📌 ${unaddedCount} Unadded Places</div>
            </div>
        </div>
    `;
}

export function goToToday() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tripDay = Math.floor((today - TRIP_START) / 86400000);
    if (tripDay >= 0 && tripDay < state.itinerary.length) {
        window.switchView('itinerary');
        setTimeout(() => window.jumpToDay(state.itinerary[tripDay].id), 100);
    }
}
