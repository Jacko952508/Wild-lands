(()=>{'use strict';
const T=THREE,$=id=>document.getElementById(id),canvas=$('game');

// Lightweight procedural audio: no downloads, no large assets, iPhone-safe after first gesture.
let audioCtx=null,audioMaster=null,ambientOsc=null,ambientGain=null,lastStepSfx=0;
function ensureAudio(){
 if(audioCtx){if(audioCtx.state==='suspended')audioCtx.resume();return}
 try{
   audioCtx=new (window.AudioContext||window.webkitAudioContext)();
   audioMaster=audioCtx.createGain();audioMaster.gain.value=.22;audioMaster.connect(audioCtx.destination);
   ambientOsc=audioCtx.createOscillator();ambientGain=audioCtx.createGain();
   ambientOsc.type='sine';ambientOsc.frequency.value=48;ambientGain.gain.value=.016;
   ambientOsc.connect(ambientGain).connect(audioMaster);ambientOsc.start()
 }catch(e){}
}
function sfx(freq=220,dur=.08,gain=.06,type='triangle'){
 if(!audioCtx||!audioMaster)return;
 const o=audioCtx.createOscillator(),g=audioCtx.createGain(),n=audioCtx.currentTime;
 o.type=type;o.frequency.setValueAtTime(freq,n);o.frequency.exponentialRampToValueAtTime(Math.max(35,freq*.55),n+dur);
 g.gain.setValueAtTime(gain,n);g.gain.exponentialRampToValueAtTime(.0001,n+dur);
 o.connect(g).connect(audioMaster);o.start(n);o.stop(n+dur+.02)
}
addEventListener('pointerdown',ensureAudio,{once:true,passive:true});

const scene=new T.Scene();
scene.background=new T.Color(0x9bb2b5);
scene.fog=new T.FogExp2(0x9fb0aa,0.0048);

const camera=new T.PerspectiveCamera(67,innerWidth/innerHeight,0.08,900);
camera.rotation.order='YXZ';

const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);
let renderScale=Math.min(devicePixelRatio,(matchMedia('(pointer:coarse)').matches||innerWidth<900)?1.0:1.2);
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
sun.shadow.mapSize.set((matchMedia('(pointer:coarse)').matches||innerWidth<900)?768:1024,(matchMedia('(pointer:coarse)').matches||innerWidth<900)?768:1024);
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

const rainCount=(matchMedia('(pointer:coarse)').matches||innerWidth<900)?280:520,rainPos=new Float32Array(rainCount*3);for(let i=0;i<rainCount;i++){rainPos[i*3]=(Math.random()-.5)*80;rainPos[i*3+1]=Math.random()*42;rainPos[i*3+2]=(Math.random()-.5)*80}const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));const rain=new T.Points(rainGeo,new T.PointsMaterial({color:0xc8def0,size:0.085,transparent:true,opacity:0,depthWrite:false}));scene.add(rain);
const cloudGroup=new T.Group(),cloudGeo=new T.SphereGeometry(1,8,6),cloudMat=new T.MeshLambertMaterial({color:0xe5e8e5,transparent:true,opacity:0.25,depthWrite:false}),cloudCount=(matchMedia('(pointer:coarse)').matches||innerWidth<900)?6:10;for(let i=0;i<cloudCount;i++){let g=new T.Group();for(let j=0;j<3;j++){let m=new T.Mesh(cloudGeo,cloudMat.clone());m.scale.set(6+Math.random()*5,1.2+Math.random(),3+Math.random()*3);m.position.set((j-1)*4,Math.random(),Math.random()*2);g.add(m)}g.userData={a:i/10*Math.PI*2,r:70+Math.random()*70,h:40+Math.random()*22};cloudGroup.add(g)}scene.add(cloudGroup);

const CH=96,NEAR=1,IS_MOBILE=matchMedia('(pointer:coarse)').matches||innerWidth<900,FAR=IS_MOBILE?2:3,CACHE=IS_MOBILE?3:4;
const WORLD='wi_world_v3',POS='wi_pos_v3';
let world;
try{world=JSON.parse(localStorage.getItem(WORLD)||'null')}catch(e){world=null}
if(!world)world={seed:Math.floor(Math.random()*1e9),explored:{},saved:{},animalState:{},discoveries:{},moonMined:{},moonOre:0,inventory:{},credits:100,builds:[],resourceGathered:{},equippedTool:null,saveVersion:5,progress:{xp:0,level:1,reputation:0,mission:0,completed:[]},playerStats:{health:100,stamina:100,energy:100},vehicleUpgrades:{ground:0,flight:0,lights:0},lootOpened:{}};world.explored=world.explored||{};world.saved=world.saved||{};world.animalState=world.animalState||{};world.discoveries=world.discoveries||{};world.moonMined=world.moonMined||{};world.moonOre=world.moonOre||0;world.inventory=world.inventory||{};world.credits=Number.isFinite(world.credits)?world.credits:100;world.builds=Array.isArray(world.builds)?world.builds:[];world.resourceGathered=world.resourceGathered||{};world.equippedTool=world.equippedTool||null;world.progress=world.progress||{xp:0,level:1,reputation:0,mission:0,completed:[]};world.progress.completed=Array.isArray(world.progress.completed)?world.progress.completed:[];world.progress.xp=Number(world.progress.xp)||0;world.progress.level=Number(world.progress.level)||1;world.progress.reputation=Number(world.progress.reputation)||0;world.progress.mission=Number(world.progress.mission)||0;world.progress.earthSites=world.progress.earthSites||{};world.progress.moonSites=world.progress.moonSites||{};world.progress.regionMilestones=world.progress.regionMilestones||{};world.playerStats=world.playerStats||{health:100,stamina:100,energy:100};world.vehicleUpgrades=world.vehicleUpgrades||{ground:0,flight:0,lights:0};world.lootOpened=world.lootOpened||{};world.gameStats=world.gameStats||{npcTalks:0,caches:0,crafted:0,upgrades:0,pois:0,moonSites:0};world.gameStats.talked=world.gameStats.talked||{};world.gameStats.npcTalks=Math.max(world.gameStats.npcTalks||0,Object.keys(world.gameStats.talked).length);world.gameStats.caches=Math.max(world.gameStats.caches||0,Object.keys(world.lootOpened||{}).length);world.gameStats.upgrades=Math.max(world.gameStats.upgrades||0,Object.values(world.vehicleUpgrades||{}).filter(v=>v>0).length);world.gameStats.pois=Math.max(world.gameStats.pois||0,Object.keys((world.progress&&world.progress.earthSites)||{}).length);world.gameStats.moonSites=Math.max(world.gameStats.moonSites||0,Object.keys((world.progress&&world.progress.moonSites)||{}).length);world.saveVersion=5;world.ui=world.ui||{lookSensitivity:1,hudScale:1};world.ui.fpsTarget=world.ui.fpsTarget||60;world.ui.graphicsQuality=world.ui.graphicsQuality||'balanced';world.ui.renderQuality=world.ui.renderQuality||1;world.ui.dynamicResolution=world.ui.dynamicResolution!==false;world.ui.shadows=world.ui.shadows!==false;world.ui.effects=world.ui.effects!==false;
if(world.saved['0,0']){world.saved['0,0'].trees=(world.saved['0,0'].trees||[]).filter(q=>!inStartClearZone(q[0],q[1]));world.saved['0,0'].rocks=(world.saved['0,0'].rocks||[]).filter(q=>!inStartClearZone(q[0],q[1]));}
let player;
try{player=JSON.parse(localStorage.getItem(POS)||'null')}catch(e){player=null}
if(!player)player={x:-14.5,z:-24,yaw:Math.PI/2,pitch:-0.03};

const seed=world.seed;
const chunks=new Map(),colliders=[],animalAgents=[],farQueue=[],farPending=new Set();
let currentChunk='',saveTimer=0,lastSyncX=1e9,lastSyncZ=1e9,syncGeneration=0,exploredCount=Object.keys(world.explored).length;
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
function biomeFromHeight(x,z,h){let m=fbm(x*0.002,z*0.002,50),t=fbm(x*0.0015,z*0.0015,60)-h*0.005;if(h>24)return'alpine';if(h>14)return'highland';if(t<0.4)return'pine';if(m>0.62)return'forest';if(m<0.36)return'meadow';return'woodland'}
function biome(x,z){return biomeFromHeight(x,z,H(x,z))}
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

const WORLD_BACKUP='wi_world_v3_backup';
let lastBackupAt=0,saveQueued=false,saveHandle=0,saveDirty=false,lastWorldString='';
function persistNow(){
 saveQueued=false;saveHandle=0;
 if(!saveDirty)return;
 saveDirty=false;
 try{
   const now=Date.now(),snapshot=JSON.stringify(world),pos=JSON.stringify(player);
   if(now-lastBackupAt>60000){
     const current=localStorage.getItem(WORLD);
     if(current)localStorage.setItem(WORLD_BACKUP,current);
     lastBackupAt=now
   }
   localStorage.setItem(WORLD,snapshot);localStorage.setItem(POS,pos);lastWorldString=snapshot
 }catch(e){saveDirty=true;console.warn('Save failed',e)}
}
function persist(){
 saveDirty=true;
 if(saveQueued)return;
 saveQueued=true;
 const run=()=>persistNow();
 if('requestIdleCallback'in window)saveHandle=requestIdleCallback(run,{timeout:1200});
 else saveHandle=setTimeout(run,450)
}
addEventListener('pagehide',persistNow);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persistNow()});

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
 let k=key(cx,cz),fresh=false;
 if(!world.saved[k]){const live=chunks.get(k);world.saved[k]=live?live.d:descriptor(cx,cz)}
 if(!world.explored[k]){world.explored[k]=Date.now();exploredCount++;fresh=true}
 if(fresh){
   const milestone=exploredCount%5===0?String(exploredCount):null;
   if(milestone&&!world.progress.regionMilestones[milestone]){
     world.progress.regionMilestones[milestone]=1;world.progress.xp+=50;world.credits+=25;updateLevel();
     toast('REGION '+exploredCount+' • frontier milestone • +50 XP • +25 credits')
   }else toast('Region discovered');
   // Keep discovery feedback immediate, but defer serialization/storage work.
   persist()
 }
 return fresh
}

const terrainMaterial=new T.MeshStandardMaterial({vertexColors:true,roughness:1}),
      terrainRockColor=new T.Color(0x74736c),terrainSnowColor=new T.Color(0xd5dad4),terrainColorTmp=new T.Color();
function terrain(cx,cz,seg){
 const g=new T.PlaneGeometry(CH,CH,seg,seg);g.rotateX(-Math.PI/2);
 const p=g.attributes.position,n=seg+1,step=CH/seg,heights=new Float32Array(p.count),worldX=new Float32Array(p.count),worldZ=new Float32Array(p.count);
 const colors=new Float32Array(p.count*3);
 for(let i=0;i<p.count;i++){
   const wx=p.getX(i)+cx*CH,wz=p.getZ(i)+cz*CH,h=H(wx,wz);
   worldX[i]=wx;worldZ[i]=wz;heights[i]=h;p.setY(i,h)
 }
 for(let i=0;i<p.count;i++){
   const row=(i/n)|0,col=i-row*n,
         li=row*n+Math.max(0,col-1),ri=row*n+Math.min(seg,col+1),
         ui=Math.max(0,row-1)*n+col,di=Math.min(seg,row+1)*n+col,
         h=heights[i],sx=(heights[ri]-heights[li])/step,sz=(heights[di]-heights[ui])/step,
         sl=T.MathUtils.clamp(Math.hypot(sx,sz)/4,0,1),
         wx=worldX[i],wz=worldZ[i];
   terrainColorTmp.setHex(biomeColor[biomeFromHeight(wx,wz,h)]);
   terrainColorTmp.lerp(terrainRockColor,sl*.65);
   if(h>23)terrainColorTmp.lerp(terrainSnowColor,T.MathUtils.clamp((h-23)/9,0,.8));
   terrainColorTmp.multiplyScalar(.91+hash(wx*.3,wz*.3,9)*.11);
   colors[i*3]=terrainColorTmp.r;colors[i*3+1]=terrainColorTmp.g;colors[i*3+2]=terrainColorTmp.b
 }
 g.setAttribute('color',new T.BufferAttribute(colors,3));g.computeVertexNormals();
 const mesh=new T.Mesh(g,terrainMaterial);
 mesh.position.set(cx*CH,0,cz*CH);mesh.receiveShadow=seg>12;return mesh
}

const farTrunkGeo=new T.CylinderGeometry(.18,.38,3.8,5),farPineGeo=new T.ConeGeometry(1.3,4.2,6),farLeafGeo=new T.ConeGeometry(1.55,4.4,6);
const sharedChunkGeometries=new Set([farTrunkGeo,farPineGeo,farLeafGeo]);
const sharedMaterials=new Set([...Object.values(mats),terrainMaterial]);
function disposeObjectTree(root){
 root.traverse(o=>{
   if(o.geometry&&!sharedChunkGeometries.has(o.geometry))o.geometry.dispose?.();
   const arr=Array.isArray(o.material)?o.material:[o.material];
   for(const m of arr)if(m&&!sharedMaterials.has(m))m.dispose?.()
 })
}
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
const nearTrunkGeo=new T.CylinderGeometry(.18,.38,3.8,7),
      nearPineGeo=new T.ConeGeometry(1,1,8),
      nearLeafGeo=new T.IcosahedronGeometry(1,1),
      nearRockGeo=new T.DodecahedronGeometry(1,0);
