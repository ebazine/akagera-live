/* Akagera Live: sightings, road conditions and GPS navigation for Akagera National Park.
   Map data: OpenStreetMap contributors (ODbL) and the park entrance board. Weather: Open-Meteo. */
"use strict";

/* =========================================================================
   0. Catalogue
   ========================================================================= */
const ANIMALS = [
  ['lion','Lion','🦁'],['elephant','Elephant','🐘'],['rhino','Rhino','🦏'],['leopard','Leopard','🐆'],
  ['buffalo','Buffalo','🐃'],['giraffe','Giraffe','🦒'],['zebra','Zebra','🦓'],['hippo','Hippo','🦛'],
  ['croc','Crocodile','🐊'],['hyena','Hyena','🐾'],['topi','Topi','🦌'],['impala','Impala','🦌'],['eland','Eland','🦌'],
  ['waterbuck','Waterbuck','🦌'],['roan','Roan antelope','🦌'],['warthog','Warthog','🐗'],['baboon','Baboon','🐒'],
  ['shoebill','Shoebill','🐦'],['bird','Other bird','🦅'],['other','Other animal','🐾']
];
const TOP_ANIMALS = ['lion','elephant','rhino','leopard','buffalo','giraffe','zebra','hippo'];
const PLURAL = {buffalo:'Buffalo',topi:'Topi',waterbuck:'Waterbuck',eland:'Eland',impala:'Impala',rhino:'Rhinos',bird:'Birds',other:'Animals'};
/* road types: life = hours when the weather does not matter; wet types dry out after rain stops */
const ROADS = [
  ['mud','Mud / slippery','🟤',{wet:true,base:24,dry:12,perMm:1.5,cap:96}],
  ['flood','Flooded','🌊',{wet:true,base:36,dry:24,perMm:2.0,cap:120}],
  ['steep','Slippery climb','⛰️',{wet:true,base:12,dry:8,perMm:1.0,cap:48}],
  ['holes','Potholes / ruts','🕳️',{base:24*14}],
  ['washout','Washed out','🚧',{base:24*30}],
  ['tree','Fallen tree','🌳',{base:72}],
  ['closed','Road closed','⛔',{base:24*7}],
  ['stuck','Vehicle stuck','🚙',{base:6}],
  ['block','Animals on road','🐃',{base:1}],
  ['other','Other hazard','⚠️',{base:48}]
];
const COUNTS = ['1','2–5','6–20','20+'];
const ACTS = ['Resting','Feeding','Moving','Hunting','Crossing road','At water'];
const ROADDIST = ['On the road','Under 50 m','50–200 m','Over 200 m'];
const SEV = [['1','Passable with care','Slow down, any car'],['2','4x4 only','High clearance and low range'],['3','Impassable','Turn back, find another way']];
const DIRS = ['N','NE','E','SE','S','SW','W','NW'];
const DIRNAME = ['north','north-east','east','south-east','south','south-west','west','north-west'];
const AN = Object.fromEntries(ANIMALS.map(a=>[a[0],a])), RD = Object.fromEntries(ROADS.map(a=>[a[0],a]));
const PCOL = {gate:'#C0392B',reception:'#E3A812',hq:'#6E4828',lodge:'#1F5FAE',camp:'#2E7D4F',ranger:'#56626A',fence:'#7A4A99',picnic:'#24407F',lookout:'#D2691E',fuel:'#333'};

/* =========================================================================
   1. Small helpers
   ========================================================================= */
const $ = id => document.getElementById(id);
const LS = {get(k,d){try{const v=localStorage.getItem('akl2_'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{localStorage.setItem('akl2_'+k,JSON.stringify(v));}catch(e){}}};
function el(tag,attrs,...kids){const e=document.createElement(tag);if(attrs)for(const k in attrs){const v=attrs[k];if(v==null||v===false)continue;if(k==='class')e.className=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(k==='text')e.textContent=v;else e.setAttribute(k,v===true?'':v);}for(const c of kids){if(c==null||c===false)continue;e.append(c instanceof Node?c:document.createTextNode(String(c)));}return e;}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const fmtD=m=>m<950?`${Math.max(10,Math.round(m/(m<200?10:50))*(m<200?10:50))} m`:`${(m/1000).toFixed(m<9500?1:0)} km`;
const fmtDur=s=>{const m=Math.round(s/60);if(m<60)return `${Math.max(1,m)} min`;return `${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')}`;};
const hhmm=t=>new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});
function dayWord(t){const d=new Date(t),n=new Date();const a=new Date(d.getFullYear(),d.getMonth(),d.getDate()),b=new Date(n.getFullYear(),n.getMonth(),n.getDate());const diff=Math.round((b-a)/864e5);if(diff===0)return 'today';if(diff===1)return 'yesterday';if(diff===-1)return 'tomorrow';return d.toLocaleDateString([], {weekday:'short',day:'numeric',month:'short'});}
function ago(t){const m=Math.round((Date.now()-t)/60000);if(m<1)return 'just now';if(m<60)return `${m} min ago`;const h=Math.floor(m/60);if(h<24)return `${h} h ${m%60?String(m%60).padStart(2,'0')+' min ':''}ago`;return `${Math.round(h/24)} d ago`;}
const stamp=t=>`${hhmm(t)} ${dayWord(t)}`;
const angDiff=(a,b)=>((b-a+540)%360)-180;

/* =========================================================================
   2. Projection (Web Mercator metres, y pointing down)
   ========================================================================= */
const RAD=Math.PI/180, ER=6378137, KG=Math.cos(1.7*RAD);
const merc=(lon,lat)=>[ER*lon*RAD, -ER*Math.log(Math.tan(Math.PI/4+lat*RAD/2))];
const unmerc=(x,y)=>({lon:x/ER/RAD, lat:(2*Math.atan(Math.exp(-y/ER))-Math.PI/2)/RAD});
const gd=(ax,ay,bx,by)=>Math.hypot(bx-ax,by-ay)*KG;                 // ground metres
const brg=(ax,ay,bx,by)=>((Math.atan2(bx-ax,-(by-ay))/RAD)+360)%360;
const dir8=d=>Math.round(d/45)%8;

/* =========================================================================
   3. State
   ========================================================================= */
const S = {
  board:null, osm:null, layers:{}, pois:[], juncs:[], named:[], park:null,
  graph:null, grid:null,
  gps:{ok:false,denied:false,x:0,y:0,lat:0,lon:0,acc:0,heading:null,speed:0,t:0},
  manual: LS.get('manual', null),
  live:[], local: LS.get('local', []), sync:'local', fs:null,
  wx: LS.get('wx', null),
  route:null, nav:null,
  set: Object.assign({voice:true, tilt:true, wake:true, sat:false, hideEx:false}, LS.get('settings', {})),
  device: LS.get('dev', null) || (()=>{const d='d'+Math.random().toString(36).slice(2,10);LS.set('dev',d);return d;})(),
  sim:null, follow:true, view:'browse'
};

/* =========================================================================
   4. Data: layers, POIs, routing graph
   ========================================================================= */
async function getJSON(u){const r=await fetch(u,{cache:'no-cache'});if(!r.ok)throw new Error(u+' '+r.status);return r.json();}
function pathOf(rings,close){const p=new Path2D();for(const l of rings){for(let i=0;i<l.length;i++){const q=merc(l[i][0],l[i][1]);i?p.lineTo(q[0],q[1]):p.moveTo(q[0],q[1]);}if(close)p.closePath();}return p;}
function inRing(x,y,ring){let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1]+1e-12)+a[0])c=!c;}return c;}
const MAJOR=new Set(['motorway','trunk','primary','secondary','tertiary','motorway_link','trunk_link','primary_link','secondary_link','tertiary_link']);
const MINOR=new Set(['unclassified','residential','road','living_street','service']);
const SHORTN=n=>n.replace(/^Ranger post - /,'').replace(/^Fence house - /,'Fence house ').replace(' (north) - EXIT ONLY',' (exit only)').replace(' / Visitor Centre','').replace(' (south boundary)','').replace(' / Office','');

function buildData(){
  const B=S.board, O=S.osm;
  const parkRing = (O&&O.park&&O.park[0]&&O.park[0].length>50)?O.park[0]:B.park[0];
  S.park = parkRing.map(c=>merc(c[0],c[1]));
  const L=S.layers;
  L.park=pathOf([parkRing],true);
  const useOsmWet=O&&O.wetland&&O.wetland.length>2, useOsmWater=O&&O.water&&O.water.length>2;
  L.wet=useOsmWet?pathOf(O.wetland.flatMap(w=>w.g),true):pathOf(B.swamp,true);
  L.water=useOsmWater?pathOf(O.water.flatMap(w=>w.g),true):null;
  L.shore=useOsmWater?null:pathOf(B.shore,false);
  L.rivers=O&&O.rivers?pathOf(O.rivers.map(r=>r.g),false):null;
  const groups={major:[],minor:[],track:[]};
  if(O&&O.ways&&O.ways.length>20){
    for(const w of O.ways){const g=MAJOR.has(w.h)?'major':MINOR.has(w.h)?'minor':'track';groups[g].push(w.n.map(i=>[O.nodes[2*i],O.nodes[2*i+1]]));}
  } else groups.track=B.roads;
  L.major=pathOf(groups.major,false);L.minor=pathOf(groups.minor,false);L.track=pathOf(groups.track,false);
  L.osm=!!(O&&O.ways&&O.ways.length>20);
  // water labels from OSM
  S.waterNames=[];
  if(useOsmWater)for(const w of O.water){if(!w.nm)continue;const r=w.g[0];let sx=0,sy=0;for(const c of r){sx+=c[0];sy+=c[1];}const q=merc(sx/r.length,sy/r.length);S.waterNames.push({name:w.nm,x:q[0],y:q[1],size:r.length});}
  // POIs from board, then OSM
  S.pois=B.pois.map(p=>{const q=merc(p.lon,p.lat);return {name:p.n,short:SHORTN(p.n),cat:p.c,x:q[0],y:q[1],lat:p.lat,lon:p.lon,note:p.note,src:'board',num:p.c==='junction'?+p.n.split(' ').pop():null};});
  if(O&&O.pois){
    // numbered junction stones are mapped in OpenStreetMap: use those exact positions
    const oj=O.pois.filter(p=>/^\d{1,3}$/.test(p.nm||''));
    if(oj.length>=30){const have=new Set();
      for(const p of oj){const q=merc(p.lon,p.lat);const num=+p.nm;have.add(num);const b=S.pois.find(x=>x.cat==='junction'&&x.num===num);
        if(b){Object.assign(b,{x:q[0],y:q[1],lat:p.lat,lon:p.lon,src:'osm'});}else S.pois.push({name:'Junction '+num,short:'Junction '+num,cat:'junction',num,x:q[0],y:q[1],lat:p.lat,lon:p.lon,note:'',src:'osm'});}}
    const kindOf=p=>{const n=(p.nm||'').toLowerCase();
      if(/^\d{1,3}$/.test(n))return null;
      if(n.includes('ranger'))return 'ranger';
      if(n.includes('welcome')||n.includes('visitor'))return 'reception';
      if(p.k==='police')return 'ranger';
      return {hotel:'lodge',guest_house:'lodge',chalet:'lodge',hostel:'lodge',camp_site:'camp',viewpoint:'lookout',picnic_site:'picnic',ranger_station:'ranger',gate:'gate',fuel:'fuel',peak:'hill',hill:'hill',restaurant:n.includes('picnic')?'picnic':null,information:n.includes('office')?'hq':null}[p.k]
        ||(['locality','island','peninsula','plain','hamlet'].includes(p.k)?'area':null);};
    for(const p of O.pois){
      const cat=kindOf(p);if(!cat)continue;
      const q=merc(p.lon,p.lat);
      if((cat==='area'||!p.nm)&&!inRing(q[0],q[1],S.park))continue;
      const words=(p.nm||'').toLowerCase().split(/\W+/).filter(w=>w.length>3&&!['lake','camp','lodge','park','national','akagera','tented','campsite','gate','centre','post','spot','only'].includes(w));
      let twin=S.pois.find(b=>b.src!=='osm-new'&&b.cat===cat&&b.cat!=='junction'&&((words.length&&words.some(w=>b.name.toLowerCase().includes(w))&&gd(b.x,b.y,q[0],q[1])<5000)||gd(b.x,b.y,q[0],q[1])<250));
      if(!twin&&cat==='ranger')twin=S.pois.find(b=>b.cat==='ranger'&&b.src==='board'&&gd(b.x,b.y,q[0],q[1])<2500);
      if(!twin&&cat==='picnic')twin=S.pois.find(b=>b.cat==='picnic'&&b.src==='board'&&gd(b.x,b.y,q[0],q[1])<3000);
      if(twin){if(twin.src==='osm'&&cat!=='reception')continue;Object.assign(twin,{x:q[0],y:q[1],lat:p.lat,lon:p.lon,src:'osm'});if(p.nm&&twin.name!==p.nm&&cat==='lodge')twin.note=(twin.note?twin.note+' ':'')+`Listed on OpenStreetMap as ${p.nm}.`;continue;}
      const nm=p.nm||({viewpoint:'Viewpoint',picnic_site:'Picnic site',camp_site:'Campsite',fuel:'Fuel'}[p.k]||'Place');
      S.pois.push({name:nm,short:nm,cat,x:q[0],y:q[1],lat:p.lat,lon:p.lon,note:'',src:'osm-new'});
    }
  }
  S.juncs=S.pois.filter(p=>p.cat==='junction').sort((a,b)=>a.num-b.num);
  S.named=S.pois.filter(p=>['lake','area','gate','lodge','camp','lookout','picnic','reception','hill'].includes(p.cat));
  for(const w of S.waterNames){if(!S.named.some(n=>n.cat==='lake'&&n.name===w.name))S.named.push({name:w.name,short:w.name,cat:'lake',x:w.x,y:w.y});}
  buildGraph();
}

