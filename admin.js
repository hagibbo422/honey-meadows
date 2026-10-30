// Admin area inside Settings. Locked with the same password as the Headquarters dashboard.
// Controls: colour settings (page background, map border), saved in this browser.
// To add another colour control, add an entry to COLORS.
(()=>{
'use strict';
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
// Darker shade of a colour (for the border's drop edge).
const shade=(h,f)=>'#'+[1,3,5].map(i=>Math.round(parseInt(h.slice(i,i+2),16)*f).toString(16).padStart(2,'0')).join('');

const COLORS=[
 {id:'bg',label:'Background color',key:'honeyMeadows.admin.bg.v1',def:'#f8efed',
  apply:hex=>{document.body.style.background=hex;document.documentElement.style.setProperty('--page-bg',hex);const intro=document.getElementById('intro');if(intro)intro.style.background=hex;}},
 {id:'border',label:'Map border color',key:'honeyMeadows.admin.border.v1',def:'#7b4fa0',
  apply:hex=>{const r=document.documentElement.style;r.setProperty('--map-border',hex);r.setProperty('--map-border-dark',shade(hex,.62));}}
];
const saved=c=>{try{return parseColor(localStorage.getItem(c.key))||null;}catch(e){return null;}};
COLORS.forEach(c=>{const v=saved(c);if(v)c.apply(v);});

function colorRow(c){
 const cur=saved(c)||c.def,row=document.createElement('div');row.className='adminRow';
 row.innerHTML=`<span class="slabel">${c.label}</span>
  <input class="adminPick" type="color" value="${cur}" aria-label="Pick ${c.label.toLowerCase()}">
  <input class="pfield adminText" value="${toRgb(cur)}" placeholder="rgb(r, g, b) or #hex" aria-label="${c.label} RGB or hex code">
  <button class="btn small adminApply">Apply</button><button class="btn small adminReset">Reset</button>
  <span class="snote adminMsg"></span>`;
 const picker=row.querySelector('.adminPick'),txt=row.querySelector('.adminText'),msg=row.querySelector('.adminMsg');
 const set=hex=>{c.apply(hex);try{localStorage.setItem(c.key,hex);}catch(e){}picker.value=hex;txt.value=toRgb(hex);msg.textContent='Saved '+hex;};
 picker.oninput=()=>{c.apply(picker.value);txt.value=toRgb(picker.value);};
 picker.onchange=()=>set(picker.value);
 const apply=()=>{const hex=parseColor(txt.value);if(!hex){msg.textContent='Use rgb(r, g, b), r,g,b or #rrggbb.';return;}set(hex);};
 row.querySelector('.adminApply').onclick=apply;txt.onkeydown=e=>{if(e.key==='Enter')apply();};
 row.querySelector('.adminReset').onclick=()=>{try{localStorage.removeItem(c.key);}catch(e){}c.apply(c.def);picker.value=c.def;txt.value=toRgb(c.def);msg.textContent='Back to the default';};
 return row;
}

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
 box.replaceChildren(...COLORS.map(colorRow));
 const foot=document.createElement('div');foot.className='adminRow';
 foot.innerHTML=`<span class="snote">Saved in this browser.</span><button id="adminLockBtn" class="btn small">🔒 Lock admin</button>`;
 box.append(foot);
 box.querySelector('#adminLockBtn').onclick=()=>{adminUnlocked=false;render();};
}
toggle.onclick=()=>{open=!open;if(open&&!adminUnlocked&&window.EtsyHQ&&window.EtsyHQ.isUnlocked())adminUnlocked=true;render();};
window.HoneyAdmin={parseColor,colors:COLORS};
render();
})();
