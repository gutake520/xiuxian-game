import {escapeHTML} from './shared.js';

export function coinFace(front){
 const ornament=front?`<g fill="none" stroke="#65431d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M130 43q-18 27 0 42 18-15 0-42Zm-22 12q-6 26 17 33 1-24-17-33Zm44 0q6 26-17 33-1-24 17-33ZM130 217q-18-27 0-42 18 15 0 42Zm-22-12q-6-26 17-33 1 24-17 33Zm44 0q6-26-17-33-1 24 17 33ZM43 130q27-18 42 0-15 18-42 0Zm174 0q-27-18-42 0 15 18 42 0ZM56 108q26-6 33 17-24 1-33-17Zm0 44q26 6 33-17-24-1-33 17Zm148-44q-26-6-33 17 24 1 33-17Zm0 44q-26 6-33-17-24-1-33 17Z"/></g>`:`<g fill="#44301b" stroke="#f1d089" stroke-width=".6" font-family="Songti SC,STSong,serif" font-size="40" font-weight="700" text-anchor="middle" dominant-baseline="middle"><text x="130" y="70">平</text><text x="188" y="131">安</text><text x="130" y="191">喜</text><text x="72" y="131">乐</text></g>`;
 return `<svg viewBox="0 0 260 260" role="img" aria-label="${front?'铜钱莲纹面':'铜钱平安喜乐字面'}"><defs><radialGradient id="xg-coin-bronze" cx="30%" cy="22%" r="82%"><stop stop-color="#f8df9f"/><stop offset=".3" stop-color="#cfaa5c"/><stop offset=".7" stop-color="#87632f"/><stop offset="1" stop-color="#432d17"/></radialGradient></defs><circle cx="130" cy="130" r="122" fill="url(#xg-coin-bronze)" stroke="#f5da94" stroke-width="3"/><circle cx="130" cy="130" r="111" fill="none" stroke="#392711" stroke-width="3"/><circle cx="130" cy="130" r="103" fill="none" stroke="#f9e1a8" stroke-width="2"/><circle cx="130" cy="130" r="85" fill="none" stroke="#67441c" stroke-width="2"/>${ornament}<path d="M105 104h50v52h-50z" fill="#b68c46" stroke="#f8dda1" stroke-width="3"/><path d="M112 112h36v36h-36z" fill="#10241f" stroke="#5d401f" stroke-width="5"/></svg>`;
}

export function divinationMarkup(pending,result){
 if(!pending&&!result)return '';
 return `<div class="xg-card xg-divination"><h3>卦师 · 问卦</h3><div class="xg-divination-stage"><div class="xg-divination-coin">${coinFace(result?.front??true)}</div></div><p class="xg-divination-result" aria-live="polite">${result?escapeHTML(result.message):''}</p>${pending?'<button type="button" data-flip-coin>抛铜钱</button>':''}</div>`;
}
