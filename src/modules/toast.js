// ── Toast Notifications ──

// T3.35: limit simultaneous toasts and dedup identical messages within a 1s
// window to prevent stacking storms (e.g. rapid keystroke handlers).
const MAX_TOASTS = 3;
const DEDUP_WINDOW_MS = 1000;
const recentMessages = new Map(); // message -> timestamp

export function showToast(message, type = 'info', duration = 3500, action = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    // Dedup
    const now = Date.now();
    const key = type + ':' + message;
    const last = recentMessages.get(key);
    if (last && (now - last) < DEDUP_WINDOW_MS) return;
    recentMessages.set(key, now);
    // Cleanup stale dedup entries periodically
    if (recentMessages.size > 50) {
        for (const [k, t] of recentMessages) {
            if (now - t > DEDUP_WINDOW_MS * 5) recentMessages.delete(k);
        }
    }
    // Cap simultaneous toasts. Prefer to remove the oldest non-action toast,
    // but if every visible toast has an action (sticky), still remove the
    // oldest so the cap is genuinely enforced rather than silently bypassed.
    const existing = container.querySelectorAll('.toast');
    if (existing.length >= MAX_TOASTS) {
        let removed = false;
        for (const el of existing) {
            if (!el.querySelector('.toast-action')) { el.remove(); removed = true; break; }
        }
        if (!removed && existing.length) existing[0].remove();
    }
    const icons = { success:'✓', error:'✕', info:'ℹ', warn:'⚠' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconEl = document.createElement('span');
    iconEl.className = 'toast-icon';
    iconEl.textContent = icons[type] || icons.info;
    toast.appendChild(iconEl);

    const msgEl = document.createElement('span');
    msgEl.className = 'toast-msg';
    msgEl.textContent = message;
    toast.appendChild(msgEl);

    const dismiss = () => {
        toast.classList.add('removing');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
        // Fallback in case animationend never fires
        setTimeout(() => toast.remove(), 400);
    };

    if (action && action.label && typeof action.onClick === 'function') {
        const actionBtn = document.createElement('button');
        actionBtn.className = 'toast-action';
        actionBtn.textContent = action.label;
        actionBtn.addEventListener('click', () => {
            try { action.onClick(); } catch (e) { console.error(e); }
            dismiss();
        });
        toast.appendChild(actionBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast-close';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', dismiss);
    toast.appendChild(closeBtn);

    container.appendChild(toast);

    // Action toasts are sticky — user must interact. Non-action toasts auto-dismiss.
    if (!action) {
        setTimeout(dismiss, duration);
    }

    return { dismiss };
}
