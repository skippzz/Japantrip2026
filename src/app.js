// ══════════════════════════════════════════════════════════════
//  JAPAN 2026 TRAVEL PLANNER — Modular Entry Point
//  Imports all modules and wires up globals + events
// ══════════════════════════════════════════════════════════════

// ── Core ──
import { state, loadState, save, subscribe, emit, exportData, importData,
         quickSave, loadVersion, deleteVersion, renameVersion, renderSavedVersions } from './modules/state.js';
import { initTheme, toggleTheme, setMapRefs } from './modules/theme.js';
import { showToast } from './modules/toast.js';
import { setStateRef } from './modules/helpers.js';
import { JAPAN_FACTS, PHRASES } from './modules/data.js';
import { ENABLE_API_PHOTOS } from './modules/config.js';

// ── Feature Modules ──
import { renderDashboard, goToToday } from './modules/dashboard.js';
import { renderItinerary, toggleDay, toggleVisited, handleItinSort,
         addItineraryDay, deleteDay, duplicateDay, openItinItemModal, handleItinItemSubmit,
         deleteItinItem, populateDaySelect, jumpToDay, shareDayCard,
         optimizeDayRoute, setItinSearch, toggleRainMode } from './modules/itinerary.js';
import { exportICS } from './modules/export.js';
import { renderPlaces, setPlaceFilter, setPlaceSearch, setAreaFilter,
         deletePlace, toggleReserved, updateResField, openDetail,
         openPlaceModal, handlePlaceSubmit, setPlaceSort,
         applyStatusFilter, clearAllFilters, renderReservationSummary,
         quickAddToDay, confirmQuickAdd } from './modules/places.js';
import { renderPlacePool, getUnaddedPlaces, getNearbyForDay, setPoolSearch, setPoolFilter,
         addPlaceToDay, handlePoolDrop, handleReturnToPool, populatePoolTargetDay } from './modules/pool.js';
import { renderPacking, togglePacked, deletePacking, handlePackingSubmit,
         setPackingFilter } from './modules/packing.js';
import { renderTodos, toggleTodo, deleteTodo, addTodo,
         renderRules, addRule, deleteRule } from './modules/todos.js';
import { initMap, updateMapMarkers, fitMapToAll, initAutocomplete,
         initDayMap, expandDayMap, initExpandedDayMaps,
         startPhotoFetching, expandedDayMapInstance, toggleMapCategory, cleanupExpandedMap } from './modules/map.js';
import { renderGuide, speakJapanese, translatePhrase, setGuideTab, setPhraseSearch } from './modules/guide.js';
import { renderHotelCards, copyHotel, openHotelEditor, saveHotelEditor } from './modules/hotels.js';
import { convertCurrency, setYen, loadPhotosUrl, savePhotosUrl,
         adjustSplitCount, calcSplit, copySplitResult, clearSplit } from './modules/currency.js';
import { smartImport, handleSmartImport } from './modules/place-import.js';
import { renderTripManager, switchTrip, deleteTrip, renameTrip,
         openNewTripModal, createAndSwitchTrip,
         openTripEditor, saveTripSettings, resetTripItinerary,
         openTemplatesGallery, useTemplateForNewTrip,
         applyTemplateToCurrentTrip, confirmOverrideWithTemplate,
         confirmReplaceWithTemplate, openTemplatePreview,
         openSaveCurrentAsTemplate, confirmSaveCurrentAsTemplate,
         deleteUserTemplate, exportTemplate, importTemplateFromFile } from './modules/trips.js';

// ══════════════════════════════════════════════════════════════
//  SHARED UI STATE (accessible by modules via window._*)
// ══════════════════════════════════════════════════════════════
window._editMode = false;
window._expandedDays = new Set();
window._dayMaps = {};
window._gmap = null;
window._gmarkers = [];
window._infoWindow = null;
window._timelineSortables = [];

// ══════════════════════════════════════════════════════════════
//  MODALS
// ══════════════════════════════════════════════════════════════
let activeModalFocusTrap = null;

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length) {
        focusable[0].focus();
        activeModalFocusTrap = function (e) {
            if (e.key !== 'Tab') return;
            const first = focusable[0], last = focusable[focusable.length - 1];
            if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
            else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
        };
        modal.addEventListener('keydown', activeModalFocusTrap);
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    if (id === 'modal-day-map') {
        cleanupExpandedMap();
    }
    if (id === 'modal-place') {
        window._importedPhotoUrl = null;
    }
    if (activeModalFocusTrap) {
        modal.removeEventListener('keydown', activeModalFocusTrap);
        activeModalFocusTrap = null;
    }
    modal.classList.remove('open');
}

