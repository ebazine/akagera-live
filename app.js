/* Reba: sightings, road conditions and GPS navigation for Akagera National Park.
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
const PCOL = {gate:'#C0392B',reception:'#E3A812',hq:'#6E4828',lodge:'#1F5FAE',camp:'#2E7D4F',ranger:'#56626A',fence:'#7A4A99',picnic:'#24407F',lookout:'#D2691E',fuel:'#333',ruins:'#7F8388'};

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
  wx: LS.get('wx', null), lastSync: LS.get('lastSync', 0),
  route:null, nav:null,
  set: Object.assign({voice:true, tilt:true, wake:true, sat:false, hideEx:false, speedWarn:true, closedOk:false, officialOk:true, offOp:.85, nearAlert:true, wxAlerts:true, offline:false}, LS.get('settings', {})),
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
  markOfficial(O);
  const groups={major:[],minor:[],track:[],closed:[],offc:[]};
  if(O&&O.ways&&O.ways.length>20){
    for(const w of O.ways){const g=w.off?'offc':w.a?'closed':MAJOR.has(w.h)?'major':MINOR.has(w.h)?'minor':'track';groups[g].push(w.n.map(i=>[O.nodes[2*i],O.nodes[2*i+1]]));}
  } else groups.track=B.roads;
  L.major=pathOf(groups.major,false);L.minor=pathOf(groups.minor,false);L.track=pathOf(groups.track,false);
  L.closed=groups.closed.length?pathOf(groups.closed,false):null;L.offc=groups.offc.length?pathOf(groups.offc,false):null;
  L.osm=!!(O&&O.ways&&O.ways.length>20);
  // water labels from OSM
  S.waterNames=[];
  if(useOsmWater)for(const w of O.water){if(!w.nm)continue;const r=w.g[0];let sx=0,sy=0;for(const c of r){sx+=c[0];sy+=c[1];}const q=merc(sx/r.length,sy/r.length);S.waterNames.push({name:w.nm,x:q[0],y:q[1],size:r.length});}
  // POIs from board, then OSM
  S.pois=B.pois.map(p=>{const q=merc(p.lon,p.lat);return {name:p.n,short:SHORTN(p.n),cat:p.c,x:q[0],y:q[1],lat:p.lat,lon:p.lon,note:p.note,src:'board',num:p.c==='junction'?+p.n.split(' ').pop():null};});
  for(const p of (S.official&&S.official.pois)||[]){const q=merc(p.lon,p.lat);S.pois.push({name:p.n,short:p.n,cat:p.c,x:q[0],y:q[1],lat:p.lat,lon:p.lon,note:p.note||'',src:'official'});}
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
  S.ix=null;if(L.osm){const ix=osmIndex(O);S.ix=ix;placeJunctions(ix);boardLinks(ix);}
  S.named=S.pois.filter(p=>['lake','area','gate','lodge','camp','lookout','picnic','reception','hill','ruins'].includes(p.cat));
  for(const w of S.waterNames){if(!S.named.some(n=>n.cat==='lake'&&n.name===w.name))S.named.push({name:w.name,short:w.name,cat:'lake',x:w.x,y:w.y});}
  buildGraph();
}

/* the park's official map (2020): which OpenStreetMap tracks it shows as roads, and where it says "no through road" */
function markOfficial(O){
  const F=S.official;if(!F||!O||!O.ways)return;
  const polys=(F.restricted||[]).map(r=>({r,ring:r.poly.map(c=>merc(c[0],c[1]))}));
  for(const w of O.ways){if(w.a==='nt'){delete w.a;delete w.nt;}delete w.off;
    if(w.a||MAJOR.has(w.h))continue;const i=w.n[w.n.length>>1],q=merc(O.nodes[2*i],O.nodes[2*i+1]);
    for(const P of polys)if(inRing(q[0],q[1],P.ring)){w.a='nt';w.nt=P.r.name;}}
  const C=600,grid=new Map(),segs=[];
  for(const r of F.roads||[]){const m=r.map(c=>merc(c[0],c[1]));for(let k=0;k+1<m.length;k++){const a=m[k],b=m[k+1],si=segs.length;segs.push([a,b]);
    for(let gx=Math.floor(Math.min(a[0],b[0])/C);gx<=Math.floor(Math.max(a[0],b[0])/C);gx++)for(let gy=Math.floor(Math.min(a[1],b[1])/C);gy<=Math.floor(Math.max(a[1],b[1])/C);gy++){const key=gx+','+gy;let l=grid.get(key);if(!l)grid.set(key,l=[]);l.push(si);}}}
  const near=(x,y)=>{const cx=Math.floor(x/C),cy=Math.floor(y/C);for(let gx=cx-1;gx<=cx+1;gx++)for(let gy=cy-1;gy<=cy+1;gy++){const l=grid.get(gx+','+gy);if(!l)continue;for(const si of l){const [a,b]=segs[si];if(projSeg(x,y,a[0],a[1],b[0],b[1]).d<350)return true;}}return false;};
  for(const w of O.ways){if(w.a!=='no')continue;let n=0,hit=0;
    for(let k=0;k+1<w.n.length;k++){const a=merc(O.nodes[2*w.n[k]],O.nodes[2*w.n[k]+1]),b=merc(O.nodes[2*w.n[k+1]],O.nodes[2*w.n[k+1]+1]);const m=Math.max(1,Math.round(gd(a[0],a[1],b[0],b[1])/60));
      for(let t=0;t<m;t++){n++;if(near(a[0]+(b[0]-a[0])*t/m,a[1]+(b[1]-a[1])*t/m))hit++;}}
    if(n&&hit/n>=0.6)w.off=1;}
}
/* spatial index over OpenStreetMap road segments: nearest point on a road */
function osmIndex(O){
  const C=500,grid=new Map(),X=[],Y=[],segs=[];const n=O.nodes.length/2;
  for(let i=0;i<n;i++){const q=merc(O.nodes[2*i],O.nodes[2*i+1]);X.push(q[0]);Y.push(q[1]);}
  O.ways.forEach((w,wi)=>{for(let k=0;k+1<w.n.length;k++){const a=w.n[k],b=w.n[k+1];const si=segs.length;segs.push([a,b,w.a?1:0,wi]);
    const x0=Math.floor(Math.min(X[a],X[b])/C),x1=Math.floor(Math.max(X[a],X[b])/C),y0=Math.floor(Math.min(Y[a],Y[b])/C),y1=Math.floor(Math.max(Y[a],Y[b])/C);
    for(let gx=x0;gx<=x1;gx++)for(let gy=y0;gy<=y1;gy++){const key=gx+','+gy;let l=grid.get(key);if(!l)grid.set(key,l=[]);l.push(si);}}});
  // any=true also counts tracks closed to visitors; closedOnly=true counts only those
  const near=(x,y,r,any,closedOnly)=>{let best=null;const cr=Math.ceil(r/KG/C),cx=Math.floor(x/C),cy=Math.floor(y/C),seen=new Set();
    for(let gx=cx-cr;gx<=cx+cr;gx++)for(let gy=cy-cr;gy<=cy+cr;gy++){const l=grid.get(gx+','+gy);if(!l)continue;
      for(const si of l){if(seen.has(si))continue;seen.add(si);const s=segs[si];if(s[2]&&!any&&!closedOnly)continue;if(closedOnly&&!s[2])continue;const p=projSeg(x,y,X[s[0]],Y[s[0]],X[s[1]],Y[s[1]]);if(p.d<=r&&(!best||p.d<best.d))best={d:p.d,x:p.qx,y:p.qy,way:O.ways[s[3]]};}}
    return best;};
  // ways (index and name) passing within r metres, open or closed
  const ways=(x,y,r)=>{const out=new Set();const cr=Math.ceil(r/KG/C),cx=Math.floor(x/C),cy=Math.floor(y/C);
    for(let gx=cx-cr;gx<=cx+cr;gx++)for(let gy=cy-cr;gy<=cy+cr;gy++){const l=grid.get(gx+','+gy);if(!l)continue;
      for(const si of l){const s=segs[si];if(projSeg(x,y,X[s[0]],Y[s[0]],X[s[1]],Y[s[1]]).d<=r){out.add('#'+s[3]);const nm=O.ways[s[3]].nm;if(nm)out.add(nm);}}}
    return out;};
  return {near,ways};
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
    // also mapped when both junction stones sit on the same OpenStreetMap way or named road
    const wa=ix.ways(A.x,A.y,80),wb=ix.ways(B.x,B.y,80);if([...wa].some(k=>wb.has(k)))continue;
    S.links.push({a:k.a,b:k.b,pts,nm:`Track ${k.a}–${k.b}`});A.link=B.link=true;lines.push(pts);
  }
  if(lines.length){const p=new Path2D();for(const l of lines)l.forEach((q,i)=>i?p.lineTo(q[0],q[1]):p.moveTo(q[0],q[1]));S.layers.approx=p;}
}
function buildGraph(){
  const O=S.osm; let X=[],Y=[],ways=[];
  if(O&&O.ways&&O.ways.length>20){
    const n=O.nodes.length/2;for(let i=0;i<n;i++){const q=merc(O.nodes[2*i],O.nodes[2*i+1]);X.push(q[0]);Y.push(q[1]);}
    ways=O.ways.map(w=>({n:w.n,h:w.h,nm:w.nm||(w.nt?'':''),t:w.t,s:w.s,o:w.o==='yes',a:!!w.a,off:!!w.off,nt:w.nt||''}));
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
    if(w.approx||w.a)v=15; w.v=v/3.6; w.inPark=inPark;
    if(w.a&&!(S.set.closedOk||(w.off&&S.set.officialOk!==false)))continue;   // marked closed: routed only if the official park map shows it (or the driver allows closed tracks)
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
  const wet=wetness()+0.6*soonRain(3); const wf=1+Math.min(0.6,wet/30);   // past rain, plus heavy rain expected in the next hours
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
  for(const [si,len] of [[segStart,r.cum[1]||0],[segEnd,k>=1?r.cum[k]-r.cum[k-1]:0]]){const w=G.ways[si[2]];if(w.a&&w.off){r.offLen+=len;if(w.nm&&!r.offNames.includes(w.nm))r.offNames.push(w.nm);}else if(w.a){r.closedLen+=len;if(w.nm&&!r.closedNames.includes(w.nm))r.closedNames.push(w.nm);}}
  return r;
}
/* several stops in a fixed order, joined into one route */
function routeMulti(from,stops){
  const pp=penalties();const legs=[];let cx=from.x,cy=from.y;
  for(const st of stops){const r=route(cx,cy,st.x,st.y,st.name,{pp});if(r.error)return {...r,stop:st};legs.push(r);const e=r.pts[r.pts.length-1];cx=e[0];cy=e[1];}
  if(legs.length===1){legs[0].stops=[{...stops[0],d:legs[0].len}];legs[0].legs=[{len:legs[0].len,time:legs[0].time}];return legs[0];}
  const pts=[],cum=[],instr=[],warn=[],sights=[],via=[],wps=[],aps=[],cn=[],on=[];let off=0,time=0,ioff=0,approxLen=0,closedLen=0,offLen=0;
  legs.forEach((L,k)=>{const skip=k?1:0;for(let i=skip;i<L.pts.length;i++){pts.push(L.pts[i]);cum.push(L.cum[i]+off);aps.push(L.approxSeg?L.approxSeg[i]:0);}approxLen+=L.approxLen||0;closedLen+=L.closedLen||0;offLen+=L.offLen||0;for(const n of L.offNames||[])if(!on.includes(n))on.push(n);for(const n of L.closedNames||[])if(!cn.includes(n))cn.push(n);
    for(const s of L.instr){const o={...s,i:s.i+ioff,d:s.d+off};if(s.type==='arrive'&&k<legs.length-1){o.type='waypoint';o.stop=k+1;o.name=stops[k].name;}if(s.type==='arrive'&&k===legs.length-1){o.stop=k+1;o.name=stops[k].name;}instr.push(o);}
    wps.push({...stops[k],d:L.len+off});
    for(const w of L.warn)if(!warn.includes(w))warn.push(w);for(const w of L.sights)if(!sights.includes(w))sights.push(w);for(const v of L.via)if(!via.includes(v))via.push(v);
    off+=L.len;time+=L.time;ioff=pts.length-1;});
  return {pts,cum,len:off,time,tpm:time/Math.max(1,off),instr,warn,sights,via:via.slice(0,3),destName:stops[stops.length-1].name,dest:[stops[stops.length-1].x,stops[stops.length-1].y],legs:legs.map(L=>({len:L.len,time:L.time})),stops:wps,startOff:legs[0].startOff,endOff:legs[legs.length-1].endOff,start:legs[0].start,approxSeg:Uint8Array.from(aps),approxLen,closedLen,closedNames:cn,offLen,offNames:on};
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
  const approxSeg=new Uint8Array(P.length);let approxLen=0,closedLen=0,offLen=0;const closedNames=new Set(),offNames=new Set();
  for(let i=1;i<P.length;i++){if(!(nodeAt[i-1]>=0))continue;const wi=nextWay(nodeAt[i-1],nodeAt[i]);if(wi==null)continue;const w=G.ways[wi];
    if(w.approx){approxSeg[i]=1;approxLen+=cum[i]-cum[i-1];}if(w.a&&w.off){offLen+=cum[i]-cum[i-1];if(w.nm)offNames.add(w.nm);}else if(w.a){closedLen+=cum[i]-cum[i-1];if(w.nm)closedNames.add(w.nm);}}
  return {pts:P,cum,len,tpm,time:costS,instr:out,warn,sights,via,destName,dest,approxSeg,approxLen,closedLen,closedNames:[...closedNames],offLen,offNames:[...offNames]};
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
const WXPTS=[{n:'north',name:'North (Kilala, Karenge)',lat:-1.45,lon:30.58},{n:'central',name:'Centre (Mutumba, Lake Hago)',lat:-1.66,lon:30.70},{n:'south',name:'South (Lake Ihema, park HQ)',lat:-1.87,lon:30.73}];
const RW=2*3600e3;                                                     // Rwanda time (UTC+2), for the park's opening hours
const rwHour=t=>{const d=new Date(t+RW);return d.getUTCHours()+d.getUTCMinutes()/60;};
async function loadWeather(force){
  if(offlineMode()){updateWxPill();return;}
  if(!force&&S.wx&&S.wx.v===2&&Date.now()-S.wx.fetched<45*60e3)return;
  try{
    const H='precipitation,precipitation_probability,temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,uv_index,is_day';
    const D='weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset,uv_index_max,wind_gusts_10m_max';
    const u=`https://api.open-meteo.com/v1/forecast?latitude=${WXPTS.map(p=>p.lat).join(',')}&longitude=${WXPTS.map(p=>p.lon).join(',')}&hourly=${H}&daily=${D}&past_days=5&forecast_days=7&timeformat=unixtime&timezone=Africa%2FKigali`;
    const r=await fetch(u);if(!r.ok)throw 0;let j=await r.json();if(!Array.isArray(j))j=[j];
    const ms=a=>(a||[]).map(x=>x*1000),num=a=>(a||[]).map(v=>v==null?null:+v);
    S.wx={v:2,fetched:Date.now(),pts:j.map(o=>{const h=o.hourly||{},d=o.daily||{};return {t:ms(h.time),p:(h.precipitation||[]).map(v=>v||0),pp:num(h.precipitation_probability),T:num(h.temperature_2m),wc:num(h.weather_code),w:num(h.wind_speed_10m),g:num(h.wind_gusts_10m),uv:num(h.uv_index),day:num(h.is_day),
      d:{t:ms(d.time),wc:num(d.weather_code),tmax:num(d.temperature_2m_max),tmin:num(d.temperature_2m_min),psum:num(d.precipitation_sum),ppmax:num(d.precipitation_probability_max),rise:ms(d.sunrise),set:ms(d.sunset),uvmax:num(d.uv_index_max),gmax:num(d.wind_gusts_10m_max)}};})};
    LS.set('wx',S.wx);
  }catch(e){}
  updateWxPill();redraw();checkWxAlerts();if(sheetView==='wx')openWeather(true);
}
function wxIdx(lat){let b=0,bd=1e9;WXPTS.forEach((p,i)=>{const d=Math.abs(p.lat-lat);if(d<bd){bd=d;b=i;}});return b;}
function wxPt(lat){return S.wx&&S.wx.pts[wxIdx(lat)];}
function wxHere(){const p=myPos();const lat=p&&inRing(p.x,p.y,S.park)?p.lat:(p&&outsideBy(p)<15000?p.lat:unmerc(cam.cx,cam.cy).lat);return {lat,i:wxIdx(lat),pt:wxPt(lat)};}
function rainSum(pt,t0,t1){if(!pt)return 0;let s=0;for(let i=0;i<pt.t.length;i++){const t=pt.t[i]+3600e3;if(t>t0&&t<=t1)s+=pt.p[i];}return s;}
function lastRain(pt,t0,t1,thr=0.3){if(!pt)return null;let r=null;for(let i=0;i<pt.t.length;i++){const t=pt.t[i]+3600e3;if(t>t0&&t<=t1&&pt.p[i]>=thr)r=t;}return r;}
function wetness(){if(!S.wx)return 0;const now=Date.now();return Math.max(...S.wx.pts.map(pt=>rainSum(pt,now-24*3600e3,now)));}
function soonRain(h=3){if(!S.wx)return 0;const now=Date.now();return Math.max(...S.wx.pts.map(pt=>rainSum(pt,now,now+h*3600e3)));}
/* weather codes (WMO) to words and pictures */
function wmo(c,day=1){c=+c;
  if(c===0)return [day?'☀️':'🌙','Clear'];if(c===1)return [day?'🌤️':'🌙','Mostly clear'];if(c===2)return ['⛅','Partly cloudy'];if(c===3)return ['☁️','Cloudy'];
  if(c===45||c===48)return ['🌫️','Fog'];if(c>=51&&c<=57)return ['🌦️','Drizzle'];if(c===61||c===80)return ['🌦️','Light rain'];if(c===63||c===81)return ['🌧️','Rain'];
  if(c===65||c===82||c===66||c===67)return ['🌧️','Heavy rain'];if(c>=71&&c<=77)return ['🌨️','Hail or sleet'];if(c===95)return ['⛈️','Thunderstorm'];if(c===96||c===99)return ['⛈️','Thunderstorm with hail'];return ['🌡️','—'];}
function hourIdx(pt,t){if(!pt||!pt.t.length)return -1;let i=-1;for(let k=0;k<pt.t.length;k++){if(pt.t[k]<=t)i=k;else break;}return i;}
function wxAt(pt,t){const i=hourIdx(pt,t);if(i<0||!pt.T)return null;return {i,t:pt.t[i],T:pt.T[i],wc:pt.wc[i],p:pt.p[i],pp:pt.pp[i],w:pt.w[i],g:pt.g[i],uv:pt.uv[i],day:pt.day[i]!==0};}
function dayAt(pt,t){if(!pt||!pt.d||!pt.d.t.length)return null;let i=-1;for(let k=0;k<pt.d.t.length;k++)if(pt.d.t[k]<=t+1)i=k;if(i<0)return null;const d=pt.d;return {i,t:d.t[i],wc:d.wc[i],tmax:d.tmax[i],tmin:d.tmin[i],psum:d.psum[i],ppmax:d.ppmax[i],rise:d.rise[i],set:d.set[i],uvmax:d.uvmax[i],gmax:d.gmax[i]};}
/* storms and heavy rain in a time window */
function wxRisks(pt,t0,t1){const out=[];if(!pt||!pt.wc)return out;
  for(let i=0;i<pt.t.length;i++){const t=pt.t[i];if(t+3600e3<=t0||t>t1)continue;const wc=pt.wc[i],p=pt.p[i]||0,pp=pt.pp[i]||0;
    const kind=wc>=95?'storm':(p>=4||wc===65||wc===82)?'heavy':(pp>=60&&p>=0.8)?'rain':null;if(kind)out.push({t,kind,p,pp,wc});}
  return out;}
function riskText(rs){if(!rs.length)return '';const k=rs.some(r=>r.kind==='storm')?'storm':rs.some(r=>r.kind==='heavy')?'heavy':'rain';
  const a=rs[0].t,b=rs[rs.length-1].t+3600e3,pp=Math.max(...rs.map(r=>r.pp||0));
  return {kind:k,icon:k==='storm'?'⛈️':'🌧️',word:k==='storm'?'Thunderstorms likely':k==='heavy'?'Heavy rain likely':'Rain likely',span:`${hhmm(a)}–${hhmm(b)}`,a,b,pp};}
function lightningAdvice(){const t=carSet().type;return t==='open'?'An open safari vehicle gives no lightning protection: head for a lodge, campsite building or a hard-top vehicle, and keep away from lone trees and water.':'A hard-top vehicle is a safe place in lightning: stay inside with the windows up, and do not stand outside, under lone trees or by the water.';}
/* road problems: how long they last after rain */
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
function trackState(pt){const now=Date.now();const lr=lastRain(pt,now-5*864e5,now);if(!lr)return {txt:'Dry',cls:'dry'};const mud=RD.mud[3];const mm=rainSum(pt,lr-48*3600e3,lr);const until=lr+Math.min(mud.cap,mud.dry+mud.perMm*mm)*3600e3;
  return until<now?{txt:'Dry',cls:'dry'}:mm>=10?{txt:'Muddy',cls:'mud',until}:{txt:'Damp',cls:'damp',until};}
function updateWxPill(){
  const p=$('wxPill'),t=$('wxText'),ic=p.querySelector('.wxi');if(!S.wx){t.textContent='–';return;}
  const now=Date.now(),{pt}=wxHere(),w=pt&&S.wx.v===2?wxAt(pt,now):null;
  const soon=pt?Math.max(0,...(pt.pp||[]).filter((v,i)=>pt.t[i]>=now-3600e3&&pt.t[i]<now+3*3600e3).map(v=>v||0)):0;
  const risk=pt?riskText(wxRisks(pt,now,now+3*3600e3)):'';
  p.classList.toggle('wet',!!risk||soon>=60||wetness()>=3);p.classList.toggle('stale',now-S.wx.fetched>3*3600e3);
  if(w){const [i]=wmo(w.wc,w.day);ic.textContent=risk&&risk.kind==='storm'?'⛈️':i;t.textContent=`${Math.round(w.T)}°${soon>=40?` ${Math.round(soon/10)*10}%`:''}`;}
  else{ic.textContent='☁';const r24=wetness(),next=Math.max(...S.wx.pts.map(q=>rainSum(q,now,now+6*3600e3)));t.textContent=r24>=0.5?`${r24.toFixed(r24<10?1:0)} mm`:next>=1?'Rain soon':'Dry';}
  p.setAttribute('aria-label',`Weather${w?`: ${wmo(w.wc,w.day)[1]}, ${Math.round(w.T)} degrees`:''}`);
}
/* a warning when a storm or heavy rain is coming in the next 3 hours */
function checkWxAlerts(){
  if(!S.wx||S.wx.v!==2||S.set.wxAlerts===false)return;const now=Date.now(),{pt,i}=wxHere();const rs=wxRisks(pt,now,now+3*3600e3).filter(r=>r.kind!=='rain');if(!rs.length)return;
  const R=riskText(rs),key=`${i}|${R.kind}|${new Date(R.a+RW).toISOString().slice(0,13)}`,seen=LS.get('wxSeen',{});if(seen[key])return;
  seen[key]=now;for(const k in seen)if(now-seen[k]>864e5)delete seen[k];LS.set('wxSeen',seen);
  const msg=`${R.icon} ${R.word} ${R.a<=now?'now':'from '+hhmm(R.a)} in the ${WXPTS[i].n} of the park.`;
  toast(msg,'Details',()=>openWeather(),9000);try{navigator.vibrate&&navigator.vibrate([200,100,200]);}catch(e){}
  if(S.nav)say(`${R.word} ${R.a<=now?'now':'from '+hhmm(R.a)}. ${R.kind==='storm'?'Stay in your vehicle.':'Tracks will get slippery.'}`);
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
  const ver={};if(d.ver&&typeof d.ver==='object')for(const k in d.ver){const v=d.ver[k];if(v&&typeof v==='object'&&+v.t>1.6e12)ver[String(k).slice(0,60)]={t:+v.t,d:clamp(+v.d||0,0,5000),n:typeof v.n==='string'?v.n.slice(0,60):''};}
  return {id:String(id),kind,type,lat,lon,at,lastSeen:+d.lastSeen>at?+d.lastSeen:at,
    count:COUNTS.includes(d.count)?d.count:null,act:ACTS.includes(d.act)?d.act:null,
    heading:Number.isInteger(d.heading)&&d.heading>=-1&&d.heading<8?d.heading:null,
    rdist:ROADDIST.includes(d.rdist)?d.rdist:null,sev:['1','2','3'].includes(d.sev)?d.sev:null,
    note:typeof d.note==='string'?d.note.slice(0,200):'',by:typeof d.by==='string'?d.by.slice(0,60):'',uid:typeof d.uid==='string'?d.uid.slice(0,64):'',votes,ver,pending:!!d.pending,example:!!d.example};
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
    S.fs={F,db,uid:null};if(S.set.offline)F.disableNetwork(db).catch(()=>{});
    S.fs.authReady=import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`).then(AU=>{const auth=AU.getAuth(app);S.fs.AU=AU;S.fs.auth=auth;
      AU.onAuthStateChanged(auth,u=>{S.fs.uid=u?u.uid:null;if(u&&passValid())startSocial();else if(!u){endSocial();grStop();}if(u){setTimeout(socTick,1500);grStart();}});}).catch(()=>{});
    const q=F.query(F.collection(db,'reports'),F.where('at','>',Date.now()-14*864e5),F.orderBy('at','desc'),F.limit(600));
    F.onSnapshot(q,{includeMetadataChanges:true},snap=>{
      S.live=snap.docs.map(d=>{const o=clean(d.id,d.data());if(o)o.pending=d.metadata.hasPendingWrites;return o;}).filter(Boolean);
      S.sync=snap.metadata.fromCache?'offline':'live';if(!snap.metadata.fromCache){S.lastSync=Date.now();LS.set('lastSync',S.lastSync);}if(S.live.length)hideBanner();setSync();redraw();refreshSheet();checkSOS();checkNear(true);checkScouted();
    },err=>{S.sync='error';setSync();});
  }catch(e){S.sync='local';setSync();}
}
function setSync(){
  const p=$('syncPill'),t=p.querySelector('span');p.className='pill';
  const pend=allReports().filter(r=>r.pending).length;
  if(S.set.offline){p.classList.add('off','mode');t.textContent=pend?`${pend} waiting`:'Offline';return;}
  if(!navigator.onLine&&S.sync!=='local'){p.classList.add('off');t.textContent=pend?`${pend} waiting`:'No signal';return;}
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
async function patchReport(r,patch,opt={}){
  let ok=true;const MAPS=['votes','ver'];
  if(S.fs&&!r.example){const {F,db}=S.fs;const flat={};for(const k in patch){if(MAPS.includes(k)){for(const v in patch[k])flat[k+'.'+v]=patch[k][v];}else flat[k]=patch[k];}
    try{await F.updateDoc(F.doc(db,'reports',r.id),flat);}catch(e){ok=false;if(!opt.quiet)toast('Could not send. It will not be saved until you have signal.');}}
  else {const o=S.local.find(x=>x.id===r.id);if(o){for(const k of MAPS)if(patch[k])o[k]=Object.assign(o[k]||{},patch[k]);for(const k in patch)if(!MAPS.includes(k))o[k]=patch[k];LS.set('local',S.local);}}
  redraw();refreshSheet();return ok;
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
  if(offlineMode())return;
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
  S.life[id]={t:had?had.t:Date.now(),how};LS.set('life',S.life);updateCount();setTimeout(()=>lbPublish(),50);
  const before=earnedBadges().map(b=>b.id);setTimeout(()=>{const nb=earnedBadges().filter(b=>!before.includes(b.id));for(const b of nb)setTimeout(()=>toast(`Badge earned: ${b.icon} ${b.name} +${b.bonus} points`),5200);},10);
  return had?null:(POINTS[sp.rarity]||0);}
function untick(id){delete S.life[id];LS.set('life',S.life);updateCount();setTimeout(()=>lbPublish(),50);}
function updateCount(){const c=$('lifeCount');if(c)c.textContent=`${LISTED.filter(x=>has(x.id)).length}/${LISTED.length}`;}
const has=id=>!!S.life[id];
function earnedBadges(){return window.BADGES.filter(b=>b.need.every(group=>group.some(has)));}
function score(){let pts=0,n=0;for(const x of LISTED){if(has(x.id)){pts+=POINTS[x.rarity]||0;n++;}}const badges=earnedBadges();for(const b of badges)pts+=b.bonus;
  const nver=Object.keys(S.myVer||{}).length,nsc=Object.keys(S.myScouted||{}).length;pts+=5*nver+3*nsc;
  let lv=window.LEVELS[0],next=null;for(let i=0;i<window.LEVELS.length;i++){if(pts>=window.LEVELS[i][0]){lv=window.LEVELS[i];next=window.LEVELS[i+1]||null;}}
  return {pts,n,total:LISTED.length,badges,lv,next,nver,nsc};}

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
  updateSpeed();updateGpsLine();checkNear();redraw();
}
let lastSpeedWarn=0;
function updateSpeed(){
  const g=S.gps,b=$('speedBox');const fresh=g.ok&&Date.now()-g.t<10e3;const kmh=fresh?Math.round((g.speed||0)*3.6):0;
  const show=S.nav||(fresh&&kmh>=5&&!S.preview);b.hidden=!show;if(!show)return;
  $('speedVal').textContent=kmh;const inPark=inRing(g.x,g.y,S.park);
  const over=S.set.speedWarn&&inPark&&kmh>40;b.classList.toggle('over',over);
  if(over&&Date.now()-lastSpeedWarn>90e3){lastSpeedWarn=Date.now();if(carSet().role==='passenger')say(`The vehicle is above 40. That is the park limit.`);else say(`Slow down. The speed limit is 40.`);try{navigator.vibrate&&navigator.vibrate([200,100,200]);}catch(e){}toast(carSet().role==='passenger'?`Your vehicle: ${kmh} km/h. The park limit is 40.`:`Slow down: ${kmh} km/h. The park limit is 40.`);}
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
function tile(z,x,y){const k=z+'/'+x+'/'+y;let t=tiles.get(k);if(t){t.used=Date.now();return t.ok?t.img:null;}   // offline: the service worker answers from saved tiles
  const img=new Image();img.crossOrigin='anonymous';t={img,ok:false,used:Date.now()};tiles.set(k,t);
  img.onload=()=>{t.ok=true;redraw();};img.onerror=()=>{setTimeout(()=>tiles.delete(k),60e3);};img.src=`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
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
  else if(cat==='ruins'){ctx.fillRect(x-5*u,y-1*u,2.6*u,6*u);ctx.fillRect(x-1.3*u,y-4.5*u,2.6*u,9.5*u);ctx.fillRect(x+2.4*u,y+1.5*u,2.6*u,3.5*u);ctx.fillRect(x-6*u,y+4.5*u,12*u,1.6*u);}
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
  if(r.ver&&Object.keys(r.ver).length){const bx=x-R+3,by=y-R+3;ctx.beginPath();ctx.arc(bx,by,8.5,0,7);ctx.fillStyle='#1E8E4E';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff';ctx.stroke();
    ctx.beginPath();ctx.moveTo(bx-3.8,by+.2);ctx.lineTo(bx-1,by+3);ctx.lineTo(bx+4,by-2.8);ctx.lineWidth=2.3;ctx.strokeStyle='#fff';ctx.stroke();}
  const tl=r.example?'EXAMPLE':r.pending?'SENDING':hhmm(r.lastSeen||r.at);
  ctx.font='700 11.5px Barlow,sans-serif';const w=ctx.measureText(tl).width+10;ctx.fillStyle=r.example?'#6B5200':r.pending?'#1E3A24':'rgba(26,34,25,.88)';ctx.beginPath();ctx.roundRect(x-w/2,y+R+3,w,16,8);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.fillText(tl,x,y+R+11.5);
  ctx.restore();
}
/* ---------- your vehicle and avatar on the map ---------- */
const VEHICLES=[['suv','4x4 / SUV','Prado, Land Cruiser, RAV4'],['open','Open safari vehicle','Game-drive vehicle'],['van','Pop-top safari van','Tour van with a lifting roof'],
  ['pickup','Pickup','Double cab'],['car','Car','Saloon or hatchback'],['bus','Minibus','Coaster or tour bus']];
const CARCOL={White:'#F2F2EF',Silver:'#C2C7CD',Grey:'#7C848B',Black:'#2B2E33',Green:'#5F6F3B',Beige:'#D6C397',Blue:'#2F62A6',Red:'#B5322B',Other:'#D9772E'};
const AVBG=['#2E7D4F','#2369B0','#B5322B','#7A4FB0','#D9772E','#2B2E33'];
function carSet(){return Object.assign({type:'suv',color:'White',role:'driver',model:'',tag:'',av:'emoji',emoji:(SOC.profile&&SOC.profile.emoji)||'🦁',initials:'',avbg:'#2E7D4F'},S.set.car||{});}
function saveCar(patch){S.set.car=Object.assign(carSet(),patch);saveSet();redraw();}
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=(n>>8)&255,b=n&255;const t=f<0?0:255,p=Math.abs(f);r=Math.round((t-r)*p+r);g=Math.round((t-g)*p+g);b=Math.round((t-b)*p+b);return `rgb(${r},${g},${b})`;}
const VDIM={suv:[22,44],open:[23,46],van:[22,48],pickup:[22,48],car:[19,40],bus:[24,58]};
/* top-down vehicle, front up, centred on 0,0 */
function paintVehicle(g,type,col){
  const [w,l]=VDIM[type]||VDIM.suv,hw=w/2,hl=l/2,c=CARCOL[col]||CARCOL.White,dk=shade(c,-.35),lt=shade(c,.28),glass='#24313C',glassHi='rgba(255,255,255,.28)';
  const rr=(x,y,ww,hh,r)=>{g.beginPath();g.roundRect(x,y,ww,hh,r);};
  const glassT=(y0,y1,inset0,inset1)=>{g.beginPath();g.moveTo(-hw+inset0,y0);g.lineTo(hw-inset0,y0);g.lineTo(hw-inset1,y1);g.lineTo(-hw+inset1,y1);g.closePath();g.fillStyle=glass;g.fill();g.beginPath();g.moveTo(-hw+inset0+2,y0+.8);g.lineTo(-hw+inset0+5,y0+.8);g.lineTo(-hw+inset1+3,y1-.8);g.lineTo(-hw+inset1+1.5,y1-.8);g.closePath();g.fillStyle=glassHi;g.fill();};
  // shadow and wheels
  g.save();g.shadowColor='rgba(0,0,0,.38)';g.shadowBlur=7;g.shadowOffsetY=3;rr(-hw,-hl,w,l,type==='bus'?4:6);g.fillStyle=c;g.fill();g.restore();
  g.fillStyle='#1B1D20';const wy=type==='bus'?[-hl+9,hl-10]:[-hl+10,hl-11];for(const y of wy)for(const s of[-1,1]){rr(s>0?hw-1.5:-hw-2.5,y-4.5,4,9,1.5);g.fill();}
  rr(-hw,-hl,w,l,type==='bus'?4:6);g.fillStyle=c;g.fill();g.lineWidth=1.3;g.strokeStyle=dk;g.stroke();
  // lights and mirrors
  g.fillStyle='#FFF4C2';for(const s of[-1,1]){rr(s*(hw-6)-2.5,-hl+.8,5,2.2,1);g.fill();}
  g.fillStyle='#C7372F';for(const s of[-1,1]){rr(s*(hw-5)-2,hl-2.6,4,1.8,.8);g.fill();}
  g.fillStyle=dk;const my={suv:-8,open:-11,van:-14,pickup:-9,car:-6,bus:-26}[type]||-8;for(const s of[-1,1]){rr(s>0?hw-.5:-hw-2.5,my,3,2.4,1);g.fill();}
  if(type==='suv'){g.strokeStyle=dk;g.lineWidth=.9;g.beginPath();g.moveTo(-hw+3,-10.5);g.quadraticCurveTo(0,-12,hw-3,-10.5);g.stroke();
    glassT(-10,-4.5,2.2,3);rr(-hw+3,-4.5,w-6,18,3);g.fillStyle=lt;g.fill();g.strokeStyle=dk;g.lineWidth=.8;for(const y of[-1,3.5,8])g.beginPath(),g.moveTo(-hw+4.5,y),g.lineTo(hw-4.5,y),g.stroke();
    glassT(17.5,13.5,3,2.4);g.beginPath();g.arc(0,hl+1.5,4.2,0,7);g.fillStyle='#1B1D20';g.fill();g.beginPath();g.arc(0,hl+1.5,1.8,0,7);g.fillStyle='#777';g.fill();}
  else if(type==='open'){g.beginPath();g.arc(0,-hl+7.5,4.6,0,7);g.fillStyle='#1B1D20';g.fill();g.beginPath();g.arc(0,-hl+7.5,2,0,7);g.fillStyle='#777';g.fill();
    rr(-hw+2,-hl+13,w-4,2.4,1);g.fillStyle=glass;g.fill();
    for(const y of[-6,1.5,9,16.5]){rr(-hw+2.5,y,w-5,5,1.8);g.fillStyle='#5A4535';g.fill();rr(-hw+2.5,y+3.4,w-5,1.6,.8);g.fillStyle='#3F3026';g.fill();}
    g.strokeStyle='rgba(235,224,190,.95)';g.lineWidth=1.6;rr(-hw+1.6,-hl+16,w-3.2,l-19,2);g.stroke();for(const y of[-2,5.5,13])g.beginPath(),g.moveTo(-hw+1.6,y),g.lineTo(hw-1.6,y),g.stroke();}
  else if(type==='van'){glassT(-hl+6.5,-hl+11.5,2,2.6);rr(-hw+2.6,-hl+11.5,w-5.2,l-15,2.5);g.fillStyle=lt;g.fill();
    g.fillStyle=glass;for(const s of[-1,1])rr(s>0?hw-2.6:-hw+1.2,-hl+13,1.4,l-19,.6),g.fill();
    rr(-hw+4.5,-hl+15,w-9,l-22,1.5);g.fillStyle='#EFE8D4';g.fill();g.strokeStyle='#B9AE8E';g.lineWidth=.8;g.stroke();for(let y=-hl+18;y<hl-8;y+=4)g.beginPath(),g.moveTo(-hw+5.5,y),g.lineTo(hw-5.5,y),g.stroke();
    glassT(hl-4.5,hl-2,3.2,3);}
  else if(type==='pickup'){g.strokeStyle=dk;g.lineWidth=.9;g.beginPath();g.moveTo(-hw+3,-11.5);g.quadraticCurveTo(0,-13,hw-3,-11.5);g.stroke();
    glassT(-11,-6,2.2,3);rr(-hw+3,-6,w-6,11,2.5);g.fillStyle=lt;g.fill();glassT(5,7.5,3,3.4);
    rr(-hw+2.4,9.5,w-4.8,hl-11.5,1.5);g.fillStyle=shade(c,-.42);g.fill();g.strokeStyle=shade(c,-.55);g.lineWidth=.7;for(let x=-hw+5.5;x<hw-3;x+=3.5)g.beginPath(),g.moveTo(x,11),g.lineTo(x,hl-3.5),g.stroke();}
  else if(type==='car'){g.strokeStyle=dk;g.lineWidth=.9;g.beginPath();g.moveTo(-hw+2.5,-8.5);g.quadraticCurveTo(0,-10,hw-2.5,-8.5);g.stroke();
    glassT(-8.5,-3,2,3.2);rr(-hw+3.2,-3,w-6.4,11,3);g.fillStyle=lt;g.fill();glassT(12,8,3.4,2.4);g.beginPath();g.moveTo(-hw+3,14.5);g.lineTo(hw-3,14.5);g.stroke();}
  else if(type==='bus'){glassT(-hl+1.5,-hl+6,1.5,1.8);rr(-hw+2,-hl+6.5,w-4,l-9,2);g.fillStyle=lt;g.fill();
    g.fillStyle=glass;for(const s of[-1,1])rr(s>0?hw-2:-hw+.8,-hl+8,1.2,l-14,.5),g.fill();
    rr(-5,-6,10,13,2);g.fillStyle='#D9DCDF';g.fill();g.strokeStyle='#9AA0A6';g.lineWidth=.8;g.stroke();for(let y=-hl+11;y<hl-5;y+=6){if(y>-8&&y<9)continue;g.beginPath();g.moveTo(-4,y);g.lineTo(4,y);g.stroke();}
    glassT(hl-3.5,hl-1.2,3,3);}
}
let avImgCache={src:null,img:null};
function avatarImg(){const src=LS.get('avPhoto',null);if(!src)return null;if(avImgCache.src!==src){const im=new Image();im.onload=()=>redraw();im.src=src;avImgCache={src,img:im};}const im=avImgCache.img;return im.complete&&im.naturalWidth?im:null;}
function paintAvatar(g,x,y,r,car,ring){
  if(car.av==='none')return;
  g.save();g.shadowColor='rgba(0,0,0,.3)';g.shadowBlur=6;g.shadowOffsetY=2;
  g.beginPath();g.moveTo(x-6,y+r-3);g.lineTo(x,y+r+7);g.lineTo(x+6,y+r-3);g.closePath();g.fillStyle='#fff';g.fill();
  g.beginPath();g.arc(x,y,r+2.5,0,7);g.fillStyle=ring||'#fff';g.fill();g.restore();
  g.save();g.beginPath();g.arc(x,y,r,0,7);g.clip();
  const im=car.av==='photo'?avatarImg():null;
  if(im){const sq=Math.min(im.naturalWidth,im.naturalHeight);g.drawImage(im,(im.naturalWidth-sq)/2,(im.naturalHeight-sq)/2,sq,sq,x-r,y-r,2*r,2*r);}
  else if(car.av==='initials'&&car.initials){g.fillStyle=car.avbg||'#2E7D4F';g.fillRect(x-r,y-r,2*r,2*r);g.fillStyle='#fff';g.font=`800 ${Math.round(r*(car.initials.length>2?.78:.95))}px Barlow,Arial,sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText(car.initials,x,y+1);}
  else{g.fillStyle='#FFF8E6';g.fillRect(x-r,y-r,2*r,2*r);g.font=`${Math.round(r*1.25)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#000';g.fillText(car.emoji||'🦁',x,y+1.5);}
  g.restore();
}
/* ---------- 3D vehicle while driving: drawn upright on top of the tilted map ---------- */
const W2=(w,l)=>({w,l});
const CAR3D={   // parts in metres: [x0,x1, y0,y1, z0,z1] with x right, y forward, z up
  suv:[{b:[-.95,.95,-2.4,2.4,.32,1.12],c:'body'},{b:[-.85,.85,-1.9,1.05,1.12,1.82],c:'cab'},{b:[-.72,-.62,-1.7,.85,1.82,1.92],c:'dark'},{b:[.62,.72,-1.7,.85,1.82,1.92],c:'dark'},{b:[-.72,.72,-1.2,-1.1,1.82,1.9],c:'dark'},{b:[-.72,.72,.2,.3,1.82,1.9],c:'dark'},{b:[-.38,.38,-2.62,-2.4,.55,1.25],c:'dark'}],
  open:[{b:[-1,1,-2.45,2.45,.32,1.05],c:'body'},{b:[-.95,.95,.92,1.02,1.05,1.6],c:'glass'},{b:[-.9,.9,.15,.7,1.05,1.35],c:'seat'},{b:[-.9,.9,-.65,-.1,1.05,1.5],c:'seat'},{b:[-.9,.9,-1.45,-.9,1.05,1.65],c:'seat'},
    {b:[-1,-.92,.85,.95,1.05,2.15],c:'dark'},{b:[.92,1,.85,.95,1.05,2.15],c:'dark'},{b:[-1,-.92,-2.25,-2.15,1.05,2.15],c:'dark'},{b:[.92,1,-2.25,-2.15,1.05,2.15],c:'dark'},
    {b:[-1.02,1.02,-2.25,.95,2.15,2.22],c:'canvas'},{b:[-.35,.35,1.5,2.2,1.05,1.22],c:'dark'}],
  van:[{b:[-.95,.95,-2.5,2.5,.32,1.15],c:'body'},{b:[-.95,.95,-2.45,1.45,1.15,1.95],c:'cab'},{b:[-.8,.8,-1.9,.8,1.95,2.32],c:'cream'}],
  pickup:[{b:[-.95,.95,-2.65,2.65,.32,1.12],c:'body'},{b:[-.88,.88,-.3,1.3,1.12,1.85],c:'cab'},{b:[-.85,.85,-2.55,-.35,1.12,1.14],c:'dark'},
    {b:[-.95,.95,-2.65,-2.55,1.12,1.42],c:'body'},{b:[-.95,-.85,-2.6,-.35,1.12,1.42],c:'body'},{b:[.85,.95,-2.6,-.35,1.12,1.42],c:'body'}],
  car:[{b:[-.9,.9,-2.2,2.2,.28,.88],c:'body'},{b:[-.8,.8,-1.15,.95,.88,1.42],c:'cab'}],
  bus:[{b:[-1.15,1.15,-3.5,3.5,.4,1.4],c:'body'},{b:[-1.15,1.15,-3.45,3.45,1.4,2.45],c:'cab'},{b:[-.5,.5,-.8,.8,2.45,2.65],c:'cream'}]};
function car3dParts(type){
  const base=CAR3D[type]||CAR3D.suv;let x1=0,y1=0;for(const p of base){x1=Math.max(x1,p.b[1]);y1=Math.max(y1,p.b[3]);}
  const out=[];const wy=y1-1.05,wx=x1-.08;
  for(const sx of[-1,1])for(const sy of[-1,1])out.push({b:[sx<0?-wx-.06:wx-.24,sx<0?-wx+.24:wx+.06,sy*wy-.38,sy*wy+.38,0,.74],c:'tyre'});
  out.push(...base);
  for(const sx of[-1,1]){out.push({b:[sx<0?-x1+.1:x1-.42,sx<0?-x1+.42:x1-.1,y1-.02,y1+.03,.78,.95],c:'light'});out.push({b:[sx<0?-x1:x1-.26,sx<0?-x1+.26:x1,-y1-.03,-y1+.02,.78,1.02],c:'tail'});}
  return {parts:out,len:2*y1,top:Math.max(...base.map(p=>p.b[5]))};
}
const C3={cv:null,g:null,on:false};
function car3dCtx(){if(!C3.cv){C3.cv=$('car3d');C3.g=C3.cv.getContext('2d');}const c=C3.cv,d=Math.min(window.devicePixelRatio||1,2),w=Math.round(c.clientWidth*d),h=Math.round(c.clientHeight*d);if(c.width!==w||c.height!==h){c.width=w;c.height=h;}C3.d=d;return C3.g;}
function clear3D(){if(!C3.on)return;const g=car3dCtx();g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,C3.cv.width,C3.cv.height);C3.on=false;}
/* where a point of the map canvas (plus a height towards the viewer) ends up on screen after the CSS tilt */
function tiltProjector(){
  const tb=$('tiltbox'),st=getComputedStyle(tb).transform,w=tb.offsetWidth,h=tb.offsetHeight,ox=w/2,oy=h,L=tb.offsetLeft,T=tb.offsetTop;
  const M=st&&st!=='none'?new DOMMatrix(st):null;
  return (x,y,z)=>{if(!M)return [L+x,T+y-z*.5,z];const p=M.transformPoint(new DOMPoint(x-ox,y-oy,z,1));return [L+ox+p.x/p.w,T+oy+p.y/p.w,p.z/p.w];};
}
function tint(hex,k){const n=parseInt(hex.slice(1),16);const f=v=>Math.max(0,Math.min(255,Math.round(v*k)));return `rgb(${f(n>>16)},${f((n>>8)&255)},${f(n&255)})`;}
function draw3D(cx,cy,psi,gpsMode){
  const g=car3dCtx(),d=C3.d;g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,C3.cv.width,C3.cv.height);g.setTransform(d,0,0,d,0,0);C3.on=true;
  const car=carSet(),{parts,len,top}=car3dParts(car.type),u=Math.min(19,96/len),proj=tiltProjector(),cs=Math.cos(psi),sn=Math.sin(psi);
  const P=(x,y,z)=>proj(cx+u*(x*cs+y*sn),cy+u*(x*sn-y*cs),z*u);
  const body=CARCOL[car.color]||CARCOL.White,COL={body,glass:'#34495A',dark:'#1D1F22',tyre:'#151618',light:'#FFF1B8',tail:'#D3352C',canvas:'#E6D9B2',seat:'#5A4535',cream:'#EFE8D4'};
  // shadow
  const sh=[[-1.25,-len/2-.3],[1.25,-len/2-.3],[1.25,len/2+.3],[-1.25,len/2+.3]].map(([x,y])=>P(x+.25,y-.25,0));
  g.beginPath();sh.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fillStyle='rgba(0,0,0,.22)';g.filter='blur(3px)';g.fill();g.filter='none';
  const LV=[-.35,-.55,.76],faces=[];
  for(const part of parts){const [x0,x1,y0,y1,z0,z1]=part.b;
    const C=[[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],Q=C.map(c=>P(c[0],c[1],c[2]));
    for(const [a,b,c2,e,n,kind] of [[4,5,6,7,[0,0,1],'top'],[0,1,5,4,[0,-1,0],'back'],[2,3,7,6,[0,1,0],'front'],[1,2,6,5,[1,0,0],'side'],[3,0,4,7,[-1,0,0],'side']]){
      const m=[(C[a][0]+C[c2][0])/2,(C[a][1]+C[c2][1])/2,(C[a][2]+C[c2][2])/2],p0=P(m[0],m[1],m[2]),p1=P(m[0]+n[0]*.3,m[1]+n[1]*.3,m[2]+n[2]*.3);
      if(p1[2]<=p0[2]+1e-4)continue;                       // faces turned away from the viewer
      const nw=[n[0]*cs+n[1]*sn,n[0]*sn-n[1]*cs,n[2]],lit=.6+.42*Math.max(0,nw[0]*LV[0]+nw[1]*LV[1]+nw[2]*LV[2]);
      let c=part.c==='cab'?(kind==='top'?body:COL.glass):COL[part.c]||body;
      faces.push({q:[Q[a],Q[b],Q[c2],Q[e]],z:(Q[a][2]+Q[b][2]+Q[c2][2]+Q[e][2])/4+(part.c==='light'||part.c==='tail'?.5:0),fill:tint(c.startsWith('#')?c:'#888888',kind==='top'?Math.min(1.12,lit+.08):lit),glow:part.c==='tail'||part.c==='light'});}}
  faces.sort((a,b)=>a.z-b.z);
  g.lineJoin='round';
  for(const f of faces){g.beginPath();f.q.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fillStyle=f.fill;g.fill();g.lineWidth=.7;g.strokeStyle='rgba(0,0,0,.28)';g.stroke();
    if(f.glow){g.save();g.shadowColor=f.fill;g.shadowBlur=8;g.fill();g.restore();}}
  if(!gpsMode){g.globalAlpha=.5;}
  let minY=1e9;for(const f of faces)for(const q of f.q)minY=Math.min(minY,q[1]);const tp=P(0,0,top);paintAvatar(g,tp[0],Math.min(tp[1],minY)-26,16,car,gpsMode?(car.role==='passenger'?'#2369B0':'#2E7D4F'):'#9AA5AF');g.globalAlpha=1;
}

function drawCar(x,y,headingScreen,gpsMode){
  const car=carSet(),[w,l]=VDIM[car.type]||VDIM.suv;
  const k=(S.nav?1.45:1)*clamp(.78+cam.s*5,.82,1.12);
  ctx.save();ctx.translate(x,y);
  if(!S.nav&&gpsMode){ctx.beginPath();ctx.arc(0,0,Math.max(18,S.gps.acc*KG*cam.s),0,7);ctx.fillStyle='rgba(35,105,176,.13)';ctx.fill();ctx.lineWidth=1;ctx.strokeStyle='rgba(35,105,176,.35)';ctx.stroke();}
  if(!gpsMode){ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(0,0,l*k*.62,0,7);ctx.lineWidth=2;ctx.strokeStyle='rgba(90,105,120,.8)';ctx.stroke();ctx.setLineDash([]);}
  ctx.save();ctx.rotate(headingScreen==null?0:headingScreen);ctx.scale(k,k);if(!gpsMode)ctx.globalAlpha=.72;paintVehicle(ctx,car.type,car.color);ctx.restore();
  if(car.tag&&!S.nav){ctx.font='700 11.5px Barlow,sans-serif';const tw=ctx.measureText(car.tag).width+12,ty=l*k/2+10;ctx.fillStyle='rgba(20,28,22,.88)';ctx.beginPath();ctx.roundRect(-tw/2,ty-8,tw,16,8);ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(car.tag,0,ty+.5);}
  paintAvatar(ctx,0,-(l*k/2)-(S.nav?26:22),S.nav?17:15,car,gpsMode?(car.role==='passenger'?'#2369B0':'#2E7D4F'):'#9AA5AF');
  ctx.restore();
}
function openMyCar(){
  const car=carSet();
  const prev=el('canvas',{class:'carprev',width:'640',height:'360'});
  const paintPrev=()=>{const c=carSet(),g=prev.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,640,360);
    g.fillStyle='#F2EBD3';g.fillRect(0,0,640,360);g.strokeStyle='#A9967A';g.lineWidth=40;g.lineCap='round';g.beginPath();g.moveTo(-20,330);g.bezierCurveTo(200,300,330,200,660,40);g.stroke();g.strokeStyle='#fff';g.lineWidth=30;g.stroke();
    g.save();g.translate(320,215);g.scale(2,2);g.save();g.rotate(.95);g.scale(1.6,1.6);paintVehicle(g,c.type,c.color);g.restore();
    if(c.tag){g.font='700 12px Barlow,sans-serif';const tw=g.measureText(c.tag).width+12;g.fillStyle='rgba(20,28,22,.88)';g.beginPath();g.roundRect(-tw/2+30,22,tw,17,8.5);g.fill();g.fillStyle='#fff';g.textAlign='center';g.textBaseline='middle';g.fillText(c.tag,30,31);}
    paintAvatar(g,0,-58,17,c,c.role==='passenger'?'#2369B0':'#2E7D4F');g.restore();};
  const roleNote=el('p',{class:'fine'});
  const rerender=()=>{paintPrev();vgrid.querySelectorAll('canvas').forEach(cv=>paintIcon(cv));roleNote.textContent=carSet().role==='passenger'?'Being driven: you can type in the chat while moving, and speed alerts talk about the vehicle, not you.':'Driving: typing in the chat pauses while you move, so your eyes stay on the track.';};
  const paintIcon=cv=>{const g=cv.getContext('2d'),c=carSet();g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);g.translate(cv.width/2,cv.height/2+2);g.rotate(Math.PI/2);g.scale(1.55,1.55);paintVehicle(g,cv.dataset.t,c.color);};
  const set=(patch)=>{saveCar(patch);rerender();};
  const seg=(key,opts)=>{const box=el('div',{class:'seg'},...opts.map(([v,l])=>el('button',{type:'button',class:carSet()[key]===v?'on':'',onclick:e=>{set({[key]:v});box.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===e.currentTarget));if(key==='av')showAv();},text:l})));box.style.gridTemplateColumns=`repeat(${opts.length},1fr)`;return box;};
  const vgrid=el('div',{class:'vgrid'},...VEHICLES.map(([t,n,d])=>{const cv=el('canvas',{width:'150',height:'84','data-t':t});const b=el('button',{type:'button',class:'vopt'+(car.type===t?' on':''),onclick:()=>{set({type:t});vgrid.querySelectorAll('.vopt').forEach(x=>x.classList.toggle('on',x===b));}},cv,el('b',{text:n}),el('small',{text:d}));return b;}));
  const swatches=el('div',{class:'swatches'},...Object.entries(CARCOL).map(([n,h])=>{const b=el('button',{type:'button',class:'sw'+(car.color===n?' on':''),style:`background:${h}`,'aria-label':n,title:n,onclick:()=>{set({color:n});swatches.querySelectorAll('.sw').forEach(x=>x.classList.toggle('on',x===b));}});return b;}));
  const model=el('input',{class:'search',maxlength:'40',placeholder:'Make and model, e.g. Toyota Prado',value:car.model});model.oninput=()=>set({model:model.value.slice(0,40)});
  const tag=el('input',{class:'search',maxlength:'12',placeholder:'Optional: plate or name, e.g. RAD 123 A',value:car.tag});tag.oninput=()=>set({tag:tag.value.slice(0,12)});
  const avBox=el('div');
  const showAv=()=>{const c=carSet();avBox.replaceChildren();
    if(c.av==='emoji')avBox.append(el('div',{class:'grid5 avgrid'},...AVATARS.map(a=>{const b=el('button',{type:'button',class:'opt'+(c.emoji===a?' on':''),text:a,onclick:()=>{set({emoji:a});avBox.querySelectorAll('.opt').forEach(x=>x.classList.toggle('on',x===b));}});return b;})));
    else if(c.av==='initials'){const inp=el('input',{class:'search',maxlength:'3',placeholder:'Your initials, e.g. EB',value:c.initials,style:'text-transform:uppercase'});inp.oninput=()=>set({initials:inp.value.toUpperCase().replace(/[^A-Z0-9ÅÄÖÉ]/g,'').slice(0,3)});
      avBox.append(inp,el('div',{class:'swatches'},...AVBG.map(h=>{const b=el('button',{type:'button',class:'sw'+(c.avbg===h?' on':''),style:`background:${h}`,'aria-label':'Colour',onclick:()=>{set({avbg:h});avBox.querySelectorAll('.sw').forEach(x=>x.classList.toggle('on',x===b));}});return b;})));}
    else if(c.av==='photo'){const file=el('input',{type:'file',accept:'image/*',style:'display:none'});
      file.onchange=()=>{const f=file.files&&file.files[0];if(!f)return;const im=new Image();im.onload=()=>{const cv=document.createElement('canvas');cv.width=cv.height=160;const g=cv.getContext('2d');const sq=Math.min(im.naturalWidth,im.naturalHeight);
        g.drawImage(im,(im.naturalWidth-sq)/2,(im.naturalHeight-sq)/2,sq,sq,0,0,160,160);LS.set('avPhoto',cv.toDataURL('image/jpeg',.82));URL.revokeObjectURL(im.src);set({av:'photo'});showAv();toast('Photo set. It stays on this phone.');};im.src=URL.createObjectURL(f);};
      avBox.append(file,el('button',{class:'secondary',type:'button',onclick:()=>file.click(),text:LS.get('avPhoto',null)?'📷 Choose another photo':'📷 Take or choose a photo'}),
        LS.get('avPhoto',null)?el('button',{class:'secondary no',type:'button',onclick:()=>{LS.set('avPhoto',null);set({av:'emoji'});openMyCar();},text:'Remove photo'}):null,
        el('p',{class:'fine',text:'Your photo is shown only on this phone. Other drivers see your animal avatar.'}));}
  };
  showAv();
  const nodes=[prev,el('p',{class:'lbl',text:'In this vehicle I am'}),seg('role',[['driver','🧑‍✈️ Driving'],['passenger','👀 Being driven']]),
    roleNote,
    el('p',{class:'lbl',text:'Vehicle'}),vgrid,el('p',{class:'lbl',text:'Colour'}),swatches,
    el('p',{class:'lbl',text:'Make and model'}),model,el('p',{class:'lbl',text:'Tag under the vehicle'}),tag,
    el('p',{class:'lbl',text:'Avatar above the vehicle'}),seg('av',[['emoji','Animal'],['initials','Initials'],['photo','Photo'],['none','None']]),avBox];
  if(passValid()&&SOC.profile&&S.fs&&S.fs.uid)nodes.push(el('button',{class:'secondary',type:'button',onclick:async()=>{const c=carSet();const veh=(c.model||SOC.profile.vehicle||'').slice(0,40),colr=COLORS.includes(c.color)?c.color:'Other';
    try{await S.fs.F.updateDoc(S.fs.F.doc(S.fs.db,'profiles',S.fs.uid),{vehicle:veh,color:colr,...(c.av==='emoji'?{emoji:c.emoji}:{})});Object.assign(SOC.profile,{vehicle:veh,color:colr},c.av==='emoji'?{emoji:c.emoji}:{});LS.set('pass',SOC.profile);toast('Trip pass updated.');}catch(e){toast('Could not update the pass. Check your signal.');}},text:'Use this vehicle on my trip pass'}));
  nodes.push(el('button',{class:'primary green',type:'button',onclick:()=>{closeSheet();toast('Looking good! 🚙');},text:'Done'}));
  openSheet('My vehicle and avatar',nodes,{view:'mycar'});requestAnimationFrame(rerender);
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
  if(!S.set.sat){ctx.fillStyle='#F2EBD3';ctx.fill(L.park);if(LY('water')){ctx.fillStyle='#BAD3A6';ctx.fill(L.wet,'evenodd');ctx.strokeStyle='#97BA85';ctx.lineWidth=.9*px;ctx.stroke(L.wet);}
    if(L.water){ctx.fillStyle='#9DC8EE';ctx.fill(L.water,'evenodd');ctx.strokeStyle='#6EA4D8';ctx.lineWidth=1*px;ctx.stroke(L.water);}
    if(L.shore){ctx.strokeStyle='#3A7DB8';ctx.lineWidth=Math.min(2.2,1.1+cam.s*8)*px;ctx.stroke(L.shore);}}
  ctx.globalAlpha=1;
  if(L.rivers&&LY('water')){ctx.strokeStyle='#6EA4D8';ctx.lineWidth=Math.min(3,1+cam.s*6)*px;ctx.stroke(L.rivers);}
  const zt=clamp(cam.s*25,0,1);
  const nk=S.nav?1.5:1;const wTrack=(1.6+zt*4.4)*nk,wMinor=(2.4+zt*5)*nk,wMajor=(3.4+zt*6)*nk;
  ctx.strokeStyle=S.set.sat?'rgba(0,0,0,.55)':'#A9967A';ctx.lineWidth=(wTrack+2)*px;ctx.stroke(L.track);ctx.lineWidth=(wMinor+2)*px;ctx.stroke(L.minor);
  ctx.strokeStyle='#B5822C';ctx.lineWidth=(wMajor+2.4)*px;ctx.stroke(L.major);
  ctx.strokeStyle=S.set.sat?'#F5E7C8':'#FFFFFF';ctx.lineWidth=wTrack*px;ctx.stroke(L.track);ctx.lineWidth=wMinor*px;ctx.stroke(L.minor);
  ctx.strokeStyle='#F7C75A';ctx.lineWidth=wMajor*px;ctx.stroke(L.major);
  if(L.closed&&LY('closed')){ctx.strokeStyle=S.set.sat?'rgba(245,231,200,.5)':'rgba(255,255,255,.85)';ctx.lineWidth=(wTrack+1)*px;ctx.stroke(L.closed);
    ctx.setLineDash([5*px,5*px]);ctx.strokeStyle='#9B3B2C';ctx.lineWidth=Math.max(1.4,wTrack*.65)*px;ctx.stroke(L.closed);ctx.setLineDash([]);}
  if(L.offc&&LY('closed')){ctx.strokeStyle=S.set.sat?'rgba(245,231,200,.6)':'rgba(255,255,255,.9)';ctx.lineWidth=(wTrack+1.4)*px;ctx.stroke(L.offc);
    ctx.setLineDash([10*px,5*px]);ctx.strokeStyle='#C27B12';ctx.lineWidth=Math.max(1.8,wTrack*.8)*px;ctx.stroke(L.offc);ctx.setLineDash([]);}
  if(LY('official'))drawOfficial();
  if(L.approx&&LY('closed')){ctx.strokeStyle=S.set.sat?'rgba(245,231,200,.55)':'rgba(255,255,255,.85)';ctx.lineWidth=(wTrack+1)*px;ctx.stroke(L.approx);
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
  const reps=visibleReports().filter(r=>r.type==='sos'||(r.kind==='animal'?LY('animals'):LY('road'))).map(r=>{const q=merc(r.lon,r.lat);const s=w2s(q[0],q[1],m);return {r,x:s[0],y:s[1]};}).filter(o=>o.x>-60&&o.y>-60&&o.x<W+60&&o.y<H+60);
  for(const o of reps)placed.push([o.x-22,o.y-28,o.x+46,o.y+40]);
  const pos=myPos();let posS=null;if(pos){posS=w2s(pos.x,pos.y,m);placed.push([posS[0]-22,posS[1]-62,posS[0]+22,posS[1]+30]);}
  if(R){const d=w2s(R.pts[R.pts.length-1][0],R.pts[R.pts.length-1][1],m);if(planOn()){}else if(R.stops&&R.stops.length>1){R.stops.forEach((st,k)=>{const q=pointAt(R,st.d);const sp=w2s(q[0],q[1],m);ctx.beginPath();ctx.arc(sp[0],sp[1],13,0,7);ctx.fillStyle='#17663A';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#fff';ctx.stroke();ctx.font='700 14px Barlow,sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(k+1),sp[0],sp[1]+.5);placed.push([sp[0]-14,sp[1]-14,sp[0]+14,sp[1]+14]);});}else{drawFlag(d[0],d[1]);placed.push([d[0]-10,d[1]-40,d[0]+24,d[1]+4]);}
    if(S.nav){const nx=S.nav.next;if(nx&&nx.type!=='arrive'){const q=w2s(R.pts[nx.i][0],R.pts[nx.i][1],m);ctx.beginPath();ctx.arc(q[0],q[1],8,0,7);ctx.fillStyle='#fff';ctx.fill();ctx.lineWidth=4;ctx.strokeStyle='#0B3D75';ctx.stroke();}}}
  const showJ=cam.s>0.028&&LY('junctions'),showPL=cam.s>0.016,showArea=cam.s>0.011&&LY('names');
  const grp=c=>c==='junction'?'junctions':['lodge','camp','picnic','lookout'].includes(c)?'stay':'park';
  for(const p of S.pois){if(p.cat==='lake'||p.cat==='area'||p.cat==='hill')continue;if(p.cat!=='junction'&&!LY(grp(p.cat)))continue;const [x,y]=w2s(p.x,p.y,m);if(x<-30||y<-30||x>W+30||y>H+30)continue;
    if(p.cat==='junction'){if(!showJ)continue;const r=cam.s>0.06?10:8;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fillStyle='rgba(255,255,255,.92)';ctx.fill();ctx.lineWidth=1.6;ctx.strokeStyle='#555';ctx.stroke();ctx.font=`700 ${r>9?11:9.5}px Barlow,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#333';ctx.fillText(String(p.num),x,y+.5);placed.push([x-r,y-r,x+r,y+r]);hits.push({t:'poi',p,x,y,r:r+6});continue;}
    if(p.cat==='fence'&&cam.s<0.02)continue;const r=p.cat==='fence'?6:cam.s>0.03?11:9;glyph(p.cat,x,y,r);placed.push([x-r-2,y-r-2,x+r+2,y+r+2]);hits.push({t:'poi',p,x,y,r:r+8});}
  for(const p of S.named){if(p.cat!=='lake')continue;const [x,y]=w2s(p.x,p.y,m);if(x<-120||y<-30||x>W+120||y>H+30)continue;const big=/Ihema|Rwanyakazinga|Hago|Mihindi|Kivumba/.test(p.name);if(!LY('names')||(!big&&!showArea))continue;textLbl(p.name,x,y,`italic 600 ${big?(cam.s>0.02?17:14.5):13}px Barlow,sans-serif`,'#1E5C99');}
  if(showArea)for(const p of S.pois){if(p.cat!=='area'&&p.cat!=='hill')continue;const [x,y]=w2s(p.x,p.y,m);if(x<-120||y<-30||x>W+120||y>H+30)continue;textLbl(p.name.toUpperCase().split('').join(' '),x,y,`600 ${cam.s>0.03?12.5:11}px Barlow,sans-serif`,'#6A5232');}
  if(showPL)for(const p of S.pois){if(['lake','area','junction','fence','hill'].includes(p.cat)||!LY(grp(p.cat)))continue;const [x,y]=w2s(p.x,p.y,m);if(x<-150||y<-30||x>W+150||y>H+30)continue;textLbl(p.short||p.name,x+14,y,'600 13px Barlow,sans-serif','#26301F','left')||textLbl(p.short||p.name,x-14,y,'600 13px Barlow,sans-serif','#26301F','right');}
  if(planOn()){const st=plStart();if(st){const [sx,sy]=w2s(st.x,st.y,m);if(PLAN.start.kind==='place')planPin(sx,sy,'S','#2369B0');}
    PLAN.stops.forEach((s,k)=>{const q=merc(s.lon,s.lat);const [px_,py]=w2s(q[0],q[1],m);planPin(px_,py,String(k+1),s.kind==='species'?(s.stale?'#8A8F93':'#B5651D'):'#E35F14');hits.unshift({t:'pstop',i:k,x:px_,y:py-22,r:18});});
    if(PL.tmp){const [tx,ty]=w2s(PL.tmp.x,PL.tmp.y,m);planPin(tx,ty,'＋','#2369B0');}
    if(PLAN.end.startsWith('gate:')&&PLAN.stops.length){const g=plGates().find(p=>p.name===PLAN.end.slice(5));if(g){const [gx,gy]=w2s(g.x,g.y,m);planPin(gx,gy,'⚑','#17663A');}}}
  if(pickPin){const q=merc(pickPin.lon,pickPin.lat);const [x,y]=w2s(q[0],q[1],m);drawFlag(x,y,'#E35F14');}
  reps.sort((a,b)=>(a.r===selected)-(b.r===selected)||a.y-b.y);
  for(const o of reps){drawReport(o.r,o.x,o.y,o.r===selected);hits.unshift({t:'rep',r:o.r,x:o.x,y:o.y,r2:26});}
  const want3d=!!(pos&&S.nav&&S.set.tilt&&S.set.car3d!==false);
  if(pos){const h=pos.heading!=null?(pos.heading*RAD+cam.rot):null;if(want3d)draw3D(posS[0],posS[1],h||0,pos.gps);else drawCar(posS[0],posS[1],h,pos.gps);hits.unshift({t:'me',x:posS[0],y:posS[1]-12,r:32});}
  if(!want3d)clear3D();
  if(anim)requestAnimationFrame(draw);
}
function planPin(x,y,t,col){ctx.save();ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=5;ctx.shadowOffsetY=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-9,y-14);ctx.arc(x,y-22,12,Math.PI*.78,Math.PI*.22);ctx.closePath();ctx.fillStyle=col;ctx.fill();ctx.restore();ctx.lineWidth=2.5;ctx.strokeStyle='#fff';ctx.stroke();ctx.font='800 13px Barlow,sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t,x,y-22);placed.push([x-13,y-36,x+13,y]);}
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
  if(S.planMode&&!pickMode){const [wx,wy]=s2w(x,y);
    for(const h of hits)if(h.t==='pstop'&&Math.hypot(h.x-x,h.y-y)<h.r){showStopPop(h.i);return;}
    for(const h of hits)if(h.t==='rep'&&Math.hypot(h.x-x,h.y-y)<h.r2){const r=h.r,m=merc(r.lon,r.lat);
      if(r.kind==='animal'){const sp=SPX[r.type]?r.type:null;showPlanPop(sp?{name:SHORTNAME[sp]||SPX[sp].name,x:m[0],y:m[1],kind:'species',sp,rid:r.id,seen:r.lastSeen,sub:`Animal · follows the freshest sighting (this one ${ago(r.lastSeen)})`}:{name:`${label(r)} (seen ${hhmm(r.lastSeen)})`,x:m[0],y:m[1],kind:'animal'});}
      else showPlanPop({name:`${label(r)}`,x:m[0],y:m[1],kind:'pin',sub:'Road report'});return;}
    for(const h of hits)if(h.t==='poi'&&Math.hypot(h.x-x,h.y-y)<h.r){const p=h.p;showPlanPop({name:p.cat==='junction'?'Junction '+p.num:(p.short||p.name),x:p.x,y:p.y,kind:p.cat});return;}
    if(!$('planPop').hidden&&!PL.tmp){hidePlanPop();redraw();return;}
    showPlanPop(plNameAt(wx,wy));return;}
  if(pickMode==='plan'||pickMode==='planstart'){const [wx,wy]=s2w(x,y);let o=null;
    for(const h of hits)if(h.t==='rep'&&Math.hypot(h.x-x,h.y-y)<h.r2){const m=merc(h.r.lon,h.r.lat);o={name:`${label(h.r)} (seen ${hhmm(h.r.lastSeen)})`,x:m[0],y:m[1],kind:'animal'};break;}
    if(!o)for(const h of hits)if(h.t==='poi'&&Math.hypot(h.x-x,h.y-y)<h.r){const p=h.p;o={name:p.cat==='junction'?'Junction '+p.num:(p.short||p.name),x:p.x,y:p.y,kind:p.cat};break;}
    if(!o)o=plNameAt(wx,wy);
    if(pickMode==='planstart'){const u=unmerc(o.x,o.y);PLAN.start={kind:'place',name:o.name,lat:+u.lat.toFixed(6),lon:+u.lon.toFixed(6)};planSave();endPick();openPlanner(false,true);return;}
    if(addPlanStop(o,true)){try{navigator.vibrate&&navigator.vibrate(25);}catch(e){}planShow(false);PL.updBar&&PL.updBar();}return;}
  if(pickMode){const [wx,wy]=s2w(x,y);const u=unmerc(wx,wy);const k=pickMode;endPick();
    if(k==='me'){setManual(u.lat,u.lon,'Position set by hand.');}
    else if(k==='dest'){previewRoute({x:wx,y:wy,name:'Dropped pin'});}
    redraw();return;}
  for(const h of hits)if(h.t==='rep'&&Math.hypot(h.x-x,h.y-y)<h.r2){openReportView(h.r);return;}
  for(const h of hits)if(h.t==='me'&&Math.hypot(h.x-x,h.y-y)<h.r){openMyCar();return;}
  for(const h of hits)if(h.t==='poi'&&Math.hypot(h.x-x,h.y-y)<h.r){openPoi(h.p);return;}
  if(!$('sheet').hidden)closeSheet();
}

/* =========================================================================
   10. Sheets and flows
   ========================================================================= */
let backFn=null,sheetView=null,pendingAfterPos=null;
function openSheet(title,nodes,o={}){const nc=$('nearCard');if(nc)nc.hidden=true;$('sheet').classList.toggle('tall',!!o.tall);if(!o.view||!(o.view.startsWith('chat:')||o.view.startsWith('thread:')))SOC.render=null;$('sheetTitle').textContent=title;$('sheetBody').replaceChildren(...nodes.filter(Boolean));$('sheet').hidden=false;sheetView=o.view||null;backFn=o.back||null;$('sheetBack').hidden=!o.back;
  const dots=$('sheetDots');dots.replaceChildren();if(o.step){for(let i=1;i<=o.step[1];i++)dots.append(el('i',{class:i<=o.step[0]?'on':''}));}$('sheetBody').scrollTop=0;}
function closeSheet(){$('sheet').hidden=true;sheetView=null;selected=null;redraw();setTimeout(()=>checkNear(true),50);if(S.planMode)setTimeout(renderDock,0);}
$('sheetClose').onclick=closeSheet;$('sheetBack').onclick=()=>backFn&&backFn();
function refreshSheet(){if($('sheet').hidden)return;if(sheetView==='findanimals')return;if(sheetView==='board')return openBoard(true);if(sheetView==='find')openFind('sightings');else if(sheetView==='guide')openFind('guide');else if(sheetView==='list')openFind('list');else if(sheetView&&sheetView.startsWith('species:'))openSpecies(sheetView.slice(8));else if(sheetView&&sheetView.startsWith('rep:')){const r=allReports().find(x=>x.id===sheetView.slice(4));if(r)openReportView(r,true);}}
let toastT=null;
function toast(t,btn,fn,ms=3600){const e=$('toast');e.replaceChildren(...[el('span',{text:t}),btn?el('button',{type:'button',onclick:()=>{e.hidden=true;fn();},text:btn}):null].filter(Boolean));e.hidden=false;const up=!$('sheet').hidden;e.style.top=up?'calc(12px + env(safe-area-inset-top))':'';e.style.bottom=up?'auto':S.preview?'calc(150px + env(safe-area-inset-bottom))':S.nav?'calc(100px + env(safe-area-inset-bottom))':'';clearTimeout(toastT);toastT=setTimeout(()=>e.hidden=true,ms);}
function banner(text,btn,fn,cls){const b=$('banner');b.className='banner'+(cls?' '+cls:'');b.replaceChildren(...[el('p',{text}),btn?el('button',{type:'button',onclick:fn,text:btn}):null].filter(Boolean));b.hidden=false;}
function hideBanner(){$('banner').hidden=true;}
function startPick(kind){pickMode=kind;$('sheet').hidden=true;banner(kind==='me'?'Tap the map where you are.':'Tap the map where you want to go.','Cancel',()=>endPick());}
function endPick(){pickMode=null;hideBanner();const b=$('planBar');if(b)b.hidden=true;}
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
function tabs(cur){const t=[['sightings','Sightings'],['guide','Guide'],['list','My list'],['board','🏆 Board']];return el('div',{class:'seg seg4',role:'tablist'},...t.map(([k,l])=>el('button',{type:'button',role:'tab','aria-selected':String(k===cur),class:k===cur?'on':'',onclick:()=>openFind(k),text:l})));}
function openFind(tab){
  if(typeof tab==='string')findTab=tab;
  if(findTab==='guide')return openGuide();
  if(findTab==='list')return openList();
  if(findTab==='board')return openBoard();
  const all=allReports().filter(r=>r.kind==='animal'&&!(r.votes[S.device]===-1));
  const recent=all.filter(alive).sort((a,b)=>b.lastSeen-a.lastSeen);
  const row=(r)=>{const q=merc(r.lon,r.lat);const rel=relTo(q[0],q[1]);
    return el('li',null,el('button',{type:'button',onclick:()=>openReportView(r)},pic(r.type,46),
      el('span',null,el('b',{text:label(r)}),el('small',{text:`${r.example?'Example · ':''}Seen ${hhmm(r.lastSeen)} ${dayWord(r.lastSeen)} · ${ago(r.lastSeen)}${verList(r).length?` · ✅ ${verList(r).length} verified`:''}`}),el('small',{text:whereText(q[0],q[1])})),
      el('span',{class:'r'},rel?fmtD(rel.d):'',rel?el('small',{text:rel.dir}):'')));};
  const winSel=el('select',{class:'opt',id:'winSel','aria-label':'How far back to show'},...[[2,'Last 2 h'],[6,'Last 6 h'],[12,'Last 12 h'],[48,'Last 2 days']].map(([v,t])=>{const o=el('option',{value:String(v),text:t});if((S.animalWin||6)===v)o.selected=true;return o;}));
  winSel.onchange=()=>{S.animalWin=+winSel.value;LS.set('win',S.animalWin);openFind();redraw();};
  const nodes=[tabs('sightings'),el('button',{class:'primary blue',type:'button',onclick:()=>openFindAnimals(),text:'🦁 Find animals and add them to a trip'}),el('div',{class:'acts'},winSel),el('p',{class:'lbl',text:'Latest sightings'}),
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
  const upd=()=>{go.disabled=!sel.size;go.textContent=sel.size?`Add ${sel.size} animal${sel.size>1?'s':''} to my trip`:'Choose animals to find';};
  const tile=(x,ok)=>{const r=ok?freshest(x.id):null;const b=el('button',{type:'button',class:'ftile'+(sel.has(x.id)?' on':''),disabled:!ok,'aria-pressed':String(sel.has(x.id))},pic(x.id,52,ok?'':'dim'),el('b',{text:SHORTNAME[x.id]||x.name}),
      el('small',{text:ok?`${hhmm(r.lastSeen)} · ${ago(r.lastSeen)}${r.example?' · ex.':''}`:'no recent sighting'}),has(x.id)?el('i',{class:'got',text:'✓'}):null);
    b.onclick=()=>{if(sel.has(x.id))sel.delete(x.id);else{if(sel.size>=MAX){toast(`Up to ${MAX} animals at a time.`);return;}sel.add(x.id);}b.classList.toggle('on',sel.has(x.id));b.setAttribute('aria-pressed',String(sel.has(x.id)));upd();};return b;};
  const notMine=withS.filter(x=>!has(x.id));
  go.onclick=()=>{let n=0;for(const id of sel){const r=freshest(id);if(!r)continue;const x=SPX[id]||{};if(addPlanStop({name:SHORTNAME[id]||x.name||label(r),x:merc(r.lon,r.lat)[0],y:merc(r.lon,r.lat)[1],kind:'species',sp:id,rid:r.id,seen:r.lastSeen},true))n++;}
    if(n&&PLAN.stops.length>=3)planOptimizeQuiet();enterPlanMode(false);toast(n?`${n} animal${n>1?'s':''} added. Each stop follows the freshest sighting${PLAN.stops.length>=3?'; stops put in the quickest order':''}.`:'Those animals are already in the trip.');};upd();
  openSheet('Find animals',[
    el('p',{class:'hint',text:'Tick the animals you want to see. Each becomes a stop at its freshest sighting, and moves if a newer sighting comes in. Mix them with places and junctions in the same trip.'}),
    notMine.length?el('button',{class:'secondary',type:'button',onclick:()=>openFindAnimals(notMine.slice(0,MAX).map(x=>x.id)),text:`Select ones not on my list yet (${Math.min(notMine.length,MAX)})`}):null,
    el('p',{class:'lbl',text:`Seen recently (${withS.length})`}),withS.length?el('div',{class:'fgrid'},...withS.map(x=>tile(x,true))):el('p',{class:'hint',text:'No recent sightings to route to yet.'}),
    go,
    el('details',{class:'rules'},el('summary',{text:`No recent sighting (${without.length})`}),el('div',{class:'fgrid',style:'padding-bottom:10px'},...without.map(x=>tile(x,false))))
  ],{view:'findanimals',back:()=>S.planMode?openPlanAdd():openFind('sightings')});
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
    el('p',{class:'fine',text:`${sc.n} of ${sc.total} animals ticked${sc.nver?` · ${sc.nver} sighting${sc.nver>1?'s':''} verified (+${5*sc.nver})`:''}${sc.nsc?` · ${sc.nsc} of yours verified by others (+${3*sc.nsc})`:''}${sc.next?` · ${sc.next[0]-sc.pts} points to ${sc.next[1]}`:' · top level reached'}`})),
    el('button',{class:'secondary',type:'button',onclick:()=>openFind('board'),text:LB.joined?'🏆 See the leaderboard':'🏆 Join the leaderboard'}));
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
  const vl=verList(r),conf=Math.max(0,t.there-vl.filter(v=>r.votes[v.k]===1).length);
  if(conf)tags.push(el('span',{class:'tag',text:`${conf} confirmed`}));if(t.gone)tags.push(el('span',{class:'tag',text:`${t.gone} say gone`}));
  if(r.kind==='road'&&r.type!=='sos')tags.push(el('span',{class:'tag',text:SEV.find(s=>s[0]===(r.sev||'1'))[1]}));
  if(r.act)tags.push(el('span',{class:'tag',text:r.act}));if(r.rdist)tags.push(el('span',{class:'tag',text:r.rdist}));
  if(tags.length)nodes.push(el('div',{class:'meta'},...tags));
  if(vl.length)nodes.push(el('div',{class:'verbox'},el('b',{text:`✅ Verified on the spot by ${vl.length} ${vl.length===1?'driver':'drivers'}`}),
    ...vl.slice(0,3).map(v=>el('small',{text:`${v.k===S.device?'You':(v.n||'A driver')} · ${hhmm(v.t)} (${ago(v.t)}) · ${fmtD(v.d)} from the spot`}))));
  const lines=[el('p',null,el('b',{text:'Where: '}),whereText(q[0],q[1])+'.')];
  if(r.kind==='animal'&&r.heading!=null){if(r.heading>=0){const tw=towards(q[0],q[1],r.heading);lines.push(el('p',null,el('b',{text:'Moving: '}),`${DIRNAME[r.heading]}${tw?`, towards ${tw.short||tw.name}`:''}.`));}else lines.push(el('p',null,el('b',{text:'Moving: '}),'not moving when reported.'));}
  const rel=relTo(q[0],q[1]);if(rel)lines.push(el('p',null,el('b',{text:'From you: '}),`${fmtD(rel.d)} ${DIRNAME[DIRS.indexOf(rel.dir)]} (straight line).`));
  if(r.kind==='road'){const life=roadLife(r);lines.push(el('p',null,el('b',{text:'Likely until: '}),`about ${stamp(life.until)}.`));lines.push(el('p',{class:'fine',text:life.why+(life.next>=2?` More rain is forecast (${Math.round(life.next)} mm in the next 12 h), which would make it last longer.`:'')}));}
  nodes.push(el('div',{class:'dir'},...lines));
  if(r.note)nodes.push(el('p',{class:'note',text:r.note}));
  if(r.type==='sos'){nodes.push(el('div',{class:'safety warn'},el('b',{text:'If you want to help'}),el('ul',null,el('li',{text:'Do not leave your vehicle if any animal is near.'}),el('li',{text:'Call the park on +250 786 182 871 and tell them where this is.'}),el('li',{text:'The driver may already have called. Keep your distance from the vehicle until you know.'}))),el('a',{class:'secondary',href:'tel:+250786182871',text:'📞 Call the park'}));}
  {const who=r.uid?personByUid(r.uid):null;if(who)nodes.push(el('p',{class:'fine',text:`Reported by ${who.emoji} ${who.name} · ${vehLabel(who)}`}));else if(r.by===S.device)nodes.push(el('p',{class:'fine',text:'Reported by you'}));}
  nodes.push(el('button',{class:'primary blue',type:'button',onclick:()=>previewRoute({x:q[0],y:q[1],name:label(r)}),text:'Navigate here'}));
  if(!r.example&&((passValid()&&SOC.profile.chat)||GR.codes.length))nodes.push(el('button',{class:'secondary',type:'button',onclick:()=>shareSighting(r),text:GR.codes.length?'💬 Share in a chat':'💬 Share in the park chat'}));
  if(r.kind==='animal')nodes.push(el('button',{class:'primary green',type:'button',onclick:()=>{const sp=SPX[r.type]?r.type:null;addPlanStop(sp?{name:SHORTNAME[sp]||SPX[sp].name,x:q[0],y:q[1],kind:'species',sp,rid:r.id,seen:r.lastSeen}:{name:`${label(r)} (seen ${hhmm(r.lastSeen)})`,x:q[0],y:q[1],kind:'animal'},true);enterPlanMode(false);toast(`Added to your trip (${PLAN.stops.length} stops).`);},text:'＋ Add as a stop in my trip'}));
  if(r.kind==='animal'&&SPX[r.type]&&SPX[r.type].where)nodes.push(el('button',{class:'secondary',type:'button',onclick:()=>openSpecies(r.type),text:`${SPX[r.type].name}: safety and facts`}));
  if(r.kind==='animal'){const st=verState(r);
    if(!st.mine)nodes.push(el('button',{class:'primary green'+(st.ok?'':' soft'),type:'button',onclick:()=>verifySighting(r),text:st.done?'✅ You verified this':'✅ Verify: I can see it'}),
      el('p',{class:'fine'+(st.ok?' okline':''),text:st.ok?`You are ${fmtD(st.d)} from the spot, close enough to verify.`:st.why}));
    if(!r.example)nodes.push(el('button',{class:'secondary no',type:'button',onclick:()=>goneHere(r),text:st.mine?'Remove my report':'Not there any more'}));}
  else if(!r.example){const mine=r.by===S.device;nodes.push(el('div',{class:'acts'},el('button',{class:'secondary ok',type:'button',onclick:()=>{patchReport(r,{votes:{[S.device]:1},lastSeen:Date.now()});toast('Thanks. Marked as still there.');},text:'Still there'}),el('button',{class:'secondary no',type:'button',onclick:()=>{patchReport(r,{votes:{[S.device]:-1}});closeSheet();toast(mine?'Removed.':'Thanks. Marked as gone.');},text:mine?'Remove my report':'Not there any more'})));}
  openSheet(r.kind==='animal'?'Sighting':'Road report',nodes,{view:'rep:'+r.id});redraw();
}
function openPoi(p){
  const rel=relTo(p.x,p.y);
  const kind={junction:'Junction stone',gate:'Park gate',reception:'Reception',hq:'Park office',lodge:'Lodge',camp:'Campsite',ranger:'Ranger post',fence:'Fence attendant house',picnic:'Picnic spot',lookout:'Lookout',fuel:'Fuel',ruins:'Ruins / old park infrastructure'}[p.cat]||'Place';
  const nodes=[el('p',{class:'hint',text:kind+(p.note?'. '+p.note:'')+(p.cat==='junction'?({osm:' Position from OpenStreetMap.',snap:' Position from the official park map, placed on the nearest road (may be a few hundred metres off).'}[p.src]||' Position from the official park map (a few hundred metres accuracy).'):'')})];
  if(rel)nodes.push(el('div',{class:'dir'},el('p',null,el('b',{text:'From you: '}),`${fmtD(rel.d)} ${DIRNAME[DIRS.indexOf(rel.dir)]} (straight line).`)));
  if(S.ix){const c=S.ix.near(p.x,p.y,80,false,true),o=S.ix.near(p.x,p.y,80,false);
    if(c){const w=c.way,nm=w.nm||'a track';
      if(w.off)nodes.push(el('div',{class:'warnrow',style:'background:#FFF1D6;color:#6A4300',text:`ⓘ ${o?`${nm} starts here.`:`This is on ${nm}.`} The official park map shows it as a road, but OpenStreetMap marks it closed to visitors. ${S.set.officialOk!==false?'Routes use it, with a reminder to check at reception.':'Routes avoid it (Settings).'}`}));
      else if(w.a==='nt')nodes.push(el('div',{class:'warnrow',text:`⛔ ${o?'A no-through road starts here':'This track is a no-through road'}: ${w.nt}. The official park map closes it to other visitors, so routes avoid it.`}));
      else nodes.push(el('div',{class:'warnrow',text:`⛔ ${o?`${nm} starts here. It is`:`This is on ${nm}, which is`} marked as closed to visitors on OpenStreetMap and is not on the official park map.${S.set.closedOk?' Routes may use it (Settings).':' Routes avoid it unless you allow closed tracks in Settings.'}`}));}}
  nodes.push(el('button',{class:'primary blue',type:'button',onclick:()=>previewRoute({x:p.x,y:p.y,name:p.cat==='junction'?'Junction '+p.num:(p.short||p.name)}),text:'Navigate here'}),
    el('button',{class:'primary green',type:'button',onclick:()=>{addPlanStop({name:p.cat==='junction'?'Junction '+p.num:(p.short||p.name),x:p.x,y:p.y,kind:p.cat},true);enterPlanMode(false);toast(`Added to your trip (${PLAN.stops.length} stops). Tap more on the map.`);},text:'＋ Add as a stop in my trip'}));
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
    if(!s){box.append(el('button',{class:'wide plan',type:'button',onclick:()=>enterPlanMode(),text:PLAN.stops.length?`🗺️ My trip · ${PLAN.stops.length} stop${PLAN.stops.length>1?'s':''}`:'🗺️ Plan a trip: animals, places and stops'}),el('button',{class:'wide',type:'button',onclick:()=>openFindAnimals(),text:'🦁 Find animals and add them to a trip'}));const sights=visibleReports().filter(r=>r.kind==='animal').sort((a,b)=>b.lastSeen-a.lastSeen).slice(0,4);
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
  if(r.offLen>50){const nm=r.offNames.length?r.offNames.join(', '):'a track';nodes.push(el('div',{class:'warnrow',style:'background:#FFF1D6;color:#6A4300',text:`ⓘ ${fmtD(r.offLen)} of this route is on ${nm}. The official park map shows it as a road, but OpenStreetMap marks it closed to visitors. Ask at reception or a ranger post whether it is open today.`}));}
  if(r.closedLen>50)nodes.push(el('div',{class:'warnrow',text:`⛔ ${fmtD(r.closedLen)} of this route is on ${r.closedNames.length?r.closedNames.join(', '):'tracks'} that OpenStreetMap marks as closed to visitors and that are not on the official park map. Check with a ranger before you drive ${r.closedNames.length>1?'them':'it'}.`}));
  if(r.approxLen>100)nodes.push(el('div',{class:'warnrow',style:'background:#F3EADB;color:#5A3D1A',text:`${fmtD(r.approxLen)} of this route is on a track from the park board that is not yet on OpenStreetMap (dashed on the map). The line is approximate, so follow the junction stones.`}));
  {const now=Date.now(),eta=now+r.time*1000;const pts=[r.pts[0],r.pts[r.pts.length>>1],r.pts[r.pts.length-1]].map(q=>wxPt(unmerc(q[0],q[1]).lat)).filter(Boolean);
    const rs=[].concat(...[...new Set(pts)].map(q=>wxRisks(q,now,eta+1800e3))).sort((a,b)=>a.t-b.t);const R=riskText(rs);
    if(R)nodes.push(el('div',{class:'warnrow'+(R.kind==='storm'?' storm':''),style:R.kind==='storm'?'':'background:#DCEAF8;color:#1D4F86',text:`${R.icon} ${R.word} on this route ${R.a<=now?'now':'from '+hhmm(R.a)} (up to ${Math.round(R.pp)}%). ${R.kind==='storm'?lightningAdvice():'Tracks get slippery fast, so the route keeps to main roads where it can.'}`}));
    const d=pts[0]&&dayAt(pts[0],now);
    if(d&&d.set&&eta>d.set-10*60e3&&now<d.set)nodes.push(el('div',{class:'warnrow',style:'background:#F3E6F7;color:#4A2660',text:`🌇 You would arrive about ${hhmm(eta)}, ${eta>d.set?'after':'close to'} sunset (${hhmm(d.set)}). The park is open 06:00–18:00 for day visitors.`}));
    else if(rwHour(eta)>=18||(rwHour(eta)<rwHour(now)&&eta-now<12*3600e3))nodes.push(el('div',{class:'warnrow',style:'background:#F3E6F7;color:#4A2660',text:`🌇 You would arrive about ${hhmm(eta)}, after 18:00 when the park closes for day visitors.`}));}
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
  if(next.type==='arrive'){if(dist<30&&!N.spoken.arr){N.spoken.arr=1;say(`You have arrived at ${R.destName}.`);setTimeout(()=>{endNav(true);toast(`Arrived at ${R.destName}. Gerayo amahoro! 🌿`,null,null,6000);},4000);}}
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
const AVATARS=['🦁','🐘','🦒','🦓','🦏','🐆','🦛','🦅','🐒','🦉','🐃','🐊','🦩','🐗','🦜','🐢','🦌','🤠','😎','🧑🏾','👩🏾','👨🏾','🧒🏾','👩🏼','👨🏻','🧔🏿','👵🏾','🧑🏽‍🦱','👱🏻‍♀️','🧑🏿‍🦲'];
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
  const m={id,uid:d.uid,name:String(d.name||'Driver').slice(0,30),emoji:AVATARS.includes(d.emoji)?d.emoji:'🙂',vehicle:String(d.vehicle||'').slice(0,50),text:d.text.slice(0,1500),at,kind:d.kind==='sighting'?'sighting':'text'};
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
function unreadCount(){const g=grUnread();if(!passValid())return g;const uid=S.fs&&S.fs.uid;let n=g+SOC.chat.filter(m=>m.at>SOC.lastRead&&m.uid!==uid&&!SOC.blocked.includes(m.uid)).length;for(const t of SOC.dms){if((t.lastAt||0)>(SOC.dmRead[t.id]||0)&&t.lastBy!==uid)n++;}return n;}
function updateChatBadge(){const b=$('chatBadge');if(!b)return;const n=unreadCount();b.hidden=!n;b.textContent=n>9?'9+':String(n);}
function updateMeBtn(){const b=$('meBtn');if(!b)return;const ex=passExists();b.textContent=ex?SOC.profile.emoji:'👤';b.setAttribute('aria-label',ex?(passUpcoming()?`Trip pass starts ${dShort(SOC.profile.startsAt)}`:`Trip pass: ${SOC.profile.name}`):'Create a trip pass');}

/* ---------- trip pass sheet ---------- */
function openPass(edit){
  if(!S.fs){openSheet('Trip pass',[el('p',{class:'hint',text:'Trip passes and chat need the shared database (Firebase). It is not connected on this phone right now.'}),el('button',{class:'secondary sosbtn',type:'button',onclick:()=>openEmergency(),text:'🆘 Emergency help works without it'})],{view:'pass'});return;}
  if(passExists()&&!edit)return showPass();
  const L=!edit?LS.get('trip',null):null;const P=(edit&&SOC.profile)||L||{};const today=dISO(Date.now());
  const C_=carSet();const f={name:P.name||'',vehicle:P.vehicle||C_.model||'',color:P.color||(COLORS.includes(C_.color)?C_.color:'White'),party:P.party||'',emoji:P.emoji||'🦁',chat:edit?!!P.chat:true,showName:LS.get('showName',true)};
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
  if(LB.joined){await tr(()=>F.deleteDoc(F.doc(db,'board',uid)));if(LB.parkUnsub){LB.parkUnsub();LB.parkUnsub=null;}if(LB.unsub){LB.unsub();LB.unsub=null;}LB.lastPub='';}
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
  // leaderboard entries untouched for 90 days (phones that stopped using the app)
  await tr(async()=>{const old=await F.getDocs(F.query(F.collection(db,'board'),F.where('updatedAt','<',F.Timestamp.fromMillis(Date.now()-90*864e5)),F.limit(25)));for(const d of old.docs)await tr(()=>F.deleteDoc(d.ref));});
}
function socTick(){
  const p=SOC.profile;
  if(p&&!(p.expiresAt>Date.now()))retire();
  else if(p&&passActive()&&!SOC.started&&S.fs&&S.fs.uid)startSocial();
  if(S.fs&&S.fs.uid&&Date.now()-(SOC.lastJan||0)>3600e3){SOC.lastJan=Date.now();janitor();}
  const t=LS.get('trip',null);if(t&&t.retainUntil<Date.now())LS.set('trip',null);
  if(LB.joined&&S.fs){lbPublish();lbParkListen();}
  if(S.fs&&GR.codes.length&&!GR.listUnsub&&!offlineMode())ensureAuth().then(grStart).catch(()=>{});
  updateMeBtn();
}

/* ---------- chat ---------- */
function chatTabs(cur){const uid=S.fs&&S.fs.uid,n=SOC.dms.filter(t=>(t.lastAt||0)>(SOC.dmRead[t.id]||0)&&t.lastBy!==uid).length,gn=grUnread();
  return el('div',{class:'seg seg4',role:'tablist'},...[['groups',`Groups${gn?` (${gn})`:''}`],['park','Park'],['dms',`Private${n?` (${n})`:''}`],['people','People']].map(([k,l])=>el('button',{type:'button',role:'tab','aria-selected':String(k===cur),class:k===cur?'on':'',onclick:()=>openChat(k),text:l})));}
function drivingLocked(){const g=S.gps;return !SOC.passenger&&carSet().role!=='passenger'&&g.ok&&!g.sim&&Date.now()-g.t<15e3&&(g.speed||0)*3.6>10;}
function composer(onSend){
  const inp=el('input',{class:'chatin',type:'text',maxlength:'500',placeholder:'Message',enterkeyhint:'send','aria-label':'Message'});
  const send=el('button',{class:'sendbtn',type:'button','aria-label':'Send',text:'➤'});
  const lock=el('div',{class:'drivelock'},el('span',{text:'Typing is paused while the car is moving.'}),el('button',{type:'button',onclick:()=>{SOC.passenger=true;saveCar({role:'passenger'});bar.replaceWith(composer(onSend));},text:"I'm a passenger"}));
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
  if(tab==='groups')return openGroups();
  if(!passValid()||!S.fs||!S.fs.uid||!SOC.profile.chat){
    openSheet('Chat',[chatTabs(tab),el('div',{class:'lbintro'},el('b',{text:'The park chat is for drivers with a trip pass'}),el('small',{text:'The park chat, private messages and the list of drivers need a trip pass for the days you are in the park. Your groups work without one.'})),
      el('button',{class:'primary blue',type:'button',onclick:()=>passExists()?showPass():openPass(),text:passExists()?'Open my trip pass':'Create a trip pass'}),
      el('button',{class:'secondary',type:'button',onclick:()=>openGroups(),text:'👥 Go to my groups'})],{view:'chat:none',tall:true});return;}
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
function openWeather(refresh){
  const keep=refresh&&sheetView==='wx'?$('sheetBody').scrollTop:0;
  const {pt,i:wi}=wxHere();const nodes=[];const now=Date.now();
  if(!pt){nodes.push(el('p',{class:'hint',text:offlineMode()?'No weather saved yet. It loads when you have signal and is then kept for offline use.':'Loading the forecast…'}));openSheet('Weather',nodes,{view:'wx'});loadWeather(true);return;}
  const v2=S.wx.v===2&&pt.T&&pt.T.length,age=now-S.wx.fetched;
  const ageTxt=`Forecast from ${hhmm(S.wx.fetched)} ${dayWord(S.wx.fetched)}${age>3*3600e3?` (${ago(S.wx.fetched)})`:''}${offlineMode()?' · saved on this phone':''}`;
  if(!v2){nodes.push(el('p',{class:'hint',text:'Getting the full forecast…'}));loadWeather(true);}
  else{
    const w=wxAt(pt,now)||wxAt(pt,pt.t[0]),[ic,word]=wmo(w.wc,w.day),d=dayAt(pt,now);
    const n3=Math.max(0,...pt.pp.filter((v,k)=>pt.t[k]>=now-3600e3&&pt.t[k]<now+3*3600e3).map(v=>v||0));
    nodes.push(el('div',{class:'wxnow'},el('span',{class:'wxbig',text:ic}),el('div',null,el('b',{text:`${Math.round(w.T)}°C · ${word}`}),
      el('small',{text:`${WXPTS[wi].name} · rain chance next 3 h ${Math.round(n3)}% · wind ${Math.round(w.w||0)} km/h${(w.g||0)>=35?`, gusts ${Math.round(w.g)}`:''}${w.uv!=null&&w.uv>=6?` · UV ${Math.round(w.uv)} (high)`:''}`}),
      el('small',{class:age>3*3600e3?'stale':'',text:ageTxt}))));
    // warnings
    const R=riskText(wxRisks(pt,now,now+6*3600e3));
    if(R)nodes.push(el('div',{class:'warnrow'+(R.kind==='storm'?' storm':''),text:`${R.icon} ${R.word} ${R.a<=now?'now, until '+hhmm(R.b):R.span} (up to ${Math.round(R.pp)}%). ${R.kind==='storm'?lightningAdvice():'Tracks get slippery fast; the route planner keeps to main roads.'}`}));
    // next 12 hours
    const hrs=[];for(let k=0;k<pt.t.length;k++)if(pt.t[k]>=now-3600e3&&hrs.length<13)hrs.push(k);
    nodes.push(el('p',{class:'lbl',text:'Next 12 hours'}),el('div',{class:'wxhours'},...hrs.map(k=>{const [hi]=wmo(pt.wc[k],pt.day[k]!==0);const pp=pt.pp[k]||0;
      return el('div',{class:'wxh'+(k===hrs[0]?' now':'')},el('small',{text:k===hrs[0]?'Now':hhmm(pt.t[k]).slice(0,2)}),el('span',{class:'hi',text:hi}),el('b',{text:`${Math.round(pt.T[k])}°`}),
        el('i',{class:'pbar'},el('i',{style:`height:${Math.max(4,pp)}%`})),el('small',{class:'pp',text:pp>=10?`${Math.round(pp)}%`:''}));})));
    // daylight and opening hours
    if(d&&d.set){const left=d.set-now;
      nodes.push(el('div',{class:'wxsun'},el('span',{text:`🌅 Sunrise ${hhmm(d.rise)}`}),el('span',{text:`🌇 Sunset ${hhmm(d.set)}`}),
        el('span',{text:left>0&&now>d.rise?`${fmtDur(left/1000)} of daylight left`:now<d.rise?'Before sunrise':'After sunset'}),
        el('small',{text:'The park is open 06:00–18:00 for day visitors. Guided night drives are the way to see the park after dark.'})));}
    // game-viewing tips from the weather
    const tips=[],h=rwHour(now),tmax=d&&d.tmax,lr=lastRain(pt,now-6*3600e3,now);
    if(h<9||h>=16)tips.push('Good time for game viewing: animals are most active in the cooler early morning and late afternoon.');
    else if(tmax!=null&&tmax>=29)tips.push(`Hot day (up to ${Math.round(tmax)}°C): around midday many animals rest in shade or near water, so lake shores such as Ihema, Shakani and Hago are good places to look.`);
    if(lr&&!R)tips.push('Rain has just passed: grazers often come out onto the open plains again, and birds are busy.');
    if((w.g||0)>=35)tips.push('Windy: animals tend to be nervous and keep to cover.');
    if(R&&R.kind!=='storm'&&wetness()>=3)tips.push('Wet tracks: black cotton soil in the north turns slippery quickly. Use 4WD on climbs and keep to the main roads.');
    if(w.uv!=null&&w.uv>=8)tips.push('Very strong sun: keep water in the car and cover up if you stand in an open vehicle.');
    if(tips.length)nodes.push(el('p',{class:'lbl',text:'Tips for today'}),el('ul',{class:'wxtips'},...tips.slice(0,3).map(t=>el('li',{text:t}))));
    // across the park
    nodes.push(el('p',{class:'lbl',text:'Across the park'}),el('div',{class:'wxparts'},...S.wx.pts.map((q,k)=>{const a=wxAt(q,now);if(!a)return null;const [qi,qw]=wmo(a.wc,a.day);const n6=rainSum(q,now,now+6*3600e3),ts=trackState(q);
      return el('div',{class:'wxpart'+(k===wi?' here':'')},el('span',{class:'hi',text:qi}),el('div',null,el('b',{text:`${WXPTS[k].name.split(' (')[0]} · ${Math.round(a.T)}°C`}),
        el('small',{text:`${qw}${n6>=0.5?` · ${n6.toFixed(1)} mm in the next 6 h`:''} · tracks ${ts.txt.toLowerCase()}${ts.until?` until about ${stamp(ts.until)}`:''}`})));})));
    // next days
    const D=pt.d,days=[];for(let k=0;k<D.t.length;k++)if(D.t[k]+864e5>now&&days.length<7)days.push(k);
    nodes.push(el('p',{class:'lbl',text:'Next days'}),el('div',{class:'wxdays'},...days.map((k,n)=>{const [di]=wmo(D.wc[k]);const dt=new Date(D.t[k]+12*3600e3);
      return el('div',{class:'wxd'},el('b',{text:n===0?'Today':n===1?'Tomorrow':dt.toLocaleDateString([], {weekday:'short',day:'numeric'})}),el('span',{class:'hi',text:di}),
        el('span',{class:'tt',text:`${Math.round(D.tmax[k])}° / ${Math.round(D.tmin[k])}°`}),el('small',{text:(D.psum[k]||0)>=0.5?`${(D.psum[k]).toFixed(1)} mm · ${Math.round(D.ppmax[k]||0)}%`:'dry'}));})));
  }
  // rain history and the roads (works with saved data too)
  const hrs=[];for(let k=0;k<pt.t.length;k++){if(pt.t[k]>=now-48*3600e3&&pt.t[k]<=now+24*3600e3)hrs.push({t:pt.t[k],p:pt.p[k],f:pt.t[k]>now});}
  const mx=Math.max(2,...hrs.map(h=>h.p));
  nodes.push(el('p',{class:'lbl',text:'Rain and the tracks'}),el('div',{class:'bars','aria-label':'Hourly rain, past 48 hours and next 24 hours'},...hrs.map(h=>el('i',{class:h.f?'f':'',style:`height:${Math.max(1,h.p/mx*100)}%`,title:`${stamp(h.t)}: ${h.p} mm`}))));
  nodes.push(el('div',{class:'barlbl'},el('span',{text:'48 h ago'}),el('span',{text:'now'}),el('span',{text:'+24 h'})));
  const r24=rainSum(pt,now-24*3600e3,now),r48=rainSum(pt,now-48*3600e3,now),n12=rainSum(pt,now,now+12*3600e3),lr=lastRain(pt,now-5*864e5,now);
  nodes.push(el('div',{class:'wxrow'},el('span',{text:'Rain, last 24 h'}),el('b',{text:`${r24.toFixed(1)} mm`}),el('span',{text:'Rain, last 48 h'}),el('b',{text:`${r48.toFixed(1)} mm`}),el('span',{text:'Forecast, next 12 h'}),el('b',{text:`${n12.toFixed(1)} mm`}),el('span',{text:'Last rain'}),el('b',{text:lr?stamp(lr):'none in 5 days'})));
  const ts=trackState(pt);
  nodes.push(el('div',{class:'dir'},el('p',{text:ts.cls==='dry'?'Tracks should be dry. Black cotton soil in the north still turns slippery quickly if it rains.':`Tracks likely ${ts.txt.toLowerCase()} until about ${stamp(ts.until)}. Use 4WD on climbs and stay on main roads.`})));
  nodes.push(el('p',{class:'fine',text:'Mud, flooding and slippery-climb reports expire on their own once the ground has had time to dry. The route planner avoids tracks more after rain and when heavy rain is forecast. Weather data: Open-Meteo, for three points in the park.'}));
  if(!offlineMode())nodes.push(el('button',{class:'secondary',type:'button',onclick:()=>{loadWeather(true);toast('Updating the forecast…');},text:'↻ Update forecast'}));
  openSheet('Weather',nodes,{view:'wx'});if(keep)$('sheetBody').scrollTop=keep;
}
$('wxPill').onclick=openWeather;
/* =========================================================================
   11e. Leaderboard: park-wide board, private groups, shareable score card
   ========================================================================= */
const LB={joined:LS.get('lb',null),rows:{},unsub:null,parkUnsub:null,scope:'park',period:'week',lastPub:'',lastPubT:0,pubT:null,
  ranks:LS.get('lbRanks',{}),base:{},pendingJoin:null,err:null};
if(LB.joined&&!(LB.joined.groups||[]).includes(LB.scope)&&LB.scope!=='park')LB.scope='park';
S.myScouted=LS.get('myScouted',{});
const RW_TZ=2*3600e3;                                         // Rwanda time, the same for every phone
const dayStart=(t=Date.now())=>{const d=new Date(t+RW_TZ);d.setUTCHours(0,0,0,0);return d.getTime()-RW_TZ;};
const weekStart=(t=Date.now())=>{const d=new Date(t+RW_TZ);const wd=(d.getUTCDay()+6)%7;d.setUTCHours(0,0,0,0);return d.getTime()-wd*864e5-RW_TZ;};
const dayKey=(t=Date.now())=>new Date(dayStart(t)+RW_TZ).toISOString().slice(0,10);
const weekKey=(t=Date.now())=>new Date(weekStart(t)+RW_TZ).toISOString().slice(0,10);
const CODE_CH='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode=()=>Array.from({length:6},()=>CODE_CH[Math.floor(Math.random()*CODE_CH.length)]).join('');
const groupName=c=>grName(c);
const appURL=()=>location.origin+location.pathname;
function lbSave(){LS.set('lb',LB.joined);}
/* every point with the time it was earned, so the board can show today and this week */
function pointEvents(){const ev=[];
  for(const x of LISTED){const t=S.life[x.id];if(t)ev.push({t:t.t,p:POINTS[x.rarity]||0});}
  for(const b of earnedBadges()){let bt=0;for(const g of b.need){let gt=Infinity;for(const id of g)if(S.life[id])gt=Math.min(gt,S.life[id].t);bt=Math.max(bt,gt);}ev.push({t:bt,p:b.bonus});}
  for(const k in S.myVer)ev.push({t:S.myVer[k].t,p:5});
  for(const k in S.myScouted)ev.push({t:S.myScouted[k].t,p:3});
  return ev;}
function myStats(){const ev=pointEvents(),d0=dayStart(),w0=weekStart();let pts=0,pDay=0,pWk=0;const days=new Set();
  for(const e of ev){pts+=e.p;if(e.t>=d0)pDay+=e.p;if(e.t>=w0)pWk+=e.p;days.add(dayKey(e.t));}
  let stk=0,t=Date.now();if(!days.has(dayKey(t)))t-=864e5;while(days.has(dayKey(t))){stk++;t-=864e5;}
  let rare=null;for(const x of LISTED)if(has(x.id)&&(!rare||x.rarity>rare.rarity))rare=x;
  const sc=score();return {pts,pDay,pWk,stk,n:sc.n,ver:Object.keys(S.myVer).length,sc:Object.keys(S.myScouted).length,badges:sc.badges.map(b=>b.id),lv:sc.lv[1],rare:rare?rare.id:''};}
/* your own sightings that other drivers verified earn you 3 points each */
function checkScouted(){let got=null;
  for(const r of S.live||[]){if(r.by!==S.device||S.myScouted[r.id])continue;const v=verList(r).find(x=>x.k!==S.device);if(!v)continue;
    S.myScouted[r.id]={t:Date.now(),type:r.type};got={r,v};}
  if(got){LS.set('myScouted',S.myScouted);toast(`✅ ${got.v.n?got.v.n.split(' · ')[0]:'Another driver'} verified your ${label(got.r).toLowerCase()} sighting. +3 points`);lbPublish();}}
async function lbPublish(force){
  if(!LB.joined||!S.fs||offlineMode())return;
  const st=myStats(),j=LB.joined;
  const doc={name:j.name,emoji:j.emoji,pub:!!j.pub,groups:(j.groups||[]).slice(0,5),pts:st.pts,pDay:st.pDay,day:dayKey(),pWk:st.pWk,wk:weekKey(),stk:st.stk,n:st.n,ver:st.ver,sc:st.sc,badges:st.badges.slice(0,12),lv:st.lv,rare:st.rare};
  const sig=JSON.stringify(doc);if(!force&&sig===LB.lastPub)return;
  if(!force&&Date.now()-LB.lastPubT<15e3){clearTimeout(LB.pubT);LB.pubT=setTimeout(()=>lbPublish(),15e3);return;}
  try{const uid=await ensureAuth();const {F,db}=S.fs;await F.setDoc(F.doc(db,'board',uid),{...doc,updatedAt:F.serverTimestamp()});LB.lastPub=sig;LB.lastPubT=Date.now();LB.err=null;}
  catch(e){LB.err=(e&&e.code)||'error';}
}
function lbClean(id,d){if(!d||typeof d.name!=='string')return null;
  return {uid:id,name:d.name.slice(0,24),emoji:AVATARS.includes(d.emoji)?d.emoji:'🙂',pub:!!d.pub,groups:Array.isArray(d.groups)?d.groups:[],
    all:Math.max(0,+d.pts||0),day:d.day===dayKey()?Math.max(0,+d.pDay||0):0,week:d.wk===weekKey()?Math.max(0,+d.pWk||0):0,
    stk:d.day===dayKey()||d.day===dayKey(Date.now()-864e5)?(+d.stk||0):0,n:+d.n||0,ver:+d.ver||0,sc:+d.sc||0,
    badges:Array.isArray(d.badges)?d.badges.filter(b=>window.BADGES.some(x=>x.id===b)):[],lv:String(d.lv||'').slice(0,30),rare:SPX[d.rare]?d.rare:'',t:tsMs(d.updatedAt)};}
function lbQuery(scope){const {F,db}=S.fs;return scope==='park'?F.query(F.collection(db,'board'),F.where('pub','==',true),F.limit(400)):F.query(F.collection(db,'board'),F.where('groups','array-contains',scope),F.limit(200));}
function lbOnRows(scope,snap){LB.rows[scope]=snap.docs.map(d=>lbClean(d.id,d.data())).filter(Boolean);lbRankCheck(scope);if(sheetView==='board'&&LB.scope===scope)openBoard(true);}
function lbParkListen(){if(LB.parkUnsub||!S.fs||!LB.joined)return;
  ensureAuth().then(()=>{if(LB.parkUnsub)return;LB.parkUnsub=S.fs.F.onSnapshot(lbQuery('park'),s=>lbOnRows('park',s),e=>{LB.err=e.code;LB.parkUnsub=null;});}).catch(()=>{});}
function lbListen(){if(LB.unsub){LB.unsub();LB.unsub=null;}if(!S.fs||LB.scope==='park')return;const scope=LB.scope;
  ensureAuth().then(()=>{LB.unsub=S.fs.F.onSnapshot(lbQuery(scope),s=>lbOnRows(scope,s),e=>{LB.err=e.code;});}).catch(()=>{});}
function lbMe(){if(!LB.joined||!S.fs||!S.fs.uid)return null;const st=myStats();
  return {uid:S.fs.uid,name:LB.joined.name,emoji:LB.joined.emoji,all:st.pts,day:st.pDay,week:st.pWk,stk:st.stk,n:st.n,ver:st.ver,sc:st.sc,badges:st.badges,lv:st.lv,rare:st.rare,me:true,t:Date.now()};}
function lbSorted(scope,period){let rows=(LB.rows[scope]||[]).slice();
  if(scope==='park')rows=rows.filter(r=>Date.now()-r.t<30*864e5);
  const me=lbMe();if(me){rows=rows.filter(r=>r.uid!==me.uid);if(scope!=='park'||LB.joined.pub)rows.push(me);}
  rows=rows.filter(r=>r.me||r[period]>0);
  rows.sort((a,b)=>b[period]-a[period]||b.ver-a.ver||b.n-a.n||a.name.localeCompare(b.name));
  for(const r of rows)r.rank=1+rows.filter(x=>x[period]>r[period]).length;
  return rows;}
function lbRankCheck(scope){const rows=lbSorted(scope,'week'),me=rows.find(r=>r.me);if(!me||!me.week)return;
  const key=scope+'|'+weekKey(),prev=LB.ranks[key];
  if(prev&&me.rank<prev){toast(`🏆 You moved up to #${me.rank} ${scope==='park'?'on the park board':'in '+groupName(scope)} this week!`);try{navigator.vibrate&&navigator.vibrate([80,40,80,40,160]);}catch(e){}}
  if(prev!==me.rank){LB.ranks[key]=me.rank;LS.set('lbRanks',LB.ranks);}}
const MEDAL=['🥇','🥈','🥉'];
function lbRow(r,lead,move){const sp=r.rare?SPX[r.rare]:null;
  return el('li',{class:'lbrow'+(r.me?' me':'')},el('span',{class:'lbrank',text:r.rank<=3?MEDAL[r.rank-1]:'#'+r.rank}),el('span',{class:'lbav',text:r.emoji}),
    el('span',{class:'lbtx'},el('b',{text:`${r.name}${r.me?' (you)':''}${lead?' 👑':''}`}),el('small',{text:[r.lv,`${r.n} animals`,r.ver?`✅ ${r.ver}`:'',r.stk>1?`🔥 ${r.stk} days`:'',sp?`💎 ${sp.name}`:''].filter(Boolean).join(' · ')})),
    el('span',{class:'lbpts'},el('b',{text:String(r[LB.period])}),el('small',{text:move>0?`▲ ${move}`:move<0?`▼ ${-move}`:'pts',class:move>0?'up':move<0?'down':''})));}
function openBoard(refresh){
  findTab='board';const keep=refresh&&sheetView==='board'?$('sheetBody').scrollTop:0;
  const nodes=[tabs('board')];
  if(!S.fs){nodes.push(el('p',{class:'hint',text:'The leaderboard needs the shared database, which is not set up on this copy of the app.'}));openSheet('Animals',nodes,{view:'board'});return;}
  if(!LB.joined){nodes.push(...lbJoinForm());openSheet('Animals',nodes,{view:'board'});return;}
  lbParkListen();
  const scopes=[['park','🌍 Whole park'],...(LB.joined.groups||[]).map(c=>[c,'👥 '+groupName(c)])];
  nodes.push(el('div',{class:'lbchips'},...scopes.map(([k,l])=>el('button',{type:'button',class:'lbchip'+(LB.scope===k?' on':''),onclick:()=>{LB.scope=k;lbListen();openBoard();},text:l})),
    el('button',{type:'button',class:'lbchip add',onclick:openNewGroup,text:'＋ Group'})));
  nodes.push(el('div',{class:'seg'},...[['day','Today'],['week','This week'],['all','Overall']].map(([k,l])=>el('button',{type:'button',class:LB.period===k?'on':'',onclick:()=>{LB.period=k;openBoard();},text:l}))));
  const key=LB.scope+'|'+LB.period+'|'+(LB.period==='day'?dayKey():LB.period==='week'?weekKey():'');
  const rows=lbSorted(LB.scope,LB.period),me=rows.find(r=>r.me);
  if(!refresh){LB.base[key]=LS.get('lbSeen:'+key,null);LS.set('lbSeen:'+key,Object.fromEntries(rows.map(r=>[r.uid,r.rank])));}
  const base=LB.base[key]||{};const mv=r=>base[r.uid]?base[r.uid]-r.rank:0;
  const wk=lbSorted(LB.scope,'week');const lead=wk.length&&wk[0].week>0?wk[0].uid:null;
  // your position, and who to catch
  if(LB.scope==='park'&&!LB.joined.pub)nodes.push(el('div',{class:'lbme'},el('b',{text:'You are hidden from the park board.'}),el('small',{text:'Your groups still see you. Change this under "My leaderboard name".'})));
  else if(me){const above=rows.filter(r=>r[LB.period]>me[LB.period]).sort((a,b)=>a[LB.period]-b[LB.period])[0];
    nodes.push(el('div',{class:'lbme'},el('b',{text:me[LB.period]?`You are #${me.rank} of ${rows.length} · ${me[LB.period]} points`:`No points ${LB.period==='day'?'today':LB.period==='week'?'this week':''} yet`}),
      el('small',{text:me[LB.period]?(above?`${above[LB.period]-me[LB.period]+1} points to pass ${above.emoji} ${above.name}.`:rows.length>1?'You are in the lead. Keep spotting!':'You are the first on this board. Invite others!'):'Tick an animal, verify a sighting or report one that others verify to climb the board.'})));}
  // podium and list
  const top=rows.filter(r=>r[LB.period]>0).slice(0,3);
  if(top.length){const order=[top[1],top[0],top[2]].filter(Boolean);
    nodes.push(el('div',{class:'podium'},...order.map(r=>el('div',{class:'pod p'+r.rank+(r.me?' me':'')},el('span',{class:'pav',text:r.emoji}),el('b',{text:r.name}),el('small',{text:`${r[LB.period]} pts`}),el('div',{class:'step',text:MEDAL[r.rank-1]||'#'+r.rank})))));}
  if(rows.length)nodes.push(el('ol',{class:'lblist'},...rows.slice(0,100).map(r=>lbRow(r,r.uid===lead,mv(r)))));
  else nodes.push(el('p',{class:'hint',text:LB.scope==='park'?'Nobody is on the park board yet. Be the first!':'Nobody in this group has points yet.'}));
  if(LB.err==='permission-denied')nodes.push(el('p',{class:'fine',text:'The board could not be loaded: the database rules for the leaderboard are not published yet.'}));
  // share and manage
  nodes.push(el('button',{class:'primary green',type:'button',onclick:openScoreCard,text:'📣 Share my score'}));
  if(LB.scope!=='park')nodes.push(el('button',{class:'secondary',type:'button',onclick:()=>shareInvite(LB.scope),text:`➕ Invite people to ${groupName(LB.scope)} · code ${LB.scope}`}));
  else nodes.push(el('button',{class:'secondary',type:'button',onclick:()=>shareInvite(null),text:'➕ Invite others to the leaderboard'}));
  nodes.push(el('div',{class:'acts'},el('button',{class:'secondary',type:'button',onclick:()=>openSheet('My leaderboard name',lbJoinForm(true),{view:'lbedit'}),text:'My leaderboard name'}),
    LB.scope!=='park'?el('button',{class:'secondary no',type:'button',onclick:()=>leaveGroup(LB.scope),text:'Leave group'}):el('button',{class:'secondary no',type:'button',onclick:confirmLeaveBoard,text:'Leave leaderboard'})));
  nodes.push(el('details',{class:'lbhow'},el('summary',{text:'How points work'}),el('ul',null,
    el('li',{text:'Each animal you tick: 5, 10, 20 or 40 points, by how rare it is.'}),el('li',{text:'Badges: 30 to 100 bonus points.'}),
    el('li',{text:'Verify another driver\'s sighting on the spot: +5.'}),el('li',{text:'Your own sighting verified by someone else: +3.'}),
    el('li',{text:'Today and This week count the points earned in that period (Rwanda time). 🔥 shows days in a row with points, 👑 this week\'s leader.'}),
    el('li',{text:'Only your leaderboard name, animal, level and points are shared. Your list stays on this phone.'}))));
  openSheet('Animals',nodes,{view:'board'});if(keep)$('sheetBody').scrollTop=keep;
}
function lbJoinForm(edit){
  const j=LB.joined||{};const nm=el('input',{class:'search',id:'lb-name',maxlength:'24',placeholder:'Leaderboard name, e.g. Elies or Team Prado',value:j.name||(SOC.profile&&SOC.profile.name)||((LS.get('trip',null)||{}).name)||''});
  let emoji=j.emoji||(SOC.profile&&SOC.profile.emoji)||AVATARS[0];
  const pick=el('div',{class:'grid5'},...AVATARS.map(a=>{const b=el('button',{type:'button',class:'opt'+(a===emoji?' on':''),text:a,onclick:()=>{emoji=a;pick.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.textContent===a));}});return b;}));
  const pub=el('input',{type:'checkbox',id:'lb-pub'});pub.checked=edit?!!j.pub:true;
  const code=el('input',{class:'search',id:'lb-code',maxlength:'6',placeholder:'Group code (optional)',value:LB.pendingJoin||'',style:'text-transform:uppercase'});
  const go=async()=>{const name=nm.value.trim().slice(0,24);if(!name){toast('Choose a leaderboard name.');nm.focus();return;}
    const wasJoined=!!LB.joined;LB.joined=Object.assign({groups:[],gnames:{}},LB.joined,{name,emoji,pub:pub.checked});lbSave();
    const c=(code.value||'').trim().toUpperCase();LB.pendingJoin=null;
    if(c&&!GR.codes.find(g=>g.code===cleanCode(c))){const ok=await grJoin(c,{quiet:true});if(ok)LB.scope=cleanCode(c);}grSave();
    await lbPublish(true);if(LB.err==='permission-denied')toast('Saved on this phone. The leaderboard rules still need to be published in Firebase.');
    else toast(wasJoined?'Saved.':`🏆 Welcome to the leaderboard, ${name}!`);lbParkListen();lbListen();openBoard();};
  const out=[];
  if(!edit)out.push(el('div',{class:'lbintro'},el('b',{text:'🏆 Compete with other drivers'}),el('small',{text:'Earn points for every animal you tick, every sighting you verify on the spot, and every sighting of yours that others verify. Climb the park board, or make a private board for your family or office.'})));
  out.push(el('p',{class:'lbl',text:'Leaderboard name'}),nm,el('p',{class:'lbl',text:'Your animal'}),pick,
    el('label',{class:'toggle',for:'lb-pub'},'Show me on the park-wide board',pub));
  if(!edit)out.push(el('p',{class:'lbl',text:'Got an invite code? (optional)'}),code);
  out.push(el('button',{class:'primary green',type:'button',onclick:go,text:edit?'Save':'Join the leaderboard'}),
    el('p',{class:'fine',text:'Only this name, your animal, level and points are shared with people using the app. You can leave at any time.'}));
  return out;
}
async function joinGroup(code,quiet){return grJoin(code,{quiet});}
async function joinGroupOld(code,quiet){
  code=String(code||'').toUpperCase().replace(/[^A-Z2-9]/g,'');if(code.length!==6){toast('A group code has 6 letters and numbers.');return false;}
  if(!LB.joined)return false;if((LB.joined.groups||[]).includes(code)){LB.scope=code;return true;}
  if((LB.joined.groups||[]).length>=5){toast('You can be in up to 5 groups. Leave one first.');return false;}
  try{await ensureAuth();const {F,db}=S.fs;const g=await F.getDoc(F.doc(db,'lbgroups',code));if(!g.exists()){toast(`No group with the code ${code}.`);return false;}
    LB.joined.groups=[...(LB.joined.groups||[]),code];LB.joined.gnames=Object.assign({},LB.joined.gnames,{[code]:String(g.data().name||code).slice(0,40)});lbSave();
    if(!quiet)toast(`👥 You joined ${groupName(code)}.`);await lbPublish(true);return true;}
  catch(e){toast(e&&e.code==='permission-denied'?'The leaderboard rules are not published in Firebase yet.':'Could not join. Check your signal.');return false;}
}
async function createGroup(name){
  name=String(name||'').trim().slice(0,40);if(!name){toast('Give the group a name.');return;}
  if((LB.joined.groups||[]).length>=5){toast('You can be in up to 5 groups. Leave one first.');return;}
  try{const uid=await ensureAuth();const {F,db}=S.fs;let code=newCode();
    for(let i=0;i<4;i++){const g=await F.getDoc(F.doc(db,'lbgroups',code));if(!g.exists())break;code=newCode();}
    await F.setDoc(F.doc(db,'lbgroups',code),{name,by:uid,createdAt:F.serverTimestamp()});
    LB.joined.groups=[...(LB.joined.groups||[]),code];LB.joined.gnames=Object.assign({},LB.joined.gnames,{[code]:name});lbSave();LB.scope=code;
    await lbPublish(true);lbListen();openBoard();toast(`👥 ${name} created. Code ${code}.`);setTimeout(()=>shareInvite(code),400);}
  catch(e){toast(e&&e.code==='permission-denied'?'The leaderboard rules are not published in Firebase yet.':'Could not create the group. Check your signal.');}
}
function openGroupMenu(){return openNewGroup();}
function openGroupMenuOld(){
  const nm=el('input',{class:'search',maxlength:'40',placeholder:'Group name, e.g. Embassy safari'});
  const code=el('input',{class:'search',maxlength:'6',placeholder:'6-character code',style:'text-transform:uppercase'});
  openSheet('Groups',[el('p',{class:'hint',text:'A group is a private board for your family, friends or office. Share its code or link, and only members appear on it.'}),
    el('p',{class:'lbl',text:'Start a new group'}),nm,el('button',{class:'primary green',type:'button',onclick:()=>createGroup(nm.value),text:'Create group'}),
    el('p',{class:'lbl',text:'Join with a code'}),code,el('button',{class:'secondary',type:'button',onclick:async()=>{if(await joinGroup(code.value)){lbListen();openBoard();}},text:'Join group'}),
    el('button',{class:'secondary',type:'button',onclick:()=>openBoard(),text:'Back to the board'})],{view:'groups'});
}
function leaveGroup(code){grLeave(code).then(()=>{lbListen();openBoard();});}
function leaveGroupOld(code){LB.joined.groups=(LB.joined.groups||[]).filter(c=>c!==code);if(LB.joined.gnames)delete LB.joined.gnames[code];lbSave();LB.scope='park';lbListen();lbPublish(true);openBoard();toast(`You left ${groupName(code)}.`);}
function confirmLeaveBoard(){openSheet('Leave the leaderboard?',[el('p',{class:'hint',text:'Your entry is deleted from the park board and all your groups. Your animal list and points stay on this phone.'}),
  el('button',{class:'primary',style:'background:#C0392B',type:'button',onclick:async()=>{try{const {F,db}=S.fs;if(S.fs.uid)await F.deleteDoc(F.doc(db,'board',S.fs.uid));}catch(e){}
    if(LB.parkUnsub){LB.parkUnsub();LB.parkUnsub=null;}if(LB.unsub){LB.unsub();LB.unsub=null;}LB.joined=null;lbSave();LB.rows={};LB.lastPub='';openBoard();toast('You left the leaderboard.');},text:'Leave and delete my entry'}),
  el('button',{class:'secondary',type:'button',onclick:()=>openBoard(),text:'Stay'})],{view:'lbleave'});}
async function shareOrCopy(data){
  try{if(navigator.share){await navigator.share(data);return;}}catch(e){if(e&&e.name==='AbortError')return;}
  const t=[data.text,data.url].filter(Boolean).join('\n');try{await navigator.clipboard.writeText(t);toast('Copied. Paste it in WhatsApp or a message.');}catch(e){toast(t,null,null,9000);}
}
function shareInvite(code){if(code)return openInvite(code);return shareInviteOld(null);}
function shareInviteOld(code){
  const url=code?`${appURL()}?join=${code}`:`${appURL()}?board=1`;
  const text=code?`Join my Reba leaderboard "${groupName(code)}" 🏆 Open the link, or enter code ${code} under Animals → Board.`:`Join the Reba leaderboard 🏆 Spot, report and verify animals in Akagera National Park and climb the board.`;
  shareOrCopy({title:'Reba leaderboard',text,url});
}
/* score card image, shared as a picture */
function drawScoreCard(){
  const c=document.createElement('canvas');c.width=1080;c.height=1350;const g=c.getContext('2d');
  const st=myStats(),sc=score(),me=LB.joined||{name:'Me',emoji:'🦁'};
  const park=LB.joined?lbSorted('park','week').find(r=>r.me):null,grp=LB.scope!=='park'&&LB.joined?lbSorted(LB.scope,'week').find(r=>r.me):null;
  const bg=g.createLinearGradient(0,0,0,1350);bg.addColorStop(0,'#24452C');bg.addColorStop(1,'#0E2215');g.fillStyle=bg;g.fillRect(0,0,1080,1350);
  g.fillStyle='rgba(247,199,90,.12)';g.beginPath();g.arc(880,230,260,0,7);g.fill();
  g.fillStyle='#14301C';g.beginPath();g.moveTo(0,1120);for(let x=0;x<=1080;x+=60)g.lineTo(x,1100+Math.sin(x/90)*18);g.lineTo(1080,1350);g.lineTo(0,1350);g.fill();
  const EM='"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',TX='Barlow,"Helvetica Neue",Arial,'+EM;
  // shrink the font until the line fits the card
  const T=(t,x,y,font,col,al='center')=>{let f=font.replace(/Barlow,sans-serif|Barlow,.*$/,TX);g.font=f;let px=+(/(\d+)px/.exec(f)||[0,40])[1];
    while(g.measureText(t).width>980&&px>18){px-=2;f=f.replace(/\d+px/,px+'px');g.font=f;}g.fillStyle=col;g.textAlign=al;g.textBaseline='alphabetic';g.fillText(t,x,y);};
  T('REBA',540,110,'700 52px Barlow,sans-serif','#F7C75A');T('Akagera safari leaderboard',540,160,'500 34px Barlow,sans-serif','rgba(255,255,255,.75)');
  T(me.emoji,540,330,`150px ${EM}`,'#fff');T(me.name,540,430,'800 72px Barlow,sans-serif','#fff');T(sc.lv[1].toUpperCase(),540,490,'700 38px Barlow,sans-serif','#9FD3A9');
  T(String(st.pts),540,660,'800 190px Barlow,sans-serif','#F7C75A');T('points',540,720,'600 44px Barlow,sans-serif','rgba(255,255,255,.85)');
  const lines=[];if(park&&park.week)lines.push(`#${park.rank} this week on the park board`);if(grp&&grp.week)lines.push(`#${grp.rank} this week in ${groupName(LB.scope)}`);
  lines.slice(0,2).forEach((l,i)=>T(l,540,810+i*58,'700 44px Barlow,sans-serif','#fff'));
  T(`${st.n} of ${LISTED.length} animals  ·  ${sc.badges.length} badge${sc.badges.length===1?'':'s'}`,540,950,'600 40px Barlow,sans-serif','rgba(255,255,255,.92)');
  T(`✅ ${st.ver} verified${st.stk>1?`   🔥 ${st.stk} days in a row`:''}`,540,1005,'600 40px Barlow,sans-serif','rgba(255,255,255,.92)');
  let rare=null;for(const x of LISTED)if(has(x.id)&&(!rare||x.rarity>rare.rarity))rare=x;
  if(rare)T(`💎 Rarest find: ${rare.name}`,540,1070,'700 42px Barlow,sans-serif','#F7C75A');
  if(sc.badges.length)T(sc.badges.map(b=>b.icon).join(' '),540,1150,`60px ${EM}`,'#fff');
  T('Can you beat me? Join on',540,1230,'500 34px Barlow,sans-serif','rgba(255,255,255,.75)');T(appURL().replace(/^https?:\/\//,'').replace(/\/$/,''),540,1285,'700 38px Barlow,sans-serif','#fff');
  return c;
}
function openScoreCard(){
  const c=drawScoreCard();const img=el('img',{class:'scoreimg',alt:'Your score card',src:c.toDataURL('image/png')});
  let file=null;c.toBlob(b=>{if(b)file=new File([b],'reba-score.png',{type:'image/png'});},'image/png');
  const st=myStats(),park=LB.joined?lbSorted('park','week').find(r=>r.me):null;
  const text=`🦁 ${st.pts} points on Reba${park&&park.week?`, #${park.rank} on the park board this week`:''}. ${st.n} animals ticked, ${st.ver} sightings verified. Can you beat me?`;
  const url=LB.scope!=='park'?`${appURL()}?join=${LB.scope}`:`${appURL()}?board=1`;
  openSheet('Share my score',[img,
    el('button',{class:'primary green',type:'button',onclick:async()=>{try{if(file&&navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:text+' '+url,title:'Reba · Akagera'});return;}}catch(e){if(e&&e.name==='AbortError')return;}shareOrCopy({title:'Reba · Akagera',text,url});},text:'📣 Share picture'}),
    el('button',{class:'secondary',type:'button',onclick:()=>shareOrCopy({title:'Reba · Akagera',text,url}),text:'Share as text'}),
    el('a',{class:'secondary',href:img.src,download:'akagera-score.png',text:'Save picture'}),
    el('button',{class:'secondary',type:'button',onclick:()=>openBoard(),text:'Back to the board'})],{view:'scorecard'});
}
/* links: ?join=CODE opens the board and joins the group, ?board=1 opens the board */
function lbHandleLink(){
  const u=new URLSearchParams(location.search);const code=(u.get('join')||'').toUpperCase().replace(/[^A-Z2-9]/g,'').slice(0,6),board=u.has('board');
  if(!code&&!board)return;history.replaceState(null,'',location.pathname);
  if(code){const c=cleanCode(code);const go=()=>grJoin(c).then(ok=>{if(ok){LB.scope=c;openGroupChat(c);}else openJoinGroup(c);});
    if(myName())go();else openJoinGroup(c);return;}
  openFind('board');
}

/* =========================================================================
   Offline: what is saved on the phone, a one-tap download, and offline mode
   ========================================================================= */
function offlineMode(){return !!S.set.offline||!navigator.onLine;}
const OFFLINE_FLAG=new URL('__akl_offline',location.href).href;     // the service worker reads this to stop using the network
async function setOfflineMode(on){
  S.set.offline=!!on;saveSet();
  try{const c=await caches.open('akl-ext');if(on)await c.put(OFFLINE_FLAG,new Response('1'));else await c.delete(OFFLINE_FLAG);}catch(e){}
  if(S.fs&&S.fs.F&&S.fs.db){try{on?await S.fs.F.disableNetwork(S.fs.db):await S.fs.F.enableNetwork(S.fs.db);}catch(e){}}
  if(!on){loadWeather(true);loadPhotos();}
  setSync();updateWxPill();redraw();
}
async function offlineStatus(){
  const st={};
  try{st.app=!!(await caches.match('app.js',{ignoreSearch:true}))&&!!(await caches.match('data/osm.json',{ignoreSearch:true}));
    const keys=await (await caches.open('akl-tiles')).keys();
    st.official=keys.filter(k=>k.url.includes('/data/official/')&&k.url.endsWith('.webp')).length;
    st.sat=keys.filter(k=>k.url.includes('arcgisonline')).length;
    const urls=new Set(Object.values(PH.url));st.photos=keys.filter(k=>urls.has(k.url)).length;}catch(e){}
  try{const j=OFF.idx||await getJSON('data/official/index.json');st.offTotal=Object.values(j.tiles).reduce((a,v)=>a+v.length,0)+1;}catch(e){}
  try{const e=await navigator.storage.estimate();st.used=e.usage;st.persist=navigator.storage.persisted?await navigator.storage.persisted():false;}catch(e){}
  return st;
}
const tmo=(p,ms)=>Promise.race([Promise.resolve(p),new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),ms))]);
let OFFBUSY=false;
async function openOffline(known){
  let st=known&&known.__st?known:null;
  if(!st){const p=offlineStatus().then(x=>Object.assign(x,{__st:1}));st=await Promise.race([p,new Promise(r=>setTimeout(()=>r(null),1200))]);
    if(!st){st={__st:1};p.then(x=>{if(sheetView==='offline'&&!OFFBUSY)openOffline(x);}).catch(()=>{});}}   // slow lookup: show the sheet now, fill it in when ready
  const pend=allReports().filter(r=>r.pending).length,offAt=LS.get('offlineAt',0);
  const row=(ok,title,detail)=>el('div',{class:'offrow '+(ok===true?'ok':ok===false?'no':'part')},el('span',{class:'oi',text:ok===true?'✓':ok===false?'–':'◐'}),el('div',null,el('b',{text:title}),el('small',{text:detail})));
  const tg=el('input',{type:'checkbox',id:'set-offline'});tg.checked=!!S.set.offline;
  tg.onchange=async()=>{await setOfflineMode(tg.checked);toast(tg.checked?'Offline mode: only what is saved on this phone is used. Reports wait and send when you switch it off.':'Offline mode is off. Waiting reports are sending.');openOffline();};
  const state=S.set.offline?['mode','Offline mode is on','The app uses only what is saved on this phone. Reports, verifications and chat messages wait and send when you switch offline mode off.']
    :navigator.onLine?['on','You have signal',offAt?`Offline data saved ${stamp(offAt)}. Update it before each trip.`:'Save the park now, before you drive into areas without signal.']
    :['off','No signal','Everything with a tick below works without signal. Reports wait on the phone and send by themselves when signal returns.'];
  const nodes=[el('div',{class:'offstate '+state[0]},el('b',{text:state[1]}),el('small',{text:state[2]})),
    el('button',{class:'primary green',type:'button',id:'offDl',disabled:OFFBUSY?'':null,onclick:()=>downloadOffline(),text:OFFBUSY?'Saving…':(offlineMode()?'⬇️ Switch off offline mode and download':offAt?'⬇️ Update offline data':'⬇️ Download everything for offline')}),
    el('p',{class:'fine',id:'offProg',text:offlineMode()?'Offline mode is on, so nothing is downloaded. The button below switches it off first.':offAt&&Date.now()-offAt<3600e3?`✅ Saved ${stamp(offAt)}. The park map works without signal.`:'About 5 MB: the app, maps, official park map, animal photos and the 7-day forecast.'}),
    el('label',{class:'toggle',for:'set-offline'},'Offline mode (saves data and battery)',tg),
    el('p',{class:'lbl',text:'Saved on this phone'}),
    row(st.app?true:false,'Park map, roads and routing',st.app?'The map, junction stones, routes and spoken directions work without signal.':'Not saved yet.'),
    row(st.offTotal&&st.official>=st.offTotal?true:st.official?null:false,'Official park map',`${st.official||0} of ${st.offTotal||'–'} parts saved.`),
    row(st.photos>=SP.filter(x=>x.wiki).length-2?true:st.photos?null:false,'Animal guide and photos',`${st.photos||0} of ${SP.filter(x=>x.wiki).length} photos. Facts and safety advice are always on the phone.`),
    row(S.wx&&S.wx.v===2?(Date.now()-S.wx.fetched<12*3600e3?true:null):false,'Weather forecast',S.wx?`7-day forecast from ${stamp(S.wx.fetched)}.`:'Not saved yet.'),
    row(S.fs?(S.lastSync?(Date.now()-S.lastSync<6*3600e3?true:null):false):null,'Sightings and road reports',S.fs?`${S.lastSync?`Last update ${stamp(S.lastSync)}.`:'Not loaded yet.'}${pend?` ${pend} of yours waiting to send.`:''}`:'Kept on this phone only (no shared database).'),
    row(true,'Emergency numbers and SOS','Built in. Calls and SMS use the phone network and often work where mobile data does not.'),
    row(st.sat?null:false,'Satellite images',`${st.sat||0} pieces from areas you have looked at. Satellite images cannot be downloaded in advance; the park map and the official map cover the whole park.`),
    el('p',{class:'fine',text:st.used!=null?`Using ${(st.used/1048576).toFixed(1)} MB on this phone${st.persist?', protected from automatic clean-up':''}.`:''})];
  openSheet('Offline',nodes,{view:'offline'});
}
async function downloadOffline(){
  if(OFFBUSY)return;
  const say_=t=>{const p=$('offProg');if(p)p.textContent=t;const b=$('offDl');if(b){b.disabled=true;b.textContent=t.length<28?t:'Saving…';}};
  OFFBUSY=true;say_('Getting ready…');
  try{
    if(offlineMode()){await setOfflineMode(false);say_('Getting ready…');}
    if(!navigator.onLine){toast('No signal right now. Try again when you have signal.');OFFBUSY=false;if(sheetView==='offline')openOffline();return;}
    try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});}catch(e){}   // not awaited: some phones wait for a prompt
    const core=['./','index.html','app.css','app.js','config.js','species.js','emergency.js','manifest.webmanifest','data/board.json','data/osm.json','data/official.json','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','icons/favicon.svg','lib/qrcode.js'];
    const off=[];try{const j=await tmo(getJSON('data/official/index.json'),8000);off.push('data/official/park-map-2020.webp');for(const z in j.tiles)for(const [x,y] of j.tiles[z])off.push(`data/official/${z}/${x}/${y}.webp`);}catch(e){}
    say_('Finding animal photos…');try{await tmo(loadPhotos(),8000);}catch(e){}
    const jobs=[...core.map(u=>[u,{cache:'no-cache'}]),...off.map(u=>[u,{}]),...Object.values(PH.url).map(u=>[u,{mode:'no-cors'}])];
    let done=0,fail=0;const total=jobs.length+1;
    const get=(u,o)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),25000);return fetch(u,{...o,signal:c.signal}).then(r=>{if(!r.ok&&r.type!=='opaque')fail++;}).catch(()=>{fail++;}).finally(()=>{clearTimeout(t);done++;});};
    for(let i=0;i<jobs.length;i+=6){await Promise.all(jobs.slice(i,i+6).map(([u,o])=>get(u,o)));say_(`Saving… ${Math.round(done/total*100)}%`);}
    say_('Saving the weather forecast…');try{await tmo(loadWeather(true),10000);}catch(e){}
    LS.set('offlineAt',Date.now());
    toast(fail?`Offline data saved, ${fail} files missing.`:'✅ Offline data saved.');
    OFFBUSY=false;if(sheetView==='offline')await openOffline();
    const pr=$('offProg');if(pr)pr.textContent=fail?`Saved, but ${fail} files did not download. Try again with better signal.`:'✅ Saved. The park map works without signal now.';
  }catch(e){OFFBUSY=false;toast('Could not save everything. Try again with better signal.');if(sheetView==='offline')openOffline();}
  OFFBUSY=false;
}
function offerOffline(){
  if(offlineMode()||LS.get('offlineAt',0)>Date.now()-7*864e5||LS.get('offerOff',0)>Date.now()-2*864e5)return;
  setTimeout(()=>{if(!$('banner').hidden||offlineMode())return;LS.set('offerOff',Date.now());
    banner('📥 Save the park for areas without signal (about 5 MB).','Save',()=>{hideBanner();openOffline();setTimeout(downloadOffline,300);});
    setTimeout(()=>{const b=$('banner');if(b&&!b.hidden&&b.textContent.includes('without signal'))hideBanner();},20000);},7000);
}

