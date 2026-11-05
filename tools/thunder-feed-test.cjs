// Checks thunder-feed.js decision logic with ESPN-shaped sample data. Node built-ins only.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const root=path.join(__dirname,'..');
const scope={window:{HONEY_MEADOWS_GAME:{liveFeed:false}},Intl,Date,console};
vm.createContext(scope);vm.runInContext(fs.readFileSync(root+'/thunder-feed.js','utf8'),scope);
const F=scope.window.ThunderFeed;

const ev=(id,date,state,okcHome,opp,okc,oppScore,extra={})=>({id,date,competitions:[{status:{period:extra.period??(state==='pre'?0:4),displayClock:extra.clock??'0.0',type:{state,name:extra.name||(state==='post'?'STATUS_FINAL':state==='in'?'STATUS_IN_PROGRESS':'STATUS_SCHEDULED')}},
 competitors:[{homeAway:okcHome?'home':'away',team:{abbreviation:'OKC'},score:{value:okc,displayValue:String(okc)}},{homeAway:okcHome?'away':'home',team:{abbreviation:opp},score:extra.stringScore?String(oppScore):{value:oppScore,displayValue:String(oppScore)}}]}]});

const schedule=[
 ev('1','2026-10-21T01:50Z','post',false,'SA',116,104),
 ev('2','2026-10-23T00:00Z','post',true,'GS',120,111),
 ev('3','2026-10-27T00:00Z','post',true,'UTAH',99,101,{period:5}),
 ev('4','2026-10-29T00:00Z','pre',true,'NY',0,0),
];
const results=[];
const t=(name,fn)=>{fn();results.push({name,result:'PASS'});};

// Oct 27 at 1 PM Central: no game today -> last final (UTA, OT loss).
t('No game today shows previous final score and opponent',()=>{
 const g=F.chooseGame(schedule,new Date('2026-10-27T18:00Z')).g;
 assert.equal(g.opponent,'UTA');assert.equal(g.score.home,99);assert.equal(g.score.away,101);assert.equal(g.period,'F/OT');assert.equal(g.clock,'10/26');
});
// Oct 28 at noon Central: game tonight 7 PM Central -> 0-0 vs NYK.
t('Game day before tip shows 0-0 and the new opponent',()=>{
 const g=F.chooseGame(schedule,new Date('2026-10-28T17:00Z')).g;
 assert.equal(g.opponent,'NYK');assert.deepEqual({...g.score},{home:0,away:0});assert.equal(g.period,'TODAY');assert.equal(g.clock,'7:00 PM');
});
t('Live game shows real score, quarter, and clock (OKC always left)',()=>{
 const live=[...schedule.slice(0,3),ev('4','2026-10-29T00:00Z','in',false,'NY',54,49,{period:2,clock:'3:21',stringScore:true})];
 const g=F.chooseGame(live,new Date('2026-10-29T01:00Z')).g;
 assert.equal(g.opponent,'NYK');assert.equal(g.score.home,54);assert.equal(g.score.away,49);assert.equal(g.period,'Q2');assert.equal(g.clock,'3:21');
});
t('Live game past midnight Central is still shown live',()=>{
 const live=[...schedule.slice(0,3),ev('4','2026-10-29T03:30Z','in',true,'NY',101,100,{period:5,clock:'1:02'})];
 const g=F.chooseGame(live,new Date('2026-10-29T05:10Z')).g;assert.equal(g.period,'OT');assert.equal(g.score.home,101);
});
t('Halftime label',()=>{const g=F.eventToGame(ev('9','2026-10-29T00:00Z','in',true,'NY',60,55,{period:2,name:'STATUS_HALFTIME'}));assert.equal(g.period,'HALF');});
t('Same-day finished game stays up for the rest of the day',()=>{
 const done=[...schedule.slice(0,3),ev('4','2026-10-29T00:00Z','post',true,'NY',118,107)];
 const g=F.chooseGame(done,new Date('2026-10-29T04:30Z')).g;assert.equal(g.opponent,'NYK');assert.equal(g.period,'FINAL');assert.equal(g.score.home,118);
});
t('Every ESPN abbreviation maps to a logo file',()=>{
 for(const a of ['ATL','BOS','BKN','CHA','CHI','CLE','DAL','DEN','DET','GS','HOU','IND','LAC','LAL','MEM','MIA','MIL','MIN','NO','NY','ORL','PHI','PHX','POR','SAC','SA','TOR','UTAH','WSH'])
  assert(fs.existsSync(`${root}/assets/teams/${F.toLocalId(a)}.png`),a);
});
// New rules (Nov 2026): final stays up for the game day + 1 day, then the next game shows with its date.
const gap=[ev('1','2026-10-27T00:00Z','post',true,'PHX',125,114),ev('2','2026-10-31T23:00Z','pre',false,'DEN',0,0)];
t('Day after a game still shows that final',()=>{const g=F.chooseGame(gap,new Date('2026-10-27T20:00Z')).g;assert.equal(g.opponent,'PHX');assert.equal(g.period,'FINAL');});
t('Two days after a game shows the next game with date and time',()=>{
 const g=F.chooseGame(gap,new Date('2026-10-28T15:00Z')).g;
 assert.equal(g.opponent,'DEN');assert.deepEqual({...g.score},{home:0,away:0});assert.equal(g.period,'OCT 31');assert.equal(g.clock,'6:00 PM');
});
t('Next game shows TODAY on game day',()=>{const g=F.chooseGame(gap,new Date('2026-10-31T15:00Z')).g;assert.equal(g.period,'TODAY');assert.equal(g.opponent,'DEN');});
const b2b=[ev('1','2026-10-27T00:00Z','post',true,'PHX',125,114),ev('2','2026-10-28T00:30Z','pre',false,'MIN',0,0)];
t('Back-to-back: the next day shows the upcoming game, not yesterday’s final',()=>{
 const g=F.chooseGame(b2b,new Date('2026-10-27T14:00Z')).g;assert.equal(g.opponent,'MIN');assert.equal(g.period,'TODAY');assert.equal(g.clock,'7:30 PM');
});
t('Off-season (no upcoming games) keeps the last final',()=>{const g=F.chooseGame([gap[0]],new Date('2026-11-20T15:00Z')).g;assert.equal(g.opponent,'PHX');assert.equal(g.period,'FINAL');});
console.log(results);