sharedChunkGeometries.add(nearTrunkGeo);sharedChunkGeometries.add(nearPineGeo);sharedChunkGeometries.add(nearLeafGeo);sharedChunkGeometries.add(nearRockGeo);
function addNearNature(group,d,cx,cz){
 const trees=d.trees.filter(q=>!inCityZone(cx*CH+q[0],cz*CH+q[1])),
       rocks=d.rocks.filter(q=>!inCityZone(cx*CH+q[0],cz*CH+q[1])),
       pineTrees=trees.filter(q=>biome(cx*CH+q[0],cz*CH+q[1])==='pine'),
       broadTrees=trees.filter(q=>biome(cx*CH+q[0],cz*CH+q[1])!=='pine'),
       trunks=trees.length?new T.InstancedMesh(nearTrunkGeo,mats.trunk,trees.length):null,
       pines=pineTrees.length?new T.InstancedMesh(nearPineGeo,mats.pine,pineTrees.length*3):null,
       leavesA=broadTrees.length?new T.InstancedMesh(nearLeafGeo,mats.leaf,broadTrees.length*2):null,
       leavesB=broadTrees.length?new T.InstancedMesh(nearLeafGeo,mats.leaf2,broadTrees.length*2):null,
       rockMesh=rocks.length?new T.InstancedMesh(nearRockGeo,mats.rock,rocks.length):null,
       o=new T.Object3D();
 let ti=0,pi=0,la=0,lb=0,ri=0;
 for(const q of trees){
   const wx=cx*CH+q[0],wz=cz*CH+q[1],s=q[2],y=H(wx,wz),pine=biome(wx,wz)==='pine';
   o.position.set(wx,y+1.9*s,wz);o.rotation.set(0,0,0);o.scale.setScalar(s);o.updateMatrix();trunks.setMatrixAt(ti++,o.matrix);
   if(pine){
     for(let i=0;i<3;i++){
       const rad=(1.3-i*.18)*s,h=2.5*s;
       o.position.set(wx,y+(3.2+i*.75)*s,wz);o.scale.set(rad,h,rad);o.updateMatrix();pines.setMatrixAt(pi++,o.matrix)
     }
   }else{
     for(let i=0;i<4;i++){
       const a=i/4*Math.PI*2+hash(wx+i,wz,6),rs=(1+.2*hash(wx+i,wz-i,5))*s;
       o.position.set(wx+Math.cos(a)*.55*s,y+(3.5+.4*hash(wx,wz+i,7))*s,wz+Math.sin(a)*.55*s);o.scale.setScalar(rs);o.updateMatrix();
       (i%2?leavesB:leavesA).setMatrixAt(i%2?lb++:la++,o.matrix)
     }
   }
 }
 for(const q of rocks){
   const wx=cx*CH+q[0],wz=cz*CH+q[1],s=q[2],y=H(wx,wz);
   o.position.set(wx,y+s*.55,wz);o.rotation.set(0,hash(wx,wz,31)*Math.PI*2,0);o.scale.set(s,s*.7,s);o.updateMatrix();rockMesh.setMatrixAt(ri++,o.matrix)
 }
 for(const m of[trunks,pines,leavesA,leavesB,rockMesh])if(m){m.instanceMatrix.needsUpdate=true;m.castShadow=!IS_MOBILE;m.receiveShadow=true;group.add(m)}
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
 const g=new T.Group(),m=mats[kind],dark=mats.dark,
       eyeMat=new T.MeshBasicMaterial({color:0x080808}),
       noseMat=new T.MeshStandardMaterial({color:0x171717,roughness:.9}),
       boneMat=new T.MeshStandardMaterial({color:0xd8c5a8,roughness:1});
 const isDeer=kind==='deer',isFox=kind==='fox',isWolf=kind==='wolf',isBoar=kind==='boar';
 const scale=isWolf?1.08:isBoar?1.12:1;

 // Body is elongated along the actual forward axis (+Z), giving each animal a proper silhouette.
 const body=new T.Mesh(new T.SphereGeometry(1,14,9),m);
 body.scale.set((isBoar?.72:.6)*scale,(isBoar?.72:.66)*scale,(isBoar?1.42:1.28)*scale);
 body.position.y=isBoar?.92:1.05;body.castShadow=true;g.add(body);

 const chest=new T.Mesh(new T.SphereGeometry(.62,12,8),m);
 chest.scale.set(.78,isDeer?1.05:.9,.72);chest.position.set(0,isDeer?1.18:1.08,.72);chest.castShadow=true;g.add(chest);

 const neck=new T.Mesh(new T.CylinderGeometry(isDeer?.18:.22,isDeer?.27:.3,isDeer?1.15:.72,8),m);
 neck.position.set(0,isDeer?1.58:1.42,isDeer?.88:.98);neck.rotation.x=isDeer?-.48:-.72;g.add(neck);

 const head=new T.Mesh(new T.SphereGeometry(.43,12,8),m);
 head.scale.set(isBoar?1.05:.9,isDeer?1.0:.86,isBoar?1.38:1.18);
 head.position.set(0,isDeer?2.0:1.72,isDeer?1.36:1.42);head.castShadow=true;g.add(head);

 const muzzle=new T.Mesh(new T.SphereGeometry(.25,10,7),isBoar?m:noseMat);
 muzzle.scale.set(isBoar?1.1:.75,isBoar?.65:.58,isBoar?1.25:1.05);
 muzzle.position.set(0,isDeer?1.93:1.62,isDeer?1.72:1.79);g.add(muzzle);

 for(const sx of[-1,1]){
   const eye=new T.Mesh(new T.SphereGeometry(.045,6,4),eyeMat);eye.position.set(sx*.28,isDeer?2.08:1.82,isDeer?1.63:1.68);g.add(eye);
   const ear=new T.Mesh(new T.ConeGeometry(isDeer?.13:.11,isDeer?.42:.3,6),m);
   ear.position.set(sx*(isDeer?.28:.3),isDeer?2.38:2.04,isDeer?1.27:1.36);ear.rotation.z=sx*(isDeer?.28:.42);g.add(ear)
 }

 const legs=[];
 for(const sx of[-.38,.38])for(const sz of[-.64,.62]){
   const pivot=new T.Group(),
         upper=new T.Mesh(new T.CylinderGeometry(isBoar?.09:.065,isBoar?.115:.085,isBoar?.68:.78,7),m),
         lower=new T.Mesh(new T.CylinderGeometry(.045,.06,isBoar?.43:.58,6),dark);
   upper.position.y=-.28;lower.position.y=-(isBoar?.78:.94);
   pivot.position.set(sx,isBoar?.78:.88,sz);pivot.add(upper,lower);g.add(pivot);legs.push(pivot)
 }

 if(isDeer){
   for(const s of[-1,1]){
     const antler=new T.Group();
     const stem=new T.Mesh(new T.CylinderGeometry(.025,.04,.68,6),boneMat);stem.position.y=.3;
     const tine=new T.Mesh(new T.CylinderGeometry(.018,.028,.34,5),boneMat);tine.position.set(s*.09,.47,.02);tine.rotation.z=s*.65;
     antler.position.set(s*.16,2.28,1.28);antler.rotation.z=s*.1;antler.add(stem,tine);g.add(antler)
   }
   const tail=new T.Mesh(new T.ConeGeometry(.14,.5,6),new T.MeshStandardMaterial({color:0xe7ddd0,roughness:1}));tail.position.set(0,1.15,-1.25);tail.rotation.x=1.05;g.add(tail)
 }
 if(isFox||isWolf){
   const tail=new T.Mesh(new T.ConeGeometry(isWolf?.32:.27,isWolf?1.5:1.35,9),m);
   tail.position.set(0,1.02,-1.42);tail.rotation.x=-1.08;tail.rotation.z=.12;g.add(tail);g.userData.tail=tail
 }
 if(isBoar){
   const snout=new T.Mesh(new T.CylinderGeometry(.2,.25,.42,10),m);snout.rotation.x=Math.PI/2;snout.position.set(0,1.58,1.92);g.add(snout);
   for(const s of[-1,1]){const tusk=new T.Mesh(new T.ConeGeometry(.055,.32,6),boneMat);tusk.position.set(s*.25,1.48,2.02);tusk.rotation.x=Math.PI/2;tusk.rotation.z=s*.25;g.add(tusk)}
 }

 g.userData.legs=legs;g.userData.head=head;return g;
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
   const alloy=new T.MeshStandardMaterial({color:0xaab7bc,roughness:.2,metalness:.9}),
         darkAlloy=new T.MeshStandardMaterial({color:0x26333a,roughness:.26,metalness:.82}),
         cyan=new T.MeshStandardMaterial({color:0x80ffff,emissive:0x2adce8,emissiveIntensity:1.5,roughness:.18,metalness:.18});
   const lower=new T.Mesh(new T.CylinderGeometry(3.3,5.35,.9,32),alloy);lower.scale.y=.72;lower.position.y=-.15;g.add(lower);
   const upper=new T.Mesh(new T.CylinderGeometry(4.15,3.15,.65,32),darkAlloy);upper.position.y=.45;g.add(upper);
   const dome=new T.Mesh(new T.SphereGeometry(2.15,24,12),new T.MeshPhysicalMaterial({color:0x6fa8b5,transparent:true,opacity:.48,roughness:.04,metalness:.1}));dome.position.y=1.05;dome.scale.y=.56;g.add(dome);
   const ring=new T.Mesh(new T.TorusGeometry(4.05,.16,10,32),cyan);ring.rotation.x=Math.PI/2;ring.position.y=.02;g.add(ring);
   const underside=new T.Mesh(new T.CylinderGeometry(2.2,3.0,.35,28),cyan);underside.position.y=-.72;g.add(underside);
   const lightRing=new T.Group();g.add(lightRing);
   for(let i=0;i<10;i++){
     let a=i/10*Math.PI*2,bulb=new T.Mesh(new T.SphereGeometry(.11,7,5),new T.MeshBasicMaterial({color:0x9fffff}));
     bulb.position.set(Math.cos(a)*4.2,-.18,Math.sin(a)*4.2);lightRing.add(bulb);
     if(i%2===0){let l=new T.PointLight(0x8fffe8,0.4,8);l.position.copy(bulb.position);l.userData.baseIntensity=.4;l.userData.owner=g;l.userData.maxDistance=50;g.add(l);managedLights.push(l)}
   }
   addVehicleLights(g,4.8,.2,1.25,0xc7ffff,5.8,66);
   g.userData.ufoRing=lightRing;g.userData.ufoGlow=underside;
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
   light.userData.baseIntensity=power;light.userData.owner=g;light.userData.maxDistance=Math.max(75,range*1.8);light.userData.vehicleLight=true;
   g.add(light,light.target);managedLights.push(light)
 }
}
function wheel(r=.42,wid=.28){let w=new T.Mesh(new T.CylinderGeometry(r,r,wid,14),new T.MeshStandardMaterial({color:0x181a1c,roughness:.96,metalness:.08}));w.rotation.z=Math.PI/2;return w}
function makeBuggy(x,z){
 const g=new T.Group(),paint=new T.MeshStandardMaterial({color:0xc94f22,roughness:.34,metalness:.38}),
       dark=new T.MeshStandardMaterial({color:0x171a1c,roughness:.72,metalness:.48}),
       steel=new T.MeshStandardMaterial({color:0x687077,roughness:.34,metalness:.78}),
       seatMat=new T.MeshStandardMaterial({color:0x242220,roughness:.92}),
       redGlow=new T.MeshBasicMaterial({color:0xff442b});
 const lower=new T.Mesh(new T.BoxGeometry(2.35,.32,3.65),dark);lower.position.y=.68;g.add(lower);
 const body=new T.Mesh(new T.BoxGeometry(2.05,.42,2.85),paint);body.position.set(0,.92,.1);body.scale.set(.96,1,1);g.add(body);
 const hood=new T.Mesh(new T.BoxGeometry(1.78,.34,1.28),paint);hood.position.set(0,1.14,1.18);hood.rotation.x=-.12;g.add(hood);
 const nose=new T.Mesh(new T.BoxGeometry(1.45,.26,.46),dark);nose.position.set(0,.93,1.93);g.add(nose);
 const rearDeck=new T.Mesh(new T.BoxGeometry(1.8,.32,.9),dark);rearDeck.position.set(0,1.1,-1.42);g.add(rearDeck);

 // Open cockpit: seats, steering wheel and windscreen.
 for(const sx of[-.43,.43]){const seat=new T.Mesh(new T.BoxGeometry(.58,.7,.65),seatMat);seat.position.set(sx,1.28,-.38);seat.rotation.x=-.12;g.add(seat)}
 const dash=new T.Mesh(new T.BoxGeometry(1.42,.24,.3),dark);dash.position.set(0,1.43,.45);dash.rotation.x=-.16;g.add(dash);
 const steer=new T.Mesh(new T.TorusGeometry(.22,.035,7,14),steel);steer.position.set(-.43,1.52,.55);steer.rotation.x=Math.PI/2;g.add(steer);
 const wind=new T.Mesh(new T.BoxGeometry(1.55,.56,.055),mats.glass);wind.position.set(0,1.66,.62);wind.rotation.x=-.28;g.add(wind);

 // Tubular roll cage and exposed suspension.
 const cageMat=steel;
 for(const sx of[-.83,.83]){
   const a=new T.Mesh(new T.CylinderGeometry(.045,.045,1.55,7),cageMat);a.position.set(sx,1.65,-.63);a.rotation.x=-.12;g.add(a);
   const b=new T.Mesh(new T.CylinderGeometry(.045,.045,1.52,7),cageMat);b.position.set(sx,1.65,.33);b.rotation.x=.3;g.add(b)
 }
 const roofBar=new T.Mesh(new T.BoxGeometry(1.78,.08,1.15),cageMat);roofBar.position.set(0,2.28,-.15);g.add(roofBar);
 const wheels=[];
 for(const sx of[-1.18,1.18])for(const sz of[-1.24,1.25]){
   const hub=new T.Group(),w=wheel(.52,.36);hub.add(w);hub.position.set(sx,.55,sz);g.add(hub);wheels.push(hub);
   const arm=new T.Mesh(new T.CylinderGeometry(.035,.045,.62,6),steel);arm.rotation.z=Math.PI/2;arm.position.set(sx*.55,.72,sz);g.add(arm)
 }
 const bumper=new T.Mesh(new T.BoxGeometry(2.22,.16,.18),steel);bumper.position.set(0,.59,2.0);g.add(bumper);
 const exhaust=new T.Mesh(new T.CylinderGeometry(.08,.11,.75,8),steel);exhaust.rotation.x=Math.PI/2;exhaust.position.set(.62,.95,-1.95);g.add(exhaust);
 for(const sx of[-.67,.67]){const tail=new T.Mesh(new T.BoxGeometry(.28,.18,.05),redGlow);tail.position.set(sx,1.05,-1.9);g.add(tail)}
 addVehicleLights(g,2.02,1.12,.72,0xf8fbff,4.8,52);
 g.position.set(x,H(x,z),z);scene.add(g);
 const v={type:'Dune Buggy',kind:'buggy',group:g,x,z,yaw:0,speed:0,alt:0,wheels,steer,exhaustLocal:new T.Vector3(.62,.95,-2.25),effectClock:0,trackClock:0,lastY:H(x,z)};
 vehicles.push(v);return g;
}
function makeHeli(x,z){
 const g=new T.Group(),skin=new T.MeshStandardMaterial({color:0x344d43,roughness:.36,metalness:.46}),
       accent=new T.MeshStandardMaterial({color:0xe06a2f,roughness:.42,metalness:.32}),
       dark=new T.MeshStandardMaterial({color:0x15191b,roughness:.66,metalness:.6}),
       steel=new T.MeshStandardMaterial({color:0x606970,roughness:.38,metalness:.82});
 const body=new T.Mesh(new T.SphereGeometry(1,24,14),skin);body.scale.set(1.5,1.03,2.2);body.position.y=1.82;g.add(body);
 const belly=new T.Mesh(new T.BoxGeometry(2.1,.42,2.9),dark);belly.position.set(0,.98,.05);g.add(belly);
 const canopy=new T.Mesh(new T.SphereGeometry(1,22,12),mats.glass);canopy.scale.set(1.12,.78,1.28);canopy.position.set(0,1.95,1.47);g.add(canopy);
 const brow=new T.Mesh(new T.BoxGeometry(2.0,.18,.55),skin);brow.position.set(0,2.48,1.28);brow.rotation.x=-.12;g.add(brow);
 for(const sx of[-1.42,1.42]){const door=new T.Mesh(new T.BoxGeometry(.07,1.15,1.45),skin);door.position.set(sx,1.65,-.12);g.add(door)}
 const tail=new T.Mesh(new T.CylinderGeometry(.14,.38,5.0,12),skin);tail.rotation.x=Math.PI/2;tail.position.set(0,1.88,-3.28);g.add(tail);
 const boomStripe=new T.Mesh(new T.BoxGeometry(.45,.15,2.8),accent);boomStripe.position.set(0,1.86,-3.0);g.add(boomStripe);
 const fin=new T.Mesh(new T.BoxGeometry(.16,1.75,1.35),accent);fin.position.set(0,2.42,-5.58);fin.rotation.x=-.08;g.add(fin);
 const rotorHub=new T.Group();rotorHub.position.y=3.28;g.add(rotorHub);
 const rotorA=new T.Mesh(new T.BoxGeometry(9.4,.055,.18),dark),rotorB=new T.Mesh(new T.BoxGeometry(.18,.055,9.4),dark);rotorHub.add(rotorA,rotorB);
 const mast=new T.Mesh(new T.CylinderGeometry(.075,.1,.58,8),steel);mast.position.y=3.0;g.add(mast);
 const tailRotor=new T.Group();tailRotor.position.set(.12,2.25,-5.55);tailRotor.rotation.z=Math.PI/2;g.add(tailRotor);
 const tr1=new T.Mesh(new T.BoxGeometry(.08,2.0,.12),dark),tr2=new T.Mesh(new T.BoxGeometry(2.0,.08,.12),dark);tailRotor.add(tr1,tr2);
 for(const sx of[-.95,.95]){
   const skid=new T.Mesh(new T.CylinderGeometry(.065,.065,4.25,8),steel);skid.rotation.x=Math.PI/2;skid.position.set(sx,.42,0);g.add(skid);
   for(const z of[-1.15,1.15]){const strut=new T.Mesh(new T.CylinderGeometry(.04,.045,.75,7),steel);strut.position.set(sx,.74,z);strut.rotation.z=sx>0?-.35:.35;g.add(strut)}
 }
 const intakeL=new T.Mesh(new T.BoxGeometry(.45,.38,.9),dark),intakeR=intakeL.clone();intakeL.position.set(-.65,2.55,-.7);intakeR.position.set(.65,2.55,-.7);g.add(intakeL,intakeR);
 const exhaustL=new T.Mesh(new T.CylinderGeometry(.1,.14,.75,8),steel),exhaustR=exhaustL.clone();exhaustL.rotation.x=exhaustR.rotation.x=Math.PI/2;exhaustL.position.set(-.5,2.25,-2.05);exhaustR.position.set(.5,2.25,-2.05);g.add(exhaustL,exhaustR);
 addVehicleLights(g,2.4,1.68,.72,0xf2fbff,5.5,64);
 g.position.set(x,H(x,z),z);scene.add(g);
 const v={type:'Helicopter',kind:'heli',group:g,x,z,yaw:0,speed:0,alt:0,vy:0,pitch:0,roll:0,hvx:0,hvz:0,yawRate:0,collective:0,rotorHub,tailRotor,exhaustLocals:[new T.Vector3(-.5,2.25,-2.45),new T.Vector3(.5,2.25,-2.45)],effectClock:0};
 vehicles.push(v);return g;
}
function makeJet(x,z){
 const g=new T.Group(),skin=new T.MeshStandardMaterial({color:0xc7ced2,roughness:.24,metalness:.72}),
       dark=new T.MeshStandardMaterial({color:0x252b31,roughness:.38,metalness:.72}),
       accent=new T.MeshStandardMaterial({color:0x394b62,roughness:.3,metalness:.62}),
       steel=new T.MeshStandardMaterial({color:0x69737a,roughness:.28,metalness:.88});
 const fuse=new T.Mesh(new T.CylinderGeometry(.5,.74,8.4,24),skin);fuse.rotation.x=Math.PI/2;fuse.position.y=1.42;g.add(fuse);
 const nose=new T.Mesh(new T.ConeGeometry(.52,3.25,24),skin);nose.rotation.x=Math.PI/2;nose.position.set(0,1.42,5.8);g.add(nose);
 const chineL=new T.Mesh(new T.BoxGeometry(.38,.16,4.1),accent),chineR=chineL.clone();chineL.position.set(-.58,1.32,2.15);chineR.position.set(.58,1.32,2.15);g.add(chineL,chineR);
 const wingGeo=new T.BufferGeometry();wingGeo.setAttribute('position',new T.Float32BufferAttribute([-5.2,0,1.25,5.2,0,1.25,2.15,0,-2.35,-2.15,0,-2.35],3));wingGeo.setIndex([0,1,2,0,2,3]);wingGeo.computeVertexNormals();
 const wingMat=skin.clone();wingMat.side=T.DoubleSide;const wing=new T.Mesh(wingGeo,wingMat);wing.position.y=1.34;g.add(wing);
 const underMat=accent.clone();underMat.side=T.DoubleSide;const wingUnder=new T.Mesh(wingGeo,underMat);wingUnder.position.y=1.25;wingUnder.scale.set(.96,1,.96);g.add(wingUnder);
 const tailPlane=new T.Mesh(new T.BoxGeometry(3.7,.12,1.25),skin);tailPlane.position.set(0,1.55,-3.6);g.add(tailPlane);
 const fin=new T.Mesh(new T.BoxGeometry(.16,2.0,1.5),accent);fin.position.set(0,2.35,-3.75);fin.rotation.x=-.14;g.add(fin);
 const glass=new T.Mesh(new T.SphereGeometry(.72,20,12),new T.MeshPhysicalMaterial({color:0x476a7a,transparent:true,opacity:.66,roughness:.08,metalness:.12}));glass.scale.set(.78,.48,1.55);glass.position.set(0,1.96,2.1);g.add(glass);
 for(const sx of[-.82,.82]){
   const intake=new T.Mesh(new T.BoxGeometry(.7,.72,1.8),dark);intake.position.set(sx,1.04,-.15);intake.rotation.x=.04;g.add(intake);
   const nacelle=new T.Mesh(new T.CylinderGeometry(.34,.42,2.6,16),dark);nacelle.rotation.x=Math.PI/2;nacelle.position.set(sx,1.18,-2.5);g.add(nacelle)
 }
 const nozzleMat=new T.MeshStandardMaterial({color:0x3c4043,roughness:.25,metalness:.95});
 const boostMat=new T.MeshBasicMaterial({color:0x7fcfff,transparent:true,opacity:.45,depthWrite:false});
 const boostCoreMat=new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.75,depthWrite:false});
 const afterburners=[];
 for(const sx of[-.82,.82]){
   const noz=new T.Mesh(new T.CylinderGeometry(.36,.48,.72,18),nozzleMat);noz.rotation.x=Math.PI/2;noz.position.set(sx,1.18,-4.15);g.add(noz);
   const flame=new T.Mesh(new T.ConeGeometry(.42,2.6,16,1,true),boostMat);flame.rotation.x=-Math.PI/2;flame.position.set(sx,1.18,-5.45);flame.scale.set(1,1,.01);g.add(flame);
   const core=new T.Mesh(new T.ConeGeometry(.21,1.65,12,1,true),boostCoreMat);core.rotation.x=-Math.PI/2;core.position.set(sx,1.18,-4.9);core.scale.set(1,1,.01);g.add(core);
   afterburners.push({flame,core})
 }
 // Retracted-looking but visible landing gear and wheels on ground.
 const gear=[];
 for(const q of[[0,.35,2.65],[-1.05,.35,-1.7],[1.05,.35,-1.7]]){
   const strut=new T.Mesh(new T.CylinderGeometry(.045,.055,.8,8),steel);strut.position.set(q[0],.78,q[2]);g.add(strut);
   const w=wheel(.24,.16);w.position.set(q[0],q[1],q[2]);g.add(w);gear.push(w)
 }
 for(const sx of[-4.2,4.2]){const nav=new T.Mesh(new T.SphereGeometry(.08,6,5),new T.MeshBasicMaterial({color:sx<0?0xff3d3d:0x5dff7d}));nav.position.set(sx,1.34,.45);g.add(nav)}
 addVehicleLights(g,6.1,1.42,.36,0xffffff,6.5,85);
 g.position.set(x,H(x,z)+.28,z);scene.add(g);
 const v={type:'Jet',kind:'jet',group:g,x,z,yaw:Math.PI,speed:0,alt:0,vy:0,pitch:0,roll:0,airborne:false,stalled:false,afterburners,gear,effectClock:0,trackClock:0};
 vehicles.push(v);g.rotation.y=Math.PI;return g;
}
// Shared vehicle FX pools: fixed-size, reused, mobile-safe.
const vehicleFxGroup=new T.Group();scene.add(vehicleFxGroup);
const fxGeo=new T.SphereGeometry(1,6,4),trackGeo=new T.PlaneGeometry(1,1);
const particlePool=[],trackPool=[];
for(let i=0;i<(IS_MOBILE?34:56);i++){
 const m=new T.Mesh(fxGeo,new T.MeshBasicMaterial({color:0x999999,transparent:true,opacity:0,depthWrite:false}));
 m.visible=false;m.userData.life=0;vehicleFxGroup.add(m);particlePool.push(m)
}
for(let i=0;i<(IS_MOBILE?32:56);i++){
 const m=new T.Mesh(trackGeo,new T.MeshBasicMaterial({color:0x26311f,transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}));
 m.rotation.x=-Math.PI/2;m.visible=false;m.userData.life=0;vehicleFxGroup.add(m);trackPool.push(m)
}
let particleCursor=0,trackCursor=0;
function spawnVehicleParticle(pos,color=0x8b8b82,size=.35,life=.9,vy=.7,spread=.25){
 if(world.ui.effects===false)return;
 const m=particlePool[particleCursor++%particlePool.length];
 m.visible=true;m.position.copy(pos);m.position.x+=(Math.random()-.5)*spread;m.position.z+=(Math.random()-.5)*spread;
 m.scale.setScalar(size*(.7+Math.random()*.5));m.material.color.setHex(color);m.material.opacity=.34;m.userData.life=life;m.userData.maxLife=life;m.userData.vy=vy;m.userData.vx=(Math.random()-.5)*.22;m.userData.vz=(Math.random()-.5)*.22
}
function spawnVehicleTrack(x,z,y,yaw,moon=false,width=.42,length=1.2){
 if(world.ui.effects===false)return;
 const m=trackPool[trackCursor++%trackPool.length];
 m.visible=true;m.position.set(x,y+.025,z);m.rotation.set(-Math.PI/2,0,-yaw);m.scale.set(width,length,1);
 m.material.color.setHex(moon?0x6d6c68:0x23311f);m.material.opacity=moon?.24:.2;m.userData.life=moon?11:7;m.userData.maxLife=m.userData.life
}
function updateVehicleFx(dt){
 for(const m of particlePool)if(m.visible){
   m.userData.life-=dt;if(m.userData.life<=0){m.visible=false;continue}
   m.position.x+=m.userData.vx*dt;m.position.z+=m.userData.vz*dt;m.position.y+=m.userData.vy*dt;
   m.scale.multiplyScalar(1+dt*.65);m.material.opacity=.34*(m.userData.life/m.userData.maxLife)
 }
 for(const m of trackPool)if(m.visible){
   m.userData.life-=dt;if(m.userData.life<=0){m.visible=false;continue}
   m.material.opacity=.22*Math.min(1,m.userData.life/1.8)
 }
}
const vehicleTmp=new T.Vector3();
function localWorld(v,local){
 vehicleTmp.copy(local);v.group.localToWorld(vehicleTmp);return vehicleTmp
}
function updateVehicleVisuals(dt,t){
 updateVehicleFx(dt);
 for(const v of vehicles){
   const visible=v.group.visible!==false,spd=Math.abs(v.speed||0),moving=spd>.35;
   if(!visible)continue;
   if(v.wheels){
     const spin=(v.speed||0)*dt*2.05;
     v.wheels.forEach((w,i)=>{w.rotation.x+=spin;if((v.kind==='buggy'||v.kind==='moonbuggy')&&(i%2===1))w.rotation.y=T.MathUtils.lerp(w.rotation.y,move.x*.22,dt*7)});
   }
   if(v.steer)v.steer.rotation.z=T.MathUtils.lerp(v.steer.rotation.z,-move.x*.65,dt*8);
   if(v.kind==='buggy'){
     const targetRoll=T.MathUtils.clamp((H(v.x+.7,v.z)-H(v.x-.7,v.z))*.12,-.08,.08);
     v.group.rotation.z=T.MathUtils.lerp(v.group.rotation.z,targetRoll,dt*5);
     if(moving&&v===activeVehicle){
       v.effectClock=(v.effectClock||0)-dt;v.trackClock=(v.trackClock||0)-dt;
       if(v.effectClock<=0){v.effectClock=IS_MOBILE?.11:.07;const p=localWorld(v,v.exhaustLocal);spawnVehicleParticle(p,0x7d7d76,.18+.02*spd,.72,.45,.18)}
       if(v.trackClock<=0&&spd>2){v.trackClock=.18;for(const sx of[-1.08,1.08]){const p=localWorld(v,new T.Vector3(sx,.04,-1.2));spawnVehicleTrack(p.x,p.z,H(p.x,p.z),v.yaw,false,.34,.9)}}
     }
   }else if(v.kind==='moonbuggy'){
     if(moving&&v===activeVehicle){
       v.effectClock=(v.effectClock||0)-dt;v.trackClock=(v.trackClock||0)-dt;
       if(v.effectClock<=0&&spd>1.2){v.effectClock=IS_MOBILE?.13:.09;for(const sx of[-1.2,1.2]){const p=localWorld(v,new T.Vector3(sx,.12,-1.35));spawnVehicleParticle(p,0xb8b6ad,.28+.015*spd,1.0,.28,.34)}}
       if(v.trackClock<=0){v.trackClock=.2;for(const sx of[-1.26,1.26]){const p=localWorld(v,new T.Vector3(sx,.03,-1.35));spawnVehicleTrack(p.x,p.z,moonH(p.x,p.z),v.yaw,true,.38,1.0)}}
     }
   }else if(v.kind==='heli'){
     const rpm=.18+flightThrottle*.82;
     if(v.rotorHub)v.rotorHub.rotation.y+=dt*(12+rpm*46);
     if(v.tailRotor)v.tailRotor.rotation.z+=dt*(20+rpm*68);
     if(v===activeVehicle&&flightThrottle>.15){
       v.effectClock=(v.effectClock||0)-dt;
       if(v.effectClock<=0){v.effectClock=IS_MOBILE?.12:.08;for(const q of v.exhaustLocals||[]){const p=localWorld(v,q);spawnVehicleParticle(p,0x747a78,.17,1.0,.5,.16)}}
       if((v.alt||0)<4.2&&flightThrottle>.45&&v.effectClock<.05){for(let i=0;i<2;i++){const a=Math.random()*Math.PI*2,r=1.5+Math.random()*2.2;spawnVehicleParticle(new T.Vector3(v.x+Math.cos(a)*r,H(v.x,v.z)+.1,v.z+Math.sin(a)*r),0x8f8a76,.24,.75,.18,.5)}}
     }
   }else if(v.kind==='jet'){
     const speedNorm=T.MathUtils.clamp(spd/42,0,1),power=T.MathUtils.clamp(flightThrottle*.65+speedNorm*.55,0,1),air=(v.alt||0)>.7;
     if(v.afterburners)for(const a of v.afterburners){
       const on=Math.max(0,(power-.08)/.92),len=.08+on*(air?1.65:1.3);
       a.flame.visible=on>.05;a.core.visible=on>.12;
       a.flame.scale.set(.6+.55*on,len, .6+.55*on);a.core.scale.set(.55+.3*on,.45+len*.65,.55+.3*on);
       a.flame.material.opacity=.18+.68*on;a.core.material.opacity=.25+.72*on;
     }
     if(v.gear)v.gear.forEach(w=>w.rotation.x+=(v.speed||0)*dt*2.8);
     if(v===activeVehicle){
       v.effectClock=(v.effectClock||0)-dt;v.trackClock=(v.trackClock||0)-dt;
       if(!air&&moving&&v.trackClock<=0){v.trackClock=.13;for(const sx of[-1.05,1.05])spawnVehicleTrack(v.x+Math.cos(v.yaw)*sx,v.z-Math.sin(v.yaw)*sx,H(v.x,v.z),v.yaw,false,.22,.75)}
       if(v.effectClock<=0&&flightThrottle<.55){v.effectClock=IS_MOBILE?.16:.1;const p=localWorld(v,new T.Vector3(0,1.15,-4.8));spawnVehicleParticle(p,0x6d6f70,.2,.65,.35,.25)}
     }
   }else if(v.kind==='ufo'){
     const intensity=T.MathUtils.clamp(.35+spd/70+(v.alt||0)/220,0,1.5);
     const ring=v.group.userData.ufoRing,glow=v.group.userData.ufoGlow;
     if(ring)ring.rotation.y+=dt*(.35+intensity*1.4);
     if(glow){glow.material.emissiveIntensity=1.1+intensity*1.8;glow.scale.y=.9+Math.sin(t*5)*.06}
     if(v===activeVehicle&&spd>18){
       v.effectClock=(v.effectClock||0)-dt;if(v.effectClock<=0){v.effectClock=IS_MOBILE?.13:.08;const p=localWorld(v,new T.Vector3(0,-1.0,-2));spawnVehicleParticle(p,0x77ffff,.28,.65,-.08,.6)}
     }
   }else if(v.kind==='mek'){
     const walk=Math.sin(t*5.2*Math.max(.5,spd*.22));
     if(v.legs){v.legs[0].rotation.x=walk*.18*Math.min(1,spd/3);v.legs[1].rotation.x=-walk*.18*Math.min(1,spd/3)}
     if(v.arms){v.arms[0].rotation.x=-walk*.12*Math.min(1,spd/3);v.arms[1].rotation.x=walk*.12*Math.min(1,spd/3)}
     if(v.drillPivot&&$('mine')&&!$('mine').classList.contains('hidden'))v.drillPivot.rotation.z+=dt*2.4;
     const boost=T.MathUtils.clamp(flightThrottle*1.3+(v.alt||0)*.08,0,1);
     if(v.boosters)for(const f of v.boosters){f.material.opacity=boost*.85;f.scale.set(1,.2+boost*1.15,1);f.visible=boost>.04}
     if(v===activeVehicle&&boost>.2){v.effectClock=(v.effectClock||0)-dt;if(v.effectClock<=0){v.effectClock=IS_MOBILE?.14:.09;for(const sx of[-.95,.95]){const p=localWorld(v,new T.Vector3(sx,4,-3.1));spawnVehicleParticle(p,0xd7c3a0,.25,.65,.15,.2)}}}
   }
 }
}
const startColliders=[],startDoorways=[];
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
 startDoorways.push({x:wallX,z:hz,hx:2.4,hz:4.1});
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

