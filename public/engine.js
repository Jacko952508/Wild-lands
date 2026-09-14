(()=>{'use strict';
const T=THREE,$=id=>document.getElementById(id),canvas=$('game');

const scene=new T.Scene();
scene.background=new T.Color(0x9bb2b5);
scene.fog=new T.FogExp2(0x9fb0aa,0.0048);

const camera=new T.PerspectiveCamera(67,innerWidth/innerHeight,0.08,900);
camera.rotation.order='YXZ';

const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);
let renderScale=Math.min(devicePixelRatio,1.2);
renderer.setPixelRatio(renderScale);
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;

const hemi=new T.HemisphereLight(0xd9ecff,0x334238,1.1);
const sun=new T.DirectionalLight(0xffe2ad,2.2);
sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-85;sun.shadow.camera.right=85;sun.shadow.camera.top=85;sun.shadow.camera.bottom=-85;
scene.add(hemi,sun);

const starGeo=new T.BufferGeometry(),starPos=[];
for(let i=0;i<1800;i++){
  let u=Math.random()*2-1,a=Math.random()*Math.PI*2,r=900+Math.random()*700,rr=Math.sqrt(1-u*u)*r;
  starPos.push(Math.cos(a)*rr,u*r,Math.sin(a)*rr)
}
starGeo.setAttribute('position',new T.Float32BufferAttribute(starPos,3));
const stars=new T.Points(starGeo,new T.PointsMaterial({color:0xffffff,size:0.9,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false}));
scene.add(stars);

const SPACE_MOON={x:2350,y:1900,z:2850};
const celestialMoon=new T.Group();
const moonOrb=new T.Mesh(
  new T.SphereGeometry(180,34,22),
  new T.MeshStandardMaterial({color:0xa9aba7,roughness:1,metalness:0,emissive:0x101114,emissiveIntensity:0.15})
);
const moonBeaconGlow=new T.Mesh(
  new T.SphereGeometry(8,12,8),
  new T.MeshBasicMaterial({color:0x8ffcff,transparent:true,opacity:0.95})
);
moonBeaconGlow.position.set(0,155,-88);
const moonBeaconHalo=new T.Mesh(new T.SphereGeometry(22,12,8),new T.MeshBasicMaterial({color:0x68ffff,transparent:true,opacity:0.18,depthWrite:false}));
moonBeaconHalo.position.copy(moonBeaconGlow.position);
const moonBeaconBeam=new T.Mesh(new T.CylinderGeometry(2.4,5.5,80,10),new T.MeshBasicMaterial({color:0x8ffcff,transparent:true,opacity:0.28,depthWrite:false}));
moonBeaconBeam.position.set(0,195,-88);
celestialMoon.add(moonOrb,moonBeaconHalo,moonBeaconGlow,moonBeaconBeam);
celestialMoon.position.set(SPACE_MOON.x,SPACE_MOON.y,SPACE_MOON.z);
celestialMoon.visible=false;
scene.add(celestialMoon);

const spaceSun=new T.Group();
const sunOrb=new T.Mesh(new T.SphereGeometry(135,24,16),new T.MeshBasicMaterial({color:0xfff2bd}));
const sunHalo=new T.Mesh(new T.SphereGeometry(185,20,12),new T.MeshBasicMaterial({color:0xffc85a,transparent:true,opacity:0.16,depthWrite:false}));
spaceSun.add(sunHalo,sunOrb);
spaceSun.visible=false;
scene.add(spaceSun);

const spacePlanet=new T.Group();
const planet=new T.Mesh(
  new T.SphereGeometry(2200,48,32),
  new T.MeshStandardMaterial({
    color:0x245b76,
    roughness:0.92,
    emissive:0x07121a,
    emissiveIntensity:0.35
  })
);
const atmosphere=new T.Mesh(
  new T.SphereGeometry(2230,48,32),
  new T.MeshBasicMaterial({
    color:0x5ca6cf,
    transparent:true,
    opacity:0.13,
    side:T.BackSide
  })
);
spacePlanet.add(planet,atmosphere);
spacePlanet.visible=false;
scene.add(spacePlanet);
camera.far=12000;
camera.updateProjectionMatrix();

const rainCount=520,rainPos=new Float32Array(rainCount*3);for(let i=0;i<rainCount;i++){rainPos[i*3]=(Math.random()-.5)*80;rainPos[i*3+1]=Math.random()*42;rainPos[i*3+2]=(Math.random()-.5)*80}const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));const rain=new T.Points(rainGeo,new T.PointsMaterial({color:0xc8def0,size:0.085,transparent:true,opacity:0,depthWrite:false}));scene.add(rain);
const cloudGroup=new T.Group(),cloudGeo=new T.SphereGeometry(1,8,6),cloudMat=new T.MeshLambertMaterial({color:0xe5e8e5,transparent:true,opacity:0.25,depthWrite:false});for(let i=0;i<10;i++){let g=new T.Group();for(let j=0;j<3;j++){let m=new T.Mesh(cloudGeo,cloudMat.clone());m.scale.set(6+Math.random()*5,1.2+Math.random(),3+Math.random()*3);m.position.set((j-1)*4,Math.random(),Math.random()*2);g.add(m)}g.userData={a:i/10*Math.PI*2,r:70+Math.random()*70,h:40+Math.random()*22};cloudGroup.add(g)}scene.add(cloudGroup);

const CH=96,NEAR=1,FAR=3,CACHE=4;
const WORLD='wi_world_v3',POS='wi_pos_v3';
let world;
try{world=JSON.parse(localStorage.getItem(WORLD)||'null')}catch(e){world=null}
if(!world)world={seed:Math.floor(Math.random()*1e9),explored:{},saved:{},animalState:{},discoveries:{},moonMined:{},moonOre:0,inventory:{},credits:100};world.explored=world.explored||{};world.saved=world.saved||{};world.animalState=world.animalState||{};world.discoveries=world.discoveries||{};world.moonMined=world.moonMined||{};world.moonOre=world.moonOre||0;world.inventory=world.inventory||{};world.credits=Number.isFinite(world.credits)?world.credits:100;world.ui=world.ui||{lookSensitivity:1,hudScale:1};
if(world.saved['0,0']){world.saved['0,0'].trees=(world.saved['0,0'].trees||[]).filter(q=>!inStartClearZone(q[0],q[1]));world.saved['0,0'].rocks=(world.saved['0,0'].rocks||[]).filter(q=>!inStartClearZone(q[0],q[1]));}
let player;
try{player=JSON.parse(localStorage.getItem(POS)||'null')}catch(e){player=null}
if(!player)player={x:-14.5,z:-24,yaw:Math.PI/2,pitch:-0.03};

const seed=world.seed;
const chunks=new Map(),colliders=[],animalAgents=[],farQueue=[],farPending=new Set();
let currentChunk='',saveTimer=0,lastSyncX=1e9,lastSyncZ=1e9,syncGeneration=0;
let mapView={cx:0,cz:0},mapSelected=null;

function key(x,z){return x+','+z}
function chunkOf(x,z){return {cx:Math.floor((x+CH/2)/CH),cz:Math.floor((z+CH/2)/CH)}}
function hash(x,z,s=0){let n=Math.sin(x*127.1+z*311.7+(seed+s)*0.017)*43758.5453;return n-Math.floor(n)}
function smooth(t){return t*t*(3-2*t)}
function noise(x,z,s=0){let X=Math.floor(x),Z=Math.floor(z),fx=x-X,fz=z-Z,a=hash(X,Z,s),b=hash(X+1,Z,s),c=hash(X,Z+1,s),d=hash(X+1,Z+1,s),u=smooth(fx),v=smooth(fz);return T.MathUtils.lerp(T.MathUtils.lerp(a,b,u),T.MathUtils.lerp(c,d,u),v)}
function fbm(x,z,s=0){let a=0.5,f=1,v=0;for(let i=0;i<5;i++){v+=a*noise(x*f,z*f,s+i*29);a*=0.5;f*=2.02}return v}
let moonMode=false;
function earthRawH(x,z){let broad=(fbm(x*0.002,z*0.002,1)-0.5)*28,hills=(fbm(x*0.007,z*0.007,8)-0.5)*15,r=1-Math.abs(fbm(x*0.003,z*0.003,19)*2-1),ridge=Math.pow(r,3)*14,m=(fbm(x*0.03,z*0.03,30)-0.5)*1.8;return broad+hills+ridge+m-5}
const START_PLATEAU=earthRawH(0,0);
const TOWN_LEVEL=earthRawH(-126,8);
function earthH(x,z){
  const raw=earthRawH(x,z),edge=Math.max(Math.abs(x),Math.abs(z));
  if(edge<=46)return START_PLATEAU;
  if(edge<48)return T.MathUtils.lerp(START_PLATEAU,raw,smooth((edge-46)/2));

  // West town is built on a gently levelled plateau so floors and doorways
  // remain genuinely walkable, with only a narrow blend back to wild terrain.
  const tx=Math.max(0,-190-x,x+64),tz=Math.max(0,Math.abs(z)-70),td=Math.max(tx,tz);
  if(td<=0)return TOWN_LEVEL;
  if(td<10)return T.MathUtils.lerp(TOWN_LEVEL,raw,smooth(td/10));
  return raw
}
function moonRawH(x,z){
 let broad=(fbm(x*0.0032,z*0.0032,901)-0.5)*18,
     ridges=(fbm(x*0.009,z*0.009,904)-0.5)*7,
     fine=(fbm(x*0.052,z*0.052,903)-0.5)*1.1,
     h=broad+ridges+fine;
 const craters=[[-180,120,72,13],[170,155,95,18],[-230,-160,120,22],[260,-120,78,15],[80,-260,105,20],[-70,280,88,16],[330,250,135,25],[-360,70,92,17]];
 for(const c of craters){
   const d=Math.hypot(x-c[0],z-c[1]),r=c[2];
   if(d<r){
     const q=d/r;
     h-=Math.pow(1-q,2)*c[3];
     if(q>.72)h+=(1-Math.abs(q-.86)/.14)*c[3]*.32;
   }
 }
 return h;
}
const MOON_BASE_LEVEL=moonRawH(0,18);
function moonH(x,z){
 let raw=moonRawH(x,z),
     dx=Math.max(0,Math.abs(x)-32),
     dz=Math.max(0,Math.abs(z-18)-34),
     edge=Math.max(dx,dz);
 if(edge<=0)return MOON_BASE_LEVEL;
 if(edge>=12)return raw;
 return T.MathUtils.lerp(MOON_BASE_LEVEL,raw,smooth(edge/12))
}
function H(x,z){return moonMode?moonH(x,z):earthH(x,z)}
function biome(x,z){let h=H(x,z),m=fbm(x*0.002,z*0.002,50),t=fbm(x*0.0015,z*0.0015,60)-h*0.005;if(h>24)return'alpine';if(h>14)return'highland';if(t<0.4)return'pine';if(m>0.62)return'forest';if(m<0.36)return'meadow';return'woodland'}
const regionA=['Ash','Raven','Moon','Fox','Elder','Black','Silver','Storm','Moss','Frost','Hollow','Red'],regionB=['Reach','Vale','Moor','Wood','Fell','Hollow','Watch','Ridge','Wilds','Basin','March','Field'];
function regionName(cx,cz){return regionA[Math.floor(hash(cx,cz,701)*regionA.length)]+' '+regionB[Math.floor(hash(cx,cz,702)*regionB.length)]}
function slopeAt(x,z){return Math.hypot(H(x+0.8,z)-H(x-0.8,z),H(x,z+0.8)-H(x,z-0.8))}
function inStartClearZone(x,z){return Math.abs(x)<46&&Math.abs(z)<46}

const biomeColor={alpine:0x858882,highland:0x6e7868,pine:0x385942,forest:0x476f48,meadow:0x7f9b64,woodland:0x617e5a};
const mats={
 trunk:new T.MeshStandardMaterial({color:0x4e3524,roughness:1}),
 leaf:new T.MeshStandardMaterial({color:0x3d6e42,roughness:0.9}),
 leaf2:new T.MeshStandardMaterial({color:0x567c48,roughness:0.9}),
 pine:new T.MeshStandardMaterial({color:0x284f39,roughness:0.9}),
 rock:new T.MeshStandardMaterial({color:0x767a73,roughness:1}),
 deer:new T.MeshStandardMaterial({color:0x8a6545,roughness:0.9}),
 fox:new T.MeshStandardMaterial({color:0xb96432,roughness:0.9}),
 boar:new T.MeshStandardMaterial({color:0x51483f,roughness:1}),
 wolf:new T.MeshStandardMaterial({color:0x737779,roughness:0.95}),
 dark:new T.MeshStandardMaterial({color:0x26231f,roughness:1}),
 landmark:new T.MeshStandardMaterial({color:0x6f7068,roughness:1}),
 runway:new T.MeshStandardMaterial({color:0x24282a,roughness:0.9}),
 stripe:new T.MeshBasicMaterial({color:0xe7e3c9}),
 metal:new T.MeshStandardMaterial({color:0x6f777c,roughness:0.45,metalness:0.55}),
 glass:new T.MeshPhysicalMaterial({color:0x7fb2c9,roughness:0.12,metalness:0.05,transparent:true,opacity:0.58}),
 red:new T.MeshStandardMaterial({color:0x8d2f29,roughness:0.65}),
 yellow:new T.MeshStandardMaterial({color:0xd1a533,roughness:0.65}),
 ufo:new T.MeshStandardMaterial({color:0x9aa4aa,roughness:0.25,metalness:0.75,emissive:0x203040,emissiveIntensity:0.5}),
 strange:new T.MeshStandardMaterial({color:0x272332,roughness:0.78,emissive:0x160b24,emissiveIntensity:0.35}),
 monster:new T.MeshStandardMaterial({color:0x3f4b3b,roughness:0.98}),
 eye:new T.MeshBasicMaterial({color:0xe7ff7a}),
 trail:new T.MeshStandardMaterial({color:0x786b52,roughness:1})
};

function persist(){
 localStorage.setItem(WORLD,JSON.stringify(world));
 localStorage.setItem(POS,JSON.stringify(player));
}

function descriptor(cx,cz){
 let k=key(cx,cz);
 if(world.saved[k])return world.saved[k];
 let d={trees:[],rocks:[],animals:[],mark:null,anomaly:null};
 let b=biome(cx*CH,cz*CH),treeCount=b==='forest'?42:b==='pine'?38:b==='meadow'?18:30;
 for(let i=0;i<treeCount;i++){
   let x=(hash(cx*71+i,cz*43-i,101)-0.5)*CH,z=(hash(cx*59-i,cz*67+i,102)-0.5)*CH;
   if(hash(cx+i,cz-i,103)<0.82&&!(cx===0&&cz===0&&inStartClearZone(x,z)))d.trees.push([+x.toFixed(2),+z.toFixed(2),+(0.65+hash(cx+i,cz-i,104)*1.15).toFixed(2)]);
 }
 for(let i=0;i<10;i++){
   let x=(hash(cx*37+i,cz*29-i,111)-0.5)*CH,z=(hash(cx*31-i,cz*41+i,112)-0.5)*CH;
   if(!(cx===0&&cz===0&&inStartClearZone(x,z)))d.rocks.push([+x.toFixed(2),+z.toFixed(2),+(0.35+hash(cx+i,cz-i,113)*0.95).toFixed(2)]);
 }
 let species=['deer','deer','fox','boar','wolf'];
 let n=2+Math.floor(hash(cx,cz,120)*3);
 for(let i=0;i<n;i++){
   let x=(hash(cx*17+i,cz*23-i,121)-0.5)*CH,z=(hash(cx*19-i,cz*13+i,122)-0.5)*CH;
   d.animals.push([+x.toFixed(2),+z.toFixed(2),species[Math.floor(hash(cx+i,cz-i,123)*species.length)]]);
 }
 if(hash(cx,cz,130)>0.87)d.mark=hash(cx,cz,131)>0.5?'ring':'tower';
 if(!(cx===0&&cz===0)){let a=hash(cx,cz,140);if(a>0.985)d.anomaly='titan';else if(a>0.962)d.anomaly='beast';else if(a>0.935)d.anomaly='ufo';}
 return d;
}

function saveVisitedDescriptor(cx,cz){
 let k=key(cx,cz);
 if(!world.saved[k])world.saved[k]=descriptor(cx,cz);
 if(!world.explored[k]){world.explored[k]=Date.now();toast('Region discovered');}
}