/* =========================================================================
   11f. Trip planner: several stops, time at each, leave-at or arrive-by,
        and arrival ranges (animals, photo stops and tracks slow you down)
   ========================================================================= */
const PACES=[['direct','Direct',1,'Mostly driving'],['game','Game drive',1.4,'Slow driving and short animal stops'],['slow','Slow, many photos',1.8,'Plenty of long stops']];
const DWELLS=[0,5,10,15,20,30,45,60,90,120];
const RANGE_LO=0.9,RANGE_HI=1.25;               // how much faster or slower than planned a leg can turn out
let PLAN=Object.assign({start:{kind:'me'},stops:[],end:'last',mode:'depart',time:'',day:0,pace:'game'},LS.get('plan',{}));
const PL={r:null,err:null,tl:[],tot:null,t0:null};
const planOn=()=>S.planMode||sheetView==='planner'||pickMode==='plan'||pickMode==='planstart';
function planSave(){LS.set('plan',PLAN);}
function plStart(){if(PLAN.start.kind==='place'){const q=merc(PLAN.start.lon,PLAN.start.lat);return {x:q[0],y:q[1],name:PLAN.start.name};}const p=myPos();return p?{x:p.x,y:p.y,name:'your position'}:null;}
function plGates(){return S.pois.filter(p=>p.cat==='gate');}
function plStops(){const out=PLAN.stops.map(s=>{const q=merc(s.lon,s.lat);return {...s,x:q[0],y:q[1]};});const st=plStart();
  if(out.length&&PLAN.end==='start'&&st)out.push({id:'_end',name:PLAN.start.kind==='me'?'Back to the start':`Back to ${PLAN.start.name}`,x:st.x,y:st.y,dwell:0,fixed:true});
  else if(out.length&&PLAN.end.startsWith('gate:')){const g=plGates().find(p=>p.name===PLAN.end.slice(5));if(g)out.push({id:'_end',name:g.short||g.name,x:g.x,y:g.y,dwell:0,fixed:true});}
  return out;}
