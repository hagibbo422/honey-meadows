// Admin area inside Settings. Locked with the same password as the Headquarters dashboard.
// Controls: page background colour (saved in this browser).
(()=>{
'use strict';
const BG_KEY='honeyMeadows.admin.bg.v1';
const DEFAULT_BG='#f8efed';
const box=document.getElementById('adminBody'),toggle=document.getElementById('adminToggle');
if(!box||!toggle)return;
let open=false,adminUnlocked=false;

// Accepts #rgb, #rrggbb, rgb(r,g,b), "r,g,b" or "r g b". Returns #rrggbb or null.
function parseColor(input){
 const v=String(input||'').trim().toLowerCase();
 let m=v.match(/^#?([0-9a-f]{3})$/);if(m)return '#'+m[1].split('').map(c=>c+c).join('');
 m=v.match(/^#?([0-9a-f]{6})$/);if(m)return '#'+m[1];
 m=v.match(/^(?:rgb\s*\()?\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*\)?$/);
 if(m){const n=m.slice(1).map(Number);if(n.every(x=>x<=255))return '#'+n.map(x=>x.toString(16).padStart(2,'0')).join('');}
 return null;
}
const toRgb=h=>`rgb(${parseInt(h.slice(1,3),16)}, ${parseInt(h.slice(3,5),16)}, ${parseInt(h.slice(5,7),16)})`;
function applyBg(hex){document.body.style.background=hex;document.documentElement.style.setProperty('--page-bg',hex);const intro=document.getElementById('intro');if(intro)intro.style.background=hex;}
function savedBg(){try{return parseColor(localStorage.getItem(BG_KEY))||null;}catch(e){return null;}}
const startBg=savedBg();if(startBg)applyBg(startBg);

function render(){
 toggle.setAttribute('aria-expanded',String(open));
 toggle.textContent=(adminUnlocked?'🔓':'🔒')+' Admin '+(open?'▴':'▾');
 box.hidden=!open;if(!open)return;
 if(!adminUnlocked){
  box.innerHTML=`<form class="adminLock" id="adminLock" autocomplete="off"><label class="slabel" for="adminPass">Password</label>
   <input id="adminPass" class="pfield" type="password" autocomplete="current-password" placeholder="Admin password">
   <button class="btn small" type="submit">Unlock</button><span class="snote" id="adminMsg"></span></form>`;
  const f=box.querySelector('#adminLock'),inp=box.querySelector('#adminPass');setTimeout(()=>inp.focus(),20);
  f.onsubmit=async e=>{e.preventDefault();if(!inp.value)return;
   const ok=window.EtsyHQ?await window.EtsyHQ.checkPassword(inp.value,false):false;
   if(ok){adminUnlocked=true;render();}else{inp.value='';box.querySelector('#adminMsg').textContent='Wrong password.';inp.focus();}};
  return;
 }
 const cur=savedBg()||DEFAULT_BG;
 box.innerHTML=`<div class="adminRow"><span class="slabel">Background color</span>
   <input id="bgPicker" type="color" value="${cur}" aria-label="Pick a background color">
   <input id="bgText" class="pfield" value="${toRgb(cur)}" placeholder="rgb(248, 239, 237) or #f8efed" aria-label="RGB or hex color code">
   <button id="bgApply" class="btn small">Apply</button><button id="bgReset" class="btn small">Reset</button>
   <span class="snote" id="bgMsg"></span></div>
  <div class="adminRow"><span class="snote">Saved in this browser. </span><button id="adminLockBtn" class="btn small">🔒 Lock admin</button></div>`;
 const picker=box.querySelector('#bgPicker'),txt=box.querySelector('#bgText'),msg=box.querySelector('#bgMsg');
 const set=hex=>{applyBg(hex);try{localStorage.setItem(BG_KEY,hex);}catch(e){}picker.value=hex;txt.value=toRgb(hex);msg.textContent='Saved '+hex;};
 picker.oninput=()=>{applyBg(picker.value);txt.value=toRgb(picker.value);};
 picker.onchange=()=>set(picker.value);
 const apply=()=>{const hex=parseColor(txt.value);if(!hex){msg.textContent='Use rgb(r, g, b), r,g,b or #rrggbb.';return;}set(hex);};
 box.querySelector('#bgApply').onclick=apply;txt.onkeydown=e=>{if(e.key==='Enter')apply();};
 box.querySelector('#bgReset').onclick=()=>{try{localStorage.removeItem(BG_KEY);}catch(e){}applyBg(DEFAULT_BG);picker.value=DEFAULT_BG;txt.value=toRgb(DEFAULT_BG);msg.textContent='Back to the default';};
 box.querySelector('#adminLockBtn').onclick=()=>{adminUnlocked=false;render();};
}
toggle.onclick=()=>{open=!open;if(open&&!adminUnlocked&&window.EtsyHQ&&window.EtsyHQ.isUnlocked())adminUnlocked=true;render();};
window.HoneyAdmin={parseColor,applyBg};
render();
})();
