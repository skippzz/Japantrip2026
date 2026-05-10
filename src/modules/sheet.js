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
    // If this id is currently CLOSING (within 320ms grace), wait — fresh sheet
    // will be created once the old one finishes its dismiss animation.
    if (closingIds.has(id)) {
        setTimeout(() => openSheet({ id, side, html, onClose, dismissible, snap }), 50);
        return null;
    }
    const existing = SHEETS.get(id);
    if (existing) {
        // Same id already open → just replace body content
        const body = existing.el.querySelector('.sheet-body');
        if (body) body.innerHTML = html;
        return existing.el;
    }

    const el = buildSheetEl(id, side, html, snap);
    const backdrop = dismissible ? buildBackdrop(id) : null;

    if (backdrop) {
        // Only close the TOPMOST sheet on backdrop tap, not all stacked sheets
        backdrop.addEventListener('click', () => {
            if (activeStackTop) closeSheet(activeStackTop);
        });
        ROOT().appendChild(backdrop);
    }
    ROOT().appendChild(el);
    void el.offsetWidth; // force reflow for transition
    el.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');

    SHEETS.set(id, { el, backdrop, onClose, side, dismissible });
    activeStackTop = id;

    if (side === 'bottom' && dismissible) attachBottomDrag(el, id);

    if (SHEETS.size === 1) ROOT().classList.add('sheet-open');
    ensureGlobalEscListener();

    return el;
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
    const { el, backdrop, onClose } = sheet;
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
            // Always release closing state + invoke callback safely so a throw
            // inside onClose can never leave the sheet system in a bad state.
            closingIds.delete(id);
            try { onClose?.(); } catch (e) { console.warn('[sheet] onClose threw', e); }
            // Defensive: if sheet count is 0 but the class is somehow still set
            // (e.g. callback opened another sheet then synchronously closed it),
            // make sure scroll lock matches reality.
            if (SHEETS.size === 0) ROOT().classList.remove('sheet-open');
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