function plTargetMs(){if(!PLAN.time)return null;const [h,m]=PLAN.time.split(':').map(Number);const d=new Date();d.setHours(h,m,0,0);return d.getTime()+(PLAN.day||0)*864e5;}
function planResolve(){let ch=false;
  for(const s of PLAN.stops){if(s.kind!=='species')continue;const r=freshest(s.sp);
    if(r){if(s.rid!==r.id||s.stale){Object.assign(s,{lat:r.lat,lon:r.lon,rid:r.id,seen:r.lastSeen,stale:false});ch=true;}}else if(!s.stale){s.stale=true;ch=true;}}
  if(ch)planSave();}
function planCompute(){
  planResolve();PL.r=null;PL.err=null;PL.tl=[];PL.tot=null;
  const from=plStart(),stops=plStops();if(!stops.length)return;if(!from){PL.err={error:'nopos'};return;}
  const r=routeMulti(from,stops);if(r.error){PL.err=r;return;}
  const k=(PACES.find(p=>p[0]===PLAN.pace)||PACES[1])[2];let lo=0,hi=0,mid=0;
  r.legs.forEach((L,i)=>{const t=L.time*k,st=stops[i];lo+=t*RANGE_LO;hi+=t*RANGE_HI;mid+=t;PL.tl.push({st,len:L.len,drive:t,lo,hi,mid,dw:(st.dwell||0)*60});const dw=(st.dwell||0)*60;lo+=dw;hi+=dw;mid+=dw;});
  const last=PL.tl[PL.tl.length-1],target=plTargetMs();
  // arrive by: leave early enough that even the slow case is on time
  PL.t0=PLAN.mode==='arrive'&&target?target-last.hi*1000:(PLAN.mode==='depart'&&target?target:Date.now()+60e3);
  PL.tot={len:r.len,drive:PL.tl.reduce((a,x)=>a+x.drive,0),dwell:PL.tl.reduce((a,x)=>a+x.dw,0)-last.dw,endLo:PL.t0+last.lo*1000,endHi:PL.t0+last.hi*1000};
  r.destName=last.st.name;r.stops=r.stops||[{...stops[0],d:r.len}];PL.r=r;
}
function fitPlan(r){const pts=[...r.pts];for(const s of PLAN.stops){const q=merc(s.lon,s.lat);pts.push(q);}
  let x0=1e18,y0=1e18,x1=-1e18,y1=-1e18;for(const q of pts){x0=Math.min(x0,q[0]);y0=Math.min(y0,q[1]);x1=Math.max(x1,q[0]);y1=Math.max(y1,q[1]);}
  const d=$('planDock'),dh=d&&!d.hidden&&d.offsetHeight?d.offsetHeight:210,top=70,bot=H-dh-24,vh=Math.max(120,bot-top);
  S.follow=false;$('followBtn').classList.remove('on');cam.rot=0;cam.ax=.5;cam.ay=clamp((top+vh/2)/H,.2,.6);cam.s=clamp(Math.min((W-110)/(x1-x0+1),(vh-50)/(y1-y0+1)),0.004,0.2);cam.cx=(x0+x1)/2;cam.cy=(y0+y1)/2;redraw();}
