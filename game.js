(()=>{
'use strict';
const initialCourt=window.HONEY_MEADOWS_GAME||{};
let courtConfig={opponent:'SAS',scoreMode:'simulation',period:'Q2',clock:'4:12',...initialCourt,score:{home:20,away:16,...initialCourt.score}};
const scoreNumber=v=>Math.max(0,Math.min(999,Math.floor(Number(v)||0)));
courtConfig.score.home=scoreNumber(courtConfig.score.home);courtConfig.score.away=scoreNumber(courtConfig.score.away);

const c=document.getElementById('game');
const g=c.getContext('2d');
g.imageSmoothingEnabled=false;
const T=32, W=36, H=24;
let scene='town', paused=false, showGrid=false, clock=0, hover=null, doorCooldown=0;

const ASSET_URLS=window.HONEY_MEADOWS_ASSETS||{};

const assets={};
function loadAsset(name){
 const image=new Image();let fallback=false;
 image.onerror=()=>{if(!fallback&&ASSET_URLS[name]){fallback=true;image.src=ASSET_URLS[name];}};
 image.src='assets/'+name+'.png';assets[name]=image;return image;
}
for(const name of ['terrain','trees','characters','farm','research','gear','books','coffee','nails','headquarters','player_avatar','companion_avatar']){
  loadAsset(name);
}
for(const name of ['town-tiles','villagers','basketball','room_headquarters','room_farm','room_research','room_nails','room_gear','room_books','room_coffee']){
  loadAsset(name);
}
const ready=name=>assets[name]&&assets[name].complete&&assets[name].naturalWidth>0;
const statusEl=document.getElementById('status');
const tipEl=document.getElementById('tip');
const coordEl=document.getElementById('coord');
const key=(x,y)=>`${x},${y}`;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(x,y)=>Math.abs((x*374761393+y*668265263)^(x*y*1447))>>>0;
const map=Array.from({length:H},()=>Array(W).fill('grass'));
const solid=new Set(), trees=[], flowers=[], fences=[], lamps=[], signs=[], crates=[];
const buildings=[];
const put=(x,y,t)=>{if(x>=0&&x<W&&y>=0&&y<H)map[y][x]=t};
const rect=(x,y,w,h,t)=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)put(xx,yy,t)};
const road=(x,y,w,h,t='stone')=>rect(x,y,w,h,t);
const lock=(x,y)=>solid.add(key(x,y));
const addFence=(x,y)=>{fences.push({x,y}); lock(x,y)};

// V10 walkability/collision layer is separate from the illustrated tile atlas.
// The rendered scene consists of 36 x 24 tiles; only people/buildings/water are animated separately.
road(12,0,2,10);
road(12,6,24,2);
road(13,7,10,9);
road(12,9,3,6);
road(14,14,7,3);
road(16,16,3,8,'bridge');
road(26,20,10,3);
road(9,10,5,3,'dirt');
road(10,11,4,6,'dirt');
road(23,6,13,1);

function building(id,name,x,y,w,h,entrance){
  buildings.push({id,name,x,y,w,h,entrance:{x:entrance[0],y:entrance[1]}});
  for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)lock(xx,yy);
}
building('farm','Farmhouse',3,4,7,6,[6,9.9]);
building('research','Research',14,1,5,5,[16.7,6.1]);
building('gear','Gear Shop',19,1,4,5,[20.5,6.1]);
building('books','Books',23,1,4,5,[24.7,6.1]);
building('coffee','Coffee',27,1,4,5,[29.4,6.1]);
building('nails','Nail Shop',31,1,5,5,[33.4,6.1]);
building('headquarters','Headquarters',26,16,9,5,[30.25,21.2]);
// Court fence, garden fence, large planters, and river are blocking tiles.
for(let y=10;y<=15;y++)for(let x=23;x<=34;x++)lock(x,y);
for(let y=7;y<=8;y++)for(let x=25;x<=31;x++)lock(x,y);
for(let y=11;y<=15;y++)for(let x=2;x<=10;x++)lock(x,y);
for(let y=10;y<=12;y++)for(let x=16;x<=18;x++)lock(x,y);
lock(12,11); // stone well
// Bottom of map is water except for central bridge and headquarters path.
for(let y=17;y<H;y++)for(let x=0;x<W;x++){
  if(x>=16&&x<=18)continue;
  if(x>=25&&y>=20&&y<=22)continue;
  if(x>=19&&x<=24&&y===17)continue;
  if(x>=25&&y===19)continue;
  lock(x,y);
}

// The red boxes in the supplied 940 x 788 markup, mapped to the 1152 x 768 town.
// Keep the screenshot crop separate from game coordinates so the mask is auditable.
const MARKUP_CROP={x:8,y:94,width:922,height:614};
const pathBoxes=[
 [345,94,389,254], [266,253,889,276], [417,253,463,335],
 [383,334,506,353], [383,334,401,435], [488,334,506,435],
 [267,426,522,445], [266,355,282,435], [69,354,282,374],
 [404,440,475,717], [404,694,812,717], [771,613,811,717]
].map(([x1,y1,x2,y2])=>({x:(x1-8)*1152/922,y:(y1-94)*768/614,w:(x2-x1)*1152/922,h:(y2-y1)*768/614}));
function markupPoint(x,y){return {x:(x-8)*1152/922,y:(y-94)*768/614};}
function onMarkedPath(x,y){return x>=0&&x<W*T&&y>=0&&y<H*T&&pathBoxes.some(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);}
function townFootprint(x,y,radius=7){return [-radius,0,radius].every(dx=>[-radius,0,radius].every(dy=>onMarkedPath(x+dx,y+dy)));}
const NAV_STEP=4,navNodes=new Map();
for(let y=2;y<H*T;y+=NAV_STEP)for(let x=2;x<W*T;x+=NAV_STEP)if(townFootprint(x,y))navNodes.set(key(x,y),{x,y});
function nearestPathPoint(point){
 let best=null,distance=Infinity;
 for(const candidate of navNodes.values()){
  const d=(point.x-candidate.x)**2+(point.y-candidate.y)**2;
  if(d<distance){distance=d;best=candidate;}
 }
 return {...best};
}
function navSegment(a,b){
 const count=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));
 for(let i=0;i<=count;i++)if(!townFootprint(a.x+(b.x-a.x)*i/count,a.y+(b.y-a.y)*i/count))return false;
 return true;
}
function townRoute(from,to){
 const a=nearestPathPoint(from),b=nearestPathPoint(to),start=key(a.x,a.y),goal=key(b.x,b.y);
 const queue=[a],seen=new Set([start]),prev=new Map();
 for(let i=0;i<queue.length;i++){
  const p=queue[i],pk=key(p.x,p.y);if(pk===goal)break;
  for(const [dx,dy] of [[0,4],[4,0],[0,-4],[-4,0]]){
   const k=key(p.x+dx,p.y+dy),next=navNodes.get(k);
   if(next&&!seen.has(k)&&navSegment(p,next)){seen.add(k);prev.set(k,pk);queue.push(next);}
  }
 }
 if(!seen.has(goal))throw Error('Disconnected marked walking paths');
 const route=[b];let cursor=goal;
 while(cursor!==start){cursor=prev.get(cursor);route.push(navNodes.get(cursor));}
 return route.reverse();
}
const routes=[
 [[365,145],[365,265],[850,265]],
 [[280,265],[438,265],[438,341],[392,341],[392,435],[496,435],[496,341],[438,341]],
 [[440,465],[440,700],[790,700],[790,630]],
 [[150,365],[274,365],[274,435],[440,435],[440,341],[438,265]]
].map(route=>route.map(p=>markupPoint(...p)));
function routeSteps(waypoints){
 const route=[];
 for(let i=0;i<waypoints.length;i++)route.push(...townRoute(waypoints[i],waypoints[(i+1)%waypoints.length]).slice(i?1:0));
 return route;
}
const doorwayMarkup={farm:[174,365],research:[435,265],gear:[545,265],books:[650,265],coffee:[765,265],nails:[865,265],headquarters:[790,632]};
for(const building of buildings){
 const p=nearestPathPoint(markupPoint(...doorwayMarkup[building.id]));
 building.entrance={x:(p.x-16)/T,y:(p.y-16)/T};
}

const palette=[
  {body:'#b75c48',shirt:'#db906e',hair:'#58372b'},
  {body:'#dfb04b',shirt:'#f0d28c',hair:'#5a402b'},
  {body:'#6888b6',shirt:'#90b3d7',hair:'#4d2e21'},
  {body:'#a16ab4',shirt:'#c8a0db',hair:'#5c3c2c'},
  {body:'#4d8c7a',shirt:'#8fcab8',hair:'#3f3428'},
  {body:'#d9775c',shirt:'#efb093',hair:'#4b2c22'},
  {body:'#5077aa',shirt:'#86aee5',hair:'#3f2e1d'}
];
const npcs=[]; // V19 has no ambient villagers.
const player={...nearestPathPoint(markupPoint(440,465)),dir:'down',phase:0,look:{body:'#f2c2a8',shirt:'#b9d48b',hair:'#b68f6d'},sprite:0};
const keys=new Set();
// Follow the exact collision-tested footpath, retaining a comfortable walking gap.
const companion={x:player.x,y:player.y,dir:'down',phase:0,moving:false};
let followTrail=[], trailLength=0;
const FOLLOW_GAP=42, ACTOR_RADIUS=7;
function actorFits(x,y,inside=scene!=='town'){
  if(!inside)return townFootprint(x,y);
  const valid=(xx,yy)=>!interiorCollision(xx,yy);
  return [-ACTOR_RADIUS,ACTOR_RADIUS].every(dx=>[-ACTOR_RADIUS,ACTOR_RADIUS].every(dy=>valid(x+dx,y+dy)));
}
function segmentFits(a,b,inside=scene!=='town'){
  const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2));
  for(let i=0;i<=n;i++)if(!actorFits(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,inside))return false;
  return true;
}
function resetCompanion(leader){
  // Place beside the entrance on reachable floor, never in a wall or furnishing.
  let start={x:leader.x,y:leader.y};
  for(const [dx,dy] of [[-42,0],[42,0],[0,-42],[0,42],[-24,0],[24,0]]){
    const candidate={x:leader.x+dx,y:leader.y+dy};
    if(segmentFits(candidate,leader)){start=candidate;break;}
  }
  Object.assign(companion,start,{dir:leader.dir,phase:0,moving:false});
  followTrail=[{x:leader.x,y:leader.y}];
  trailLength=Math.hypot(leader.x-start.x,leader.y-start.y);
}
function recordFootstep(leader){
  const last=followTrail[followTrail.length-1]||companion;
  const distance=Math.hypot(leader.x-last.x,leader.y-last.y);
  if(distance>0.00001){followTrail.push({x:leader.x,y:leader.y});trailLength+=distance;}
}
function updateCompanion(dt){
  let budget=Math.min(88*dt,Math.max(0,trailLength-FOLLOW_GAP)),travelled=0;
  while(budget>0.00001&&followTrail.length){
    const next=followTrail[0],dx=next.x-companion.x,dy=next.y-companion.y,d=Math.hypot(dx,dy);
    if(d<0.00001){followTrail.shift();continue;}
    const step=Math.min(d,budget),x=companion.x+dx/d*step,y=companion.y+dy/d*step;
    if(!segmentFits(companion,{x,y}))break;
    companion.x=x;companion.y=y;
    companion.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
    budget-=step;trailLength=Math.max(0,trailLength-step);travelled+=step;
    if(step>=d-0.00001)followTrail.shift();
  }
  companion.moving=travelled>0.00001;
  companion.phase=companion.moving?companion.phase+travelled/9:0;
}