function terrain(cx,cz,seg){
 let g=new T.PlaneGeometry(CH,CH,seg,seg);g.rotateX(-Math.PI/2);
 let p=g.attributes.position,colors=[];
 for(let i=0;i<p.count;i++){
   let wx=p.getX(i)+cx*CH,wz=p.getZ(i)+cz*CH,h=H(wx,wz);p.setY(i,h);
   let c=new T.Color(biomeColor[biome(wx,wz)]),sx=H(wx+1,wz)-H(wx-1,wz),sz=H(wx,wz+1)-H(wx,wz-1),sl=T.MathUtils.clamp(Math.hypot(sx,sz)/4,0,1);
   c.lerp(new T.Color(0x74736c),sl*0.65);if(h>23)c.lerp(new T.Color(0xd5dad4),T.MathUtils.clamp((h-23)/9,0,0.8));
   c.multiplyScalar(0.91+hash(wx*0.3,wz*0.3,9)*0.11);colors.push(c.r,c.g,c.b);
 }
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();
 let mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,roughness:1}));
 mesh.position.set(cx*CH,0,cz*CH);mesh.receiveShadow=seg>12;return mesh;
}

const farTrunkGeo=new T.CylinderGeometry(.18,.38,3.8,5),farPineGeo=new T.ConeGeometry(1.3,4.2,6),farLeafGeo=new T.ConeGeometry(1.55,4.4,6);
function addFarTrees(group,d,cx,cz){
 const trees=[];
 for(let i=0;i<d.trees.length;i+=3){
   const q=d.trees[i],wx=cx*CH+q[0],wz=cz*CH+q[1];
   if(!inCityZone(wx,wz))trees.push({wx,wz,s:q[2],pine:biome(wx,wz)==='pine'})
 }
 if(!trees.length)return;
 const trunks=new T.InstancedMesh(farTrunkGeo,mats.trunk,trees.length),
       pineCount=trees.reduce((n,q)=>n+(q.pine?1:0),0),
       leafCount=trees.length-pineCount,
       pines=pineCount?new T.InstancedMesh(farPineGeo,mats.pine,pineCount):null,
       leaves=leafCount?new T.InstancedMesh(farLeafGeo,mats.leaf,leafCount):null,
       o=new T.Object3D();
 let pi=0,li=0;
 trees.forEach((q,i)=>{
   const y=H(q.wx,q.wz);
   o.position.set(q.wx,y+1.9*q.s,q.wz);o.scale.setScalar(q.s);o.rotation.set(0,0,0);o.updateMatrix();trunks.setMatrixAt(i,o.matrix);
   o.position.set(q.wx,y+4*q.s,q.wz);o.scale.setScalar(q.s);o.updateMatrix();
   if(q.pine)pines.setMatrixAt(pi++,o.matrix);else leaves.setMatrixAt(li++,o.matrix)
 });
 trunks.instanceMatrix.needsUpdate=true;trunks.frustumCulled=true;group.add(trunks);
 if(pines){pines.instanceMatrix.needsUpdate=true;group.add(pines)}
 if(leaves){leaves.instanceMatrix.needsUpdate=true;group.add(leaves)}
}
function makeTree(wx,wz,s,detail){
 let g=new T.Group(),b=biome(wx,wz),tr=new T.Mesh(new T.CylinderGeometry(0.18*s,0.38*s,3.8*s,detail?7:5),mats.trunk);
 tr.position.y=1.9*s;tr.castShadow=detail;g.add(tr);
 if(b==='pine'){
   let layers=detail?3:1;
   for(let i=0;i<layers;i++){let c=new T.Mesh(new T.ConeGeometry((1.3-i*0.18)*s,(detail?2.5:4.2)*s,detail?8:6),mats.pine);c.position.y=(detail?3.2+i*0.75:4.0)*s;c.castShadow=detail;g.add(c)}
 }else if(detail){
   for(let i=0;i<4;i++){let a=i/4*Math.PI*2+hash(wx+i,wz,6),c=new T.Mesh(new T.IcosahedronGeometry((1+0.2*hash(wx+i,wz-i,5))*s,1),i%2?mats.leaf2:mats.leaf);c.position.set(Math.cos(a)*0.55*s,(3.5+0.4*hash(wx,wz+i,7))*s,Math.sin(a)*0.55*s);c.castShadow=true;g.add(c)}
 }else{
   let c=new T.Mesh(new T.ConeGeometry(1.55*s,4.4*s,6),mats.leaf);c.position.y=4*s;g.add(c);
 }
 g.position.set(wx,H(wx,wz),wz);return g;
}

function animalModel(kind){
 let g=new T.Group(),m=mats[kind],body=new T.Mesh(new T.SphereGeometry(1,10,7),m);
 let scale=kind==='wolf'?1.08:kind==='boar'?1.12:1;
 body.scale.set((kind==='boar'?1.42:1.22)*scale,(kind==='boar'?0.75:0.65)*scale,0.58*scale);body.position.y=1;g.add(body);
 let head=new T.Mesh(new T.SphereGeometry(0.42,8,6),m);head.position.set(0,kind==='deer'?1.72:1.58,0.98);head.scale.set(0.9,0.85,1.1);g.add(head);
 let legs=[];
 for(const sx of[-0.45,0.45])for(const sz of[-0.38,0.38]){let pivot=new T.Group(),l=new T.Mesh(new T.CylinderGeometry(0.06,0.075,0.92,5),m);l.position.y=-0.45;pivot.position.set(sx,0.75,sz);pivot.add(l);g.add(pivot);legs.push(pivot)}
 if(kind==='deer'){for(const s of[-1,1]){let a=new T.Mesh(new T.CylinderGeometry(0.025,0.04,0.65,5),mats.dark);a.position.set(s*0.16,2.18,0.92);a.rotation.z=s*0.15;g.add(a)}}
 if(kind==='fox'||kind==='wolf'){let tail=new T.Mesh(new T.ConeGeometry(kind==='wolf'?0.3:0.25,1.35,7),m);tail.position.set(0,1.05,-1.25);tail.rotation.x=-1.15;g.add(tail)}
 if(kind==='boar'){for(const s of[-1,1]){let tusk=new T.Mesh(new T.ConeGeometry(0.05,0.28,5),new T.MeshStandardMaterial({color:0xd8c5a8,roughness:1}));tusk.position.set(s*0.25,1.45,1.35);tusk.rotation.x=Math.PI/2;g.add(tusk)}}
 g.userData.legs=legs;return g;
}

function landmarkModel(cx,cz,type){
 let g=new T.Group();
 if(type==='ring'){
   for(let i=0;i<7;i++){let a=i/7*Math.PI*2,wx=Math.cos(a)*5,wz=Math.sin(a)*5,m=new T.Mesh(new T.BoxGeometry(1.1,3.4,1.1),mats.landmark);m.position.set(wx,1.7,wz);m.rotation.y=-a;g.add(m)}
 }else{
   for(const sx of[-1,1])for(const sz of[-1,1]){let p=new T.Mesh(new T.CylinderGeometry(0.12,0.18,7,6),mats.trunk);p.position.set(sx*1.4,3.5,sz*1.4);g.add(p)}
   let top=new T.Mesh(new T.BoxGeometry(4,0.3,4),mats.trunk);top.position.y=7;g.add(top);
 }
 g.position.set(cx*CH,H(cx*CH,cz*CH),cz*CH);return g;
}

function addTrail(group,cx,cz,d){
 if(!d.mark)return;
 let pts=[],x0=cx*CH-CH*0.45,z0=cz*CH-CH*0.35,x1=cx*CH,z1=cz*CH;
 for(let i=0;i<18;i++){let t=i/17,x=T.MathUtils.lerp(x0,x1,t)+Math.sin(t*6.2+cx)*2,z=T.MathUtils.lerp(z0,z1,t)+Math.sin(t*4.7+cz)*1.4,y=H(x,z)+0.035;pts.push(x,y,z)}
 let verts=[],inds=[];
 for(let i=0;i<18;i++){let x=pts[i*3],y=pts[i*3+1],z=pts[i*3+2],j=Math.min(17,i+1),x2=pts[j*3],z2=pts[j*3+2],dx=x2-x,dz=z2-z,l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l,w=0.9;verts.push(x+nx*w,y,z+nz*w,x-nx*w,y,z-nz*w)}
 for(let i=0;i<17;i++){let a=i*2,b=a+1,c=a+2,e=a+3;inds.push(a,c,b,b,c,e)}
 let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(verts,3));g.setIndex(inds);g.computeVertexNormals();let m=new T.Mesh(g,mats.trail);m.receiveShadow=true;group.add(m)
}

function anomalyModel(type,cx,cz){
 let g=new T.Group(),wx=cx*CH+(hash(cx,cz,141)-0.5)*42,wz=cz*CH+(hash(cx,cz,142)-0.5)*42;
 if(type==='ufo'){
   let disc=new T.Mesh(new T.CylinderGeometry(3.4,5.2,1.1,20),mats.ufo);disc.scale.y=0.65;g.add(disc);
   let dome=new T.Mesh(new T.SphereGeometry(2.0,14,8),mats.glass);dome.position.y=0.7;dome.scale.y=0.55;g.add(dome);
   for(let i=0;i<8;i++){let a=i/8*Math.PI*2,l=new T.PointLight(0x8fffe8,0.45,7);l.position.set(Math.cos(a)*3.8,-0.2,Math.sin(a)*3.8);l.userData.baseIntensity=.45;l.userData.owner=g;l.userData.maxDistance=55;g.add(l);managedLights.push(l)}
   addVehicleLights(g,4.7,.25,1.2,0xc7ffff,5.8,65);
   g.position.set(wx,H(wx,wz)+11+hash(cx,cz,143)*7,wz);g.userData.float=true;g.userData.baseY=g.position.y;g.userData.phase=hash(cx,cz,144)*6.28;
 }else if(type==='beast'){
   let body=new T.Mesh(new T.SphereGeometry(1,10,7),mats.strange);body.scale.set(2.0,0.9,0.8);body.position.y=1.3;g.add(body);
   let head=new T.Mesh(new T.ConeGeometry(0.8,1.9,7),mats.strange);head.position.set(0,1.6,1.9);head.rotation.x=Math.PI/2;g.add(head);
   for(const sx of[-0.75,0.75])for(const sz of[-0.55,0.55]){let l=new T.Mesh(new T.CylinderGeometry(0.09,0.15,1.6,5),mats.strange);l.position.set(sx,0.5,sz);l.rotation.z=sx>0?-0.16:0.16;g.add(l)}
   for(const s of[-1,1]){let eye=new T.Mesh(new T.SphereGeometry(0.11,6,4),mats.eye);eye.position.set(s*0.28,1.78,2.45);g.add(eye)}
   g.position.set(wx,H(wx,wz),wz);g.userData.walk=true;g.userData.home={x:wx,z:wz};g.userData.dir=hash(cx,cz,145)*6.28;g.userData.phase=hash(cx,cz,146)*6.28;
 }else{
   let body=new T.Mesh(new T.SphereGeometry(1,12,8),mats.monster);body.scale.set(4.8,6.5,3.2);body.position.y=7;g.add(body);
   let head=new T.Mesh(new T.SphereGeometry(1.5,10,7),mats.monster);head.position.set(0,13,1.4);head.scale.set(1.4,1.2,1.2);g.add(head);
   for(const sx of[-2.3,2.3]){let arm=new T.Mesh(new T.CylinderGeometry(0.55,0.9,8,7),mats.monster);arm.position.set(sx,7,0);arm.rotation.z=sx>0?-0.22:0.22;g.add(arm)}
   for(const sx of[-1.45,1.45]){let leg=new T.Mesh(new T.CylinderGeometry(0.7,1.0,7.5,7),mats.monster);leg.position.set(sx,2.7,0);g.add(leg)}
   for(const s of[-1,1]){let eye=new T.Mesh(new T.SphereGeometry(0.22,7,5),mats.eye);eye.position.set(s*0.55,13.4,2.75);g.add(eye)}
   g.position.set(wx,H(wx,wz),wz);g.userData.walk=true;g.userData.giant=true;g.userData.home={x:wx,z:wz};g.userData.dir=hash(cx,cz,147)*6.28;g.userData.phase=hash(cx,cz,148)*6.28;
 }
 g.userData.anomaly=type;return g;
}