function planShow(fit){planCompute();S.route=PL.r;if(fit&&PL.r){if(S.planMode&&sheetView!=='planner')fitPlan(PL.r);else fitRoute(PL.r);}redraw();if(S.planMode&&sheetView!=='planner')setTimeout(renderDock,0);}
function plNameAt(x,y){
  let bj=null,bd=250;for(const j of S.juncs){const d=gd(j.x,j.y,x,y);if(d<bd){bd=d;bj=j;}}if(bj)return {name:'Junction '+bj.num,x:bj.x,y:bj.y,kind:'junction'};
  let bp=null;bd=300;for(const p of S.pois){if(p.cat==='area'||p.cat==='lake'||p.cat==='fence')continue;const d=gd(p.x,p.y,x,y);if(d<bd){bd=d;bp=p;}}if(bp)return {name:bp.short||bp.name,x:bp.x,y:bp.y,kind:bp.cat};
  return {name:'Spot '+whereText(x,y,true),x,y,kind:'pin'};}
function addPlanStop(o,quiet){
  if(PLAN.stops.length>=12){toast('A plan can have up to 12 stops.');return false;}
  if(o.kind==='species'&&PLAN.stops.some(s=>s.kind==='species'&&s.sp===o.sp)){if(!quiet)toast(`${o.name} is already in the trip.`);return false;}
  const u=unmerc(o.x,o.y);PLAN.stops.push({id:'s'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:String(o.name).slice(0,60),lat:+u.lat.toFixed(6),lon:+u.lon.toFixed(6),kind:o.kind||'pin',dwell:o.dwell??({lookout:20,picnic:45,camp:20,lodge:30,junction:0,pin:10,animal:15,species:15}[o.kind]??10),...(o.kind==='species'?{sp:o.sp,rid:o.rid,seen:o.seen}:{})});
  planSave();if(S.planMode)renderDock();if(!quiet)toast(`Added to your trip: ${o.name} (${PLAN.stops.length} stop${PLAN.stops.length>1?'s':''})`,'Show trip',()=>enterPlanMode(false));return true;}