function buildGraph(){
  const O=S.osm; let X=[],Y=[],ways=[];
  if(O&&O.ways&&O.ways.length>20){
    const n=O.nodes.length/2;for(let i=0;i<n;i++){const q=merc(O.nodes[2*i],O.nodes[2*i+1]);X.push(q[0]);Y.push(q[1]);}
    ways=O.ways.map(w=>({n:w.n,h:w.h,nm:w.nm||'',t:w.t,s:w.s,o:w.o==='yes'}));
  } else {
    const key=new Map();
    const id=c=>{const k=c[0].toFixed(5)+','+c[1].toFixed(5);let v=key.get(k);if(v==null){v=X.length;key.set(k,v);const q=merc(c[0],c[1]);X.push(q[0]);Y.push(q[1]);}return v;};
    ways=S.board.roads.map(r=>({n:r.map(id),h:'track',nm:'',o:false}));
    // the traced board network has gaps: join loose ends to the nearest other fragment within 400 m
    const N0=X.length,par=Int32Array.from({length:N0},(_,i)=>i);const f=i=>{while(par[i]!==i){par[i]=par[par[i]];i=par[i];}return i;};
    const dg=new Uint16Array(N0);for(const w of ways){for(let k=0;k+1<w.n.length;k++){par[f(w.n[k])]=f(w.n[k+1]);}dg[w.n[0]]++;dg[w.n[w.n.length-1]]++;}
    for(let i=0;i<N0;i++){if(dg[i]!==1)continue;let best=-1,bd=400;for(let j=0;j<N0;j++){if(f(j)===f(i))continue;const d=gd(X[i],Y[i],X[j],Y[j]);if(d<bd){bd=d;best=j;}}if(best>=0){ways.push({n:[i,best],h:'track',nm:'',o:false,link:true});par[f(i)]=f(best);}}
    // then join whole fragments, shortest gaps first (Kruskal), up to 2.5 km
    const pairs=[];for(let i=0;i<N0;i++)for(let j=i+1;j<N0;j++){if(f(i)===f(j))continue;const d=gd(X[i],Y[i],X[j],Y[j]);if(d<2500)pairs.push([d,i,j]);}
    pairs.sort((p,q)=>p[0]-q[0]);for(const [d,i,j] of pairs){if(f(i)!==f(j)){par[f(i)]=f(j);ways.push({n:[i,j],h:'track',nm:'',o:false,link:true});}}
  }
  const N=X.length, adj=Array.from({length:N},()=>[]), segs=[];
  for(let wi=0;wi<ways.length;wi++){const w=ways[wi];
    let sx=0,sy=0;for(const i of w.n){sx+=X[i];sy+=Y[i];}const inPark=inRing(sx/w.n.length,sy/w.n.length,S.park);
    let v={motorway:80,trunk:70,primary:60,secondary:50,tertiary:40,unclassified:30,residential:25,living_street:15,service:15,road:25,track:20}[w.h]||20;
    if(w.h==='track'){v={grade1:28,grade2:24,grade3:20,grade4:14,grade5:10}[w.t]||20;}
    if(inPark){v=MAJOR.has(w.h)?35:w.h==='track'?Math.min(v,18):Math.min(v,28);if(w.h==='track'&&w.t==='grade1')v=25;} w.v=v/3.6; w.inPark=inPark;
    for(let k=0;k+1<w.n.length;k++){const a=w.n[k],b=w.n[k+1];if(a===b)continue;const len=gd(X[a],Y[a],X[b],Y[b]);const si=segs.length;segs.push([a,b,wi,len]);adj[a].push([b,si,wi]);if(!w.o)adj[b].push([a,si,wi]);}
  }
  const deg=new Uint8Array(N);for(let i=0;i<N;i++){deg[i]=new Set(adj[i].map(e=>e[0])).size;}
  // reverse adjacency for one-way ends counts (degree of incoming links)
  for(const s of segs){/* ensure b knows a for degree even if one-way */ if(!adj[s[1]].some(e=>e[0]===s[0]))deg[s[1]]++;}
  S.graph={X,Y,adj,segs,ways,deg,N};
  // spatial grid over segments
  const C=400,grid=new Map();
  for(let si=0;si<segs.length;si++){const [a,b]=segs[si];const x0=Math.floor(Math.min(X[a],X[b])/C),x1=Math.floor(Math.max(X[a],X[b])/C),y0=Math.floor(Math.min(Y[a],Y[b])/C),y1=Math.floor(Math.max(Y[a],Y[b])/C);
    for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){const k=gx+','+gy;let l=grid.get(k);if(!l){l=[];grid.set(k,l);}l.push(si);}}
  S.grid={C,grid};
}
function segsNear(x,y,r){const {C,grid}=S.grid;const out=new Set();const x0=Math.floor((x-r)/C),x1=Math.floor((x+r)/C),y0=Math.floor((y-r)/C),y1=Math.floor((y+r)/C);for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){const l=grid.get(gx+','+gy);if(l)for(const s of l)out.add(s);}return out;}
function projSeg(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy;let t=L?((px-ax)*dx+(py-ay)*dy)/L:0;t=clamp(t,0,1);const qx=ax+t*dx,qy=ay+t*dy;return {t,qx,qy,d:gd(px,py,qx,qy)};}
function snap(x,y,maxM=3000){
  const G=S.graph;let best=null;
  for(const r of [300,1200,maxM/KG]){const cand=segsNear(x,y,r);for(const si of cand){const [a,b]=G.segs[si];const p=projSeg(x,y,G.X[a],G.Y[a],G.X[b],G.Y[b]);if(!best||p.d<best.d)best={si,a,b,...p};}if(best&&best.d<r*KG)break;}
  return best&&best.d<=maxM?best:null;
}

/* ---------- routing (A* with road-report and weather penalties) ---------- */
class Heap{constructor(){this.k=[];this.v=[];}push(key,val){const k=this.k,v=this.v;let i=k.length;k.push(key);v.push(val);while(i>0){const p=(i-1)>>1;if(k[p]<=k[i])break;[k[p],k[i]]=[k[i],k[p]];[v[p],v[i]]=[v[i],v[p]];i=p;}}pop(){const k=this.k,v=this.v;const top=v[0],tk=k[0];const lk=k.pop(),lv=v.pop();if(k.length){k[0]=lk;v[0]=lv;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<k.length&&k[l]<k[m])m=l;if(r<k.length&&k[r]<k[m])m=r;if(m===i)break;[k[m],k[i]]=[k[i],k[m]];[v[m],v[i]]=[v[i],v[m]];i=m;}}return [tk,top];}get size(){return this.k.length;}}
function penalties(){
  const G=S.graph,pen=new Map();const reasons=new Map();
  for(const r of activeRoadReports()){const [x,y]=merc(r.lon,r.lat);
    const f=r.sev==='3'?Infinity:r.sev==='2'?2.5:1.4;
    for(const si of segsNear(x,y,150)){const [a,b]=G.segs[si];const p=projSeg(x,y,G.X[a],G.Y[a],G.X[b],G.Y[b]);if(p.d<120){pen.set(si,Math.max(pen.get(si)||1,f));reasons.set(si,r);}}}
  const wet=wetness(); const wf=1+Math.min(0.6,wet/30);
  return {pen,reasons,wf};
}
function route(fromX,fromY,toX,toY,destName){
  const G=S.graph;const s0=snap(fromX,fromY,6000), s1=snap(toX,toY,6000);
  if(!s0||!s1)return {error:'far',s0,s1};
  const {pen,reasons,wf}=penalties();
  const cost=(si,wi)=>{const w=G.ways[wi];const len=G.segs[si][3];let c=len/w.v;if(w.h==='track')c*=wf;const p=pen.get(si);if(p)c*=p;return c;};
  const vmax=60/3.6;
  const gS=new Float64Array(G.N).fill(Infinity),prev=new Int32Array(G.N).fill(-1),prevSeg=new Int32Array(G.N).fill(-1);
  const h=i=>gd(G.X[i],G.Y[i],s1.qx,s1.qy)/vmax;
  const heap=new Heap();
  const segStart=G.segs[s0.si], segEnd=G.segs[s1.si];
  const startCost=(node,frac)=>{const w=G.ways[segStart[2]];let c=segStart[3]*frac/w.v;const p=pen.get(s0.si);if(p&&p!==Infinity)c*=p;return c;};
  // the car may drive either way along its own segment (unless one-way)
  gS[segStart[0]]=startCost(segStart[0],s0.t);heap.push(gS[segStart[0]]+h(segStart[0]),segStart[0]);
  if(!G.ways[segStart[2]].o||true){gS[segStart[1]]=startCost(segStart[1],1-s0.t);heap.push(gS[segStart[1]]+h(segStart[1]),segStart[1]);}
  const endExtra=new Map();const we=G.ways[segEnd[2]];
  endExtra.set(segEnd[0],segEnd[3]*s1.t/we.v);endExtra.set(segEnd[1],Math.min(endExtra.get(segEnd[1])??Infinity,segEnd[3]*(1-s1.t)/we.v));
  let best=Infinity,bestNode=-1;
  if(s0.si===s1.si){best=Math.abs(s0.t-s1.t)*segStart[3]/G.ways[segStart[2]].v;bestNode=-2;}
  while(heap.size){const [f,u]=heap.pop();if(f>=best)break;if(f-h(u)>gS[u]+1e-9)continue;
    if(endExtra.has(u)){const c=gS[u]+endExtra.get(u);if(c<best){best=c;bestNode=u;}}
    for(const [v,si,wi] of G.adj[u]){const c=cost(si,wi);if(c===Infinity)continue;const ng=gS[u]+c;if(ng<gS[v]){gS[v]=ng;prev[v]=u;prevSeg[v]=si;heap.push(ng+h(v),v);}}}
  if(best===Infinity)return {error:'none'};
  const pts=[[s0.qx,s0.qy]];const segIdx=[];const nodes=[];
  if(bestNode!==-2){const chain=[];let u=bestNode;while(u!==-1){chain.push(u);u=prev[u];}chain.reverse();
    for(const u of chain){pts.push([G.X[u],G.Y[u]]);nodes.push(u);}
  }
  pts.push([s1.qx,s1.qy]);
  return buildRoute(pts,nodes,{pen,reasons},destName,best,[toX,toY]);
}
function buildRoute(pts,nodes,pp,destName,costS,dest){
  const G=S.graph;
  // clean duplicates
  const P=[pts[0]];const nodeAt=[-1];
  for(let i=1;i<pts.length;i++){const q=pts[i];const last=P[P.length-1];if(gd(last[0],last[1],q[0],q[1])<0.5)continue;P.push(q);nodeAt.push(i-1<nodes.length&&i>=1?nodes[i-1]??-1:-1);}
  nodeAt[nodeAt.length-1]=-1;
  const cum=[0];for(let i=1;i<P.length;i++)cum.push(cum[i-1]+gd(P[i-1][0],P[i-1][1],P[i][0],P[i][1]));
  const len=cum[cum.length-1];
  // time per metre from cost estimate
  const tpm=costS/Math.max(1,len);
  const at=(d)=>{d=clamp(d,0,len);let i=1;while(i<cum.length-1&&cum[i]<d)i++;const t=(d-cum[i-1])/Math.max(1e-6,cum[i]-cum[i-1]);return [P[i-1][0]+t*(P[i][0]-P[i-1][0]),P[i-1][1]+t*(P[i][1]-P[i-1][1])];};
  const instr=[];
  for(let i=1;i<P.length-1;i++){const u=nodeAt[i];if(u==null||u<0)continue;if(G.deg[u]<3)continue;
    const a=at(cum[i]-25),b=at(cum[i]+25);const bin=brg(a[0],a[1],P[i][0],P[i][1]),bout=brg(P[i][0],P[i][1],b[0],b[1]);const t=angDiff(bin,bout);
    // other branches at this node
    const nexts=new Set();if(i+1<P.length)nexts.add(nodeAt[i+1]);const prevN=nodeAt[i-1];
    const others=G.adj[u].map(e=>e[0]).filter(v=>v!==prevN&&!nexts.has(v)).map(v=>angDiff(bin,brg(G.X[u],G.Y[u],G.X[v],G.Y[v])));
    let type=null;const at_=Math.abs(t);
    if(at_<22){const close=others.filter(o=>Math.abs(o-t)<50);if(!close.length)continue;type=close.every(o=>o>t)?'keep-left':close.every(o=>o<t)?'keep-right':'straight';}
    else if(at_<55)type=t<0?'slight-left':'slight-right';
    else if(at_<135)type=t<0?'left':'right';
    else type=t<0?'sharp-left':'sharp-right';
    const wi=nextWay(u,nodeAt[i+1]);const nm=wi!=null?G.ways[wi].nm:'';
    instr.push({i,d:cum[i],type,road:nm});
  }
  for(const s of instr){let bj=null,bd=90;for(const j of S.juncs){if(j.src!=='osm')continue;const d=gd(j.x,j.y,P[s.i][0],P[s.i][1]);if(d<bd){bd=d;bj=j;}}if(bj)s.j=bj.num;}
  instr.push({i:P.length-1,d:len,type:'arrive',road:''});
  // merge instructions closer than 25 m (keep the stronger)
  const out=[];for(const s of instr){const l=out[out.length-1];if(l&&s.d-l.d<20&&s.type!=='arrive'){continue;}out.push(s);}
  // warnings along route
  const warn=[];const seen=new Set();
  for(const r of activeRoadReports()){const [x,y]=merc(r.lon,r.lat);let best=1e9;for(let i=1;i<P.length;i++){const p=projSeg(x,y,P[i-1][0],P[i-1][1],P[i][0],P[i][1]);if(p.d<best)best=p.d;}if(best<130&&!seen.has(r.id)){seen.add(r.id);warn.push(r);}}
  const sights=[];for(const r of visibleReports().filter(r=>r.kind==='animal')){const [x,y]=merc(r.lon,r.lat);let best=1e9;for(let i=1;i<P.length;i+=1){const p=projSeg(x,y,P[i-1][0],P[i-1][1],P[i][0],P[i][1]);if(p.d<best)best=p.d;}if(best<400)sights.push(r);}
  const via=[...new Set(out.map(s=>s.road).filter(Boolean))].slice(0,3);
  return {pts:P,cum,len,tpm,time:costS,instr:out,warn,sights,via,destName,dest};
}
function nextWay(u,v){if(v==null||v<0)return null;for(const e of S.graph.adj[u])if(e[0]===v)return e[2];return null;}
function instrText(s,withRoad=true){
  const m={'left':'Turn left','right':'Turn right','slight-left':'Bear left','slight-right':'Bear right','sharp-left':'Sharp left','sharp-right':'Sharp right','keep-left':'Keep left','keep-right':'Keep right','straight':'Go straight on','arrive':'Arrive','depart':'Head off'}[s.type]||'Continue';
  const base=withRoad&&s.road?`${m} onto ${s.road}`:m;return s.j&&withRoad?`At junction ${s.j}: ${base.charAt(0).toLowerCase()+base.slice(1)}`:base;
}

