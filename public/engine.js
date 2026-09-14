(()=>{'use strict';
const T=THREE,$=id=>document.getElementById(id),canvas=$('game');

const scene=new T.Scene();
scene.background=new T.Color(0x9bb2b5);
scene.fog=new T.FogExp2(0x9fb0aa,0.0048);

const camera=new T.PerspectiveCamera(67,innerWidth/innerHeight,0.08,900);
camera.rotation.order='YXZ';

const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));
renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=T.PCFSoftShadowMap;

const hemi=new T.HemisphereLight(0xd9ecff,0x334238,1.1);
const sun=new T.DirectionalLight(0xffe2ad,2.2);
sun.castShadow=true;
sun.shadow.mapSize.set(1024,1024);
sun.shadow.camera.left=-85;sun.shadow.camera.right=85;sun.shadow.camera.top=85;sun.shadow.camera.bottom=-85;
scene.add(hemi,sun);

const starGeo=new T.BufferGeometry(),starPos=[];
for(let i=0;i<420;i++){let a=Math.random()*Math.PI*2,y=Math.random()*0.72+0.2,r=260,rr=Math.sqrt(1-y*y)*r;starPos.push(Math.cos(a)*rr,y*r,Math.sin(a)*rr)}
starGeo.setAttribute('position',new T.Float32BufferAttribute(starPos,3));
const stars=new T.Points(starGeo,new T.PointsMaterial({color:0xffffff,size:0.8,sizeAttenuation:false,transparent:true,opacity:0}));
scene.add(stars);
const rainCount=520,rainPos=new Float32Array(rainCount*3);for(let i=0;i<rainCount;i++){rainPos[i*3]=(Math.random()-.5)*80;rainPos[i*3+1]=Math.random()*42;rainPos[i*3+2]=(Math.random()-.5)*80}const rainGeo=new T.BufferGeometry();rainGeo.setAttribute('position',new T.BufferAttribute(rainPos,3));const rain=new T.Points(rainGeo,new T.PointsMaterial({color:0xc8def0,size:0.085,transparent:true,opacity:0,depthWrite:false}));scene.add(rain);
const cloudGroup=new T.Group(),cloudGeo=new T.SphereGeometry(1,8,6),cloudMat=new T.MeshLambertMaterial({color:0xe5e8e5,transparent:true,opacity:0.25,depthWrite:false});for(let i=0;i<10;i++){let g=new T.Group();for(let j=0;j<3;j++){let m=new T.Mesh(cloudGeo,cloudMat.clone());m.scale.set(6+Math.random()*5,1.2+Math.random(),3+Math.random()*3);m.position.set((j-1)*4,Math.random(),Math.random()*2);g.add(m)}g.userData={a:i/10*Math.PI*2,r:70+Math.random()*70,h:40+Math.random()*22};cloudGroup.add(g)}scene.add(cloudGroup);

const CH=96,NEAR=1,FAR=3,CACHE=4;
const WORLD='wi_world_v3',POS='wi_pos_v3';
let world;
try{world=JSON.parse(localStorage.getItem(WORLD)||'null')}catch(e){world=null}
if(!world)world={seed:Math.floor(Math.random()*1e9),explored:{},saved:{},animalState:{},discoveries:{}};world.explored=world.explored||{};world.saved=world.saved||{};world.animalState=world.animalState||{};world.discoveries=world.discoveries||{};
if(world.saved['0,0']){world.saved['0,0'].trees=(world.saved['0,0'].trees||[]).filter(q=>!inStartClearZone(q[0],q[1]));world.saved['0,0'].rocks=(world.saved['0,0'].rocks||[]).filter(q=>!inStartClearZone(q[0],q[1]));}
let player;
try{player=JSON.parse(localStorage.getItem(POS)||'null')}catch(e){player=null}
if(!player)player={x:0,z:12,yaw:0,pitch:-0.03};

const seed=world.seed;
const chunks=new Map(),colliders=[],animalAgents=[],farQueue=[],farPending=new Set();
let currentChunk='',saveTimer=0,lastSyncX=1e9,lastSyncZ=1e9;
let mapView={cx:0,cz:0},mapSelected=null;

