// Headquarters dashboard drawn directly on the illustrated background (assets/hq-board.png).
// The artwork is shown untouched; transparent, absolutely-positioned boxes put live text onto
// its blank parchment panels. Positions are in the image's own pixels (1536 × 1024) and
// converted to percentages, so everything scales with the picture and keeps its proportions.
// API: HQArtBoard.mount({target, data, onRefresh, onNavigate, onLock}) → {update, setLoading, setStatus, destroy, element}
(()=>{
'use strict';
const W=1536,H=1024;
// [left, top, width, height] in image pixels.
const BOX={
 salesTitle:[440,250,280,34], salesNum:[398,288,320,74], salesNote:[398,362,270,30],
 revTitle:[826,250,280,34],   revNum:[778,288,320,74],   revNote:[778,362,270,30],
 updated:[1148,272,128,84],   refresh:[1150,358,124,42],
 lock:[1312,312,68,88],
 ordersTitle:[402,462,500,38], ordersStatus:[860,466,390,30], orders:[400,502,856,188]
};
const NAV=[['dashboard','Dashboard',292],['orders','Orders',352],['products','Products',413],['analytics','Analytics',474],['messages','Messages',535],['settings','Settings',595]];
const pct=([x,y,w,h])=>`left:${x/W*100}%;top:${y/H*100}%;width:${w/W*100}%;height:${h/H*100}%`;
const el=(tag,cls,box,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(box)e.style.cssText=pct(box);if(text!==undefined)e.textContent=text;return e;};

function mount({target,data={},onRefresh,onNavigate,onLock,locale='en-US',currency='USD',zone='America/Chicago'}={}){
 if(typeof target==='string')target=document.querySelector(target);
 let state={...data},loading=false;
 const root=el('section','hqArt');root.setAttribute('aria-label','Headquarters sales dashboard');
 const add=(e)=>{root.append(e);return e;};

 // Sidebar navigation: invisible buttons over the illustrated slots, with a text label beside each icon.
 const nav=add(el('nav','hqArt-nav'));nav.setAttribute('aria-label','Shop navigation');
 const navBtns=new Map();
 NAV.forEach(([id,label,cy])=>{
  const b=el('button','hqArt-navBtn',[132,cy-28,178,56]);b.type='button';b.dataset.route=id;
  b.append(el('span','hqArt-navLabel',null,label));b.setAttribute('aria-current',id==='dashboard'?'page':'false');
  b.onclick=()=>{navBtns.forEach(x=>x.setAttribute('aria-current','false'));b.setAttribute('aria-current','page');onNavigate&&onNavigate(id,()=>{navBtns.forEach(x=>x.setAttribute('aria-current','false'));navBtns.get('dashboard').setAttribute('aria-current','page');});};
  nav.append(b);navBtns.set(id,b);
 });

 add(el('div','hqArt-label',BOX.salesTitle,'Total sales'));
 const salesNum=add(el('div','hqArt-num',BOX.salesNum));const salesNote=add(el('div','hqArt-note',BOX.salesNote));
 add(el('div','hqArt-label',BOX.revTitle,'Total revenue'));
 const revNum=add(el('div','hqArt-num',BOX.revNum));const revNote=add(el('div','hqArt-note',BOX.revNote));
 const updated=add(el('div','hqArt-updated',BOX.updated));
 const refresh=add(el('button','hqArt-refresh',BOX.refresh));refresh.type='button';refresh.setAttribute('aria-label','Refresh sales');
 const refreshLbl=el('span',null,null,'Refresh');refresh.append(refreshLbl);
 const lock=add(el('button','hqArt-lock',BOX.lock));lock.type='button';lock.title='Lock Headquarters';lock.setAttribute('aria-label','Lock Headquarters');
 lock.append(el('span',null,null,'Lock'));
 add(el('div','hqArt-label hqArt-ordersTitle',BOX.ordersTitle,'Recent orders'));
 const status=add(el('div','hqArt-status',BOX.ordersStatus));status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const ordersBox=add(el('div','hqArt-orders',BOX.orders));
 const table=el('table');table.setAttribute('aria-label','Recent Etsy orders');
 const thead=el('thead'),hr=el('tr');['Date','Order','Total'].forEach(t=>hr.append(el('th',null,null,t)));thead.append(hr);
 const tbody=el('tbody');table.append(thead,tbody);ordersBox.append(table);

 const money=n=>new Intl.NumberFormat(locale,{style:'currency',currency}).format(Number(n)||0);
 const day=v=>{if(!v)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(v))return new Intl.DateTimeFormat(locale,{month:'short',day:'numeric'}).format(new Date(v+'T12:00:00'));const d=new Date(v);return isNaN(d)?String(v):new Intl.DateTimeFormat(locale,{timeZone:zone,month:'short',day:'numeric'}).format(d);};
 const when=v=>{const d=new Date(v);return !v||isNaN(d)?'—':new Intl.DateTimeFormat(locale,{timeZone:zone,month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d);};

 function render(){
  salesNum.textContent=new Intl.NumberFormat(locale).format(Number(state.totalSales)||0);
  salesNote.textContent=state.salesNote||'';
  revNum.textContent=money(state.totalRevenue);
  revNote.textContent=state.revenueNote||'';
  updated.replaceChildren(el('span','hqArt-small',null,'Last updated'),el('span','hqArt-when',null,when(state.updatedAt)));
  refreshLbl.textContent=loading?'Loading…':'Refresh';refresh.disabled=loading;root.classList.toggle('is-loading',loading);
  tbody.replaceChildren();
  const orders=Array.isArray(state.recentOrders)?state.recentOrders:[];
  if(!orders.length){const tr=el('tr'),td=el('td','hqArt-empty',null,loading?'Loading orders…':'No orders yet');td.colSpan=3;tr.append(td);tbody.append(tr);}
  orders.forEach(o=>{const tr=el('tr');tr.append(el('td','hqArt-date',null,day(o.date)),el('td','hqArt-item',null,o.title||'Untitled order'),el('td','hqArt-amt',null,o.total==null?'—':money(o.total)));tbody.append(tr);});
 }
 refresh.onclick=async()=>{
  if(loading||typeof onRefresh!=='function')return;
  loading=true;setStatus('Fetching the latest sales…');render();
  try{const next=await onRefresh();if(next&&typeof next==='object')state={...state,...next};setStatus('Sales refreshed ✓');}
  catch(e){setStatus((e&&e.message)||'Refresh failed',true);}
  finally{loading=false;render();}
 };
 lock.onclick=()=>onLock&&onLock();
 function setStatus(msg,isError){status.textContent=msg||'';status.classList.toggle('is-error',!!isError);}
 target.append(root);render();
 return {element:root,
  update(next){state={...state,...next};render();},
  setLoading(v){loading=!!v;render();},
  setStatus,
  destroy(){root.remove();}};
}
window.HQArtBoard={mount};
})();