/* =========================================================================
   5. Weather (Open-Meteo) and how long road problems last
   ========================================================================= */
const WXPTS=[{n:'north',lat:-1.45,lon:30.58},{n:'central',lat:-1.66,lon:30.70},{n:'south',lat:-1.87,lon:30.73}];
async function loadWeather(force){
  if(!force&&S.wx&&Date.now()-S.wx.fetched<30*60e3)return;
  try{
    const u=`https://api.open-meteo.com/v1/forecast?latitude=${WXPTS.map(p=>p.lat).join(',')}&longitude=${WXPTS.map(p=>p.lon).join(',')}&hourly=precipitation&past_days=5&forecast_days=2&timeformat=unixtime&timezone=GMT`;
    const r=await fetch(u);if(!r.ok)throw 0;let j=await r.json();if(!Array.isArray(j))j=[j];
    S.wx={fetched:Date.now(),pts:j.map(o=>({t:o.hourly.time.map(x=>x*1000),p:o.hourly.precipitation.map(v=>v||0)}))};
    LS.set('wx',S.wx);
  }catch(e){}
  updateWxPill();redraw();
}
function wxIdx(lat){let b=0,bd=1e9;WXPTS.forEach((p,i)=>{const d=Math.abs(p.lat-lat);if(d<bd){bd=d;b=i;}});return b;}
function wxPt(lat){return S.wx&&S.wx.pts[wxIdx(lat)];}
function rainSum(pt,t0,t1){if(!pt)return 0;let s=0;for(let i=0;i<pt.t.length;i++){const t=pt.t[i]+3600e3;if(t>t0&&t<=t1)s+=pt.p[i];}return s;}
function lastRain(pt,t0,t1,thr=0.3){if(!pt)return null;let r=null;for(let i=0;i<pt.t.length;i++){const t=pt.t[i]+3600e3;if(t>t0&&t<=t1&&pt.p[i]>=thr)r=t;}return r;}
function wetness(){if(!S.wx)return 0;const now=Date.now();return Math.max(...S.wx.pts.map(pt=>rainSum(pt,now-24*3600e3,now)));}
function roadLife(r){
  const rule=RD[r.type][3];const t0=r.lastSeen||r.at;const now=Date.now();
  if(!rule.wet)return {until:t0+rule.base*3600e3,why:`${RD[r.type][1]} reports stay up for ${rule.base>=48?Math.round(rule.base/24)+' days':rule.base+' h'} unless someone marks them gone.`};
  const pt=wxPt(r.lat);
  if(!pt)return {until:t0+rule.base*3600e3,why:`No weather data yet, so the standard ${rule.base} h applies.`};
  const lr=lastRain(pt,t0-48*3600e3,now);
  const nextRain=rainSum(pt,now,now+12*3600e3);
  if(lr==null){return {until:t0+rule.dry*3600e3,why:`No rain in the 48 h before it was reported, so it should clear within ${rule.dry} h.`,next:nextRain};}
  const mm=rainSum(pt,lr-48*3600e3,lr);
  const dry=Math.min(rule.cap,rule.dry+rule.perMm*mm);
  const until=Math.max(t0+rule.dry*3600e3,lr+dry*3600e3);
  const raining=lastRain(pt,now-3600e3,now)!=null;
  return {until,why:`${Math.round(mm)} mm of rain fell in the 48 h up to ${stamp(lr)}${raining?' and it is still raining':''}. ${RD[r.type][1]} needs about ${Math.round(dry)} h of dry weather to clear.`,next:nextRain,mm};
}
function updateWxPill(){
  const p=$('wxPill'),t=$('wxText');if(!S.wx){t.textContent='–';return;}
  const now=Date.now();const r24=wetness();const next=Math.max(...S.wx.pts.map(pt=>rainSum(pt,now,now+6*3600e3)));
  p.classList.toggle('wet',r24>=3||next>=2);
  t.textContent=r24>=0.5?`${r24.toFixed(r24<10?1:0)} mm`:next>=1?'Rain soon':'Dry';
}

/* =========================================================================
   6. Reports: Firebase when configured, otherwise this phone
   ========================================================================= */
function clean(id,d){
  if(!d||typeof d!=='object')return null;
  const kind=d.kind==='road'?'road':d.kind==='animal'?'animal':null;if(!kind)return null;
  let type=String(d.type||'');if(type==='rhino_b'||type==='rhino_w')type='rhino';
  if(kind==='animal'&&!AN[type])return null;if(kind==='road'&&!RD[type])return null;
  const lat=+d.lat,lon=+d.lon;if(!(lat<-1.0&&lat>-2.3&&lon>30.2&&lon<31.2))return null;
  const at=+d.at;if(!(at>1.6e12))return null;
  const votes={};if(d.votes&&typeof d.votes==='object')for(const k in d.votes){const v=+d.votes[k];if(v===1||v===-1)votes[String(k).slice(0,60)]=v;}
  return {id:String(id),kind,type,lat,lon,at,lastSeen:+d.lastSeen>at?+d.lastSeen:at,
    count:COUNTS.includes(d.count)?d.count:null,act:ACTS.includes(d.act)?d.act:null,
    heading:Number.isInteger(d.heading)&&d.heading>=-1&&d.heading<8?d.heading:null,
    rdist:ROADDIST.includes(d.rdist)?d.rdist:null,sev:['1','2','3'].includes(d.sev)?d.sev:null,
    note:typeof d.note==='string'?d.note.slice(0,200):'',by:typeof d.by==='string'?d.by.slice(0,60):'',votes,pending:!!d.pending,example:!!d.example};
}
async function initSharing(){
  const cfg=window.AKAGERA_FIREBASE;
  if(!cfg||!cfg.apiKey||!cfg.projectId){S.sync='local';setSync();return;}
  S.sync='connecting';setSync();
  try{
    const V='10.12.2';
    const A=await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
    const F=await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);
    const app=A.initializeApp(cfg);
    let db;try{db=F.initializeFirestore(app,{localCache:F.persistentLocalCache({tabManager:F.persistentMultipleTabManager()})});}catch(e){db=F.getFirestore(app);}
    S.fs={F,db};
    const q=F.query(F.collection(db,'reports'),F.where('at','>',Date.now()-14*864e5),F.orderBy('at','desc'),F.limit(600));
    F.onSnapshot(q,{includeMetadataChanges:true},snap=>{
      S.live=snap.docs.map(d=>{const o=clean(d.id,d.data());if(o)o.pending=d.metadata.hasPendingWrites;return o;}).filter(Boolean);
      S.sync=snap.metadata.fromCache?'offline':'live';if(S.live.length)hideBanner();setSync();redraw();refreshSheet();
    },err=>{S.sync='error';setSync();});
  }catch(e){S.sync='local';setSync();}
}
function setSync(){
  const p=$('syncPill'),t=p.querySelector('span');p.className='pill';
  const pend=allReports().filter(r=>r.pending).length;
  if(S.sync==='live'){p.classList.add(pend?'off':'live');t.textContent=pend?`${pend} queued`:'Live';}
  else if(S.sync==='offline'){p.classList.add('off');t.textContent=pend?`${pend} queued`:'Offline';}
  else if(S.sync==='connecting'){t.textContent='…';}
  else if(S.sync==='error'){p.classList.add('err');t.textContent='Error';}
  else {p.classList.add('err');t.textContent='Local';}
}
async function saveReport(rec){
  if(S.fs){const {F,db}=S.fs;F.setDoc(F.doc(db,'reports',rec.id),rec).catch(e=>toast('Could not share the report: '+(e.code||'error')));}
  else {S.local.push(rec);LS.set('local',S.local);}
  S.set.hideEx=true;saveSet();hideBanner();redraw();setSync();
}
async function patchReport(r,patch){
  if(S.fs&&!r.example){const {F,db}=S.fs;const flat={};for(const k in patch){if(k==='votes'){for(const v in patch.votes)flat['votes.'+v]=patch.votes[v];}else flat[k]=patch[k];}
    try{await F.updateDoc(F.doc(db,'reports',r.id),flat);}catch(e){toast('Could not send. It will not be saved until you have signal.');}}
  else {const o=S.local.find(x=>x.id===r.id);if(o){if(patch.votes)o.votes=Object.assign(o.votes||{},patch.votes);for(const k in patch)if(k!=='votes')o[k]=patch[k];LS.set('local',S.local);}}
  redraw();refreshSheet();
}
function J(n){return S.juncs.find(j=>j.num===n);}
function offJ(n,dx,dy){const j=J(n);if(!j)return {lat:-1.8,lon:30.7};const u=unmerc(j.x+dx,j.y+dy);return {lat:u.lat,lon:u.lon};}
let EX=null;
function examples(){if(EX)return EX;const t=Date.now(),m=60000;EX=[
  {id:'ex1',kind:'animal',type:'lion',count:'2–5',act:'Resting',heading:-1,...offJ(58,350,-200),at:t-35*m,note:'Pride under the acacia, left of the track.'},
  {id:'ex2',kind:'animal',type:'elephant',count:'6–20',act:'Moving',heading:1,...offJ(21,500,250),at:t-70*m},
  {id:'ex3',kind:'animal',type:'giraffe',count:'2–5',act:'Feeding',heading:0,...offJ(7,-250,-500),at:t-18*m},
  {id:'ex4',kind:'animal',type:'buffalo',count:'20+',act:'Crossing road',heading:2,...offJ(15,0,-350),at:t-50*m},
  {id:'ex5',kind:'road',type:'mud',sev:'2',...offJ(8,250,-300),at:t-5*60*m,note:'Deep clay after the rain.'},
  {id:'ex6',kind:'road',type:'tree',sev:'1',...offJ(36,-200,500),at:t-9*60*m}
].map(r=>clean(r.id,{...r,lastSeen:r.at,votes:{},by:'',example:true}));return EX;}
function allReports(){
  const ids=new Set(S.live.map(r=>r.id));
  let list=[...S.live,...S.local.map(r=>clean(r.id,r)).filter(r=>r&&!ids.has(r.id))];
  if(!S.set.hideEx&&list.length===0&&S.sync!=='connecting')list=list.concat(examples());
  return list;
}
function tally(r){let there=0,gone=0;for(const k in r.votes)r.votes[k]>0?there++:gone++;return {there,gone};}
function alive(r){
  const t=tally(r);if(r.votes[r.by]===-1&&r.by)return false;if(t.gone>=2&&t.gone>t.there)return false;if(r.votes[S.device]===-1)return false;
  if(r.kind==='animal')return Date.now()-(r.lastSeen||r.at)<(S.animalWin||6)*3600e3;
  return Date.now()<roadLife(r).until;
}
const visibleReports=()=>allReports().filter(alive);
const activeRoadReports=()=>visibleReports().filter(r=>r.kind==='road'&&!r.example);
function label(r){if(r.kind==='animal'){const a=AN[r.type];const many=r.count&&r.count!=='1';return many?`${r.count} ${PLURAL[r.type]||a[1]+'s'}`:a[1];}return RD[r.type][1];}
const emoji=r=>r.kind==='animal'?AN[r.type][2]:RD[r.type][2];

/* =========================================================================
   7. Position: GPS, manual fallback, demo drive
   ========================================================================= */
