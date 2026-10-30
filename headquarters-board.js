/**
 * Honey Meadows Cottage Bulletin Board — zero dependencies, no generated screenshot.
 * ES module API: mountHeadquartersBoard({target, data, onRefresh, onNavigate, onLock, currency, locale})
 * Returned controller: .update(data), .setLoading(boolean), .setError(string), .destroy(), .element
 * All content is rendered as DOM text nodes (no untrusted HTML insertion).
 */
const EXAMPLE = {
  shopName: "Annie’s Etsy shop",
  subtitle: 'Sales command center',
  totalSales: 3,
  totalRevenue: 77.74,
  revenueNote: 'before Etsy fees',
  salesNote: '3 items sold',
  updatedAt: '2026-10-30T11:41:00',
  recentOrders: [
    {id:'order-1',date:'2026-10-23',title:'Golden Hour Pearls | Pearl Chrome Press On Nails | 3D Pearl Nails | Ivory Bridal Nails | Iridescent Handmade Gel Nails',total:27.84},
    {id:'order-2',date:'2026-10-20',title:'Handmade Press On Nails | Sage Green French Tips, Orange Bows, Pearls (Cottagecore Fall Set)',total:24.95},
    {id:'order-3',date:'2026-10-20',title:'Handmade Golden Honey Tortoiseshell Press-On Nails | Gel Polish, Almond Shape (Fall Set)',total:24.95}
  ]
};
const NAV = [
  ['dashboard','⌂','Dashboard'],['orders','▣','Orders'],['products','◇','Products'],
  ['analytics','▥','Analytics'],['messages','✉','Messages'],['settings','⚙','Settings']
];
const elem=(tag,cls,txt)=>{const el=document.createElement(tag); if(cls)el.className=cls; if(txt!==undefined)el.textContent=String(txt); return el;};
export function mountHeadquartersBoard({target,data=EXAMPLE,onRefresh,onNavigate,onLock,locale='en-US',currency='USD'}={}){
  if(typeof target==='string')target=document.querySelector(target);
  if(!target)throw new Error('mountHeadquartersBoard: target element not found');
  let state={...EXAMPLE,...data}; let isLoading=false;
  const root=elem('section','hm-board'); root.setAttribute('aria-label','Honey Meadows sales headquarters');
  const scene=elem('div','hm-scene'); const layout=elem('div','hm-layout');root.append(scene);scene.append(layout);
  const aside=elem('aside','hm-sidebar');layout.append(aside);
  aside.append(elem('div','hm-sidebar-title','✿ HONEY MEADOWS ✿'));
  const nav=elem('nav','hm-nav');nav.setAttribute('aria-label','Shop navigation');aside.append(nav);
  const navBtns=new Map();
  NAV.forEach(([id,ico,name])=>{const b=elem('button','');b.type='button'; b.setAttribute('data-hm-route',id);const icon=elem('span','hm-ico',ico);icon.setAttribute('aria-hidden','true');b.append(icon,document.createTextNode(name));b.setAttribute('aria-current',id==='dashboard'?'page':'false');b.addEventListener('click',()=>{navBtns.forEach(btn=>btn.setAttribute('aria-current','false'));b.setAttribute('aria-current','page');onNavigate?.(id);});nav.append(b);navBtns.set(id,b);});
  const deco=elem('div','hm-side-decoration');deco.append(elem('span','', '🪴'),elem('span','', 'EST. HONEY MEADOWS'));aside.append(deco);
  const main=elem('div','hm-main');layout.append(main);
  const plaque=elem('header','hm-plaque');plaque.append(elem('span','hm-vine left','🌿'),elem('span','hm-vine right','🌿'));
  plaque.append(elem('h1','','Headquarters'));const subtitle=elem('p');plaque.append(subtitle);main.append(plaque);
  const notices=elem('div','hm-notices');main.append(notices);
  const stat=(name,icon)=>{const card=elem('section','hm-paper');card.append(elem('h2','',icon+' '+name));const val=elem('div','hm-number');const note=elem('div','hm-small');card.append(val,note,elem('span','hm-sprig','🌼'));notices.append(card);return{val,note};};
  const sales=stat('Total sales','🛍️');const revenue=stat('Total revenue','💰');
  const freshness=elem('section','hm-paper hm-freshness');const stamp=elem('div','hm-small');
  const refresh=elem('button','hm-refresh','↻ Refresh');refresh.type='button';refresh.setAttribute('aria-label','Refresh sales dashboard');
  const lock=elem('button','hm-lock','🔒 Lock');lock.type='button';
  const status=elem('div','hm-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  freshness.append(stamp,refresh,lock,status);notices.append(freshness);
  const orderPanel=elem('section','hm-paper hm-orders');const heading=elem('h2','','📜 Recent orders');orderPanel.append(heading);
  const table=elem('table');table.setAttribute('aria-label','Recent Etsy orders');const thead=elem('thead');const headrow=elem('tr');
  ['Date','Order','Total'].forEach((s)=>headrow.append(elem('th','',s)));thead.append(headrow);table.append(thead);
  const tbody=elem('tbody');table.append(tbody);orderPanel.append(table);main.append(orderPanel);
  const bottom=elem('footer','hm-bottom');bottom.append(elem('span','', '✦ A little shop with big dreams ✦'),elem('span','hm-decoration','🌻 🌿 🌼'));main.append(bottom);
  target.append(root);
  const formatMoney=n=>new Intl.NumberFormat(locale,{style:'currency',currency}).format(Number(n)||0);
  const formatDate=value=>{
    if(!value)return 'Not available';
    // Render YYYY-MM-DD as a local calendar date, avoiding UTC off-by-one differences.
    if(/^\d{4}-\d{2}-\d{2}$/.test(value))return new Intl.DateTimeFormat(locale,{month:'short',day:'numeric'}).format(new Date(value+'T12:00:00'));
    const d=new Date(value);return Number.isNaN(d.getTime())?String(value):new Intl.DateTimeFormat(locale,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d);
  };
  const render=()=>{
    subtitle.textContent=(state.shopName||'Your shop')+' • '+(state.subtitle||'Sales command center');
    sales.val.textContent=new Intl.NumberFormat(locale).format(Number(state.totalSales)||0);
    revenue.val.textContent=formatMoney(state.totalRevenue);
    sales.note.textContent=state.salesNote??`${state.totalSales||0} items sold`;
    revenue.note.textContent=state.revenueNote??'before fees';
    stamp.textContent='Last updated\n'+formatDate(state.updatedAt);stamp.style.whiteSpace='pre-line';
    tbody.replaceChildren();
    const orders=Array.isArray(state.recentOrders)?state.recentOrders:[];
    if(!orders.length){const tr=elem('tr');const td=elem('td','hm-empty','No recent orders');td.colSpan=3;tr.append(td);tbody.append(tr);}
    orders.forEach(order=>{const tr=elem('tr');tr.append(elem('td','hm-date',formatDate(order.date)),elem('td','hm-product',order.title??'Untitled order'),elem('td','hm-amount',formatMoney(order.total)));tbody.append(tr);});
    refresh.disabled=isLoading;refresh.textContent=isLoading?'Refreshing…':'↻ Refresh';
  };
  refresh.addEventListener('click',async()=>{
    if(isLoading||typeof onRefresh!=='function')return;
    isLoading=true;status.classList.remove('hm-error');status.textContent='Fetching the latest sales…';render();
    try{const updated=await onRefresh();if(updated&&typeof updated==='object')state={...state,...updated};status.textContent='Sales refreshed';}
    catch(err){status.classList.add('hm-error');status.textContent=err?.message||'Refresh failed';}
    finally{isLoading=false;render();}
  });
  lock.addEventListener('click',()=>onLock?.());
  render();
  return {
    element:root,
    update(next){state={...state,...next};render();},
    getData(){return structuredClone(state);},
    setLoading(v){isLoading=Boolean(v);render();},
    setError(message){status.classList.toggle('hm-error',Boolean(message));status.textContent=message||'';},
    destroy(){root.remove();}
  };
}
export {EXAMPLE as exampleSalesData};