function planMove(i,d,quiet){const j=i+d;if(j<0||j>=PLAN.stops.length)return;[PLAN.stops[i],PLAN.stops[j]]=[PLAN.stops[j],PLAN.stops[i]];planSave();if(quiet){planShow(false);renderDock();}else openPlanner(true);}
function planDel(i){PLAN.stops.splice(i,1);planSave();openPlanner(true);}
/* best order: fixed start, fixed end if returning or leaving by a gate; exact up to 7 stops, otherwise nearest-neighbour + 2-opt */
function planOptimizeQuiet(){planOptimize(true);}
function planOptimize(quiet){
  const from=plStart(),all=plStops();if(!from||PLAN.stops.length<3){if(!quiet)toast('Add at least three stops to change the order.');return;}
  const free=all.filter(s=>!s.fixed),end=all.find(s=>s.fixed),pts=[from,...free,...(end?[end]:[])],n=pts.length,pp=penalties();
  const sn=pts.map((p,i)=>snap(p.x,p.y,i?8000:15000));if(sn.some(x=>!x)){if(!quiet)toast('Some stops are too far from a park road.');return;}
  const T=Array.from({length:n},()=>new Array(n).fill(Infinity));
  for(let i=0;i<n;i++)for(let j=1;j<n;j++)if(i!==j){const r=route(pts[i].x,pts[i].y,pts[j].x,pts[j].y,'',{pp,costOnly:true,s0:sn[i],s1:sn[j]});T[i][j]=r.error?Infinity:r.cost;}
  const m=free.length,E=end?n-1:-1,cost=ord=>{let c=0,p=0;for(const q of ord){c+=T[p][q];p=q;}if(E>0)c+=T[p][E];return c;};
  const cur=free.map((_,i)=>i+1),before=cost(cur);let best=cur.slice(),bc=before;
  if(m<=7){const perm=(a,l)=>{if(l===a.length){const c=cost(a);if(c<bc){bc=c;best=a.slice();}return;}for(let i=l;i<a.length;i++){[a[l],a[i]]=[a[i],a[l]];perm(a,l+1);[a[l],a[i]]=[a[i],a[l]];}};perm(cur.slice(),0);}
  else{let ord=[],left=new Set(cur),p=0;while(left.size){let b=null,bv=Infinity;for(const q of left)if(T[p][q]<bv){bv=T[p][q];b=q;}ord.push(b);left.delete(b);p=b;}
    let imp=true;while(imp){imp=false;for(let i=0;i<ord.length-1;i++)for(let j=i+1;j<ord.length;j++){const c=ord.slice(0,i).concat(ord.slice(i,j+1).reverse(),ord.slice(j+1));if(cost(c)<cost(ord)-1){ord=c;imp=true;}}}
    if(cost(ord)<bc){bc=cost(ord);best=ord;}}
  const k=(PACES.find(p=>p[0]===PLAN.pace)||PACES[1])[2],saved=(before-bc)*k;
  PLAN.stops=best.map(i=>PLAN.stops[i-1]);planSave();if(quiet)return;if(S.planMode&&sheetView!=='planner'){planShow(false);renderDock();}else openPlanner(true,true);
  toast(saved>60?`New order saves about ${fmtDur(saved)} of driving.`:'Your order was already the quickest.');
}
function planText(){
  planCompute();if(!PL.r)return '';const L=[`Akagera trip plan (${fmtD(PL.tot.len)}, ${PL.tl.length} stops)`,`Leave ${hhmm(PL.t0)} ${dayWord(PL.t0)} from ${plStart().name}`];
  PL.tl.forEach((x,i)=>L.push(`${i+1}. ${x.st.name}: ${fmtD(x.len)}, arrive ${hhmm(PL.t0+x.lo*1000)}–${hhmm(PL.t0+x.hi*1000)}${x.dw&&i<PL.tl.length-1?`, stay ${fmtDur(x.dw)}`:''}`));
  L.push(`Finish ${hhmm(PL.tot.endLo)}–${hhmm(PL.tot.endHi)}`,appURL());return L.join('\n');}