// ══════════════════════════════════════════════════════════════
//  VIEW SWITCHING & EDIT MODE
// ══════════════════════════════════════════════════════════════
let currentView = 'dashboard';

function switchView(name) {
    currentView = name;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + name);
    if (el) el.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    document.querySelectorAll('.bottom-tab').forEach(b => b.classList.toggle('active', b.dataset.view === name));
    if (name === 'map' && window._gmap) {
        google.maps.event.trigger(window._gmap, 'resize');
        fitMapToAll();
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebar-backdrop').classList.toggle('open');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-backdrop').classList.remove('open');
}

function toggleEditMode() {
    window._editMode = !window._editMode;
    document.body.classList.toggle('edit-mode', window._editMode);
    const btn = document.getElementById('edit-btn');
    if (btn) btn.textContent = window._editMode ? '🔓' : '🔒';
    renderItinerary();
    renderPlacePool();
}

// ══════════════════════════════════════════════════════════════
//  RENDER ALL
// ══════════════════════════════════════════════════════════════
function renderAll() {
    renderDashboard();
    renderTodos();
    renderItinerary();
    renderPlacePool();
    populateDaySelect();
    renderPlaces();
    renderPacking();
    renderHotelCards();
    renderGuide();
    renderRules();
    renderSavedVersions();
    renderTripManager();
    loadPhotosUrl();
}

// Subscribe to renderAll events from state (import/loadVersion)
subscribe('renderAll', renderAll);

// ══════════════════════════════════════════════════════════════
//  EVENT BINDING
// ══════════════════════════════════════════════════════════════
function bindEvents() {
    // Nav (top + bottom)
    document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchView(b.dataset.view)));
    document.querySelectorAll('.bottom-tab').forEach(b => b.addEventListener('click', () => {
        if (b.dataset.view === 'more') { toggleSidebar(); return; }
        switchView(b.dataset.view);
    }));
    // Sidebar
    document.getElementById('sidebar-btn').addEventListener('click', toggleSidebar);
    document.getElementById('sidebar-backdrop').addEventListener('click', closeSidebar);
    document.getElementById('sidebar-close').addEventListener('click', closeSidebar);
    // Theme toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    // Edit mode
    document.getElementById('edit-btn').addEventListener('click', toggleEditMode);
    // Day select
    document.getElementById('day-select').addEventListener('change', e => { if (e.target.value) jumpToDay(e.target.value); });
    // Place filters
    document.getElementById('filter-bar').addEventListener('click', e => {
        const c = e.target.closest('.chip'); if (!c) return;
        document.querySelectorAll('#filter-bar .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        setPlaceFilter(c.dataset.filter);
        renderPlaces();
    });
    // Place search
    document.getElementById('place-search').addEventListener('input', e => { setPlaceSearch(e.target.value.toLowerCase()); renderPlaces(); });
    // Place sort
    document.getElementById('place-sort')?.addEventListener('change', e => { setPlaceSort(e.target.value); renderPlaces(); });
    // Itinerary search
    document.getElementById('itin-search')?.addEventListener('input', e => { setItinSearch(e.target.value); renderItinerary(); });
    // Packing tabs
    document.getElementById('packing-tabs').addEventListener('click', e => {
        const t = e.target.closest('.chip'); if (!t) return;
        document.querySelectorAll('#packing-tabs .chip').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        setPackingFilter(t.dataset.cat);
        renderPacking();
    });
    // Place import (smart: accepts URLs or search text)
    document.getElementById('smart-import-btn')?.addEventListener('click', () => {
        const btn = document.getElementById('smart-import-btn');
        if (btn) { btn.classList.add('loading'); btn.disabled = true; }
        handleSmartImport();
        // Remove loading after 5s max (import is async)
        setTimeout(() => { if (btn) { btn.classList.remove('loading'); btn.disabled = false; } }, 5000);
    });
    document.getElementById('smart-import-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); handleSmartImport(); } });
    // Buttons
    document.getElementById('add-place-btn').addEventListener('click', () => openPlaceModal());
    document.getElementById('add-day-btn').addEventListener('click', addItineraryDay);
    document.getElementById('add-packing-btn').addEventListener('click', () => openModal('modal-packing'));
    document.getElementById('todo-add-btn').addEventListener('click', addTodo);
    document.getElementById('todo-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
    document.getElementById('rule-add-btn')?.addEventListener('click', addRule);
    document.getElementById('rule-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') addRule(); });
    // Export/Import
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', e => { if (e.target.files[0]) importData(e.target.files[0]); e.target.value = ''; });
    document.getElementById('quicksave-btn').addEventListener('click', quickSave);
    document.getElementById('new-trip-btn')?.addEventListener('click', openNewTripModal);
    document.getElementById('browse-templates-btn')?.addEventListener('click', openTemplatesGallery);
    document.getElementById('view-reservations-btn')?.addEventListener('click', renderReservationSummary);
    document.getElementById('export-ics-btn')?.addEventListener('click', exportICS);
    document.getElementById('rain-toggle')?.addEventListener('click', toggleRainMode);
    // Pool filters
    document.getElementById('pool-search').addEventListener('input', e => { setPoolSearch(e.target.value.toLowerCase()); renderPlacePool(); });
    document.getElementById('pool-city-filter').addEventListener('change', e => { setPoolFilter(e.target.value); renderPlacePool(); });
    // Bill splitter
    document.getElementById('split-amount')?.addEventListener('input', calcSplit);
    document.getElementById('split-count')?.addEventListener('input', calcSplit);
    // Guide tabs
    document.querySelectorAll('[data-gtab]').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('[data-gtab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setGuideTab(btn.dataset.gtab);
        renderGuide();
    }));
    // Forms
    document.getElementById('place-form').addEventListener('submit', handlePlaceSubmit);
    document.getElementById('itin-form').addEventListener('submit', handleItinItemSubmit);
    document.getElementById('packing-form').addEventListener('submit', handlePackingSubmit);
    // Modal close buttons & backdrops
    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) closeModal(modal.id);
    }));
    document.querySelectorAll('.modal-overlay').forEach(ov => ov.addEventListener('click', e => {
        if (e.target === ov) closeModal(ov.id);
    }));
    // Escape key
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.open').forEach(m => closeModal(m.id));
        }
    });
    // Global search (Ctrl+K)
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openGlobalSearch();
        }
    });
    // Map filters
    const mapCityFilter = document.getElementById('map-filter');
    if (mapCityFilter) mapCityFilter.addEventListener('change', e => updateMapMarkers(e.target.value));
    const fitBtn = document.getElementById('map-fit');
    if (fitBtn) fitBtn.addEventListener('click', fitMapToAll);
}