const vehicles=[];
let activeVehicle=null;
const flashingRunwayLights=[],managedLights=[];
function addVehicleLights(g,zFront=2.2,y=1.0,spread=.7,color=0xe8f6ff,power=4,range=45){
 for(const sx of[-spread,spread]){
   const bulb=new T.Mesh(new T.SphereGeometry(.11,8,6),new T.MeshBasicMaterial({color}));
   bulb.position.set(sx,y,zFront);g.add(bulb);
   const light=new T.SpotLight(color,power,range,Math.PI/7,.45,1.4);
   light.position.set(sx,y,zFront+.05);light.target.position.set(sx,y-.35,zFront+14);
   light.userData.baseIntensity=power;light.userData.owner=g;light.userData.maxDistance=Math.max(75,range*1.8);
   g.add(light,light.target);managedLights.push(light)
 }
}
function wheel(r=.42,wid=.28){let w=new T.Mesh(new T.CylinderGeometry(r,r,wid,14),new T.MeshStandardMaterial({color:0x181a1c,roughness:.96,metalness:.08}));w.rotation.z=Math.PI/2;return w}
function makeBuggy(x,z){
 let g=new T.Group(),paint=new T.MeshStandardMaterial({color:0x8d2f29,roughness:.42,metalness:.28}),trim=new T.MeshStandardMaterial({color:0x202326,roughness:.75,metalness:.35});
 let chassis=new T.Mesh(new T.BoxGeometry(2.25,.38,3.55),paint);chassis.position.y=.78;g.add(chassis);
 let hood=new T.Mesh(new T.BoxGeometry(1.75,.42,1.15),paint);hood.position.set(0,1.02,1.05);hood.rotation.x=-.08;g.add(hood);
 let cabin=new T.Mesh(new T.BoxGeometry(1.7,.92,1.5),trim);cabin.position.set(0,1.42,-.3);g.add(cabin);
 let glass=new T.Mesh(new T.BoxGeometry(1.48,.62,.08),mats.glass);glass.position.set(0,1.55,.48);glass.rotation.x=-.2;g.add(glass);
 let bumper=new T.Mesh(new T.BoxGeometry(2.15,.22,.22),trim);bumper.position.set(0,.62,1.88);g.add(bumper);
 for(const sx of[-1.13,1.13])for(const sz of[-1.16,1.18]){let w=wheel(.49,.34);w.position.set(sx,.52,sz);g.add(w)}
 addVehicleLights(g,1.9,1.02,.72,0xf4f7ff,4.6,48);
 g.position.set(x,H(x,z),z);scene.add(g);vehicles.push({type:'Dune Buggy',kind:'buggy',group:g,x,z,yaw:0,speed:0,alt:0});return g;
}
function makeHeli(x,z){
 let g=new T.Group(),skin=new T.MeshStandardMaterial({color:0x59666b,roughness:.38,metalness:.48});
 let body=new T.Mesh(new T.SphereGeometry(1,20,12),skin);body.scale.set(1.45,1.0,2.15);body.position.y=1.78;g.add(body);
 let nose=new T.Mesh(new T.SphereGeometry(.95,18,10),mats.glass);nose.scale.set(1.05,.78,1.18);nose.position.set(0,1.9,1.45);g.add(nose);
 let tail=new T.Mesh(new T.CylinderGeometry(.16,.34,4.8,10),skin);tail.rotation.x=Math.PI/2;tail.position.set(0,1.8,-3.15);g.add(tail);
 let fin=new T.Mesh(new T.BoxGeometry(.18,1.5,1.25),mats.red);fin.position.set(0,2.28,-5.35);g.add(fin);
 let rotor=new T.Mesh(new T.BoxGeometry(8.8,.07,.16),mats.dark);rotor.position.y=3.25;g.add(rotor);rotor.name='rotor';
 let mast=new T.Mesh(new T.CylinderGeometry(.07,.09,.55,8),mats.dark);mast.position.y=3.0;g.add(mast);
 for(const sx of[-.95,.95]){let skid=new T.Mesh(new T.CylinderGeometry(.06,.06,4.0,8),mats.dark);skid.rotation.z=Math.PI/2;skid.position.set(sx,.46,0);g.add(skid)}
 addVehicleLights(g,2.25,1.72,.68,0xf2fbff,5.2,60);
 g.position.set(x,H(x,z),z);scene.add(g);vehicles.push({type:'Helicopter',kind:'heli',group:g,x,z,yaw:0,speed:0,alt:0,vy:0,pitch:0,roll:0});return g;
}
function makeJet(x,z){
 let g=new T.Group(),skin=new T.MeshStandardMaterial({color:0x8f999f,roughness:.3,metalness:.62});
 let fuse=new T.Mesh(new T.CylinderGeometry(.48,.72,7.6,18),skin);fuse.rotation.x=Math.PI/2;fuse.position.y=1.18;g.add(fuse);
 let nose=new T.Mesh(new T.ConeGeometry(.5,2.55,18),skin);nose.rotation.x=Math.PI/2;nose.position.set(0,1.18,5.0);g.add(nose);
 let wingGeo=new T.BufferGeometry();wingGeo.setAttribute('position',new T.Float32BufferAttribute([-4.6,0,1.0,4.6,0,1.0,2.0,0,-2.0,-2.0,0,-2.0],3));wingGeo.setIndex([0,1,2,0,2,3]);wingGeo.computeVertexNormals();
 let wing=new T.Mesh(wingGeo,skin);wing.position.y=1.12;g.add(wing);
 let tail=new T.Mesh(new T.BoxGeometry(3.4,.12,1.05),skin);tail.position.set(0,1.55,-3.05);g.add(tail);
 let fin=new T.Mesh(new T.BoxGeometry(.14,1.75,1.35),mats.red);fin.position.set(0,2.05,-3.25);fin.rotation.x=-.12;g.add(fin);
 let glass=new T.Mesh(new T.SphereGeometry(.6,16,10),mats.glass);glass.scale.set(.8,.5,1.45);glass.position.set(0,1.72,1.95);g.add(glass);
 let intakeL=new T.Mesh(new T.BoxGeometry(.65,.65,1.4),mats.dark),intakeR=intakeL.clone();intakeL.position.set(-.7,.95,-.2);intakeR.position.set(.7,.95,-.2);g.add(intakeL,intakeR);
 addVehicleLights(g,5.35,1.18,.36,0xffffff,6.2,80);
 g.position.set(x,H(x,z)+.25,z);scene.add(g);vehicles.push({type:'Jet',kind:'jet',group:g,x,z,yaw:Math.PI,speed:0,alt:0,vy:0,pitch:0,roll:0,airborne:false,stalled:false});g.rotation.y=Math.PI;return g;
}
const startColliders=[];
function startBox(parent,x,y,z,w,h,d,mat,collide=false){
 let m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
 m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);
 if(collide)startColliders.push({x,z,hx:w/2,hz:d/2});
 return m
}
function makeWelcomeScreen(parent,x,y,z){
 const cv=document.createElement('canvas');cv.width=512;cv.height=256;
 const ctx=cv.getContext('2d');
 ctx.fillStyle='#061014';ctx.fillRect(0,0,512,256);
 ctx.strokeStyle='#76f7ff';ctx.lineWidth=8;ctx.strokeRect(8,8,496,240);
 ctx.fillStyle='#9ffcff';ctx.textAlign='center';ctx.font='bold 35px Arial';
 ctx.fillText('WELCOME TO THE GAME',256,92);
 ctx.font='bold 29px Arial';ctx.fillText('GO EXPLORE!',256,150);
 ctx.font='18px Arial';ctx.fillStyle='#c8ffff';ctx.fillText('AIRFIELD // BASE ONLINE',256,202);
 const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
 const mat=new T.MeshStandardMaterial({map:tex,emissive:0x103c42,emissiveIntensity:1.4,roughness:.28});
 const scr=new T.Mesh(new T.PlaneGeometry(5.4,2.7),mat);
 scr.position.set(x,y,z);scr.rotation.y=Math.PI/2;parent.add(scr);
 const glow=new T.PointLight(0x72efff,1.6,8);glow.position.set(x+1,y,z);parent.add(glow);
 return scr
}
function runwayStrip(){
 let g=new T.Group(),y=START_PLATEAU;
 const concrete=new T.MeshStandardMaterial({color:0x8e9392,roughness:.96});
 const hangarMat=new T.MeshStandardMaterial({color:0x4b5559,roughness:.72,metalness:.22});
 const innerMat=new T.MeshStandardMaterial({color:0x252d30,roughness:.9});
 const yellow=new T.MeshBasicMaterial({color:0xe9c747});
 const white=new T.MeshBasicMaterial({color:0xf2f0dd});
 const blue=new T.MeshBasicMaterial({color:0x86ddff});

 // Full-width, level runway with thresholds, centreline, edge lights and taxiway.
 startBox(g,24,y+.055,0,18,.11,92,mats.runway,false);
 for(let z=-37;z<=37;z+=9)startBox(g,24,y+.125,z,.38,.03,4.8,white,false);
 for(const z of[-43,43])for(let x=18;x<=30;x+=2.4)startBox(g,x,y+.13,z,.7,.035,5.2,white,false);
 for(const side of[-1,1])for(let z=-43;z<=43;z+=5){
   let mat=new T.MeshBasicMaterial({color:side<0?0x82caff:0xfff2bd,transparent:true,opacity:1}),
       bulb=new T.Mesh(new T.SphereGeometry(.13,7,5),mat);
   bulb.position.set(24+side*9.15,y+.24,z);g.add(bulb);
   flashingRunwayLights.push({mesh:bulb,phase:(z+43)*.17+(side>0?1.4:0)})
 }
 startBox(g,8,y+.065,-24,24,.13,8,mats.runway,false);
 for(let x=-2;x<=19;x+=4)startBox(g,x,y+.135,-24,1.7,.035,.22,yellow,false);

 // Main aircraft hangar. East/front side is fully open onto taxiway.
 const hx=-3,hz=-24,hw=30,hd=28,hh=9;
 startBox(g,hx,y+.12,hz,hw,.24,hd,concrete,false);
 startBox(g,hx,y+hh,hz,hw,.42,hd,hangarMat,false);
 startBox(g,hx-hw/2+.25,y+hh/2,hz,.5,hh,hd,hangarMat,true);
 startBox(g,hx,y+hh/2,hz-hd/2+.25,hw,hh,.5,hangarMat,true);
 startBox(g,hx,y+hh/2,hz+hd/2-.25,hw,hh,.5,hangarMat,true);
 // front corner columns frame the open aircraft entrance
 startBox(g,hx+hw/2-.28,y+hh/2,hz-hd/2+2,.56,hh,4,hangarMat,true);
 startBox(g,hx+hw/2-.28,y+hh/2,hz+hd/2-2,.56,hh,4,hangarMat,true);

 // Starter briefing room built inside the rear of the hangar.
 const wallX=-10.2,roomWest=hx-hw/2+.5;
 startBox(g,wallX,y+3.1,hz-8.0,.42,6.2,8.0,innerMat,true);
 startBox(g,wallX,y+3.1,hz+8.0,.42,6.2,8.0,innerMat,true);
 startBox(g,wallX,y+5.25,hz,.42,1.9,8.0,innerMat,true);
 // visibly open sliding door beside the doorway
 startBox(g,wallX-.18,y+2.0,hz+5.7,.16,4.0,3.2,new T.MeshStandardMaterial({color:0x394449,metalness:.45,roughness:.5}),false);
 // desk and small seating in start room
 startBox(g,-14.2,y+.55,-29.2,4.8,1.1,1.1,innerMat,true);
 startBox(g,-14.8,y+.45,-20.1,2.4,.9,1.2,innerMat,true);
 startBox(g,-12.5,y+.45,-20.1,1.0,.9,1.0,innerMat,true);
 makeWelcomeScreen(g,-17.68,y+3.2,-24);

 // High-output hangar flood lighting.
 for(const z of[-34,-28,-22,-16,-12]){
   const strip=new T.Mesh(new T.BoxGeometry(11,.1,.28),new T.MeshBasicMaterial({color:0xe8fbff}));
   strip.position.set(-2.5,y+8.45,z);g.add(strip);
   const flood=new T.PointLight(0xe6f8ff,2.7,30,1.7);flood.position.set(-2.5,y+7.9,z);g.add(flood)
 }
 for(const z of[-36,-12]){
   const spot=new T.SpotLight(0xf1fbff,5.2,50,Math.PI/5,.5,1.5);
   spot.position.set(10.5,y+7.6,z);spot.target.position.set(-2,y+.2,-24);g.add(spot,spot.target)
 }

 // Dedicated helipad.
 const pad=new T.Mesh(new T.CircleGeometry(8.5,32),mats.runway);
 pad.rotation.x=-Math.PI/2;pad.position.set(-28,y+.075,-3);g.add(pad);
 const ring=new T.Mesh(new T.RingGeometry(5.2,5.65,32),white);ring.rotation.x=-Math.PI/2;ring.position.set(-28,y+.13,-3);g.add(ring);
 startBox(g,-28,y+.14,-3,.5,.035,7.4,white,false);
 startBox(g,-28,y+.14,-3,5.0,.035,.5,white,false);

 // Car garage, open toward the airfield.
 const gx=-29,gz=24,gw=15,gd=13,gh=5.5;
 startBox(g,gx,y+.1,gz,gw,.2,gd,concrete,false);
 startBox(g,gx,y+gh,gz,gw,.35,gd,hangarMat,false);
 startBox(g,gx-gw/2+.25,y+gh/2,gz,.5,gh,gd,hangarMat,true);
 startBox(g,gx,y+gh/2,gz-gd/2+.25,gw,gh,.5,hangarMat,true);
 startBox(g,gx,y+gh/2,gz+gd/2-.25,gw,gh,.5,hangarMat,true);
 startBox(g,gx+gw/2-.25,y+gh/2,gz-gd/2+1.6,.5,gh,3.2,hangarMat,true);
 startBox(g,gx+gw/2-.25,y+gh/2,gz+gd/2-1.6,.5,gh,3.2,hangarMat,true);
 startBox(g,-18.5,y+.06,24,7,.12,8,mats.runway,false);

 // Base floodlights and apron/runway approach lighting.
 for(const [x,z] of[[-18,-39],[-18,-9],[15,-38],[15,-10],[-36,-11],[-20,7],[-37,17],[-20,31],[12,35],[36,35],[12,-35],[36,-35]]){
   startBox(g,x,y+3.1,z,.18,6.2,.18,innerMat,false);
   let l=new T.SpotLight(0xeaf8ff,4.2,52,Math.PI/5,.52,1.45);
   l.position.set(x,y+6.15,z);l.target.position.set(x+(x<0?8:0),y+.1,z);g.add(l,l.target);
   let head=new T.Mesh(new T.BoxGeometry(.75,.3,.42),new T.MeshBasicMaterial({color:0xeaf8ff}));
   head.position.set(x,y+6.05,z);g.add(head)
 }
 const sign=startBox(g,-2,y+7.15,-38.25,13,1.15,.18,innerMat,false);
 const signGlow=new T.PointLight(0x88dfff,.8,9);signGlow.position.set(-2,y+7,-37.4);g.add(signGlow);

 scene.add(g);
 makeJet(1,-24);vehicles[vehicles.length-1].yaw=Math.PI/2;vehicles[vehicles.length-1].group.rotation.y=Math.PI/2;
 makeHeli(-28,-3);
 makeBuggy(-29,24);vehicles[vehicles.length-1].yaw=Math.PI/2;vehicles[vehicles.length-1].group.rotation.y=Math.PI/2;
 return g;
}
const startBase=runwayStrip();