function key(x,z){return x+','+z}
function chunkOf(x,z){return {cx:Math.floor((x+CH/2)/CH),cz:Math.floor((z+CH/2)/CH)}}
function hash(x,z,s=0){let n=Math.sin(x*127.1+z*311.7+(seed+s)*0.017)*43758.5453;return n-Math.floor(n)}
function smooth(t){return t*t*(3-2*t)}
function noise(x,z,s=0){let X=Math.floor(x),Z=Math.floor(z),fx=x-X,fz=z-Z,a=hash(X,Z,s),b=hash(X+1,Z,s),c=hash(X,Z+1,s),d=hash(X+1,Z+1,s),u=smooth(fx),v=smooth(fz);return T.MathUtils.lerp(T.MathUtils.lerp(a,b,u),T.MathUtils.lerp(c,d,u),v)}
function fbm(x,z,s=0){let a=0.5,f=1,v=0;for(let i=0;i<5;i++){v+=a*noise(x*f,z*f,s+i*29);a*=0.5;f*=2.02}return v}
function H(x,z){let broad=(fbm(x*0.002,z*0.002,1)-0.5)*28,hills=(fbm(x*0.007,z*0.007,8)-0.5)*15,r=1-Math.abs(fbm(x*0.003,z*0.003,19)*2-1),ridge=Math.pow(r,3)*14,m=(fbm(x*0.03,z*0.03,30)-0.5)*1.8;return broad+hills+ridge+m-5}
function biome(x,z){let h=H(x,z),m=fbm(x*0.002,z*0.002,50),t=fbm(x*0.0015,z*0.0015,60)-h*0.005;if(h>24)return'alpine';if(h>14)return'highland';if(t<0.4)return'pine';if(m>0.62)return'forest';if(m<0.36)return'meadow';return'woodland'}
const regionA=['Ash','Raven','Moon','Fox','Elder','Black','Silver','Storm','Moss','Frost','Hollow','Red'],regionB=['Reach','Vale','Moor','Wood','Fell','Hollow','Watch','Ridge','Wilds','Basin','March','Field'];
function regionName(cx,cz){return regionA[Math.floor(hash(cx,cz,701)*regionA.length)]+' '+regionB[Math.floor(hash(cx,cz,702)*regionB.length)]}
function slopeAt(x,z){return Math.hypot(H(x+0.8,z)-H(x-0.8,z),H(x,z+0.8)-H(x,z-0.8))}
function inStartClearZone(x,z){return (Math.abs(x-24)<15&&Math.abs(z)<47)||Math.hypot(x+27,z+18)<10||Math.hypot(x+16,z-4)<7}

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
   for(let i=0;i<8;i++){let a=i/8*Math.PI*2,l=new T.PointLight(0x8fffe8,0.45,7);l.position.set(Math.cos(a)*3.8,-0.2,Math.sin(a)*3.8);g.add(l)}
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
function wheel(){let w=new T.Mesh(new T.CylinderGeometry(0.42,0.42,0.28,10),mats.dark);w.rotation.z=Math.PI/2;return w}
function makeBuggy(x,z){
 let g=new T.Group(),body=new T.Mesh(new T.BoxGeometry(2.2,0.55,3.2),mats.red);body.position.y=0.85;g.add(body);
 let cage=new T.Mesh(new T.BoxGeometry(1.7,0.9,1.6),mats.metal);cage.position.set(0,1.45,-0.1);cage.material=mats.metal;g.add(cage);
 for(const sx of[-1.05,1.05])for(const sz of[-1.05,1.05]){let w=wheel();w.position.set(sx,0.55,sz);g.add(w)}
 g.position.set(x,H(x,z),z);scene.add(g);vehicles.push({type:'Dune Buggy',kind:'buggy',group:g,x,z,yaw:0,speed:0,alt:0});return g;
}
function makeHeli(x,z){
 let g=new T.Group(),body=new T.Mesh(new T.SphereGeometry(1,12,8),mats.metal);body.scale.set(1.35,0.95,2.1);body.position.y=1.7;g.add(body);
 let glass=new T.Mesh(new T.SphereGeometry(0.9,12,8),mats.glass);glass.scale.set(1.0,0.7,1.15);glass.position.set(0,1.9,1.45);g.add(glass);
 let tail=new T.Mesh(new T.BoxGeometry(0.32,0.32,4.2),mats.metal);tail.position.set(0,1.8,-3);g.add(tail);
 let rotor=new T.Mesh(new T.BoxGeometry(8,0.08,0.18),mats.dark);rotor.position.y=3.0;g.add(rotor);rotor.name='rotor';
 let skid1=new T.Mesh(new T.CylinderGeometry(0.07,0.07,3.8,6),mats.dark),skid2=skid1.clone();skid1.rotation.z=Math.PI/2;skid2.rotation.z=Math.PI/2;skid1.position.set(-0.9,0.45,0);skid2.position.set(0.9,0.45,0);g.add(skid1,skid2);
 g.position.set(x,H(x,z),z);scene.add(g);vehicles.push({type:'Helicopter',kind:'heli',group:g,x,z,yaw:0,speed:0,alt:0});return g;
}
function makeJet(x,z){
 let g=new T.Group(),fuse=new T.Mesh(new T.CylinderGeometry(0.55,0.82,6.5,10),mats.metal);fuse.rotation.x=Math.PI/2;fuse.position.y=1.1;g.add(fuse);
 let nose=new T.Mesh(new T.ConeGeometry(0.58,2.2,10),mats.metal);nose.rotation.x=Math.PI/2;nose.position.set(0,1.1,4.2);g.add(nose);
 let wing=new T.Mesh(new T.BoxGeometry(7.8,0.14,2.2),mats.metal);wing.position.set(0,1.05,-0.1);wing.rotation.y=0.04;g.add(wing);
 let tail=new T.Mesh(new T.BoxGeometry(3.3,0.12,1.1),mats.metal);tail.position.set(0,1.5,-2.65);g.add(tail);
 let fin=new T.Mesh(new T.BoxGeometry(0.16,1.6,1.5),mats.red);fin.position.set(0,2.0,-2.7);g.add(fin);
 let glass=new T.Mesh(new T.SphereGeometry(0.55,10,7),mats.glass);glass.scale.set(0.8,0.45,1.4);glass.position.set(0,1.65,1.7);g.add(glass);
 g.position.set(x,H(x,z)+0.25,z);scene.add(g);vehicles.push({type:'Jet',kind:'jet',group:g,x,z,yaw:Math.PI, speed:0,alt:0});g.rotation.y=Math.PI;return g;
}
function runwayStrip(){
 let g=new T.Group(),verts=[],inds=[],N=24,x0=24,w=8,z0=-46,z1=46;
 for(let i=0;i<=N;i++){let z=T.MathUtils.lerp(z0,z1,i/N);for(const s of[-1,1]){let x=x0+s*w;verts.push(x,H(x,z)+0.06,z)}}
 for(let i=0;i<N;i++){let a=i*2,b=a+1,c=a+2,d=a+3;inds.push(a,c,b,b,c,d)}
 let geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setIndex(inds);geo.computeVertexNormals();let r=new T.Mesh(geo,mats.runway);r.receiveShadow=true;g.add(r);
 for(let i=0;i<10;i++){let z=T.MathUtils.lerp(-40,40,i/9),m=new T.Mesh(new T.BoxGeometry(0.35,0.03,4.3),mats.stripe);m.position.set(24,H(24,z)+0.1,z);g.add(m)}
 for(const side of[-1,1])for(let i=0;i<18;i++){let z=T.MathUtils.lerp(-44,44,i/17),lamp=new T.Mesh(new T.SphereGeometry(0.08,5,4),new T.MeshBasicMaterial({color:0xffefaa}));lamp.position.set(24+side*8.4,H(24+side*8.4,z)+0.18,z);g.add(lamp)}
 let pad=new T.Mesh(new T.CircleGeometry(8,24),mats.runway);pad.rotation.x=-Math.PI/2;pad.position.set(-27,H(-27,-18)+0.05,-18);g.add(pad);
 scene.add(g);makeBuggy(-16,-4);makeHeli(-27,-18);makeJet(24,-20);return g;
}
const startBase=runwayStrip();