function myPos(){const g=S.gps;if(g.ok&&Date.now()-g.t<90e3)return {x:g.x,y:g.y,lat:g.lat,lon:g.lon,gps:true,heading:g.heading,speed:g.speed};if(S.manual){const q=merc(S.manual.lon,S.manual.lat);return {x:q[0],y:q[1],lat:S.manual.lat,lon:S.manual.lon,gps:false,heading:null};}return null;}
let lastFix=null;
function onFix(c,sim){
  const g=S.gps;const [x,y]=merc(c.longitude,c.latitude);
  let heading=(c.heading!=null&&!isNaN(c.heading)&&(c.speed||0)>1.5)?c.heading:null;
  if(heading==null&&lastFix){const d=gd(lastFix.x,lastFix.y,x,y);if(d>8)heading=brg(lastFix.x,lastFix.y,x,y);else heading=g.heading;}
  if(!lastFix||gd(lastFix.x,lastFix.y,x,y)>8)lastFix={x,y};
  Object.assign(g,{ok:true,denied:false,x,y,lat:c.latitude,lon:c.longitude,acc:c.accuracy||20,heading,speed:c.speed!=null&&!isNaN(c.speed)?c.speed:g.speed,t:Date.now(),sim:!!sim});
  if(S.nav)navUpdate();
  updateGpsLine();redraw();
}
function startGPS(){
  if(!('geolocation' in navigator)){S.gps.denied=true;updateGpsLine();return;}
  navigator.geolocation.watchPosition(p=>{if(!S.sim){const first=!S.gps.ok;onFix(p.coords,false);if(first&&!S.nav){const q=merc(p.coords.longitude,p.coords.latitude);if(inRing(q[0],q[1],S.park)||gd(q[0],q[1],S.park[0][0],S.park[0][1])<60000)centerOn(q[0],q[1],Math.max(cam.s,0.03));}}},e=>{if(e.code===1){S.gps.denied=true;updateGpsLine();}},{enableHighAccuracy:true,maximumAge:2000,timeout:25000});
}
function updateGpsLine(){
  const b=$('gpsline');const p=myPos();
  if(!p){b.replaceChildren(S.gps.denied?el('span',null,el('b',{text:'Location is blocked. '}),'Allow it in your browser settings, or tap here to set your position.'):el('span',null,el('b',{text:'Waiting for GPS… '}),'Tap here to set your position by hand.'));return;}
  const where=whereText(p.x,p.y,true);
  b.replaceChildren(el('b',{text:p.gps?(S.gps.sim?'Demo drive: ':`GPS ±${Math.round(S.gps.acc)} m: `):'Set by hand: '}),where);
}
function whereText(x,y,short){
  if(!inRing(x,y,S.park)){let best=1e18;for(const q of S.park){const d=gd(x,y,q[0],q[1]);if(d<best)best=d;}if(best>2000)return `${fmtD(best)} outside the park`;}
  let j=null,jd=1e18;for(const k of S.juncs){const d=gd(x,y,k.x,k.y);if(d<jd){jd=d;j=k;}}
  let n=null,nd=2500;for(const k of S.named){const d=gd(x,y,k.x,k.y);if(d<nd){nd=d;n=k;}}
  const nm=n?(n.short||n.name):'';
  if(short)return n?`near ${nm}`:(j?`near junction ${j.num}`:'in the park');
  let s=j?(jd<150?`At junction ${j.num}`:`${fmtD(jd)} ${DIRNAME[dir8(brg(j.x,j.y,x,y))]} of junction ${j.num}`):'';
  if(n)s+=(s?', near ':'Near ')+nm;
  return s||'In the park';
}
function towards(x,y,h){let b=null,bs=1e18;for(const n of S.named){const d=gd(x,y,n.x,n.y);if(d<400||d>12000)continue;const da=Math.abs(angDiff(h*45,brg(x,y,n.x,n.y)));if(da>32)continue;const s=d*(1+da/25);if(s<bs){bs=s;b=n;}}return b;}

/* demo drive: follows the active route at 32 km/h */
function startSim(){
  if(!S.route){toast('Choose a destination with Go first, then start the demo drive.');return;}
  stopSim();const R=S.route;let d=0;const v=32/3.6;
  S.sim=setInterval(()=>{d+=v;if(d>R.len){stopSim();return;}
    const at=pointAt(R,d),ah=pointAt(R,d+12);const u=unmerc(at[0],at[1]);
    onFix({latitude:u.lat,longitude:u.lon,accuracy:6,speed:v,heading:brg(at[0],at[1],ah[0],ah[1])},true);},1000);
  toast('Demo drive started.');
}
function stopSim(){if(S.sim){clearInterval(S.sim);S.sim=null;}}
function pointAt(R,d){d=clamp(d,0,R.len);let lo=1,hi=R.cum.length-1;while(lo<hi){const m=(lo+hi)>>1;if(R.cum[m]<d)lo=m+1;else hi=m;}const i=lo;const t=(d-R.cum[i-1])/Math.max(1e-6,R.cum[i]-R.cum[i-1]);return [R.pts[i-1][0]+t*(R.pts[i][0]-R.pts[i-1][0]),R.pts[i-1][1]+t*(R.pts[i][1]-R.pts[i-1][1])];}

/* =========================================================================
   8. Map renderer
   ========================================================================= */
const cv=$('map'),ctx=cv.getContext('2d');
if(!CanvasRenderingContext2D.prototype.roundRect)CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h){this.rect(x,y,w,h);};
let dpr=1,W=0,H=0;
const cam={cx:0,cy:0,s:0.01,rot:0,ax:0.5,ay:0.5};          // world centre, px per metre, rotation (rad), anchor (fraction of canvas)
const camT={...cam};                                       // target for smooth nav camera
let need=false,hits=[],placed=[],selected=null,pickMode=null,anim=false;
function resize(){dpr=Math.min(window.devicePixelRatio||1,S.nav&&S.set.tilt?1.5:2.5);const r=cv.getBoundingClientRect();W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);redraw();}
function redraw(){if(!need&&!anim){need=true;requestAnimationFrame(draw);}}
function M(){const c=Math.cos(cam.rot),s=Math.sin(cam.rot),k=cam.s;const a=k*c,b=k*s,cc=-k*s,d=k*c;const ax=cam.ax*W,ay=cam.ay*H;return {a,b,c:cc,d,e:ax-(a*cam.cx+cc*cam.cy),f:ay-(b*cam.cx+d*cam.cy)};}
function w2s(x,y,m=M()){return [m.a*x+m.c*y+m.e,m.b*x+m.d*y+m.f];}
function s2w(px,py){const c=Math.cos(-cam.rot),s=Math.sin(-cam.rot);const dx=(px-cam.ax*W)/cam.s,dy=(py-cam.ay*H)/cam.s;return [cam.cx+c*dx-s*dy,cam.cy+s*dx+c*dy];}
function fitPark(){let x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;for(const q of S.park){x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);}cam.rot=0;cam.ax=.5;cam.ay=.47;cam.s=Math.min((W-30)/(x1-x0),(H-190)/(y1-y0));cam.cx=(x0+x1)/2;cam.cy=(y0+y1)/2;redraw();}
function zoomAt(f,px,py){const [wx,wy]=s2w(px,py);cam.s=clamp(cam.s*f,0.0025,3);const [nx,ny]=s2w(px,py);cam.cx+=wx-nx;cam.cy+=wy-ny;S.follow=false;$('followBtn').classList.remove('on');redraw();}
function centerOn(x,y,s){cam.cx=x;cam.cy=y;if(s)cam.s=s;redraw();}