const cityColliders=[],cityDoorways=[];
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
function makeHuman(parent,x,z,shirt=0x546f8a,role='Resident',name=role){
 const g=new T.Group(),skin=cityMat(0xc99872,.72),cloth=cityMat(shirt,.72),pants=cityMat(0x2f3438,.84),shoe=cityMat(0x17191a,.9),hairMat=cityMat(0x3d2c22,.88),eyeMat=new T.MeshBasicMaterial({color:0x111111});

 const hips=new T.Mesh(new T.BoxGeometry(.72,.34,.42),pants);hips.position.y=1.02;g.add(hips);
 const torso=new T.Mesh(new T.CylinderGeometry(.34,.43,1.05,10),cloth);torso.position.y=1.62;torso.scale.z=.72;g.add(torso);
 const neck=new T.Mesh(new T.CylinderGeometry(.11,.12,.22,8),skin);neck.position.y=2.24;g.add(neck);
 const head=new T.Mesh(new T.SphereGeometry(.32,14,10),skin);head.scale.set(.92,1.05,.9);head.position.y=2.55;g.add(head);
 const hair=new T.Mesh(new T.SphereGeometry(.325,12,8,0,Math.PI*2,0,Math.PI*.52),hairMat);hair.position.y=2.68;g.add(hair);

 const arms=[],legs=[];
 for(const sx of[-1,1]){
   const armPivot=new T.Group(),upper=new T.Mesh(new T.CylinderGeometry(.075,.09,.72,8),cloth),hand=new T.Mesh(new T.SphereGeometry(.11,8,6),skin);
   upper.position.y=-.34;hand.position.y=-.76;armPivot.position.set(sx*.47,1.95,0);armPivot.rotation.z=sx*.07;armPivot.add(upper,hand);g.add(armPivot);arms.push(armPivot);

   const legPivot=new T.Group(),leg=new T.Mesh(new T.CylinderGeometry(.095,.11,.84,8),pants),boot=new T.Mesh(new T.BoxGeometry(.22,.16,.4),shoe);
   leg.position.y=-.38;boot.position.set(0,-.82,.09);legPivot.position.set(sx*.19,.9,0);legPivot.add(leg,boot);g.add(legPivot);legs.push(legPivot);

   const eye=new T.Mesh(new T.SphereGeometry(.028,6,4),eyeMat);eye.position.set(sx*.105,2.58,.287);g.add(eye)
 }
 const nose=new T.Mesh(new T.ConeGeometry(.035,.11,6),skin);nose.rotation.x=Math.PI/2;nose.position.set(0,2.51,.33);g.add(nose);

 if(role==='Miner'||role==='Builder'||role==='Mechanic'){
   const cap=new T.Mesh(new T.CylinderGeometry(.34,.34,.12,12),cityMat(role==='Miner'?0xe2b84c:0x606b72,.7));cap.position.y=2.88;g.add(cap)
 }
 if(role==='Medic'){
   const badge=new T.Mesh(new T.BoxGeometry(.18,.18,.03),new T.MeshBasicMaterial({color:0xffffff}));badge.position.set(.18,1.82,.34);g.add(badge)
 }
 if(role==='Ranger'||role==='Pilot'){
   const belt=new T.Mesh(new T.BoxGeometry(.78,.12,.5),cityMat(0x3c3328,.8));belt.position.y=1.1;g.add(belt)
 }

 g.position.set(x,H(x,z),z);
 g.userData.role=role;g.userData.name=name;g.userData.arms=arms;g.userData.legs=legs;g.userData.phase=Math.random()*Math.PI*2;g.userData.baseY=g.position.y;
 g.userData.homeX=x;g.userData.homeZ=z;g.userData.wander=!['Shopkeeper','Mechanic','Medic','Barista','Arcade Attendant'].includes(role);
 g.userData.targetX=x;g.userData.targetZ=z;g.userData.moveT=1+Math.random()*4;
 parent.add(g);townHumans.push(g);
 if(role!=='Shopkeeper'&&role!=='Mechanic')g.userData.interaction=addTownInteraction('talk',x,z,'TALK TO '+name.toUpperCase(),{name,role});
 return g
}
function addTownInteraction(type,x,z,label,data={}){const a={type,x,z,label,...data};townInteractions.push(a);return a}
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
 cityDoorways.push({x:cx,z:frontZ,hx:door*.62,hz:2.2});
 townText(parent,label,cx,y+h-.95,frontZ+(doorSide==='south'?-0.24:0.24),Math.min(w*.72,9),1.05);
 for(const sx of[-.3,.3]){
   let win=new T.Mesh(new T.BoxGeometry(w*.2,1.5,.08),cityM.glass);
   win.position.set(cx+sx*w,y+2.6,frontZ+(doorSide==='south'?-0.05:.05));parent.add(win);
   const fw=w*.205,fh=1.58,fz=win.position.z+(doorSide==='south'?.045:-.045);
   for(const bx of[-fw/2,fw/2]){const bar=new T.Mesh(new T.BoxGeometry(.06,fh,.035),cityM.dark);bar.position.set(win.position.x+bx,win.position.y,fz);parent.add(bar)}
   for(const by of[-fh/2,fh/2]){const bar=new T.Mesh(new T.BoxGeometry(fw,.06,.035),cityM.dark);bar.position.set(win.position.x,win.position.y+by,fz);parent.add(bar)}
   const mullion=new T.Mesh(new T.BoxGeometry(.045,fh,.035),cityM.dark);mullion.position.set(win.position.x,win.position.y,fz);parent.add(mullion);win.renderOrder=2
 }
 // Cheap interior polish: ceiling light panels, skirting and a proper doorway frame.
 const glowMat=new T.MeshBasicMaterial({color:0xfff0c7});
 for(const ox of[-w*.22,w*.22]){const lamp=new T.Mesh(new T.BoxGeometry(Math.min(3.2,w*.22),.035,.65),glowMat);lamp.position.set(cx+ox,y+h-.34,cz);parent.add(lamp)}
 const trimZ=doorSide==='south'?frontZ+.28:frontZ-.28;
 cityBox(parent,cx,y+.24,backZ,w-.8,.22,.12,cityM.dark,false);
 cityBox(parent,cx-door/2-.12,y+1.55,trimZ,.18,3.1,.18,cityM.dark,false);
 cityBox(parent,cx+door/2+.12,y+1.55,trimZ,.18,3.1,.18,cityM.dark,false);
 cityBox(parent,cx,y+3.08,trimZ,door+.42,.16,.18,cityM.dark,false);
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
 makeHuman(g,-106,-18,0x315c39,'Shopkeeper','Mara');
 addTownInteraction('shop',-106,-18,'TRADE WITH MARA');

 // Arcade with several working machines and open central aisle.
 s=townShell(g,-129,-20,22,20,6.2,cityM.blue,'NEON ARCADE');
 for(const [x,z,n] of[[-135,-17,'STAR RUNNER'],[-132,-17,'MOON RAID'],[-126,-17,'WILDLANDS GT'],[-123,-17,'ASTRO DROP'],[-120,-17,'TANK DUEL']])arcadeMachine(g,x,z,Math.PI,n);
 cityBox(g,-129,s.y+.55,-26,8,1.1,1.1,cityM.dark,true);
 makeHuman(g,-130,-24,0x7a4c8e,'Arcade Attendant','Eli');

 // Cafe with tables spaced around a clear entrance.
 s=townShell(g,-158,-20,20,20,6,cityM.plaster,'CAFE');
 cityBox(g,-158,s.y+.65,-16,9,1.3,1.2,cityM.wood,true);
 for(const [x,z] of[[-163,-23],[-155,-23],[-163,-28],[-155,-28]]){
   cityBox(g,x,s.y+.4,z,1.5,.8,1.5,cityM.wood,true);
   cityBox(g,x+1,s.y+.35,z,.45,.7,.45,cityM.dark,true)
 }
 makeHuman(g,-160,-17,0x8c3e36,'Barista','Nia');
 addTownInteraction('cafe',-160,-18,'ORDER A HOT MEAL');

 // Tool workshop. The human is interactive through the main shop economy too.
 s=townShell(g,-101,34,20,20,6.2,cityM.plaster,'WORKSHOP','north');
 cityBox(g,-106,s.y+1.0,31,1.2,2,7,cityM.wood,true);
 cityBox(g,-95,s.y+1.0,31,1.2,2,7,cityM.wood,true);
 cityBox(g,-101,s.y+.72,28,7,1.44,1.1,cityM.dark,true);
 makeHuman(g,-101,30,0x6e543c,'Mechanic','Cole');
 addTownInteraction('shop',-101,30,'BROWSE COLE\'S TOOLS');

 // Clinic, residence and community hall are enterable and furnished.
 s=townShell(g,-130,34,22,20,6.1,cityM.brick,'CLINIC','north');
 for(const x of[-135,-126])cityBox(g,x,s.y+.42,31,3,.84,5,cityM.cream,true);
 makeHuman(g,-130,30,0x496579,'Medic','Dr. Vale');
 addTownInteraction('clinic',-130,30,'USE CLINIC SERVICES');

 s=townShell(g,-160,34,22,20,6.3,cityM.cream,'COMMUNITY HALL','north');
 for(const x of[-166,-160,-154])cityBox(g,x,s.y+.42,31,3.5,.84,1.2,cityM.wood,true);
 makeHuman(g,-160,29,0x725d45,'Caretaker','June');
 addTownInteraction('noticeboard',-160,31,'CHECK COMMUNITY BOARD');

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

 // Street residents and workers.
 makeHuman(g,-118,11,0x76504a,'Ranger','Iris');
 makeHuman(g,-147,7,0x496579,'Surveyor','Theo');
 makeHuman(g,-91,9,0x8c3e36,'Courier','Rafi');
 makeHuman(g,-171,11,0x315c39,'Miner','Ada');
 makeHuman(g,-112,50,0x59406f,'Builder','Mason');
 makeHuman(g,-139,51,0x6c7040,'Botanist','Mae');
 makeHuman(g,-149,-7,0x3d6175,'Pilot','Soren');
 makeHuman(g,-76,17,0x7b5b46,'Traveller','Tess');

 scene.add(g);return g
}
const cityGroup=makeCity();

