// ── Hotel Address Cards ──

import { HOTELS_KEY } from './config.js';
import { DEFAULT_HOTELS } from './data.js';
import { esc } from './helpers.js';
import { showToast } from './toast.js';

export function loadHotels() {
    const saved = localStorage.getItem(HOTELS_KEY);
    return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_HOTELS));
}

export function saveHotels(hotels) {
    localStorage.setItem(HOTELS_KEY, JSON.stringify(hotels));
}

export function renderHotelCards() {
    const container = document.getElementById('hotel-cards');
    if (!container) return;
    const hotels = loadHotels();
    container.innerHTML = hotels.map(h => `
        <div class="hotel-card" data-city="${h.city}">
            <div class="hotel-city">${esc(h.city)}</div>
            <div class="hotel-name-jp">${esc(h.nameJp)}</div>
            <div class="hotel-addr-jp">${esc(h.addrJp)}</div>
            <div class="hotel-name-en">${esc(h.nameEn)}</div>
            <div class="hotel-actions">
                <button class="btn btn-sm btn-ghost" onclick="copyHotel('${h.city}')">📋 Copy</button>
                <a class="btn btn-sm btn-navigate" href="${h.mapUrl}" target="_blank">📍 Map</a>
            </div>
        </div>`).join('');
}

export function copyHotel(city) {
    const hotels = loadHotels();
    const h = hotels.find(x => x.city === city);
    if (!h) return;
    const text = `${h.nameJp}\n${h.addrJp}\n${h.nameEn}`;
    navigator.clipboard.writeText(text).then(() => showToast('Hotel address copied!', 'success'));
}

export function openHotelEditor(openModalFn) {
    const hotels = loadHotels();
    const html = hotels.map((h, i) => `
        <div style="margin-bottom:1rem;padding:.75rem;background:var(--bg-2);border-radius:8px">
            <div style="font-weight:700;color:var(--accent);margin-bottom:.4rem">${h.city}</div>
            <div class="form-group"><label>Name (Japanese)</label><input type="text" value="${esc(h.nameJp)}" id="hed-jp-${i}"></div>
            <div class="form-group"><label>Address (Japanese)</label><input type="text" value="${esc(h.addrJp)}" id="hed-addr-${i}"></div>
            <div class="form-group"><label>Name (English)</label><input type="text" value="${esc(h.nameEn)}" id="hed-en-${i}"></div>
            <div class="form-group"><label>Google Maps URL</label><input type="text" value="${esc(h.mapUrl)}" id="hed-url-${i}"></div>
        </div>`).join('');

    document.getElementById('detail-content').innerHTML = `
        <h2>Edit Hotel Addresses</h2>
        ${html}
        <div class="form-actions">
            <button class="btn btn-ghost" onclick="closeModal('modal-detail')">Cancel</button>
            <button class="btn btn-accent" onclick="saveHotelEditor()">Save</button>
        </div>`;
    openModalFn('modal-detail');
}

export function saveHotelEditor(closeModalFn) {
    const hotels = loadHotels();
    hotels.forEach((h, i) => {
        h.nameJp = document.getElementById(`hed-jp-${i}`).value.trim();
        h.addrJp = document.getElementById(`hed-addr-${i}`).value.trim();
        h.nameEn = document.getElementById(`hed-en-${i}`).value.trim();
        h.mapUrl = document.getElementById(`hed-url-${i}`).value.trim();
    });
    saveHotels(hotels);
    renderHotelCards();
    closeModalFn('modal-detail');
    showToast('Hotel addresses saved!', 'success');
}
