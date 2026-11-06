const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),elements=new Map(),listeners={},docListeners={};
let now=Date.parse('2026-11-04T23:00:00.000Z'); // Wednesday 5:00 PM Central
class ClockDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
const context=new Proxy({createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};}},{get:(o,k)=>k in o?o[k]:()=>{}});
const element=()=>({style:{},dataset:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},querySelectorAll(){return []},focus(){},getContext(){return context;}});
const document={hidden:false,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},querySelectorAll(){return []},addEventListener(type,fn){(docListeners[type]??=[]).push(fn);},createElement(){return element();}};
const window={addEventListener(type,fn){(listeners[type]??=[]).push(fn);}};
const scope={window,document,Image:class{addEventListener(){}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},requestAnimationFrame(){},console,Date:ClockDate,Math,Set,Map,URL,Intl};vm.createContext(scope);
for(const file of ['game-data.js','assets-embedded.js','map-data.js','town-routes.js','game.js'])vm.runInContext(fs.readFileSync(root+'/'+file,'utf8'),scope);
const api=window.HM_DEBUG,controller=window.HoneyMeadows,results=[];const run=(name,fn)=>{fn();results.push({name,result:'PASS'});};
const near=(p,pts,d)=>pts.some((q,i)=>i&&(()=>{const a=pts[i-1],dx=q.x-a.x,dy=q.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<=d;})());
const ids=['girl','boy','sun','blue','beard','long','kid'];
run('Wednesday is detected from the Central date',()=>assert.equal(api.isRideDay,true));
run('Nobody is involved before 5:45 PM',()=>ids.forEach(id=>assert.equal(api.rideAt(id,17*60+40).step,'before')));
run('Everyone arrives at a different time and waits by the bikes before 6:05',()=>{
  const arrivals=ids.map(id=>{let m=17*60+44;while(api.rideAt(id,m).step!=='wait')m+=1/60;return m;});
  assert(arrivals.every(m=>m<18*60+5));
  assert(new Set(arrivals.map(m=>Math.round(m*60))).size===ids.length);
});
run('Everyone starts riding at 6:05 PM on the trail',()=>{
  ids.forEach(id=>assert.equal(api.rideAt(id,18*60+4.9).step,'wait'));
  ids.forEach(id=>assert.equal(api.rideAt(id,18*60+5.1).step,'ride'));
  const loop=api.rideLoop;
  for(let m=18*60+5;m<18*60+45;m+=0.37)ids.filter(id=>id!=='kid').forEach(id=>{const r=api.rideAt(id,m);assert(r.ride&&near({x:r.x,y:r.y-9},loop,1),id+' off trail at '+m);});
  assert.equal(api.rideAt('kid',18*60+20).hidden,true);
});
run('Bikes are parked except during the ride, and everyone is home by 7 PM',()=>{
  api.setTime(17*60);assert.equal(api.parkedBikes.length,6);
  api.setTime(18*60+20);assert.equal(api.parkedBikes.length,0);
  ids.forEach(id=>assert.equal(api.rideAt(id,19*60).step,'after'));
});
console.log(results);
