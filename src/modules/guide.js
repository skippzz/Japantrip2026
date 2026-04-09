// ── Guide: Phrase Book + Transport Info ──

import { PHRASES } from './data.js';
import { esc } from './helpers.js';
import { showToast } from './toast.js';

let guideTab = 'phrases';
let phraseSearch = '';

export function setGuideTab(tab) { guideTab = tab; }
export function getGuideTab() { return guideTab; }
export function setPhraseSearch(q) { phraseSearch = q; }

export function renderGuide() {
    const el = document.getElementById('guide-content');
    if (!el) return;

    if (guideTab === 'phrases') {
        const q = phraseSearch.toLowerCase();
        const filtered = q ? PHRASES.filter(p => p.en.toLowerCase().includes(q) || p.jp.includes(q) || p.rm.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q)) : PHRASES;
        const cats = [...new Set(filtered.map(p => p.cat))];
        el.innerHTML = `
            <div class="translate-bar">
                <input type="text" class="phrase-search" id="translate-input" placeholder="Type English to get Japanese...">
                <button class="btn btn-accent btn-sm" onclick="translatePhrase()">Translate</button>
            </div>
            <div id="translate-result" class="translate-result"></div>
            <input type="text" class="phrase-search" placeholder="Search phrases..." value="${esc(phraseSearch)}" oninput="setPhraseSearch(this.value); renderGuide()">
            ${cats.map(cat => `
                <div class="phrase-section">
                    <div class="phrase-section-title">${esc(cat)}</div>
                    ${filtered.filter(p => p.cat === cat).map(p => `
                        <div class="phrase-card">
                            <div>
                                <div class="phrase-en">${esc(p.en)}</div>
                                <div class="phrase-romaji">${esc(p.rm)}</div>
                            </div>
                            <div class="phrase-jp">${esc(p.jp)}</div>
                            <button class="phrase-speak" onclick="speakJapanese('${esc(p.jp)}')" title="Speak">🔊</button>
                        </div>`).join('')}
                </div>`).join('')}`;
    } else {
        el.innerHTML = `
            <div class="transport-card">
                <h3>🚄 JR Pass (Japan Rail Pass)</h3>
                <p><strong>7-day pass: ~¥50,000 / 14-day: ~¥80,000 / 21-day: ~¥100,000</strong></p>
                <ul>
                    <li>Covers all JR trains including Shinkansen (except Nozomi & Mizuho)</li>
                    <li>Use <strong>Hikari</strong> or <strong>Kodama</strong> Shinkansen instead of Nozomi</li>
                    <li>Also covers JR local trains, some JR buses, and the JR ferry to Miyajima</li>
                    <li>Activate at any JR ticket office with your passport</li>
                </ul>
                <div class="transport-tip">💡 For this trip (Tokyo → Kyoto → Osaka → Tokyo), a 14-day pass likely pays for itself.</div>
            </div>
            <div class="transport-card">
                <h3>💳 Suica / Pasmo (IC Card)</h3>
                <p>Rechargeable contactless card for trains, buses, convenience stores, and vending machines.</p>
                <ul>
                    <li>Buy at any train station kiosk (¥500 deposit)</li>
                    <li>Tap in, tap out — fare is auto-calculated</li>
                    <li>Works across ALL cities (Tokyo, Kyoto, Osaka, Nara)</li>
                    <li>Top up at station machines or convenience stores</li>
                    <li>Keep ¥2,000–3,000 loaded for daily use</li>
                </ul>
                <div class="transport-tip">💡 Apple Pay / Google Pay Suica is available — add it to your phone wallet for tap-and-go without a physical card</div>
            </div>
            <div class="transport-card">
                <h3>🚌 Kyoto Bus Pass</h3>
                <p><strong>1-day pass: ¥700</strong> — unlimited city bus rides.</p>
                <ul>
                    <li>Buy on the bus or at Kyoto Station tourist info</li>
                    <li>Each single ride is ¥230, so 4+ rides = worth it</li>
                    <li>Covers most tourist routes (Kinkaku-ji, Gion, Arashiyama)</li>
                    <li>NOT valid on subway — only buses</li>
                </ul>
            </div>
            <div class="transport-card">
                <h3>📦 Luggage Forwarding (Takkyubin)</h3>
                <p>Send luggage between hotels instead of carrying it on trains. Life-changing.</p>
                <ul>
                    <li>Available at any convenience store (7-Eleven, Lawson, FamilyMart)</li>
                    <li>Cost: ~¥2,000–3,000 per bag (size-dependent)</li>
                    <li>Next-day delivery between cities</li>
                    <li>Ask your hotel front desk to help fill the form</li>
                    <li>Main services: <strong>Yamato (ヤマト / Kuroneko)</strong> or <strong>Sagawa</strong></li>
                </ul>
                <div class="transport-tip">💡 Send bags from Tokyo hotel → Kyoto hotel the day before you travel. Arrive in Kyoto luggage-free!</div>
            </div>
            <div class="transport-card">
                <h3>🚇 Key Routes for This Trip</h3>
                <ul>
                    <li><strong>Tokyo → Kawaguchiko:</strong> Fuji Excursion from Shinjuku (~2h, JR Pass + surcharge)</li>
                    <li><strong>Tokyo → Kyoto:</strong> Shinkansen Hikari (~2h20, JR Pass)</li>
                    <li><strong>Kyoto → Osaka:</strong> JR Special Rapid (~30min, JR Pass)</li>
                    <li><strong>Osaka → Nara:</strong> JR Yamatoji Rapid (~45min, JR Pass) or Kintetsu (~35min, not JR)</li>
                    <li><strong>Osaka → Tokyo:</strong> Shinkansen Hikari (~2h30, JR Pass)</li>
                </ul>
            </div>`;
    }
}

export function translatePhrase() {
    const input = document.getElementById('translate-input');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim().toLowerCase();

    // Check if any existing phrase matches
    const match = PHRASES.find(p => p.en.toLowerCase().includes(text) || text.includes(p.en.toLowerCase()));
    const resultEl = document.getElementById('translate-result');
    if (!resultEl) return;

    if (match) {
        resultEl.innerHTML = `
            <div class="phrase-card" style="margin-top:8px">
                <div><div class="phrase-en">${esc(match.en)}</div><div class="phrase-romaji">${esc(match.rm)}</div></div>
                <div class="phrase-jp">${esc(match.jp)}</div>
                <button class="phrase-speak" onclick="speakJapanese('${esc(match.jp)}')" title="Speak">🔊</button>
            </div>`;
    } else {
        resultEl.innerHTML = `<div class="data-hint" style="margin-top:6px">No match found. Try simpler words like "hello", "thank you", "help".</div>`;
    }
}

export function speakJapanese(text) {
    if (!('speechSynthesis' in window)) { showToast('Speech not supported in this browser', 'warn'); return; }
    const synth = window.speechSynthesis;
    synth.cancel();
    const voices = synth.getVoices();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    u.rate = 0.85;
    const jpVoice = voices.find(v => v.lang.startsWith('ja'));
    if (jpVoice) u.voice = jpVoice;
    synth.speak(u);
}