function createChunk(cx,cz){
 let k=key(cx,cz),d=descriptor(cx,cz),root=new T.Group(),near=new T.Group(),far=new T.Group();
 near.add(terrain(cx,cz,28));far.add(terrain(cx,cz,7));
 for(const q of d.trees){
   let wx=cx*CH+q[0],wz=cz*CH+q[1];near.add(makeTree(wx,wz,q[2],true));
 }
 for(let i=0;i<d.trees.length;i+=3){let q=d.trees[i],wx=cx*CH+q[0],wz=cz*CH+q[1];far.add(makeTree(wx,wz,q[2],false))}
 for(const q of d.rocks){let wx=cx*CH+q[0],wz=cz*CH+q[1],m=new T.Mesh(new T.DodecahedronGeometry(q[2],0),mats.rock);m.position.set(wx,H(wx,wz)+q[2]*0.55,wz);m.scale.y=0.7;m.castShadow=true;near.add(m)}
 if(d.mark){near.add(landmarkModel(cx,cz,d.mark));addTrail(near,cx,cz,d)}
 let anomaly=null;if(d.anomaly){anomaly=anomalyModel(d.anomaly,cx,cz);near.add(anomaly)}
 root.add(near,far);near.visible=false;far.visible=false;scene.add(root);
 let c={cx,cz,k,d,root,near,far,mode:'none',agents:[],anomaly,lastUsed:performance.now()};
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
 c.near.visible=mode==='near';c.far.visible=mode==='far';
 if(mode==='near')loadAnimals(c);else unloadAnimals(c);
}