const interiors={
  farm:{name:'Your Farmhouse',wall:'#bc8d6a',floor:'#b48457',rug:'#a95b52',items:[['bed',3,3],['stove',12,3],['table',7,8],['shelf',2,3],['plant',13,9],['sofa',11,8],['counter',3,10]]},
  headquarters:{name:'Headquarters • Main Hub',wall:'#a77856',floor:'#a46f47',rug:'#46766c',items:[['fireplace',8,2],['shelf',2,3],['shelf',13,3],['table',8,8],['board',3,7],['plant',13,9],['desk',12,10],['map',4,10]]},
  research:{name:'Research • Grocery Store',wall:'#b0a16f',floor:'#c5a67a',rug:'#6a9471',items:[['shelf',3,4],['shelf',7,4],['shelf',11,4],['produce',4,8],['produce',11,8],['counter',8,10],['fridge',13,8]]},
  nails:{name:'Nail Shop • Storefront',wall:'#b98192',floor:'#d4a6a0',rug:'#a56d91',items:[['shelf',3,3],['shelf',12,3],['display',4,7],['display',12,7],['counter',8,10],['plant',13,10],['chair',3,10]]},
  gear:{name:'Gear Shop',wall:'#8998a3',floor:'#a48465',rug:'#526f83',items:[['shelf',3,4],['shelf',12,4],['counter',8,9],['display',8,6]]},
  books:{name:'Book Shop',wall:'#b08b69',floor:'#a77c50',rug:'#8b5e42',items:[['shelf',3,3],['shelf',12,3],['shelf',3,8],['table',9,8],['chair',13,10]]},
  coffee:{name:'Coffee Shop',wall:'#a0a67c',floor:'#ad8158',rug:'#9b6553',items:[['counter',8,4],['table',4,9],['table',12,9],['chair',4,11],['chair',12,11]]}
};

const stations=[
  {id:'notes',name:'Journal Shelf',label:'NOTES',tx:13,ty:3,w:2,h:2,emoji:'📔'},
];
let hoveredStation=null,stationOpen=null,selectedDay=localDate(new Date()),calendarMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1);
const stationView=document.getElementById('stationView');
const stationTitle=document.getElementById('stationTitle');
const stationSubtitle=document.getElementById('stationSubtitle');
const stationBody=document.getElementById('stationBody');
const DB_KEY='honey_meadows_v7_dashboard'; // retain saved V7 tasks/calendar/notes
function localDate(d){const yr=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return yr+'-'+m+'-'+day;}
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
function loadDashboard(){
  try{
    const data=JSON.parse(localStorage.getItem(DB_KEY));
    if(data&&Array.isArray(data.tasks)&&Array.isArray(data.events)&&Array.isArray(data.notes))return data;
  }catch(e){}
  return {tasks:[{id:'welcome',text:'Explore the village',done:false},{id:'hq',text:'Visit Headquarters',done:false}],events:[],notes:[{id:'journal',title:'My Journal',body:'Welcome to Honey Meadows! This journal belongs to you.'}]};
}
const dashboard=loadDashboard();
let activeNote=dashboard.notes[0]?.id||null;
function saveDashboard(){try{localStorage.setItem(DB_KEY,JSON.stringify(dashboard));}catch(e){tipEl.textContent='Browser storage is unavailable; changes will last for this session only.';}}
function stationXY(st){return {x:288+(st.tx-1)*T,y:70+(st.ty-2)*T,w:st.w*T,h:st.h*T};}
function drawStations(){
  stations.forEach(st=>{
    const b=stationXY(st),active=hoveredStation===st.id;
    g.save();g.strokeStyle=active?'#fff0a1':'#ddbb73';g.lineWidth=active?4:2;
    g.setLineDash(active?[]:[4,3]);g.strokeRect(b.x-3,b.y-3,b.w+6,b.h+6);g.restore();
    fill(b.x-4,b.y-25,Math.max(b.w,84)+8,22,active?'#f6e0a5':'#4f6044');
    text(st.label,b.x+Math.max(b.w,84)/2,b.y-9,11,active?'#422d20':'#fff0c4');
  });
}
function stationAt(x,y){
  if(scene!=='headquarters'||stationOpen)return null;
  return stations.find(st=>{const b=stationXY(st);return x>=b.x-8&&x<=b.x+b.w+8&&y>=b.y-28&&y<=b.y+b.h+8;})||null;
}
function stationNearPlayer(){
  if(scene!=='headquarters')return null;
  const playerScreenX=288+(indoorPlayer.x-T),playerScreenY=70+(indoorPlayer.y-2*T);
  return stations.find(st=>{const r=stationXY(st),x=clamp(playerScreenX,r.x,r.x+r.w),y=clamp(playerScreenY,r.y,r.y+r.h);return Math.hypot(playerScreenX-x,playerScreenY-y)<45;})||null;
}
function openStation(id){
  if(id!=='notes')return;
  if(scene!=='headquarters')loadInterior('headquarters');
  stationOpen=id;keys.clear();
  stationView.classList.remove('hidden');
  tipEl.style.display='none';
  renderStation();
  document.getElementById('backHQ').focus();
}
function closeStation(){
  stationOpen=null;
  stationView.classList.add('hidden');
  tipEl.style.display='';
  c.focus();
}
function renderStation(){
  stationTitle.textContent='Journal Shelf';
  stationSubtitle.textContent='Keep your ideas and stories in one place.';
  renderNotes();
}
function renderNotes(){
  if(!dashboard.notes.some(n=>n.id===activeNote))activeNote=dashboard.notes[0]?.id||null;
  const note=dashboard.notes.find(n=>n.id===activeNote);
  stationBody.innerHTML=`<div class="dashGrid"><div class="dashCard"><h3>📔 Journal Pages</h3><div class="noteList" id="noteList">${dashboard.notes.map(n=>`<button class="noteTile ${activeNote===n.id?'active':''}" data-id="${escapeHtml(n.id)}">${escapeHtml(n.title||'Untitled')}</button>`).join('')}</div><br><button id="newNote">+ New page</button></div><div class="dashCard wide"><h3>✍️ Write a note</h3>${note?`<div class="field"><label for="noteTitle">Title</label><input id="noteTitle" maxlength="90" value="${escapeHtml(note.title)}"></div><br><div class="field"><label for="noteBody">Your thoughts</label><textarea id="noteBody">${escapeHtml(note.body)}</textarea></div><br><div class="rowFlex"><span class="smallDim" id="saveStatus">Autosaves as you type</span><button class="danger" id="deleteNote">Delete page</button></div>`:'<p>Start a journal page to write notes.</p>'}</div></div>`;
  stationBody.querySelectorAll('.noteTile').forEach(btn=>btn.onclick=()=>{activeNote=btn.dataset.id;renderNotes();});
  stationBody.querySelector('#newNote').onclick=()=>{const id='n'+Date.now()+Math.random().toString(36).slice(2,6);dashboard.notes.push({id,title:'New page',body:''});activeNote=id;saveDashboard();renderNotes();stationBody.querySelector('#noteTitle').focus();};
  if(note){
    stationBody.querySelector('#noteTitle').oninput=e=>{note.title=e.target.value;saveDashboard();};
    stationBody.querySelector('#noteBody').oninput=e=>{note.body=e.target.value;saveDashboard();};
    stationBody.querySelector('#deleteNote').onclick=()=>{dashboard.notes=dashboard.notes.filter(n=>n.id!==activeNote);activeNote=dashboard.notes[0]?.id||null;saveDashboard();renderNotes();};
  }
}
const interiorSolid=new Set();
let indoorPlayer={x:10*T,y:17*T+16,dir:'down',phase:0,look:player.look,sprite:0};
function loadInterior(id){
  if(scene==='court')leaveCourt();
  if(stationOpen)closeStation();
  if(!interiors[id])return;
  keys.clear();doorCooldown=.7;
  scene=id; interiorSolid.clear();
  const room=interiors[id];
  for(const [type,x,y] of room.items){
    const size={bed:[3,2],fireplace:[3,2],table:[3,2],sofa:[3,2],counter:[3,2],desk:[3,2],display:[2,2],produce:[2,2],fridge:[2,2],board:[3,2],map:[2,2],stove:[2,2],chair:[1,1],plant:[2,2],shelf:[2,2]}[type]||[2,2];
    for(let yy=y;yy<y+size[1];yy++)for(let xx=x;xx<x+size[0];xx++)interiorSolid.add(key(xx,yy));
  }
  indoorPlayer={x:10*T,y:17*T+16,dir:'down',phase:0,look:player.look,sprite:0};
  resetCompanion(indoorPlayer);
  statusEl.textContent='🏠 '+room.name;
  tipEl.textContent=id==='headquarters'?'Click a highlighted station or press E/Space nearby • Esc returns outside':'Explore the room • Walk to the exit doorway • Esc returns outside';
}
function leave(){
  if(scene==='court'){leaveCourt();return;}
  const building=buildings.find(b=>b.id===scene);
  if(stationOpen)closeStation();
  scene='town';keys.clear();doorCooldown=.7;
  if(building){
    Object.assign(player,nearestPathPoint({x:building.entrance.x*T+16,y:building.entrance.y*T+16}));
    player.dir='down';player.phase=0;
  }
  resetCompanion(player); statusEl.textContent='🌤️ Spring • Day 3 • Honey Meadows'; tipEl.textContent='WASD / arrows to walk • Press Space or E near doors to enter • Click buildings to walk inside'; }
function interiorCollision(x,y){ const tx=Math.floor(x/T), ty=Math.floor(y/T); return tx<1||tx>15||ty<2||ty>18||interiorSolid.has(key(tx,ty)); }
function canTown(x,y){return onMarkedPath(x,y);}

function fill(x,y,w,h,color){ g.fillStyle=color; g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }
function line(x1,y1,x2,y2,w,color){ g.strokeStyle=color; g.lineWidth=w; g.beginPath(); g.moveTo(Math.round(x1)+.5,Math.round(y1)+.5); g.lineTo(Math.round(x2)+.5,Math.round(y2)+.5); g.stroke(); }
function text(txt,x,y,size=14,color='#fff3cf',align='center'){ g.font=`bold ${size}px Georgia`; g.textAlign=align; g.fillStyle='#3d2a22'; g.fillText(txt,x+1,y+2); g.fillStyle=color; g.fillText(txt,x,y); }