const buildGroup=new T.Group(),buildColliders=[],earthResources=[];
scene.add(buildGroup);
function buildMat(color,metal=0){return new T.MeshStandardMaterial({color,roughness:metal?.55:.9,metalness:metal?.35:0})}
function addBuildCollider(x,z,hx,hz){buildColliders.push({x,z,hx,hz})}
function makeBuildPiece(b,save=false){
 const y=earthH(b.x,b.z),g=new T.Group(),wood=buildMat(0x6f4f34),stone=buildMat(0x77756f),metal=buildMat(0x4f5c62,1);
 if(b.type==='Wood Wall'){
   const m=new T.Mesh(new T.BoxGeometry(5,2.7,.28),wood);m.position.y=1.35;g.add(m);addBuildCollider(b.x,b.z,2.5,.3)
 }else if(b.type==='Foundation'){
   const m=new T.Mesh(new T.BoxGeometry(5,.3,5),stone);m.position.y=.15;g.add(m)
 }else if(b.type==='Camp Light'){
   const pole=new T.Mesh(new T.CylinderGeometry(.08,.1,3,8),metal);pole.position.y=1.5;g.add(pole);
   const bulb=new T.Mesh(new T.SphereGeometry(.2,8,6),new T.MeshBasicMaterial({color:0xffefb8}));bulb.position.y=3.0;g.add(bulb);
   const l=new T.PointLight(0xffe7b0,2.5,26,1.6);l.position.y=2.9;l.userData.baseIntensity=2.5;l.userData.owner=g;l.userData.maxDistance=50;g.add(l);managedLights.push(l);
   addBuildCollider(b.x,b.z,.35,.35)
 }else if(b.type==='Workbench'){
   const top=new T.Mesh(new T.BoxGeometry(3,.25,1.2),wood);top.position.y=1.05;g.add(top);
   for(const sx of[-1.2,1.2])for(const sz of[-.42,.42]){const leg=new T.Mesh(new T.BoxGeometry(.18,1,.18),metal);leg.position.set(sx,.5,sz);g.add(leg)}
   addBuildCollider(b.x,b.z,1.6,.75);addTownInteraction('workbench',b.x,b.z,'USE WORKBENCH')
 }else if(b.type==='Field Shelter'){
   const cloth=new T.MeshStandardMaterial({color:0x6d735d,roughness:.92,side:T.DoubleSide});
   const floor=new T.Mesh(new T.BoxGeometry(4.8,.16,4.2),wood);floor.position.y=.08;g.add(floor);
   const roof=new T.Mesh(new T.CylinderGeometry(0,3.6,3.2,4,1,false,Math.PI/4,Math.PI*2),cloth);roof.rotation.y=Math.PI/4;roof.scale.z=.8;roof.position.y=2.1;g.add(roof);
   addBuildCollider(b.x-2,b.z,0.18,2.1);addBuildCollider(b.x+2,b.z,0.18,2.1);
   addTownInteraction('shelter',b.x,b.z,'REST IN SHELTER')
 }else if(b.type==='Signal Beacon'){
   const mast=new T.Mesh(new T.CylinderGeometry(.08,.12,4.8,8),metal);mast.position.y=2.4;g.add(mast);
   const ring=new T.Mesh(new T.TorusGeometry(.7,.07,8,20),new T.MeshBasicMaterial({color:0xffc96b}));ring.position.y=4.7;ring.rotation.x=Math.PI/2;g.add(ring);
   const l=new T.PointLight(0xffc96b,3,38,1.7);l.position.y=4.7;l.userData.baseIntensity=3;l.userData.owner=g;l.userData.maxDistance=65;g.add(l);managedLights.push(l);
   addBuildCollider(b.x,b.z,.35,.35)
 }
 g.position.set(b.x,y,b.z);g.rotation.y=b.yaw||0;buildGroup.add(g);
 if(save){world.builds.push({type:b.type,x:+b.x.toFixed(2),z:+b.z.toFixed(2),yaw:+(b.yaw||0).toFixed(3)});persist()}
 return g
}
for(const b of world.builds)makeBuildPiece(b,false);

function makeResourceNode(parent,id,type,x,z){
 if(world.resourceGathered[id])return;
 let mesh;
 if(type==='Wood'){
   mesh=new T.Group();
   for(let i=0;i<4;i++){let log=new T.Mesh(new T.CylinderGeometry(.24,.28,2.8,8),cityM.wood);log.rotation.z=Math.PI/2;log.position.set(0,.32+i*.3,(i%2-.5)*.55);mesh.add(log)}
 }else if(type==='Stone'){
   mesh=new T.Mesh(new T.DodecahedronGeometry(1.4,0),buildMat(0x777873));mesh.scale.y=.75
 }else{
   mesh=new T.Group();
   for(let i=0;i<4;i++){let s=new T.Mesh(new T.BoxGeometry(1.3,.22,.7),buildMat(i%2?0x596166:0x7b5a45,1));s.rotation.set(i*.16,i*.55,i*.09);s.position.set((i-1.5)*.45,.3+i*.18,(i%2-.5)*.45);mesh.add(s)}
 }
 mesh.position.set(x,earthH(x,z)+(type==='Stone'?1:0),z);parent.add(mesh);
 earthResources.push({id,type,x,z,mesh});
 addTownInteraction('resource',x,z,type==='Wood'?'CHOP TIMBER':type==='Stone'?'MINE STONE':'SALVAGE SCRAP',{resourceId:id,resourceType:type})
}
const resourceGroup=new T.Group();scene.add(resourceGroup);
[
 ['wood1','Wood',-185,-28],['wood2','Wood',-182,30],['wood3','Wood',-70,-38],['wood4','Wood',-67,44],
 ['stone1','Stone',-194,8],['stone2','Stone',-188,52],['stone3','Stone',-63,-50],['stone4','Stone',-56,57],
 ['scrap1','Scrap',-72,25],['scrap2','Scrap',-92,-47],['scrap3','Scrap',-159,-48],['scrap4','Scrap',-176,30]
].forEach(q=>makeResourceNode(resourceGroup,...q));

const lootGroup=new T.Group();scene.add(lootGroup);
function makeLootCache(parent,id,x,z,realm='earth'){
 if(world.lootOpened[id])return;
 const y=realm==='moon'?moonH(x,z):earthH(x,z),g=new T.Group(),
       box=new T.Mesh(new T.BoxGeometry(1.4,.8,1.0),new T.MeshStandardMaterial({color:realm==='moon'?0x7b8588:0x48553e,roughness:.72,metalness:.22})),
       band=new T.Mesh(new T.BoxGeometry(1.5,.14,1.05),new T.MeshStandardMaterial({color:0xb7c9a5,roughness:.5,metalness:.3}));
 box.position.y=.45;band.position.y=.52;g.add(box,band);g.position.set(x,y,z);parent.add(g);
 addTownInteraction('loot',x,z,'OPEN SUPPLY CACHE',{lootId:id,realm,mesh:g})
}
[['cache_town',-186,-55],['cache_ridge',-245,90],['cache_forest',-315,-145],['cache_airfield',55,62]].forEach(q=>makeLootCache(lootGroup,...q));

const poiGroup=new T.Group();scene.add(poiGroup);
function makeEarthPoi(type,x,z){
 const y=earthH(x,z),g=new T.Group(),rust=buildMat(0x5d5144,1),concrete=buildMat(0x686c68),dark=buildMat(0x25292b,1);
 if(type==='bunker'){
   const floor=new T.Mesh(new T.BoxGeometry(12,.3,9),concrete);floor.position.y=.15;g.add(floor);
   for(const sx of[-5.8,5.8]){const w=new T.Mesh(new T.BoxGeometry(.4,3.2,9),concrete);w.position.set(sx,1.6,0);g.add(w);buildColliders.push({x:x+sx,z,hx:.3,hz:4.5})}
   const back=new T.Mesh(new T.BoxGeometry(12,3.2,.4),concrete);back.position.set(0,1.6,4.3);g.add(back);buildColliders.push({x,z:z+4.3,hx:6,hz:.3});
   const roof=new T.Mesh(new T.BoxGeometry(12,.45,9),concrete);roof.position.y=3.3;g.add(roof);
   const doorL=new T.Mesh(new T.BoxGeometry(3.8,3.2,.4),concrete);doorL.position.set(-4.1,1.6,-4.3);g.add(doorL);
   const doorR=doorL.clone();doorR.position.x=4.1;g.add(doorR);
   buildColliders.push({x:x-4.1,z:z-4.3,hx:1.9,hz:.3},{x:x+4.1,z:z-4.3,hx:1.9,hz:.3});
   townText(g,'ABANDONED STATION',0,2.75,-4.55,7,1);
   addTownInteraction('poi',x,z-2,'SEARCH ABANDONED STATION',{poi:'bunker'})
 }else{
   const body=new T.Mesh(new T.BoxGeometry(7,1.8,2.8),rust);body.rotation.set(.12,.25,.35);body.position.y=1.2;g.add(body);
   const boom=new T.Mesh(new T.BoxGeometry(9,.35,1.1),dark);boom.position.set(0,1.4,0);boom.rotation.y=.5;g.add(boom);
   addTownInteraction('poi',x,z,'INSPECT CRASH SITE',{poi:'wreck'})
 }
 g.position.set(x,y,z);poiGroup.add(g)
}
makeEarthPoi('bunker',-255,96);makeEarthPoi('wreck',-318,-142);