const cityColliders=[];
function inCityZone(x,z){return x>-190&&x<-64&&z>-70&&z<70}
function cityMat(color,roughness=0.85,emissive=0){
 return new T.MeshStandardMaterial({color,roughness,emissive,emissiveIntensity:emissive?0.32:0});
}
const cityM={
 road:cityMat(0x303236,0.98),
 curb:cityMat(0x8c8b83,1),
 concrete:cityMat(0xaaa69d,0.96),
 brick:cityMat(0x76504a,0.92),
 plaster:cityMat(0xb6aa94,0.95),
 blue:cityMat(0x496579,0.88),
 dark:cityMat(0x282b2d,0.9),
 wood:cityMat(0x68482f,0.96),
 floor:cityMat(0x817666,0.98),
 glass:new T.MeshPhysicalMaterial({color:0x8bb3c2,transparent:true,opacity:0.46,roughness:0.18,metalness:0.04}),
 warm:new T.MeshBasicMaterial({color:0xffd98a}),
 green:cityMat(0x315c39,0.98),
 red:cityMat(0x8c3e36,0.9),
 cream:cityMat(0xd3c5a9,0.92)
};
function cityBox(parent,x,y,z,w,h,d,mat,collide=false){
 let m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
 m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);
 if(collide)cityColliders.push({x,z,hx:w/2,hz:d/2});
 return m
}
function cityLamp(parent,x,z){
 let y=H(x,z),p=cityBox(parent,x,y+2.15,z,0.14,4.3,0.14,cityM.dark,false);
 let bulb=new T.Mesh(new T.SphereGeometry(0.18,7,5),cityM.warm);bulb.position.set(x,y+4.28,z);parent.add(bulb)
}
function cityRoad(parent,x0,z0,x1,z1,width,segments=24){
 for(let i=0;i<segments;i++){
   let t=(i+.5)/segments,x=T.MathUtils.lerp(x0,x1,t),z=T.MathUtils.lerp(z0,z1,t),
       nx=T.MathUtils.lerp(x0,x1,(i+1)/segments),nz=T.MathUtils.lerp(z0,z1,(i+1)/segments),
       len=Math.hypot(nx-x,z-nz)*2+0.35,ang=Math.atan2(x1-x0,z1-z0);
   let m=cityBox(parent,x,H(x,z)+0.045,z,width,0.08,len,cityM.road,false);m.rotation.y=ang
 }
}
function furnishRoom(g,cx,cz,w,d,type,y){
 let add=(x,z,ww,hh,dd,mat,coll=true)=>cityBox(g,cx+x,y+hh/2,cz+z,ww,hh,dd,mat,coll);
 if(type==='cafe'){
   add(0,-d*.28,w*.72,1.05,1.1,cityM.wood);
   for(const x of[-w*.28,w*.05,w*.3]){
     add(x,d*.08,1.35,.75,1.35,cityM.wood);
     for(const q of[-.7,.7])add(x+q,d*.08,.38,.72,.38,cityM.dark)
   }
 }else if(type==='home'){
   add(-w*.23,-d*.25,3.4,.65,2.2,cityM.cream);
   add(w*.24,-d*.28,2.8,.7,1.1,cityM.wood);
   add(0,d*.15,3.3,.8,1.35,cityM.blue);
   add(0,d*.31,2.2,.45,.8,cityM.wood)
 }else if(type==='shop'){
   add(0,-d*.3,w*.68,1.15,1.0,cityM.dark);
   for(const x of[-w*.28,0,w*.28])add(x,d*.12,1.0,1.9,d*.28,cityM.wood)
 }else if(type==='office'){
   for(const x of[-w*.25,w*.18])for(const z of[-d*.18,d*.16]){
     add(x,z,2.6,.76,1.25,cityM.wood);
     add(x,z-.85,.55,.75,.55,cityM.dark)
   }
 }else if(type==='clinic'){
   for(const x of[-w*.23,w*.23])add(x,.08,2.5,.72,4.4,cityM.cream);
   add(0,-d*.28,w*.62,1.0,1.0,cityM.blue)
 }else if(type==='library'){
   for(const x of[-w*.34,w*.34])add(x,0,1.05,2.4,d*.62,cityM.wood);
   add(0,.12,3.2,.76,1.25,cityM.wood)
 }else{
   add(0,-d*.27,w*.64,1.0,1.0,cityM.wood);
   for(const x of[-w*.28,w*.28])add(x,d*.12,2.3,.7,1.0,cityM.dark)
 }
}
function cityBuilding(parent,cx,cz,w,d,h,mat,type,label){
 let y=H(cx,cz),wall=.38,door=Math.min(4.4,w*.36),frontZ=cz-d/2;
 cityBox(parent,cx,y+.08,cz,w,.16,d,cityM.floor,false);
 cityBox(parent,cx,y+h,cz,w,.28,d,cityM.dark,false);
 cityBox(parent,cx-w/2+wall/2,y+h/2,cz,wall,h,d,mat,true);
 cityBox(parent,cx+w/2-wall/2,y+h/2,cz,wall,h,d,mat,true);
 cityBox(parent,cx,y+h/2,cz+d/2-wall/2,w,h,wall,mat,true);
 let side=(w-door)/2;
 cityBox(parent,cx-(door/2+side/2),y+h/2,frontZ+wall/2,side,h,wall,mat,true);
 cityBox(parent,cx+(door/2+side/2),y+h/2,frontZ+wall/2,side,h,wall,mat,true);
 cityBox(parent,cx,y+h-.38,frontZ+wall/2,door,.76,wall,mat,true);

 // Wide, genuinely walkable entrance with a shallow porch/ramp and interior light.
 let porch=new T.Mesh(new T.BoxGeometry(door*.88,.12,2.4),cityM.concrete);
 porch.position.set(cx,y+.06,frontZ-1.05);parent.add(porch);
 let entryLight=new T.PointLight(0xffe0aa,1.1,8);entryLight.position.set(cx,y+2.7,frontZ+.6);parent.add(entryLight);

 for(const sx of[-.28,.28]){
   let win=new T.Mesh(new T.BoxGeometry(w*.22,1.35,.06),cityM.glass);
   win.position.set(cx+sx*w,y+2.65,frontZ-.04);parent.add(win)
 }
 let sign=cityBox(parent,cx,y+h-.95,frontZ-.18,Math.min(w*.68,8),.68,.18,cityM.dark,false);
 sign.userData.label=label;
 let awning=cityBox(parent,cx,y+2.05,frontZ-.78,Math.min(w*.65,7),.12,1.45,type==='cafe'?cityM.red:cityM.blue,false);
 awning.rotation.x=-.08;
 furnishRoom(parent,cx,cz,w,d,type,y);
}
const townInteractions=[],townHumans=[];
function townText(parent,text,x,y,z,w=7,h=1.15){
 const cv=document.createElement('canvas');cv.width=512;cv.height=96;const ctx=cv.getContext('2d');
 ctx.fillStyle='#151b1d';ctx.fillRect(0,0,512,96);ctx.strokeStyle='#8fe6c1';ctx.lineWidth=5;ctx.strokeRect(3,3,506,90);
 ctx.fillStyle='#effff7';ctx.font='bold 34px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,48);
 const tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;
 const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:false}));
 m.position.set(x,y,z);parent.add(m);return m
}
function makeHuman(parent,x,z,shirt=0x546f8a,role='Resident'){
 const g=new T.Group(),skin=cityMat(0xc99872,.8),cloth=cityMat(shirt,.82),pants=cityMat(0x2f3438,.9);
 const body=new T.Mesh(new T.CylinderGeometry(.38,.46,1.35,8),cloth);body.position.y=1.55;g.add(body);
 const head=new T.Mesh(new T.SphereGeometry(.34,10,8),skin);head.position.y=2.55;g.add(head);
 for(const sx of[-.2,.2]){let leg=new T.Mesh(new T.CylinderGeometry(.11,.13,.85,7),pants);leg.position.set(sx,.55,0);g.add(leg)}
 g.position.set(x,H(x,z),z);g.userData.role=role;parent.add(g);townHumans.push(g);return g
}
function addTownInteraction(type,x,z,label,data={}){townInteractions.push({type,x,z,label,...data})}
function townShell(parent,cx,cz,w,d,h,mat,label,doorSide='south'){
 const y=H(cx,cz),wall=.42,door=4.2;
 cityBox(parent,cx,y+.08,cz,w,.16,d,cityM.floor,false);
 cityBox(parent,cx,y+h,cz,w,.3,d,cityM.dark,false);
 cityBox(parent,cx-w/2+wall/2,y+h/2,cz,wall,h,d,mat,true);
 cityBox(parent,cx+w/2-wall/2,y+h/2,cz,wall,h,d,mat,true);
 const frontZ=doorSide==='south'?cz-d/2:cz+d/2,backZ=doorSide==='south'?cz+d/2:cz-d/2;
 cityBox(parent,cx,y+h/2,backZ-(doorSide==='south'?wall/2:-wall/2),w,h,wall,mat,true);
 let side=(w-door)/2;
 cityBox(parent,cx-(door/2+side/2),y+h/2,frontZ+(doorSide==='south'?wall/2:-wall/2),side,h,wall,mat,true);
 cityBox(parent,cx+(door/2+side/2),y+h/2,frontZ+(doorSide==='south'?wall/2:-wall/2),side,h,wall,mat,true);
 cityBox(parent,cx,y+h-.38,frontZ+(doorSide==='south'?wall/2:-wall/2),door,.76,wall,mat,true);
 const porchZ=frontZ+(doorSide==='south'?-1.25:1.25);
 cityBox(parent,cx,y+.06,porchZ,door*1.05,.12,2.6,cityM.concrete,false);
 townText(parent,label,cx,y+h-.95,frontZ+(doorSide==='south'?-0.24:0.24),Math.min(w*.72,9),1.05);
 for(const sx of[-.3,.3]){
   let win=new T.Mesh(new T.BoxGeometry(w*.2,1.5,.08),cityM.glass);
   win.position.set(cx+sx*w,y+2.6,frontZ+(doorSide==='south'?-0.05:.05));parent.add(win)
 }
 return {y,frontZ,door}
}
function townBench(parent,x,z,rot=0){
 const y=H(x,z),g=new T.Group();
 cityBox(g,0,.55,0,2.5,.18,.55,cityM.wood,false);cityBox(g,0,1.15,.22,2.5,.18,.45,cityM.wood,false);
 for(const sx of[-.9,.9])cityBox(g,sx,.28,0,.14,.56,.5,cityM.dark,false);
 g.position.set(x,y,z);g.rotation.y=rot;parent.add(g);cityColliders.push({x,z,hx:1.3,hz:.5});
 addTownInteraction('bench',x,z,'SIT ON BENCH',{yaw:rot});
}
function arcadeMachine(parent,x,z,rot=0,name='STAR RUNNER'){
 const y=H(x,z),g=new T.Group(),cab=cityMat(0x302447,.55),trim=new T.MeshBasicMaterial({color:0x7cf6ff});
 cityBox(g,0,1.15,0,1.05,2.3,.9,cab,false);
 let scr=new T.Mesh(new T.PlaneGeometry(.72,.52),new T.MeshBasicMaterial({color:0x1ae1ee}));scr.position.set(0,1.48,.46);g.add(scr);
 cityBox(g,0,2.18,0,1.1,.13,.95,trim,false);g.position.set(x,y,z);g.rotation.y=rot;parent.add(g);
 cityColliders.push({x,z,hx:.6,hz:.55});addTownInteraction('arcade',x,z,'PLAY '+name,{game:name});
}
function makeCity(){
 let g=new T.Group(),cx=-126,cz=6;

 // Road from the airfield heads west into a compact walkable town.
 cityRoad(g,-46,8,-72,8,8,10);
 cityRoad(g,-72,8,-184,8,10,30);
 cityRoad(g,-126,-58,-126,64,9,30);
 cityRoad(g,-82,-48,-82,56,7,24);
 cityRoad(g,-170,-48,-170,56,7,24);
 for(let x=-178;x<=-74;x+=13)cityBox(g,x,H(x,8)+.09,8,.16,.05,3.7,cityM.cream,false);
 for(const z of[-36,43])for(let x=-176;x<=-76;x+=14)cityLamp(g,x,z);
 for(const x of[-86,-166])for(let z=-29;z<=45;z+=18)cityLamp(g,x,z);

 // WESTSIDE SUPPLY - fully enterable shop with clerk, counters and equipment racks.
 let s=townShell(g,-101,-20,20,20,6.2,cityM.brick,'WESTSIDE SUPPLY');
 cityBox(g,-106,s.y+.65,-16,6,1.3,1.2,cityM.dark,true);
 cityBox(g,-95,s.y+1.0,-16,1.2,2.0,6.8,cityM.wood,true);
 cityBox(g,-91.8,s.y+1.0,-16,1.2,2.0,6.8,cityM.wood,true);
 makeHuman(g,-106,-18,0x315c39,'Shopkeeper');
 addTownInteraction('shop',-106,-18,'TRADE WITH SHOPKEEPER');

 // Arcade with several working machines and open central aisle.
 s=townShell(g,-129,-20,22,20,6.2,cityM.blue,'NEON ARCADE');
 for(const [x,z,n] of[[-135,-17,'STAR RUNNER'],[-132,-17,'MOON RAID'],[-126,-17,'WILDLANDS GT'],[-123,-17,'ASTRO DROP'],[-120,-17,'TANK DUEL']])arcadeMachine(g,x,z,Math.PI,n);
 cityBox(g,-129,s.y+.55,-26,8,1.1,1.1,cityM.dark,true);
 makeHuman(g,-130,-24,0x7a4c8e,'Arcade Attendant');

 // Cafe with tables spaced around a clear entrance.
 s=townShell(g,-158,-20,20,20,6,cityM.plaster,'CAFE');
 cityBox(g,-158,s.y+.65,-16,9,1.3,1.2,cityM.wood,true);
 for(const [x,z] of[[-163,-23],[-155,-23],[-163,-28],[-155,-28]]){
   cityBox(g,x,s.y+.4,z,1.5,.8,1.5,cityM.wood,true);
   cityBox(g,x+1,s.y+.35,z,.45,.7,.45,cityM.dark,true)
 }
 makeHuman(g,-160,-17,0x8c3e36,'Barista');

 // Tool workshop. The human is interactive through the main shop economy too.
 s=townShell(g,-101,34,20,20,6.2,cityM.plaster,'WORKSHOP','north');
 cityBox(g,-106,s.y+1.0,31,1.2,2,7,cityM.wood,true);
 cityBox(g,-95,s.y+1.0,31,1.2,2,7,cityM.wood,true);
 cityBox(g,-101,s.y+.72,28,7,1.44,1.1,cityM.dark,true);
 makeHuman(g,-101,30,0x6e543c,'Mechanic');
 addTownInteraction('shop',-101,30,'BROWSE TOOLS');

 // Clinic, residence and community hall are enterable and furnished.
 s=townShell(g,-130,34,22,20,6.1,cityM.brick,'CLINIC','north');
 for(const x of[-135,-126])cityBox(g,x,s.y+.42,31,3,.84,5,cityM.cream,true);
 makeHuman(g,-130,30,0x496579,'Medic');

 s=townShell(g,-160,34,22,20,6.3,cityM.cream,'COMMUNITY HALL','north');
 for(const x of[-166,-160,-154])cityBox(g,x,s.y+.42,31,3.5,.84,1.2,cityM.wood,true);
 makeHuman(g,-160,29,0x725d45,'Resident');

 // Central square with fountain, trees and interactive benches.
 let py=H(-126,53);
 cityBox(g,-126,py+.05,53,30,.1,18,cityM.concrete,false);
 let fountain=new T.Mesh(new T.CylinderGeometry(3.2,3.6,.7,20),cityM.concrete);fountain.position.set(-126,py+.36,53);g.add(fountain);
 let water=new T.Mesh(new T.CylinderGeometry(2.7,2.7,.08,20),new T.MeshPhysicalMaterial({color:0x4d8da6,transparent:true,opacity:.7,roughness:.2}));water.position.set(-126,py+.74,53);g.add(water);
 cityColliders.push({x:-126,z:53,hx:3.6,hz:3.6});
 townBench(g,-136,49,0);townBench(g,-116,49,Math.PI);townBench(g,-136,58,0);townBench(g,-116,58,Math.PI);
 for(const [x,z] of[[-178,-39],[-74,-39],[-178,43],[-74,43],[-145,53],[-107,53]]){
   cityBox(g,x,H(x,z)+1.5,z,.45,3,.45,cityM.wood,true);
   let crown=new T.Mesh(new T.IcosahedronGeometry(2.0,1),cityM.green);crown.position.set(x,H(x,z)+4,z);g.add(crown)
 }

 // Street residents make the town feel inhabited without expensive AI.
 makeHuman(g,-118,11,0x76504a,'Resident');
 makeHuman(g,-147,7,0x496579,'Resident');
 makeHuman(g,-91,9,0x8c3e36,'Resident');
 makeHuman(g,-171,11,0x315c39,'Resident');

 scene.add(g);return g
}
const cityGroup=makeCity();

const moonColliders=[],moonMineables=[],moonCollectibles=[];
function moonBox(parent,x,y,z,w,h,d,mat,collide=false){
 let m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
 m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);
 if(collide)moonColliders.push({x,z,hx:w/2,hz:d/2});
 return m
}
function makeMoonBuggy(parent,x,z){
 let g=new T.Group(),white=new T.MeshStandardMaterial({color:0xd7d9d2,roughness:.52,metalness:.28}),frame=new T.MeshStandardMaterial({color:0x33383b,roughness:.7,metalness:.45});
 let body=new T.Mesh(new T.BoxGeometry(2.7,.48,3.9),white);body.position.y=.95;g.add(body);
 let nose=new T.Mesh(new T.BoxGeometry(2.2,.4,1.15),white);nose.position.set(0,1.15,1.25);nose.rotation.x=-.08;g.add(nose);
 let cab=new T.Mesh(new T.BoxGeometry(1.85,.82,1.55),mats.glass);cab.position.set(0,1.58,.15);g.add(cab);
 let roof=new T.Mesh(new T.BoxGeometry(2.0,.16,1.8),frame);roof.position.set(0,2.02,.08);g.add(roof);
 let rack=new T.Mesh(new T.BoxGeometry(2.15,.15,1.15),frame);rack.position.set(0,1.15,-1.5);g.add(rack);
 for(const sx of[-1.32,1.32])for(const sz of[-1.38,1.38]){let w=wheel(.55,.38);w.position.set(sx,.58,sz);g.add(w)}
 addVehicleLights(g,2.05,1.18,.78,0xdfffff,5.2,55);
 g.position.set(x,moonH(x,z),z);parent.add(g);
 let v={type:'Moon Buggy',kind:'moonbuggy',realm:'moon',group:g,x,z,yaw:0,speed:0,alt:0};
 vehicles.push(v);return v
}
function makeMek(parent,x,z){
 let g=new T.Group(),metal=new T.MeshStandardMaterial({color:0x59656c,roughness:.4,metalness:.66}),accent=cityMat(0xb5d8d6,.36,0x183c44),joint=cityMat(0x25292c,.65);
 let pelvis=new T.Mesh(new T.BoxGeometry(3.1,1.1,2.4),joint);pelvis.position.y=3.55;g.add(pelvis);
 let torso=new T.Mesh(new T.BoxGeometry(3.9,3.0,2.9),metal);torso.position.y=5.3;torso.rotation.x=-.04;g.add(torso);
 let cockpit=new T.Mesh(new T.SphereGeometry(1,16,10),mats.glass);cockpit.scale.set(1.25,.8,.95);cockpit.position.set(0,5.85,1.58);g.add(cockpit);
 for(const sx of[-1.15,1.15]){
   let hip=new T.Mesh(new T.SphereGeometry(.62,10,7),joint);hip.position.set(sx,3.3,0);g.add(hip);
   let leg=new T.Mesh(new T.BoxGeometry(.95,3.0,1.15),metal);leg.position.set(sx,1.85,0);g.add(leg);
   let foot=new T.Mesh(new T.BoxGeometry(1.75,.62,2.4),joint);foot.position.set(sx,.34,.38);g.add(foot);
   let shoulder=new T.Mesh(new T.SphereGeometry(.7,10,7),joint);shoulder.position.set(sx*1.9,5.5,0);g.add(shoulder);
   let arm=new T.Mesh(new T.BoxGeometry(.78,2.7,.9),metal);arm.position.set(sx*2.05,4.2,.2);g.add(arm)
 }
 let drill=new T.Mesh(new T.ConeGeometry(.62,3.1,14),accent);drill.rotation.x=Math.PI/2;drill.position.set(2.08,3.75,2.3);g.add(drill);
 for(const sx of[-.92,.92]){let jet=new T.Mesh(new T.CylinderGeometry(.3,.43,1.55,10),accent);jet.rotation.x=Math.PI/2;jet.position.set(sx,4.1,-2.15);g.add(jet)}
 addVehicleLights(g,2.3,5.25,1.35,0xdfffff,7.5,70);
 g.position.set(x,moonH(x,z),z);parent.add(g);
 let v={type:'MEK Miner',kind:'mek',realm:'moon',group:g,x,z,yaw:0,speed:0,alt:0,vy:0,pitch:0,roll:0};
 vehicles.push(v);return v
}
function makeMoonWorld(){
 let g=new T.Group(),geo=new T.PlaneGeometry(1600,1600,72,72);geo.rotateX(-Math.PI/2);
 let p=geo.attributes.position,cols=[];
 for(let i=0;i<p.count;i++){
   let x=p.getX(i),z=p.getZ(i),h=moonH(x,z);p.setY(i,h);
   let c=new T.Color(0x9a9994);c.multiplyScalar(.78+fbm(x*.04,z*.04,920)*.2);cols.push(c.r,c.g,c.b)
 }
 geo.setAttribute('color',new T.Float32BufferAttribute(cols,3));geo.computeVertexNormals();
 let ground=new T.Mesh(geo,new T.MeshStandardMaterial({vertexColors:true,roughness:1,metalness:0}));
 ground.receiveShadow=true;g.add(ground);

 // Landing beacon visible from far above the moon surface.
 let beaconPole=moonBox(g,0,moonH(0,0)+5,0,.55,10,.55,cityM.dark,true);
 let beacon=new T.Mesh(new T.SphereGeometry(1.15,12,8),new T.MeshBasicMaterial({color:0x8ffcff}));
 beacon.position.set(0,moonH(0,0)+10.8,0);g.add(beacon);
 let beaconLight=new T.PointLight(0x8ffcff,8,190);beaconLight.position.copy(beacon.position);g.add(beaconLight);

 // Open-front hangar and connected habitat: both are full-scale and walkable.
 let by=moonH(0,18);
 moonBox(g,0,by+.12,18,30,.24,22,cityM.floor,false);
 moonBox(g,-15,by+4.3,18,.55,8.6,22,cityM.cream,true);
 moonBox(g,15,by+4.3,18,.55,8.6,22,cityM.cream,true);
 moonBox(g,0,by+4.3,29,30,8.6,.55,cityM.cream,true);
 moonBox(g,0,by+8.6,18,30,.45,22,cityM.dark,false);
 moonBox(g,-11.1,by+4.3,7.1,7.8,8.6,.55,cityM.cream,true);
 moonBox(g,11.1,by+4.3,7.1,7.8,8.6,.55,cityM.cream,true);
 moonBox(g,0,by+7.6,7.1,14.4,2.0,.55,cityM.cream,true);

 // Clearly open main entrance with a wide landing ramp, door frame and guide lights.
 moonBox(g,0,by+.055,4.2,11.5,.11,6.0,cityM.concrete,false);
 for(const x of[-6.1,6.1]){
   moonBox(g,x,by+3.0,7.0,.28,6.0,.55,cityM.dark,false);
   let l=new T.PointLight(0x8ffcff,1.6,14);l.position.set(x,by+3.8,6.3);g.add(l)
 }
 for(const x of[-4,-2,0,2,4]){
   let guide=new T.Mesh(new T.BoxGeometry(.55,.035,1.6),new T.MeshBasicMaterial({color:0x7df8ff}));
   guide.position.set(x,by+.13,3.4);g.add(guide)
 }

 // Interior control room, bunks, storage and mining lab.
 moonBox(g,-8,by+.65,20,7,1.1,2.2,cityM.blue,true);
 moonBox(g,7.5,by+.8,22,8,1.4,2.4,cityM.dark,true);
 for(const x of[-9,-5])moonBox(g,x,by+.5,26,3.1,.8,1.25,cityM.cream,true);
 for(const x of[3,7,11])moonBox(g,x,by+1.0,27,2.2,2.0,1.1,cityM.wood,true);
 for(const x of[-5,0,5]){
   let panel=moonBox(g,x,by+2.3,8.0,3.6,1.8,.22,cityM.dark,false);
   let screen=new T.Mesh(new T.PlaneGeometry(2.4,.95),new T.MeshBasicMaterial({color:0x74dbe4}));
   screen.position.set(x,by+2.45,7.86);screen.rotation.x=0;g.add(screen)
 }

 // Surface lights and landing pads.
 for(const x of[-24,-12,12,24])for(const z of[-7,3]){
   let l=new T.PointLight(0xbfeaff,1.8,32);l.position.set(x,moonH(x,z)+2.2,z);g.add(l);
   moonBox(g,x,moonH(x,z)+.05,z,.25,3.5,.25,cityM.dark,false)
 }
 for(const x of[-24,24]){
   let pad=new T.Mesh(new T.CircleGeometry(7,24),cityM.concrete);pad.rotation.x=-Math.PI/2;pad.position.set(x,moonH(x,-13)+.08,-13);g.add(pad)
 }

 // Scatter lunar boulders across the rough terrain beyond the base.
 for(let i=0;i<70;i++){
   let a=i*2.3999632297,r=95+(i%14)*23,x=Math.cos(a)*r,z=Math.sin(a)*r+18;
   if(Math.abs(x)<58&&Math.abs(z-18)<62)continue;
   let s=.7+(i%5)*.34,m=new T.Mesh(new T.DodecahedronGeometry(s,1),cityMat(i%3===0?0x6e6d69:0x85837d,1));
   m.scale.set(1.15,.62+.12*(i%3),.9);m.rotation.set((i%4)*.18,a,(i%5)*.11);
   m.position.set(x,moonH(x,z)+s*.55,z);m.castShadow=true;g.add(m)
 }

 // Collectible field samples for the player's inventory.
 const samples=[[-52,72,'Lunar Rock'],[74,88,'Lunar Rock'],[-92,-54,'Regolith Sample'],[132,-18,'Regolith Sample'],[-148,96,'Impact Glass'],[205,142,'Impact Glass']];
 samples.forEach((q,i)=>{
   if(world.inventory['sample:'+i])return;
   let m=new T.Mesh(new T.OctahedronGeometry(.62+(i%2)*.16,0),new T.MeshStandardMaterial({color:i>3?0x8bd6df:0xb8b7ad,roughness:.42,metalness:i>3?.18:.05,emissive:i>3?0x15383c:0,emissiveIntensity:.55}));
   m.position.set(q[0],moonH(q[0],q[1])+.68,q[1]);m.castShadow=true;g.add(m);
   moonCollectibles.push({id:'sample:'+i,name:q[2],x:q[0],z:q[1],mesh:m})
 });

 // Mineable lunar rocks.
 const rocks=[[-48,-18],[-62,8],[-45,42],[-24,58],[26,58],[52,39],[66,7],[49,-31],[22,-54],[-18,-58],[-78,52],[82,-44]];
 rocks.forEach((q,i)=>{
   if(world.moonMined['r'+i])return;
   let m=new T.Mesh(new T.DodecahedronGeometry(1.8+(i%3)*.45,1),cityMat(0x777773,1));
   m.scale.y=.72;m.position.set(q[0],moonH(q[0],q[1])+1.1,q[1]);m.castShadow=true;g.add(m);
   moonMineables.push({id:'r'+i,x:q[0],z:q[1],mesh:m})
 });

 makeMoonBuggy(g,-22,-13);makeMoonBuggy(g,22,-13);makeMek(g,34,4);
 g.visible=false;scene.add(g);return g
}
const moonGroup=makeMoonWorld();

