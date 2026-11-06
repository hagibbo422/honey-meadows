/* Shared navigation has no DOM dependency; usable in other renderers. */
(function(root){'use strict';
const inside=(p,poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};
function segmentDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
class Navigation{
 constructor(map){this.map=map;this.step=map.navStep;this.nodes=new Map();this.edges=new Map();for(let y=this.step/2;y<map.height;y+=this.step)for(let x=this.step/2;x<map.width;x+=this.step)if(this.valid([x,y]))this.nodes.set(this.key([x,y]),[x,y]);}
 key(p){return p[0]+','+p[1];}
 ground(p){return this.map.paths.some(path=>path.points.slice(1).some((b,i)=>segmentDistance(p,path.points[i],b)<=path.width/2))&&!this.map.blockers.some(b=>inside(p,b))&&!this.map.buildings.some(b=>inside(p,b.collision));}
 valid(p){const r=this.map.actorRadius;return [[0,0],[-r,0],[r,0],[0,-r],[0,r],[-r*.7,-r*.7],[r*.7,r*.7],[-r*.7,r*.7],[r*.7,-r*.7]].every(([dx,dy])=>this.ground([p[0]+dx,p[1]+dy]));}
 clear(a,b){const n=Math.max(1,Math.ceil(Math.hypot(a[0]-b[0],a[1]-b[1])/2));for(let i=0;i<=n;i++)if(!this.valid([a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n]))return false;return true;}
 nearest(p,max=Infinity){let best=null,d=max;for(const n of this.nodes.values()){const v=Math.hypot(n[0]-p[0],n[1]-p[1]);if(v<d){d=v;best=n;}}return best&&[...best];}
 edgeClear(a,b){const key=[this.key(a),this.key(b)].sort().join('|');if(!this.edges.has(key))this.edges.set(key,this.clear(a,b));return this.edges.get(key);}
 route(from,to,maxSnap=20){const a=this.nearest(from,12),b=this.nearest(to,maxSnap);if(!a||!b||!this.clear(from,a))return null;const start=this.key(a),goal=this.key(b),queue=[a],prev=new Map([[start,null]]);for(let i=0;i<queue.length;i++){const p=queue[i],k=this.key(p);if(k===goal)break;for(const [dx,dy] of [[this.step,0],[-this.step,0],[0,this.step],[0,-this.step]]){const q=[p[0]+dx,p[1]+dy],qk=this.key(q);if(this.nodes.has(qk)&&!prev.has(qk)&&this.edgeClear(p,q)){prev.set(qk,k);queue.push(q);}}}if(!prev.has(goal))return null;let k=goal,out=[];while(k!==null){out.push(this.nodes.get(k));k=prev.get(k);}out.reverse();if(this.valid(to)&&this.clear(b,to))out.push([...to]);return out;}
 move(actor,dt){let remaining=actor.speed*dt;actor.moving=false;while(actor.route?.length&&remaining>0){const q=actor.route[0],d=Math.hypot(q[0]-actor.x,q[1]-actor.y),take=Math.min(d,remaining),next=d<.001?q:[actor.x+(q[0]-actor.x)*take/d,actor.y+(q[1]-actor.y)*take/d];if(!this.clear([actor.x,actor.y],next)){actor.route=[];break;}actor.direction=next[0]<actor.x?'left':next[0]>actor.x?'right':next[1]<actor.y?'up':'down';actor.x=next[0];actor.y=next[1];remaining-=take;actor.moving=true;actor.phase=(actor.phase||0)+take/5;if(d<=take+.001)actor.route.shift();}}
}
root.HMEngine={Navigation,inside,segmentDistance};
})(typeof window==='undefined'?globalThis:window);