/* the planner sheet */
function openPlanner(refresh,fit){
  const keep=refresh&&sheetView==='planner'?$('sheetBody').scrollTop:0;
  if(pickMode)endPick();
  planShow(!refresh||fit);
  const nodes=[],from=plStart(),now=Date.now();
  const seg=(opts,cur,on)=>{const b=el('div',{class:'seg'},...opts.map(([v,l])=>el('button',{type:'button',class:cur===v?'on':'',onclick:()=>on(v),text:l})));b.style.gridTemplateColumns=`repeat(${opts.length},1fr)`;return b;};
  // start
  nodes.push(el('div',{class:'plstart'},el('span',{class:'plnum s',text:'S'}),el('div',null,el('b',{text:PLAN.start.kind==='me'?'Start: your position':`Start: ${PLAN.start.name}`}),
      el('small',{text:from?(PLAN.start.kind==='me'?(myPos().gps?'Live GPS':'Set by hand'):'Chosen place'):'Set your position first'})),
    el('button',{type:'button',class:'plmini',onclick:openPlanStart,text:'Change'})));
  // stops with legs
  if(!PLAN.stops.length)nodes.push(el('p',{class:'hint',text:'Add the places you want to visit: tap them on the map, or pick junction stones, places or sightings. Then set how long you stay at each.'}));
  const items=[];
  PLAN.stops.forEach((s,i)=>{const x=PL.tl[i];const dw=el('select',{class:'pldw','aria-label':'Time at this stop'},...DWELLS.map(m=>{const o=el('option',{value:String(m),text:m?`Stay ${m>=60?fmtDur(m*60):m+' min'}`:'Drive past'});if((s.dwell||0)===m)o.selected=true;return o;}));
    dw.onchange=()=>{s.dwell=+dw.value;planSave();openPlanner(true);};
    let risk='';if(x){const q=wxPt(PLAN.stops[i].lat);const R=q?riskText(wxRisks(q,PL.t0+x.lo*1000,PL.t0+x.hi*1000+x.dw*1000)):'';if(R)risk=`${R.icon} ${R.word.toLowerCase()}`;}
    items.push(el('li',{class:'plstop'},el('span',{class:'plnum',text:String(i+1)}),
      el('div',{class:'pltx'},el('b',{text:s.kind==='species'?`${(SPX[s.sp]||{}).emoji||'🐾'} ${s.name}`:s.name}),el('small',{text:x?`${fmtD(x.len)} · ${fmtDur(x.drive)} drive · arrive ${hhmm(PL.t0+x.lo*1000)}–${hhmm(PL.t0+x.hi*1000)}${risk?' · '+risk:''}`:PL.err?'No route':'…'}),
      s.kind==='species'?el('small',{class:s.stale?'stale':'fresh',text:s.stale?'No recent sighting: last known spot.':`Freshest sighting ${s.seen?hhmm(s.seen)+' ('+ago(s.seen)+')':''}${x&&s.seen?` · about ${fmtDur(Math.max(60,(PL.t0+x.mid*1000-s.seen)/1000))} old when you arrive`:''}`}):null,dw),
      el('div',{class:'plbtns'},el('button',{type:'button',class:'plmini','aria-label':'Move up',disabled:i===0?'':null,onclick:()=>planMove(i,-1),text:'↑'}),el('button',{type:'button',class:'plmini','aria-label':'Move down',disabled:i===PLAN.stops.length-1?'':null,onclick:()=>planMove(i,1),text:'↓'}),el('button',{type:'button',class:'plmini no','aria-label':'Remove',onclick:()=>planDel(i),text:'✕'}))));});
  const endTl=PL.tl.length>PLAN.stops.length?PL.tl[PL.tl.length-1]:null;
  if(endTl)items.push(el('li',{class:'plstop end'},el('span',{class:'plnum s',text:'⚑'}),el('div',{class:'pltx'},el('b',{text:endTl.st.name}),el('small',{text:`${fmtD(endTl.len)} · ${fmtDur(endTl.drive)} drive · arrive ${hhmm(PL.t0+endTl.lo*1000)}–${hhmm(PL.t0+endTl.hi*1000)}`}))));
  if(items.length)nodes.push(el('ol',{class:'plstops'},...items));
  if(PL.err)nodes.push(el('div',{class:'warnrow',text:PL.err.error==='nopos'?'Set your position or choose a start place to plan the route.':`No route to ${PL.err.stop?PL.err.stop.name:'one of the stops'} on park roads. Remove it or pick a point closer to a road.`}));
  // add stops
  nodes.push(el('p',{class:'lbl',text:'Add stops'}),el('div',{class:'pladd'},
    el('button',{type:'button',class:'secondary',onclick:()=>enterPlanMode(),text:'🗺️ On the map'}),el('button',{type:'button',class:'secondary',onclick:()=>openFindAnimals(),text:'🦁 Animals'}),
    el('button',{type:'button',class:'secondary',onclick:()=>openPlanPick('place'),text:'🔎 Place'}),el('button',{type:'button',class:'secondary',onclick:()=>openPlanPick('junction'),text:'⑦ Junction stone'}),el('button',{type:'button',class:'secondary',onclick:()=>openPlanPick('sighting'),text:'👁️ Sighting'})));
  // end of the trip
  const gates=plGates();
  nodes.push(el('p',{class:'lbl',text:'End of the trip'}),seg([['last','At the last stop'],['start','Back to start'],['gate','Leave by a gate']],PLAN.end.startsWith('gate:')?'gate':PLAN.end,v=>{PLAN.end=v==='gate'?'gate:'+(gates.find(g=>/south/i.test(g.name))||gates[0]).name:v;planSave();openPlanner(true,true);}));
  if(PLAN.end.startsWith('gate:')){const gs=el('select',{class:'search','aria-label':'Gate'},...gates.map(g=>{const o=el('option',{value:g.name,text:g.short||g.name});if(PLAN.end==='gate:'+g.name)o.selected=true;return o;}));gs.onchange=()=>{PLAN.end='gate:'+gs.value;planSave();openPlanner(true,true);};nodes.push(gs);}
  // time
  const tIn=el('input',{type:'time',class:'search pltime',value:PLAN.time||'','aria-label':PLAN.mode==='arrive'?'Arrive by':'Leave at'});tIn.onchange=()=>{PLAN.time=tIn.value;planSave();openPlanner(true);};
  nodes.push(el('p',{class:'lbl',text:'Timing'}),seg([['depart','Leave at'],['arrive','Arrive by']],PLAN.mode,v=>{PLAN.mode=v;if(v==='arrive'&&!PLAN.time)PLAN.time='17:30';planSave();openPlanner(true);}),
    el('div',{class:'pltimes'},tIn,seg([[0,'Today'],[1,'Tomorrow']],PLAN.day||0,v=>{PLAN.day=v;planSave();openPlanner(true);}),
      PLAN.mode==='depart'?el('button',{type:'button',class:'plmini wide',onclick:()=>{PLAN.time='';PLAN.day=0;planSave();openPlanner(true);},text:'Now'}):null),
    el('p',{class:'lbl',text:'Pace'}),seg(PACES.map(p=>[p[0],p[1]]),PLAN.pace,v=>{PLAN.pace=v;planSave();openPlanner(true);}),
    el('p',{class:'fine',text:(PACES.find(p=>p[0]===PLAN.pace)||PACES[1])[3]+'. Times are shown as a range, because animals on the road, photo stops and track conditions can slow you down.'}));
  // summary
  if(PL.r&&PL.tot){const T=PL.tot,late=PLAN.mode==='arrive'&&plTargetMs()&&PL.t0<now;
    nodes.push(el('div',{class:'plsum'},el('div',{class:'big',text:`${fmtD(T.len)} · ${fmtDur(T.drive)} driving`}),
      el('div',{text:`${T.dwell?`Plus ${fmtDur(T.dwell)} at stops · `:''}${PL.tl.length} stop${PL.tl.length>1?'s':''}`}),
      el('div',{class:'when',text:PLAN.mode==='arrive'&&plTargetMs()?(late?`Too late to arrive by ${PLAN.time}. Leaving now you would arrive ${hhmm(now+(T.endLo-PL.t0))}–${hhmm(now+(T.endHi-PL.t0))}.`:`Leave by ${hhmm(PL.t0)} ${dayWord(PL.t0)} to arrive by ${PLAN.time}. Likely arrival ${hhmm(T.endLo)}–${hhmm(T.endHi)}.`)
        :`Leave ${PLAN.time?hhmm(PL.t0)+' '+dayWord(PL.t0):'now'} · finish ${hhmm(T.endLo)}–${hhmm(T.endHi)}`})));
    // notes: opening hours, sunset, weather, closed tracks
    const q=wxPt(unmerc(PL.r.pts[0][0],PL.r.pts[0][1]).lat),d=q&&dayAt(q,T.endHi);
    if(rwHour(PL.t0)<6)nodes.push(el('div',{class:'warnrow',style:'background:#F3E6F7;color:#4A2660',text:`🌅 You would leave at ${hhmm(PL.t0)}, before the park opens at 06:00 for day visitors.`}));
    if(d&&d.set&&T.endHi>d.set&&T.endLo<d.set+6*3600e3)nodes.push(el('div',{class:'warnrow',style:'background:#F3E6F7;color:#4A2660',text:`🌇 You may finish after sunset (${hhmm(d.set)}). The park is open 06:00–18:00 for day visitors.`}));
    else if(rwHour(T.endHi)>=18||rwHour(T.endHi)<rwHour(PL.t0))nodes.push(el('div',{class:'warnrow',style:'background:#F3E6F7;color:#4A2660',text:`🌇 You may finish after 18:00, when the park closes for day visitors.`}));
    const wr=[];PL.tl.forEach(x=>{const pt=wxPt(unmerc(x.st.x,x.st.y).lat);const R=pt&&riskText(wxRisks(pt,PL.t0+x.lo*1000,PL.t0+x.hi*1000+x.dw*1000));if(R)wr.push(R);});
    if(wr.length){const R=wr.find(r=>r.kind==='storm')||wr[0];nodes.push(el('div',{class:'warnrow'+(R.kind==='storm'?' storm':''),style:R.kind==='storm'?'':'background:#DCEAF8;color:#1D4F86',text:`${R.icon} ${R.word} during the trip (${R.span}). ${R.kind==='storm'?lightningAdvice():'Tracks get slippery fast; the route keeps to main roads where it can.'}`}));}
    if(PL.r.offLen>50)nodes.push(el('div',{class:'warnrow',style:'background:#FFF1D6;color:#6A4300',text:`ⓘ ${fmtD(PL.r.offLen)} on ${PL.r.offNames.join(', ')||'tracks'} that OpenStreetMap marks closed. Ask at reception.`}));
    if(PL.r.sights&&PL.r.sights.length)nodes.push(el('div',{class:'warnrow',style:'background:#E4F2E8;color:#1E4D2E',text:`🦁 Near your route: ${[...new Set(PL.r.sights.slice(0,5).map(x=>label(x)))].join(', ')}.`}));
    nodes.push(el('div',{class:'acts'},el('button',{class:'secondary',type:'button',onclick:startPreview,text:'▶ Preview'}),el('button',{class:'primary green',type:'button',onclick:()=>{S.route=PL.r;startNav();},text:'Start'})));
  }
  // order, save, share
  const tools=[];
  if(PLAN.stops.length>=3)tools.push(el('button',{class:'secondary',type:'button',onclick:planOptimize,text:'🔀 Quickest order'}));
  if(PLAN.stops.length){if(GR.codes.length)tools.push(el('button',{class:'secondary',type:'button',onclick:sendPlanToGroup,text:'💬 Send to a group'}));tools.push(el('button',{class:'secondary',type:'button',onclick:openPlanSave,text:'💾 Save plan'}),el('button',{class:'secondary',type:'button',onclick:()=>shareOrCopy({title:'Akagera trip plan',text:planText()}),text:'📤 Share'}),
    el('button',{class:'secondary no',type:'button',onclick:()=>{PLAN.stops=[];planSave();openPlanner(true);},text:'Clear stops'}));}
  if(tools.length)nodes.push(el('div',{class:'pltools'},...tools));
  const saved=LS.get('plans',[]);
  if(saved.length)nodes.push(el('p',{class:'lbl',text:'My saved plans'}),el('ul',{class:'list'},...saved.map((s,i)=>el('li',null,el('button',{type:'button',onclick:()=>{PLAN=Object.assign({},PLAN,JSON.parse(JSON.stringify(s.plan)));planSave();openPlanner(false,true);toast(`Loaded "${s.name}".`);}},
    el('span',{class:'em',text:'🗺️'}),el('span',null,el('b',{text:s.name}),el('small',{text:`${s.plan.stops.length} stops · saved ${stamp(s.at)}`})),el('span',{class:'r',text:'Load'}))))));
  nodes.unshift(el('button',{class:'primary green',type:'button',onclick:()=>enterPlanMode(false),text:'🗺️ Back to the map'}));
  openSheet('Trip planner',nodes,{view:'planner',tall:true});if(keep)$('sheetBody').scrollTop=keep;
}
function openPlanSave(){
  const nm=el('input',{class:'search',maxlength:'40',value:`Trip ${new Date().toLocaleDateString([], {day:'numeric',month:'short'})}`});
  const saved=LS.get('plans',[]);
  openSheet('Save this plan',[el('p',{class:'lbl',text:'Name'}),nm,el('button',{class:'primary green',type:'button',onclick:()=>{const name=nm.value.trim()||'My trip';const list=LS.get('plans',[]).filter(p=>p.name!==name);list.unshift({name,at:Date.now(),plan:JSON.parse(JSON.stringify(PLAN))});LS.set('plans',list.slice(0,20));toast(`Saved "${name}". It works offline too.`);openPlanner(true);},text:'Save'}),
    saved.length?el('p',{class:'lbl',text:'Saved plans'}):null,saved.length?el('ul',{class:'list'},...saved.map(s=>el('li',null,el('button',{type:'button',onclick:()=>{LS.set('plans',LS.get('plans',[]).filter(p=>p.name!==s.name));openPlanSave();}},el('span',{class:'em',text:'🗑️'}),el('span',null,el('b',{text:s.name}),el('small',{text:`${s.plan.stops.length} stops · tap to delete`})))))):null,
    el('button',{class:'secondary',type:'button',onclick:()=>openPlanner(true),text:'Back to the plan'})],{view:'plansave'});
}
/* choose stops from lists */
function openPlanPick(kind,forStart){
  const box=el('div',{class:'stack'}),q=el('input',{class:'search',type:'search',placeholder:kind==='junction'?'Junction number':'Search places'});const p=myPos();
  const pick=(o)=>{if(forStart){const u=unmerc(o.x,o.y);PLAN.start={kind:'place',name:o.name,lat:+u.lat.toFixed(6),lon:+u.lon.toFixed(6)};planSave();openPlanner(false,true);return;}if(addPlanStop(o,true))toast(`Added ${o.name}.`);openPlanner(true,true);};
  const render=()=>{const s=q.value.trim().toLowerCase();box.replaceChildren();
    if(kind==='junction'){box.append(el('div',{class:'grid3',style:'grid-template-columns:repeat(auto-fill,minmax(60px,1fr))'},...S.juncs.filter(j=>!s||String(j.num).startsWith(s)).map(j=>el('button',{type:'button',style:'min-height:56px;font-size:18px',onclick:()=>pick({name:'Junction '+j.num,x:j.x,y:j.y,kind:'junction'}),text:String(j.num)}))));return;}
    if(kind==='sighting'){const rs=visibleReports().filter(r=>r.kind==='animal').sort((a,b)=>b.lastSeen-a.lastSeen);
      if(!rs.length){box.append(el('p',{class:'hint',text:'No recent sightings. Pick a place instead.'}));return;}
      box.append(el('ul',{class:'list'},...rs.slice(0,25).filter(r=>!s||label(r).toLowerCase().includes(s)).map(r=>{const m=merc(r.lon,r.lat);return el('li',null,el('button',{type:'button',onclick:()=>pick({name:`${label(r)} (seen ${hhmm(r.lastSeen)})`,x:m[0],y:m[1],kind:'animal'})},pic(r.type,40),el('span',null,el('b',{text:label(r)}),el('small',{text:`Seen ${hhmm(r.lastSeen)} · ${ago(r.lastSeen)} · ${whereText(m[0],m[1],true)}`}))));})));return;}
    let list=S.named.concat(S.pois.filter(n=>['gate','reception','hq','lodge','camp','lookout','picnic','ranger','ruins'].includes(n.cat)&&!S.named.includes(n)));
    list=[...new Map(list.map(n=>[(n.short||n.name),n])).values()].filter(n=>inRing(n.x,n.y,S.park)||outsideBy(n)<400);
    if(s)list=list.filter(n=>(n.name+' '+(n.short||'')).toLowerCase().includes(s));if(p)list.sort((a,b)=>gd(p.x,p.y,a.x,a.y)-gd(p.x,p.y,b.x,b.y));
    box.append(el('ul',{class:'list'},...list.slice(0,30).map(n=>el('li',null,el('button',{type:'button',onclick:()=>pick({name:n.short||n.name,x:n.x,y:n.y,kind:n.cat})},el('span',{class:'em',text:{gate:'🚪',reception:'ℹ️',hq:'🏠',lodge:'🛏️',camp:'⛺',lake:'💧',lookout:'👁️',picnic:'🧺',area:'🌾',ranger:'🛡️',ruins:'🏚️',hill:'⛰️'}[n.cat]||'📍'}),el('span',null,el('b',{text:n.short||n.name}),el('small',{text:p?fmtD(gd(p.x,p.y,n.x,n.y))+' away':''})))))));};
  q.oninput=render;render();
  openSheet(forStart?'Start from':kind==='junction'?'Add a junction stone':kind==='sighting'?'Add a sighting':'Add a place',[q,box,el('button',{class:'secondary',type:'button',onclick:()=>openPlanner(true),text:'Back to the plan'})],{view:'planpick'});
}
function openPlanStart(){
  openSheet('Start from',[el('button',{class:'primary blue',type:'button',onclick:()=>{PLAN.start={kind:'me'};planSave();openPlanner(false,true);},text:'📍 My position'}),
    el('button',{class:'secondary',type:'button',onclick:()=>openPlanPick('place',true),text:'🔎 A place (lodge, gate, camp)'}),
    el('button',{class:'secondary',type:'button',onclick:()=>{enterPlanMode(false);toast('Tap the start on the map, then "Start here".');},text:'👆 Tap the map'}),
    el('button',{class:'secondary',type:'button',onclick:()=>openPlanner(true),text:'Back to the plan'})],{view:'planstart'});
}
/* tap-to-add mode: the sheet steps aside, every tap adds a stop */
function startPlanPick(kind){
  pickMode=kind;$('sheet').hidden=true;planShow(false);
  let bar=$('planBar');if(!bar){bar=el('div',{id:'planBar',class:'banner planbar'});$('banner').after(bar);}
  const upd=()=>{bar.replaceChildren(el('p',{text:kind==='planstart'?'Tap the map where the trip starts.':`Tap places, junction stones or sightings to add them. ${PLAN.stops.length} stop${PLAN.stops.length===1?'':'s'} so far.`}),
    kind==='plan'&&PLAN.stops.length?el('button',{type:'button',class:'ghost',onclick:()=>{PLAN.stops.pop();planSave();planShow(false);upd();},text:'Undo'}):null,
    el('button',{type:'button',onclick:()=>{endPick();openPlanner(true,true);},text:'Done'}));bar.hidden=false;};
  PL.updBar=upd;upd();
}

