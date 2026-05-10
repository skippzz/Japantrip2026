// ── App drawer (right side) — Tile launcher for app-scoped utilities ──
// Phase 1.6. Each tool is opened as a focused bottom sheet (mobile-first
// "one thing at a time" UX) instead of a long sidebar list.

import { toggleTheme } from './theme.js';

// Helpers — open named bottom sheets for each tool. Uses window.openSheet which
// is registered by sheet.js, and global handler functions for inline onclicks
// (those already exist on window from app.js wiring).

function openCurrencySheet() {
    window.openSheet?.({
        id: 'tool-currency',
        side: 'bottom',
        html: `
            <div class="tool-sheet-header">
                <h2>💱 Currency</h2>
                <button class="icon-btn" onclick="closeSheet('tool-currency')" aria-label="Close">✕</button>
            </div>
            <div class="currency-widget">
                <div class="currency-row">
                    <input type="number" id="s-currency-yen" placeholder="¥ Amount" oninput="convertSheetCurrency('yen')">
                    <span class="currency-label">JPY</span>
                </div>
                <div class="currency-row">
                    <input type="number" id="s-currency-local" placeholder="Amount" oninput="convertSheetCurrency('local')">
                    <span class="currency-label" id="s-currency-code">TRY</span>
                </div>
                <div class="currency-rate">
                    Rate: <input type="number" id="s-currency-rate" value="0.22" step="0.01" style="width:60px" oninput="convertSheetCurrency('yen')">
                    <span id="s-currency-code2">TRY</span>/¥
                </div>
                <div class="currency-presets">
                    <button onclick="setSheetYen(500)">¥500</button>
                    <button onclick="setSheetYen(1000)">¥1K</button>
                    <button onclick="setSheetYen(5000)">¥5K</button>
                    <button onclick="setSheetYen(10000)">¥10K</button>
                </div>
            </div>
        `,
    });
    // Sync rate from main widget if it exists
    const mainRate = document.getElementById('currency-rate')?.value;
    const sheetRate = document.getElementById('s-currency-rate');
    if (mainRate && sheetRate) sheetRate.value = mainRate;
}

function openSplitSheet() {
    window.openSheet?.({
        id: 'tool-split',
        side: 'bottom',
        html: `
            <div class="tool-sheet-header">
                <h2>💴 Split Bill</h2>
                <button class="icon-btn" onclick="closeSheet('tool-split')" aria-label="Close">✕</button>
            </div>
            <div class="split-widget">
                <div class="currency-row">
                    <input type="number" id="s-split-amount" placeholder="¥ Total bill" min="0">
                    <span class="currency-label">JPY</span>
                </div>
                <div class="split-row">
                    <label class="split-label">People:</label>
                    <div class="split-people-ctrl">
                        <button class="btn-round" onclick="adjustSheetSplitCount(-1)">−</button>
                        <input type="number" id="s-split-count" value="8" min="1" max="50" style="width:40px;text-align:center">
                        <button class="btn-round" onclick="adjustSheetSplitCount(1)">+</button>
                    </div>
                </div>
                <!-- T3.33: sheet variant only supports 'even' mode for now;
                     percent / fixed live in the sidebar widget (use legacy ☰). -->
                <input type="hidden" id="s-split-mode" value="even">
                <div id="s-split-custom" style="display:none"></div>
                <div class="split-result" id="s-split-result"></div>
                <div class="split-actions">
                    <button class="btn btn-ghost btn-sm" onclick="copySheetSplitResult()">📋 Copy</button>
                    <button class="btn btn-ghost btn-sm" onclick="clearSheetSplit()">Clear</button>
                </div>
            </div>
        `,
    });
    // Wire the calc on amount change
    const amt = document.getElementById('s-split-amount');
    if (amt) amt.addEventListener('input', () => window.calcSheetSplit?.());
}