function rebuildColliders(nearSet){
 colliders.length=0;
 for(const k of nearSet){
   let c=chunks.get(k);if(!c)continue;
   for(const q of c.d.trees){colliders.push({x:c.cx*CH+q[0],z:c.cz*CH+q[1],r:0.58*q[2]})}
   for(const q of c.d.rocks){colliders.push({x:c.cx*CH+q[0],z:c.cz*CH+q[1],r:0.62*q[2]})}
   if(c.d.mark==='ring')for(let i=0;i<7;i++){let a=i/7*Math.PI*2;colliders.push({x:c.cx*CH+Math.cos(a)*5,z:c.cz*CH+Math.sin(a)*5,r:0.8})}
   if(c.d.mark==='tower')colliders.push({x:c.cx*CH,z:c.cz*CH,r:2.2});
   }
}
function blocked(x,z,radius=0.6){for(const c of colliders){let dx=x-c.x,dz=z-c.z,rr=c.r+radius;if(dx*dx+dz*dz<rr*rr)return true}for(const v of vehicles){if(v===activeVehicle)continue;let dx=x-v.x,dz=z-v.z,rr=(v.kind==='jet'?3.2:v.kind==='heli'?2.4:1.5)+radius;if(dx*dx+dz*dz<rr*rr)return true}return false}

function queueFar(cx,cz){
 let k=key(cx,cz);if(chunks.has(k)||farPending.has(k))return;
 farPending.add(k);farQueue.push({cx,cz,k});
}
function processFarQueue(){
 if(!farQueue.length)return;
 let cc=chunkOf(player.x,player.z),job=farQueue.shift();farPending.delete(job.k);
 if(chunks.has(job.k))return;
 let dx=Math.abs(job.cx-cc.cx),dz=Math.abs(job.cz-cc.cz),dist=Math.max(dx,dz);
 if(dist<=NEAR||dist>FAR)return;
 let c=createChunk(job.cx,job.cz);setMode(c,'far');
}
function sync(force=false){
 let cc=chunkOf(player.x,player.z);
 if(!force&&cc.cx===lastSyncX&&cc.cz===lastSyncZ)return;
 lastSyncX=cc.cx;lastSyncZ=cc.cz;
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
   }else if(!keepSet.has(k)){c.near.visible=false;c.far.visible=false;c.mode='none';unloadAnimals(c)}
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

