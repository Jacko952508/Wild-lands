import http from "node:http";
const PORT=Number(process.env.PORT||10000);
const protocol=Object.freeze({version:2,seed:330033,trainEpisodes:60,testEpisodes:60,transferEpisodes:60,steps:24,baseline:"constant-velocity",frozenAfterTrain:true,passRule:"95% CI of paired gain must be above 0"});
let state={started:new Date().toISOString(),phase:"train",episode:0,step:0,alpha:{x:0,y:0},trainSamples:0,position:{n:0,modelSum:0,baseSum:0,gains:[]},existence:{n:0,correct:0,baselineCorrect:0},frozenAt:null,complete:false};
let history=[],pending=null,trainAccel=[];
function rng(n){let x=(protocol.seed+n*2654435761)>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}
function phaseFor(ep){return ep<60?"train":ep<120?"test":ep<180?"transfer":"complete"}
function world(ep,step){const phase=phaseFor(ep),transfer=phase==="transfer",r=rng(ep+1000),kind=Math.floor(rng(ep+2000)*4),x0=16+r*36,y0=28+rng(ep+3000)*90,vx=(transfer?8.5:6.5)+rng(ep+4000)*2,turn=kind===3&&step>10,ax=turn?(transfer?1.2:.7):0,ay=turn?(transfer?-1.8:-1.1):0;const t=Math.max(0,step-10),x=x0+vx*step+ax*t*(t+1)/2,y=y0+ay*t;const exists=!(kind===2&&step>=12),visible=exists&&!(x>=138&&x<=182);return{x,y,exists,visible,kind,phase}}
function render(gt){const W=80,H=45,p=new Uint8Array(W*H),noise=Math.floor(rng(state.episode*100+state.step)*8);for(let i=0;i<p.length;i++)p[i]=noise;if(gt.visible){const cx=Math.max(1,Math.min(W-2,Math.round(gt.x/4))),cy=Math.max(1,Math.min(H-2,Math.round(gt.y/4)));for(let y=cy-1;y<=cy+1;y++)for(let x=cx-1;x<=cx+1;x++)p[y*W+x]=245}return{W,H,p}}
function observePixels(f){let sx=0,sy=0,n=0;for(let y=0;y<f.H;y++)for(let x=0;x<f.W;x++)if(f.p[y*f.W+x]>200){sx+=x;sy+=y;n++}return n?{x:sx/n,y:sy/n}:null}
function predict(){const h=history.filter(Boolean).slice(-3);if(h.length<2)return null;const a=h[h.length-2],b=h[h.length-1],v={x:b.x-a.x,y:b.y-a.y},base={x:b.x+v.x,y:b.y+v.y};return{model:{x:base.x+state.alpha.x,y:base.y+state.alpha.y},base,expectsExistence:true}}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function ci95(xs){if(xs.length<2)return null;const m=xs.reduce((a,b)=>a+b,0)/xs.length,s=Math.sqrt(xs.reduce((a,b)=>a+(b-m)**2,0)/(xs.length-1)),h=1.96*s/Math.sqrt(xs.length);return{mean:m,low:m-h,high:m+h}}
function freeze(){const med=a=>{const z=[...a].sort((x,y)=>x-y);return z.length?z[Math.floor(z.length/2)]:0};state.alpha={x:med(trainAccel.map(q=>q.x)),y:med(trainAccel.map(q=>q.y))};state.trainSamples=trainAccel.length;state.frozenAt=new Date().toISOString()}
function tick(){if(state.complete)return;state.phase=phaseFor(state.episode);const gt=world(state.episode,state.step),obs=observePixels(render(gt));
 if(pending&&state.phase!=="train"){state.existence.n++;const actualExists=gt.exists;if(pending.expectsExistence===actualExists)state.existence.correct++;if(actualExists)state.existence.baselineCorrect++;
  if(obs){const actual={x:gt.x/4,y:gt.y/4},me=dist(pending.model,actual),be=dist(pending.base,actual);state.position.n++;state.position.modelSum+=me;state.position.baseSum+=be;state.position.gains.push(be-me)}}
 if(state.phase==="train"&&history.length>=2&&obs){const a=history[history.length-2],b=history[history.length-1];if(a&&b)trainAccel.push({x:obs.x-2*b.x+a.x,y:obs.y-2*b.y+a.y})}
 history.push(obs);if(history.length>8)history.shift();pending=predict();state.step++;
 if(state.step>=protocol.steps){state.episode++;state.step=0;history=[];pending=null;if(state.episode===60)freeze();if(state.episode>=180){state.phase="complete";state.complete=true;console.log("LAB_COMPLETE",JSON.stringify(report()))}}}
function report(){const p=state.position,n=p.n,ci=ci95(p.gains);return{phase:state.phase,episode:state.episode,step:state.step,alpha:state.alpha,trainSamples:state.trainSamples,position:{tests:n,modelError:n?p.modelSum/n:null,baselineError:n?p.baseSum/n:null,gain:n?(p.baseSum-p.modelSum)/n:null,gainCI95:ci,supported:!!ci&&ci.low>0},existence:{tests:state.existence.n,accuracy:state.existence.n?state.existence.correct/state.existence.n:null,baselineAccuracy:state.existence.n?state.existence.baselineCorrect/state.existence.n:null},frozenAt:state.frozenAt,complete:state.complete}}
setInterval(tick,50);
http.createServer((req,res)=>{res.setHeader("content-type","application/json");res.end(JSON.stringify({service:"CODE33 Development Lab",protocol,report:report()}))}).listen(PORT,()=>console.log("CODE33 Lab v2 listening",PORT));