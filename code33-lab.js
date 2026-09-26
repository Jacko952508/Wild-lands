import http from "node:http";
import fs from "node:fs";
import crypto from "node:crypto";
const PORT=process.env.PORT||10000;
const P=Object.freeze({version:"4.1",seed:441033,train:100,test:100,transfer:100,steps:22,primaryWindow:[11,16],pass:"paired primary gain CI95 low > 0; frozen model unchanged"});
let S={phase:"train",episode:0,step:0,tickCount:0,lastTickAt:null,complete:false,frozenAt:null,frozenHash:null,trainSamples:0,w:[0,0,0],test:{n:0,m:0,b:0,g:[]},transfer:{n:0,m:0,b:0,g:[]},integrity:{pixelOnlyTraining:true,noPhaseRemap:true,predictionBeforeOutcome:true,frozenUnchanged:true}};
let H=[],feature=null,pending=null;
function rng(n){let x=(P.seed+n*2654435761)>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}
function phase(e){return e<P.train?"train":e<P.train+P.test?"test":e<P.train+P.test+P.transfer?"transfer":"complete"}
function W(e,t){const orient=rng(e+9000)>.5?1:-1,tr=e>=200,x0=18+rng(e+3000)*25,y0=55+rng(e+4000)*45,vx=4.8+rng(e+5000)*2,vy=-.35+rng(e+6000)*.7;const fx=tr?100+rng(e+7000)*80:110+rng(e+7000)*45;let x=x0+vx*t,y=y0+vy*t;if(t>10){const q=t-10;x+=.34*orient*q*q;y+=.13*orient*q*q}return{x,y,orient,fx,visible:!(x>=150&&x<=170)}}
function render(gt,e,t){const w=80,h=45,p=new Uint8Array(w*h);p.fill(Math.floor(rng(e*100+t+8000)*7));const tr=e>=200,cx=Math.max(8,Math.min(72,Math.round(gt.fx/4))),cy=tr?8+Math.floor(rng(e+8100)*27):10+Math.floor(rng(e+8100)*20),long=tr?7:5,short=tr?2:1,intensity=tr?125+Math.floor(rng(e+8200)*25):155+Math.floor(rng(e+8200)*30);const hw=gt.orient>0?long:short,hh=gt.orient>0?short:long;for(let yy=-hh;yy<=hh;yy++)for(let xx=-hw;xx<=hw;xx++){const X=cx+xx,Y=cy+yy;if(X>=0&&X<w&&Y>=0&&Y<h)p[Y*w+X]=intensity}if(gt.visible){const ox=Math.max(1,Math.min(w-2,Math.round(gt.x/4))),oy=Math.max(1,Math.min(h-2,Math.round(gt.y/4)));for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)p[(oy+yy)*w+ox+xx]=245}return{p,w,h}}
function observe(img,t){let sx=0,sy=0,n=0,minx=99,maxx=-1,miny=99,maxy=-1,sf=0,nf=0;for(let y=0;y<img.h;y++)for(let x=0;x<img.w;x++){const v=img.p[y*img.w+x];if(v>220){sx+=x;sy+=y;n++}else if(v>100){minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);sf+=v;nf++}}const obj=n?{x:sx/n,y:sy/n,step:t}:null;const field=nf>6?{cx:(minx+maxx)/2,cy:(miny+maxy)/2,w:maxx-minx+1,h:maxy-miny+1,mean:sf/nf}:null;return{obj,field}}
function feat(o){if(!o.field)return null;const f=o.field;return[1,(f.w-f.h)/(f.w+f.h),f.mean/255]}
function dot(a,b){return a.reduce((s,x,i)=>s+x*b[i],0)}
function predict(){const h=H.filter(Boolean).slice(-2);if(h.length<2)return null;const a=h[0],b=h[1],dt=b.step-a.step,vx=(b.x-a.x)/dt,vy=(b.y-a.y)/dt,base={x:b.x+vx,y:b.y+vy};const corr=feature?dot(S.w,feature):0;return{base,model:{x:base.x+corr,y:base.y+corr*.38}}}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function ci(xs){if(!xs.length)return null;const mean=xs.reduce((a,b)=>a+b,0)/xs.length;if(xs.length<2)return{mean,low:mean,high:mean};const v=xs.reduce((z,x)=>z+(x-mean)**2,0)/(xs.length-1),m=1.96*Math.sqrt(v/xs.length);return{mean,low:mean-m,high:mean+m}}
function score(q){const z=ci(q.g);return{tests:q.n,modelError:q.n?q.m/q.n:null,baselineError:q.n?q.b/q.n:null,gain:q.n?(q.b-q.m)/q.n:null,gainCI95:z,supported:!!z&&z.low>0}}
function hashModel(){return crypto.createHash("sha256").update(JSON.stringify(S.w)).digest("hex")}
function report(){return{phase:S.phase,episode:S.episode,totalEpisodes:300,step:S.step,tickCount:S.tickCount,lastTickAt:S.lastTickAt,trainSamples:S.trainSamples,weights:S.w,test:score(S.test),transfer:score(S.transfer),frozenAt:S.frozenAt,frozenHash:S.frozenHash,integrity:S.integrity,complete:S.complete}}
function tick(){if(S.complete)return;S.tickCount++;S.lastTickAt=new Date().toISOString();S.phase=phase(S.episode);if(S.tickCount%220===0)console.log("V4_1_HEARTBEAT",JSON.stringify({phase:S.phase,episode:S.episode,step:S.step,tickCount:S.tickCount}));
const gt=W(S.episode,S.step),o=observe(render(gt,S.episode,S.step),S.step);
if(o.field)feature=feat(o);
if(pending&&S.phase!=="train"&&o.obj&&S.step>=P.primaryWindow[0]&&S.step<=P.primaryWindow[1]){const actual={x:gt.x/4,y:gt.y/4},me=dist(pending.model,actual),be=dist(pending.base,actual),q=S.phase==="test"?S.test:S.transfer;q.n++;q.m+=me;q.b+=be;q.g.push(be-me)}
if(S.phase==="train"&&o.obj&&H.filter(Boolean).length>=2&&S.step>=11&&S.step<=16&&feature){const h=H.filter(Boolean).slice(-2),a=h[0],b=h[1],dt=b.step-a.step,vx=(b.x-a.x)/dt,observedResidual=o.obj.x-(b.x+vx);const pred=dot(S.w,feature),err=observedResidual-pred,lr=.035;for(let i=0;i<S.w.length;i++)S.w[i]+=lr*err*feature[i];S.trainSamples++}
H.push(o.obj);pending=predict();S.step++;
if(S.step>=P.steps){S.episode++;S.step=0;H=[];feature=null;pending=null;if(S.episode===P.train){S.frozenAt=new Date().toISOString();S.frozenHash=hashModel();console.log("V4_1_TRAIN_COMPLETE",JSON.stringify(report()))}if(S.episode===P.train+P.test)console.log("V4_1_TEST_COMPLETE",JSON.stringify(report()));if(S.episode>P.train&&hashModel()!==S.frozenHash){S.integrity.frozenUnchanged=false;throw new Error("frozen model mutated")}if(S.episode>=300){S.phase="complete";S.complete=true;console.log("V4_1_COMPLETE",JSON.stringify(report()));return}}setTimeout(tick,35)}
const dash=fs.readFileSync(new URL("./code33-dashboard.html",import.meta.url),"utf8");
http.createServer((req,res)=>{if(req.url==="/api"){res.setHeader("content-type","application/json");return res.end(JSON.stringify({service:"CODE33 Development Lab",protocol:P,report:report()}))}res.setHeader("content-type","text/html; charset=utf-8");res.end(dash)}).listen(PORT,()=>console.log("CODE33 Lab v4.1 listening",PORT));
tick();
