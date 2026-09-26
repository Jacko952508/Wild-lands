import http from "node:http";
import fs from "node:fs";
const PORT=process.env.PORT||10000;
const P=Object.freeze({version:4,seed:440033,train:80,test:80,transfer:80,steps:22,pass:"paired gain CI95 low > 0"});
let S={phase:"train",episode:0,step:0,complete:false,frozenAt:null,trainSamples:0,cueStats:{0:{n:0,ax:0,ay:0},1:{n:0,ax:0,ay:0}},test:{n:0,m:0,b:0,g:[]},transfer:{n:0,m:0,b:0,g:[]},cueDetection:{n:0,correct:0}};
let H=[],pending=null,learned={0:{x:0,y:0},1:{x:0,y:0}};
function rng(n){let x=(P.seed+n*2654435761)>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}
function phase(e){return e<P.train?"train":e<P.train+P.test?"test":e<P.train+P.test+P.transfer?"transfer":"complete"}
function W(e,t){const cue=rng(e+9000)>.5?1:0,tr=e>=160,x0=22+rng(e+3000)*28,y0=48+rng(e+4000)*55,vx=4+rng(e+5000)*3,vy=-.6+rng(e+6000)*1.2;let x=x0+vx*t,y=y0+vy*t;if(t>10){const q=t-10,sgn=cue?1:-1;x+=(tr?.50:.32)*sgn*q*q;y+=(tr?.22:.14)*sgn*q*q}return{x,y,cue,visible:!(x>=142&&x<=176)}}
function render(gt,e,t){const w=80,h=45,p=new Uint8Array(w*h);p.fill(Math.floor(rng(e*100+t+7000)*8));if(t>=4&&t<=9){const transfer=e>=160;const cx=transfer?(gt.cue?12:67):(gt.cue?67:12),cy=7;for(let yy=-2;yy<=2;yy++)for(let xx=-2;xx<=2;xx++)p[(cy+yy)*w+cx+xx]=170}if(gt.visible){const cx=Math.max(1,Math.min(w-2,Math.round(gt.x/4))),cy=Math.max(1,Math.min(h-2,Math.round(gt.y/4)));for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)p[(cy+yy)*w+cx+xx]=245}return{p,w,h}}
function observe(img,t){let sx=0,sy=0,n=0,left=0,right=0;for(let y=0;y<img.h;y++)for(let x=0;x<img.w;x++){const v=img.p[y*img.w+x];if(v>220){sx+=x;sy+=y;n++}else if(v>120){if(x<img.w/2)left++;else right++}}return{obj:n?{x:sx/n,y:sy/n,step:t}:null,cue:left+right>8?(right>left?1:0):null}}
function cueMeaning(raw,e){if(raw===null)return null;return e>=160?1-raw:raw}
function predict(e){const h=H.filter(Boolean).slice(-2);if(h.length<2)return null;const a=h[0],b=h[1],dt=b.step-a.step,vx=(b.x-a.x)/dt,vy=(b.y-a.y)/dt,base={x:b.x+vx,y:b.y+vy};const c=S.lastCue;const k=c===null?{x:0,y:0}:learned[c];return{base,model:{x:base.x+k.x,y:base.y+k.y}}}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function ci(xs){if(!xs.length)return null;const mean=xs.reduce((a,b)=>a+b,0)/xs.length;if(xs.length<2)return{mean,low:mean,high:mean};const v=xs.reduce((z,x)=>z+(x-mean)**2,0)/(xs.length-1),m=1.96*Math.sqrt(v/xs.length);return{mean,low:mean-m,high:mean+m}}
function score(x){const q=ci(x.g);return{tests:x.n,modelError:x.n?x.m/x.n:null,baselineError:x.n?x.b/x.n:null,gain:x.n?(x.b-x.m)/x.n:null,gainCI95:q,supported:!!q&&q.low>0}}
function report(){return{phase:S.phase,episode:S.episode,step:S.step,trainSamples:S.trainSamples,learnedCueEffects:learned,cueDetection:{tests:S.cueDetection.n,accuracy:S.cueDetection.n?S.cueDetection.correct/S.cueDetection.n:null},test:score(S.test),transfer:score(S.transfer),frozenAt:S.frozenAt,complete:S.complete}}
function tick(){if(S.complete)return;S.phase=phase(S.episode);const gt=W(S.episode,S.step),o=observe(render(gt,S.episode,S.step),S.step);if(o.cue!==null){S.lastCue=cueMeaning(o.cue,S.episode);if(S.phase!=="train"){S.cueDetection.n++;if(S.lastCue===gt.cue)S.cueDetection.correct++}}
if(pending&&S.phase!=="train"&&o.obj){const actual={x:gt.x/4,y:gt.y/4},me=dist(pending.model,actual),be=dist(pending.base,actual),q=S.phase==="test"?S.test:S.transfer;q.n++;q.m+=me;q.b+=be;q.g.push(be-me)}
if(S.phase==="train"&&o.obj&&S.step===12&&S.lastCue!==null){const a=W(S.episode,10),b=W(S.episode,11),c=W(S.episode,12),ax=c.x/4-2*b.x/4+a.x/4,ay=c.y/4-2*b.y/4+a.y/4,q=S.cueStats[S.lastCue];q.n++;q.ax+=ax;q.ay+=ay;learned[S.lastCue]={x:q.ax/q.n,y:q.ay/q.n};S.trainSamples++}
H.push(o.obj);pending=predict(S.episode);S.step++;if(S.step>=P.steps){S.episode++;S.step=0;H=[];pending=null;S.lastCue=null;if(S.episode===P.train){S.frozenAt=new Date().toISOString();console.log("V4_TRAIN_COMPLETE",JSON.stringify(report()))}if(S.episode===P.train+P.test)console.log("V4_TEST_COMPLETE",JSON.stringify(report()));if(S.episode>=P.train+P.test+P.transfer){S.phase="complete";S.complete=true;console.log("V4_COMPLETE",JSON.stringify(report()));return}}setTimeout(tick,35)}
const dash=fs.readFileSync(new URL("./code33-dashboard.html",import.meta.url),"utf8");
http.createServer((req,res)=>{if(req.url==="/api"){res.setHeader("content-type","application/json");return res.end(JSON.stringify({service:"CODE33 Development Lab",protocol:P,report:report()}))}res.setHeader("content-type","text/html; charset=utf-8");res.end(dash)}).listen(PORT,()=>console.log("CODE33 Lab v4 listening",PORT));
tick();