function drawTerrain(type,tx,ty){
  const x=tx*T,y=ty*T,r=rand(tx,ty);
  let idx={grass:r%3,stone:3+r%2,dirt:5+r%2,soil:7,water:8+r%2,bridge:10,court:tx<29?11:12}[type];
  if(ready('terrain')){
    g.drawImage(assets.terrain,idx*T,0,T,T,x,y,T,T);
  }else fill(x,y,T,T,{grass:'#73a450',stone:'#bdaa90',dirt:'#bd915b',soil:'#795039',water:'#317da4',bridge:'#b88d58',court:'#2c74a7'}[type]);
  if(type==='water'){
    const off=((clock*22+tx*13+ty*7)%32)-9;
    fill(x+off,y+12,Math.min(11,32-off),2,'#9de2df');
    fill(x+((off+16)%32),y+26,8,2,'#68bcd2');
  }
}
function drawFlower(f){ const x=f.x*T+10, y=f.y*T+12, bob=Math.sin(clock*3+f.x*.8+f.y*.6)*1.5; fill(x+5,y+10,2,8,'#4e8d44'); const cols=[['#f4b8cb','#f9e5ee'],['#ffd76f','#fff1b8'],['#b7c7ff','#e5ebff']][f.v]; fill(x+2,y+bob,4,4,cols[0]); fill(x+6,y-2+bob,4,4,cols[1]); fill(x+10,y+bob,4,4,cols[0]); }
function drawFence(f){ const x=f.x*T, y=f.y*T; fill(x+2,y+6,5,25,'#785439'); fill(x+25,y+6,5,25,'#785439'); fill(x,y+12,32,5,'#c6a371'); fill(x,y+24,32,5,'#c6a371'); }
function drawLamp(l){ const x=l.x*T+16, y=l.y*T+16; fill(x-2,y-12,4,22,'#6d523e'); fill(x-6,y-16,12,6,'#3f332a'); fill(x-4,y-14,8,8,'#f1d386'); if(Math.sin(clock*2+l.x)>.7){fill(x-10,y-10,20,20,'#f1d38633');} }
function drawSign(s){ const x=s.x*T+4, y=s.y*T+7; fill(x+10,y+8,4,18,'#6b4b30'); fill(x,y,24,12,'#e4cc95'); text(s.label,x+12,y+10,9,'#5b432c'); }
function drawCrate(o){ const x=o.x*T+6, y=o.y*T+8; fill(x,y,18,16,'#93643e'); fill(x+2,y+2,14,12,'#bc8958'); line(x+2,y+8,x+16,y+8,1,'#815432'); }
function drawTree(t){
  const x=t.x*T,y=t.y*T;
  if(ready('trees'))g.drawImage(assets.trees,t.v*48,0,48,72,x-8,y-40,48,72);
  else{fill(x+13,y+17,8,20,'#714c32');fill(x+2,y+3,28,28,'#397f4b');}
}
function drawHouse(b){
  const x=b.x*T,y=b.y*T,w=b.w*T,h=b.h*T,lit=hover===b.id;
  if(ready(b.id)) g.drawImage(assets[b.id],x,y-28,w,h+28);
  else{fill(x+5,y+20,w-10,h-20,b.style.wall);fill(x,y+4,w,35,b.style.roof);}
  text(b.name,x+w/2,y+45,b.name.length>11?12:14,'#4b3826');
  if(lit){
    g.strokeStyle='#fff6a4';g.lineWidth=4;g.strokeRect(x-3,y-20,w+6,h+24);
    fill(x+w/2-52,y+h+4,104,22,'#38563fe8');text('CLICK TO ENTER',x+w/2,y+h+20,12,'#fff1b4');
  }
}
function drawSprite(entity,scale=1){
  const dir=({down:0,left:1,right:2,up:3})[entity.dir||'down'];
  const frame=(Math.floor(entity.phase)%4+4)%4;
  const sprite=entity.sprite===undefined?0:entity.sprite;
  if(ready('characters')){
    g.drawImage(assets.characters,frame*20,(sprite*4+dir)*30,20,30,
      Math.round(entity.x-14*scale),Math.round(entity.y-31*scale),Math.round(28*scale),Math.round(42*scale));
  } else {
    fill(entity.x-6*scale,entity.y-13*scale,12*scale,24*scale,entity.look.body);
    fill(entity.x-5*scale,entity.y-20*scale,10*scale,8*scale,'#e9b589');
  }
}
function drawBasketCourt(){
  const x=23*T,y=9*T,w=12*T,h=7*T;
  fill(x,y,w/2,h,'#2676b0'); fill(x+w/2,y,w/2,h,'#6d7177');
  g.strokeStyle='#f4ecd4'; g.lineWidth=3; g.strokeRect(x+8,y+8,w-16,h-16);
  line(x+w/2,y+8,x+w/2,y+h-8,3,'#f4ecd4');
  g.beginPath(); g.arc(x+w/2,y+h/2,38,0,Math.PI*2); g.stroke();
  fill(x+10,y+h/2-4,22,8,'#f1ecdb'); fill(x+w-32,y+h/2-4,22,8,'#f1ecdb');
  fill(x+10,y+h/2-18,4,36,'#f1ecdb'); fill(x+w-14,y+h/2-18,4,36,'#f1ecdb');
}

const pickup={team:0,phase:0,elapsed:0,score:[courtConfig.score.home,courtConfig.score.away]};
function courtPlayers(){
  const x=23*T, y=9*T, t=clock;
  return [
    {x:x+88+Math.sin(t*.8)*8, y:y+86+Math.cos(t*.9)*3, look:{body:'#2f75bf',shirt:'#82b8ff',hair:'#38271e'}},
    {x:x+149+Math.sin(t*.7+1)*9, y:y+155+Math.cos(t*.8)*2, look:{body:'#2f75bf',shirt:'#82b8ff',hair:'#38271e'}},
    {x:x+206+Math.sin(t*.9+2)*7, y:y+87+Math.cos(t*.7)*2, look:{body:'#2f75bf',shirt:'#82b8ff',hair:'#38271e'}},
    {x:x+269+Math.sin(t*.8+3)*8, y:y+85+Math.cos(t*.6)*2, look:{body:'#414247',shirt:'#d8dbe0',hair:'#33271f'}},
    {x:x+214+Math.sin(t*.7+4)*8, y:y+155+Math.cos(t*.6)*2, look:{body:'#414247',shirt:'#d8dbe0',hair:'#33271f'}},
    {x:x+124+Math.sin(t*.8+5)*9, y:y+120+Math.cos(t*.7)*2, look:{body:'#414247',shirt:'#d8dbe0',hair:'#33271f'}}
  ];
}
function pickupBall(){
  const pts=courtPlayers(), team=pickup.team, seq=team===0?[0,1,2,1]:[3,4,5,4], duration=pickup.phase<3?1.3:2.0, progress=Math.min(1,pickup.elapsed/duration);
  let from,to,arc=0;
  if(pickup.phase<3){ from=pts[seq[pickup.phase]]; to=pts[seq[pickup.phase+1]]; arc=Math.sin(progress*Math.PI)*18; }
  else { from=pts[seq[3]]; to={x:team===0?23*T+12:23*T+12*T-12, y:9*T+112}; arc=Math.sin(progress*Math.PI)*70; }
  return {x:from.x+(to.x-from.x)*progress, y:from.y+(to.y-from.y)*progress-arc};
}
function updatePickup(dt){ pickup.elapsed+=dt; const duration=pickup.phase<3?1.3:2.0; if(pickup.elapsed>=duration){ pickup.elapsed-=duration; if(pickup.phase===3){ if(courtConfig.scoreMode==='simulation')pickup.score[pickup.team]+=2; pickup.team=1-pickup.team; pickup.phase=0;} else pickup.phase++; }}
function drawCourtActors(){
  const players=courtPlayers();
  players.forEach((p,i)=>{ p.dir=i<3?'right':'left'; p.phase=clock*3+i; p.sprite=i<3?7:8; drawSprite(p,1); });
  const ball=pickupBall(); fill(ball.x-5,ball.y-5,10,10,'#e18c34'); line(ball.x-5,ball.y,ball.x+5,ball.y,1,'#4b2d19'); line(ball.x,ball.y-5,ball.x,ball.y+5,1,'#4b2d19');
}
function drawScoreboard(){
  const x=23*T+88,y=9*T-44; fill(x-5,y-5,210,46,'#56432f'); fill(x,y,200,36,'#1d2932'); fill(x+3,y+3,194,2,'#bda27c');
  text('OKC',x+34,y+14,12,'#84c5ff'); text(opponentId,x+166,y+14,12,'#ddd9d2');
  text(String(pickup.score[0]).padStart(2,'0'),x+37,y+31,19,'#ffb971'); text(String(pickup.score[1]).padStart(2,'0'),x+164,y+31,19,'#ffb971');
  text(pickup.phase===3?'SHOT':'PASS',x+101,y+17,11,'#f6df99'); text(pickup.team===0?'◀ OKC':'SAS ▶',x+101,y+31,11,'#f6df99');
}

// Buildings, village art, trees, waterfalls and fences are embedded in a 36x24 tile atlas.
// Drawing individually maintains a fixed tile coordinate system and allows separate collision/actor layers.
function drawTownIllustration(){
  if(ready('town-tiles')){
    const im=courtTextureReady?courtTexture:assets['town-tiles'];
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      g.drawImage(im,x*T,y*T,T,T,x*T,y*T,T,T);
    }
  }else{
    for(let y=0;y<H;y++)for(let x=0;x<W;x++)drawTerrain(map[y][x],x,y);
  }
}
function drawPixelActor(entity,row,kind='villagers',size=1){
  const im=assets[kind];
  if(!ready(kind)){fill(entity.x-5,entity.y-15,11,17,kind==='basketball'?'#416f9e':'#cc945b');return;}
  const frame=Math.abs(Math.floor(entity.phase))%4;
  let width=(kind==='basketball'?31:35)*size, height=(kind==='basketball'?48:52)*size;
  const x=entity.x-width/2, y=entity.y-height+7;
  // Pixel art direction inferred from motion. Existing villagers face forward or backward.
  g.save();
  if(entity.dir==='left'){
    g.translate(Math.round(2*entity.x),0);g.scale(-1,1);
  }
  const sy=row*84;
  g.drawImage(im,frame*52,sy,52,84,Math.round(x),Math.round(y),Math.round(width),Math.round(height));
  g.restore();
}

function drawPlayerAvatar(entity,inside=false){
  const frame=(Math.floor(entity.phase)%4+4)%4;
  const dirRow={down:0,left:1,right:2,up:3}[entity.dir]??0;
  const sw=52, sh=84;
  const drawW=inside?50:46;
  const drawH=inside?80:74;
  const x=entity.x-drawW/2;
  const y=entity.y-drawH+10;
  if(ready('player_avatar')){
    g.drawImage(assets.player_avatar,frame*sw,dirRow*sh,sw,sh,Math.round(x),Math.round(y),drawW,drawH);
  }else{
    drawPixelActor(entity,3,'villagers',inside?1.08:1.02);
  }
}
function drawCompanion(entity,inside=false){
  if(!ready('companion_avatar'))return;
  const image=assets.companion_avatar,sw=image.naturalWidth/4,sh=image.naturalHeight/4;
  const row={down:0,left:1,right:2,up:3}[entity.dir]??0;
  const frame=(entity.moving??companion.moving)?Math.floor(entity.phase)%4:0;
  const w=inside?52:48,h=inside?82:76;
  g.drawImage(image,frame*sw,row*sh,sw,sh,Math.round(entity.x-w/2),Math.round(entity.y-h+10),w,h);
}
function drawParty(leader,follower,inside){
  // Foot position controls depth, including when the companion crosses behind her.
  [{entity:leader,draw:drawPlayerAvatar},{entity:follower,draw:drawCompanion}]
    .sort((a,b)=>a.entity.y-b.entity.y).forEach(actor=>actor.draw(actor.entity,inside));
}
function v8CourtPlayers(){
  const t=clock;
  return [
    {x:800+Math.sin(t*.82)*12,y:400+Math.cos(t*.54)*5,dir:'right',phase:t*6},
    {x:849+Math.sin(t*.77+1)*10,y:366+Math.cos(t*.53)*6,dir:'down',phase:t*5},
    {x:879+Math.sin(t*.91+2)*8,y:422+Math.sin(t*.73)*7,dir:'right',phase:t*6},
    {x:981+Math.sin(t*.71+3)*9,y:370+Math.cos(t*.7)*5,dir:'left',phase:t*6},
    {x:1011+Math.sin(t*.66+4)*7,y:406+Math.cos(t*.5)*5,dir:'left',phase:t*5},
    {x:997+Math.sin(t*.76+5)*8,y:441+Math.sin(t*.5)*4,dir:'left',phase:t*7}
  ];
}
function v8CourtBall(pts){
  // Three passes and a basket, possession alternating OKC then SAS.
  const team=pickup.team,seq=team===0?[0,1,2,1]:[3,4,5,4];
  const duration=pickup.phase<3?1.3:2;
  const u=Math.max(0,Math.min(1,pickup.elapsed/duration));
  const from=pts[seq[pickup.phase]], to=pickup.phase<3?pts[seq[pickup.phase+1]]:{x:team===0?752:1073,y:397};
  const lift=Math.sin(u*Math.PI)*(pickup.phase===3?66:18);
  return{x:from.x+(to.x-from.x)*u,y:from.y+(to.y-from.y)*u-lift};
}

