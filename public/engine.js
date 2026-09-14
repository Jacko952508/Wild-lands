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

const CH=96,NEAR=1,FAR=3,CACHE=4;
const WORLD='wi_world_v3',POS='wi_pos_v3';
let world;
try{world=JSON.parse(localStorage.getItem(WORLD)||'null')}catch(e){world=null}
if(!world)world={seed:Math.floor(Math.random()*1e9),explored:{},saved:{},animalState:{}};
let player;
try{player=JSON.parse(localStorage.getItem(POS)||'null')}catch(e){player=null}
if(!player)player={x:0,z:12,yaw:0,pitch:-0.03};

const seed=world.seed;
const chunks=new Map(),colliders=[],animalAgents=[];
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
 landmark:new T.MeshStandardMaterial({color:0x6f7068,roughness:1})
};

function persist(){
 localStorage.setItem(WORLD,JSON.stringify(world));
 localStorage.setItem(POS,JSON.stringify(player));
}

function descriptor(cx,cz){
 let k=key(cx,cz);
 if(world.saved[k])return world.saved[k];
 let d={trees:[],rocks:[],animals:[],mark:null};
 let b=biome(cx*CH,cz*CH),treeCount=b==='forest'?42:b==='pine'?38:b==='meadow'?18:30;
 for(let i=0;i<treeCount;i++){
   let x=(hash(cx*71+i,cz*43-i,101)-0.5)*CH,z=(hash(cx*59-i,cz*67+i,102)-0.5)*CH;
   if(hash(cx+i,cz-i,103)<0.82)d.trees.push([+x.toFixed(2),+z.toFixed(2),+(0.65+hash(cx+i,cz-i,104)*1.15).toFixed(2)]);
 }
 for(let i=0;i<10;i++){
   let x=(hash(cx*37+i,cz*29-i,111)-0.5)*CH,z=(hash(cx*31-i,cz*41+i,112)-0.5)*CH;
   d.rocks.push([+x.toFixed(2),+z.toFixed(2),+(0.35+hash(cx+i,cz-i,113)*0.95).toFixed(2)]);
 }
 let species=['deer','deer','fox','boar','wolf'];
 let n=2+Math.floor(hash(cx,cz,120)*3);
 for(let i=0;i<n;i++){
   let x=(hash(cx*17+i,cz*23-i,121)-0.5)*CH,z=(hash(cx*19-i,cz*13+i,122)-0.5)*CH;
   d.animals.push([+x.toFixed(2),+z.toFixed(2),species[Math.floor(hash(cx+i,cz-i,123)*species.length)]]);
 }
 if(hash(cx,cz,130)>0.87)d.mark=hash(cx,cz,131)>0.5?'ring':'tower';
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

function createChunk(cx,cz){
 let k=key(cx,cz),d=descriptor(cx,cz),root=new T.Group(),near=new T.Group(),far=new T.Group();
 near.add(terrain(cx,cz,28));far.add(terrain(cx,cz,7));
 for(const q of d.trees){
   let wx=cx*CH+q[0],wz=cz*CH+q[1];near.add(makeTree(wx,wz,q[2],true));
 }
 for(let i=0;i<d.trees.length;i+=3){let q=d.trees[i],wx=cx*CH+q[0],wz=cz*CH+q[1];far.add(makeTree(wx,wz,q[2],false))}
 for(const q of d.rocks){let wx=cx*CH+q[0],wz=cz*CH+q[1],m=new T.Mesh(new T.DodecahedronGeometry(q[2],0),mats.rock);m.position.set(wx,H(wx,wz)+q[2]*0.55,wz);m.scale.y=0.7;m.castShadow=true;near.add(m)}
 if(d.mark)near.add(landmarkModel(cx,cz,d.mark));
 root.add(near,far);near.visible=false;far.visible=false;scene.add(root);
 let c={cx,cz,k,d,root,near,far,mode:'none',agents:[],lastUsed:performance.now()};
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
function blocked(x,z){for(const c of colliders){let dx=x-c.x,dz=z-c.z,rr=c.r+0.6;if(dx*dx+dz*dz<rr*rr)return true}return false}

function sync(force=false){
 let cc=chunkOf(player.x,player.z);
 if(!force&&cc.cx===lastSyncX&&cc.cz===lastSyncZ)return;
 lastSyncX=cc.cx;lastSyncZ=cc.cz;
 let nearSet=new Set(),keepSet=new Set();

 for(let dz=-FAR;dz<=FAR;dz++)for(let dx=-FAR;dx<=FAR;dx++){
   let cx=cc.cx+dx,cz=cc.cz+dz,k=key(cx,cz),dist=Math.max(Math.abs(dx),Math.abs(dz));
   keepSet.add(k);let c=chunks.get(k)||createChunk(cx,cz);
   if(dist<=NEAR){nearSet.add(k);setMode(c,'near')}else setMode(c,'far');
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
 $('region').textContent='Region '+cc.cx+', '+cc.cz;
 persist();
 if(!$('panel').classList.contains('hidden'))renderMap();
}

function updateAnimals(dt,t){
 for(const a of animalAgents){
   a.stateT-=dt;
   let pd=Math.hypot(player.x-a.x,player.z-a.z);
   if(pd<6){
     a.target=Math.atan2(a.x-player.x,a.z-player.z);a.stateT=2.2;
   }else if(a.stateT<=0){
     if(Math.hypot(a.x-a.homeX,a.z-a.homeZ)>30)a.target=Math.atan2(a.homeX-a.x,a.homeZ-a.z);
     else a.target+= (Math.random()-0.5)*2.3;
     a.stateT=2.5+Math.random()*5;
   }
   let dif=((a.target-a.dir+Math.PI*3)%(Math.PI*2))-Math.PI;
   a.dir+=T.MathUtils.clamp(dif,-dt*1.6,dt*1.6);
   let mult=pd<6?1.7:1,nx=a.x+Math.sin(a.dir)*a.speed*mult*dt,nz=a.z+Math.cos(a.dir)*a.speed*mult*dt;
   let cc=chunkOf(nx,nz);
   if(!blocked(nx,nz)&&Math.abs(H(nx,nz)-H(a.x,a.z))<1.1&&Math.abs(cc.cx-chunkOf(a.homeX,a.homeZ).cx)<=1&&Math.abs(cc.cz-chunkOf(a.homeX,a.homeZ).cz)<=1){
     a.x=nx;a.z=nz;
   }else a.target+=1.3;
   a.group.position.set(a.x,H(a.x,a.z),a.z);a.group.rotation.y=a.dir;
   let swing=Math.sin(t*6*a.speed+a.phase)*0.42*mult;
   a.group.userData.legs.forEach((l,i)=>l.rotation.x=i%2?swing:-swing);
   a.group.position.y+=Math.abs(Math.sin(t*6*a.speed+a.phase))*0.025;
 }
}

let move={x:0,y:0},look={x:0,y:0},sprinting=false;
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
   if(x===pc.cx&&z===pc.cz)b.classList.add('current');
   if(mapSelected&&x===mapSelected.cx&&z===mapSelected.cz)b.classList.add('selected');
   if(d&&d.mark)b.classList.add('landmark');
   b.title='Region '+x+', '+z;
   b.disabled=!isExplored;
   if(isExplored)b.onclick=()=>{mapSelected={cx:x,cz:z};renderMap()};
   grid.appendChild(b);
 }
 if(mapSelected){
   let k=key(mapSelected.cx,mapSelected.cz),d=world.saved[k],label='Region '+mapSelected.cx+', '+mapSelected.cz;
   if(d&&d.mark)label+=' • '+(d.mark==='ring'?'Stone Ring':'Lookout Tower');
   $('mapInfo').textContent=label;$('travel').disabled=false;
 }else{$('mapInfo').textContent='No region selected';$('travel').disabled=true}
}
$('travel').onclick=()=>{
 if(!mapSelected)return;
 player.x=mapSelected.cx*CH;player.z=mapSelected.cz*CH;player.yaw=0;
 $('panel').classList.add('hidden');lastSyncX=1e9;lastSyncZ=1e9;sync(true);
 if(blocked(player.x,player.z)){outer:for(let r=3;r<=18;r+=3)for(let i=0;i<16;i++){let a=i/16*Math.PI*2,x=mapSelected.cx*CH+Math.cos(a)*r,z=mapSelected.cz*CH+Math.sin(a)*r;if(!blocked(x,z)&&Math.abs(H(x,z)-H(player.x,player.z))<3){player.x=x;player.z=z;break outer}}}
 camera.position.set(player.x,H(player.x,player.z)+1.7,player.z);persist();toast('Fast travel complete');
};

let toastTimer;
function toast(s){let e=$('toast');e.textContent=s;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),1600)}

