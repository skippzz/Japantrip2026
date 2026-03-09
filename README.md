# Japan 2026 Trip Planner

Interactive travel planner for an 18-day Japan trip (May 16 – Jun 2, 2026) built for a group of 8 friends. Zero recurring cost — static site with localStorage persistence.

## Live Demo

> After deploying, replace this with your GitHub Pages URL.

## Features

### Core
- **Trip Dashboard** — countdown, stats, mini-calendar, quick access links
- **Places Database** — 130+ curated spots across Tokyo, Kyoto, Osaka, Nara, Fuji, and Izu
- **Drag & Drop Itinerary** — organize 18 days with SortableJS, drag from place pool into days
- **Interactive Map** — Google Maps with color-coded category markers and info windows
- **Light / Dark Mode** — auto-detects system preference, manual toggle

### Itinerary Intelligence
- **Place Pool** — sidebar of unscheduled places, filterable by city/neighborhood
- **Walking Distance Estimates** — per-day Haversine-based distance calculations
- **Day Route Mini-Maps** — inline Google Maps with numbered markers and polylines
- **Hours Conflict Detection** — warns when a scheduled time conflicts with opening hours
- **Reservation Tracking** — mark places as reserved with confirmation number and booker name
- **Note Items** — add reminders/notes to days (styled differently, no navigation)

### On-the-Ground Tools
- **Hotel Address Cards** — Japanese addresses with copy button for showing taxi drivers
- **Emergency Contacts** — police, ambulance, embassy numbers
- **Currency Converter** — JPY to TRY with quick presets
- **Phrase Book** — 45 essential Japanese phrases with speech synthesis pronunciation
- **Transport Guide** — JR Pass, Suica/Pasmo, Kyoto Bus, luggage forwarding cheat sheets
- **Rain Plan Tags** — indoor/outdoor icons on itinerary items

### Sharing & Data
- **Shareable Day Cards** — export any day as PNG image (uses Web Share API on mobile)
- **JSON Export / Import** — full state backup and restore
- **Google Photos Album Link** — shared album link in sidebar

### Polish
- **PWA** — installable, offline-capable via service worker
- **Toast Notifications** — animated feedback for all actions
- **Confetti** — celebration animations on day/trip completion
- **Bottom Mobile Nav** — 6-tab navigation bar on small screens
- **Smooth Accordion** — CSS grid-based day card animation
- **Packing List** — categorized checklist with progress tracking

## Tech Stack

| Component | Tech |
|-----------|------|
| Frontend | Vanilla HTML/CSS/JS — no build step |
| Drag & Drop | SortableJS 1.15.6 |
| Maps | Google Maps JavaScript API + Places API |
| Image Export | html2canvas 1.4.1 |
| Animations | canvas-confetti 1.9.3 |
| Storage | localStorage (browser-local) |
| Hosting | GitHub Pages (free) |

## Deployment

### Prerequisites
- A Google Maps API key with **Maps JavaScript API** and **Places API** enabled

### Steps

1. **Restrict your API key** (critical for security):
   - Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials)
   - Click your API key > **Application restrictions** > **HTTP referrers**
   - Add: `yourusername.github.io/*`
   - Under **API restrictions**, select: Maps JavaScript API, Places API

2. **Create a GitHub repository**:
   ```bash
   cd "japan iteniary"
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/japan-2026.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**:
   - Go to repo **Settings** > **Pages**
   - Source: **Deploy from a branch**
   - Branch: **main**, folder: **/ (root)**
   - Save — site will be live at `https://yourusername.github.io/japan-2026/`

4. **Optional — download place photos**:
   ```bash
   pip install requests
   python fetch_photos.py
   ```
   This creates a `photos/` folder with thumbnails. Without it, cards show gradient fallbacks.

## File Structure

```
index.html          — main page (single-page app)
styles.css          — all styling (dark/light themes, responsive)
script.js           — all application logic (~2100 lines)
sw.js               — service worker for offline caching
manifest.json       — PWA manifest
.gitignore          — excludes dev files from repo
photos/             — place thumbnails (optional, created by fetch_photos.py)
```

## Data Management

All data lives in **localStorage** — each browser/device has its own copy.

- **Export**: Sidebar > Export JSON (downloads a timestamped backup file)
- **Import**: Sidebar > Import JSON (replaces current data from a backup file)
- **Sync between devices**: Export from one, import on another

The app ships with a built-in default dataset of 130+ places and 18 pre-configured days. On first load (or after a version bump), this default data is loaded. After that, the user's localStorage data takes precedence.

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Mobile browsers (iOS Safari, Chrome Android)

## License

Free to use and modify for personal projects.