const moonColliders=[],moonDoorways=[],moonMineables=[],moonCollectibles=[];
function moonBox(parent,x,y,z,w,h,d,mat,collide=false){
 let m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);
 m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);
 if(collide)moonColliders.push({x,z,hx:w/2,hz:d/2});
 return m
}
function makeMoonBuggy(parent,x,z){
 const g=new T.Group(),white=new T.MeshStandardMaterial({color:0xe3e5df,roughness:.42,metalness:.34}),
       frame=new T.MeshStandardMaterial({color:0x2c3236,roughness:.62,metalness:.62}),
       hazard=new T.MeshStandardMaterial({color:0xe0aa38,roughness:.5,metalness:.28}),
       steel=new T.MeshStandardMaterial({color:0x697177,roughness:.36,metalness:.82});
 const lower=new T.Mesh(new T.BoxGeometry(2.75,.3,4.15),frame);lower.position.y=.72;g.add(lower);
 const body=new T.Mesh(new T.BoxGeometry(2.5,.5,3.45),white);body.position.y=1.02;g.add(body);
 const nose=new T.Mesh(new T.BoxGeometry(2.15,.42,1.1),white);nose.position.set(0,1.22,1.45);nose.rotation.x=-.11;g.add(nose);
 const cab=new T.Mesh(new T.SphereGeometry(1,18,10),new T.MeshPhysicalMaterial({color:0x6f929e,transparent:true,opacity:.55,roughness:.1,metalness:.08}));cab.scale.set(1.05,.64,.92);cab.position.set(0,1.66,.38);g.add(cab);
 const roof=new T.Mesh(new T.BoxGeometry(2.05,.14,1.55),frame);roof.position.set(0,2.15,.28);g.add(roof);
 const rack=new T.Mesh(new T.BoxGeometry(2.2,.16,1.3),frame);rack.position.set(0,1.2,-1.55);g.add(rack);
 for(const sx of[-.7,.7]){const crate=new T.Mesh(new T.BoxGeometry(.72,.72,.8),white);crate.position.set(sx,1.58,-1.52);g.add(crate)}
 const mast=new T.Mesh(new T.CylinderGeometry(.035,.045,1.45,7),steel);mast.position.set(.78,2.72,-.2);g.add(mast);
 const dish=new T.Mesh(new T.CylinderGeometry(.08,.38,.14,16),white);dish.position.set(.78,3.38,-.2);dish.rotation.x=.3;g.add(dish);
 const wheels=[];
 for(const sx of[-1.4,1.4])for(const sz of[-1.42,1.42]){
   const hub=new T.Group(),w=wheel(.6,.4);hub.add(w);hub.position.set(sx,.58,sz);g.add(hub);wheels.push(hub);
   const arm=new T.Mesh(new T.CylinderGeometry(.04,.05,.72,7),steel);arm.rotation.z=Math.PI/2;arm.position.set(sx*.57,.78,sz);g.add(arm)
 }
 for(const sx of[-.95,.95]){const stripe=new T.Mesh(new T.BoxGeometry(.55,.06,1.1),hazard);stripe.position.set(sx,1.29,1.2);g.add(stripe)}
 addVehicleLights(g,2.15,1.22,.8,0xe6ffff,5.5,58);
 g.position.set(x,moonH(x,z),z);parent.add(g);
 const v={type:'Moon Buggy',kind:'moonbuggy',realm:'moon',group:g,x,z,yaw:0,speed:0,alt:0,wheels,effectClock:0,trackClock:0};
 vehicles.push(v);return v
}
function makeMek(parent,x,z){
 const g=new T.Group(),metal=new T.MeshStandardMaterial({color:0x68747c,roughness:.34,metalness:.72}),
       armor=new T.MeshStandardMaterial({color:0x4a5258,roughness:.45,metalness:.62}),
       hazard=new T.MeshStandardMaterial({color:0xd6a52d,roughness:.45,metalness:.28}),
       joint=new T.MeshStandardMaterial({color:0x20262a,roughness:.58,metalness:.68}),
       glow=new T.MeshStandardMaterial({color:0x8ffcff,emissive:0x2aa9b2,emissiveIntensity:1.4,roughness:.22,metalness:.2});
 const pelvis=new T.Mesh(new T.BoxGeometry(3.2,1.05,2.5),joint);pelvis.position.y=3.6;g.add(pelvis);
 const torso=new T.Mesh(new T.BoxGeometry(4.2,2.8,3.0),armor);torso.position.y=5.35;torso.rotation.x=-.045;g.add(torso);
 const chestPlate=new T.Mesh(new T.BoxGeometry(3.35,1.25,.32),metal);chestPlate.position.set(0,5.35,1.6);chestPlate.rotation.x=-.08;g.add(chestPlate);
 const core=new T.Mesh(new T.CylinderGeometry(.38,.38,.18,18),glow);core.rotation.x=Math.PI/2;core.position.set(0,5.42,1.85);g.add(core);
 const cockpit=new T.Mesh(new T.SphereGeometry(1,18,11),new T.MeshPhysicalMaterial({color:0x658994,transparent:true,opacity:.58,roughness:.08,metalness:.1}));cockpit.scale.set(1.3,.78,.98);cockpit.position.set(0,6.1,1.42);g.add(cockpit);
 const legs=[],knees=[],feet=[],arms=[];
 for(const sx of[-1.15,1.15]){
   const hip=new T.Mesh(new T.SphereGeometry(.64,12,8),joint);hip.position.set(sx,3.35,0);g.add(hip);
   const upper=new T.Mesh(new T.BoxGeometry(1.0,1.65,1.18),metal);upper.position.set(sx,2.55,0);g.add(upper);
   const knee=new T.Group();knee.position.set(sx,1.72,.1);g.add(knee);knees.push(knee);
   const cap=new T.Mesh(new T.CylinderGeometry(.36,.36,.3,12),hazard);cap.rotation.z=Math.PI/2;knee.add(cap);
   const lower=new T.Mesh(new T.BoxGeometry(.9,1.55,1.0),armor);lower.position.set(sx,.9,.16);g.add(lower);legs.push(lower);
   const foot=new T.Mesh(new T.BoxGeometry(1.8,.58,2.5),joint);foot.position.set(sx,.3,.52);g.add(foot);feet.push(foot);
   const shoulder=new T.Mesh(new T.SphereGeometry(.72,12,8),joint);shoulder.position.set(sx*1.9,5.55,0);g.add(shoulder);
   const shoulderPlate=new T.Mesh(new T.BoxGeometry(1.25,.65,1.45),hazard);shoulderPlate.position.set(sx*2.05,5.72,.05);g.add(shoulderPlate);
   const armPivot=new T.Group();armPivot.position.set(sx*2.05,4.75,.1);g.add(armPivot);arms.push(armPivot);
   const arm=new T.Mesh(new T.BoxGeometry(.82,2.1,.92),metal);arm.position.y=-.75;armPivot.add(arm)
 }
 const drillPivot=new T.Group();drillPivot.position.set(2.05,3.72,1.28);g.add(drillPivot);
 const drill=new T.Mesh(new T.ConeGeometry(.7,3.3,16),hazard);drill.rotation.x=Math.PI/2;drill.position.z=1.72;drillPivot.add(drill);
 const boosters=[];
 for(const sx of[-.95,.95]){
   const pack=new T.Mesh(new T.BoxGeometry(.75,1.4,.9),armor);pack.position.set(sx,4.45,-1.9);g.add(pack);
   const nozzle=new T.Mesh(new T.CylinderGeometry(.28,.42,.78,12),joint);nozzle.rotation.x=Math.PI/2;nozzle.position.set(sx,4.0,-2.55);g.add(nozzle);
   const flame=new T.Mesh(new T.ConeGeometry(.34,1.7,12,1,true),new T.MeshBasicMaterial({color:0xffc15f,transparent:true,opacity:0,depthWrite:false}));flame.rotation.x=-Math.PI/2;flame.position.set(sx,4.0,-3.35);g.add(flame);boosters.push(flame)
 }
 addVehicleLights(g,2.35,5.35,1.4,0xdfffff,7.8,72);
 g.position.set(x,moonH(x,z),z);parent.add(g);
 const v={type:'MEK Miner',kind:'mek',realm:'moon',group:g,x,z,yaw:0,speed:0,alt:0,vy:0,pitch:0,roll:0,legs,knees,feet,arms,drillPivot,boosters,effectClock:0};
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
 moonDoorways.push({x:0,z:7.1,hx:6.2,hz:3.2});

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

 // Scatter lunar boulders using two instanced batches instead of dozens of draw calls.
 const moonRockGeo=new T.DodecahedronGeometry(1,1),
       moonRockA=new T.InstancedMesh(moonRockGeo,cityMat(0x6e6d69,1),28),
       moonRockB=new T.InstancedMesh(moonRockGeo,cityMat(0x85837d,1),42),
       rockObj=new T.Object3D();let ra=0,rb=0;
 for(let i=0;i<70;i++){
   let a=i*2.3999632297,r=95+(i%14)*23,x=Math.cos(a)*r,z=Math.sin(a)*r+18;
   if(Math.abs(x)<58&&Math.abs(z-18)<62)continue;
   let s=.7+(i%5)*.34;
   rockObj.position.set(x,moonH(x,z)+s*.55,z);
   rockObj.rotation.set((i%4)*.18,a,(i%5)*.11);
   rockObj.scale.set(1.15*s,(.62+.12*(i%3))*s,.9*s);rockObj.updateMatrix();
   if(i%3===0)moonRockA.setMatrixAt(ra++,rockObj.matrix);else moonRockB.setMatrixAt(rb++,rockObj.matrix)
 }
 moonRockA.count=ra;moonRockB.count=rb;moonRockA.instanceMatrix.needsUpdate=true;moonRockB.instanceMatrix.needsUpdate=true;
 moonRockA.castShadow=true;moonRockB.castShadow=true;g.add(moonRockA,moonRockB);

 // Distant lunar points of interest: relay wreck, abandoned drill and cave mouth.
 const wreckMat=new T.MeshStandardMaterial({color:0x51585c,roughness:.55,metalness:.65});
 for(const [x,z,rot] of[[215,118,.35],[-265,-140,-.7]]){
   const wreck=new T.Group();
   const core=new T.Mesh(new T.BoxGeometry(7,2.6,3.4),wreckMat);core.rotation.z=.18;wreck.add(core);
   const wing=new T.Mesh(new T.BoxGeometry(11,.35,2.2),wreckMat);wing.position.set(0,.2,0);wing.rotation.y=.35;wreck.add(wing);
   wreck.position.set(x,moonH(x,z)+1.4,z);wreck.rotation.y=rot;g.add(wreck)
 }
 const caveX=-330,caveZ=205,caveY=moonH(caveX,caveZ);
 const cave=new T.Mesh(new T.TorusGeometry(10,3.2,10,20,Math.PI),new T.MeshStandardMaterial({color:0x343434,roughness:1}));
 cave.rotation.x=Math.PI/2;cave.rotation.z=Math.PI;cave.position.set(caveX,caveY+3.1,caveZ);g.add(cave);
 let caveDark=new T.Mesh(new T.CircleGeometry(7,20),new T.MeshBasicMaterial({color:0x020202}));caveDark.position.set(caveX,caveY+3,caveZ+.35);caveDark.rotation.x=-Math.PI/2;g.add(caveDark);
 addTownInteraction('moonSite',215,118,'INSPECT CRASHED RELAY',{realm:'moon',site:'relay'});
 addTownInteraction('moonSite',-265,-140,'INSPECT ABANDONED DRILL',{realm:'moon',site:'drill'});
 addTownInteraction('moonSite',caveX,caveZ,'EXPLORE CAVE MOUTH',{realm:'moon',site:'cave'});
 makeLootCache(g,'moon_cache_relay',222,121,'moon');
 makeLootCache(g,'moon_cache_drill',-258,-144,'moon');
 makeLootCache(g,'moon_cache_cave',-320,198,'moon');

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
const lightProbe=new T.Vector3(),shadowProbe=new T.Vector3();let lightUpdateAt=0,shadowCullAt=0;
function updateManagedLights(day){
 const now=performance.now();if(now-lightUpdateAt<220)return;lightUpdateAt=now;
 const dark=moonMode?1:T.MathUtils.clamp(1-day+.08,0,1);
 for(const l of managedLights){
   const owner=l.userData.owner;
   if(!owner||!owner.visible||!l.parent){l.visible=false;continue}
   l.getWorldPosition(lightProbe);
   const py=activeVehicle&&activeVehicle.kind==='ufo'?activeVehicle.worldY:H(player.x,player.z)+1.7;
   const d=Math.hypot(lightProbe.x-player.x,lightProbe.y-py,lightProbe.z-player.z);
   const beamBoost=l.userData.vehicleLight&&world.vehicleUpgrades.lights?1.55:1,
         max=(l.userData.maxDistance||85)*(l.userData.vehicleLight&&world.vehicleUpgrades.lights?1.35:1),
         on=d<max&&dark>.08;
   l.visible=on;if(on)l.intensity=(l.userData.baseIntensity||1)*dark*beamBoost
 }
}
function updateShadowCasters(){
 const now=performance.now();if(now-shadowCullAt<(IS_MOBILE?750:500))return;shadowCullAt=now;
 const px=player.x,pz=player.z,maxDist=IS_MOBILE?52:72;
 scene.traverse(o=>{
   if(!o.isMesh)return;
   if(o.userData.shadowCandidate===undefined)o.userData.shadowCandidate=!!o.castShadow;
   if(o.isInstancedMesh){if(o.userData.shadowCandidate)o.castShadow=!IS_MOBILE;return}
   if(!o.userData.shadowCandidate)return;
   o.getWorldPosition(shadowProbe);
   o.castShadow=o.visible&&Math.abs(shadowProbe.x-px)<maxDist&&Math.abs(shadowProbe.z-pz)<maxDist
 })
}

function createChunk(cx,cz){
 let k=key(cx,cz),d=descriptor(cx,cz),root=new T.Group(),near=new T.Group(),far=new T.Group();

 // Only explored/meaningfully changed chunks are persisted. Unvisited far
 // scenery remains deterministic from the world seed instead of bloating localStorage.
 // Existing persisted chunks are still respected, preserving old saves exactly.
 if(world.saved[k])d=world.saved[k];

 // Keep one terrain mesh per chunk for both LOD modes. This preserves
 // identical ground topology while avoiding two full terrain meshes per chunk.
 const ground=terrain(cx,cz,20);root.add(ground);
 // Far chunks build only their cheap representation. Detailed vegetation,
 // landmarks and anomaly geometry are created lazily when the chunk becomes near.
 addFarTrees(far,d,cx,cz);
 root.add(near,far);near.visible=false;far.visible=false;scene.add(root);
 let c={cx,cz,k,d,root,near,far,ground,mode:'none',agents:[],anomaly:null,nearBuilt:false,lastUsed:performance.now()};
 chunks.set(k,c);return c;
}

function ensureNearBuilt(c){
 if(c.nearBuilt)return;
 addNearNature(c.near,c.d,c.cx,c.cz);
 if(c.d.mark){c.near.add(landmarkModel(c.cx,c.cz,c.d.mark));addTrail(c.near,c.cx,c.cz,c.d)}
 if(c.d.anomaly){c.anomaly=anomalyModel(c.d.anomaly,c.cx,c.cz);c.near.add(c.anomaly)}
 c.nearBuilt=true
}
const nearBuildQueue=[],nearBuildPending=new Set();let nearBuildAt=0;
function queueNearBuild(c){
 if(c.nearBuilt||nearBuildPending.has(c.k))return;
 nearBuildPending.add(c.k);nearBuildQueue.push(c)
}
function processNearBuildQueue(){
 const now=performance.now();if(now-nearBuildAt<(IS_MOBILE?70:45)||!nearBuildQueue.length)return;nearBuildAt=now;
 const c=nearBuildQueue.shift();nearBuildPending.delete(c.k);
 if(c.mode!=='near'||chunks.get(c.k)!==c)return;
 ensureNearBuilt(c);c.near.visible=true;c.far.visible=false;queueAnimalLoad(c)
}
const animalLoadQueue=[],animalLoadPending=new Set();let animalLoadAt=0;
function queueAnimalLoad(c){
 if(c.agents.length||animalLoadPending.has(c.k))return;
 animalLoadPending.add(c.k);animalLoadQueue.push(c)
}
function processAnimalLoadQueue(){
 const now=performance.now();if(now-animalLoadAt<90||!animalLoadQueue.length)return;animalLoadAt=now;
 const c=animalLoadQueue.shift();animalLoadPending.delete(c.k);
 if(c.mode==='near'&&chunks.get(c.k)===c)loadAnimals(c)
}
function loadAnimals(c){
 if(c.agents.length)return;
 let saved=world.animalState[c.k]||[];
 c.d.animals.forEach((q,i)=>{
   let st=saved[i],x=st?st.x:c.cx*CH+q[0],z=st?st.z:c.cz*CH+q[1],dir=st?st.dir:hash(c.cx*9+i,c.cz*7-i,200)*Math.PI*2;
   let g=animalModel(q[2]);g.position.set(x,H(x,z),z);scene.add(g);
   let a={chunk:c.k,index:i,kind:q[2],group:g,x,z,homeX:c.cx*CH+q[0],homeZ:c.cz*CH+q[1],dir,target:dir,speed:q[2]==='fox'?1.35:q[2]==='wolf'?1.2:q[2]==='deer'?1.0:0.72,stateT:2+hash(c.cx+i,c.cz-i,201)*5,phase:hash(c.cx-i,c.cz+i,202)*6.28,hp:q[2]==='boar'?4:q[2]==='wolf'?3:2,fear:0};
   c.agents.push(a);animalAgents.push(a);
 });
}
function unloadAnimals(c){
 if(!c.agents.length)return;
 world.animalState[c.k]=c.agents.map(a=>({x:+a.x.toFixed(2),z:+a.z.toFixed(2),dir:+a.dir.toFixed(3)}));
 for(const a of c.agents){scene.remove(a.group);disposeObjectTree(a.group);let ix=animalAgents.indexOf(a);if(ix>=0)animalAgents.splice(ix,1)}
 c.agents.length=0;
}

function setMode(c,mode){
 c.lastUsed=performance.now();
 if(c.mode===mode)return;
 c.mode=mode;
 c.ground.visible=mode!=='none';c.ground.receiveShadow=mode==='near';
 if(mode==='near'){
   if(c.nearBuilt){c.near.visible=true;c.far.visible=false;queueAnimalLoad(c)}
   else{c.near.visible=false;c.far.visible=true;queueNearBuild(c)}
 }else if(mode==='far'){
   c.near.visible=false;c.far.visible=true;unloadAnimals(c)
 }else{
   c.near.visible=false;c.far.visible=false;unloadAnimals(c)
 }
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
function insideDoorway(list,x,z,radius=.6){
 return list.some(d=>Math.abs(x-d.x)<d.hx+radius*.25&&Math.abs(z-d.z)<d.hz+radius*.25)
}
function blocked(x,z,radius=0.6,ignoreVehicle=null){
 if(moonMode){
   if(!insideDoorway(moonDoorways,x,z,radius)&&colliderListBlocked(moonColliders,x,z,radius))return true
 }else{
   if(colliderListBlocked(colliders,x,z,radius))return true;
   if(!insideDoorway(cityDoorways,x,z,radius)&&colliderListBlocked(cityColliders,x,z,radius))return true;
   if(!insideDoorway(startDoorways,x,z,radius)&&colliderListBlocked(startColliders,x,z,radius))return true;
   if(colliderListBlocked(buildColliders,x,z,radius))return true
 }
 for(const v of vehicles){
   if(v===activeVehicle||v===ignoreVehicle)continue;
   if(moonMode?(v.realm!=='moon'):(v.realm==='moon'))continue;
   let dx=x-v.x,dz=z-v.z,rr=(v.kind==='mek'?2.7:v.kind==='jet'?3.2:v.kind==='heli'?2.4:1.5)+radius;
   if(dx*dx+dz*dz<rr*rr)return true
 }
 return false
}

function queueFar(cx,cz,target='far'){
 let k=key(cx,cz);if(chunks.has(k)||farPending.has(k))return;
 farPending.add(k);farQueue.push({cx,cz,k,target,generation:syncGeneration});
}
let farBuildAt=0;
function processFarQueue(){
 const now=performance.now();if(now-farBuildAt<55||!farQueue.length)return;farBuildAt=now;
 let cc=chunkOf(player.x,player.z),job=farQueue.shift();farPending.delete(job.k);
 if(job.generation!==syncGeneration)return;
 if(chunks.has(job.k))return;
 let dx=Math.abs(job.cx-cc.cx),dz=Math.abs(job.cz-cc.cz),dist=Math.max(dx,dz);
 if(dist>FAR)return;
 if(job.target==='near'&&dist<=NEAR){let c=createChunk(job.cx,job.cz);setMode(c,'near');return}
 if(dist<=NEAR)return;
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
     nearSet.add(k);
     let c=chunks.get(k);
     if(c)setMode(c,'near');
     else if(dx===0&&dz===0){c=createChunk(cx,cz);setMode(c,'near')}
     else queueFar(cx,cz,'near');
   }else{
     let c=chunks.get(k);if(c)setMode(c,'far');else queueFar(cx,cz,'far');
   }
 }

 for(const [k,c] of chunks){
   let dx=Math.abs(c.cx-cc.cx),dz=Math.abs(c.cz-cc.cz);
   if(dx>CACHE||dz>CACHE){
     unloadAnimals(c);scene.remove(c.root);disposeObjectTree(c.root);chunks.delete(k);
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
   a.stateT-=dt;a.fear=Math.max(0,(a.fear||0)-dt);
   let pd=Math.hypot(player.x-a.x,player.z-a.z),mult=1,focus=null;
   if(a.fear>0){
     a.target=Math.atan2(a.x-player.x,a.z-player.z);a.stateT=2.4;mult=2.05;
   }else if(pd<9&&!activeVehicle&&a.kind==='wolf'){
     a.target=Math.atan2(player.x-a.x,player.z-a.z);a.stateT=1.8;mult=pd<3?1.6:1.25;
   }else if(pd<4.5&&!activeVehicle&&a.kind==='boar'){
     a.target=Math.atan2(player.x-a.x,player.z-a.z);a.stateT=1.3;mult=1.7;
   }else if(pd<7){
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
   if(a.group.userData.tail)a.group.userData.tail.rotation.z=.12+Math.sin(t*3.2+a.phase)*.16;
   if(a.group.userData.head)a.group.userData.head.rotation.y=Math.sin(t*.7+a.phase)*.08;
   a.group.position.y+=Math.abs(Math.sin(t*6.4*Math.max(0.7,speed)+a.phase))*0.026;
 }
}

function updateTownHumans(t){
 for(const h of townHumans){
   const u=h.userData,p=u.phase||0,dt=.033;
   const d=Math.hypot(player.x-h.position.x,player.z-h.position.z);
   let walking=false;
   if(u.wander&&d>4.5){
     u.moveT-=dt;
     if(u.moveT<=0||Math.hypot(h.position.x-u.targetX,h.position.z-u.targetZ)<.6){
       const a=Math.random()*Math.PI*2,r=4+Math.random()*9;
       u.targetX=T.MathUtils.clamp(u.homeX+Math.sin(a)*r,-184,-70);
       u.targetZ=T.MathUtils.clamp(u.homeZ+Math.cos(a)*r,-55,60);
       u.moveT=4+Math.random()*8
     }
     const ang=Math.atan2(u.targetX-h.position.x,u.targetZ-h.position.z),nx=h.position.x+Math.sin(ang)*.45*dt,nz=h.position.z+Math.cos(ang)*.45*dt;
     if(!blocked(nx,nz,.35)){h.position.x=nx;h.position.z=nz;walking=true;let dif=((ang-h.rotation.y+Math.PI*3)%(Math.PI*2))-Math.PI;h.rotation.y+=T.MathUtils.clamp(dif,-dt*2.2,dt*2.2)}
   }
   h.position.y=H(h.position.x,h.position.z)+Math.sin(t*1.35+p)*.012;
   if(u.arms){
     const sw=walking?Math.sin(t*5+p)*.38:Math.sin(t*.75+p)*.045;
     u.arms[0].rotation.x=sw;u.arms[1].rotation.x=-sw
   }
   if(u.legs){
     const sw=walking?Math.sin(t*5+p)*.42:Math.sin(t*.65+p)*.018;
     u.legs[0].rotation.x=-sw;u.legs[1].rotation.x=sw
   }
   if(d<6){
     const target=Math.atan2(player.x-h.position.x,player.z-h.position.z);
     let dif=((target-h.rotation.y+Math.PI*3)%(Math.PI*2))-Math.PI;
     h.rotation.y+=T.MathUtils.clamp(dif,-.035,.035)
   }
   if(u.interaction){u.interaction.x=h.position.x;u.interaction.z=h.position.z}
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

let move={x:0,y:0},look={x:0,y:0},sprinting=false,flightThrottle=0,lookSensitivity=T.MathUtils.clamp(world.ui.lookSensitivity||1,.55,1.8),sitting=null,playerJumpY=0,playerJumpV=0;
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
$('jump').addEventListener('pointerdown',()=>{if(!activeVehicle&&!sitting&&playerJumpY<=0.02){playerJumpV=5.5;playerJumpY=.03}});
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
 if(activeVehicle)return null;
 let best=null,bd=3.1;
 for(const a of townInteractions){
   const realm=a.realm||'earth';if(moonMode?(realm!=='moon'):(realm==='moon'))continue;
   if(a.resourceId&&world.resourceGathered[a.resourceId])continue;
   if(a.lootId&&world.lootOpened[a.lootId])continue;
   let d=Math.hypot(player.x-a.x,player.z-a.z);
   if(d<bd){bd=d;best=a}
 }
 return best
}
function refreshUse(){
 document.body.classList.toggle('vehicleMode',!!activeVehicle);
 let b=$('use'),fc=$('flightControls'),mine=$('mine'),pickup=$('pickup'),town=$('townAction'),jump=$('jump'),tool=$('toolAction'),equip=$('equippedTool');
 if(activeVehicle){
   pickup.classList.add('hidden');town.classList.add('hidden');jump.classList.add('hidden');tool.classList.add('hidden');equip.classList.add('hidden');toolView.visible=false;
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
 fc.classList.add('hidden');mine.classList.add('hidden');$('sprint').classList.remove('hidden');$('sprint').textContent='SPRINT';jump.classList.toggle('hidden',!!sitting);toolView.visible=!!world.equippedTool&&!sitting;equip.classList.toggle('hidden',!world.equippedTool);if(world.equippedTool)$('equippedToolName').textContent=world.equippedTool.toUpperCase();
 if(sitting){town.classList.remove('hidden');town.textContent='STAND UP'}else{
   let a=nearestTownInteraction();town.classList.toggle('hidden',!a);if(a)town.textContent=a.label;
 }
 let item=nearestCollectible();pickup.classList.toggle('hidden',!item);if(item)pickup.textContent='PICK UP '+item.name.toUpperCase();
 if(world.equippedTool&&!sitting){
   tool.classList.remove('hidden');
   const a=nearestTownInteraction();
   if(a&&a.type==='resource'){
     const need=a.resourceType==='Wood'?'Basic Hatchet':a.resourceType==='Stone'?'Heavy Pickaxe':'Salvage Wrench';
     tool.textContent=world.equippedTool===need?'USE '+world.equippedTool.toUpperCase():'NEED '+need.toUpperCase()
   }else if(world.equippedTool==='Field Flashlight')tool.textContent=toolLight.intensity>0?'FLASHLIGHT OFF':'FLASHLIGHT ON';
   else if(world.equippedTool==='Geology Scanner')tool.textContent='SCAN AREA';
   else if(world.equippedTool==='Repair Kit')tool.textContent='USE REPAIR KIT';
   else tool.textContent='USE '+world.equippedTool.toUpperCase()
 }else tool.classList.add('hidden');
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
const equippableTools=new Set(['Field Flashlight','Basic Hatchet','Heavy Pickaxe','Salvage Wrench','Geology Scanner','Repair Kit']);
const toolView=new T.Group();camera.add(toolView);scene.add(camera);let toolSwing=0;
const toolLight=new T.SpotLight(0xf2f7ff,0,70,Math.PI/7,.45,1.4);toolLight.position.set(.22,-.18,-.4);toolLight.target.position.set(0,-.1,-10);camera.add(toolLight,toolLight.target);
function rebuildToolView(){
 while(toolView.children.length)toolView.remove(toolView.children[0]);
 const name=world.equippedTool;if(!name||!equippableTools.has(name))return;
 const metal=new T.MeshStandardMaterial({color:0x5c6469,roughness:.45,metalness:.65}),wood=new T.MeshStandardMaterial({color:0x6e4c31,roughness:.82}),dark=new T.MeshStandardMaterial({color:0x24282b,roughness:.7,metalness:.4});
 if(name==='Basic Hatchet'){
   let h=new T.Mesh(new T.CylinderGeometry(.035,.045,.75,8),wood);h.rotation.z=Math.PI/5;let head=new T.Mesh(new T.BoxGeometry(.28,.16,.08),metal);head.position.set(.2,.27,0);head.rotation.z=Math.PI/5;toolView.add(h,head)
 }else if(name==='Heavy Pickaxe'){
   let h=new T.Mesh(new T.CylinderGeometry(.035,.05,.85,8),wood);h.rotation.z=Math.PI/5;let head=new T.Mesh(new T.BoxGeometry(.48,.08,.08),metal);head.position.set(.2,.32,0);head.rotation.z=Math.PI/5;toolView.add(h,head)
 }else if(name==='Salvage Wrench'){
   let h=new T.Mesh(new T.BoxGeometry(.09,.65,.07),metal);h.rotation.z=.35;let jaw=new T.Mesh(new T.TorusGeometry(.13,.04,6,10,Math.PI*1.35),metal);jaw.position.set(.15,.29,0);jaw.rotation.z=-.4;toolView.add(h,jaw)
 }else if(name==='Field Flashlight'){
   let b=new T.Mesh(new T.CylinderGeometry(.08,.1,.42,10),dark);b.rotation.z=Math.PI/2;toolView.add(b)
 }else if(name==='Geology Scanner'){
   let b=new T.Mesh(new T.BoxGeometry(.34,.48,.12),dark);let s=new T.Mesh(new T.PlaneGeometry(.24,.18),new T.MeshBasicMaterial({color:0x63d9ff}));s.position.set(0,.05,-.065);toolView.add(b,s)
 }else if(name==='Repair Kit'){
   let b=new T.Mesh(new T.BoxGeometry(.38,.28,.16),new T.MeshStandardMaterial({color:0x8c2f2a,roughness:.55,metalness:.2}));toolView.add(b)
 }
 toolView.position.set(.42,-.34,-.78);toolView.rotation.set(-.1,.15,-.25)
}
function setEquippedTool(name){
 if(name&&inventoryQty(name)<1)return;
 world.equippedTool=name||null;
 if(!name)toolLight.intensity=0;
 rebuildToolView();persist();renderInventory();refreshUse();
 toast(name?name+' equipped':'Tool unequipped')
}
function missionProgress(cur,max,label=''){
 cur=Math.max(0,Math.min(max,cur));return{cur,max,label:label||cur+' / '+max,pct:max?Math.round(cur/max*100):100}
}
const missions=[
 {title:'Getting Equipped',desc:'Own a Basic Hatchet and Heavy Pickaxe.',reward:80,xp:100,done:()=>inventoryQty('Basic Hatchet')>0&&inventoryQty('Heavy Pickaxe')>0,progress:()=>missionProgress((inventoryQty('Basic Hatchet')>0?1:0)+(inventoryQty('Heavy Pickaxe')>0?1:0),2)},
 {title:'Gathering Ground',desc:'Collect at least 4 Wood, 4 Stone and 3 Scrap.',reward:120,xp:140,done:()=>inventoryQty('Wood')>=4&&inventoryQty('Stone')>=4&&inventoryQty('Scrap')>=3,progress:()=>missionProgress(Math.min(4,inventoryQty('Wood'))+Math.min(4,inventoryQty('Stone'))+Math.min(3,inventoryQty('Scrap')),11)},
 {title:'Make It Yours',desc:'Place your first persistent structure.',reward:140,xp:160,done:()=>world.builds.length>0,progress:()=>missionProgress(Math.min(1,world.builds.length),1)},
 {title:'Unknown Signal',desc:'Discover one anomaly in the wilderness.',reward:180,xp:220,done:()=>Object.keys(world.discoveries).length>0,progress:()=>missionProgress(Math.min(1,Object.keys(world.discoveries).length),1)},
 {title:'Moonbound',desc:'Reach the lunar surface.',reward:250,xp:300,done:()=>!!world.progress.reachedMoon,progress:()=>missionProgress(world.progress.reachedMoon?1:0,1)},
 {title:'Lunar Extraction',desc:'Extract at least 3 pieces of Lunar Ore.',reward:300,xp:360,done:()=>world.moonOre>=3,progress:()=>missionProgress(Math.min(3,world.moonOre||0),3)},
 {title:'Return From Beyond',desc:'Bring lunar material back to Earth.',reward:450,xp:500,done:()=>!!world.progress.reachedMoon&&!moonMode&&inventoryQty('Lunar Ore')>0,progress:()=>missionProgress(world.progress.reachedMoon&&!moonMode&&inventoryQty('Lunar Ore')>0?1:0,1)},
 {title:'Community Contract',desc:'Speak with three different residents in West Town.',reward:180,xp:220,done:()=>world.gameStats.npcTalks>=3,progress:()=>missionProgress(world.gameStats.npcTalks,3)},
 {title:'Scavenger Route',desc:'Recover three supply caches from the frontier.',reward:220,xp:260,done:()=>world.gameStats.caches>=3,progress:()=>missionProgress(world.gameStats.caches,3)},
 {title:'Field Engineer',desc:'Craft three items and establish three structures.',reward:260,xp:320,done:()=>world.gameStats.crafted>=3&&world.builds.length>=3,progress:()=>{const a=Math.min(3,world.gameStats.crafted),b=Math.min(3,world.builds.length);return missionProgress(a+b,6,a+'/3 crafted • '+b+'/3 built')}},
 {title:'Motor Pool',desc:'Purchase two permanent vehicle upgrades.',reward:300,xp:360,done:()=>world.gameStats.upgrades>=2,progress:()=>missionProgress(world.gameStats.upgrades,2)},
 {title:'Earth Survey',desc:'Inspect both major Earth field sites.',reward:280,xp:340,done:()=>world.gameStats.pois>=2,progress:()=>missionProgress(world.gameStats.pois,2)},
 {title:'Lunar Cartographer',desc:'Log all three major lunar sites.',reward:500,xp:600,done:()=>world.gameStats.moonSites>=3,progress:()=>missionProgress(world.gameStats.moonSites,3)},
 {title:'Frontier Veteran',desc:'Explore at least 25 distinct regions.',reward:600,xp:750,done:()=>exploredCount>=25,progress:()=>missionProgress(exploredCount,25)}
];
function updateLevel(){
 const p=world.progress;p.level=1+Math.floor(p.xp/300)
}
let missionBannerTimer=0;
function showMissionBanner(m){
 const e=$('missionBanner');$('missionBannerTitle').textContent=m.title;$('missionBannerReward').textContent='+'+m.xp+' XP • +'+m.reward+' credits';
 e.classList.remove('hidden');clearTimeout(missionBannerTimer);missionBannerTimer=setTimeout(()=>e.classList.add('hidden'),2600);
 sfx(640,.12,.08,'triangle');setTimeout(()=>sfx(880,.18,.06,'sine'),120)
}
function completeMission(i){
 const p=world.progress;if(p.completed.includes(i))return;
 const oldLevel=p.level||1;
 p.completed.push(i);p.mission=Math.max(p.mission,i+1);p.xp+=missions[i].xp;p.reputation+=1;world.credits+=missions[i].reward;updateLevel();persist();
 showMissionBanner(missions[i]);
 if(p.level>oldLevel)setTimeout(()=>toast('LEVEL '+p.level+' • stamina recovery improved'),600)
}
let missionCheckAt=0;
function checkMissions(force=false){
 const now=performance.now();if(!force&&now-missionCheckAt<500)return;missionCheckAt=now;
 const p=world.progress,idx=missions.findIndex((m,i)=>!p.completed.includes(i));
 if(idx>=0&&missions[idx].done())completeMission(idx);
 const next=missions.findIndex((m,i)=>!p.completed.includes(i));
 if(next<0){
   $('objectiveName').textContent='FRONTIER COMPLETE';$('objectiveText').textContent='Campaign complete — continue building your frontier.';$('objectiveMiniProgress').firstElementChild.style.width='100%'
 }else{
   const pr=missions[next].progress?missions[next].progress():null;
   $('objectiveName').textContent=missions[next].title.toUpperCase();
   $('objectiveText').textContent=missions[next].desc+(pr&&pr.max>1?' • '+pr.label:'');
   $('objectiveMiniProgress').firstElementChild.style.width=(pr?pr.pct:0)+'%'
 }
}
function renderMissions(){
 updateLevel();
 const p=world.progress,$s=$('progressSummary'),list=$('missionList');
 const discount=Math.min(12,p.reputation*2);
 $s.textContent='LEVEL '+p.level+' • '+p.xp+' XP • '+p.reputation+' reputation • '+Math.floor(world.credits)+' credits • '+discount+'% town discount';
 list.innerHTML='';
 const activeIndex=missions.findIndex((q,j)=>!p.completed.includes(j));
 missions.forEach((m,i)=>{
   const done=p.completed.includes(i),active=!done&&i===activeIndex,pr=m.progress?m.progress():missionProgress(done?1:0,1);
   const row=document.createElement('div');row.className='missionRow '+(done?'done':active?'active':'');
   row.innerHTML='<strong>'+(done?'✓ ':active?'▶ ':'')+m.title+'</strong><small>'+m.desc+(active&&pr.label?' • '+pr.label:'')+'</small><div class="missionProgress"><i style="width:'+(done?100:pr.pct)+'%"></i></div><div class="missionReward">'+m.reward+' credits • '+m.xp+' XP</div>';
   list.appendChild(row)
 });
 const sites=Object.keys(world.progress.earthSites||{}).length,moonSites=Object.keys(world.progress.moonSites||{}).length;
 $('discoverySummary').innerHTML='<div class="journalGrid">'+
   '<div class="journalCard"><span>REGIONS</span><b>'+exploredCount+'</b></div>'+
   '<div class="journalCard"><span>ANOMALIES</span><b>'+Object.keys(world.discoveries).length+'</b></div>'+
   '<div class="journalCard"><span>EARTH SITES</span><b>'+sites+' / 2</b></div>'+
   '<div class="journalCard"><span>LUNAR SITES</span><b>'+moonSites+' / 3</b></div>'+
   '<div class="journalCard"><span>CACHES</span><b>'+world.gameStats.caches+'</b></div>'+
   '<div class="journalCard"><span>STRUCTURES</span><b>'+world.builds.length+'</b></div>'+
   '<div class="journalCard journalWide"><span>FRONTIER STATUS</span><b>'+(p.completed.length>=missions.length?'VETERAN EXPLORER':p.level>=6?'DEEP FRONTIER':p.level>=3?'FIELD OPERATIVE':'ROOKIE EXPLORER')+'</b></div></div>'
}
$('missionsBtn').onclick=()=>{const p=$('missionsPanel'),open=p.classList.contains('hidden');closeSidePanels(open?'missionsPanel':null);p.classList.toggle('hidden',!open);if(open)renderMissions()};
$('missionsClose').onclick=()=>$('missionsPanel').classList.add('hidden');
function renderInventory(){
 const list=$('inventoryList'),items=inventoryCounts();list.innerHTML='';
 const keys=Object.keys(items);
 if(!keys.length){list.innerHTML='<div class="invRow"><span>Empty</span><b>0</b></div>';return}
 for(const k of keys){
   const row=document.createElement('div');row.className='invRow';
   const left=document.createElement('span');left.textContent=k;
   const right=document.createElement('div');right.style.display='flex';right.style.gap='6px';right.style.alignItems='center';
   const count=document.createElement('b');count.textContent=items[k];right.appendChild(count);
   if(equippableTools.has(k)){
     const btn=document.createElement('button');btn.textContent=world.equippedTool===k?'UNEQUIP':'EQUIP';
     btn.style.cssText='border:1px solid #ffffff22;background:#234334;color:#fff;border-radius:8px;padding:6px 8px;font-size:9px;font-weight:900';
     btn.onclick=()=>setEquippedTool(world.equippedTool===k?null:k);right.appendChild(btn)
   }else if(k==='Trail Rations'||k==='Med Kit'){
     const btn=document.createElement('button');btn.textContent='USE';btn.style.cssText='border:1px solid #ffffff22;background:#31445a;color:#fff;border-radius:8px;padding:6px 8px;font-size:9px;font-weight:900';
     btn.onclick=()=>{
       if(k==='Trail Rations'){world.playerStats.energy=Math.min(100,world.playerStats.energy+35);consumeItem(k,1);toast('Energy restored')}
       else{world.playerStats.health=Math.min(100,world.playerStats.health+45);consumeItem(k,1);toast('Health restored')}
       persist();renderInventory()
     };right.appendChild(btn)
   }
   row.append(left,right);list.appendChild(row)
 }
}
rebuildToolView();
function closeSidePanels(except=null){
 for(const id of['missionsPanel','inventoryPanel','craftPanel','shopPanel','worldPanel'])if(id!==except)$(id).classList.add('hidden')
}
$('inventoryBtn').onclick=()=>{const p=$('inventoryPanel'),open=p.classList.contains('hidden');closeSidePanels(open?'inventoryPanel':null);p.classList.toggle('hidden',!open);if(open)renderInventory()};
$('inventoryClose').onclick=()=>$('inventoryPanel').classList.add('hidden');

const craftRecipes=[
 {name:'Lunar Alloy Plate',needs:{'Lunar Ore':3},out:'Lunar Alloy Plate'},
 {name:'Impact Lens',needs:{'Impact Glass':1,'Regolith Sample':1},out:'Impact Lens'},
 {name:'Field Repair Kit',needs:{'Lunar Rock':1,'Regolith Sample':1},out:'Field Repair Kit'},
 {name:'Wood Wall Kit',needs:{Wood:4,Scrap:1},out:'Wood Wall Kit'},
 {name:'Foundation Kit',needs:{Stone:4,Wood:2},out:'Foundation Kit'},
 {name:'Camp Light Kit',needs:{Scrap:3,'Impact Glass':1},out:'Camp Light Kit'},
 {name:'Workbench Kit',needs:{Wood:5,Scrap:3,Stone:2},out:'Workbench Kit'},
 {name:'Field Shelter Kit',needs:{Wood:8,Scrap:3,'Wildlife Hide':2},out:'Field Shelter Kit'},
 {name:'Signal Beacon Kit',needs:{Scrap:5,'Impact Glass':1,'Lunar Alloy Plate':1},out:'Signal Beacon Kit'}
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
const buildKits=[
 {item:'Wood Wall Kit',type:'Wood Wall'},
 {item:'Foundation Kit',type:'Foundation'},
 {item:'Camp Light Kit',type:'Camp Light'},
 {item:'Workbench Kit',type:'Workbench'},
 {item:'Field Shelter Kit',type:'Field Shelter'},
 {item:'Signal Beacon Kit',type:'Signal Beacon'}
];
let buildMode=null,buildGhost=null;
function ghostFor(type){
 const g=new T.Group(),mat=new T.MeshBasicMaterial({color:0x8fe6c1,transparent:true,opacity:.38,depthWrite:false,wireframe:false});
 if(type==='Wood Wall')g.add(new T.Mesh(new T.BoxGeometry(5,2.7,.28),mat));
 else if(type==='Foundation')g.add(new T.Mesh(new T.BoxGeometry(5,.3,5),mat));
 else if(type==='Camp Light'){let p=new T.Mesh(new T.CylinderGeometry(.08,.1,3,8),mat);p.position.y=1.5;g.add(p)}
 else if(type==='Workbench'){let t=new T.Mesh(new T.BoxGeometry(3,.25,1.2),mat);t.position.y=1.05;g.add(t)}
 else if(type==='Field Shelter'){let f=new T.Mesh(new T.BoxGeometry(4.8,.18,4.2),mat);f.position.y=.1;let r=new T.Mesh(new T.ConeGeometry(3.2,2.8,4),mat);r.position.y=1.55;r.rotation.y=Math.PI/4;g.add(f,r)}
 else{let p=new T.Mesh(new T.CylinderGeometry(.08,.12,4.8,8),mat);p.position.y=2.4;g.add(p)}
 return g
}
function cancelBuild(){
 if(buildGhost){scene.remove(buildGhost);buildGhost=null}
 buildMode=null;$('buildModeHud').classList.add('hidden')
}
function beginBuild(type,item){
 if(moonMode||activeVehicle){toast('Build on foot on Earth');return}
 if(inventoryQty(item)<1){toast('You need '+item);return}
 cancelBuild();buildMode={type,item,yaw:player.yaw};buildGhost=ghostFor(type);scene.add(buildGhost);
 $('buildModeName').textContent=type.toUpperCase();$('buildModeHud').classList.remove('hidden');closeSidePanels()
}
function updateBuildGhost(){
 if(!buildMode||!buildGhost)return;
 const dist=5.2,x=player.x-Math.sin(player.yaw)*dist,z=player.z-Math.cos(player.yaw)*dist,y=H(x,z);
 buildMode.x=x;buildMode.z=z;buildGhost.position.set(x,y,z);buildGhost.rotation.y=buildMode.yaw;
 const valid=!blocked(x,z,1.4)&&slopeAt(x,z)<=2.2;
 buildMode.valid=valid;buildGhost.children.forEach(m=>{if(m.material)m.material.color.set(valid?0x8fe6c1:0xff6f6f)})
}
function confirmBuild(){
 if(!buildMode)return;if(!buildMode.valid){toast('Cannot build there');return}
 if(inventoryQty(buildMode.item)<1){toast('Build kit missing');cancelBuild();return}
 consumeItem(buildMode.item,1);makeBuildPiece({type:buildMode.type,x:buildMode.x,z:buildMode.z,yaw:buildMode.yaw},true);
 toast(buildMode.type+' placed');cancelBuild();renderInventory();renderCrafting();checkMissions()
}
$('buildRotate').onclick=()=>{if(buildMode){buildMode.yaw+=Math.PI/2;updateBuildGhost()}};
$('buildConfirm').onclick=confirmBuild;$('buildCancel').onclick=cancelBuild;
function renderBuildList(){
 const list=$('buildList');list.innerHTML='';
 for(const bld of buildKits){
   const row=document.createElement('div');row.className='craftRow';
   row.innerHTML='<div><strong>'+bld.type+'</strong><small>'+inventoryQty(bld.item)+' kit(s) available</small></div>';
   const b=document.createElement('button');b.textContent='PLACE';b.disabled=inventoryQty(bld.item)<1;
   b.onclick=()=>beginBuild(bld.type,bld.item);row.appendChild(b);list.appendChild(row)
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
     world.inventory[r.out]=(world.inventory[r.out]||0)+1;world.gameStats.crafted++;
     persist();renderInventory();renderCrafting();checkMissions(true);sfx(430,.08,.05,'triangle');toast(r.name+' crafted')
   };
   row.appendChild(b);list.appendChild(row)
 }
 renderBuildList()
}
$('craftBtn').onclick=()=>{const p=$('craftPanel'),open=p.classList.contains('hidden');closeSidePanels(open?'craftPanel':null);p.classList.toggle('hidden',!open);if(open)renderCrafting()};
$('craftClose').onclick=()=>$('craftPanel').classList.add('hidden');

const shopBuy=[
 {name:'Field Flashlight',price:35,desc:'Portable exploration light'},
 {name:'Basic Hatchet',price:25,desc:'Harvest timber from resource piles'},
 {name:'Heavy Pickaxe',price:60,desc:'Mine stone and mineral resources'},
 {name:'Salvage Wrench',price:40,desc:'Recover useful scrap'},
 {name:'Geology Scanner',price:90,desc:'Survey equipment'},
 {name:'Repair Kit',price:45,desc:'Vehicle repair equipment'},
 {name:'Med Kit',price:35,desc:'Restore player health'},
 {name:'Trail Rations',price:12,desc:'Restore energy'},
 {name:'Ground Engine Tune',price:140,desc:'Permanent buggy / moon buggy speed upgrade',upgrade:'ground'},
 {name:'Flight Control Package',price:220,desc:'Permanent aircraft response upgrade',upgrade:'flight'},
 {name:'High-Beam Lighting',price:90,desc:'Permanent vehicle lighting upgrade',upgrade:'lights'}
];
const sellPrices={Wood:3,Stone:4,Scrap:6,'Lunar Ore':18,'Lunar Rock':8,'Regolith Sample':12,'Impact Glass':30,'Lunar Alloy Plate':42,'Impact Lens':55,'Wood Wall Kit':16,'Foundation Kit':20,'Workbench Kit':35};
let shopMode='buy';
function addInventoryItem(name,count=1){world.inventory[name]=(Number(world.inventory[name])||0)+count}
function renderShop(){
 $('creditsReadout').textContent=Math.floor(world.credits)+' credits';
 $('shopBuyTab').classList.toggle('active',shopMode==='buy');$('shopSellTab').classList.toggle('active',shopMode==='sell');
 const list=$('shopList');list.innerHTML='';
 if(shopMode==='buy'){
   const discount=Math.min(12,(world.progress.reputation||0)*2)/100;
   for(const it of shopBuy){
     const price=Math.max(1,Math.round(it.price*(1-discount)));
     const row=document.createElement('div');row.className='shopRow';row.innerHTML='<div><strong>'+it.name+'</strong><small>'+it.desc+' • '+price+' credits'+(discount?' • rep discount':'')+'</small></div>';
     const owned=it.upgrade&&world.vehicleUpgrades[it.upgrade]>0;
     const b=document.createElement('button');b.textContent=owned?'OWNED':'BUY';b.disabled=owned||world.credits<price;
     b.onclick=()=>{
       if(world.credits<price||owned)return;
       world.credits-=price;
       if(it.upgrade){world.vehicleUpgrades[it.upgrade]=1;world.gameStats.upgrades++}else addInventoryItem(it.name,1);
       persist();renderInventory();renderShop();checkMissions(true);sfx(520,.07,.05,'triangle');toast(it.name+' purchased')
     };
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
function gatherResourceWithTool(a){
 const need=a.resourceType==='Wood'?'Basic Hatchet':a.resourceType==='Stone'?'Heavy Pickaxe':'Salvage Wrench';
 if(world.equippedTool!==need){toast('Equip '+need+' first');return false}
 const node=earthResources.find(r=>r.id===a.resourceId);
 if(!node||world.resourceGathered[a.resourceId])return false;
 world.resourceGathered[a.resourceId]=1;node.mesh.visible=false;
 const amount=a.resourceType==='Scrap'?3:4;addInventoryItem(a.resourceType,amount);
 persist();renderInventory();renderCrafting();toast('Collected '+amount+' '+a.resourceType);return true
}
function nearestRepairVehicle(){
 let best=null,bd=7;
 for(const v of vehicles){
   if(moonMode?(v.realm!=='moon'):(v.realm==='moon'))continue;
   let d=Math.hypot(player.x-v.x,player.z-v.z);if(d<bd){bd=d;best=v}
 }
 return best
}
function scannerResult(){
 let best=null,bd=Infinity,label='';
 if(moonMode){
   for(const c of moonCollectibles){if(!c.mesh.visible)continue;let d=Math.hypot(player.x-c.x,player.z-c.z);if(d<bd){bd=d;best=c;label=c.name}}
   for(const r of moonMineables){if(!r.mesh.visible)continue;let d=Math.hypot(player.x-r.x,player.z-r.z);if(d<bd){bd=d;best=r;label='Mineral deposit'}}
 }else{
   for(const r of earthResources){if(world.resourceGathered[r.id]||!r.mesh.visible)continue;let d=Math.hypot(player.x-r.x,player.z-r.z);if(d<bd){bd=d;best=r;label=r.type+' resource'}}
 }
 if(!best)return null;
 const ang=Math.atan2(best.x-player.x,best.z-player.z),rel=((ang-player.yaw)*180/Math.PI+540)%360-180;
 const dir=Math.abs(rel)<22?'ahead':rel>0?'right':'left';
 return{label,d:Math.round(bd),dir}
}
$('toolAction').onclick=()=>{
 if(activeVehicle||!world.equippedTool)return;
 const tool=world.equippedTool,a=nearestTownInteraction();
 toolSwing=1;
 const threat=nearestThreat();
 if(threat&&(tool==='Basic Hatchet'||tool==='Heavy Pickaxe'||tool==='Salvage Wrench')){
   threat.hp-=tool==='Heavy Pickaxe'?2:1;threat.fear=4.5;
   threat.target=Math.atan2(threat.x-player.x,threat.z-player.z);
   if(threat.hp<=0){
     const c=chunks.get(threat.chunk);scene.remove(threat.group);
     let i=animalAgents.indexOf(threat);if(i>=0)animalAgents.splice(i,1);
     if(c){i=c.agents.indexOf(threat);if(i>=0)c.agents.splice(i,1)}
     addInventoryItem('Wildlife Hide',1);toast(threat.kind.toUpperCase()+' repelled • Wildlife Hide collected')
   }else toast(threat.kind.toUpperCase()+' driven back');
   persist();renderInventory();return
 }
 if(a&&a.type==='resource'){
   gatherResourceWithTool(a);refreshUse();return
 }
 if(tool==='Field Flashlight'){
   toolLight.intensity=toolLight.intensity>0?0:5.5;
   toast(toolLight.intensity>0?'Flashlight on':'Flashlight off');refreshUse();return
 }
 if(tool==='Geology Scanner'){
   const hit=scannerResult();
   toast(hit?hit.label+' • '+hit.d+'m • '+hit.dir.toUpperCase():'No resources detected nearby');return
 }
 if(tool==='Repair Kit'){
   const v=nearestRepairVehicle();if(!v){toast('No vehicle close enough to repair');return}
   if(inventoryQty('Repair Kit')<1){toast('No Repair Kit remaining');setEquippedTool(null);return}
   consumeItem('Repair Kit',1);v.stalled=false;v.vy=0;persist();renderInventory();toast(v.type+' serviced');if(inventoryQty('Repair Kit')<1)setEquippedTool(null);return
 }
 toast('Move close to a matching resource to use '+tool)
};
function standFromBench(){
 if(!sitting)return;
 const b=sitting,angles=[0,Math.PI,Math.PI/2,-Math.PI/2,.75,-.75];
 let spot=null;
 for(const r of[1.8,2.2,2.8,3.4]){
   for(const a of angles){
     const ang=(b.yaw||0)+a,x=b.x+Math.sin(ang)*r,z=b.z+Math.cos(ang)*r;
     if(!blocked(x,z,.55)&&Math.abs(H(x,z)-H(b.x,b.z))<1.25){spot={x,z};break}
   }
   if(spot)break
 }
 if(!spot)spot={x:b.x+Math.sin((b.yaw||0)+Math.PI)*3.6,z:b.z+Math.cos((b.yaw||0)+Math.PI)*3.6};
 sitting=null;move.x=move.y=0;look.x=look.y=0;playerJumpY=0;playerJumpV=0;
 player.x=spot.x;player.z=spot.z;player.yaw=b.exitYaw??player.yaw;
 camera.position.set(player.x,H(player.x,player.z)+1.7,player.z);
 refreshUse();toast('Stood up')
}
$('townAction').onclick=()=>{
 if(sitting){standFromBench();return}
 const a=nearestTownInteraction();if(!a)return;
 if(a.type==='shop'){openShop();toast('Westside Supply opened')}
 else if(a.type==='bench'){
   sitting={x:a.x,z:a.z,yaw:a.yaw||0,exitYaw:player.yaw};
   move.x=move.y=0;look.x=look.y=0;playerJumpY=0;playerJumpV=0;
   player.x=a.x+Math.sin(a.yaw||0)*.72;player.z=a.z+Math.cos(a.yaw||0)*.72;player.yaw=(a.yaw||0)+Math.PI;
   toast('Sitting on bench')
 }else if(a.type==='arcade'){
   world.arcadeScores=world.arcadeScores||{};
   const score=1200+Math.floor((Math.sin(performance.now()*.013+a.x)*.5+.5)*8800);
   world.arcadeScores[a.game]=Math.max(world.arcadeScores[a.game]||0,score);persist();
   toast(a.game+' • SCORE '+score)
 }else if(a.type==='talk'){
   if(!world.gameStats.talked[a.name]){world.gameStats.talked[a.name]=1;world.gameStats.npcTalks++;persist();checkMissions(true)}
   const lines={
     Ranger:'Iris: The wilds get stranger the farther you travel.',
     Surveyor:'Theo: I have seen unusual signals beyond the northern ridges.',
     Courier:'Rafi: I move supplies between the airfield and town.',
     Miner:'Ada: Bring proper tools if you want useful stone.',
     Builder:'Mason: Craft build kits, then place them from the Craft menu.',
     Botanist:'Mae: The forests are dense enough to hide almost anything.',
     Pilot:'Soren: Keep an eye on your altitude and throttle.',
     Traveller:'Tess: I came in from the western hills this morning.',
     Medic:'Dr. Vale: The clinic is always open.',
     'Arcade Attendant':'Eli: Try to beat your own high score.',
     Barista:'Nia: Coffee is easier to find than answers out here.',
     Caretaker:'June: The hall is open to anyone passing through.'
   };
   sfx(260,.05,.025,'sine');toast(lines[a.role]||a.name+': Good to see another explorer.')
 }else if(a.type==='cafe'){
   const cost=Math.max(5,Math.round(10*(1-Math.min(12,(world.progress.reputation||0)*2)/100)));
   if(world.credits<cost){toast('A hot meal costs '+cost+' credits');return}
   world.credits-=cost;world.playerStats.energy=Math.min(100,world.playerStats.energy+55);world.playerStats.stamina=100;persist();sfx(360,.08,.04,'sine');toast('Hot meal • energy restored • -'+cost+' credits')
 }else if(a.type==='clinic'){
   const cost=Math.max(8,Math.round(18*(1-Math.min(12,(world.progress.reputation||0)*2)/100)));
   if(world.playerStats.health>=99){toast('Dr. Vale: You are already in good shape.');return}
   if(world.credits<cost){toast('Clinic treatment costs '+cost+' credits');return}
   world.credits-=cost;world.playerStats.health=100;persist();sfx(520,.1,.04,'sine');toast('Treatment complete • -'+cost+' credits')
 }else if(a.type==='noticeboard'){
   const idx=missions.findIndex((m,i)=>!world.progress.completed.includes(i));
   toast(idx<0?'Community board: Frontier contracts complete.':'COMMUNITY BOARD • '+missions[idx].title+' • '+missions[idx].desc)
 }else if(a.type==='workbench'){
   closeSidePanels('craftPanel');$('craftPanel').classList.remove('hidden');renderCrafting();toast('Workbench ready')
 }else if(a.type==='shelter'){
   world.playerStats.health=Math.min(100,world.playerStats.health+25);world.playerStats.energy=Math.min(100,world.playerStats.energy+35);world.playerStats.stamina=100;persist();toast('Rested at shelter')
 }else if(a.type==='resource'){
   gatherResourceWithTool(a)
 }else if(a.type==='loot'){
   if(world.lootOpened[a.lootId])return;
   world.lootOpened[a.lootId]=1;world.gameStats.caches++;if(a.mesh)a.mesh.visible=false;
   const lunar=(a.realm==='moon'),roll=(Math.abs(Math.sin(a.x*12.13+a.z*7.77))*100)|0;
   if(lunar){addInventoryItem('Lunar Ore',1+(roll%2));world.moonOre=Math.max(world.moonOre,inventoryQty('Lunar Ore'));addInventoryItem(roll%3?'Impact Glass':'Regolith Sample',1)}
   else{addInventoryItem(roll%2?'Scrap':'Stone',2);if(roll%4===0)addInventoryItem('Trail Rations',1);world.credits+=10+(roll%25)}
   persist();renderInventory();checkMissions(true);sfx(720,.09,.055,'triangle');toast(lunar?'Lunar cache recovered':'Supply cache recovered')
 }else if(a.type==='moonSite'){
   world.progress.moonSites=world.progress.moonSites||{};
   if(!world.progress.moonSites[a.site]){world.progress.xp+=40;world.gameStats.moonSites++}
   world.progress.moonSites[a.site]=1;updateLevel();persist();checkMissions(true);
   toast(a.site==='relay'?'Relay wreck logged • corrupted star map recovered':a.site==='drill'?'Abandoned drill logged • deep ore signatures detected':'Cave entrance logged • scanner shows a deep void')
 }else if(a.type==='poi'){
   world.progress.earthSites=world.progress.earthSites||{};
   if(!world.progress.earthSites[a.poi]){world.progress.earthSites[a.poi]=1;world.progress.xp+=35;world.credits+=25;world.gameStats.pois++;updateLevel();persist();checkMissions(true)}
   toast(a.poi==='bunker'?'Station log recovered • +25 credits':'Crash site surveyed • fragments logged')
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

function graphicsScaleCap(){
 const q=world.ui.graphicsQuality||'balanced',r=Number(world.ui.renderQuality||1);
 const base=q==='performance'?.82:q==='high'?1.18:1.0;
 return Math.min(devicePixelRatio,base*r)
}
function applyGraphicsSettings(resetScale=true){
 const q=world.ui.graphicsQuality||'balanced';
 const shadows=world.ui.shadows!==false&&q!=='performance';
 renderer.shadowMap.enabled=shadows;sun.castShadow=shadows;
 if(resetScale){
   renderScale=Math.max(.65,Math.min(graphicsScaleCap(),q==='performance'?.78:q==='high'?1.05:.92));
   renderer.setPixelRatio(renderScale);renderer.setSize(innerWidth,innerHeight,false)
 }
 const rainFrac=q==='performance'?.45:q==='high'?1:.72;
 rain.geometry.setDrawRange(0,Math.floor(rainCount*rainFrac));
 cloudGroup.children.forEach((c,i)=>c.visible=q!=='performance'||i%2===0);
 for(const m of particlePool)if(world.ui.effects===false)m.visible=false;
 for(const m of trackPool)if(world.ui.effects===false)m.visible=false;
 persist()
}
$('fpsTarget').value=String(world.ui.fpsTarget||60);
$('graphicsQuality').value=world.ui.graphicsQuality||'balanced';
$('renderQuality').value=String(world.ui.renderQuality||1);
$('dynamicResolution').checked=world.ui.dynamicResolution!==false;
$('shadowToggle').checked=world.ui.shadows!==false;
$('effectsToggle').checked=world.ui.effects!==false;
$('fpsTarget').onchange=e=>{world.ui.fpsTarget=+e.target.value;persist()};
$('graphicsQuality').onchange=e=>{world.ui.graphicsQuality=e.target.value;applyGraphicsSettings(true)};
$('renderQuality').onchange=e=>{world.ui.renderQuality=+e.target.value;applyGraphicsSettings(true)};
$('dynamicResolution').onchange=e=>{world.ui.dynamicResolution=e.target.checked;applyGraphicsSettings(false)};
$('shadowToggle').onchange=e=>{world.ui.shadows=e.target.checked;applyGraphicsSettings(false)};
$('effectsToggle').onchange=e=>{world.ui.effects=e.target.checked;applyGraphicsSettings(false)};
applyGraphicsSettings(true);

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
 world.progress.reachedMoon=true;persist();checkMissions();
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

let skyUiAt=0,skyUpdateAt=0;
function updateSky(time,dt=0.016){
 const now=performance.now();
 if(now-skyUpdateAt<50)return;
 dt=Math.min(.1,skyUpdateAt?(now-skyUpdateAt)/1000:dt);skyUpdateAt=now;
 let hour=worldCtl.autoTime?((time/480)*24)%24:worldCtl.time,cycle=hour/24,a=cycle*Math.PI*2-Math.PI/2,sy=Math.sin(a),day=T.MathUtils.clamp((sy+0.18)*2.3,0,1),w=worldCtl.weather;
 const updateUi=now-skyUiAt>180;if(updateUi)skyUiAt=now;
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
 const earthScene=!moonMode&&spaceFactor<0.88,
       airfieldNear=Math.hypot(player.x,player.z)<340,
       townNear=Math.hypot(player.x+126,player.z-6)<380;
 startBase.visible=earthScene&&airfieldNear;
 cityGroup.visible=earthScene&&townNear;
 buildGroup.visible=earthScene;
 resourceGroup.visible=earthScene&&townNear;
 lootGroup.visible=earthScene;
 poiGroup.visible=earthScene;
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

let hudUpdateAt=0,aiAccumulator=0,damageCooldown=0;const cameraLerpTarget=new T.Vector3();
function updateSurvival(dt,t){
 const s=world.playerStats;
 const moving=Math.hypot(move.x,move.y)>.15&&!activeVehicle&&!sitting;
 const safe=!moonMode&&((Math.abs(player.x)<50&&Math.abs(player.z)<50)||inCityZone(player.x,player.z))||moonMode&&(Math.abs(player.x)<35&&Math.abs(player.z-18)<38);
 if(moving&&sprinting){
   s.stamina=Math.max(0,s.stamina-dt*18);
   if(s.stamina<4)sprinting=false
 }else{
   const regen=1+Math.min(.3,Math.max(0,(world.progress.level||1)-1)*.04);
   s.stamina=Math.min(100,s.stamina+dt*(safe?18:11)*regen)
 }
 s.energy=Math.max(0,s.energy-dt*(safe?.006:.014));
 if(s.energy<8)s.health=Math.max(0,s.health-dt*.28);
 if(worldCtl.weather==='storm'&&!safe&&!moonMode)s.energy=Math.max(0,s.energy-dt*.018);
 if(safe){s.health=Math.min(100,s.health+dt*.22);s.energy=Math.min(100,s.energy+dt*.025)}
 damageCooldown=Math.max(0,damageCooldown-dt);
 if(!activeVehicle&&!moonMode&&damageCooldown<=0){
   for(const a of animalAgents){
     if(a.kind==='wolf'&&Math.hypot(player.x-a.x,player.z-a.z)<1.35){
       s.health=Math.max(0,s.health-7);damageCooldown=1.15;toast('Wolf attack • move away or defend with a tool');break
     }
   }
 }
 if(s.health<=0){
   s.health=100;s.stamina=100;s.energy=Math.max(35,s.energy);player.x=-14.5;player.z=-24;activeVehicle=null;sitting=null;toast('You were recovered at the airfield')
 }
 $('healthBar').style.width=s.health+'%';$('staminaBar').style.width=s.stamina+'%';$('energyBar').style.width=s.energy+'%';
 const danger=$('dangerVignette');if(danger)danger.style.opacity=String(T.MathUtils.clamp((45-s.health)/45,0,.72))
}
function nearestThreat(){
 let best=null,bd=2.8;
 for(const a of animalAgents){
   if(a.kind!=='wolf'&&a.kind!=='boar')continue;
   const d=Math.hypot(player.x-a.x,player.z-a.z);if(d<bd){bd=d;best=a}
 }
 return best
}
function step(dt,t){
 const lx=look.x*lookSensitivity,ly=look.y*lookSensitivity;
 player.pitch=T.MathUtils.clamp(player.pitch-ly*dt*1.65,-1.02,0.92);updateSurvival(dt,t);updateBuildGhost();updateVehicleVisuals(dt,t);
 let targetFov=67;
 if(activeVehicle){
   const sp=Math.abs(activeVehicle.speed||0);
   if(activeVehicle.kind==='jet')targetFov=67+T.MathUtils.clamp(sp/48,0,1)*9;
   else if(activeVehicle.kind==='ufo')targetFov=67+T.MathUtils.clamp(sp/70,0,1)*8;
   else if(activeVehicle.kind==='heli')targetFov=67+T.MathUtils.clamp(sp/28,0,1)*4;
   else targetFov=67+T.MathUtils.clamp(sp/18,0,1)*3
 }else if(sprinting&&Math.hypot(move.x,move.y)>.2)targetFov=69.5;
 const nf=T.MathUtils.lerp(camera.fov,targetFov,1-Math.exp(-dt*5.5));
 if(Math.abs(nf-camera.fov)>.025){camera.fov=nf;camera.updateProjectionMatrix()}
 if(audioCtx&&ambientOsc&&ambientGain){
   const target=moonMode?62:worldCtl.weather==='storm'?42:worldCtl.weather==='rain'?48:52;
   ambientOsc.frequency.setTargetAtTime(target,audioCtx.currentTime,.8);
   ambientGain.gain.setTargetAtTime(moonMode?.008:worldCtl.weather==='clear'?.012:.018,audioCtx.currentTime,.8)
 }
 if(!activeVehicle&&!sitting&&Math.hypot(move.x,move.y)>.22&&performance.now()-lastStepSfx>(sprinting?260:390)){
   lastStepSfx=performance.now();sfx(moonMode?95:120,.045,moonMode?.022:.032,'sine')
 }
 if(toolSwing>0){toolSwing=Math.max(0,toolSwing-dt*4.8);toolView.rotation.z=-.25+Math.sin((1-toolSwing)*Math.PI)*.9;toolView.rotation.x=-.1-Math.sin((1-toolSwing)*Math.PI)*.45}else{toolView.rotation.z=-.25;toolView.rotation.x=-.1}

 if(activeVehicle){
   let v=activeVehicle,f=-move.y,side=move.x;
   if(v.kind==='buggy'||v.kind==='moonbuggy'){
     v.yaw-=lx*dt*1.65;v.yaw+=side*dt*1.25*(0.35+Math.abs(f));
     let top=(v.kind==='moonbuggy'?(sprinting?17:11):(sprinting?12:7.5))*(1+(world.vehicleUpgrades.ground||0)*.2),
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
     // GTA-style helicopter handling: stick tilts the aircraft, tilt creates
     // momentum, the camera/look stick yaws independently, and releasing the
     // stick gradually settles the helicopter back into a hover.
     const forwardInput=T.MathUtils.clamp(move.y,-1,1),
           sideInput=T.MathUtils.clamp(move.x,-1,1),
           upgrade=1+(world.vehicleUpgrades.flight||0)*.12,
           airborne=v.alt>.08||flightThrottle>.51;

     const targetPitch=-forwardInput*.34*upgrade,
           targetRoll=-sideInput*.42*upgrade;
     v.pitch=T.MathUtils.lerp(v.pitch,targetPitch,1-Math.exp(-dt*4.6));
     v.roll=T.MathUtils.lerp(v.roll,targetRoll,1-Math.exp(-dt*5.0));

     // Right-look horizontal input acts like GTA's tail/yaw control.
     const desiredYawRate=(-lx*1.7)+(-v.roll*.72);
     v.yawRate=T.MathUtils.lerp(v.yawRate||0,desiredYawRate,1-Math.exp(-dt*4.2));
     v.yaw+=v.yawRate*dt;

     // 50% is hover. Above/below it gives climb/descent with some inertia.
     const desiredCollective=(flightThrottle-.5)*2;
     v.collective=T.MathUtils.lerp(v.collective||0,desiredCollective,1-Math.exp(-dt*3.3));
     const liftAccel=v.collective*11.5,
           verticalDamping=v.alt<1.2?2.2:1.35;
     v.vy+=(liftAccel-v.vy*verticalDamping)*dt;
     if(!airborne&&flightThrottle<.5){v.vy=0;v.alt=0}

     // Tilt generates acceleration instead of instant translation.
     // This gives the helicopter the heavy, sweeping GTA-like momentum.
     const maxAccel=16.5*upgrade,
           forwardAccel=-Math.sin(v.pitch)*maxAccel,
           sideAccel=-Math.sin(v.roll)*maxAccel*.9,
           ax=Math.sin(v.yaw)*forwardAccel+Math.cos(v.yaw)*sideAccel,
           az=Math.cos(v.yaw)*forwardAccel-Math.sin(v.yaw)*sideAccel,
           drag=(Math.abs(forwardInput)+Math.abs(sideInput)<.08)?1.75:.72;
     if(airborne){
       v.hvx=(v.hvx||0)+ax*dt;v.hvz=(v.hvz||0)+az*dt;
       const damp=Math.exp(-drag*dt);v.hvx*=damp;v.hvz*=damp;
       const maxH=27*upgrade,hs=Math.hypot(v.hvx,v.hvz);
       if(hs>maxH){const q=maxH/hs;v.hvx*=q;v.hvz*=q}
       const nx=v.x+v.hvx*dt,nz=v.z+v.hvz*dt;
       if(v.alt>1.1||(!blocked(nx,nz,2.2)&&Math.abs(H(nx,nz)-H(v.x,v.z))<2.2)){v.x=nx;v.z=nz}
       else{v.hvx*=.25;v.hvz*=.25}
     }else{
       v.hvx=T.MathUtils.lerp(v.hvx||0,0,Math.min(1,dt*6));
       v.hvz=T.MathUtils.lerp(v.hvz||0,0,Math.min(1,dt*6))
     }

     v.speed=Math.hypot(v.hvx||0,v.hvz||0);
     v.alt=T.MathUtils.clamp(v.alt+v.vy*dt,0,70);
     if(v.alt<=0){
       v.alt=0;
       if(v.vy<-5.5)toast('Hard helicopter landing');
       v.vy=0;
       v.hvx*=.65;v.hvz*=.65
     }

     // A touch of aerodynamic bank/yaw at speed makes turns feel less robotic.
     const speedLean=T.MathUtils.clamp((v.speed||0)/27,0,1);
     const visualPitch=v.pitch-T.MathUtils.clamp(v.vy*.006,-.04,.04),
           visualRoll=v.roll-T.MathUtils.clamp(v.yawRate*.05*speedLean,-.08,.08);
     v.group.position.set(v.x,H(v.x,v.z)+v.alt,v.z);
     v.group.rotation.set(visualPitch,v.yaw,visualRoll,'XYZ');
   }else if(v.kind==='ufo'){
     let ground=H(v.x,v.z)+1.8;
     if(v.worldY==null)v.worldY=ground+Math.max(0,v.alt||0);
     let space=v.worldY-H(v.x,v.z)>160;
     v.inSpace=space;

     let pitchInput=move.y,
         rollInput=move.x,
         targetPitch=pitchInput*(space?0.52:0.38)*(1+(world.vehicleUpgrades.flight||0)*.12),
         targetRoll=-rollInput*(space?0.58:0.42)*(1+(world.vehicleUpgrades.flight||0)*.12);
     v.pitch=T.MathUtils.lerp(v.pitch,targetPitch,Math.min(1,dt*3.2));
     v.roll=T.MathUtils.lerp(v.roll,targetRoll,Math.min(1,dt*3.4));
     v.yaw+=(-v.roll)*dt*(space?1.25:0.8);

     let maxSpeed=(space?170:48)*(1+(world.vehicleUpgrades.flight||0)*.12),
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
         targetPitch=pitchInput*0.42*(1+(world.vehicleUpgrades.flight||0)*.12),
         targetRoll=-rollInput*0.58*(1+(world.vehicleUpgrades.flight||0)*.12);

     if(onGround){
       targetPitch=Math.max(-0.08,targetPitch);
       v.roll=T.MathUtils.lerp(v.roll,targetRoll*0.35,Math.min(1,dt*3.2));
       v.yaw+=rollInput*dt*0.52;
     }else{
       v.roll=T.MathUtils.lerp(v.roll,targetRoll,Math.min(1,dt*3.0));
       v.yaw+=(-v.roll)*dt*(0.78+Math.min(0.5,v.speed/45));
     }
     v.pitch=T.MathUtils.lerp(v.pitch,targetPitch,Math.min(1,dt*2.8));

     let maxSpeed=38*(1+(world.vehicleUpgrades.flight||0)*.12),
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
     if(playerJumpY>0||playerJumpV>0){
       playerJumpV-=13.5*dt;
       playerJumpY+=playerJumpV*dt;
       if(playerJumpY<=0){playerJumpY=0;playerJumpV=0}
     }
     let f=move.y,side=move.x,s=(sprinting?8:4.5)*dt,dx=(Math.sin(player.yaw)*f+Math.cos(player.yaw)*side)*s,dz=(Math.cos(player.yaw)*f-Math.sin(player.yaw)*side)*s,nx=player.x+dx,nz=player.z+dz;
     let dh=Math.abs(H(nx,nz)-H(player.x,player.z)),airborne=playerJumpY>.08;
     if(!blocked(nx,nz)&&(airborne?dh<1.9:dh<1.15)&&(airborne?slopeAt(nx,nz)<3.4:slopeAt(nx,nz)<2.5)){player.x=nx;player.z=nz}
     cameraLerpTarget.set(player.x,H(player.x,player.z)+1.7+playerJumpY,player.z)
   }else{
     playerJumpY=0;playerJumpV=0;
     cameraLerpTarget.set(player.x,H(player.x,player.z)+1.18,player.z)
   }
   camera.position.lerp(cameraLerpTarget,0.24);camera.rotation.set(player.pitch,player.yaw,0);
 }

 let cc=chunkOf(player.x,player.z);
 if(!moonMode&&!(activeVehicle&&activeVehicle.kind==='ufo'&&activeVehicle.alt>180)&&key(cc.cx,cc.cz)!==currentChunk)sync();

 // Wildlife/anomaly simulation does not need display-frame frequency.
 aiAccumulator+=dt;
 if(aiAccumulator>=0.033){
   const simDt=Math.min(aiAccumulator,.066);aiAccumulator=0;
   if(!moonMode){updateAnimals(simDt,t);updateAnomalies(simDt,t);if(Math.abs(player.x+126)<115&&Math.abs(player.z-6)<100)updateTownHumans(t)}
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
   $('stats').textContent=vehicleHud+(moonMode?'LUNAR SURFACE • '+(world.moonOre||0)+' ore':biome(player.x,player.z)+' • '+exploredCount+' visited • '+animalAgents.length+' wildlife');
   checkMissions();refreshUse();
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
let last=performance.now(),start=performance.now()/1000-240,shadowAt=0,perfAt=last,perfFrames=0,perfTotal=0,lastFrameAt=0,fpsUiAt=0,fpsUiFrames=0,fpsUiStart=last;
function loop(now){
 requestAnimationFrame(loop);

 const target=T.MathUtils.clamp(Number(world.ui.fpsTarget||60),24,120),frameMs=1000/target;
 if(now-lastFrameAt<frameMs-.55)return;
 lastFrameAt=now;

 let rawDt=(now-last)/1000,dt=Math.min(0.04,rawDt);last=now;let t=now/1000;
 step(dt,t-start);processFarQueue();processNearBuildQueue();processAnimalLoadQueue();updateShadowCasters();

 const shadows=renderer.shadowMap.enabled&&world.ui.shadows!==false&&world.ui.graphicsQuality!=='performance',
       shadowInterval=world.ui.graphicsQuality==='high'?(IS_MOBILE?220:145):(IS_MOBILE?320:210);
 if(shadows&&now-shadowAt>shadowInterval){shadowAt=now;renderer.shadowMap.needsUpdate=true}

 renderer.render(scene,camera);

 fpsUiFrames++;
 if(now-fpsUiStart>600){
   const fps=Math.round(fpsUiFrames*1000/(now-fpsUiStart));fpsUiFrames=0;fpsUiStart=now;
   if($('fpsReadout'))$('fpsReadout').textContent=fps+' FPS'
 }

 perfFrames++;perfTotal+=rawDt;
 if(now-perfAt>1200){
   const avg=perfTotal/Math.max(1,perfFrames),cap=graphicsScaleCap(),dynamic=world.ui.dynamicResolution!==false;
   let next=renderScale;
   if(dynamic){
     const budget=1/target,minScale=world.ui.graphicsQuality==='performance'?.62:.68;
     if(avg>budget*1.28)next=Math.max(minScale,renderScale-.12);
     else if(avg>budget*1.08)next=Math.max(minScale,renderScale-.065);
     else if(avg<budget*.88)next=Math.min(cap,renderScale+.035)
   }else next=cap;
   if(Math.abs(next-renderScale)>.01){renderScale=next;renderer.setPixelRatio(renderScale);renderer.setSize(innerWidth,innerHeight,false)}
   perfAt=now;perfFrames=0;perfTotal=0
 }
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