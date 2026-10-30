// Headquarters = Annie's Etsy dashboard.
// Click Headquarters in town to open it. Data comes from the "Etsy Sales sheet" Google Sheet
// (filled by the Make.com scenario), published to the web as CSV. Set the link in game-data.js.
(()=>{
'use strict';
const cfg=window.HONEY_MEADOWS_GAME||{};
let CSV_URL=String(cfg.etsySheetCsvUrl||'').trim();
// Completed / Not completed boxes are hidden until Make updates column G when an order ships.
const SHOW_STATUS=cfg.etsyShowOrderStatus===true;
const CACHE_KEY='honeyMeadows.etsySales.v1';
const ZONE='America/Chicago';
const REFRESH_MS=5*60e3;
const view=document.getElementById('stationView');
const titleEl=document.getElementById('stationTitle'),subEl=document.getElementById('stationSubtitle'),body=document.getElementById('stationBody');
const backBtn=document.getElementById('backHQ');

const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

// Small CSV parser that handles quoted fields, commas and line breaks inside quotes.
function parseCSV(text){
 const rows=[];let row=[],field='',q=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(q){if(ch==='"'){if(text[i+1]==='"'){field+='"';i++;}else q=false;}else field+=ch;}
  else if(ch==='"')q=true;
  else if(ch===','){row.push(field);field='';}
  else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(field);rows.push(row);row=[];field='';}
  else field+=ch;
 }
 if(field!==''||row.length){row.push(field);rows.push(row);}
 return rows.filter(r=>r.some(v=>v.trim()!==''));
}

const findCol=(headers,...names)=>headers.findIndex(h=>names.some(n=>h===n));
// Etsy sends prices as whole cents (2495 = $24.95). A price with no decimal point is read as cents.
const toPrice=v=>{const raw=String(v??'').trim();const n=toNumber(raw);if(!Number.isFinite(n))return NaN;return /^-?\d+$/.test(raw.replace(/[$,\s]|USD/gi,''))?n/100:n;};
const toNumber=v=>{const s=String(v??'').replace(/[^0-9.\-]/g,'');if(!s||!/\d/.test(s)||/[{}]/.test(String(v)))return NaN;return Number(s);};
const DONE=/^(true|yes|y|1|completed?|shipped|delivered|fulfilled)$/i;

// Turns sheet rows into the four headline numbers plus a recent-orders list.
function summarize(rows){
 if(!rows.length)return {orders:0,items:0,completed:null,open:null,revenue:null,currency:'USD',recent:[],warnings:['The sheet is empty.']};
 const headers=rows[0].map(h=>h.trim().toLowerCase());
 const col={
  date:findCol(headers,'date','order date','created'),
  id:findCol(headers,'receipt id','receipt','order id','order'),
  item:findCol(headers,'item','title','product'),
  qty:findCol(headers,'quantity','qty'),
  price:findCol(headers,'price','amount','total','revenue'),
  cur:findCol(headers,'currency','currency code'),
  status:findCol(headers,'status','is shipped','completed','is completed','order status'),
  // Column G = Etsy "Shipped timestamp" (header optional). Filled in = completed, blank = not completed.
  shipped:(()=>{const i=findCol(headers,'shipped timestamp','shipped','shipped date','shipped at');return i>=0?i:6;})()
 };
 const warnings=[];
 const orders=new Map();let items=0,priceOk=0,priceBad=0,currency='';
 rows.slice(1).forEach((r,i)=>{
  const id=(col.id>=0&&r[col.id]?.trim())||'row'+i;
  const qty=col.qty>=0?(toNumber(r[col.qty])||1):1;
  const price=col.price>=0?toPrice(r[col.price]):NaN;
  if(Number.isFinite(price))priceOk++;else priceBad++;
  if(col.cur>=0&&r[col.cur]?.trim())currency=r[col.cur].trim().toUpperCase();
  items+=qty;
  const o=orders.get(id)||{id,date:col.date>=0?r[col.date]:'',items:[],qty:0,total:0,priced:true,status:''};
  o.items.push(col.item>=0?r[col.item]:'');o.qty+=qty;
  if(Number.isFinite(price))o.total+=price*qty;else o.priced=false;
  if(col.status>=0&&r[col.status]?.trim())o.status=r[col.status].trim();
  if(r[col.shipped]?.trim())o.shippedAt=r[col.shipped].trim();
  orders.set(id,o);
 });
 const list=[...orders.values()].sort((a,b)=>new Date(b.date)-new Date(a.date));
 list.forEach(o=>{o.done=!!o.shippedAt||(col.status>=0&&DONE.test(o.status));});
 const completed=list.filter(o=>o.done).length,open=list.length-completed;
 let revenue=null;
 if(priceOk&&!priceBad)revenue=list.reduce((s,o)=>s+o.total,0);
 else if(priceBad)warnings.push(priceOk?`${priceBad} row(s) have no usable price, so revenue only counts the others.`:'The Price column doesn’t contain numbers yet (Make is writing its formula as text), so revenue can’t be added up.');
 if(priceOk&&priceBad)revenue=list.reduce((s,o)=>s+o.total,0);
 return {orders:list.length,items,completed,open,revenue,currency:currency||'USD',recent:list.slice(0,8),warnings};
}