// ══════════════════════════════════════════════════════════════
//  GLOBAL SEARCH (Ctrl+K)
// ══════════════════════════════════════════════════════════════
let _globalSearchBound = false;
function openGlobalSearch() {
    openModal('modal-search');
    const input = document.getElementById('global-search-input');
    if (input) { input.value = ''; input.focus(); }
    document.getElementById('global-search-results').innerHTML = '<div class="data-hint">Type to search places, activities, and phrases...</div>';
    if (!_globalSearchBound && input) {
        input.addEventListener('input', () => runGlobalSearch(input.value));
        _globalSearchBound = true;
    }
}

function runGlobalSearch(query) {
    const results = document.getElementById('global-search-results');
    if (!results) return;
    if (!query || query.trim().length < 2) {
        results.innerHTML = '<div class="data-hint">Type at least 2 characters...</div>';
        return;
    }
    const q = query.trim().toLowerCase();
    let html = '';

    // Search places
    const matchedPlaces = state.places.filter(p =>
        p.name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)
    ).slice(0, 5);
    if (matchedPlaces.length) {
        html += '<div class="search-group-title">Places</div>';
        html += matchedPlaces.map(p =>
            `<div class="search-result-item" onclick="closeModal('modal-search'); switchView('places'); setTimeout(()=>openDetail(${p.id}),100)">
                <span class="search-result-icon">📍</span>
                <div><div class="search-result-name">${p.name}</div><div class="search-result-meta">${p.city} · ${p.category}</div></div>
            </div>`
        ).join('');
    }

    // Search itinerary items
    const matchedItems = [];
    state.itinerary.forEach((day, idx) => {
        day.items.forEach(it => {
            if (it.name?.toLowerCase().includes(q) || it.desc?.toLowerCase().includes(q)) {
                matchedItems.push({ ...it, dayTitle: day.title, dayId: day.id, dayNum: idx + 1 });
            }
        });
    });
    if (matchedItems.length) {
        html += '<div class="search-group-title">Activities</div>';
        html += matchedItems.slice(0, 5).map(it =>
            `<div class="search-result-item" onclick="closeModal('modal-search'); switchView('itinerary'); setTimeout(()=>jumpToDay('${it.dayId}'),100)">
                <span class="search-result-icon">📅</span>
                <div><div class="search-result-name">${it.name}</div><div class="search-result-meta">Day ${it.dayNum}</div></div>
            </div>`
        ).join('');
    }

    // Search todos
    const matchedTodos = state.todos.filter(t => t.text?.toLowerCase().includes(q));
    if (matchedTodos.length) {
        html += '<div class="search-group-title">Todos</div>';
        html += matchedTodos.slice(0, 3).map(t =>
            `<div class="search-result-item" onclick="closeModal('modal-search'); toggleSidebar()">
                <span class="search-result-icon">✅</span>
                <div><div class="search-result-name">${t.text}</div><div class="search-result-meta">${t.done ? 'Done' : 'Pending'}</div></div>
            </div>`
        ).join('');
    }

    // Search phrases
    const matchedPhrases = PHRASES.filter(p =>
        p.en?.toLowerCase().includes(q) || p.jp?.includes(q) || p.rm?.toLowerCase().includes(q)
    ).slice(0, 3);
    if (matchedPhrases.length) {
        html += '<div class="search-group-title">Phrases</div>';
        html += matchedPhrases.map(p =>
            `<div class="search-result-item" onclick="closeModal('modal-search'); switchView('guide')">
                <span class="search-result-icon">🗣️</span>
                <div><div class="search-result-name">${p.en}</div><div class="search-result-meta">${p.jp} · ${p.rm}</div></div>
            </div>`
        ).join('');
    }

    if (!html) html = '<div class="data-hint">No results found.</div>';
    results.innerHTML = html;
}