// Manage local lights by distance so dozens of inactive lights do not burden
// the GPU every frame. Their visible lamp meshes remain, only illumination is culled.
scene.traverse(o=>{
 if((o.isPointLight||o.isSpotLight)&&o!==sun&&!managedLights.includes(o)){
   o.userData.baseIntensity=o.intensity;
   o.userData.owner=o.parent||scene;
   o.userData.maxDistance=o.distance?Math.max(55,o.distance*1.7):85;
   managedLights.push(o)
 }
});
const lightProbe=new T.Vector3();let lightUpdateAt=0;
function updateManagedLights(day){
 const now=performance.now();if(now-lightUpdateAt<180)return;lightUpdateAt=now;
 const dark=moonMode?1:T.MathUtils.clamp(1-day+.08,0,1);
 for(const l of managedLights){
   const owner=l.userData.owner;
   if(!owner||!owner.visible||!l.parent){l.visible=false;continue}
   l.getWorldPosition(lightProbe);
   const py=activeVehicle&&activeVehicle.kind==='ufo'?activeVehicle.worldY:H(player.x,player.z)+1.7;
   const d=Math.hypot(lightProbe.x-player.x,lightProbe.y-py,lightProbe.z-player.z);
   const max=l.userData.maxDistance||85,on=d<max&&dark>.08;
   l.visible=on;if(on)l.intensity=(l.userData.baseIntensity||1)*dark
 }
}

function createChunk(cx,cz){
 let k=key(cx,cz),d=descriptor(cx,cz),root=new T.Group(),near=new T.Group(),far=new T.Group();

 // Freeze every chunk the first time it is actually rendered, not only when
 // the player steps into it. This prevents surrounding chunks from being
 // regenerated differently after cache eviction.
 if(!world.saved[k])world.saved[k]=JSON.parse(JSON.stringify(d));
 d=world.saved[k];

 // Keep one terrain mesh per chunk for both LOD modes. This preserves
 // identical ground topology while avoiding two full terrain meshes per chunk.
 const ground=terrain(cx,cz,20);root.add(ground);
 for(const q of d.trees){
   let wx=cx*CH+q[0],wz=cz*CH+q[1];if(!inCityZone(wx,wz))near.add(makeTree(wx,wz,q[2],true));
 }
 addFarTrees(far,d,cx,cz);
 for(const q of d.rocks){let wx=cx*CH+q[0],wz=cz*CH+q[1];if(inCityZone(wx,wz))continue;let m=new T.Mesh(new T.DodecahedronGeometry(q[2],0),mats.rock);m.position.set(wx,H(wx,wz)+q[2]*0.55,wz);m.scale.y=0.7;m.castShadow=true;near.add(m)}
 if(d.mark){near.add(landmarkModel(cx,cz,d.mark));addTrail(near,cx,cz,d)}
 let anomaly=null;if(d.anomaly){anomaly=anomalyModel(d.anomaly,cx,cz);near.add(anomaly)}
 root.add(near,far);near.visible=false;far.visible=false;scene.add(root);
 let c={cx,cz,k,d,root,near,far,ground,mode:'none',agents:[],anomaly,lastUsed:performance.now()};
 chunks.set(k,c);return c;
}

function loadAnimals(c){
 if(c.agents.length)return;
 let saved=world.animalState[c.k]||[];
 c.d.animals.forEach((q,i)=>{
   let st=saved[i],x=st?st.x:c.cx*CH+q[0],z=st?st.z:c.cz*CH+q[1],dir=st?st.dir:hash(c.cx*9+i,c.cz*7-i,200)*Math.PI*2;
   let g=animalModel(q[2]);g.position.set(x,H(x,z),z);scene.add(g);
   let a={chunk:c.k,index:i,kind:q[2],group:g,x,z,homeX:c.cx*CH+q[0],homeZ:c.cz*CH+q[1],dir,target:dir,speed:q[2]==='fox'?1.35:q[2]==='wolf'?1.2:q[2]==='deer'?1.0:0.72,stateT:2+hash(c.cx+i,c.cz-i,201)*5,phase:hash(c.cx-i,c.cz+i,202)*6.28};
   c.agents.push(a);animalAgents.push(a);
 });
}
function unloadAnimals(c){
 if(!c.agents.length)return;
 world.animalState[c.k]=c.agents.map(a=>({x:+a.x.toFixed(2),z:+a.z.toFixed(2),dir:+a.dir.toFixed(3)}));
 for(const a of c.agents){scene.remove(a.group);let ix=animalAgents.indexOf(a);if(ix>=0)animalAgents.splice(ix,1)}
 c.agents.length=0;
}

function setMode(c,mode){
 c.lastUsed=performance.now();
 if(c.mode===mode)return;
 c.mode=mode;
 c.near.visible=mode==='near';c.far.visible=mode==='far';c.ground.visible=mode!=='none';
 c.ground.receiveShadow=mode==='near';
 if(mode==='near')loadAnimals(c);else unloadAnimals(c);
}

function rebuildColliders(nearSet){
 colliders.length=0;
 for(const k of nearSet){
   let c=chunks.get(k);if(!c)continue;
   for(const q of c.d.trees){let x=c.cx*CH+q[0],z=c.cz*CH+q[1];if(!inCityZone(x,z))colliders.push({x,z,r:0.58*q[2]})}
   for(const q of c.d.rocks){let x=c.cx*CH+q[0],z=c.cz*CH+q[1];if(!inCityZone(x,z))colliders.push({x,z,r:0.62*q[2]})}
   if(c.d.mark==='ring')for(let i=0;i<7;i++){let a=i/7*Math.PI*2;colliders.push({x:c.cx*CH+Math.cos(a)*5,z:c.cz*CH+Math.sin(a)*5,r:0.8})}
   if(c.d.mark==='tower')colliders.push({x:c.cx*CH,z:c.cz*CH,r:2.2});
   }
}
function colliderListBlocked(list,x,z,radius){
 for(const c of list){
   if(c.r!=null){let dx=x-c.x,dz=z-c.z,rr=c.r+radius;if(dx*dx+dz*dz<rr*rr)return true}
   else if(Math.abs(x-c.x)<c.hx+radius&&Math.abs(z-c.z)<c.hz+radius)return true
 }
 return false
}
function blocked(x,z,radius=0.6,ignoreVehicle=null){
 if(moonMode){
   if(colliderListBlocked(moonColliders,x,z,radius))return true
 }else{
   if(colliderListBlocked(colliders,x,z,radius)||colliderListBlocked(cityColliders,x,z,radius)||colliderListBlocked(startColliders,x,z,radius))return true
 }
 for(const v of vehicles){
   if(v===activeVehicle||v===ignoreVehicle)continue;
   if(moonMode?(v.realm!=='moon'):(v.realm==='moon'))continue;
   let dx=x-v.x,dz=z-v.z,rr=(v.kind==='mek'?2.7:v.kind==='jet'?3.2:v.kind==='heli'?2.4:1.5)+radius;
   if(dx*dx+dz*dz<rr*rr)return true
 }
 return false
}

function queueFar(cx,cz){
 let k=key(cx,cz);if(chunks.has(k)||farPending.has(k))return;
 farPending.add(k);farQueue.push({cx,cz,k,generation:syncGeneration});
}
let farBuildAt=0;
function processFarQueue(){
 const now=performance.now();if(now-farBuildAt<55||!farQueue.length)return;farBuildAt=now;
 let cc=chunkOf(player.x,player.z),job=farQueue.shift();farPending.delete(job.k);
 if(job.generation!==syncGeneration)return;
 if(chunks.has(job.k))return;
 let dx=Math.abs(job.cx-cc.cx),dz=Math.abs(job.cz-cc.cz),dist=Math.max(dx,dz);
 if(dist<=NEAR||dist>FAR)return;
 let c=createChunk(job.cx,job.cz);setMode(c,'far');
}
function sync(force=false){
 let cc=chunkOf(player.x,player.z);
 if(!force&&cc.cx===lastSyncX&&cc.cz===lastSyncZ)return;
 lastSyncX=cc.cx;lastSyncZ=cc.cz;
 syncGeneration++;
 farQueue.length=0;
 farPending.clear();
 let nearSet=new Set(),keepSet=new Set();

 for(let dz=-FAR;dz<=FAR;dz++)for(let dx=-FAR;dx<=FAR;dx++){
   let cx=cc.cx+dx,cz=cc.cz+dz,k=key(cx,cz),dist=Math.max(Math.abs(dx),Math.abs(dz));
   keepSet.add(k);
   if(dist<=NEAR){
     nearSet.add(k);let c=chunks.get(k)||createChunk(cx,cz);setMode(c,'near');
   }else{
     let c=chunks.get(k);if(c)setMode(c,'far');else queueFar(cx,cz);
   }
 }

 for(const [k,c] of chunks){
   let dx=Math.abs(c.cx-cc.cx),dz=Math.abs(c.cz-cc.cz);
   if(dx>CACHE||dz>CACHE){
     unloadAnimals(c);scene.remove(c.root);chunks.delete(k);
   }else if(!keepSet.has(k)){c.near.visible=false;c.far.visible=false;c.ground.visible=false;c.mode='none';unloadAnimals(c)}
 }
 rebuildColliders(nearSet);
 saveVisitedDescriptor(cc.cx,cc.cz);
 currentChunk=key(cc.cx,cc.cz);
 $('region').textContent=regionName(cc.cx,cc.cz)+' · '+cc.cx+', '+cc.cz;
 persist();
 if(!$('panel').classList.contains('hidden'))renderMap();
}

function updateAnimals(dt,t){
 for(const a of animalAgents){
   a.stateT-=dt;
   let pd=Math.hypot(player.x-a.x,player.z-a.z),mult=1,focus=null;
   if(pd<7){
     a.target=Math.atan2(a.x-player.x,a.z-player.z);a.stateT=2.4;mult=1.75;
   }else{
     if((a.kind==='wolf'||a.kind==='fox')){
       let best=18;
       for(const b of animalAgents){
         if(b===a||b.kind!=='deer')continue;
         let d=Math.hypot(b.x-a.x,b.z-a.z);
         if(d<best){best=d;focus=b}
       }
       if(focus){a.target=Math.atan2(focus.x-a.x,focus.z-a.z);mult=1.35}
     }else if(a.kind==='deer'){
       let sx=0,sz=0,n=0;
       for(const b of animalAgents){if(b!==a&&b.kind==='deer'&&Math.hypot(b.x-a.x,b.z-a.z)<13){sx+=b.x;sz+=b.z;n++}}
       if(n&&a.stateT<1.2)a.target=Math.atan2(sx/n-a.x,sz/n-a.z);
     }
     if(a.stateT<=0){
       if(Math.hypot(a.x-a.homeX,a.z-a.homeZ)>28)a.target=Math.atan2(a.homeX-a.x,a.homeZ-a.z);
       else a.target+=(Math.random()-0.5)*2.2;
       a.stateT=2.8+Math.random()*5.2;
     }
   }
   let dif=((a.target-a.dir+Math.PI*3)%(Math.PI*2))-Math.PI;
   a.dir+=T.MathUtils.clamp(dif,-dt*1.7,dt*1.7);
   let speed=a.speed*mult,nx=a.x+Math.sin(a.dir)*speed*dt,nz=a.z+Math.cos(a.dir)*speed*dt;
   let cc=chunkOf(nx,nz),hc=chunkOf(a.homeX,a.homeZ),rise=Math.abs(H(nx,nz)-H(a.x,a.z));
   if(!blocked(nx,nz,0.42)&&rise<0.95&&slopeAt(nx,nz)<2.2&&Math.abs(cc.cx-hc.cx)<=1&&Math.abs(cc.cz-hc.cz)<=1){
     a.x=nx;a.z=nz;
   }else a.target+=1.15+(Math.random()-0.5)*0.4;
   let y=H(a.x,a.z),sx=H(a.x+0.45,a.z)-H(a.x-0.45,a.z),sz=H(a.x,a.z+0.45)-H(a.x,a.z-0.45);
   a.group.position.set(a.x,y,a.z);a.group.rotation.y=a.dir;
   a.group.rotation.z=T.MathUtils.clamp(-sx*0.05,-0.12,0.12);a.group.rotation.x=T.MathUtils.clamp(sz*0.05,-0.12,0.12);
   let swing=Math.sin(t*6.4*Math.max(0.7,speed)+a.phase)*0.44*mult;
   a.group.userData.legs.forEach((l,i)=>l.rotation.x=i%2?swing:-swing);
   a.group.position.y+=Math.abs(Math.sin(t*6.4*Math.max(0.7,speed)+a.phase))*0.026;
 }
}