function drawV15Court(){
  // Multi-layer custom hardwood-style pickup court, aligned with the original village art.
  const x=744,y=337,w=337,h=117,cx=x+w/2,cy=y+h/2;
  g.save();
  g.fillStyle='#2d2732'; g.fillRect(x-5,y-5,w+10,h+10);
  g.fillStyle='#cba26b'; g.fillRect(x,y,w,h);
  // Individual wooden floor strips and subtle panel seams.
  for(let j=0;j<13;j++){
    const sy=y+j*9;
    g.fillStyle=j%2?'#b98453':'#d1a374'; g.fillRect(x,sy,w,9);
    g.fillStyle='rgba(87,47,32,.24)';g.fillRect(x,sy+8,w,1);
    for(let i=0;i<5;i++){
      const sx=x+((i*77+(j%2)*38)%w);g.fillRect(sx,sy,1,8);
    }
  }
  // Team-tinted painted lanes and sidelines.
  g.fillStyle='rgba(16,105,169,.58)';g.fillRect(x,y,Math.floor(w/2),h);
  g.fillStyle='rgba(67,80,90,.68)';g.fillRect(x+Math.floor(w/2),y,Math.ceil(w/2),h);
  g.strokeStyle='#fff3da';g.lineWidth=2;g.strokeRect(x+5,y+5,w-10,h-10);
  g.beginPath();g.moveTo(cx,y+5);g.lineTo(cx,y+h-5);g.stroke();
  g.beginPath();g.arc(cx,cy,33,0,Math.PI*2);g.stroke();
  // Keys / restricted areas / semicircular arc details.
  g.strokeRect(x+5,cy-27,43,54);g.strokeRect(x+w-48,cy-27,43,54);
  g.beginPath();g.arc(x+48,cy,27,-Math.PI/2,Math.PI/2);g.stroke();
  g.beginPath();g.arc(x+w-48,cy,27,Math.PI/2,Math.PI*1.5);g.stroke();
  g.beginPath();g.arc(x+10,cy,63,-1.05,1.05);g.stroke();
  g.beginPath();g.arc(x+w-10,cy,63,Math.PI-1.05,Math.PI+1.05);g.stroke();
  // Detailed center-court Thunder crest (stylized OKC shield and bolt).
  const sx=cx-22,sy=cy-24;
  g.fillStyle='#fff7e2';
  g.beginPath();g.moveTo(sx-2,sy-2);g.lineTo(sx+46,sy-2);g.lineTo(sx+40,sy+35);g.lineTo(sx+22,sy+49);g.lineTo(sx+4,sy+35);g.closePath();g.fill();
  g.fillStyle='#1477b8';
  g.beginPath();g.moveTo(sx+1,sy+1);g.lineTo(sx+43,sy+1);g.lineTo(sx+37,sy+33);g.lineTo(sx+22,sy+44);g.lineTo(sx+7,sy+33);g.closePath();g.fill();
  g.fillStyle='#f28a36';
  g.beginPath();g.moveTo(sx+31,sy+3);g.lineTo(sx+18,sy+22);g.lineTo(sx+27,sy+22);g.lineTo(sx+16,sy+39);g.lineTo(sx+34,sy+18);g.lineTo(sx+25,sy+18);g.closePath();g.fill();
  g.font='bold 14px Arial';g.textAlign='center';g.lineWidth=2;g.strokeStyle='#17406b';g.strokeText('OKC',cx,cy-5);g.fillStyle='#fff';g.fillText('OKC',cx,cy-5);
  // Stanchions and orange hoops with backboards.
  for(const hx of [x+7,x+w-7]){
    g.fillStyle='#e9edf2';g.fillRect(hx-3,cy-15,6,30);
    g.strokeStyle='#d96427';g.lineWidth=3;g.beginPath();g.ellipse(hx+(hx<cx?5:-5),cy,7,4,0,0,Math.PI*2);g.stroke();
    g.strokeStyle='#e4edf1';g.lineWidth=1;
    for(let k=-4;k<=4;k+=4){g.beginPath();g.moveTo(hx+k,cy+4);g.lineTo(hx+k*.7,cy+12);g.stroke();}
  }
  g.restore();
}
function drawV15Ball(ball){
  const {x,y}=ball;
  g.save();g.translate(Math.round(x),Math.round(y));
  g.fillStyle='rgba(21,20,22,.38)';g.beginPath();g.ellipse(2,7,7,2,0,0,Math.PI*2);g.fill();
  g.fillStyle='#5c311d';g.beginPath();g.arc(0,0,7,0,Math.PI*2);g.fill();
  g.fillStyle='#e99332';g.beginPath();g.arc(-.5,-.5,6,0,Math.PI*2);g.fill();
  g.fillStyle='#f8b353';g.beginPath();g.ellipse(-2,-3,2.5,1.5,-.5,0,Math.PI*2);g.fill();
  g.strokeStyle='#63351e';g.lineWidth=1.3;
  g.beginPath();g.moveTo(-6,0);g.quadraticCurveTo(0,-2,6,0);g.stroke();
  g.beginPath();g.moveTo(0,-6);g.quadraticCurveTo(-2,0,0,6);g.stroke();
  g.beginPath();g.moveTo(-5,-4);g.quadraticCurveTo(3,0,-5,4);g.stroke();
  g.restore();
}
function drawV8Basketball(){
  const players=v8CourtPlayers();
  players.forEach((p,i)=>drawPixelActor(p,i,'basketball',.96));
  const b=v8CourtBall(players);
  drawV15Ball(b);
}
function drawV8Scoreboard(){
  // Replace the still scoreboard characters in the illustration with live simulated numbers.
  fill(819,234,181,40,'#0f2030');
  text('OKC',853,246,11,'#d9eaff'); text(courtConfig.period,910,246,11,'#f6dda4'); text(opponentId,971,246,11,'#e0e4eb');
  text(String(pickup.score[0]),853,266,22,'#ff805e');
  text(String(pickup.score[1]),972,266,22,'#86dcf6');
  const remaining=Math.max(0,252-Math.floor(clock*1.1)%253);
  text(courtConfig.scoreMode==='simulation'?`${Math.floor(remaining/60)}:${String(remaining%60).padStart(2,'0')}`:courtConfig.clock,913,266,14,'#f5dd92');
}
const waterRegions=[[10,551,491,665],[7,644,492,723],[599,551,767,616],[680,653,790,714]];
function drawAnimatedWater(){
  for(let i=0;i<65;i++){
    const region=waterRegions[i%waterRegions.length];
    let w=region[2]-region[0],h=region[3]-region[1];
    let x=region[0]+((i*57+Math.floor(clock*13))%w),
        y=region[1]+((i*23+Math.sin(clock*1.3+i)*6+h*4)%h);
    const alpha=.20+.13*Math.sin(clock*2+i);
    g.strokeStyle=`rgba(200,243,245,${alpha})`;g.lineWidth=1;
    g.beginPath();g.moveTo(Math.round(x),Math.round(y));g.lineTo(Math.round(x)+7+(i%6),Math.round(y));g.stroke();
  }
}
function drawTownHover(){
  if(!hover)return;
  const b=buildings.find(b=>b.id===hover);if(!b)return;
  let bx=b.x*T,by=b.y*T,bw=b.w*T,bh=b.h*T;
  g.save();g.fillStyle='rgba(255,232,132,.13)';g.fillRect(bx,by,bw,bh);
  g.strokeStyle='#ffe793';g.lineWidth=3;g.setLineDash([8,5]);g.strokeRect(bx+2,by+2,bw-4,bh-4);g.setLineDash([]);
  fill(bx+bw/2-55,by+bh+7,110,25,'#5b381f');
  text('✦ ENTER '+b.name.toUpperCase(),bx+bw/2,by+bh+23,11,'#ffe7a4');
  g.restore();
}
// The yellow circle marks the west end of the spectator fence in the supplied image.
const courtGate=markupPoint(581,319),courtApproach=nearestPathPoint(markupPoint(581,265));
const courtSpots=[{x:814,y:316},{x:850,y:316}];
let courtVisit=null;
function nearCourt(){return Math.hypot(player.x-courtApproach.x,player.y-courtApproach.y)<49;}
function enterCourt(){
 if(scene!=='town'||!nearCourt()||courtVisit)return false;
 keys.clear();hover=null;
 courtVisit={phase:'entering',elapsed:0,returnPosition:{x:player.x,y:player.y},actors:[player,companion].map((p,i)=>({
  ...p,moving:true,delay:i*.32,index:0,path:[courtApproach,{x:courtGate.x,y:courtGate.y},{x:746,y:306},{x:courtSpots[i].x,y:306},courtSpots[i]]
 }))};
 scene='court';statusEl.textContent='🏀 Court • Walking to the viewing area';
 tipEl.textContent='Walking to the viewing area together • Enter / E / Esc to return to the path';
 return true;
}
function leaveCourt(){
 if(!courtVisit)return;
 const visit=courtVisit;courtVisit=null;scene='town';
 Object.assign(player,visit.returnPosition,{dir:'down',phase:0});
 resetCompanion(player);keys.clear();doorCooldown=.7;
 statusEl.textContent='🌤️ Spring • Day 3 • Honey Meadows';
 tipEl.textContent='WASD / arrows to walk • Enter / E near doors • Court gate: watch the game';
}
function updateCourt(dt){
 if(!courtVisit)return;
 courtVisit.elapsed+=dt;
 if(courtVisit.phase==='watching')return;
 for(const actor of courtVisit.actors){
  if(courtVisit.elapsed<actor.delay)continue;
  let budget=105*dt;
  while(budget>0&&actor.index<actor.path.length){
   const target=actor.path[actor.index],dx=target.x-actor.x,dy=target.y-actor.y,d=Math.hypot(dx,dy);
   if(d<.001){actor.index++;continue;}
   const step=Math.min(budget,d);actor.x+=dx/d*step;actor.y+=dy/d*step;actor.phase+=step/9;budget-=step;
   actor.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
   if(step===d)actor.index++;
  }
  actor.moving=actor.index<actor.path.length;
 }
 if(courtVisit.actors.every(a=>!a.moving)){
  courtVisit.phase='watching';courtVisit.actors.forEach(a=>{a.dir='down';a.phase=0;});
  statusEl.textContent='🏀 Courtside • Watching OKC vs. Spurs';
  tipEl.textContent='Enjoy the game together • Enter / E / Esc to return to town';
 }
}
function drawCourtVisit(){
 if(!courtVisit)return;
 // Full original sprites retain their natural legs and shoes, including while idle.
 courtVisit.actors.forEach((actor,i)=>{if(i===0)drawPlayerAvatar(actor);else drawCompanion(actor);});
}
function drawPinkTreeForeground(){
 if(!ready('town-tiles'))return;
 // Trace only the central pink tree silhouette, not a rectangle of surrounding path.
 const outline=[[542,291],[555,297],[560,303],[572,304],[581,314],[590,317],
 [590,327],[599,335],[596,346],[600,351],[589,358],[585,365],[574,368],
 [568,365],[560,371],[548,366],[539,372],[526,365],[515,368],[505,359],
 [497,357],[499,349],[493,343],[498,333],[495,328],[504,319],[510,310],[522,306],[529,299]];
 g.save();g.beginPath();outline.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();
 g.rect(534,354,30,46);g.clip();
 g.drawImage(assets['town-tiles'],488,288,120,116,488,288,120,116);g.restore();
}
function drawCourtGate(){
 const near=scene==='town'&&nearCourt();
 g.save();g.strokeStyle=near?'#ffe7a1':'#d5b66c';g.lineWidth=3;
 g.beginPath();g.arc(courtGate.x,courtGate.y,14,0,Math.PI*2);g.stroke();
 fill(courtGate.x-9,courtGate.y-10,18,20,'#4b6849');text('↵',courtGate.x,courtGate.y+5,19,'#fff0be');
 if(near){fill(courtGate.x-91,courtGate.y-47,182,25,'#3a3628');text('ENTER • WATCH THE GAME',courtGate.x,courtGate.y-30,12,'#ffe6a1');}
 g.restore();
}