/* =========================================================================
   11g. Groups: family, friends or office. A group chat and a group
        leaderboard, joined by link, code or QR code. No trip pass needed.
   ========================================================================= */
const GR={codes:LS.get('myGroups',null),list:{},subs:{},last:{},msgs:{},read:LS.get('grpRead',{}),listUnsub:null,chatUnsub:null,rejoined:{},render:null,joining:{}};
if(!GR.codes){GR.codes=[];const j=LB.joined;if(j&&j.groups)for(const c of j.groups)GR.codes.push({code:c,name:(j.gnames&&j.gnames[c])||c});LS.set('myGroups',GR.codes);}
const GR_MAX=8,GR_DAYS=30;
function grName(c){const g=GR.list[c]||GR.codes.find(x=>x.code===c);return g?g.name:c;}
function grSave(){LS.set('myGroups',GR.codes);if(LB.joined){LB.joined.groups=GR.codes.map(g=>g.code).slice(0,5);LB.joined.gnames=Object.fromEntries(GR.codes.map(g=>[g.code,g.name]));lbSave();setTimeout(()=>lbPublish(),100);}}
const cleanCode=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/[01IO]/g,'').slice(0,6);
const fmtCode=c=>c.slice(0,3)+' '+c.slice(3);
function myName(){return (LB.joined&&LB.joined.name)||(SOC.profile&&SOC.profile.name)||LS.get('myName','');}
function myEmoji(){const c=carSet();return (c.av==='emoji'&&c.emoji)||(LB.joined&&LB.joined.emoji)||(SOC.profile&&SOC.profile.emoji)||'🦁';}
function myVehicle(){const c=carSet();return [c.color!=='Other'?c.color:'',c.model||(VEHICLES.find(v=>v[0]===c.type)||[])[1]].filter(Boolean).join(' ').slice(0,50);}
const grErr=e=>{try{console.warn('groups:',e&&(e.code||e.message),e);}catch(_){}toast(e&&e.code==='permission-denied'?'The group rules are not published in Firebase yet.':e&&e.code==='nodb'?'Groups need the shared database.':'No connection. Try again with signal.');};
/* live data: my groups, and the newest message of each (for the badge) */
function grStart(){
  if(!S.fs||!S.fs.uid||GR.listUnsub)return;const {F,db}=S.fs,uid=S.fs.uid;
  GR.listUnsub=F.onSnapshot(F.query(F.collection(db,'groups'),F.where('members','array-contains',uid)),snap=>{
    GR.list={};for(const d of snap.docs){const v=d.data();GR.list[d.id]={code:d.id,name:String(v.name||d.id).slice(0,40),members:Array.isArray(v.members)?v.members:[],people:v.people&&typeof v.people==='object'?v.people:{},by:v.by};}
    if(!snap.metadata||!snap.metadata.fromCache)for(const g of GR.codes)if(!GR.list[g.code]&&!GR.rejoined[g.code]){GR.rejoined[g.code]=1;grJoin(g.code,{quiet:true,silentFail:true});}   // a new sign-in after a trip ended
    let ch=false;for(const c in GR.list){const k=GR.codes.find(g=>g.code===c);if(!k){GR.codes.push({code:c,name:GR.list[c].name});ch=true;}else if(k.name!==GR.list[c].name){k.name=GR.list[c].name;ch=true;}}
    if(ch)grSave();grWatchLast();grRefresh();},e=>{GR.err=e.code;GR.listUnsub=null;});
}
function grStop(){if(GR.listUnsub)GR.listUnsub();GR.listUnsub=null;for(const c in GR.subs)GR.subs[c]();GR.subs={};if(GR.chatUnsub)GR.chatUnsub();GR.chatUnsub=null;}
function grWatchLast(){
  const {F,db}=S.fs;
  for(const c in GR.list){if(GR.subs[c])continue;let first=true;
    GR.subs[c]=F.onSnapshot(F.query(F.collection(db,'groups',c,'msgs'),F.orderBy('at','desc'),F.limit(1)),snap=>{const d=snap.docs[0],m=d?cleanMsg(d.id,d.data()):null,prev=GR.last[c];GR.last[c]=m;
      if(!first&&m&&(!prev||prev.id!==m.id)&&m.uid!==S.fs.uid&&sheetView!=='gchat:'+c&&!S.nav)toast(`👥 ${grName(c)} · ${m.emoji} ${m.name}: ${m.text||'shared a sighting'}`.slice(0,96),'Open',()=>openGroupChat(c),6000);
      first=false;updateChatBadge();grRefresh();},()=>{});}
  for(const c in GR.subs)if(!GR.list[c]){GR.subs[c]();delete GR.subs[c];}
}
function grUnread(){const uid=S.fs&&S.fs.uid;let n=0;for(const c in GR.last){const m=GR.last[c];if(m&&m.uid!==uid&&m.at>(GR.read[c]||0))n++;}return n;}
function grRefresh(){if($('sheet').hidden)return;if(sheetView==='groups')openGroups(true);else if(sheetView&&sheetView.startsWith('gchat:')&&GR.render)GR.render();else if(sheetView&&sheetView.startsWith('ginfo:'))openGroupInfo(sheetView.slice(6));}
/* create, join, leave */
function needName(then){
  if(myName())return then();
  const nm=el('input',{class:'search',maxlength:'24',placeholder:'Your first name or nickname',autocomplete:'given-name'});
  openSheet('Your name',[el('p',{class:'hint',text:'So people in your groups know who is writing.'}),nm,el('button',{class:'primary green',type:'button',onclick:()=>{const v=nm.value.trim().slice(0,24);if(v.length<2){toast('Write at least 2 letters.');return;}LS.set('myName',v);then();},text:'Continue'})],{view:'myname'});
}
async function grCreate(name){
  name=String(name||'').trim().slice(0,40);if(!name){toast('Give the group a name.');return null;}
  if(GR.codes.length>=GR_MAX){toast(`You can be in up to ${GR_MAX} groups. Leave one first.`);return null;}
  try{const uid=await ensureAuth();const {F,db}=S.fs;let code=newCode();
    for(let i=0;i<5;i++){const a=await F.getDoc(F.doc(db,'groups',code));if(!a.exists())break;code=newCode();}
    await F.setDoc(F.doc(db,'groups',code),{name,by:uid,createdAt:F.serverTimestamp(),members:[uid],people:{[uid]:{n:myName(),e:myEmoji()}}});
    GR.codes.push({code,name});grSave();grStart();return code;}
  catch(e){grErr(e);return null;}
}
async function grJoin(code,o={}){
  code=cleanCode(code);if(code.length!==6){if(!o.quiet)toast('A group code has 6 letters and numbers.');return false;}
  if(GR.joining[code])return false;GR.joining[code]=1;
  try{const uid=await ensureAuth();const {F,db}=S.fs;const ref=F.doc(db,'groups',code);let g=await F.getDoc(ref);
    const me={n:myName()||'Guest',e:myEmoji()};
    if(!g.exists()){const old=await F.getDoc(F.doc(db,'lbgroups',code)).catch(()=>null);    // a leaderboard group from before group chat
      if(!old||!old.exists()){if(!o.silentFail)toast(`No group with the code ${fmtCode(code)}.`);return false;}
      await F.setDoc(ref,{name:String(old.data().name||'Group').slice(0,40),by:uid,createdAt:F.serverTimestamp(),members:[uid],people:{[uid]:me}});g=await F.getDoc(ref);}
    else if(!(g.data().members||[]).includes(uid)){
      if((g.data().members||[]).length>=60){toast('This group is full (60 members).');return false;}
      await F.updateDoc(ref,{members:F.arrayUnion(uid),['people.'+uid]:me});}
    const name=String(g.data().name||code).slice(0,40);
    if(!GR.codes.find(x=>x.code===code)){if(GR.codes.length>=GR_MAX){toast(`You can be in up to ${GR_MAX} groups. Leave one first.`);return false;}GR.codes.push({code,name});}
    grSave();grStart();if(!o.quiet)toast(`👥 You joined ${name}.`);return true;}
  catch(e){if(!o.silentFail)grErr(e);return false;}
  finally{delete GR.joining[code];}
}
async function grLeave(code){
  try{const {F,db}=S.fs,uid=S.fs.uid;if(uid)await F.updateDoc(F.doc(db,'groups',code),{members:F.arrayRemove(uid),['people.'+uid]:F.deleteField()});}catch(e){}
  GR.codes=GR.codes.filter(g=>g.code!==code);delete GR.list[code];delete GR.last[code];if(GR.subs[code]){GR.subs[code]();delete GR.subs[code];}
  if(LB.scope===code)LB.scope='park';grSave();updateChatBadge();toast(`You left ${grName(code)}.`);
}
async function sendGroup(code,text,rep,kind){
  try{const uid=await ensureAuth();const {F,db}=S.fs;const now=Date.now();
    const m={uid,name:myName()||'Guest',emoji:myEmoji(),vehicle:myVehicle(),text:String(text||'').slice(0,kind==='plan'?1500:500),at:now,expiresAt:F.Timestamp.fromMillis(now+GR_DAYS*864e5),kind:rep?'sighting':(kind||'text')};
    if(rep)m.rep={id:rep.id,type:rep.type,kind:rep.kind,label:label(rep),lat:rep.lat,lon:rep.lon,at:rep.lastSeen||rep.at};
    await F.addDoc(F.collection(db,'groups',code,'msgs'),m);}
  catch(e){grErr(e);}
}
/* screens */
function chatsDefault(){return GR.codes.length||!passValid()?'groups':'park';}
function openChats(){openChat(chatsDefault());}
function openGroups(refresh){
  const keep=refresh&&sheetView==='groups'?$('sheetBody').scrollTop:0;const uid=S.fs&&S.fs.uid;
  const rows=GR.codes.map(g=>{const L=GR.list[g.code],m=GR.last[g.code],unread=m&&m.uid!==uid&&m.at>(GR.read[g.code]||0);
    return el('li',{class:unread?'unread':''},el('button',{type:'button',onclick:()=>openGroupChat(g.code)},el('span',{class:'em',text:'👥'}),
      el('span',null,el('b',{text:g.name}),el('small',{text:m?`${m.uid===uid?'You':m.name}: ${(m.text||'shared a sighting').replace(/\n/g,' ').slice(0,60)}`:`${L?L.members.length:'–'} member${L&&L.members.length===1?'':'s'} · code ${fmtCode(g.code)}`})),
      el('span',{class:'r'},m?hhmm(m.at):'',unread?el('i',{class:'udot'}):null)));});
  openSheet('Chat',[chatTabs('groups'),
    el('div',{class:'grbtns'},el('button',{class:'primary green',type:'button',onclick:openNewGroup,text:'＋ New group'}),el('button',{class:'secondary',type:'button',onclick:()=>openJoinGroup(),text:'🔗 Join with a code'})),
    rows.length?el('ul',{class:'list grlist'},...rows):el('div',{class:'lbintro'},el('b',{text:'👥 Groups for your family, friends or office'}),el('small',{text:'A group has its own chat, shared sightings and trip plans, and its own leaderboard. Create one and invite people with a link, a code or a QR code. No trip pass needed.'})),
    !S.fs?el('p',{class:'fine',text:'Groups need the shared database, which is not set up on this copy of the app.'}):null],{view:'groups',tall:true});
  if(keep)$('sheetBody').scrollTop=keep;
}
function openNewGroup(){
  if(!S.fs){toast('Groups need the shared database.');return;}
  const gn=el('input',{class:'search',maxlength:'40',placeholder:'Group name, e.g. Bazine family or Embassy safari'});
  const nm=el('input',{class:'search',maxlength:'24',placeholder:'Your name',value:myName()});
  const go=el('button',{class:'primary green',type:'button',text:'Create and invite'});
  go.onclick=async()=>{const v=nm.value.trim().slice(0,24);if(v.length<2){toast('Write your name (2 letters or more).');nm.focus();return;}if(!gn.value.trim()){toast('Give the group a name.');gn.focus();return;}
    if(v!==myName()){LS.set('myName',v);if(LB.joined){LB.joined.name=v;lbSave();}}
    go.disabled=true;go.textContent='Creating…';const code=await grCreate(gn.value);go.disabled=false;go.textContent='Create and invite';if(code)openInvite(code,true);};
  openSheet('New group',[el('p',{class:'lbl',text:'Group name'}),gn,el('p',{class:'lbl',text:'Your name in the group'}),nm,go,
    el('p',{class:'fine',text:'Next you get a link, a code and a QR code to invite people. Anyone with them can join.'})],{view:'newgroup',back:()=>openGroups()});
  setTimeout(()=>gn.focus(),200);
}
function openJoinGroup(prefill){
  const code=el('input',{class:'search grcode',maxlength:'7',placeholder:'ABC 123',value:prefill?fmtCode(prefill):'',autocapitalize:'characters',autocomplete:'off'});
  const nm=el('input',{class:'search',maxlength:'24',placeholder:'Your name',value:myName()});
  const go=el('button',{class:'primary green',type:'button',text:'Join group'});
  go.onclick=async()=>{const v=nm.value.trim().slice(0,24);if(v.length<2){toast('Write your name (2 letters or more).');nm.focus();return;}if(v!==myName())LS.set('myName',v);
    const c=cleanCode(code.value);go.disabled=true;go.textContent='Joining…';const ok=await grJoin(c);go.disabled=false;go.textContent='Join group';if(ok)openGroupChat(c);};
  openSheet('Join a group',[el('p',{class:'hint',text:'Type the 6-character code you were given, or just open the invite link.'}),code,el('p',{class:'lbl',text:'Your name in the group'}),nm,go],{view:'joingroup',back:()=>openGroups()});
  if(!prefill)setTimeout(()=>code.focus(),200);
}
function loadQR(){return window.qrcode?Promise.resolve():new Promise((res,rej)=>{const s=document.createElement('script');s.src='lib/qrcode.js';s.onload=()=>res();s.onerror=rej;document.head.append(s);});}
function inviteURL(code){return `${appURL()}?join=${code}`;}
function openInvite(code,fresh){
  const url=inviteURL(code),name=grName(code);const qr=el('div',{class:'qrbox','aria-label':'QR code with the invite link'});
  loadQR().then(()=>{const q=window.qrcode(0,'M');q.addData(url);q.make();qr.innerHTML=q.createSvgTag({cellSize:5,margin:2,scalable:true});}).catch(()=>{qr.hidden=true;});
  const text=`Join my group "${name}" in Reba 🦒 for our group chat, sightings and leaderboard. Open the link, or enter the code ${fmtCode(code)} under Chat → Groups.`;
  openSheet(fresh?`${name} is ready`:`Invite to ${name}`,[
    fresh?el('p',{class:'hint',text:'Now invite people. Anyone with the link, code or QR code can join.'}):null,
    el('button',{class:'primary green',type:'button',onclick:()=>shareOrCopy({title:`Join ${name}`,text,url}),text:'📤 Send the invite (WhatsApp, SMS…)'}),
    el('div',{class:'grinvite'},qr,el('div',null,el('small',{text:'Code'}),el('b',{class:'bigcode',text:fmtCode(code)}),el('small',{text:'Let others scan the QR code with their camera, or type the code under Chat → Groups.'}))),
    el('button',{class:'secondary',type:'button',onclick:async()=>{try{await navigator.clipboard.writeText(url);toast('Link copied.');}catch(e){toast(url,null,null,9000);}},text:'🔗 Copy the link'}),
    el('button',{class:'secondary',type:'button',onclick:()=>openGroupChat(code),text:'💬 Open the group chat'})],{view:'invite:'+code,back:()=>openGroupChat(code)});
}
function openGroupChat(code){
  if(!S.fs){toast('Groups need the shared database.');return;}
  const g=GR.list[code]||{code,name:grName(code),members:[],people:{}};const uid=S.fs.uid;
  const list=el('div',{class:'msgs',role:'log','aria-live':'polite'});
  const cnt=()=>{const n=Math.max(1,((GR.list[code]||g).members||[]).length);return `${n} member${n===1?'':'s'} · code ${fmtCode(code)}`;},sub=el('small',{text:cnt()});
  const head=el('div',{class:'grhead'},el('div',null,el('b',{text:g.name}),sub),
    el('button',{type:'button',class:'plmini',onclick:()=>openInvite(code),text:'➕ Invite'}),el('button',{type:'button',class:'plmini',onclick:()=>openGroupInfo(code),'aria-label':'Group details',text:'ⓘ'}));
  GR.render=()=>{sub.textContent=cnt();const atBottom=list.scrollHeight-list.scrollTop-list.clientHeight<80;const ms=GR.msgs[code]||[];
    list.replaceChildren(...(ms.length?ms.map(m=>msgNode(m,S.fs.uid)):[el('p',{class:'empty',text:`Welcome to ${g.name}. Say hello, share a sighting or send your trip plan. Messages stay for ${GR_DAYS} days.`})]));
    if(atBottom||!list.dataset.init){list.scrollTop=list.scrollHeight;list.dataset.init='1';}
    GR.read[code]=Date.now();LS.set('grpRead',GR.read);updateChatBadge();};
  openSheet(g.name,[chatTabs('groups'),head,list,composer(t=>sendGroup(code,t))],{view:'gchat:'+code,tall:true,back:()=>openGroups()});GR.render();
  if(GR.chatUnsub)GR.chatUnsub();
  ensureAuth().then(()=>{const {F,db}=S.fs;GR.chatUnsub=F.onSnapshot(F.query(F.collection(db,'groups',code,'msgs'),F.orderBy('at','desc'),F.limit(150)),snap=>{
    GR.msgs[code]=snap.docs.map(d=>cleanMsg(d.id,d.data())).filter(Boolean).reverse();if(sheetView==='gchat:'+code&&GR.render)GR.render();},e=>{if(e&&e.code==='permission-denied')grJoin(code,{quiet:true});});}).catch(grErr);
}
function openGroupInfo(code){
  const g=GR.list[code]||{code,name:grName(code),members:[],people:{}};const uid=S.fs&&S.fs.uid;
  const ppl=Object.entries(g.people||{}).filter(([k])=>g.members.includes(k)).sort((a,b)=>(a[0]===uid?-1:b[0]===uid?1:String(a[1].n).localeCompare(String(b[1].n))));
  openSheet(g.name,[el('div',{class:'grhead'},el('div',null,el('b',{text:g.name}),el('small',{text:`${g.members.length} member${g.members.length===1?'':'s'} · code ${fmtCode(code)}`}))),
    el('button',{class:'primary green',type:'button',onclick:()=>openInvite(code),text:'➕ Invite people'}),
    el('button',{class:'secondary',type:'button',onclick:()=>{LB.scope=code;findTab='board';if(LB.joined){lbListen();openBoard();}else openFind('board');},text:'🏆 Group leaderboard'}),
    el('p',{class:'lbl',text:'Members'}),el('ul',{class:'list grmems'},...ppl.map(([k,p])=>el('li',null,el('div',{class:'grmem'},el('span',{class:'em',text:AVATARS.includes(p.e)?p.e:'🙂'}),el('span',null,el('b',{text:String(p.n||'Guest').slice(0,24)+(k===uid?' (you)':'')}),k===g.by?el('small',{text:'Started the group'}):null))))),
    el('button',{class:'secondary no',type:'button',onclick:()=>openSheet('Leave this group?',[el('p',{class:'hint',text:`You will stop getting messages from ${g.name}. You can join again with the code.`}),
      el('button',{class:'primary',style:'background:#C0392B',type:'button',onclick:async()=>{await grLeave(code);openGroups();},text:'Leave group'}),el('button',{class:'secondary',type:'button',onclick:()=>openGroupInfo(code),text:'Stay'})],{view:'gleave'}),text:'Leave group'})],
    {view:'ginfo:'+code,back:()=>openGroupChat(code)});
}
/* share a sighting or a plan: park chat or one of my groups */
function shareSighting(r){
  const targets=[];if(passValid()&&SOC.profile&&SOC.profile.chat)targets.push(['park','🌍 Park chat (all drivers with a pass)']);for(const g of GR.codes)targets.push([g.code,'👥 '+g.name]);
  if(!targets.length){if(!passValid()){toast('Create a group or a trip pass to share in a chat.','Groups',()=>openGroups());return;}return shareToChat(r);}
  if(targets.length===1&&targets[0][0]==='park')return shareToChat(r);
  const txt=r.kind==='animal'?`${label(r)} here`:`${RD[r.type][1]} here`;
  openSheet('Share in a chat',[el('ul',{class:'list'},...targets.map(([k,l])=>el('li',null,el('button',{type:'button',onclick:()=>{if(k==='park')shareToChat(r);else{sendGroup(k,txt,r);closeSheet();toast(`Shared in ${grName(k)}.`,'Open',()=>openGroupChat(k));}}},el('span',null,el('b',{text:l}))))))],{view:'sharepick'});
}
function sendPlanToGroup(){
  if(!GR.codes.length){openNewGroup();return;}const t=planText();
  openSheet('Send the plan to a group',[el('ul',{class:'list'},...GR.codes.map(g=>el('li',null,el('button',{type:'button',onclick:()=>{sendGroup(g.code,t,null,'plan');toast(`Plan sent to ${g.name}.`,'Open',()=>openGroupChat(g.code));openPlanner(true);}},el('span',{class:'em',text:'👥'}),el('span',null,el('b',{text:g.name})))))),
    el('button',{class:'secondary',type:'button',onclick:()=>openPlanner(true),text:'Back to the plan'})],{view:'plangroup'});
}