/* raster tiles (satellite) */
const tiles=new Map();
function tile(z,x,y){const k=z+'/'+x+'/'+y;let t=tiles.get(k);if(t){t.used=Date.now();return t.ok?t.img:null;}if(!navigator.onLine)return null;
  const img=new Image();img.crossOrigin='anonymous';t={img,ok:false,used:Date.now()};tiles.set(k,t);
  img.onload=()=>{t.ok=true;redraw();};img.onerror=()=>{};img.src=`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  if(tiles.size>500){const old=[...tiles.entries()].sort((a,b)=>a[1].used-b[1].used).slice(0,100);for(const [kk] of old)tiles.delete(kk);}return null;}
function drawTiles(m){
  const z=clamp(Math.round(Math.log2(cam.s*2*Math.PI*ER/256)),3,18);const size=2*Math.PI*ER/2**z;
  const cs=[s2w(0,0),s2w(W,0),s2w(0,H),s2w(W,H)];const xs=cs.map(c=>c[0]),ys=cs.map(c=>c[1]);
  const tx0=Math.floor((Math.min(...xs)+Math.PI*ER)/size),tx1=Math.floor((Math.max(...xs)+Math.PI*ER)/size),ty0=Math.floor((Math.min(...ys)+Math.PI*ER)/size),ty1=Math.floor((Math.max(...ys)+Math.PI*ER)/size);
  if((tx1-tx0+1)*(ty1-ty0+1)>80)return;
  for(let tx=tx0;tx<=tx1;tx++)for(let ty=ty0;ty<=ty1;ty++){const img=tile(z,tx,ty);const x=-Math.PI*ER+tx*size,y=-Math.PI*ER+ty*size;
    if(img)ctx.drawImage(img,x,y,size+size/256,size+size/256);else{for(let dz=1;dz<=3;dz++){const pz=z-dz;if(pz<0)break;const px=tx>>dz,py=ty>>dz;const k=pz+'/'+px+'/'+py;const t=tiles.get(k);if(t&&t.ok){const psz=size*2**dz;const sx=(tx-(px<<dz))*256/2**dz,sy=(ty-(py<<dz))*256/2**dz;ctx.drawImage(t.img,sx,sy,256/2**dz,256/2**dz,x,y,size,size);break;}}}}
}
function glyph(cat,x,y,r){
  ctx.beginPath();ctx.arc(x,y,r+2,0,7);ctx.fillStyle='#fff';ctx.fill();ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle=PCOL[cat]||'#555';ctx.fill();
  ctx.fillStyle='#fff';ctx.strokeStyle='#fff';const u=r/10;
  if(cat==='lodge'){ctx.beginPath();ctx.moveTo(x-6*u,y+.5*u);ctx.lineTo(x,y-5.5*u);ctx.lineTo(x+6*u,y+.5*u);ctx.fill();ctx.fillRect(x-4*u,y,8*u,5*u);}
  else if(cat==='camp'){ctx.beginPath();ctx.moveTo(x-6.5*u,y+5*u);ctx.lineTo(x,y-6*u);ctx.lineTo(x+6.5*u,y+5*u);ctx.fill();}
  else if(cat==='ranger'){ctx.beginPath();ctx.moveTo(x-4.5*u,y-5*u);ctx.lineTo(x+4.5*u,y-5*u);ctx.lineTo(x+4.5*u,y);ctx.lineTo(x,y+6*u);ctx.lineTo(x-4.5*u,y);ctx.fill();}
  else if(cat==='fence'){ctx.fillRect(x-3*u,y-3*u,6*u,6*u);}
  else if(cat==='picnic'){ctx.fillRect(x-6*u,y-3*u,12*u,2*u);ctx.lineWidth=1.8*u;ctx.beginPath();ctx.moveTo(x-3.5*u,y-1*u);ctx.lineTo(x-5.5*u,y+5*u);ctx.moveTo(x+3.5*u,y-1*u);ctx.lineTo(x+5.5*u,y+5*u);ctx.stroke();}
  else if(cat==='lookout'){ctx.beginPath();ctx.ellipse(x,y,6.5*u,3.6*u,0,0,7);ctx.fill();ctx.fillStyle=PCOL.lookout;ctx.beginPath();ctx.arc(x,y,2.4*u,0,7);ctx.fill();}
  else{ctx.font=`700 ${Math.round(r*(cat==='hq'?0.9:1.2))}px Barlow,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=cat==='reception'?'#3A2A00':'#fff';ctx.fillText({gate:'G',reception:'i',hq:'HQ',fuel:'F'}[cat]||'•',x,y+.5);}
}
function free(b){for(const p of placed)if(b[0]<p[2]&&b[2]>p[0]&&b[1]<p[3]&&b[3]>p[1])return false;return true;}
function textLbl(t,x,y,font,fill,align='center',force=false){ctx.font=font;const w=ctx.measureText(t).width;const h=parseFloat(font.match(/([\d.]+)px/)[1]);const x0=align==='left'?x:align==='right'?x-w:x-w/2;const b=[x0-3,y-h/2-2,x0+w+3,y+h/2+2];if(!force&&!free(b))return false;placed.push(b);ctx.textAlign=align;ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=3.5;ctx.strokeStyle='rgba(255,255,255,.93)';ctx.strokeText(t,x,y);ctx.fillStyle=fill;ctx.fillText(t,x,y);return true;}
const SEVCOL={'1':'#C98A00','2':'#E0670F','3':'#C0392B'};
function drawReport(r,x,y,sel){
  const age=Date.now()-(r.lastSeen||r.at);const alpha=r.kind==='animal'?Math.max(.55,1-age/((S.animalWin||6)*3600e3)*.45):1;
  const ring=r.kind==='animal'?'#2E7D4F':SEVCOL[r.sev||'1'];const R=sel?22:17;
  ctx.save();ctx.globalAlpha=alpha;
  if(r.kind==='animal'&&r.heading!=null&&r.heading>=0){const a=(r.heading*45)*RAD+cam.rot-Math.PI/2,L=46;ctx.setLineDash([5,4]);ctx.lineWidth=3;ctx.strokeStyle=ring;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*R,y+Math.sin(a)*R);ctx.lineTo(x+Math.cos(a)*L,y+Math.sin(a)*L);ctx.stroke();ctx.setLineDash([]);const tx=x+Math.cos(a)*(L+6),ty=y+Math.sin(a)*(L+6);ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx-Math.cos(a-.5)*12,ty-Math.sin(a-.5)*12);ctx.lineTo(tx-Math.cos(a+.5)*12,ty-Math.sin(a+.5)*12);ctx.closePath();ctx.fillStyle=ring;ctx.fill();}
  ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=6;ctx.shadowOffsetY=2;ctx.beginPath();ctx.arc(x,y,R,0,7);ctx.fillStyle='#fff';ctx.fill();ctx.shadowColor='transparent';
  ctx.lineWidth=r.kind==='road'?4:3.5;ctx.strokeStyle=ring;if(r.example)ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
  if(r.kind==='road'){ctx.beginPath();ctx.moveTo(x,y-R-9);ctx.lineTo(x-6,y-R-1);ctx.lineTo(x+6,y-R-1);ctx.closePath();ctx.fillStyle=ring;ctx.fill();}
  ctx.font=`${Math.round(R*1.05)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#000';ctx.fillText(emoji(r),x,y+1);
  if(r.kind==='animal'&&r.count&&r.count!=='1'){ctx.font='700 12px Barlow,sans-serif';const w=ctx.measureText(r.count).width+10;ctx.fillStyle=ring;ctx.beginPath();ctx.roundRect(x+R-10,y-R-6,w,17,8.5);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='left';ctx.fillText(r.count,x+R-5,y-R+2.5);}
  const tl=r.example?'EXAMPLE':r.pending?'SENDING':hhmm(r.lastSeen||r.at);
  ctx.font='700 11.5px Barlow,sans-serif';const w=ctx.measureText(tl).width+10;ctx.fillStyle=r.example?'#6B5200':r.pending?'#1E3A24':'rgba(26,34,25,.88)';ctx.beginPath();ctx.roundRect(x-w/2,y+R+3,w,16,8);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(tl,x,y+R+11.5);
  ctx.restore();
}
function drawCar(x,y,headingScreen,gpsMode){
  ctx.save();ctx.translate(x,y);
  if(!S.nav){ctx.beginPath();ctx.arc(0,0,Math.max(14,S.gps.acc*KG*cam.s),0,7);ctx.fillStyle='rgba(35,105,176,.13)';ctx.fill();}
  if(headingScreen==null){ctx.beginPath();ctx.arc(0,0,9,0,7);ctx.fillStyle=gpsMode?'#2369B0':'#7A8B9A';ctx.fill();ctx.lineWidth=3.5;ctx.strokeStyle='#fff';ctx.stroke();ctx.restore();return;}
  ctx.rotate(headingScreen);const k=S.nav?1.9:1;ctx.scale(k,k);
  ctx.shadowColor='rgba(0,0,0,.35)';ctx.shadowBlur=8;ctx.shadowOffsetY=3;
  ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(13,13);ctx.lineTo(0,6);ctx.lineTo(-13,13);ctx.closePath();ctx.fillStyle='#fff';ctx.fill();ctx.shadowColor='transparent';
  ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(9.5,9.5);ctx.lineTo(0,3.5);ctx.lineTo(-9.5,9.5);ctx.closePath();ctx.fillStyle=gpsMode?'#2369B0':'#7A8B9A';ctx.fill();
  ctx.restore();
}
function draw(){
  need=false;if(!S.park)return;
  if(anim){const k=0.18;cam.cx+=(camT.cx-cam.cx)*k;cam.cy+=(camT.cy-cam.cy)*k;cam.s+=(camT.s-cam.s)*k*.6;cam.rot+=angDiff(cam.rot/RAD,camT.rot/RAD)*RAD*k;}
  const m=M();
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=S.set.sat?'#3A4A32':'#E4E8DC';ctx.fillRect(0,0,cv.width,cv.height);
  ctx.setTransform(dpr*m.a,dpr*m.b,dpr*m.c,dpr*m.d,dpr*m.e,dpr*m.f);
  const px=1/cam.s,L=S.layers;
  ctx.lineJoin='round';ctx.lineCap='round';
  if(S.set.sat){drawTiles(m);ctx.globalAlpha=.25;ctx.fillStyle='#000';}
  if(!S.set.sat){ctx.fillStyle='#F2EBD3';ctx.fill(L.park);ctx.fillStyle='#BAD3A6';ctx.fill(L.wet,'evenodd');ctx.strokeStyle='#97BA85';ctx.lineWidth=.9*px;ctx.stroke(L.wet);
    if(L.water){ctx.fillStyle='#9DC8EE';ctx.fill(L.water,'evenodd');ctx.strokeStyle='#6EA4D8';ctx.lineWidth=1*px;ctx.stroke(L.water);}
    if(L.shore){ctx.strokeStyle='#3A7DB8';ctx.lineWidth=Math.min(2.2,1.1+cam.s*8)*px;ctx.stroke(L.shore);}}
  ctx.globalAlpha=1;
  if(L.rivers){ctx.strokeStyle='#6EA4D8';ctx.lineWidth=Math.min(3,1+cam.s*6)*px;ctx.stroke(L.rivers);}
  const zt=clamp(cam.s*25,0,1);
  const nk=S.nav?1.5:1;const wTrack=(1.6+zt*4.4)*nk,wMinor=(2.4+zt*5)*nk,wMajor=(3.4+zt*6)*nk;
  ctx.strokeStyle=S.set.sat?'rgba(0,0,0,.55)':'#A9967A';ctx.lineWidth=(wTrack+2)*px;ctx.stroke(L.track);ctx.lineWidth=(wMinor+2)*px;ctx.stroke(L.minor);
  ctx.strokeStyle='#B5822C';ctx.lineWidth=(wMajor+2.4)*px;ctx.stroke(L.major);
  ctx.strokeStyle=S.set.sat?'#F5E7C8':'#FFFFFF';ctx.lineWidth=wTrack*px;ctx.stroke(L.track);ctx.lineWidth=wMinor*px;ctx.stroke(L.minor);
  ctx.strokeStyle='#F7C75A';ctx.lineWidth=wMajor*px;ctx.stroke(L.major);
  ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=6*px;ctx.stroke(L.park);ctx.strokeStyle='#22351F';ctx.lineWidth=2.6*px;ctx.stroke(L.park);
  // route
  const R=S.route;
  if(R){const p=new Path2D();R.pts.forEach((q,i)=>i?p.lineTo(q[0],q[1]):p.moveTo(q[0],q[1]));
    ctx.strokeStyle='#0B3D75';ctx.lineWidth=(S.nav?18:10)*px;ctx.stroke(p);ctx.strokeStyle='#2F86E6';ctx.lineWidth=(S.nav?13:7)*px;ctx.stroke(p);
    if(S.nav&&S.nav.prog>0){const q=new Path2D();let started=false;for(let i=0;i<R.pts.length&&R.cum[i]<=S.nav.prog;i++){started?q.lineTo(R.pts[i][0],R.pts[i][1]):q.moveTo(R.pts[i][0],R.pts[i][1]);started=true;}const cp=pointAt(R,S.nav.prog);q.lineTo(cp[0],cp[1]);ctx.strokeStyle='#9BA8B5';ctx.lineWidth=9*px;ctx.stroke(q);}}
  // ---- screen space ----
  ctx.setTransform(dpr,0,0,dpr,0,0);placed=[];hits=[];
  const reps=visibleReports().map(r=>{const q=merc(r.lon,r.lat);const s=w2s(q[0],q[1],m);return {r,x:s[0],y:s[1]};}).filter(o=>o.x>-60&&o.y>-60&&o.x<W+60&&o.y<H+60);
  for(const o of reps)placed.push([o.x-22,o.y-28,o.x+46,o.y+40]);
  const pos=myPos();let posS=null;if(pos){posS=w2s(pos.x,pos.y,m);placed.push([posS[0]-16,posS[1]-16,posS[0]+16,posS[1]+16]);}
  if(R){const d=w2s(R.dest[0],R.dest[1],m);drawFlag(d[0],d[1]);placed.push([d[0]-10,d[1]-40,d[0]+24,d[1]+4]);
    if(S.nav){const nx=S.nav.next;if(nx&&nx.type!=='arrive'){const q=w2s(R.pts[nx.i][0],R.pts[nx.i][1],m);ctx.beginPath();ctx.arc(q[0],q[1],8,0,7);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#0B3D75';ctx.stroke();}}}
  const showJ=cam.s>0.028,showPL=cam.s>0.016,showArea=cam.s>0.011;
  for(const p of S.pois){if(p.cat==='lake'||p.cat==='area'||p.cat==='hill')continue;const [x,y]=w2s(p.x,p.y,m);if(x<-30||y<-30||x>W+30||y>H+30)continue;
    if(p.cat==='junction'){if(!showJ)continue;const r=cam.s>0.06?10:8;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle='rgba(255,255,255,.92)';ctx.fill();ctx.lineWidth=1.6;ctx.strokeStyle='#555';ctx.stroke();ctx.font=`700 ${r>9?11:9.5}px Barlow,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#333';ctx.fillText(String(p.num),x,y+.5);placed.push([x-r,y-r,x+r,y+r]);hits.push({t:'poi',p,x,y,r:r+6});continue;}
    if(p.cat==='fence'&&cam.s<0.02)continue;const r=p.cat==='fence'?6:cam.s>0.03?11:9;glyph(p.cat,x,y,r);placed.push([x-r-2,y-r-2,x+r+2,y+r+2]);hits.push({t:'poi',p,x,y,r:r+8});}
  for(const p of S.named){if(p.cat!=='lake')continue;const [x,y]=w2s(p.x,p.y,m);if(x<-120||y<-30||x>W+120||y>H+30)continue;const big=/Ihema|Rwanyakazinga|Hago|Mihindi|Kivumba/.test(p.name);if(!big&&!showArea)continue;textLbl(p.name,x,y,`italic 600 ${big?(cam.s>0.02?17:14.5):13}px Barlow,sans-serif`,'#1E5C99');}
  if(showArea)for(const p of S.pois){if(p.cat!=='area'&&p.cat!=='hill')continue;const [x,y]=w2s(p.x,p.y,m);if(x<-120||y<-30||x>W+120||y>H+30)continue;textLbl(p.name.toUpperCase().split('').join(' '),x,y,`600 ${cam.s>0.03?12.5:11}px Barlow,sans-serif`,'#6A5232');}
  if(showPL)for(const p of S.pois){if(['lake','area','junction','fence','hill'].includes(p.cat))continue;const [x,y]=w2s(p.x,p.y,m);if(x<-150||y<-30||x>W+150||y>H+30)continue;textLbl(p.short||p.name,x+14,y,'600 13px Barlow,sans-serif','#26301F','left')||textLbl(p.short||p.name,x-14,y,'600 13px Barlow,sans-serif','#26301F','right');}
  if(pickPin){const q=merc(pickPin.lon,pickPin.lat);const [x,y]=w2s(q[0],q[1],m);drawFlag(x,y,'#E35F14');}
  reps.sort((a,b)=>(a.r===selected)-(b.r===selected)||a.y-b.y);
  for(const o of reps){drawReport(o.r,o.x,o.y,o.r===selected);hits.unshift({t:'rep',r:o.r,x:o.x,y:o.y,r2:26});}
  if(pos){const h=pos.heading!=null?(pos.heading*RAD+cam.rot):null;drawCar(posS[0],posS[1],h,pos.gps);}
  if(anim)requestAnimationFrame(draw);
}
function drawFlag(x,y,col='#17663A'){ctx.save();ctx.lineWidth=3;ctx.strokeStyle='#222';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-34);ctx.stroke();ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,y-34);ctx.lineTo(x+22,y-27);ctx.lineTo(x,y-20);ctx.closePath();ctx.fill();ctx.beginPath();ctx.arc(x,y,4,0,7);ctx.fillStyle='#222';ctx.fill();ctx.restore();}

/* =========================================================================
   9. Gestures (browse mode)
   ========================================================================= */
const ptrs=new Map();let gst=null;
cv.addEventListener('pointerdown',e=>{if(S.nav)return;cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(ptrs.size===1)gst={type:'pan',sx:e.offsetX,sy:e.offsetY,cx:cam.cx,cy:cam.cy,t:Date.now(),moved:false};
  else if(ptrs.size===2){const [a,b]=[...ptrs.values()];gst={type:'pinch',d:Math.hypot(a.x-b.x,a.y-b.y),mx:(a.x+b.x)/2,my:(a.y+b.y)/2,s:cam.s,moved:true};}});
cv.addEventListener('pointermove',e=>{if(!ptrs.has(e.pointerId)||!gst)return;ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
  if(gst.type==='pan'&&ptrs.size===1){const dx=e.offsetX-gst.sx,dy=e.offsetY-gst.sy;if(Math.abs(dx)+Math.abs(dy)>7)gst.moved=true;if(gst.moved){cam.cx=gst.cx-dx/cam.s;cam.cy=gst.cy-dy/cam.s;S.follow=false;$('followBtn').classList.remove('on');redraw();}}
  else if(gst.type==='pinch'&&ptrs.size===2){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;const f=(gst.s*d/gst.d)/cam.s;zoomAt(f,mx,my);const [w1x,w1y]=s2w(gst.mx,gst.my),[w2x,w2y]=s2w(mx,my);cam.cx+=w1x-w2x;cam.cy+=w1y-w2y;gst.mx=mx;gst.my=my;}});
