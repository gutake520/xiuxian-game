export const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const format=value=>Number.isFinite(value)?Number(value.toFixed(2)).toLocaleString('zh-CN'):'—';
export async function buttonTask(button,task,errorBox){if(button.disabled)return;button.disabled=true;try{await task()}catch(error){if(errorBox)errorBox.textContent=error.message;else alert(error.message)}finally{if(button.isConnected)button.disabled=false}}
export function createSheet(title,onClose){
 document.getElementById('xg-feature-sheet')?.remove();
 const sheet=document.createElement('div');sheet.id='xg-feature-sheet';sheet.className='xg-feature';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label',title);
 sheet.innerHTML=`<header class="xg-feature-header"><div><small class="xg-eyebrow">问我 · 修行手札</small><h2>${escapeHTML(title)}</h2></div><button type="button" data-close aria-label="返回上一页">← 返回</button></header><div data-body></div><p class="xg-feature-message" role="status" aria-live="polite"></p>`;
 document.getElementById('xg-panel').append(sheet);
 sheet.querySelector('[data-close]').onclick=onClose;return sheet;
}
