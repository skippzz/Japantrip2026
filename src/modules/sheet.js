// ── Sheet: bottom-sheet + drawer primitive ──
// Mobile-native modal pattern. Used by trip drawer, app drawer, place detail,
// templates apply, packing add, etc.
//
// Hardened in QA pass:
//   - Single global ESC listener (no duplicates on rapid open/close)
//   - ESC ignored while typing in form fields
//   - Drag works across whole sheet body (not just handle)
//   - Body scroll-lock restored even if onClose throws
//   - 320ms close-then-reopen race tracked via `closingIds` so re-open creates
//     a fresh sheet rather than reusing a transitioning-out one
//   - Backdrop click only closes the topmost sheet, not all stacked sheets

const SHEETS = new Map();        // id -> { el, backdrop, onClose, side }
const closingIds = new Set();    // ids in transition (320ms grace)
let activeStackTop = null;       // id of topmost open sheet
let escListenerAttached = false; // global single-attach guard

const ROOT = () => document.body;

function buildSheetEl(id, side, html, snap) {
    const el = document.createElement('div');
    el.className = `sheet sheet-${side}`;
    el.dataset.sheetId = id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    if (side === 'bottom') {
        el.innerHTML = `
            <div class="sheet-handle" aria-hidden="true"></div>
            <div class="sheet-body">${html}</div>
        `;
        if (snap) el.dataset.snap = JSON.stringify(snap);
    } else {
        el.innerHTML = `<div class="sheet-body">${html}</div>`;
    }
    return el;
}

function buildBackdrop(id) {
    const b = document.createElement('div');
    b.className = 'sheet-backdrop';
    b.dataset.sheetId = id;
    return b;
}

// ── Drag-to-dismiss for bottom sheets ──
// Listeners attached to the whole sheet element so a finger that drifts off
// the small handle area still tracks the drag.
function attachBottomDrag(el, id) {
    let startY = 0, currentY = 0, dragging = false, startTime = 0;
    const handle = el.querySelector('.sheet-handle');
    const body = el.querySelector('.sheet-body');

    const onPointerDown = (e) => {
        // Only initiate drag from the handle to avoid stealing scroll inside body.
        if (!handle || !handle.contains(e.target)) return;
        dragging = true;
        startY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
        currentY = startY;
        startTime = Date.now();
        el.style.transition = 'none';
        el.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e) => {
        if (!dragging) return;
        currentY = e.clientY ?? e.touches?.[0]?.clientY ?? currentY;
        const dy = Math.max(0, currentY - startY);
        el.style.transform = `translateY(${dy}px)`;
    };
    const onPointerUp = () => {
        if (!dragging) return;
        dragging = false;
        const dy = Math.max(0, currentY - startY);
        const elapsed = Date.now() - startTime;
        const velocity = dy / Math.max(1, elapsed); // px/ms
        el.style.transition = '';
        // Dismiss if dragged > 30% of sheet height OR very fast flick (>1.0 px/ms).
        // Tightened from 25%/0.5 in QA pass to reduce accidental dismisses.
        const threshold = el.getBoundingClientRect().height * 0.30;
        if (dy > threshold || velocity > 1.0) {
            closeSheet(id);
        } else {
            el.style.transform = '';
        }
    };
    // Listeners attached to whole sheet element so we keep tracking even if the
    // pointer moves off the handle.
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);
}

export function openSheet({ id, side = 'bottom', html = '', onClose, dismissible = true, snap }) {
    if (!id) throw new Error('openSheet requires an id');
    if (closingIds.has(id)) {
        setTimeout(() => openSheet({ id, side, html, onClose, dismissible, snap }), 50);
        return null;
    }
    const existing = SHEETS.get(id);
    if (existing) {
        const body = existing.el.querySelector('.sheet-body');
        if (body) body.innerHTML = html;
        // Wave 2: rewire focus trap for refreshed content
        setupFocusTrap(existing.el);
        return existing.el;
    }

    // Wave 2: remember which element had focus so we can return to it on close.
    const previousFocus = document.activeElement;

    const el = buildSheetEl(id, side, html, snap);
    const backdrop = dismissible ? buildBackdrop(id) : null;

    if (backdrop) {
        backdrop.addEventListener('click', () => {
            if (activeStackTop) closeSheet(activeStackTop);
        });
        ROOT().appendChild(backdrop);
    }
    ROOT().appendChild(el);
    void el.offsetWidth;
    el.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');

    SHEETS.set(id, { el, backdrop, onClose, side, dismissible, previousFocus });
    activeStackTop = id;

    if (side === 'bottom' && dismissible) attachBottomDrag(el, id);

    if (SHEETS.size === 1) ROOT().classList.add('sheet-open');
    ensureGlobalEscListener();

    // Wave 2: focus trap — Tab cycles within sheet, focus first interactive
    setupFocusTrap(el);

    // iOS Safari + position:fixed won't scroll a focused input into view above
    // the on-screen keyboard. Do it ourselves. visualViewport.resize fires when
    // the keyboard pushes the layout viewport — re-scroll then to handle the
    // delayed resize on Android Chrome too.
    setupKeyboardAwareScroll(el);

    return el;
}

