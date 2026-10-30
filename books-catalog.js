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

// ---------- shared catalog sheet ----------
// When catalogSheetId is set (game-data.js), the "Honey Meadows Catalog" Google Sheet is the
// shared source for everyone: edit the sheet and every copy of the game shows the change.
// The sheet must be shared "Anyone with the link → Viewer". catalog-data.js is the offline fallback.
const GCFG=window.HONEY_MEADOWS_GAME||{};
const SHEET=String(GCFG.catalogSheetId||'').trim();
const SHEET_EDIT=SHEET?`https://docs.google.com/spreadsheets/d/${SHEET}/edit`:'';
const SHEET_CACHE='honeyMeadows.catalogSheet.v1';
let sheetItems=null,sheetError='',sheetUpdated=null;
try{const c=JSON.parse(localStorage.getItem(SHEET_CACHE)||'null');if(c&&Array.isArray(c.items)){sheetItems=c.items;sheetUpdated=c.at;}}catch(e){}
// Google Drive share links -> a direct image link the page can show.
function photoUrl(u){
 u=String(u||'').trim();
 const m=u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/)||u.match(/drive\.google\.com\/thumbnail\?id=([\w-]{20,})/);
 return m?`https://drive.google.com/thumbnail?id=${m[1]}&sz=w1000`:u;
}
const num=v=>{const n=parseFloat(String(v??'').replace(/[^0-9.\-]/g,''));return Number.isFinite(n)?n:'';};
function sheetCell(c){return c&&c.v!=null?(c.f&&typeof c.v==='number'&&/[$]/.test(c.f)?c.v:c.v):'';}
function loadSheet(){
 return new Promise((resolve,reject)=>{
  const cb='__hmCat'+Date.now()+Math.floor(Math.random()*1e6),sc=document.createElement('script');
  const done=()=>{delete window[cb];sc.remove();clearTimeout(t);};
  const t=setTimeout(()=>{done();reject(new Error('The Catalog sheet didn’t answer.'));},15000);
  window[cb]=d=>{done();
   if(!d||d.status==='error'){const w=d&&d.errors&&d.errors[0];reject(new Error(w&&w.reason==='access_denied'?'The Catalog sheet isn’t shared yet (Share → Anyone with the link → Viewer).':'Catalog sheet error: '+(w&&w.message||'unknown')));return;}
   const cols=d.table.cols.map(c=>String(c.label||'').trim().toLowerCase());
   const at=(...n)=>cols.findIndex(c=>n.includes(c));
   const ix={show:at('show'),name:at('name','set name'),title:at('title'),price:at('price'),orig:at('original price','was'),desc:at('description'),photo:at('photo','photo url','image'),url:at('etsy link','link','url'),id:at('id')};
   const get=(r,i)=>i>=0?sheetCell(r.c&&r.c[i]):'';
   const items=d.table.rows.map((r,n)=>({
    show:String(get(r,ix.show)).trim().toLowerCase(),
    id:String(get(r,ix.id)||'row'+(n+2)),name:String(get(r,ix.name)).trim(),title:String(get(r,ix.title)).trim(),
    price:num(get(r,ix.price)),originalPrice:num(get(r,ix.orig)),description:String(get(r,ix.desc)),
    image:photoUrl(get(r,ix.photo)),url:String(get(r,ix.url)).trim(),source:'sheet'
   })).filter(i=>(i.name||i.title)&&!['no','n','false','hide','hidden','0'].includes(i.show));
   resolve(items);
  };
  sc.onerror=()=>{done();reject(new Error('Couldn’t reach Google Sheets (offline?).'));};
  sc.src=`https://docs.google.com/spreadsheets/d/${encodeURIComponent(SHEET)}/gviz/tq?headers=1&tqx=responseHandler:${cb}&_=${Date.now()}`;
  document.head.appendChild(sc);
 });
}
async function refreshSheet(){
 if(!SHEET)return;
 try{sheetItems=await loadSheet();sheetUpdated=new Date().toISOString();sheetError='';try{localStorage.setItem(SHEET_CACHE,JSON.stringify({items:sheetItems,at:sheetUpdated}));}catch(e){}}
 catch(e){sheetError=String(e.message||e);}
 if(isOpen&&mode==='grid')render();
}