function updateAnomalies(dt,t){
 for(const c of chunks.values()){
   let g=c.anomaly;if(!g||c.mode!=='near')continue;
   if(g.userData.float){
     g.position.y=g.userData.baseY+Math.sin(t*0.9+g.userData.phase)*0.65;
     g.rotation.y+=dt*0.18;
   }else if(g.userData.walk){
     let u=g.userData,spd=u.giant?0.28:0.72;
     if(Math.random()<dt*0.18)u.dir+=(Math.random()-0.5)*0.7;
     let nx=g.position.x+Math.sin(u.dir)*spd*dt,nz=g.position.z+Math.cos(u.dir)*spd*dt;
     if(Math.hypot(nx-u.home.x,nz-u.home.z)>14)u.dir=Math.atan2(u.home.x-g.position.x,u.home.z-g.position.z);
     else if(Math.abs(H(nx,nz)-H(g.position.x,g.position.z))<1.2){g.position.x=nx;g.position.z=nz}
     g.position.y=H(g.position.x,g.position.z)+(u.giant?Math.abs(Math.sin(t*1.6+u.phase))*0.12:Math.abs(Math.sin(t*4+u.phase))*0.05);
     g.rotation.y=u.dir;
   }
 }
}

let move={x:0,y:0},look={x:0,y:0},sprinting=false,flightThrottle=0,lookSensitivity=T.MathUtils.clamp(world.ui.lookSensitivity||1,.55,1.8),sitting=null;
let worldCtl={weather:'clear',autoTime:true,time:12};
function bindPad(el,v){
 let id=null,start={x:0,y:0},stick=el.querySelector('i');
 function end(){id=null;v.x=0;v.y=0;stick.style.transform='translate(0,0)'}
 el.addEventListener('pointerdown',e=>{id=e.pointerId;start={x:e.clientX,y:e.clientY};el.setPointerCapture(id)});
 el.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;let x=e.clientX-start.x,y=e.clientY-start.y,d=Math.hypot(x,y),M=40;if(d>M){x*=M/d;y*=M/d}v.x=x/M;v.y=y/M;stick.style.transform='translate('+x+'px,'+y+'px)'});
 el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
}
bindPad($('move'),move);bindPad($('look'),look);

$('sprint').addEventListener('pointerdown',()=>{sprinting=true;$('sprint').classList.add('active')});
['pointerup','pointercancel','pointerleave'].forEach(ev=>$('sprint').addEventListener(ev,()=>{sprinting=false;$('sprint').classList.remove('active')}));
function nearestVehicle(){
 let best=null,bd=5;
 for(const v of vehicles){
   if(moonMode?(v.realm!=='moon'):(v.realm==='moon'))continue;
   let d=Math.hypot(player.x-v.x,player.z-v.z);
   if(d<bd){bd=d;best=v}
 }
 if(moonMode)return best;
 for(const c of chunks.values()){
   let g=c.anomaly;
   if(!g||c.mode!=='near'||c.d.anomaly!=='ufo'||g.userData.piloted)continue;
   let d=Math.hypot(player.x-g.position.x,player.z-g.position.z);
   if(d<bd){
     bd=d;
     best={type:'UFO',kind:'ufoCandidate',group:g,chunk:c,x:g.position.x,z:g.position.z,yaw:g.rotation.y||0}
   }
 }
 return best
}
function activateUfo(v){
 let g=v.group,c=v.chunk;
 if(c&&g.parent)c.near.remove(g);
 scene.add(g);
 if(c){c.anomaly=null;c.d.anomaly=null;world.saved[c.k]=JSON.parse(JSON.stringify(c.d));persist()}
 g.userData.float=false;
 g.userData.piloted=true;
 let craft={
   type:'UFO',
   kind:'ufo',
   group:g,
   x:g.position.x,
   z:g.position.z,
   yaw:g.rotation.y||0,
   speed:0,
   alt:Math.max(1.8,g.position.y-H(g.position.x,g.position.z)),
   worldY:g.position.y,
   vy:0,
   pitch:0,
   roll:0,
   inSpace:false
 };
 vehicles.push(craft);
 return craft
}
function findSafeExit(v){
 const baseR=v.kind==='mek'?5.2:v.kind==='jet'?5.0:v.kind==='heli'?4.2:v.kind==='ufo'?5.5:3.2;
 const angles=[Math.PI/2,-Math.PI/2,Math.PI,0,Math.PI*.25,-Math.PI*.25,Math.PI*.75,-Math.PI*.75];
 for(const mul of[1,1.45,2]){
   for(const a of angles){
     const ang=v.yaw+a,r=baseR*mul,
           x=v.x+Math.sin(ang)*r,
           z=v.z+Math.cos(ang)*r;
     if(!blocked(x,z,.6,v)&&Math.abs(H(x,z)-H(v.x,v.z))<1.6&&slopeAt(x,z)<2.5)return{x,z}
   }
 }
 return{x:v.x+Math.sin(v.yaw+Math.PI/2)*baseR*2.2,z:v.z+Math.cos(v.yaw+Math.PI/2)*baseR*2.2}
}
function nearestTownInteraction(){
 if(moonMode||activeVehicle)return null;
 let best=null,bd=3.1;
 for(const a of townInteractions){
   let d=Math.hypot(player.x-a.x,player.z-a.z);
   if(d<bd){bd=d;best=a}
 }
 return best
}
function refreshUse(){
 let b=$('use'),fc=$('flightControls'),mine=$('mine'),pickup=$('pickup'),town=$('townAction');
 if(activeVehicle){
   pickup.classList.add('hidden');town.classList.add('hidden');
   b.classList.remove('hidden');
   b.textContent='EXIT '+activeVehicle.type.toUpperCase();
   const flight=activeVehicle.kind==='heli'||activeVehicle.kind==='jet'||activeVehicle.kind==='ufo'||activeVehicle.kind==='mek';
   fc.classList.toggle('hidden',!flight);
   mine.classList.toggle('hidden',activeVehicle.kind!=='mek');
   $('sprint').classList.toggle('hidden',flight&&activeVehicle.kind!=='mek');
   $('sprint').textContent=activeVehicle.kind==='buggy'||activeVehicle.kind==='moonbuggy'||activeVehicle.kind==='mek'?'BOOST':'SPRINT';
   if(activeVehicle.kind==='mek')document.querySelector('.engineHead span').textContent='JET BOOST';
   else document.querySelector('.engineHead span').textContent='ENGINE';
   return
 }
 fc.classList.add('hidden');mine.classList.add('hidden');$('sprint').classList.remove('hidden');$('sprint').textContent='SPRINT';
 if(sitting){town.classList.remove('hidden');town.textContent='STAND UP'}else{
   let a=nearestTownInteraction();town.classList.toggle('hidden',!a);if(a)town.textContent=a.label;
 }
 let item=nearestCollectible();pickup.classList.toggle('hidden',!item);if(item)pickup.textContent='PICK UP '+item.name.toUpperCase();
 let v=nearestVehicle();
 if(v){b.classList.remove('hidden');b.textContent='ENTER '+v.type.toUpperCase()}
 else b.classList.add('hidden')
}
$('use').onclick=()=>{
 if(activeVehicle){
   let v=activeVehicle;
   if(v.kind==='ufo'&&v.alt>8){toast('Land the UFO before exiting');return}
   if(v.kind==='mek'&&v.alt>1.2){toast('Land the MEK before exiting');return}
   const exit=findSafeExit(v);
   activeVehicle=null;$('flightControls').classList.add('hidden');$('mine').classList.add('hidden');
   flightThrottle=0;move.x=0;move.y=0;look.x=0;look.y=0;
   player.x=exit.x;player.z=exit.z;player.yaw=v.yaw;
   camera.position.set(player.x,H(player.x,player.z)+1.7,player.z);
   toast('Exited '+v.type);refreshUse();return
 }
 let v=nearestVehicle();if(!v)return;
 if(v.kind==='ufoCandidate')v=activateUfo(v);
 activeVehicle=v;player.x=v.x;player.z=v.z;player.yaw=v.yaw;
 if(v.kind==='heli'||v.kind==='jet'||v.kind==='ufo'||v.kind==='mek'){
   $('flightControls').classList.remove('hidden');
   if(v.kind==='mek')flightThrottle=0;
   syncEngineUI();
 }else $('flightControls').classList.add('hidden');
 toast(v.type+' controls active');refreshUse();
};
$('engineSlider').addEventListener('input',e=>{
 flightThrottle=T.MathUtils.clamp(+e.target.value/100,0,1);
 $('engineValue').textContent=Math.round(flightThrottle*100)+'%';
});
function syncEngineUI(){
 $('engineSlider').value=Math.round(flightThrottle*100);
 $('engineValue').textContent=Math.round(flightThrottle*100)+'%';
}
function inventoryCounts(){
 const out={};
 for(const [k,v] of Object.entries(world.inventory||{})){
   if(!v)continue;
   const name=k.startsWith('sample:')?(typeof v==='string'?v:'Lunar Sample'):k==='Lunar Ore'?'Lunar Ore':k;
   out[name]=(out[name]||0)+(typeof v==='number'?v:1)
 }
 if(world.moonOre)out['Lunar Ore']=Math.max(out['Lunar Ore']||0,world.moonOre);
 return out
}
function renderInventory(){
 const list=$('inventoryList'),items=inventoryCounts();list.innerHTML='';
 const keys=Object.keys(items);
 if(!keys.length){list.innerHTML='<div class="invRow"><span>Empty</span><b>0</b></div>';return}
 for(const k of keys){const row=document.createElement('div');row.className='invRow';row.innerHTML='<span>'+k+'</span><b>'+items[k]+'</b>';list.appendChild(row)}
}
function closeSidePanels(except=null){
 for(const id of['inventoryPanel','craftPanel','shopPanel','worldPanel'])if(id!==except)$(id).classList.add('hidden')
}
$('inventoryBtn').onclick=()=>{const p=$('inventoryPanel'),open=p.classList.contains('hidden');closeSidePanels(open?'inventoryPanel':null);p.classList.toggle('hidden',!open);if(open)renderInventory()};
$('inventoryClose').onclick=()=>$('inventoryPanel').classList.add('hidden');

const craftRecipes=[
 {name:'Lunar Alloy Plate',needs:{'Lunar Ore':3},out:'Lunar Alloy Plate'},
 {name:'Impact Lens',needs:{'Impact Glass':1,'Regolith Sample':1},out:'Impact Lens'},
 {name:'Field Repair Kit',needs:{'Lunar Rock':1,'Regolith Sample':1},out:'Field Repair Kit'}
];
function inventoryQty(name){return inventoryCounts()[name]||0}
function consumeItem(name,count){
 if(name==='Lunar Ore'){
   world.moonOre=Math.max(0,(world.moonOre||0)-count);
   world.inventory['Lunar Ore']=world.moonOre;
   return
 }
 for(const [k,v] of Object.entries(world.inventory)){
   if(count<=0)break;
   const n=k.startsWith('sample:')?(typeof v==='string'?v:'Lunar Sample'):k;
   if(n!==name||!v)continue;
   if(typeof v==='number'){
     const take=Math.min(count,v),left=v-take;count-=take;
     if(left>0)world.inventory[k]=left;else delete world.inventory[k]
   }else{delete world.inventory[k];count--}
 }
}
function renderCrafting(){
 const list=$('craftList');list.innerHTML='';
 for(const r of craftRecipes){
   const ok=Object.entries(r.needs).every(([n,q])=>inventoryQty(n)>=q);
   const row=document.createElement('div');row.className='craftRow';
   const need=Object.entries(r.needs).map(([n,q])=>q+'× '+n).join(' + ');
   row.innerHTML='<div><strong>'+r.name+'</strong><small>'+need+'</small></div>';
   const b=document.createElement('button');b.textContent='CRAFT';b.disabled=!ok;
   b.onclick=()=>{
     if(!Object.entries(r.needs).every(([n,q])=>inventoryQty(n)>=q)){toast('Missing materials');renderCrafting();return}
     for(const [n,q] of Object.entries(r.needs))consumeItem(n,q);
     world.inventory[r.out]=(world.inventory[r.out]||0)+1;
     persist();renderInventory();renderCrafting();toast(r.name+' crafted')
   };
   row.appendChild(b);list.appendChild(row)
 }
}
$('craftBtn').onclick=()=>{const p=$('craftPanel'),open=p.classList.contains('hidden');closeSidePanels(open?'craftPanel':null);p.classList.toggle('hidden',!open);if(open)renderCrafting()};
$('craftClose').onclick=()=>$('craftPanel').classList.add('hidden');

const shopBuy=[
 {name:'Field Flashlight',price:35,desc:'Portable exploration light'},
 {name:'Heavy Pickaxe',price:60,desc:'Mining and field tool'},
 {name:'Geology Scanner',price:90,desc:'Survey equipment'},
 {name:'Repair Kit',price:45,desc:'Vehicle repair equipment'},
 {name:'Trail Rations',price:12,desc:'Emergency supplies'}
];
const sellPrices={'Lunar Ore':18,'Lunar Rock':8,'Regolith Sample':12,'Impact Glass':30,'Lunar Alloy Plate':42,'Impact Lens':55};
let shopMode='buy';
function addInventoryItem(name,count=1){world.inventory[name]=(Number(world.inventory[name])||0)+count}
function renderShop(){
 $('creditsReadout').textContent=Math.floor(world.credits)+' credits';
 $('shopBuyTab').classList.toggle('active',shopMode==='buy');$('shopSellTab').classList.toggle('active',shopMode==='sell');
 const list=$('shopList');list.innerHTML='';
 if(shopMode==='buy'){
   for(const it of shopBuy){
     const row=document.createElement('div');row.className='shopRow';row.innerHTML='<div><strong>'+it.name+'</strong><small>'+it.desc+' • '+it.price+' credits</small></div>';
     const b=document.createElement('button');b.textContent='BUY';b.disabled=world.credits<it.price;
     b.onclick=()=>{if(world.credits<it.price)return;world.credits-=it.price;addInventoryItem(it.name,1);persist();renderInventory();renderShop();toast(it.name+' purchased')};
     row.appendChild(b);list.appendChild(row)
   }
 }else{
   const inv=inventoryCounts(),names=Object.keys(inv).filter(n=>sellPrices[n]&&inv[n]>0);
   if(!names.length){list.innerHTML='<div class="shopRow"><div><strong>Nothing to sell</strong><small>Bring resources and crafted goods.</small></div></div>';return}
   for(const name of names){
     const price=sellPrices[name],row=document.createElement('div');row.className='shopRow';
     row.innerHTML='<div><strong>'+name+'</strong><small>'+inv[name]+' owned • '+price+' credits each</small></div>';
     const b=document.createElement('button');b.textContent='SELL 1';
     b.onclick=()=>{if(inventoryQty(name)<1)return;consumeItem(name,1);world.credits+=price;persist();renderInventory();renderShop();toast(name+' sold for '+price+' credits')};
     row.appendChild(b);list.appendChild(row)
   }
 }
}
function openShop(){closeSidePanels('shopPanel');$('shopPanel').classList.remove('hidden');renderShop()}
$('shopClose').onclick=()=>$('shopPanel').classList.add('hidden');
$('shopBuyTab').onclick=()=>{shopMode='buy';renderShop()};
$('shopSellTab').onclick=()=>{shopMode='sell';renderShop()};
$('townAction').onclick=()=>{
 if(sitting){sitting=null;toast('Stood up');return}
 const a=nearestTownInteraction();if(!a)return;
 if(a.type==='shop'){openShop();toast('Westside Supply opened')}
 else if(a.type==='bench'){
   sitting={x:a.x,z:a.z,yaw:a.yaw||0};
   move.x=move.y=0;look.x=look.y=0;
   player.x=a.x+Math.sin(a.yaw||0)*.72;player.z=a.z+Math.cos(a.yaw||0)*.72;player.yaw=(a.yaw||0)+Math.PI;
   toast('Sitting on bench')
 }else if(a.type==='arcade'){
   world.arcadeScores=world.arcadeScores||{};
   const score=1200+Math.floor((Math.sin(performance.now()*.013+a.x)*.5+.5)*8800);
   world.arcadeScores[a.game]=Math.max(world.arcadeScores[a.game]||0,score);persist();
   toast(a.game+' • SCORE '+score)
 }
};