function endP(e){if(!ptrs.has(e.pointerId))return;ptrs.delete(e.pointerId);if(gst&&gst.type==='pan'&&!gst.moved&&Date.now()-gst.t<600&&!ptrs.size)onTap(e.offsetX,e.offsetY);if(ptrs.size===1){const p=[...ptrs.values()][0];gst={type:'pan',sx:p.x,sy:p.y,cx:cam.cx,cy:cam.cy,t:Date.now(),moved:true};}else if(!ptrs.size)gst=null;}
cv.addEventListener('pointerup',endP);cv.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);if(!ptrs.size)gst=null;});
cv.addEventListener('wheel',e=>{e.preventDefault();if(!S.nav)zoomAt(Math.exp(-e.deltaY*.0015),e.offsetX,e.offsetY);},{passive:false});
cv.addEventListener('dblclick',e=>{if(!S.nav)zoomAt(1.8,e.offsetX,e.offsetY);});
$('zin').onclick=()=>zoomAt(1.6,W/2,H/2);$('zout').onclick=()=>zoomAt(1/1.6,W/2,H/2);
$('layerBtn').onclick=()=>{S.set.sat=!S.set.sat;saveSet();toast(S.set.sat?'Satellite view (needs signal).':'Map view.');redraw();};
$('followBtn').onclick=()=>{const p=myPos();if(!p){openSetPos();return;}S.follow=true;$('followBtn').classList.add('on');centerOn(p.x,p.y,Math.max(cam.s,0.05));};
let pickPin=null;
function onTap(x,y){
  if(pickMode){const [wx,wy]=s2w(x,y);const u=unmerc(wx,wy);const k=pickMode;endPick();
    if(k==='me'){S.manual={lat:u.lat,lon:u.lon,at:Date.now()};LS.set('manual',S.manual);updateGpsLine();toast('Position set.');if(pendingAfterPos){const f=pendingAfterPos;pendingAfterPos=null;f();}}
    else if(k==='dest'){previewRoute({x:wx,y:wy,name:'Dropped pin'});}
    redraw();return;}
  for(const h of hits)if(h.t==='rep'&&Math.hypot(h.x-x,h.y-y)<h.r2){openReportView(h.r);return;}
  for(const h of hits)if(h.t==='poi'&&Math.hypot(h.x-x,h.y-y)<h.r){openPoi(h.p);return;}
  if(!$('sheet').hidden)closeSheet();
}

/* =========================================================================
   10. Sheets and flows
   ========================================================================= */
let backFn=null,sheetView=null,pendingAfterPos=null;
function openSheet(title,nodes,o={}){$('sheetTitle').textContent=title;$('sheetBody').replaceChildren(...nodes.filter(Boolean));$('sheet').hidden=false;sheetView=o.view||null;backFn=o.back||null;$('sheetBack').hidden=!o.back;
  const dots=$('sheetDots');dots.replaceChildren();if(o.step){for(let i=1;i<=o.step[1];i++)dots.append(el('i',{class:i<=o.step[0]?'on':''}));}$('sheetBody').scrollTop=0;}
function closeSheet(){$('sheet').hidden=true;sheetView=null;selected=null;redraw();}
$('sheetClose').onclick=closeSheet;$('sheetBack').onclick=()=>backFn&&backFn();
function refreshSheet(){if($('sheet').hidden)return;if(sheetView==='find')openFind();else if(sheetView&&sheetView.startsWith('rep:')){const r=allReports().find(x=>x.id===sheetView.slice(4));if(r)openReportView(r,true);}}
let toastT=null;
function toast(t,btn,fn,ms=3600){const e=$('toast');e.replaceChildren(el('span',{text:t}),btn?el('button',{type:'button',onclick:()=>{e.hidden=true;fn();},text:btn}):null);e.hidden=false;e.style.bottom=S.nav?'calc(100px + env(safe-area-inset-bottom))':'';clearTimeout(toastT);toastT=setTimeout(()=>e.hidden=true,ms);}
function banner(text,btn,fn,cls){const b=$('banner');b.className='banner'+(cls?' '+cls:'');b.replaceChildren(el('p',{text}),btn?el('button',{type:'button',onclick:fn,text:btn}):null);b.hidden=false;}
function hideBanner(){$('banner').hidden=true;}
function startPick(kind){pickMode=kind;$('sheet').hidden=true;banner(kind==='me'?'Tap the map where you are.':'Tap the map where you want to go.','Cancel',()=>endPick());}
function endPick(){pickMode=null;hideBanner();}
function needPos(then){const p=myPos();if(p)return p;pendingAfterPos=then;openSetPos();return null;}
function openSetPos(){
  openSheet('Where are you?',[
    el('p',{class:'hint',text:S.gps.denied?'Location is blocked for this site. Allow it in your browser settings for the best experience. For now, set your position by hand.':'Waiting for GPS. You can set your position by hand meanwhile.'}),
    el('button',{class:'primary blue',type:'button',onclick:()=>startPick('me'),text:'Tap my spot on the map'}),
    el('p',{class:'lbl',text:'Or pick the junction stone you are at'}),
    el('div',{class:'grid3',style:'grid-template-columns:repeat(auto-fill,minmax(60px,1fr))'},...S.juncs.map(j=>el('button',{type:'button',style:'min-height:56px;font-size:18px',onclick:()=>{S.manual={lat:j.lat,lon:j.lon,at:Date.now()};LS.set('manual',S.manual);closeSheet();updateGpsLine();centerOn(j.x,j.y,Math.max(cam.s,.05));if(pendingAfterPos){const f=pendingAfterPos;pendingAfterPos=null;f();}},text:String(j.num)})))
  ],{view:'pos'});
}
$('gpsline').onclick=()=>{const p=myPos();if(p&&p.gps){S.follow=true;$('followBtn').classList.add('on');centerOn(p.x,p.y,Math.max(cam.s,.05));}else openSetPos();};

/* ---------- report: one question per screen ---------- */
let D=null;
function startReport(){
  const p=needPos(startReport);if(!p)return;
  const h=p.gps&&S.gps.heading!=null&&(S.gps.speed>1||Date.now()-S.gps.t<30e3)?S.gps.heading:null;
  D={lat:p.lat,lon:p.lon,car:h};
  openSheet('What did you see?',[el('div',{class:'huge'},
      el('button',{type:'button',onclick:()=>{D.kind='animal';stepSpecies();}},el('span',{text:'🦁'}),'Animals'),
      el('button',{type:'button',onclick:()=>{D.kind='road';stepRoadType();}},el('span',{text:'🚧'}),'Road problem')),
    el('p',{class:'fine',text:`Uses your position: ${whereText(...merc(p.lon,p.lat))}.`})],{step:[1,4],view:'r1'});
}
function stepSpecies(all){
  const list=all?ANIMALS:ANIMALS.filter(a=>TOP_ANIMALS.includes(a[0]));
  const btns=list.map(a=>el('button',{type:'button',onclick:()=>{D.type=a[0];stepCount();}},el('span',{text:a[2]}),a[1]));
  if(!all)btns.push(el('button',{type:'button',class:'more',onclick:()=>stepSpecies(true)},el('span',{text:'＋'}),'More animals'));
  openSheet('Which animal?',[el('div',{class:'grid3'},...btns)],{step:[2,4],back:startReport,view:'r2'});
}
function stepCount(){
  openSheet(`How many ${PLURAL[D.type]&&D.type!=='rhino'?PLURAL[D.type].toLowerCase():AN[D.type][1].toLowerCase()+'s'}?`,[el('div',{class:'stack'},...COUNTS.map(c=>el('button',{class:'choice',type:'button',onclick:()=>{D.count=c;stepMove();}},el('span',{class:'n',text:c}),c==='1'?'Just one':c==='20+'?'A big herd':'A group')))],{step:[3,4],back:()=>stepSpecies(),view:'r3'});
}
function stepMove(){
  // relative to the car when we know which way the car is pointing, otherwise compass
  const rel=D.car!=null;
  const cells=[7,0,1,6,-1,2,5,4,3];
  const relLbl={0:'Ahead',1:'Ahead right',2:'Right',3:'Behind right',4:'Behind',5:'Behind left',6:'Left',7:'Ahead left'};
  const arrows=['↑','↗','→','↘','↓','↙','←','↖'];
  const pad=el('div',{class:'pad'},...cells.map(c=>{
    if(c===-1)return el('button',{type:'button',class:'car',onclick:()=>{D.heading=-1;sendReport();}},el('span',{text:'🛑'}),'Not moving');
    return el('button',{type:'button','aria-label':rel?relLbl[c]:DIRNAME[c],onclick:()=>{D.heading=rel?Math.round(((D.car+c*45)%360)/45)%8:c;sendReport();}},arrows[c],el('small',{text:rel?relLbl[c]:DIRS[c]}));}));
  openSheet('Which way are they moving?',[el('p',{class:'hint',text:rel?'Arrows are relative to your car. Up means the way you are driving.':'Arrows point to the compass. Up is north.'}),pad],{step:[4,4],back:stepCount,view:'r4'});
}
function stepRoadType(){
  openSheet('What is the problem?',[el('div',{class:'grid3'},...ROADS.map(a=>el('button',{type:'button',onclick:()=>{D.type=a[0];stepSev();}},el('span',{text:a[2]}),a[1])))],{step:[2,3],back:startReport,view:'r2'});
}
function stepSev(){
  openSheet('How bad is it?',[el('div',{class:'stack'},...SEV.map(s=>el('button',{class:'choice sev'+s[0],type:'button',onclick:()=>{D.sev=s[0];sendReport();}},el('span',null,s[1],el('small',{text:s[2]})))))],{step:[3,3],back:stepRoadType,view:'r3'});
}
function sendReport(){
  const now=Date.now();
  const rec={id:'r'+now.toString(36)+Math.random().toString(36).slice(2,6),kind:D.kind,type:D.type,lat:+D.lat.toFixed(6),lon:+D.lon.toFixed(6),at:now,lastSeen:now,by:S.device,votes:{},note:''};
  if(D.kind==='animal'){rec.count=D.count||'1';rec.heading=D.heading??-1;}else rec.sev=D.sev||'1';
  saveReport(rec);closeSheet();
  const what=D.kind==='animal'?`${label(clean(rec.id,rec))}${rec.heading>=0?`, heading ${DIRNAME[rec.heading]}`:''}`:`${RD[rec.type][1]} (${SEV.find(s=>s[0]===rec.sev)[1]})`;
  toast(`Sent: ${what}.`,'Add details',()=>openDetails(rec.id),6000);
}
function openDetails(id){
  const r=allReports().find(x=>x.id===id);if(!r)return;const patch={};
  const chips=(list,key)=>{const w=el('div',{class:'optrow'});for(const v of list){const b=el('button',{type:'button',class:'opt'+(r[key]===v?' on':''),text:v});b.onclick=()=>{patch[key]=patch[key]===v?null:v;[...w.children].forEach(c=>c.classList.remove('on'));if(patch[key])b.classList.add('on');};w.append(b);}return w;};
  const note=el('textarea',{maxlength:'200',placeholder:'E.g. under the big fig tree on the left'});note.value=r.note||'';
  const nodes=[];
  if(r.kind==='animal'){nodes.push(el('p',{class:'lbl',text:'Doing what'}),chips(ACTS,'act'),el('p',{class:'lbl',text:'Distance from the road'}),chips(ROADDIST,'rdist'));}
  nodes.push(el('p',{class:'lbl',text:'Note'}),note,el('button',{class:'primary',type:'button',onclick:()=>{patch.note=note.value.trim().slice(0,200);for(const k in patch)if(patch[k]==null)delete patch[k];patchReport(r,patch);closeSheet();toast('Details added.');},text:'Save details'}));
  openSheet('Add details',nodes,{view:'details'});
}

/* ---------- find animals / latest sightings ---------- */
function relTo(x,y){const p=myPos();if(!p)return null;const d=gd(p.x,p.y,x,y);return {d,dir:DIRS[dir8(brg(p.x,p.y,x,y))]};}
function openFind(){
  const all=allReports().filter(r=>r.kind==='animal'&&!(r.votes[S.device]===-1));
  const recent=all.filter(alive).sort((a,b)=>b.lastSeen-a.lastSeen);
  const row=(r)=>{const q=merc(r.lon,r.lat);const rel=relTo(q[0],q[1]);
    return el('li',null,el('button',{type:'button',onclick:()=>openReportView(r)},el('span',{class:'em',text:emoji(r)}),
      el('span',null,el('b',{text:label(r)}),el('small',{text:`${r.example?'Example · ':''}Seen ${hhmm(r.lastSeen)} ${dayWord(r.lastSeen)} · ${ago(r.lastSeen)}`}),el('small',{text:whereText(q[0],q[1])})),
      el('span',{class:'r'},rel?fmtD(rel.d):'',rel?el('small',{text:rel.dir}):'')));};
  const winSel=el('select',{class:'opt',id:'winSel','aria-label':'How far back to show'},...[[2,'Last 2 h'],[6,'Last 6 h'],[12,'Last 12 h'],[48,'Last 2 days']].map(([v,t])=>{const o=el('option',{value:String(v),text:t});if((S.animalWin||6)===v)o.selected=true;return o;}));
  winSel.onchange=()=>{S.animalWin=+winSel.value;LS.set('win',S.animalWin);openFind();redraw();};
  const nodes=[el('div',{class:'acts'},winSel),el('p',{class:'lbl',text:'Latest sightings'}),
    recent.length?el('ul',{class:'list'},...recent.slice(0,15).map(row)):el('p',{class:'hint',text:'No sightings in this time window. Report what you see to help others.'})];
  // last seen per species (up to 7 days)
  const last={};for(const r of all){if(Date.now()-r.lastSeen>7*864e5)continue;if(!last[r.type]||r.lastSeen>last[r.type].lastSeen)last[r.type]=r;}
  nodes.push(el('p',{class:'lbl',text:'Last seen, by animal'}));
  nodes.push(el('ul',{class:'list'},...ANIMALS.filter(a=>a[0]!=='other'&&a[0]!=='bird').map(a=>{const r=last[a[0]];
    if(!r)return el('li',{class:'none'},el('button',{type:'button',disabled:true},el('span',{class:'em',text:a[2]}),el('span',null,el('b',{text:a[1]}),el('small',{text:'No reports in the last 7 days'})),el('span')));
    const q=merc(r.lon,r.lat);const rel=relTo(q[0],q[1]);
    return el('li',null,el('button',{type:'button',onclick:()=>openReportView(r)},el('span',{class:'em',text:a[2]}),el('span',null,el('b',{text:a[1]}),el('small',{text:`Last seen ${hhmm(r.lastSeen)} ${dayWord(r.lastSeen)} (${ago(r.lastSeen)})`})),el('span',{class:'r'},rel?fmtD(rel.d):'',rel?el('small',{text:rel.dir}):'')));})));
  openSheet('Animals',nodes,{view:'find'});
}

