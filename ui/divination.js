import {escapeHTML} from './shared.js';

export function coinFace(front){
 if(front)return `<svg viewBox="0 0 260 260" role="img" aria-label="铜钱莲纹面">
 <defs><radialGradient id="coin-bronze-front" cx="30%" cy="22%" r="82%"><stop stop-color="#f8df9f"/><stop offset=".28" stop-color="#cfaa5c"/><stop offset=".69" stop-color="#87632f"/><stop offset="1" stop-color="#432d17"/></radialGradient><mask id="coin-hole-front"><circle cx="130" cy="130" r="122" fill="white"/><rect x="112" y="112" width="36" height="36" rx="2" fill="black"/></mask></defs>
 <circle cx="130" cy="130" r="122" fill="url(#coin-bronze-front)" stroke="#f5da94" stroke-width="3" mask="url(#coin-hole-front)"/>
 <circle cx="130" cy="130" r="111" fill="none" stroke="#392711" stroke-width="3"/>
 <circle cx="130" cy="130" r="103" fill="none" stroke="#f9e1a8" stroke-opacity=".7" stroke-width="2"/>
 <circle cx="130" cy="130" r="85" fill="none" stroke="#67441c" stroke-opacity=".7" stroke-width="2"/>
 <g fill="none" stroke="#6b451c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
 <path d="M130 43c-10 17-10 27 0 39 10-12 10-22 0-39Z"/><path d="M107 56c-2 16 3 26 16 31 1-14-3-24-16-31ZM153 56c2 16-3 26-16 31-1-14 3-24 16-31Z"/>
 <path d="M130 217c-10-17-10-27 0-39 10 12 10 22 0 39Z"/><path d="M107 204c-2-16 3-26 16-31 1 14-3 24-16 31ZM153 204c2-16-3-26-16-31-1 14 3 24 16 31Z"/>
 <path d="M43 130c17-10 27-10 39 0-12 10-22 10-39 0ZM217 130c-17-10-27-10-39 0 12 10 22 10 39 0Z"/>
 <path d="M58 107c16-2 26 3 31 16-14 1-24-3-31-16ZM58 153c16 2 26-3 31-16-14-1-24 3-31 16ZM202 107c-16-2-26 3-31 16 14 1 24-3 31-16ZM202 153c-16 2-26-3-31-16 14-1 24 3 31 16Z"/>
 </g><path d="M105 104h50v52h-50z" fill="#b68c46" stroke="#f8dda1" stroke-width="3"/><path d="M112 112h36v36h-36z" fill="#10241f" stroke="#5d401f" stroke-width="5"/><g fill="#f8e0a4"><circle cx="79" cy="79" r="2"/><circle cx="181" cy="79" r="2"/><circle cx="79" cy="181" r="2"/><circle cx="181" cy="181" r="2"/></g></svg>`;
 return `<svg viewBox="0 0 260 260" role="img" aria-label="铜钱平安喜乐字面">
 <defs><radialGradient id="coin-bronze-back" cx="28%" cy="22%" r="84%"><stop stop-color="#f3d795"/><stop offset=".32" stop-color="#c49b52"/><stop offset=".74" stop-color="#7e5d2e"/><stop offset="1" stop-color="#402a15"/></radialGradient><mask id="coin-hole-back"><circle cx="130" cy="130" r="122" fill="white"/><rect x="112" y="112" width="36" height="36" rx="2" fill="black"/></mask></defs>
 <circle cx="130" cy="130" r="122" fill="url(#coin-bronze-back)" stroke="#f5da94" stroke-width="3" mask="url(#coin-hole-back)"/>
 <circle cx="130" cy="130" r="111" fill="none" stroke="#392711" stroke-width="3"/>
 <circle cx="130" cy="130" r="102" fill="none" stroke="#f9e1a8" stroke-opacity=".65" stroke-width="2"/>
 <circle cx="130" cy="130" r="86" fill="none" stroke="#62431f" stroke-width="2"/>
 <g fill="#44301b" stroke="#f1d089" stroke-width=".65" font-family="Songti SC, STSong, Noto Serif CJK SC, serif" font-size="39" font-weight="700" text-anchor="middle" dominant-baseline="middle"><text x="130" y="70">平</text><text x="188" y="131">安</text><text x="130" y="191">喜</text><text x="72" y="131">乐</text></g>
 <path d="M105 104h50v52h-50z" fill="#aa8240" stroke="#f8dda1" stroke-width="3"/><path d="M112 112h36v36h-36z" fill="#10241f" stroke="#573b1a" stroke-width="5"/><g fill="none" stroke="#dab879" stroke-width="2"><path d="M51 90q-10 40 0 80M209 90q10 40 0 80"/></g></svg>`;
}

export function divinationMarkup(pending,result){
 if(!pending&&!result)return '';
 return `<div class="xg-card xg-divination"><h3>卦师 · 问卦</h3><div class="xg-divination-stage"><div class="xg-divination-coin">${coinFace(result?.front??true)}</div></div><p class="xg-divination-result" aria-live="polite">${result?escapeHTML(result.message):''}</p>${pending?'<button type="button" data-flip-coin>抛铜钱</button>':''}</div>`;
}
