// ── Dashboard: Hero stats, calendar, quick links ──

import { esc, getDayCity, parseDayTitle } from './helpers.js';
import { state } from './state.js';
import { TRIP_START, TRIP_END } from './data.js';
import { getUnaddedPlaces } from './pool.js';

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

    el.innerHTML = `
        <div class="dash-hero">
            <div class="dash-title">Japan 2026</div>
            <div class="dash-subtitle">May 16 – Jun 2 · ${state.itinerary.length} days · ${citySet.size} cities</div>
            ${heroExtra}
        </div>

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