function updateSky(time){
 let cycle=(time%480)/480,a=cycle*Math.PI*2-Math.PI/2,sy=Math.sin(a),day=T.MathUtils.clamp((sy+0.18)*2.3,0,1);
 sun.position.set(player.x+Math.cos(a)*95,Math.max(6,sy*110),player.z+40);sun.intensity=0.05+day*2.25;hemi.intensity=0.18+day*0.95;
 let dayCol=new T.Color(0xa7c0bd),nightCol=new T.Color(0x06101a),c=nightCol.clone().lerp(dayCol,day);scene.background.copy(c);scene.fog.color.copy(c);
 stars.position.set(player.x,0,player.z);stars.material.opacity=1-day;
}

function step(dt,t){
 player.yaw-=look.x*dt*2.45;player.pitch=T.MathUtils.clamp(player.pitch-look.y*dt*1.8,-1.05,1);
 let f=-move.y,side=move.x,s=(sprinting?8:4.5)*dt,dx=(Math.sin(player.yaw)*f+Math.cos(player.yaw)*side)*s,dz=(Math.cos(player.yaw)*f-Math.sin(player.yaw)*side)*s,nx=player.x+dx,nz=player.z+dz;
 if(!blocked(nx,nz)&&H(nx,nz)-H(player.x,player.z)<1.3){player.x=nx;player.z=nz}
 camera.position.lerp(new T.Vector3(player.x,H(player.x,player.z)+1.7,player.z),0.24);camera.rotation.set(player.pitch,player.yaw,0);

 let cc=chunkOf(player.x,player.z);
 if(key(cc.cx,cc.cz)!==currentChunk)sync();
 let deg=((player.yaw*180/Math.PI)%360+360)%360,names=['N','NE','E','SE','S','SW','W','NW'];
 $('compass').textContent=names[Math.round(deg/45)%8];
 $('stats').textContent=biome(player.x,player.z)+' • '+Object.keys(world.explored).length+' visited • '+animalAgents.length+' wildlife';
 updateAnimals(dt,t);updateSky(t);
 saveTimer+=dt;if(saveTimer>8){saveTimer=0;for(const c of chunks.values())if(c.agents.length)world.animalState[c.k]=c.agents.map(a=>({x:+a.x.toFixed(2),z:+a.z.toFixed(2),dir:+a.dir.toFixed(3)}));persist()}
}