const money=(n,cur)=>{try{return new Intl.NumberFormat('en-US',{style:'currency',currency:cur||'USD'}).format(n);}catch(e){return '$'+n.toFixed(2);}};
const fmtDay=d=>{const t=new Date(d);return isNaN(t)?esc(d):new Intl.DateTimeFormat('en-US',{timeZone:ZONE,month:'short',day:'numeric'}).format(t);};
const fmtWhen=iso=>iso?new Intl.DateTimeFormat('en-US',{timeZone:ZONE,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(iso)):'never';

let state={summary:null,updatedAt:null,error:null,loading:false};
try{const c=JSON.parse(localStorage.getItem(CACHE_KEY)||'null');if(c&&c.summary)state={...state,...c};}catch(e){}

// Pages opened straight from a file (file://) can't use fetch() on Google's CSV link
// (the browser blocks it), so we also read the sheet through Google's Visualization
// endpoint as a <script> (JSONP), which works from a file. That needs the sheet set to
// "Anyone with the link can view".
let SHEET_ID=String(cfg.etsySheetId||'').trim();
function cellText(c){
 if(!c||c.v==null)return '';
 const m=typeof c.v==='string'&&c.v.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
 if(m)return new Date(Date.UTC(+m[1],+m[2],+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0))).toISOString();
 return String(c.v);
}
function loadViaScript(){
 return new Promise((resolve,reject)=>{
  const cb='__etsyHQ'+Date.now()+Math.floor(Math.random()*1e6),s=document.createElement('script');
  const done=()=>{delete window[cb];s.remove();clearTimeout(t);};
  const t=setTimeout(()=>{done();reject(new Error('Google Sheets did not answer.'));},15000);
  window[cb]=d=>{done();
   if(!d||d.status==='error'){const why=d&&d.errors&&d.errors[0];
    reject(new Error(why&&why.reason==='access_denied'?'The sheet isn’t viewable by link yet: in Google Sheets, Share → General access → “Anyone with the link” (Viewer).':'Google Sheets error: '+(why&&why.message||'unknown')));return;}
   const cols=d.table.cols.map(c=>c.label||'');
   resolve([cols,...d.table.rows.map(r=>cols.map((_,i)=>cellText(r.c&&r.c[i])))]);
  };
  s.onerror=()=>{done();reject(new Error('Couldn’t reach Google Sheets (offline?).'));};
  s.src=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(SHEET_ID)}/gviz/tq?headers=1&tqx=responseHandler:${cb}&_=${Date.now()}`;
  document.head.appendChild(s);
 });
}
async function loadViaFetch(){
 const r=await fetch(CSV_URL+(CSV_URL.includes('?')?'&':'?')+'_='+Date.now(),{cache:'no-store'});
 if(!r.ok)throw new Error('Google Sheets answered '+r.status);
 const text=await r.text();
 if(/^\s*</.test(text))throw new Error('That link returned a web page, not CSV. Use File → Share → Publish to web → CSV.');
 return parseCSV(text);
}
async function loadRows(){
 const fromFile=location.protocol==='file:';
 if(SHEET_ID&&(fromFile||!CSV_URL))return loadViaScript();
 try{return await loadViaFetch();}catch(e){if(SHEET_ID)return loadViaScript();throw e;}
}
async function refresh(){
 if(!CSV_URL&&!SHEET_ID){render();return;}
 state.loading=true;render();
 try{
  state.summary=summarize(await loadRows());state.updatedAt=new Date().toISOString();state.error=null;
  try{localStorage.setItem(CACHE_KEY,JSON.stringify({summary:state.summary,updatedAt:state.updatedAt}));}catch(e){}
 }catch(e){state.error=String(e.message||e);}
 state.loading=false;render();
}

function kpi(label,value,sub){return `<div class="dashCard"><h3>${esc(label)}</h3><div class="bigNum">${value}</div>${sub?`<p class="smallDim">${sub}</p>`:''}</div>`;}
function render(){
 if(!isOpen)return;
 if(!unlocked){showLock();return;}
 const eb=document.querySelector('.stationTop .eyebrow');if(eb)eb.textContent='🍯 HONEY MEADOWS • HEADQUARTERS';
 titleEl.textContent='Headquarters';
 subEl.textContent='Annie’s Etsy shop • Sales command center';
 if(!CSV_URL&&!SHEET_ID){
  body.innerHTML=`<div class="dashGrid"><div class="dashCard full"><h3>🔗 Link the Etsy Sales sheet</h3>
  <p>Headquarters reads the <b>Etsy Sales sheet</b> that Make.com fills in. To connect it:</p>
  <p>1. Open the sheet in Google Sheets → <b>File → Share → Publish to web</b>.<br>2. Pick <b>Sheet1</b> and <b>Comma-separated values (.csv)</b>, then <b>Publish</b>.<br>3. Copy the link and paste it into <code>etsySheetCsvUrl</code> in <code>game-data.js</code>, then reload.</p>
  <p class="smallDim">Anyone who has that link can read the sheet (dates, items, prices — no buyer names or addresses).</p></div></div>`;
  return;
 }
 const s=state.summary;
 const pill=state.error?`<span class="clockMode" style="background:#7a3b2e;border-color:#c98a6b">⚠ ${esc(state.error)}${s?' • showing last saved numbers':''}</span>`
  :`<span class="clockMode">● Live from the Etsy Sales sheet • updated ${esc(fmtWhen(state.updatedAt))}${state.loading?' • refreshing…':''}</span>`;
 if(!s){body.innerHTML=`<p>${pill}</p><p class="helpText">${state.loading?'Loading sales…':'No data yet.'}</p>`;return;}
 const dash='—';
 const rows=s.recent.map(o=>`<li><span><b>${esc(fmtDay(o.date))}</b> · ${esc(o.items.join(', ')).slice(0,140)}${o.qty>1?` <span class="smallDim">×${o.qty}</span>`:''}</span><span>${o.priced?esc(money(o.total,s.currency)):dash}${!SHOW_STATUS?'':' · '+(o.done?`✅ Shipped${o.shippedAt?' '+esc(fmtDay(o.shippedAt)):''}`:'📦 Not shipped')}</span></li>`).join('');
 body.innerHTML=`<p class="rowFlex">${pill}<button id="etsyRefresh" class="secondary">↻ Refresh</button>${SECRET?'<button id="etsyLock" class="secondary">🔒 Lock</button>':''}</p>
  <div class="dashGrid ${SHOW_STATUS?'kpiGrid':'kpi2'}">
   ${kpi('🛍️ Total sales',s.orders,`${s.items} item${s.items===1?'':'s'} sold`)}
   ${SHOW_STATUS?kpi('📦 Not completed',s.open==null?dash:s.open,'no shipped date yet')+kpi('✅ Completed',s.completed==null?dash:s.completed,'shipped'):''}
   ${kpi('💰 Total revenue',s.revenue==null?dash:esc(money(s.revenue,s.currency)),s.revenue==null?'price not filled in yet':'before Etsy fees')}
   <div class="dashCard full"><h3>Recent orders</h3>${rows?`<ul class="eventList">${rows}</ul>`:'<p class="smallDim">No orders yet.</p>'}</div>
   ${s.warnings.length?`<div class="dashCard full"><h3>⚙️ Sheet notes</h3>${s.warnings.map(w=>`<p>${esc(w)}</p>`).join('')}</div>`:''}
  </div>`;
 const rb=document.getElementById('etsyRefresh');if(rb)rb.onclick=refresh;
 const lb=document.getElementById('etsyLock');if(lb)lb.onclick=lockNow;
}

// ---------- password lock ----------
// The sheet links in game-data.js are encrypted (AES-GCM, key from the password via PBKDF2).
// The right password decrypts them; a wrong one can't. Unlocking is remembered until the tab
// is closed, or on this device if "Remember me" is ticked.
const SECRET=cfg.etsySecret||null,UNLOCK_KEY='honeyMeadows.hqUnlock.v1';
let unlocked=!SECRET;
const b64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function decryptSecret(password){
 const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(SECRET.salt),iterations:SECRET.iterations,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['decrypt']);
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(SECRET.iv)},key,b64(SECRET.data));
 return JSON.parse(new TextDecoder().decode(plain));
}
function applyLinks(l){SHEET_ID=String(l.etsySheetId||'').trim();CSV_URL=String(l.etsySheetCsvUrl||'').trim();unlocked=true;}
function restoreUnlock(){
 if(unlocked)return;
 for(const store of [sessionStorage,localStorage]){try{const v=JSON.parse(store.getItem(UNLOCK_KEY)||'null');if(v&&v.data===SECRET.data&&v.links){applyLinks(v.links);return;}}catch(e){}}
}
function lockNow(){try{sessionStorage.removeItem(UNLOCK_KEY);localStorage.removeItem(UNLOCK_KEY);}catch(e){}unlocked=false;SHEET_ID='';CSV_URL='';clearInterval(timer);showLock();}
function showLock(msg){
 const eb=document.querySelector('.stationTop .eyebrow');if(eb)eb.textContent='🍯 HONEY MEADOWS • HEADQUARTERS';
 titleEl.textContent='Headquarters';subEl.textContent='Annie’s Etsy shop • Sales command center';
 body.innerHTML=`<div class="lockWrap"><form class="lockBox dashCard" id="hqLock" autocomplete="off">
   <div class="lockIcon">🔒</div><h3>Headquarters is locked</h3><p class="smallDim">Enter the password to see the shop’s sales.</p>
   <input id="hqPass" type="password" placeholder="Password" aria-label="Password" autocomplete="current-password">
   <label class="lockRemember"><input id="hqRemember" type="checkbox"> Remember me on this device</label>
   <p id="hqMsg" class="lockMsg">${msg?esc(msg):''}</p>
   <button type="submit" id="hqGo">Unlock</button></form></div>`;
 const f=body.querySelector('#hqLock'),inp=body.querySelector('#hqPass');
 setTimeout(()=>inp.focus(),30);
 f.onsubmit=async e=>{
  e.preventDefault();const pw=inp.value;if(!pw)return;
  const btn=body.querySelector('#hqGo');btn.disabled=true;btn.textContent='Checking…';
  try{
   const links=await decryptSecret(pw);applyLinks(links);
   const rec=JSON.stringify({data:SECRET.data,links});
   try{sessionStorage.setItem(UNLOCK_KEY,rec);if(body.querySelector('#hqRemember').checked)localStorage.setItem(UNLOCK_KEY,rec);}catch(err){}
   startDashboard();
  }catch(err){
   btn.disabled=false;btn.textContent='Unlock';inp.value='';inp.focus();
   body.querySelector('#hqMsg').textContent=(window.crypto&&crypto.subtle)?'Wrong password — try again.':'This browser can’t unlock Headquarters here. Open the online version instead.';
   f.classList.remove('shake');void f.offsetWidth;f.classList.add('shake');
  }
 };
}
function startDashboard(){render();refresh();clearInterval(timer);timer=setInterval(refresh,REFRESH_MS);}

let isOpen=false,timer=null;
function open(){
 isOpen=true;view.classList.remove('hidden');
 const tip=document.getElementById('tip');if(tip)tip.style.display='none';
 backBtn.textContent='← Back to town';backBtn.onclick=close;
 restoreUnlock();
 if(unlocked)startDashboard();else showLock();
 backBtn.focus();
}
function close(){
 isOpen=false;view.classList.add('hidden');clearInterval(timer);
 const tip=document.getElementById('tip');if(tip)tip.style.display='';
 document.getElementById('game')?.focus();
}
// Shared password check (used by the Admin area too). Same password as Headquarters.
async function checkPassword(pw,remember){
 if(!SECRET)return true;
 try{const links=await decryptSecret(pw);applyLinks(links);const rec=JSON.stringify({data:SECRET.data,links});try{sessionStorage.setItem(UNLOCK_KEY,rec);if(remember)localStorage.setItem(UNLOCK_KEY,rec);}catch(e){}return true;}
 catch(e){return false;}
}
function isUnlocked(){restoreUnlock();return unlocked;}
window.EtsyHQ={open,close,refresh,lock:lockNow,checkPassword,isUnlocked,get unlocked(){return unlocked;},parseCSV,summarize,get isOpen(){return isOpen;},get state(){return state;}};
})();
