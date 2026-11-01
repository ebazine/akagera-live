/* Akagera Live: sightings, road conditions and GPS navigation for Akagera National Park.
   Map data: OpenStreetMap contributors (ODbL) and the park entrance board. Weather: Open-Meteo. */
"use strict";

/* =========================================================================
   0. Catalogue
   ========================================================================= */
const SP = [...window.SPECIES, ...window.SPECIES_EXTRA];
const SPX = Object.fromEntries(SP.map(x=>[x.id,x]));
const SHORTNAME = {elephant:'Elephant',giraffe:'Giraffe',zebra:'Zebra',buffalo:'Buffalo',croc:'Crocodile',hyena:'Hyena',warthog:'Warthog',jackal:'Jackal',waterbuck:'Waterbuck',eland:'Eland',reedbuck:'Reedbuck',duiker:'Duiker',baboon:'Baboon',vervet:'Vervet monkey',fisheagle:'Fish eagle',crane:'Crowned crane',pelican:'Pelican',marabou:'Marabou stork',roan:'Roan antelope',hippo:'Hippo',rhino:'Rhino',bird:'Bird',other:'Animal'};
const ANIMALS = SP.map(x=>[x.id,SHORTNAME[x.id]||x.name,x.emoji]);
const TOP_ANIMALS = ['lion','elephant','rhino','leopard','buffalo','giraffe','zebra','hippo'];
const PLURAL = {buffalo:'Buffalo',topi:'Topi',waterbuck:'Waterbuck',eland:'Eland',impala:'Impala',oribi:'Oribi',reedbuck:'Reedbuck',bushbuck:'Bushbuck',sitatunga:'Sitatunga',rhino:'Rhinos',rhino_b:'Black rhinos',rhino_w:'White rhinos',bird:'Birds',other:'Animals',fisheagle:'Fish eagles',crane:'Crowned cranes',vervet:'Vervet monkeys',marabou:'Marabou storks',roan:'Roan antelope',croc:'Crocodiles',hippo:'Hippos'};
const DANGER = [['Harmless','#2E7D4F'],['Keep your distance','#C98A00'],['Dangerous','#E0670F'],['Very dangerous','#C0392B']];
const RARITY = ['','Common','Regular','Uncommon','Rare'];
const POINTS = [0,5,10,20,40];
/* road types: life = hours when the weather does not matter; wet types dry out after rain stops */
const ROADS = [
  ['mud','Mud / slippery','🟤',{wet:true,base:24,dry:12,perMm:1.5,cap:96}],
  ['flood','Flooded','🌊',{wet:true,base:36,dry:24,perMm:2.0,cap:120}],
  ['steep','Slippery climb','⛰️',{wet:true,base:12,dry:8,perMm:1.0,cap:48}],
  ['holes','Potholes / ruts','🕳️',{base:24*14}],
  ['washout','Washed out','🚧',{base:24*30}],
  ['tree','Fallen tree','🌳',{base:72}],
  ['closed','Road closed','⛔',{base:24*7}],
  ['broken','Broken down','🛠️',{base:10}],
  ['stuck','Vehicle stuck','🚙',{base:6}],
  ['sos','Needs help','🆘',{base:6}],
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
const fmtDur=s=>{const m=Math.round(s/60);if(m<60)return `${Math.max(1,m)} min`;return `${Math.floor(m/60)} h ${String(m%60).padStart(2,'0')} min`;};
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
  manual: LS.get('manual', null), useManual: LS.get('useManual', false),
  live:[], local: LS.get('local', []), sync:'local', fs:null,
  wx: LS.get('wx', null),
  route:null, nav:null,
  set: Object.assign({voice:true, tilt:true, wake:true, sat:false, hideEx:false, speedWarn:true}, LS.get('settings', {})),
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
  const groups={major:[],minor:[],track:[],closed:[]};
  if(O&&O.ways&&O.ways.length>20){
    for(const w of O.ways){const g=w.a?'closed':MAJOR.has(w.h)?'major':MINOR.has(w.h)?'minor':'track';groups[g].push(w.n.map(i=>[O.nodes[2*i],O.nodes[2*i+1]]));}
  } else groups.track=B.roads;
  L.major=pathOf(groups.major,false);L.minor=pathOf(groups.minor,false);L.track=pathOf(groups.track,false);
  L.closed=groups.closed.length?pathOf(groups.closed,false):null;
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
  S.links=[];L.approx=null;
  if(L.osm){const ix=osmIndex(O);placeJunctions(ix);boardLinks(ix);}
  S.named=S.pois.filter(p=>['lake','area','gate','lodge','camp','lookout','picnic','reception','hill'].includes(p.cat));
  for(const w of S.waterNames){if(!S.named.some(n=>n.cat==='lake'&&n.name===w.name))S.named.push({name:w.name,short:w.name,cat:'lake',x:w.x,y:w.y});}
  buildGraph();
}

/* spatial index over OpenStreetMap road segments: nearest point on a road */
function osmIndex(O){
  const C=500,grid=new Map(),X=[],Y=[],segs=[];const n=O.nodes.length/2;
  for(let i=0;i<n;i++){const q=merc(O.nodes[2*i],O.nodes[2*i+1]);X.push(q[0]);Y.push(q[1]);}
  for(const w of O.ways)for(let k=0;k+1<w.n.length;k++){const a=w.n[k],b=w.n[k+1];const si=segs.length;segs.push([a,b,w.a?1:0]);
    const x0=Math.floor(Math.min(X[a],X[b])/C),x1=Math.floor(Math.max(X[a],X[b])/C),y0=Math.floor(Math.min(Y[a],Y[b])/C),y1=Math.floor(Math.max(Y[a],Y[b])/C);
    for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){const key=gx+','+gy;let l=grid.get(key);if(!l)grid.set(key,l=[]);l.push(si);}}
  // any=true also counts tracks closed to visitors
  const near=(x,y,r,any)=>{let best=null;const cr=Math.ceil(r/KG/C),cx=Math.floor(x/C),cy=Math.floor(y/C),seen=new Set();
    for(let gx=cx-cr;gx<=cx+cr;gx++)for(let gy=cy-cr;gy<=cy+cr;gy++){const l=grid.get(gx+','+gy);if(!l)continue;
      for(const si of l){if(seen.has(si))continue;seen.add(si);const s=segs[si];if(s[2]&&!any)continue;const p=projSeg(x,y,X[s[0]],Y[s[0]],X[s[1]],Y[s[1]]);if(p.d<=r&&(!best||p.d<best.d))best={d:p.d,x:p.qx,y:p.qy};}}
    return best;};
  return {near};
}
/* junction stones known only from the park board sit on a road: move them onto the nearest one within 400 m */
function placeJunctions(ix){
  for(const j of S.juncs){if(j.src!=='board')continue;const p=ix.near(j.x,j.y,400);if(!p)continue;
    const g=unmerc(p.x,p.y);Object.assign(j,{x:p.x,y:p.y,lat:g.lat,lon:g.lon,src:'snap'});}
}
/* tracks on the park board that OpenStreetMap does not have yet, drawn junction stone to junction stone.
   A track is dropped automatically once OpenStreetMap maps it (open or closed). */
