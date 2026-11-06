// Checks osu-feed.js decision logic with ESPN-shaped college football data. Node built-ins only.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const scope={window:{HONEY_MEADOWS_GAME:{liveFeed:false}},Intl,Date,console};
vm.createContext(scope);vm.runInContext(fs.readFileSync(root+'/osu-feed.js','utf8'),scope);
const F=scope.window.OSUFeed;
const ev=(id,date,state,osuHome,opp,oppId,osu,oppScore,extra={})=>({id,date,competitions:[{status:{period:extra.period??(state==='pre'?0:4),displayClock:extra.clock??'0:00',type:{state,name:extra.name||(state==='post'?'STATUS_FINAL':state==='in'?'STATUS_IN_PROGRESS':'STATUS_SCHEDULED')}},
 competitors:[{homeAway:osuHome?'home':'away',team:{id:'197',abbreviation:'OKST'},score:{value:osu,displayValue:String(osu)}},{homeAway:osuHome?'away':'home',team:{id:oppId,abbreviation:opp},score:{value:oppScore,displayValue:String(oppScore)}}]}]});
const schedule=[
 ev('1','2026-10-31T19:00Z','post',true,'BAY','239',31,24),
 ev('2','2026-11-07T20:30Z','pre',false,'KSU','2306',0,0),
 ev('3','2026-11-14T18:00Z','pre',true,'TTU','2641',0,0),
 ev('4','2026-11-21T22:00Z','pre',false,'ASU','9',0,0),
 ev('5','2026-11-28T19:00Z','pre',true,'KU','2305',0,0)
];
const results=[];const t=(name,fn)=>{fn();results.push({name,result:'PASS'});};
t('Day after a game shows that final',()=>{const g=F.chooseGame(schedule,new Date('2026-11-01T18:00Z')).g;assert.equal(g.opponent,'BAY');assert.equal(g.period,'FINAL');assert.equal(g.score.home,31);});
t('Later in the week shows the next game with date, time and logo',()=>{const g=F.chooseGame(schedule,new Date('2026-11-05T18:00Z')).g;assert.equal(g.opponent,'KSU');assert.equal(g.period,'NOV 7');assert.equal(g.clock,'2:30 PM');assert.equal(g.logo,'assets/osu/KSU.png');assert.equal(g.homeAway,'away');});
t('Game day before kickoff shows TODAY',()=>{const g=F.chooseGame(schedule,new Date('2026-11-07T15:00Z')).g;assert.equal(g.period,'TODAY');assert.deepEqual({...g.score},{home:0,away:0});});
t('Live game shows quarter, clock and OSU score on the left',()=>{const s=[...schedule];s[1]=ev('2','2026-11-07T20:30Z','in',false,'KSU','2306',21,17,{period:3,clock:'8:04'});const g=F.chooseGame(s,new Date('2026-11-07T22:00Z')).g;assert.equal(g.period,'3RD');assert.equal(g.clock,'8:04');assert.equal(g.score.home,21);assert.equal(g.score.away,17);});
t('Halftime and overtime labels',()=>{assert.equal(F.eventToGame(ev('9','2026-11-07T20:30Z','in',true,'KSU','2306',14,14,{period:2,name:'STATUS_HALFTIME'})).period,'HALF');assert.equal(F.eventToGame(ev('9','2026-11-07T20:30Z','in',true,'KSU','2306',14,14,{period:5})).period,'OT');});
t('All four supplied opponent logos map and exist',()=>{for(const [id,a] of [['2306','KSU'],['2641','TTU'],['9','ASU'],['2305','KU']]){const g=F.eventToGame(ev('x','2026-11-07T20:30Z','pre',true,'??',id,0,0));assert.equal(g.opponent,a);assert(fs.existsSync(root+'/'+g.logo));}});
console.log(results);
