const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),elements=new Map(),listeners={},docListeners={};
let now=Date.parse('2026-10-27T18:15:30.000Z');
class ClockDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
const context=new Proxy({createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};}},{get:(o,k)=>k in o?o[k]:()=>{}});
const element=()=>({style:{},dataset:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},querySelectorAll(){return []},focus(){},getContext(){return context;}});
const document={hidden:false,getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},querySelectorAll(){return []},addEventListener(type,fn){(docListeners[type]??=[]).push(fn);},createElement(){return element();}};
const window={addEventListener(type,fn){(listeners[type]??=[]).push(fn);}};
const scope={window,document,Image:class{addEventListener(){}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},requestAnimationFrame(){},console,Date:ClockDate,Math,Set,Map,URL,Intl};vm.createContext(scope);
for(const file of ['game-data.js','assets-embedded.js','game.js'])vm.runInContext(fs.readFileSync(root+'/'+file,'utf8'),scope);
const api=window.HM_DEBUG,controller=window.HoneyMeadows,results=[];const run=(name,fn)=>{fn();results.push({name,result:'PASS'});};
run('Startup uses current Central Time and keeps Town selected',()=>{
 assert.equal(api.clockMode,'live');assert.equal(api.timeZone,'America/Chicago');assert.equal(api.centralZone,'CDT');assert.equal(api.centralDate,'Oct 27, 2026');assert(Math.abs(api.minute-795.5)<.00001);assert.equal(api.scene,'town');assert(elements.get('speedSelect').disabled);
});
run('Winter, summer, both DST transitions and Central midnight convert correctly',()=>{
 const cases=[
 ['2026-01-15T20:30:00Z',870,'CST','2026-01-15'],
 ['2026-07-15T20:30:00Z',930,'CDT','2026-07-15'],
 ['2026-03-08T07:59:59Z',119+59/60,'CST','2026-03-08'],
 ['2026-03-08T08:00:00Z',180,'CDT','2026-03-08'],
 ['2026-11-01T06:59:59Z',119+59/60,'CDT','2026-11-01'],
 ['2026-11-01T07:00:00Z',60,'CST','2026-11-01'],
 ['2026-10-28T05:00:00Z',0,'CDT','2026-10-28'],
 ['2027-01-01T06:00:00Z',0,'CST','2027-01-01']
 ];
 for(const [date,minute,zone,key]of cases){const value=api.centralTimeAt(Date.parse(date));assert(Math.abs(value.minute-minute)<.00001,date);assert.equal(value.zone,zone);assert.equal(value.dateKey,key);}
});
run('Live clock follows elapsed wall time, not simulated frame duration or preview speed',()=>{
 const before=api.minute;now+=1000;api.advance(20);assert(Math.abs(api.minute-before-1/60)<.00001);assert.equal(api.clockMode,'live');
});
run('Slider preview freezes at the chosen minute and Current Central Time restores live sync',()=>{
 api.setTime(480);assert.equal(api.clockMode,'preview');assert(!api.timeRunning);assert.equal(api.minute,480);assert(!elements.get('speedSelect').disabled);now+=300000;api.advance(.5);assert.equal(api.minute,480);
 elements.get('currentTime').onclick();assert.equal(api.clockMode,'live');assert(api.timeRunning);assert(Math.abs(api.minute-api.centralTimeAt(now).minute)<.00001);assert(elements.get('speedSelect').disabled);assert.equal(api.scene,'town');
});
run('Pause clock enters preview; accelerated testing cannot accelerate live time',()=>{
 elements.get('toggleTime').onclick();assert.equal(api.clockMode,'preview');assert(!api.timeRunning);const before=api.minute;api.setSpeed(30);api.setRunning(true);api.advance(2);assert(Math.abs(api.minute-before-60)<.00001);api.useCurrentCentralTime();const live=api.minute;now+=2000;api.advance(2);assert(Math.abs(api.minute-live-2/60)<.00001);
});
run('Focus and visibility restore wall-clock sync; preview stays untouched',()=>{
 now+=3600000;for(const fn of listeners.focus??[])fn();assert(Math.abs(api.minute-api.centralTimeAt(now).minute)<.00001);
 now+=3600000;for(const fn of docListeners.visibilitychange??[])fn();assert(Math.abs(api.minute-api.centralTimeAt(now).minute)<.00001);
 api.setTime(603);now+=3600000;for(const fn of listeners.focus??[])fn();assert.equal(api.minute,603);assert.equal(api.clockMode,'preview');
});
run('Daily routine, pets and town camera still follow the selected clock',()=>{
 for(const [minute,id]of [[480,'breakfast'],[603,'outbound'],[720,'work'],[1083,'return'],[1140,'dinner'],[1260,'couch'],[1380,'sleep']]){api.setTime(minute);assert.equal(api.period,id);assert.equal(api.scene,'town');assert.equal(api.state.cat.scene,'farm');assert(api.townActorsValid);}
});
run('Future controller retains game data and exposes clock state',()=>{
 controller.setGameData({opponent:'BOS',scoreMode:'manual',score:{home:108,away:104}});api.advance(30);assert.equal(api.score.join(','),'108,104');controller.useCurrentCentralTime();assert.equal(controller.getClockState().mode,'live');assert.equal(controller.getClockState().timeZone,'America/Chicago');
});
fs.writeFileSync(path.join(__dirname,'..','clock-verification-results.json'),JSON.stringify(results,null,2));console.log(results);