function boardLinks(ix){
  const lines=[];
  for(const k of (S.board.links||[])){
    const A=S.juncs.find(j=>j.num===k.a),B=S.juncs.find(j=>j.num===k.b);if(!A||!B)continue;
    const pts=[[A.x,A.y],...(k.via||[]).map(c=>merc(c[0],c[1])),[B.x,B.y]];
    let n=0,hit=0;
    for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];const m=Math.max(1,Math.round(gd(a[0],a[1],b[0],b[1])/60));
      for(let t=1;t<m;t++){n++;if(ix.near(a[0]+(b[0]-a[0])*t/m,a[1]+(b[1]-a[1])*t/m,120,true))hit++;}}
    if(n&&hit/n>0.6)continue;
    S.links.push({a:k.a,b:k.b,pts,nm:`Track ${k.a}–${k.b}`});A.link=B.link=true;lines.push(pts);
  }
  if(lines.length){const p=new Path2D();for(const l of lines)l.forEach((q,i)=>i?p.lineTo(q[0],q[1]):p.moveTo(q[0],q[1]));S.layers.approx=p;}
}
function buildGraph(){
  const O=S.osm; let X=[],Y=[],ways=[];
  if(O&&O.ways&&O.ways.length>20){
    const n=O.nodes.length/2;for(let i=0;i<n;i++){const q=merc(O.nodes[2*i],O.nodes[2*i+1]);X.push(q[0]);Y.push(q[1]);}
    ways=O.ways.map(w=>({n:w.n,h:w.h,nm:w.nm||'',t:w.t,s:w.s,o:w.o==='yes',a:!!w.a}));
    // board-only tracks: one shared node per junction stone, joined to the nearest open road node within 350 m
    const jn=new Map();const jnode=(num,q)=>{let v=jn.get(num);if(v==null){v=X.length;X.push(q[0]);Y.push(q[1]);jn.set(num,v);}return v;};
    for(const k of S.links||[]){const ids=[jnode(k.a,k.pts[0])];for(let i=1;i<k.pts.length-1;i++){ids.push(X.length);X.push(k.pts[i][0]);Y.push(k.pts[i][1]);}ids.push(jnode(k.b,k.pts[k.pts.length-1]));
      ways.push({n:ids,h:'track',t:'board',nm:k.nm,o:false,approx:true});}
    if(jn.size){const open=new Uint8Array(n);for(const w of O.ways)if(!w.a)for(const i of w.n)open[i]=1;
      for(const [,v] of jn){let best=-1,bd=350;for(let i=0;i<n;i++){if(!open[i])continue;const d=gd(X[i],Y[i],X[v],Y[v]);if(d<bd){bd=d;best=i;}}
        if(best>=0)ways.push({n:[v,best],h:'track',t:'board',nm:'',o:false,approx:true});}}
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
  // routes stay inside the park: only roads whose both ends are inside the boundary
  const inside=makeInside(), inN=new Uint8Array(N);for(let i=0;i<N;i++)inN[i]=(O&&O.ways&&O.ways.length>20)?inside(X[i],Y[i]):1;
  for(let wi=0;wi<ways.length;wi++){const w=ways[wi];
    let sx=0,sy=0;for(const i of w.n){sx+=X[i];sy+=Y[i];}const inPark=inRing(sx/w.n.length,sy/w.n.length,S.park);
    let v={motorway:80,trunk:70,primary:60,secondary:50,tertiary:40,unclassified:30,residential:25,living_street:15,service:15,road:25,track:20}[w.h]||20;
    if(w.h==='track'){v={grade1:28,grade2:24,grade3:20,grade4:14,grade5:10}[w.t]||20;}
    if(inPark){v=MAJOR.has(w.h)?35:w.h==='track'?Math.min(v,18):Math.min(v,28);if(w.h==='track'&&w.t==='grade1')v=25;}
    if(w.approx)v=15; w.v=v/3.6; w.inPark=inPark;
    if(w.a)continue;   // closed to visitors: drawn, never routed
    for(let k=0;k+1<w.n.length;k++){const a=w.n[k],b=w.n[k+1];if(a===b||!inN[a]||!inN[b])continue;const len=gd(X[a],Y[a],X[b],Y[b]);const si=segs.length;segs.push([a,b,wi,len]);adj[a].push([b,si,wi]);if(!w.o)adj[b].push([a,si,wi]);}
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
function makeInside(){
  const R=S.park;let x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;for(const q of R){x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);}
  const C=700,nx=Math.ceil((x1-x0)/C)+1,ny=Math.ceil((y1-y0)/C)+1,cell=new Int8Array(nx*ny);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)cell[j*nx+i]=inRing(x0+(i+.5)*C,y0+(j+.5)*C,R)?1:0;
  const edge=new Uint8Array(nx*ny);
  for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const v=cell[j*nx+i];for(let dj=-1;dj<=1;dj++)for(let di=-1;di<=1;di++){const a=i+di,b=j+dj;const w=(a<0||b<0||a>=nx||b>=ny)?0:cell[b*nx+a];if(w!==v)edge[j*nx+i]=1;}}
  return (x,y)=>{const i=Math.floor((x-x0)/C),j=Math.floor((y-y0)/C);if(i<0||j<0||i>=nx||j>=ny)return 0;const k=j*nx+i;return edge[k]?(inRing(x,y,R)?1:0):cell[k];};
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
function route(fromX,fromY,toX,toY,destName,opt={}){
  const G=S.graph;const s0=opt.s0||snap(fromX,fromY,15000), s1=opt.s1||snap(toX,toY,8000);
  if(!s0||!s1)return {error:'far',s0,s1};
  const {pen,reasons,wf}=opt.pp||penalties();
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
  if(opt.costOnly)return {cost:best};
  const pts=[[s0.qx,s0.qy]];const segIdx=[];const nodes=[];
  if(bestNode!==-2){const chain=[];let u=bestNode;while(u!==-1){chain.push(u);u=prev[u];}chain.reverse();
    for(const u of chain){pts.push([G.X[u],G.Y[u]]);nodes.push(u);}
  }
  pts.push([s1.qx,s1.qy]);
  const r=buildRoute(pts,nodes,{pen,reasons},destName,best,[toX,toY]);r.startOff=s0.d;r.endOff=s1.d;r.start=[s0.qx,s0.qy];
  // first and last pieces run along the snapped segments
  const k=r.pts.length-1;
  if(k>=1&&G.ways[segStart[2]].approx&&!r.approxSeg[1]){r.approxSeg[1]=1;r.approxLen+=r.cum[1];}
  if(k>=1&&G.ways[segEnd[2]].approx&&!r.approxSeg[k]){r.approxSeg[k]=1;r.approxLen+=r.cum[k]-r.cum[k-1];}
  return r;
}
/* several stops in a fixed order, joined into one route */
function routeMulti(from,stops){
  const pp=penalties();const legs=[];let cx=from.x,cy=from.y;
  for(const st of stops){const r=route(cx,cy,st.x,st.y,st.name,{pp});if(r.error)return {...r,stop:st};legs.push(r);const e=r.pts[r.pts.length-1];cx=e[0];cy=e[1];}
  if(legs.length===1){legs[0].stops=[{...stops[0],d:legs[0].len}];return legs[0];}
  const pts=[],cum=[],instr=[],warn=[],sights=[],via=[],wps=[],aps=[];let off=0,time=0,ioff=0,approxLen=0;
  legs.forEach((L,k)=>{const skip=k?1:0;for(let i=skip;i<L.pts.length;i++){pts.push(L.pts[i]);cum.push(L.cum[i]+off);aps.push(L.approxSeg?L.approxSeg[i]:0);}approxLen+=L.approxLen||0;
    for(const s of L.instr){const o={...s,i:s.i+ioff,d:s.d+off};if(s.type==='arrive'&&k<legs.length-1){o.type='waypoint';o.stop=k+1;o.name=stops[k].name;}if(s.type==='arrive'&&k===legs.length-1){o.stop=k+1;o.name=stops[k].name;}instr.push(o);}
    wps.push({...stops[k],d:L.len+off});
    for(const w of L.warn)if(!warn.includes(w))warn.push(w);for(const w of L.sights)if(!sights.includes(w))sights.push(w);for(const v of L.via)if(!via.includes(v))via.push(v);
    off+=L.len;time+=L.time;ioff=pts.length-1;});
  return {pts,cum,len:off,time,tpm:time/Math.max(1,off),instr,warn,sights,via:via.slice(0,3),destName:stops[stops.length-1].name,dest:[stops[stops.length-1].x,stops[stops.length-1].y],stops:wps,startOff:legs[0].startOff,endOff:legs[legs.length-1].endOff,start:legs[0].start,approxSeg:Uint8Array.from(aps),approxLen};
}
/* best visiting order for up to 6 stops (open path from the car) */
function bestOrder(from,stops){
  const pts=[from,...stops],n=pts.length,pp=penalties();const sn=pts.map((p,i)=>snap(p.x,p.y,i?8000:15000));
  if(sn.some(x=>!x))return null;
  const T=Array.from({length:n},()=>new Array(n).fill(Infinity));
  for(let i=0;i<n;i++)for(let j=1;j<n;j++){if(i===j)continue;const r=route(pts[i].x,pts[i].y,pts[j].x,pts[j].y,'',{pp,costOnly:true,s0:sn[i],s1:sn[j]});T[i][j]=r.error?Infinity:r.cost;}
  let best=null,bc=Infinity;const idx=stops.map((_,i)=>i+1);
  const perm=(a,l)=>{if(l===a.length){let c=0,p=0;for(const q of a){c+=T[p][q];p=q;if(c>=bc)return;}if(c<bc){bc=c;best=a.slice();}return;}for(let i=l;i<a.length;i++){[a[l],a[i]]=[a[i],a[l]];perm(a,l+1);[a[l],a[i]]=[a[i],a[l]];}};
  perm(idx,0);return best?best.map(i=>stops[i-1]):null;
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
  for(const s of instr){let bj=null,bd=90;for(const j of S.juncs){if(j.src!=='osm'&&j.src!=='snap'&&!j.link)continue;const d=gd(j.x,j.y,P[s.i][0],P[s.i][1]);if(d<bd){bd=d;bj=j;}}if(bj)s.j=bj.num;}
  instr.push({i:P.length-1,d:len,type:'arrive',road:''});
  // merge instructions closer than 25 m (keep the stronger)
  const out=[];for(const s of instr){const l=out[out.length-1];if(l&&s.d-l.d<20&&s.type!=='arrive'){continue;}out.push(s);}
  // warnings along route
  const warn=[];const seen=new Set();
  for(const r of activeRoadReports()){const [x,y]=merc(r.lon,r.lat);let best=1e9;for(let i=1;i<P.length;i++){const p=projSeg(x,y,P[i-1][0],P[i-1][1],P[i][0],P[i][1]);if(p.d<best)best=p.d;}if(best<130&&!seen.has(r.id)){seen.add(r.id);warn.push(r);}}
  const sights=[];for(const r of visibleReports().filter(r=>r.kind==='animal')){const [x,y]=merc(r.lon,r.lat);let best=1e9;for(let i=1;i<P.length;i+=1){const p=projSeg(x,y,P[i-1][0],P[i-1][1],P[i][0],P[i][1]);if(p.d<best)best=p.d;}if(best<400)sights.push(r);}
  const via=[...new Set(out.map(s=>s.road).filter(Boolean))].slice(0,3);
  // which parts run on approximate board tracks
  const approxSeg=new Uint8Array(P.length);let approxLen=0;
  for(let i=1;i<P.length;i++){if(!(nodeAt[i-1]>=0))continue;const wi=nextWay(nodeAt[i-1],nodeAt[i]);if(wi!=null&&G.ways[wi].approx){approxSeg[i]=1;approxLen+=cum[i]-cum[i-1];}}
  return {pts:P,cum,len,tpm,time:costS,instr:out,warn,sights,via,destName,dest,approxSeg,approxLen};
}
function nextWay(u,v){if(v==null||v<0)return null;for(const e of S.graph.adj[u])if(e[0]===v)return e[2];return null;}
function instrText(s,withRoad=true){
  if(s.type==='waypoint')return `Stop ${s.stop}: ${s.name}`;
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
  let type=String(d.type||'');
  if(kind==='animal'&&!AN[type])return null;if(kind==='road'&&!RD[type])return null;
  const lat=+d.lat,lon=+d.lon;if(!(lat<-1.0&&lat>-2.3&&lon>30.2&&lon<31.2))return null;
  const at=+d.at;if(!(at>1.6e12))return null;
  const votes={};if(d.votes&&typeof d.votes==='object')for(const k in d.votes){const v=+d.votes[k];if(v===1||v===-1)votes[String(k).slice(0,60)]=v;}
  return {id:String(id),kind,type,lat,lon,at,lastSeen:+d.lastSeen>at?+d.lastSeen:at,
    count:COUNTS.includes(d.count)?d.count:null,act:ACTS.includes(d.act)?d.act:null,
    heading:Number.isInteger(d.heading)&&d.heading>=-1&&d.heading<8?d.heading:null,
    rdist:ROADDIST.includes(d.rdist)?d.rdist:null,sev:['1','2','3'].includes(d.sev)?d.sev:null,
    note:typeof d.note==='string'?d.note.slice(0,200):'',by:typeof d.by==='string'?d.by.slice(0,60):'',uid:typeof d.uid==='string'?d.uid.slice(0,64):'',votes,pending:!!d.pending,example:!!d.example};
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
    S.fs={F,db,uid:null};
    S.fs.authReady=import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`).then(AU=>{const auth=AU.getAuth(app);S.fs.AU=AU;S.fs.auth=auth;
      AU.onAuthStateChanged(auth,u=>{S.fs.uid=u?u.uid:null;if(u&&passValid())startSocial();else if(!u)endSocial();if(u)setTimeout(socTick,1500);});}).catch(()=>{});
    const q=F.query(F.collection(db,'reports'),F.where('at','>',Date.now()-14*864e5),F.orderBy('at','desc'),F.limit(600));
    F.onSnapshot(q,{includeMetadataChanges:true},snap=>{
      S.live=snap.docs.map(d=>{const o=clean(d.id,d.data());if(o)o.pending=d.metadata.hasPendingWrites;return o;}).filter(Boolean);
      S.sync=snap.metadata.fromCache?'offline':'live';if(S.live.length)hideBanner();setSync();redraw();refreshSheet();checkSOS();
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
  if(S.fs){const {F,db}=S.fs;const {id,...data}=rec;F.setDoc(F.doc(db,'reports',id),data).catch(e=>toast(e&&e.code==='permission-denied'?'The shared database refused the report. Check that the Firestore rules from the README are published.':'Could not share the report: '+(e.code||'error'),null,null,7000));}
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
   6b. Animal photos (Wikipedia / Wikimedia Commons) and the score sheet
   ========================================================================= */
const PH={url:LS.get('photos',{}),page:LS.get('photoPages',{}),img:{}};
async function loadPhotos(){
  if(!navigator.onLine)return;
  const todo=SP.filter(x=>x.wiki&&!PH.url[x.id]);
  for(let i=0;i<todo.length;i+=4){
    await Promise.all(todo.slice(i,i+4).map(async x=>{try{
      const r=await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(x.wiki));if(!r.ok)return;
      const j=await r.json();if(j.type==='disambiguation')return;const u=(j.thumbnail&&j.thumbnail.source)||(j.originalimage&&j.originalimage.source);
      if(u){PH.url[x.id]=u;PH.page[x.id]=(j.content_urls&&j.content_urls.mobile&&j.content_urls.mobile.page)||('https://en.wikipedia.org/wiki/'+x.wiki);}
    }catch(e){}}));
  }
  LS.set('photos',PH.url);LS.set('photoPages',PH.page);
  for(const x of SP)photoImg(x.id);            // warm the offline cache
  redraw();refreshSheet();
}
function photoImg(id){const u=PH.url[id];if(!u)return null;let im=PH.img[id];if(!im){im=new Image();im.decoding='async';im.onload=()=>redraw();im.src=u;PH.img[id]=im;}return im.complete&&im.naturalWidth?im:null;}
function pic(id,size=44,cls=''){const x=SPX[id];const w=el('span',{class:'pic '+cls,style:`width:${size}px;height:${size}px;font-size:${Math.round(size*.6)}px`});const u=PH.url[id];
  if(u){const i=el('img',{src:u,alt:'',loading:'lazy',decoding:'async'});i.onerror=()=>{w.replaceChildren(document.createTextNode(x?x.emoji:'🐾'));};w.append(i);}else w.textContent=x?x.emoji:'🐾';return w;}
/* score sheet */
S.life=LS.get('life',{});
const LISTED=window.SPECIES;
function tick(id,how){const sp=SPX[id];if(!sp)return null;const had=S.life[id];
  if(had&&(had.how==='report'||how!=='report'))return null;
  S.life[id]={t:had?had.t:Date.now(),how};LS.set('life',S.life);updateCount();
  const before=earnedBadges().map(b=>b.id);setTimeout(()=>{const nb=earnedBadges().filter(b=>!before.includes(b.id));for(const b of nb)setTimeout(()=>toast(`Badge earned: ${b.icon} ${b.name} +${b.bonus} points`),5200);},10);
  return had?null:(POINTS[sp.rarity]||0);}
function untick(id){delete S.life[id];LS.set('life',S.life);updateCount();}
function updateCount(){const c=$('lifeCount');if(c)c.textContent=`${LISTED.filter(x=>has(x.id)).length}/${LISTED.length}`;}
const has=id=>!!S.life[id];
function earnedBadges(){return window.BADGES.filter(b=>b.need.every(group=>group.some(has)));}
function score(){let pts=0,n=0;for(const x of LISTED){if(has(x.id)){pts+=POINTS[x.rarity]||0;n++;}}const badges=earnedBadges();for(const b of badges)pts+=b.bonus;
  let lv=window.LEVELS[0],next=null;for(let i=0;i<window.LEVELS.length;i++){if(pts>=window.LEVELS[i][0]){lv=window.LEVELS[i];next=window.LEVELS[i+1]||null;}}
  return {pts,n,total:LISTED.length,badges,lv,next};}

/* =========================================================================
   7. Position: GPS, manual fallback, demo drive
   ========================================================================= */
function myPos(){const g=S.gps,gpsOk=g.ok&&Date.now()-g.t<90e3;const G_={x:g.x,y:g.y,lat:g.lat,lon:g.lon,gps:true,heading:g.heading,speed:g.speed};
  if(S.sim&&gpsOk)return G_;
  const man=()=>{const q=merc(S.manual.lon,S.manual.lat);return {x:q[0],y:q[1],lat:S.manual.lat,lon:S.manual.lon,gps:false,heading:null};};
  if(S.useManual&&S.manual)return man();if(gpsOk)return G_;if(S.manual)return man();return null;}
function setManual(lat,lon,msg){S.manual={lat,lon,at:Date.now()};S.useManual=true;LS.set('manual',S.manual);LS.set('useManual',true);updateGpsLine();redraw();if(msg)toast(msg);if(pendingAfterPos){const f=pendingAfterPos;pendingAfterPos=null;setTimeout(f,50);}}
function useGPS(){S.useManual=false;LS.set('useManual',false);updateGpsLine();redraw();const p=myPos();if(p&&p.gps){S.follow=true;$('followBtn').classList.add('on');centerOn(p.x,p.y,Math.max(cam.s,.03));}}
function outsideBy(p){if(inRing(p.x,p.y,S.park))return 0;let b=1e18;for(const q of S.park){const d=gd(p.x,p.y,q[0],q[1]);if(d<b)b=d;}return b;}
let lastFix=null;
function onFix(c,sim){
  const g=S.gps;const [x,y]=merc(c.longitude,c.latitude);
  let heading=(c.heading!=null&&!isNaN(c.heading)&&(c.speed||0)>1.5)?c.heading:null;
  if(heading==null&&lastFix){const d=gd(lastFix.x,lastFix.y,x,y);if(d>8)heading=brg(lastFix.x,lastFix.y,x,y);else heading=g.heading;}
  if(!lastFix||gd(lastFix.x,lastFix.y,x,y)>8)lastFix={x,y};
  Object.assign(g,{ok:true,denied:false,x,y,lat:c.latitude,lon:c.longitude,acc:c.accuracy||20,heading,speed:c.speed!=null&&!isNaN(c.speed)?c.speed:g.speed,t:Date.now(),sim:!!sim});
  if(S.nav)navUpdate();
  updateSpeed();updateGpsLine();redraw();
}
let lastSpeedWarn=0;
function updateSpeed(){
  const g=S.gps,b=$('speedBox');const fresh=g.ok&&Date.now()-g.t<10e3;const kmh=fresh?Math.round((g.speed||0)*3.6):0;
  const show=S.nav||(fresh&&kmh>=5&&!S.preview);b.hidden=!show;if(!show)return;
  $('speedVal').textContent=kmh;const inPark=inRing(g.x,g.y,S.park);
  const over=S.set.speedWarn&&inPark&&kmh>40;b.classList.toggle('over',over);
  if(over&&Date.now()-lastSpeedWarn>90e3){lastSpeedWarn=Date.now();say(`Slow down. The speed limit is 40.`);try{navigator.vibrate&&navigator.vibrate([200,100,200]);}catch(e){}toast(`Slow down: ${kmh} km/h. The park limit is 40.`);}
}
function startGPS(){
  if(!('geolocation' in navigator)){S.gps.denied=true;updateGpsLine();return;}
  navigator.geolocation.watchPosition(p=>{if(!S.sim){const first=!S.gps.ok;onFix(p.coords,false);if(first&&!S.nav){const q=merc(p.coords.longitude,p.coords.latitude);if(inRing(q[0],q[1],S.park)||gd(q[0],q[1],S.park[0][0],S.park[0][1])<60000)centerOn(q[0],q[1],Math.max(cam.s,0.03));}}},e=>{if(e.code===1){S.gps.denied=true;updateGpsLine();}},{enableHighAccuracy:true,maximumAge:2000,timeout:25000});
}
function updateGpsLine(){
  const b=$('gpsline');const p=myPos();
  if(!p){b.replaceChildren(S.gps.denied?el('span',null,el('b',{text:'Location is blocked. '}),'Allow it in your browser settings, or tap here to set your position.'):el('span',null,el('b',{text:'Waiting for GPS… '}),'Tap here to set your position by hand.'));return;}
  const where=whereText(p.x,p.y,true);const out=p.gps?outsideBy(p):0;
  b.replaceChildren(el('b',{text:p.gps?(S.gps.sim?'Demo drive: ':`GPS ±${Math.round(S.gps.acc)} m: `):'Set by hand: '}),where,out>2000?el('span',{text:' · tap to set a spot in the park'}):'');
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
function resize(){dpr=Math.min(window.devicePixelRatio||1,(S.nav||S.preview)&&S.set.tilt?1.5:2.5);W=cv.clientWidth;H=cv.clientHeight;if(!W||!H)return;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);redraw();}
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
  const ring=r.kind==='animal'?'#2E7D4F':r.type==='sos'?'#C0392B':SEVCOL[r.sev||'1'];const R=sel?23:(r.kind==='animal'?19:r.type==='sos'?22:17);
  ctx.save();ctx.globalAlpha=alpha;
  if(r.kind==='animal'&&r.heading!=null&&r.heading>=0){const a=(r.heading*45)*RAD+cam.rot-Math.PI/2,L=46;ctx.setLineDash([5,4]);ctx.lineWidth=3;ctx.strokeStyle=ring;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*R,y+Math.sin(a)*R);ctx.lineTo(x+Math.cos(a)*L,y+Math.sin(a)*L);ctx.stroke();ctx.setLineDash([]);const tx=x+Math.cos(a)*(L+6),ty=y+Math.sin(a)*(L+6);ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(tx-Math.cos(a-.5)*12,ty-Math.sin(a-.5)*12);ctx.lineTo(tx-Math.cos(a+.5)*12,ty-Math.sin(a+.5)*12);ctx.closePath();ctx.fillStyle=ring;ctx.fill();}
  ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=6;ctx.shadowOffsetY=2;ctx.beginPath();ctx.arc(x,y,R,0,7);ctx.fillStyle='#fff';ctx.fill();ctx.shadowColor='transparent';
  ctx.lineWidth=r.kind==='road'?4:3.5;ctx.strokeStyle=ring;if(r.example)ctx.setLineDash([4,3]);ctx.stroke();ctx.setLineDash([]);
  if(r.kind==='road'){ctx.beginPath();ctx.moveTo(x,y-R-9);ctx.lineTo(x-6,y-R-1);ctx.lineTo(x+6,y-R-1);ctx.closePath();ctx.fillStyle=ring;ctx.fill();}
  const im=r.kind==='animal'?photoImg(r.type):null;
  if(im){ctx.save();ctx.beginPath();ctx.arc(x,y,R-2.5,0,7);ctx.clip();const sq=Math.min(im.naturalWidth,im.naturalHeight);ctx.drawImage(im,(im.naturalWidth-sq)/2,(im.naturalHeight-sq)/2,sq,sq,x-R+2.5,y-R+2.5,2*R-5,2*R-5);ctx.restore();}
  else{ctx.font=`${Math.round(R*1.05)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#000';ctx.fillText(emoji(r),x,y+1);}
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
  if(L.closed){ctx.setLineDash([4*px,5*px]);ctx.strokeStyle=S.set.sat?'rgba(255,255,255,.55)':'#9C907C';ctx.lineWidth=Math.max(1.2,wTrack*.55)*px;ctx.stroke(L.closed);ctx.setLineDash([]);}
  if(L.approx){ctx.strokeStyle=S.set.sat?'rgba(245,231,200,.55)':'rgba(255,255,255,.85)';ctx.lineWidth=(wTrack+1)*px;ctx.stroke(L.approx);
    ctx.setLineDash([9*px,7*px]);ctx.strokeStyle='#8A5A2B';ctx.lineWidth=Math.max(1.6,wTrack*.75)*px;ctx.stroke(L.approx);ctx.setLineDash([]);}
  ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=6*px;ctx.stroke(L.park);ctx.strokeStyle='#22351F';ctx.lineWidth=2.6*px;ctx.stroke(L.park);
  // route
  const R=S.route;
  if(R){const p=new Path2D();R.pts.forEach((q,i)=>i?p.lineTo(q[0],q[1]):p.moveTo(q[0],q[1]));
    ctx.strokeStyle='#0B3D75';ctx.lineWidth=(S.nav?18:10)*px;ctx.stroke(p);ctx.strokeStyle='#2F86E6';ctx.lineWidth=(S.nav?13:7)*px;ctx.stroke(p);
    if(S.preview){const st=R.instr[S.preview.i],d0=S.preview.i?R.instr[S.preview.i-1].d:0;
      const seg=new Path2D();let f=true;for(let i=0;i<R.pts.length;i++){if(R.cum[i]<d0||R.cum[i]>st.d)continue;f?seg.moveTo(R.pts[i][0],R.pts[i][1]):seg.lineTo(R.pts[i][0],R.pts[i][1]);f=false;}
      const a0=pointAt(R,d0);if(!f){seg.lineTo(R.pts[st.i][0],R.pts[st.i][1]);}ctx.strokeStyle='#00B4FF';ctx.lineWidth=11*px;ctx.stroke(seg);
      if(st.type!=='arrive'&&st.type!=='waypoint'){const ar=new Path2D();const N0=14;for(let k=0;k<=N0;k++){const q=pointAt(R,st.d-55+k*(90/N0));k?ar.lineTo(q[0],q[1]):ar.moveTo(q[0],q[1]);}
        const tip=pointAt(R,st.d+35),bk=pointAt(R,st.d+20);const ang=Math.atan2(tip[1]-bk[1],tip[0]-bk[0]);
        ctx.strokeStyle='#123';ctx.lineWidth=17*px;ctx.stroke(ar);ctx.strokeStyle='#fff';ctx.lineWidth=11*px;ctx.stroke(ar);
        ctx.beginPath();ctx.moveTo(tip[0]+Math.cos(ang)*14*px,tip[1]+Math.sin(ang)*14*px);ctx.lineTo(tip[0]+Math.cos(ang+2.3)*16*px,tip[1]+Math.sin(ang+2.3)*16*px);ctx.lineTo(tip[0]+Math.cos(ang-2.3)*16*px,tip[1]+Math.sin(ang-2.3)*16*px);ctx.closePath();ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=3*px;ctx.strokeStyle='#123';ctx.stroke();}}
    if(S.nav&&S.nav.prog>0){const q=new Path2D();let started=false;for(let i=0;i<R.pts.length&&R.cum[i]<=S.nav.prog;i++){started?q.lineTo(R.pts[i][0],R.pts[i][1]):q.moveTo(R.pts[i][0],R.pts[i][1]);started=true;}const cp=pointAt(R,S.nav.prog);q.lineTo(cp[0],cp[1]);ctx.strokeStyle='#9BA8B5';ctx.lineWidth=9*px;ctx.stroke(q);}}
  // ---- screen space ----
  ctx.setTransform(dpr,0,0,dpr,0,0);placed=[];hits=[];
  const reps=visibleReports().map(r=>{const q=merc(r.lon,r.lat);const s=w2s(q[0],q[1],m);return {r,x:s[0],y:s[1]};}).filter(o=>o.x>-60&&o.y>-60&&o.x<W+60&&o.y<H+60);
  for(const o of reps)placed.push([o.x-22,o.y-28,o.x+46,o.y+40]);
  const pos=myPos();let posS=null;if(pos){posS=w2s(pos.x,pos.y,m);placed.push([posS[0]-16,posS[1]-16,posS[0]+16,posS[1]+16]);}
  if(R){const d=w2s(R.pts[R.pts.length-1][0],R.pts[R.pts.length-1][1],m);if(R.stops&&R.stops.length>1){R.stops.forEach((st,k)=>{const q=pointAt(R,st.d);const sp=w2s(q[0],q[1],m);ctx.beginPath();ctx.arc(sp[0],sp[1],13,0,7);ctx.fillStyle='#17663A';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.stroke();ctx.font='700 14px Barlow,sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(k+1),sp[0],sp[1]+.5);placed.push([sp[0]-14,sp[1]-14,sp[0]+14,sp[1]+14]);});}else{drawFlag(d[0],d[1]);placed.push([d[0]-10,d[1]-40,d[0]+24,d[1]+4]);}
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
cv.addEventListener('pointerdown',e=>{if(S.nav||S.preview)return;cv.setPointerCapture(e.pointerId);ptrs.set(e.pointerId,{x:e.offsetX,y:e.offsetY});
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
function setSat(v){S.set.sat=v;saveSet();document.querySelectorAll('[data-bg]').forEach(b=>{const on=(b.dataset.bg==='sat')===v;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});redraw();}
document.querySelectorAll('[data-bg]').forEach(b=>b.onclick=()=>{setSat(b.dataset.bg==='sat');if(S.set.sat&&!navigator.onLine)toast('Satellite needs signal. Areas you viewed before still show.');});
$('followBtn').onclick=()=>{const p=myPos();if(!p){openSetPos();return;}S.follow=true;$('followBtn').classList.add('on');centerOn(p.x,p.y,Math.max(cam.s,0.05));};
let pickPin=null;
function onTap(x,y){
  if(pickMode){const [wx,wy]=s2w(x,y);const u=unmerc(wx,wy);const k=pickMode;endPick();
    if(k==='me'){setManual(u.lat,u.lon,'Position set by hand.');}
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
function openSheet(title,nodes,o={}){$('sheet').classList.toggle('tall',!!o.tall);if(!o.view||!(o.view.startsWith('chat:')||o.view.startsWith('thread:')))SOC.render=null;$('sheetTitle').textContent=title;$('sheetBody').replaceChildren(...nodes.filter(Boolean));$('sheet').hidden=false;sheetView=o.view||null;backFn=o.back||null;$('sheetBack').hidden=!o.back;
  const dots=$('sheetDots');dots.replaceChildren();if(o.step){for(let i=1;i<=o.step[1];i++)dots.append(el('i',{class:i<=o.step[0]?'on':''}));}$('sheetBody').scrollTop=0;}
function closeSheet(){$('sheet').hidden=true;sheetView=null;selected=null;redraw();}
$('sheetClose').onclick=closeSheet;$('sheetBack').onclick=()=>backFn&&backFn();
function refreshSheet(){if($('sheet').hidden)return;if(sheetView==='findanimals')return;if(sheetView==='find')openFind('sightings');else if(sheetView==='guide')openFind('guide');else if(sheetView==='list')openFind('list');else if(sheetView&&sheetView.startsWith('species:'))openSpecies(sheetView.slice(8));else if(sheetView&&sheetView.startsWith('rep:')){const r=allReports().find(x=>x.id===sheetView.slice(4));if(r)openReportView(r,true);}}
let toastT=null;
function toast(t,btn,fn,ms=3600){const e=$('toast');e.replaceChildren(...[el('span',{text:t}),btn?el('button',{type:'button',onclick:()=>{e.hidden=true;fn();},text:btn}):null].filter(Boolean));e.hidden=false;const up=!$('sheet').hidden;e.style.top=up?'calc(12px + env(safe-area-inset-top))':'';e.style.bottom=up?'auto':S.preview?'calc(150px + env(safe-area-inset-bottom))':S.nav?'calc(100px + env(safe-area-inset-bottom))':'';clearTimeout(toastT);toastT=setTimeout(()=>e.hidden=true,ms);}
function banner(text,btn,fn,cls){const b=$('banner');b.className='banner'+(cls?' '+cls:'');b.replaceChildren(...[el('p',{text}),btn?el('button',{type:'button',onclick:fn,text:btn}):null].filter(Boolean));b.hidden=false;}
function hideBanner(){$('banner').hidden=true;}
function startPick(kind){pickMode=kind;$('sheet').hidden=true;banner(kind==='me'?'Tap the map where you are.':'Tap the map where you want to go.','Cancel',()=>endPick());}
function endPick(){pickMode=null;hideBanner();}
function needPos(then){const p=myPos();if(p)return p;pendingAfterPos=then;openSetPos();return null;}
function openSetPos(){
  const g=S.gps,gpsOk=g.ok&&Date.now()-g.t<90e3;const nodes=[];
  if(gpsOk){const q=merc(g.lon,g.lat);const out=outsideBy({x:q[0],y:q[1]});
    nodes.push(el('div',{class:'locbox'},el('p',{text:out>2000?`Your phone's GPS puts you ${fmtD(out)} outside the park. Set a position in the park by hand to plan routes and report from there.`:`GPS works: ${whereText(q[0],q[1])}.`}),
      el('button',{class:S.useManual?'primary blue':'secondary',type:'button',onclick:()=>{closeSheet();useGPS();toast('Following your GPS.');},text:S.useManual?'Use my GPS again':'Using GPS now · centre on me'})));}
  else nodes.push(el('p',{class:'hint',text:g.denied?'Location is blocked for this site. Allow it in your browser settings to be guided by GPS. You can set your position by hand meanwhile.':'Waiting for GPS. You can set your position by hand meanwhile.'}));
  if(S.useManual&&S.manual){const q=merc(S.manual.lon,S.manual.lat);nodes.push(el('p',{class:'fine',text:`Set by hand ${ago(S.manual.at)}: ${whereText(q[0],q[1])}.`}));}
  nodes.push(el('button',{class:'primary',type:'button',onclick:()=>startPick('me'),text:'Tap my spot on the map'}),
    el('p',{class:'lbl',text:'Or pick the junction stone you are at'}),
    el('div',{class:'grid3',style:'grid-template-columns:repeat(auto-fill,minmax(60px,1fr))'},...S.juncs.map(j=>el('button',{type:'button',style:'min-height:56px;font-size:18px',onclick:()=>{closeSheet();centerOn(j.x,j.y,Math.max(cam.s,.05));setManual(j.lat,j.lon,`Position set at junction ${j.num}.`);},text:String(j.num)}))));
  openSheet('Your position',nodes,{view:'pos'});
}
$('gpsline').onclick=()=>openSetPos();

/* ---------- report: one question per screen ---------- */
let D=null;
function startReport(preset){
  const p=needPos(()=>startReport(preset));if(!p)return;
  const out=outsideBy(p);
  if(out>3000){pendingAfterPos=()=>startReport(preset);openSheet('You are outside the park',[el('p',{class:'hint',text:`Your position is ${fmtD(out)} outside the park, so a report would put the animal in the wrong place. Set where you are in the park first.`}),el('button',{class:'primary',type:'button',onclick:()=>startPick('me'),text:'Tap my spot on the map'}),el('button',{class:'secondary',type:'button',onclick:openSetPos,text:'Pick a junction stone'})],{view:'outside'});return;}
  const h=p.gps&&S.gps.heading!=null&&(S.gps.speed>1||Date.now()-S.gps.t<30e3)?S.gps.heading:null;
  D={lat:p.lat,lon:p.lon,car:h};
  if(preset){D.kind='animal';D.type=preset;stepCount();return;}
  openSheet('What did you see?',[el('div',{class:'huge'},
      el('button',{type:'button',onclick:()=>{D.kind='animal';stepSpecies();}},el('span',{text:'🦁'}),'Animals'),
      el('button',{type:'button',onclick:()=>{D.kind='road';stepRoadType();}},el('span',{text:'🚧'}),'Road problem')),
    el('p',{class:'fine',text:`Uses your position: ${whereText(p.x,p.y)}${p.gps?'':' (set by hand)'}.`})],{step:[1,4],view:'r1'});
}
function stepSpecies(all){
  const list=all?ANIMALS.filter(a=>a[0]!=='rhino'):TOP_ANIMALS.map(id=>ANIMALS.find(a=>a[0]===id));
  const btns=list.map(a=>el('button',{type:'button',onclick:()=>{D.type=a[0];a[0]==='rhino'?stepRhino():stepCount();}},pic(a[0],52),a[1]));
  if(!all)btns.push(el('button',{type:'button',class:'more',onclick:()=>stepSpecies(true)},el('span',{text:'＋'}),'More animals'));
  openSheet(all?'All animals':'Which animal?',[el('div',{class:'grid3'},...btns)],{step:[2,4],back:all?()=>stepSpecies():startReport,view:'r2'});
}
function stepRhino(){
  openSheet('Which rhino?',[el('div',{class:'stack'},
    ...[['rhino_b','Black rhino','Hooked lip, browses in bush'],['rhino_w','White rhino','Wide square lip, grazes in the open'],['rhino','Not sure','']].map(([id,t,sub])=>el('button',{class:'choice',type:'button',onclick:()=>{D.type=id;stepCount();}},pic(id==='rhino'?'rhino':id,54),el('span',null,t,sub?el('small',{text:sub}):null))))],{step:[2,4],back:()=>stepSpecies(),view:'rhino'});
}
function stepCount(){
  openSheet(`How many ${(PLURAL[D.type]||(SHORTNAME[D.type]||SPX[D.type].name)+'s').toLowerCase()}?`,[el('div',{class:'stack'},...COUNTS.map(c=>el('button',{class:'choice',type:'button',onclick:()=>{D.count=c;stepMove();}},el('span',{class:'n',text:c}),c==='1'?'Just one':c==='20+'?'A big herd':'A group')))],{step:[3,4],back:()=>D.type.startsWith('rhino')?stepRhino():stepSpecies(),view:'r3'});
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
  openSheet('What is the problem?',[el('div',{class:'grid3'},...ROADS.filter(a=>a[0]!=='sos').map(a=>el('button',{type:'button',onclick:()=>{D.type=a[0];stepSev();}},el('span',{text:a[2]}),a[1])))],{step:[2,3],back:startReport,view:'r2'});
}
function stepSev(){
  openSheet('How bad is it?',[el('div',{class:'stack'},...SEV.map(s=>el('button',{class:'choice sev'+s[0],type:'button',onclick:()=>{D.sev=s[0];sendReport();}},el('span',null,s[1],el('small',{text:s[2]})))))],{step:[3,3],back:stepRoadType,view:'r3'});
}
function sendReport(){
  const now=Date.now();
  const rec={id:'r'+now.toString(36)+Math.random().toString(36).slice(2,6),kind:D.kind,type:D.type,lat:+D.lat.toFixed(6),lon:+D.lon.toFixed(6),at:now,lastSeen:now,by:S.device,votes:{},note:''};
  if(D.kind==='animal'){rec.count=D.count||'1';rec.heading=D.heading??-1;}else rec.sev=D.sev||'1';
  if(passValid()&&S.fs&&S.fs.uid&&LS.get('showName',true))rec.uid=S.fs.uid;
  saveReport(rec);closeSheet();
  const fresh=D.kind==='animal'?tick(rec.type,'report'):null;
  const what=D.kind==='animal'?`${label(clean(rec.id,rec))}${rec.heading>=0?`, heading ${DIRNAME[rec.heading]}`:''}`:`${RD[rec.type][1]} (${SEV.find(s=>s[0]===rec.sev)[1]})`;
  if(fresh)setTimeout(()=>toast(`New on your list: ${SPX[rec.type].name} +${fresh} points`,'My list',()=>openFind('list'),6000),2600);
  const needHelp=D.kind==='road'&&['stuck','broken'].includes(D.type),ty=D.type;
  toast(`Sent: ${what}.`,needHelp?'Emergency help':'Add details',needHelp?()=>openEmergency(ty):()=>openDetails(rec.id),needHelp?9000:2500);
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
let findTab='sightings';
function tabs(cur){const t=[['sightings','Sightings'],['guide','Guide'],['list','My list']];return el('div',{class:'seg',role:'tablist'},...t.map(([k,l])=>el('button',{type:'button',role:'tab','aria-selected':String(k===cur),class:k===cur?'on':'',onclick:()=>openFind(k),text:l})));}
function openFind(tab){
  if(typeof tab==='string')findTab=tab;
  if(findTab==='guide')return openGuide();
  if(findTab==='list')return openList();
  const all=allReports().filter(r=>r.kind==='animal'&&!(r.votes[S.device]===-1));
  const recent=all.filter(alive).sort((a,b)=>b.lastSeen-a.lastSeen);
  const row=(r)=>{const q=merc(r.lon,r.lat);const rel=relTo(q[0],q[1]);
    return el('li',null,el('button',{type:'button',onclick:()=>openReportView(r)},pic(r.type,46),
      el('span',null,el('b',{text:label(r)}),el('small',{text:`${r.example?'Example · ':''}Seen ${hhmm(r.lastSeen)} ${dayWord(r.lastSeen)} · ${ago(r.lastSeen)}`}),el('small',{text:whereText(q[0],q[1])})),
      el('span',{class:'r'},rel?fmtD(rel.d):'',rel?el('small',{text:rel.dir}):'')));};
  const winSel=el('select',{class:'opt',id:'winSel','aria-label':'How far back to show'},...[[2,'Last 2 h'],[6,'Last 6 h'],[12,'Last 12 h'],[48,'Last 2 days']].map(([v,t])=>{const o=el('option',{value:String(v),text:t});if((S.animalWin||6)===v)o.selected=true;return o;}));
  winSel.onchange=()=>{S.animalWin=+winSel.value;LS.set('win',S.animalWin);openFind();redraw();};
  const nodes=[tabs('sightings'),el('button',{class:'primary blue',type:'button',onclick:()=>openFindAnimals(),text:'🔍 Find animals and plan a route'}),el('div',{class:'acts'},winSel),el('p',{class:'lbl',text:'Latest sightings'}),
    recent.length?el('ul',{class:'list'},...recent.slice(0,15).map(row)):el('p',{class:'hint',text:'No sightings in this time window. Report what you see to help others.'})];
  const last={};for(const r of all){if(Date.now()-r.lastSeen>7*864e5)continue;if(!last[r.type]||r.lastSeen>last[r.type].lastSeen)last[r.type]=r;}
  nodes.push(el('p',{class:'lbl',text:'Last seen, by animal (7 days)'}));
  nodes.push(el('ul',{class:'list'},...window.SPECIES.map(x=>{const r=last[x.id];
    if(!r)return el('li',{class:'none'},el('button',{type:'button',onclick:()=>openSpecies(x.id)},pic(x.id,46),el('span',null,el('b',{text:x.name}),el('small',{text:'No reports in the last 7 days'})),el('span')));
    const q=merc(r.lon,r.lat);const rel=relTo(q[0],q[1]);
    return el('li',null,el('button',{type:'button',onclick:()=>openReportView(r)},pic(x.id,46),el('span',null,el('b',{text:x.name}),el('small',{text:`Last seen ${hhmm(r.lastSeen)} ${dayWord(r.lastSeen)} (${ago(r.lastSeen)})`})),el('span',{class:'r'},rel?fmtD(rel.d):'',rel?el('small',{text:rel.dir}):'')));})));
  openSheet('Animals',nodes,{view:'find'});
}
function freshest(id){
  const pos=myPos();const match=r=>r.type===id||(id==='rhino'&&r.type.startsWith('rhino'))||((id==='rhino_b'||id==='rhino_w')&&r.type==='rhino');
  const rs=allReports().filter(r=>r.kind==='animal'&&match(r)&&alive(r)).sort((a,b)=>b.lastSeen-a.lastSeen);if(!rs.length)return null;
  const top=rs.filter(r=>rs[0].lastSeen-r.lastSeen<20*60e3);if(pos&&top.length>1){top.sort((a,b)=>{const qa=merc(a.lon,a.lat),qb=merc(b.lon,b.lat);return gd(pos.x,pos.y,qa[0],qa[1])-gd(pos.x,pos.y,qb[0],qb[1]);});}
  return top[0];
}
function openFindAnimals(pre){
  const sel=new Set(pre||[]);const MAX=6;
  const withS=window.SPECIES.filter(x=>freshest(x.id)),without=window.SPECIES.filter(x=>!freshest(x.id));
  const go=el('button',{class:'primary blue',type:'button'});
  const upd=()=>{go.disabled=!sel.size;go.textContent=sel.size?`Find ${sel.size} animal${sel.size>1?'s':''} and plan the route`:'Choose animals to find';};
  const tile=(x,ok)=>{const r=ok?freshest(x.id):null;const b=el('button',{type:'button',class:'ftile'+(sel.has(x.id)?' on':''),disabled:!ok,'aria-pressed':String(sel.has(x.id))},pic(x.id,52,ok?'':'dim'),el('b',{text:SHORTNAME[x.id]||x.name}),
      el('small',{text:ok?`${hhmm(r.lastSeen)} · ${ago(r.lastSeen)}${r.example?' · ex.':''}`:'no recent sighting'}),has(x.id)?el('i',{class:'got',text:'✓'}):null);
    b.onclick=()=>{if(sel.has(x.id))sel.delete(x.id);else{if(sel.size>=MAX){toast(`Up to ${MAX} animals at a time.`);return;}sel.add(x.id);}b.classList.toggle('on',sel.has(x.id));b.setAttribute('aria-pressed',String(sel.has(x.id)));upd();};return b;};
  const notMine=withS.filter(x=>!has(x.id));
  go.onclick=()=>planFind([...sel]);upd();
  openSheet('Find animals',[
    el('p',{class:'hint',text:'Tick the animals you want to see. The app takes the freshest sighting of each and plans the quickest route through all of them.'}),
    notMine.length?el('button',{class:'secondary',type:'button',onclick:()=>openFindAnimals(notMine.slice(0,MAX).map(x=>x.id)),text:`Select ones not on my list yet (${Math.min(notMine.length,MAX)})`}):null,
    el('p',{class:'lbl',text:`Seen recently (${withS.length})`}),withS.length?el('div',{class:'fgrid'},...withS.map(x=>tile(x,true))):el('p',{class:'hint',text:'No recent sightings to route to yet.'}),
    go,
    el('details',{class:'rules'},el('summary',{text:`No recent sighting (${without.length})`}),el('div',{class:'fgrid',style:'padding-bottom:10px'},...without.map(x=>tile(x,false))))
  ],{view:'findanimals',back:()=>openFind('sightings')});
}
function planFind(ids){
  const p=needPos(()=>planFind(ids));if(!p)return;
  const stops=ids.map(id=>{const r=freshest(id);if(!r)return null;const q=merc(r.lon,r.lat);return {x:q[0],y:q[1],name:label(r),rep:r,id};}).filter(Boolean);
  if(!stops.length){toast('None of those animals has a recent sighting.');return;}
  const order=stops.length>1?bestOrder(p,stops):stops;if(!order)return noRoute({error:'far',s0:snap(p.x,p.y,15000)});
  const r=routeMulti(p,order);if(r.error)return noRoute(r,r.stop);
  const t0=Date.now();
  const list=el('ol',{class:'stops'},...r.stops.map((st,k)=>{const arr=t0+st.d*r.tpm*1000;const age=arr-st.rep.lastSeen;
    return el('li',null,el('span',{class:'sn',text:String(k+1)}),pic(st.rep.type,44),el('span',null,el('b',{text:st.name}),
      el('small',{text:`Seen ${hhmm(st.rep.lastSeen)} (${ago(st.rep.lastSeen)})${st.rep.example?' · example':''}`}),
      el('small',{text:`Arrive about ${hhmm(arr)} · sighting will be ${fmtDur(age/1000)} old`})));}));
  const old=r.stops.some(st=>t0+st.d*r.tpm*1000-st.rep.lastSeen>90*60e3);
  showPlan(r,`Find ${r.stops.length} animal${r.stops.length>1?'s':''}`,[list,old?el('p',{class:'fine',text:'Animals move on. Sightings older than about an hour and a half are a rough guide only, so look around as you get close.'}):null].filter(Boolean));
}
function dangerChip(d){return el('span',{class:'tag',style:`background:${DANGER[d][1]}1F;color:${DANGER[d][1]}`,text:DANGER[d][0]});}
function rarityDots(r){return el('span',{class:'rar','aria-label':RARITY[r]},'●'.repeat(r)+'○'.repeat(4-r));}
function openGuide(){
  const groups=[...new Set(window.SPECIES.map(x=>x.group))];
  const rules=el('details',{class:'rules'},el('summary',{text:'Driving among animals: 10 rules'}),el('ol',null,...window.PARK_RULES.map(t=>el('li',{text:t}))));
  const nodes=[tabs('guide'),rules];
  for(const g of groups){nodes.push(el('p',{class:'lbl',text:g}));
    nodes.push(el('ul',{class:'list'},...window.SPECIES.filter(x=>x.group===g).map(x=>el('li',null,el('button',{type:'button',onclick:()=>openSpecies(x.id)},pic(x.id,50),
      el('span',null,el('b',{text:x.name}),el('small',null,dangerChip(x.danger),' ',rarityDots(x.rarity),' ',RARITY[x.rarity])),
      el('span',{class:'r'},has(x.id)?'✓':'')))))); }
  nodes.push(el('p',{class:'fine',text:'Photos: Wikipedia and Wikimedia Commons contributors (tap a photo for its source). Guidance is general advice; always follow ranger instructions.'}));
  openSheet('Animals',nodes,{view:'guide'});
}
function openSpecies(id){
  const x=SPX[id];if(!x)return;
  const u=PH.url[id];const nodes=[];
  nodes.push(u?el('a',{class:'hero',href:PH.page[id]||'#',target:'_blank',rel:'noopener','aria-label':'Photo source'},el('img',{src:u,alt:x.name})):el('div',{class:'hero emoji',text:x.emoji}));
  nodes.push(el('div',null,el('div',{class:'when',text:x.name}),el('p',{class:'hint'},el('i',{text:x.latin}),x.kin?` · Kinyarwanda: ${x.kin}`:'')));
  nodes.push(el('div',{class:'meta'},dangerChip(x.danger),el('span',{class:'tag',text:`${RARITY[x.rarity]} · ${POINTS[x.rarity]} points`}),el('span',{class:'tag',text:x.size}),has(id)?el('span',{class:'tag',style:'background:#DCF0E2;color:#1E5E35',text:S.life[id].how==='report'?'✓ Reported':'✓ Seen'}):null));
  // latest report of this species
  const rs=allReports().filter(r=>r.kind==='animal'&&(r.type===id||(id.startsWith('rhino')&&r.type==='rhino'))&&alive(r)).sort((a,b)=>b.lastSeen-a.lastSeen);
  if(rs.length){const r=rs[0];const q=merc(r.lon,r.lat);const rel=relTo(q[0],q[1]);nodes.push(el('button',{class:'lastseen',type:'button',onclick:()=>openReportView(r)},el('b',{text:`Last reported ${hhmm(r.lastSeen)} ${dayWord(r.lastSeen)} (${ago(r.lastSeen)})${r.example?' · example':''}`}),el('span',{text:whereText(q[0],q[1])+(rel?` · ${fmtD(rel.d)} ${rel.dir} of you`:'')})));}
  nodes.push(el('p',{class:'lbl',text:'In Akagera'}),el('p',{class:'body',text:x.where}),el('p',{class:'body',text:x.about}));
  if(x.signs.length||x.doList.length||x.never.length){
    nodes.push(el('p',{class:'lbl',text:'Next to your car'}));
    if(x.signs.length)nodes.push(el('div',{class:'safety warn'},el('b',{text:'Warning signs'}),el('ul',null,...x.signs.map(t=>el('li',{text:t})))));
    if(x.doList.length)nodes.push(el('div',{class:'safety do'},el('b',{text:'Do'}),el('ul',null,...x.doList.map(t=>el('li',{text:t})))));
    if(x.never.length)nodes.push(el('div',{class:'safety dont'},el('b',{text:'Never'}),el('ul',null,...x.never.map(t=>el('li',{text:t})))));
  }
  nodes.push(el('div',{class:'acts'},el('button',{class:'primary',type:'button',onclick:()=>startReport(id),text:'Report it'}),
    has(id)?el('button',{class:'secondary',type:'button',onclick:()=>{untick(id);openSpecies(id);},text:'Untick'}):el('button',{class:'secondary ok',type:'button',onclick:()=>{const p=tick(id,'seen');toast(p?`${x.name} ticked +${p} points`:'Ticked.');openSpecies(id);},text:'Tick as seen'})));
  openSheet(x.name,nodes,{view:'species:'+id,back:()=>openFind(findTab)});
}
function openList(){
  const sc=score();const nodes=[tabs('list')];
  const pct=sc.next?Math.round((sc.pts-sc.lv[0])/(sc.next[0]-sc.lv[0])*100):100;
  nodes.push(el('div',{class:'scorecard'},el('div',{class:'lvl'},el('span',{text:sc.lv[1]}),el('b',{text:`${sc.pts} points`})),
    el('div',{class:'bar'},el('i',{style:`width:${pct}%`})),
    el('p',{class:'fine',text:`${sc.n} of ${sc.total} animals ticked${sc.next?` · ${sc.next[0]-sc.pts} points to ${sc.next[1]}`:' · top level reached'}`})));
  nodes.push(el('p',{class:'lbl',text:'Badges'}),el('div',{class:'badges'},...window.BADGES.map(b=>{const got=sc.badges.includes(b);const prog=b.need.filter(g=>g.some(has)).length;
    return el('div',{class:'badge'+(got?' got':''),title:b.text},el('span',{class:'bi',text:b.icon}),el('b',{text:b.name}),el('small',{text:got?`+${b.bonus} points`:`${prog}/${b.need.length} · ${b.text}`}));})));
  const groups=[...new Set(window.SPECIES.map(x=>x.group))];
  for(const g of groups){const xs=window.SPECIES.filter(x=>x.group===g);nodes.push(el('p',{class:'lbl',text:`${g} · ${xs.filter(x=>has(x.id)).length}/${xs.length}`}));
    nodes.push(el('ul',{class:'list check'},...xs.map(x=>{const t=S.life[x.id];return el('li',{class:t?'done':''},el('button',{type:'button',onclick:()=>openSpecies(x.id)},pic(x.id,46,t?'':'dim'),
      el('span',null,el('b',{text:x.name}),el('small',{text:t?`${t.how==='report'?'Reported':'Seen'} ${hhmm(t.t)} ${dayWord(t.t)}`:`${RARITY[x.rarity]} · ${POINTS[x.rarity]} points`})),
      el('span',{class:'tickbox','aria-label':t?'Ticked':'Not ticked',text:t?'✓':''})));})));}
  nodes.push(el('button',{class:'secondary',type:'button',onclick:()=>{openSheet('Start a new trip?',[el('p',{class:'hint',text:'This clears all ticks and badges on this phone so you can start a fresh list.'}),el('button',{class:'primary',type:'button',onclick:()=>{S.life={};LS.set('life',S.life);updateCount();openFind('list');toast('New trip started.');},text:'Clear my list'}),el('button',{class:'secondary',type:'button',onclick:()=>openFind('list'),text:'Keep my list'})],{view:'reset'});},text:'Start a new trip'}));
  nodes.push(el('p',{class:'fine',text:'Animals you report are ticked automatically. You can also tick an animal you saw without reporting it. Your list stays on this phone.'}));
  openSheet('Animals',nodes,{view:'list'});
}

/* ---------- one report ---------- */
function openReportView(r,silent){
  selected=r;const q=merc(r.lon,r.lat);if(!silent&&!S.nav){S.follow=false;centerOn(q[0],q[1]+H*0.2/cam.s);}
  const t=tally(r);const nodes=[];
  nodes.push(el('div',{class:'det-head'},r.kind==='animal'?pic(r.type,64):el('span',{class:'em',text:emoji(r)}),el('div',null,el('b',{text:label(r)}),el('div',{class:'when',text:`${r.kind==='animal'?'Seen':'Reported'} ${hhmm(r.at)} ${dayWord(r.at)}`}),el('p',{class:'hint',text:ago(r.at)+(r.lastSeen-r.at>60e3?` · confirmed ${hhmm(r.lastSeen)} (${ago(r.lastSeen)})`:'')}))));
  const tags=[];if(r.example)tags.push(el('span',{class:'tag ex',text:'Example, not a real report'}));if(r.pending)tags.push(el('span',{class:'tag',text:'Waiting for signal to send'}));
  if(t.there)tags.push(el('span',{class:'tag',text:`${t.there} confirmed`}));if(t.gone)tags.push(el('span',{class:'tag',text:`${t.gone} say gone`}));
  if(r.kind==='road'&&r.type!=='sos')tags.push(el('span',{class:'tag',text:SEV.find(s=>s[0]===(r.sev||'1'))[1]}));
  if(r.act)tags.push(el('span',{class:'tag',text:r.act}));if(r.rdist)tags.push(el('span',{class:'tag',text:r.rdist}));
  if(tags.length)nodes.push(el('div',{class:'meta'},...tags));
  const lines=[el('p',null,el('b',{text:'Where: '}),whereText(q[0],q[1])+'.')];
  if(r.kind==='animal'&&r.heading!=null){if(r.heading>=0){const tw=towards(q[0],q[1],r.heading);lines.push(el('p',null,el('b',{text:'Moving: '}),`${DIRNAME[r.heading]}${tw?`, towards ${tw.short||tw.name}`:''}.`));}else lines.push(el('p',null,el('b',{text:'Moving: '}),'not moving when reported.'));}
  const rel=relTo(q[0],q[1]);if(rel)lines.push(el('p',null,el('b',{text:'From you: '}),`${fmtD(rel.d)} ${DIRNAME[DIRS.indexOf(rel.dir)]} (straight line).`));
  if(r.kind==='road'){const life=roadLife(r);lines.push(el('p',null,el('b',{text:'Likely until: '}),`about ${stamp(life.until)}.`));lines.push(el('p',{class:'fine',text:life.why+(life.next>=2?` More rain is forecast (${Math.round(life.next)} mm in the next 12 h), which would make it last longer.`:'')}));}
  nodes.push(el('div',{class:'dir'},...lines));
  if(r.note)nodes.push(el('p',{class:'note',text:r.note}));
  if(r.type==='sos'){nodes.push(el('div',{class:'safety warn'},el('b',{text:'If you want to help'}),el('ul',null,el('li',{text:'Do not leave your vehicle if any animal is near.'}),el('li',{text:'Call the park on +250 786 182 871 and tell them where this is.'}),el('li',{text:'The driver may already have called. Keep your distance from the vehicle until you know.'}))),el('a',{class:'secondary',href:'tel:+250786182871',text:'📞 Call the park'}));}
  {const who=r.uid?personByUid(r.uid):null;if(who)nodes.push(el('p',{class:'fine',text:`Reported by ${who.emoji} ${who.name} · ${vehLabel(who)}`}));else if(r.by===S.device)nodes.push(el('p',{class:'fine',text:'Reported by you'}));}
  nodes.push(el('button',{class:'primary blue',type:'button',onclick:()=>previewRoute({x:q[0],y:q[1],name:label(r)}),text:'Navigate here'}));
  if(!r.example&&passValid()&&SOC.profile.chat)nodes.push(el('button',{class:'secondary',type:'button',onclick:()=>shareToChat(r),text:'💬 Share in the park chat'}));
  if(r.kind==='animal'&&SPX[r.type]&&SPX[r.type].where)nodes.push(el('button',{class:'secondary',type:'button',onclick:()=>openSpecies(r.type),text:`${SPX[r.type].name}: safety and facts`}));
  if(!r.example){const mine=r.by===S.device;nodes.push(el('div',{class:'acts'},el('button',{class:'secondary ok',type:'button',onclick:()=>{patchReport(r,{votes:{[S.device]:1},lastSeen:Date.now()});toast('Thanks. Marked as still there.');},text:'Still there'}),el('button',{class:'secondary no',type:'button',onclick:()=>{patchReport(r,{votes:{[S.device]:-1}});closeSheet();toast(mine?'Removed.':'Thanks. Marked as gone.');},text:mine?'Remove my report':'Not there any more'})));}
  openSheet(r.kind==='animal'?'Sighting':'Road report',nodes,{view:'rep:'+r.id});redraw();
}
function openPoi(p){
  const rel=relTo(p.x,p.y);
  const kind={junction:'Junction stone',gate:'Park gate',reception:'Reception',hq:'Park office',lodge:'Lodge',camp:'Campsite',ranger:'Ranger post',fence:'Fence attendant house',picnic:'Picnic spot',lookout:'Lookout',fuel:'Fuel'}[p.cat]||'Place';
  const nodes=[el('p',{class:'hint',text:kind+(p.note?'. '+p.note:'')+(p.cat==='junction'?({osm:' Position from OpenStreetMap.',snap:' Read off the park board and placed on the nearest road (may be a few hundred metres off).'}[p.src]||' Position read off the park board (about 1 km accuracy).'):'')})];
  if(rel)nodes.push(el('div',{class:'dir'},el('p',null,el('b',{text:'From you: '}),`${fmtD(rel.d)} ${DIRNAME[DIRS.indexOf(rel.dir)]} (straight line).`)));
  nodes.push(el('button',{class:'primary blue',type:'button',onclick:()=>previewRoute({x:p.x,y:p.y,name:p.cat==='junction'?'Junction '+p.num:(p.short||p.name)}),text:'Navigate here'}));
  nodes.push(el('button',{class:'secondary',type:'button',onclick:()=>{closeSheet();setManual(p.lat,p.lon,'Position set here.');},text:'I am here'}));
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
    if(!s){box.append(el('button',{class:'wide',type:'button',onclick:()=>openFindAnimals(),text:'🔍 Find animals: route through several sightings'}));const sights=visibleReports().filter(r=>r.kind==='animal').sort((a,b)=>b.lastSeen-a.lastSeen).slice(0,4);
      if(sights.length){box.append(el('p',{class:'lbl',text:'Latest sightings'}),el('ul',{class:'list'},...sights.map(r=>{const m=merc(r.lon,r.lat);return item(label(r),`Seen ${hhmm(r.lastSeen)} · ${ago(r.lastSeen)}${r.example?' · example':''}`,m[0],m[1],emoji(r));})));}
      box.append(el('button',{class:'wide',type:'button',onclick:()=>startPick('dest'),text:'📍 Pick a spot on the map'}));}
    for(const [title,cats] of groups){let list=S.named.filter(n=>cats.includes(n.cat)).concat(S.pois.filter(n=>cats.includes(n.cat)&&!S.named.includes(n)));
      list=[...new Map(list.map(n=>[(n.short||n.name),n])).values()].filter(n=>inRing(n.x,n.y,S.park)||outsideBy(n)<400);
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
  if(r.error)return noRoute(r,dest);
  showPlan(r,`To ${dest.name}`);
}
function noRoute(r,dest){
  const u=dest?unmerc(dest.x,dest.y):null;
  openSheet('No route found',[el('p',{class:'hint',text:r.error==='far'?(!r.s0?'You are too far from the park roads to plan a route. Routes only use roads inside Akagera. Use Google Maps to reach a gate, then try again.':'That place is too far from any road inside the park.'):'No drivable route inside the park. A road may be closed by a report.'}),
    el('a',{class:'secondary',href:'https://www.google.com/maps/dir/?api=1&destination=-1.899116,30.681779',target:'_blank',rel:'noopener',text:'Google Maps to the south gate'}),
    u?el('a',{class:'secondary',href:`https://www.google.com/maps/dir/?api=1&destination=${u.lat.toFixed(6)},${u.lon.toFixed(6)}`,target:'_blank',rel:'noopener',text:'Google Maps to the destination'}):null],{view:'noroute'});
}
function showPlan(r,title,top=[]){
  S.route=r;S.follow=false;fitRoute(r);
  const eta=Date.now()+r.time*1000;const turns=r.instr.filter(s=>s.type!=='arrive'&&s.type!=='waypoint').length;
  const nodes=[...top,el('div',{class:'route-card'},el('div',{class:'big',text:`${fmtDur(r.time)} · ${fmtD(r.len)}`}),el('div',{class:'hint',text:`Arrive about ${hhmm(eta)}${r.via.length?` · via ${r.via.join(', ')}`:''}`}),el('div',{class:'hint',text:`${turns===1?'1 turn':turns?turns+' turns':'No turns'}${r.stops&&r.stops.length>1?` · ${r.stops.length} stops`:''} · roads inside the park only`}))];
  if(r.startOff>400)nodes.push(el('div',{class:'warnrow',style:'background:#EEF2F6;color:#2B3A4A',text:`You are ${fmtD(r.startOff)} from the nearest park road. The route starts ${whereText(r.start[0],r.start[1]).replace(/^At/,'at').replace(/^Near/,'near')}.`}));
  if(r.endOff>400)nodes.push(el('div',{class:'warnrow',style:'background:#EEF2F6;color:#2B3A4A',text:`The destination is ${fmtD(r.endOff)} from the nearest park road, so the route ends at the closest point on the road.`}));
  for(const w of r.warn)nodes.push(el('div',{class:'warnrow',text:`${RD[w.type][2]} ${RD[w.type][1]} on this route (${SEV.find(s=>s[0]===(w.sev||'1'))[1]}), reported ${ago(w.at)}. ${w.sev==='3'?'The route avoids it where it can.':'The route weighs it in.'}`}));
  for(const x of r.sights.slice(0,3))nodes.push(el('div',{class:'warnrow',style:'background:#E4F2E8;color:#1E4D2E',text:`${emoji(x)} ${label(x)} near this route, seen ${hhmm(x.lastSeen)} (${ago(x.lastSeen)})${x.example?' (example)':''}.`}));
  if(r.approxLen>100)nodes.push(el('div',{class:'warnrow',style:'background:#F3EADB;color:#5A3D1A',text:`${fmtD(r.approxLen)} of this route is on a track from the park board that is not yet on OpenStreetMap (dashed on the map). The line is approximate, so follow the junction stones.`}));
  if(wetness()>=5)nodes.push(el('div',{class:'warnrow',style:'background:#DCEAF8;color:#1D4F86',text:`${wetness().toFixed(0)} mm of rain in the last 24 h. Tracks may be muddy, so the route prefers the main roads.`}));
  nodes.push(el('div',{class:'acts'},el('button',{class:'secondary',type:'button',onclick:startPreview,text:'▶ Preview step by step'}),el('button',{class:'primary green',type:'button',onclick:startNav,text:'Start'})));
  if(!myPos().gps)nodes.push(el('p',{class:'fine',text:'Your position is set by hand, so the route starts there. To be guided as you drive, choose "Use my GPS again" in the position menu, or try Demo drive in Settings.'}));
  openSheet(title,nodes,{view:'preview'});
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
  ['navTop','navBottom','speedBox'].forEach(i=>$(i).hidden=false);updateSpeed();
  anim=true;keepAwake();
  say(`Starting route to ${S.route.destName}. ${fmtD(S.route.len)}.`);
  setTimeout(()=>{resize();navUpdate();requestAnimationFrame(draw);},60);
}
function endNav(arrived){
  stopSim();S.nav=null;anim=false;document.body.classList.remove('navmode');$('tiltbox').classList.remove('tilt');
  ['navTop','navBottom','speedBox','navThen','navWarn'].forEach(i=>$(i).hidden=true);updateSpeed();
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
  let tol=Math.max(45,(S.gps.acc||10)*1.5);
  if(R.approxSeg&&best&&(R.approxSeg[best.i]||R.approxSeg[best.i+1]||R.approxSeg[Math.max(0,best.i-1)]))tol=Math.max(tol,450);   // approximate board track
  if(best.d>tol){N.off++;if(N.off>=3&&Date.now()-(N.lastRe||0)>8000){N.lastRe=Date.now();const left=(R.stops||[]).filter(st=>st.d>N.prog+30);const r=left.length>1?routeMulti(p,left):route(p.x,p.y,R.dest[0],R.dest[1],R.destName);if(!r.error){S.route=r;N.prog=0;N.seg=1;N.off=0;N.spoken={};say('Rerouting.');toast('New route.');return navUpdate();}}}
  else {N.off=0;N.seg=best.i;N.prog=Math.max(best.prog,Math.min(N.prog,best.prog+5));N.prog=best.prog;}
  const next=R.instr.find(s=>s.d>N.prog+3)||R.instr[R.instr.length-1];N.next=next;const dist=Math.max(0,next.d-N.prog);
  const idx=R.instr.indexOf(next);const after=R.instr[idx+1];
  $('manDist').textContent=fmtD(dist);$('manText').textContent=next.type==='arrive'?`Arrive at ${R.destName}`:instrText(next);
  if(next.type==='waypoint'&&dist<35&&!N.spoken['wp'+next.stop]){N.spoken['wp'+next.stop]=1;say(`You have reached stop ${next.stop}, ${next.name}. Look around.`);toast(`Stop ${next.stop}: ${next.name}. Look around!`);}
  drawMan($('manIcon'),next.type);
  const then=$('navThen');if(after&&after.d-next.d<250&&next.type!=='arrive'&&next.type!=='waypoint'){then.hidden=false;then.textContent=`Then ${instrText(after,false).toLowerCase()}`;}else then.hidden=true;
  // warnings ahead (road reports within the next 2 km of route)
  const w=R.warn.map(r=>{const q=merc(r.lon,r.lat);let bd=1e9,bp=0;for(let i=1;i<R.pts.length;i++){const s=projSeg(q[0],q[1],R.pts[i-1][0],R.pts[i-1][1],R.pts[i][0],R.pts[i][1]);if(s.d<bd){bd=s.d;bp=R.cum[i-1]+s.t*(R.cum[i]-R.cum[i-1]);}}return {r,ahead:bp-N.prog};}).filter(o=>o.ahead>0&&o.ahead<2000).sort((a,b)=>a.ahead-b.ahead)[0];
  const wb=$('navWarn');if(w){wb.hidden=false;wb.textContent=`${RD[w.r.type][2]} ${RD[w.r.type][1]} in ${fmtD(w.ahead)}`;if(!N.spoken['w'+w.r.id]&&w.ahead<600){N.spoken['w'+w.r.id]=1;say(`Caution. ${RD[w.r.type][1]} reported ahead.`);}}else wb.hidden=true;
  // voice prompts
  const key=R.instr.indexOf(next);
  if(next.type==='arrive'){if(dist<30&&!N.spoken.arr){N.spoken.arr=1;say(`You have arrived at ${R.destName}.`);setTimeout(()=>{endNav(true);toast(`Arrived at ${R.destName}.`);},4000);}}
  else if(next.type!=='waypoint'){const t=instrText(next);
    if(dist<600&&dist>250&&!N.spoken[key+'f']){N.spoken[key+'f']=1;say(`In ${fmtD(Math.round(dist/50)*50)}, ${t.toLowerCase()}.`);}
    if(dist<=90&&!N.spoken[key+'n']){N.spoken[key+'n']=1;say(t+'.');}}
  // ETA from remaining distance and speed profile
  const remain=R.len-N.prog;const secs=remain*R.tpm;$('etaTime').textContent=hhmm(Date.now()+secs*1000);$('etaRest').textContent=`${fmtDur(secs)} · ${fmtD(remain)}`;
  const kmh=Math.round((S.gps.speed||0)*3.6);
  // camera target: heading-up, anchored low on screen
  const hd=routeHeading(R,N.prog,p);const mpp=kmh<12?1.3:kmh<30?1.9:2.6;
  let ay=.70;if(S.set.tilt){const Hv=$('mapwrap').clientHeight,pp=1100,th=40*RAD,hs=0.27*Hv;const d=hs*pp/(pp*Math.cos(th)-hs*Math.sin(th));ay=clamp(1-d/H,.5,.95);}
  camT.cx=p.x;camT.cy=p.y;camT.s=1/mpp*(S.set.tilt?1.15:0.85);camT.rot=-hd*RAD;camT.ax=.5;camT.ay=ay;cam.ax=camT.ax;cam.ay=camT.ay;
  if(S.gps.heading==null)S.gps.heading=hd;
}
/* ---------- route preview: step through every turn on the map ---------- */
function startPreview(){
  if(!S.route)return;closeSheet();stopSim();
  S.preview={i:0,timer:null};document.body.classList.add('navmode','previewmode');$('tiltbox').classList.toggle('tilt',S.set.tilt);
  ['navTop','prevBar'].forEach(i=>$(i).hidden=false);anim=true;
  setTimeout(()=>{resize();previewStep(0);requestAnimationFrame(draw);},60);
}
function previewStep(i){
  const P=S.preview,R=S.route;if(!P||!R)return;const n=R.instr.length;i=clamp(i,0,n-1);P.i=i;const st=R.instr[i];const prevD=i?R.instr[i-1].d:0;
  $('manDist').textContent=fmtD(st.d-prevD);
  $('manText').textContent=st.type==='arrive'?`Arrive at ${R.destName}`:instrText(st);drawMan($('manIcon'),st.type);
  $('prevCount').textContent=`Step ${i+1} of ${n}`;$('prevSub').textContent=`${fmtD(st.d)} from start · about ${fmtDur(st.d*R.tpm)}`;
  $('prevPlay').textContent=P.timer?'❚❚':'▶';
  const q=R.pts[st.i];const a=pointAt(R,Math.max(0,st.d-60));const hd=gd(a[0],a[1],q[0],q[1])>3?brg(a[0],a[1],q[0],q[1]):0;
  let ay=.62;if(S.set.tilt){const Hv=$('mapwrap').clientHeight,pp=1100,th=40*RAD,hs=0.42*Hv;const d=hs*pp/(pp*Math.cos(th)-hs*Math.sin(th));ay=clamp(1-d/H,.4,.95);}
  camT.cx=q[0];camT.cy=q[1];camT.rot=-hd*RAD;camT.s=S.set.tilt?1.15:0.75;camT.ax=.5;camT.ay=ay;cam.ax=.5;cam.ay=ay;
  if(i===0){cam.cx=q[0];cam.cy=q[1];cam.rot=camT.rot;cam.s=camT.s*0.6;}
}
function previewPlay(){const P=S.preview;if(!P)return;if(P.timer){clearInterval(P.timer);P.timer=null;$('prevPlay').textContent='▶';return;}
  P.timer=setInterval(()=>{if(!S.preview)return;if(P.i>=S.route.instr.length-1){clearInterval(P.timer);P.timer=null;$('prevPlay').textContent='▶';return;}previewStep(P.i+1);},3200);$('prevPlay').textContent='❚❚';}
function endPreview(start){
  const P=S.preview;if(P&&P.timer)clearInterval(P.timer);S.preview=null;anim=false;
  document.body.classList.remove('navmode','previewmode');$('tiltbox').classList.remove('tilt');['navTop','prevBar'].forEach(i=>$(i).hidden=true);
  setTimeout(()=>{resize();if(start)startNav();else{fitRoute(S.route);openRouteAgain();}},60);
}
function openRouteAgain(){const r=S.route;if(!r)return;showPlan(r,r.stops&&r.stops.length>1?`${r.stops.length} stops`:`To ${r.destName}`);}
$('prevPrev').onclick=()=>previewStep(S.preview.i-1);$('prevNext').onclick=()=>previewStep(S.preview.i+1);$('prevPlay').onclick=previewPlay;
$('prevClose').onclick=()=>endPreview(false);$('prevStart').onclick=()=>endPreview(true);
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
   11b. Trip pass (temporary driver profile) and chat
   A trip pass is a name and vehicle tied to an anonymous Firebase sign-in on this phone.
   It deletes itself after 1-4 days. Park chat messages last 24 hours.
   ========================================================================= */
const COLORS=['White','Silver','Grey','Black','Green','Beige','Blue','Red','Other'];
const AVATARS=['🦁','🐘','🦒','🦓','🦏','🐆','🦛','🦅','🐒','🦉'];
const QUICK=['Where exactly?','Still there?','Thanks!','On my way','Road clear?','Gone now'];
const SOC={profile:LS.get('pass',null),people:[],chat:[],dms:[],thread:null,threadMsgs:[],lastRead:LS.get('chatRead',0),dmRead:LS.get('dmRead',{}),blocked:LS.get('blocked',[]),passenger:false,subs:{},render:null,started:false};
const passActive=()=>!!(SOC.profile&&(SOC.profile.startsAt||0)<=Date.now()&&SOC.profile.expiresAt>Date.now());
const passValid=passActive;
const passUpcoming=()=>!!(SOC.profile&&(SOC.profile.startsAt||0)>Date.now());
const passExists=()=>!!(SOC.profile&&SOC.profile.expiresAt>Date.now());
const dISO=t=>{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const fromISO=(v,end)=>{const [y,m,d]=v.split('-').map(Number);return end?new Date(y,m-1,d,23,59,59,999).getTime():new Date(y,m-1,d,0,0,0,0).getTime();};
const dShort=t=>new Date(t).toLocaleDateString([], {weekday:'short',day:'numeric',month:'short'});
const KEEP_DAYS=30;
const vehLabel=p=>[p.color&&p.color!=='Other'?p.color:'',p.vehicle].filter(Boolean).join(' ')||'Vehicle not given';
const tsMs=v=>v&&typeof v.toMillis==='function'?v.toMillis():+v||0;
async function ensureAuth(){
  if(!S.fs)throw {code:'nodb'};if(S.fs.uid)return S.fs.uid;
  if(S.fs.authReady)await S.fs.authReady;if(!S.fs.AU)throw {code:'auth/network-request-failed'};if(S.fs.uid)return S.fs.uid;
  const cred=await S.fs.AU.signInAnonymously(S.fs.auth);S.fs.uid=cred.user.uid;return S.fs.uid;
}
function cleanProfile(id,d){if(!d||typeof d.name!=='string')return null;const exp=tsMs(d.expiresAt);if(exp<Date.now())return null;
  return {uid:id,name:d.name.slice(0,30),vehicle:String(d.vehicle||'').slice(0,40),color:COLORS.includes(d.color)?d.color:'',party:String(d.party||'').slice(0,40),emoji:AVATARS.includes(d.emoji)?d.emoji:'🙂',chat:!!d.chat,expiresAt:exp,startsAt:tsMs(d.startsAt)||tsMs(d.createdAt)||0,lastSeen:tsMs(d.lastSeen)};}
function cleanMsg(id,d){if(!d||typeof d.text!=='string'||typeof d.uid!=='string')return null;const at=+d.at;if(!(at>1.6e12))return null;
  const m={id,uid:d.uid,name:String(d.name||'Driver').slice(0,30),emoji:AVATARS.includes(d.emoji)?d.emoji:'🙂',vehicle:String(d.vehicle||'').slice(0,50),text:d.text.slice(0,500),at,kind:d.kind==='sighting'?'sighting':'text'};
  if(m.kind==='sighting'&&d.rep&&typeof d.rep==='object'){const r=d.rep;if(+r.lat<-1&&+r.lat>-2.3&&+r.lon>30.2&&+r.lon<31.2)m.rep={id:String(r.id||''),type:String(r.type||''),kind:r.kind==='road'?'road':'animal',label:String(r.label||'').slice(0,60),lat:+r.lat,lon:+r.lon,at:+r.at||at};}
  return m;}
const pairId=(a,b)=>a<b?`${a}_${b}`:`${b}_${a}`;
function personByUid(uid){return SOC.people.find(p=>p.uid===uid)||null;}

function startSocial(){
  if(!S.fs||!S.fs.uid||!passValid()||SOC.started)return;SOC.started=true;
  const {F,db}=S.fs,uid=S.fs.uid;
  SOC.subs.people=F.onSnapshot(F.query(F.collection(db,'profiles'),F.where('expiresAt','>',F.Timestamp.now())),snap=>{
    SOC.people=snap.docs.map(d=>cleanProfile(d.id,d.data())).filter(Boolean);socRefresh('people');redraw();},e=>{});
  if(SOC.profile.chat){
    SOC.subs.chat=F.onSnapshot(F.query(F.collection(db,'chat'),F.where('at','>',Date.now()-24*3600e3),F.orderBy('at','desc'),F.limit(150)),snap=>{
      const before=new Set(SOC.chat.map(m=>m.id));
      SOC.chat=snap.docs.map(d=>cleanMsg(d.id,d.data())).filter(Boolean).reverse();
      const fresh=SOC.chat.filter(m=>!before.has(m.id)&&m.uid!==uid&&!SOC.blocked.includes(m.uid));
      if(before.size&&fresh.length&&sheetView!=='chat:park'&&!S.nav)toast(`${fresh[fresh.length-1].emoji} ${fresh[fresh.length-1].name}: ${fresh[fresh.length-1].text||'shared a sighting'}`.slice(0,90),'Open',()=>openChat('park'),5000);
      socRefresh('park');updateChatBadge();},e=>{});
    SOC.subs.dms=F.onSnapshot(F.query(F.collection(db,'dms'),F.where('members','array-contains',uid)),snap=>{
      SOC.dms=snap.docs.map(d=>({id:d.id,...d.data()})).filter(t=>Array.isArray(t.members)&&tsMs(t.expiresAt)>Date.now());socRefresh('dms');updateChatBadge();},e=>{});
  }
  // keep "last active" fresh while the app is open (at most every 10 minutes)
  const ping=()=>{if(!passValid())return endSocial();F.updateDoc(F.doc(db,'profiles',uid),{lastSeen:F.Timestamp.now()}).catch(()=>{});};
  ping();SOC.subs.ping=setInterval(ping,10*60e3);
  updateMeBtn();updateChatBadge();
}
function endSocial(){for(const k in SOC.subs){const u=SOC.subs[k];if(typeof u==='function')u();else clearInterval(u);}SOC.subs={};SOC.started=false;SOC.chat=[];SOC.dms=[];SOC.people=[];if(SOC.threadUnsub){SOC.threadUnsub();SOC.threadUnsub=null;}updateChatBadge();updateMeBtn();}
function socRefresh(kind){if($('sheet').hidden)return;if(sheetView==='chat:'+kind&&SOC.render)SOC.render();else if(kind==='dms'&&sheetView&&sheetView.startsWith('thread:')&&SOC.render)SOC.render();else if(sheetView==='pass'&&kind==='people')openPass();}
function unreadCount(){if(!passValid())return 0;const uid=S.fs&&S.fs.uid;let n=SOC.chat.filter(m=>m.at>SOC.lastRead&&m.uid!==uid&&!SOC.blocked.includes(m.uid)).length;for(const t of SOC.dms){if((t.lastAt||0)>(SOC.dmRead[t.id]||0)&&t.lastBy!==uid)n++;}return n;}
function updateChatBadge(){const b=$('chatBadge');if(!b)return;const n=unreadCount();b.hidden=!n;b.textContent=n>9?'9+':String(n);}
function updateMeBtn(){const b=$('meBtn');if(!b)return;const ex=passExists();b.textContent=ex?SOC.profile.emoji:'👤';b.setAttribute('aria-label',ex?(passUpcoming()?`Trip pass starts ${dShort(SOC.profile.startsAt)}`:`Trip pass: ${SOC.profile.name}`):'Create a trip pass');}

/* ---------- trip pass sheet ---------- */
function openPass(edit){
  if(!S.fs){openSheet('Trip pass',[el('p',{class:'hint',text:'Trip passes and chat need the shared database (Firebase). It is not connected on this phone right now.'}),el('button',{class:'secondary sosbtn',type:'button',onclick:()=>openEmergency(),text:'🆘 Emergency help works without it'})],{view:'pass'});return;}
  if(passExists()&&!edit)return showPass();
  const L=!edit?LS.get('trip',null):null;const P=(edit&&SOC.profile)||L||{};const today=dISO(Date.now());
  const f={name:P.name||'',vehicle:P.vehicle||'',color:P.color||'White',party:P.party||'',emoji:P.emoji||'🦁',chat:edit?!!P.chat:true,showName:LS.get('showName',true)};
  const name=el('input',{class:'search',id:'p-name',maxlength:'30',placeholder:'Your first name or nickname',autocomplete:'given-name','aria-label':'Name'});name.value=f.name;
  const veh=el('input',{class:'search',id:'p-veh',maxlength:'40',placeholder:'Vehicle, e.g. Toyota Prado','aria-label':'Vehicle'});veh.value=f.vehicle;
  const party=el('input',{class:'search',id:'p-party',maxlength:'40',placeholder:'Optional: e.g. 2 adults, 2 kids','aria-label':'Who is in the car'});party.value=f.party;
  const from=el('input',{class:'search',type:'date',id:'p-from','aria-label':'Arrival date'}),to=el('input',{class:'search',type:'date',id:'p-to','aria-label':'Leaving date'});
  from.value=edit?dISO(P.startsAt||Date.now()):today;to.value=edit?dISO(P.expiresAt):dISO(Date.now()+864e5);
  if(!edit){from.min=today;to.min=today;}from.max=dISO(Date.now()+30*864e5);
  const dsum=el('p',{class:'fine'});
  const upd=()=>{const a=from.value,b=to.value;if(!a||!b){dsum.textContent='';return;}const n=Math.round((fromISO(b,true)-fromISO(a))/864e5);dsum.textContent=n<1?'The leaving date must be on or after the arrival date.':n>7?'A pass covers at most 7 days.':`${n} day${n>1?'s':''}: ${dShort(fromISO(a))} to ${dShort(fromISO(b))}. Chat and your name on the map work only on these days.`;};
  from.onchange=()=>{if(to.value<from.value)to.value=from.value;upd();};to.onchange=upd;
  const dayChips=el('div',{class:'optrow'},...[1,2,3,4,7].map(n=>{const b=el('button',{type:'button',class:'opt',text:n===1?'1 day':n+' days'});b.onclick=()=>{const e=new Date(fromISO(from.value||today));e.setDate(e.getDate()+n-1);to.value=dISO(e.getTime());upd();};return b;}));
  upd();
  const chips=(list,key)=>{const w=el('div',{class:'optrow'});for(const v of list){const b=el('button',{type:'button',class:'opt'+(f[key]===v?' on':''),text:String(v)});b.onclick=()=>{f[key]=v;[...w.children].forEach(c=>c.classList.remove('on'));b.classList.add('on');};w.append(b);}return w;};
  const chatT=el('input',{type:'checkbox',id:'p-chat'});chatT.checked=f.chat;const nameT=el('input',{type:'checkbox',id:'p-show'});nameT.checked=f.showName;
  const save=el('button',{class:'primary',type:'button',text:edit?'Save changes':'Create my trip pass'});
  save.onclick=async()=>{f.name=name.value.trim();f.vehicle=veh.value.trim();f.party=party.value.trim();f.chat=chatT.checked;f.showName=nameT.checked;
    if(f.name.length<2){toast('Please enter a name of at least 2 letters.');name.focus();return;}
    const a=from.value,b=to.value;if(!a||!b){toast('Choose your arrival and leaving dates.');return;}
    const sA=fromISO(a),eB=fromISO(b,true),n=Math.round((eB-sA)/864e5);
    if(n<1){toast('The leaving date must be on or after the arrival date.');return;}if(n>7){toast('A trip pass covers at most 7 days.');return;}
    if(!edit&&eB<Date.now()){toast('Those dates have passed.');return;}if(sA>Date.now()+30*864e5){toast('You can register up to 30 days ahead.');return;}
    f.startsAt=sA;f.expiresAt=eB;
    save.disabled=true;const label0=save.textContent;save.textContent='Saving…';
    try{await savePass(f,!edit);LS.set('showName',f.showName);
      if(edit){showPass();toast('Saved.');}else{closeSheet();toast(passActive()?`Welcome, ${f.name}! Valid ${dShort(sA)} to ${dShort(eB)}.`:`Pass saved. Chat opens on ${dShort(sA)}.`);if(f.chat&&passActive())setTimeout(()=>openChat('park'),600);}}
    catch(e){save.disabled=false;save.textContent=label0;passError(e);}};
  openSheet(edit?'Edit trip pass':'Trip pass',[
    edit?null:L?el('div',{class:'passintro'},el('b',{text:'Welcome back'}),el('span',{text:`Your details from ${dShort(L.endsAt)} are filled in. Choose your new dates.`})):el('div',{class:'passintro'},el('b',{text:'Temporary. No password, no email.'}),el('span',{text:'Your name and vehicle let other drivers recognise you in the park chat and on your reports. Chat and your name on the map end with your last day.'})),
    el('p',{class:'lbl',text:'Days in the park'}),el('div',{class:'datepair'},el('label',{for:'p-from',text:'Arrive'}),from,el('label',{for:'p-to',text:'Leave'}),to),dayChips,dsum,
    el('p',{class:'lbl',text:'Name'}),name,
    el('p',{class:'lbl',text:'Vehicle'}),veh,chips(COLORS,'color'),
    el('p',{class:'lbl',text:'Who is in the car'}),party,
    el('p',{class:'lbl',text:'Your sign'}),chips(AVATARS,'emoji'),
    el('label',{class:'toggle',for:'p-chat'},'Join the park chat',chatT),
    el('label',{class:'toggle',for:'p-show'},'Show my name on my reports',nameT),
    save,
    el('p',{class:'fine',text:`Your trip details (name, vehicle, dates) are kept for ${KEEP_DAYS} days after your last day so you can reuse them, then removed. The person running this app can see them in the database. You can delete everything at any time with "End my trip".`}),
    el('p',{class:'fine',text:'Please do not share number plates, phone numbers or exact plans in the chat. Only people with a trip pass can read it.'})
  ],{view:edit?'pass-edit':'pass-new',back:edit?showPass:null});
}
async function savePass(f,isNew){
  const uid=await ensureAuth();const {F,db}=S.fs;const now=Date.now();
  const created=isNew||!SOC.profile?now:SOC.profile.createdAt;const T=ms=>F.Timestamp.fromMillis(ms);
  const doc={name:f.name.slice(0,30),vehicle:f.vehicle.slice(0,40),color:f.color,party:(f.party||'').slice(0,40),emoji:f.emoji,chat:!!f.chat,createdAt:T(created),startsAt:T(f.startsAt),expiresAt:T(f.expiresAt),lastSeen:F.Timestamp.now()};
  await F.setDoc(F.doc(db,'profiles',uid),doc);
  F.setDoc(F.doc(db,'trips',uid),{name:doc.name,vehicle:doc.vehicle,color:doc.color,party:doc.party,startsAt:doc.startsAt,endsAt:doc.expiresAt,createdAt:doc.createdAt,retainUntil:T(f.expiresAt+KEEP_DAYS*864e5)}).catch(()=>{});
  SOC.profile={uid,name:doc.name,vehicle:doc.vehicle,color:doc.color,party:doc.party,emoji:doc.emoji,chat:doc.chat,createdAt:created,startsAt:f.startsAt,expiresAt:f.expiresAt};LS.set('pass',SOC.profile);LS.set('trip',null);
  endSocial();if(passActive())startSocial();updateMeBtn();
}
function passError(e){const c=e&&e.code||'';
  if(c==='auth/operation-not-allowed'||c==='auth/admin-restricted-operation')openSheet('One setting missing',[el('p',{class:'hint',text:'Anonymous sign-in is not switched on in the Firebase project yet. In the Firebase console: Authentication > Get started > Sign-in method > Anonymous > Enable > Save. Then try again.'})],{view:'passerr'});
  else if(c==='permission-denied')openSheet('Database rules need an update',[el('p',{class:'hint',text:'The Firestore rules do not allow trip passes yet. Publish the new rules from the README (Firestore Database > Rules), then try again.'})],{view:'passerr'});
  else if(c==='auth/network-request-failed'||c==='unavailable')toast('No signal. Try again when you have coverage.');
  else toast('Could not create the pass: '+(c||'error'),null,null,6000);}
function showPass(){
  const p=SOC.profile;if(!p)return openPass();const up=passUpcoming();const left=p.expiresAt-Date.now();
  const others=SOC.people.filter(x=>x.uid!==p.uid&&x.chat&&Date.now()-x.lastSeen<12*3600e3&&x.startsAt<=Date.now()).length;
  const maxEnd=fromISO(dISO((p.startsAt||Date.now())+6*864e5),true);
  const when=up?`Starts ${dShort(p.startsAt)}`:`${left>864e5?Math.floor(left/864e5)+' d '+Math.round((left%864e5)/3600e3)+' h':Math.max(1,Math.round(left/3600e3))+' h'} left`;
  openSheet('Trip pass',[
    el('div',{class:'passcard'},el('span',{class:'av',text:p.emoji}),el('div',null,el('b',{text:p.name}),el('span',{text:vehLabel(p)}),p.party?el('span',{text:p.party}):null),el('small',{text:`${dShort(p.startsAt||p.createdAt)} to ${dShort(p.expiresAt)} · ${when}`})),
    up?el('p',{class:'hint',text:`Chat and the driver list open on ${dShort(p.startsAt)}. Sightings, routes and emergency help work now.`}):(p.chat?el('button',{class:'primary blue',type:'button',onclick:()=>openChat('park'),text:`💬 Park chat${others?` · ${others} here`:''}`}):el('button',{class:'primary blue',type:'button',onclick:()=>togglePassChat(true),text:'Join the park chat'})),
    el('div',{class:'acts'},el('button',{class:'secondary',type:'button',onclick:()=>openPass(true),text:'Edit dates and details'}),el('button',{class:'secondary',type:'button',disabled:p.expiresAt>=maxEnd,onclick:extendPass,text:'Add a day'})),
    el('button',{class:'secondary sosbtn',type:'button',onclick:()=>openEmergency(),text:'🆘 Emergency help'}),
    p.chat&&!up?el('button',{class:'secondary',type:'button',onclick:()=>togglePassChat(false),text:'Leave the chat (stay hidden)'}):null,
    el('button',{class:'secondary no',type:'button',onclick:confirmEnd,text:'End my trip now and delete everything'}),
    el('p',{class:'fine',text:`Chat messages and your name on reports end with the pass. Your trip details (name, vehicle, dates) are kept until ${dShort(p.expiresAt+KEEP_DAYS*864e5)}, 30 days after your last day, then removed. Reports themselves stay, without your name, until they expire.`})
  ],{view:'pass'});
}
async function extendPass(){const p=SOC.profile;const maxEnd=fromISO(dISO((p.startsAt||Date.now())+6*864e5),true);const exp=Math.min(p.expiresAt+864e5,maxEnd);
  if(exp<=p.expiresAt){toast('A pass covers at most 7 days.');return;}
  try{const {F,db}=S.fs;await F.updateDoc(F.doc(db,'profiles',S.fs.uid),{expiresAt:F.Timestamp.fromMillis(exp)});F.updateDoc(F.doc(db,'trips',S.fs.uid),{endsAt:F.Timestamp.fromMillis(exp),retainUntil:F.Timestamp.fromMillis(exp+KEEP_DAYS*864e5)}).catch(()=>{});p.expiresAt=exp;LS.set('pass',p);showPass();toast('One day added.');}catch(e){passError(e);}}
async function togglePassChat(on){const p=SOC.profile;try{const {F,db}=S.fs;await F.updateDoc(F.doc(db,'profiles',S.fs.uid),{chat:on});p.chat=on;LS.set('pass',p);endSocial();startSocial();showPass();if(on&&passActive())openChat('park');}catch(e){passError(e);}}
function confirmEnd(){openSheet('End your trip?',[el('p',{class:'hint',text:'This deletes your trip pass, your trip details and every chat message you wrote, now. Your list of ticked animals stays on this phone.'}),
  el('button',{class:'primary',type:'button',onclick:endTrip,text:'Delete everything now'}),el('button',{class:'secondary',type:'button',onclick:showPass,text:'Keep my pass'})],{view:'end'});}
async function endTrip(){
  const {F,db}=S.fs,uid=S.fs.uid;toast('Deleting…');const tr=async f=>{try{await f();}catch(e){}};
  await tr(async()=>{const mine=await F.getDocs(F.query(F.collection(db,'chat'),F.where('uid','==',uid)));for(const d of mine.docs)await F.deleteDoc(d.ref);});
  for(const t of SOC.dms)await tr(async()=>{const ms=await F.getDocs(F.query(F.collection(db,'dms',t.id,'msgs'),F.where('uid','==',uid)));for(const d of ms.docs)await F.deleteDoc(d.ref);});
  await tr(()=>F.deleteDoc(F.doc(db,'trips',uid)));await tr(()=>F.deleteDoc(F.doc(db,'profiles',uid)));
  endSocial();SOC.profile=null;LS.set('pass',null);LS.set('trip',null);try{await S.fs.AU.signOut(S.fs.auth);}catch(e){}S.fs.uid=null;closeSheet();updateMeBtn();toast('Trip ended. Your pass, trip details and messages are deleted.');
}
/* when a pass ends the visible parts disappear at once; trip details stay for 30 days */
function retire(){const p=SOC.profile;if(!p)return;
  LS.set('trip',{name:p.name,vehicle:p.vehicle,color:p.color,party:p.party,emoji:p.emoji,startsAt:p.startsAt||p.createdAt,endsAt:p.expiresAt,retainUntil:p.expiresAt+KEEP_DAYS*864e5});
  endSocial();SOC.profile=null;LS.set('pass',null);updateMeBtn();janitor();
  toast(`Your trip pass has ended. Trip details are kept until ${dShort(p.expiresAt+KEEP_DAYS*864e5)}.`,'Start a new trip',()=>openPass(),9000);}
/* any phone with the app open removes expired passes and messages, so the database stays tidy without billing */
async function janitor(){
  if(!S.fs||!S.fs.uid)return;const {F,db}=S.fs,uid=S.fs.uid,now=F.Timestamp.now();const tr=async f=>{try{await f();}catch(e){}};
  await tr(async()=>{const pr=await F.getDocs(F.query(F.collection(db,'profiles'),F.where('expiresAt','<',now),F.limit(25)));for(const d of pr.docs)await tr(()=>F.deleteDoc(d.ref));});
  if(passActive())await tr(async()=>{const ch=await F.getDocs(F.query(F.collection(db,'chat'),F.where('expiresAt','<',now),F.limit(40)));for(const d of ch.docs)await tr(()=>F.deleteDoc(d.ref));});
  await tr(async()=>{const ds=await F.getDocs(F.query(F.collection(db,'dms'),F.where('members','array-contains',uid)));for(const t of ds.docs){if(tsMs(t.data().expiresAt)<Date.now()){const ms=await F.getDocs(F.collection(db,'dms',t.id,'msgs'));for(const m of ms.docs)await tr(()=>F.deleteDoc(m.ref));await tr(()=>F.deleteDoc(t.ref));}}});
  await tr(async()=>{const t=await F.getDoc(F.doc(db,'trips',uid));if(t.exists()&&tsMs(t.data().retainUntil)<Date.now())await F.deleteDoc(t.ref);});
}
function socTick(){
  const p=SOC.profile;
  if(p&&!(p.expiresAt>Date.now()))retire();
  else if(p&&passActive()&&!SOC.started&&S.fs&&S.fs.uid)startSocial();
  if(S.fs&&S.fs.uid&&Date.now()-(SOC.lastJan||0)>3600e3){SOC.lastJan=Date.now();janitor();}
  const t=LS.get('trip',null);if(t&&t.retainUntil<Date.now())LS.set('trip',null);
  updateMeBtn();
}

/* ---------- chat ---------- */
function chatTabs(cur){const n=SOC.dms.filter(t=>(t.lastAt||0)>(SOC.dmRead[t.id]||0)&&t.lastBy!==S.fs.uid).length;
  return el('div',{class:'seg',role:'tablist'},...[['park','Park chat'],['dms',`Messages${n?` (${n})`:''}`],['people','People']].map(([k,l])=>el('button',{type:'button',role:'tab','aria-selected':String(k===cur),class:k===cur?'on':'',onclick:()=>openChat(k),text:l})));}
function drivingLocked(){const g=S.gps;return !SOC.passenger&&g.ok&&!g.sim&&Date.now()-g.t<15e3&&(g.speed||0)*3.6>10;}
function composer(onSend){
  const inp=el('input',{class:'chatin',type:'text',maxlength:'500',placeholder:'Message',enterkeyhint:'send','aria-label':'Message'});
  const send=el('button',{class:'sendbtn',type:'button','aria-label':'Send',text:'➤'});
  const lock=el('div',{class:'drivelock'},el('span',{text:'Typing is paused while the car is moving.'}),el('button',{type:'button',onclick:()=>{SOC.passenger=true;bar.replaceWith(composer(onSend));},text:"I'm a passenger"}));
  const go=()=>{const t=inp.value.trim();if(!t)return;onSend(t);inp.value='';};
  send.onclick=go;inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();go();}};
  const quick=el('div',{class:'quick'},...QUICK.map(q=>el('button',{type:'button',onclick:()=>onSend(q),text:q})));
  const bar=el('div',{class:'composer'},quick,drivingLocked()?lock:el('div',{class:'inrow'},inp,send));
  return bar;
}
function msgNode(m,uid){
  const mine=m.uid===uid;const kids=[];
  if(!mine)kids.push(el('div',{class:'who'},`${m.emoji} ${m.name}`,m.vehicle?el('span',{text:' · '+m.vehicle}):null));
  if(m.text)kids.push(el('div',{class:'txt',text:m.text}));
  if(m.rep){const r=m.rep;const q=merc(r.lon,r.lat);kids.push(el('button',{type:'button',class:'repcard',onclick:()=>{const live=allReports().find(x=>x.id===r.id);if(live)openReportView(live);else previewRoute({x:q[0],y:q[1],name:r.label});}},
      r.kind==='animal'?pic(r.type,36):el('span',{text:'⚠️'}),el('span',null,el('b',{text:r.label}),el('small',{text:`${whereText(q[0],q[1])} · seen ${hhmm(r.at)}`}))));}
  kids.push(el('div',{class:'when',text:hhmm(m.at)}));
  return el('div',{class:'msg'+(mine?' me':'')},...kids);
}
function openChat(tab='park'){
  if(!passValid()||!S.fs||!S.fs.uid){if(passUpcoming()||passExists())showPass();else openPass();return;}
  if(!SOC.profile.chat){showPass();return;}
  const uid=S.fs.uid;
  if(tab==='park'){
    const list=el('div',{class:'msgs',role:'log','aria-live':'polite'});
    SOC.render=()=>{const atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<80;const ms=SOC.chat.filter(m=>!SOC.blocked.includes(m.uid));
      list.replaceChildren(...(ms.length?ms.map(m=>msgNode(m,uid)):[el('p',{class:'empty',text:'No messages in the last 24 hours. Say hello or share a sighting.'})]));
      if(atBottom||!list.dataset.init){list.scrollTop=list.scrollHeight;list.dataset.init='1';}
      SOC.lastRead=Date.now();LS.set('chatRead',SOC.lastRead);updateChatBadge();};
    openSheet('Chat',[chatTabs('park'),list,composer(t=>sendChat(t))],{view:'chat:park',tall:true});SOC.render();
  } else if(tab==='dms'){
    SOC.render=()=>{const rows=SOC.dms.slice().sort((a,b)=>(b.lastAt||0)-(a.lastAt||0)).map(t=>{const other=t.members.find(x=>x!==uid);const p=personByUid(other);const nm=(t.names&&t.names[other])||(p&&p.name)||'Driver';
        const unread=(t.lastAt||0)>(SOC.dmRead[t.id]||0)&&t.lastBy!==uid;
        return el('li',null,el('button',{type:'button',onclick:()=>openThread(other,nm)},el('span',{class:'em',text:p?p.emoji:'🙂'}),el('span',null,el('b',{text:nm+(unread?' •':'')}),el('small',{text:(t.last||'').slice(0,60)})),el('span',{class:'r',text:t.lastAt?hhmm(t.lastAt):''})));});
      $('sheetBody').replaceChildren(chatTabs('dms'),rows.length?el('ul',{class:'list'},...rows):el('p',{class:'empty',text:'No private messages. Open People to message a driver.'}));};
    openSheet('Chat',[],{view:'chat:dms',tall:true});SOC.render();
  } else {
    SOC.render=()=>{const ppl=SOC.people.filter(p=>p.chat&&p.startsAt<=Date.now()&&Date.now()-p.lastSeen<12*3600e3).sort((a,b)=>(a.uid===uid?-1:b.uid===uid?1:b.lastSeen-a.lastSeen));
      $('sheetBody').replaceChildren(chatTabs('people'),el('p',{class:'hint',text:`${ppl.length} driver${ppl.length===1?'':'s'} with a trip pass active in the last 12 hours.`}),
        el('ul',{class:'list'},...ppl.map(p=>{const me=p.uid===uid,bl=SOC.blocked.includes(p.uid);return el('li',null,el('button',{type:'button',disabled:me,onclick:()=>openPerson(p)},el('span',{class:'em',text:p.emoji}),el('span',null,el('b',{text:p.name+(me?' (you)':'')+(bl?' · blocked':'')}),el('small',{text:vehLabel(p)+(p.party?' · '+p.party:'')})),el('span',{class:'r',text:Date.now()-p.lastSeen<15*60e3?'active':ago(p.lastSeen)})));})));};
    openSheet('Chat',[],{view:'chat:people',tall:true});SOC.render();
  }
}
function openPerson(p){const bl=SOC.blocked.includes(p.uid);
  openSheet(p.name,[el('div',{class:'passcard'},el('span',{class:'av',text:p.emoji}),el('div',null,el('b',{text:p.name}),el('span',{text:vehLabel(p)}),p.party?el('span',{text:p.party}):null),el('small',{text:`Active ${ago(p.lastSeen)}`})),
    bl?null:el('button',{class:'primary blue',type:'button',onclick:()=>openThread(p.uid,p.name),text:'Send a private message'}),
    el('button',{class:'secondary'+(bl?'':' no'),type:'button',onclick:()=>{SOC.blocked=bl?SOC.blocked.filter(x=>x!==p.uid):[...SOC.blocked,p.uid];LS.set('blocked',SOC.blocked);toast(bl?'Unblocked.':`You won't see messages from ${p.name} any more.`);openChat('people');},text:bl?'Unblock':'Block this driver'})],{view:'person',back:()=>openChat('people')});}
async function sendChat(text,rep){
  if(!passValid()||!S.fs||!S.fs.uid)return openPass();const {F,db}=S.fs,p=SOC.profile;const now=Date.now();
  const m={uid:S.fs.uid,name:p.name,emoji:p.emoji,vehicle:vehLabel(p),text:(text||'').slice(0,500),at:now,expiresAt:F.Timestamp.fromMillis(now+24*3600e3),kind:rep?'sighting':'text'};
  if(rep)m.rep={id:rep.id,type:rep.type,kind:rep.kind,label:label(rep),lat:rep.lat,lon:rep.lon,at:rep.lastSeen||rep.at};
  F.addDoc(F.collection(db,'chat'),m).catch(e=>toast(e&&e.code==='permission-denied'?'The chat rules are not published yet (see README).':'Message not sent: '+(e&&e.code||'error')));
}
function shareToChat(r){if(!passValid()){toast('Create a trip pass to use the chat.','Trip pass',openPass);return;}if(!SOC.profile.chat){togglePassChat(true);return;}
  sendChat(r.kind==='animal'?`${label(r)} here`:`${RD[r.type][1]} here`,r);toast('Shared in the park chat.','Open chat',()=>openChat('park'));}
async function openThread(other,name){
  const {F,db}=S.fs,uid=S.fs.uid,pid=pairId(uid,other);
  try{await F.setDoc(F.doc(db,'dms',pid),{members:[uid,other].sort(),names:{[uid]:SOC.profile.name,[other]:name},expiresAt:F.Timestamp.fromMillis(Date.now()+4*864e5)},{merge:true});}
  catch(e){toast(e&&e.code==='permission-denied'?'The chat rules are not published yet (see README).':'Could not open the conversation.');return;}
  if(SOC.threadUnsub)SOC.threadUnsub();SOC.threadMsgs=[];
  const list=el('div',{class:'msgs',role:'log','aria-live':'polite'});
  SOC.render=()=>{const atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<80;
    list.replaceChildren(...(SOC.threadMsgs.length?SOC.threadMsgs.map(m=>msgNode({...m,name:name,emoji:(personByUid(m.uid)||{}).emoji||'🙂',vehicle:''},uid)):[el('p',{class:'empty',text:`Private conversation with ${name}. Messages are deleted after 4 days.`})]));
    if(atBottom||!list.dataset.init){list.scrollTop=list.scrollHeight;list.dataset.init='1';}
    SOC.dmRead[pid]=Date.now();LS.set('dmRead',SOC.dmRead);updateChatBadge();};
  SOC.threadUnsub=F.onSnapshot(F.query(F.collection(db,'dms',pid,'msgs'),F.orderBy('at'),F.limit(200)),snap=>{SOC.threadMsgs=snap.docs.map(d=>{const x=d.data();return (x&&typeof x.text==='string'&&+x.at>1.6e12)?{id:d.id,uid:String(x.uid),text:x.text.slice(0,500),at:+x.at,kind:'text'}:null;}).filter(Boolean);if(sheetView==='thread:'+pid)SOC.render();},e=>{});
  openSheet(name,[list,composer(async t=>{const now=Date.now();try{await F.addDoc(F.collection(db,'dms',pid,'msgs'),{uid,text:t.slice(0,500),at:now,expiresAt:F.Timestamp.fromMillis(now+4*864e5)});
      await F.updateDoc(F.doc(db,'dms',pid),{last:t.slice(0,80),lastAt:now,lastBy:uid,expiresAt:F.Timestamp.fromMillis(now+4*864e5)});}catch(e){toast('Message not sent.');}})],{view:'thread:'+pid,tall:true,back:()=>{if(SOC.threadUnsub){SOC.threadUnsub();SOC.threadUnsub=null;}openChat('dms');}});
  SOC.render();
}

/* =========================================================================
   11c. Emergency help: who to call, share your exact position, warn nearby drivers
   Works fully offline. It cannot call rescue services by itself.
   ========================================================================= */
const EM={kind:window.EMERGENCY.kinds[0],sent:null};
function emPos(){const p=myPos();if(p)return {...p,stale:0};const g=S.gps;if(g.ok)return {x:g.x,y:g.y,lat:g.lat,lon:g.lon,gps:true,stale:Date.now()-g.t};return null;}
function emWho(){return passExists()?SOC.profile:LS.get('trip',null);}
function emText(kind,p){
  const w=emWho(),la=p.lat.toFixed(5),lo=p.lon.toFixed(5);
  const L=['EMERGENCY at Akagera National Park, Rwanda',`Problem: ${kind.label}`];
  if(w){L.push(`Name: ${w.name}`);L.push(`Vehicle: ${vehLabel(w)}`);if(w.party)L.push(`In the car: ${w.party}`);}
  L.push(`Position: ${la}, ${lo}`,`Map: https://maps.google.com/?q=${la},${lo}`,`Near: ${whereText(p.x,p.y)}`);
  L.push(p.gps?(p.stale>120e3?`GPS position is from ${ago(Date.now()-p.stale)}`:`GPS accuracy about ${Math.round(S.gps.acc||20)} m`):'Position set by hand, may be off by up to 1 km');
  L.push(`Time: ${hhmm(Date.now())} ${dayWord(Date.now())}`);
  return L.join('\n');
}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('Copied. Paste it into any message.');}catch(e){const a=el('textarea',{style:'position:fixed;opacity:0'});a.value=t;document.body.append(a);a.select();try{document.execCommand('copy');toast('Copied.');}catch(x){toast('Press and hold the text to copy it.');}a.remove();}}
async function shareText(t){if(navigator.share){try{await navigator.share({title:'Emergency at Akagera',text:t});return;}catch(e){if(e&&e.name==='AbortError')return;}}copyText(t);}
function telLink(n,show,label,cls){return el('a',{class:cls||'emrow',href:'tel:'+n},el('span',{text:label}),el('b',{text:show||n}));}
function openEmergency(id){
  if(id){const k=window.EMERGENCY.kinds.find(x=>x.id===id);if(k)EM.kind=k;}
  const E=window.EMERGENCY,k=EM.kind,p=emPos(),c=LS.get('emc',{});const top=$('sheetBody').scrollTop,reopen=sheetView==='emergency';
  const nodes=[];
  nodes.push(el('div',{class:'emwarn'},el('b',{text:'This app cannot call for help by itself.'}),el('span',{text:'Call first. Then share your position below. Stay in your vehicle.'})));
  nodes.push(el('a',{class:'emcall big',href:'tel:112'},el('span',{text:'📞 Call 112'}),el('small',{text:'Emergency · free'})));
  nodes.push(el('div',{class:'emgrid'},
    el('a',{class:'emcall'+(k.call==='park'?' suggest':''),href:'tel:+250786182871'},el('span',{text:'🌿 Park'}),el('small',{text:'+250 786 182 871'})),
    el('a',{class:'emcall'+(k.call==='912'?' suggest':''),href:'tel:912'},el('span',{text:'🚑 Ambulance'}),el('small',{text:'912'}))));
  if(c.phone)nodes.push(telLink(c.phone,c.phone,`📱 ${c.name||'My emergency contact'}`,'emrow mine'));
  if(c.otherPhone)nodes.push(telLink(c.otherPhone,c.otherPhone,`🏛️ ${c.other||'Embassy or insurer'}`,'emrow mine'));
  nodes.push(el('p',{class:'lbl',text:'What is the problem?'}));
  nodes.push(el('div',{class:'kinds'},...E.kinds.map(x=>{const b=el('button',{type:'button',class:x.id===k.id?'on':'','aria-pressed':String(x.id===k.id)},el('span',{text:x.icon}),x.label);b.onclick=()=>openEmergency(x.id);return b;})));
  nodes.push(el('p',{class:'lbl',text:'My position'}));
  if(!p){nodes.push(el('div',{class:'locbox'},el('p',{text:'No position yet. The message needs one.'}),el('button',{class:'primary blue',type:'button',onclick:()=>{pendingAfterPos=()=>openEmergency();openSetPos();},text:'Set my position'})));}
  else{
    const msg=emText(k,p),enc=encodeURIComponent(msg),la=p.lat.toFixed(5),lo=p.lon.toFixed(5);
    const src=p.gps?(p.stale>120e3?`Last GPS position, ${ago(Date.now()-p.stale)}. Move on and refresh when you have a fix.`:`GPS, accurate to about ${Math.round(S.gps.acc||20)} m`):'Set by hand. It may be off by up to 1 km, so also read the number on the nearest junction stone.';
    nodes.push(el('div',{class:'posbox'},el('div',{class:'coords',text:`${la}, ${lo}`}),el('p',{text:whereText(p.x,p.y)+'.'}),el('small',{text:src}),
      el('div',{class:'acts'},el('button',{class:'secondary',type:'button',onclick:()=>openEmergency(),text:'↻ Refresh'}),el('button',{class:'secondary',type:'button',onclick:()=>{pendingAfterPos=()=>openEmergency();openSetPos();},text:'Set by hand'}))));
    nodes.push(el('pre',{class:'emmsg',text:msg}));
    nodes.push(el('button',{class:'primary',type:'button',onclick:()=>shareText(msg),text:'📤 Share my position'}));
    nodes.push(el('div',{class:'acts'},
      el('a',{class:'secondary',href:'https://wa.me/?text='+enc,target:'_blank',rel:'noopener',text:'WhatsApp'}),
      el('a',{class:'secondary',href:`sms:${c.phone||''}?&body=${enc}`,text:c.phone?`SMS ${c.name||'contact'}`:'SMS'}),
      el('button',{class:'secondary',type:'button',onclick:()=>copyText(msg),text:'Copy'})));
    if(k.warn){const sent=EM.sent&&allReports().some(r=>r.id===EM.sent&&alive(r));
      nodes.push(sent?el('div',{class:'acts'},el('div',{class:'secondary ok',style:'flex:2',text:'✓ Nearby drivers are warned'}),el('button',{class:'secondary no',type:'button',onclick:cancelWarn,text:'Cancel alert'}))
        :el('button',{class:'secondary sosbtn',type:'button',onclick:warnDrivers,text:'🆘 Warn other drivers using this app'}));
      nodes.push(el('p',{class:'fine',text:S.fs?'Shows a red pin on everyone\'s map and in the park chat. It does not alert rescue services.':'You are not connected to the shared database, so only this phone would see the pin.'}));}
  }
  nodes.push(el('p',{class:'lbl',text:'While you wait'}));
  nodes.push(el('ul',{class:'waitlist'},...E.wait.map(t=>el('li',{text:t}))));
  nodes.push(el('details',{class:'rules'},el('summary',{text:'All emergency numbers'}),
    ...[['Rwanda',E.national],['Akagera and lodges',E.park],['Nearest hospital',E.medical]].flatMap(([t,a])=>[el('p',{class:'lbl',text:t}),...a.map(x=>el('div',{class:'numrow'},telLink(x.n,x.show||x.n,x.name),el('small',{text:x.note})))]),
    el('p',{class:'fine',text:`Numbers checked ${E.checked} (gov.rw, Rwanda National Police, African Parks, lodge listings, UK government medical list). They can change, so confirm the park line when you arrive.`})));
  const nm=el('input',{class:'search',id:'emc-name',maxlength:'30',placeholder:'Name, e.g. Anna (sister)','aria-label':'Emergency contact name'});nm.value=c.name||'';
  const ph=el('input',{class:'search',id:'emc-phone',type:'tel',inputmode:'tel',maxlength:'20',placeholder:'Phone with country code, e.g. +46…','aria-label':'Emergency contact phone'});ph.value=c.phone||'';
  const on=el('input',{class:'search',id:'emc-other',maxlength:'30',placeholder:'Embassy or insurer, e.g. Swedish Embassy','aria-label':'Embassy or insurer name'});on.value=c.other||'';
  const op=el('input',{class:'search',id:'emc-ophone',type:'tel',inputmode:'tel',maxlength:'20',placeholder:'Their phone number','aria-label':'Embassy or insurer phone'});op.value=c.otherPhone||'';
  const savec=()=>{LS.set('emc',{name:nm.value.trim(),phone:ph.value.replace(/[^+\d]/g,''),other:on.value.trim(),otherPhone:op.value.replace(/[^+\d]/g,'')});toast('Saved on this phone only.');openEmergency();};
  nodes.push(el('details',{class:'rules'},el('summary',{text:'My emergency contacts (saved on this phone)'}),el('p',{class:'hint',text:'They appear as call buttons at the top and the SMS goes straight to your contact. Nothing is sent to the shared database.'}),nm,ph,on,op,el('button',{class:'primary',type:'button',onclick:savec,text:'Save contacts'})));
  openSheet('Emergency help',nodes,{view:'emergency'});
  if(reopen)$('sheetBody').scrollTop=top;
}
function warnDrivers(){
  const p=emPos();if(!p){toast('Set your position first.');return;}
  const k=EM.kind,w=emWho(),now=Date.now();
  const note=`${k.label}. ${w?vehLabel(w)+(w.party?', '+w.party:''):''}`.trim().slice(0,200);
  const rec={id:'r'+now.toString(36)+Math.random().toString(36).slice(2,6),kind:'road',type:'sos',sev:'1',lat:+p.lat.toFixed(6),lon:+p.lon.toFixed(6),at:now,lastSeen:now,by:S.device,votes:{},note};
  if(passValid()&&S.fs&&S.fs.uid&&LS.get('showName',true))rec.uid=S.fs.uid;
  saveReport(rec);EM.sent=rec.id;
  if(passValid()&&SOC.profile.chat)sendChat(`🆘 ${k.label}. Can anyone nearby help, or tell the park?`,rec);
  toast(S.fs?'Drivers using the app are warned. Now call the park.':'Saved on this phone only. Call the park now.');
  setTimeout(()=>openEmergency(),50);
}
function cancelWarn(){if(!EM.sent)return;patchReport({id:EM.sent},{votes:{[S.device]:-1}});EM.sent=null;toast('Alert cancelled.');setTimeout(()=>openEmergency(),150);}
const SOSSEEN=new Set();
function checkSOS(){
  const p=myPos();if(!p)return;
  for(const r of allReports()){
    if(r.kind!=='road'||r.type!=='sos'||r.example||r.by===S.device||r.id===EM.sent||SOSSEEN.has(r.id)||!alive(r)||Date.now()-r.at>3*3600e3)continue;
    const q=merc(r.lon,r.lat),d=gd(p.x,p.y,q[0],q[1]);if(d>25000)continue;SOSSEEN.add(r.id);
    toast(`🆘 A driver needs help ${fmtD(d)} ${DIRS[dir8(brg(p.x,p.y,q[0],q[1]))]} of you`,'Open',()=>openReportView(r),14000);
    if(S.nav&&S.set.voice)say('A driver nearby needs help.');
  }
}
$('sosBtn').onclick=()=>openEmergency();$('sosMini').onclick=()=>openEmergency();

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
  const tog=(key,label)=>{const i=el('input',{type:'checkbox',id:'set-'+key});i.checked=!!S.set[key];i.onchange=()=>{S.set[key]=i.checked;saveSet();if(key==='sat')setSat(i.checked);redraw();};return el('label',{class:'toggle',for:'set-'+key},label,i);};
  const cfg=window.AKAGERA_FIREBASE;
  const nodes=[el('button',{class:'secondary sosbtn',type:'button',onclick:()=>openEmergency(),text:'🆘 Emergency help'}),tog('voice','Spoken directions'),tog('tilt','3D view while driving'),tog('speedWarn','Warn me above 40 km/h in the park'),tog('wake','Keep screen on while driving'),tog('sat','Satellite background'),
    el('button',{class:'secondary',type:'button',onclick:()=>{closeSheet();if(S.sim){stopSim();toast('Demo drive stopped.');}else{if(!S.route){toast('Pick a destination with Go first.');return;}startNav();startSim();}},text:S.sim?'Stop demo drive':'Demo drive along the planned route'}),
    el('button',{class:'secondary',type:'button',onclick:()=>{closeSheet();startPick('me');},text:'Set my position by hand'}),
    el('button',{class:'secondary',type:'button',onclick:()=>{S.set.hideEx=!S.set.hideEx;saveSet();closeSheet();redraw();},text:S.set.hideEx?'Show example reports':'Hide example reports'}),
    el('p',{class:'lbl',text:'About the data'}),
    el('p',{class:'fine',text:`Sharing: ${cfg&&cfg.apiKey?'Firebase project '+cfg.projectId+' ('+S.sync+')':'not set up yet, so reports stay on this phone.'}`}),
    el('p',{class:'fine',text:S.layers.osm?`Roads and lakes: OpenStreetMap contributors, updated ${S.osm.meta.generated}.`:'Roads: traced from the park entrance board (detailed OpenStreetMap roads not loaded yet).'}),
    el('p',{class:'fine',text:'Junction stones, ranger posts and fence houses: from the park board, accurate to about 1 km. Satellite: Esri World Imagery. Weather: Open-Meteo.'})];
  openSheet('Settings',nodes,{view:'settings'});
}
$('setBtn').onclick=openSettings;$('meBtn').onclick=()=>openPass();$('chatBtn').onclick=()=>passValid()?openChat('park'):(passExists()?showPass():openPass());$('syncPill').onclick=openSettings;
$('reportBtn').onclick=()=>startReport();$('findBtn').onclick=()=>openFind();$('goBtn').onclick=openGo;

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
  updateWxPill();setSync();updateGpsLine();updateCount();setSat(!!S.set.sat);updateMeBtn();updateChatBadge();
  startGPS();loadWeather();initSharing();loadPhotos();setTimeout(socTick,2500);
  window.addEventListener('online',loadPhotos);
  setInterval(()=>{loadWeather();redraw();updateGpsLine();socTick();},60e3);
  window.addEventListener('online',()=>loadWeather(true));
  // follow GPS in browse mode
  setInterval(()=>{if(!S.nav&&S.follow){const p=myPos();if(p&&p.gps){cam.cx=p.x;cam.cy=p.y;redraw();}}},1000);
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
  if(!S.set.hideEx&&allReports().some(r=>r.example))banner('No live reports yet. Pins marked EXAMPLE are samples.','Hide',()=>{S.set.hideEx=true;saveSet();hideBanner();redraw();},'ex');
  window.AKL=S;window.AKLf={previewRoute,centerOn,route,snap,merc,penalties,roadLife,openWeather,updateWxPill,janitor,socTick,retire,openEmergency,warnDrivers,checkSOS};   // for debugging
}
boot();