function nearestCollectible(){
 if(!moonMode||activeVehicle)return null;
 let best=null,bd=3.2;
 for(const c of moonCollectibles){
   if(!c.mesh.visible)continue;
   let d=Math.hypot(player.x-c.x,player.z-c.z);
   if(d<bd){bd=d;best=c}
 }
 return best
}
$('pickup').onclick=()=>{
 const c=nearestCollectible();if(!c)return;
 c.mesh.visible=false;world.inventory[c.id]=c.name;persist();renderInventory();toast(c.name+' added to inventory')
};
$('mine').onclick=()=>{
 if(!activeVehicle||activeVehicle.kind!=='mek')return;
 let best=null,bd=10;
 for(const r of moonMineables){
   if(!r.mesh.visible)continue;
   let d=Math.hypot(activeVehicle.x-r.x,activeVehicle.z-r.z);
   if(d<bd){bd=d;best=r}
 }
 if(!best){toast('No mineral deposit in drilling range');return}
 best.mesh.visible=false;
 world.moonMined[best.id]=1;
 world.moonOre=(world.moonOre||0)+1;
 world.inventory['Lunar Ore']=world.moonOre;
 persist();renderInventory();
 toast('Lunar ore extracted • '+world.moonOre+' stored');
}
$('worldctl').onclick=()=>{const p=$('worldPanel'),open=p.classList.contains('hidden');closeSidePanels(open?'worldPanel':null);p.classList.toggle('hidden',!open)};
$('worldClose').onclick=()=>$('worldPanel').classList.add('hidden');
$('lookSensitivity').value=lookSensitivity;
$('hudScale').value=world.ui.hudScale||1;
document.documentElement.style.setProperty('--hud-scale',world.ui.hudScale||1);
$('lookSensitivity').addEventListener('input',e=>{lookSensitivity=+e.target.value;world.ui.lookSensitivity=lookSensitivity;persist()});
$('hudScale').addEventListener('input',e=>{world.ui.hudScale=+e.target.value;document.documentElement.style.setProperty('--hud-scale',world.ui.hudScale);persist()});
$('timeSlider').addEventListener('input',e=>{worldCtl.time=+e.target.value;worldCtl.autoTime=false;$('autoTime').textContent='AUTO TIME: OFF'});
$('autoTime').onclick=()=>{worldCtl.autoTime=!worldCtl.autoTime;$('autoTime').textContent='AUTO TIME: '+(worldCtl.autoTime?'ON':'OFF')};
document.querySelectorAll('.weatherButtons button').forEach(b=>b.onclick=()=>{worldCtl.weather=b.dataset.weather;document.querySelectorAll('.weatherButtons button').forEach(x=>x.classList.toggle('active',x===b))});

function openMap(){
 if(moonMode){toast('Earth map unavailable on the Moon');return}
 let c=chunkOf(player.x,player.z);mapView={cx:c.cx,cz:c.cz};mapSelected=null;$('panel').classList.remove('hidden');renderMap();
}
$('map').onclick=openMap;
$('close').onclick=()=>$('panel').classList.add('hidden');
$('mapN').onclick=()=>{mapView.cz-=4;renderMap()};
$('mapS').onclick=()=>{mapView.cz+=4;renderMap()};
$('mapW').onclick=()=>{mapView.cx-=4;renderMap()};
$('mapE').onclick=()=>{mapView.cx+=4;renderMap()};
$('mapHome').onclick=()=>{let c=chunkOf(player.x,player.z);mapView={cx:c.cx,cz:c.cz};mapSelected=null;renderMap()};

function renderMap(){
 let grid=$('mapgrid');grid.innerHTML='';
 let pc=chunkOf(player.x,player.z);
 for(let z=mapView.cz-6;z<=mapView.cz+6;z++)for(let x=mapView.cx-6;x<=mapView.cx+6;x++){
   let k=key(x,z),isExplored=!!world.explored[k],d=world.saved[k],b=document.createElement('button');
   b.className='cell '+(isExplored?'explored':'unexplored');
   let mb=biome(x*CH,z*CH),mh=H(x*CH,z*CH),mc={alpine:'#87908c',highland:'#68735f',pine:'#355946',forest:'#456b48',meadow:'#78945e',woodland:'#5f7a56'}[mb];b.style.background=mc;b.style.filter=isExplored?'none':'brightness(.38) saturate(.65)';b.style.boxShadow='inset 0 '+Math.round(T.MathUtils.clamp(mh,-8,28)/6)+'px 0 #ffffff0b';
   if(x===pc.cx&&z===pc.cz)b.classList.add('current');
   if(mapSelected&&x===mapSelected.cx&&z===mapSelected.cz)b.classList.add('selected');
   if(d&&d.mark)b.classList.add('landmark');
   if(d&&d.anomaly)b.classList.add('anomaly');
   if(x===0&&z===0)b.classList.add('airfield');
   b.title=regionName(x,z)+' · '+x+', '+z;
   b.disabled=!isExplored;
   if(isExplored)b.onclick=()=>{mapSelected={cx:x,cz:z};renderMap()};
   grid.appendChild(b);
 }
 if(mapSelected){
   let k=key(mapSelected.cx,mapSelected.cz),d=world.saved[k],label=regionName(mapSelected.cx,mapSelected.cz)+' · '+mapSelected.cx+', '+mapSelected.cz+' • '+biome(mapSelected.cx*CH,mapSelected.cz*CH);
   if(mapSelected.cx===0&&mapSelected.cz===0)label+=' • Airfield';
   if(d&&d.mark)label+=' • '+(d.mark==='ring'?'Stone Ring':'Lookout Tower');
   if(d&&d.anomaly)label+=' • Unexplained signal';
   $('mapInfo').textContent=label;$('travel').disabled=false;
 }else{$('mapInfo').textContent='No region selected';$('travel').disabled=true}
}
$('travel').onclick=()=>{
 if(!mapSelected)return;
 activeVehicle=null;refreshUse();player.x=mapSelected.cx*CH;player.z=mapSelected.cz*CH;player.yaw=0;
 $('panel').classList.add('hidden');lastSyncX=1e9;lastSyncZ=1e9;sync(true);
 if(blocked(player.x,player.z)){outer:for(let r=3;r<=18;r+=3)for(let i=0;i<16;i++){let a=i/16*Math.PI*2,x=mapSelected.cx*CH+Math.cos(a)*r,z=mapSelected.cz*CH+Math.sin(a)*r;if(!blocked(x,z)&&Math.abs(H(x,z)-H(player.x,player.z))<3){player.x=x;player.z=z;break outer}}}
 camera.position.set(player.x,H(player.x,player.z)+1.7,player.z);persist();toast('Fast travel complete');
};

let toastTimer;
function toast(s){let e=$('toast');e.textContent=s;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),1600)}

function enterMoon(v){
 moonMode=true;
 moonGroup.visible=true;
 v.realm='moon';
 v.x=0;v.z=-145;v.worldY=moonH(v.x,v.z)+92;v.alt=92;v.vy=-4;v.speed=Math.min(v.speed||0,28);v.yaw=0;v.pitch=0;v.roll=0;
 v.group.position.set(v.x,v.worldY,v.z);
 player.x=v.x;player.z=v.z;player.yaw=v.yaw;
 $('region').textContent='LUNAR OUTPOST';
 toast('Lunar approach • follow the cyan beacon');
}
function leaveMoon(v){
 moonMode=false;
 moonGroup.visible=false;
 v.realm=null;
 v.x=SPACE_MOON.x;v.z=SPACE_MOON.z-245;v.worldY=SPACE_MOON.y+125;v.alt=Math.max(180,v.worldY-earthH(v.x,v.z));v.vy=12;v.speed=Math.max(v.speed||0,55);v.yaw=Math.PI;
 v.group.position.set(v.x,v.worldY,v.z);
 player.x=v.x;player.z=v.z;player.yaw=v.yaw;
 lastSyncX=1e9;lastSyncZ=1e9;
 toast('Leaving lunar gravity');
}

let skyUiAt=0;
function updateSky(time,dt=0.016){
 let hour=worldCtl.autoTime?((time/480)*24)%24:worldCtl.time,cycle=hour/24,a=cycle*Math.PI*2-Math.PI/2,sy=Math.sin(a),day=T.MathUtils.clamp((sy+0.18)*2.3,0,1),w=worldCtl.weather;
 const now=performance.now(),updateUi=now-skyUiAt>180;if(updateUi)skyUiAt=now;
 if(worldCtl.autoTime){worldCtl.time=hour;if(updateUi)$('timeSlider').value=hour.toFixed(2)}
 if(updateUi)$('timeReadout').textContent=String(Math.floor(hour)).padStart(2,'0')+':'+String(Math.floor((hour%1)*60)).padStart(2,'0');
 sun.position.set(player.x+Math.cos(a)*95,Math.max(6,sy*110),player.z+40);sun.intensity=(0.05+day*2.25)*(w==='storm'?0.42:w==='rain'?0.62:w==='cloudy'?0.78:1);hemi.intensity=(0.18+day*0.95)*(w==='storm'?0.55:w==='rain'?0.72:w==='cloudy'?0.82:1);
 let ufoAlt=activeVehicle&&activeVehicle.kind==='ufo'?activeVehicle.alt:0,
     spaceFactor=moonMode?1:T.MathUtils.clamp((ufoAlt-110)/170,0,1),
     dayCol=new T.Color(w==='storm'?0x48545b:w==='rain'?0x6f8088:w==='cloudy'?0x8fa2a4:0xa7c0bd),
     nightCol=new T.Color(0x06101a),
     c=moonMode?new T.Color(0x000005):nightCol.clone().lerp(dayCol,day).lerp(new T.Color(0x000106),spaceFactor);
 scene.background.copy(c);scene.fog.color.copy(c);

 let normalFog=w==='mist'?0.018:w==='storm'?0.012:w==='rain'?0.009:w==='cloudy'?0.0068:0.0048;
 scene.fog.density=moonMode?0.00012:normalFog*(1-spaceFactor);

 let skyY=activeVehicle&&activeVehicle.kind==='ufo'?activeVehicle.worldY:(moonMode?camera.position.y:0);
 stars.position.set(player.x,skyY,player.z);
 stars.material.opacity=moonMode?1:Math.max((1-day)*(w==='clear'?1:0.35),spaceFactor);

 let wet=!moonMode&&(w==='rain'||w==='storm')&&spaceFactor<0.45;
 rain.material.opacity=wet?(w==='storm'?0.82:0.55):0;
 rain.position.set(player.x,0,player.z);
 if(wet){for(let i=0;i<rainCount;i++){rainPos[i*3+1]-=dt*(w==='storm'?28:20);if(rainPos[i*3+1]<0)rainPos[i*3+1]=42}rainGeo.attributes.position.needsUpdate=true}

 cloudGroup.visible=!moonMode&&spaceFactor<0.72;
 cloudGroup.children.forEach((g,i)=>{let u=g.userData;u.a+=dt*(w==='storm'?0.09:0.035);g.position.set(player.x+Math.cos(u.a)*u.r,u.h,player.z+Math.sin(u.a)*u.r);g.children.forEach(m=>m.material.opacity=w==='clear'?0.1:w==='cloudy'?0.38:w==='rain'?0.52:w==='storm'?0.68:0.22)});

 spacePlanet.visible=!moonMode&&spaceFactor>0.18;
 celestialMoon.visible=!moonMode&&spaceFactor>0.55;
 spaceSun.visible=moonMode||spaceFactor>0.45;
 if(spaceSun.visible){
   let baseY=activeVehicle&&activeVehicle.kind==='ufo'?activeVehicle.worldY:(moonMode?camera.position.y:0);
   spaceSun.position.set(player.x+5200,baseY+1700,player.z-4100);
 }
 startBase.visible=!moonMode&&spaceFactor<0.88;
 cityGroup.visible=!moonMode&&spaceFactor<0.88;
 moonGroup.visible=moonMode;
 for(const ch of chunks.values())ch.root.visible=!moonMode&&spaceFactor<0.88;
 for(const craft of vehicles){
   if(craft===activeVehicle)continue;
   craft.group.visible=moonMode?(craft.realm==='moon'):(craft.realm!=='moon'&&spaceFactor<0.88);
 }
 if(activeVehicle)activeVehicle.group.visible=true;
 if(spacePlanet.visible){
   spacePlanet.position.set(player.x,-2200,player.z);
   atmosphere.material.opacity=0.13*spaceFactor;
   sun.intensity=Math.max(sun.intensity,0.18+spaceFactor*0.55);
 }
 for(const l of flashingRunwayLights){const pulse=.28+.72*(.5+.5*Math.sin(time*5.2-l.phase));l.mesh.material.opacity=pulse;l.mesh.scale.setScalar(.85+pulse*.5)}
 updateManagedLights(day);
 if(updateUi)document.querySelectorAll('.weatherButtons button').forEach(b=>b.classList.toggle('active',b.dataset.weather===w));
}

