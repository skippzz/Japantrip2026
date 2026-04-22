#!/usr/bin/env node
// Fetches a Google Places photo for every place in DEFAULT_PLACES that does
// not already have a matching photos/<slug>.jpg file, and saves it locally.
//
// Usage:
//   GOOGLE_MAPS_API_KEY=AIza... node scripts/fetch-place-photos.mjs
//
// Flags:
//   --dry    List missing files without fetching.
//   --force  Re-fetch even if a file already exists.
//
// The API key MUST NOT be HTTP-referer restricted (the one baked into
// index.html is restricted to the site's origin and will fail here).
// Create a second unrestricted API key in the Google Cloud console with
// Places API + Places API (New) enabled, and use it for this one-off run.
// You can delete or re-restrict it afterwards.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PLACES } from '../src/modules/data.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PHOTOS_DIR = path.join(ROOT, 'photos');

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const DRY = process.argv.includes('--dry');
const FORCE = process.argv.includes('--force');

if (!API_KEY && !DRY) {
    console.error('ERROR: set GOOGLE_MAPS_API_KEY env var (unrestricted key).');
    console.error('       Use --dry to list missing files without a key.');
    process.exit(1);
}

function slugify(s) {
    return s.normalize('NFKD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function findPlace(query) {
    const url = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
        + '?input=' + encodeURIComponent(query)
        + '&inputtype=textquery'
        + '&fields=place_id,photos,name'
        + '&key=' + API_KEY;
    const res = await fetch(url);
    const json = await res.json();
    if (json.status !== 'OK') throw new Error(`findPlace ${json.status}: ${json.error_message || ''}`);
    const c = json.candidates?.[0];
    if (!c) throw new Error('no candidates');
    return c;
}

async function downloadPhoto(photoReference, destPath) {
    const url = 'https://maps.googleapis.com/maps/api/place/photo'
        + '?maxwidth=1200'
        + '&photo_reference=' + encodeURIComponent(photoReference)
        + '&key=' + API_KEY;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`photo HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.startsWith('image/')) throw new Error(`unexpected content-type: ${ct}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(destPath, buf);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const have = new Set(
    fs.readdirSync(PHOTOS_DIR)
        .map(f => f.replace(/\.(jpg|jpeg|png|webp)$/i, '').toLowerCase())
);

const targets = DEFAULT_PLACES
    .map(p => ({ id: p.id, name: p.name, city: p.city, slug: slugify(p.name) }))
    .filter(p => FORCE || !have.has(p.slug));

if (!targets.length) {
    console.log('All DEFAULT_PLACES already have photos. Done.');
    process.exit(0);
}

console.log(`${targets.length} place(s) missing photos:`);
targets.forEach(t => console.log(`  #${t.id.toString().padStart(3)}  photos/${t.slug}.jpg  (${t.name})`));
console.log();

if (DRY) {
    console.log('Dry run — no fetches performed.');
    process.exit(0);
}

let ok = 0, failed = 0;
for (const t of targets) {
    const destPath = path.join(PHOTOS_DIR, t.slug + '.jpg');
    const query = `${t.name}, ${t.city}, Japan`;
    try {
        const candidate = await findPlace(query);
        const ref = candidate.photos?.[0]?.photo_reference;
        if (!ref) {
            console.warn(`  ✗ #${t.id} ${t.name} — Places returned no photo`);
            failed++;
            continue;
        }
        await downloadPhoto(ref, destPath);
        console.log(`  ✓ #${t.id} ${t.name} → photos/${t.slug}.jpg`);
        ok++;
        // Gentle throttle — Places QPS is generous but no need to hammer.
        await sleep(150);
    } catch (err) {
        console.warn(`  ✗ #${t.id} ${t.name} — ${err.message}`);
        failed++;
    }
}

console.log(`\nDone. ${ok} saved, ${failed} failed.`);
if (failed) process.exit(2);
