// ── PWA install prompt UX ──
// Phase 1.13. Captures the deferred beforeinstallprompt event on Android/Chrome
// and surfaces a non-intrusive "Install" button via toast on the user's 2nd
// session. iOS Safari can't programmatically prompt — show a one-time card with
// the manual "Share → Add to Home Screen" instructions instead.

const VISITS_KEY = 'jp_install_visits';
const PROMPT_DISMISSED_KEY = 'jp_install_dismissed';
const IOS_HINT_SEEN_KEY = 'jp_ios_install_hint_seen';

let deferredEvt = null;

function isStandalone() {
    return window.matchMedia?.('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function bumpVisits() {
    let n = parseInt(localStorage.getItem(VISITS_KEY) || '0', 10);
    n += 1;
    localStorage.setItem(VISITS_KEY, String(n));
    return n;
}

export function initInstallPrompt() {
    if (isStandalone()) return; // already installed

    const visits = bumpVisits();

    // Capture the deferred install event for Chrome/Edge/Android
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredEvt = e;
        // Show prompt only after 2nd visit and only if not previously dismissed
        if (visits >= 2 && !localStorage.getItem(PROMPT_DISMISSED_KEY)) {
            setTimeout(showInstallToast, 4000);
        }
    });

    // After successful install, clear the deferred event
    window.addEventListener('appinstalled', () => {
        deferredEvt = null;
        localStorage.removeItem(PROMPT_DISMISSED_KEY);
    });

    // iOS doesn't fire beforeinstallprompt — show a one-time hint card.
    if (isIOS() && visits >= 2 && !localStorage.getItem(IOS_HINT_SEEN_KEY)) {
        setTimeout(showIosHint, 4000);
    }
}

function showInstallToast() {
    if (!deferredEvt) return;
    // Use a custom sheet rather than the toast so we have proper buttons
    const html = `
        <div class="install-prompt">
            <div class="install-prompt-icon">🌸</div>
            <div class="install-prompt-title">Install Japan 2026</div>
            <div class="install-prompt-body">Adds an icon to your home screen so you can open the app like a native app — works offline, opens fast.</div>
            <div class="install-prompt-actions">
                <button class="btn btn-accent btn-large" id="install-yes">Install</button>
                <button class="btn btn-ghost" id="install-no">Not now</button>
            </div>
        </div>
    `;
    window.openSheet?.({ id: 'install-prompt', side: 'bottom', html });
    requestAnimationFrame(() => {
        document.getElementById('install-yes')?.addEventListener('click', async () => {
            window.closeSheet?.('install-prompt');
            try {
                await deferredEvt.prompt();
                const choice = await deferredEvt.userChoice;
                if (choice.outcome === 'dismissed') {
                    localStorage.setItem(PROMPT_DISMISSED_KEY, '1');
                }
            } catch { /* ok */ }
            deferredEvt = null;
        });
        document.getElementById('install-no')?.addEventListener('click', () => {
            localStorage.setItem(PROMPT_DISMISSED_KEY, '1');
            window.closeSheet?.('install-prompt');
        });
    });
}

function showIosHint() {
    const html = `
        <div class="install-prompt">
            <div class="install-prompt-icon">🌸</div>
            <div class="install-prompt-title">Add to Home Screen</div>
            <div class="install-prompt-body">
                In Safari, tap the <strong>Share</strong> button
                <span style="font-size:1.2em;vertical-align:middle">⬆</span>,
                then scroll down and tap <strong>Add to Home Screen</strong>.
                Japan 2026 will open like a native app — no Safari chrome, works offline.
            </div>
            <div class="install-prompt-actions">
                <button class="btn btn-accent btn-large" id="ios-hint-ok">Got it</button>
            </div>
        </div>
    `;
    window.openSheet?.({ id: 'install-prompt', side: 'bottom', html });
    requestAnimationFrame(() => {
        document.getElementById('ios-hint-ok')?.addEventListener('click', () => {
            localStorage.setItem(IOS_HINT_SEEN_KEY, '1');
            window.closeSheet?.('install-prompt');
        });
    });
}