// ---------- data ----------
function allItems(){
 if(SHEET&&sheetItems)return sheetItems;
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
   ${SHEET?`<a class="catLink" href="${esc(SHEET_EDIT)}" target="_blank" rel="noopener">✎ Add / edit in the Catalog sheet ↗</a><button id="catRefresh" class="secondary">↻ Refresh</button>`:'<button id="catAdd">＋ Add nails</button>'}
   <span class="smallDim catCount">${total} set${total===1?'':'s'}${SHEET?'':` • ${total-manualN} from Etsy${manualN?` • ${manualN} added by you`:''}`}</span>
  </div>
  ${SHEET&&sheetError?`<p class="helpText">⚠ ${esc(sheetError)}${sheetItems?' Showing the last copy it loaded.':' Showing the built-in list.'}</p>`:''}${!SHEET&&storageNote?`<p class="helpText">⚠ ${esc(storageNote)}</p>`:''}
  <div class="catGrid">${items.map(i=>`<button class="catCard" data-id="${esc(i.id)}">${photoHtml(i,'catPhoto')}<span class="catName">${esc(shortTitle(i))}</span><span class="catPrice">${priceHtml(i)}</span>${i.source==='manual'?'<span class="catTag">Added by you</span>':''}</button>`).join('')||'<p class="helpText">No sets match that search.</p>'}</div>
  <p class="smallDim catFoot">${SHEET?`From the shared Catalog sheet${sheetUpdated?' • loaded '+esc(new Date(sheetUpdated).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})):''}`:`Etsy listings as of ${esc(DATA.updated||'—')}`} • <a href="${esc(DATA.shopUrl||'#')}" target="_blank" rel="noopener">Open the shop on Etsy</a>${SHEET?'':' • <button id="catExport" class="linkBtn">Export backup</button> • <label class="linkBtn">Import backup<input id="catImport" type="file" accept="application/json" hidden></label>'}</p>`;
 const s=body.querySelector('#catSearch');s.oninput=e=>{query=e.target.value;const pos=s.selectionStart;renderGrid();const n=body.querySelector('#catSearch');n.focus();n.setSelectionRange(pos,pos);};
 const add=body.querySelector('#catAdd');if(add)add.onclick=()=>{mode='edit';current=null;render();};
 const rf=body.querySelector('#catRefresh');if(rf)rf.onclick=async()=>{rf.disabled=true;rf.textContent='Refreshing…';await refreshSheet();render();};
 body.querySelectorAll('.catCard').forEach(b=>b.onclick=()=>{mode='detail';current=b.dataset.id;render();});
 const ex=body.querySelector('#catExport');if(ex)ex.onclick=exportBackup;
 const im=body.querySelector('#catImport');if(im)im.onchange=e=>importBackup(e.target.files[0]);
}

// Detail page drawn on assets/books-detail.png (1536 × 1024, unmodified). Boxes are image pixels.
const DETAIL={back:[216,232,150,54],photo:[262,330,440,296],name:[803,366,483,44],price:[818,428,165,35],orig:[1000,428,90,35],
 title:[803,514,483,45],desc:[803,608,483,81],etsy:[801,711,205,55],edit:[1024,711,216,55]};
function renderDetail(){
 const i=findItem(current);if(!i){mode='grid';return renderShelf();}
 view.classList.add('booksArt');
 const p=money(i.price),o=+i.originalPrice>+i.price?money(i.originalPrice):'';
 const editBtn=SHEET?`<a class="bdEdit" href="${esc(SHEET_EDIT)}" target="_blank" rel="noopener" style="${pct(DETAIL.edit)}" aria-label="Edit in sheet (opens Google Sheets)"></a>`
  :`<button class="bdEdit" id="catEdit" style="${pct(DETAIL.edit)}" aria-label="Edit this set"></button>`;
 body.innerHTML=`<div class="bkShelf bkDetail">
   <button class="bdBack" id="catBack" style="${pct(DETAIL.back)}" aria-label="Return to all nail sets"></button>
   <div class="bdPhoto" style="${pct(DETAIL.photo)}">${photoHtml(i,'bdImg')}</div>
   <h3 class="bdName" style="${pct(DETAIL.name)}">${esc(shortTitle(i))}</h3>
   <div class="bdPrice" style="${pct(DETAIL.price)}">${p?(i.priceFrom?'from ':'')+esc(p.replace(/^\$/,'')):'—'}</div>
   <div class="bdOrig" style="${pct(DETAIL.orig)}">${o?`<s>${esc(o)}</s>`:''}</div>
   <div class="bdTitle" tabindex="0" style="${pct(DETAIL.title)}">${esc(i.title||'')}</div>
   <div class="bdDesc" style="${pct(DETAIL.desc)}" tabindex="0">${esc(i.description||'No description yet.').replace(/\n/g,'<br>')}</div>
   ${i.url?`<a class="bdEtsy" href="${esc(i.url)}" target="_blank" rel="noopener" style="${pct(DETAIL.etsy)}" aria-label="View on Etsy (opens Etsy)"></a>`:`<span class="bdEtsy bdOff" style="${pct(DETAIL.etsy)}" title="No Etsy link for this set"></span>`}
   ${editBtn}
  </div>`;
 body.querySelector('#catBack').onclick=()=>{mode='grid';render();};
 const ed=body.querySelector('#catEdit');if(ed)ed.onclick=()=>{mode='edit';render();};
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


// ---------- Bookshelf view (assets/books-shelf.png) ----------
// The illustrated shelf is shown untouched; live content sits in transparent boxes placed on
// its 8 frames. Boxes are in the image's own pixels (1536 × 1024) and converted to %, so the
// layout scales with the picture. 8 sets per page; search filters the whole catalog.
const SHELF={w:1536,h:1024,
 title:[540,58,460,92],search:[345,213,468,44],edit:[884,213,200,44],refresh:[1160,213,116,44],
 frames:[295,550,800,1052],rows:[{img:306,imgH:172,plate:489},{img:596,imgH:182,plate:788}],
 prev:[452,926,222,58],page:[682,926,172,58],next:[862,926,222,58]};
const PER_PAGE=8;let page=0;
const pct=([x,y,w,h])=>`left:${x/SHELF.w*100}%;top:${y/SHELF.h*100}%;width:${w/SHELF.w*100}%;height:${h/SHELF.h*100}%`;
function filtered(){const q=query.trim().toLowerCase();return allItems().filter(i=>!q||[i.title,i.name,i.description].join(' ').toLowerCase().includes(q));}
function renderShelf(keepFocus){
 view.classList.add('booksArt');
 const items=filtered(),pages=Math.max(1,Math.ceil(items.length/PER_PAGE));
 page=Math.min(Math.max(0,page),pages-1);
 const shown=items.slice(page*PER_PAGE,page*PER_PAGE+PER_PAGE);
 const status=SHEET&&sheetError?`⚠ ${sheetError}`:(query.trim()?`${items.length} match${items.length===1?'':'es'} for “${query.trim()}”`:`${allItems().length} sets${SHEET?' • shared Catalog sheet':''}`);
 let slots='';
 for(let n=0;n<PER_PAGE;n++){
  const it=shown[n],row=SHELF.rows[n<4?0:1],x=SHELF.frames[n%4];
  if(!it){continue;}
  slots+=`<button class="bkSlot" data-id="${esc(it.id)}" style="${pct([x+10,row.img,208,row.imgH])}" aria-label="${esc(shortTitle(it))}">${photoHtml(it,'bkPhoto')}</button>`+
   `<button class="bkPlate" data-id="${esc(it.id)}" tabindex="-1" style="${pct([x+27,row.plate,176,38])}"><span class="bkName">${esc(shortTitle(it))}</span><span class="bkPrice">${priceHtml(it)}</span></button>`;
 }
 const editBtn=SHEET?`<a class="bkEdit" href="${esc(SHEET_EDIT)}" target="_blank" rel="noopener" style="${pct(SHELF.edit)}">Edit sheet ↗</a>`:`<button class="bkEdit" id="catAdd" style="${pct(SHELF.edit)}">Add nails</button>`;
 body.innerHTML=`<div class="bkShelf">
   <div class="bkTitle" style="${pct(SHELF.title)}"><b>Books • Nail Catalog</b><span class="bkStatus${SHEET&&sheetError?' bkErr':''}">${esc(status)}</span></div>
   <input id="catSearch" class="bkSearch" type="search" placeholder="Search sets…" value="${esc(query)}" aria-label="Search the catalog" style="${pct(SHELF.search)}">
   ${editBtn}
   ${SHEET?`<button class="bkRefresh" id="catRefresh" style="${pct(SHELF.refresh)}">Refresh</button>`:''}
   ${slots}
   ${!items.length?`<div class="bkEmpty" style="${pct([295,380,985,60])}">No sets match that search.</div>`:''}
   <button class="bkNav" id="bkPrev" style="${pct(SHELF.prev)}" ${page===0?'disabled':''}>← Previous Page</button>
   <div class="bkPage" style="${pct(SHELF.page)}">Page ${page+1} of ${pages}</div>
   <button class="bkNav" id="bkNext" style="${pct(SHELF.next)}" ${page>=pages-1?'disabled':''}>Next Page →</button>
  </div>`;
 const sInp=body.querySelector('#catSearch');
 sInp.oninput=e=>{query=e.target.value;page=0;const pos=sInp.selectionStart;renderShelf();const n=body.querySelector('#catSearch');n.focus();n.setSelectionRange(pos,pos);};
 if(keepFocus==='search'){sInp.focus();}
 const add=body.querySelector('#catAdd');if(add)add.onclick=()=>{mode='edit';current=null;render();};
 const rf=body.querySelector('#catRefresh');if(rf)rf.onclick=async()=>{rf.disabled=true;rf.textContent='Loading…';await refreshSheet();render();};
 body.querySelectorAll('.bkSlot,.bkPlate').forEach(b=>b.onclick=()=>{mode='detail';current=b.dataset.id;render();});
 body.querySelector('#bkPrev').onclick=()=>turn(-1);body.querySelector('#bkNext').onclick=()=>turn(1);
}
function turn(d){
 const pages=Math.max(1,Math.ceil(filtered().length/PER_PAGE)),next=Math.min(Math.max(0,page+d),pages-1);
 if(next===page)return;page=next;renderShelf();
 const sh=body.querySelector('.bkShelf');if(sh){sh.classList.remove('flipL','flipR');void sh.offsetWidth;sh.classList.add(d>0?'flipR':'flipL');}
 const b=body.querySelector(d>0?'#bkNext':'#bkPrev');if(b&&!b.disabled)b.focus();
}
document.addEventListener('keydown',e=>{
 if(!isOpen||mode!=='grid'||e.target.matches('input,textarea,select'))return;
 if(e.key==='ArrowRight'){turn(1);e.preventDefault();}else if(e.key==='ArrowLeft'){turn(-1);e.preventDefault();}
});
function render(){if(!isOpen)return;header();view.classList.remove('booksArt');({grid:renderShelf,detail:renderDetail,edit:renderEdit}[mode]||renderShelf)();view.scrollTop=0;}
async function open(){
 isOpen=true;mode='grid';current=null;page=0;view.classList.remove('hidden');
 const tip=document.getElementById('tip');if(tip)tip.style.display='none';
 backBtn.textContent='← Back to town';backBtn.onclick=close;
 header();body.innerHTML='<p class="helpText">Opening the catalog…</p>';
 await ready;render();backBtn.focus();refreshSheet();
}
function close(){
 isOpen=false;view.classList.add('hidden');view.classList.remove('booksArt');
 const tip=document.getElementById('tip');if(tip)tip.style.display='';
 document.getElementById('game')?.focus();
}
function back(){if(mode==='edit'&&current){mode='detail';render();}else if(mode!=='grid'){mode='grid';render();}else close();}
window.BooksCatalog={open,close,back,allItems,get isOpen(){return isOpen;},get saved(){return saved;}};
})();
