// ── Yen tap-to-convert ──
// Phase 4.1. Detects ¥ amounts in any text content and lets users tap to see
// the conversion to local currency. Uses the existing rate from the currency
// widget (or default 0.22 TRY/¥).

const POP_ID = 'yen-popover';
let pop = null;

function getRate() {
    const r = parseFloat(document.getElementById('s-currency-rate')?.value
        ?? document.getElementById('currency-rate')?.value
        ?? localStorage.getItem('jp_currency_rate')
        ?? '0.22');
    return isFinite(r) && r > 0 ? r : 0.22;
}

function getCode() {
    return document.getElementById('s-currency-code')?.textContent
        || document.getElementById('currency-code')?.textContent
        || 'TRY';
}

function ensurePop() {
    if (pop) return pop;
    pop = document.createElement('div');
    pop.id = POP_ID;
    pop.className = 'yen-popover';
    pop.style.cssText = 'display:none;position:absolute;z-index:200;';
    document.body.appendChild(pop);
    document.addEventListener('click', (e) => {
        if (!pop.contains(e.target) && !e.target.closest('[data-yen-clickable]')) {
            pop.style.display = 'none';
        }
    });
    return pop;
}

// Parse a yen amount from a string like "¥1,500" → 1500.
function parseYen(text) {
    if (!text) return null;
    // Match ¥ or 円, with comma-separated digits
    const m = text.match(/[¥￥]\s*([\d,]+)|([\d,]+)\s*円|JPY\s*([\d,]+)/);
    if (!m) return null;
    const raw = (m[1] || m[2] || m[3] || '').replace(/,/g, '');
    const n = parseInt(raw, 10);
    return isFinite(n) ? n : null;
}

function showPopAt(target, yenAmount) {
    const p = ensurePop();
    const rate = getRate();
    const code = getCode();
    const local = (yenAmount * rate).toFixed(2);
    p.innerHTML = `
        <div class="yen-pop-amt">¥${yenAmount.toLocaleString()}</div>
        <div class="yen-pop-conv">≈ ${local} ${code}</div>
        <div class="yen-pop-rate">@ ${rate} ${code}/¥ · tap edit to change</div>
    `;
    p.style.display = 'block';
    const r = target.getBoundingClientRect();
    const py = r.bottom + window.scrollY + 6;
    const px = Math.max(8, Math.min(window.innerWidth - 200, r.left + window.scrollX));
    p.style.top = py + 'px';
    p.style.left = px + 'px';
}

// Initialise: scans ALL .yen-tappable areas and any element with [data-yen]
// attribute. Uses event delegation so dynamic content works automatically.
export function initYenTap() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-yen]');
        if (!target) return;
        const explicit = target.dataset.yen;
        const yen = parseYen(explicit) ?? parseYen(target.textContent);
        if (yen != null) {
            e.stopPropagation();
            showPopAt(target, yen);
        }
    });
}

// Helper: tag a text-containing element so it becomes tappable + auto-styled.
// Useful for wrapping ¥ amounts at render time.
export function tagYen(text) {
    const yen = parseYen(text);
    if (yen == null) return text;
    return `<span class="yen-clickable" data-yen-clickable data-yen="${text}">${text}</span>`;
}

if (typeof window !== 'undefined') {
    window.tagYen = tagYen;
    window.initYenTap = initYenTap;
}
