// ── Reorder mode ──
// Phase 1.8. The single explicit modal-state we keep after killing edit mode.
// Entered via long-press on a day card; shows a sticky "Done" bar and forces
// drag handles visible. While active, day-card tap-to-expand is suppressed.

let active = false;
let topBar = null;

function buildTopBar() {
    const el = document.createElement('div');
    el.className = 'reorder-bar';
    el.innerHTML = `
        <div class="reorder-bar-inner">
            <div class="reorder-bar-text">
                <strong>Reorder mode</strong>
                <span>Drag activities to rearrange</span>
            </div>
            <button class="btn btn-accent" type="button" id="reorder-done">Done</button>
        </div>
    `;
    el.querySelector('#reorder-done').addEventListener('click', exitReorderMode);
    return el;
}

export function enterReorderMode() {
    if (active) return;
    active = true;
    document.body.classList.add('reorder-mode');
    topBar = buildTopBar();
    document.body.appendChild(topBar);
    requestAnimationFrame(() => topBar.classList.add('is-open'));
    // ESC exits
    document.addEventListener('keydown', escListener);
}

function escListener(e) { if (e.key === 'Escape') exitReorderMode(); }

export function exitReorderMode() {
    if (!active) return;
    active = false;
    document.body.classList.remove('reorder-mode');
    topBar?.classList.remove('is-open');
    document.removeEventListener('keydown', escListener);
    setTimeout(() => { topBar?.remove(); topBar = null; }, 250);
}

export function isReorderMode() { return active; }

if (typeof window !== 'undefined') {
    window.enterReorderMode = enterReorderMode;
    window.exitReorderMode = exitReorderMode;
}
