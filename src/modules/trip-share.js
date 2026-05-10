// ── Trip Share: static HTML snapshot ──
// Phase 5.5. Generates a self-contained HTML file of the current trip with
// no JavaScript and no external dependencies — works offline, prints well,
// shareable via any messaging app or AirDrop.

import { state } from './state.js';
import { getActiveTrip } from './trips.js';
import { esc } from './helpers.js';

function snapshotHtml() {
    const trip = getActiveTrip();
    const title = trip?.name || 'Trip';
    const dateRange = (trip?.dateStart && trip?.dateEnd)
        ? `${trip.dateStart} → ${trip.dateEnd}` : '';

    const dayCards = (state.itinerary || []).map((day, idx) => {
        const items = (day.items || []).map(it => `
            <li class="it">
                ${it.time ? `<span class="t">${esc(it.time)}</span>` : ''}
                <span class="n">${esc(it.name)}</span>
                ${it.desc ? `<span class="d">${esc(it.desc)}</span>` : ''}
            </li>
        `).join('');
        return `
            <section class="day">
                <h2>Day ${idx + 1} — ${esc(day.title || '')}</h2>
                <ul>${items || '<li class="empty">(no activities)</li>'}</ul>
            </section>`;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>${esc(title)} — Trip Plan</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root { color-scheme: light; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #1a1a1a; background: #fff; padding: 24px; max-width: 760px; margin: 0 auto; }
header { border-bottom: 2px solid #3b82f6; padding-bottom: 12px; margin-bottom: 24px; }
h1 { font-size: 28px; font-weight: 800; }
.meta { color: #6b7280; font-size: 14px; margin-top: 4px; }
.day { margin: 24px 0; padding: 16px; background: #f9fafb; border-radius: 10px; }
h2 { font-size: 17px; font-weight: 700; margin-bottom: 12px; color: #111; }
ul { list-style: none; }
.it { padding: 8px 0; border-bottom: 1px dashed #e5e7eb; display: flex; gap: 8px; flex-wrap: wrap; }
.it:last-child { border-bottom: 0; }
.t { font-weight: 700; min-width: 60px; color: #3b82f6; font-variant-numeric: tabular-nums; }
.n { font-weight: 600; }
.d { width: 100%; padding-left: 68px; color: #6b7280; font-size: 14px; }
.empty { color: #9ca3af; font-style: italic; }
footer { margin-top: 48px; text-align: center; color: #9ca3af; font-size: 12px; }
@media print {
    body { padding: 0; max-width: none; }
    .day { background: none; border: 1px solid #e5e7eb; break-inside: avoid; }
}
</style></head>
<body>
<header>
    <h1>${esc(title)}</h1>
    <div class="meta">${esc(dateRange)} · ${(state.itinerary || []).length} days · ${(state.places || []).length} places</div>
</header>
${dayCards}
<footer>Generated ${new Date().toLocaleDateString()} · Japan 2026 Trip Planner</footer>
</body></html>`;
}

export function downloadTripSnapshot() {
    const html = snapshotHtml();
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const trip = getActiveTrip();
    const slug = (trip?.name || 'trip').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    a.download = slug + '-snapshot.html';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    window.showToast?.('Trip snapshot downloaded.', 'success');
}

export async function shareTripSnapshot() {
    const html = snapshotHtml();
    const file = new File([html], 'trip.html', { type: 'text/html' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({
                title: getActiveTrip()?.name || 'Trip',
                text: 'My trip plan',
                files: [file],
            });
            // T3.54: File object holds the blob in memory; nothing else to revoke
            // since we never created an Object URL on this path. Done.
            return;
        } catch { /* fall through to download */ }
    }
    downloadTripSnapshot();
}

if (typeof window !== 'undefined') {
    window.downloadTripSnapshot = downloadTripSnapshot;
    window.shareTripSnapshot = shareTripSnapshot;
}