// ══════════════════════════════════════════════════════════════
//  WINDOW GLOBALS (for inline onclick handlers in templates)
// ══════════════════════════════════════════════════════════════
// Itinerary
window.toggleDay = toggleDay;
window.toggleVisited = toggleVisited;
window.openItinItemModal = openItinItemModal;
window.deleteItinItem = deleteItinItem;
window.shareDayCard = shareDayCard;
window.expandDayMap = expandDayMap;
window.deleteDay = deleteDay;
window.duplicateDay = duplicateDay;
window.jumpToDay = jumpToDay;
window.optimizeDayRoute = optimizeDayRoute;
// Places
window.openDetail = openDetail;
window.deletePlace = deletePlace;
window.toggleReserved = toggleReserved;
window.updateResField = updateResField;
window.setAreaFilter = setAreaFilter;
window.openPlaceModal = openPlaceModal;
window.applyStatusFilter = applyStatusFilter;
window.clearAllFilters = clearAllFilters;
window.renderReservationSummary = renderReservationSummary;
window.quickAddToDay = quickAddToDay;
window.confirmQuickAdd = confirmQuickAdd;
// Pool
window.addPlaceToDay = addPlaceToDay;
window.handlePoolDrop = handlePoolDrop;
window.getNearbyForDay = getNearbyForDay;
// Todos
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;
window.deleteRule = deleteRule;
// Packing
window.togglePacked = togglePacked;
window.deletePacking = deletePacking;
// State/Versions
window.loadVersion = loadVersion;
window.deleteVersion = deleteVersion;
window.renameVersion = renameVersion;
// Hotels
window.copyHotel = copyHotel;
window.openHotelEditor = () => openHotelEditor(openModal);
window.saveHotelEditor = () => saveHotelEditor(closeModal);
// Currency & Photos
window.convertCurrency = convertCurrency;
window.setYen = setYen;
window.savePhotosUrl = savePhotosUrl;
window.adjustSplitCount = adjustSplitCount;
window.calcSplit = calcSplit;
window.copySplitResult = copySplitResult;
window.clearSplit = clearSplit;
// Guide
window.speakJapanese = speakJapanese;
window.translatePhrase = translatePhrase;
window.setPhraseSearch = (q) => { setPhraseSearch(q); renderGuide(); };
window.renderGuide = renderGuide;
// Navigation
window.switchView = switchView;
window.goToToday = goToToday;
window.toggleSidebar = toggleSidebar;
// Modals
window.openModal = openModal;
window.closeModal = closeModal;
// Cache clear
window.clearAppCache = async function() {
    if (!confirm('Clear all cached files and reload? Your saved data will NOT be deleted.')) return;
    try {
        // Unregister service workers
        const regs = await navigator.serviceWorker?.getRegistrations();
        for (const reg of (regs || [])) await reg.unregister();
        // Delete all caches
        const keys = await caches?.keys();
        for (const key of (keys || [])) await caches.delete(key);
        showToast('Cache cleared. Reloading...', 'success');
        setTimeout(() => window.location.reload(true), 500);
    } catch (e) {
        window.location.reload(true);
    }
};
// Trips
window.switchTrip = switchTrip;
window.deleteTrip = deleteTrip;
window.renameTrip = renameTrip;
window.openNewTripModal = openNewTripModal;
window.createAndSwitchTrip = createAndSwitchTrip;
window.openTripEditor = openTripEditor;
window.saveTripSettings = saveTripSettings;
window.resetTripItinerary = resetTripItinerary;
window.openTemplatesGallery = openTemplatesGallery;
window.useTemplateForNewTrip = useTemplateForNewTrip;
window.applyTemplateToCurrentTrip = applyTemplateToCurrentTrip;
window.confirmOverrideWithTemplate = confirmOverrideWithTemplate;
window.confirmReplaceWithTemplate = confirmReplaceWithTemplate;
window.openTemplatePreview = openTemplatePreview;
window.openSaveCurrentAsTemplate = openSaveCurrentAsTemplate;
window.confirmSaveCurrentAsTemplate = confirmSaveCurrentAsTemplate;
window.deleteUserTemplate = deleteUserTemplate;
window.exportTemplate = exportTemplate;
window.importTemplateFromFile = importTemplateFromFile;
// Render functions (for cross-module calls)
window.renderItinerary = renderItinerary;
window.renderPlacePool = renderPlacePool;
window.renderDashboard = renderDashboard;
window.renderPlaces = renderPlaces;
window.updateMapMarkers = updateMapMarkers;
window.renderAll = renderAll;
window.toggleMapCategory = toggleMapCategory;
window.initDayMap = initDayMap;
window.startPhotoFetching = startPhotoFetching;