/* ---------- trip mode: a panel at the bottom; tap anything on the map to add it ---------- */
function enterPlanMode(hint){
  S.planMode=true;document.body.classList.add('planmode');closeSheet();if(pickMode)endPick();hidePlanPop();S.follow=false;$('followBtn').classList.remove('on');renderDock();planShow(true);
  if(hint!==false)toast(PLAN.stops.length?'Tap anything on the map to add it, or ＋ Add for animals and places.':'Tap a place, junction stone, animal or any spot on the map, then ＋ Add as stop.',null,null,5000);
}
function exitPlanMode(){S.planMode=false;document.body.classList.remove('planmode');$('planDock').hidden=true;hidePlanPop();PL.tmp=null;redraw();}
function renderDock(){
  const d=$('planDock');if(!S.planMode){d.hidden=true;return;}planCompute();
  const T=PL.tot,chips=[];
  const st=plStart();chips.push(el('button',{type:'button',class:'pchip s',onclick:()=>openPlanStart(),text:PLAN.start.kind==='me'?'S · You':'S · '+PLAN.start.name}));
  PLAN.stops.forEach((s,i)=>chips.push(el('button',{type:'button',class:'pchip'+(s.kind==='species'?' an':''),onclick:()=>{const q=merc(s.lon,s.lat);centerOn(q[0],q[1]+80/cam.s*0,Math.max(cam.s,.03));showStopPop(i);}},
    el('i',{text:String(i+1)}),s.kind==='species'?(SPX[s.sp]?SPX[s.sp].emoji+' ':''):'',plShort(s))));
  if(PLAN.end!=='last'&&PLAN.stops.length)chips.push(el('span',{class:'pchip end',text:PLAN.end==='start'?'⚑ Back to start':'⚑ '+PLAN.end.slice(5).replace(/ ?\(.*\)/,'').replace(/ - .*/,'')}));
  const sum=T?`${fmtD(T.len)} · ${fmtDur(T.drive)} driving${T.dwell?` + ${fmtDur(T.dwell)} stops`:''} · finish ${hhmm(T.endLo)}–${hhmm(T.endHi)}`:(PL.err&&PLAN.stops.length?'No route to one of the stops. Open Details.':PLAN.stops.length?'…':'Tap anything on the map to add it as a stop');
  d.replaceChildren(el('div',{class:'pdtop'},el('b',{text:`🗺️ Trip${PLAN.stops.length?` · ${PLAN.stops.length} stop${PLAN.stops.length>1?'s':''}`:''}`}),el('small',{text:sum}),el('button',{type:'button',class:'pdx','aria-label':'Close trip mode',onclick:exitPlanMode,text:'×'})),
    el('div',{class:'pchips'},...chips),
    el('div',{class:'pdbtns'},el('button',{type:'button',class:'pdadd',onclick:openPlanAdd,text:'＋ Add'}),el('button',{type:'button',class:'pdsec',onclick:()=>openPlanner(),text:'☰ Details'}),
      el('button',{type:'button',class:'pdgo',disabled:PL.r?null:'',onclick:()=>{if(!PL.r)return;exitPlanMode();S.route=PL.r;startNav();},text:'▶ Start'})));
  d.hidden=false;
}
const plShort=s=>s.kind==='species'?(SHORTNAME[s.sp]||(SPX[s.sp]||{}).name||s.name):String(s.name).replace(/^Spot near /,'≈ ').replace(/ \(seen.*\)$/,'').slice(0,22);
function hidePlanPop(){const p=$('planPop');if(p)p.hidden=true;PL.tmp=null;}
function placePop(p){const d=$('planDock'),host=p.parentElement.getBoundingClientRect(),r=d.getBoundingClientRect();p.style.bottom=Math.max(10,host.bottom-r.top+8)+'px';}
/* a tapped place or spot: add it, or start the trip here */
function showPlanPop(o){
  const p=$('planPop');PL.tmp=o;const n=PLAN.stops.length+1;
  let sub=o.sub||({junction:'Junction stone',gate:'Park gate',lodge:'Lodge',camp:'Campsite',lookout:'Lookout',picnic:'Picnic spot',ranger:'Ranger post',reception:'Reception',hq:'Park office',ruins:'Ruins',pin:'A spot on the map',species:'Animal'}[o.kind]||'Place');
  const prev=PLAN.stops.length?PLAN.stops[PLAN.stops.length-1]:null;if(prev){const q=merc(prev.lon,prev.lat);sub+=` · ${fmtD(gd(q[0],q[1],o.x,o.y))} from stop ${PLAN.stops.length} (straight line)`;}
  p.replaceChildren(el('div',{class:'pptop'},o.kind==='species'&&o.sp?pic(o.sp,40):el('span',{class:'ppic',text:o.kind==='junction'?'⑦':o.kind==='pin'?'📍':'📌'}),el('div',null,el('b',{text:o.name}),el('small',{text:sub})),el('button',{type:'button',class:'pdx',onclick:()=>{hidePlanPop();redraw();},'aria-label':'Close',text:'×'})),
    el('div',{class:'ppbtns'},el('button',{type:'button',class:'pdadd big',onclick:()=>{if(addPlanStop(o,true)){try{navigator.vibrate&&navigator.vibrate(25);}catch(e){}hidePlanPop();planShow(false);renderDock();}},text:`＋ Add as stop ${n}`}),
      el('button',{type:'button',class:'pdsec',onclick:()=>{const u=unmerc(o.x,o.y);PLAN.start={kind:'place',name:o.name.replace(/ \(seen.*\)$/,''),lat:+u.lat.toFixed(6),lon:+u.lon.toFixed(6)};planSave();hidePlanPop();planShow(false);renderDock();toast(`The trip starts at ${PLAN.start.name}.`);},text:'Start here'})));
  p.hidden=false;placePop(p);redraw();
}
/* a stop already in the plan: stay time, order, remove */
function showStopPop(i){
  const s=PLAN.stops[i];if(!s)return;planCompute();const x=PL.tl[i],p=$('planPop');PL.tmp=null;
  const dw=el('select',{class:'pldw','aria-label':'Time at this stop'},...DWELLS.map(m=>{const o=el('option',{value:String(m),text:m?`Stay ${m>=60?fmtDur(m*60):m+' min'}`:'Drive past'});if((s.dwell||0)===m)o.selected=true;return o;}));
  dw.onchange=()=>{s.dwell=+dw.value;planSave();planShow(false);renderDock();showStopPop(i);};
  p.replaceChildren(el('div',{class:'pptop'},el('span',{class:'plnum',text:String(i+1)}),el('div',null,el('b',{text:s.name}),el('small',{text:x?`${fmtD(x.len)} · ${fmtDur(x.drive)} drive · arrive ${hhmm(PL.t0+x.lo*1000)}–${hhmm(PL.t0+x.hi*1000)}`:''}),
      s.kind==='species'?el('small',{text:s.stale?`No recent sighting: last known spot (${s.seen?ago(s.seen):'unknown'}).`:`Follows the freshest sighting${s.seen?`, seen ${hhmm(s.seen)}`:''}.`}):null),el('button',{type:'button',class:'pdx',onclick:hidePlanPop,'aria-label':'Close',text:'×'})),
    el('div',{class:'ppbtns'},dw,el('button',{type:'button',class:'plmini',disabled:i===0?'':null,onclick:()=>{planMove(i,-1,true);showStopPop(i-1);},text:'↑ Earlier'}),el('button',{type:'button',class:'plmini',disabled:i===PLAN.stops.length-1?'':null,onclick:()=>{planMove(i,1,true);showStopPop(i+1);},text:'↓ Later'}),
      el('button',{type:'button',class:'plmini no',onclick:()=>{PLAN.stops.splice(i,1);planSave();hidePlanPop();planShow(false);renderDock();},text:'Remove'})));
  p.hidden=false;placePop(p);
}
/* ＋ Add: animals, places, junctions, sightings */
function openPlanAdd(){
  hidePlanPop();
  openSheet('Add to the trip',[el('div',{class:'addgrid'},
    el('button',{type:'button',onclick:()=>openFindAnimals(),},el('span',{text:'🦁'}),el('b',{text:'Animals'}),el('small',{text:'Freshest sighting of each'})),
    el('button',{type:'button',onclick:()=>openPlanPick('place')},el('span',{text:'🏕️'}),el('b',{text:'Places'}),el('small',{text:'Lodges, lakes, lookouts, gates'})),
    el('button',{type:'button',onclick:()=>openPlanPick('junction')},el('span',{text:'⑦'}),el('b',{text:'Junction stone'}),el('small',{text:'By its number'})),
    el('button',{type:'button',onclick:()=>openPlanPick('sighting')},el('span',{text:'👁️'}),el('b',{text:'A sighting'}),el('small',{text:'A report from today'}))),
    el('p',{class:'hint',text:'Or close this and tap anything on the map: a place, a junction stone, an animal or any spot.'})],{view:'planadd'});
}

function saveSet(){LS.set('settings',S.set);}
/* ---------- map layers ---------- */
const LAYERS=[
  ['animals','🦁','Animal sightings'],['road','⚠️','Road reports'],['junctions','⑦','Junction stones'],
  ['stay','🏕️','Lodges, camps, picnic spots, lookouts'],['park','⛩️','Gates, ranger posts, offices, ruins'],
  ['names','🔤','Lake and area names'],['closed','➖','Closed and uncertain tracks'],['water','🌿','Rivers and wetlands'],['examples','🧪','Example reports'],['official','🗺️','Official park map on top']];
const LAYER_PRESETS={
  all:{animals:1,road:1,junctions:1,stay:1,park:1,names:1,closed:1,water:1,examples:1,official:0},
  clean:{animals:1,road:1,junctions:1,stay:0,park:0,names:0,closed:0,water:0,examples:0},
  animals:{animals:1,road:0,junctions:0,stay:0,park:0,names:0,closed:0,water:0,examples:1}};
function LY(k){if(k==='examples')return !S.set.hideEx;const l=S.set.layers||{};if(k==='official')return !!l.official;return l[k]!==0&&l[k]!==false;}
function setLayer(k,on){if(k==='examples'){S.set.hideEx=!on;}else{S.set.layers=Object.assign({},S.set.layers,{[k]:on?1:0});}saveSet();updateLayersBtn();redraw();if(k==='official'&&sheetView==='layers')openLayers();}
/* ---------- the park's official map (A3, 2020): tiles fitted to the live map, and a full-page viewer ---------- */
const OFF={idx:null,loading:false,have:new Set(),tiles:new Map()};
function offIndex(){if(OFF.idx||OFF.loading)return OFF.idx;OFF.loading=true;
  getJSON('data/official/index.json').then(j=>{OFF.idx=j;for(const z in j.tiles)for(const [x,y] of j.tiles[z])OFF.have.add(z+'/'+x+'/'+y);redraw();}).catch(()=>{OFF.loading=false;});return null;}
function offTile(k){let t=OFF.tiles.get(k);if(t)return t.ok?t.img:null;const img=new Image();t={img,ok:false};OFF.tiles.set(k,t);img.onload=()=>{t.ok=true;redraw();};img.onerror=()=>{setTimeout(()=>OFF.tiles.delete(k),30e3);};img.src='data/official/'+k+'.webp';return null;}
function drawOfficial(){
  const I=offIndex();if(!I)return;
  const z=clamp(Math.round(Math.log2(cam.s*dpr*2*Math.PI*ER/256)),I.minz,I.maxz),size=2*Math.PI*ER/2**z;   // sharp on high-density screens
  const cs=[s2w(0,0),s2w(W,0),s2w(0,H),s2w(W,H)],xs=cs.map(c=>c[0]),ys=cs.map(c=>c[1]);
  const tx0=Math.floor((Math.min(...xs)+Math.PI*ER)/size),tx1=Math.floor((Math.max(...xs)+Math.PI*ER)/size),ty0=Math.floor((Math.min(...ys)+Math.PI*ER)/size),ty1=Math.floor((Math.max(...ys)+Math.PI*ER)/size);
  if((tx1-tx0+1)*(ty1-ty0+1)>150)return;
  ctx.save();ctx.globalAlpha=S.set.offOp??.85;ctx.imageSmoothingQuality='high';
  for(let tx=tx0;tx<=tx1;tx++)for(let ty=ty0;ty<=ty1;ty++){const k=z+'/'+tx+'/'+ty;if(!OFF.have.has(k))continue;const x=-Math.PI*ER+tx*size,y=-Math.PI*ER+ty*size;const img=offTile(k);
    if(img){ctx.drawImage(img,x,y,size*(1+1/256),size*(1+1/256));continue;}
    for(let dz=1;dz<=3;dz++){const pz=z-dz;if(pz<I.minz)break;const px_=tx>>dz,py=ty>>dz,t=OFF.tiles.get(pz+'/'+px_+'/'+py);if(t&&t.ok){const sx=(tx-(px_<<dz))*256/2**dz,sy=(ty-(py<<dz))*256/2**dz;ctx.drawImage(t.img,sx,sy,256/2**dz,256/2**dz,x,y,size,size);break;}}}
  ctx.restore();
}
async function saveOfficialOffline(){
  try{const j=await getJSON('data/official/index.json');const urls=['data/official/park-map-2020.webp','data/official/index.json'];for(const z in j.tiles)for(const [x,y] of j.tiles[z])urls.push(`data/official/${z}/${x}/${y}.webp`);
    let done=0;toast(`Saving the official map (${urls.length} files)…`);
    for(let i=0;i<urls.length;i+=8){await Promise.all(urls.slice(i,i+8).map(u=>fetch(u).then(()=>done++).catch(()=>{})));}
    toast(done>=urls.length-2?'✅ The official map works offline now.':`Saved ${done} of ${urls.length} files. Try again with better signal.`);}
  catch(e){toast('Could not save the map. Check your signal.');}
}
function openParkMap(){
  let ov=$('pmView');if(!ov){ov=el('div',{id:'pmView',class:'pmview',role:'dialog','aria-label':'Official park map'});document.body.append(ov);}
  const img=el('img',{src:'data/official/park-map-2020.webp',alt:'Akagera National Park official map',draggable:'false'});
  const stage=el('div',{class:'pmstage'},img);let s=1,tx=0,ty=0,fitS=1;const pts=new Map();let last=null;
  const apply=()=>{img.style.transform=`translate(${tx}px,${ty}px) scale(${s})`;};
  const fit=()=>{const r=stage.getBoundingClientRect();if(!img.naturalWidth)return;fitS=Math.min(r.width/img.naturalWidth,r.height/img.naturalHeight);s=fitS;tx=(r.width-img.naturalWidth*s)/2;ty=(r.height-img.naturalHeight*s)/2;apply();};
  const zoomAt=(cx,cy,k)=>{const r=stage.getBoundingClientRect();const ns=clamp(s*k,fitS*.9,fitS*12);k=ns/s;tx=cx-r.left-(cx-r.left-tx)*k;ty=cy-r.top-(cy-r.top-ty)*k;s=ns;};
  img.onload=fit;
  stage.onpointerdown=e=>{stage.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});last=null;};
  stage.onpointermove=e=>{if(!pts.has(e.pointerId))return;const p0=pts.get(e.pointerId),p1={x:e.clientX,y:e.clientY};
    if(pts.size===1){tx+=p1.x-p0.x;ty+=p1.y-p0.y;}
    else{const ps=[...pts.entries()].map(([id,v])=>id===e.pointerId?p1:v);const a=ps[0],b=ps[1],d=Math.hypot(a.x-b.x,a.y-b.y),c={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(last){zoomAt(c.x,c.y,d/last.d);tx+=c.x-last.c.x;ty+=c.y-last.c.y;}last={d,c};}
    pts.set(e.pointerId,p1);apply();};
  const up=e=>{pts.delete(e.pointerId);last=null;};stage.onpointerup=up;stage.onpointercancel=up;
  stage.onwheel=e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,e.deltaY<0?1.2:1/1.2);apply();};
  stage.ondblclick=e=>{zoomAt(e.clientX,e.clientY,s>fitS*3?fitS/s:2.2);apply();};
  const close=()=>{ov.hidden=true;};
  ov.replaceChildren(stage,el('div',{class:'pmbar'},el('b',{text:'Official park map (2020)'}),
    el('button',{class:'pmbtn',type:'button',onclick:()=>{close();setLayer('official',true);toast('The official map is on the live map. Turn it off or fade it under Layers.');},text:'On live map'}),
    el('a',{class:'pmbtn',href:'data/official/akagera-park-map-2020.pdf',download:'Akagera-park-map-2020.pdf',text:'PDF'}),
    el('button',{class:'pmx',type:'button','aria-label':'Close',onclick:close,text:'×'})),
    el('p',{class:'pmhint',text:'Pinch, scroll or double-tap to zoom'}));
  ov.hidden=false;if(img.complete)fit();
}
function updateLayersBtn(){const b=$('layersBtn');if(b)b.classList.toggle('dot',LAYERS.some(([k])=>k!=='examples'&&k!=='official'&&!LY(k)));}
function openLayers(){
  const rows=LAYERS.map(([k,ic,label])=>{const i=el('input',{type:'checkbox',id:'ly-'+k});i.checked=LY(k);i.onchange=()=>setLayer(k,i.checked);
    return el('label',{class:'toggle layer',for:'ly-'+k},el('span',{class:'lyic',text:ic}),el('span',{class:'lytx',text:label}),i);});
  const preset=(id,label)=>el('button',{type:'button',class:'opt',onclick:()=>{const P=LAYER_PRESETS[id];for(const k in P)setLayer(k,!!P[k]);openLayers();},text:label});
  const op=el('input',{type:'range',min:'30',max:'100',step:'5',value:String(Math.round((S.set.offOp??.85)*100)),'aria-label':'Official map opacity'});op.oninput=()=>{S.set.offOp=+op.value/100;saveSet();redraw();};
  openSheet('Map layers',[el('div',{class:'opts'},preset('clean','Clean'),preset('animals','Animals only'),preset('all','Everything')),...rows,
    LY('official')?el('label',{class:'toggle'},'Official map opacity',op):null,
    el('button',{class:'secondary',type:'button',onclick:openParkMap,text:'🗺️ Open the official park map (full page)'}),
    el('button',{class:'secondary',type:'button',onclick:saveOfficialOffline,text:'⬇️ Keep the official map for offline use'}),
    el('p',{class:'fine',text:'Roads, lakes, your position, your route and emergency alerts always show.'})],{view:'layers'});
}
$('layersBtn').onclick=openLayers;updateLayersBtn();

/* ---------- verify sightings on the spot, and alerts when you are near one ---------- */
const VERIFY_M=400,NEAR_M=400;
S.myVer=LS.get('myVer',{});            // report id -> {t, type}
function verList(r){return Object.entries(r.ver||{}).map(([k,v])=>({k,...v})).sort((a,b)=>b.t-a.t);}
function verState(r){
  if(r.example)return {ok:false,why:'This is an example sighting, so it cannot be verified.'};
  if(r.by===S.device)return {ok:false,mine:true,why:'You reported this one, so another driver needs to verify it.'};
  if(r.ver&&r.ver[S.device])return {ok:false,done:true,why:`You verified this at ${hhmm(r.ver[S.device].t)}.`};
  const g=S.gps;
  if(!g.ok||Date.now()-g.t>60e3)return {ok:false,why:'Verifying needs a live GPS fix. Allow location and wait for the blue dot.'};
  if(g.sim)return {ok:false,why:'Not during the demo drive.'};
  const q=merc(r.lon,r.lat),d=gd(g.x,g.y,q[0],q[1]);
  if((g.acc||999)>100)return {ok:false,d,why:`Your GPS is only accurate to about ${Math.round(g.acc)} m. Wait a moment for a better fix.`};
  if(d>VERIFY_M)return {ok:false,d,why:`You need to be within ${VERIFY_M} m to verify. You are ${fmtD(d)} away.`};
  return {ok:true,d};
}
async function verifySighting(r){
  const st=verState(r);if(!st.ok){toast(st.why);return;}
  const p=SOC.profile&&passValid()?SOC.profile:null;
  const v={t:Date.now(),d:Math.round(st.d)};if(p)v.n=`${p.name}${p.vehicle?' · '+p.vehicle:''}`.slice(0,60);
  r.ver=Object.assign({},r.ver,{[S.device]:v});
  await patchReport(r,{votes:{[S.device]:1},lastSeen:v.t});
  const ok=await patchReport(r,{ver:{[S.device]:v}},{quiet:true});
  if(!ok&&S.fs&&!r.example)toast('Saved as "still there". The verified tick will show once the updated database rules are published.');
  S.myVer[r.id]={t:v.t,type:r.type};LS.set('myVer',S.myVer);setTimeout(()=>lbPublish(),50);
  const pts=r.kind==='animal'?tick(r.type,'seen'):null;
  say(`${label(r)} verified. Thank you.`);try{navigator.vibrate&&navigator.vibrate(60);}catch(e){}
  if(ok||!S.fs)toast(`✅ Verified. +5 points${pts?` · ${label(r)} ticked, +${pts}`:''}`);
  nearDone(r.id);refreshSheet();redraw();
}
function goneHere(r){
  const st=verState(r);if(!st.ok&&!st.mine&&!(st.d!=null&&st.d<=VERIFY_M)){toast(st.why.replace('to verify','to say it has gone'));return;}
  patchReport(r,{votes:{[S.device]:-1}});nearDone(r.id);closeSheet();toast(st.mine?'Removed.':'Thanks. Marked as gone.');
}
const NEAR={id:null,spoken:LS.get('nearSpoken',{}),dismissed:LS.get('nearDismissed',{}),last:0};
function relWord(g,x,y){const b=brg(g.x,g.y,x,y);if(g.heading==null||(g.speed||0)<1)return DIRNAME[dir8(b)].toLowerCase();const a=angDiff(g.heading,b),s=a<0?'left':'right',A=Math.abs(a);
  return A<30?'ahead':A<75?`ahead on your ${s}`:A<120?`on your ${s}`:'behind you';}
function nearDone(id){NEAR.dismissed[id]=Date.now();LS.set('nearDismissed',NEAR.dismissed);if(NEAR.id===id)hideNear();}
function hideNear(){NEAR.id=null;const c=$('nearCard');if(c)c.hidden=true;}
function checkNear(force){
  if(!force&&Date.now()-NEAR.last<2000)return;NEAR.last=Date.now();
  const g=S.gps;if(!S.set.nearAlert||!g.ok||Date.now()-g.t>60e3||S.preview)return hideNear();
  const now=Date.now();for(const k in NEAR.dismissed)if(now-NEAR.dismissed[k]>6*3600e3)delete NEAR.dismissed[k];
  let best=null;
  for(const r of visibleReports()){if(r.kind!=='animal'||r.by===S.device||(r.example&&!S.sim)||r.votes[S.device]===-1||(r.ver&&r.ver[S.device])||NEAR.dismissed[r.id])continue;
    const q=merc(r.lon,r.lat),d=gd(g.x,g.y,q[0],q[1]);const lim=r.id===NEAR.id?NEAR_M+150:NEAR_M;if(d<=lim&&(!best||d<best.d))best={r,d,q};}
  if(!best)return hideNear();
  const {r,d,q}=best,where=relWord(g,q[0],q[1]),nv=verList(r).length;
  const c=$('nearCard');if(!$('sheet').hidden){c.hidden=true;return;}   // back when the sheet closes
  c.replaceChildren(el('button',{type:'button',class:'nc-main',onclick:()=>openReportView(r)},pic(r.type,48),
      el('span',null,el('b',{text:`${label(r)} ${fmtD(d)} ${where}`}),el('small',{text:`Reba! Seen ${ago(r.lastSeen)}${nv?` · ✅ ${nv} verified`:' · not verified yet'}${r.example?' · example':''}`}))),
    el('div',{class:'nc-acts'},el('button',{type:'button',class:'ok',onclick:()=>verifySighting(r),text:'✅ I see it'}),el('button',{type:'button',class:'no',onclick:()=>goneHere(r),text:'Not here'}),el('button',{type:'button',class:'x','aria-label':'Dismiss',onclick:()=>nearDone(r.id),text:'×'})));
  const host=c.parentElement.getBoundingClientRect();
  if(S.nav){   // while driving: under the turn instruction, so the car and the road ahead stay visible
    let top=0;for(const id of ['navTop','navThen','navWarn']){const e=$(id);if(e&&!e.hidden)top=Math.max(top,e.getBoundingClientRect().bottom);}
    c.style.top=Math.max(10,top-host.top+8)+'px';c.style.bottom='auto';}
  else{const br=$('bottomBar').getBoundingClientRect();c.style.bottom=Math.max(10,host.bottom-br.top+8)+'px';c.style.top='auto';}
  c.hidden=false;
  if(NEAR.id!==r.id){NEAR.id=r.id;if(!NEAR.spoken[r.id]){NEAR.spoken[r.id]=now;LS.set('nearSpoken',NEAR.spoken);
    say(`${label(r)} reported ${Math.round(d/10)*10} metres ${where}. Tap I see it to verify.`);try{navigator.vibrate&&navigator.vibrate([120,60,120]);}catch(e){}}}
}
const COFFEE_URL='https://buymeacoffee.com/eliesbazine';
function coffeeLink(cls){return el('a',{class:'coffee'+(cls?' '+cls:''),href:COFFEE_URL,target:'_blank',rel:'noopener',text:'☕ Buy me a coffee'});}
function openSettings(){
  const tog=(key,label)=>{const i=el('input',{type:'checkbox',id:'set-'+key});i.checked=!!S.set[key];i.onchange=()=>{S.set[key]=i.checked;saveSet();if(key==='sat')setSat(i.checked);if(key==='nearAlert')checkNear(true);if(key==='closedOk'){buildGraph();toast(i.checked?'Routes may now use tracks marked closed. Check with a ranger first.':'Routes avoid tracks marked closed again.');}if(key==='officialOk'){buildGraph();toast(i.checked?'Routes use tracks on the official park map again.':'Routes avoid tracks that OpenStreetMap marks closed.');}redraw();};return el('label',{class:'toggle',for:'set-'+key},label,i);};
  const cfg=window.AKAGERA_FIREBASE;
  const nodes=[el('button',{class:'secondary sosbtn',type:'button',onclick:()=>openEmergency(),text:'🆘 Emergency help'}),el('button',{class:'secondary',type:'button',onclick:openMyCar,text:'🚙 My vehicle and avatar'}),el('button',{class:'secondary',type:'button',onclick:openOffline,text:S.set.offline?'📴 Offline mode is on · downloads':'📶 Offline use and downloads'}),tog('voice','Spoken directions'),tog('tilt','3D view while driving'),tog('car3d','3D vehicle while driving'),tog('speedWarn','Warn me above 40 km/h in the park'),tog('nearAlert','Alert me near other drivers\' sightings'),tog('wxAlerts','Warn me about storms and heavy rain'),tog('wake','Keep screen on while driving'),tog('sat','Satellite background'),tog('officialOk','Use tracks the official park map shows, even if OpenStreetMap marks them closed (amber dashed)'),tog('closedOk','Allow routes on all tracks marked closed (red dashed)'),
    el('button',{class:'secondary',type:'button',onclick:()=>{closeSheet();if(S.sim){stopSim();toast('Demo drive stopped.');}else{if(!S.route){toast('Pick a destination with Go first.');return;}startNav();startSim();}},text:S.sim?'Stop demo drive':'Demo drive along the planned route'}),
    el('button',{class:'secondary',type:'button',onclick:()=>{closeSheet();startPick('me');},text:'Set my position by hand'}),
    el('button',{class:'secondary',type:'button',onclick:()=>{S.set.hideEx=!S.set.hideEx;saveSet();closeSheet();redraw();},text:S.set.hideEx?'Show example reports':'Hide example reports'}),
    el('p',{class:'lbl',text:'Support the app'}),el('p',{class:'fine',text:'Reba is free. If it helped your game drive, you can say thanks with a coffee.'}),coffeeLink(),
    el('p',{class:'lbl',text:'About Reba'}),el('p',{class:'fine',text:'Reba is an unofficial community guide to Akagera National Park, made by a visitor. It is not run by or affiliated with African Parks or the Rwanda Development Board. Follow the park rules and the guidance of rangers.'}),
    el('p',{class:'lbl',text:'About the data'}),
    el('p',{class:'fine',text:`Sharing: ${cfg&&cfg.apiKey?'Firebase project '+cfg.projectId+' ('+S.sync+')':'not set up yet, so reports stay on this phone.'}`}),
    el('p',{class:'fine',text:S.layers.osm?`Roads and lakes: OpenStreetMap contributors, updated ${S.osm.meta.generated}.`:'Roads: traced from the park entrance board (detailed OpenStreetMap roads not loaded yet).'}),
    el('p',{class:'fine',text:'Junction stones, ranger posts and fence houses: from the park board, accurate to about 1 km. Satellite: Esri World Imagery. Weather: Open-Meteo.'})];
  openSheet('Settings',nodes,{view:'settings'});
}
$('setBtn').onclick=openSettings;$('meBtn').onclick=()=>openPass();$('chatBtn').onclick=openChats;$('syncPill').onclick=openOffline;
$('reportBtn').onclick=()=>startReport();$('findBtn').onclick=()=>openFind();$('goBtn').onclick=openGo;

/* =========================================================================
   13. Boot
   ========================================================================= */
async function boot(){
  S.animalWin=LS.get('win',6);
  try{S.board=await getJSON('data/board.json');}catch(e){document.body.textContent='Map data could not be loaded.';return;}
  try{S.osm=await getJSON('data/osm.json');}catch(e){S.osm=null;}
  try{S.official=await getJSON('data/official.json');}catch(e){S.official=null;}
  buildData();
  new ResizeObserver(()=>resize()).observe(cv);resize();fitPark();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(redraw);
  updateWxPill();setSync();updateGpsLine();updateCount();setSat(!!S.set.sat);updateMeBtn();updateChatBadge();
  startGPS();loadWeather();initSharing();loadPhotos();setTimeout(socTick,2500);setTimeout(lbHandleLink,1200);
  window.addEventListener('online',loadPhotos);
  setInterval(()=>{loadWeather();redraw();updateGpsLine();socTick();},60e3);
  window.addEventListener('online',()=>{loadWeather(true);setSync();});window.addEventListener('offline',()=>{setSync();updateWxPill();});
  setInterval(checkWxAlerts,10*60e3);setTimeout(offerOffline,1500);
  if(S.set.offline)caches.open('akl-ext').then(c=>c.put(OFFLINE_FLAG,new Response('1'))).catch(()=>{});
  // follow GPS in browse mode
  setInterval(()=>{if(!S.nav&&S.follow){const p=myPos();if(p&&p.gps){cam.cx=p.x;cam.cy=p.y;redraw();}}},1000);
  if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').catch(()=>{});
  if(!S.set.hideEx&&allReports().some(r=>r.example))banner('No live reports yet. Pins marked EXAMPLE are samples.','Hide',()=>{S.set.hideEx=true;saveSet();hideBanner();redraw();},'ex');
  window.AKL=S;window.AKLf={startSim,stopSim,w2s:(x,y)=>w2s(x,y),getHits:()=>hits,draw3D,clear3D,tiltProjector,car3dParts,enterPlanMode,exitPlanMode,showPlanPop,GR,grCreate,grJoin,openGroups,openGroupChat,openInvite,openChats,openPlanner,addPlanStop,planOptimize,getPlan:()=>PLAN,PL,openOffline,downloadOffline,setOfflineMode,openWeather,loadWeather,wxHere,openParkMap,drawOfficial,paintVehicle,paintAvatar,carSet,openMyCar,saveCar,lbPublish,myStats,lbSorted,LB,previewRoute,centerOn,route,snap,merc,penalties,roadLife,openWeather,updateWxPill,janitor,socTick,retire,openEmergency,warnDrivers,checkSOS};   // for debugging
}
boot();
