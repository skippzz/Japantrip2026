// ── Sheet: bottom-sheet + drawer primitive ──
// Mobile-native modal pattern. Used by trip drawer, app drawer, place detail,
// templates apply, packing add, etc. Replaces full-screen <div class="modal">
// patterns on phones; on desktop falls back to centred modal styling via CSS.
//
// Usage:
//   import { openSheet, closeSheet } from './sheet.js';
//   openSheet({ id: 'trip-drawer', side: 'left', html: '...', onClose: () => {} });
//
// API
//   openSheet({ id, side, html, onClose, dismissible, snap })
//     id           required string identifier (one sheet per id at a time)
//     side         'bottom' | 'left' | 'right'  (default 'bottom')
//     html         markup for the body (you supply your own header/buttons)
//     onClose      callback when dismissed
//     dismissible  boolean, allow backdrop tap + swipe to dismiss (default true)
//     snap         only for side='bottom': array of vh percentages, e.g. [0.5, 0.95]
//
//   closeSheet(id)            close a specific sheet
//   closeAllSheets()          close any open sheet
//   isSheetOpen(id?)          check whether a sheet (or any sheet) is open

const SHEETS = new Map();        // id -> { el, backdrop, onClose, side }
let activeStackTop = null;       // id of topmost open sheet

const ROOT = () => document.body;

function buildSheetEl(id, side, html, snap) {
    const el = document.createElement('div');
    el.className = `sheet sheet-${side}`;
    el.dataset.sheetId = id;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    if (side === 'bottom') {
        // Drag handle for bottom sheets
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
function attachBottomDrag(el, id) {
    let startY = 0, currentY = 0, dragging = false, startTime = 0;
    const body = el.querySelector('.sheet-body');
    const handle = el.querySelector('.sheet-handle');
    // Only the handle area triggers drag, not the whole body (avoids interfering
    // with scrollable content inside the sheet).
    const dragSrc = handle || el;

    const onPointerDown = (e) => {
        dragging = true;
        startY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
        currentY = startY;
        startTime = Date.now();
        el.style.transition = 'none';
        dragSrc.setPointerCapture?.(e.pointerId);
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
        // Dismiss if dragged > 25% of sheet height OR fast flick
        const threshold = el.getBoundingClientRect().height * 0.25;
        if (dy > threshold || velocity > 0.5) {
            closeSheet(id);
        } else {
            el.style.transform = '';
        }
    };
    dragSrc.addEventListener('pointerdown', onPointerDown);
    dragSrc.addEventListener('pointermove', onPointerMove);
    dragSrc.addEventListener('pointerup', onPointerUp);
    dragSrc.addEventListener('pointercancel', onPointerUp);
}

export function openSheet({ id, side = 'bottom', html = '', onClose, dismissible = true, snap }) {
    if (!id) throw new Error('openSheet requires an id');
    // If this id is already open, just replace its body
    const existing = SHEETS.get(id);
    if (existing) {
        const body = existing.el.querySelector('.sheet-body');
        if (body) body.innerHTML = html;
        return existing.el;
    }

    const el = buildSheetEl(id, side, html, snap);
    const backdrop = dismissible ? buildBackdrop(id) : null;

    if (backdrop) {
        backdrop.addEventListener('click', () => closeSheet(id));
        ROOT().appendChild(backdrop);
    }
    ROOT().appendChild(el);
    // Force reflow so CSS transition kicks in
    void el.offsetWidth;
    el.classList.add('is-open');
    if (backdrop) backdrop.classList.add('is-open');

    SHEETS.set(id, { el, backdrop, onClose, side, dismissible });
    activeStackTop = id;

    if (side === 'bottom' && dismissible) attachBottomDrag(el, id);

    // Lock body scroll while a sheet is open (only when first sheet opens)
    if (SHEETS.size === 1) ROOT().classList.add('sheet-open');

    // ESC dismisses topmost sheet
    if (dismissible) document.addEventListener('keydown', escListener);

    return el;
}

function escListener(e) {
    if (e.key === 'Escape' && activeStackTop) closeSheet(activeStackTop);
}

export function closeSheet(id) {
    const sheet = SHEETS.get(id);
    if (!sheet) return;
    const { el, backdrop, onClose } = sheet;
    el.classList.remove('is-open');
    if (backdrop) backdrop.classList.remove('is-open');
    SHEETS.delete(id);

    // Update active top
    activeStackTop = SHEETS.size ? [...SHEETS.keys()].pop() : null;
    if (SHEETS.size === 0) {
        ROOT().classList.remove('sheet-open');
        document.removeEventListener('keydown', escListener);
    }

    // Wait for transition then remove from DOM
    setTimeout(() => {
        el.remove();
        backdrop?.remove();
        onClose?.();
    }, 320);
}

export function closeAllSheets() {
    [...SHEETS.keys()].forEach(closeSheet);
}

export function isSheetOpen(id) {
    return id ? SHEETS.has(id) : SHEETS.size > 0;
}

// Expose a tiny API on window for inline-onclick usage in injected HTML.
if (typeof window !== 'undefined') {
    window.openSheet = openSheet;
    window.closeSheet = closeSheet;
    window.closeAllSheets = closeAllSheets;
}