sync(true);
camera.position.set(player.x,H(player.x,player.z)+1.7,player.z);
let last=performance.now(),start=performance.now()/1000;
function loop(now){let dt=Math.min(0.04,(now-last)/1000);last=now;let t=now/1000;step(dt,t-start);renderer.render(scene,camera);requestAnimationFrame(loop)}
requestAnimationFrame(loop);

addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
document.oncontextmenu=e=>e.preventDefault();

window.__world={
 state:()=>({near:[...chunks.values()].filter(c=>c.mode==='near').length,far:[...chunks.values()].filter(c=>c.mode==='far').length,cached:chunks.size,animals:animalAgents.length,explored:Object.keys(world.explored).length,pos:{x:player.x,z:player.z},seed}),
 chunk:(x,z)=>JSON.parse(JSON.stringify(descriptor(x,z))),
 teleportChunk:(cx,cz)=>{player.x=cx*CH;player.z=cz*CH;lastSyncX=1e9;lastSyncZ=1e9;sync(true);return window.__world.state()},
 mapOpen:()=>openMap(),
 animals:()=>animalAgents.slice(0,8).map(a=>({kind:a.kind,x:+a.x.toFixed(2),z:+a.z.toFixed(2),dir:+a.dir.toFixed(2)}))
};
})();