function drawTown(){
  drawTownIllustration();
  drawV15Court();
  drawAnimatedWater();
  drawV8Scoreboard();
  drawV8Basketball();
  const actors=npcs.map((n,i)=>({entity:n,draw:e=>drawPixelActor(e,i%6,'villagers',.96)}));
  if(scene==='town')actors.push({entity:player,draw:drawPlayerAvatar},{entity:companion,draw:drawCompanion});
  actors.sort((a,b)=>a.entity.y-b.entity.y);
  actors.filter(a=>a.entity.y<412).forEach(a=>a.draw(a.entity));
  drawPinkTreeForeground();
  actors.filter(a=>a.entity.y>=412).forEach(a=>a.draw(a.entity));
  drawCourtGate();
  if(scene==='court')drawCourtVisit();
  drawTownHover();
  if(showGrid){ g.fillStyle='rgba(255,75,70,.24)';pathBoxes.forEach(r=>g.fillRect(r.x,r.y,r.w,r.h));g.strokeStyle='#ffffff52';g.lineWidth=1;for(let x=0;x<=W;x++){g.beginPath();g.moveTo(x*T,0);g.lineTo(x*T,H*T);g.stroke();}for(let y=0;y<=H;y++){g.beginPath();g.moveTo(0,y*T);g.lineTo(W*T,y*T);g.stroke();} }
}

function furniture(type,x,y){
  if(type==='bed'){fill(x,y,96,64,'#654b43');fill(x+6,y+5,84,52,'#a06b72');fill(x+10,y+8,26,17,'#f2e2c8');fill(x+45,y+10,34,28,'#d4a2a5');}
  if(type==='fireplace'){fill(x,y,88,66,'#6a5849');fill(x+14,y+12,60,50,'#37332b');fill(x+28,y+31,28,28,'#e79b39');fill(x+38,y+20+Math.sin(clock*6)*3,10,25,'#ffe2a0');}
  if(type==='table'){fill(x,y,96,62,'#704b33');fill(x+6,y+5,84,43,'#c18a54');fill(x+36,y+13,23,16,'#e3cba3');}
  if(type==='shelf'){fill(x,y,64,65,'#6b4732');for(let j=0;j<3;j++){fill(x+5,y+8+j*18,54,4,'#d2a36c');for(let i=0;i<5;i++)fill(x+8+i*10,y+13+j*18,6,12,['#aa6958','#8ba16b','#6b92a5','#d7bb61'][((i+j)%4)])}}
  if(type==='plant'){fill(x+13,y+33,34,27,'#a46c51');fill(x+23,y+4,12,37,'#518849');fill(x+6,y+16,49,12,'#5d9d59');}
  if(type==='produce'){fill(x,y,70,52,'#806443');for(let i=0;i<4;i++)for(let j=0;j<2;j++)fill(x+7+i*15,y+9+j*19,10,11,['#d57c45','#91a94d','#e3c459','#ca6f65'][i%4]);}
  if(type==='counter'){fill(x,y,96,58,'#76533d');fill(x+4,y+4,88,15,'#d7b084');fill(x+8,y+22,80,29,'#ad7e5a');}
  if(type==='display'){fill(x,y,70,50,'#76556a');for(let i=0;i<5;i++)fill(x+6+i*13,y+8,8,20,['#f4c3d1','#c36c8f','#a5b9e1','#e9b7a5','#dca1c4'][i]);}
  if(type==='board'){fill(x,y,95,70,'#604b36');fill(x+6,y+6,83,58,'#e7d6a4');text('DASHBOARD',x+48,y+24,12,'#5a4733');text('• TASKS',x+45,y+43,12,'#5a4733');text('• MAP',x+42,y+58,12,'#5a4733');}
  if(type==='sofa'){fill(x,y,96,52,'#6f875c');fill(x+8,y+8,80,18,'#97b285');fill(x+8,y+29,18,15,'#7f9b6d');fill(x+70,y+29,18,15,'#7f9b6d');}
  if(type==='desk'){fill(x,y,96,58,'#6e5038');fill(x+5,y+6,86,42,'#b88755');fill(x+54,y+13,28,20,'#7aa8c8');}
  if(type==='map'){fill(x,y,64,50,'#6f523a');fill(x+6,y+6,52,38,'#ddd1a6');fill(x+12,y+12,16,9,'#7ab17f');fill(x+30,y+18,20,12,'#81b8d0');}
  if(type==='fridge'){fill(x,y,54,72,'#afbcbe');fill(x+5,y+5,44,62,'#d5dfe0');fill(x+38,y+30,4,8,'#6d7577');}
  if(type==='stove'){fill(x,y,54,50,'#6d7278');fill(x+4,y+4,46,42,'#a8aeb4');for(let i=0;i<4;i++)fill(x+8+i*10,y+10,6,6,'#353535');}
  if(type==='chair'){fill(x,y,28,28,'#7f5b42');fill(x+4,y+6,20,8,'#c09162');}
}
function drawInterior(){
  const room=interiors[scene],ox=288,oy=70,rw=576,rh=576;
  const artName='room_'+scene;
  fill(0,0,W*T,H*T,'#152821');
  // Zoom the interior art to occupy the whole gameplay space, keeping station hitboxes mapped.
  g.save();g.translate(576,356);g.scale(1.22,1.22);g.translate(-576,-356);
  if(ready(artName)){
    // Illustrated cottage interior; atmospheric enlarged room silhouette behind the active floor.
    g.save();g.globalAlpha=.25;
    g.drawImage(assets[artName],0,0,W*T,H*T);
    g.restore();
    fill(0,0,W*T,H*T,'#0c1f1cc0');
    fill(ox-28,oy-28,rw+56,rh+56,'#49372b');
    fill(ox-20,oy-20,rw+40,rh+40,'#b78559');
    fill(ox-10,oy-10,rw+20,rh+20,'#342c29');
    g.drawImage(assets[artName],ox,oy,rw,rh);
  }else{
    fill(ox,oy,rw,rh,room.floor);
    fill(ox,oy,rw,85,room.wall);
    for(const [type,x,y] of room.items)furniture(type,ox+(x-1)*T,oy+(y-2)*T);
  }
  // Flame glow and soft dust motes keep rooms feeling lived-in.
  if(scene==='headquarters'||scene==='farm'){
    const fireX=scene==='headquarters'?576:730,fireY=scene==='headquarters'?168:168;
    g.save();const halo=g.createRadialGradient(fireX,fireY,5,fireX,fireY,95);
    halo.addColorStop(0,'rgba(255,180,76,.20)');halo.addColorStop(1,'rgba(255,180,76,0)');
    g.fillStyle=halo;g.fillRect(fireX-95,fireY-95,190,190);g.restore();
  }
  if(scene==='headquarters')drawStations();
  for(let i=0;i<12;i++){
    const x=ox+20+(i*47)%470, y=oy+85+((i*31+Math.sin(clock*1.6+i)*8)%382);
    fill(x,y,2,2,'#f1dc9c45');
  }
  const indoorEntity={x:ox+(indoorPlayer.x-T),y:oy+(indoorPlayer.y-2*T),dir:indoorPlayer.dir,phase:indoorPlayer.phase};
  const indoorFollower={...companion,x:ox+(companion.x-T),y:oy+(companion.y-2*T)};
  drawParty(indoorEntity,indoorFollower,true);
  g.restore();
  text(room.name,W*T/2,46,28,'#f8dfa8');
  text('EXIT ↓',W*T/2,oy+rh+36,19,'#ffe0a2');
}


function nearestBuilding(){ for(const b of buildings){ const p=b.entrance; if(Math.hypot(player.x-(p.x*T+16), player.y-(p.y*T+16))<T*2.2) return b; } return null; }
function tryMove(entity,dx,dy,inside=false,dt=1/60){
  const speed=inside?62:70,len=Math.hypot(dx,dy);
  if(!len){entity.phase=0;return;}
  dx/=len;dy/=len;
  const steps=Math.max(1,Math.ceil(speed*dt/2));let distance=0;
  for(let i=0;i<steps;i++){
    const oldX=entity.x,oldY=entity.y;
    const nx=oldX+dx*speed*dt/steps;
    if(actorFits(nx,entity.y,inside))entity.x=nx;
    // Record each axis separately so a corner cannot become a diagonal shortcut.
    recordFootstep(entity);
    const ny=oldY+dy*speed*dt/steps;
    if(actorFits(entity.x,ny,inside))entity.y=ny;
    recordFootstep(entity);
    distance+=Math.hypot(entity.x-oldX,entity.y-oldY);
  }
  entity.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up');
  entity.phase=distance>0?entity.phase+distance/11:0;
}
// Live mode follows America/Chicago wall time; accelerated time is for preview only.
// so scrubbing backwards or across midnight never leaves stale actors in a scene.
let simMinute=0,simDay=1,timeRunning=true,timeSpeed=1,viewMode='town',clockMode='live';
const CENTRAL_ZONE='America/Chicago';
const centralFormatter=new Intl.DateTimeFormat('en-US',{timeZone:CENTRAL_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZoneName:'short'});
const centralDateFormatter=new Intl.DateTimeFormat('en-US',{timeZone:CENTRAL_ZONE,month:'short',day:'numeric',year:'numeric'});
let centralSnapshot=null,lastCentralSecond=null,firstCentralDay=null,centralZoneLabel='CT',centralDateLabel='';
function centralTimeAt(timestamp=Date.now()){
 const date=new Date(timestamp),parts=Object.fromEntries(centralFormatter.formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 const hour=Number(parts.hour)%24,minute=hour*60+Number(parts.minute)+Number(parts.second)/60+date.getMilliseconds()/60000;
 return {minute,zone:parts.timeZoneName,dateLabel:centralDateFormatter.format(date),dateKey:parts.year+'-'+parts.month+'-'+parts.day,dayNumber:Math.floor(Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day))/86400000),timestamp:date.getTime()};
}
function readCentralClock(force=false){
 const now=Date.now(),second=Math.floor(now/1000);
 if(force||second!==lastCentralSecond||!centralSnapshot){centralSnapshot=centralTimeAt(now);lastCentralSecond=second;}
 if(firstCentralDay===null)firstCentralDay=centralSnapshot.dayNumber;
 simMinute=(centralSnapshot.minute+(now-centralSnapshot.timestamp)/60000+1440)%1440;
 simDay=Math.max(1,centralSnapshot.dayNumber-firstCentralDay+1);
 centralZoneLabel=centralSnapshot.zone;centralDateLabel=centralSnapshot.dateLabel;
}
function useCurrentCentralTime(){clockMode='live';timeRunning=true;readCentralClock(true);syncRoutine();draw();}

