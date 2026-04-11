// ── Toast Notifications ──

export function showToast(message, type = 'info', duration = 3500, action = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;
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
