// Books house = catalog of every nail set in the Etsy shop.
// Click Books in town to open it. Etsy listings come from catalog-data.js (a snapshot of the shop).
// "Add nails" lets you add your own sets with an uploaded photo; "Edit" changes any set.
// Your additions and edits are saved in this browser (IndexedDB), with Export / Import for backups.
(()=>{
'use strict';
const DATA=window.HONEY_MEADOWS_CATALOG||{items:[]};
const view=document.getElementById('stationView');
const titleEl=document.getElementById('stationTitle'),subEl=document.getElementById('stationSubtitle'),body=document.getElementById('stationBody');
const backBtn=document.getElementById('backHQ');
const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const money=n=>Number.isFinite(+n)&&n!==''&&n!=null?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(+n):'';

// ---------- storage (IndexedDB, falls back to memory) ----------
const DB_NAME='honeyMeadowsCatalog',STORE='kv',KEY='state';
let saved={manual:[],overrides:{},hidden:[]};
function idb(){return new Promise((res,rej)=>{if(!window.indexedDB)return rej(new Error('no indexedDB'));const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
async function load(){try{const db=await idb();const v=await new Promise((res,rej)=>{const t=db.transaction(STORE).objectStore(STORE).get(KEY);t.onsuccess=()=>res(t.result);t.onerror=()=>rej(t.error);});if(v)saved={manual:[],overrides:{},hidden:[],...v};}catch(e){storageNote='Saving isn’t available in this browser, so changes last until you close the page.';}}
async function persist(){try{const db=await idb();await new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(saved,KEY);t.oncomplete=res;t.onerror=()=>rej(t.error);});}catch(e){storageNote='Couldn’t save to this browser — export a backup so you don’t lose changes.';}}
let storageNote='';const ready=load();

// ---------- data ----------
function allItems(){
 const etsy=DATA.items.filter(i=>!saved.hidden.includes(i.id)).map(i=>({...i,...(saved.overrides[i.id]||{}),source:'etsy',edited:!!saved.overrides[i.id]}));
 const manual=saved.manual.map(i=>({...i,source:'manual'}));
 return [...manual,...etsy];
}
const findItem=id=>allItems().find(i=>i.id===id);
const shortTitle=i=>i.name||String(i.title||'').split(/\s[|,]\s|,\s/)[0];

// Shrink an uploaded photo so it stores well (max 900px, JPEG).
function readPhoto(file){
 return new Promise((res,rej)=>{
  const fr=new FileReader();fr.onerror=()=>rej(fr.error);
  fr.onload=()=>{const img=new Image();img.onerror=()=>rej(new Error('That file isn’t an image.'));img.onload=()=>{
   const k=Math.min(1,900/Math.max(img.width,img.height)),cv=document.createElement('canvas');cv.width=Math.round(img.width*k);cv.height=Math.round(img.height*k);
   cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);res(cv.toDataURL('image/jpeg',.85));};img.src=fr.result;};
  fr.readAsDataURL(file);
 });
}

// ---------- views ----------
let isOpen=false,mode='grid',current=null,query='';
function header(){const eb=document.querySelector('.stationTop .eyebrow');if(eb)eb.textContent='🍯 HONEY MEADOWS • BOOKS';titleEl.textContent='Books • Nail Catalog';subEl.textContent='Every set from Honey Meadows Nails Co.';}
function priceHtml(i){
 const p=money(i.price);if(!p)return '<span class="smallDim">No price</span>';
 const o=+i.originalPrice>+i.price?` <s class="smallDim">${money(i.originalPrice)}</s>`:'';
 return `<b>${i.priceFrom?'from ':''}${p}</b>${o}`;
}
function photoHtml(i,cls){return i.image?`<img class="${cls}" src="${esc(i.image)}" alt="${esc(shortTitle(i))}" loading="lazy" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'${cls} noPhoto',textContent:'💅'}))">`:`<div class="${cls} noPhoto">💅</div>`;}

function renderGrid(){
 const q=query.trim().toLowerCase();
 const items=allItems().filter(i=>!q||[i.title,i.name,i.description].join(' ').toLowerCase().includes(q));
 const total=allItems().length,manualN=saved.manual.length;
 body.innerHTML=`<div class="rowFlex catBar">
   <input id="catSearch" class="catSearch" type="search" placeholder="Search sets…" value="${esc(query)}" aria-label="Search the catalog">
   <button id="catAdd">＋ Add nails</button>
   <span class="smallDim catCount">${total} set${total===1?'':'s'} • ${total-manualN} from Etsy${manualN?` • ${manualN} added by you`:''}</span>
  </div>
  ${storageNote?`<p class="helpText">⚠ ${esc(storageNote)}</p>`:''}
  <div class="catGrid">${items.map(i=>`<button class="catCard" data-id="${esc(i.id)}">${photoHtml(i,'catPhoto')}<span class="catName">${esc(shortTitle(i))}</span><span class="catPrice">${priceHtml(i)}</span>${i.source==='manual'?'<span class="catTag">Added by you</span>':''}</button>`).join('')||'<p class="helpText">No sets match that search.</p>'}</div>
  <p class="smallDim catFoot">Etsy listings as of ${esc(DATA.updated||'—')} • <a href="${esc(DATA.shopUrl||'#')}" target="_blank" rel="noopener">Open the shop on Etsy</a> • <button id="catExport" class="linkBtn">Export backup</button> • <label class="linkBtn">Import backup<input id="catImport" type="file" accept="application/json" hidden></label></p>`;
 const s=body.querySelector('#catSearch');s.oninput=e=>{query=e.target.value;const pos=s.selectionStart;renderGrid();const n=body.querySelector('#catSearch');n.focus();n.setSelectionRange(pos,pos);};
 body.querySelector('#catAdd').onclick=()=>{mode='edit';current=null;render();};
 body.querySelectorAll('.catCard').forEach(b=>b.onclick=()=>{mode='detail';current=b.dataset.id;render();});
 body.querySelector('#catExport').onclick=exportBackup;
 body.querySelector('#catImport').onchange=e=>importBackup(e.target.files[0]);
}

function renderDetail(){
 const i=findItem(current);if(!i){mode='grid';return renderGrid();}
 body.innerHTML=`<p><button id="catBack" class="secondary">← All sets</button></p>
  <div class="catDetail">
   <div>${photoHtml(i,'catBig')}</div>
   <div class="dashCard">
    <p class="eyebrow" style="color:#7a6a4e">${i.source==='manual'?'ADDED BY YOU':'ETSY LISTING'}${i.edited?' • EDITED':''}</p>
    <h3 style="font-size:24px">${esc(shortTitle(i))}</h3>
    <p class="catPriceBig">${priceHtml(i)}</p>
    <p><b>Title</b><br>${esc(i.title||'')}</p>
    <p><b>Description</b><br>${esc(i.description||'No description yet.').replace(/\n/g,'<br>')}</p>
    <p class="rowFlex">${i.url?`<a class="catLink" href="${esc(i.url)}" target="_blank" rel="noopener">View on Etsy ↗</a>`:''}<button id="catEdit">✎ Edit</button>
     ${i.source==='manual'?'<button id="catDelete" class="danger">Delete</button>':i.edited?'<button id="catReset" class="secondary">Undo my edits</button>':''}</p>
   </div>
  </div>`;
 body.querySelector('#catBack').onclick=()=>{mode='grid';render();};
 body.querySelector('#catEdit').onclick=()=>{mode='edit';render();};
 const del=body.querySelector('#catDelete');if(del)del.onclick=async()=>{saved.manual=saved.manual.filter(m=>m.id!==i.id);await persist();mode='grid';render();};
 const rst=body.querySelector('#catReset');if(rst)rst.onclick=async()=>{delete saved.overrides[i.id];await persist();render();};
}

function renderEdit(){
 const i=current?findItem(current):null,isNew=!i;
 const v=i||{name:'',title:'',price:'',originalPrice:'',description:'',image:'',url:''};
 body.innerHTML=`<p><button id="catCancel" class="secondary">← Cancel</button></p>
  <div class="catDetail">
   <div><div id="catPreview">${photoHtml(v,'catBig')}</div>
    <label class="field" style="margin-top:10px;color:#f1deb8">Upload a photo<input id="fPhoto" type="file" accept="image/*"></label>
    <label class="field" style="margin-top:8px;color:#f1deb8">…or paste a photo link<input id="fImage" type="url" value="${v.image&&!String(v.image).startsWith('data:')?esc(v.image):''}" placeholder="https://…"></label></div>
   <div class="dashCard">
    <h3>${isNew?'Add a nail set':'Edit '+esc(shortTitle(v))}</h3>
    <div class="fieldRow"><label class="field">Set name<input id="fName" value="${esc(v.name||'')}" placeholder="e.g. Honey Glaze"></label></div>
    <div class="fieldRow" style="margin-top:8px"><label class="field">Title<input id="fTitle" value="${esc(v.title||'')}" placeholder="Listing title"></label></div>
    <div class="fieldRow" style="margin-top:8px"><label class="field">Price ($)<input id="fPrice" type="number" min="0" step="0.01" value="${esc(v.price??'')}"></label><label class="field">Original price ($, optional)<input id="fOrig" type="number" min="0" step="0.01" value="${esc(v.originalPrice??'')}"></label></div>
    <div class="fieldRow" style="margin-top:8px"><label class="field">Description<textarea id="fDesc">${esc(v.description||'')}</textarea></label></div>
    <div class="fieldRow" style="margin-top:8px"><label class="field">Etsy link (optional)<input id="fUrl" type="url" value="${esc(v.url||'')}" placeholder="https://www.etsy.com/listing/…"></label></div>
    <p class="rowFlex" style="margin-top:12px"><button id="catSave">💾 Save</button><span id="catMsg" class="smallDim"></span></p>
   </div>
  </div>`;
 let photo=v.image||'';
 const preview=()=>{body.querySelector('#catPreview').innerHTML=photoHtml({image:photo,name:'Preview'},'catBig');};
 body.querySelector('#fPhoto').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{photo=await readPhoto(f);body.querySelector('#fImage').value='';preview();}catch(err){body.querySelector('#catMsg').textContent=err.message;}};
 body.querySelector('#fImage').oninput=e=>{photo=e.target.value.trim();preview();};
 body.querySelector('#catCancel').onclick=()=>{mode=isNew?'grid':'detail';render();};
 body.querySelector('#catSave').onclick=async()=>{
  const get=id=>body.querySelector(id).value.trim();
  const rec={name:get('#fName'),title:get('#fTitle'),price:get('#fPrice')===''?'':+get('#fPrice'),originalPrice:get('#fOrig')===''?'':+get('#fOrig'),description:body.querySelector('#fDesc').value.trim(),url:get('#fUrl'),image:photo};
  if(!rec.name&&!rec.title){body.querySelector('#catMsg').textContent='Give it a name or a title.';return;}
  if(isNew){rec.id='m'+Date.now().toString(36);saved.manual.unshift(rec);current=rec.id;}
  else if(i.source==='manual'){saved.manual=saved.manual.map(m=>m.id===i.id?{...m,...rec}:m);}
  else{saved.overrides[i.id]=rec;}
  await persist();mode='detail';render();
 };
}

function exportBackup(){
 const blob=new Blob([JSON.stringify({app:'Honey Meadows catalog',exported:new Date().toISOString(),...saved},null,1)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='honey-meadows-catalog-backup.json';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}
async function importBackup(file){
 if(!file)return;
 try{const d=JSON.parse(await file.text());saved={manual:Array.isArray(d.manual)?d.manual:[],overrides:d.overrides&&typeof d.overrides==='object'?d.overrides:{},hidden:Array.isArray(d.hidden)?d.hidden:[]};await persist();storageNote='';}
 catch(e){storageNote='That backup file couldn’t be read.';}
 render();
}

function render(){if(!isOpen)return;header();({grid:renderGrid,detail:renderDetail,edit:renderEdit}[mode]||renderGrid)();view.scrollTop=0;}
async function open(){
 isOpen=true;mode='grid';current=null;view.classList.remove('hidden');
 const tip=document.getElementById('tip');if(tip)tip.style.display='none';
 backBtn.textContent='← Back to town';backBtn.onclick=close;
 header();body.innerHTML='<p class="helpText">Opening the catalog…</p>';
 await ready;render();backBtn.focus();
}
function close(){
 isOpen=false;view.classList.add('hidden');
 const tip=document.getElementById('tip');if(tip)tip.style.display='';
 document.getElementById('game')?.focus();
}
function back(){if(mode==='edit'&&current){mode='detail';render();}else if(mode!=='grid'){mode='grid';render();}else close();}
window.BooksCatalog={open,close,back,allItems,get isOpen(){return isOpen;},get saved(){return saved;}};
})();