let move={x:0,y:0},look={x:0,y:0},sprinting=false,climbInput=0;
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
function nearestVehicle(){let best=null,bd=5;for(const v of vehicles){let d=Math.hypot(player.x-v.x,player.z-v.z);if(d<bd){bd=d;best=v}}return best}
function refreshUse(){let b=$('use'),fc=$('flightControls');if(activeVehicle){b.classList.remove('hidden');b.textContent='EXIT '+activeVehicle.type.toUpperCase();fc.classList.toggle('hidden',!(activeVehicle.kind==='heli'||activeVehicle.kind==='jet'));return}fc.classList.add('hidden');let v=nearestVehicle();if(v){b.classList.remove('hidden');b.textContent='ENTER '+v.type.toUpperCase()}else b.classList.add('hidden')}
$('use').onclick=()=>{
 if(activeVehicle){let v=activeVehicle;activeVehicle=null;climbInput=0;$('flightControls').classList.add('hidden');player.x=v.x+Math.cos(v.yaw)*3;player.z=v.z-Math.sin(v.yaw)*3;toast('Exited '+v.type);refreshUse();return}
 let v=nearestVehicle();if(!v)return;activeVehicle=v;player.x=v.x;player.z=v.z;player.yaw=v.yaw;if(v.kind==='heli'||v.kind==='jet')$('flightControls').classList.remove('hidden');else $('flightControls').classList.add('hidden');toast(v.type+' controls active');refreshUse();
};
function bindHold(id,value){let b=$(id),stop=()=>{if(climbInput===value)climbInput=0};b.addEventListener('pointerdown',()=>climbInput=value);['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,stop))}
bindHold('ascend',1);bindHold('descend',-1);
$('worldctl').onclick=()=>{$('worldPanel').classList.toggle('hidden')};$('worldClose').onclick=()=>$('worldPanel').classList.add('hidden');
$('timeSlider').addEventListener('input',e=>{worldCtl.time=+e.target.value;worldCtl.autoTime=false;$('autoTime').textContent='AUTO TIME: OFF'});
$('autoTime').onclick=()=>{worldCtl.autoTime=!worldCtl.autoTime;$('autoTime').textContent='AUTO TIME: '+(worldCtl.autoTime?'ON':'OFF')};
document.querySelectorAll('.weatherButtons button').forEach(b=>b.onclick=()=>{worldCtl.weather=b.dataset.weather;document.querySelectorAll('.weatherButtons button').forEach(x=>x.classList.toggle('active',x===b))});

function openMap(){
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

function updateSky(time,dt=0.016){
 let hour=worldCtl.autoTime?((time/480)*24)%24:worldCtl.time,cycle=hour/24,a=cycle*Math.PI*2-Math.PI/2,sy=Math.sin(a),day=T.MathUtils.clamp((sy+0.18)*2.3,0,1),w=worldCtl.weather;
 if(worldCtl.autoTime){worldCtl.time=hour;$('timeSlider').value=hour.toFixed(2)}
 $('timeReadout').textContent=String(Math.floor(hour)).padStart(2,'0')+':'+String(Math.floor((hour%1)*60)).padStart(2,'0');
 sun.position.set(player.x+Math.cos(a)*95,Math.max(6,sy*110),player.z+40);sun.intensity=(0.05+day*2.25)*(w==='storm'?0.42:w==='rain'?0.62:w==='cloudy'?0.78:1);hemi.intensity=(0.18+day*0.95)*(w==='storm'?0.55:w==='rain'?0.72:w==='cloudy'?0.82:1);
 let dayCol=new T.Color(w==='storm'?0x48545b:w==='rain'?0x6f8088:w==='cloudy'?0x8fa2a4:0xa7c0bd),nightCol=new T.Color(0x06101a),c=nightCol.clone().lerp(dayCol,day);scene.background.copy(c);scene.fog.color.copy(c);
 scene.fog.density=w==='mist'?0.018:w==='storm'?0.012:w==='rain'?0.009:w==='cloudy'?0.0068:0.0048;
 stars.position.set(player.x,0,player.z);stars.material.opacity=(1-day)*(w==='clear'?1:0.35);
 let wet=w==='rain'||w==='storm';rain.material.opacity=wet?(w==='storm'?0.82:0.55):0;rain.position.set(player.x,0,player.z);for(let i=0;i<rainCount;i++){rainPos[i*3+1]-=dt*(w==='storm'?28:20);if(rainPos[i*3+1]<0)rainPos[i*3+1]=42}rainGeo.attributes.position.needsUpdate=wet;
 cloudGroup.children.forEach((g,i)=>{let u=g.userData;u.a+=dt*(w==='storm'?0.09:0.035);g.position.set(player.x+Math.cos(u.a)*u.r,u.h,player.z+Math.sin(u.a)*u.r);g.children.forEach(m=>m.material.opacity=w==='clear'?0.1:w==='cloudy'?0.38:w==='rain'?0.52:w==='storm'?0.68:0.22)});
 document.querySelectorAll('.weatherButtons button').forEach(b=>b.classList.toggle('active',b.dataset.weather===w));
}

function step(dt,t){
 player.pitch=T.MathUtils.clamp(player.pitch-look.y*dt*1.65,-1.02,0.92);

 if(activeVehicle){
   let v=activeVehicle,f=-move.y,side=move.x;
   if(v.kind==='buggy'){
     v.yaw-=look.x*dt*1.65;v.yaw+=side*dt*1.25*(0.35+Math.abs(f));
     let target=f*(sprinting?12:7.5);v.speed=T.MathUtils.lerp(v.speed,target,Math.min(1,dt*3.2));
     let nx=v.x+Math.sin(v.yaw)*v.speed*dt,nz=v.z+Math.cos(v.yaw)*v.speed*dt;
     if(!blocked(nx,nz,1.0)&&Math.abs(H(nx,nz)-H(v.x,v.z))<0.95&&slopeAt(nx,nz)<2.1){v.x=nx;v.z=nz}else v.speed*=0.25;
     v.alt=0;v.group.position.set(v.x,H(v.x,v.z),v.z);v.group.rotation.y=v.yaw;
   }else if(v.kind==='heli'){
     v.yaw-=look.x*dt*1.7;
     let speed=(sprinting?14:8),fw=f*speed,strafe=side*speed*0.65;
     v.x+=(Math.sin(v.yaw)*fw+Math.cos(v.yaw)*strafe)*dt;v.z+=(Math.cos(v.yaw)*fw-Math.sin(v.yaw)*strafe)*dt;
     v.alt=T.MathUtils.clamp(v.alt+climbInput*dt*(sprinting?9:6),0,42);
     if(v.alt<0.2)v.alt=0;
     v.group.position.set(v.x,H(v.x,v.z)+v.alt,v.z);v.group.rotation.y=v.yaw;
     v.group.rotation.z=T.MathUtils.lerp(v.group.rotation.z,-side*0.12,Math.min(1,dt*3));v.group.rotation.x=T.MathUtils.lerp(v.group.rotation.x,f*0.08,Math.min(1,dt*3));
     let rotor=v.group.getObjectByName('rotor');if(rotor)rotor.rotation.y+=dt*(v.alt>0||Math.abs(f)+Math.abs(side)>0?22:10);
   }else{
     v.yaw-=look.x*dt*(v.alt>1?0.8:0.45);
     let target=Math.max(0,f)*(sprinting?32:16);v.speed=T.MathUtils.lerp(v.speed,target,Math.min(1,dt*1.8));
     if(f<-.2)v.speed=T.MathUtils.lerp(v.speed,-4,Math.min(1,dt*2));
     let nx=v.x+Math.sin(v.yaw)*v.speed*dt,nz=v.z+Math.cos(v.yaw)*v.speed*dt;
     if(v.alt>1||(!blocked(nx,nz,2.0)&&Math.abs(H(nx,nz)-H(v.x,v.z))<1.1)){v.x=nx;v.z=nz}else v.speed*=0.35;
     let liftReady=v.speed>6;v.alt=T.MathUtils.clamp(v.alt+(liftReady?climbInput*dt*(sprinting?14:10):Math.min(0,climbInput)*dt*5),0,65);
     if(v.alt<0.15)v.alt=0;
     v.group.position.set(v.x,H(v.x,v.z)+v.alt,v.z);v.group.rotation.y=v.yaw;v.group.rotation.x=T.MathUtils.lerp(v.group.rotation.x,-climbInput*0.16,Math.min(1,dt*3));v.group.rotation.z=T.MathUtils.lerp(v.group.rotation.z,-side*0.08,Math.min(1,dt*2));
   }
   player.x=v.x;player.z=v.z;player.yaw=v.yaw;
   let h=H(v.x,v.z)+(v.alt||0),back=v.kind==='jet'?9:v.kind==='heli'?7:5.5,up=v.kind==='jet'?3.3:v.kind==='heli'?3.2:2.5;
   let cam=new T.Vector3(v.x-Math.sin(v.yaw)*back,h+up,v.z-Math.cos(v.yaw)*back);
   camera.position.lerp(cam,0.16);camera.lookAt(v.x,h+1.1,v.z);
 }else{
   player.yaw-=look.x*dt*2.45;
   let f=-move.y,side=move.x,s=(sprinting?8:4.5)*dt,dx=(Math.sin(player.yaw)*f+Math.cos(player.yaw)*side)*s,dz=(Math.cos(player.yaw)*f-Math.sin(player.yaw)*side)*s,nx=player.x+dx,nz=player.z+dz;
   let dh=Math.abs(H(nx,nz)-H(player.x,player.z));
   if(!blocked(nx,nz)&&dh<1.05&&slopeAt(nx,nz)<2.35){player.x=nx;player.z=nz}
   camera.position.lerp(new T.Vector3(player.x,H(player.x,player.z)+1.7,player.z),0.24);camera.rotation.set(player.pitch,player.yaw,0);
 }

 let cc=chunkOf(player.x,player.z);
 if(key(cc.cx,cc.cz)!==currentChunk)sync();
 let deg=((player.yaw*180/Math.PI)%360+360)%360,names=['N','NE','E','SE','S','SW','W','NW'];
 $('compass').textContent=names[Math.round(deg/45)%8];
 $('stats').textContent=(activeVehicle?activeVehicle.type+' • ':'')+biome(player.x,player.z)+' • '+Object.keys(world.explored).length+' visited • '+animalAgents.length+' wildlife';
 refreshUse();updateAnimals(dt,t);updateAnomalies(dt,t);updateSky(t,dt);
 for(const c of chunks.values())if(c.anomaly&&c.mode==='near'){
   let d=Math.hypot(player.x-c.anomaly.position.x,player.z-c.anomaly.position.z),id='anomaly:'+c.k;
   if(d<(c.d.anomaly==='titan'?35:20)&&!world.discoveries[id]){world.discoveries[id]=c.d.anomaly;toast(c.d.anomaly==='ufo'?'Unidentified craft discovered':c.d.anomaly==='titan'?'Giant entity discovered':'Unknown creature discovered');persist()}
 }
 saveTimer+=dt;if(saveTimer>8){saveTimer=0;for(const c of chunks.values())if(c.agents.length)world.animalState[c.k]=c.agents.map(a=>({x:+a.x.toFixed(2),z:+a.z.toFixed(2),dir:+a.dir.toFixed(3)}));persist()}
}

sync(true);
camera.position.set(player.x,H(player.x,player.z)+1.7,player.z);
let last=performance.now(),start=performance.now()/1000;
function loop(now){let dt=Math.min(0.04,(now-last)/1000);last=now;let t=now/1000;step(dt,t-start);processFarQueue();renderer.render(scene,camera);requestAnimationFrame(loop)}
requestAnimationFrame(loop);

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
document.oncontextmenu=e=>e.preventDefault();

window.__world={
 state:()=>({near:[...chunks.values()].filter(c=>c.mode==='near').length,far:[...chunks.values()].filter(c=>c.mode==='far').length,cached:chunks.size,animals:animalAgents.length,explored:Object.keys(world.explored).length,pos:{x:player.x,z:player.z},seed}),
 chunk:(x,z)=>JSON.parse(JSON.stringify(descriptor(x,z))),
 teleportChunk:(cx,cz)=>{activeVehicle=null;player.x=cx*CH;player.z=cz*CH;lastSyncX=1e9;lastSyncZ=1e9;sync(true);return window.__world.state()},
 mapOpen:()=>openMap(),
 animals:()=>animalAgents.slice(0,8).map(a=>({kind:a.kind,x:+a.x.toFixed(2),z:+a.z.toFixed(2),dir:+a.dir.toFixed(2)})),
 vehicles:()=>vehicles.map(v=>({type:v.type,x:+v.x.toFixed(2),z:+v.z.toFixed(2),alt:+v.alt.toFixed(2),active:v===activeVehicle})),
 anomalies:()=>[...chunks.values()].filter(c=>c.anomaly&&c.mode==='near').map(c=>({type:c.d.anomaly,x:+c.anomaly.position.x.toFixed(1),z:+c.anomaly.position.z.toFixed(1)})),
 teleport:(x,z)=>{player.x=x;player.z=z;activeVehicle=null;lastSyncX=1e9;lastSyncZ=1e9;sync(true);return window.__world.state()},
 setMove:(x,y)=>{move.x=x;move.y=y},setLook:(x,y)=>{look.x=x;look.y=y},
 enterNearest:()=>{let v=nearestVehicle();if(v){activeVehicle=v;player.x=v.x;player.z=v.z;player.yaw=v.yaw;refreshUse();return v.type}return null},
 findAnomaly:(r=12)=>{let c=chunkOf(player.x,player.z);for(let z=c.cz-r;z<=c.cz+r;z++)for(let x=c.cx-r;x<=c.cx+r;x++){let d=descriptor(x,z);if(d.anomaly)return{x,z,type:d.anomaly}}return null},
 setWeather:w=>{worldCtl.weather=w},setTime:h=>{worldCtl.autoTime=false;worldCtl.time=T.MathUtils.clamp(h,0,24);$('timeSlider').value=worldCtl.time},setClimb:v=>{climbInput=T.MathUtils.clamp(v,-1,1)}
};
})();