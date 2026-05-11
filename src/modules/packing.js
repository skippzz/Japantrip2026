// ── Packing List ──

import { state, save } from './state.js';
import { esc } from './helpers.js';
import { showToast } from './toast.js';

let packingFilter = 'all';

export function setPackingFilter(f) { packingFilter = f; }
export function getPackingFilter() { return packingFilter; }

export function renderPacking() {
    const container = document.getElementById('packing-body');
    if (!container) return;
    const items = packingFilter === 'all' ? state.packing : state.packing.filter(p => p.cat === packingFilter);
    const packed = state.packing.filter(p => p.packed).length;
    const total = state.packing.length;
    const pct = total ? Math.round(packed / total * 100) : 0;

    document.getElementById('packing-progress').innerHTML = `
        <div class="packing-bar"><div class="packing-bar-fill" style="width:${pct}%"></div></div>
        <span class="packing-count">${packed}/${total} packed (${pct}%)</span>`;

    if (total > 0 && packed === total) {
        document.getElementById('packing-progress').innerHTML += '<div class="packing-complete">🎉 All packed and ready to go!</div>';
    }

    // Wave 2: empty state with CTA
    if (!items.length) {
        const hasFilter = packingFilter !== 'all';
        container.innerHTML = hasFilter
            ? `<tr><td colspan="6" style="text-align:center;padding:var(--space-5);color:var(--text-3)">No items in "${esc(packingFilter)}" category. <button class="btn btn-ghost btn-sm" onclick="setPackingFilter('all'); renderPacking()">Show all</button></td></tr>`
            : `<tr><td colspan="6" style="text-align:center;padding:var(--space-5);color:var(--text-3)">No packing items yet. Tap + to add your first item.</td></tr>`;
        return;
    }
    container.innerHTML = items.map(p => `
        <tr class="${p.packed ? 'packed' : ''}">
            <td><input type="checkbox" ${p.packed ? 'checked' : ''} onchange="togglePacked('${p.id}')"></td>
            <td>${esc(p.name)}</td>
            <td>${esc(p.cat)}</td>
            <td>${p.qty}</td>
            <td>${esc(p.notes || '')}</td>
            <td class="edit-only"><button class="btn-sm btn-ghost" onclick="deletePacking('${p.id}')">🗑️</button></td>
        </tr>`).join('');
}

export function togglePacked(id) {
    const p = state.packing.find(x => x.id === id);
    if (p) { p.packed = !p.packed; save(); renderPacking(); }
}

export function deletePacking(id) {
    const idx = state.packing.findIndex(x => x.id === id);
    if (idx === -1) return;
    const item = state.packing[idx];
    if (!confirm(`Delete "${item.name || 'item'}" from packing?`)) return;
    state.packing.splice(idx, 1);
    save(); renderPacking();
    window._undoStack = window._undoStack || [];
    window._undoStack.push({ kind: 'packing', idx, item, ts: Date.now() });
    window.showToast?.(
        `Deleted "${item.name}"`,
        'info',
        4500,
        { label: 'Undo', onClick: () => window._undoLastDelete?.() }
    );
}

export function handlePackingSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('p-name').value.trim();
    if (!name) return;
    state.packing.push({
        id: 'pk' + Date.now(),
        name,
        cat: document.getElementById('p-cat').value,
        qty: parseInt(document.getElementById('p-qty').value) || 1,
        notes: document.getElementById('p-notes').value.trim(),
        packed: false
    });
    save(); renderPacking();
    document.getElementById('packing-form').reset();
    window.closeModal?.('modal-packing');
    showToast('Item added to packing list.', 'success');
}