let hudUpdateAt=0,aiAccumulator=0;const cameraLerpTarget=new T.Vector3();
function step(dt,t){
 const lx=look.x*lookSensitivity,ly=look.y*lookSensitivity;
 player.pitch=T.MathUtils.clamp(player.pitch-ly*dt*1.65,-1.02,0.92);

 if(activeVehicle){
   let v=activeVehicle,f=-move.y,side=move.x;
   if(v.kind==='buggy'||v.kind==='moonbuggy'){
     v.yaw-=lx*dt*1.65;v.yaw+=side*dt*1.25*(0.35+Math.abs(f));
     let top=v.kind==='moonbuggy'?(sprinting?17:11):(sprinting?12:7.5),
         target=f*top;
     v.speed=T.MathUtils.lerp(v.speed,target,Math.min(1,dt*3.2));
     let nx=v.x+Math.sin(v.yaw)*v.speed*dt,nz=v.z+Math.cos(v.yaw)*v.speed*dt;
     if(!blocked(nx,nz,1.0)&&Math.abs(H(nx,nz)-H(v.x,v.z))<1.15&&slopeAt(nx,nz)<2.5){v.x=nx;v.z=nz}else v.speed*=0.25;
     v.alt=0;v.group.position.set(v.x,H(v.x,v.z),v.z);v.group.rotation.y=v.yaw;
   }else if(v.kind==='mek'){
     v.yaw+=side*dt*1.05;
     let target=f*(sprinting?9:5.5);
     v.speed=T.MathUtils.lerp(v.speed,target,Math.min(1,dt*3));
     let nx=v.x+Math.sin(v.yaw)*v.speed*dt,nz=v.z+Math.cos(v.yaw)*v.speed*dt;
     if(v.alt>0.3||(!blocked(nx,nz,2.1)&&Math.abs(H(nx,nz)-H(v.x,v.z))<1.6)){v.x=nx;v.z=nz}else v.speed*=0.2;

     let thrust=flightThrottle*15.5,gravity=5.2;
     v.vy+=(thrust-gravity-v.vy*.5)*dt;
     if(flightThrottle<0.03)v.vy-=gravity*.45*dt;
     v.alt=Math.max(0,Math.min(42,v.alt+v.vy*dt));
     if(v.alt<=0){v.alt=0;v.vy=Math.max(0,v.vy)}
     v.pitch=T.MathUtils.lerp(v.pitch,-f*.08,Math.min(1,dt*3));
     v.roll=T.MathUtils.lerp(v.roll,-side*.08,Math.min(1,dt*3));
     v.group.position.set(v.x,H(v.x,v.z)+v.alt,v.z);
     v.group.rotation.set(v.pitch,v.yaw,v.roll,'XYZ');
   }else if(v.kind==='heli'){
     let pitchInput=-move.y,rollInput=move.x;
     v.yaw+=(-v.roll)*dt*0.9;
     v.yaw-=lx*dt*0.55;

     let targetPitch=pitchInput*0.24,
         targetRoll=-rollInput*0.32;
     v.pitch=T.MathUtils.lerp(v.pitch,targetPitch,Math.min(1,dt*3.4));
     v.roll=T.MathUtils.lerp(v.roll,targetRoll,Math.min(1,dt*3.6));

     let collective=(flightThrottle-0.5)*2,
         lift=collective*8.5;
     v.vy+=(lift-v.vy*1.45)*dt;
     if(flightThrottle<0.03&&v.alt<0.1)v.vy=0;

     let drive=Math.max(0.15,flightThrottle)*18,
         fw=Math.sin(v.pitch)*drive,
         strafe=-Math.sin(v.roll)*drive;
     if(v.alt>0.12||flightThrottle>0.52){
       v.x+=(Math.sin(v.yaw)*fw+Math.cos(v.yaw)*strafe)*dt;
       v.z+=(Math.cos(v.yaw)*fw-Math.sin(v.yaw)*strafe)*dt;
     }

     v.alt=T.MathUtils.clamp(v.alt+v.vy*dt,0,55);
     if(v.alt<=0.02){v.alt=0;v.vy=Math.max(0,v.vy)}
     v.group.position.set(v.x,H(v.x,v.z)+v.alt,v.z);
     v.group.rotation.set(v.pitch,v.yaw,v.roll,'XYZ');

     let rotor=v.group.getObjectByName('rotor');
     if(rotor)rotor.rotation.y+=dt*(10+flightThrottle*30);
   }else if(v.kind==='ufo'){
     let ground=H(v.x,v.z)+1.8;
     if(v.worldY==null)v.worldY=ground+Math.max(0,v.alt||0);
     let space=v.worldY-H(v.x,v.z)>160;
     v.inSpace=space;

     let pitchInput=move.y,
         rollInput=move.x,
         targetPitch=pitchInput*(space?0.52:0.38),
         targetRoll=-rollInput*(space?0.58:0.42);
     v.pitch=T.MathUtils.lerp(v.pitch,targetPitch,Math.min(1,dt*3.2));
     v.roll=T.MathUtils.lerp(v.roll,targetRoll,Math.min(1,dt*3.4));
     v.yaw+=(-v.roll)*dt*(space?1.25:0.8);

     let maxSpeed=space?170:48,
         targetSpeed=flightThrottle*maxSpeed;
     v.speed=T.MathUtils.lerp(v.speed,targetSpeed,Math.min(1,dt*(space?1.35:2.1)));

     let horizontal=Math.cos(v.pitch)*v.speed;
     v.x+=Math.sin(v.yaw)*horizontal*dt;
     v.z+=Math.cos(v.yaw)*horizontal*dt;

     let collective=(flightThrottle-0.5)*2,
         directedLift=Math.sin(v.pitch)*v.speed*(space?1.0:0.7),
         liftAccel=space?70:26;
     v.vy+=(collective*liftAccel+directedLift-v.vy*(space?0.28:0.8))*dt;

     v.worldY+=v.vy*dt;
     ground=H(v.x,v.z)+1.8;
     if(v.worldY<ground){v.worldY=ground;v.vy=Math.max(0,v.vy)}
     v.worldY=Math.min(v.worldY,3400);
     v.alt=Math.max(0,v.worldY-H(v.x,v.z));

     v.group.position.set(v.x,v.worldY,v.z);
     v.group.rotation.set(v.pitch,v.yaw,v.roll,'XYZ');

     if(moonMode&&v.alt>235){
       leaveMoon(v);
     }else if(!moonMode&&v.inSpace){
       let md=Math.hypot(v.x-SPACE_MOON.x,v.worldY-SPACE_MOON.y,v.z-SPACE_MOON.z);
       if(md<245)enterMoon(v);
     }
   }else{
     let onGround=v.alt<0.12,
         pitchInput=move.y,
         rollInput=move.x,
         targetPitch=pitchInput*0.42,
         targetRoll=-rollInput*0.58;

     if(onGround){
       targetPitch=Math.max(-0.08,targetPitch);
       v.roll=T.MathUtils.lerp(v.roll,targetRoll*0.35,Math.min(1,dt*3.2));
       v.yaw+=rollInput*dt*0.52;
     }else{
       v.roll=T.MathUtils.lerp(v.roll,targetRoll,Math.min(1,dt*3.0));
       v.yaw+=(-v.roll)*dt*(0.78+Math.min(0.5,v.speed/45));
     }
     v.pitch=T.MathUtils.lerp(v.pitch,targetPitch,Math.min(1,dt*2.8));

     let maxSpeed=38,
         idle=onGround?0:5.5,
         targetSpeed=idle+flightThrottle*(maxSpeed-idle);
     v.speed=T.MathUtils.lerp(v.speed,targetSpeed,Math.min(1,dt*(onGround?1.6:0.8)));

     let stallSpeed=8.2;
     v.stalled=v.alt>0.6&&v.speed<stallSpeed;
     if(v.stalled){
       v.pitch=T.MathUtils.lerp(v.pitch,-0.18,Math.min(1,dt*0.85));
       v.vy=Math.max(v.vy-dt*6.2,-8.5);
     }else if(v.speed>=stallSpeed){
       let desiredVy=Math.sin(v.pitch)*v.speed*0.98;
       v.vy=T.MathUtils.lerp(v.vy,desiredVy,Math.min(1,dt*2.0));
     }else if(onGround){
       v.vy=0;
     }

     let horizontal=Math.cos(v.pitch)*v.speed,
         nx=v.x+Math.sin(v.yaw)*horizontal*dt,
         nz=v.z+Math.cos(v.yaw)*horizontal*dt;
     if(v.alt>0.2||(!blocked(nx,nz,2.0)&&Math.abs(H(nx,nz)-H(v.x,v.z))<1.0)){
       v.x=nx;v.z=nz
     }else v.speed*=0.35;

     if(v.alt<=0.15&&v.speed>stallSpeed&&v.pitch>0.075){
       v.airborne=true;v.alt=0.16
     }
     if(v.airborne||v.alt>0.15)v.alt+=v.vy*dt;

     if(v.alt<=0){
       let hard=v.vy<-4.2;
       v.alt=0;v.vy=0;v.airborne=false;v.stalled=false;
       if(hard){v.speed*=0.42;toast('Hard landing')}
       v.pitch=T.MathUtils.lerp(v.pitch,0,Math.min(1,dt*3));
       v.roll=T.MathUtils.lerp(v.roll,0,Math.min(1,dt*3));
     }else v.airborne=true;

     v.alt=T.MathUtils.clamp(v.alt,0,95);
     v.group.position.set(v.x,H(v.x,v.z)+v.alt,v.z);
     // Three.js X rotation is opposite to the visual aircraft convention used by this jet model.
     // Keep physics pitch positive for climb, but invert only the rendered jet attitude so climbing lifts the nose.
     v.group.rotation.set(-v.pitch,v.yaw,v.roll,'XYZ');
   }
   player.x=v.x;player.z=v.z;player.yaw=v.yaw;
   let h=v.kind==='ufo'?v.worldY:H(v.x,v.z)+(v.alt||0),
       back=v.kind==='ufo'?11:v.kind==='mek'?11:v.kind==='jet'?9:v.kind==='heli'?7:v.kind==='moonbuggy'?6.5:5.5,
       up=v.kind==='ufo'?5:v.kind==='mek'?6:v.kind==='jet'?3.3:v.kind==='heli'?3.2:2.5,
       camYaw=v.yaw-lx*0.9,
       camLift=ly*4.2;
   cameraLerpTarget.set(v.x-Math.sin(camYaw)*back,h+up+camLift,v.z-Math.cos(camYaw)*back);
   camera.position.lerp(cameraLerpTarget,0.16);
   camera.lookAt(v.x,h+1.1-ly*1.5,v.z);
 }else{
   player.yaw-=lx*dt*2.45;
   if(!sitting){
     let f=move.y,side=move.x,s=(sprinting?8:4.5)*dt,dx=(Math.sin(player.yaw)*f+Math.cos(player.yaw)*side)*s,dz=(Math.cos(player.yaw)*f-Math.sin(player.yaw)*side)*s,nx=player.x+dx,nz=player.z+dz;
     let dh=Math.abs(H(nx,nz)-H(player.x,player.z));
     if(!blocked(nx,nz)&&dh<1.05&&slopeAt(nx,nz)<2.35){player.x=nx;player.z=nz}
     cameraLerpTarget.set(player.x,H(player.x,player.z)+1.7,player.z)
   }else cameraLerpTarget.set(player.x,H(player.x,player.z)+1.18,player.z);
   camera.position.lerp(cameraLerpTarget,0.24);camera.rotation.set(player.pitch,player.yaw,0);
 }

 let cc=chunkOf(player.x,player.z);
 if(!moonMode&&!(activeVehicle&&activeVehicle.kind==='ufo'&&activeVehicle.alt>180)&&key(cc.cx,cc.cz)!==currentChunk)sync();

 // Wildlife/anomaly simulation does not need display-frame frequency.
 aiAccumulator+=dt;
 if(aiAccumulator>=0.033){
   const simDt=Math.min(aiAccumulator,.066);aiAccumulator=0;
   if(!moonMode){updateAnimals(simDt,t);updateAnomalies(simDt,t)}
 }

 // HUD/context checks are intentionally throttled; movement/camera remain full-rate.
 const now=performance.now();
 if(now-hudUpdateAt>100){
   hudUpdateAt=now;
   let deg=((player.yaw*180/Math.PI)%360+360)%360,names=['N','NE','E','SE','S','SW','W','NW'];
   $('compass').textContent=names[Math.round(deg/45)%8];
   let vehicleHud='';
   if(activeVehicle){
     const kmh=Math.round(Math.abs(activeVehicle.speed||0)*3.6);
     vehicleHud=activeVehicle.type+' • '+kmh+' km/h';
     if(activeVehicle.kind!=='buggy'&&activeVehicle.kind!=='moonbuggy'){
       vehicleHud+=' • '+Math.round(activeVehicle.alt)+'m';
       if(activeVehicle.kind==='ufo'&&activeVehicle.alt>160)vehicleHud+=' • SPACE';
       if(activeVehicle.stalled)vehicleHud+=' • STALL';
     }
     $('modeReadout').textContent=activeVehicle.kind==='jet'||activeVehicle.kind==='heli'||activeVehicle.kind==='ufo'?'FLIGHT':activeVehicle.kind==='mek'?'MEK':'DRIVING';
     $('vehicleCard').classList.remove('hidden');$('vehicleName').textContent=activeVehicle.type.toUpperCase();$('vehicleSpeed').textContent=kmh+' km/h';
     vehicleHud+=' • '
   }else{
     $('modeReadout').textContent=moonMode?'MOON EVA':'ON FOOT';
     $('vehicleCard').classList.add('hidden')
   }
   if(activeVehicle&&activeVehicle.kind==='ufo'&&!moonMode&&activeVehicle.inSpace){let md=Math.hypot(activeVehicle.x-SPACE_MOON.x,activeVehicle.worldY-SPACE_MOON.y,activeVehicle.z-SPACE_MOON.z);vehicleHud+='MOON '+Math.round(md)+'m • '}
   $('stats').textContent=vehicleHud+(moonMode?'LUNAR SURFACE • '+(world.moonOre||0)+' ore':biome(player.x,player.z)+' • '+Object.keys(world.explored).length+' visited • '+animalAgents.length+' wildlife');
   refreshUse();
   for(const c of chunks.values())if(c.anomaly&&c.mode==='near'){
     let d=Math.hypot(player.x-c.anomaly.position.x,player.z-c.anomaly.position.z),id='anomaly:'+c.k;
     if(d<(c.d.anomaly==='titan'?35:20)&&!world.discoveries[id]){world.discoveries[id]=c.d.anomaly;toast(c.d.anomaly==='ufo'?'Unidentified craft discovered':c.d.anomaly==='titan'?'Giant entity discovered':'Unknown creature discovered');persist()}
   }
 }
 updateSky(t,dt);
 saveTimer+=dt;if(saveTimer>8){saveTimer=0;for(const c of chunks.values())if(c.agents.length)world.animalState[c.k]=c.agents.map(a=>({x:+a.x.toFixed(2),z:+a.z.toFixed(2),dir:+a.dir.toFixed(3)}));persist()}
}

sync(true);
camera.position.set(player.x,H(player.x,player.z)+1.7,player.z);
let last=performance.now(),start=performance.now()/1000-240,shadowAt=0,perfAt=last,perfFrames=0,perfTotal=0;
function loop(now){
 let rawDt=(now-last)/1000,dt=Math.min(0.04,rawDt);last=now;let t=now/1000;
 step(dt,t-start);processFarQueue();

 // Sun shadows are expensive on mobile; refresh them often enough to look continuous
 // without re-rendering the full shadow map on every display frame.
 if(now-shadowAt>120){shadowAt=now;renderer.shadowMap.needsUpdate=true}

 renderer.render(scene,camera);

 // Adaptive internal resolution: preserve sharpness when there is GPU headroom,
 // back off slightly during heavy scenes instead of dropping simulation/gameplay.
 perfFrames++;perfTotal+=rawDt;
 if(now-perfAt>1800){
   const avg=perfTotal/Math.max(1,perfFrames),cap=Math.min(devicePixelRatio,1.25);
   let next=renderScale;
   if(avg>.0215)next=Math.max(.9,renderScale-.08);
   else if(avg<.0172)next=Math.min(cap,renderScale+.04);
   if(Math.abs(next-renderScale)>.01){renderScale=next;renderer.setPixelRatio(renderScale);renderer.setSize(innerWidth,innerHeight,false)}
   perfAt=now;perfFrames=0;perfTotal=0
 }
 requestAnimationFrame(loop)
}
requestAnimationFrame(loop);

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
document.oncontextmenu=e=>e.preventDefault();document.addEventListener('selectstart',e=>e.preventDefault(),{passive:false});document.addEventListener('dragstart',e=>e.preventDefault(),{passive:false});document.addEventListener('gesturestart',e=>e.preventDefault(),{passive:false});

window.__world={
 state:()=>({near:[...chunks.values()].filter(c=>c.mode==='near').length,far:[...chunks.values()].filter(c=>c.mode==='far').length,cached:chunks.size,animals:animalAgents.length,explored:Object.keys(world.explored).length,pos:{x:player.x,z:player.z},seed}),
 chunk:(x,z)=>JSON.parse(JSON.stringify(descriptor(x,z))),
 teleportChunk:(cx,cz)=>{activeVehicle=null;player.x=cx*CH;player.z=cz*CH;lastSyncX=1e9;lastSyncZ=1e9;sync(true);return window.__world.state()},
 mapOpen:()=>openMap(),
 animals:()=>animalAgents.slice(0,8).map(a=>({kind:a.kind,x:+a.x.toFixed(2),z:+a.z.toFixed(2),dir:+a.dir.toFixed(2)})),
 vehicles:()=>vehicles.map(v=>{let nose=v.group.localToWorld(new T.Vector3(0,0,2)),tail=v.group.localToWorld(new T.Vector3(0,0,-2));return{type:v.type,x:+v.x.toFixed(2),z:+v.z.toFixed(2),alt:+v.alt.toFixed(2),speed:+(v.speed||0).toFixed(2),pitch:+(v.pitch||0).toFixed(3),roll:+(v.roll||0).toFixed(3),vy:+(v.vy||0).toFixed(2),stalled:!!v.stalled,noseY:+nose.y.toFixed(2),tailY:+tail.y.toFixed(2),active:v===activeVehicle}}),
 anomalies:()=>[...chunks.values()].filter(c=>c.anomaly&&c.mode==='near').map(c=>({type:c.d.anomaly,x:+c.anomaly.position.x.toFixed(1),z:+c.anomaly.position.z.toFixed(1)})),
 teleport:(x,z)=>{player.x=x;player.z=z;activeVehicle=null;lastSyncX=1e9;lastSyncZ=1e9;sync(true);return window.__world.state()},
 setMove:(x,y)=>{move.x=x;move.y=y},setLook:(x,y)=>{look.x=x;look.y=y},
 enterNearest:()=>{let v=nearestVehicle();if(v){activeVehicle=v;player.x=v.x;player.z=v.z;player.yaw=v.yaw;refreshUse();return v.type}return null},
 findAnomaly:(r=12)=>{let c=chunkOf(player.x,player.z);for(let z=c.cz-r;z<=c.cz+r;z++)for(let x=c.cx-r;x<=c.cx+r;x++){let d=descriptor(x,z);if(d.anomaly)return{x,z,type:d.anomaly}}return null},
 setWeather:w=>{worldCtl.weather=w},setTime:h=>{worldCtl.autoTime=false;worldCtl.time=T.MathUtils.clamp(h,0,24);$('timeSlider').value=worldCtl.time},setThrottle:v=>{flightThrottle=T.MathUtils.clamp(v,0,1);syncEngineUI()}
};
})();