function openEmergencySheet() {
    window.openSheet?.({
        id: 'tool-emergency',
        side: 'bottom',
        html: `
            <div class="tool-sheet-header">
                <h2>🚨 Emergency</h2>
                <button class="icon-btn" onclick="closeSheet('tool-emergency')" aria-label="Close">✕</button>
            </div>
            <div class="emergency-grid emergency-grid-large">
                <a class="emg-item-tap" href="tel:110">
                    <span class="emg-num">110</span>
                    <span class="emg-label">Police</span>
                </a>
                <a class="emg-item-tap" href="tel:119">
                    <span class="emg-num">119</span>
                    <span class="emg-label">Ambulance / Fire</span>
                </a>
                <a class="emg-item-tap" href="tel:0332245000">
                    <span class="emg-num">03-3224-5000</span>
                    <span class="emg-label">Turkish Embassy Tokyo</span>
                </a>
            </div>
            <div class="emg-extra" style="padding: var(--space-3) var(--space-4); margin-top: var(--space-3); background: var(--bg-2); border-radius: var(--radius);">
                <div style="font-size:var(--font-sm);color:var(--text-2);line-height: 1.6">
                    <strong>Lost card:</strong> Call your bank immediately<br>
                    <strong>Lost passport:</strong> Contact embassy + file police report<br>
                    <strong>Free Wi-Fi:</strong> Look for "Japan Connected-free Wi-Fi" app
                </div>
            </div>
        `,
    });
}

function openPhrasesSheet() {
    window.closeSheet?.('app-drawer');
    window.switchView?.('guide');
}

