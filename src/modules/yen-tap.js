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

// T2.20: pop closer listener attached only once even if ensurePop is called
// many times.
let popCloserAttached = false;
function ensurePop() {
    if (pop) return pop;
    pop = document.createElement('div');
    pop.id = POP_ID;
    pop.className = 'yen-popover';
    pop.style.cssText = 'display:none;position:absolute;z-index:200;';
    document.body.appendChild(pop);
    if (!popCloserAttached) {
        popCloserAttached = true;
        document.addEventListener('click', (e) => {
            if (!pop.contains(e.target) && !e.target.closest('[data-yen-clickable]')) {
                pop.style.display = 'none';
            }
        });
    }
    return pop;
}

// T3.49: Parse a yen amount from various formats:
//   ¥1,500 / ￥1500 / 1500円 / JPY 1500 / 1,500 yen / ¥1.5K / ~¥1,000–1,500
// For ranges, returns the first number (lower bound).
function parseYen(text) {
    if (!text) return null;
    // K shorthand first (¥1.5K, 2K yen)
    const kMatch = text.match(/[¥￥]\s*([\d.]+)\s*[kK]\b|([\d.]+)\s*[kK]\s*(?:yen|円)/);
    if (kMatch) {
        const raw = (kMatch[1] || kMatch[2] || '');
        const n = parseFloat(raw);
        if (isFinite(n)) return Math.round(n * 1000);
    }
    // Standard ¥/￥/円/JPY/yen patterns
    const m = text.match(/[¥￥]\s*([\d,]+)|([\d,]+)\s*円|JPY\s*([\d,]+)|([\d,]+)\s*yen\b/i);
    if (!m) return null;
    const raw = (m[1] || m[2] || m[3] || m[4] || '').replace(/,/g, '');
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
    // Measure rendered popover for accurate clamp (T3.popover)
    const pw = p.offsetWidth || 200;
    const ph = p.offsetHeight || 80;
    let px = r.left + window.scrollX;
    let py = r.bottom + window.scrollY + 6;
    // Clamp horizontally with margin and don't overflow narrow phones
    px = Math.max(8 + window.scrollX, Math.min(window.scrollX + window.innerWidth - pw - 8, px));
    // If popover would overflow viewport bottom, place above the target instead
    const viewBottom = window.scrollY + window.innerHeight;
    if (py + ph > viewBottom - 8) py = Math.max(window.scrollY + 8, r.top + window.scrollY - ph - 6);
    p.style.top = py + 'px';
    p.style.left = px + 'px';
}

// T2.20: idempotent — second call is a no-op so we don't accumulate document
// click listeners on hot reload / accidental re-import.
let yenTapInitialised = false;
export function initYenTap() {
    if (yenTapInitialised) return;
    yenTapInitialised = true;
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