const NBA_TEAMS=[{"id":"ATL","name":"Atlanta Hawks","color":"#e03a3e","file":"assets/teams/ATL.png"},{"id":"BOS","name":"Boston Celtics","color":"#008348","file":"assets/teams/BOS.png"},{"id":"BKN","name":"Brooklyn Nets","color":"#111111","file":"assets/teams/BKN.png"},{"id":"CHA","name":"Charlotte Hornets","color":"#1d1160","file":"assets/teams/CHA.png"},{"id":"CHI","name":"Chicago Bulls","color":"#ce1141","file":"assets/teams/CHI.png"},{"id":"CLE","name":"Cleveland Cavaliers","color":"#860038","file":"assets/teams/CLE.png"},{"id":"DAL","name":"Dallas Mavericks","color":"#00538c","file":"assets/teams/DAL.png"},{"id":"DEN","name":"Denver Nuggets","color":"#0e2240","file":"assets/teams/DEN.png"},{"id":"DET","name":"Detroit Pistons","color":"#c8102e","file":"assets/teams/DET.png"},{"id":"GSW","name":"Golden State Warriors","color":"#1d428a","file":"assets/teams/GSW.png"},{"id":"HOU","name":"Houston Rockets","color":"#ce1141","file":"assets/teams/HOU.png"},{"id":"IND","name":"Indiana Pacers","color":"#002d62","file":"assets/teams/IND.png"},{"id":"LAC","name":"Los Angeles Clippers","color":"#1d428a","file":"assets/teams/LAC.png"},{"id":"LAL","name":"Los Angeles Lakers","color":"#552583","file":"assets/teams/LAL.png"},{"id":"MEM","name":"Memphis Grizzlies","color":"#5d76a9","file":"assets/teams/MEM.png"},{"id":"MIA","name":"Miami Heat","color":"#98002e","file":"assets/teams/MIA.png"},{"id":"MIL","name":"Milwaukee Bucks","color":"#00471b","file":"assets/teams/MIL.png"},{"id":"MIN","name":"Minnesota Timberwolves","color":"#0c2340","file":"assets/teams/MIN.png"},{"id":"NOP","name":"New Orleans Pelicans","color":"#0c2340","file":"assets/teams/NOP.png"},{"id":"NYK","name":"New York Knicks","color":"#006bb6","file":"assets/teams/NYK.png"},{"id":"OKC","name":"Oklahoma City Thunder","color":"#007ac1","file":"assets/teams/OKC.png"},{"id":"ORL","name":"Orlando Magic","color":"#0077c0","file":"assets/teams/ORL.png"},{"id":"PHI","name":"Philadelphia 76ers","color":"#006bb6","file":"assets/teams/PHI.png"},{"id":"PHX","name":"Phoenix Suns","color":"#1d1160","file":"assets/teams/PHX.png"},{"id":"POR","name":"Portland Trail Blazers","color":"#e03a3e","file":"assets/teams/POR.png"},{"id":"SAC","name":"Sacramento Kings","color":"#5a2d81","file":"assets/teams/SAC.png"},{"id":"SAS","name":"San Antonio Spurs","color":"#63666a","file":"assets/teams/SAS.png"},{"id":"TOR","name":"Toronto Raptors","color":"#ce1141","file":"assets/teams/TOR.png"},{"id":"UTA","name":"Utah Jazz","color":"#002b5c","file":"assets/teams/UTA.png"},{"id":"WAS","name":"Washington Wizards","color":"#002b5c","file":"assets/teams/WAS.png"}];
const teamLogos={};
let courtTexture=null,courtTextureReady=false;
let opponentId=NBA_TEAMS.some(t=>t.id===courtConfig.opponent&&t.id!=='OKC')?courtConfig.opponent:'SAS';
courtConfig.opponent=opponentId;
for(const team of NBA_TEAMS){
 const image=new Image();let fallback=false;
 image.onerror=()=>{if(!fallback){fallback=true;image.src=ASSET_URLS['team_'+team.id];}};
 image.onload=()=>{if(team.id===opponentId)prepareCourtTexture();};image.src=team.file;teamLogos[team.id]=image;
}
assets['town-tiles'].addEventListener('load',prepareCourtTexture);
function prepareCourtTexture(){
 const town=assets['town-tiles'],logo=teamLogos[opponentId];
 if(!town?.complete||!town.naturalWidth)return;
 if(opponentId!=='SAS'&&(!logo?.complete||!logo.naturalWidth))return;
 const texture=document.createElement('canvas');texture.width=1152;texture.height=768;
 const ctx=texture.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(town,0,0,1152,768);
 // SAS already belongs to the original illustrated fence, just like OKC.
 // Other emblems are painted into that same cloth surface, not drawn as a HUD tile.
 if(opponentId!=='SAS'){
  const team=NBA_TEAMS.find(t=>t.id===opponentId);
  ctx.save();ctx.beginPath();ctx.moveTo(1042,273);ctx.lineTo(1083,274);ctx.lineTo(1082,315);ctx.lineTo(1041,316);ctx.closePath();ctx.clip();
  ctx.fillStyle=team.color;ctx.fillRect(1039,271,46,48);
  ctx.fillStyle='rgba(12,19,27,.48)';ctx.fillRect(1039,271,46,48);
  ctx.drawImage(logo,1045,277,34,34);
  // Fold shading, woven horizontal lines and seams follow the existing flag fabric.
  const shade=ctx.createLinearGradient(1041,274,1083,315);shade.addColorStop(0,'rgba(255,255,255,.12)');shade.addColorStop(.45,'rgba(0,0,0,.04)');shade.addColorStop(1,'rgba(0,0,0,.34)');ctx.fillStyle=shade;ctx.fillRect(1040,272,45,46);
  for(let y=275;y<316;y+=3){ctx.fillStyle='rgba(0,0,0,.10)';ctx.fillRect(1041,y,42,1);}
  ctx.strokeStyle='rgba(165,170,146,.38)';ctx.lineWidth=1;ctx.strokeRect(1043.5,275.5,37,38);
  ctx.restore();
 }
 courtTexture=texture;courtTextureReady=true;
}
for(const name of ['dog_sprite','cat_sprite','meal0','meal1','couch0','couch1','sleep0','sleep1']){
 loadAsset(name);
}
const routinePeriods=[
 {id:'breakfast',start:480,end:601,label:'Hayden & Annie · Breakfast',detail:'At the kitchen table in the farmhouse.'},
 {id:'outbound',start:601,end:606,label:'Walking to work',detail:'Annie is heading to the Nail Shop. Hayden is heading to Research.'},
 {id:'work',start:606,end:1081,label:'At work',detail:'Annie is working in the Nail Shop. Hayden is working in Research.'},
 {id:'return',start:1081,end:1086,label:'Walking home',detail:'Hayden and Annie are heading home to the farmhouse.'},
 {id:'dinner',start:1086,end:1201,label:'Hayden & Annie · Dinner',detail:'Back at the same kitchen table, sharing a meal.'},
 {id:'couch',start:1201,end:1321,label:'Couch time',detail:'Hayden and Annie snuggled together, with Riley resting on the floor.'}
];
const sleeping={id:'sleep',label:'Hayden & Annie · Sleeping',detail:'Hayden and Annie are tucked into bed until 8:00 AM.'};
function periodAt(minute){const m=((minute%1440)+1440)%1440;return routinePeriods.find(p=>m>=p.start&&m<p.end)||sleeping;}
function formatTime(minute){const m=((Math.floor(minute)%1440)+1440)%1440,h=Math.floor(m/60);return (h%12||12)+':'+String(m%60).padStart(2,'0')+' '+(h>=12?'PM':'AM');}
function doorPoint(id){const b=buildings.find(b=>b.id===id);return {x:b.entrance.x*T+16,y:b.entrance.y*T+16};}
function measuredPath(points){let length=0;const cumulative=[0];for(let i=1;i<points.length;i++){length+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);cumulative.push(length);}return {points,cumulative,length};}
function samplePath(path,progress){
 const distance=clamp(progress,0,1)*path.length;let i=1;
 while(i<path.cumulative.length-1&&path.cumulative[i]<distance)i++;
 const a=path.points[Math.max(0,i-1)],b=path.points[Math.min(i,path.points.length-1)],span=(path.cumulative[i]||0)-(path.cumulative[i-1]||0),u=span?(distance-path.cumulative[i-1])/span:0;
 const dx=b.x-a.x,dy=b.y-a.y;
 return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,dir:Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'),phase:distance/9,moving:true};
}
const commutePaths={girl:measuredPath(townRoute(doorPoint('farm'),doorPoint('nails'))),boy:measuredPath(townRoute(doorPoint('farm'),doorPoint('research')))};
const dogWaypoints=[doorPoint('farm'),...[[274,365],[274,435],[440,435],[440,341],[438,265],[700,265],[438,265],[438,341],[392,341],[392,435],[274,435],[274,365]].map(p=>markupPoint(...p)),doorPoint('farm')];
let dogPoints=[];for(let i=0;i<dogWaypoints.length-1;i++)dogPoints.push(...townRoute(dogWaypoints[i],dogWaypoints[i+1]).slice(i?1:0));
const dogWalk=measuredPath(dogPoints);
const catWalk=measuredPath([{x:358,y:320},{x:370,y:540},{x:420,y:575},{x:425,y:360},{x:358,y:320}]);
let householdState;
function makeRoutineState(){
 const period=periodAt(simMinute),m=simMinute,commuting=period.id==='outbound'||period.id==='return';
 const u=commuting?(m-period.start)/(period.end-period.start):0;
 const girl={scene:'farm',x:384,y:228,dir:'down',phase:0,moving:false},boy={scene:'farm',x:410,y:228,dir:'down',phase:0,moving:false};
 if(commuting){
  for(const [name,actor] of [['girl',girl],['boy',boy]]){
   const path=commutePaths[name],progress=period.id==='outbound'?u:1-u;
   Object.assign(actor,samplePath(path,progress),{scene:'town'});
   if(period.id==='return'){actor.dir={up:'down',down:'up',left:'right',right:'left'}[actor.dir];}
  }
 }else if(period.id==='work'){
  Object.assign(girl,{scene:'nails',x:204,y:410,dir:'down',phase:(clock*2)%4});
  Object.assign(boy,{scene:'research',x:595,y:445,dir:'down',phase:(clock*2)%4});
 }
 const dogOutside=m>=600&&m<1080;
 const dog=dogOutside?{...samplePath(dogWalk,(((m-600)*22)%dogWalk.length)/dogWalk.length),scene:'town',resting:false}:{scene:'farm',x:period.id==='couch'?273:452,y:period.id==='couch'?535:580,dir:'down',phase:clock*1.6,moving:false,resting:true};
 const catRest=(m%90)<65||period.id==='sleep';
 const cat=catRest?{scene:'farm',x:302,y:546,dir:'down',phase:clock*.8,moving:false,resting:true}:{...samplePath(catWalk,((m*7)%catWalk.length)/catWalk.length),scene:'farm',resting:false};
 return {period,girl,boy,dog,cat};
}
function selectedScene(){if(viewMode!=='auto')return viewMode;return householdState.period.id==='work'?'nails':householdState.girl.scene;}
function darknessAt(minute){
 const h=minute/60;
 if(h>=8&&h<17.5)return 0;
 if(h>=5&&h<8)return .58*(1-(h-5)/3);
 if(h>=17.5&&h<21)return .58*(h-17.5)/3.5;
 return .58;
}
function drawPet(pet,kind,inside=false){
 const image=assets[kind+'_sprite'];if(!image?.naturalWidth)return;
 const row=pet.resting?4:({down:0,left:1,right:2,up:3}[pet.dir]??0),frame=Math.floor(pet.phase)%4;
 const size=inside?(kind==='dog'?58:46):(kind==='dog'?36:30);
 g.drawImage(image,frame*72,row*72,72,72,Math.round(pet.x-size/2),Math.round(pet.y-size+7),size,size);
}
function drawGeneratedAction(kind,x,y,w,h){
 const frame=Math.floor(clock*1.35)%2,image=assets[kind+frame];if(!image?.naturalWidth)return;
 g.drawImage(image,x,y,w,h);
}
function drawIndoorCharacter(actor,male){
 const source=assets[male?'companion_avatar':'player_avatar'];if(!source?.naturalWidth)return;
 const row={down:0,left:1,right:2,up:3}[actor.dir]??0;
 g.drawImage(source,(Math.floor(actor.phase)%4)*52,row*84,52,84,actor.x-32,actor.y-94,64,104);
}
function drawScheduledInterior(id){
 const image=assets['room_'+id],ox=256,oy=52,scale=640/768;
 fill(0,0,1152,768,'#10251e');
 if(image?.naturalWidth){g.save();g.globalAlpha=.16;g.drawImage(image,0,0,1152,768);g.restore();}
 g.save();g.translate(ox,oy);g.scale(scale,scale);
 if(image?.naturalWidth)g.drawImage(image,0,0,768,768);else fill(0,0,768,768,'#876441');
 if(id==='farm'){
  const activity=householdState.period.id;
  if(activity==='breakfast'||activity==='dinner')drawGeneratedAction('meal',286,100,205,185);
  else if(activity==='couch')drawGeneratedAction('couch',73,365,218,160);
  else if(activity==='sleep'){
   drawGeneratedAction('sleep',482,366,188,237);
   text('z',650,361+Math.sin(clock)*2,13,'#fff2cf');
  }
  if(householdState.dog.scene==='farm')drawPet(householdState.dog,'dog',true);
  drawPet(householdState.cat,'cat',true);
 }else{
  if(householdState.girl.scene===id){drawIndoorCharacter(householdState.girl,false);drawWorkDetails(householdState.girl,'nails');}
  if(householdState.boy.scene===id){drawIndoorCharacter(householdState.boy,true);drawWorkDetails(householdState.boy,'research');}
 }
 g.restore();
 const shade=darknessAt(simMinute)*.23;if(shade){fill(ox,oy,640,640,'rgba(22,29,65,'+shade+')');}
 text(interiors[id].name,576,35,23,'#ffe4ac');
 if(id==='farm'){text(householdState.girl.scene==='farm'?householdState.period.label:'A quiet house • Theo at home'+(householdState.dog.scene==='farm'?' • Riley at home':''),576,724,17,'#f3d99b');}
 else if(id==='nails'||id==='research')text(householdState.period.id==='work'?'Working until 6:00 PM':'The workday has finished',576,724,17,'#f3d99b');
 if(id==='headquarters'){drawHqTableHotspot();}
}
function drawWorkDetails(actor,kind){
 const image=assets['room_'+kind];if(!image?.naturalWidth)return;
 // Restore the front of each existing workstation above the character's feet.
 // Faces and hands stay visible behind the counter rather than behind a new monitor.
 if(kind==='nails'){
  g.drawImage(image,146,412,112,88,146,412,112,88);
  fill(actor.x+10+Math.sin(clock*3)*2,409,6,4,'#ebc4a1');
  fill(actor.x+23,410,4,8,'#b6537d');fill(actor.x+24,407,2,3,'#efd7b5');
 }else{
  g.drawImage(image,475,445,224,105,475,445,224,105);
  fill(607,458,26,15,'#eedbaa');
  for(let i=0;i<3;i++)fill(610,461+i*4,17-(i===2?Math.floor(clock)%8:0),1,'#6b6044');
  fill(actor.x+6+Math.sin(clock*2)*2,444,6,4,'#ebc4a1');
 }
}
function drawEmptyStands(){
 fill(798,279,227,48,'#2c433b');
 for(const y of [291,306,321]){fill(800,y,223,4,'#926840');fill(800,y-2,223,2,'#c29b62');}
 for(const x of [806,902,1015])fill(x,280,3,48,'#374e4a');
}
function opponent(){return NBA_TEAMS.find(t=>t.id===opponentId);}
// Night lighting: the town darkens, and each street lamp / lit window cuts a warm pool of
// light out of the darkness so the area around it is actually lit.
// Coordinates are the lamp heads in the 1152x768 town illustration.
const STREET_LAMPS=[[107,185],[397,35],[472,7],[497,37],[455,132],[502,227],[570,227],[450,360],
 [606,140],[1002,134],[1096,310],[495,489],[405,606],[482,594],[623,439],[725,426],[588,489],
 [598,594],[818,601],[593,716],[1108,411],[1086,431],[1118,546]];