function openDataSheet() {
    // Data has many actions; open the legacy sidebar to that section for now.
    window.closeSheet?.('app-drawer');
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebar-backdrop')?.classList.add('open');
    setTimeout(() => {
        const heads = document.querySelectorAll('.sidebar-section h3');
        heads.forEach(h => {
            if (h.textContent.includes('Data')) {
                h.parentElement.classList.remove('collapsed');
                h.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }, 50);
}

function openLinksSheet() {
    window.closeSheet?.('app-drawer');
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebar-backdrop')?.classList.add('open');
    setTimeout(() => {
        const heads = document.querySelectorAll('.sidebar-section h3');
        heads.forEach(h => {
            if (h.textContent.includes('Quick Links')) {
                h.parentElement.classList.remove('collapsed');
                h.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }, 50);
}

export function openAppDrawer() {
    const html = `
        <div class="drawer-header">
            <h2>App</h2>
            <button class="icon-btn" onclick="closeSheet('app-drawer')" aria-label="Close" title="Close">✕</button>
        </div>

        <div class="drawer-section">
            <div class="drawer-section-title">Tools</div>
            <div class="tool-tiles">
                <button class="tool-tile" onclick="closeSheet('app-drawer'); window._openCurrencySheet()">
                    <span class="tool-tile-icon">💱</span>
                    <span class="tool-tile-label">Currency</span>
                </button>
                <button class="tool-tile" onclick="closeSheet('app-drawer'); window._openSplitSheet()">
                    <span class="tool-tile-icon">💴</span>
                    <span class="tool-tile-label">Split bill</span>
                </button>
                <button class="tool-tile" onclick="closeSheet('app-drawer'); window._openEmergencySheet()">
                    <span class="tool-tile-icon">🚨</span>
                    <span class="tool-tile-label">Emergency</span>
                </button>
                <button class="tool-tile" onclick="closeSheet('app-drawer'); window._openPhrasesSheet()">
                    <span class="tool-tile-icon">📖</span>
                    <span class="tool-tile-label">Phrases</span>
                </button>
            </div>
        </div>

        <div class="drawer-section">
            <div class="drawer-section-title">Settings</div>
            <button class="trip-drawer-action" id="theme-drawer-row" onclick="window._toggleThemeFromDrawer()">
                <span class="trip-drawer-action-icon">${currentThemeIcon()}</span>
                <span>Theme · ${currentThemeLabel()}</span>
            </button>
            <button class="trip-drawer-action" onclick="window._openDataSheet()">
                <span class="trip-drawer-action-icon">💾</span>
                <span>Data &amp; backup</span>
            </button>
            <button class="trip-drawer-action" onclick="window._openLinksSheet()">
                <span class="trip-drawer-action-icon">🔗</span>
                <span>Quick links</span>
            </button>
            <div class="trip-drawer-action" style="cursor:default;color:var(--text-3);font-size:var(--font-xs)">
                <span class="trip-drawer-action-icon">ℹ</span>
                <span>v1 — Japan 2026</span>
            </div>
        </div>
    `;
    window.openSheet?.({ id: 'app-drawer', side: 'right', html });
}

// ── Tool-sheet handlers (sheet versions of currency/split that don't collide with sidebar IDs) ──

function convertSheetCurrency(from) {
    const yenIn = document.getElementById('s-currency-yen');
    const localIn = document.getElementById('s-currency-local');
    const rateInput = document.getElementById('s-currency-rate');
    const rate = parseFloat(rateInput?.value) || 0.22;
    // T3.31: persist + sync to sidebar widget so the two stay in lockstep.
    try { localStorage.setItem('jp_currency_rate', String(rate)); } catch { /* ok */ }
    const sidebarRate = document.getElementById('currency-rate');
    if (sidebarRate && sidebarRate.value !== String(rate)) sidebarRate.value = rate;
    if (from === 'yen') {
        const v = parseFloat(yenIn.value);
        if (isFinite(v)) localIn.value = (v * rate).toFixed(2);
        else localIn.value = '';
    } else {
        const v = parseFloat(localIn.value);
        if (isFinite(v) && rate) yenIn.value = (v / rate).toFixed(0);
        else yenIn.value = '';
    }
}
function setSheetYen(amt) {
    const yenIn = document.getElementById('s-currency-yen');
    if (yenIn) { yenIn.value = amt; convertSheetCurrency('yen'); }
}
function adjustSheetSplitCount(delta) {
    const c = document.getElementById('s-split-count');
    if (!c) return;
    c.value = Math.max(1, Math.min(50, (parseInt(c.value, 10) || 1) + delta));
    calcSheetSplit();
}
function calcSheetSplit() {
    const amt = parseFloat(document.getElementById('s-split-amount')?.value) || 0;
    const cnt = parseInt(document.getElementById('s-split-count')?.value, 10) || 1;
    const mode = document.getElementById('s-split-mode')?.value || 'even';
    const result = document.getElementById('s-split-result');
    if (!result) return;
    if (!amt || !cnt) { result.textContent = ''; return; }
    if (mode === 'even') {
        const each = Math.round(amt / cnt);
        result.innerHTML = `Each pays <strong>¥${each.toLocaleString()}</strong>`;
    } else {
        result.innerHTML = `Mode ${mode} — set in main split widget for now.`;
    }
}
function copySheetSplitResult() {
    const txt = document.getElementById('s-split-result')?.textContent || '';
    if (!txt) return;
    navigator.clipboard?.writeText(txt);
    window.showToast?.('Copied!', 'success');
}
function clearSheetSplit() {
    const a = document.getElementById('s-split-amount');
    if (a) a.value = '';
    const r = document.getElementById('s-split-result');
    if (r) r.innerHTML = '';
}
function toggleThemeFromDrawer() {
    toggleTheme();
    // T2.19: refresh the theme row's icon + label so the drawer reflects the
    // new theme without re-opening.
    const row = document.getElementById('theme-drawer-row');
    if (row) {
        row.innerHTML = `
            <span class="trip-drawer-action-icon">${currentThemeIcon()}</span>
            <span>Theme · ${currentThemeLabel()}</span>
        `;
    }
}

// T2.19: helpers used by the drawer renderer to reflect current theme.
function currentThemeIcon() {
    const t = document.documentElement.getAttribute('data-theme') || 'dark';
    return t === 'light' ? '☀️' : '🌙';
}
function currentThemeLabel() {
    const t = document.documentElement.getAttribute('data-theme') || 'dark';
    return t === 'light' ? 'Light' : 'Dark';
}

// Expose tool-opener fns + handlers to window so inline onclicks work
if (typeof window !== 'undefined') {
    window._openCurrencySheet = openCurrencySheet;
    window._openSplitSheet = openSplitSheet;
    window._openEmergencySheet = openEmergencySheet;
    window._openPhrasesSheet = openPhrasesSheet;
    window._openDataSheet = openDataSheet;
    window._openLinksSheet = openLinksSheet;
    window._toggleThemeFromDrawer = toggleThemeFromDrawer;
    window.convertSheetCurrency = convertSheetCurrency;
    window.setSheetYen = setSheetYen;
    window.adjustSheetSplitCount = adjustSheetSplitCount;
    window.calcSheetSplit = calcSheetSplit;
    window.copySheetSplitResult = copySheetSplitResult;
    window.clearSheetSplit = clearSheetSplit;
}