// ══════════════════════════════════════════════════════════════
//  GOOGLE MAPS READY CALLBACK
// ══════════════════════════════════════════════════════════════
function onMapsReady() {
    initMap();
    initAutocomplete();
    initExpandedDayMaps();
    setMapRefs(window._gmap, window._dayMaps);
    if (ENABLE_API_PHOTOS) startPhotoFetching();
}

// Bridge set up in DOMContentLoaded below

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    // Loading screen
    const loadEl = document.getElementById('loading-screen');
    const factEl = document.getElementById('loading-fact');
    if (factEl) factEl.textContent = JAPAN_FACTS[Math.floor(Math.random() * JAPAN_FACTS.length)];
    setTimeout(() => {
        if (loadEl) { loadEl.classList.add('fade-out'); setTimeout(() => loadEl.remove(), 600); }
    }, 1200);

    initTheme();
    loadState();
    if (state.itinerary.length) window._expandedDays.add(state.itinerary[0].id);
    currentView = 'dashboard';
    renderAll();
    bindEvents();

    // First-time edit mode hint
    if (!localStorage.getItem('editModeHintShown')) {
        setTimeout(() => {
            showToast('Tip: Click the 🔒 Edit button in the header to unlock adding, editing, and deleting.', 'info', 8000);
            localStorage.setItem('editModeHintShown', '1');
        }, 3000);
    }

    // Google Maps bridge: handle callback regardless of load order
    window._onMapsReady = onMapsReady;
    if (window._gmapsReady) onMapsReady();

    // Check for Google Maps availability
    setTimeout(() => {
        if (typeof google === 'undefined' || !google.maps) {
            const fb = document.getElementById('map-fallback');
            const mapEl = document.getElementById('map');
            if (fb) fb.style.display = '';
            if (mapEl) mapEl.style.display = 'none';
        }
    }, 8000);

    // Service worker: register and wire up an update prompt so users see
    // new deploys without hunting for a hard-reload. Reloads once when the
    // new SW takes control, and only after the user clicks "Reload" in the
    // toast — so it never interrupts mid-edit.
    registerServiceWorker();
});

function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    // Reload once when the active SW changes (after the user accepts an update).
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
    });

    navigator.serviceWorker.register('./sw.js').then(reg => {
        // Case 1: a new SW is already waiting from a previous visit.
        if (reg.waiting && navigator.serviceWorker.controller) {
            promptUpdate(reg.waiting);
        }

        // Case 2: a new SW starts installing during this session.
        reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    promptUpdate(newWorker);
                }
            });
        });

        // Check for updates when the tab regains focus — catches users who
        // leave the app open for days at a time.
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                reg.update().catch(() => {});
            }
        });
    }).catch(err => console.warn('SW registration failed:', err));
}

let _updatePromptShown = false;
function promptUpdate(worker) {
    if (_updatePromptShown) return;
    _updatePromptShown = true;
    showToast('A new version is available', 'info', 0, {
        label: 'Reload',
        onClick: () => worker.postMessage('SKIP_WAITING'),
    });
}
