// ── Currency Converter & Photos URL ──

import { PHOTOS_URL_KEY } from './config.js';
import { showToast } from './toast.js';

export function convertCurrency(from) {
    const rate = parseFloat(document.getElementById('currency-rate').value) || 0;
    if (from === 'yen') {
        const yen = parseFloat(document.getElementById('currency-yen').value) || 0;
        document.getElementById('currency-local').value = yen ? (yen * rate).toFixed(2) : '';
    } else {
        const local = parseFloat(document.getElementById('currency-local').value) || 0;
        document.getElementById('currency-yen').value = local && rate ? (local / rate).toFixed(0) : '';
    }
}

export function setYen(amount) {
    document.getElementById('currency-yen').value = amount;
    convertCurrency('yen');
}

export function loadPhotosUrl() {
    const saved = localStorage.getItem(PHOTOS_URL_KEY);
    const linkEl = document.getElementById('photos-link');
    const inputEl = document.getElementById('photos-url');
    if (linkEl && saved) linkEl.href = saved;
    if (inputEl && saved) inputEl.value = saved;
}

export function savePhotosUrl(url) {
    if (url) {
        localStorage.setItem(PHOTOS_URL_KEY, url);
        const linkEl = document.getElementById('photos-link');
        if (linkEl) linkEl.href = url;
        showToast('Photos URL saved!', 'success');
    }
}
