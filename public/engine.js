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
const moonLight=new T.DirectionalLight(0x8eb4ff,.18);moonLight.castShadow=false;
scene.add(hemi,sun,moonLight,moonLight.target);
const earthSun=new T.Group(),earthMoon=new T.Group();
const earthSunOrb=new T.Mesh(new T.SphereGeometry(26,18,12),new T.MeshBasicMaterial({color:0xffefb0}));
const earthSunHalo=new T.Mesh(new T.SphereGeometry(38,16,10),new T.MeshBasicMaterial({color:0xffbd54,transparent:true,opacity:.12,depthWrite:false}));
earthSun.add(earthSunHalo,earthSunOrb);scene.add(earthSun);
const earthMoonOrb=new T.Mesh(new T.SphereGeometry(20,18,12),new T.MeshStandardMaterial({color:0xc9d2d8,emissive:0x667788,emissiveIntensity:.65,roughness:1}));
const earthMoonHalo=new T.Mesh(new T.SphereGeometry(30,14,10),new T.MeshBasicMaterial({color:0xa7c7ff,transparent:true,opacity:.11,depthWrite:false}));
earthMoon.add(earthMoonHalo,earthMoonOrb);scene.add(earthMoon);

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
if(!world)world={seed:Math.floor(Math.random()*1e9),explored:{},saved:{},animalState:{},discoveries:{},moonMined:{},moonOre:0,inventory:{},credits:100,builds:[],resourceGathered:{},equippedTool:null,saveVersion:5,progress:{xp:0,level:1,reputation:0,mission:0,completed:[]},playerStats:{health:100,stamina:100,energy:100},vehicleUpgrades:{ground:0,flight:0,lights:0},lootOpened:{}};world.explored=world.explored||{};world.saved=world.saved||{};world.animalState=world.animalState||{};world.discoveries=world.discoveries||{};world.moonMined=world.moonMined||{};world.moonOre=world.moonOre||0;world.inventory=world.inventory||{};world.credits=Number.isFinite(world.credits)?world.credits:100;world.builds=Array.isArray(world.builds)?world.builds:[];world.resourceGathered=world.resourceGathered||{};world.equippedTool=world.equippedTool||null;world.progress=world.progress||{xp:0,level:1,reputation:0,mission:0,completed:[]};world.progress.completed=Array.isArray(world.progress.completed)?world.progress.completed:[];world.progress.xp=Number(world.progress.xp)||0;world.progress.level=Number(world.progress.level)||1;world.progress.reputation=Number(world.progress.reputation)||0;world.progress.mission=Number(world.progress.mission)||0;world.progress.earthSites=world.progress.earthSites||{};world.progress.moonSites=world.progress.moonSites||{};world.progress.regionMilestones=world.progress.regionMilestones||{};world.playerStats=world.playerStats||{health:100,stamina:100,energy:100};world.vehicleUpgrades=world.vehicleUpgrades||{ground:0,flight:0,lights:0};world.lootOpened=world.lootOpened||{};world.burntTrees=world.burntTrees||{};world.gameStats=world.gameStats||{npcTalks:0,caches:0,crafted:0,upgrades:0,pois:0,moonSites:0};world.gameStats.talked=world.gameStats.talked||{};world.gameStats.npcTalks=Math.max(world.gameStats.npcTalks||0,Object.keys(world.gameStats.talked).length);world.gameStats.caches=Math.max(world.gameStats.caches||0,Object.keys(world.lootOpened||{}).length);world.gameStats.upgrades=Math.max(world.gameStats.upgrades||0,Object.values(world.vehicleUpgrades||{}).filter(v=>v>0).length);world.gameStats.pois=Math.max(world.gameStats.pois||0,Object.keys((world.progress&&world.progress.earthSites)||{}).length);world.gameStats.moonSites=Math.max(world.gameStats.moonSites||0,Object.keys((world.progress&&world.progress.moonSites)||{}).length);world.saveVersion=5;world.ui=world.ui||{lookSensitivity:1,hudScale:1};world.ui.fpsTarget=world.ui.fpsTarget||60;world.ui.graphicsQuality=world.ui.graphicsQuality||'balanced';world.ui.renderQuality=world.ui.renderQuality||1;world.ui.dynamicResolution=world.ui.dynamicResolution!==false;world.ui.shadows=world.ui.shadows!==false;world.ui.effects=world.ui.effects!==false;
if(world.saved['0,0']){world.saved['0,0'].trees=(world.saved['0,0'].trees||[]).filter(q=>!inStartClearZone(q[0],q[1]));world.saved['0,0'].rocks=(world.saved['0,0'].rocks||[]).filter(q=>!inStartClearZone(q[0],q[1]));}
let player;
try{player=JSON.parse(localStorage.getItem(POS)||'null')}catch(e){player=null}
if(!player)player={x:-13.25,z:-24,yaw:Math.PI/2,pitch:0};
// Intro-screen repair v55: once per existing save, place the player at the briefing display so the intended opening is actually seen.
try{if(!localStorage.getItem('wi_intro_screenfix_v57')){player.x=-13.25;player.z=-24;player.yaw=Math.PI/2;player.pitch=0;localStorage.setItem('wi_intro_screenfix_v57','1')}}catch(e){}
// v54 intro alignment: repair the briefing-room view for existing saves that are already at the airfield spawn.
// Never teleport a player back from elsewhere in the world.
try{if(localStorage.getItem('wi_intro_align_v54')!=='1'&&player.x>-30&&player.x<1&&player.z>-40&&player.z<-8){player.x=-13.25;player.z=-24;player.yaw=Math.PI/2;player.pitch=0;localStorage.setItem('wi_intro_align_v54','1')}}catch(e){}

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
const ARENA_LEVEL=earthRawH(132,0);
// Dragon cave entrance is deliberately beside the south end of the runway, not hidden out in procedural terrain.
const DRAGON_CAVE_X=24,DRAGON_CAVE_Z=78,DRAGON_CAVE_MOUTH_Z=50;
function earthH(x,z){
  const raw=earthRawH(x,z),edge=Math.max(Math.abs(x),Math.abs(z));
  if(edge<=46)return START_PLATEAU;
  if(edge<48)return T.MathUtils.lerp(START_PLATEAU,raw,smooth((edge-46)/2));

  // West town is built on a gently levelled plateau so floors and doorways
  // remain genuinely walkable, with only a narrow blend back to wild terrain.
  const tx=Math.max(0,-365-x,x+64),tz=Math.max(0,Math.abs(z)-100),td=Math.max(tx,tz);
  if(td<=0)return TOWN_LEVEL;
  if(td<10)return T.MathUtils.lerp(TOWN_LEVEL,raw,smooth(td/10));

  // East Robot Combat Institute plateau. This is deliberately confined to
  // the new arena side of the runway so existing terrain stays unchanged.
  const ax=Math.max(0,72-x,x-194),az=Math.max(0,Math.abs(z)-72),ad=Math.max(ax,az);
  if(ad<=0)return ARENA_LEVEL;
  if(ad<12)return T.MathUtils.lerp(ARENA_LEVEL,raw,smooth(ad/12));

  // Keep the cave approach readable and walkable from the runway edge.
  const caveD=Math.hypot(x-DRAGON_CAVE_X,z-DRAGON_CAVE_MOUTH_Z);
  if(caveD<13)return T.MathUtils.lerp(START_PLATEAU,raw,smooth(T.MathUtils.clamp((caveD-7)/6,0,1)));
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
function inStartClearZone(x,z){return (Math.abs(x)<46&&Math.abs(z)<46)||(x>68&&x<198&&Math.abs(z)<76)}

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
   if(hash(cx+i,cz-i,103)<0.82&&!inStartClearZone(cx*CH+x,cz*CH+z))d.trees.push([+x.toFixed(2),+z.toFixed(2),+(0.65+hash(cx+i,cz-i,104)*1.15).toFixed(2)]);
 }
 for(let i=0;i<10;i++){
   let x=(hash(cx*37+i,cz*29-i,111)-0.5)*CH,z=(hash(cx*31-i,cz*41+i,112)-0.5)*CH;
   if(!inStartClearZone(cx*CH+x,cz*CH+z))d.rocks.push([+x.toFixed(2),+z.toFixed(2),+(0.35+hash(cx+i,cz-i,113)*0.95).toFixed(2)]);
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
 g.setAttribute('color',new T.BufferAttribute(colors,3));
 // Dragon Cavern entrance is real missing topology, not a dark decal. Remove every terrain triangle that touches
 // the walk-in opening/ramp corridor, then widen into the underground shaft. Testing only triangle centroids left
 // large faces spanning the opening on mobile LOD, which is why the screenshots still showed a solid map floor.
 if(!moonMode&&g.index){
   const src=Array.from(g.index.array),cut=[];
   const inCaveCut=(i)=>{const x=worldX[i],z=worldZ[i],shaft=Math.hypot(x-DRAGON_CAVE_X,z-DRAGON_CAVE_Z)<13.5,ramp=Math.abs(x-DRAGON_CAVE_X)<9.5&&z>DRAGON_CAVE_MOUTH_Z-2&&z<DRAGON_CAVE_Z+3;return shaft||ramp};
   for(let k=0;k<src.length;k+=3){const a=src[k],b=src[k+1],c=src[k+2];if(!inCaveCut(a)&&!inCaveCut(b)&&!inCaveCut(c))cut.push(a,b,c)}
   g.setIndex(cut)
 }
 g.computeVertexNormals();
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
   if(!inCityZone(wx,wz)&&!inStartClearZone(wx,wz))trees.push({wx,wz,s:q[2],pine:biome(wx,wz)==='pine'})
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
 const trees=d.trees.filter((q,i)=>!q[3]&&!burntTrees.has(key(cx,cz)+':'+i)&&!inCityZone(cx*CH+q[0],cz*CH+q[1])&&!inStartClearZone(cx*CH+q[0],cz*CH+q[1])),
       rocks=d.rocks.filter(q=>!inCityZone(cx*CH+q[0],cz*CH+q[1])&&!inStartClearZone(cx*CH+q[0],cz*CH+q[1])),
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
 d.trees.forEach((q,i)=>{if((q[3]||burntTrees.has(key(cx,cz)+':'+i))&&!inCityZone(cx*CH+q[0],cz*CH+q[1]))group.add(makeTree(cx*CH+q[0],cz*CH+q[1],q[2],false,true))});
}
function makeTree(wx,wz,s,detail,burnt=false){
 let g=new T.Group(),b=biome(wx,wz),deadMat=new T.MeshStandardMaterial({color:0x241b16,roughness:1}),tr=new T.Mesh(new T.CylinderGeometry(0.18*s,0.38*s,3.8*s,detail?7:5),burnt?deadMat:mats.trunk);
 tr.position.y=1.9*s;tr.castShadow=detail;g.add(tr);
 if(burnt){
   for(const sx of[-1,1]){let limb=new T.Mesh(new T.CylinderGeometry(.05*s,.11*s,1.7*s,5),deadMat);limb.position.set(sx*.38*s,3.1*s,0);limb.rotation.z=sx*.7;g.add(limb)}
 }else if(b==='pine'){
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
const dragonFires=[],burntTrees=new Set(Object.keys(world.burntTrees||{}));
let dragon=null,dragonFireHeld=false;
function makeDragon(x,z,worldY){
 const g=new T.Group(),scales=new T.MeshStandardMaterial({color:0x552018,roughness:.82,metalness:.08}),belly=new T.MeshStandardMaterial({color:0x9b6540,roughness:.9}),dark=new T.MeshStandardMaterial({color:0x160d0b,roughness:.95}),membrane=new T.MeshStandardMaterial({color:0x3b1514,side:T.DoubleSide,roughness:.9}),eye=new T.MeshBasicMaterial({color:0xffc32d});
 const body=new T.Mesh(new T.SphereGeometry(1.25,20,14),scales);body.scale.set(1.15,.95,2.65);body.position.y=2.25;g.add(body);
 const chest=new T.Mesh(new T.SphereGeometry(.9,16,12),belly);chest.scale.set(.82,.9,1.45);chest.position.set(0,2.15,1.3);g.add(chest);
 const neck=new T.Mesh(new T.CylinderGeometry(.48,.78,3.25,12),scales);neck.rotation.x=-.48;neck.position.set(0,3.05,2.25);g.add(neck);
 const head=new T.Mesh(new T.SphereGeometry(.78,16,10),scales);head.scale.set(1,.72,1.45);head.position.set(0,4.05,4.0);g.add(head);
 const snout=new T.Mesh(new T.SphereGeometry(.58,14,8),scales);snout.scale.set(1,.55,1.35);snout.position.set(0,3.82,4.95);g.add(snout);
 for(const sx of[-1,1]){const horn=new T.Mesh(new T.ConeGeometry(.17,1.35,7),dark);horn.position.set(sx*.42,4.72,3.62);horn.rotation.x=-.62;horn.rotation.z=sx*.12;g.add(horn);const e=new T.Mesh(new T.SphereGeometry(.095,8,6),eye);e.position.set(sx*.49,4.18,4.62);g.add(e);const leg=new T.Mesh(new T.CylinderGeometry(.17,.25,2.1,8),scales);leg.position.set(sx*.75,1.15,.6);leg.rotation.z=sx*.16;g.add(leg);const claw=new T.Mesh(new T.ConeGeometry(.1,.5,6),dark);claw.position.set(sx*.86,.12,1.02);claw.rotation.x=Math.PI/2;g.add(claw)}
 const wings=[];for(const sx of[-1,1]){const wg=new T.Group(),bone=new T.Mesh(new T.CylinderGeometry(.09,.16,5.7,7),scales);bone.rotation.z=sx*Math.PI/2;bone.position.x=sx*2.7;wg.add(bone);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,sx*5.7,0,0,sx*4.4,-.18,-4.6,sx*1.6,-.08,-3.1],3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();const w=new T.Mesh(geo,membrane);wg.add(w);wg.position.set(sx*.75,3.05,.2);g.add(wg);wings.push(wg)}
 const tail=new T.Group();for(let i=0;i<7;i++){const seg=new T.Mesh(new T.SphereGeometry(.48-i*.05,10,7),scales);seg.scale.set(1,.8,1.65);seg.position.set(0,1.95-i*.05,-2.8-i*1.05);tail.add(seg)}g.add(tail);
 for(let i=0;i<7;i++){const spine=new T.Mesh(new T.ConeGeometry(.12+(6-i)*.018,.55+(6-i)*.06,6),dark);spine.position.set(0,3.25-i*.12,1.2-i*.9);spine.rotation.x=-.22;g.add(spine)}
 g.position.set(x,worldY==null?H(x,z)+.3:worldY,z);scene.add(g);const v={type:'Dragon',kind:'dragon',group:g,x,z,yaw:Math.PI,speed:0,alt:0,vy:0,pitch:0,roll:0,airborne:false,stalled:false,wings,fireClock:0,caveY:worldY};vehicles.push(v);dragon=v;return v
}
function makeDragonCave(){
 const g=new T.Group(),rock=new T.MeshStandardMaterial({color:0x171514,roughness:1}),rock2=new T.MeshStandardMaterial({color:0x302925,roughness:1}),lava=new T.MeshStandardMaterial({color:0xff4a08,emissive:0xff2400,emissiveIntensity:3.5,roughness:.35}),cx=DRAGON_CAVE_X,cz=DRAGON_CAVE_Z,surface=H(cx,cz),floorY=surface-31;
 // Giant runway-side mouth: visible from the airfield, with a glowing threshold and unmistakable landmark silhouette.
 const mouthZ=DRAGON_CAVE_MOUTH_Z,mouthY=H(cx,mouthZ);
 for(let i=0;i<15;i++){const a=Math.PI*i/14,b=new T.Mesh(new T.DodecahedronGeometry(2.7+(i%3)*.5,0),i%2?rock:rock2);b.position.set(cx+Math.cos(a)*10.5,mouthY+Math.sin(a)*8.5,mouthZ);b.scale.set(1.25,1.1,1.55);g.add(b)}
 // A literal black opening behind the rock arch makes the entrance impossible to confuse with ordinary terrain.
 const portal=new T.Mesh(new T.CircleGeometry(8.15,32),new T.MeshBasicMaterial({color:0x020101,side:T.DoubleSide}));portal.position.set(cx,mouthY+4.15,mouthZ+1.15);g.add(portal);
 const throat=new T.Mesh(new T.CylinderGeometry(7.7,7.7,22,24,1,true),new T.MeshStandardMaterial({color:0x100b09,roughness:1,side:T.BackSide}));throat.rotation.x=Math.PI/2;throat.position.set(cx,mouthY+3.8,mouthZ+10.5);g.add(throat);
 const mouthGlow=new T.PointLight(0xff5a16,9.5,64,1.35);mouthGlow.position.set(cx,mouthY+3,mouthZ-1);g.add(mouthGlow);
 const emberMat=new T.MeshBasicMaterial({color:0xff6a19});for(const sx of[-1,1]){const e=new T.Mesh(new T.ConeGeometry(.42,1.8,8),emberMat);e.position.set(cx+sx*7.4,mouthY+.9,mouthZ-.6);g.add(e)}
 townText(g,'DRAGON CAVERN',cx,mouthY+10.7,mouthZ-.7,9.8,1.35);
 townInteractions.push({x:cx,z:mouthZ-4,type:'cityInfo',label:'DRAGON CAVERN',message:'Dragon Cavern • descend through the glowing stone mouth'});
 // Build a physical descending floor through the terrain opening. This is the surface the player actually walks on;
 // the procedural overworld has been removed above it, so there is no second map floor clipping through the cave.
 const rampStart=mouthZ+1,rampEnd=cz+3,rampLen=rampEnd-rampStart,rampMid=(rampStart+rampEnd)/2,rampDrop=30;
 const ramp=new T.Mesh(new T.BoxGeometry(15,.65,rampLen+3),rock2);ramp.position.set(cx,mouthY-rampDrop/2-.25,rampMid);ramp.rotation.x=-Math.atan2(rampDrop,rampLen);g.add(ramp);
 // Rock ribs frame the descent without sealing its centre.
 for(let j=0;j<9;j++){const t=j/8,zz=T.MathUtils.lerp(rampStart,rampEnd,t),yy=T.MathUtils.lerp(mouthY-1,floorY+3,t);for(const sx of[-1,1]){const b=new T.Mesh(new T.DodecahedronGeometry(2.5+(j%3)*.35,0),j%2?rock:rock2);b.position.set(cx+sx*8.1,yy+2.2,zz);b.scale.set(1.15,1.25,1.4);g.add(b)}}
 // Huge underground vault, rough stone shell, with an unobstructed central flight corridor back to the tunnel.
 for(let j=0;j<7;j++)for(let i=0;i<18;i++){const a=i/18*Math.PI*2,b=new T.Mesh(new T.DodecahedronGeometry(4.2+(i+j)%3*.65,0),i%2?rock:rock2);b.position.set(cx+Math.cos(a)*(17+j*.45),floorY+8+Math.sin(a)*11,cz+29+j*5.5);b.scale.set(1.25,1.1,1.7);g.add(b)}
 // The shaft is now a true vertical void through the terrain, with its own rock walls and a completely separate cavern floor 31m below the world surface.
 const shaft=new T.Mesh(new T.CylinderGeometry(11.3,12.8,31,32,1,true),new T.MeshStandardMaterial({color:0x211b18,roughness:1,side:T.BackSide}));shaft.position.set(cx,surface-15.5,cz);g.add(shaft);
 for(let i=0;i<18;i++){const a=i/18*Math.PI*2,r=11.6+(i%3)*.7,b=new T.Mesh(new T.DodecahedronGeometry(2.2+(i%2)*.55,0),i%2?rock:rock2);b.position.set(cx+Math.cos(a)*r,surface-.8,cz+Math.sin(a)*r);b.scale.set(1.25,.8,1.25);g.add(b)}
 const floor=new T.Mesh(new T.PlaneGeometry(38,84,1,1),rock2);floor.rotation.x=-Math.PI/2;floor.position.set(cx,floorY,cz+32);g.add(floor);
 const shaftFloor=new T.Mesh(new T.CircleGeometry(12.7,32),rock2);shaftFloor.rotation.x=-Math.PI/2;shaftFloor.position.set(cx,floorY+.02,cz);g.add(shaftFloor);
 // Lava is a narrow stream rather than a pool, winding down one side of the cavern.
 const lavaPts=[];for(let i=0;i<8;i++)lavaPts.push(new T.Vector3(cx-10+Math.sin(i*.9)*2.2,floorY+.12,cz+10+i*8));const lavaCurve=new T.CatmullRomCurve3(lavaPts),stream=new T.Mesh(new T.TubeGeometry(lavaCurve,48,1.25,8,false),lava);g.add(stream);
 // Torch sconces alternate along both walls. Each has a visible flame and local warm light.
 const torchMetal=new T.MeshStandardMaterial({color:0x24130d,roughness:.8,metalness:.25}),flameMat=new T.MeshBasicMaterial({color:0xffa126});for(let i=0;i<8;i++)for(const sx of[-1,1]){const z=cz+8+i*8,y=floorY+3.2;const pole=new T.Mesh(new T.CylinderGeometry(.07,.1,1.3,6),torchMetal);pole.position.set(cx+sx*13.5,y,z);pole.rotation.z=sx*.5;g.add(pole);const flame=new T.Mesh(new T.ConeGeometry(.24,.75,7),flameMat);flame.position.set(cx+sx*13.15,y+.72,z);g.add(flame);if(i%2===0){const l=new T.PointLight(0xff7628,2.8,15,1.8);l.position.copy(flame.position);g.add(l)}}
 // Stalactites/stalagmites and a raised dragon roost at the deepest end.
 for(let i=0;i<20;i++){const x=cx-14+hash(i,4,7)*28,z=cz+8+hash(i,9,11)*58,h=1.5+hash(i,12,3)*4;const s=new T.Mesh(new T.ConeGeometry(.35+hash(i,6,2)*.7,h,7),i%2?rock:rock2);s.position.set(x,floorY+h*.5,z);g.add(s)}
 const roost=new T.Mesh(new T.CylinderGeometry(6.5,8,1.8,12),rock2);roost.position.set(cx+5,floorY+.9,cz+62);g.add(roost);
 // Return pad is placed on the cavern floor near the roost, safely clear of the lava stream.
 const returnX=cx+10,returnZ=cz+54,returnRing=new T.Mesh(new T.RingGeometry(1.35,1.85,32),new T.MeshBasicMaterial({color:0x7be8ff,transparent:true,opacity:.9}));returnRing.rotation.x=-Math.PI/2;returnRing.position.set(returnX,floorY+.16,returnZ);g.add(returnRing);
 const returnCore=new T.Mesh(new T.CircleGeometry(1.28,32),new T.MeshBasicMaterial({color:0x071d24}));returnCore.rotation.x=-Math.PI/2;returnCore.position.set(returnX,floorY+.15,returnZ);g.add(returnCore);townText(g,'RETURN TO HANGAR',returnX,floorY+2.6,returnZ,5.4,.65);
 townInteractions.push({x:returnX,z:returnZ,type:'dragonTeleport',label:'RETURN TO HANGAR',destination:'hangar',realm:'earth'});
 const glow=new T.PointLight(0xff3d0a,4.5,55,1.5);glow.position.set(cx-7,floorY+4,cz+40);g.add(glow);scene.add(g);makeDragon(cx+5,cz+62,floorY+1.8)
}
function dragonFire(){
 if(!activeVehicle||activeVehicle.kind!=='dragon')return;const v=activeVehicle,now=performance.now();if(now-v.fireClock<85)return;v.fireClock=now;
 const dir=new T.Vector3(Math.sin(v.yaw)*Math.cos(v.pitch),Math.sin(v.pitch),Math.cos(v.yaw)*Math.cos(v.pitch));
 const p=v.group.position.clone().add(new T.Vector3(0,3.3,0)).addScaledVector(dir,3.8);for(let i=0;i<3;i++){const m=new T.Mesh(new T.SphereGeometry(.24+Math.random()*.22,6,4),new T.MeshBasicMaterial({color:i?0xff6a12:0xffe36b,transparent:true,opacity:.9}));m.position.copy(p).addScaledVector(dir,i*.65);scene.add(m);dragonFires.push({m,v:dir.clone().multiplyScalar(30+Math.random()*8),life:.75})}
}
function updateDragonFire(dt){
 if(dragonFireHeld)dragonFire();for(let i=dragonFires.length-1;i>=0;i--){const f=dragonFires[i];f.life-=dt;f.m.position.addScaledVector(f.v,dt);f.m.scale.multiplyScalar(1+dt*1.7);f.m.material.opacity=Math.max(0,f.life*1.3);if(f.life<=0){scene.remove(f.m);f.m.geometry.dispose();f.m.material.dispose();dragonFires.splice(i,1);continue}for(const c of chunks.values()){if(c.mode!=='near')continue;for(let ti=0;ti<c.d.trees.length;ti++){const q=c.d.trees[ti],wx=c.cx*CH+q[0],wz=c.cz*CH+q[1],id=key(c.cx,c.cz)+':'+ti;if(!burntTrees.has(id)&&Math.hypot(f.m.position.x-wx,f.m.position.z-wz)<2.1*q[2]){burntTrees.add(id);q[3]=1;world.burntTrees=world.burntTrees||{};world.burntTrees[id]=1;spawnVehicleParticle(new T.Vector3(wx,H(wx,wz)+2,wz),0xff5a16,.8,1.3,.5,1);persist();lastSyncX=1e9;lastSyncZ=1e9;sync(true);break}}}}
}
// Build the large underground lair after the core world has finished initialising.
// Creating hundreds of cave meshes synchronously here was stalling mobile Safari during its first frame.
// Dragon cavern is part of the same game file, but is created only when the player actually uses the hangar teleporter.
// This keeps all cave code/assets local while removing cave construction entirely from startup.
let dragonCaveBuilt=false,dragonCaveActive=false;
function dragonCaveFloor(){return H(DRAGON_CAVE_X,DRAGON_CAVE_Z)-31}
function caveGroundH(x,z){
 if(!dragonCaveActive)return H(x,z);
 const dx=Math.abs(x-DRAGON_CAVE_X),mouth=DRAGON_CAVE_MOUTH_Z+1,rampEnd=DRAGON_CAVE_Z+3;
 // Match collision height to the visible descending ramp, then use the independent deep-cave floor.
 if(dx<8.2&&z>=mouth&&z<rampEnd){const t=T.MathUtils.clamp((z-mouth)/(rampEnd-mouth),0,1);return T.MathUtils.lerp(H(DRAGON_CAVE_X,DRAGON_CAVE_MOUTH_Z)-1,dragonCaveFloor(),t)}
 if(dx<19&&z>=rampEnd&&z<DRAGON_CAVE_Z+76)return dragonCaveFloor();
 return H(x,z)
}
function ensureDragonCave(){if(dragonCaveBuilt)return true;try{makeDragonCave();dragonCaveBuilt=true;return true}catch(e){console.error('Dragon cave init',e);return false}}
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
   }else if(v.kind==='dragon'){
     const flap=Math.sin(t*(5+Math.min(8,Math.abs(v.speed||0)*.18)))*(.35+Math.min(.35,(v.alt||0)*.03));if(v.wings){v.wings[0].rotation.z=flap;v.wings[1].rotation.z=-flap}if(v===activeVehicle&&flightThrottle>.25&&Math.random()<dt*3)spawnVehicleParticle(localWorld(v,new T.Vector3(0,3.3,3.8)),0xff7b22,.16,.35,.05,.45);
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
let welcomeDisplay=null;
function makeWelcomeScreen(parent,x,y,z){
 const cv=document.createElement('canvas');cv.width=768;cv.height=432;
 const ctx=cv.getContext('2d'),tex=new T.CanvasTexture(cv);tex.colorSpace=T.SRGBColorSpace;tex.minFilter=T.LinearFilter;tex.magFilter=T.LinearFilter;tex.generateMipmaps=false;
 const mat=new T.MeshBasicMaterial({map:tex,toneMapped:false,side:T.DoubleSide,depthTest:true,depthWrite:true,transparent:false});
 const scr=new T.Mesh(new T.PlaneGeometry(7.9,4.45),mat);
 scr.position.set(x+.22,y,z);scr.rotation.y=Math.PI/2;scr.frustumCulled=false;parent.add(scr);
 // emissive-looking backing makes the physical TV unmistakable even before the canvas' first animated upload
 const glow=new T.Mesh(new T.PlaneGeometry(8.02,4.57),new T.MeshBasicMaterial({color:0x06232b,side:T.DoubleSide}));glow.position.set(x+.08,y,z);glow.rotation.y=Math.PI/2;parent.add(glow);
 // Thin physical bezel: from the spawn point it reads as a full-screen menu until the player moves.
 const bezel=new T.MeshStandardMaterial({color:0x071015,metalness:.8,roughness:.22});
 startBox(parent,x,y+2.3,z,0.13,.12,8.18,bezel,false);startBox(parent,x,y-2.3,z,0.13,.12,8.18,bezel,false);
 startBox(parent,x,y,z-4.05,.13,4.72,.12,bezel,false);startBox(parent,x,y,z+4.05,.13,4.72,.12,bezel,false);
 welcomeDisplay={cv,ctx,tex,last:-1,scr};drawWelcomeScreen(0,true);tex.needsUpdate=true;
 return scr
}
function drawWelcomeScreen(t,force=false){
 if(!welcomeDisplay)return;const d=welcomeDisplay,frame=Math.floor(t*12);if(!force&&frame===d.last)return;d.last=frame;
 const c=d.ctx,w=d.cv.width,h=d.cv.height,pulse=.5+.5*Math.sin(t*2.4),scan=(t*85)%h;
 let g=c.createLinearGradient(0,0,w,h);g.addColorStop(0,'#02070b');g.addColorStop(.48,'#071a22');g.addColorStop(1,'#020609');c.fillStyle=g;c.fillRect(0,0,w,h);
 // animated topographic/radar field
 c.save();c.globalAlpha=.18;c.strokeStyle='#55eaff';c.lineWidth=1;
 for(let r=35;r<390;r+=38){c.beginPath();for(let a=0;a<=Math.PI*2+.1;a+=.12){const rr=r+Math.sin(a*5+t*1.4+r)*7,x=w*.5+Math.cos(a)*rr,y=h*.54+Math.sin(a)*rr*.42;a?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}
 c.globalAlpha=.12;for(let x=0;x<w;x+=48){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke()}for(let y=0;y<h;y+=48){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}c.restore();
 c.fillStyle='rgba(80,235,255,.08)';c.fillRect(0,scan,w,3);c.fillStyle='rgba(80,235,255,.025)';c.fillRect(0,scan-24,w,48);
 c.textAlign='center';c.shadowColor='#63efff';c.shadowBlur=14+8*pulse;c.fillStyle='#e9fdff';c.font='900 55px Arial';c.fillText('WILDLANDS',w/2,92);c.font='700 20px Arial';c.fillStyle='#78efff';c.fillText('I M M U T A B L E',w/2,124);c.shadowBlur=0;
 const phase=(t%12);let title,lines;
 if(phase<3.2){title='SYSTEM WAKE';lines=['WILDERNESS LINK ESTABLISHED','AIRFIELD HABITAT ONLINE','MOVE TO BREAK THE INTERFACE'];}
 else if(phase<6.3){title='HOW TO MOVE';lines=['LEFT THUMB  •  WALK / STRAFE','RIGHT SIDE  •  LOOK AROUND','SPRINT  •  HOLD WHILE MOVING'];}
 else if(phase<9.2){title='SURVIVE + EXPLORE';lines=['INTERACT WITH VEHICLES, PEOPLE & OBJECTS','CRAFT • BUILD • COMPLETE MISSIONS','THE WORLD CONTINUES BEYOND THIS ROOM'];}
 else{title='YOU ARE ALREADY IN THE GAME';lines=['THIS IS NOT A MENU','TURN AROUND • WALK OUT • EXPLORE','YOUR JOURNEY STARTS NOW'];}
 c.fillStyle='rgba(2,12,17,.82)';c.fillRect(112,158,w-224,178);c.strokeStyle=`rgba(104,241,255,${.45+.3*pulse})`;c.lineWidth=2;c.strokeRect(112,158,w-224,178);
 c.fillStyle='#8df4ff';c.font='800 22px Arial';c.fillText(title,w/2,196);c.font='600 17px Arial';c.fillStyle='#d7fbff';lines.forEach((s,i)=>c.fillText(s,w/2,235+i*31));
 c.font='700 14px Arial';c.fillStyle=`rgba(132,246,255,${.55+.4*pulse})`;c.fillText('NO START BUTTON REQUIRED  //  MOVE WHEN READY',w/2,386);
 c.textAlign='left';c.font='12px monospace';c.fillStyle='#58b9c4';c.fillText('AIRFIELD NODE 01',22,26);c.textAlign='right';c.fillText('LIVE WORLD // '+String(Math.floor(t)%1000).padStart(3,'0'),w-22,26);
 d.tex.needsUpdate=true
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
 makeWelcomeScreen(g,-17.05,y+3.2,-24);
 // Two-way Dragon Cavern teleporter: a bright physical pad inside the starter hangar room.
 const tpMat=new T.MeshBasicMaterial({color:0xff6a18,transparent:true,opacity:.95,side:T.DoubleSide}),tpRing=new T.Mesh(new T.RingGeometry(1.8,2.45,32),tpMat);tpRing.rotation.x=-Math.PI/2;tpRing.position.set(-13.25,y+.18,-24);g.add(tpRing);
 const tpCore=new T.Mesh(new T.CircleGeometry(1.72,32),new T.MeshBasicMaterial({color:0xff3510,transparent:true,opacity:.72,side:T.DoubleSide}));tpCore.rotation.x=-Math.PI/2;tpCore.position.set(-13.25,y+.17,-24);g.add(tpCore);
 const tpBeam=new T.Mesh(new T.CylinderGeometry(1.7,2.1,4.6,24,1,true),new T.MeshBasicMaterial({color:0xff6a18,transparent:true,opacity:.18,side:T.DoubleSide,depthWrite:false}));tpBeam.position.set(-13.25,y+2.3,-24);g.add(tpBeam);
 const tpLight=new T.PointLight(0xff5a16,8,20,1.4);tpLight.position.set(-13.25,y+2,-24);g.add(tpLight);
 townText(g,'ENTER DRAGON CAVERN',-13.25,y+4.9,-24,7.2,.82);

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
function inCityZone(x,z){return x>-365&&x<-64&&z>-100&&z<100}
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
   let m=cityBox(parent,x,H(x,z)+0.045,z,width,0.08,len,cityM.road,false);m.rotation.y=ang;m.castShadow=false
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
// Register the hangar teleporter only after the interaction registry exists.
townInteractions.push({x:-13.25,z:-24,type:'dragonTeleport',label:'ENTER DRAGON CAVERN',destination:'cave'});
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
const cityExpansionGroup=new T.Group();cityGroup.add(cityExpansionGroup);
const cityTraffic=[],cityTrafficLights=[],cityCrowd=[];
function makeTrafficLight(parent,x,z,rot=0,phase=0){
 const y=H(x,z),g=new T.Group(),pole=cityMat(0x20272a,.6),off=cityMat(0x15191b,.55);
 cityBox(g,0,2.25,0,.16,4.5,.16,pole,false);cityBox(g,0,4.25,0,.7,1.55,.48,off,false);
 const red=new T.Mesh(new T.SphereGeometry(.13,7,5),new T.MeshBasicMaterial({color:0xff352e})),
       amber=new T.Mesh(new T.SphereGeometry(.13,7,5),new T.MeshBasicMaterial({color:0xffb632})),
       green=new T.Mesh(new T.SphereGeometry(.13,7,5),new T.MeshBasicMaterial({color:0x59ff87}));
 red.position.set(0,4.7,.25);amber.position.set(0,4.25,.25);green.position.set(0,3.8,.25);g.add(red,amber,green);
 g.position.set(x,y,z);g.rotation.y=rot;parent.add(g);cityTrafficLights.push({g,red,amber,green,phase})
}
function makeCityCar(parent,route,index,color){
 const g=new T.Group(),body=cityMat(color,.38),dark=cityMat(0x1a2024,.55),glass=cityM.glass;
 cityBox(g,0,.52,0,1.75,.62,3.55,body,false);cityBox(g,0,1.0,-.15,1.45,.62,1.8,glass,false);
 for(const sx of[-.82,.82])for(const sz of[-1.05,1.05]){const w=new T.Mesh(new T.CylinderGeometry(.28,.28,.18,10),dark);w.rotation.z=Math.PI/2;w.position.set(sx,.32,sz);g.add(w)}
 const h1=new T.Mesh(new T.SphereGeometry(.09,6,4),new T.MeshBasicMaterial({color:0xfff2c2}));h1.position.set(-.48,.62,1.81);const h2=h1.clone();h2.position.x=.48;g.add(h1,h2);
 parent.add(g);cityTraffic.push({g,route,index:index||0,t:Math.random(),speed:5.5+Math.random()*2.5,wait:0})
}
function addCityInterior(parent,cx,cz,w,d,y,kind){
 const mat=kind==='gallery'?cityM.cream:kind==='hotel'?cityM.wood:cityM.dark;
 if(kind==='market'){
   for(const z of[cz-3,cz+2])for(const x of[cx-5,cx,cx+5])cityBox(parent,x,y+.65,z,3.4,1.3,1.1,cityM.wood,true)
 }else if(kind==='garage'){
   for(const x of[cx-5,cx,cx+5]){cityBox(parent,x,y+.45,cz+2,2.8,.9,4.4,cityM.dark,true);cityBox(parent,x,y+2.2,cz+4,.15,3.2,.15,cityM.red,false)}
 }else{
   cityBox(parent,cx,y+.55,cz+2,w*.55,1.1,1.2,mat,true);
   for(const sx of[-w*.27,w*.27])cityBox(parent,cx+sx,y+.38,cz-2,2.1,.76,1.2,cityM.wood,true)
 }
}
function makeCityExpansion(){
 const g=cityExpansionGroup,y=TOWN_LEVEL;
 // Main boulevard continues west from the original town.
 cityRoad(g,-184,8,-352,8,12,20);
 for(const z of[-62,72])cityRoad(g,-194,z,-350,z,9,18);
 for(const x of[-210,-250,-292,-334])cityRoad(g,x,-82,x,86,9,18);
 for(let x=-342;x<=-202;x+=18){cityLamp(g,x,-51);cityLamp(g,x,61)}
 for(const x of[-222,-264,-306,-344])for(let z=-45;z<=54;z+=20)cityLamp(g,x,z);

 // Accessible civic/commercial buildings.
 let s=townShell(g,-218,-28,28,24,8.2,cityM.brick,'CITY MARKET');addCityInterior(g,-218,-28,28,24,s.y,'market');addTownInteraction('shop',-218,-20,'SHOP AT CITY MARKET');
 s=townShell(g,-258,-28,30,24,9.2,cityM.plaster,'GRAND HOTEL');addCityInterior(g,-258,-28,30,24,s.y,'hotel');addTownInteraction('cityHotel',-258,-20,'REST AT GRAND HOTEL');
 s=townShell(g,-300,-28,30,24,8.4,cityM.blue,'MOTOR GARAGE');addCityInterior(g,-300,-28,30,24,s.y,'garage');addTownInteraction('shop',-300,-20,'BROWSE MOTOR GARAGE');
 s=townShell(g,-340,-28,28,24,8.6,cityM.cream,'CITY HALL');addCityInterior(g,-340,-28,28,24,s.y,'gallery');addTownInteraction('noticeboard',-340,-20,'CHECK CITY NOTICE BOARD');

 s=townShell(g,-218,48,28,24,8.2,cityM.blue,'TRANSIT HUB','north');addCityInterior(g,-218,48,28,24,s.y,'gallery');addTownInteraction('cityTransit',-218,40,'TAKE TRANSIT TO AIRFIELD');
 s=townShell(g,-258,48,30,24,8.4,cityM.brick,'TECH CENTRE','north');addCityInterior(g,-258,48,30,24,s.y,'gallery');addTownInteraction('robotTerminal',-258,40,'USE TECH CENTRE ROBOT TERMINAL');
 s=townShell(g,-300,48,30,24,8.2,cityM.plaster,'CITY MUSEUM','north');addCityInterior(g,-300,48,30,24,s.y,'gallery');addTownInteraction('cityInfo',-300,40,'ENTER CITY MUSEUM',{message:'City Museum • local history and exploration exhibits'});
 s=townShell(g,-340,48,28,24,8.8,cityM.cream,'APARTMENTS','north');addCityInterior(g,-340,48,28,24,s.y,'hotel');addTownInteraction('cityInfo',-340,40,'ENTER APARTMENT LOBBY',{message:'Residential tower lobby • lift access under development'});

 // Skyline shells behind accessible street-front buildings. Kept collider-free.
 const skylineMat=[cityM.dark,cityM.blue,cityM.brick,cityM.plaster];
 for(let i=0;i<18;i++){
   const x=-205-(i%6)*27,z=i<6?-82:i<12?90:(i%2?-92:92),h=12+(i%5)*4,w=13+(i%3)*3,d=12+(i%4)*2;
   const yy=H(x,z);cityBox(g,x,yy+h/2,z,w,h,d,skylineMat[i%skylineMat.length],true);
   for(let f=0;f<3;f++){const win=new T.Mesh(new T.BoxGeometry(w*.65,.35,.05),new T.MeshBasicMaterial({color:0xffe5a8,transparent:true,opacity:.5}));win.position.set(x,yy+3+f*3.1,z-d/2-.03);g.add(win)}
 }

 // Traffic signals at the main intersections.
 for(const x of[-210,-250,-292,-334]){
   makeTrafficLight(g,x-4,4,0,(x+400)*.01);makeTrafficLight(g,x+4,12,Math.PI,(x+400)*.01+.5)
 }

 // Cars follow two independent road loops; no physics/collision overhead.
 const loop1=[[-190,4],[-346,4],[-346,68],[-190,68]],loop2=[[-194,12],[-334,12],[-334,-58],[-194,-58]];
 const colors=[0xc74d3d,0x3f75b5,0xd4b348,0x4f9b74,0xdddddd,0x7a5aa6,0x2f3438,0xb56a3d];
 for(let i=0;i<(IS_MOBILE?8:12);i++)makeCityCar(g,i%2?loop1:loop2,i%4,colors[i%colors.length]);

 // More life without creating a separate expensive AI system.
 const people=[
  [-205,18,0x5f7892],[-226,15,0x8d5c48],[-246,21,0x4e7b5d],[-270,14,0x76508a],
  [-289,22,0x856c45],[-314,16,0x4d7185],[-332,25,0x925d5d],[-346,12,0x596e48],
  [-230,63,0x79604a],[-272,64,0x526f8d],[-312,63,0x8a4d67],[-344,59,0x4f7d6a]
 ];
 for(let i=0;i<people.length;i++){const p=people[i],h=makeHuman(g,p[0],p[1],p[2],'Resident','Citizen '+(i+1));h.userData.homeX=p[0];h.userData.homeZ=p[1];cityCrowd.push(h)}
}
makeCityExpansion();

function updateCityTraffic(dt,t){
 if(!cityExpansionGroup.visible)return;
 const cycle=(t%12)/12;
 for(const l of cityTrafficLights){
   const q=(cycle+l.phase)%1,green=q<.48,amber=q>=.48&&q<.58;
   l.red.visible=!green&&!amber;l.amber.visible=amber;l.green.visible=green
 }
 for(const c of cityTraffic){
   if(c.wait>0){c.wait-=dt;continue}
   const r=c.route,a=r[c.index%r.length],b=r[(c.index+1)%r.length],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz)||1;
   const horizontal=Math.abs(dx)>Math.abs(dz),signalGreen=horizontal?cycle<.48:cycle>.58;
   if(c.t>.86&&!signalGreen)c.t=Math.min(c.t,.88);else c.t+=dt*c.speed/len;
   if(c.t>=1){c.t-=1;c.index=(c.index+1)%r.length}
   const aa=r[c.index%r.length],bb=r[(c.index+1)%r.length],x=T.MathUtils.lerp(aa[0],bb[0],c.t),z=T.MathUtils.lerp(aa[1],bb[1],c.t),targetYaw=Math.atan2(bb[0]-aa[0],bb[1]-aa[1]);
   c.g.position.set(x,H(x,z)+.03,z);if(c.yaw==null)c.yaw=targetYaw;let yd=((targetYaw-c.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;c.yaw+=T.MathUtils.clamp(yd,-dt*2.8,dt*2.8);c.g.rotation.y=c.yaw
 }
}

// ---------------------------------------------------------------------------
// EAST ROBOT COMBAT INSTITUTE
// A self-contained expansion on the opposite side of the runway from West Town.
// ---------------------------------------------------------------------------
world.robotArena=world.robotArena||{lastA:null,lastB:null,trophies:[],matches:0,winsA:0,winsB:0};
const robotArenaGroup=new T.Group(),robotArenaLights=[],robotCabinets=[],robotDebris=[],robotShotPool=[];
const robotShotGeo=new T.SphereGeometry(1,6,4);for(let i=0;i<(IS_MOBILE?14:22);i++){const m=new T.Mesh(robotShotGeo,new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,depthWrite:false}));m.visible=false;m.userData.life=0;robotArenaGroup.add(m);robotShotPool.push(m)}let robotShotCursor=0;
let robotScoreCanvas=null,robotScoreCtx=null,robotScoreTexture=null,robotScoreAt=0,
    robotTerminalScreen=null,robotFeedCameraIndex=0,robotFeedAt=0,robotBossPending=false,robotSpectatorMode=false;
const robotFeedTarget=new T.WebGLRenderTarget(IS_MOBILE?384:512,IS_MOBILE?216:288,{minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true}),
      robotFeedCamera=new T.PerspectiveCamera(58,16/9,.1,260);
const robotFeedPositions=[
 {name:'NORTH',p:new T.Vector3(140,ARENA_LEVEL+11,-31),look:new T.Vector3(140,ARENA_LEVEL+3,0)},
 {name:'SOUTH',p:new T.Vector3(140,ARENA_LEVEL+11,31),look:new T.Vector3(140,ARENA_LEVEL+3,0)},
 {name:'SIDE',p:new T.Vector3(171,ARENA_LEVEL+8,0),look:new T.Vector3(140,ARENA_LEVEL+3,0)},
 {name:'OVERHEAD',p:new T.Vector3(140,ARENA_LEVEL+34,2),look:new T.Vector3(140,ARENA_LEVEL+1,0)}
];
scene.add(robotArenaGroup);

const robotPartSets={
 head:[
  {name:'Scout Head',hp:-4,speed:1.1,stability:0,energy:2},
  {name:'Heavy Sensor',hp:5,speed:-.3,stability:2,energy:4},
  {name:'Armoured Wedge',hp:10,speed:-.8,stability:4,energy:0},
  {name:'Twin Optic',hp:1,speed:.6,stability:1,energy:3},
  {name:'Radar Dome',hp:0,speed:.2,stability:0,energy:7},
  {name:'Spike Front',hp:7,speed:-.2,stability:2,energy:0},
  {name:'Angular Assault',hp:5,speed:.4,stability:2,energy:1},
  {name:'Compact Tactical',hp:-1,speed:1.2,stability:1,energy:1},
  {name:'Shielded Visor',hp:8,speed:-.4,stability:3,energy:2},
  {name:'Experimental AI',hp:0,speed:1.5,stability:-1,energy:8}
 ],
 torso:[
  {name:'Light Frame',hp:-15,speed:2.2,stability:-2,energy:2},
  {name:'Balanced Chassis',hp:0,speed:0,stability:1,energy:2},
  {name:'Heavy Fortress',hp:28,speed:-2.2,stability:7,energy:-2},
  {name:'Wide Brawler',hp:18,speed:-1,stability:6,energy:0},
  {name:'Agile Narrow',hp:-8,speed:2.5,stability:-1,energy:1},
  {name:'Reactor Torso',hp:5,speed:.6,stability:0,energy:9},
  {name:'Tank Torso',hp:24,speed:-1.8,stability:8,energy:-1},
  {name:'Reinforced Wedge',hp:16,speed:-.6,stability:5,energy:1},
  {name:'Hover Core Torso',hp:-5,speed:2,stability:-2,energy:7},
  {name:'Modular Torso',hp:8,speed:.5,stability:2,energy:5}
 ],
 arms:[
  {name:'Standard Manipulators',damage:0,cooldown:0,stability:1},
  {name:'Heavy Pistons',damage:4,cooldown:.12,stability:2},
  {name:'Blade Supports',damage:3,cooldown:-.05,stability:0},
  {name:'Clamp Arms',damage:1,cooldown:.05,stability:3},
  {name:'Shield Arms',damage:-1,cooldown:.08,stability:6},
  {name:'Precision Arms',damage:2,cooldown:-.12,stability:0},
  {name:'Long Reach Arms',damage:1,cooldown:-.03,stability:-1},
  {name:'Hydraulic Smash',damage:6,cooldown:.18,stability:1},
  {name:'Twin Weapon Mounts',damage:4,cooldown:-.08,stability:-1},
  {name:'Flex Arms',damage:2,cooldown:-.1,stability:1}
 ],
 mobility:[
  {name:'Standard Biped',speed:0,stability:2,dodge:.02},
  {name:'Heavy Biped',speed:-1.2,stability:7,dodge:-.02},
  {name:'Runner Legs',speed:3.2,stability:-2,dodge:.13},
  {name:'Tank Treads',speed:-.7,stability:9,dodge:-.03},
  {name:'Quad Walker',speed:.2,stability:8,dodge:.04},
  {name:'Spider Walker',speed:.8,stability:7,dodge:.08},
  {name:'Hover Base',speed:3.4,stability:-4,dodge:.16},
  {name:'Monowheel',speed:4,stability:-6,dodge:.18},
  {name:'Stabilised Treads',speed:-.3,stability:10,dodge:0},
  {name:'Jump-Jet Legs',speed:2.2,stability:-1,dodge:.14}
 ],
 armour:[
  {name:'Light Alloy',armour:2,weight:-2,resist:{}},
  {name:'Standard Steel',armour:7,weight:0,resist:{}},
  {name:'Reinforced Steel',armour:12,weight:2,resist:{ballistic:.88}},
  {name:'Titanium Shell',armour:15,weight:1,resist:{kinetic:.86,ballistic:.9}},
  {name:'Spiked Armour',armour:10,weight:1,resist:{control:.72}},
  {name:'Heat-Resistant',armour:8,weight:0,resist:{heat:.5,energy:.88}},
  {name:'Shock-Resistant',armour:8,weight:0,resist:{shock:.48}},
  {name:'Energy-Diffusing',armour:9,weight:1,resist:{energy:.55,shock:.8}},
  {name:'Layered Composite',armour:13,weight:1,resist:{kinetic:.82,ballistic:.82,heat:.86}},
  {name:'Reactive Armour',armour:14,weight:2,resist:{explosive:.55,kinetic:.9}}
 ],
 core:[
  {name:'Economy Motor',energy:2,heat:4,power:-1},
  {name:'Balanced Core',energy:5,heat:5,power:0},
  {name:'Overdrive Engine',energy:4,heat:-2,power:4},
  {name:'Heavy Torque',energy:3,heat:6,power:3},
  {name:'Turbo Reactor',energy:9,heat:-1,power:4},
  {name:'Cooling Core',energy:5,heat:12,power:0},
  {name:'Capacitor Core',energy:13,heat:3,power:2},
  {name:'High-Stability Core',energy:4,heat:6,power:1,stability:5},
  {name:'Berserker Core',energy:2,heat:-4,power:7},
  {name:'Experimental Core',energy:15,heat:-5,power:6,stability:-2}
 ]
};
const robotColours=[
 {name:'Crimson',a:0xa84032,b:0x934032},{name:'Solar Orange',a:0xd46d2f,b:0xb85f2e},{name:'Magenta',a:0xa84586,b:0x88457d},{name:'Gold',a:0xb6922f,b:0x9f7e31},{name:'Violet',a:0x8055a8,b:0x665099},{name:'Cobalt',a:0x365d9f,b:0x31518d},{name:'Cyan',a:0x2f8a85,b:0x327973},{name:'Emerald',a:0x3e8c55,b:0x36784b},{name:'Ice',a:0x7f9fb4,b:0x668ba5},{name:'Graphite',a:0x555c63,b:0x41484e}
];
const robotWeapons=[
 {name:'Spinning Saw',type:'kinetic',damage:15,range:3.2,cooldown:.72,heat:4,desc:'Shreds light armour'},
 {name:'Crushing Hammer',type:'kinetic',damage:23,range:3.5,cooldown:1.35,heat:3,stun:.28,desc:'Huge impact and stun'},
 {name:'Drill Lance',type:'kinetic',damage:18,range:4.1,cooldown:.95,heat:5,pierce:.45,desc:'Penetrates armour'},
 {name:'Flamethrower',type:'heat',damage:9,range:8,cooldown:.42,heat:9,burn:4,desc:'Heat damage over time'},
 {name:'Plasma Cutter',type:'energy',damage:14,range:7,cooldown:.7,heat:7,pierce:.18,desc:'Reliable armour cutter'},
 {name:'Shock Emitter',type:'shock',damage:8,range:9,cooldown:.9,heat:5,stun:.5,desc:'Disrupts electronics'},
 {name:'Rocket Pod',type:'explosive',damage:24,range:18,cooldown:1.8,heat:8,miss:.18,desc:'High burst, can miss'},
 {name:'Gatling Cannon',type:'ballistic',damage:7,range:16,cooldown:.23,heat:3,miss:.08,desc:'Sustained ranged fire'},
 {name:'Grabbing Claw',type:'control',damage:7,range:3.2,cooldown:1.05,heat:2,push:4.8,stun:.18,desc:'Controls and pushes'},
 {name:'Energy Blade',type:'energy',damage:17,range:3.8,cooldown:.58,heat:7,desc:'Fast melee cutter'}
];

function randomRobotConfig(){
 const o={};
 for(const k of Object.keys(robotPartSets))o[k]=Math.floor(Math.random()*10);
 o.weapon=Math.floor(Math.random()*10);o.color=Math.floor(Math.random()*10);
 return o
}
function normalRobotConfig(c){
 c=c||{};const o={};
 for(const k of Object.keys(robotPartSets))o[k]=T.MathUtils.clamp(Number(c[k])||0,0,9)|0;
 o.weapon=T.MathUtils.clamp(Number(c.weapon)||0,0,9)|0;o.color=T.MathUtils.clamp(Number(c.color)||0,0,9)|0;return o
}
function robotStats(c){
 c=normalRobotConfig(c);
 let s={hp:100,armour:0,speed:8,stability:10,energy:10,heat:12,damage:0,cooldown:0,dodge:0,power:0,weight:0};
 for(const k of Object.keys(robotPartSets)){
   const p=robotPartSets[k][c[k]];
   for(const [n,v] of Object.entries(p))if(typeof v==='number')s[n]=(s[n]||0)+v
 }
 s.speed=Math.max(3,s.speed-s.weight*.6);s.stability=Math.max(2,s.stability);s.hp=Math.max(55,s.hp);
 s.weapon=robotWeapons[c.weapon];return s
}
function robotName(c){
 const a=['IRON','VOLT','TITAN','STEEL','GRAVE','NOVA','RAGE','CYBER','HEX','WAR'],
       b=['HOWL','REAPER','FANG','BREAKER','VIPER','NODE','HAMMER','SPARK','CASKET','RAPTOR'];
 return a[(c.head+c.core+c.weapon)%a.length]+' '+b[(c.torso+c.mobility+c.arms)%b.length]
}
function robotMaterial(hex){return new T.MeshStandardMaterial({color:hex,roughness:.42,metalness:.58})}

function makeCombatRobot(c,team=0,mini=false){
 c=normalRobotConfig(c);
 const chosen=team?robotColours[c.color].b:robotColours[c.color].a,
       g=new T.Group(),primary=robotMaterial(chosen),dark=robotMaterial(0x20262b),steel=robotMaterial(c.armour===3?0x9aa6ad:c.armour===5?0x745f4d:0x737d83),
       glowColor=team?([0x75b9ff,0x74ffd8,0x9aa4ff][c.core%3]):([0xffa66d,0xff6f91,0xffd46e][c.core%3]),
       glow=new T.MeshStandardMaterial({color:glowColor,emissive:glowColor,emissiveIntensity:.72,roughness:.25});
 const torsoI=c.torso,headI=c.head,mobI=c.mobility,armI=c.arms;
 const tw=2.8+(torsoI%3)*.24,th=2.5+(torsoI%4)*.15,td=1.8+((torsoI+1)%3)*.18;
 const torso=new T.Mesh(new T.BoxGeometry(tw,th,td),primary);torso.position.y=4.2;g.add(torso);
 const chest=new T.Mesh(new T.BoxGeometry(tw*.72,.72,.18),glow);chest.position.set(0,4.25,td/2+.1);g.add(chest);
 // Armour selection changes the visible shell, not only the stats.
 const armourI=c.armour,plateMat=armourI===5?robotMaterial(0x6f5d4b):armourI===7?robotMaterial(0x405f6b):armourI===9?robotMaterial(0x596169):steel;
 for(const sx of[-1,1]){
   const plate=new T.Mesh(new T.BoxGeometry(.22,1.65,1.45),plateMat);plate.position.set(sx*(tw/2+.16),4.3,0);plate.rotation.z=sx*(armourI%4)*.035;g.add(plate)
 }
 if(armourI===4)for(const sx of[-1,1])for(const yy of[3.8,4.6]){const spike=new T.Mesh(new T.ConeGeometry(.16,.65,6),steel);spike.rotation.z=sx*Math.PI/2;spike.position.set(sx*(tw/2+.55),yy,0);g.add(spike)}
 if(armourI===9){for(const yy of[3.55,4.25,4.95]){const tile=new T.Mesh(new T.BoxGeometry(tw*.84,.26,.12),plateMat);tile.position.set(0,yy,td/2+.22);g.add(tile)}}
 // Core choice is represented by a rear power pack / capacitor bank.
 const coreI=c.core,corePack=new T.Mesh(new T.BoxGeometry(1.5,1.45,.52),dark);corePack.position.set(0,4.35,-td/2-.32);g.add(corePack);
 for(let i=0;i<1+(coreI%4);i++){const cell=new T.Mesh(new T.CylinderGeometry(.13,.13,.7,7),coreI>=4?glow:steel);cell.rotation.z=Math.PI/2;cell.position.set((i-(coreI%4)/2)*.34,4.35,-td/2-.62);g.add(cell)}
 const headShape=headI%3===0?new T.BoxGeometry(1.45+.05*headI,.85,1.1):headI%3===1?new T.SphereGeometry(.68+.018*headI,10,7):new T.CylinderGeometry(.58+.015*headI,.78+.012*headI,.85,8);
 const head=new T.Mesh(headShape,headI===9?glow:steel);head.position.y=6.15;g.add(head);
 const eye=new T.Mesh(new T.BoxGeometry(.8,.13,.08),glow);eye.position.set(0,6.2,.63);g.add(eye);
 const legs=[];
 if(mobI===3||mobI===8){
   for(const sx of[-.95,.95]){const tread=new T.Mesh(new T.BoxGeometry(1.05,.75,2.65),dark);tread.position.set(sx,.55,0);g.add(tread);legs.push(tread)}
 }else if(mobI===6||mobI===7){
   const base=new T.Mesh(mobI===7?new T.TorusGeometry(1.05,.38,8,16):new T.CylinderGeometry(1.7,1.9,.55,12),dark);base.position.y=.72;if(mobI===7)base.rotation.z=Math.PI/2;g.add(base);legs.push(base)
 }else{
   const count=(mobI===4||mobI===5)?4:2;
   for(let i=0;i<count;i++){const sx=(i%2?1:-1)*(count===4?1.25:.82),sz=count===4?(i<2?-.65:.65):0;const leg=new T.Mesh(new T.BoxGeometry(.55,2.25,.65),dark);leg.position.set(sx,1.55,sz);g.add(leg);legs.push(leg);const foot=new T.Mesh(new T.BoxGeometry(.9,.38,1.25),steel);foot.position.set(sx,.3,sz+.2);g.add(foot)}
 }
 const arms=[];
 for(const sx of[-1,1]){
   const shoulder=new T.Mesh(new T.SphereGeometry(.48,8,6),steel);shoulder.position.set(sx*(tw/2+.38),4.75,0);g.add(shoulder);
   const armPivot=new T.Group();armPivot.position.set(sx*(tw/2+.5),4.25,.05);
   const arm=new T.Mesh(new T.BoxGeometry(.52,2.0,.6),primary);arm.position.y=-.6;armPivot.add(arm);armPivot.rotation.z=sx*(armI%3)*.05;g.add(armPivot);arms.push(armPivot)
 }
 const w=robotWeapons[c.weapon],wg=new T.Group();wg.position.set(0,3.9,td/2+.65);g.add(wg);
 if(c.weapon===0){const saw=new T.Mesh(new T.CylinderGeometry(.78,.78,.16,16),steel);saw.rotation.z=Math.PI/2;wg.add(saw);wg.userData.spin=saw}
 else if(c.weapon===1){const shaft=new T.Mesh(new T.BoxGeometry(.22,.22,2.4),dark);shaft.position.z=1.0;wg.add(shaft);const hammer=new T.Mesh(new T.BoxGeometry(1.25,.65,.65),steel);hammer.position.z=2.0;wg.add(hammer)}
 else if(c.weapon===2){const drill=new T.Mesh(new T.ConeGeometry(.52,2.7,12),steel);drill.rotation.x=Math.PI/2;drill.position.z=1.45;wg.add(drill);wg.userData.spin=drill}
 else if(c.weapon===3){const nozzle=new T.Mesh(new T.CylinderGeometry(.28,.36,1.8,10),dark);nozzle.rotation.x=Math.PI/2;nozzle.position.z=.9;wg.add(nozzle)}
 else if(c.weapon===4||c.weapon===9){const blade=new T.Mesh(new T.BoxGeometry(.16,.42,2.8),glow);blade.position.z=1.5;wg.add(blade)}
 else if(c.weapon===5){const ring=new T.Mesh(new T.TorusGeometry(.65,.12,8,14),glow);ring.rotation.x=Math.PI/2;wg.add(ring)}
 else if(c.weapon===6){for(const sx of[-.45,.45]){const pod=new T.Mesh(new T.BoxGeometry(.58,.58,1.4),dark);pod.position.set(sx,0,.7);wg.add(pod)}}
 else if(c.weapon===7){const gun=new T.Mesh(new T.CylinderGeometry(.28,.34,2.5,10),dark);gun.rotation.x=Math.PI/2;gun.position.z=1.2;wg.add(gun)}
 else if(c.weapon===8){for(const sx of[-.45,.45]){const claw=new T.Mesh(new T.BoxGeometry(.22,.28,1.65),steel);claw.position.set(sx,0,.85);claw.rotation.y=sx*.2;wg.add(claw)}}
 g.userData={config:c,weaponGroup:wg,legs,arms,team,name:robotName(c),phase:Math.random()*6.28};
 if(mini)g.scale.setScalar(.22);return g
}

function makeRobotArena(){
 const g=robotArenaGroup,y=ARENA_LEVEL,cx=140,cz=0;
 const concrete=robotMaterial(0x555d61),black=robotMaterial(0x171d20),steel=robotMaterial(0x68747b),
       red=robotMaterial(0x8f3028),cyan=new T.MeshStandardMaterial({color:0x75e6ef,emissive:0x1c6970,emissiveIntensity:1.25,roughness:.25}),
       glass=new T.MeshPhysicalMaterial({color:0x6a97a9,transparent:true,opacity:.34,roughness:.08,metalness:.08});
 // Approach plaza and runway-side boulevard.
 startBox(g,61,y+.05,0,22,.1,14,mats.runway,false);
 startBox(g,79,y+.06,0,18,.12,12,concrete,false);
 for(let x=55;x<=92;x+=6){const lamp=new T.Mesh(new T.BoxGeometry(.15,3.8,.15),steel);lamp.position.set(x,y+1.9,-5.3);g.add(lamp);const bulb=new T.Mesh(new T.SphereGeometry(.15,6,5),cyan);bulb.position.set(x,y+3.85,-5.3);g.add(bulb)}
 // Grand arena foundation and combat floor.
 startBox(g,cx,y+.12,cz,92,.24,68,black,false);
 startBox(g,cx,y+.19,cz,70,.14,48,new T.MeshStandardMaterial({color:0x30373b,roughness:.7,metalness:.35}),false);
 for(const z of[-24,24])startBox(g,cx,y+2.25,z,72,4.5,.6,steel,true);
 // The runway-facing west wall has a real physical opening, not an invisible
 // collision exception through a solid mesh. Two wall sections leave a wide
 // central gate straight into the arena.
 for(const z of[-17,17])startBox(g,105,y+2.25,z,.6,4.5,14,steel,true);
 startBox(g,175,y+2.25,0,.6,4.5,48,steel,true);
 startDoorways.push({x:105,z:0,hx:3.6,hz:8.2},{x:175,z:0,hx:2.2,hz:5.5});
 // Direct entrance boulevard from the runway to the combat floor.
 startBox(g,91,y+.20,0,28,.14,10,concrete,false);
 startBox(g,103,y+.24,0,7,.18,9,new T.MeshStandardMaterial({color:0x2d383d,roughness:.6,metalness:.28}),false);
 for(const z of[-5.1,5.1])startBox(g,91,y+.34,z,28,.04,.14,cyan,false);
 // Monumental gate frame and overhead signage.
 for(const z of[-6.5,6.5])startBox(g,103,y+5.0,z,.7,9.8,.7,steel,false);
 startBox(g,103,y+9.5,0,.7,.7,13,steel,false);
 townText(g,'ARENA ENTRANCE',102.6,y+8.6,-.38,9.5,1.05);
 // Floor graphics.
 const ring=new T.Mesh(new T.RingGeometry(13,13.55,48),cyan);ring.rotation.x=-Math.PI/2;ring.position.set(cx,y+.29,cz);g.add(ring);
 for(const z of[-16,16])startBox(g,cx,y+.3,z,54,.025,.16,cyan,false);
 for(const x of[120,160])startBox(g,x,y+.3,0,.16,.025,35,cyan,false);
 // Spectator stands.
 for(const z of[-31,31])for(let i=0;i<4;i++){startBox(g,cx,y+.55+i*.55,z+(z<0?-i*1.5:i*1.5),82-i*4,.6,2.0,concrete,false)}
 // Boss-match viewing deck. The player is teleported here and gets an elevated
 // first-person spectator viewpoint while retaining normal look controls.
 startBox(g,140,y+6.8,-30,18,.45,8,black,false);
 for(const x of[131.2,148.8])startBox(g,x,y+4.2,-30,.45,8.4,8,steel,false);
 const rail=startBox(g,140,y+8.15,-25.9,18,.18,.18,cyan,false);
 const glassRail=new T.Mesh(new T.BoxGeometry(17.5,2.8,.12),glass);glassRail.position.set(140,y+7.0,-25.8);g.add(glassRail);
 const bossConsole=startBox(g,140,y+7.35,-31.5,4.6,1.1,1.4,steel,false);
 const bossButton=new T.Mesh(new T.BoxGeometry(1.15,.22,.75),new T.MeshBasicMaterial({color:0xff755f}));bossButton.position.set(140,y+8.02,-31.15);g.add(bossButton);
 townText(g,'BOSS VIEWING DECK',140,y+10.1,-34.15,11,1.05);
 addTownInteraction('robotBossStart',140,-30.5,'START BOSS MATCH');
 addTownInteraction('robotBossExit',133.5,-30.5,'RETURN TO DESIGN LAB');
 // Structural arches and premium lighting.
 for(const x of[102,116,140,164,178]){
   startBox(g,x,y+7,-34,.6,14,.6,steel,false);startBox(g,x,y+7,34,.6,14,.6,steel,false);
   startBox(g,x,y+13.7,0,.42,.42,68,steel,false)
 }
 for(const x of[112,128,152,168])for(const z of[-27,27]){
   const l=new T.SpotLight(0xeafcff,3.2,56,Math.PI/4,.55,1.3);l.position.set(x,y+12,z);l.target.position.set(cx,y,0);g.add(l,l.target);robotArenaLights.push(l);l.userData.baseIntensity=3.2;l.userData.owner=g;l.userData.maxDistance=170;managedLights.push(l)
 }
 // Design lab on southwest corner, open toward the plaza.
 const rx=91,rz=-27,rw=24,rd=19,rh=7;
 startBox(g,rx,y+.12,rz,rw,.24,rd,concrete,false);startBox(g,rx,y+rh,rz,rw,.32,rd,black,false);
 startBox(g,rx-rw/2+.25,y+rh/2,rz,.5,rh,rd,black,true);
 startBox(g,rx,y+rh/2,rz-rd/2+.25,rw,rh,.5,black,true);
 startBox(g,rx,y+rh/2,rz+rd/2-.25,rw,rh,.5,black,true);
 startBox(g,rx+rw/2-.25,y+rh/2,rz-6.3,.5,rh,6.4,black,true);
 startBox(g,rx+rw/2-.25,y+rh/2,rz+6.3,.5,rh,6.4,black,true);
 startDoorways.push({x:rx+rw/2,z:rz,hx:2.4,hz:3.1});
 townText(g,'ROBOT DESIGN LAB',rx,y+6.15,rz-rd/2-.27,9.5,1.1);
 // In-game design terminal.
 const desk=startBox(g,95.5,y+.72,-27,1.25,1.44,5.0,steel,true);
 const screenMat=new T.MeshBasicMaterial({map:robotFeedTarget.texture,color:0xffffff,side:T.DoubleSide,toneMapped:false});
 robotTerminalScreen=new T.Mesh(new T.PlaneGeometry(3.3,1.856),screenMat);
 // Put the display on the player-facing surface of the monitor rather than
 // inside the frame slab (the old placement was being occluded on iPhone).
 robotTerminalScreen.position.set(94.775,y+2.65,-27);robotTerminalScreen.rotation.y=Math.PI/2;robotTerminalScreen.renderOrder=12;g.add(robotTerminalScreen);
 const screenFrame=startBox(g,94.88,y+2.65,-27,.18,2.35,3.7,black,false);
 addTownInteraction('robotTerminal',93,-27,'USE ROBOT DESIGN TERMINAL');
 // Victory gallery along the north-west concourse.
 for(let i=0;i<8;i++){
   const x=84+(i%4)*5.1,z=19+(i>3?6:0);
   const base=startBox(g,x,y+.45,z,3.6,.9,3.6,black,false);
   const shell=new T.Mesh(new T.BoxGeometry(3.35,4.4,3.35),glass);shell.position.set(x,y+2.65,z);g.add(shell);
   const light=new T.Mesh(new T.BoxGeometry(2.5,.08,2.5),cyan);light.position.set(x,y+4.72,z);g.add(light);
   robotCabinets.push({x,y:y+.55,z,index:i})
 }
 townText(g,'VICTORY ARCHIVE',91.5,y+5.7,30.5,12,1.15);
 // Giant in-world match scoreboard facing the combat floor.
 robotScoreCanvas=document.createElement('canvas');robotScoreCanvas.width=768;robotScoreCanvas.height=192;robotScoreCtx=robotScoreCanvas.getContext('2d');
 robotScoreTexture=new T.CanvasTexture(robotScoreCanvas);robotScoreTexture.colorSpace=T.SRGBColorSpace;
 const scoreMat=new T.MeshBasicMaterial({map:robotScoreTexture}),scoreMesh=new T.Mesh(new T.PlaneGeometry(18,4.5),scoreMat);
 scoreMesh.position.set(cx,y+10.1,-33.55);g.add(scoreMesh);
 // External signage.
 townText(g,'ROBOT COMBAT INSTITUTE',140,y+14.2,-34.4,17,1.35);
 // Small gateway from runway side.
 startBox(g,73,y+4.3,-6,.55,8.6,.55,steel,false);startBox(g,73,y+4.3,6,.55,8.6,.55,steel,false);startBox(g,73,y+8.4,0,.5,.5,12,steel,false);
 return g
}
makeRobotArena();

function restoreRobotTrophies(){
 const saved=world.robotArena.trophies||[];
 saved.slice(-8).forEach((t,i)=>{
   const cab=robotCabinets[i];if(!cab)return;
   const m=makeCombatRobot(t.config,t.team,true);m.position.set(cab.x,cab.y+.15,cab.z);m.rotation.y=Math.PI;robotArenaGroup.add(m);cab.robot=m
 })
}
restoreRobotTrophies();

let robotMatch=null,robotUiA=normalRobotConfig(world.robotArena.lastA||randomRobotConfig()),robotUiB=normalRobotConfig(world.robotArena.lastB||randomRobotConfig());
function robotFieldMarkup(side){
 const cfg=side==='A'?robotUiA:robotUiB,rows=[];
 for(const k of Object.keys(robotPartSets)){
   const opts=robotPartSets[k].map((p,i)=>'<option value="'+i+'" '+(cfg[k]===i?'selected':'')+'>'+p.name+'</option>').join('');
   rows.push('<label class="robotField"><span>'+k.toUpperCase()+'</span><select data-side="'+side+'" data-part="'+k+'">'+opts+'</select></label>')
 }
 const copts=robotColours.map((c,i)=>'<option value="'+i+'" '+(cfg.color===i?'selected':'')+'>'+c.name+'</option>').join('');
 rows.push('<label class="robotField"><span>COLOUR</span><select data-side="'+side+'" data-part="color">'+copts+'</select></label>');
 const wopts=robotWeapons.map((w,i)=>'<option value="'+i+'" '+(cfg.weapon===i?'selected':'')+'>'+w.name+'</option>').join('');
 rows.push('<label class="robotField"><span>WEAPON</span><select data-side="'+side+'" data-part="weapon">'+wopts+'</select></label>');return rows.join('')
}
function statMarkup(c){
 const s=robotStats(c),w=s.weapon;
 return '<div class="robotStat"><span>HP</span><b>'+Math.round(s.hp)+'</b></div>'+
 '<div class="robotStat"><span>ARMOUR</span><b>'+Math.round(s.armour)+'</b></div>'+
 '<div class="robotStat"><span>SPEED</span><b>'+s.speed.toFixed(1)+'</b></div>'+
 '<div class="robotStat"><span>STABILITY</span><b>'+Math.round(s.stability)+'</b></div>'+
 '<div class="robotStat"><span>ENERGY</span><b>'+Math.round(s.energy)+'</b></div>'+
 '<div class="robotStat"><span>HEAT CAP</span><b>'+Math.round(s.heat)+'</b></div>'+
 '<div class="robotStat journalWide"><span>'+w.name.toUpperCase()+'</span><b>'+w.desc+'</b></div>'
}
function renderRobotDesigner(){
 $('robotAFields').innerHTML=robotFieldMarkup('A');$('robotBFields').innerHTML=robotFieldMarkup('B');
 $('robotAStats').innerHTML=statMarkup(robotUiA);$('robotBStats').innerHTML=statMarkup(robotUiB);
 $('robotMatchStatus').textContent=robotMatch?'MATCH IN PROGRESS':robotBossPending?'BOSS MATCH ARMED':'NO MATCH ACTIVE';
 $('robotPanel').querySelectorAll('select[data-side]').forEach(sel=>sel.onchange=()=>{
   const cfg=sel.dataset.side==='A'?robotUiA:robotUiB;cfg[sel.dataset.part]=+sel.value;renderRobotDesigner()
 });
 $('robotPanel').querySelectorAll('#robotCameraButtons button').forEach(b=>b.classList.toggle('active',+b.dataset.cam===robotFeedCameraIndex))
}
function openRobotDesigner(){closeSidePanels('robotPanel');$('robotPanel').classList.remove('hidden');renderRobotDesigner()}
$('robotClose').onclick=()=>$('robotPanel').classList.add('hidden');
$('randomA').onclick=()=>{robotUiA=randomRobotConfig();renderRobotDesigner()};
$('randomB').onclick=()=>{robotUiB=randomRobotConfig();renderRobotDesigner()};
$('randomBoth').onclick=()=>{robotUiA=randomRobotConfig();robotUiB=randomRobotConfig();renderRobotDesigner()};
$('robotCameraButtons').onclick=e=>{const b=e.target.closest('button[data-cam]');if(!b)return;robotFeedCameraIndex=+b.dataset.cam;renderRobotDesigner();updateRobotFeed(true)};
function saveRobotBuilds(){world.robotArena.lastA=normalRobotConfig(robotUiA);world.robotArena.lastB=normalRobotConfig(robotUiB);persist()}
function teleportRobotLab(){
 robotSpectatorMode=false;robotBossPending=false;activeVehicle=null;sitting=null;playerJumpY=0;playerJumpV=0;
 player.x=96;player.z=-27;player.yaw=-Math.PI/2;playerGroundY=H(player.x,player.z);camera.position.set(player.x,playerGroundY+1.7,player.z);
 $('robotPanel').classList.add('hidden');refreshUse();toast('Returned to Robot Design Lab')
}
function teleportRobotStand(){
 saveRobotBuilds();robotBossPending=true;robotSpectatorMode=true;activeVehicle=null;sitting=null;playerJumpY=0;playerJumpV=0;
 player.x=140;player.z=-30.5;player.yaw=0;playerGroundY=ARENA_LEVEL+6.8;camera.position.set(player.x,playerGroundY+1.7,player.z);
 $('robotPanel').classList.add('hidden');refreshUse();toast('BOSS MATCH ARMED • use the red arena console to start')
}
$('bossRobotMatch').onclick=()=>{if(robotMatch){toast('A match is already active');return}teleportRobotStand()};
$('robotTeleportBack').onclick=teleportRobotLab;

function robotDamage(attacker,defender){
 const w=attacker.weapon,arm=robotPartSets.armour[defender.config.armour],
       resist=(arm.resist&&arm.resist[w.type])||1,
       armourBlock=Math.max(0,defender.stats.armour*(1-(w.pierce||0))*.22),
       core=defender.config.core;
 let mult=resist;
 if(w.type==='shock'&&(core===4||core===6||core===9))mult*=1.35;
 if(w.type==='ballistic'&&defender.config.mobility===6)mult*=1.12;
 if(w.type==='kinetic'&&defender.config.armour===0)mult*=1.25;
 if(w.type==='control')mult*=Math.max(.55,12/(12+defender.stats.stability));
 const variance=.86+Math.random()*.28,crit=(Math.random()<(.035+attacker.config.head*.004))?1.32:1;
 let dmg=Math.max(1,(w.damage+attacker.stats.damage+attacker.stats.power*.45-armourBlock)*mult*variance*(attacker.luck||1)*crit);
 return dmg
}
function combatEffect(pos,type){
 const col=type==='shock'?0x71eaff:type==='heat'?0xff783d:type==='energy'?0x9fffff:type==='explosive'?0xffbf62:0xffe1a5;
 for(let i=0;i<(IS_MOBILE?3:5);i++)spawnVehicleParticle(pos,col,.12+Math.random()*.16,.35+.2*Math.random(),.9,.45)
}
function startRobotBattle(mode='screen'){
 if(robotMatch){toast('A match is already active');return}
 $('robotPanel').classList.add('hidden');saveRobotBuilds();robotBossPending=false;
 const aCfg=normalRobotConfig(robotUiA),bCfg=normalRobotConfig(robotUiB),a=makeCombatRobot(aCfg,0),b=makeCombatRobot(bCfg,1);
 a.position.set(119,ARENA_LEVEL+.3,0);b.position.set(161,ARENA_LEVEL+.3,0);a.rotation.y=Math.PI/2;b.rotation.y=-Math.PI/2;robotArenaGroup.add(a,b);
 const sa=robotStats(aCfg),sb=robotStats(bCfg);
 robotMatch={
   phase:'fight',time:0,
   a:{group:a,config:aCfg,stats:sa,weapon:sa.weapon,hp:sa.hp,cool:.7+Math.random()*.6,stun:0,burn:0,heat:0,recoil:0,attackAnim:0,phase:Math.random()*6.28,strafe:Math.random()<.5?-1:1,luck:.94+Math.random()*.12},
   b:{group:b,config:bCfg,stats:sb,weapon:sb.weapon,hp:sb.hp,cool:.7+Math.random()*.6,stun:0,burn:0,heat:0,recoil:0,attackAnim:0,phase:Math.random()*6.28,strafe:Math.random()<.5?-1:1,luck:.94+Math.random()*.12},
   winner:null,loser:null,endT:0
 };
 world.robotArena.matches++;sfx(180,.15,.08,'sawtooth');updateRobotFeed(true);toast(robotName(aCfg)+' VS '+robotName(bCfg)+' • '+(mode==='boss'?'BOSS MATCH START':'SCREEN MATCH START'))
}
$('startRobotMatch').onclick=()=>startRobotBattle('screen');

function spawnRobotShot(att,def,w){
 if(w.range<5)return;
 const m=robotShotPool[robotShotCursor++%robotShotPool.length],from=att.group.position.clone().add(new T.Vector3(0,3.8,0)),to=def.group.position.clone().add(new T.Vector3(0,3.1,0));
 const col=w.type==='shock'?0x66eeff:w.type==='heat'?0xff7d35:w.type==='energy'?0x9efcff:w.type==='explosive'?0xffc34d:w.type==='ballistic'?0xffe4a7:0xffffff;
 m.material.color.setHex(col);m.material.opacity=.95;m.visible=true;m.position.copy(from);
 m.scale.setScalar(w.type==='explosive'?.28:w.type==='heat'?.18:.11);
 m.userData.life=w.type==='explosive'?.42:.22;m.userData.max=m.userData.life;m.userData.from=from;m.userData.to=to
}
function updateRobotShots(dt){
 for(const m of robotShotPool){
   if(!m.visible)continue;m.userData.life-=dt;
   const q=1-Math.max(0,m.userData.life)/m.userData.max;m.position.lerpVectors(m.userData.from,m.userData.to,q);m.material.opacity=Math.max(0,m.userData.life/m.userData.max);
   if(m.userData.life<=0)m.visible=false
 }
}
function attackRobot(att,def,t){
 const w=att.weapon,ap=att.group.position,dp=def.group.position,d=ap.distanceTo(dp);if(d>w.range||att.cool>0||att.stun>0)return;
 att.cool=Math.max(.14,(w.cooldown+(att.stats.cooldown||0))*(1+att.heat*.012));spawnRobotShot(att,def,w);
 const miss=T.MathUtils.clamp((w.miss||0)+def.stats.dodge-(att.config.head===1||att.config.head===3?0.05:0),0,.45);
 if(Math.random()<miss){combatEffect(dp,'ballistic');return}
 const dmg=robotDamage(att,def);def.hp-=dmg;def.recoil=Math.min(1,(def.recoil||0)+.35+dmg*.012);att.attackAnim=1;
 if(w.stun&&Math.random()<w.stun)def.stun=Math.max(def.stun,.35+Math.random()*.45);
 if(w.burn)def.burn=Math.max(def.burn,1.6);
 if(w.push){
   const dx=dp.x-ap.x,dz=dp.z-ap.z,len=Math.hypot(dx,dz)||1,p=w.push*Math.max(.25,10/(10+def.stats.stability));
   def.group.position.x+=dx/len*p;def.group.position.z+=dz/len*p
 }
 att.heat=Math.min(att.stats.heat*1.8,att.heat+w.heat*.12);
 combatEffect(dp.clone().add(new T.Vector3(0,3.4,0)),w.type);sfx(w.type==='explosive'?95:w.type==='shock'?620:w.type==='energy'?430:170,.045,.025,w.type==='shock'?'square':'sawtooth')
}
function shatterRobot(r){
 const p=r.group.position.clone();
 r.group.traverse(o=>{if(!o.isMesh||robotDebris.length>(IS_MOBILE?18:28))return;
   const d=new T.Mesh(o.geometry,o.material);const wp=new T.Vector3(),wq=new T.Quaternion(),ws=new T.Vector3();o.getWorldPosition(wp);o.getWorldQuaternion(wq);o.getWorldScale(ws);d.position.copy(wp);d.quaternion.copy(wq);d.scale.copy(ws);robotArenaGroup.add(d);
   robotDebris.push({mesh:d,vx:(Math.random()-.5)*7,vy:3+Math.random()*6,vz:(Math.random()-.5)*7,spin:(Math.random()-.5)*5,life:5})
 });
 robotArenaGroup.remove(r.group);combatEffect(p.add(new T.Vector3(0,3,0)),'explosive')
}
function archiveWinner(r){
 const list=world.robotArena.trophies||(world.robotArena.trophies=[]),entry={config:r.config,team:r.group.userData.team,name:r.group.userData.name};
 list.push(entry);if(list.length>8)list.shift();
 for(const cab of robotCabinets)if(cab.robot){robotArenaGroup.remove(cab.robot);cab.robot=null}
 restoreRobotTrophies();persist()
}
function endRobotMatch(win,lose){
 if(!robotMatch||robotMatch.phase!=='fight')return;
 robotMatch.phase='victory';robotMatch.winner=win;robotMatch.loser=lose;robotMatch.endT=0;shatterRobot(lose);
 if(win===robotMatch.a)world.robotArena.winsA++;else world.robotArena.winsB++;
 toast(win.group.userData.name+' WINS');sfx(720,.16,.06,'triangle')
}
function updateRobotScoreboard(force=false){
 if(!robotScoreCtx||!robotScoreTexture||(!robotArenaGroup.visible&&!force))return;
 const now=performance.now();if(!force&&now-robotScoreAt<100)return;robotScoreAt=now;
 const c=robotScoreCtx;c.fillStyle='#071014';c.fillRect(0,0,768,192);c.strokeStyle='#74efff';c.lineWidth=7;c.strokeRect(6,6,756,180);
 c.textAlign='center';c.fillStyle='#dffcff';c.font='bold 25px Arial';c.fillText('ROBOT COMBAT INSTITUTE',384,38);
 if(!robotMatch){c.fillStyle='#7fa5a8';c.font='bold 22px Arial';c.fillText('DESIGN LAB READY // AWAITING MATCH',384,106)}
 else{
   const a=robotMatch.a,b=robotMatch.b,aw=Math.max(0,a.hp/a.stats.hp),bw=Math.max(0,b.hp/b.stats.hp);
   c.textAlign='left';c.fillStyle='#ff8f76';c.font='bold 22px Arial';c.fillText(a.group.userData.name,34,77);
   c.fillStyle='#263238';c.fillRect(34,92,300,28);c.fillStyle='#d94d39';c.fillRect(34,92,300*aw,28);
   c.textAlign='right';c.fillStyle='#82bfff';c.fillText(b.group.userData.name,734,77);
   c.fillStyle='#263238';c.fillRect(434,92,300,28);c.fillStyle='#4b87db';c.fillRect(734-300*bw,92,300*bw,28);
   c.textAlign='center';c.fillStyle='#ffffff';c.font='bold 18px Arial';c.fillText(robotMatch.phase==='fight'?'LIVE MATCH':'VICTORY SEQUENCE',384,155)
 }
 robotScoreTexture.needsUpdate=true
}
function updateRobotFeed(force=false){
 if(!robotTerminalScreen||!robotArenaGroup.visible)return;
 const labNear=Math.hypot(player.x-93,player.z+27)<26,panelOpen=!$('robotPanel').classList.contains('hidden');
 if(!force&&!labNear&&!panelOpen)return;
 const now=performance.now();if(!force&&now-robotFeedAt<(IS_MOBILE?90:66))return;robotFeedAt=now;
 const c=robotFeedPositions[robotFeedCameraIndex]||robotFeedPositions[0],look=c.look.clone();
 if(robotMatch){
   const ap=robotMatch.a.group.position,bp=robotMatch.b.group.position;
   look.set((ap.x+bp.x)*.5,ARENA_LEVEL+3.1,(ap.z+bp.z)*.5)
 }
 robotFeedCamera.position.copy(c.p);robotFeedCamera.lookAt(look);
 const vis=robotTerminalScreen.visible;robotTerminalScreen.visible=false;
 const old=renderer.getRenderTarget(),oldBg=scene.background,oldFog=scene.fog,oldClear=renderer.getClearColor(new T.Color()),oldAlpha=renderer.getClearAlpha();
 // Arena CCTV stays readable at night and in heavy weather instead of becoming
 // a black monitor. Keep the main world untouched; these values only exist for
 // the off-screen feed render.
 scene.background=new T.Color(0x172229);if(scene.fog)scene.fog=null;
 renderer.setRenderTarget(robotFeedTarget);renderer.setClearColor(0x172229,1);renderer.clear();renderer.render(scene,robotFeedCamera);renderer.setRenderTarget(old);
 renderer.setClearColor(oldClear,oldAlpha);scene.background=oldBg;scene.fog=oldFog;robotTerminalScreen.visible=vis
}
function updateRobotArena(dt,t){
 updateRobotScoreboard();updateRobotShots(dt);
 // Lightweight weapon idle animation even outside battles.
 if(robotMatch&&robotMatch.phase==='fight'){
   robotMatch.time+=dt;
   const pair=[[robotMatch.a,robotMatch.b],[robotMatch.b,robotMatch.a]];
   for(const [r,e] of pair){
     r.cool=Math.max(0,r.cool-dt);r.stun=Math.max(0,r.stun-dt);r.heat=Math.max(0,r.heat-dt*.9);r.recoil=Math.max(0,(r.recoil||0)-dt*2.8);r.attackAnim=Math.max(0,(r.attackAnim||0)-dt*4.2);
     if(r.burn>0){r.burn-=dt;r.hp-=dt*2.4}
     const p=r.group.position,q=e.group.position,dx=q.x-p.x,dz=q.z-p.z,d=Math.hypot(dx,dz)||1,desired=Math.max(2.6,r.weapon.range*.72);
     r.group.rotation.y=Math.atan2(dx,dz);
     if(r.stun<=0){
       let dir=d>desired?1:d<desired*.62?-1:0,spd=r.stats.speed*(dir<0?.65:1);
       if(dir){p.x+=dx/d*spd*dt*dir;p.z+=dz/d*spd*dt*dir}
       // Agile robots circle and change side occasionally so fights don't collapse
       // into identical straight-line collisions.
       const strafeAmt=T.MathUtils.clamp((r.stats.speed-5)/10,0,.7);
       p.x+=(-dz/d)*Math.sin(t*1.4+r.phase)*r.strafe*strafeAmt*dt*3.4;
       p.z+=(dx/d)*Math.sin(t*1.4+r.phase)*r.strafe*strafeAmt*dt*3.4;
       if(Math.random()<dt*.12)r.strafe*=-1;
       p.x=T.MathUtils.clamp(p.x,108,172);p.z=T.MathUtils.clamp(p.z,-22,22);
       attackRobot(r,e,t)
     }
     const moving=d>desired*.82&&r.stun<=0,swing=Math.sin(t*(5.5+r.stats.speed*.18)+r.phase)*(moving?.42:.08);
     r.group.userData.legs?.forEach((leg,i)=>{leg.rotation.x=T.MathUtils.lerp(leg.rotation.x,i%2?swing:-swing,.28)});
     r.group.userData.arms?.forEach((arm,i)=>{arm.rotation.x=T.MathUtils.lerp(arm.rotation.x,(i%2?-1:1)*swing*.65-r.attackAnim*.35,.3)});
     r.group.rotation.z=T.MathUtils.lerp(r.group.rotation.z,(r.stun>0?.14*Math.sin(t*18+r.phase):0)+(r.recoil||0)*(Math.sin(t*24+r.phase)*.08),.3);
     r.group.position.y=ARENA_LEVEL+.3+Math.abs(Math.sin(t*(4+r.stats.speed*.12)+r.phase))*(moving?.09:.025);
     const wg=r.group.userData.weaponGroup;if(wg){wg.rotation.x=T.MathUtils.lerp(wg.rotation.x,-r.attackAnim*.42,.35)}
     const spin=wg?.userData.spin;if(spin)spin.rotation.z+=dt*(5+r.stats.power*.3)
   }
   if(robotMatch.a.hp<=0&&robotMatch.b.hp<=0)endRobotMatch(robotMatch.a.hp>robotMatch.b.hp?robotMatch.a:robotMatch.b,robotMatch.a.hp>robotMatch.b.hp?robotMatch.b:robotMatch.a);
   else if(robotMatch.a.hp<=0)endRobotMatch(robotMatch.b,robotMatch.a);
   else if(robotMatch.b.hp<=0)endRobotMatch(robotMatch.a,robotMatch.b);
   else if(robotMatch.time>75)endRobotMatch(robotMatch.a.hp>robotMatch.b.hp?robotMatch.a:robotMatch.b,robotMatch.a.hp>robotMatch.b.hp?robotMatch.b:robotMatch.a)
 }else if(robotMatch&&robotMatch.phase==='victory'){
   robotMatch.endT+=dt;const w=robotMatch.winner,cab=robotCabinets[(world.robotArena.trophies.length)%robotCabinets.length],q=T.MathUtils.clamp(robotMatch.endT/2.6,0,1);
   w.group.scale.setScalar(T.MathUtils.lerp(1,.22,q));w.group.position.x=T.MathUtils.lerp(w.group.position.x,cab.x,q*.08);w.group.position.z=T.MathUtils.lerp(w.group.position.z,cab.z,q*.08);w.group.position.y=T.MathUtils.lerp(w.group.position.y,cab.y+.15,q*.08);
   w.group.rotation.y+=dt*1.1;
   if(robotMatch.endT>2.8){archiveWinner(w);robotArenaGroup.remove(w.group);robotMatch=null;toast('Winner archived in the Victory Gallery')}
 }
 for(let i=robotDebris.length-1;i>=0;i--){
   const d=robotDebris[i];d.life-=dt;d.vy-=9.8*dt;d.mesh.position.x+=d.vx*dt;d.mesh.position.y+=d.vy*dt;d.mesh.position.z+=d.vz*dt;d.mesh.rotation.x+=d.spin*dt;d.mesh.rotation.z+=d.spin*.7*dt;
   if(d.mesh.position.y<ARENA_LEVEL+.2){d.mesh.position.y=ARENA_LEVEL+.2;d.vy*=-.2;d.vx*=.72;d.vz*=.72}
   if(d.life<=0){robotArenaGroup.remove(d.mesh);robotDebris.splice(i,1)}
 }
}

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
 if(c.d.mark&&!inStartClearZone(c.cx*CH,c.cz*CH)&&!inCityZone(c.cx*CH,c.cz*CH)){c.near.add(landmarkModel(c.cx,c.cz,c.d.mark));addTrail(c.near,c.cx,c.cz,c.d)}
 if(c.d.anomaly&&!inStartClearZone(c.cx*CH,c.cz*CH)&&!inCityZone(c.cx*CH,c.cz*CH)){c.anomaly=anomalyModel(c.d.anomaly,c.cx,c.cz);c.near.add(c.anomaly)}
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
 if(c.agents.length||inStartClearZone(c.cx*CH,c.cz*CH)||inCityZone(c.cx*CH,c.cz*CH))return;
 let saved=world.animalState[c.k]||[];
 c.d.animals.forEach((q,i)=>{
   let st=saved[i],x=st?st.x:c.cx*CH+q[0],z=st?st.z:c.cz*CH+q[1],dir=st?st.dir:hash(c.cx*9+i,c.cz*7-i,200)*Math.PI*2;
   if(inCityZone(x,z)||inStartClearZone(x,z))return;
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
   for(const q of c.d.trees){let x=c.cx*CH+q[0],z=c.cz*CH+q[1];if(!inCityZone(x,z)&&!inStartClearZone(x,z))colliders.push({x,z,r:0.58*q[2]})}
   for(const q of c.d.rocks){let x=c.cx*CH+q[0],z=c.cz*CH+q[1];if(!inCityZone(x,z)&&!inStartClearZone(x,z))colliders.push({x,z,r:0.62*q[2]})}
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
   if(inCityZone(x,z)&&!insideDoorway(cityDoorways,x,z,radius)&&colliderListBlocked(cityColliders,x,z,radius))return true;
   if(!insideDoorway(startDoorways,x,z,radius)&&colliderListBlocked(startColliders,x,z,radius))return true;
   if(colliderListBlocked(buildColliders,x,z,radius))return true;
   if(cityExpansionGroup.visible){for(const c of cityTraffic){const dx=x-c.g.position.x,dz=z-c.g.position.z,rr=1.05+radius;if(dx*dx+dz*dz<rr*rr)return true}}
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
 $('region').textContent=(player.x<-190&&inCityZone(player.x,player.z)?'WESTHAVEN CITY':regionName(cc.cx,cc.cz))+' · '+cc.cx+', '+cc.cz;
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
   const d=Math.hypot(player.x-h.position.x,player.z-h.position.z),humanCull=IS_MOBILE?88:145;
   if(d>humanCull){h.visible=false;continue}else h.visible=true;
   let walking=false;
   if(u.wander&&d>4.5){
     u.moveT-=dt;
     if(u.moveT<=0||Math.hypot(h.position.x-u.targetX,h.position.z-u.targetZ)<.6){
       const a=Math.random()*Math.PI*2,r=4+Math.random()*9;
       u.targetX=u.homeX+Math.sin(a)*r;u.targetZ=u.homeZ+Math.cos(a)*r;
       if(!inCityZone(u.targetX,u.targetZ)){u.targetX=u.homeX;u.targetZ=u.homeZ}
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

let move={x:0,y:0},look={x:0,y:0},sprinting=false,flightThrottle=0,lookSensitivity=T.MathUtils.clamp(world.ui.lookSensitivity||1,.55,1.8),sitting=null,playerJumpY=0,playerJumpV=0,playerGroundY=H(player.x,player.z);
function cameraSurfaceY(x,z){
 // Sample around the camera footprint instead of only its exact centre. This
 // prevents the first-person camera from cutting through steep terrain while
 // it is smoothing between elevations.
 let h=H(x,z);
 for(const ox of[-.28,.28])for(const oz of[-.28,.28])h=Math.max(h,H(x+ox,z+oz));
 return h
}
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
   const flight=activeVehicle.kind==='heli'||activeVehicle.kind==='jet'||activeVehicle.kind==='ufo'||activeVehicle.kind==='mek'||activeVehicle.kind==='dragon';
   fc.classList.toggle('hidden',!flight);
   mine.classList.toggle('hidden',activeVehicle.kind!=='mek'&&activeVehicle.kind!=='dragon');mine.textContent=activeVehicle.kind==='dragon'?'BREATHE FIRE':'MINE';
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
   if(v.kind==='dragon'&&Math.abs(v.vy||0)>2){toast('Settle the dragon before dismounting');return}
   if(v.kind==='mek'&&v.alt>1.2){toast('Land the MEK before exiting');return}
   const exit=findSafeExit(v);
   activeVehicle=null;robotSpectatorMode=false;$('flightControls').classList.add('hidden');$('mine').classList.add('hidden');
   flightThrottle=0;move.x=0;move.y=0;look.x=0;look.y=0;
   player.x=exit.x;player.z=exit.z;player.yaw=v.yaw;playerGroundY=H(player.x,player.z);
   camera.position.set(player.x,playerGroundY+1.7,player.z);
   toast('Exited '+v.type);refreshUse();return
 }
 let v=nearestVehicle();if(!v)return;
 if(v.kind==='ufoCandidate')v=activateUfo(v);
 robotSpectatorMode=false;activeVehicle=v;player.x=v.x;player.z=v.z;player.yaw=v.yaw;
 if(v.kind==='heli'||v.kind==='jet'||v.kind==='ufo'||v.kind==='mek'||v.kind==='dragon'){
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
 for(const id of['missionsPanel','inventoryPanel','craftPanel','shopPanel','worldPanel','robotPanel'])if(id!==except)$(id).classList.add('hidden')
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
 playerGroundY=H(player.x,player.z);camera.position.set(player.x,playerGroundY+1.7,player.z);
 refreshUse();toast('Stood up')
}
$('townAction').onclick=()=>{
 if(sitting){standFromBench();return}
 const a=nearestTownInteraction();if(!a)return;
 if(a.type==='shop'){openShop();toast('Westside Supply opened')}
 else if(a.type==='robotTerminal'){openRobotDesigner();toast('Robot Combat Design Lab online')}
 else if(a.type==='robotBossStart'){if(!robotBossPending){toast('Configure both robots in the Design Lab first');return}startRobotBattle('boss')}
 else if(a.type==='robotBossExit'){teleportRobotLab()}
 else if(a.type==='cityInfo'){sfx(310,.06,.025,'sine');toast(a.message||'City facility')}
 else if(a.type==='cityHotel'){
   const cost=16;if(world.credits<cost){toast('Hotel rest costs '+cost+' credits');return}
   world.credits-=cost;world.playerStats.health=100;world.playerStats.stamina=100;world.playerStats.energy=100;persist();sfx(410,.1,.04,'sine');toast('Well rested • -'+cost+' credits')
 }
 else if(a.type==='cityTransit'){
   const cost=8;if(world.credits<cost){toast('Transit fare is '+cost+' credits');return}
   world.credits-=cost;activeVehicle=null;robotSpectatorMode=false;player.x=-16;player.z=-30;player.yaw=Math.PI/2;playerGroundY=H(player.x,player.z);camera.position.set(player.x,playerGroundY+1.7,player.z);persist();toast('Transit • Airfield stop')
 }
 else if(a.type==='dragonTeleport'){
   activeVehicle=null;robotSpectatorMode=false;
   if(a.destination==='cave'){
     if(!ensureDragonCave()){toast('Dragon Cavern failed to initialise');return}
     dragonCaveActive=true;const floorY=dragonCaveFloor();player.x=DRAGON_CAVE_X;player.z=DRAGON_CAVE_Z+12;player.yaw=0;playerGroundY=floorY+.2;camera.position.set(player.x,playerGroundY+1.7,player.z);toast('Dragon Cavern • 31m below the surface')
   }else{
     dragonCaveActive=false;player.x=-13.4;player.z=-19.4;player.yaw=0;playerGroundY=START_PLATEAU;camera.position.set(player.x,playerGroundY+1.7,player.z);toast('Returned to hangar')
   }
   persist();refreshUse()
 }
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
 if(activeVehicle&&activeVehicle.kind==='dragon'){dragonFire();return}
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
   if(x===0&&z===1){b.classList.add('landmark');b.title='Dragon Cavern · runway end'}
   else b.title=regionName(x,z)+' · '+x+', '+z;
   b.disabled=!isExplored;
   if(isExplored)b.onclick=()=>{mapSelected={cx:x,cz:z};renderMap()};
   grid.appendChild(b);
 }
 if(mapSelected){
   let k=key(mapSelected.cx,mapSelected.cz),d=world.saved[k],label=regionName(mapSelected.cx,mapSelected.cz)+' · '+mapSelected.cx+', '+mapSelected.cz+' • '+biome(mapSelected.cx*CH,mapSelected.cz*CH);
   if(mapSelected.cx===0&&mapSelected.cz===0)label+=' • Airfield';
   if(mapSelected.cx===0&&mapSelected.cz===1)label+=' • Dragon Cavern';
   if(d&&d.mark)label+=' • '+(d.mark==='ring'?'Stone Ring':'Lookout Tower');
   if(d&&d.anomaly)label+=' • Unexplained signal';
   $('mapInfo').textContent=label;$('travel').disabled=false;
 }else{$('mapInfo').textContent='No region selected';$('travel').disabled=true}
}
$('travel').onclick=()=>{
 if(!mapSelected)return;
 activeVehicle=null;robotSpectatorMode=false;robotBossPending=false;refreshUse();player.x=mapSelected.cx*CH;player.z=mapSelected.cz*CH;player.yaw=0;
 $('panel').classList.add('hidden');lastSyncX=1e9;lastSyncZ=1e9;sync(true);
 if(blocked(player.x,player.z)){outer:for(let r=3;r<=18;r+=3)for(let i=0;i<16;i++){let a=i/16*Math.PI*2,x=mapSelected.cx*CH+Math.cos(a)*r,z=mapSelected.cz*CH+Math.sin(a)*r;if(!blocked(x,z)&&Math.abs(H(x,z)-H(player.x,player.z))<3){player.x=x;player.z=z;break outer}}}
 playerGroundY=H(player.x,player.z);camera.position.set(player.x,playerGroundY+1.7,player.z);persist();toast('Fast travel complete');
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
 const night=1-day,skyR=330,sunY=sy*210,moonA=a+Math.PI,moonY=Math.sin(moonA)*190;
 sun.position.set(player.x+Math.cos(a)*95,Math.max(6,sy*110),player.z+40);sun.intensity=(0.05+day*2.25)*(w==='storm'?0.42:w==='rain'?0.62:w==='cloudy'?0.78:1);
 moonLight.position.set(player.x+Math.cos(moonA)*80,Math.max(8,moonY*.42),player.z+Math.sin(moonA)*65);moonLight.target.position.set(player.x,H(player.x,player.z),player.z);moonLight.intensity=(.1+night*.5)*(w==='storm'?.45:w==='rain'?.65:w==='cloudy'?.78:1);
 hemi.intensity=(0.28+day*0.95+night*.15)*(w==='storm'?0.55:w==='rain'?0.72:w==='cloudy'?0.82:1);
 earthSun.position.set(player.x+Math.cos(a)*skyR,Math.max(-100,sunY)+35,player.z+Math.sin(a)*skyR);earthSun.visible=!moonMode&&sy>-.22;
 earthMoon.position.set(player.x+Math.cos(moonA)*skyR,Math.max(-80,moonY)+42,player.z+Math.sin(moonA)*skyR);earthMoon.visible=!moonMode&&Math.sin(moonA)>-.22;
 earthMoonOrb.material.emissiveIntensity=.45+night*.55;earthMoonHalo.material.opacity=.07+night*.12;
 let ufoAlt=activeVehicle&&activeVehicle.kind==='ufo'?activeVehicle.alt:0,
     spaceFactor=moonMode?1:T.MathUtils.clamp((ufoAlt-110)/170,0,1),
     dayCol=new T.Color(w==='storm'?0x48545b:w==='rain'?0x6f8088:w==='cloudy'?0x8fa2a4:0xa7c0bd),
     nightCol=new T.Color(0x0b1725),
     c=moonMode?new T.Color(0x000005):nightCol.clone().lerp(dayCol,day).lerp(new T.Color(0x000106),spaceFactor);
 earthSun.visible=earthSun.visible&&spaceFactor<.55;earthMoon.visible=earthMoon.visible&&spaceFactor<.55;
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
       townNear=Math.hypot(player.x+126,player.z-6)<240,
      arenaNear=Math.hypot(player.x-132,player.z)<390;
 startBase.visible=earthScene&&airfieldNear;
 cityGroup.visible=earthScene&&townNear;
 cityExpansionGroup.visible=earthScene&&Math.hypot(player.x+280,player.z)<255;
 robotArenaGroup.visible=earthScene&&arenaNear;
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
 // The briefing-room display is a real in-world animated canvas, not a DOM/menu overlay.
 // Keep its texture alive whenever the airfield base is rendered; this avoids a black first frame on mobile/Safari.
 if(welcomeDisplay){welcomeDisplay.scr.visible=true;drawWelcomeScreen(time);}
 updateManagedLights(day);
 if(updateUi)document.querySelectorAll('.weatherButtons button').forEach(b=>b.classList.toggle('active',b.dataset.weather===w));
}

let hudUpdateAt=0,aiAccumulator=0,damageCooldown=0;const cameraLerpTarget=new T.Vector3();
function updateSurvival(dt,t){
 const s=world.playerStats;
 const moving=Math.hypot(move.x,move.y)>.15&&!activeVehicle&&!sitting;
 const safe=!moonMode&&((Math.abs(player.x)<50&&Math.abs(player.z)<50)||inCityZone(player.x,player.z)||(player.x>72&&player.x<194&&Math.abs(player.z)<72))||moonMode&&(Math.abs(player.x)<35&&Math.abs(player.z-18)<38);
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
   s.health=100;s.stamina=100;s.energy=Math.max(35,s.energy);player.x=-14.5;player.z=-24;playerGroundY=H(player.x,player.z);activeVehicle=null;robotSpectatorMode=false;robotBossPending=false;sitting=null;camera.position.set(player.x,playerGroundY+1.7,player.z);toast('You were recovered at the airfield')
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
 player.pitch=T.MathUtils.clamp(player.pitch-ly*dt*1.65,-1.02,0.92);updateSurvival(dt,t);updateBuildGhost();updateVehicleVisuals(dt,t);updateDragonFire(dt);updateRobotArena(dt,t);
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
   }else if(v.kind==='dragon'){
     // Dragon uses world-space altitude so it can begin deep underground and physically fly the tunnel to daylight.
     const pitchInput=T.MathUtils.clamp(move.y,-1,1),rollInput=T.MathUtils.clamp(move.x,-1,1),surface=H(v.x,v.z);
     if(v.worldY==null)v.worldY=v.group.position.y;
     v.pitch=T.MathUtils.lerp(v.pitch,pitchInput*.42,Math.min(1,dt*2.7));v.roll=T.MathUtils.lerp(v.roll,-rollInput*.55,Math.min(1,dt*3.1));v.yaw+=(-v.roll-lx*.45)*dt*.9;
     const target=4+flightThrottle*32;v.speed=T.MathUtils.lerp(v.speed,target,Math.min(1,dt*1.15));
     const horiz=Math.cos(v.pitch)*v.speed;v.x+=Math.sin(v.yaw)*horiz*dt;v.z+=Math.cos(v.yaw)*horiz*dt;
     v.vy=T.MathUtils.lerp(v.vy,Math.sin(v.pitch)*v.speed+(flightThrottle-.45)*5,Math.min(1,dt*1.8));v.worldY+=v.vy*dt;
     // Below the cave mouth the dragon is allowed to remain subterranean; once outside, terrain becomes its floor.
     const inCave=Math.hypot(v.x-DRAGON_CAVE_X,v.z-(DRAGON_CAVE_Z+28))<82&&v.worldY<surface+3;if(!inCave&&v.worldY<surface+.4){v.worldY=surface+.4;v.vy=Math.max(0,v.vy)}
     v.alt=v.worldY-surface;v.airborne=true;v.stalled=false;v.group.position.set(v.x,v.worldY,v.z);v.group.rotation.set(-v.pitch,v.yaw,v.roll,'XYZ');
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
   if(robotSpectatorMode){
     const sx=T.MathUtils.clamp(move.x,-1,1),sf=T.MathUtils.clamp(move.y,-1,1),walk=2.2*dt;
     player.x=T.MathUtils.clamp(player.x+Math.cos(player.yaw)*sx*walk+Math.sin(player.yaw)*sf*walk,132,148);
     player.z=T.MathUtils.clamp(player.z-Math.sin(player.yaw)*sx*walk+Math.cos(player.yaw)*sf*walk,-33,-27);
     playerGroundY=ARENA_LEVEL+6.8;playerJumpY=0;playerJumpV=0;
     cameraLerpTarget.set(player.x,playerGroundY+1.7,player.z)
   }else if(!sitting){
     if(playerJumpY>0||playerJumpV>0){
       playerJumpV-=13.5*dt;
       playerJumpY+=playerJumpV*dt;
       if(playerJumpY<=0){playerJumpY=0;playerJumpV=0}
     }
     let f=move.y,side=move.x,baseSpeed=(sprinting?8:4.5),step=baseSpeed*dt,dx=(Math.sin(player.yaw)*f+Math.cos(player.yaw)*side)*step,dz=(Math.cos(player.yaw)*f-Math.sin(player.yaw)*side)*step,nx=player.x+dx,nz=player.z+dz;
     // Crossing the exposed mouth naturally enters cave mode; the player can now walk down rather than teleport through solid terrain.
     if(!dragonCaveActive&&Math.abs(nx-DRAGON_CAVE_X)<8.2&&nz>DRAGON_CAVE_MOUTH_Z&&nz<DRAGON_CAVE_Z+5){ensureDragonCave();dragonCaveActive=true}
     const hereH=caveGroundH(player.x,player.z),nextH=caveGroundH(nx,nz),rise=nextH-hereH,grade=dragonCaveActive&&Math.abs(nx-DRAGON_CAVE_X)<8.5&&nz>DRAGON_CAVE_MOUTH_Z?0:slopeAt(nx,nz),airborne=playerJumpY>.08;
     // Walkable slopes slow naturally as they get steeper. True cliffs remain
     // blocked, preventing the player from stepping through the terrain skin.
     const maxRise=airborne?1.9:.92,maxGrade=airborne?3.4:2.35,walkable=!blocked(nx,nz)&&Math.abs(rise)<maxRise&&grade<maxGrade;
     if(walkable){
       const uphillSlow=rise>0&&!airborne?T.MathUtils.clamp(1-rise/.95,.38,1):1;
       player.x+=dx*uphillSlow;player.z+=dz*uphillSlow
     }
     const groundNow=caveGroundH(player.x,player.z);
     // Track the ground quickly uphill and smoothly downhill. This keeps hill
     // traversal stable without the old vertical camera lag exposing voids.
     const groundRate=groundNow>playerGroundY?18:10;
     playerGroundY=T.MathUtils.lerp(playerGroundY,groundNow,1-Math.exp(-dt*groundRate));
     cameraLerpTarget.set(player.x,playerGroundY+1.7+playerJumpY,player.z)
   }else{
     playerJumpY=0;playerJumpV=0;playerGroundY=T.MathUtils.lerp(playerGroundY,caveGroundH(player.x,player.z),1-Math.exp(-dt*14));
     cameraLerpTarget.set(player.x,playerGroundY+1.18,player.z)
   }
   camera.position.lerp(cameraLerpTarget,1-Math.exp(-dt*17));
   // Absolute safety clamp: never let the view camera sit below the rendered
   // terrain, even after a sharp crest, jump landing or sudden elevation jump.
   const minCamY=cameraSurfaceY(camera.position.x,camera.position.z)+(sitting?.5:.72);
   if(camera.position.y<minCamY)camera.position.y=minCamY;
   camera.rotation.set(player.pitch,player.yaw,0);
 }

 let cc=chunkOf(player.x,player.z);
 if(!moonMode&&!(activeVehicle&&activeVehicle.kind==='ufo'&&activeVehicle.alt>180)&&key(cc.cx,cc.cz)!==currentChunk)sync();

 // Wildlife/anomaly simulation does not need display-frame frequency.
 aiAccumulator+=dt;
 if(aiAccumulator>=0.033){
   const simDt=Math.min(aiAccumulator,.066);aiAccumulator=0;
   if(!moonMode){updateAnimals(simDt,t);updateAnomalies(simDt,t);if(inCityZone(player.x,player.z))updateTownHumans(t);updateCityTraffic(simDt,t)}
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
     $('modeReadout').textContent=activeVehicle.kind==='jet'||activeVehicle.kind==='heli'||activeVehicle.kind==='ufo'||activeVehicle.kind==='dragon'?'FLIGHT':activeVehicle.kind==='mek'?'MEK':'DRIVING';
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

 renderer.render(scene,camera);updateRobotFeed();

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
 teleportChunk:(cx,cz)=>{activeVehicle=null;player.x=cx*CH;player.z=cz*CH;playerGroundY=H(player.x,player.z);lastSyncX=1e9;lastSyncZ=1e9;sync(true);return window.__world.state()},
 mapOpen:()=>openMap(),
 animals:()=>animalAgents.slice(0,8).map(a=>({kind:a.kind,x:+a.x.toFixed(2),z:+a.z.toFixed(2),dir:+a.dir.toFixed(2)})),
 vehicles:()=>vehicles.map(v=>{let nose=v.group.localToWorld(new T.Vector3(0,0,2)),tail=v.group.localToWorld(new T.Vector3(0,0,-2));return{type:v.type,x:+v.x.toFixed(2),z:+v.z.toFixed(2),alt:+v.alt.toFixed(2),speed:+(v.speed||0).toFixed(2),pitch:+(v.pitch||0).toFixed(3),roll:+(v.roll||0).toFixed(3),vy:+(v.vy||0).toFixed(2),stalled:!!v.stalled,noseY:+nose.y.toFixed(2),tailY:+tail.y.toFixed(2),active:v===activeVehicle}}),
 anomalies:()=>[...chunks.values()].filter(c=>c.anomaly&&c.mode==='near').map(c=>({type:c.d.anomaly,x:+c.anomaly.position.x.toFixed(1),z:+c.anomaly.position.z.toFixed(1)})),
 teleport:(x,z)=>{player.x=x;player.z=z;playerGroundY=H(player.x,player.z);activeVehicle=null;lastSyncX=1e9;lastSyncZ=1e9;sync(true);return window.__world.state()},
 setMove:(x,y)=>{move.x=x;move.y=y},setLook:(x,y)=>{look.x=x;look.y=y},
 enterNearest:()=>{let v=nearestVehicle();if(v){activeVehicle=v;player.x=v.x;player.z=v.z;player.yaw=v.yaw;refreshUse();return v.type}return null},
 findAnomaly:(r=12)=>{let c=chunkOf(player.x,player.z);for(let z=c.cz-r;z<=c.cz+r;z++)for(let x=c.cx-r;x<=c.cx+r;x++){let d=descriptor(x,z);if(d.anomaly)return{x,z,type:d.anomaly}}return null},
 setWeather:w=>{worldCtl.weather=w},setTime:h=>{worldCtl.autoTime=false;worldCtl.time=T.MathUtils.clamp(h,0,24);$('timeSlider').value=worldCtl.time},setThrottle:v=>{flightThrottle=T.MathUtils.clamp(v,0,1);syncEngineUI()}
};
})();