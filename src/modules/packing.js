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
    state.packing = state.packing.filter(x => x.id !== id);
    save(); renderPacking();
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
