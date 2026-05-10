// ── Gesture primitives: long-press + swipe-to-action ──
// Replaces the global edit-mode toggle. Mobile-native interaction patterns.
//
// Long-press: hold for 500ms → fires callback. Cancels on movement or quick lift.
// Right-click on desktop also fires (so power-users don't have to wait 500ms).
//
// Swipe: horizontal swipe past threshold → reveal action drawer on the row.
// Persists open until tap-anywhere-else or animated close after action.

// ============================================================
// LONG-PRESS
// ============================================================
// Usage: attachLongPress(el, callback, { delay, moveTolerance })
//   callback receives ({ event, target }) on activation
const LP_DELAY = 500;
const LP_MOVE_TOL = 10;

export function attachLongPress(el, callback, opts = {}) {
    const delay = opts.delay ?? LP_DELAY;
    const moveTol = opts.moveTolerance ?? LP_MOVE_TOL;
    let timer = null, startX = 0, startY = 0, fired = false;

    const cleanup = () => {
        if (timer) { clearTimeout(timer); timer = null; }
    };

    const onDown = (e) => {
        // Ignore right-click on desktop here — handled separately by contextmenu
        if (e.button === 2) return;
        startX = e.clientX ?? 0;
        startY = e.clientY ?? 0;
        fired = false;
        cleanup();
        timer = setTimeout(() => {
            timer = null;
            fired = true;
            // Light haptic on supporting devices
            if (navigator.vibrate) navigator.vibrate(15);
            callback({ event: e, target: el });
        }, delay);
    };
    const onMove = (e) => {
        if (!timer) return;
        const dx = Math.abs((e.clientX ?? 0) - startX);
        const dy = Math.abs((e.clientY ?? 0) - startY);
        if (dx > moveTol || dy > moveTol) cleanup();
    };
    const onUpOrLeave = () => cleanup();
    // Block the default context menu so long-press doesn't conflict
    const onContextMenu = (e) => {
        // On desktop: right-click also fires the long-press callback immediately
        e.preventDefault();
        if (!fired) callback({ event: e, target: el });
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUpOrLeave);
    el.addEventListener('pointercancel', onUpOrLeave);
    el.addEventListener('pointerleave', onUpOrLeave);
    el.addEventListener('contextmenu', onContextMenu);

    return () => {
        cleanup();
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUpOrLeave);
        el.removeEventListener('pointercancel', onUpOrLeave);
        el.removeEventListener('pointerleave', onUpOrLeave);
        el.removeEventListener('contextmenu', onContextMenu);
    };
}

// Delegated variant — attach to a container and supply a selector for matching rows.
export function attachLongPressDelegated(container, selector, callback, opts = {}) {
    const delay = opts.delay ?? LP_DELAY;
    const moveTol = opts.moveTolerance ?? LP_MOVE_TOL;
    let timer = null, startX = 0, startY = 0, target = null, fired = false;

    const cleanup = () => {
        if (timer) { clearTimeout(timer); timer = null; }
        target = null;
    };

    const onDown = (e) => {
        if (e.button === 2) return;
        const t = e.target.closest(selector);
        if (!t || !container.contains(t)) return;
        startX = e.clientX ?? 0;
        startY = e.clientY ?? 0;
        target = t;
        fired = false;
        cleanup();
        timer = setTimeout(() => {
            timer = null;
            fired = true;
            if (navigator.vibrate) navigator.vibrate(15);
            callback({ event: e, target: t });
        }, delay);
    };
    const onMove = (e) => {
        if (!timer) return;
        const dx = Math.abs((e.clientX ?? 0) - startX);
        const dy = Math.abs((e.clientY ?? 0) - startY);
        if (dx > moveTol || dy > moveTol) cleanup();
    };
    const onUpOrLeave = () => cleanup();
    const onContextMenu = (e) => {
        const t = e.target.closest(selector);
        if (!t || !container.contains(t)) return;
        e.preventDefault();
        if (!fired) callback({ event: e, target: t });
    };

    container.addEventListener('pointerdown', onDown);
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerup', onUpOrLeave);
    container.addEventListener('pointercancel', onUpOrLeave);
    container.addEventListener('pointerleave', onUpOrLeave);
    container.addEventListener('contextmenu', onContextMenu);
}

// ============================================================
// SWIPE-TO-ACTION
// ============================================================
// Usage: attachSwipe(rowEl, { onSwipeLeft, onSwipeRight, threshold })
//
// Reveals action drawer underneath. Caller is responsible for placing the
// action elements as siblings of the swipeable content using CSS like:
//
//   <div class="swipe-row">
//     <div class="swipe-actions-left">[edit][delete]</div>
//     <div class="swipe-content">item content</div>
//     <div class="swipe-actions-right">[mark]</div>
//   </div>

const SW_THRESHOLD = 60;
const SW_REVEAL = 80;

export function attachSwipe(rowEl, opts = {}) {
    const threshold = opts.threshold ?? SW_THRESHOLD;
    const revealAt = opts.reveal ?? SW_REVEAL;
    const content = rowEl.querySelector('.swipe-content');
    if (!content) return;

    let startX = 0, currentX = 0, dragging = false, startTime = 0;
    let openSide = null;  // 'left' | 'right' | null

    const reset = () => {
        content.style.transition = '';
        content.style.transform = '';
        rowEl.classList.remove('swipe-open-left', 'swipe-open-right');
        openSide = null;
    };

    const onDown = (e) => {
        // Ignore if interacting with a button/link inside the row
        if (e.target.closest('button, a, input')) return;
        startX = e.clientX ?? 0;
        currentX = startX;
        startTime = Date.now();
        dragging = true;
        content.style.transition = 'none';
    };
    const onMove = (e) => {
        if (!dragging) return;
        currentX = e.clientX ?? currentX;
        const dx = currentX - startX;
        // Only allow swipes in directions that have actions defined
        if (dx < 0 && !opts.onSwipeLeft) return;
        if (dx > 0 && !opts.onSwipeRight) return;
        content.style.transform = `translateX(${dx}px)`;
    };
    const onUp = () => {
        if (!dragging) return;
        dragging = false;
        const dx = currentX - startX;
        const elapsed = Date.now() - startTime;
        const velocity = Math.abs(dx) / Math.max(1, elapsed);
        content.style.transition = '';

        const fastFlick = velocity > 0.5;
        const farEnough = Math.abs(dx) > threshold;

        if (dx < 0 && opts.onSwipeLeft && (farEnough || fastFlick)) {
            // Either reveal-and-hold or trigger immediately
            if (opts.actionMode === 'reveal') {
                content.style.transform = `translateX(-${revealAt}px)`;
                rowEl.classList.add('swipe-open-left');
                openSide = 'left';
            } else {
                opts.onSwipeLeft({ row: rowEl });
                reset();
            }
        } else if (dx > 0 && opts.onSwipeRight && (farEnough || fastFlick)) {
            if (opts.actionMode === 'reveal') {
                content.style.transform = `translateX(${revealAt}px)`;
                rowEl.classList.add('swipe-open-right');
                openSide = 'right';
            } else {
                opts.onSwipeRight({ row: rowEl });
                reset();
            }
        } else {
            reset();
        }
    };

    rowEl.addEventListener('pointerdown', onDown);
    rowEl.addEventListener('pointermove', onMove);
    rowEl.addEventListener('pointerup', onUp);
    rowEl.addEventListener('pointercancel', onUp);

    // Tap anywhere else to dismiss reveal
    document.addEventListener('pointerdown', (e) => {
        if (openSide && !rowEl.contains(e.target)) reset();
    });

    return { reset };
}