/* ---------- one report ---------- */
function openReportView(r,silent){
  selected=r;const q=merc(r.lon,r.lat);if(!silent&&!S.nav){S.follow=false;centerOn(q[0],q[1]+H*0.2/cam.s);}
  const t=tally(r);const nodes=[];
  nodes.push(el('div',{class:'det-head'},el('span',{class:'em',text:emoji(r)}),el('div',null,el('b',{text:label(r)}),el('div',{class:'when',text:`${r.kind==='animal'?'Seen':'Reported'} ${hhmm(r.at)} ${dayWord(r.at)}`}),el('p',{class:'hint',text:ago(r.at)+(r.lastSeen-r.at>60e3?` · confirmed ${hhmm(r.lastSeen)} (${ago(r.lastSeen)})`:'')}))));
  const tags=[];if(r.example)tags.push(el('span',{class:'tag ex',text:'Example, not a real report'}));if(r.pending)tags.push(el('span',{class:'tag',text:'Waiting for signal to send'}));
  if(t.there)tags.push(el('span',{class:'tag',text:`${t.there} confirmed`}));if(t.gone)tags.push(el('span',{class:'tag',text:`${t.gone} say gone`}));
  if(r.kind==='road')tags.push(el('span',{class:'tag',text:SEV.find(s=>s[0]===(r.sev||'1'))[1]}));
  if(r.act)tags.push(el('span',{class:'tag',text:r.act}));if(r.rdist)tags.push(el('span',{class:'tag',text:r.rdist}));
  if(tags.length)nodes.push(el('div',{class:'meta'},...tags));
  const lines=[el('p',null,el('b',{text:'Where: '}),whereText(q[0],q[1])+'.')];
  if(r.kind==='animal'&&r.heading!=null){if(r.heading>=0){const tw=towards(q[0],q[1],r.heading);lines.push(el('p',null,el('b',{text:'Moving: '}),`${DIRNAME[r.heading]}${tw?`, towards ${tw.short||tw.name}`:''}.`));}else lines.push(el('p',null,el('b',{text:'Moving: '}),'not moving when reported.'));}
  const rel=relTo(q[0],q[1]);if(rel)lines.push(el('p',null,el('b',{text:'From you: '}),`${fmtD(rel.d)} ${DIRNAME[DIRS.indexOf(rel.dir)]} (straight line).`));
  if(r.kind==='road'){const life=roadLife(r);lines.push(el('p',null,el('b',{text:'Likely until: '}),`about ${stamp(life.until)}.`));lines.push(el('p',{class:'fine',text:life.why+(life.next>=2?` More rain is forecast (${Math.round(life.next)} mm in the next 12 h), which would make it last longer.`:'')}));}
  nodes.push(el('div',{class:'dir'},...lines));
  if(r.note)nodes.push(el('p',{class:'note',text:r.note}));
  nodes.push(el('button',{class:'primary blue',type:'button',onclick:()=>previewRoute({x:q[0],y:q[1],name:label(r)}),text:'Navigate here'}));
  if(!r.example){const mine=r.by===S.device;nodes.push(el('div',{class:'acts'},el('button',{class:'secondary ok',type:'button',onclick:()=>{patchReport(r,{votes:{[S.device]:1},lastSeen:Date.now()});toast('Thanks. Marked as still there.');},text:'Still there'}),el('button',{class:'secondary no',type:'button',onclick:()=>{patchReport(r,{votes:{[S.device]:-1}});closeSheet();toast(mine?'Removed.':'Thanks. Marked as gone.');},text:mine?'Remove my report':'Not there any more'})));}
  openSheet(r.kind==='animal'?'Sighting':'Road report',nodes,{view:'rep:'+r.id});redraw();
}
function openPoi(p){
  const rel=relTo(p.x,p.y);
  const kind={junction:'Junction stone',gate:'Park gate',reception:'Reception',hq:'Park office',lodge:'Lodge',camp:'Campsite',ranger:'Ranger post',fence:'Fence attendant house',picnic:'Picnic spot',lookout:'Lookout',fuel:'Fuel'}[p.cat]||'Place';
  const nodes=[el('p',{class:'hint',text:kind+(p.note?'. '+p.note:'')+(p.cat==='junction'?' Position read off the park board (about 1 km accuracy).':'')})];
  if(rel)nodes.push(el('div',{class:'dir'},el('p',null,el('b',{text:'From you: '}),`${fmtD(rel.d)} ${DIRNAME[DIRS.indexOf(rel.dir)]} (straight line).`)));
  nodes.push(el('button',{class:'primary blue',type:'button',onclick:()=>previewRoute({x:p.x,y:p.y,name:p.cat==='junction'?'Junction '+p.num:(p.short||p.name)}),text:'Navigate here'}));
  if(!S.gps.ok)nodes.push(el('button',{class:'secondary',type:'button',onclick:()=>{S.manual={lat:p.lat,lon:p.lon,at:Date.now()};LS.set('manual',S.manual);closeSheet();updateGpsLine();toast('Position set here.');},text:'I am here'}));
  openSheet(p.cat==='junction'?'Junction '+p.num:(p.short||p.name),nodes,{view:'poi'});
}

/* ---------- Go: destinations, route preview ---------- */
function openGo(){
  const groups=[['Gates and reception',['gate','reception','hq']],['Lodges and camps',['lodge','camp']],['Lakes',['lake']],['Lookouts and picnic spots',['lookout','picnic']],['Areas',['area']]];
  const box=el('div',{class:'stack'});
  const q=el('input',{class:'search',type:'search',placeholder:'Search places or "junction 12"','aria-label':'Search places'});
  const render=()=>{const s=q.value.trim().toLowerCase();box.replaceChildren();
    const p=myPos();
    const item=(name,sub,x,y,em)=>{const rel=p?{d:gd(p.x,p.y,x,y),dir:DIRS[dir8(brg(p.x,p.y,x,y))]}:null;return el('li',null,el('button',{type:'button',onclick:()=>previewRoute({x,y,name})},el('span',{class:'em',text:em}),el('span',null,el('b',{text:name}),sub?el('small',{text:sub}):null),el('span',{class:'r'},rel?fmtD(rel.d):'',rel?el('small',{text:rel.dir}):'')));};
    if(!s){const sights=visibleReports().filter(r=>r.kind==='animal').sort((a,b)=>b.lastSeen-a.lastSeen).slice(0,4);
      if(sights.length){box.append(el('p',{class:'lbl',text:'Latest sightings'}),el('ul',{class:'list'},...sights.map(r=>{const m=merc(r.lon,r.lat);return item(label(r),`Seen ${hhmm(r.lastSeen)} · ${ago(r.lastSeen)}${r.example?' · example':''}`,m[0],m[1],emoji(r));})));}
      box.append(el('button',{class:'wide',type:'button',onclick:()=>startPick('dest'),text:'📍 Pick a spot on the map'}));}
    for(const [title,cats] of groups){let list=S.named.filter(n=>cats.includes(n.cat)).concat(S.pois.filter(n=>cats.includes(n.cat)&&!S.named.includes(n)));
      list=[...new Map(list.map(n=>[(n.short||n.name),n])).values()];
      if(s)list=list.filter(n=>(n.name+' '+(n.short||'')).toLowerCase().includes(s));
      if(!list.length)continue;if(p)list.sort((a,b)=>gd(p.x,p.y,a.x,a.y)-gd(p.x,p.y,b.x,b.y));
      box.append(el('p',{class:'lbl',text:title}),el('ul',{class:'list'},...list.slice(0,s?20:8).map(n=>item(n.short||n.name,'',n.x,n.y,{gate:'🚪',reception:'ℹ️',hq:'🏠',lodge:'🛏️',camp:'⛺',lake:'💧',lookout:'👁️',picnic:'🧺',area:'🌾'}[n.cat]||'📍'))));}
    if(s){const m=s.match(/(\d+)/);if(m){const j=J(+m[1]);if(j)box.prepend(el('ul',{class:'list'},item('Junction '+j.num,'Position from the park board',j.x,j.y,'⓿')));}}
  };
  q.oninput=render;render();
  openSheet('Where to?',[q,box],{view:'go'});
}
function previewRoute(dest){
  const p=needPos(()=>previewRoute(dest));if(!p)return;
  const r=route(p.x,p.y,dest.x,dest.y,dest.name);
  if(r.error){
    const u=unmerc(dest.x,dest.y);
    openSheet('No route found',[el('p',{class:'hint',text:r.error==='far'?(r.s0?'The destination is too far from any mapped road.':'You are too far from the mapped park roads to plan a route here. Use Google Maps to reach the park, then try again.'):'No drivable route found. A road may be closed by a report.'}),
      el('a',{class:'secondary',href:`https://www.google.com/maps/dir/?api=1&destination=${u.lat.toFixed(6)},${u.lon.toFixed(6)}`,target:'_blank',rel:'noopener',text:'Open in Google Maps'})],{view:'noroute'});return;}
  S.route=r;S.follow=false;fitRoute(r);
  const eta=Date.now()+r.time*1000;
  const nodes=[el('div',{class:'route-card'},el('div',{class:'big',text:`${fmtDur(r.time)} · ${fmtD(r.len)}`}),el('div',{class:'hint',text:`Arrive about ${hhmm(eta)}${r.via.length?` · via ${r.via.join(', ')}`:''}`}),el('div',{class:'hint',text:`${r.instr.length>2?(r.instr.length-1)+' turns':r.instr.length===2?'1 turn':'No turns'}. Park speed limit 40 km/h.`}))];
  for(const w of r.warn)nodes.push(el('div',{class:'warnrow',text:`${RD[w.type][2]} ${RD[w.type][1]} on this route (${SEV.find(s=>s[0]===(w.sev||'1'))[1]}), reported ${ago(w.at)}. ${w.sev==='3'?'The route avoids it where it can.':'The route weighs it in.'}`}));
  for(const s of r.sights.slice(0,3))nodes.push(el('div',{class:'warnrow',style:'background:#E4F2E8;color:#1E4D2E',text:`${emoji(s)} ${label(s)} near this route, seen ${hhmm(s.lastSeen)} (${ago(s.lastSeen)})${s.example?' (example)':''}.`}));
  if(wetness()>=5)nodes.push(el('div',{class:'warnrow',style:'background:#DCEAF8;color:#1D4F86',text:`${wetness().toFixed(0)} mm of rain in the last 24 h. Tracks may be muddy, so the route prefers the main roads.`}));
  nodes.push(el('button',{class:'primary green',type:'button',onclick:startNav,text:'Start'}));
  if(!S.layers.osm)nodes.push(el('p',{class:'fine',text:'Roads come from the park board until the detailed OpenStreetMap roads finish loading, so directions are approximate.'}));
  openSheet(`To ${dest.name}`,nodes,{view:'preview'});
}
function fitRoute(r){let x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;for(const q of r.pts){x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);}cam.rot=0;cam.ax=.5;cam.ay=.32;cam.s=clamp(Math.min((W-60)/(x1-x0+1),(H*0.42)/(y1-y0+1)),0.004,0.4);cam.cx=(x0+x1)/2;cam.cy=(y0+y1)/2;redraw();}

/* =========================================================================
   11. Turn-by-turn navigation
   ========================================================================= */