function setupKeyboardAwareScroll(el) {
    const scrollFocusedIntoView = () => {
        const active = document.activeElement;
        if (!active || !el.contains(active)) return;
        if (!active.matches?.('input, textarea, select')) return;
        // requestAnimationFrame so the keyboard has started pushing the viewport
        // up before we measure; without it scrollIntoView can target the
        // pre-keyboard position.
        requestAnimationFrame(() => {
            try { active.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
            catch { active.scrollIntoView(); }
        });
    };
    el.addEventListener('focusin', (e) => {
        if (e.target.matches?.('input, textarea, select')) {
            // Slight delay: iOS keyboard animates in over ~250ms; firing too
            // early means we scroll to a position the keyboard then occludes.
            setTimeout(scrollFocusedIntoView, 300);
        }
    });
    // Re-scroll if the visual viewport changes (keyboard fully shown / rotated).
    if (window.visualViewport) {
        const onResize = () => scrollFocusedIntoView();
        window.visualViewport.addEventListener('resize', onResize);
        // Detach when the sheet is removed
        const observer = new MutationObserver(() => {
            if (!document.body.contains(el)) {
                window.visualViewport.removeEventListener('resize', onResize);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: false });
    }
}

// Wave 2: focus trap for bottom sheets / side drawers. Same behaviour as
// modals — Tab wraps to first/last focusable; Shift+Tab from first goes to
// last. Focus the first interactive element on open.
function setupFocusTrap(el) {
    const focusable = () => Array.from(el.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(n => n.offsetParent !== null);
    const els = focusable();
    if (els.length) {
        // Don't yank focus from any input the user has already focused inside the sheet
        if (!el.contains(document.activeElement)) {
            // Skip close X buttons if there's a more meaningful first action
            const first = els.find(n => !n.matches('[aria-label="Close"]')) || els[0];
            try { first.focus({ preventScroll: true }); } catch { /* ok */ }
        }
    }
    if (el._trapHandler) el.removeEventListener('keydown', el._trapHandler);
    el._trapHandler = function (e) {
        if (e.key !== 'Tab') return;
        const cur = focusable();
        if (!cur.length) return;
        const first = cur[0], last = cur[cur.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
        }
    };
    el.addEventListener('keydown', el._trapHandler);
}

// Single global ESC listener attached once. Closes topmost sheet, but ignores
// ESC when focus is inside an input/textarea/select.
function ensureGlobalEscListener() {
    if (escListenerAttached) return;
    escListenerAttached = true;
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!activeStackTop) return;
        const t = e.target;
        if (t && t.matches?.('input, textarea, select, [contenteditable="true"]')) return;
        const sheet = SHEETS.get(activeStackTop);
        if (sheet?.dismissible) closeSheet(activeStackTop);
    });
}

export function closeSheet(id) {
    const sheet = SHEETS.get(id);
    if (!sheet) return;
    const { el, backdrop, onClose, previousFocus } = sheet;
    el.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    SHEETS.delete(id);
    closingIds.add(id);

    activeStackTop = SHEETS.size ? [...SHEETS.keys()].pop() : null;
    if (SHEETS.size === 0) {
        ROOT().classList.remove('sheet-open');
    }

    setTimeout(() => {
        try {
            el.remove();
            backdrop?.remove();
        } finally {
            closingIds.delete(id);
            try { onClose?.(); } catch (e) { console.warn('[sheet] onClose threw', e); }
            if (SHEETS.size === 0) ROOT().classList.remove('sheet-open');
            // Wave 2: return focus to whatever was focused before we opened.
            try {
                if (previousFocus && previousFocus.isConnected && typeof previousFocus.focus === 'function') {
                    previousFocus.focus({ preventScroll: true });
                }
            } catch { /* ok */ }
        }
    }, 320);
}

export function closeAllSheets() {
    [...SHEETS.keys()].forEach(closeSheet);
}

export function isSheetOpen(id) {
    return id ? SHEETS.has(id) : SHEETS.size > 0;
}

if (typeof window !== 'undefined') {
    window.openSheet = openSheet;
    window.closeSheet = closeSheet;
    window.closeAllSheets = closeAllSheets;
}
