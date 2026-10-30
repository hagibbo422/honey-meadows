// Research building boards (TikTok, Pinterest, Marketing). One shared layout, filled from
// research-data.js. Open with ResearchBoard.open('tiktok' | 'pinterest' | 'marketing').
// Customise per section in research-data.js: title, subtitle, icon, accent, blocks (order + headings).
(()=>{
'use strict';
const DATA=window.HONEY_MEADOWS_RESEARCH||{sections:{}};
const ORDER=Object.keys(DATA.sections);
const view=document.getElementById('stationView'),body=document.getElementById('stationBody');
const titleEl=document.getElementById('stationTitle'),subEl=document.getElementById('stationSubtitle'),backBtn=document.getElementById('backHQ');
const DONE_KEY='honeyMeadows.researchIdeas.v1';
let isOpen=false,current=ORDER[0];
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
function loadDone(){try{return JSON.parse(localStorage.getItem(DONE_KEY)||'{}')||{};}catch(e){return {};}}
function saveDone(d){try{localStorage.setItem(DONE_KEY,JSON.stringify(d));}catch(e){}}
const fmtDate=s=>{const d=new Date(String(s)+'T12:00:00');return isNaN(d)?String(s||''):d.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});};

function blockTrends(sec,heading){
 const wrap=el('section','rb-block');wrap.append(el('h3','rb-h',heading));
 const grid=el('div','rb-trends');
 (sec.trends||[]).forEach(t=>{
  const card=el('article','rb-card');card.append(el('h4','rb-cardTitle',t.name),el('p','rb-text',t.what));
  if(t.inShop){const p=el('p','rb-inshop');p.append(el('b',null,'In your shop: '),document.createTextNode(t.inShop));card.append(p);}
  const src=(sec.sources||[])[t.source];if(src){const a=el('a','rb-src','Source ↗');a.href=src.url;a.target='_blank';a.rel='noopener';card.append(a);}
  grid.append(card);
 });
 wrap.append(grid);return wrap;
}
function blockList(sec,heading,key){
 const wrap=el('section','rb-block rb-paper');wrap.append(el('h3','rb-h',heading));
 const ul=el('ul','rb-list');(sec[key]||[]).forEach(s=>ul.append(el('li',null,s)));wrap.append(ul);return wrap;
}
function blockIdeas(sec,heading,id){
 const wrap=el('section','rb-block rb-paper');wrap.append(el('h3','rb-h',heading));
 const done=loadDone();const ul=el('ul','rb-ideas');
 (sec.ideas||[]).forEach(idea=>{
  const key=id+'::'+idea,li=el('li'),lab=el('label'),cb=el('input');cb.type='checkbox';cb.checked=!!done[key];
  cb.onchange=()=>{const d=loadDone();if(cb.checked)d[key]=1;else delete d[key];saveDone(d);li.classList.toggle('done',cb.checked);};
  li.classList.toggle('done',cb.checked);lab.append(cb,el('span',null,idea));li.append(lab);ul.append(li);
 });
 wrap.append(ul);return wrap;
}
function blockSources(sec,heading){
 const wrap=el('section','rb-block rb-paper');wrap.append(el('h3','rb-h',heading));
 const ul=el('ul','rb-sources');(sec.sources||[]).forEach(s=>{const li=el('li'),a=el('a',null,s.title);a.href=s.url;a.target='_blank';a.rel='noopener';li.append(a);ul.append(li);});
 wrap.append(ul);return wrap;
}

function render(){
 if(!isOpen)return;
 const sec=DATA.sections[current];if(!sec){close();return;}
 const blocks=sec.blocks||(DATA.defaults&&DATA.defaults.blocks)||[];
 const eb=document.querySelector('.stationTop .eyebrow');if(eb)eb.textContent='🍯 HONEY MEADOWS • RESEARCH';
 titleEl.textContent='Research';subEl.textContent='Trends for Honey Meadows Nails Co.';
 const root=el('div','rb');root.style.setProperty('--rb-accent',sec.accent||(DATA.defaults&&DATA.defaults.accent)||'#b4561e');
 // Tabs
 const tabs=el('div','rb-tabs');tabs.setAttribute('role','tablist');
 ORDER.forEach(id=>{const s=DATA.sections[id],b=el('button','rb-tab',`${s.icon||''} ${s.title}`.trim());b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(id===current));b.onclick=()=>{current=id;render();};tabs.append(b);});
 // Header plaque
 const head=el('header','rb-head');head.append(el('div','rb-icon',sec.icon||''));
 const ht=el('div');ht.append(el('h2','rb-title',sec.title),el('p','rb-sub',sec.subtitle||''));head.append(ht);
 head.append(el('div','rb-date','Researched '+fmtDate(sec.researched||DATA.researched)));
 root.append(tabs,head);
 // Blocks render in the order listed; "selling" and "ideas" sit side by side in one row.
 let cols=null;
 blocks.forEach(b=>{
  const h=b.heading||b.type;
  if(b.type==='trends')root.append(blockTrends(sec,h));
  else if(b.type==='selling'||b.type==='ideas'){
   if(!cols){cols=el('div','rb-cols');root.append(cols);}
   cols.append(b.type==='selling'?blockList(sec,h,'selling'):blockIdeas(sec,h,current));
  }
  else if(b.type==='sources')root.append(blockSources(sec,h));
 });
 body.replaceChildren(root);view.scrollTop=0;
}
function open(section){
 if(section&&DATA.sections[section])current=section;
 if(window.EtsyHQ&&window.EtsyHQ.isOpen)window.EtsyHQ.close();
 if(window.BooksCatalog&&window.BooksCatalog.isOpen)window.BooksCatalog.close();
 isOpen=true;view.classList.add('researchView');view.classList.remove('hidden');
 backBtn.textContent='← Back to Research';backBtn.onclick=close;
 render();backBtn.focus();
}
function close(){isOpen=false;view.classList.remove('researchView');view.classList.add('hidden');document.getElementById('game')?.focus();}
window.ResearchBoard={open,close,get isOpen(){return isOpen;},get current(){return current;}};
})();