let wakeLock=null;
async function keepAwake(){try{if(S.set.wake&&'wakeLock' in navigator)wakeLock=await navigator.wakeLock.request('screen');}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(S.nav&&document.visibilityState==='visible')keepAwake();});
function say(t){if(!S.set.voice||!('speechSynthesis' in window))return;try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='en-GB';u.rate=1;speechSynthesis.speak(u);}catch(e){}}
function startNav(){
  if(!S.route)return;closeSheet();
  S.nav={prog:0,seg:1,off:0,next:null,spoken:{},started:Date.now()};
  document.body.classList.add('navmode');$('tiltbox').classList.toggle('tilt',S.set.tilt);
  ['navTop','navBottom','speedBox'].forEach(i=>$(i).hidden=false);
  anim=true;keepAwake();
  say(`Starting route to ${S.route.destName}. ${fmtD(S.route.len)}.`);
  setTimeout(()=>{resize();navUpdate();requestAnimationFrame(draw);},60);
}
function endNav(arrived){
  stopSim();S.nav=null;anim=false;document.body.classList.remove('navmode');$('tiltbox').classList.remove('tilt');
  ['navTop','navBottom','speedBox','navThen','navWarn'].forEach(i=>$(i).hidden=true);
  try{wakeLock&&wakeLock.release();}catch(e){}wakeLock=null;
  if(!arrived)S.route=null;
  setTimeout(()=>{resize();const p=myPos();cam.rot=0;cam.ax=.5;cam.ay=.47;if(p)centerOn(p.x,p.y,Math.max(cam.s*.6,.03));else redraw();},60);
}
$('navEnd').onclick=()=>{endNav(false);toast('Navigation ended.');};
$('navMute').onclick=()=>{S.set.voice=!S.set.voice;saveSet();$('navMute').textContent=S.set.voice?'🔊':'🔇';if(!S.set.voice)try{speechSynthesis.cancel();}catch(e){}};
$('navReport').onclick=()=>startReport();
function navUpdate(){
  const N=S.nav,R=S.route;if(!N||!R)return;const p=myPos();if(!p)return;
  // locate the car on the route (search ahead of last position first)
  let best=null;const scan=(i0,i1)=>{for(let i=Math.max(1,i0);i<Math.min(R.pts.length,i1);i++){const a=R.pts[i-1],b=R.pts[i];const q=projSeg(p.x,p.y,a[0],a[1],b[0],b[1]);const prog=R.cum[i-1]+q.t*(R.cum[i]-R.cum[i-1]);const pen=prog<N.prog-40?40:0;if(!best||q.d+pen<best.d+best.pen)best={i,d:q.d,prog,pen};}};
  scan(N.seg-3,N.seg+80);if(!best||best.d>60)scan(1,R.pts.length);
  const tol=Math.max(45,(S.gps.acc||10)*1.5);
  if(best.d>tol){N.off++;if(N.off>=3&&Date.now()-(N.lastRe||0)>8000){N.lastRe=Date.now();const r=route(p.x,p.y,R.dest[0],R.dest[1],R.destName);if(!r.error){S.route=r;N.prog=0;N.seg=1;N.off=0;N.spoken={};say('Rerouting.');toast('New route.');return navUpdate();}}}
  else {N.off=0;N.seg=best.i;N.prog=Math.max(best.prog,Math.min(N.prog,best.prog+5));N.prog=best.prog;}
  const next=R.instr.find(s=>s.d>N.prog+3)||R.instr[R.instr.length-1];N.next=next;const dist=Math.max(0,next.d-N.prog);
  const idx=R.instr.indexOf(next);const after=R.instr[idx+1];
  $('manDist').textContent=fmtD(dist);$('manText').textContent=next.type==='arrive'?`Arrive at ${R.destName}`:instrText(next);
  drawMan($('manIcon'),next.type);
  const then=$('navThen');if(after&&after.d-next.d<250&&next.type!=='arrive'){then.hidden=false;then.textContent=`Then ${instrText(after,false).toLowerCase()}`;}else then.hidden=true;
  // warnings ahead (road reports within the next 2 km of route)
  const w=R.warn.map(r=>{const q=merc(r.lon,r.lat);let bd=1e9,bp=0;for(let i=1;i<R.pts.length;i++){const s=projSeg(q[0],q[1],R.pts[i-1][0],R.pts[i-1][1],R.pts[i][0],R.pts[i][1]);if(s.d<bd){bd=s.d;bp=R.cum[i-1]+s.t*(R.cum[i]-R.cum[i-1]);}}return {r,ahead:bp-N.prog};}).filter(o=>o.ahead>0&&o.ahead<2000).sort((a,b)=>a.ahead-b.ahead)[0];
  const wb=$('navWarn');if(w){wb.hidden=false;wb.textContent=`${RD[w.r.type][2]} ${RD[w.r.type][1]} in ${fmtD(w.ahead)}`;if(!N.spoken['w'+w.r.id]&&w.ahead<600){N.spoken['w'+w.r.id]=1;say(`Caution. ${RD[w.r.type][1]} reported ahead.`);}}else wb.hidden=true;
  // voice prompts
  const key=R.instr.indexOf(next);
  if(next.type==='arrive'){if(dist<30&&!N.spoken.arr){N.spoken.arr=1;say(`You have arrived at ${R.destName}.`);setTimeout(()=>{endNav(true);toast(`Arrived at ${R.destName}.`);},4000);}}
  else{const t=instrText(next);
    if(dist<600&&dist>250&&!N.spoken[key+'f']){N.spoken[key+'f']=1;say(`In ${fmtD(Math.round(dist/50)*50)}, ${t.toLowerCase()}.`);}
    if(dist<=90&&!N.spoken[key+'n']){N.spoken[key+'n']=1;say(t+'.');}}
  // ETA from remaining distance and speed profile
  const remain=R.len-N.prog;const secs=remain*R.tpm;$('etaTime').textContent=hhmm(Date.now()+secs*1000);$('etaRest').textContent=`${fmtDur(secs)} · ${fmtD(remain)}`;
  const kmh=Math.round((S.gps.speed||0)*3.6);$('speedVal').textContent=kmh;$('speedBox').classList.toggle('over',kmh>40);
  // camera target: heading-up, anchored low on screen
  const hd=routeHeading(R,N.prog,p);const mpp=kmh<12?1.3:kmh<30?1.9:2.6;
  let ay=.70;if(S.set.tilt){const Hv=$('mapwrap').clientHeight,pp=1100,th=40*RAD,hs=0.27*Hv;const d=hs*pp/(pp*Math.cos(th)-hs*Math.sin(th));ay=clamp(1-d/H,.5,.95);}
  camT.cx=p.x;camT.cy=p.y;camT.s=1/mpp*(S.set.tilt?1.15:0.85);camT.rot=-hd*RAD;camT.ax=.5;camT.ay=ay;cam.ax=camT.ax;cam.ay=camT.ay;
  if(S.gps.heading==null)S.gps.heading=hd;
}
function routeHeading(R,prog,p){const a=pointAt(R,prog),b=pointAt(R,prog+25);if(gd(a[0],a[1],b[0],b[1])<2)return S.gps.heading||0;return brg(a[0],a[1],b[0],b[1]);}
function drawMan(c,type){
  const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,120,120);g.lineCap='round';g.lineJoin='round';g.strokeStyle='#fff';g.fillStyle='#fff';g.lineWidth=11;
  const arrowHead=(x,y,ang)=>{g.save();g.translate(x,y);g.rotate(ang);g.beginPath();g.moveTo(0,-16);g.lineTo(15,6);g.lineTo(-15,6);g.closePath();g.fill();g.restore();};
  const turn=(deg,keep)=>{g.beginPath();g.moveTo(60,108);g.lineTo(60,70);const a=(deg-90)*RAD;const L=keep?30:34;const ex=60+Math.cos(a)*L,ey=70+Math.sin(a)*L;g.quadraticCurveTo(60,70-(keep?14:0),ex,ey);g.stroke();arrowHead(ex+Math.cos(a)*6,ey+Math.sin(a)*6,deg*RAD);};
  if(type==='arrive'){g.lineWidth=7;g.beginPath();g.moveTo(42,104);g.lineTo(42,18);g.stroke();g.beginPath();g.moveTo(44,20);g.lineTo(88,32);g.lineTo(44,46);g.closePath();g.fill();return;}
  const m={'straight':0,'slight-left':-40,'slight-right':40,'left':-90,'right':90,'sharp-left':-140,'sharp-right':140,'keep-left':-28,'keep-right':28}[type];
  if(m===0||m==null){g.beginPath();g.moveTo(60,108);g.lineTo(60,30);g.stroke();arrowHead(60,24,0);return;}
  if(type.startsWith('keep')){g.globalAlpha=.4;g.beginPath();g.moveTo(60,70);g.lineTo(60+(m>0?-26:26),28);g.stroke();g.globalAlpha=1;}
  turn(m,type.startsWith('keep'));
}

/* =========================================================================
   12. Weather sheet, settings
   ========================================================================= */
function openWeather(){
  const p=myPos();const lat=p?p.lat:-1.75;const pt=wxPt(lat);const nodes=[];
  if(!pt){nodes.push(el('p',{class:'hint',text:navigator.onLine?'Loading weather…':'No weather data yet. It loads when you have signal and is kept for offline use.'}));openSheet('Weather and roads',nodes,{view:'wx'});loadWeather(true);return;}
  const now=Date.now();const hrs=[];for(let i=0;i<pt.t.length;i++){if(pt.t[i]>=now-48*3600e3&&pt.t[i]<=now+24*3600e3)hrs.push({t:pt.t[i],p:pt.p[i],f:pt.t[i]>now});}
  const mx=Math.max(2,...hrs.map(h=>h.p));
  nodes.push(el('p',{class:'hint',text:`For the ${WXPTS[wxIdx(lat)].n} of the park. Updated ${hhmm(S.wx.fetched)} ${dayWord(S.wx.fetched)}.`}));
  nodes.push(el('div',{class:'bars','aria-label':'Hourly rain, past 48 hours and next 24 hours'},...hrs.map(h=>el('i',{class:h.f?'f':'',style:`height:${Math.max(1,h.p/mx*100)}%`,title:`${stamp(h.t)}: ${h.p} mm`}))));
  nodes.push(el('div',{class:'barlbl'},el('span',{text:'48 h ago'}),el('span',{text:'now'}),el('span',{text:'+24 h'})));
  const r24=rainSum(pt,now-24*3600e3,now),r48=rainSum(pt,now-48*3600e3,now),n12=rainSum(pt,now,now+12*3600e3),lr=lastRain(pt,now-5*864e5,now);
  nodes.push(el('div',{class:'wxrow'},el('span',{text:'Rain, last 24 h'}),el('b',{text:`${r24.toFixed(1)} mm`}),el('span',{text:'Rain, last 48 h'}),el('b',{text:`${r48.toFixed(1)} mm`}),el('span',{text:'Forecast, next 12 h'}),el('b',{text:`${n12.toFixed(1)} mm`}),el('span',{text:'Last rain'}),el('b',{text:lr?stamp(lr):'none in 5 days'})));
  const mud=RD.mud[3];const mm=lr?rainSum(pt,lr-48*3600e3,lr):0;const dryUntil=lr?lr+Math.min(mud.cap,mud.dry+mud.perMm*mm)*3600e3:null;
  nodes.push(el('div',{class:'dir'},el('p',{text:!lr||dryUntil<now?'Tracks should be dry. Black cotton soil in the north still turns slippery quickly if it rains.':`Tracks likely muddy until about ${stamp(dryUntil)}, after ${Math.round(mm)} mm of rain. Use 4WD on climbs and stay on main roads.`})));
  nodes.push(el('p',{class:'fine',text:'Road reports for mud, flooding and slippery climbs expire on their own once the ground has had time to dry: a base time plus extra hours for each millimetre of rain, and longer if it rains again. Weather data: Open-Meteo.'}));
  openSheet('Weather and roads',nodes,{view:'wx'});
}
$('wxPill').onclick=openWeather;
function saveSet(){LS.set('settings',S.set);}
function openSettings(){
  const tog=(key,label)=>{const i=el('input',{type:'checkbox',id:'set-'+key});i.checked=!!S.set[key];i.onchange=()=>{S.set[key]=i.checked;saveSet();redraw();};return el('label',{class:'toggle',for:'set-'+key},label,i);};
  const cfg=window.AKAGERA_FIREBASE;
  const nodes=[tog('voice','Spoken directions'),tog('tilt','3D view while driving'),tog('wake','Keep screen on while driving'),tog('sat','Satellite background'),
    el('button',{class:'secondary',type:'button',onclick:()=>{closeSheet();if(S.sim){stopSim();toast('Demo drive stopped.');}else{if(!S.route){toast('Pick a destination with Go first.');return;}startNav();startSim();}},text:S.sim?'Stop demo drive':'Demo drive along the planned route'}),
    el('button',{class:'secondary',type:'button',onclick:()=>{closeSheet();startPick('me');},text:'Set my position by hand'}),
    el('button',{class:'secondary',type:'button',onclick:()=>{S.set.hideEx=!S.set.hideEx;saveSet();closeSheet();redraw();},text:S.set.hideEx?'Show example reports':'Hide example reports'}),
    el('p',{class:'lbl',text:'About the data'}),
    el('p',{class:'fine',text:`Sharing: ${cfg&&cfg.apiKey?'Firebase project '+cfg.projectId+' ('+S.sync+')':'not set up yet, so reports stay on this phone.'}`}),
    el('p',{class:'fine',text:S.layers.osm?`Roads and lakes: OpenStreetMap contributors, updated ${S.osm.meta.generated}.`:'Roads: traced from the park entrance board (detailed OpenStreetMap roads not loaded yet).'}),
    el('p',{class:'fine',text:'Junction stones, ranger posts and fence houses: from the park board, accurate to about 1 km. Satellite: Esri World Imagery. Weather: Open-Meteo.'})];
  openSheet('Settings',nodes,{view:'settings'});
}
$('setBtn').onclick=openSettings;$('syncPill').onclick=openSettings;
$('reportBtn').onclick=startReport;$('findBtn').onclick=openFind;$('goBtn').onclick=openGo;

/* =========================================================================
   13. Boot
   ========================================================================= */
async function boot(){
  S.animalWin=LS.get('win',6);
  try{S.board=await getJSON('data/board.json');}catch(e){document.body.textContent='Map data could not be loaded.';return;}
  try{S.osm=await getJSON('data/osm.json');}catch(e){S.osm=null;}
  buildData();
  new ResizeObserver(()=>resize()).observe(cv);resize();fitPark();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(redraw);
  updateWxPill();setSync();updateGpsLine();
  startGPS();loadWeather();initSharing();
  setInterval(()=>{loadWeather();redraw();updateGpsLine();},60e3);
  window.addEventListener('online',()=>loadWeather(true));
  // follow GPS in browse mode
  setInterval(()=>{if(!S.nav&&S.follow){const p=myPos();if(p&&p.gps){cam.cx=p.x;cam.cy=p.y;redraw();}}},1000);
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
  if(!S.set.hideEx&&allReports().some(r=>r.example))banner('No live reports yet. Pins marked EXAMPLE are samples.','Hide',()=>{S.set.hideEx=true;saveSet();hideBanner();redraw();},'ex');
  window.AKL=S;window.AKLf={route,snap,merc,penalties,roadLife,openWeather,updateWxPill};   // for debugging
}
boot();
