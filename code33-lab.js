import http from "node:http";
const PORT=Number(process.env.PORT||10000);
const protocol={version:1,trainEpisodes:40,testEpisodes:40,transferEpisodes:40,baseline:"constant-velocity",metric:"next-position-euclidean-error",frozen:true};
let state={started:new Date().toISOString(),phase:"train",episode:0,step:0,learnedAcceleration:{x:0,y:0},trainSamples:0,tests:0,modelError:0,baselineError:0,wins:0,frozenAt:null};
function hiddenWorld(ep,step){const transfer=ep>=80,kind=ep%4,x0=18+(ep*17)%35,y0=45+(ep*23)%80,vx=transfer?9:7,ax=kind===3?(transfer?1.1:.8):0;let x=x0+vx*step+(step>9?ax*(step-9)*(step-8)/2:0),y=y0+(kind===3&&step>9?(transfer?-2:-1.4)*(step-9):0);const exists=!(kind===2&&step>=11),visible=exists&&!(x>=140&&x<=180);return {x,y,exists,visible,kind}}
function render(gt){const W=80,H=45,p=new Uint8Array(W*H);if(gt.visible){const x=Math.max(0,Math.min(W-1,Math.round(gt.x/4))),y=Math.max(0,Math.min(H-1,Math.round(gt.y/4)));for(let yy=Math.max(0,y-1);yy<=Math.min(H-1,y+1);yy++)for(let xx=Math.max(0,x-1);xx<=Math.min(W-1,x+1);xx++)p[yy*W+xx]=255}return {W,H,p}}\nfunction observePixels(frame){let sx=0,sy=0,n=0;for(let y=0;y<frame.H;y++)for(let x=0;x<frame.W;x++){if(frame.p[y*frame.W+x]>200){sx+=x;sy+=y;n++}}return n?{x:sx/n,y:sy/n}:null}
let history=[],pending=null,trainAccel=[];
function predict(){const h=history.filter(Boolean).slice(-3);if(h.length<2)return null;const a=h[h.length-2],b=h[h.length-1],vx=b.x-a.x,vy=b.y-a.y,base={x:b.x+vx,y:b.y+vy};return {baseline:base,model:{x:base.x+state.learnedAcceleration.x,y:base.y+state.learnedAcceleration.y}}}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function tick(){const gt=hiddenWorld(state.episode,state.step),frame=render(gt),obs=observePixels(frame);
 if(pending&&obs&&state.phase!=="train"){const actual={x:gt.x/4,y:gt.y/4},me=dist(pending.model,actual),be=dist(pending.baseline,actual),n=state.tests;state.modelError=(state.modelError*n+me)/(n+1);state.baselineError=(state.baselineError*n+be)/(n+1);state.tests++;if(me<be)state.wins++}
 if(state.phase==="train"&&history.length>=2&&obs){const a=history[history.length-2],b=history[history.length-1];if(a&&b)trainAccel.push({x:obs.x-2*b.x+a.x,y:obs.y-2*b.y+a.y})}
 history.push(obs);if(history.length>8)history.shift();pending=predict();state.step++;
 if(state.step>20){state.episode++;state.step=0;history=[];pending=null;
  if(state.episode===40){const xs=trainAccel.map(q=>q.x).sort((a,b)=>a-b),ys=trainAccel.map(q=>q.y).sort((a,b)=>a-b),m=z=>z.length?z[Math.floor(z.length/2)]:0;state.learnedAcceleration={x:m(xs),y:m(ys)};state.trainSamples=trainAccel.length;state.phase="test";state.frozenAt=new Date().toISOString()}
  if(state.episode===80)state.phase="transfer";if(state.episode>=120)state.phase="complete";
 }}
setInterval(()=>{if(state.phase!=="complete")tick()},100);
const server=http.createServer((req,res)=>{res.setHeader("content-type","application/json");res.end(JSON.stringify({service:"CODE33 Lab",protocol,state:{...state,predictiveGain:state.tests?state.baselineError-state.modelError:null,winRate:state.tests?state.wins/state.tests:null}}))});server.listen(PORT,()=>console.log("CODE33 Lab listening",PORT));