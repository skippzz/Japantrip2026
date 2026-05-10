// ── FAB (Floating Action Button) ──
// One per view. Bottom-right. Hides on scroll-down, reappears on scroll-up.
// Each view registers its FAB once at startup; the active view's FAB is shown.

const FABS = new Map();   // view-name -> { el, label, onClick }
let scrollHandler = null;
let lastScroll = 0;

// Public: register a FAB for a specific view name (matches body[data-view]).
export function registerFab(view, { label = '+', title = '', onClick }) {
    // Remove any prior FAB for this view
    const prior = FABS.get(view);
    if (prior?.el) prior.el.remove();

    const btn = document.createElement('button');
    btn.className = 'fab';
    btn.type = 'button';
    btn.setAttribute('aria-label', title || label);
    btn.title = title || label;
    btn.dataset.view = view;
    btn.textContent = label;
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        onClick?.();
    });
    document.body.appendChild(btn);
    FABS.set(view, { el: btn, label, onClick });

    syncVisibility();
    ensureScrollListener();
    return btn;
}

// Show only the FAB for the currently active view (read from body[data-view]).
function syncVisibility() {
    const current = document.body.dataset.view;
    for (const [view, { el }] of FABS) {
        el.style.display = (view === current) ? '' : 'none';
    }
}

// Hide-on-scroll-down behaviour
function ensureScrollListener() {
    if (scrollHandler) return;
    let ticking = false;
    const main = document.querySelector('.main') || document.documentElement;
    scrollHandler = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const s = main.scrollTop || window.scrollY || 0;
            const dy = s - lastScroll;
            const visibleFab = [...FABS.values()].find(({ el }) =>
                el.dataset.view === document.body.dataset.view && el.style.display !== 'none'
            );
            if (visibleFab) {
                if (dy > 4 && s > 100) visibleFab.el.classList.add('is-hidden');
                else if (dy < -4) visibleFab.el.classList.remove('is-hidden');
            }
            lastScroll = s;
            ticking = false;
        });
    };
    main.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('scroll', scrollHandler, { passive: true });
}

// Call after switching views (e.g. from app.js's switchView)
export function syncFabVisibility() {
    syncVisibility();
}

// Remove all FABs (used when re-registering en masse)
export function clearFabs() {
    for (const { el } of FABS.values()) el.remove();
    FABS.clear();
}
