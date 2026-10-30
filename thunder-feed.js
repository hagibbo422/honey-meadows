// Thunder live feed: puts the real OKC game on the town scoreboard and court banner.
// Data comes from ESPN's public site API (no key needed). Loaded after game.js.
//
// Rules:
//  - OKC game today (Central Time), not started yet -> opponent on the banner, score 0-0, tip time shown.
//  - Game in progress -> live score, quarter, and game clock.
//  - No game today -> the most recent finished game's final score and opponent.
//  - Offline / ESPN down -> keeps the last result it saw (saved in this browser).
(()=>{
'use strict';
const cfg=Object.assign({liveFeed:true},window.HONEY_MEADOWS_GAME||{});
const ZONE='America/Chicago';
const API='https://site.api.espn.com/apis/site/v2/sports/basketball/nba';
const CACHE_KEY='honeyMeadows.thunderFeed.v1';
// ESPN uses a few short abbreviations that differ from the logo file names.
const ESPN_TO_LOCAL={SA:'SAS',NY:'NYK',GS:'GSW',NO:'NOP',UTAH:'UTA',WSH:'WAS'};
const toLocalId=ab=>{const a=String(ab||'').toUpperCase();return ESPN_TO_LOCAL[a]||a;};

const centralDay=d=>new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(d); // YYYY-MM-DD
const centralTime=d=>new Intl.DateTimeFormat('en-US',{timeZone:ZONE,hour:'numeric',minute:'2-digit'}).format(d);           // 7:00 PM
const centralMD=d=>new Intl.DateTimeFormat('en-US',{timeZone:ZONE,month:'numeric',day:'numeric'}).format(d);               // 10/26
const scoreOf=s=>{if(s==null)return 0;if(typeof s==='object')return Number(s.value??s.displayValue)||0;return Number(s)||0;};

function periodLabel(status){
 const name=status?.type?.name||'',p=Number(status?.period)||0;
 if(name==='STATUS_HALFTIME')return 'HALF';
 if(p<=4)return 'Q'+Math.max(1,p);
 return p===5?'OT':(p-4)+'OT';
}

// Turn one ESPN event into what the scoreboard needs. OKC is always shown on the left.
function eventToGame(ev){
 const comp=ev?.competitions?.[0];if(!comp)return null;
 const okc=comp.competitors.find(t=>toLocalId(t.team?.abbreviation)==='OKC');
 const opp=comp.competitors.find(t=>t!==okc);
 if(!okc||!opp)return null;
 const status=comp.status||ev.status||{},state=status.type?.state||'pre',date=new Date(ev.date);
 const game={id:ev.id,state,date:ev.date,opponent:toLocalId(opp.team?.abbreviation),
  score:{home:scoreOf(okc.score),away:scoreOf(opp.score)},period:'',clock:''};
 if(state==='pre'){game.score={home:0,away:0};game.period='TODAY';game.clock=centralTime(date);}
 else if(state==='in'){game.period=periodLabel(status);game.clock=game.period==='HALF'?'0:00':(status.displayClock||'');}
 else{const p=Number(status.period)||4;game.period=p>4?(p===5?'F/OT':'F/'+(p-4)+'OT'):'FINAL';game.clock=centralMD(date);}
 return game;
}

// Pure decision logic (also used by tools/thunder-feed-test.cjs).
function chooseGame(events,now=new Date()){
 const games=events.map(e=>({ev:e,g:eventToGame(e)})).filter(x=>x.g).sort((a,b)=>new Date(a.g.date)-new Date(b.g.date));
 const live=games.find(x=>x.g.state==='in');if(live)return live;          // covers games running past midnight
 const today=centralDay(now);
 const todays=games.filter(x=>centralDay(new Date(x.g.date))===today);
 if(todays.length)return todays[todays.length-1];                        // today's game: pre (0-0) or already final
 const done=games.filter(x=>x.g.state==='post');
 return done.length?done[done.length-1]:null;                            // no game today: last finished game
}

async function getJSON(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(url+' -> '+r.status);return r.json();}

async function fetchThunderGame(now=new Date()){
 // Regular season + playoffs (playoffs list is empty until they start).
 const lists=await Promise.all([2,3].map(t=>getJSON(`${API}/teams/okc/schedule?seasontype=${t}`).then(j=>j.events||[]).catch(()=>[])));
 const events=lists.flat();
 if(!events.length)throw new Error('ESPN schedule empty');
 const pick=chooseGame(events,now);if(!pick)return null;
 // The team schedule can lag during live games, so refresh today's/live game from the scoreboard.
 if(pick.g.state!=='post'||centralDay(new Date(pick.g.date))===centralDay(now)){
  try{
   const day=centralDay(new Date(pick.g.date)).replace(/-/g,'');
   const sb=await getJSON(`${API}/scoreboard?dates=${day}`);
   const fresh=(sb.events||[]).find(e=>e.id===pick.g.id);
   const g=fresh&&eventToGame(fresh);if(g)return g;
  }catch(e){/* fall back to schedule data */}
 }
 return pick.g;
}

function apply(game){
 const hm=window.HoneyMeadows;if(!hm||!game)return false;
 return hm.setGameData({opponent:game.opponent,scoreMode:'manual',score:game.score,period:game.period,clock:game.clock});
}
function loadCache(){try{return JSON.parse(localStorage.getItem(CACHE_KEY)||'null');}catch(e){return null;}}
function saveCache(g){try{localStorage.setItem(CACHE_KEY,JSON.stringify(g));}catch(e){}}

let current=null,timer=null,lastError=null,lastUpdated=null;
function nextDelay(g){
 if(!g)return 10*60e3;
 if(g.state==='in')return 20e3;                                     // live: every 20 seconds
 if(g.state==='pre'){const until=new Date(g.date)-Date.now();return until<15*60e3?30e3:Math.min(10*60e3,Math.max(30e3,until-10*60e3));}
 return 10*60e3;                                                     // otherwise every 10 minutes
}
async function refresh(){
 clearTimeout(timer);
 try{
  const g=await fetchThunderGame();
  if(g){current=g;lastUpdated=new Date().toISOString();lastError=null;apply(g);saveCache(g);}
 }catch(e){lastError=String(e.message||e);console.warn('[ThunderFeed]',lastError);}
 timer=setTimeout(refresh,nextDelay(current));
}

window.ThunderFeed={chooseGame,eventToGame,toLocalId,refresh,
 get current(){return current;},get lastError(){return lastError;},get lastUpdated(){return lastUpdated;}};

if(cfg.liveFeed&&typeof fetch==='function'&&window.HoneyMeadows){
 const cached=loadCache();if(cached){current=cached;apply(cached);}
 refresh();
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
}
})();