const LIT_WINDOWS=[[205,285],[120,285],[255,285],[207,222],[535,150],[641,148],[796,150],[940,150],[1068,150],[880,620],[985,620],[1050,620],[975,525]];
let nightLayer=null;
// Court floodlights: on while the real Thunder game is live (thunder-feed.js state 'in').
const COURT={x:737,y:327,w:355,h:125};
const COURT_LIGHTS=[[737,292],[1105,292],[737,420],[1105,420]];
let courtLightsOverride=null;
function courtLightsOn(){if(courtLightsOverride!==null)return courtLightsOverride;const g0=window.ThunderFeed&&window.ThunderFeed.current;return !!(g0&&g0.state==='in');}
function drawCourtLightFixtures(){
 if(!courtLightsOn())return;
 const flick=.92+.08*Math.sin(clock*9);
 COURT_LIGHTS.forEach(([x,y],i)=>{
  const top=i<2,len=top?36:34;
  fill(x-2,y,4,len,'#2b2f36');fill(x-1,y,1,len,'#4b525c');           // pole
  fill(x-11,y-7,22,9,'#2b2f36');fill(x-10,y-6,20,7,'#3a414b');      // lamp housing
  for(let k=0;k<3;k++)fill(x-9+k*7,y-5,5,5,`rgba(255,250,225,${flick})`); // bulbs
  g.save();g.globalCompositeOperation='lighter';
  const gr=g.createRadialGradient(x,y-2,0,x,y-2,26);gr.addColorStop(0,'rgba(255,250,225,'+(.55*flick)+')');gr.addColorStop(1,'rgba(255,250,225,0)');
  g.fillStyle=gr;g.fillRect(x-26,y-28,52,52);g.restore();
 });
}
function drawTownLighting(){
 const darkness=darknessAt(simMinute);if(darkness<=0)return;
 if(!nightLayer){nightLayer=document.createElement('canvas');nightLayer.width=1152;nightLayer.height=768;}
 const n=nightLayer.getContext('2d'),t=clock,lampOn=Math.min(1,darkness/.3);
 n.globalCompositeOperation='source-over';n.clearRect(0,0,1152,768);
 n.fillStyle='rgba(12,22,59,'+darkness+')';n.fillRect(0,0,1152,768);
 // Cut lit areas out of the darkness.
 n.globalCompositeOperation='destination-out';
 const cut=(x,y,r,a)=>{const gr=n.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(0,0,0,'+a+')');gr.addColorStop(.55,'rgba(0,0,0,'+a*.55+')');gr.addColorStop(1,'rgba(0,0,0,0)');n.fillStyle=gr;n.fillRect(x-r,y-r,r*2,r*2);};
 STREET_LAMPS.forEach(([x,y],i)=>{const f=1+.03*Math.sin(t*3.1+i*1.7);cut(x,y+16,78*f,.92*lampOn);});
 if(courtLightsOn()){n.fillStyle='rgba(0,0,0,.88)';n.fillRect(COURT.x,COURT.y,COURT.w,COURT.h);COURT_LIGHTS.forEach(([x,y])=>cut(x,y,190,.85));}
 LIT_WINDOWS.forEach(([x,y])=>cut(x,y+8,46,.7*lampOn));
 g.drawImage(nightLayer,0,0);
 // Warm glow on top: bright lamp heads and a soft amber pool on the ground.
 g.save();g.globalCompositeOperation='lighter';
 const warm=(x,y,r,a,col)=>{const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba('+col+','+a+')');gr.addColorStop(1,'rgba('+col+',0)');g.fillStyle=gr;g.fillRect(x-r,y-r,r*2,r*2);};
 STREET_LAMPS.forEach(([x,y],i)=>{const f=.9+.1*Math.sin(t*4.3+i*2.3);warm(x,y+18,62,.16*lampOn*f,'255,170,70');warm(x,y,14,.55*lampOn*f,'255,225,140');});
 LIT_WINDOWS.forEach(([x,y])=>warm(x,y+6,34,.14*lampOn,'255,190,90'));
 if(courtLightsOn()){g.fillStyle='rgba(235,240,255,'+(.07*darkness/.58)+')';g.fillRect(COURT.x,COURT.y,COURT.w,COURT.h);COURT_LIGHTS.forEach(([x,y])=>warm(x,y+40,170,.10*darkness/.58,'230,240,255'));}
 g.restore();
}
// Hover glow: outlines traced around each building in the 1152x768 town illustration.
const buildingOutlines={
 research:[[464,124],[538,42],[612,95],[614,124],[614,190],[464,190]],
 gear:[[617,110],[668,44],[725,110],[725,190],[617,190]],
 books:[[735,112],[795,22],[862,112],[862,190],[735,190]],
 coffee:[[889,112],[942,33],[995,112],[995,190],[889,190]],
 nails:[[1010,112],[1070,22],[1130,112],[1130,190],[1010,190]],
 farm:[[98,215],[127,205],[127,152],[142,152],[142,185],[213,133],[240,165],[275,165],[275,153],[290,153],[290,168],[308,170],[308,262],[312,325],[98,325]],
 headquarters:[[833,600],[833,527],[865,487],[1065,487],[1100,527],[1100,667],[833,667]]
};
function insideOutline(pts,x,y){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const [xi,yi]=pts[i],[xj,yj]=pts[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;}return inside;}
function buildingAt(x,y){return buildings.find(b=>buildingOutlines[b.id]&&insideOutline(buildingOutlines[b.id],x,y))||null;}
// Same look as Polish Pines: a crisp pixel rim that hugs the building (light gold edge,
// deeper gold ring, soft outer ring) plus a gentle brighten inside. Built once per building.
const glowCache={};
function buildGlow(id){
 const pts=buildingOutlines[id],W0=c.width,H0=c.height;
 const mc=document.createElement('canvas');mc.width=W0;mc.height=H0;const mg=mc.getContext('2d');
 mg.beginPath();pts.forEach(([x,y],i)=>i?mg.lineTo(x,y):mg.moveTo(x,y));mg.closePath();mg.fillStyle='#000';mg.fill();
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 const X0=Math.max(0,Math.floor(Math.min(...xs))-4),Y0=Math.max(0,Math.floor(Math.min(...ys))-4),X1=Math.min(W0-1,Math.ceil(Math.max(...xs))+4),Y1=Math.min(H0-1,Math.ceil(Math.max(...ys))+4);
 const IW=X1-X0+1,IH=Y1-Y0+1,src=mg.getImageData(X0,Y0,IW,IH).data,m=new Uint8Array(IW*IH);
 for(let i=0;i<IW*IH;i++)m[i]=src[i*4+3]>127?1:0;
 const near=(x,y,r)=>{for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const X=x+dx,Y=y+dy;if(X>=0&&Y>=0&&X<IW&&Y<IH&&m[Y*IW+X])return true;}return false;};
 const out=document.createElement('canvas');out.width=IW;out.height=IH;const og=out.getContext('2d'),img=og.createImageData(IW,IH),d=img.data;
 for(let y=0;y<IH;y++)for(let x=0;x<IW;x++){const i=(y*IW+x)*4;
  if(m[y*IW+x]){d[i]=255;d[i+1]=246;d[i+2]=210;d[i+3]=60;}
  else if(near(x,y,1)){d[i]=255;d[i+1]=236;d[i+2]=140;d[i+3]=255;}
  else if(near(x,y,2)){d[i]=255;d[i+1]=200;d[i+2]=60;d[i+3]=255;}
  else if(near(x,y,3)){d[i]=255;d[i+1]=214;d[i+2]=92;d[i+3]=120;}
 }
 og.putImageData(img,0,0);return {img:out,x:X0,y:Y0};
}
function drawBuildingGlow(){
 if(!hover||!buildingOutlines[hover])return;
 const glow=glowCache[hover]||(glowCache[hover]=buildGlow(hover));
 g.drawImage(glow.img,glow.x,glow.y);
}
function drawScheduledTown(){
 drawTownIllustration();drawV15Court();drawAnimatedWater();drawEmptyStands();drawV8Scoreboard();drawV8Basketball();
 const actors=[];
 if(householdState.girl.scene==='town')actors.push({entity:householdState.girl,draw:drawPlayerAvatar});
 if(householdState.boy.scene==='town')actors.push({entity:householdState.boy,draw:drawCompanion});
 if(householdState.dog.scene==='town')actors.push({entity:householdState.dog,draw:e=>drawPet(e,'dog')});
 actors.sort((a,b)=>a.entity.y-b.entity.y);actors.filter(a=>a.entity.y<412).forEach(a=>a.draw(a.entity));
 drawPinkTreeForeground();actors.filter(a=>a.entity.y>=412).forEach(a=>a.draw(a.entity));
 if(showGrid){g.fillStyle='rgba(255,100,70,.2)';pathBoxes.forEach(r=>g.fillRect(r.x,r.y,r.w,r.h));}
 drawTownLighting();
 drawCourtLightFixtures();
 // Replace the static clock printed into the town's illustrated sign.
 fill(50,78,150,17,'#68462d');text(clockMode==='live'?centralDateLabel:'Preview • Day '+simDay,125,90,12,'#ffedc1');
 fill(60,96,132,20,'#68462d');text(formatTime(simMinute)+(clockMode==='live'?' '+centralZoneLabel:''),126,109,13,'#ffedc1');
 drawBuildingGlow();
}
function refreshUI(){
 const p=householdState.period;
 document.getElementById('timeReadout').textContent=formatTime(simMinute)+(clockMode==='live'?' '+centralZoneLabel:'');
 document.getElementById('clockModeLabel').textContent=clockMode==='live'?'● Live':'Preview time • '+(timeRunning?'playing':'paused');
 document.getElementById('speedSelect').disabled=clockMode==='live';
 const slider=document.getElementById('timeSlider');slider.value=String(Math.floor(simMinute));slider.setAttribute('aria-valuetext',formatTime(simMinute));
 document.getElementById('routineTitle').textContent=p.label;
 document.getElementById('routineDetail').textContent=p.detail;
 document.getElementById('petStatus').textContent='Riley: '+(householdState.dog.scene==='town'?'walking around town':'at home')+' • Theo: always at home';
 document.getElementById('toggleTime').textContent=clockMode==='live'?'⏸ Pause clock':(timeRunning?'⏸ Pause preview':'▶ Play preview');
 statusEl.textContent=(clockMode==='live'?centralDateLabel+' • '+formatTime(simMinute)+' '+centralZoneLabel:'Preview • '+formatTime(simMinute))+' • '+p.label;
 tipEl.textContent=viewMode==='auto'?'Following Hayden and Annie\'s daily routine • Use the time slider below to test any moment':'Viewing '+(scene==='town'?'the town':interiors[scene].name)+' • Hayden and Annie\'s routine continues automatically';
}
function syncRoutine(){householdState=makeRoutineState();scene=selectedScene();refreshUI();}
function setTime(minute,pause=true){clockMode='preview';simMinute=((Number(minute)%1440)+1440)%1440;if(pause)timeRunning=false;syncRoutine();draw();}
function update(dt){
 clock+=dt;updatePickup(dt);
 if(clockMode==='live')readCentralClock();
 else if(timeRunning){const next=simMinute+dt*timeSpeed;simDay+=Math.floor(next/1440);simMinute=next%1440;}
 syncRoutine();
}
function draw(){g.clearRect(0,0,c.width,c.height);if(scene==='town')drawScheduledTown();else drawScheduledInterior(scene);}
let lastFrame=0;function routineLoop(ts){const dt=Math.min((ts-lastFrame)/1000||0,.1);lastFrame=ts;update(dt);draw();requestAnimationFrame(routineLoop);}
document.getElementById('timeSlider').addEventListener('input',e=>setTime(e.target.value));
document.getElementById('toggleTime').onclick=()=>{if(clockMode==='live'){readCentralClock(true);clockMode='preview';timeRunning=false;}else timeRunning=!timeRunning;refreshUI();};
 document.getElementById('currentTime').onclick=useCurrentCentralTime;
document.getElementById('speedSelect').onchange=e=>{clockMode='preview';timeSpeed=Number(e.target.value);refreshUI();};
document.getElementById('viewSelect').onchange=e=>{viewMode=e.target.value;syncRoutine();draw();};
document.querySelectorAll('[data-time]').forEach(button=>button.onclick=()=>setTime(button.dataset.time));
// A data/API boundary for future game-feed integrations. There is no team picker in the UI.
window.HoneyMeadows={
 useCurrentCentralTime,
 getClockState(){return {mode:clockMode,timeZone:CENTRAL_ZONE,zoneLabel:centralZoneLabel,minute:simMinute,date:centralDateLabel,running:timeRunning};},
 getGameData(){return {opponent:opponentId,scoreMode:courtConfig.scoreMode,score:{home:pickup.score[0],away:pickup.score[1]},period:courtConfig.period,clock:courtConfig.clock};},
 setGameData(patch={}){
  if(patch.opponent){const id=String(patch.opponent).toUpperCase();if(!NBA_TEAMS.some(t=>t.id===id&&id!=='OKC'))return false;opponentId=id;courtConfig.opponent=id;courtTextureReady=false;prepareCourtTexture();}
  if(patch.scoreMode)courtConfig.scoreMode=patch.scoreMode==='manual'?'manual':'simulation';
  if(patch.score){if(patch.score.home!==undefined)pickup.score[0]=scoreNumber(patch.score.home);if(patch.score.away!==undefined)pickup.score[1]=scoreNumber(patch.score.away);courtConfig.score={home:pickup.score[0],away:pickup.score[1]};}
  if(patch.period!==undefined)courtConfig.period=String(patch.period).slice(0,12);
  if(patch.clock!==undefined)courtConfig.clock=String(patch.clock).slice(0,12);
  draw();return true;
 }
};
// Headquarters interior: the big table in the middle opens the sales dashboard.
const HQ_TABLE={x:494,y:346,w:166,h:134};
let hqTableHover=false;
const inHqTable=(x,y)=>scene==='headquarters'&&x>=HQ_TABLE.x&&x<=HQ_TABLE.x+HQ_TABLE.w&&y>=HQ_TABLE.y&&y<=HQ_TABLE.y+HQ_TABLE.h;
function drawHqTableHotspot(){
 const {x,y,w,h}=HQ_TABLE,pulse=.5+.5*Math.sin(clock*3);
 g.save();
 if(hqTableHover){g.fillStyle='rgba(255,226,140,.14)';g.fillRect(x,y,w,h);}
 g.strokeStyle=hqTableHover?'#fff1a8':`rgba(255,226,140,${.35+.35*pulse})`;g.lineWidth=hqTableHover?3:2;
 g.setLineDash(hqTableHover?[]:[6,5]);g.strokeRect(x+.5,y+.5,w,h);g.setLineDash([]);
 g.restore();
 const label='📊 SALES DASHBOARD',lw=150;
 fill(x+w/2-lw/2,y-30,lw,22,hqTableHover?'#f6e0a5':'#5b381f');
 text(label,x+w/2,y-14,11,hqTableHover?'#422d20':'#ffe7a4');
}
c.addEventListener('click',e=>{
 const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*c.width/r.width,y=(e.clientY-r.top)*c.height/r.height;
 if(inHqTable(x,y)&&window.EtsyHQ){hqTableHover=false;c.style.cursor='';window.EtsyHQ.open();return;}
 if(scene!=='town')return;
 const b=buildingAt(x,y);
 if(b&&b.id==='books'&&window.BooksCatalog){hover=null;c.style.cursor='';window.BooksCatalog.open();return;}
 if(b){hover=null;c.style.cursor='';viewMode=b.id;document.getElementById('viewSelect').value=b.id;syncRoutine();draw();}
});
c.addEventListener('mousemove',e=>{
 const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*c.width/r.width,y=(e.clientY-r.top)*c.height/r.height;
 if(scene==='headquarters'){hqTableHover=inHqTable(x,y);c.style.cursor=hqTableHover?'pointer':'default';return;}
 hqTableHover=false;
 if(scene!=='town'){if(hover){hover=null;c.style.cursor='';}return;}
 const b=buildingAt(x,y);hover=b?b.id:null;c.style.cursor=b?'pointer':'default';
});
c.addEventListener('mouseleave',()=>{hover=null;hqTableHover=false;c.style.cursor='';});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&window.BooksCatalog&&window.BooksCatalog.isOpen){window.BooksCatalog.back();return;}if(e.key==='Escape'&&window.EtsyHQ&&window.EtsyHQ.isOpen){window.EtsyHQ.close();return;}if(e.key==='Escape'){viewMode='town';document.getElementById('viewSelect').value='town';syncRoutine();draw();}});
window.HM_DEBUG={
 get clockMode(){return clockMode;},get timeZone(){return CENTRAL_ZONE;},get centralDate(){return centralDateLabel;},get centralZone(){return centralZoneLabel;},centralTimeAt,useCurrentCentralTime,
 get minute(){return simMinute;},get day(){return simDay;},get scene(){return scene;},get period(){return householdState.period.id;},
 get state(){return JSON.parse(JSON.stringify(householdState));},get npcCount(){return 0;},get basketballCount(){return 6;},
 get teams(){return NBA_TEAMS.map(t=>({id:t.id,name:t.name}));},get opponent(){return opponentId;},get score(){return pickup.score.slice();},
 get logoReady(){return Object.fromEntries(Object.entries(teamLogos).map(([id,img])=>[id,!!(img.complete&&img.naturalWidth)]));},get courtTextureReady(){return courtTextureReady;},get timeRunning(){return timeRunning;},get darkness(){return darknessAt(simMinute);},get assetReady(){return Object.fromEntries(Object.keys(assets).map(k=>[k,ready(k)]));},
 get townActorsValid(){return [householdState.girl,householdState.boy,householdState.dog].filter(a=>a.scene==='town').every(a=>townFootprint(a.x,a.y));},
 get generatedPose(){return ['breakfast','dinner'].includes(householdState.period.id)?'meal':householdState.period.id;},
 setCourtLights(v){courtLightsOverride=(v===null||v===undefined)?null:!!v;draw();},get courtLightsOn(){return courtLightsOn();},
 setTime,periodAt,formatTime,setView(id){viewMode=id;document.getElementById('viewSelect').value=id;syncRoutine();draw();},
 advance(seconds){let remaining=seconds;while(remaining>1e-8){const dt=Math.min(remaining,1/30);update(dt);remaining-=dt;}draw();},
 setRunning(value){if(clockMode==='live'&&!value){readCentralClock(true);clockMode='preview';}timeRunning=!!value;refreshUI();},setSpeed(value){clockMode='preview';timeSpeed=value;refreshUI();}
};
function resyncLiveClock(){if(clockMode==='live'){readCentralClock(true);syncRoutine();draw();}}
window.addEventListener('focus',resyncLiveClock);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)resyncLiveClock();});
readCentralClock(true);prepareCourtTexture();syncRoutine();draw();requestAnimationFrame(routineLoop);




})();



