import {escapeHTML} from './shared.js';
export function showManualReveal(content,name){
 const overlay=document.createElement('div');overlay.className='xg-manual-reveal';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','获得功法');
 overlay.innerHTML=`<div class="gm-stage" role="img" aria-label="金光中出现功法典籍"><div class="gm-halo"></div><div class="gm-rays"></div>
    <div class="gm-box"><div class="gm-lid"><span class="gm-lid-motif" aria-hidden="true">✦ ─ ◇ ─ ✦</span></div><div class="gm-front"><svg viewBox="0 0 128 75" aria-hidden="true"><path d="M12 17 Q30 29 48 17 M80 17 Q98 29 116 17 M12 57 Q34 43 53 57 M75 57 Q94 43 116 57" fill="none" stroke="#ba9b62" stroke-width=".8" opacity=".55"/><path d="M64 21 C73 30 73 45 64 54 C55 45 55 30 64 21Z" fill="none" stroke="#dbbd80" stroke-width="1.1"/><path d="M64 24V52 M53 37h22 M21 38h26 M81 38h26" fill="none" stroke="#d2ae70" stroke-width=".9" opacity=".7"/><path d="M5 7h12M5 7v12 M123 7h-12M123 7v12 M5 68h12M5 68V56 M123 68h-12M123 68V56" fill="none" stroke="#e4bf7b" stroke-width="1.4"/></svg></div><div class="gm-seal" aria-hidden="true"><span>◇</span></div></div>
    <div class="gm-card"><svg viewBox="0 0 180 210" role="img" aria-label="深绿线装功法册，饰以金色山水纹与书签">
      <defs><linearGradient id="gm-cover-v3" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#283d34"/><stop offset=".5" stop-color="#11251f"/><stop offset="1" stop-color="#0a1816"/></linearGradient><linearGradient id="gm-edge-v3" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff0bb"/><stop offset=".5" stop-color="#d5a952"/><stop offset="1" stop-color="#937044"/></linearGradient><linearGradient id="gm-mountain-v3" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c2bd9d"/><stop offset="1" stop-color="#47645b"/></linearGradient></defs>
      <path d="M22 14 H158 Q164 14 164 20 V191 Q164 196 159 196 H22 Q17 196 17 190 V20 Q17 14 22 14Z" fill="#b9a079" stroke="#f2d798" stroke-width="2"/>
      <path d="M22 11 H155 Q160 11 160 16 V188 Q160 191 156 191 H22 Q17 191 17 185 V16 Q17 11 22 11Z" fill="url(#gm-cover-v3)" stroke="url(#gm-edge-v3)" stroke-width="2"/>
      <path d="M37 13 V190" stroke="#c49f60" stroke-width="1.3" opacity=".9"/>
      <path d="M20 35 H43 M20 67 H43 M20 99 H43 M20 131 H43 M20 163 H43" stroke="#b7a879" stroke-width="2.2"/>
      <circle cx="37" cy="35" r="3" fill="#ffe0a2"/><circle cx="37" cy="67" r="3" fill="#ffe0a2"/><circle cx="37" cy="99" r="3" fill="#ffe0a2"/><circle cx="37" cy="131" r="3" fill="#ffe0a2"/><circle cx="37" cy="163" r="3" fill="#ffe0a2"/>
      <path d="M69 191 79 146 90 162 105 121 123 163 132 150 145 191Z" fill="url(#gm-mountain-v3)" opacity=".7"/>
      <path d="M55 173 Q75 155 94 170 T148 163 M55 183 Q82 168 103 178 T151 174" fill="none" stroke="#dbc38a" stroke-width="2" opacity=".7"/>
      <path d="M64 51 Q86 41 102 48 T138 48 M68 59 Q91 50 113 58" fill="none" stroke="#e3c582" opacity=".35"/>
      <rect x="101" y="29" width="43" height="102" fill="#f6e9c7" stroke="#ddb86d" stroke-width="2"/>
      <path d="M106 34h33v92h-33z" fill="none" stroke="#b69355" stroke-width=".8"/>
      <text x="122" y="65" fill="#19251e" text-anchor="middle" font-size="23" font-family="serif">功</text><text x="122" y="103" fill="#19251e" text-anchor="middle" font-size="23" font-family="serif">法</text>
      <path d="M146 15h12v12l-12-12z M146 187h12v-12l-12 12z" fill="#dfbd7b"/>
    </svg></div>
<div class="gm-reveal"><strong>${escapeHTML(name)}</strong></div><div class="gm-sparks" aria-hidden="true"></div></div><button type="button" data-close-reveal>收下典籍</button>`;
 content.appendChild(overlay);
 const sparks=overlay.querySelector('.gm-sparks');
 for(let i=0;i<22;i++){const p=document.createElement('i'),angle=i*2.3999,distance=65+(i%5)*16;p.style.setProperty('--x',Math.round(Math.cos(angle)*distance)+'px');p.style.setProperty('--y',Math.round(Math.sin(angle)*distance)+'px');p.style.setProperty('--delay',(1.28+(i%4)*.08)+'s');sparks.appendChild(p)}
 const close=overlay.querySelector('[data-close-reveal]');close.onclick=()=>{overlay.remove();content.querySelector('[data-draw="1"]')?.focus()};
 overlay.querySelector('.gm-stage').classList.add('play');close.focus();
}
