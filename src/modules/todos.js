// ── Todos & Trip Rules ──

import { state, save } from './state.js';
import { esc } from './helpers.js';

// ══════════════════════════════════════════════════════════════
//  TODOS
// ══════════════════════════════════════════════════════════════
export function renderTodos() {
    const list = document.getElementById('todo-list');
    if (!list) return;
    list.innerHTML = state.todos.map(t => `
        <li>
            <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo('${t.id}')">
            <span class="${t.done ? 'done' : ''}">${esc(t.text)}</span>
            <button class="todo-del edit-only" onclick="deleteTodo('${t.id}')">✕</button>
        </li>
    `).join('');
}

export function toggleTodo(id) {
    const t = state.todos.find(x => x.id === id);
    if (t) { t.done = !t.done; save(); renderTodos(); }
}

export function deleteTodo(id) {
    if (!confirm('Delete this todo?')) return;
    state.todos = state.todos.filter(x => x.id !== id);
    save(); renderTodos();
}

export function addTodo() {
    const inp = document.getElementById('todo-input'), text = inp.value.trim();
    if (!text) return;
    state.todos.push({ id: 'td' + Date.now(), text, done: false });
    inp.value = ''; save(); renderTodos();
}

// ══════════════════════════════════════════════════════════════
//  TRIP RULES
// ══════════════════════════════════════════════════════════════
export function renderRules() {
    const list = document.getElementById('trip-rules-list');
    if (!list) return;
    const rules = state.rules || [];
    if (rules.length === 0) {
        list.innerHTML = '<div class="pool-empty">No rules set.</div>';
        return;
    }
    list.innerHTML = `<ul class="guideline-list">${rules.map((r, i) => `
        <li>
            ${esc(r)}
            <button class="todo-del edit-only" onclick="deleteRule(${i})">✕</button>
        </li>`).join('')}</ul>`;
}

export function addRule() {
    const inp = document.getElementById('rule-input'), text = inp.value.trim();
    if (!text) return;
    if (!state.rules) state.rules = [];
    state.rules.push(text);
    inp.value = ''; save(); renderRules();
}

export function deleteRule(index) {
    if (!state.rules) return;
    if (!confirm('Delete this rule?')) return;
    state.rules.splice(index, 1);
    save(); renderRules();
}
