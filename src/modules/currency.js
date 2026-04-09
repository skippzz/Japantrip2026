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

// ══════════════════════════════════════════════════════════════
//  BILL SPLITTER
// ══════════════════════════════════════════════════════════════

export function adjustSplitCount(delta) {
    const el = document.getElementById('split-count');
    if (!el) return;
    const val = Math.max(1, Math.min(50, (parseInt(el.value) || 1) + delta));
    el.value = val;
    calcSplit();
}

export function calcSplit() {
    const amount = parseFloat(document.getElementById('split-amount')?.value) || 0;
    const count = parseInt(document.getElementById('split-count')?.value) || 1;
    const mode = document.getElementById('split-mode')?.value || 'even';
    const resultEl = document.getElementById('split-result');
    const customEl = document.getElementById('split-custom');
    const rate = parseFloat(document.getElementById('currency-rate')?.value) || 0;
    if (!resultEl) return;

    if (amount <= 0) {
        resultEl.innerHTML = '';
        if (customEl) customEl.style.display = 'none';
        return;
    }

    if (mode === 'even') {
        if (customEl) customEl.style.display = 'none';
        const perPerson = Math.ceil(amount / count);
        const localAmount = rate ? (perPerson * rate).toFixed(0) : '';
        resultEl.innerHTML = `
            <div class="split-per-person">¥${perPerson.toLocaleString()} <span>per person</span></div>
            ${localAmount ? `<div class="split-local">≈ ${localAmount} TRY each</div>` : ''}
            <div class="split-total">¥${amount.toLocaleString()} ÷ ${count} people</div>`;
    } else if (mode === 'percent') {
        if (customEl) {
            customEl.style.display = '';
            // Build percent inputs if not already there or count changed
            const existing = customEl.querySelectorAll('.split-pct-row');
            if (existing.length !== count) {
                const defaultPct = (100 / count).toFixed(1);
                customEl.innerHTML = Array.from({ length: count }, (_, i) =>
                    `<div class="split-pct-row">
                        <span class="split-pct-label">Person ${i + 1}</span>
                        <input type="number" class="split-pct-input" value="${defaultPct}" min="0" max="100" step="0.1" oninput="calcSplit()">
                        <span>%</span>
                    </div>`
                ).join('');
            }
        }
        // Calculate from percent inputs
        const inputs = customEl?.querySelectorAll('.split-pct-input') || [];
        const pcts = [...inputs].map(el => parseFloat(el.value) || 0);
        const totalPct = pcts.reduce((s, p) => s + p, 0);
        let lines = pcts.map((pct, i) => {
            const share = Math.round(amount * pct / 100);
            return `<div class="split-line">Person ${i + 1}: ¥${share.toLocaleString()} (${pct}%)</div>`;
        }).join('');
        if (Math.abs(totalPct - 100) > 0.5) {
            lines += `<div class="split-warn">⚠️ Total is ${totalPct.toFixed(1)}% — should be 100%</div>`;
        }
        resultEl.innerHTML = lines;
    } else if (mode === 'fixed') {
        if (customEl) {
            customEl.style.display = '';
            const existing = customEl.querySelectorAll('.split-pct-row');
            if (existing.length !== count) {
                const defaultAmt = Math.ceil(amount / count);
                customEl.innerHTML = Array.from({ length: count }, (_, i) =>
                    `<div class="split-pct-row">
                        <span class="split-pct-label">Person ${i + 1}</span>
                        <input type="number" class="split-pct-input" value="${defaultAmt}" min="0" oninput="calcSplit()">
                        <span>¥</span>
                    </div>`
                ).join('');
            }
        }
        const inputs = customEl?.querySelectorAll('.split-pct-input') || [];
        const amounts = [...inputs].map(el => parseFloat(el.value) || 0);
        const totalFixed = amounts.reduce((s, a) => s + a, 0);
        let lines = amounts.map((a, i) =>
            `<div class="split-line">Person ${i + 1}: ¥${a.toLocaleString()}</div>`
        ).join('');
        const diff = amount - totalFixed;
        if (Math.abs(diff) > 1) {
            lines += `<div class="split-warn">⚠️ ${diff > 0 ? '¥' + Math.abs(diff).toLocaleString() + ' remaining' : '¥' + Math.abs(diff).toLocaleString() + ' over'}</div>`;
        }
        resultEl.innerHTML = lines;
    }
}

export function copySplitResult() {
    const el = document.getElementById('split-result');
    if (!el || !el.textContent.trim()) { showToast('Nothing to copy.', 'warn'); return; }
    const amount = document.getElementById('split-amount')?.value || '0';
    const count = document.getElementById('split-count')?.value || '1';
    const text = `Bill: ¥${parseInt(amount).toLocaleString()} ÷ ${count} people\n${el.textContent.trim()}`;
    navigator.clipboard.writeText(text).then(() => showToast('Split copied!', 'success'));
}

export function clearSplit() {
    const amountEl = document.getElementById('split-amount');
    const resultEl = document.getElementById('split-result');
    const customEl = document.getElementById('split-custom');
    if (amountEl) amountEl.value = '';
    if (resultEl) resultEl.innerHTML = '';
    if (customEl) { customEl.innerHTML = ''; customEl.style.display = 'none'; }
}
