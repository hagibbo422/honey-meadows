// Research building boards (TikTok, Pinterest, Marketing), drawn on illustrated backgrounds.
// Each section in research-data.js names a `background` image and a `layout` (overlay map below).
// The artwork is shown untouched; live text sits in transparent, absolutely-positioned boxes.
// Boxes are in each image's own pixels and converted to %, so everything scales with the picture.
// Open with ResearchBoard.open('tiktok' | 'pinterest' | 'marketing').
(()=>{
'use strict';
const DATA=window.HONEY_MEADOWS_RESEARCH||{sections:{}};
const ORDER=Object.keys(DATA.sections);
const view=document.getElementById('stationView'),body=document.getElementById('stationBody');
const titleEl=document.getElementById('stationTitle'),subEl=document.getElementById('stationSubtitle');
const DONE_KEY='honeyMeadows.researchIdeas.v1';

// Overlay maps. [left, top, width, height] in image pixels.
const LAYOUTS={
 wide:{w:768,h:510, // tiktok + pinterest backgrounds
  back:[630,44,116,27],tabs:{tiktok:[222,105,89,28],pinterest:[320,105,88,28],marketing:[416,105,90,28]},
  cols:[[155,120],[293,116],[427,118],[564,120]],rows:[[226,40],[303,40]],
  selling:[136,398,160,50],ideas:[326,398,160,50],sources:[519,398,150,50]},
 marketing:{w:842,h:506,
  back:[671,41,126,28],tabs:{tiktok:[261,103,84,29],pinterest:[352,103,88,29],marketing:[449,103,98,29]},
  cols:[[189,122],[328,120],[466,121],[606,121]],rows:[[225,40],[302,42]],
  selling:[166,397,170,46],ideas:[366,397,160,46],sources:[557,397,160,46]}
};
let isOpen=false,current=ORDER[0];
const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
function loadDone(){try{return JSON.parse(localStorage.getItem(DONE_KEY)||'{}')||{};}catch(e){return {};}}
function saveDone(d){try{localStorage.setItem(DONE_KEY,JSON.stringify(d));}catch(e){}}

function place(node,L,[x,y,w,h]){node.style.cssText+=`;left:${x/L.w*100}%;top:${y/L.h*100}%;width:${w/L.w*100}%;height:${h/L.h*100}%`;return node;}

function showCard(sec,t,root){
 const old=root.querySelector('.rbPop');if(old)old.remove();
 const pop=el('div','rbPop');pop.setAttribute('role','dialog');pop.setAttribute('aria-label',t.name);
 const card=el('div','rbPopCard');
 const x=el('button','rbPopX','✕');x.type='button';x.setAttribute('aria-label','Close');x.onclick=()=>pop.remove();
 card.append(x,el('h3',null,t.name),el('p',null,t.what));
 if(t.inShop){const p=el('p','rbPopShop');p.append(el('b',null,'In your shop: '),document.createTextNode(t.inShop));card.append(p);}
 const src=(sec.sources||[])[t.source];if(src){const a=el('a',null,'Source: '+src.title+' ↗');a.href=src.url;a.target='_blank';a.rel='noopener';card.append(a);}
 pop.append(card);pop.onclick=e=>{if(e.target===pop)pop.remove();};
 root.append(pop);x.focus();
}

function render(){
 if(!isOpen)return;
 const sec=DATA.sections[current];if(!sec){close();return;}
 const L=LAYOUTS[sec.layout]||LAYOUTS.wide;
 const blocks=(sec.blocks||(DATA.defaults&&DATA.defaults.blocks)||[]).map(b=>b.type);
 titleEl.textContent='Research';subEl.textContent='';
 const root=el('section','rbArt');root.setAttribute('aria-label',(sec.title||current)+' research');
 root.style.backgroundImage=`url(${sec.background})`;root.style.aspectRatio=`${L.w}/${L.h}`;
 const add=(n,box)=>{root.append(place(n,L,box));return n;};

 // Painted "Back to Research" and tabs become real buttons.
 const back=add(el('button','rbHit'),L.back);back.type='button';back.setAttribute('aria-label','Back to Research');back.onclick=close;
 ORDER.forEach(id=>{const box=L.tabs[id];if(!box)return;const b=add(el('button','rbHit rbTab'),box);b.type='button';b.setAttribute('role','tab');
  b.setAttribute('aria-label',DATA.sections[id].title);b.setAttribute('aria-selected',String(id===current));b.onclick=()=>{if(id!==current){current=id;render();}};});

 // Trending now: up to 8 cards in the painted frames; click a card for the full note.
 if(blocks.includes('trends')){
  const trends=(sec.trends||[]).slice(0,8);
  trends.forEach((t,n)=>{
   const [cx,cw]=L.cols[n%4],[ry,rh]=L.rows[n<4?0:1];
   const b=add(el('button','rbCard'),[cx,ry,cw,rh]);b.type='button';
   b.append(el('span','rbCardName',t.name),el('span','rbCardText',t.what));
   if(t.inShop)b.append(el('span','rbCardShop','✿ '+t.inShop));
   b.onclick=()=>showCard(sec,t,root);
  });
 }
 if(blocks.includes('selling')){const box=add(el('div','rbPanel'),L.selling);box.tabIndex=0;const ul=el('ul','rbList');(sec.selling||[]).forEach(s=>ul.append(el('li',null,s)));box.append(ul);}
 if(blocks.includes('ideas')){
  const box=add(el('div','rbPanel'),L.ideas);const done=loadDone();const ul=el('ul','rbIdeas');
  (sec.ideas||[]).forEach(idea=>{const key=current+'::'+idea,li=el('li'),lab=el('label'),cb=el('input');cb.type='checkbox';cb.checked=!!done[key];
   cb.onchange=()=>{const d=loadDone();if(cb.checked)d[key]=1;else delete d[key];saveDone(d);li.classList.toggle('done',cb.checked);};
   li.classList.toggle('done',cb.checked);lab.append(cb,el('span',null,idea));li.append(lab);ul.append(li);});
  box.append(ul);
 }
 if(blocks.includes('sources')){const box=add(el('div','rbPanel'),L.sources);const ul=el('ul','rbSources');
  (sec.sources||[]).forEach(s=>{const li=el('li'),a=el('a',null,s.title);a.href=s.url;a.target='_blank';a.rel='noopener';li.append(a);ul.append(li);});box.append(ul);}

 body.replaceChildren(root);view.scrollTop=0;
}
function open(section){
 if(section&&DATA.sections[section])current=section;
 if(window.EtsyHQ&&window.EtsyHQ.isOpen)window.EtsyHQ.close();
 if(window.BooksCatalog&&window.BooksCatalog.isOpen)window.BooksCatalog.close();
 isOpen=true;view.classList.add('researchArt');view.classList.remove('hidden');
 render();const r=body.querySelector('.rbArt');if(r){r.tabIndex=-1;r.focus({preventScroll:true});}
}
function close(){isOpen=false;view.classList.remove('researchArt');view.classList.add('hidden');document.getElementById('game')?.focus();}
function escape(){const pop=body.querySelector('.rbPop');if(pop){pop.remove();return;}close();}
window.ResearchBoard={open,close:escape,get isOpen(){return isOpen;},get current(){return current;}};
})();
