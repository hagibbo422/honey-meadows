const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.resolve(__dirname,'..'),elements=new Map(),listeners={};
const context=new Proxy({createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};}},{get:(o,k)=>k in o?o[k]:()=>{}});
const element=()=>({style:{},dataset:{},classList:{add(){},remove(){}},setAttribute(){},addEventListener(){},querySelectorAll(){return []},focus(){},getContext(){return context;}});
const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},querySelectorAll(){return []},addEventListener(){},createElement(){return element();}};
const window={addEventListener(type,fn){(listeners[type]??=[]).push(fn);}};
const scope={window,document,Image:class{addEventListener(){}},localStorage:{getItem(){return null},setItem(){},removeItem(){}},requestAnimationFrame(){},console,Date,Math,Set,Map,URL};vm.createContext(scope);
for(const file of ['game-data.js','assets-embedded.js','game.js'])vm.runInContext(fs.readFileSync(root+'/'+file,'utf8'),scope);
const api=window.HM_DEBUG,controller=window.HoneyMeadows,results=[];const run=(name,fn)=>{fn();results.push({name,result:'PASS'});};
run('Town is the startup view and stays selected throughout the entire routine',()=>{
 assert.equal(api.scene,'town');for(const m of [0,479,480,600,601,603,606,720,1080,1081,1083,1086,1201,1321,1439]){api.setTime(m);assert.equal(api.scene,'town');assert(api.townActorsValid);assert.equal(api.state.cat.scene,'farm');}
});
run('No opponent selector, upload or reset controls remain',()=>{
 const html=fs.readFileSync(root+'/index.html','utf8');for(const id of ['teamSelect','replaceBanner','resetBanner','bannerMessage'])assert(!html.includes('id="'+id+'"'));
 assert(!fs.readFileSync(root+'/game.js','utf8').includes('function drawTeamBanner'));
});
run('All 30 logo files and embedded fallbacks remain available',()=>{
 assert.equal(api.teams.length,30);for(const team of api.teams){assert(fs.existsSync(root+'/assets/teams/'+team.id+'.png'));assert(window.HONEY_MEADOWS_ASSETS['team_'+team.id]);}
});
run('External data controller updates opponent and fixed scores without automatic overwrites',()=>{
 assert(controller.setGameData({opponent:'BOS',scoreMode:'manual',score:{home:108,away:104},period:'Final',clock:'0:00'}));
 api.advance(70);assert.equal(api.opponent,'BOS');assert.equal(api.score.join(','),'108,104');assert.equal(controller.getGameData().period,'Final');assert.equal(controller.getGameData().clock,'0:00');
 assert(!controller.setGameData({opponent:'INVALID'}));assert.equal(api.opponent,'BOS');
 controller.setGameData({opponent:'SAS',scoreMode:'simulation',score:{home:20,away:16}});api.advance(10);assert.notEqual(api.score.join(','),'20,16');
});
run('Optional interior views and Escape return to the town without changing the schedule',()=>{
 api.setTime(720);api.setView('farm');assert.equal(api.scene,'farm');assert.equal(api.state.girl.scene,'nails');for(const fn of listeners.keydown??[])fn({key:'Escape'});assert.equal(api.scene,'town');assert.equal(elements.get('viewSelect').value,'town');
});
run('Project has separate editable code, data, and offline-image files',()=>{
 const html=fs.readFileSync(root+'/index.html','utf8');for(const f of ['game.js','game-data.js','assets-embedded.js'])assert(html.includes('src="'+f));assert(fs.statSync(root+'/game.js').size<150000);
});
fs.writeFileSync(path.join(__dirname,'..','verification-results.json'),JSON.stringify(results,null,2));console.log(results);

